// Report bands (types/reportBands.ts): where the template's data comes from,
// built from the design for the report server, which stores them as the bands
// of the template's Jmix report and loads the data itself when it runs. The
// requests are the designer's own (a table's filters and sort, a chart's
// analytics requests), with the project and the moving date ranges left as
// {{…}} for the server to fill in on the day, and without the project
// condition: the server adds it.

import i18n from "@/i18n";
import type { Band, ChartElement, DesignElement, FrameElement } from "@/types";
import type { ChartBinding, ReportProject, TableFilter } from "@/types/dataSource";
import type {
  AggregateBand,
  BandField,
  BandParameterSpec,
  BandSpec,
  BandValueSource,
  EntityRowsBand,
  MapBand,
  ProjectListBand,
  ProjectValuesBand,
  ReportBandsPayload,
} from "@/types/reportBands";
import { Entity } from "@/enums/entityName";
import { LIST_FETCH_PLANS, REPORT_ROWS_LIMIT } from "@/constants/reportDataConstants";
import {
  CHART_BAND_PREFIX,
  MAP_BAND_PREFIX,
  PROJECT_BAND_FETCH_PLAN,
  PROJECT_BAND_NAME,
  PROJECT_PARAMETER,
  REPORT_DATE_PARAMETER,
} from "@/constants/reportBandConstants";
import { PROJECT_STATUS } from "@/types/entities";
import { projectPropertyOf, tableFilterConditions } from "@/services/helpers/jmixFilterHelpers";
import { chartRequests } from "./chart/chartQuery";
import { normalizeChartBinding } from "./chart/chartTypes";
import { getLocationSetup, isLocationAddress, isLocationMap, locationBoxes } from "./location/locationElement";
import { getProjectValueLink, isProjectDateKey, linkParamName, PROJECT_DATE_FORMAT, projectValueElements } from "./projectValue";
import { dayFormatPattern } from "./dateElement";
import { isActiveFilter } from "./table/dataBinding";
import { collectBoundTables } from "./table/tableDocument";

const t = i18n.global.t;

const PROJECT = "{{projectId}}";
// Dates as Report Data writes them ("Jan 15, 2025")
const DATE = { format: "date", pattern: "MMM d, yyyy" } as const;

const statusLabels = (): Record<string, string> =>
  Object.fromEntries(Object.values(PROJECT_STATUS).map((s) => [s, t(`reportData.projectStatus.${s.toLowerCase()}`)]));

// Where each linked detail's value is on the project record
function valueSource(key: string): BandValueSource | null {
  switch (key) {
    case "name":
      return { path: "projectTitle" };
    case "code":
      return { path: "projectId" };
    case "status":
      return { path: "status", format: "label", labels: statusLabels() };
    case "manager":
      return { path: "projectManager.name" };
    case "startDate":
      return { path: "startDate", ...DATE };
    case "finishDate":
      return { path: "finishDate", ...DATE };
    case "description":
      return { path: "description", format: "html" };
    case "scope":
      return { path: "projectScope", format: "html" };
    case "milestones":
      return { path: "contractualMilestones", format: "html" };
    case "location.address":
      return { path: "projectLocation" };
  }
  if (/^location\.\w+$/.test(key)) return { path: key.slice(9) };
  return null;
}

// The record's paths of each list's columns (as Report Data reads them)
const PHONE = { paths: ["dialCode", "mobileNo"], separator: " " };
const LIST_COLUMNS: Record<string, { path: string; single?: boolean; columns: Record<string, BandValueSource> }> = {
  manager: {
    path: "projectManager",
    single: true,
    columns: { name: { path: "name" }, designation: { path: "designation" }, email: { path: "email" }, phone: PHONE, country: { path: "country" } },
  },
  team: {
    path: "projectTeams",
    columns: { name: { path: "name" }, designation: { path: "designation" }, email: { path: "email" }, phone: PHONE, country: { path: "country" } },
  },
  companies: {
    path: "companies",
    columns: {
      name: { path: "name" },
      businessTypes: { path: "businessTypes[].name", separator: ", " },
      email: { path: "email" },
      phone: PHONE,
      country: { path: "country" },
      website: { path: "website" },
    },
  },
  contracts: {
    path: "contracts",
    columns: {
      contract: { path: "contractName" },
      contractNumber: { path: "contractNumber" },
      contractType: { path: "contractType" },
      originalSum: { path: "originalContractSum", format: "amount", decimals: 2 },
      adjustedSum: { path: "adjustedContractSum", format: "amount", decimals: 2 },
      startDate: { path: "contractStartDate", ...DATE },
      finishDate: { path: "contractFinishDate", ...DATE },
    },
  },
};

