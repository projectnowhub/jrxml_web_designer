// Table styles. A table's look is a TableLook: one of the built-in styles
// (fixed, can't be changed), a style the user saved in the report, or changes
// made for that table only. Each table carries its look in its binding, so the
// canvas, the preview and the JRXML need nothing else. In the JRXML a look is
// written as three report styles (header, row with striped rows, totals),
// which the user never edits directly.

import type { ReportStyle } from "@/types";
import type { SavedTableStyle, TableDataBinding, TableLook, TableTheme } from "@/types/dataSource";

export type TableStylePart = "header" | "row" | "totals";

export const TABLE_THEMES: TableTheme[] = ["corporateBlue", "minimal", "emerald"];

export const BUILTIN_LOOKS: Record<TableTheme, TableLook> = {
  corporateBlue: {
    headerBackground: "#1E3A8A",
    headerText: "#FFFFFF",
    headerBold: true,
    rowBackground: "#FFFFFF",
    rowText: "#1F2937",
    stripe: "#F1F5F9",
    totalsBackground: "#E0E7FF",
    totalsText: "#1E3A8A",
    totalsBold: true,
    lines: "grid",
    lineColor: "#E2E8F0",
    ruleColor: "#1E3A8A",
    fontSize: 9,
  },
  minimal: {
    headerBackground: "#F3F4F6",
    headerText: "#111827",
    headerBold: true,
    rowBackground: "#FFFFFF",
    rowText: "#374151",
    stripe: null,
    totalsBackground: "#FFFFFF",
    totalsText: "#111827",
    totalsBold: true,
    lines: "rows",
    lineColor: "#E5E7EB",
    ruleColor: "#9CA3AF",
    fontSize: 9,
  },
  emerald: {
    headerBackground: "#047857",
    headerText: "#FFFFFF",
    headerBold: true,
    rowBackground: "#FFFFFF",
    rowText: "#1F2937",
    stripe: "#ECFDF5",
    totalsBackground: "#D1FAE5",
    totalsText: "#065F46",
    totalsBold: true,
    lines: "grid",
    lineColor: "#A7F3D0",
    ruleColor: "#047857",
    fontSize: 9,
  },
};

const BUILTIN_PREFIX: Record<TableTheme, string> = {
  corporateBlue: "Table_CorporateBlue",
  minimal: "Table_Minimal",
  emerald: "Table_Emerald",
};

export const isBuiltinTheme = (id: string): id is TableTheme =>
  (TABLE_THEMES as string[]).includes(id);

const COLOR = /^#[0-9a-fA-F]{6}$/;
const color = (value: unknown, fallback: string) =>
  typeof value === "string" && COLOR.test(value) ? value.toUpperCase() : fallback;

// A look read from a saved report, with anything missing or invalid replaced
export function normalizeLook(raw: Partial<TableLook>): TableLook {
  const base = BUILTIN_LOOKS.corporateBlue;
  return {
    headerBackground: color(raw.headerBackground, base.headerBackground),
    headerText: color(raw.headerText, base.headerText),
    headerBold: raw.headerBold !== false,
    rowBackground: color(raw.rowBackground, base.rowBackground),
    rowText: color(raw.rowText, base.rowText),
    stripe: raw.stripe === null ? null : color(raw.stripe, base.stripe!),
    totalsBackground: color(raw.totalsBackground, base.totalsBackground),
    totalsText: color(raw.totalsText, base.totalsText),
    totalsBold: raw.totalsBold !== false,
    lines: raw.lines === "rows" || raw.lines === "none" ? raw.lines : "grid",
    lineColor: color(raw.lineColor, base.lineColor),
    ruleColor: color(raw.ruleColor, base.ruleColor),
    fontSize:
      typeof raw.fontSize === "number" && raw.fontSize >= 6 && raw.fontSize <= 24
        ? Math.round(raw.fontSize)
        : base.fontSize,
  };
}

// What a table looks like now
export function resolveLook(binding: Pick<TableDataBinding, "theme" | "look"> | undefined): TableLook {
  if (binding?.look) return binding.look;
  const theme = binding?.theme;
  return BUILTIN_LOOKS[theme && isBuiltinTheme(theme) ? theme : "corporateBlue"];
}

// Name prefix of the report styles a table uses: shared by every table on the
// same built-in or saved style, the table's own for one-off changes
export function tableStylePrefix(binding: TableDataBinding): string {
  if (binding.customized) return `Table_${binding.datasetName}`;
  if (isBuiltinTheme(binding.theme)) return BUILTIN_PREFIX[binding.theme];
  return `TableStyle_${binding.theme}`;
}

const PART_SUFFIX: Record<TableStylePart, string> = {
  header: "Header",
  row: "Row",
  totals: "Totals",
};

export const tableStyleName = (prefix: string, part: TableStylePart) =>
  `${prefix}_${PART_SUFFIX[part]}`;

// Every second row; REPORT_COUNT inside a table counts that table's rows
export const STRIPE_CONDITION = "new Boolean($V{REPORT_COUNT}.intValue() % 2 == 0)";

const CELL_PADDING = { leftPadding: 4, rightPadding: 4 };
const THIN = 0.5;
const RULE = 1;
const pen = (lineWidth: number, lineColor: string) => ({ lineWidth, lineStyle: "Solid", lineColor });

