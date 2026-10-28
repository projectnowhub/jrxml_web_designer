// Data tables → JRXML. Everything here is derived from each table's
// TableDataBinding: its own <subDataset> (fields + total variables), the
// <jr:table> with one column per chosen source column, and the
// com.cdp.table.binding property the backend reads to fetch the rows.
// Rows themselves are never written; they are passed in by dataset name.

import i18n from "@/i18n";
import { cdata, xmlAttr } from "./xmlEscape";
import type { Band, DesignElement, ReportStyle, TableElement } from "@/types";
import type { TableColumnBinding, TableDataBinding } from "@/types/dataSource";
import { TABLE_BINDING_PROPERTY, serializeBinding } from "@/utils/table/dataBinding";
import {
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  lookAlignFor,
  cellExpression,
  cellPatternFor,
  fieldClassFor,
  hasTotalsRow,
  totalVariable,
} from "@/utils/table/dataTable";
import {
  buildLookStyles,
  resolveLook,
  tableStyleName,
  tableStylePrefix,
} from "@/utils/table/tableThemes";
import { collectBoundTables } from "@/utils/table/tableDocument";
import {
  columnCellStyle,
  columnPartStyle,
  columnPartStyleName,
  columnStyleName,
  needsColumnPartStyle,
  needsColumnStyle,
} from "@/utils/table/columnLook";
import { tableColumnBarcode, type TableBarcodeType } from "@/utils/barcode/barcodeTypes";
import { javaString } from "./javaString";

export { collectBoundTables };

const t = i18n.global.t;

const toInt = (n: unknown) => Math.round(Number(n) || 0);

