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

export type FilterOperator =
  // text
  | "equals"
  | "notEquals"
  | "contains"
  | "startsWith"
  | "isEmpty"
  | "isNotEmpty"
  // number / currency
  | "greaterThan"
  | "lessThan"
  // number / currency / date
  | "between"
  // date
  | "on"
  | "before"
  | "after";

export interface TableFilter {
  column: string;
  operator: FilterOperator;
  value?: string;
  // Upper bound for "between"
  value2?: string;
}

export type FilterMatch = "all" | "any";

export type SortDirection = "asc" | "desc";

export interface TableSort {
  column: string;
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

export type TableTheme = "corporateBlue" | "minimal" | "emerald";

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
  filterMatch: FilterMatch;
  sort: TableSort[];
  rowLimit?: number;
  showTotals: boolean;
  theme: TableTheme;
}

// What the designer asks the backend for
export interface DataQuery {
  columns: string[];
  filters: TableFilter[];
  filterMatch: FilterMatch;
  sort: TableSort[];
  limit?: number;
}

export interface DataQueryResult {
  rows: DataRow[];
  // Rows matching the filters, before the limit
  totalCount: number;
}
