// Report band constants: the names the designer and the report server agree
// on for a template stored as a Jmix report (types/reportBands.ts,
// types/jmixReport.ts, docs/REPORT_ENGINE.md).

// The report's run parameters (Jmix input parameter aliases)
export const PROJECT_PARAMETER = "project";
export const REPORT_DATE_PARAMETER = "reportDate";

// The band holding the linked project details, and the prefixes of the others
// (a table's band is named after its dataset, table_xxxxxx)
export const PROJECT_BAND_NAME = "project";
export const CHART_BAND_PREFIX = "chart_";
export const MAP_BAND_PREFIX = "map_";

// The project's fetch plan for the linked details (as Report Data reads it)
export const PROJECT_BAND_FETCH_PLAN = "project-details-fp";

// The Jmix report of a template: code = prefix + the template's id, in this group
export const REPORT_CODE_PREFIX = "cdp-tpl-";
export const REPORT_GROUP_CODE = "CDP_REPORT_STUDIO";
export const REPORT_GROUP_TITLE = "CDP Report Studio";

// The top band every Jmix report has
export const ROOT_BAND_NAME = "Root";

// Every band's data set: the same Groovy line, calling the server's band
// loader with the band's request (stored in the data set's jsonSourceText)
export const BAND_LOADER_SCRIPT = "return applicationContext.getBean('cdp_ReportBandLoader').load(reportQuery, params)";

// The template file: the JRXML, filled by the server's custom template class
// (Jmix's own Jasper formatter would repeat the pages once per data row)
export const REPORT_TEMPLATE_CODE = "DEFAULT";
export const CUSTOM_TEMPLATE_CLASS = "com.ipectechnologies.cdpreportaddon.report.CdpJasperReport";
