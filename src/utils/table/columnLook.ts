// Data tables: a column's own look and the highlight rules ("colour the row
// when Status is Delayed", "colour the cell when Stock is below 100"), worked
// out the same way for the canvas (on the sample rows), and for the JRXML (a
// cell style per column with the rules as conditional styles).
//
// No browser or Vue here (like dataBinding / tableThemes).

import type { ReportStyle } from "@/types";
import type { DataRow, TableColumnBinding, TableColumnLook, TableColumnPartLook, TableDataBinding, TableHighlight } from "@/types/dataSource";
import { buildLookStyles, resolveLook, tableStylePrefix } from "./tableThemes";
import { javaString } from "@/utils/jrxml/javaString";

const text = (value: unknown) => (value == null ? "" : String(value).trim());
const num = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

// A date as yyyy-mm-dd (ISO text, or the start of a longer ISO value)
const isoDay = (value: unknown) => text(value).slice(0, 10);

export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// The rules that can still work: their column is one the table prints (only
// those reach the report) and they say what to change
export function activeHighlights(binding: TableDataBinding): TableHighlight[] {
  const keys = new Set(binding.columns.map((c) => c.key));
  return (binding.highlights ?? []).filter((r) => keys.has(r.column) && (r.fill || r.color || r.bold));
}

// Whether a row matches a rule (the canvas; the report uses ruleCondition)
export function ruleMatches(rule: TableHighlight, col: TableColumnBinding | undefined, row: DataRow, today = todayIso()): boolean {
  const value = row[rule.column];
  if (rule.operator === "in") {
    const wanted = (rule.values ?? []).map((v) => v.trim().toLowerCase());
    return wanted.length > 0 && wanted.includes(text(value).toLowerCase());
  }
  if (value == null || text(value) === "") return false;
  if (rule.operator === "past") return isoDay(value) < today;
  if (rule.operator === "future") return isoDay(value) > today;
  // between
  if (col?.type === "date") {
    const day = isoDay(value);
    return (!rule.from || day >= rule.from) && (!rule.to || day <= rule.to);
  }
  const n = num(value);
  if (n === null) return false;
  const from = rule.from ? num(rule.from) : null;
  const to = rule.to ? num(rule.to) : null;
  return (from === null || n >= from) && (to === null || n <= to);
}

// A Java string literal on one line
const javaText = (s: string) => javaString(s, " ");

// The rule as a JasperReports expression on the table's dataset (fields are
// typed loosely: numbers as java.lang.Number, the rest as Object)
export function ruleCondition(rule: TableHighlight, col: TableColumnBinding | undefined): string {
  const f = `$F{${rule.column}}`;
  const asText = `String.valueOf(${f}).trim()`;
  const day = `(${asText}.length() >= 10 ? ${asText}.substring(0, 10) : ${asText})`;
  if (rule.operator === "in") {
    const values = (rule.values ?? []).map((v) => javaText(v.trim().toLowerCase())).join(", ");
    return values ? `${f} != null && java.util.Arrays.asList(${values}).contains(${asText}.toLowerCase())` : "false";
  }
  const today = "java.time.LocalDate.now().toString()";
  if (rule.operator === "past") return `${f} != null && ${day}.compareTo(${today}) < 0`;
  if (rule.operator === "future") return `${f} != null && ${day}.compareTo(${today}) > 0`;
  const parts = [`${f} != null`];
  if (col?.type === "date") {
    if (rule.from) parts.push(`${day}.compareTo(${javaText(rule.from)}) >= 0`);
    if (rule.to) parts.push(`${day}.compareTo(${javaText(rule.to)}) <= 0`);
  } else {
    const n = `((Number) ${f}).doubleValue()`;
    const from = rule.from ? num(rule.from) : null;
    const to = rule.to ? num(rule.to) : null;
    parts.push(`${f} instanceof Number`);
    if (from !== null) parts.push(`${n} >= ${from}`);
    if (to !== null) parts.push(`${n} <= ${to}`);
  }
  return parts.join(" && ");
}

// The rules that colour this column's cells: every row rule, and the cell
// rules on this column
export const rulesForColumn = (binding: TableDataBinding, col: TableColumnBinding) =>
  activeHighlights(binding).filter((r) => r.scope === "row" || r.column === col.key);

// What a body cell shows over the table style (the canvas): the column's
// look, then every rule that matches, combined as JasperReports combines
// conditional styles: each of fill / text colour / bold comes from the
// highest matching rule that sets it
export function cellLook(binding: TableDataBinding, col: TableColumnBinding, row: DataRow | null, today = todayIso()): TableColumnLook {
  const look: TableColumnLook = { ...(col.look ?? {}) };
  if (!row) return look;
  const byKey = new Map(binding.columns.map((c) => [c.key, c]));
  const matches = rulesForColumn(binding, col).filter((r) => ruleMatches(r, byKey.get(r.column), row, today));
  for (const rule of matches.reverse()) {
    if (rule.fill) look.fill = rule.fill;
    if (rule.color) look.color = rule.color;
    if (rule.bold) look.bold = true;
  }
  return look;
}

