// details.json (types/reportDetails.ts): where the template's data comes
// from, built from the design for the report server, which will fetch the
// data itself from it later (today the designer does: utils/reportRun.ts).
// The requests are the designer's own (the project condition and filters of
// a table's rows request, a chart's analytics requests), with the project and
// the moving date ranges left as {{…}} for the server to fill in on the day.

import i18n from "@/i18n";
import type { Band, ChartElement, DesignElement, FrameElement } from "@/types";
import type { ChartBinding, ReportProject, TableFilter } from "@/types/dataSource";
import type {
  ReportChartEntry,
  ReportDetails,
  ReportListEntry,
  ReportMapEntry,
  ReportTableEntry,
  ReportUserDefinedEntry,
  ReportValueEntry,
  ReportValueSource,
} from "@/types/reportDetails";
import { LIST_FETCH_PLANS, REPORT_ROWS_LIMIT } from "@/constants/reportDataConstants";
import { PROJECT_STATUS } from "@/types/entities";
import { projectCondition, tableFilterConditions } from "@/services/helpers/jmixFilterHelpers";
import { chartRequests } from "./chart/chartQuery";
import { normalizeChartBinding } from "./chart/chartTypes";
import { getLocationSetup, isLocationAddress, isLocationMap, locationBoxes } from "./location/locationElement";
import { getProjectValueLink, isProjectDateKey, linkParamName, PROJECT_DATE_FORMAT, projectValueElements } from "./projectValue";
import { dayFormatPattern } from "./dateElement";
import { collectBoundTables } from "./table/tableDocument";

const PROJECT = "{{projectId}}";
// Dates as Report Data writes them ("Jan 15, 2025")
const DATE = { format: "date", pattern: "MMM d, yyyy" } as const;

const statusLabels = (): Record<string, string> =>
  Object.fromEntries(Object.values(PROJECT_STATUS).map((s) => [s, i18n.global.t(`reportData.projectStatus.${s.toLowerCase()}`)]));

// Where each linked detail's value is on the project record
function valueSource(key: string): ReportValueSource | null {
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
const LIST_COLUMNS: Record<string, { path: string; single?: boolean; columns: Record<string, ReportValueSource> }> = {
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

// A moving date range stays a placeholder, filled in on the day the report runs
const withPlaceholders = (filters: TableFilter[] = []): TableFilter[] =>
  filters.map((f) =>
    f.operator === "between" && f.period
      ? { ...f, type: "date", period: undefined, value: `{{${f.period}.from}}`, value2: `{{${f.period}.to}}` }
      : f,
  );

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

function linkedValues(bands: Band[]) {
  const groups = { details: [] as ReportValueEntry[], location: [] as ReportValueEntry[], userDefined: [] as ReportUserDefinedEntry[] };
  const seen = new Set<string>();
  for (const element of projectValueElements(bands)) {
    const link = getProjectValueLink(element);
    if (!link) continue;
    const param = linkParamName(link);
    if (seen.has(param)) continue;
    seen.add(param);
    if (link.key.startsWith("more.")) {
      groups.userDefined.push({ param, code: link.key.slice(5), label: link.label });
      continue;
    }
    const found = valueSource(link.key);
    if (!found) continue;
    // A date is written in the look its text uses, like the Date element
    const source = isProjectDateKey(link.key)
      ? { ...found, pattern: dayFormatPattern(link.format ?? PROJECT_DATE_FORMAT) }
      : found;
    const group = link.key.startsWith("location.") ? groups.location : groups.details;
    group.push({ param, ...source });
  }
  return groups;
}

function maps(bands: Band[]): ReportMapEntry[] {
  return [...locationBoxes(bands)].flatMap((box) => {
    const setup = getLocationSetup(box);
    const map = (box.elements ?? []).find(isLocationMap) as DesignElement | undefined;
    if (!setup.fromProject || !map?.uuid) return [];
    const address = (box.elements ?? []).find(isLocationAddress) as DesignElement | undefined;
    const town = [setup.show.postcode ? "postcode" : "", setup.show.city ? "city" : ""].filter(Boolean);
    const region = [setup.show.state ? "state" : "", setup.show.country ? "country" : ""].filter(Boolean);
    // The project has no postcode: its place's postcode is always empty
    const lines = [
      ...(setup.show.address ? [{ paths: ["projectLocation"] }] : []),
      ...(town.filter((f) => f !== "postcode").length ? [{ paths: town.filter((f) => f !== "postcode"), separator: " " }] : []),
      ...(region.length ? [{ paths: region, separator: ", " }] : []),
    ];
    return [{
      uuid: map.uuid,
      addressUuid: setup.layout === "mapOnly" ? null : address?.uuid ?? null,
      latitudePath: "latitude",
      longitudePath: "longitude",
      addressLines: lines,
      lineSeparator: "\n",
      zoom: setup.zoom,
      width: Math.round(map.width),
      height: Math.round(map.height),
    }];
  });
}

export function buildReportDetails(bands: Band[], project: ReportProject | undefined): ReportDetails {
  const tables = collectBoundTables(bands).filter((t) => t.binding.columns.length);
  const lists: ReportListEntry[] = tables
    .filter((t) => t.binding.list && LIST_COLUMNS[t.binding.list])
    .map(({ binding }) => {
      const list = LIST_COLUMNS[binding.list!]!;
      return {
        datasetName: binding.datasetName,
        name: binding.tableName,
        path: list.path,
        ...(list.single ? { single: true } : {}),
        columns: binding.columns.map((c) => ({ field: c.key, ...(list.columns[c.key] ?? { path: c.key }) })),
      };
    });
  const dataTables: ReportTableEntry[] = tables
    .filter((t) => !t.binding.list && t.binding.sourceId)
    .map(({ binding: b }) => ({
      datasetName: b.datasetName,
      name: b.tableName,
      entityName: b.sourceId,
      ...(LIST_FETCH_PLANS[b.sourceId] ? { fetchPlan: LIST_FETCH_PLANS[b.sourceId] } : {}),
      columns: b.columns.map((c) => ({ field: c.key, ...(c.linked ? { linked: true } : {}) })),
      filter: { group: "AND", conditions: [projectCondition(b.sourceId, PROJECT), ...tableFilterConditions(withPlaceholders(b.filters))] },
      sort: b.sort.length ? b.sort.map((s) => ({ id: s.column, desc: s.direction === "desc" })) : [{ id: "createdDate", desc: true }],
      maxRows: REPORT_ROWS_LIMIT,
    }));
  const chartEntries: ReportChartEntry[] = [...charts(bands)].flatMap((element) => {
    const binding = normalizeChartBinding(element.binding);
    const requests = chartRequests({ ...binding, projectId: binding.projectId ? PROJECT : undefined, filters: withPlaceholders(binding.filters) });
    if (!requests.length || !element.uuid) return [];
    const { filters: _filters, projectName: _name, ...drawing } = binding;
    const options: ChartBinding = { ...drawing, projectId: PROJECT };
    return [{ uuid: element.uuid, name: binding.title, width: Math.round(element.width), height: Math.round(element.height), requests, options }];
  });
  return {
    defaults: {
      projectId: project?.id ?? "",
      projectName: project?.name ?? "",
    },
    projectData: {
      ...linkedValues(bands),
      maps: maps(bands),
      lists,
      tables: dataTables,
      charts: chartEntries,
    },
  };
}
