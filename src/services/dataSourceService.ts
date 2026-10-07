// Report data from the backend: projects, each project's details (name, logo,
// introduction…) and its table sources with their columns and rows (filtered,
// sorted and limited). Uses dummy data until VITE_DATA_SOURCE_API is set;
// callers never need to know which.
//
// Backend contract:
//   GET  {api}/projects                              -> ProjectSummary[]
//   GET  {api}/projects/{pid}                        -> ProjectDetails (fields + values)
//   GET  {api}/projects/{pid}/sources                -> DataSourceSummary[]
//   GET  {api}/projects/{pid}/sources/{id}/schema    -> DataSourceSchema
//   GET  {api}/projects/{pid}/sources/{id}/facets    -> SourceFacets (filter choices per column)
//   POST {api}/projects/{pid}/sources/{id}/query     body: DataQuery -> DataQueryResult
//
// Chart numbers come from the CDP backend's analytics endpoint, the one the
// CDP app's dashboards use (same request and response, see AggregateRequest):
//   POST {VITE_OAUTH_BASE_URL}/v2/analytics/aggregate  body: AggregateRequest -> AggregateResult
// with the user's login. A source's schema names the CDP entity it reads
// (entityName) and its column keys are that entity's property paths.
//
// Project values are ready to print (dates and amounts formatted); an image's
// value is its location. DataQuery filters: every filter must match. "in" =
// the cell equals one of `values` (case-insensitive); "between" = value <=
// cell <= value2, either end optional (dates as ISO yyyy-mm-dd). At most one
// sort; empty cells sort last. A saved "between" filter may carry a `period`
// (thisMonth, lastMonth, thisQuarter, thisYear, last30Days) instead of dates:
// the designer sends it already turned into dates, and a backend running a
// saved report must do the same with that day's date.

import apiClient from "./apiClient";
import { DATA_SOURCE_API } from "@/config/apiConfig";
import { MOCK_PROJECTS } from "@/mocks/projects";
import { aggregateRows, columnFacets, queryRows as queryMockRows } from "@/mocks/queryDataSource";
import { resolveFilterDates } from "@/utils/table/dataBinding";
import type {
  AggregateRequest,
  AggregateResult,
  JmixCondition,
  DataQuery,
  DataQueryResult,
  DataSourceSchema,
  DataSourceSummary,
  ProjectDetails,
  ProjectSummary,
  SourceFacets,
} from "@/types/dataSource";

export const usesMockDataSources = () => !DATA_SOURCE_API;
// Short pause so loading states behave as they will with the real API
const MOCK_DELAY_MS = 150;
const mockDelay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

const findMockProject = (projectId: string) => {
  const project = MOCK_PROJECTS.find((p) => p.id === projectId);
  if (!project) throw new Error(`Unknown project: ${projectId}`);
  return project;
};

const findMockSource = (projectId: string, sourceId: string) => {
  const source = findMockProject(projectId).sources.find((s) => s.id === sourceId);
  if (!source) throw new Error(`Unknown data source: ${projectId}/${sourceId}`);
  return source;
};

const projectPath = (projectId: string) => `projects/${encodeURIComponent(projectId)}`;
const sourcePath = (projectId: string, sourceId: string) =>
  `${projectPath(projectId)}/sources/${encodeURIComponent(sourceId)}`;

// Fetched once per key; a failed fetch is tried again next time
function cached<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  let result = cache.get(key);
  if (!result) {
    result = load();
    result.catch(() => cache.delete(key));
    cache.set(key, result);
  }
  return result;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  if (usesMockDataSources()) {
    await mockDelay();
    return MOCK_PROJECTS.map(({ id, name, code }) => ({ id, name, code }));
  }
  return apiClient.get<ProjectSummary[]>("projects", { baseURL: DATA_SOURCE_API });
}

// A project's details: every text and image item showing one asks for them
const projectCache = new Map<string, Promise<ProjectDetails>>();

export function getProject(projectId: string): Promise<ProjectDetails> {
  return cached(projectCache, projectId, async () => {
    if (usesMockDataSources()) {
      await mockDelay();
      const { sources: _sources, ...details } = findMockProject(projectId);
      return JSON.parse(JSON.stringify(details)) as ProjectDetails;
    }
    return apiClient.get<ProjectDetails>(projectPath(projectId), { baseURL: DATA_SOURCE_API });
  });
}

