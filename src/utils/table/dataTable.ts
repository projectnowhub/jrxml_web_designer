// Data table layout and JRXML mapping. A table's TableDataBinding is the single
// source of truth: its dataset, fields, totals and cells are derived from it
// whenever the canvas draws it or the JRXML is written.

import type { TableElement } from "@/types";
import type {
  DataColumn,
  DataColumnType,
  DataSourceSchema,
  TableColumnBinding,
  TableDataBinding,
  TotalFunction,
} from "@/types/dataSource";
import { distributeColumnWidths, maxColumnsForWidth } from "./dataBinding";

export const TABLE_HEADER_HEIGHT = 24;
export const TABLE_ROW_HEIGHT = 20;
// Rows drawn on the canvas; the report itself prints every row
export const CANVAS_SAMPLE_ROWS = 5;
// Columns of a new table before data is dropped on it
export const PLACEHOLDER_COLUMN_COUNT = 3;

export const isBoundTable = (
  table: Pick<TableElement, "binding">,
): table is TableElement & { binding: TableDataBinding } => !!table.binding;

export function hasTotalsRow(binding: TableDataBinding | undefined): boolean {
  return !!binding?.showTotals && binding.columns.some((c) => c.total);
}

// Sample rows the canvas shows for a result of `rowCount` rows
export function canvasRowCount(rowCount: number): number {
  return Math.min(Math.max(rowCount, 1), CANVAS_SAMPLE_ROWS);
}

// Height on the canvas (and in the JRXML): header, sample rows, totals
export function tableHeight(
  binding: TableDataBinding | undefined,
  rowCount: number,
  headerHeight = TABLE_HEADER_HEIGHT,
  rowHeight = TABLE_ROW_HEIGHT,
): number {
  const rows = binding ? canvasRowCount(rowCount) : 1;
  return headerHeight + rows * rowHeight + (hasTotalsRow(binding) ? rowHeight : 0);
}

// How many sample-row slots a table of this height has
export function rowSlots(table: TableElement): number {
  const header = table.headerHeight ?? TABLE_HEADER_HEIGHT;
  const row = table.rowHeight ?? TABLE_ROW_HEIGHT;
  const totals = hasTotalsRow(table.binding) ? row : 0;
  return Math.max(1, Math.round((table.height - header - totals) / row));
}

// ---------------------------------------------------------------------------
// Values from the backend arrive as JSON: whole numbers may come as Integer,
// decimals as Double, dates as ISO text. Fields are declared loosely and
// formatted in the cell, so any of these print instead of failing.
// ---------------------------------------------------------------------------

export function fieldClassFor(type: DataColumnType): string {
  return type === "number" || type === "currency" ? "java.lang.Number" : "java.lang.Object";
}

export function cellPatternFor(type: DataColumnType): string | undefined {
  if (type === "currency") return "#,##0.00";
  if (type === "number") return "#,##0.##";
  return undefined;
}

export const DATE_DISPLAY_PATTERN = "dd MMM yyyy";

export function cellAlignmentFor(type: DataColumnType): "Left" | "Center" | "Right" {
  if (type === "number" || type === "currency") return "Right";
  if (type === "date") return "Center";
  return "Left";
}

const fieldRef = (key: string) => `$F{${key}}`;

// The detail cell's expression for a column
export function cellExpression(column: Pick<TableColumnBinding, "key" | "type">): string {
  const f = fieldRef(column.key);
  if (column.type === "date") {
    const fmt = `new java.text.SimpleDateFormat("${DATE_DISPLAY_PATTERN}")`;
    return (
      `${f} == null ? null : (${f} instanceof java.util.Date ? ${fmt}.format((java.util.Date)${f}) : ` +
      `(String.valueOf(${f}).length() >= 10 ? ${fmt}.format(java.sql.Date.valueOf(String.valueOf(${f}).substring(0, 10))) : String.valueOf(${f})))`
    );
  }
  return f;
}

// Variable holding a column's total, inside the table's dataset
export function totalVariableName(columnIndex: number): string {
  return `TOTAL_${columnIndex + 1}`;
}

