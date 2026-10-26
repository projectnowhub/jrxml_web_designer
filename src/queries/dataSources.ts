// A project's table sources, their columns and filter choices, and table rows,
// through TanStack Query. Components use the options with useQuery /
// useQueries; the setup popups, the AI assistant and printing use the fetch
// functions, which read the same cache. The tables and their columns are the
// CDP entities (GET /v2/entities, services/entityService.ts): one list, fetched
// once and shared by every project and every table.

import { queryOptions } from "@tanstack/vue-query";
import { dataSourceApi } from "@/services/dataSourceService";
import { entityApi, toSourceFacets, toSourceSchema, toSourceSummary } from "@/services/entityService";
import type { DataQuery, DataQueryResult, DataSourceSchema, SourceFacets } from "@/types/dataSource";
import type { EntityMetadata } from "@/types/entityMetadata";
import { DATA_STALE_TIME, queryClient } from "./queryClient";
import { chartKeys, dataSourceKeys, projectKeys } from "./keys";

// Every entity with its fields
export const entitiesQuery = () =>
  queryOptions({
    queryKey: dataSourceKeys.entities(),
    queryFn: ({ signal }) => entityApi.list(signal),
    staleTime: DATA_STALE_TIME,
  });

const schemaFrom = (entities: EntityMetadata[], sourceId: string): DataSourceSchema | undefined => {
  const entity = entities.find((e) => e.entityName === sourceId);
  return entity ? toSourceSchema(entity) : undefined;
};

// Rows for one request (columns, filters, sort, limit); tables asking the
// same share the answer
// The same request with more rows (or all of them) already answered: its first
// rows are this one's answer, so asking for fewer never calls the backend
// again (the setup popup's preview asks for 500, the canvas then for 5)
function cachedLargerAnswer(projectId: string, sourceId: string, query: DataQuery) {
  const { limit, ...rest } = query;
  const wanted = JSON.stringify(rest);
  for (const [key, data] of queryClient.getQueriesData<DataQueryResult>({ queryKey: dataSourceKeys.rowsOf(projectId, sourceId) })) {
    const other = key[key.length - 1] as DataQuery | undefined;
    if (!data || !other) continue;
    const { limit: otherLimit, ...otherRest } = other;
    const covers = otherLimit === undefined || (limit !== undefined && otherLimit >= limit);
    if (!covers || JSON.stringify(otherRest) !== wanted) continue;
    const state = queryClient.getQueryState(key);
    return { data: { ...data, rows: limit === undefined ? data.rows : data.rows.slice(0, limit) }, updatedAt: state?.dataUpdatedAt };
  }
  return undefined;
}

export const rowsQuery = (projectId: string, sourceId: string, query: DataQuery) =>
  queryOptions({
    queryKey: dataSourceKeys.rows(projectId, sourceId, query),
    queryFn: ({ signal }) => dataSourceApi.queryRows(projectId, sourceId, query, signal),
    staleTime: DATA_STALE_TIME,
    initialData: () => cachedLargerAnswer(projectId, sourceId, query)?.data,
    initialDataUpdatedAt: () => cachedLargerAnswer(projectId, sourceId, query)?.updatedAt,
  });

// ---- Outside components (same cache) ---------------------------------------

// A project's tables (every project has the same ones; the project only
// decides which rows they hold), and one table's columns
export const fetchSources = async (_projectId: string) =>
  (await queryClient.fetchQuery(entitiesQuery())).map(toSourceSummary);
export async function fetchSchema(_projectId: string, sourceId: string): Promise<DataSourceSchema> {
  const schema = schemaFrom(await queryClient.fetchQuery(entitiesQuery()), sourceId);
  if (!schema) throw new Error(`Unknown data source: ${sourceId}`);
  return schema;
}
// How each column of a table is filtered (from its fields, as the CDP app does)
export async function fetchFacets(_projectId: string, sourceId: string): Promise<SourceFacets> {
  const entity = (await queryClient.fetchQuery(entitiesQuery())).find((e) => e.entityName === sourceId);
  return entity ? toSourceFacets(entity) : {};
}
export const fetchRows = (projectId: string, sourceId: string, query: DataQuery) =>
  queryClient.fetchQuery(rowsQuery(projectId, sourceId, query));

// Report Data's refresh button: projects, sources, columns, rows and chart
// numbers all count as stale; what is on screen is fetched again now, the
// rest the next time it is asked for
export function refreshReportData(): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: projectKeys.all }),
    queryClient.invalidateQueries({ queryKey: dataSourceKeys.all }),
    queryClient.invalidateQueries({ queryKey: chartKeys.all }),
  ]).then(() => undefined);
}
