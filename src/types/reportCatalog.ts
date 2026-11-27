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
  // Its run parameters (Preview PDF gives the project ones the template's project)
  inputParameters?: JmixReportParameterInfo[];
}

// A report server template: rptadn_TenantReport as
// GET /v2/table/rptadn_TenantReport answers it (default templates and
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

// One region (band) of a template: the entity's attributes it loads, as a
// table (tabulated) or a single row; collectionPath = the record's list it
// reads (null: the record itself)
export interface CreateTemplateRegion {
  tabulated: boolean;
  collectionPath?: string | null;
  attributes: string[];
}

// The body of PUT /v2/reports/{id}/edit: the template's name (its code is
// sent the same), its data regions and its JRXML as base64 (of its UTF-8
// bytes, toTemplateContentBase64)
export interface EditTemplateRequest {
  name: string;
  code: string;
  regions: CreateTemplateRegion[];
  templateContent: string;
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
  // Its Jmix report (report.id) and that report's run parameters: what
  // Preview PDF runs
  reportId?: string;
  reportParameters?: JmixReportParameterInfo[];
}

// What Preview PDF runs on the report server: the template's Jmix report (as
// saved there) with its run parameters, for the template's project
export interface TemplatePdfRun {
  reportId: string;
  parameters: JmixReportParameterInfo[];
  projectId?: string;
}

// ---- Jmix Reports REST (/rest/reports, reports-rest 3.0.2 ReportRestControllerManager) ----

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

// A run parameter, matched by its alias: `value`, or `values` for a list
export interface JmixReportRunParameter {
  name: string;
  value?: string;
  values?: string[];
}

// The body of POST /rest/reports/run/{reportId}: Preview PDF sends only the
// parameters (the report's default template, shown inline)
export interface JmixReportRunRequest {
  template?: string;
  attachment?: boolean;
  parameters: JmixReportRunParameter[];
}

// What a run gives: the file, its type and its name
export interface ReportRunResult {
  file: Blob;
  contentType: string;
  fileName: string;
}

