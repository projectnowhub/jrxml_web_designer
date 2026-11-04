// The Jmix report the report server stores for a template
// (types/jmixReport.ts), worked out here from the template's bands
// (utils/reportBands.ts) so the bottom panel's Report Bands tab can show it
// before the server answers. The server builds the real one, with its own
// ids: these are fixed ones, so the shown JSON doesn't change between updates.

import type { BandParameterSpec, ReportBandsPayload } from "@/types/reportBands";
import type {
  JmixBandDefinition,
  JmixEntityRef,
  JmixInputParameter,
  JmixReportStructure,
} from "@/types/jmixReport";
import {
  JmixBandOrientation,
  JmixCustomDefinedBy,
  JmixDataSetType,
  JmixOutputType,
  JmixParameterType,
} from "@/enums/jmixReport";
import {
  BAND_LOADER_SCRIPT,
  CUSTOM_TEMPLATE_CLASS,
  REPORT_CODE_PREFIX,
  REPORT_GROUP_CODE,
  REPORT_GROUP_TITLE,
  REPORT_TEMPLATE_CODE,
  ROOT_BAND_NAME,
} from "@/constants/reportBandConstants";

const DRAFT_REPORT_ID = "new";

// A fixed id per part: a prefix per kind of object and its position
const draftId = (prefix: string, n: number) => `${prefix}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const ref = (metaClass: string, id: string): JmixEntityRef => ({ metaClass, id });

const BAND = "report_BandDefinition";

function inputParameter(spec: BandParameterSpec, position: number): JmixInputParameter {
  return {
    metaClass: "report_ReportInputParameter",
    id: draftId("9a4a0000", position),
    alias: spec.alias,
    name: spec.name,
    type: String(JmixParameterType[spec.type]),
    ...(spec.entity ? { entityMetaClass: spec.entity } : {}),
    required: String(spec.required),
    ...(spec.defaultValue ? { defaultValue: spec.defaultValue } : {}),
    ...(spec.defaultIsToday ? { defaultDateIsCurrent: "true" } : {}),
    position: String(position),
  };
}

// The report of template `id` (null: not saved yet) named `name`
export function toJmixStructure(payload: ReportBandsPayload, template: { id: string | null; name: string }): JmixReportStructure {
  const id = template.id ?? DRAFT_REPORT_ID;
  const rootId = draftId("b4ad0000", 0);
  const children: JmixBandDefinition[] = payload.bands.map((band, index) => {
    // Its request as the band loader reads it: everything but the band's own name
    const { name, ...request } = band;
    return {
      metaClass: BAND,
      id: draftId("b4ad0000", index + 1),
      name,
      orientation: String(JmixBandOrientation.HORIZONTAL),
      position: String(index),
      parentBandDefinition: ref(BAND, rootId),
      dataSets: [{
        metaClass: "report_DataSet",
        id: draftId("da7a0000", index + 1),
        name,
        type: String(JmixDataSetType.GROOVY),
        text: BAND_LOADER_SCRIPT,
        jsonSourceText: JSON.stringify(request),
      }],
    };
  });
  const root: JmixBandDefinition = {
    metaClass: BAND,
    id: rootId,
    name: ROOT_BAND_NAME,
    orientation: String(JmixBandOrientation.HORIZONTAL),
    position: "0",
    childrenBandDefinitions: children.map((band) => ref(BAND, band.id)),
  };
  return {
    metaClass: "report_Report",
    id,
    name: template.name,
    code: `${REPORT_CODE_PREFIX}${id}`,
    restAccess: "true",
    group: { metaClass: "report_ReportGroup", id: draftId("6a0b0000", 0), code: REPORT_GROUP_CODE, title: REPORT_GROUP_TITLE },
    inputParameters: payload.parameters.map(inputParameter),
    bands: [root, ...children],
    templates: [{
      metaClass: "report_ReportTemplate",
      id: draftId("7e3b0000", 0),
      code: REPORT_TEMPLATE_CODE,
      name: `${template.name}.jrxml`,
      reportOutputType: String(JmixOutputType.PDF),
      custom: "true",
      customDefinedBy: String(JmixCustomDefinedBy.CLASS),
      customDefinition: CUSTOM_TEMPLATE_CLASS,
    }],
  };
}
