// JRXML for a custom table. JasperReports' own table can't merge cells down a
// column, so the table is written as plain frames and text fields, straight into
// its section (no frame around the whole table: a frame that is pushed down and
// then split over a page gets blank space added at its end):
//
// <frame positionType="Float">  one per row: grows to its tallest cell, rows
//                               below move down
//   <textField textAdjust="StretchHeight" stretchType="ContainerHeight">  cells
// <frame positionType="Float">  rows tied together by a cell merged down are one
//                               block: their row frames (the last one stretching
//                               to the block's bottom) plus the merged cells,
//                               which reach the block's bottom
//
// The first frame has the table's id and its setup as JSON (CUSTOM_TABLE_PROPERTY);
// the others are marked with CUSTOM_TABLE_PART_PROPERTY. The parser rebuilds the
// table from the setup alone and skips the marked frames.
// Each cell is drawn from the table style for its row (header rows, body rows
// in turn, total row) and the colours / text styles set on the cell; it draws
// its own lines.

import type { CustomTableData, CustomTableElement } from "@/types";
import type { TableLook } from "@/types/dataSource";
import { resolveReportFont } from "@/config/fonts.config";
import {
  cloneCustomTable,
  CUSTOM_TABLE_PART_PROPERTY,
  CUSTOM_TABLE_PROPERTY,
  cellPens,
  customTableLook,
  fitTableToBox,
  resolveCell,
  type CellPen,
  serializeCustomTable,
  visibleCells,
  type VisibleCell,
} from "../customTable";
import { javaString } from "./tableXml";
import { cdata, xmlAttr } from "./xmlEscape";

const round = (n: number) => Math.round(n);

// Stable ids for the frames and cells, derived from the table's own id, so the
// JRXML only changes when the table does
function idMaker(base: string | undefined) {
  const prefix = (base && /^[0-9a-f-]{36}$/i.test(base) ? base : "00000000-0000-4000-8000-000000000000").slice(0, 24);
  let n = 0;
  return () => `${prefix}${(++n).toString(16).padStart(12, "0")}`;
}

const penXml = (tag: string, pen: CellPen) =>
  `<${tag} lineWidth="${xmlAttr(pen.width)}" lineStyle="Solid" lineColor="${xmlAttr(pen.color)}"/>`;

// Padding and the lines from the table style (pens in the schema's order)
function cellBox(table: CustomTableData, look: TableLook, v: VisibleCell): string {
  const p = xmlAttr(table.padding);
  const pens = cellPens(table, look, v.row, v.rowSpan);
  let xml = `<box topPadding="${p}" leftPadding="${p}" bottomPadding="${p}" rightPadding="${p}">`;
  if (pens.top) xml += penXml("topPen", pens.top);
  if (pens.left) xml += penXml("leftPen", pens.left);
  if (pens.bottom) xml += penXml("bottomPen", pens.bottom);
  if (pens.right) xml += penXml("rightPen", pens.right);
  return xml + "</box>";
}

// A cell: the table style for its row, then what is set on the cell itself
function cellXml(
  v: VisibleCell,
  rect: { x: number; y: number; width: number; height: number },
  stretchType: "ContainerHeight" | "ContainerBottom" | "NoStretch",
  positionType: "Float" | "FixRelativeToTop",
  table: CustomTableData,
  look: TableLook,
  id: () => string,
): string {
  const cell = resolveCell(table, look, v.row, v.cell);
  let attrs = ` x="${round(rect.x)}" y="${round(rect.y)}" width="${round(rect.width)}" height="${round(rect.height)}" uuid="${id()}"`;
  if (positionType === "Float") attrs += ` positionType="Float"`;
  if (stretchType !== "NoStretch") attrs += ` stretchType="${stretchType}"`;
  attrs += ` mode="Opaque" backcolor="${xmlAttr(cell.fill)}" forecolor="${xmlAttr(cell.color)}"`;

  let font = ` fontName="${xmlAttr(resolveReportFont(undefined))}" size="${xmlAttr(cell.fontSize)}"`;
  if (cell.bold) font += ` isBold="true"`;
  if (cell.italic) font += ` isItalic="true"`;
  if (cell.underline) font += ` isUnderline="true"`;

  return (
    `<textField textAdjust="StretchHeight"><reportElement${attrs}/>` +
    cellBox(table, look, v) +
    `<textElement textAlignment="${xmlAttr(cell.align)}" verticalAlignment="${xmlAttr(cell.vAlign)}" markup="${v.cell.rich ? "html" : "none"}"><font${font}/></textElement>` +
    `<textFieldExpression>${cdata(javaString(v.cell.text))}</textFieldExpression></textField>`
  );
}

