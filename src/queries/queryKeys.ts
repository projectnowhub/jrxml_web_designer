// Every TanStack Query key, in one place (like the CDP app's dashboardKeys):
// hooks, fetchQuery calls and invalidations build their keys from here, so
// they always match. A shorter key is the prefix of the longer ones:
// invalidating projectKeys.all marks every project query stale.

import type { AggregateRequest, DataQuery } from "@/types/dataSource";
import type { TemplateQuery } from "@/types/template";

export const projectKeys = {
  all: ["projects"] as const,
  // The picker's list, a page at a time (searched in the browser)
  list: () => [...projectKeys.all, "list"] as const,
  // Every page at once (the AI assistant's search)
  everything: () => [...projectKeys.all, "everything"] as const,
  // One project by its key (projectKey in services/helpers/projectMappers.ts)
  detail: (key: string) => [...projectKeys.all, "detail", key] as const,
};

export const dataSourceKeys = {
  all: ["dataSources"] as const,
  // Every table (CDP entity) and its columns, the same for every project
  entities: () => [...dataSourceKeys.all, "entities"] as const,
  // Every rows request of one table (prefix of rows())
  rowsOf: (projectId: string, sourceId: string) => [...dataSourceKeys.all, projectId, "source", sourceId, "rows"] as const,
  rows: (projectId: string, sourceId: string, query: DataQuery) =>
    [...dataSourceKeys.rowsOf(projectId, sourceId), query] as const,
};

export const chartKeys = {
  all: ["chartData"] as const,
  // A chart's numbers: one answer per request (moving date ranges are in the
  // requests as today's dates, so tomorrow asks again)
  data: (requests: AggregateRequest[]) => [...chartKeys.all, requests] as const,
};

export const templateKeys = {
  all: ["templates"] as const,
  lists: () => [...templateKeys.all, "list"] as const,
  list: (query: TemplateQuery) => [...templateKeys.lists(), query] as const,
  // Grid: pages added while scrolling
  infinite: (query: Omit<TemplateQuery, "page">) => [...templateKeys.all, "infinite", query] as const,
  detail: (id: string) => [...templateKeys.all, "detail", id] as const,
};
