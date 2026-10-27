// Report data API (plain calls): a table's filter choices and rows (filtered,
// sorted and limited), and the numbers of charts. The tables and their columns
// are the CDP entities (entityService.ts, GET /v2/entities); the projects are
// in projectService.ts. Caching is TanStack Query's: queries/dataSources.ts,
// utils/chart/chartDataStore.ts.
//
// Rows: the entity's records in the project, read like the CDP app's lists
// (jmixService.ts, createJmixCrudService().list()):
//   GET {VITE_API_BASE_URL}/v2/table/{entityName}?limit&offset=0
//       &fetchPlanName=<the CDP app's list plan, only where it has one>&returnCount=true&dynamicAttributes=true
//       &filter={"group":"AND","conditions":[{"property":"project.id","operator":"in","value":[pid]}, …]}
//       &sort=-createdDate
// The table's filters join the project condition ("in" = ticked values,
// "contains" = typed words, "equals" = "=" true / false, "between" = >= / <=,
// as the CDP app's buildJmixFilter); its sort ("-field" when descending, as the
// CDP app's toSortParam) replaces the newest-first default.
//
// Filter choices come from the table's fields (entityService.ts toSourceFacets).
//
// Chart numbers come from the CDP backend's analytics endpoint, the one the
// CDP app's dashboards use (same request and response, see AggregateRequest):
//   POST {VITE_API_BASE_URL}/v2/analytics/aggregate  body: AggregateRequest -> AggregateResult
// with the user's login. A source's schema names the CDP entity it reads
// (entityName) and its column keys are that entity's property paths.
//
// DataQuery filters: every filter must match. "in" = the cell equals one of
// `values` (case-insensitive); "between" = value <= cell <= value2, either end
// optional (dates as ISO yyyy-mm-dd). At most one sort; empty cells sort last.
// A saved "between" filter may carry a `period` (thisMonth, lastMonth,
// thisQuarter, thisYear, last30Days) instead of dates: the designer sends it
// already turned into dates, and a backend running a saved report must do the
// same with that day's date.

import apiClient, { unwrap } from "./apiClient";
import { jmixList, type JmixListParams } from "./jmixService";
import { API_ROUTES } from "@/config/apiConfig";
import i18n from "@/i18n";
import { Entity, projectPropertyOf } from "@/types/entity";
import { resolveFilterDates } from "@/utils/table/dataBinding";
import type {
  AggregateRequest,
  AggregateResult,
  DataQuery,
  DataQueryResult,
  DataRow,
  JmixCondition,
  TableFilter,
} from "@/types/dataSource";

// The fetch plans the CDP app's lists ask for (its procurement, risk, QA/QC
// and issue registers, projects, companies). Every other list there sends none
// (createJmixCrudService without one, e.g. the compliance register), so the
// server uses its default plan: the entity's own fields, every column a table
// offers. Asking for a plan the server doesn't have fails (500 "FetchPlan …
// not found"), so only these are named.
const LIST_FETCH_PLANS: Record<string, string> = {
  [Entity.PROCUREMENT_REGISTER]: "procurementRegister-list-fp",
  [Entity.RISK_REGISTER]: "riskRegister-list-fp",
  [Entity.QAQC_REGISTER]: "qaQcRegister-list-fp",
  [Entity.ISSUE_REGISTER]: "issueRegister-list-fp",
  [Entity.PROJECT]: "project-list-fp",
  [Entity.STAKEHOLDER]: "company-list-fp",
};

// Rows when a table shows them all (the PDF reads its rows itself)
const ALL_ROWS = 1000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The project's records only: by its UUID, through the contract for contract
// records (payments, variation orders, final accounts, LAD), as the CDP app
// filters them; a code-keyed project falls back to its own reference
function projectCondition(entityName: string, projectId: string): JmixCondition {
  const isUuid = UUID_PATTERN.test(projectId);
  const property = projectPropertyOf(entityName);
  const condition: JmixCondition = {
    property: isUuid ? property : property.replace(/\.id$/, ".projectId"),
    operator: "in",
    value: [projectId],
  };
  // TEMP: check the project filter sent for table rows
  console.log("[rows] project filter", entityName, condition, isUuid ? "" : "(not a UUID: project code sent)");
  return condition;
}

// The table's filters as Jmix conditions (moving date ranges already turned into dates)
function filterConditions(filters: TableFilter[]): JmixCondition[] {
  const asValue = (filter: TableFilter, value: string) =>
    filter.type === "number" || filter.type === "currency" ? Number(value) : value;
  return filters.flatMap((filter): JmixCondition[] => {
    if (filter.operator === "in") {
      return filter.values?.length ? [{ property: filter.column, operator: "in", value: filter.values }] : [];
    }
    if (filter.operator === "contains") {
      const words = (filter.value ?? "").trim();
      return words ? [{ property: filter.column, operator: "contains", value: words }] : [];
    }
    if (filter.operator === "equals") {
      return filter.value === "true" || filter.value === "false"
        ? [{ property: filter.column, operator: "=", value: filter.value === "true" }]
        : [];
    }
    const range: JmixCondition[] = [];
    if (filter.value) range.push({ property: filter.column, operator: ">=", value: asValue(filter, filter.value) });
    if (filter.value2) range.push({ property: filter.column, operator: "<=", value: asValue(filter, filter.value2) });
    return range;
  });
}

// What a cell prints: numbers and text as they are, yes / no in the app's
// language, a linked record by its name
function cellValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return i18n.global.t(value ? "dataTable.yes" : "dataTable.no");
  if (Array.isArray(value)) return value.map(cellValue).filter((v) => v !== null && v !== "").join(", ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const name = record._instanceName ?? record.name ?? record.title;
    return typeof name === "string" ? name : null;
  }
  return String(value);
}

// The project's rows of an entity: only the asked columns, newest first unless sorted
async function queryRows(
  projectId: string,
  sourceId: string,
  query: DataQuery,
  signal?: AbortSignal,
): Promise<DataQueryResult> {
  const params: JmixListParams = {
    limit: query.limit ?? ALL_ROWS,
    offset: 0,
    filter: { group: "AND", conditions: [projectCondition(sourceId, projectId), ...filterConditions(resolveFilterDates(query.filters))] },
    sort: query.sort.length
      ? query.sort.map((s) => ({ id: s.column, desc: s.direction === "desc" }))
      : [{ id: "createdDate", desc: true }],
    dynamicAttributes: true,
  };
  const page = await jmixList<Record<string, unknown>>(
    sourceId,
    { ...params, fetchPlan: LIST_FETCH_PLANS[sourceId] },
    signal,
  );
  const rows: DataRow[] = page.rows.map((record) =>
    Object.fromEntries(query.columns.map((key) => [key, cellValue(record[key])])),
  );
  return { rows, totalCount: page.total };
}

// A chart's numbers for one series (see the header)
async function aggregate(request: AggregateRequest, signal?: AbortSignal): Promise<AggregateResult> {
  const body = await apiClient.post<unknown>(API_ROUTES.analytics, JSON.stringify(request), { signal });
  return unwrap<AggregateResult>(body);
}

export const dataSourceApi = { queryRows, aggregate };