function frameOpen(
  rect: { x: number; y: number; width: number; height: number },
  uuid: string,
  extra = "",
  properties = "",
): string {
  const reportElement = `<reportElement x="${round(rect.x)}" y="${round(rect.y)}" width="${round(rect.width)}" height="${round(rect.height)}" uuid="${xmlAttr(uuid)}" positionType="Float"${extra}`;
  return `<frame>${properties ? `${reportElement}>${properties}</reportElement>` : `${reportElement}/>`}`;
}

// Rows tied together by cells merged down: [first, last] row of each block
function rowBlocks(table: CustomTableData, cells: VisibleCell[]): [number, number][] {
  const blocks: [number, number][] = [];
  let r = 0;
  while (r < table.rows.length) {
    let end = r;
    for (let i = r; i <= end; i++) {
      for (const v of cells) if (v.row === i) end = Math.max(end, v.row + v.rowSpan - 1);
    }
    blocks.push([r, end]);
    r = end + 1;
  }
  return blocks;
}

export function generateCustomTableXML(element: CustomTableElement): string {
  // Columns and rows fill the element's box (a copy: writing never changes the design)
  const sized: CustomTableElement = { ...element, table: cloneCustomTable(element.table) };
  fitTableToBox(sized);
  const table = sized.table;
  const tableId = element.uuid ?? crypto.randomUUID();
  const id = idMaker(tableId);
  const cells = visibleCells(table);
  const colX = table.columns.map((_, i) => table.columns.slice(0, i).reduce((a, b) => a + b, 0));
  const rowY = table.rows.map((_, i) => table.rows.slice(0, i).reduce((a, r) => a + r.height, 0));
  const width = table.columns.reduce((a, b) => a + b, 0);
  const spanWidth = (v: VisibleCell) => table.columns.slice(v.col, v.col + v.colSpan).reduce((a, b) => a + b, 0);
  const spanHeight = (v: VisibleCell) => table.rows.slice(v.row, v.row + v.rowSpan).reduce((a, r) => a + r.height, 0);
  const blocks = rowBlocks(table, cells);
  const look = customTableLook(table);

  // A top-level frame: the first carries the table, the others the marker
  const topFrame = (index: number, rect: { x: number; y: number; width: number; height: number }) => {
    const properties =
      index === 0
        ? `<property name="${CUSTOM_TABLE_PROPERTY}" value="${xmlAttr(serializeCustomTable(table))}"/>`
        : `<property name="${CUSTOM_TABLE_PART_PROPERTY}" value="${xmlAttr(tableId)}"/>`;
    return frameOpen(rect, index === 0 ? tableId : id(), "", properties);
  };

  // A row's single-row cells, inside its frame
  const rowCells = (r: number) => {
    let out = "";
    for (const v of cells) {
      if (v.row !== r || v.rowSpan > 1) continue;
      out += cellXml(v, { x: colX[v.col]!, y: 0, width: spanWidth(v), height: table.rows[r]!.height }, "ContainerHeight", "FixRelativeToTop", table, look, id);
    }
    return out;
  };

  const x = element.x;
  const y = element.y;
  let xml = "";
  blocks.forEach(([first, last], index) => {
    if (first === last) {
      xml += topFrame(index, { x, y: y + rowY[first]!, width, height: table.rows[first]!.height });
      xml += rowCells(first) + "</frame>";
      return;
    }
    const blockTop = rowY[first]!;
    const blockHeight = rowY[last]! + table.rows[last]!.height - blockTop;
    xml += topFrame(index, { x, y: y + blockTop, width, height: blockHeight });
    for (let r = first; r <= last; r++) {
      const rect = { x: 0, y: rowY[r]! - blockTop, width, height: table.rows[r]!.height };
      xml += frameOpen(rect, id(), r === last ? ` stretchType="ContainerBottom"` : "") + rowCells(r) + "</frame>";
    }
    // Merged-down cells, over the row frames
    for (const v of cells) {
      if (v.row < first || v.row > last || v.rowSpan === 1) continue;
      const reachesBottom = v.row + v.rowSpan - 1 === last;
      xml += cellXml(
        v,
        { x: colX[v.col]!, y: rowY[v.row]! - blockTop, width: spanWidth(v), height: spanHeight(v) },
        reachesBottom ? "ContainerBottom" : "NoStretch",
        v.row > first ? "Float" : "FixRelativeToTop",
        table,
        look,
        id,
      );
    }
    xml += "</frame>";
  });
  return xml;
}
