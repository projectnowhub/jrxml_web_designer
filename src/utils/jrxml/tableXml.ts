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
  cellAlignmentFor,
  cellExpression,
  cellPatternFor,
  fieldClassFor,
  hasTotalsRow,
  totalVariable,
} from "@/utils/table/dataTable";
import { ensureThemeStyles, tableStyleName } from "@/utils/table/tableThemes";
import { collectBoundTables } from "@/utils/table/tableDocument";

export { collectBoundTables };

const t = i18n.global.t;

const toInt = (n: unknown) => Math.round(Number(n) || 0);

// A Java string literal for a label typed by the user
export const javaString = (text: string) =>
  `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;

// The report's styles plus any theme styles a table needs but the report lacks
export function withTableThemeStyles(styles: ReportStyle[], bands: Band[]): ReportStyle[] {
  return collectBoundTables(bands).reduce(
    (all, table) => ensureThemeStyles(all, table.binding.theme),
    styles,
  );
}

// One <subDataset> per bound table
export function generateTableDatasetsXML(bands: Band[]): string {
  return collectBoundTables(bands)
    .map(({ binding }) => {
      let xml = `<subDataset name="${xmlAttr(binding.datasetName)}" uuid="${crypto.randomUUID()}">`;
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
    options.pattern ? ` pattern="${options.pattern}"` : "",
    ' isBlankWhenNull="true"',
  ].join("");
  return (
    `<textField${attrs}>` +
    `<reportElement x="0" y="0" width="${options.width}" height="${options.height}" uuid="${crypto.randomUUID()}" style="${options.style}"/>` +
    `<textElement textAlignment="${options.alignment}" verticalAlignment="Middle"/>` +
    `<textFieldExpression>${cdata(options.expression)}</textFieldExpression>` +
    `</textField>`
  );
}

function columnXML(
  col: TableColumnBinding,
  index: number,
  binding: TableDataBinding,
  headerHeight: number,
  rowHeight: number,
): string {
  const width = toInt(col.width);
  const style = (part: "header" | "row" | "totals") => tableStyleName(binding.theme, part);
  const alignment = cellAlignmentFor(col.type);
  let xml = `<jr:column width="${width}" uuid="${crypto.randomUUID()}">`;

  xml += `<jr:columnHeader height="${headerHeight}" rowSpan="1">`;
  xml += textFieldXML({
    width,
    height: headerHeight,
    style: style("header"),
    expression: javaString(col.label),
    alignment: "Left",
    stretch: true,
  });
  xml += `</jr:columnHeader>`;

  if (hasTotalsRow(binding)) {
    const total = totalVariable(col, index);
    xml += `<jr:columnFooter height="${rowHeight}" rowSpan="1">`;
    xml += textFieldXML({
      width,
      height: rowHeight,
      style: style("totals"),
      expression: total ? `$V{${total.name}}` : index === 0 ? javaString(t("dataTable.totals.label")) : '""',
      alignment: total ? "Right" : "Left",
      pattern: total ? (col.total === "count" ? "#,##0" : cellPatternFor(col.type) ?? "#,##0.##") : undefined,
    });
    xml += `</jr:columnFooter>`;
  }

  xml += `<jr:detailCell height="${rowHeight}">`;
  xml += textFieldXML({
    width,
    height: rowHeight,
    style: style("row"),
    expression: cellExpression(col),
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
  xml += `<datasetRun subDataset="${xmlAttr(binding.datasetName)}" uuid="${crypto.randomUUID()}">`;
  xml += `<connectionExpression>${cdata("$P{REPORT_CONNECTION}")}</connectionExpression>`;
  xml += `</datasetRun>`;
  binding.columns.forEach((col, i) => {
    xml += columnXML(col, i, binding, headerHeight, rowHeight);
  });
  // Shown instead of the table when the filters match nothing
  xml += `<jr:noData height="${rowHeight}">`;
  xml += textFieldXML({
    width: toInt(table.width),
    height: rowHeight,
    style: tableStyleName(binding.theme, "row"),
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
      other.type === "table" &&
      (other as any).pageIndex === (element as any).pageIndex &&
      element.y >= other.y + other.height,
  );
}
