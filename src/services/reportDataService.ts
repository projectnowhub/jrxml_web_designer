// Report Data API: every backend call for the data a report shows, and only
// the calls. They all go through apiClient (the login, tenant, 401 / 503
// handling and errors); caching is TanStack Query's (queries/projectQueries.ts,
// queries/dataSourceQueries.ts, utils/chart/chartDataStore.ts).
//
//   1. Projects       GET  /rest/entities/cdp_Project   getProjectsPage
//   2. Tables         GET  /v2/entities                 getEntities
//   3. Table rows     GET  /v2/table/{entityName}       getTableRows
//   4. Chart numbers  POST /v2/analytics/aggregate      postChartAggregate
//
// What they use, kept apart:
//   constants/reportDataConstants.ts   page sizes, fetch plans, contract entities
//   enums/entityName.ts                CDP entity names (Entity)
//   types/jmix.ts                      Jmix filter / list request and answer
//   services/helpers/
//     jmixListHelpers.ts     the /v2/table query string, reading its answer
//     jmixFilterHelpers.ts   project condition (project.id / contract.project.id), table filters
//     projectMappers.ts      a project → summary / details for Report Data
//     entityMappers.ts       an entity → table, columns, filter choices
//     tableRowMappers.ts     a record's value → what its cell prints
//
// 1. Projects: whole (fetch plan project-details-fp, with dynamic
//    attributes), A to Z by name, 30 a page; never filtered by search
//    (searching is done in the browser). A chosen project is taken from the pages.
// 2. Tables: every CDP entity with its fields, the same for every project.
// 3. Rows: the entity's records in the project, like the CDP app's lists
//    (filter = the project condition AND the table's filters; sort = the
//    table's or newest first). Moving date ranges are turned into dates first;
//    a backend running a saved report must do the same with that day's date.
// 4. Chart numbers: the analytics endpoint of the CDP app's dashboards
//    (requests built by utils/chart/chartQuery.ts).

import apiClient, { unwrap } from "./apiClient";
import { API_ROUTES } from "@/config/apiConfig";
import {
  JMIX_PAGE_SIZE,
  LIST_FETCH_PLANS,
  PROJECT_DETAILS_FETCH_PLAN,
  TABLE_ROWS_LIMIT,
} from "@/constants/reportDataConstants";
import { Entity } from "@/enums/entityName";
import type { EntityMetadata } from "@/types/entityMetadata";
import type { AggregateRequest, AggregateResult, DataQuery, DataQueryResult, DataRow, ProjectRecord } from "@/types/dataSource";
import type { ApiResponse } from "@/types/api";
import type { JmixListParams, JmixListResponse, JmixRecord } from "@/types/jmix";
import { resolveFilterDates } from "@/utils/table/dataBinding";
import { buildJmixListQuery, readJmixListResponse } from "./helpers/jmixListHelpers";
import { projectCondition, tableFilterConditions } from "./helpers/jmixFilterHelpers";
import { projectKey } from "./helpers/projectMappers";
import { toTableCellValue } from "./helpers/tableRowMappers";

// One page of an entity list: the request every list call below makes
async function getJmixListPage<TRow>(
  entityName: Entity | (string & {}),
  params: JmixListParams,
  signal?: AbortSignal,
): Promise<JmixListResponse<TRow>> {
  const { data, headers } = await apiClient.requestWithHeaders<ApiResponse<TRow[]>>(
    `${API_ROUTES.table}/${encodeURIComponent(entityName)}?${buildJmixListQuery(params)}`,
    { method: "GET", signal },
  );
  return readJmixListResponse<TRow>(entityName, data, headers, params);
}

// ---- 1. Projects --------------------------------------------------------------
// Jmix /rest/entities (the CDP app's projectApi reads projects there; its rows
// carry each project's id, which /v2/table leaves out), with the whole project
// (project-details-fp + dynamic attributes): a list page is all Report Data needs

const PROJECTS_PATH = `${API_ROUTES.restEntities}/${Entity.PROJECT}`;

// One page of the projects, A to Z by name
export async function getProjectsPage(
  { offset = 0 }: { offset?: number } = {},
  signal?: AbortSignal,
): Promise<JmixListResponse<ProjectRecord>> {
  const params: JmixListParams = {
    limit: JMIX_PAGE_SIZE,
    offset,
    sort: [{ id: "projectTitle", desc: false }],
    fetchPlan: PROJECT_DETAILS_FETCH_PLAN,
    dynamicAttributes: true,
  };
  const { data, headers } = await apiClient.requestWithHeaders<ApiResponse<ProjectRecord[]>>(
    `${PROJECTS_PATH}?${buildJmixListQuery(params, "fetchPlan")}`,
    { method: "GET", signal },
  );
  const page = readJmixListResponse<ProjectRecord>(Entity.PROJECT, data, headers, params);
  return { ...page, rows: page.rows.filter((p) => p && projectKey(p)) };
}

// ---- 2. Tables (CDP entities and their fields) --------------------------------

export async function getEntities(signal?: AbortSignal): Promise<EntityMetadata[]> {
  const entities = unwrap(await apiClient.get<ApiResponse<EntityMetadata[]>>(API_ROUTES.entities, { signal }));
  if (!Array.isArray(entities)) throw new Error("The entity list is not a list");
  return entities.filter((e) => e?.entityName);
}

// ---- 3. Table rows ------------------------------------------------------------

// The project's rows of an entity: only the asked columns, newest first unless
// sorted, at most TABLE_ROWS_LIMIT (25) in one request
export async function getTableRows(
  projectId: string,
  sourceId: string,
  query: DataQuery,
  signal?: AbortSignal,
): Promise<DataQueryResult> {
  const page = await getJmixListPage<JmixRecord>(
    sourceId,
    {
      limit: Math.min(query.limit ?? TABLE_ROWS_LIMIT, TABLE_ROWS_LIMIT),
      offset: 0,
      filter: {
        group: "AND",
        conditions: [projectCondition(sourceId, projectId), ...tableFilterConditions(resolveFilterDates(query.filters))],
      },
      sort: query.sort.length
        ? query.sort.map((s) => ({ id: s.column, desc: s.direction === "desc" }))
        : [{ id: "createdDate", desc: true }],
      fetchPlan: LIST_FETCH_PLANS[sourceId],
      dynamicAttributes: true,
    },
    signal,
  );
  const rows: DataRow[] = page.rows.map((record) =>
    Object.fromEntries(query.columns.map((key) => [key, toTableCellValue(record[key])])),
  );
  return { rows, totalCount: page.total };
}

// ---- 4. Chart numbers ---------------------------------------------------------

// A chart's numbers for one series
export async function postChartAggregate(request: AggregateRequest, signal?: AbortSignal): Promise<AggregateResult> {
  const body = await apiClient.post<ApiResponse<AggregateResult>>(API_ROUTES.analytics, JSON.stringify(request), { signal });
  return unwrap(body);
}

export const reportDataApi = { getProjectsPage, getEntities, getTableRows, postChartAggregate };