export function totalVariable(
  column: TableColumnBinding,
  columnIndex: number,
): { name: string; className: string; calculation: string; expression: string } | null {
  if (!column.total) return null;
  const name = totalVariableName(columnIndex);
  const f = fieldRef(column.key);
  if (column.total === "count") {
    return { name, className: "java.lang.Integer", calculation: "Count", expression: f };
  }
  return {
    name,
    className: "java.lang.Double",
    calculation: column.total === "sum" ? "Sum" : "Average",
    expression: `${f} == null ? null : Double.valueOf(${f}.doubleValue())`,
  };
}

// Which totals make sense for a column type
export function totalsFor(type: DataColumnType): TotalFunction[] {
  return type === "number" || type === "currency" ? ["sum", "avg", "count"] : ["count"];
}

// ---------------------------------------------------------------------------
// Building and resizing
// ---------------------------------------------------------------------------

export function toColumnBinding(column: DataColumn, width: number): TableColumnBinding {
  return { key: column.key, label: column.label, type: column.type, width };
}

// A first setup for a source dropped on a table: as many of its columns as fit
export function createBinding(options: {
  project: { id: string; name: string };
  schema: DataSourceSchema;
  tableName: string;
  datasetName: string;
  tableWidth: number;
}): TableDataBinding {
  const { project, schema, tableName, datasetName, tableWidth } = options;
  const columns = schema.columns.slice(0, maxColumnsForWidth(tableWidth));
  const widths = distributeColumnWidths(columns.length, tableWidth);
  return {
    tableName,
    datasetName,
    projectId: project.id,
    projectName: project.name,
    sourceId: schema.id,
    sourceName: schema.name,
    columns: columns.map((c, i) => toColumnBinding(c, widths[i] ?? 0)),
    filters: [],
    sort: [],
    showTotals: false,
    theme: "corporateBlue",
  };
}

// New widths after the table is resized, keeping each column's share
export function scaleColumnWidths(columns: TableColumnBinding[], tableWidth: number): TableColumnBinding[] {
  const current = columns.reduce((sum, c) => sum + c.width, 0) || 1;
  const target = Math.max(columns.length, Math.round(tableWidth));
  let used = 0;
  return columns.map((c, i) => {
    const width =
      i === columns.length - 1
        ? target - used
        : Math.max(1, Math.round((c.width / current) * target));
    used += width;
    return { ...c, width };
  });
}

// Equal widths for the chosen columns (after adding/removing columns)
export function evenColumnWidths(columns: TableColumnBinding[], tableWidth: number): TableColumnBinding[] {
  const widths = distributeColumnWidths(columns.length, tableWidth);
  return columns.map((c, i) => ({ ...c, width: widths[i] ?? 0 }));
}

// Display text for a value on the canvas and in the preview grid
export function formatCellValue(value: unknown, type: DataColumnType, locale?: string): string {
  if (value === null || value === undefined || value === "") return "";
  if (type === "number" || type === "currency") {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return n.toLocaleString(locale, {
      minimumFractionDigits: type === "currency" ? 2 : 0,
      maximumFractionDigits: 2,
    });
  }
  if (type === "date") {
    const d = new Date(String(value).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  }
  return String(value);
}

// The totals row value for one column, computed from rows (canvas / preview)
export function computeTotal(
  rows: Record<string, unknown>[],
  column: TableColumnBinding,
): number | null {
  if (!column.total) return null;
  const values = rows.map((r) => r[column.key]).filter((v) => v !== null && v !== undefined && v !== "");
  if (column.total === "count") return values.length;
  const numbers = values.map(Number).filter((n) => !Number.isNaN(n));
  if (!numbers.length) return null;
  const sum = numbers.reduce((a, b) => a + b, 0);
  return column.total === "sum" ? sum : sum / numbers.length;
}

// Height after a resize: whole sample rows (1 to CANVAS_SAMPLE_ROWS)
export function snapTableHeight(table: TableElement, height: number): number {
  const header = table.headerHeight ?? TABLE_HEADER_HEIGHT;
  const row = table.rowHeight ?? TABLE_ROW_HEIGHT;
  const totals = hasTotalsRow(table.binding) ? row : 0;
  const max = table.binding ? CANVAS_SAMPLE_ROWS : 1;
  const slots = Math.min(max, Math.max(1, Math.round((height - header - totals) / row)));
  return header + slots * row + totals;
}
