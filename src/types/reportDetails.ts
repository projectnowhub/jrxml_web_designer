// details.json: where a template's data comes from, written by the designer
// next to the JRXML (utils/reportDetails.ts) for the report server, which
// will fetch the data itself from it later instead of the designer
// (utils/reportRun.ts). Every entry names what it fills in the JRXML:
// - `param`: a String parameter (a linked project detail);
// - `datasetName`: a table's rows (the report server's subDataSources);
// - `uuid`: an <image> whose picture is redrawn (a chart, a map).
// Text in `{{…}}` is filled in for each run: {{projectId}} and the moving
// date ranges ({{thisMonth.from}}, {{thisMonth.to}}, lastMonth, thisQuarter,
// thisYear, last30Days), worked out on the day the report runs.

import type { AggregateRequest, ChartBinding } from "./dataSource";
import type { JmixFilter, JmixSort } from "./jmix";

// How a value is written: as text (none), a stored value's words, a date, HTML
// as plain text (a line per paragraph), an amount
export type ReportValueFormat = "label" | "date" | "html" | "amount";

// One value read from the project record (or a list item)
export interface ReportValueSource {
  // A property path ("projectManager.name"; "businessTypes[].name" joins a list)
  path?: string;
  // Several properties joined by `separator` (empty ones skipped)
  paths?: string[];
  separator?: string;
  format?: ReportValueFormat;
  // format "label": stored value → words
  labels?: Record<string, string>;
  // format "date": a Java DateTimeFormatter pattern, English month names
  pattern?: string;
  // format "amount": digits after the point
  decimals?: number;
}

export interface ReportValueEntry extends ReportValueSource {
  param: string;
}

// A user-defined field: the `value` of the project's dynamicAttr with this code
export interface ReportUserDefinedEntry {
  param: string;
  code: string;
  label: string;
}

// A Location following the project: its map picture redrawn for the
// project's coordinates, its address written from these lines
export interface ReportMapEntry {
  // The map picture's <image>
  uuid: string;
  // The address's text field (its whole expression becomes the address as a Java string)
  addressUuid: string | null;
  latitudePath: string;
  longitudePath: string;
  // Each line: its paths' non-empty values joined by its separator; empty lines dropped
  addressLines: { paths: string[]; separator?: string }[];
  lineSeparator: string;
  zoom: number;
  width: number;
  height: number;
}

// A project list (manager, team, companies, contracts): one row per item of
// `path`; `single`: `path` holds one record (the project manager), a one-row list
export interface ReportListEntry {
  datasetName: string;
  name: string;
  path: string;
  single?: boolean;
  columns: (ReportValueSource & { field: string })[];
}

// A data table: its rows from GET /v2/table/{entityName}
export interface ReportTableEntry {
  datasetName: string;
  name: string;
  entityName: string;
  fetchPlan?: string;
  // A linked column holds another record: pass its _instanceName
  columns: { field: string; linked?: boolean }[];
  filter: JmixFilter;
  sort: JmixSort[];
  maxRows: number;
}

// A chart: its numbers from POST /v2/analytics/aggregate (one answer per
// request, in order), drawn with the report engine's chartSvg(options, answers…)
export interface ReportChartEntry {
  uuid: string;
  name: string;
  width: number;
  height: number;
  requests: AggregateRequest[];
  options: ChartBinding;
}

export interface ReportDetails {
  defaults: { projectId: string; projectName: string; timezone: string; locale: string };
  projectData: {
    details: ReportValueEntry[];
    location: ReportValueEntry[];
    userDefined: ReportUserDefinedEntry[];
    maps: ReportMapEntry[];
    lists: ReportListEntry[];
    tables: ReportTableEntry[];
    charts: ReportChartEntry[];
  };
}
