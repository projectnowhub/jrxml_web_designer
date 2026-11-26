// Report catalogue types (services/reportCatalogService.ts): the report
// server's templates (Report Definitions: a name + a Jmix report file) and
// the Jmix reports made from them, as the backend answers them.

import type { TemplateContentProblem } from "@/enums/templateContentProblem";

// The output formats a Jmix report can have (io.jmix.reports ReportOutputType names)
export type ReportOutputTypeName = "PDF" | "XLSX" | "DOCX" | "HTML" | "CSV" | "XLS" | "DOC" | "CUSTOM" | "TABLE" | "CHART" | "PIVOT_TABLE";

// One template of a tenant report's Jmix report (report_ReportTemplate; the
// fields the designer reads): `content` is the template file, the JRXML,
// base64 today, plain XML later
export interface TenantReportTemplate {
  id?: string;
  code?: string;
  name?: string;
  content?: string;
  reportOutputType?: string;
  custom?: boolean;
  customDefinedBy?: string;
  alterable?: boolean;
  groovy?: boolean;
  createTs?: string;
  createdBy?: string;
}

// rptadn_TenantReport's `report` (report_Report; the fields the designer reads)
export interface TenantReportJmixReport {
  id?: string;
  _entityName?: string;
  _instanceName?: string;
  // The template's name, as the user sees it (may be the same as another's;
  // the report's code is the backend's and never read here)
  name?: string;
  defaultTemplate?: { id?: string; code?: string };
  templates?: TenantReportTemplate[];
}

// A report server template: rptadn_TenantReport as
// GET /rest/entities/rptadn_TenantReport answers it (default templates and
// the tenant's own in one entity, told apart by isDefault)
export interface ReportDefinition {
  id: string;
  _entityName?: string;
  _instanceName?: string;
  name?: string;
  // true: a default template (read only); false: one of the tenant's own
  isDefault?: boolean;
  tenant?: string;
  // A FileRef: "fs://2026/11/04/<uuid>.zip?name=Monthly%20report.zip" (older rows)
  reportFile?: string;
  // The Jmix report behind it, with its templates (read with TENANT_REPORT_FETCH_PLAN)
  report?: TenantReportJmixReport;
  version?: number;
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
}

export type ReportDefinitionSort = "name" | "createdDate" | "lastModifiedDate";
export type ReportDefinitionSortDirection = "asc" | "desc";

export interface ReportDefinitionQuery {
  // Server lists only: default templates (true) or the tenant's own (false)
  isDefault?: boolean;
  // Server lists only: templates whose name (report.name) contains these words
  nameContains?: string;
  // From 1
  page?: number;
  size?: number;
  // Every word in the name
  q?: string;
  sort?: ReportDefinitionSort;
  dir?: ReportDefinitionSortDirection;
}

// One template as the Templates page shows it
export interface ReportDefinitionSummary {
  id: string;
  name: string;
  isDefault: boolean;
  // The report file's own name ("Monthly report.zip"), "" when unknown
  fileName: string;
  createdBy: string;
  createdAt: string;
  lastModified: string;
}

export interface ReportDefinitionPage {
  items: ReportDefinitionSummary[];
  total: number;
}

// The body of POST /v2/reports/copy: the template (rptadn_TenantReport) to duplicate
// The body of POST /v2/reports/create: the name and code typed in the Create
// template popup, the rest fixed for now (CREATE_TEMPLATE_FIXED)
export interface CreateTemplateRequest {
  name: string;
  code: string;
  entityName: string;
  templateFileType: ReportOutputTypeName;
  reportTypeGenerate: string;
  outputFileType: ReportOutputTypeName;
  regions: CreateTemplateRegion[];
}

// One region (band) of a new template: the entity's attributes it loads, as a
// table (tabulated) or a single row
export interface CreateTemplateRegion {
  tabulated: boolean;
  attributes: string[];
}

// What POST /v2/reports/copy may answer (the copy's row); nothing when it answers no JSON
export interface CopyTemplateResponse {
  id?: string;
  report?: { name?: string };
}

export interface CopyTemplateRequest {
  id: string;
}

// A server template's JRXML read from its Jmix report's templates' content
export interface TenantReportTemplateContent {
  // The JRXML of the report's default template (else the first template
  // holding one); "" when none can be opened (the designer opens an empty layout)
  jrxml: string;
  // The template's own name
  templateName: string;
  // Why no JRXML could be opened (unset when jrxml is one)
  problem?: TemplateContentProblem;
}

// A default template, ready to open in the designer
export interface DefaultTemplate extends TenantReportTemplateContent {
  id: string;
  name: string;
  // A default template (else one of the tenant's own on the server)
  isDefault: boolean;
}

// The body of POST /v2/report-templates/{definitionId}/create-report-using-report-definition.
// Proposed by the designer: the backend reads none of it yet (it imports the
// definition's file as it is)
export interface CreateReportFromDefinitionRequest {
  name: string;
  code: string;
  reportType: ReportOutputTypeName;
  projectId: string;
  projectName: string;
  projectCode?: string;
}

// ---- Jmix Reports REST (/rest/reports, reports-rest 3.0.2 ReportRestControllerManager) ----

export interface JmixReportTemplateInfo {
  code?: string;
  outputType?: ReportOutputTypeName;
  isDefault?: boolean;
}

// An input parameter; `type` is a ParameterType name (DATE, TEXT, ENTITY,
// BOOLEAN, NUMERIC, ENTITY_LIST, ENUMERATION, DATETIME, TIME)
export interface JmixReportParameterInfo {
  name?: string;
  alias: string;
  type?: string;
  required?: boolean;
  hidden?: boolean;
  entityMetaClass?: string;
  enumerationClass?: string;
  defaultValue?: string;
}

// GET /rest/reports/report (the list: id, name, code, group) and
// GET /rest/reports/report/{id} (also its templates and parameters)
export interface JmixReportInfo {
  id: string;
  name?: string;
  code?: string;
  group?: string;
  templates?: JmixReportTemplateInfo[];
  // A report kept in this browser: its template (a designer template's id) and project
  templateId?: string;
  projectName?: string;
  inputParameters?: JmixReportParameterInfo[];
}

// A run parameter, matched by its alias: `value`, or `values` for a list
export interface JmixReportRunParameter {
  name: string;
  value?: string;
  values?: string[];
}

// The body of POST /rest/reports/run/{reportId}
export interface JmixReportRunRequest {
  template?: string;
  attachment: boolean;
  parameters: JmixReportRunParameter[];
}

// What a run gives: the file, its type and its name
export interface ReportRunResult {
  file: Blob;
  contentType: string;
  fileName: string;
}

