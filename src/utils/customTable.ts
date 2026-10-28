// Custom table: a grid the user types into, with merged cells, cell fills and
// text styles. Everything here works on the plain setup (CustomTableData), so the
// canvas, the properties panel, the JRXML writer and the parser share it.

import type { CustomTableCell, CustomTableData, CustomTableElement } from "@/types";
import type { TableLook } from "@/types/dataSource";
import { escapeHtml } from "./elementUtils";
import {
  normalizeLook,
  resolveLook,
  rowColorAt,
  TABLE_LINE_WIDTH,
  TABLE_RULE_WIDTH,
} from "./table/tableThemes";

// The setup is written as JSON in this property of the table's frame; the parser
// rebuilds the table from it alone
export const CUSTOM_TABLE_PROPERTY = "com.cdp.customTable";
// On the table's other frames (its rows), with the table's id: skipped when read
export const CUSTOM_TABLE_PART_PROPERTY = "com.cdp.customTable.part";

export const MIN_COLUMN_WIDTH = 16;
export const MIN_ROW_HEIGHT = 12;
export const DEFAULT_ROW_HEIGHT = 20;
// Line height of the report font (Noto Sans SC) as a share of the font size;
// JasperReports leaves out text whose first line doesn't fit its box
export const TEXT_LINE_HEIGHT = 1.45;

export const MAX_HEADER_ROWS = 3;

export interface CellPos {
  row: number;
  col: number;
}

export interface CellRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export const emptyCell = (style: Partial<CustomTableCell> = {}): CustomTableCell => {
  const cell: CustomTableCell = { text: "" };
  for (const [key, value] of Object.entries(cellStyle(style))) {
    if (value !== undefined) (cell as any)[key] = value;
  }
  return cell;
};

// A cell's look without its text and merge
export function cellStyle(cell: Partial<CustomTableCell>): Partial<CustomTableCell> {
  const { text: _text, rich: _rich, sum: _sum, colSpan: _colSpan, rowSpan: _rowSpan, ...style } = cell;
  return { ...style };
}

// A new table: the Corporate Blue style, a header row and empty rows
export function buildCustomTable(width: number, headers: string[], bodyRows = 2): CustomTableData {
  const columnCount = headers.length;
  const base = Math.floor(width / columnCount);
  const columns = headers.map((_, i) =>
    i === columnCount - 1 ? width - base * (columnCount - 1) : base,
  );
  return {
    columns,
    rows: [
      { height: DEFAULT_ROW_HEIGHT, cells: headers.map((text) => ({ text })) },
      ...Array.from({ length: bodyRows }, () => ({
        height: DEFAULT_ROW_HEIGHT,
        cells: headers.map(() => emptyCell()),
      })),
    ],
    theme: "corporateBlue",
    headerRows: 1,
    totalRow: false,
    padding: 3,
  };
}

// ---------------------------------------------------------------------------
// How a cell looks: the table style for its row (header, body rows in turn,
// total row), then the colours and text styles set on the cell itself
// ---------------------------------------------------------------------------

export type CustomRowPart = "header" | "row" | "totals";

export function rowPart(table: CustomTableData, row: number): { part: CustomRowPart; bodyIndex: number } {
  if (row < table.headerRows) return { part: "header", bodyIndex: 0 };
  if (table.totalRow && row === table.rows.length - 1) return { part: "totals", bodyIndex: 0 };
  return { part: "row", bodyIndex: row - table.headerRows };
}

// A whole-table text style or alignment was set: the cells of that part drop
// their own value for it, so the table's shows
export function clearPartCells(
  table: CustomTableData,
  part: CustomRowPart,
  key: "bold" | "italic" | "underline" | "align",
): void {
  table.rows.forEach((row, r) => {
    if (rowPart(table, r).part !== part) return;
    row.cells.forEach((cell) => delete cell[key]);
  });
}

export interface ResolvedCell {
  fill: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: NonNullable<CustomTableCell["align"]>;
  vAlign: NonNullable<CustomTableCell["vAlign"]>;
  fontSize: number;
}

