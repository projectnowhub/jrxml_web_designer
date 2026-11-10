// The Templates page (the report server's Report Definitions) and the Reports
// page (Jmix reports), through TanStack Query. Creating a report invalidates
// the reports, so the Reports page fetches again.

import { infiniteQueryOptions, queryOptions } from "@tanstack/vue-query";
import {
  getReport,
  getReportDefinition,
  getReportDefinitions,
  getReportDefinitionsFromServer,
  getReports,
} from "@/services/reportCatalogService";
import { getFileBlob } from "@/services/imageService";
import { readReportArchiveJrxml } from "@/services/helpers/reportArchiveHelpers";
import { reportFileName, toReportDefinitionSummary } from "@/services/helpers/reportCatalogMappers";
import type { DefaultTemplate, ReportDefinitionQuery } from "@/types/reportCatalog";
import { DEFAULT_TEMPLATE_STALE_TIME, REPORT_ARCHIVE_ERRORS } from "@/constants/reportCatalogConstants";
import { queryClient } from "./queryClient";
import { reportCatalogKeys } from "./queryKeys";

// The default templates (the report server's Report Definitions, read only):
// pages of `size` added with "Show more"; a search matches every word in the name
export const defaultTemplateGridQuery = (query: Omit<ReportDefinitionQuery, "page" | "size">, size: number) =>
  infiniteQueryOptions({
    queryKey: reportCatalogKeys.defaultTemplatePages({ ...query, size }),
    queryFn: ({ pageParam, signal }) => getReportDefinitionsFromServer({ ...query, page: pageParam, size }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.reduce((sum, p) => sum + p.items.length, 0) < lastPage.total && lastPage.items.length
        ? allPages.length + 1
        : undefined,
    staleTime: DEFAULT_TEMPLATE_STALE_TIME,
  });

// The default templates' List view: one page
export const defaultTemplatePageQuery = (query: ReportDefinitionQuery) =>
  queryOptions({
    queryKey: reportCatalogKeys.defaultTemplatePage(query),
    queryFn: ({ signal }) => getReportDefinitionsFromServer(query, signal),
    staleTime: DEFAULT_TEMPLATE_STALE_TIME,
  });

// One default template with its JRXML: the definition, then its report file
// (a Jmix report export), unzipped in the browser
export const defaultTemplateQuery = (id: string) =>
  queryOptions({
    queryKey: reportCatalogKeys.defaultTemplate(id),
    queryFn: async ({ signal }): Promise<DefaultTemplate> => {
      const definition = await getReportDefinition(id, signal);
      if (!definition.reportFile) throw new Error(REPORT_ARCHIVE_ERRORS.noFile);
      const file = await getFileBlob(definition.reportFile);
      const { jrxml, templateName } = await readReportArchiveJrxml(
        new Uint8Array(await file.arrayBuffer()),
        reportFileName(definition.reportFile),
      );
      return { id: definition.id, name: toReportDefinitionSummary(definition).name, jrxml, templateName };
    },
    staleTime: DEFAULT_TEMPLATE_STALE_TIME,
  });

// For the designer, which opens it outside a component's lifetime
export const fetchDefaultTemplate = (id: string) => queryClient.fetchQuery(defaultTemplateQuery(id));

// One page of templates (the List view, the Create popup's choices)
export const reportDefinitionPageQuery = (query: ReportDefinitionQuery) =>
  queryOptions({
    queryKey: reportCatalogKeys.definitionPage(query),
    queryFn: () => getReportDefinitions(query),
  });

// The Grid view: pages of `size` added while scrolling
export const reportDefinitionGridQuery = (query: Omit<ReportDefinitionQuery, "page" | "size">, size: number) =>
  infiniteQueryOptions({
    queryKey: reportCatalogKeys.definitionPages({ ...query, size }),
    queryFn: ({ pageParam }) => getReportDefinitions({ ...query, page: pageParam, size }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.reduce((sum, p) => sum + p.items.length, 0) < lastPage.total ? allPages.length + 1 : undefined,
  });

// Every report the user may run (the list comes whole)
export const reportListQuery = () =>
  queryOptions({
    queryKey: reportCatalogKeys.reportList(),
    queryFn: () => getReports(),
  });

// One report with its templates and run parameters (`enabled` false: not yet)
export const reportDetailQuery = (id: string, enabled = true) =>
  queryOptions({
    queryKey: reportCatalogKeys.report(id),
    queryFn: ({ signal }) => getReport(id, signal),
    enabled: enabled && !!id,
  });

// A report was made: the Reports page fetches again
export const invalidateReports = () => queryClient.invalidateQueries({ queryKey: reportCatalogKeys.reports() });
