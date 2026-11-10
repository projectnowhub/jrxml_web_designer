// Report catalogue API: the report server's templates (Report Definitions,
// cdp-reporter's rptadn_ReportDefinition: a name + a Jmix report file) and the
// Jmix reports made from them. Caching is TanStack Query's
// (queries/reportCatalogQueries.ts).
//
//   1. Templates        GET  /rest/entities/rptadn_ReportDefinition[/search]?limit&offset&returnCount&sort[&filter]   getReportDefinitionsFromServer
//   2. One template     GET  /rest/entities/rptadn_ReportDefinition/{id}                                              getReportDefinition
//   3. Create a report  POST /v2/report-templates/{definitionId}/create-report-using-report-definition               postCreateReportFromDefinition
//   4. Reports          GET  /rest/reports/report                                                                    getReports
//   5. One report       GET  /rest/reports/report/{id}  (with its templates and parameters)                         getReport
//   6. Run a report     POST /rest/reports/run/{reportId}  { template, attachment, parameters } → the file          postRunReport
//
// The Report Definitions are the **default templates**: they can be opened
// (the Templates page's "Default templates"; the designer starts the user's
// own copy) but never updated or deleted from here. A definition's
// `reportFile` (a Jmix report export zip) is downloaded with
// imageService's getFileBlob (GET /rest/files?fileRef=) and read by
// helpers/reportArchiveHelpers.ts (queries/reportCatalogQueries.ts
// defaultTemplateQuery). The user's own templates still come from this browser
// (getReportDefinitions, templateService).
//
// 1 and 2 are Jmix's generic REST (a search is the /search form with a Jmix
// filter); 4–6 are Jmix Reports REST, which lists every report the user may
// run at once (no paging or search). 3 answers 204 and, for now, reads only
// the definition id: the form's fields are sent for when it reads them.

import apiClient, { unwrap } from "./apiClient";
import { readStoredFiles } from "@/composables/useDesignerFiles";
import { API_ROUTES } from "@/config/apiConfig";
import type { ApiResponse } from "@/types/api";
import type {
  CreateReportFromDefinitionRequest,
  JmixReportInfo,
  JmixReportRunRequest,
  LocalReport,
  ReportDefinition,
  ReportDefinitionPage,
  ReportDefinitionQuery,
  ReportRunResult,
} from "@/types/reportCatalog";
import { buildJmixListQuery, readJmixListResponse } from "./helpers/jmixListHelpers";
import {
  contentDispositionFileName,
  toReportDefinitionListParams,
  toReportDefinitionSummary,
} from "./helpers/reportCatalogMappers";

const DEFINITION_ENTITY = "rptadn_ReportDefinition";

// FOR NOW (the APIs above don't work yet): templates are the ones saved in
// this browser, and created reports are kept in this browser
// (`reportCatalog.reports`). Each call's API version is kept below it.
const LOCAL_REPORTS_KEY = "reportCatalog.reports";
const CREATED_TEMPLATES_KEY = "reportCatalog.createdTemplates";

