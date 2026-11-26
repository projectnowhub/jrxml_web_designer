// Report catalogue API: the report server's templates (rptadn_TenantReport: a
// name + a Jmix report file; default templates and the tenant's own in one
// entity, told apart by isDefault) and the Jmix reports made from them.
// Caching is TanStack Query's (queries/reportCatalogQueries.ts).
//
//   1. Templates        GET  /v2/table/rptadn_TenantReport?filter={isDefault = true|false}&limit&offset&returnCount&sort=<field>,id|-<field>,id   getReportDefinitionsFromServer
//   2. One template     GET  /v2/table/rptadn_TenantReport/{id}?fetchPlan=tenantReport-fetch-plan (report.templates[].content = the JRXML)                                                getReportDefinition
//   2b. Duplicate       POST /v2/reports/copy  { id (the row's own id, never report.id) }  → the copy is one of the tenant's own (isDefault false)       postCopyTemplate
//   3. Create a report  POST /v2/report-templates/{definitionId}/create-report-using-report-definition               postCreateReportFromDefinition
//   4. Reports          GET  /rest/reports/report                                                                    getReports
//   5. One report       GET  /rest/reports/report/{id}  (with its templates and parameters)                         getReport
//   6. Run a report     POST /rest/reports/run/{reportId}  { template, attachment, parameters } → the file          postRunReport
//
//   2d. Create          POST /v2/reports/create  { name, code, entityName, templateFileType, reportTypeGenerate, outputFileType }  postCreateTemplate
//   2c. Delete           DELETE /rest/entities/rptadn_TenantReport/{id}  (the tenant's own only, isDefault false)        deleteTenantReport
//
// isDefault true = the **default templates**, false = the tenant's own
// templates on the server: both can be opened (the designer starts the
// user's own copy) and cloned, but never updated or deleted from here (no
// endpoint yet). A template's JRXML is its Jmix report's templates' content
// (base64), read by helpers/templateContentHelpers.ts
// (queries/reportCatalogQueries.ts defaultTemplateQuery). Every template comes
// from the server; only the open template's changes are kept in this browser
// (utils/activeTemplate.ts) until templates can be saved there.
//
// 1 and 2 are the backend's /v2/table (faster than Jmix's /rest/entities;
// the list takes its Jmix filter as the `filter` query parameter, no /search);
// 2c (delete) is Jmix's /rest/entities, the only one that deletes it; 4–6 are Jmix Reports REST, which lists every report the user may
// run at once (no paging or search). 1–5 work on dev (2026-11-11); 6 (run /
// preview) and creating a report of the user's own are still to come.
// 3 (Clone of a default template) answers 204 with no body: it imports the
// definition's file as it is and reads only the id (the name, code and
// project sent are for when it reads them).

import apiClient, { unwrap } from "./apiClient";
import { API_ROUTES } from "@/config/apiConfig";
import type { ApiResponse } from "@/types/api";
import type {
  CopyTemplateRequest,
  CopyTemplateResponse,
  CreateTemplateRequest,
  CreateReportFromDefinitionRequest,
  JmixReportInfo,
  JmixReportRunRequest,
  ReportDefinition,
  ReportDefinitionPage,
  ReportDefinitionQuery,
  ReportRunResult,
} from "@/types/reportCatalog";
import { buildJmixListQuery, readJmixListResponse } from "./helpers/jmixListHelpers";
import { TENANT_REPORT_FETCH_PLAN } from "@/constants/reportCatalogConstants";
import {
  contentDispositionFileName,
  toReportDefinitionListParams,
  toReportDefinitionSummary,
} from "./helpers/reportCatalogMappers";

const TEMPLATE_ENTITY = "rptadn_TenantReport";

// 1. (API) One page of the templates
export async function getReportDefinitionsFromServer(
  query: ReportDefinitionQuery,
): Promise<ReportDefinitionPage> {
  const params = toReportDefinitionListParams(query);
  // Sort as the CDP app sends it: "name,id", "-lastModifiedDate,id"
  const path = `${API_ROUTES.tenantReports}?${buildJmixListQuery(params)}`;
  const { data, headers } = await apiClient.requestWithHeaders<ApiResponse<ReportDefinition[]>>(path, {
    method: "GET",
  });
  const page = readJmixListResponse<ReportDefinition>(TEMPLATE_ENTITY, data, headers, params);
  return { items: page.rows.map(toReportDefinitionSummary), total: page.total };
}

// 2. One template
export async function getReportDefinition(id: string): Promise<ReportDefinition> {
  const body = await apiClient.get<ApiResponse<ReportDefinition>>(
    `${API_ROUTES.tenantReports}/${encodeURIComponent(id)}?${new URLSearchParams({ fetchPlan: TENANT_REPORT_FETCH_PLAN })}`,
  );
  return unwrap(body);
}

// 2b. Duplicate a template: the server makes the copy (one of the tenant's own templates)
export async function postCopyTemplate(request: CopyTemplateRequest): Promise<CopyTemplateResponse | null> {
  const text = await apiClient.post<string>(API_ROUTES.copyTemplate, JSON.stringify(request), { responseType: "text" });
  try {
    const body = JSON.parse(text) as CopyTemplateResponse | { data?: CopyTemplateResponse };
    const answer = "data" in body && body.data ? body.data : (body as CopyTemplateResponse);
    return answer && typeof answer.id === "string" ? answer : null;
  } catch {
    // No JSON answer: the copy is found by its name (fetchNewestCopyId)
    return null;
  }
}

// 2c. Delete one of the tenant's own templates (never a default one)
export async function deleteTenantReport(id: string): Promise<void> {
  await apiClient.delete<void>(`${API_ROUTES.deleteTenantReport}/${encodeURIComponent(id)}`, { responseType: "text" });
}

// 2d. Create a template: the server makes it (one of the tenant's own)
export async function postCreateTemplate(request: CreateTemplateRequest): Promise<void> {
  await apiClient.post<void>(API_ROUTES.createTemplate, JSON.stringify(request), { responseType: "text" });
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

// 4. (API) Every report the user may run
export async function getReportsFromServer(): Promise<JmixReportInfo[]> {
  const body = await apiClient.get<ApiResponse<JmixReportInfo[]>>(API_ROUTES.reports);
  const reports = unwrap(body);
  return Array.isArray(reports) ? reports : [];
}

// 5. One report, with its templates and run parameters
export async function getReport(id: string): Promise<JmixReportInfo> {
  const body = await apiClient.get<ApiResponse<JmixReportInfo>>(`${API_ROUTES.reports}/${encodeURIComponent(id)}`, {
  });
  return unwrap(body);
}

// 6. Run a report: the file it makes (a PDF, a spreadsheet…)
export async function postRunReport(
  reportId: string,
  request: JmixReportRunRequest,
  fallbackName: string,
): Promise<ReportRunResult> {
  const { data, headers } = await apiClient.requestWithHeaders<Blob>(
    `${API_ROUTES.runReport}/${encodeURIComponent(reportId)}`,
    { method: "POST", body: JSON.stringify(request), responseType: "blob" },
  );
  const contentType = headers.get("content-type") || data.type || "application/octet-stream";
  return {
    file: data,
    contentType,
    fileName: contentDispositionFileName(headers.get("content-disposition"), fallbackName),
  };
}

export const reportCatalogApi = {
  postCopyTemplate,
  deleteTenantReport,
  postCreateTemplate,
  getReportDefinition,
  getReport,
  postRunReport,
  getReportDefinitionsFromServer,
  postCreateReportOnServer,
  getReportsFromServer,
};