export async function listSources(projectId: string): Promise<DataSourceSummary[]> {
  if (usesMockDataSources()) {
    await mockDelay();
    return findMockProject(projectId).sources.map(({ id, name, rows }) => ({
      id,
      name,
      rowCount: rows.length,
    }));
  }
  return apiClient.get<DataSourceSummary[]>(`${projectPath(projectId)}/sources`, {
    baseURL: DATA_SOURCE_API,
  });
}

// Several tables can use one source, so its columns are fetched only once
const schemaCache = new Map<string, Promise<DataSourceSchema>>();

export function getSchema(projectId: string, sourceId: string): Promise<DataSourceSchema> {
  return cached(schemaCache, `${projectId}/${sourceId}`, async () => {
    if (usesMockDataSources()) {
      await mockDelay();
      const { id, name, entityName, columns } = findMockSource(projectId, sourceId);
      return { id, name, entityName, columns: columns.map((c) => ({ ...c })) };
    }
    return apiClient.get<DataSourceSchema>(`${sourcePath(projectId, sourceId)}/schema`, {
      baseURL: DATA_SOURCE_API,
    });
  });
}

// Filter choices of a source, fetched once per source like its columns
const facetsCache = new Map<string, Promise<SourceFacets>>();

export function getFacets(projectId: string, sourceId: string): Promise<SourceFacets> {
  return cached(facetsCache, `${projectId}/${sourceId}`, async () => {
    if (usesMockDataSources()) {
      await mockDelay();
      const source = findMockSource(projectId, sourceId);
      return columnFacets(source.rows, source.columns);
    }
    return apiClient.get<SourceFacets>(`${sourcePath(projectId, sourceId)}/facets`, {
      baseURL: DATA_SOURCE_API,
    });
  });
}

// Forget cached project details, columns and filter choices (e.g. after the
// backend changed them)
export function clearSchemaCache(): void {
  projectCache.clear();
  schemaCache.clear();
  facetsCache.clear();
}

export async function queryRows(
  projectId: string,
  sourceId: string,
  query: DataQuery,
  signal?: AbortSignal,
): Promise<DataQueryResult> {
  const sent = { ...query, filters: resolveFilterDates(query.filters) };
  if (usesMockDataSources()) {
    await mockDelay();
    signal?.throwIfAborted();
    const source = findMockSource(projectId, sourceId);
    return queryMockRows(source.rows, source.columns, sent);
  }
  return apiClient.post<DataQueryResult>(
    `${sourcePath(projectId, sourceId)}/query`,
    JSON.stringify(sent),
    { baseURL: DATA_SOURCE_API, signal },
  );
}

// The project a request is for (its globalFilter's project.id)
const projectOf = (request: AggregateRequest): string => {
  const condition = request.globalFilter?.conditions.find(
    (c): c is JmixCondition => "property" in c && c.property === "project.id",
  );
  return condition ? String(condition.value) : "";
};

// The CDP backend may wrap answers as { data, message, status }; like the CDP app's unwrap()
function unwrap<T>(body: unknown): T {
  if (body && typeof body === "object" && !Array.isArray(body) && "data" in body) {
    const envelope = body as { data: T; message?: unknown; status?: unknown };
    if ("message" in envelope || "status" in envelope) return envelope.data;
  }
  return body as T;
}

// A chart's numbers for one series (see the header). With dummy data the same
// request is answered from the dummy rows.
export async function aggregate(request: AggregateRequest, signal?: AbortSignal): Promise<AggregateResult> {
  if (usesMockDataSources()) {
    await mockDelay();
    signal?.throwIfAborted();
    const source = findMockProject(projectOf(request)).sources.find(
      (s) => s.entityName === request.entityName || s.id === request.entityName,
    );
    if (!source) throw new Error(`Unknown data source: ${request.entityName}`);
    return aggregateRows(source.rows, source.columns, request);
  }
  const body = await apiClient.post<unknown>("/analytics/aggregate", JSON.stringify(request), { signal });
  return unwrap<AggregateResult>(body);
}
