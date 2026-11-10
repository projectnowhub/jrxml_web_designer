// Every TanStack Query key, in one place (like the CDP app's dashboardKeys):
// hooks, fetchQuery calls and invalidations build their keys from here, so
// they always match. A shorter key is the prefix of the longer ones:
// invalidating projectKeys.all marks every project query stale.

import type { AggregateRequest, DataQuery } from "@/types/dataSource";
import type { TemplateQuery } from "@/types/template";
import type { ProjectPhotoQuery } from "@/types/projectPhoto";
import type { ReportDefinitionQuery } from "@/types/reportCatalog";

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
  // One total of a table's totals row (one analytics request per total column)
  total: (projectId: string, sourceId: string, request: AggregateRequest) =>
    [...dataSourceKeys.all, projectId, "source", sourceId, "total", request] as const,
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

// The report server's templates (Report Definitions) and the Jmix reports
export const reportCatalogKeys = {
  all: ["reportCatalog"] as const,
  definitions: () => [...reportCatalogKeys.all, "definitions"] as const,
  definitionPage: (query: ReportDefinitionQuery) => [...reportCatalogKeys.definitions(), "page", query] as const,
  // Grid: pages added while scrolling
  definitionPages: (query: Omit<ReportDefinitionQuery, "page">) =>
    [...reportCatalogKeys.definitions(), "infinite", query] as const,
  // The report server's default templates (Report Definitions, read only)
  defaultTemplates: () => [...reportCatalogKeys.all, "defaultTemplates"] as const,
  defaultTemplatePage: (query: ReportDefinitionQuery) => [...reportCatalogKeys.defaultTemplates(), "page", query] as const,
  defaultTemplatePages: (query: Omit<ReportDefinitionQuery, "page">) =>
    [...reportCatalogKeys.defaultTemplates(), "infinite", query] as const,
  // One default template with its JRXML, ready to open
  defaultTemplate: (id: string) => [...reportCatalogKeys.defaultTemplates(), "detail", id] as const,
  reports: () => [...reportCatalogKeys.all, "reports"] as const,
  reportList: () => [...reportCatalogKeys.reports(), "list"] as const,
  report: (id: string) => [...reportCatalogKeys.reports(), "detail", id] as const,
};

export const photoKeys = {
  all: ["projectPhotos"] as const,
  // One page of a project's photos, with its filters
  page: (query: ProjectPhotoQuery) => [...photoKeys.all, query.projectId, query] as const,
  // Every photo tag (the same for every project)
  tags: () => [...photoKeys.all, "tags"] as const,
};

export const fileKeys = {
  all: ["fileBlob"] as const,
  // A stored file (e.g. the user's avatar), by its fileRef text
  blob: (fileRef: string) => [...fileKeys.all, fileRef] as const,
};
