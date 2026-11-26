// Report catalogue constants: the Templates page (the report server's Report
// Definitions) and the Reports page (Jmix reports).

import type { CreateTemplateRequest } from "@/types/reportCatalog";

// Templates a page (Grid: added while scrolling; List: pages of these sizes)
export const REPORT_DEFINITION_PAGE_SIZE = 25;
export const REPORT_DEFINITION_PAGE_SIZES = [25, 50, 100] as const;

// Default templates (the report server's Report Definitions) on the Templates
// page: Grid shows this many at first ("Show more" adds as many again), List
// pages of this many
export const DEFAULT_TEMPLATE_PAGE_SIZE = 12;
// A default template (list and file) is read again after a minute at most:
// it can't change from here, but an admin may replace it on the server
export const DEFAULT_TEMPLATE_STALE_TIME = 60_000;
// The fetch plan that reads a template with its Jmix report and that report's
// templates (their content = the JRXML)
export const TENANT_REPORT_FETCH_PLAN = "tenantReport-fetch-plan";
// The fetch plan of the template lists: the name shown is the Jmix report's
// name (report.name), which the default plan doesn't read. The server has no
// lighter plan yet, so it is the full one (it brings the templates' content too)
export const TENANT_REPORT_LIST_FETCH_PLAN = TENANT_REPORT_FETCH_PLAN;
// Names read a request when finding a free name for a new template (pages of
// this many until every matching name is read)
export const TEMPLATE_NAME_PAGE_SIZE = 100;
// The top bar's template search: results shown (default and own templates),
// and the pause after typing before it asks
export const TEMPLATE_SEARCH_LIMIT = 100;
// (every key typed restarts the wait, so only a real pause asks), the
// fewest letters it asks for (one letter matches almost everything), and how
// long an answer counts as fresh (the same words typed again ask nothing)
export const TEMPLATE_SEARCH_DELAY_MS = 500;
export const TEMPLATE_SEARCH_MIN_LETTERS = 2;
export const TEMPLATE_SEARCH_STALE_TIME = 30_000;

// Reports a page on the Reports page (the list comes whole: paged in the browser)
export const REPORTS_PAGE_SIZE = 25;
export const REPORTS_PAGE_SIZES = [25, 50, 100] as const;

// What every new template is created with, for now (the Create popup asks only
// for the name and code): a report on one project, an HTML template, PDF output
export const CREATE_TEMPLATE_FIXED: Omit<CreateTemplateRequest, "name" | "code"> = {
  entityName: "cdp_Project",
  templateFileType: "HTML",
  reportTypeGenerate: "SINGLE_ENTITY",
  outputFileType: "PDF",
  // The report's data: one band with the project's title
  regions: [{ tabulated: false, attributes: ["projectTitle"] }],
};

// The Jmix template code run when a report has no default one
export const DEFAULT_REPORT_TEMPLATE_CODE = "DEFAULT";