export function resolveCell(table: CustomTableData, look: TableLook, row: number, cell: CustomTableCell): ResolvedCell {
  const { part, bodyIndex } = rowPart(table, row);
  // The whole table's style for this row's part; the cell's own settings come over it
  const base =
    part === "header"
      ? {
          fill: look.headerBackground,
          color: look.headerText,
          bold: look.headerBold,
          italic: !!look.headerItalic,
          underline: !!look.headerUnderline,
          align: look.headerAlign ?? "Left",
          vAlign: "Middle" as const,
        }
      : part === "totals"
        ? {
            fill: look.totalsBackground,
            color: look.totalsText,
            bold: look.totalsBold,
            italic: !!look.totalsItalic,
            underline: !!look.totalsUnderline,
            align: look.totalsAlign ?? "Left",
            vAlign: "Middle" as const,
          }
        : {
            fill: rowColorAt(look, bodyIndex),
            color: look.rowText,
            bold: !!look.rowBold,
            italic: !!look.rowItalic,
            underline: !!look.rowUnderline,
            align: look.rowAlign ?? "Left",
            vAlign: "Top" as const,
          };
  return {
    fill: cell.fill ?? base.fill,
    color: cell.color ?? base.color,
    bold: cell.bold ?? base.bold,
    italic: cell.italic ?? base.italic,
    underline: cell.underline ?? base.underline,
    align: cell.align ?? base.align,
    vAlign: cell.vAlign ?? base.vAlign,
    fontSize: cell.fontSize ?? look.fontSize,
  };
}

export interface CellPen {
  width: number;
  color: string;
}

// The lines around a cell, from the style: all sides ("grid"), under each body
// row ("rows"), and the stronger line under the header and above the totals
export function cellPens(table: CustomTableData, look: TableLook, row: number, rowSpan: number) {
  const pens: { top?: CellPen; left?: CellPen; bottom?: CellPen; right?: CellPen } = {};
  if (look.lines === "none") return pens;
  const thin = { width: TABLE_LINE_WIDTH, color: look.lineColor };
  const rule = { width: TABLE_RULE_WIDTH, color: look.ruleColor };
  const last = rowPart(table, row + rowSpan - 1).part;
  const first = rowPart(table, row).part;
  if (look.lines === "grid") Object.assign(pens, { top: thin, left: thin, bottom: thin, right: thin });
  if (look.lines === "rows" && last === "row") pens.bottom = thin;
  if (last === "header") pens.bottom = rule;
  if (first === "totals") pens.top = rule;
  return pens;
}

export const customTableLook = (table: CustomTableData): TableLook => resolveLook(table);

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export const tableWidth = (table: CustomTableData) => sum(table.columns);
export const tableHeight = (table: CustomTableData) => sum(table.rows.map((r) => r.height));

// The element's box follows its columns and rows
export function syncTableSize(element: CustomTableElement): void {
  element.width = Math.round(tableWidth(element.table));
  element.height = Math.round(tableHeight(element.table));
}

// A size typed in the panel (or an element resized by other means): the columns
// and rows take their shares of the box again
export function fitTableToBox(element: CustomTableElement): void {
  const table = element.table;
  if (Math.round(tableWidth(table)) !== Math.round(element.width)) {
    table.columns = scaleSizes(table.columns, Math.round(element.width), MIN_COLUMN_WIDTH);
  }
  if (Math.round(tableHeight(table)) !== Math.round(element.height)) {
    const heights = scaleSizes(table.rows.map((r) => r.height), Math.round(element.height), MIN_ROW_HEIGHT);
    heights.forEach((h, i) => (table.rows[i]!.height = h));
  }
  syncTableSize(element);
}

// Sizes scaled to a new total, each at least `min`, whole numbers adding up exactly
export function scaleSizes(sizes: number[], total: number, min: number): number[] {
  const count = sizes.length;
  const target = Math.max(total, min * count);
  const current = sum(sizes) || 1;
  const scaled = sizes.map((s) => Math.max(min, Math.round((s / current) * target)));
  // Put the rounding difference on the largest one
  const diff = target - sum(scaled);
  if (diff !== 0) {
    const largest = scaled.indexOf(Math.max(...scaled));
    scaled[largest] = Math.max(min, scaled[largest]! + diff);
  }
  return scaled;
}

