// Report catalogue types (services/reportCatalogService.ts): the report
// server's templates (Report Definitions: a name + a Jmix report file) and
// the Jmix reports made from them, as the backend answers them.

// The output formats a Jmix report can have (io.jmix.reports ReportOutputType names)
export type ReportOutputTypeName = "PDF" | "XLSX" | "DOCX" | "HTML" | "CSV" | "XLS" | "DOC" | "CUSTOM" | "TABLE" | "CHART" | "PIVOT_TABLE";

// rptadn_ReportDefinition (cdp-reporter's ReportDefinition entity) as
// GET /rest/entities/rptadn_ReportDefinition answers it
export interface ReportDefinition {
  id: string;
  _entityName?: string;
  _instanceName?: string;
  name?: string;
  // A FileRef: "fs://2026/11/04/<uuid>.zip?name=Monthly%20report.zip"
  reportFile?: string;
  version?: number;
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
}

export type ReportDefinitionSort = "name" | "createdDate" | "lastModifiedDate";
export type ReportDefinitionSortDirection = "asc" | "desc";

export interface ReportDefinitionQuery {
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

// ---- A definition's report file (a Jmix Reports export, ReportImportExportImpl) ----
// A zip of "<report name>.zip" entries, each a zip of "report.structure" (the
// report as JSON) and "templates/<index>/<file name>" (each template's file,
// <index> its place in `templates`)

// A template as report.structure lists it (the fields the designer reads)
export interface JmixReportStructureTemplate {
  id?: string;
  code?: string;
  // The template file's name ("template.jrxml")
  name?: string;
  reportOutputType?: string;
}

// report.structure (the fields the designer reads)
export interface JmixReportStructure {
  name?: string;
  code?: string;
  defaultTemplate?: { id?: string; code?: string };
  templates?: JmixReportStructureTemplate[];
}

// One file found in a zip: its name and bytes
export interface ZipFileEntry {
  name: string;
  bytes: Uint8Array;
}

// A default template, ready to open in the designer
export interface DefaultTemplate {
  id: string;
  name: string;
  // The JRXML of the report's default template (else its first .jrxml)
  jrxml: string;
  // The template file's own name ("template.jrxml")
  templateName: string;
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

// A report kept in this browser (while the APIs don't work)
export interface LocalReport extends CreateReportFromDefinitionRequest {
  id: string;
  definitionId: string;
  createdAt: string;
}
