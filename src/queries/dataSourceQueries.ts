// A project's table sources, their columns and filter choices, and table rows,
// through TanStack Query. Components use the options with useQuery /
// useQueries; the setup popups, the AI assistant and printing use the fetch
// functions, which read the same cache. The tables and their columns are the
// CDP entities (GET /v2/entities, services/reportDataService.ts): one list, fetched
// once and shared by every project and every table.

import { queryOptions } from "@tanstack/vue-query";
import { reportDataApi } from "@/services/reportDataService";
import { toSourceFacets, toSourceSchema, toSourceSummary } from "@/services/helpers/entityMappers";
import type { DataQuery, DataQueryResult, DataSourceSchema, SourceFacets } from "@/types/dataSource";
import type { EntityMetadata } from "@/types/entityMetadata";
import { DATA_STALE_TIME, queryClient } from "./queryClient";
import { chartKeys, dataSourceKeys, projectKeys } from "./queryKeys";

// Every entity with its fields
export const entitiesQuery = () =>
  queryOptions({
    queryKey: dataSourceKeys.entities(),
    queryFn: ({ signal }) => reportDataApi.getEntities(signal),
    staleTime: DATA_STALE_TIME,
  });

const schemaFrom = (entities: EntityMetadata[], sourceId: string): DataSourceSchema | undefined => {
  const entity = entities.find((e) => e.entityName === sourceId);
  return entity ? toSourceSchema(entity) : undefined;
};

// The same request (columns, filters, sort) with more rows, or all of them,
// answered or on its way: its first rows are this one's answer, so asking for
// fewer never calls the backend again (the setup popup's preview asks for
// 500, the canvas then for 5)
const coversLimit = (other: number | undefined, limit: number | undefined) =>
  limit !== undefined && (other === undefined || other > limit);

function largerRowsRequest(projectId: string, sourceId: string, query: DataQuery, answeredOnly: boolean) {
  const { limit, ...rest } = query;
  const wanted = JSON.stringify(rest);
  for (const cached of queryClient.getQueryCache().findAll({ queryKey: dataSourceKeys.rowsOf(projectId, sourceId) })) {
    const other = cached.queryKey[cached.queryKey.length - 1] as DataQuery | undefined;
    if (!other || !coversLimit(other.limit, limit)) continue;
    const { limit: _otherLimit, ...otherRest } = other;
    if (JSON.stringify(otherRest) !== wanted) continue;
    const data = cached.state.data as DataQueryResult | undefined;
    if (data || (!answeredOnly && cached.state.fetchStatus === "fetching")) {
      return { query: other, data, updatedAt: cached.state.dataUpdatedAt };
    }
  }
  return undefined;
}

const firstRows = (data: DataQueryResult, limit: number | undefined): DataQueryResult =>
  limit === undefined ? data : { ...data, rows: data.rows.slice(0, limit) };

// Rows for one request; tables asking the same share the answer
export function rowsQuery(projectId: string, sourceId: string, query: DataQuery) {
  const answered = () => largerRowsRequest(projectId, sourceId, query, true);
  return queryOptions({
    queryKey: dataSourceKeys.rows(projectId, sourceId, query),
    queryFn: async ({ signal }): Promise<DataQueryResult> => {
      const larger = largerRowsRequest(projectId, sourceId, query, false);
      if (larger) {
        const data = await queryClient.fetchQuery(rowsQuery(projectId, sourceId, larger.query));
        return firstRows(data, query.limit);
      }
      return reportDataApi.getTableRows(projectId, sourceId, query, signal);
    },
    staleTime: DATA_STALE_TIME,
    initialData: () => {
      const found = answered();
      return found?.data ? firstRows(found.data, query.limit) : undefined;
    },
    initialDataUpdatedAt: () => answered()?.updatedAt,
  });
}

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
