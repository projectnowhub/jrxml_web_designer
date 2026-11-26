// The Templates page (the report server's Report Definitions) and the Reports
// page (Jmix reports), through TanStack Query. Creating a report invalidates
// the reports, so the Reports page fetches again.

import { infiniteQueryOptions, queryOptions, useMutation } from "@tanstack/vue-query";
import {
  getReport,
  getReportDefinition,
  getReportDefinitionsFromServer,
  getReportsFromServer,
  postCopyTemplate,
  postCreateTemplate,
  deleteTenantReport,
} from "@/services/reportCatalogService";
import { ApiError } from "@/services/apiClient";
import { readReportTemplatesJrxml } from "@/services/helpers/templateContentHelpers";
import { toReportDefinitionSummary } from "@/services/helpers/reportCatalogMappers";
import { clearActiveTemplate, readActiveTemplate } from "@/utils/activeTemplate";
import type { CreateTemplateRequest, DefaultTemplate, ReportDefinitionQuery } from "@/types/reportCatalog";
import {
  DEFAULT_TEMPLATE_STALE_TIME,
  TEMPLATE_NAME_PAGE_SIZE,
  TEMPLATE_SEARCH_LIMIT,
  TEMPLATE_SEARCH_MIN_LETTERS,
  TEMPLATE_SEARCH_STALE_TIME,
} from "@/constants/reportCatalogConstants";
import { queryClient } from "./queryClient";
import { reportCatalogKeys } from "./queryKeys";