// The same id every time a table is written (an unchanged report gives the
// same JRXML): worked out from the table's unique dataset name and the part's number
const fnv1a = (text: string, salt: number) => {
  let hash = 0x811c9dc5 ^ salt;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, "0");
};
function tablePartUuid(datasetName: string, part: number): string {
  const seed = `${datasetName}#${part}`;
  const hex = [1, 2, 3, 4].map((salt) => fnv1a(seed, salt)).join("");
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-` +
    `${((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  );
}
// The ids of one table's parts, in the order they are written
const tableUuids = (datasetName: string) => {
  let part = 0;
  return () => tablePartUuid(datasetName, part++);
};
type NextUuid = () => string;

// Yes / no fields as the canvas shows them (toTableCellValue)
const yesNoWords = () => ({ yes: t("dataTable.yes"), no: t("dataTable.no") });

// A Java string literal for a label typed by the user
// Typed text as a Java string (other writers import it from here)
export { javaString };

// The report styles every table needs: three per look (header, row, totals),
// written once per built-in or saved style and once per customised table; and
// a body cell style for each column with its own look or highlight rules
export function tableReportStyles(bands: Band[]): ReportStyle[] {
  const byPrefix = new Map<string, ReportStyle[]>();
  const columnStyles: ReportStyle[] = [];
  for (const table of collectBoundTables(bands)) {
    const prefix = tableStylePrefix(table.binding);
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, buildLookStyles(prefix, resolveLook(table.binding)));
    table.binding.columns.forEach((_, i) => {
      const headerStyle = columnPartStyle(table.binding, i, "header");
      if (headerStyle) columnStyles.push(headerStyle);
      const style = columnCellStyle(table.binding, i);
      if (style) columnStyles.push(style);
      const totalStyle = columnPartStyle(table.binding, i, "totals");
      if (totalStyle) columnStyles.push(totalStyle);
    });
  }
  return [...[...byPrefix.values()].flat(), ...columnStyles];
}

// One <subDataset> per bound table
export function generateTableDatasetsXML(bands: Band[]): string {
  return collectBoundTables(bands)
    .map(({ binding }) => {
      let xml = `<subDataset name="${xmlAttr(binding.datasetName)}" uuid="${xmlAttr(tablePartUuid(binding.datasetName, -1))}">`;
      binding.columns.forEach((col) => {
        xml += `<field name="${xmlAttr(col.key)}" class="${fieldClassFor(col.type)}"/>`;
      });
      if (hasTotalsRow(binding)) {
        binding.columns.forEach((col, i) => {
          const v = totalVariable(col, i);
          if (!v) return;
          xml += `<variable name="${v.name}" class="${v.className}" calculation="${v.calculation}">`;
          xml += `<variableExpression>${cdata(v.expression)}</variableExpression></variable>`;
        });
      }
      return xml + "</subDataset>";
    })
    .join("");
}

function textFieldXML(options: {
  uuid: NextUuid;
  width: number;
  height: number;
  style: string;
  expression: string;
  alignment: string;
  pattern?: string;
  stretch?: boolean;
}): string {
  const attrs = [
    options.stretch ? ' textAdjust="StretchHeight"' : "",
    options.pattern ? ` pattern="${xmlAttr(options.pattern)}"` : "",
    ' isBlankWhenNull="true"',
  ].join("");
  return (
    `<textField${attrs}>` +
    `<reportElement x="0" y="0" width="${options.width}" height="${options.height}" uuid="${xmlAttr(options.uuid())}" style="${xmlAttr(options.style)}"/>` +
    `<textElement textAlignment="${options.alignment}" verticalAlignment="Middle"/>` +
    `<textFieldExpression>${cdata(options.expression)}</textFieldExpression>` +
    `</textField>`
  );
}

// A barcode column's cell: the row's value as a barcode, nothing when empty
// (barcode4j fails on an empty value). A frame with the row's style draws the
// background, stripes and lines (a barcode with no value prints nothing).
// No size is written: values differ per row, so JasperReports draws each at
// its natural width, shrunk to fit.
function barcodeCellXML(
  uuid: NextUuid,
  type: TableBarcodeType,
  col: TableColumnBinding,
  width: number,
  height: number,
  style: string,
): string {
  const f = `$F{${col.key}}`;
  const text = `String.valueOf(${f}).trim()`;
  // Code 128 holds plain characters only (Java source: "[^\\x20-\\x7E]")
  const value = type === "Code128" ? `${text}.replaceAll("[^\\\\x20-\\\\x7E]", "?")` : text;
  const shape = type === "DataMatrix" ? ' shape="force-square"' : "";
  return (
    `<frame>` +
    `<reportElement x="0" y="0" width="${width}" height="${height}" uuid="${xmlAttr(uuid())}" style="${xmlAttr(style)}"/>` +
    `<componentElement>` +
    `<reportElement x="0" y="0" width="${Math.max(1, width - 2 * CELL_SIDE_PADDING)}" height="${height}" uuid="${xmlAttr(uuid())}" mode="Transparent"/>` +
    `<c:${type} xmlns:c="http://jasperreports.sourceforge.net/jasperreports/components"${shape}>` +
    `<c:codeExpression>${cdata(`${f} == null || ${text}.isEmpty() ? null : ${value}`)}</c:codeExpression>` +
    `</c:${type}>` +
    `</componentElement>` +
    `</frame>`
  );
}

// The row style's padding left and right (tableThemes): a frame's items are
// placed inside it, so the barcode gets the width left over
const CELL_SIDE_PADDING = 4;

function columnXML(
  uuid: NextUuid,
  col: TableColumnBinding,
  index: number,
  binding: TableDataBinding,
  headerHeight: number,
  rowHeight: number,
): string {
  const width = toInt(col.width);
  const style = (part: "header" | "row" | "totals") => tableStyleName(tableStylePrefix(binding), part);
  const headerStyle = needsColumnPartStyle(binding, col, "header") ? columnPartStyleName(binding, index, "header") : style("header");
  const bodyStyle = needsColumnStyle(binding, col) ? columnStyleName(binding, index) : style("row");
  const totalsStyle = needsColumnPartStyle(binding, col, "totals") ? columnPartStyleName(binding, index, "totals") : style("totals");
  // The column's own look, else the whole table's (lookAlignFor)
  const look = resolveLook(binding);
  const alignment = col.look?.align ?? lookAlignFor(look, "row", col);
  let xml = `<jr:column width="${width}" uuid="${xmlAttr(uuid())}">`;

  xml += `<jr:columnHeader height="${headerHeight}" rowSpan="1">`;
  xml += textFieldXML({
    uuid,
    width,
    height: headerHeight,
    style: headerStyle,
    expression: javaString(col.label),
    alignment: col.look?.header?.align ?? lookAlignFor(look, "header", col),
    stretch: true,
  });
  xml += `</jr:columnHeader>`;

  if (hasTotalsRow(binding)) {
    const total = totalVariable(col, index);
    xml += `<jr:columnFooter height="${rowHeight}" rowSpan="1">`;
    xml += textFieldXML({
      uuid,
      width,
      height: rowHeight,
      style: totalsStyle,
      expression: total ? `$V{${total.name}}` : index === 0 ? javaString(t("dataTable.totals.label")) : '""',
      alignment: col.look?.total?.align ?? lookAlignFor(look, "totals", col),
      pattern: total ? (col.total === "count" ? "#,##0" : cellPatternFor(col.type) ?? "#,##0.##") : undefined,
    });
    xml += `</jr:columnFooter>`;
  }

  xml += `<jr:detailCell height="${rowHeight}">`;
  const barcode = tableColumnBarcode(col);
  xml += barcode
    ? barcodeCellXML(uuid, barcode, col, width, rowHeight, bodyStyle)
    : textFieldXML({
        uuid,
        width,
        height: rowHeight,
        style: bodyStyle,
        expression: cellExpression(col, yesNoWords()),
        alignment,
        pattern: cellPatternFor(col.type),
        stretch: true,
      });
  xml += `</jr:detailCell>`;

  return xml + `</jr:column>`;
}

// The table itself; `reportElementAttrs` are the usual x/y/size/uuid attributes
export function generateTableXML(table: TableElement, reportElementAttrs: string): string {
  const { binding } = table;
  const headerHeight = toInt(table.headerHeight ?? TABLE_HEADER_HEIGHT);
  const rowHeight = toInt(table.rowHeight ?? TABLE_ROW_HEIGHT);

  // A table nobody has dropped data on prints nothing
  if (!binding || binding.columns.length === 0) {
    return `<frame><reportElement${reportElementAttrs}><property name="${TABLE_BINDING_PROPERTY}" value=""/></reportElement></frame>`;
  }

  let xml = `<componentElement><reportElement${reportElementAttrs}>`;
  xml += `<property name="${TABLE_BINDING_PROPERTY}" value="${xmlAttr(serializeBinding(binding))}"/>`;
  xml += `</reportElement>`;
  xml +=
    `<jr:table xmlns:jr="http://jasperreports.sourceforge.net/jasperreports/components" ` +
    `xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports/components http://jasperreports.sourceforge.net/xsd/components.xsd" ` +
    `whenNoDataType="NoDataCell">`;
  const uuid = tableUuids(binding.datasetName);
  xml += `<datasetRun subDataset="${xmlAttr(binding.datasetName)}" uuid="${xmlAttr(uuid())}">`;
  xml += `<connectionExpression>${cdata("$P{REPORT_CONNECTION}")}</connectionExpression>`;
  xml += `</datasetRun>`;
  binding.columns.forEach((col, i) => {
    xml += columnXML(uuid, col, i, binding, headerHeight, rowHeight);
  });
  // Shown instead of the table when the filters match nothing
  xml += `<jr:noData height="${rowHeight}">`;
  xml += textFieldXML({
    uuid,
    width: toInt(table.width),
    height: rowHeight,
    style: tableStyleName(tableStylePrefix(binding), "row"),
    expression: javaString(t("dataTable.noRows")),
    alignment: "Center",
  });
  xml += `</jr:noData>`;
  return xml + `</jr:table></componentElement>`;
}

// Items placed below a table in the same section (other tables too) move
// down when it grows
export function floatsBelowTable(element: DesignElement, siblings: DesignElement[]): boolean {
  return siblings.some(
    (other) =>
      other !== element &&
      (other.type === "table" || other.type === "customTable") &&
      (other as any).pageIndex === (element as any).pageIndex &&
      element.y >= other.y + other.height,
  );
}
