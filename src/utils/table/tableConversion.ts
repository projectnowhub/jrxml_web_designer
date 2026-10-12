// One Table element, two kinds of content: "From project data" (a data table,
// TableElement) or "Typed by me" (a custom table, CustomTableElement). These turn
// one into the other at the same place.

import type { CustomTableCell, CustomTableElement, CustomTableRow, TableElement } from "@/types";
import type { DataRow } from "@/types/dataSource";
import { buildCustomTable, MIN_ROW_HEIGHT, syncTableSize } from "@/utils/customTable";
import {
  cellAlignmentFor,
  computeTotal,
  formatCellValue,
  hasTotalsRow,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
} from "./dataTable";

// A typed table at the data table's place; the same element id, so it stays selected
const typedAt = (
  source: { uuid?: string; x: number; y: number; pageIndex?: number },
  table: CustomTableElement["table"],
) => {
  const element: CustomTableElement = {
    type: "customTable",
    uuid: source.uuid,
    ...(source.pageIndex !== undefined ? { pageIndex: source.pageIndex } : {}),
    x: source.x,
    y: source.y,
    width: 0,
    height: 0,
    table,
  };
  syncTableSize(element);
  return element;
};

// An empty table becomes an empty typed table: a dark header row and two rows
export function emptyTypedTable(source: TableElement, headers: string[]): CustomTableElement {
  return typedAt(source, buildCustomTable(Math.round(source.width), headers));
}

// Rows kept when a data table becomes a typed table
export const CONVERTED_ROW_LIMIT = 10;

// A data table becomes a typed table showing what it shows now: its headings,
// its first rows (up to CONVERTED_ROW_LIMIT, as many as fit in `maxHeight`), its
// totals and its table style. Returns how many printed rows were left out.
export function typedTableFromData(
  source: TableElement,
  rows: DataRow[],
  options: { maxHeight: number; totalLabel: string; locale?: string },
): { element: CustomTableElement; leftOut: number } {
  const binding = source.binding!;
  const headerHeight = Math.max(MIN_ROW_HEIGHT, source.headerHeight ?? TABLE_HEADER_HEIGHT);
  const rowHeight = Math.max(MIN_ROW_HEIGHT, source.rowHeight ?? TABLE_ROW_HEIGHT);
  const totals = hasTotalsRow(binding);
  const printed = binding.rowLimit !== undefined ? rows.slice(0, binding.rowLimit) : rows;

  const room = options.maxHeight - headerHeight - (totals ? rowHeight : 0);
  const fits = Math.max(0, Math.min(printed.length, CONVERTED_ROW_LIMIT, Math.floor(room / rowHeight)));

  const header: CustomTableRow = {
    height: headerHeight,
    cells: binding.columns.map((col) => ({ text: col.label })),
  };
  const body: CustomTableRow[] = printed.slice(0, fits).map((row) => ({
    height: rowHeight,
    cells: binding.columns.map((col): CustomTableCell => {
      const align = cellAlignmentFor(col.type);
      return {
        text: formatCellValue(row[col.key], col.type, options.locale),
        ...(align !== "Left" ? { align } : {}),
        vAlign: "Middle",
      };
    }),
  }));
  // Totals over every printed row, as the report worked them out
  const totalsRow: CustomTableRow[] = totals
    ? [
        {
          height: rowHeight,
          cells: binding.columns.map((col, i): CustomTableCell => {
            const value = computeTotal(printed, col);
            const text =
              value !== null
                ? formatCellValue(value, col.total === "count" ? "number" : col.type, options.locale)
                : i === 0
                  ? options.totalLabel
                  : "";
            const align = value !== null ? cellAlignmentFor(col.type) : "Left";
            return { text, ...(align !== "Left" ? { align } : {}) };
          }),
        },
      ]
    : [];

  const table: CustomTableElement["table"] = {
    columns: binding.columns.map((col) => Math.max(1, Math.round(col.width))),
    rows: [header, ...body, ...totalsRow],
    theme: binding.theme,
    headerRows: 1,
    totalRow: totals,
    padding: 3,
  };
  if (binding.look) table.look = { ...binding.look, rowColors: [...binding.look.rowColors] };
  if (binding.customized) table.customized = true;
  return { element: typedAt(source, table), leftOut: printed.length - fits };
}

// A typed table becomes an empty data table at the same place (its data is then
// picked in the Configure popup)
export function emptyDataTable(source: CustomTableElement): TableElement {
  return {
    type: "table",
    uuid: source.uuid,
    ...(source.pageIndex !== undefined ? { pageIndex: source.pageIndex } : {}),
    x: source.x,
    y: source.y,
    width: Math.round(source.width),
    height: TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT,
    headerHeight: TABLE_HEADER_HEIGHT,
    rowHeight: TABLE_ROW_HEIGHT,
  };
}