// ---------------------------------------------------------------------------
// Merged cells
// ---------------------------------------------------------------------------

const spanOf = (cell: CustomTableCell | undefined) => ({
  cols: Math.max(1, cell?.colSpan ?? 1),
  rows: Math.max(1, cell?.rowSpan ?? 1),
});

// For each grid position, the top-left cell of the block it belongs to
export function anchorMap(table: CustomTableData): CellPos[][] {
  const map: CellPos[][] = table.rows.map((row, r) => row.cells.map((_, c) => ({ row: r, col: c })));
  table.rows.forEach((row, r) =>
    row.cells.forEach((cell, c) => {
      if (!isAnchor(map, r, c)) return;
      const span = spanOf(cell);
      for (let dr = 0; dr < span.rows; dr++) {
        for (let dc = 0; dc < span.cols; dc++) {
          if (map[r + dr]?.[c + dc]) map[r + dr]![c + dc] = { row: r, col: c };
        }
      }
    }),
  );
  return map;
}

const isAnchor = (map: CellPos[][], r: number, c: number) =>
  map[r]?.[c]?.row === r && map[r]?.[c]?.col === c;

// The cells that are shown: each with its position and span
export interface VisibleCell {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  cell: CustomTableCell;
}

export function visibleCells(table: CustomTableData): VisibleCell[] {
  const map = anchorMap(table);
  const cells: VisibleCell[] = [];
  table.rows.forEach((row, r) =>
    row.cells.forEach((cell, c) => {
      if (!isAnchor(map, r, c)) return;
      const span = spanOf(cell);
      cells.push({ row: r, col: c, rowSpan: span.rows, colSpan: span.cols, cell });
    }),
  );
  return cells;
}

// The rectangle between two cells, grown until no merged cell sticks out of
// it. Whole columns / rows (from a handle) stay as chosen: a merged cell
// across them doesn't pull in the columns / rows next to them
export function selectionRect(table: CustomTableData, a: CellPos, b: CellPos): CellRect {
  const rect: CellRect = {
    top: Math.min(a.row, b.row),
    bottom: Math.max(a.row, b.row),
    left: Math.min(a.col, b.col),
    right: Math.max(a.col, b.col),
  };
  const wholeColumns = rect.top === 0 && rect.bottom === table.rows.length - 1;
  const wholeRows = rect.left === 0 && rect.right === table.columns.length - 1;
  if (wholeColumns || wholeRows) return rect;
  const blocks = visibleCells(table);
  let grown = true;
  while (grown) {
    grown = false;
    for (const v of blocks) {
      const bottom = v.row + v.rowSpan - 1;
      const right = v.col + v.colSpan - 1;
      const overlaps = v.row <= rect.bottom && bottom >= rect.top && v.col <= rect.right && right >= rect.left;
      if (!overlaps) continue;
      if (v.row < rect.top || bottom > rect.bottom || v.col < rect.left || right > rect.right) {
        rect.top = Math.min(rect.top, v.row);
        rect.bottom = Math.max(rect.bottom, bottom);
        rect.left = Math.min(rect.left, v.col);
        rect.right = Math.max(rect.right, right);
        grown = true;
      }
    }
  }
  return rect;
}

// The shown cells inside a rectangle
export function cellsInRect(table: CustomTableData, rect: CellRect): VisibleCell[] {
  return visibleCells(table).filter(
    (v) => v.row >= rect.top && v.row <= rect.bottom && v.col >= rect.left && v.col <= rect.right,
  );
}

export const rectCellCount = (table: CustomTableData, rect: CellRect) => cellsInRect(table, rect).length;

// Whether a merged cell is partly inside the rectangle (a chosen column
// crossing a merged cell): such a rectangle can't be merged
export const cutsMergedCell = (table: CustomTableData, rect: CellRect) =>
  visibleCells(table).some((v) => {
    const bottom = v.row + v.rowSpan - 1;
    const right = v.col + v.colSpan - 1;
    const overlaps = v.row <= rect.bottom && bottom >= rect.top && v.col <= rect.right && right >= rect.left;
    return overlaps && (v.row < rect.top || bottom > rect.bottom || v.col < rect.left || right > rect.right);
  });