// Only filters that filter something; a moving date range stays a
// placeholder, filled in on the day the report runs
const withPlaceholders = (filters: TableFilter[] = []): TableFilter[] =>
  filters.filter(isActiveFilter).map((f) =>
    f.operator === "between" && f.period
      ? { ...f, type: "date", period: undefined, value: `{{${f.period}.from}}`, value2: `{{${f.period}.to}}` }
      : f,
  );

// A band name Jmix accepts (Latin letters, digits and _), from an element's uuid
const bandName = (prefix: string, id: string) => `${prefix}${id.replace(/[^A-Za-z0-9_]/g, "_")}`;

// Every chart of the report, boxes' contents included
function* charts(bands: Band[]): Generator<ChartElement> {
  for (const band of bands) {
    for (const element of band.elements ?? []) {
      for (const item of element.type === "frame" ? [element, ...((element as FrameElement).elements ?? [])] : [element]) {
        if (item.type === "chart") yield item as ChartElement;
      }
    }
  }
}

// The linked project details, one field per parameter the JRXML declares
function projectBand(bands: Band[]): ProjectValuesBand | null {
  const fields: BandField[] = [];
  const seen = new Set<string>();
  for (const element of projectValueElements(bands)) {
    const link = getProjectValueLink(element);
    if (!link) continue;
    const name = linkParamName(link);
    if (seen.has(name)) continue;
    seen.add(name);
    if (link.key.startsWith("more.")) {
      fields.push({ name, dynamicAttribute: link.key.slice(5), label: link.label });
      continue;
    }
    const found = valueSource(link.key);
    if (!found) continue;
    // A date is written in the look its text uses, like the Date element
    fields.push(isProjectDateKey(link.key) ? { name, ...found, pattern: dayFormatPattern(link.format ?? PROJECT_DATE_FORMAT) } : { name, ...found });
  }
  if (!fields.length) return null;
  return {
    name: PROJECT_BAND_NAME,
    kind: "projectValues",
    label: t("reportBands.labels.project"),
    fills: { parameters: fields.map((f) => f.name) },
    source: { entity: Entity.PROJECT, id: PROJECT, fetchPlan: PROJECT_BAND_FETCH_PLAN, dynamicAttributes: true },
    fields,
  };
}

function tableBands(bands: Band[]): (EntityRowsBand | ProjectListBand)[] {
  return collectBoundTables(bands)
    .filter((table) => table.binding.columns.length)
    .flatMap(({ binding: b }): (EntityRowsBand | ProjectListBand)[] => {
      if (b.list) {
        const list = LIST_COLUMNS[b.list];
        if (!list) return [];
        return [{
          name: b.datasetName,
          kind: "projectList",
          label: `${b.tableName} · ${t(`reportData.projectTables.${b.list}`)}`,
          fills: { subDataset: b.datasetName },
          list: list.path,
          ...(list.single ? { single: true } : {}),
          fields: b.columns.map((c) => ({ name: c.key, ...(list.columns[c.key] ?? { path: c.key }) })),
        }];
      }
      if (!b.sourceId) return [];
      return [{
        name: b.datasetName,
        kind: "entityRows",
        label: `${b.tableName} · ${b.sourceName || b.sourceId}`,
        fills: { subDataset: b.datasetName },
        source: {
          entity: b.sourceId,
          projectProperty: projectPropertyOf(b.sourceId),
          ...(LIST_FETCH_PLANS[b.sourceId] ? { fetchPlan: LIST_FETCH_PLANS[b.sourceId] } : {}),
          dynamicAttributes: true,
        },
        fields: b.columns.map((c) => ({ name: c.key, ...(c.linked ? { linked: true } : {}) })),
        filter: { group: "AND", conditions: tableFilterConditions(withPlaceholders(b.filters)) },
        sort: b.sort.length ? b.sort.map((s) => ({ property: s.column, desc: s.direction === "desc" })) : [{ property: "createdDate", desc: true }],
        maxRows: REPORT_ROWS_LIMIT,
      }];
    });
}