function readLocalReports(): LocalReport[] {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_REPORTS_KEY) ?? "[]") as LocalReport[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// 1. One page of the templates (from this browser)
export async function getReportDefinitions(query: ReportDefinitionQuery): Promise<ReportDefinitionPage> {
  const { page = 1, size = 25, q = "", sort = "lastModifiedDate", dir = "desc" } = query;
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const sign = dir === "asc" ? 1 : -1;
  const items = readStoredFiles()
    .map((file) =>
      toReportDefinitionSummary({
        id: file.id,
        name: file.name,
        createdDate: new Date(file.createdAt ?? file.lastModified ?? 0).toISOString(),
        lastModifiedDate: new Date(file.lastModified ?? file.createdAt ?? 0).toISOString(),
      }),
    )
    .filter((item) => words.every((word) => item.name.toLowerCase().includes(word)))
    .sort((x, y) =>
      sort === "name"
        ? sign * x.name.localeCompare(y.name, undefined, { numeric: true, sensitivity: "base" })
        : sign * (Date.parse(sort === "createdDate" ? x.createdAt : x.lastModified) - Date.parse(sort === "createdDate" ? y.createdAt : y.lastModified)),
    );
  const start = (Math.max(1, page) - 1) * size;
  return { items: items.slice(start, start + size), total: items.length };
}

// 1. (API) One page of the templates
export async function getReportDefinitionsFromServer(
  query: ReportDefinitionQuery,
  signal?: AbortSignal,
): Promise<ReportDefinitionPage> {
  const params = toReportDefinitionListParams(query);
  const path = `${API_ROUTES.reportDefinitions}${params.filter ? "/search" : ""}?${buildJmixListQuery(params)}`;
  const { data, headers } = await apiClient.requestWithHeaders<ApiResponse<ReportDefinition[]>>(path, {
    method: "GET",
    signal,
  });
  const page = readJmixListResponse<ReportDefinition>(DEFINITION_ENTITY, data, headers, params);
  return { items: page.rows.map(toReportDefinitionSummary), total: page.total };
}

// 2. One template
export async function getReportDefinition(id: string, signal?: AbortSignal): Promise<ReportDefinition> {
  const body = await apiClient.get<ApiResponse<ReportDefinition>>(
    `${API_ROUTES.reportDefinitions}/${encodeURIComponent(id)}`,
    { signal },
  );
  return unwrap(body);
}

// 3. Create template: the request (project, name, code, type HTML), kept in
// this browser until the backend's create endpoint works; the designer then
// starts the template itself
export async function postCreateTemplate(request: CreateReportFromDefinitionRequest): Promise<void> {
  const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...request };
  let list: unknown[] = [];
  try {
    const stored = JSON.parse(localStorage.getItem(CREATED_TEMPLATES_KEY) ?? "[]") as unknown[];
    if (Array.isArray(stored)) list = stored;
  } catch {
    // Unreadable: start a new list
  }
  localStorage.setItem(CREATED_TEMPLATES_KEY, JSON.stringify([record, ...list]));
}

// 3. A report made from a template (kept in this browser)
export async function postCreateReportFromDefinition(
  definitionId: string,
  request: CreateReportFromDefinitionRequest,
): Promise<void> {
  const report: LocalReport = { id: crypto.randomUUID(), definitionId, createdAt: new Date().toISOString(), ...request };
  localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify([report, ...readLocalReports()]));
}

// 3. (API) A Jmix report made from a template
export async function postCreateReportOnServer(
  definitionId: string,
  request: CreateReportFromDefinitionRequest,
): Promise<void> {
  await apiClient.post<void>(
    `${API_ROUTES.reportTemplates}/${encodeURIComponent(definitionId)}/create-report-using-report-definition`,
    JSON.stringify(request),
    { responseType: "text" },
  );
}

// 4. Every report (kept in this browser)
export async function getReports(): Promise<JmixReportInfo[]> {
  return readLocalReports().map((r) => ({ id: r.id, name: r.name, code: r.code, templateId: r.definitionId, projectName: r.projectName }));
}

// 4. (API) Every report the user may run
export async function getReportsFromServer(signal?: AbortSignal): Promise<JmixReportInfo[]> {
  const body = await apiClient.get<ApiResponse<JmixReportInfo[]>>(API_ROUTES.reports, { signal });
  const reports = unwrap(body);
  return Array.isArray(reports) ? reports : [];
}

// 5. One report, with its templates and run parameters
export async function getReport(id: string, signal?: AbortSignal): Promise<JmixReportInfo> {
  const body = await apiClient.get<ApiResponse<JmixReportInfo>>(`${API_ROUTES.reports}/${encodeURIComponent(id)}`, {
    signal,
  });
  return unwrap(body);
}

// 6. Run a report: the file it makes (a PDF, a spreadsheet…)
export async function postRunReport(
  reportId: string,
  request: JmixReportRunRequest,
  fallbackName: string,
  signal?: AbortSignal,
): Promise<ReportRunResult> {
  const { data, headers } = await apiClient.requestWithHeaders<Blob>(
    `${API_ROUTES.runReport}/${encodeURIComponent(reportId)}`,
    { method: "POST", body: JSON.stringify(request), responseType: "blob", signal },
  );
  const contentType = headers.get("content-type") || data.type || "application/octet-stream";
  return {
    file: data,
    contentType,
    fileName: contentDispositionFileName(headers.get("content-disposition"), fallbackName),
  };
}

export const reportCatalogApi = {
  postCreateTemplate,
  getReportDefinitions,
  getReportDefinition,
  postCreateReportFromDefinition,
  getReports,
  getReport,
  postRunReport,
  getReportDefinitionsFromServer,
  postCreateReportOnServer,
  getReportsFromServer,
};