// Whether the rectangle can become one cell
export const canMergeRect = (table: CustomTableData, rect: CellRect) =>
  rectCellCount(table, rect) > 1 && !cutsMergedCell(table, rect);

// Merge a rectangle into one cell; the texts of the cells are kept, one per line
export function mergeCells(table: CustomTableData, rect: CellRect): void {
  if (!canMergeRect(table, rect)) return;
  const cells = cellsInRect(table, rect);
  const anchor = table.rows[rect.top]!.cells[rect.left]!;
  const filled = cells.filter((v) => v.cell.text.trim() !== "");
  // Formatted text stays formatted: plain texts join it as HTML lines
  const rich = filled.some((v) => v.cell.rich);
  const texts = filled.map((v) =>
    rich && !v.cell.rich ? escapeHtml(v.cell.text).replace(/\n/g, "<br>") : v.cell.text,
  );
  for (const v of cells) {
    if (v.row === rect.top && v.col === rect.left) continue;
    table.rows[v.row]!.cells[v.col] = emptyCell(cellStyle(v.cell));
  }
  anchor.text = texts.join(rich ? "<br>" : "\n");
  if (rich) anchor.rich = true;
  else delete anchor.rich;
  anchor.colSpan = rect.right - rect.left + 1;
  anchor.rowSpan = rect.bottom - rect.top + 1;
  if (anchor.colSpan === 1) delete anchor.colSpan;
  if (anchor.rowSpan === 1) delete anchor.rowSpan;
}

// Split every merged cell in a rectangle; the freed cells take the merged cell's look
export function splitCells(table: CustomTableData, rect: CellRect): void {
  for (const v of cellsInRect(table, rect)) {
    if (v.rowSpan === 1 && v.colSpan === 1) continue;
    const style = cellStyle(v.cell);
    for (let r = v.row; r < v.row + v.rowSpan; r++) {
      for (let c = v.col; c < v.col + v.colSpan; c++) {
        if (r === v.row && c === v.col) continue;
        table.rows[r]!.cells[c] = emptyCell(style);
      }
    }
    delete v.cell.colSpan;
    delete v.cell.rowSpan;
  }
}

export const hasMergedCells = (table: CustomTableData, rect: CellRect) =>
  cellsInRect(table, rect).some((v) => v.rowSpan > 1 || v.colSpan > 1);

// ---------------------------------------------------------------------------
// Rows and columns
// ---------------------------------------------------------------------------