// A column part's own look as CSS over the table style's cell (canvas and
// previews; the alignment is left to the caller: flex or text-align)
export function partLookCss(look: TableColumnPartLook | undefined): Record<string, string> {
  const css: Record<string, string> = {};
  if (!look) return css;
  if (look.fill) css.background = look.fill;
  if (look.color) css.color = look.color;
  if (look.bold !== undefined) css.fontWeight = look.bold ? "700" : "400";
  if (look.italic !== undefined) css.fontStyle = look.italic ? "italic" : "normal";
  if (look.underline !== undefined) css.textDecoration = look.underline ? "underline" : "none";
  if (look.fontSize) css.fontSize = `${look.fontSize}px`;
  return css;
}

// The look of a column's header / body / total cell (body: with the matching
// highlight rules on this row)
export function columnPartLook(
  binding: Pick<TableDataBinding, "columns" | "highlights">,
  col: TableColumnBinding,
  part: "header" | "row" | "totals",
  row: DataRow | null = null,
): TableColumnPartLook | undefined {
  if (part === "header") return col.look?.header;
  if (part === "totals") return col.look?.total;
  return cellLook(binding as TableDataBinding, col, row);
}

export const hasPartLook = (look?: TableColumnPartLook) =>
  !!look && !!(look.fill || look.color || look.bold !== undefined || look.italic !== undefined || look.underline !== undefined || look.align || look.fontSize);

export const hasLook = (look?: TableColumnLook) =>
  !!look && (hasPartLook(look) || hasPartLook(look.header) || hasPartLook(look.total));

// The style name of a column's body cells, when it needs its own
export const columnStyleName = (binding: TableDataBinding, index: number) => `Table_${binding.datasetName}_col${index}`;

export const columnPartStyleName = (binding: TableDataBinding, index: number, part: "header" | "row" | "totals") =>
  `Table_${binding.datasetName}_col${index}_${part}`;

export function needsColumnStyle(binding: TableDataBinding, col: TableColumnBinding): boolean {
  return hasPartLook(col.look) || rulesForColumn(binding, col).length > 0;
}

export function needsColumnPartStyle(binding: TableDataBinding, col: TableColumnBinding, part: "header" | "totals"): boolean {
  const pLook = part === "header" ? col.look?.header : col.look?.total;
  return hasPartLook(pLook);
}

export function columnPartStyle(binding: TableDataBinding, index: number, part: "header" | "totals"): ReportStyle | null {
  const col = binding.columns[index];
  if (!col || !needsColumnPartStyle(binding, col, part)) return null;
  const baseStyle = buildLookStyles(tableStylePrefix(binding), resolveLook(binding))[part === "header" ? 0 : 2]!;
  const pLook = (part === "header" ? col.look?.header : col.look?.total) ?? {};
  const style: ReportStyle = { ...baseStyle, name: columnPartStyleName(binding, index, part) };
  if (pLook.fill) style.backcolor = pLook.fill;
  if (pLook.color) style.forecolor = pLook.color;
  if (pLook.bold !== undefined) style.isBold = pLook.bold;
  if (pLook.italic !== undefined) style.isItalic = pLook.italic;
  if (pLook.underline !== undefined) style.isUnderline = pLook.underline;
  if (pLook.fontSize) style.fontSize = pLook.fontSize;
  if (pLook.align) style.textAlignment = pLook.align;
  return style;
}

// A column's body cell style: the table's row style with the column's look
// over it, then the rules as conditional styles, before the row colours.
// JasperReports gives the earlier conditional style the last word (it applies
// them from the last to the first: JRFillElementContainer.evaluateConditionalStyle),
// so the rules are written in their own order (the first rule wins) and win
// over the row colours. A column fill replaces the row colours.
export function columnCellStyle(binding: TableDataBinding, index: number): ReportStyle | null {
  const col = binding.columns[index];
  if (!col || !needsColumnStyle(binding, col)) return null;
  const row = buildLookStyles(tableStylePrefix(binding), resolveLook(binding))[1]!;
  const style: ReportStyle = { ...row, name: columnStyleName(binding, index) };
  const look = col.look ?? {};
  if (look.fill) {
    style.backcolor = look.fill;
    delete style.conditionalStyles;
  }
  if (look.color) style.forecolor = look.color;
  if (look.bold !== undefined) style.isBold = look.bold;
  if (look.italic !== undefined) style.isItalic = look.italic;
  if (look.underline !== undefined) style.isUnderline = look.underline;
  if (look.fontSize) style.fontSize = look.fontSize;
  if (look.align) style.textAlignment = look.align;
  const byKey = new Map(binding.columns.map((c) => [c.key, c]));
  const rules = rulesForColumn(binding, col).map((rule) => ({
    conditionExpression: ruleCondition(rule, byKey.get(rule.column)),
    properties: {
      ...(rule.fill ? { mode: "Opaque", backcolor: rule.fill } : {}),
      ...(rule.color ? { forecolor: rule.color } : {}),
      ...(rule.bold ? { isBold: true } : {}),
    },
  }));
  if (rules.length) style.conditionalStyles = [...rules, ...(style.conditionalStyles ?? [])];
  return style;
}

export function newHighlightId(): string {
  return `h${Math.random().toString(36).slice(2, 10)}`;
}
