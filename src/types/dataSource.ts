// Data tables: sources from the backend and how a table uses one.
// Rows are never stored in the design; they are fetched each time.

// Column types the backend reports; they decide formatting and filter operators
export type DataColumnType = "text" | "number" | "currency" | "date";

// A source in the "Table Data" list (e.g. Procurement)
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
  columns: DataColumn[];
}

export type DataRow = Record<string, string | number | null>;

// Filters work like a shop's filter panel: tick values of a text column
// ("in"), or set a range for a number, amount or date ("between", either
// end optional). Filters on different columns must all match; ticked values
// of one column match any of them.
export type FilterOperator = "in" | "between";

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