// Borders of one part, as JasperReports pens
function partBox(look: TableLook, part: TableStylePart): NonNullable<ReportStyle["box"]> {
  const box: NonNullable<ReportStyle["box"]> = { ...CELL_PADDING };
  if (look.lines === "grid") box.pen = pen(THIN, look.lineColor);
  if (look.lines === "rows" && part === "row") box.bottomPen = pen(THIN, look.lineColor);
  if (look.lines !== "none") {
    if (part === "header") box.bottomPen = pen(RULE, look.ruleColor);
    if (part === "totals") box.topPen = pen(RULE, look.ruleColor);
  }
  return box;
}

// The three report styles a look is written as
export function buildLookStyles(prefix: string, look: TableLook): ReportStyle[] {
  const font = { fontSize: look.fontSize, verticalAlignment: "Middle" };
  const header: ReportStyle = {
    name: tableStyleName(prefix, "header"),
    mode: "Opaque",
    backcolor: look.headerBackground,
    forecolor: look.headerText,
    isBold: look.headerBold,
    ...font,
    box: partBox(look, "header"),
  };
  const row: ReportStyle = {
    name: tableStyleName(prefix, "row"),
    mode: "Opaque",
    backcolor: look.rowBackground,
    forecolor: look.rowText,
    ...font,
    box: partBox(look, "row"),
  };
  if (look.stripe) {
    row.conditionalStyles = [
      { conditionExpression: STRIPE_CONDITION, properties: { mode: "Opaque", backcolor: look.stripe } },
    ];
  }
  const totals: ReportStyle = {
    name: tableStyleName(prefix, "totals"),
    mode: "Opaque",
    backcolor: look.totalsBackground,
    forecolor: look.totalsText,
    isBold: look.totalsBold,
    ...font,
    box: partBox(look, "totals"),
  };
  return [header, row, totals];
}

// The three parts of a look as report styles, for drawing cells
export function lookPartStyles(look: TableLook): Record<TableStylePart, ReportStyle> {
  const [header, row, totals] = buildLookStyles("Preview", look);
  return { header: header!, row: row!, totals: totals! };
}

// Colours shown on a style tile
export function lookSwatch(look: TableLook): { header: string; row: string; stripe: string } {
  return { header: look.headerBackground, row: look.rowBackground, stripe: look.stripe ?? look.rowBackground };
}

// ── Saved table styles ──────────────────────────────────────────────────────

// Report-level JRXML property holding the saved table styles (JSON)
export const SAVED_TABLE_STYLES_PROPERTY = "com.cdp.tableStyles";

export function createTableStyleId(existing: SavedTableStyle[]): string {
  const used = new Set(existing.map((s) => s.id));
  let id: string;
  do {
    id = `s${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  } while (used.has(id));
  return id;
}

export function parseSavedTableStyles(json: string | null | undefined): SavedTableStyle[] {
  if (!json) return [];
  try {
    const list = JSON.parse(json);
    if (!Array.isArray(list)) return [];
    return list
      .filter((s) => s && typeof s.id === "string" && /^[A-Za-z0-9_]+$/.test(s.id) && typeof s.name === "string")
      .map((s) => ({ id: s.id, name: s.name, look: normalizeLook(s.look ?? {}) }));
  } catch {
    return [];
  }
}

const sameLook = (a: TableLook, b: TableLook) => JSON.stringify(a) === JSON.stringify(b);
export { sameLook };

// ── Cell CSS (canvas, Configure popup, preview) ─────────────────────────────

const penCss = (p?: { lineWidth?: number; lineStyle?: string; lineColor?: string }) => {
  if (!p || p.lineWidth === undefined) return undefined;
  if (p.lineWidth <= 0) return "none";
  const style = p.lineStyle === "Dashed" ? "dashed" : p.lineStyle === "Dotted" ? "dotted" : "solid";
  return `${p.lineWidth}px ${style} ${p.lineColor || "#000000"}`;
};

// CSS for a table cell drawn with a report style
export function tableCellCss(style: ReportStyle, striped = false): Record<string, string> {
  const css: Record<string, string> = {};
  const stripe = striped ? style.conditionalStyles?.[0]?.properties?.backcolor : undefined;
  const background = stripe || (style.mode !== "Transparent" ? style.backcolor : undefined);
  if (background) css.backgroundColor = background;
  if (style.forecolor) css.color = style.forecolor;
  if (style.fontSize) css.fontSize = `${style.fontSize}px`;
  if (style.isBold) css.fontWeight = "700";
  if (style.isItalic) css.fontStyle = "italic";
  const box = style.box;
  if (box) {
    const all = penCss(box.pen);
    for (const side of ["top", "left", "bottom", "right"] as const) {
      const value = penCss(box[`${side}Pen`]) ?? all;
      if (value) css[`border${side.charAt(0).toUpperCase()}${side.slice(1)}`] = value;
    }
    const pad = (n?: number) => (n !== undefined ? `${n}px` : undefined);
    const left = pad(box.leftPadding ?? box.padding);
    const right = pad(box.rightPadding ?? box.padding);
    if (left) css.paddingLeft = left;
    if (right) css.paddingRight = right;
  }
  return css;
}