// The report server's templates (rptadn_TenantReport, read only): the default
// ones (query.isDefault true) or the tenant's own (false); pages of `size`
// added with "Show more"; a search matches every word in the name
export const defaultTemplateGridQuery = (query: Omit<ReportDefinitionQuery, "page" | "size">, size: number) =>
  infiniteQueryOptions({
    queryKey: reportCatalogKeys.defaultTemplatePages({ ...query, size }),
    queryFn: ({ pageParam }) => getReportDefinitionsFromServer({ ...query, page: pageParam, size }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.reduce((sum, p) => sum + p.items.length, 0) < lastPage.total && lastPage.items.length
        ? allPages.length + 1
        : undefined,
    staleTime: DEFAULT_TEMPLATE_STALE_TIME,
  });

// The server templates' List view: one page (default or the tenant's own, query.isDefault)
export const defaultTemplatePageQuery = (query: ReportDefinitionQuery) =>
  queryOptions({
    queryKey: reportCatalogKeys.defaultTemplatePage(query),
    queryFn: () => getReportDefinitionsFromServer(query),
    staleTime: DEFAULT_TEMPLATE_STALE_TIME,
  });

const isClientError = (error: Error) =>
  error instanceof ApiError && error.status !== undefined && error.status >= 400 && error.status < 500;

// One server template (default or the tenant's own) with its JRXML, always
// from its Jmix report's templates' content; content that can't be opened
// gives jrxml "" and the reason (`problem`): the designer opens an empty layout
export const defaultTemplateQuery = (id: string) =>
  queryOptions({
    queryKey: reportCatalogKeys.defaultTemplate(id),
    queryFn: async (): Promise<DefaultTemplate> => {
      const definition = await getReportDefinition(id);
      const summary = toReportDefinitionSummary(definition);
      return {
        id: definition.id,
        name: summary.name,
        isDefault: summary.isDefault,
        ...readReportTemplatesJrxml(definition.report),
      };
    },
    staleTime: DEFAULT_TEMPLATE_STALE_TIME,
    // Only a server or network error is worth trying again (the client's default)
    retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
  });

// For the designer, which opens it outside a component's lifetime
export const fetchDefaultTemplate = (id: string) => queryClient.fetchQuery(defaultTemplateQuery(id));

// Every report the user may run (GET /rest/reports/report; the list comes whole)
export const reportListQuery = () =>
  queryOptions({
    queryKey: reportCatalogKeys.reportList(),
    queryFn: () => getReportsFromServer(),
  });

// One report with its templates and run parameters (`enabled` false: not yet)
export const reportDetailQuery = (id: string, enabled = true) =>
  queryOptions({
    queryKey: reportCatalogKeys.report(id),
    queryFn: () => getReport(id),
    enabled: enabled && !!id,
  });

// A report was made: the Reports page fetches again
export const invalidateReports = () => queryClient.invalidateQueries({ queryKey: reportCatalogKeys.reports() });

// The tenant's own templates were changed (created, duplicated, deleted): only
// the lists asked with isDefault false fetch again ("Templates"); the default
// templates never change from here
const isOwnTemplateList = (key: readonly unknown[]) => {
  const query = key[3];
  return (
    key[1] === "defaultTemplates" &&
    (key[2] === "page" || key[2] === "infinite") &&
    typeof query === "object" &&
    query !== null &&
    (query as ReportDefinitionQuery).isDefault === false
  );
};
export const refetchOwnTemplateLists = () =>
  queryClient.invalidateQueries({
    queryKey: reportCatalogKeys.defaultTemplates(),
    predicate: (query) => isOwnTemplateList(query.queryKey),
  });

// Duplicate a server template (POST /v2/reports/copy with the template's own
// id, the rptadn_TenantReport row's); the copy lands in the tenant's own
// templates, so only those lists (isDefault false) fetch again
export function useCopyTemplate() {
  return useMutation({
    mutationFn: (id: string) => postCopyTemplate({ id }),
    onSuccess: () => refetchOwnTemplateLists(),
  });
}

// Delete one of the tenant's own server templates (DELETE
// /v2/table/rptadn_TenantReport/{id}); only the isDefault false lists fetch again
export function useDeleteServerTemplate() {
  return useMutation({
    mutationFn: (id: string) => deleteTenantReport(id),
    onSuccess: (_answer, id) => {
      queryClient.removeQueries({ queryKey: reportCatalogKeys.defaultTemplate(id) });
      // Its changes kept in this browser go with it
      if (readActiveTemplate()?.id === id) clearActiveTemplate();
      return refetchOwnTemplateLists();
    },
  });
}

// Create a template (POST /v2/reports/create); it lands in the tenant's own
// templates, so only those lists (isDefault false) fetch again
export function useCreateTemplate() {
  return useMutation({
    mutationFn: (request: CreateTemplateRequest) => postCreateTemplate(request),
    onSuccess: () => refetchOwnTemplateLists(),
  });
}

// Every template name (default and the tenant's own) containing `words`, read
// page after page; always fresh, since another user may have just made one
export const fetchTemplateNames = (words: string) =>
  queryClient.fetchQuery({
    queryKey: reportCatalogKeys.templateNames(words),
    queryFn: async (): Promise<string[]> => {
      const names: string[] = [];
      for (let page = 1; ; page++) {
        const { items, total } = await getReportDefinitionsFromServer(
          { nameContains: words, page, size: TEMPLATE_NAME_PAGE_SIZE, sort: "name", dir: "asc" },
        );
        names.push(...items.map((item) => item.name));
        if (!items.length || names.length >= total) return names;
      }
    },
    staleTime: 0,
  });

// The id of the newest of the tenant's own templates named exactly `name`:
// the one just created (the create answers no id, and names may repeat);
// null when not found
export async function fetchNewestTemplateIdByName(name: string): Promise<string | null> {
  const wanted = name.trim().toLowerCase();
  const { items } = await getReportDefinitionsFromServer({
    isDefault: false,
    nameContains: name.trim(),
    page: 1,
    size: TEMPLATE_NAME_PAGE_SIZE,
    sort: "createdDate",
    dir: "desc",
  });
  return items.find((item) => item.name.trim().toLowerCase() === wanted)?.id ?? null;
}

// The top bar's search: the first TEMPLATE_SEARCH_LIMIT templates (default and
// the tenant's own, no isDefault filter) whose name contains the typed words, A to Z
export const templateSearchQuery = (words: string) =>
  queryOptions({
    queryKey: reportCatalogKeys.templateSearch(words),
    queryFn: () =>
      getReportDefinitionsFromServer(
        { nameContains: words, page: 1, size: TEMPLATE_SEARCH_LIMIT, sort: "name", dir: "asc" },
      ),
    enabled: words.length >= TEMPLATE_SEARCH_MIN_LETTERS,
    staleTime: TEMPLATE_SEARCH_STALE_TIME,
  });

// The newest of the tenant's own templates whose name contains `name`: the
// copy just made of a template named so, when the copy answers no id
export async function fetchNewestCopyId(name: string): Promise<string | null> {
  const { items } = await getReportDefinitionsFromServer({
    isDefault: false,
    nameContains: name.trim(),
    page: 1,
    size: 1,
    sort: "createdDate",
    dir: "desc",
  });
  return items[0]?.id ?? null;
}
