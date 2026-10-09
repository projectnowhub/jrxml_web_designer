// Report data from the backend: projects, their details (name, logo,
// introduction…) and their table sources, and how a table uses one.
// Rows and values are never stored in the design; they are fetched each time.

// A project the user can pick for a report. A report can use several.
export interface ProjectSummary {
  id: string;
  name: string;
  // Short reference shown next to the name (e.g. "KL-MRT3")
  code: string;
}

// What a project detail holds: text and long text go in Text elements, an
// image (the logo) in an Image element
export type ProjectFieldType = "text" | "longText" | "image";

// One detail of a project (name, logo, introduction…)
export interface ProjectField {
  key: string;
  label: string;
  type: ProjectFieldType;
}

// A project with its details. Values are ready to print (dates and amounts
// already formatted); an image's value is its location (URL or stored file).
export interface ProjectDetails extends ProjectSummary {
  fields: ProjectField[];
  values: Record<string, string | null>;
}

// A project chosen for the report (kept in the report as `com.cdp.projects`)
export interface ReportProject {
  id: string;
  name: string;
}


// Column types the backend reports; they decide formatting and filter operators
export type DataColumnType = "text" | "number" | "currency" | "date";

// A table source of a project (e.g. Procurement)
export interface DataSourceSummary {
  id: string;
  name: string;
  rowCount: number;
}

// A column of a source, as the backend describes it
export interface DataColumn {
  key: string;
  label: string;
  type: DataColumnType;
}

export interface DataSourceSchema {
  id: string;
  name: string;
  // The CDP entity behind the source (charts ask /v2/analytics/aggregate for
  // it; column keys are its property paths)
  entityName?: string;
  columns: DataColumn[];
}

export type DataRow = Record<string, string | number | null>;

// Filters work like a shop's filter panel: tick values of a text column
// ("in"), or set a range for a number, amount or date ("between", either
// end optional). Filters on different columns must all match; ticked values
// of one column match any of them.
export type FilterOperator = "in" | "between";

// Date ranges that move with today's date, so a report reused next month
// shows next month's data (utils/table/dataBinding.ts periodRange)
export type RelativePeriod = "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "last30Days";

export interface TableFilter {
  column: string;
  // Column name and type for summaries (the column may not be shown)
  label?: string;
  type?: DataColumnType;
  operator: FilterOperator;
  // "in": the ticked values
  values?: string[];
  // "between": lower and upper bound (inclusive); either may be empty
  value?: string;
  value2?: string;
  // "between" on a date column: a moving range instead of value/value2,
  // turned into dates each time data is fetched
  period?: RelativePeriod;
}

export type SortDirection = "asc" | "desc";

export interface TableSort {
  column: string;
  label?: string;
  type?: DataColumnType;
  direction: SortDirection;
}

export type TotalFunction = "sum" | "count" | "avg";

// One column shown in a table
export interface TableColumnBinding {
  key: string;
  // Header text (the user can rename it)
  label: string;
  type: DataColumnType;
  width: number;
  total?: TotalFunction;
  // Text columns can print each value as a barcode (types that hold any text)
  barcode?: "Code128" | "QRCode" | "DataMatrix";
}

// Built-in table styles; they can't be changed
export type TableTheme = "corporateBlue" | "minimal" | "emerald";

// How a table looks. Built-in styles, saved table styles and one-off
// customisations are all a TableLook.
export interface TableLook {
  headerBackground: string;
  headerText: string;
  headerBold: boolean;
  rowBackground: string;
  rowText: string;
  // Colour of every second row; null: no stripes
  stripe: string | null;
  totalsBackground: string;
  totalsText: string;
  totalsBold: boolean;
  // grid: lines around every cell; rows: a line under each row; none
  lines: "grid" | "rows" | "none";
  lineColor: string;
  // The stronger line under the header and above the totals
  ruleColor: string;
  fontSize: number;
}

// A look the user saved to reuse on other tables in the report
export interface SavedTableStyle {
  id: string;
  name: string;
  look: TableLook;
}

// What a table shows. Saved as JSON in the table's `com.cdp.table.binding`
// JRXML property, so the backend can fetch the same rows when it runs the report.
export interface TableDataBinding {
  // "Table 1"; the user can rename it
  tableName: string;
  // Unique and stable per table; rows are passed to the report under this name
  datasetName: string;
  // The project the rows come from; each table can use a different project
  projectId: string;
  projectName: string;
  sourceId: string;
  sourceName: string;
  columns: TableColumnBinding[];
  filters: TableFilter[];
  // At most one sort (the source's own order when empty)
  sort: TableSort[];
  rowLimit?: number;
  showTotals: boolean;
  // The style the table started from: a built-in style or a saved style's id
  theme: string;
  // The table's actual look: a copy of the saved style, or changes made for
  // this table only (customized). Empty for an unchanged built-in style.
  look?: TableLook;
  customized?: boolean;
}

// What the designer asks the backend for
export interface DataQuery {
  columns: string[];
  filters: TableFilter[];
  sort: TableSort[];
  limit?: number;
}

