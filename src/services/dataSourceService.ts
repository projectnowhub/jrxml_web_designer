// Sources for data tables: what can be dropped on a table, its columns, and
// its rows (filtered, sorted and limited). Uses dummy data until
// VITE_DATA_SOURCE_API is set; callers never need to know which.
//
// Backend contract:
//   GET  {api}/sources               -> DataSourceSummary[]
//   GET  {api}/sources/{id}/schema   -> DataSourceSchema
//   POST {api}/sources/{id}/query    body: DataQuery -> DataQueryResult

import apiClient from "./apiClient";
import { DATA_SOURCE_API } from "@/config/apiConfig";
import { MOCK_DATA_SOURCES } from "@/mocks/dataSources";
import { queryRows as queryMockRows } from "@/mocks/queryDataSource";
import type {
  DataQuery,
  DataQueryResult,
  DataSourceSchema,
  DataSourceSummary,
} from "@/types/dataSource";

export const usesMockDataSources = () => !DATA_SOURCE_API;

// Short pause so loading states behave as they will with the real API
const MOCK_DELAY_MS = 150;
const mockDelay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

const findMockSource = (id: string) => {
  const source = MOCK_DATA_SOURCES.find((s) => s.id === id);
  if (!source) throw new Error(`Unknown data source: ${id}`);
  return source;
};

export async function listSources(): Promise<DataSourceSummary[]> {
  if (usesMockDataSources()) {
    await mockDelay();
    return MOCK_DATA_SOURCES.map(({ id, name, rows }) => ({
      id,
      name,
      rowCount: rows.length,
    }));
  }
  return apiClient.get<DataSourceSummary[]>("sources", {
    baseURL: DATA_SOURCE_API,
  });
}

// Several tables can use one source, so its columns are fetched only once
const schemaCache = new Map<string, Promise<DataSourceSchema>>();

export function getSchema(sourceId: string): Promise<DataSourceSchema> {
  let schema = schemaCache.get(sourceId);
  if (!schema) {
    schema = fetchSchema(sourceId);
    // A failed fetch is retried next time
    schema.catch(() => schemaCache.delete(sourceId));
    schemaCache.set(sourceId, schema);
  }
  return schema;
}

// Forget cached columns (e.g. after the backend changed a source)
export function clearSchemaCache(): void {
  schemaCache.clear();
}

async function fetchSchema(sourceId: string): Promise<DataSourceSchema> {
  if (usesMockDataSources()) {
    await mockDelay();
    const { id, name, columns } = findMockSource(sourceId);
    return { id, name, columns: columns.map((c) => ({ ...c })) };
  }
  return apiClient.get<DataSourceSchema>(
    `sources/${encodeURIComponent(sourceId)}/schema`,
    { baseURL: DATA_SOURCE_API },
  );
}

export async function queryRows(
  sourceId: string,
  query: DataQuery,
  signal?: AbortSignal,
): Promise<DataQueryResult> {
  if (usesMockDataSources()) {
    await mockDelay();
    signal?.throwIfAborted();
    const source = findMockSource(sourceId);
    return queryMockRows(source.rows, source.columns, query);
  }
  return apiClient.post<DataQueryResult>(
    `sources/${encodeURIComponent(sourceId)}/query`,
    JSON.stringify(query),
    { baseURL: DATA_SOURCE_API, signal },
  );
}