// Insert a row at `index`, as tall as the row it is added next to; its colours
// come from the table style (a row added among the header rows is a header row)
// A column's name, as spreadsheets name them: A, B… Z, AA, AB…
export function columnName(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    name = String.fromCharCode(65 + r) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

export function insertRow(table: CustomTableData, index: number, likeRow: number): void {
  const like = table.rows[likeRow] ?? table.rows[0]!;
  const map = anchorMap(table);
  table.rows.splice(index, 0, {
    height: like.height,
    cells: like.cells.map(() => emptyCell()),
  });
  if (index < table.headerRows) table.headerRows = Math.min(MAX_HEADER_ROWS, table.headerRows + 1);
  // A merged block that runs across the new row grows over it
  if (index > 0 && index < map.length) {
    const seen = new Set<string>();
    map[index]!.forEach((pos) => {
      const key = `${pos.row}:${pos.col}`;
      if (pos.row < index && !seen.has(key)) {
        seen.add(key);
        const cell = table.rows[pos.row]!.cells[pos.col]!;
        cell.rowSpan = spanOf(cell).rows + 1;
      }
    });
  }
}

// Insert a column at `index`, aligned like the column next to it; the table
// keeps its width (the new column takes its share from the others)
export function insertColumn(table: CustomTableData, index: number, likeCol: number): void {
  const map = anchorMap(table);
  const total = tableWidth(table);
  const likeWidth = table.columns[likeCol] ?? table.columns[0]!;
  table.columns.splice(index, 0, likeWidth);
  table.columns = scaleSizes(table.columns, total, MIN_COLUMN_WIDTH);
  const seen = new Set<string>();
  table.rows.forEach((row, r) => {
    const like = row.cells[likeCol] ?? row.cells[0]!;
    row.cells.splice(index, 0, emptyCell({ align: like.align, vAlign: like.vAlign }));
    const pos = index > 0 && index < (map[r]?.length ?? 0) ? map[r]![index]! : null;
    if (pos && pos.col < index) {
      const key = `${pos.row}:${pos.col}`;
      if (!seen.has(key)) {
        seen.add(key);
        const cell = table.rows[pos.row]!.cells[pos.col]!;
        cell.colSpan = spanOf(cell).cols + 1;
      }
    }
  });
}

// Delete rows top..bottom; merged blocks running through them shrink, and a
// block starting in them moves its top-left cell down
export function deleteRows(table: CustomTableData, top: number, bottom: number): void {
  const count = bottom - top + 1;
  if (count >= table.rows.length) return;
  for (const v of visibleCells(table)) {
    const vBottom = v.row + v.rowSpan - 1;
    const overlap = Math.max(0, Math.min(vBottom, bottom) - Math.max(v.row, top) + 1);
    if (overlap === 0 || v.rowSpan === 1) continue;
    const remaining = v.rowSpan - overlap;
    if (remaining <= 0) continue;
    if (v.row >= top) {
      // The block's first row goes: its cell moves to the first row kept
      const target = bottom + 1;
      table.rows[target]!.cells[v.col] = { ...v.cell, rowSpan: remaining };
      if (remaining === 1) delete table.rows[target]!.cells[v.col]!.rowSpan;
    } else {
      v.cell.rowSpan = remaining;
      if (remaining === 1) delete v.cell.rowSpan;
    }
  }
  table.rows.splice(top, count);
  // Header rows deleted: fewer header rows
  const headerGone = Math.max(0, Math.min(bottom, table.headerRows - 1) - top + 1);
  table.headerRows = Math.max(0, table.headerRows - headerGone);
}

// Delete columns left..right; the table keeps its width
export function deleteColumns(table: CustomTableData, left: number, right: number): void {
  const count = right - left + 1;
  if (count >= table.columns.length) return;
  const total = tableWidth(table);
  for (const v of visibleCells(table)) {
    const vRight = v.col + v.colSpan - 1;
    const overlap = Math.max(0, Math.min(vRight, right) - Math.max(v.col, left) + 1);
    if (overlap === 0 || v.colSpan === 1) continue;
    const remaining = v.colSpan - overlap;
    if (remaining <= 0) continue;
    if (v.col >= left) {
      const target = right + 1;
      table.rows[v.row]!.cells[target] = { ...v.cell, colSpan: remaining };
      if (remaining === 1) delete table.rows[v.row]!.cells[target]!.colSpan;
    } else {
      v.cell.colSpan = remaining;
      if (remaining === 1) delete v.cell.colSpan;
    }
  }
  table.rows.forEach((row) => row.cells.splice(left, count));
  table.columns.splice(left, count);
  table.columns = scaleSizes(table.columns, total, MIN_COLUMN_WIDTH);
}

// ---------------------------------------------------------------------------
// Reading a stored setup
// ---------------------------------------------------------------------------

const ALIGNS = ["Left", "Center", "Right", "Justified"] as const;
const V_ALIGNS = ["Top", "Middle", "Bottom"] as const;
const COLOR = /^#[0-9a-fA-F]{6}$/;

const num = (value: unknown, fallback: number, min: number, max: number) => {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
};

function readCell(raw: any): CustomTableCell {
  const cell: CustomTableCell = { text: typeof raw?.text === "string" ? raw.text : "" };
  if (raw?.rich === true) cell.rich = true;
  if (raw?.sum === true) cell.sum = true;
  if (raw?.colSpan > 1) cell.colSpan = Math.floor(raw.colSpan);
  if (raw?.rowSpan > 1) cell.rowSpan = Math.floor(raw.rowSpan);
  if (COLOR.test(raw?.fill)) cell.fill = raw.fill;
  if (COLOR.test(raw?.color)) cell.color = raw.color;
  if (typeof raw?.bold === "boolean") cell.bold = raw.bold;
  if (typeof raw?.italic === "boolean") cell.italic = raw.italic;
  if (typeof raw?.underline === "boolean") cell.underline = raw.underline;
  if (ALIGNS.includes(raw?.align)) cell.align = raw.align;
  if (V_ALIGNS.includes(raw?.vAlign)) cell.vAlign = raw.vAlign;
  if (typeof raw?.fontSize === "number") cell.fontSize = num(raw.fontSize, 9, 4, 72);
  return cell;
}

// Any stored value as a valid setup (a square grid, spans inside the grid), or null
export function normalizeCustomTable(raw: any): CustomTableData | null {
  if (!raw || !Array.isArray(raw.columns) || !Array.isArray(raw.rows)) return null;
  const columns = raw.columns.map((w: unknown) => num(w, 60, MIN_COLUMN_WIDTH, 5000));
  if (columns.length === 0 || raw.rows.length === 0) return null;
  const rows = raw.rows.map((row: any) => ({
    height: num(row?.height, DEFAULT_ROW_HEIGHT, MIN_ROW_HEIGHT, 5000),
    cells: columns.map((_: number, c: number) => readCell(row?.cells?.[c])),
  }));
  rows.forEach((row: { cells: CustomTableCell[] }, r: number) =>
    row.cells.forEach((cell, c) => {
      if (cell.colSpan && c + cell.colSpan > columns.length) cell.colSpan = columns.length - c;
      if (cell.rowSpan && r + cell.rowSpan > rows.length) cell.rowSpan = rows.length - r;
      if (cell.colSpan === 1) delete cell.colSpan;
      if (cell.rowSpan === 1) delete cell.rowSpan;
    }),
  );
  const table: CustomTableData = {
    columns,
    rows,
    theme: typeof raw.theme === "string" && /^[A-Za-z0-9_]+$/.test(raw.theme) ? raw.theme : "corporateBlue",
    headerRows: Math.round(num(raw.headerRows, 1, 0, Math.min(MAX_HEADER_ROWS, rows.length))),
    totalRow: raw.totalRow === true,
    padding: num(raw.padding, 3, 0, 40),
  };
  if (raw.look && typeof raw.look === "object") table.look = normalizeLook(raw.look);
  if (raw.customized === true) table.customized = true;
  return table;
}

export function parseCustomTable(value: string | null | undefined): CustomTableData | null {
  if (!value) return null;
  try {
    return normalizeCustomTable(JSON.parse(value));
  } catch {
    return null;
  }
}

// Written in one fixed shape, so the same table always gives the same JRXML
export const serializeCustomTable = (table: CustomTableData) =>
  JSON.stringify(normalizeCustomTable(table) ?? table);

// A copy that shares nothing with the original (Vue's reactive objects can't be structuredClone'd)
export const cloneCustomTable = (table: CustomTableData): CustomTableData =>
  JSON.parse(JSON.stringify(table));

// ---------------------------------------------------------------------------
// The total row: column sums that keep up with the typed numbers
// ---------------------------------------------------------------------------

// A typed number, with the words around it ("RM 1,200.50", "85%"); null when
// the cell holds something else
const NUMBER_TEXT = /^([^\d+\-.]*?)\s*([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*([^\d]*)$/;
function readNumber(text: string): { value: number; before: string; after: string; decimals: number; grouped: boolean } | null {
  const match = text.trim().match(NUMBER_TEXT);
  if (!match) return null;
  const digits = match[2]!;
  return {
    value: Number(digits.replace(/,/g, "")),
    before: match[1]!,
    after: match[3]!,
    decimals: digits.includes(".") ? digits.split(".")[1]!.length : 0,
    grouped: digits.includes(","),
  };
}

const plainText = (cell: CustomTableCell) =>
  (cell.rich ? cell.text.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&") : cell.text).trim();

// A column's sum over the body rows, written like its numbers; null when the
// column holds words (every filled cell must be a number; "-" counts as empty)
export function columnSum(table: CustomTableData, col: number): string | null {
  const map = anchorMap(table);
  const last = table.totalRow ? table.rows.length - 1 : table.rows.length;
  const found: NonNullable<ReturnType<typeof readNumber>>[] = [];
  for (let r = table.headerRows; r < last; r++) {
    if (!isAnchor(map, r, col)) continue;
    const text = plainText(table.rows[r]!.cells[col]!);
    if (!text || /^[-–—]$/.test(text)) continue;
    const n = readNumber(text);
    if (!n) return null;
    found.push(n);
  }
  if (!found.length) return null;
  const total = found.reduce((a, n) => a + n.value, 0);
  const decimals = Math.max(...found.map((n) => n.decimals));
  const grouped = found.some((n) => n.grouped);
  const same = (key: "before" | "after") => (found.every((n) => n[key] === found[0]![key]) ? found[0]![key] : "");
  const [whole, fraction] = Math.abs(total).toFixed(decimals).split(".");
  const wholeText = grouped ? whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole!;
  const before = same("before");
  return `${before}${before && !/\s$/.test(before) && /[A-Za-z]$/.test(before) ? " " : ""}${total < 0 ? "-" : ""}${wholeText}${fraction ? "." + fraction : ""}${same("after")}`;
}

// "Last row is a total" ticked: a new row at the bottom with the label in the
// first column and the sums under the number columns (kept up to date);
// unticked: that row goes again while it is still as it was made
export function setTotalRow(table: CustomTableData, on: boolean, label: string): void {
  if (on === table.totalRow) return;
  if (on) {
    insertRow(table, table.rows.length, table.rows.length - 1);
    table.totalRow = true;
    const row = table.rows[table.rows.length - 1]!;
    row.cells.forEach((cell, c) => {
      if (columnSum(table, c) !== null) cell.sum = true;
    });
    if (!row.cells[0]!.sum) row.cells[0]!.text = label;
    syncTotals(table);
    return;
  }
  const row = table.rows[table.rows.length - 1]!;
  const made = row.cells.every((cell, c) => cell.sum || cell.text === "" || (c === 0 && cell.text === label));
  table.totalRow = false;
  if (made && table.rows.length > 1 && !row.cells.some((cell) => cell.rowSpan && cell.rowSpan > 1)) {
    deleteRows(table, table.rows.length - 1, table.rows.length - 1);
  }
}

// The sum cells of one table's total row, written from the rows above
export function syncTotals(table: CustomTableData): boolean {
  if (!table.totalRow) return false;
  let changed = false;
  table.rows[table.rows.length - 1]!.cells.forEach((cell, c) => {
    if (!cell.sum) return;
    const text = columnSum(table, c) ?? "";
    if (cell.text !== text || cell.rich) {
      cell.text = text;
      delete cell.rich;
      changed = true;
    }
  });
  return changed;
}

// ---------------------------------------------------------------------------
// Splitting a table over two pages
// ---------------------------------------------------------------------------

// Whether the table can be split above row `at`: at least one body row stays
// and one moves, and no merged cell runs across the cut
export function canSplitAt(table: CustomTableData, at: number): boolean {
  const lastBody = table.totalRow ? table.rows.length - 2 : table.rows.length - 1;
  if (at <= table.headerRows || at > lastBody) return false;
  return !visibleCells(table).some((v) => v.row < at && v.row + v.rowSpan > at);
}

// The rows above `at` stay; the rows from `at` on (the total row with them)
// become a second table that starts with a copy of the heading rows. Sums in
// the total row keep the whole table's numbers, written out as they are now
export function splitCustomTable(table: CustomTableData, at: number): { head: CustomTableData; rest: CustomTableData } {
  const head = cloneCustomTable(table);
  head.rows = head.rows.slice(0, at);
  head.totalRow = false;
  const rest = cloneCustomTable(table);
  rest.rows = [...rest.rows.slice(0, table.headerRows), ...rest.rows.slice(at)];
  if (rest.totalRow) for (const cell of rest.rows[rest.rows.length - 1]!.cells) delete cell.sum;
  return { head: normalizeCustomTable(head) ?? head, rest: normalizeCustomTable(rest) ?? rest };
}
