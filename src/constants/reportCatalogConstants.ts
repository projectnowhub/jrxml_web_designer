// Report catalogue constants: the Templates page (the report server's Report
// Definitions) and the Reports page (Jmix reports).

import type { ReportOutputTypeName } from "@/types/reportCatalog";

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

// Why a default template's report file couldn't be read: thrown as the
// Error's message by services/helpers/reportArchiveHelpers.ts, shown as
// reportCatalog.defaultTemplates.errors.<code>
export const REPORT_ARCHIVE_ERRORS = {
  noFile: "noFile",
  notZip: "notZip",
  damaged: "damaged",
  zipMethod: "zipMethod",
  noJrxml: "noJrxml",
} as const;

// Reports a page on the Reports page (the list comes whole: paged in the browser)
export const REPORTS_PAGE_SIZE = 25;
export const REPORTS_PAGE_SIZES = [25, 50, 100] as const;

// The type every report is created as, for now (the Create popup doesn't ask)
export const CREATED_REPORT_TYPE: ReportOutputTypeName = "HTML";

// The Jmix template code run when a report has no default one
export const DEFAULT_REPORT_TEMPLATE_CODE = "DEFAULT";