function chartBands(bands: Band[]): AggregateBand[] {
  return [...charts(bands)].flatMap((element): AggregateBand[] => {
    const binding = normalizeChartBinding(element.binding);
    const requests = chartRequests({ ...binding, projectId: binding.projectId ? PROJECT : undefined, filters: withPlaceholders(binding.filters) });
    if (!requests.length || !element.uuid) return [];
    const entity = requests[0]!.entityName;
    const { filters: _filters, projectName: _name, ...drawing } = binding;
    const chart: ChartBinding = { ...drawing, projectId: PROJECT };
    return [{
      name: bandName(CHART_BAND_PREFIX, element.uuid),
      kind: "aggregate",
      label: binding.title || t("reportBands.labels.chart"),
      fills: { image: element.uuid, width: Math.round(element.width), height: Math.round(element.height) },
      source: { entity, projectProperty: projectPropertyOf(entity) },
      requests: requests.map(({ globalFilter: _project, ...request }) => request),
      chart,
    }];
  });
}

function mapBands(bands: Band[]): MapBand[] {
  return [...locationBoxes(bands)].flatMap((box): MapBand[] => {
    const setup = getLocationSetup(box);
    const map = (box.elements ?? []).find(isLocationMap) as DesignElement | undefined;
    if (!setup.fromProject || !map?.uuid) return [];
    const address = (box.elements ?? []).find(isLocationAddress) as DesignElement | undefined;
    // The project has no postcode: its place's postcode is always empty
    const town = setup.show.city ? ["city"] : [];
    const region = [setup.show.state ? "state" : "", setup.show.country ? "country" : ""].filter(Boolean);
    const lines = [
      ...(setup.show.address ? [{ paths: ["projectLocation"] }] : []),
      ...(town.length ? [{ paths: town, separator: " " }] : []),
      ...(region.length ? [{ paths: region, separator: ", " }] : []),
    ];
    return [{
      name: bandName(MAP_BAND_PREFIX, map.uuid),
      kind: "map",
      label: t("reportBands.labels.map"),
      fills: {
        image: map.uuid,
        addressText: setup.layout === "mapOnly" ? null : address?.uuid ?? null,
        width: Math.round(map.width),
        height: Math.round(map.height),
        zoom: setup.zoom,
      },
      latitudePath: "latitude",
      longitudePath: "longitude",
      addressLines: lines,
      lineSeparator: "\n",
    }];
  });
}

// The report's run parameters: the project (the template's by default) and
// the day the moving date ranges are worked out from (today by default)
function runParameters(project: ReportProject | undefined): BandParameterSpec[] {
  return [
    {
      alias: PROJECT_PARAMETER,
      name: t("reportBands.parameters.project"),
      type: "ENTITY",
      entity: Entity.PROJECT,
      required: true,
      ...(project?.id ? { defaultValue: project.id } : {}),
    },
    {
      alias: REPORT_DATE_PARAMETER,
      name: t("reportBands.parameters.reportDate"),
      type: "DATE",
      required: true,
      defaultIsToday: true,
    },
  ];
}

export function buildReportBands(bands: Band[], project: ReportProject | undefined): ReportBandsPayload {
  const details = projectBand(bands);
  const list: BandSpec[] = [
    ...(details ? [details] : []),
    ...tableBands(bands),
    ...chartBands(bands),
    ...mapBands(bands),
  ];
  return { parameters: runParameters(project), bands: list };
}