export interface DataQueryResult {
  rows: DataRow[];
  // Rows matching the filters, before the limit
  totalCount: number;
}

// What a column holds, for the filter panel: its distinct values with how
// many rows have each (text), or its smallest and largest value (number,
// amount, date as ISO text)
export type ColumnFacet =
  | { kind: "values"; values: { value: string; count: number }[] }
  | { kind: "range"; min: string | number | null; max: string | number | null };

export type SourceFacets = Record<string, ColumnFacet>;

// The Chart element's nine types, grouped in the picker by what they show
// (utils/chart/chartTypes.ts)
export type ChartType =
  | "kpi"
  | "gauge"
  | "line"
  | "area"
  | "bar"
  | "barH"
  | "pie"
  | "donut"
  | "treemap";

// Colour sets a chart can use (CHART_PALETTES)
export type ChartPaletteId = "vivid" | "ocean" | "forest" | "sunset" | "mono";

// How a chart turns rows into one number: "count" counts rows, the others
// use a number or amount column
export type ChartAggregation = "count" | "sum" | "avg" | "min" | "max";

// Buckets for a date column on a chart's axis
export type DateGranularity = "day" | "week" | "month" | "quarter" | "year";

export interface ChartMeasure {
  aggregation: ChartAggregation;
  // Not used by "count"
  column?: string;
  columnLabel?: string;
}

// A column whose values become the chart's categories (bars, slices, points)
export interface ChartDimension {
  column: string;
  label: string;
  type: DataColumnType;
  // Date columns only
  granularity?: DateGranularity;
}

// One line or set of bars; split by a column it becomes one per value
export interface ChartSeriesBinding {
  measure: ChartMeasure;
  splitBy?: ChartDimension;
}

// What a chart shows and how it looks. Saved as JSON in the chart's
// `com.cdp.chart.binding` JRXML property, next to an image of the chart;
// its numbers are never saved, they are fetched each time. Without a source
// the chart shows sample numbers in the designer and prints nothing.
export interface ChartBinding {
  chartType: ChartType;
  // Printed above the chart; empty for none
  title: string;
  showLegend: boolean;
  palette: ChartPaletteId;
  // Where the numbers come from
  projectId?: string;
  projectName?: string;
  sourceId?: string;
  sourceName?: string;
  // The CDP entity the source reads (sent as entityName)
  entityName?: string;
  // KPI, gauge, pie, donut, tree map: the number shown
  measure?: ChartMeasure;
  // Line, area, bars, pie, donut: the categories; tree map: its groups
  dimension?: ChartDimension;
  // Tree map: the items inside each group
  level2?: ChartDimension;
  // Line, area, bars: one entry per line or set of bars
  series?: ChartSeriesBinding[];
  // Bars and areas on top of each other instead of side by side
  stacked?: boolean;
  // Text categories: the largest N, the rest added up as "Other"
  limit?: number;
  // Gauge: the end of the scale; empty = a round number above the value
  gaugeMax?: number;
  filters?: TableFilter[];
}

// ── Chart numbers: the CDP analytics endpoint (POST /v2/analytics/aggregate) ──
// Exactly the contract the CDP app's dashboards use (cdp-fe-app,
// packages/core/api/src/analytics/aggregate.api.ts): one request per series.

export type AggregationType = "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
export type AggregateGranularity = "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR";

export type JmixOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "<>"
  | "in"
  | "notIn"
  | "contains"
  | "startsWith"
  | "endsWith";

export interface JmixCondition {
  property: string;
  operator: JmixOperator;
  value: unknown;
}

export interface JmixFilter {
  group?: "AND" | "OR";
  conditions: (JmixCondition | JmixFilter)[];
}

export interface AggregateMeasure {
  aggregation: AggregationType;
  // Every aggregation except COUNT
  property?: string;
}

export interface AggregateDimension {
  property: string;
  granularity?: AggregateGranularity;
}

export interface AggregateSplitBy {
  property: string;
  limit?: number;
}

export interface AggregateRequest {
  // The CDP entity read (e.g. cdp_ProcurementRegister)
  entityName: string;
  measure: AggregateMeasure;
  dimension?: AggregateDimension;
  splitBy?: AggregateSplitBy;
  // The chart's own filters
  filter?: JmixFilter;
  // Report-wide: the project (project.id); the backend applies globalFilter AND filter
  globalFilter?: JmixFilter;
  limit?: number;
}

// One group: its key (a date bucket's first day as YYYY-MM-DD; null for empty
// cells), its label, the aggregated number and how many rows it has
export interface AggregateRow {
  key: string | null;
  label: string | null;
  value: number | null;
  count: number;
}

export interface AggregateSeries {
  key: string | null;
  label: string | null;
  rows: AggregateRow[];
}

export interface AggregateResult {
  entityName: string;
  dimension?: AggregateDimension;
  measure: AggregateMeasure;
  splitBy?: AggregateSplitBy;
  rows?: AggregateRow[];
  // With splitBy: the rows again, once per split value
  series?: AggregateSeries[];
  totalValue: number | null;
  totalCount: number;
  truncated: boolean;
}
