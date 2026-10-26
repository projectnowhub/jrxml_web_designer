// Table styles. A table's look is a TableLook: one of the built-in styles
// (fixed, can't be changed), a style the user saved in the report, or changes
// made for that table only. Each table carries its look in its binding, so the
// canvas, the preview and the JRXML need nothing else. In the JRXML a look is
// written as three report styles (header, row with striped rows, totals),
// which the user never edits directly.

import type { ReportStyle } from "@/types";
import type { SavedTableStyle, TableDataBinding, TableLook, TableTheme } from "@/types/dataSource";

export type TableStylePart = "header" | "row" | "totals";

export const TABLE_THEMES: TableTheme[] = ["none", "corporateBlue", "minimal", "emerald", "slate", "burgundy", "teal", "gold", "violet"];

export const BUILTIN_LOOKS: Record<TableTheme, TableLook> = {
  // No colours, nothing bold: only thin black lines
  none: {
    headerBackground: "#FFFFFF",
    headerText: "#000000",
    headerBold: false,
    rowColors: ["#FFFFFF"],
    rowText: "#000000",
    totalsBackground: "#FFFFFF",
    totalsText: "#000000",
    totalsBold: false,
    lines: "grid",
    lineColor: "#000000",
    ruleColor: "#000000",
    fontSize: 9,
  },
  corporateBlue: {
    headerBackground: "#1E3A8A",
    headerText: "#FFFFFF",
    headerBold: true,
    rowColors: ["#FFFFFF", "#F1F5F9"],
    rowText: "#1F2937",
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
    rowColors: ["#FFFFFF"],
    rowText: "#374151",
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
    rowColors: ["#FFFFFF", "#ECFDF5"],
    rowText: "#1F2937",
    totalsBackground: "#D1FAE5",
    totalsText: "#065F46",
    totalsBold: true,
    lines: "grid",
    lineColor: "#A7F3D0",
    ruleColor: "#047857",
    fontSize: 9,
  },
  // Charcoal heading, a line under each row
  slate: {
    headerBackground: "#334155",
    headerText: "#FFFFFF",
    headerBold: true,
    rowColors: ["#FFFFFF"],
    rowText: "#1E293B",
    totalsBackground: "#F1F5F9",
    totalsText: "#0F172A",
    totalsBold: true,
    lines: "rows",
    lineColor: "#CBD5E1",
    ruleColor: "#334155",
    fontSize: 9,
  },
  // Deep red heading, soft rose stripes
  burgundy: {
    headerBackground: "#7F1D1D",
    headerText: "#FFFFFF",
    headerBold: true,
    rowColors: ["#FFFFFF", "#FEF2F2"],
    rowText: "#1F2937",
    totalsBackground: "#FEE2E2",
    totalsText: "#7F1D1D",
    totalsBold: true,
    lines: "grid",
    lineColor: "#FECACA",
    ruleColor: "#7F1D1D",
    fontSize: 9,
  },
  // Teal heading, light aqua stripes
  teal: {
    headerBackground: "#0F766E",
    headerText: "#FFFFFF",
    headerBold: true,
    rowColors: ["#FFFFFF", "#F0FDFA"],
    rowText: "#1F2937",
    totalsBackground: "#CCFBF1",
    totalsText: "#115E59",
    totalsBold: true,
    lines: "grid",
    lineColor: "#99F6E4",
    ruleColor: "#0F766E",
    fontSize: 9,
  },
  // Warm gold heading, cream stripes
  gold: {
    headerBackground: "#B45309",
    headerText: "#FFFFFF",
    headerBold: true,
    rowColors: ["#FFFFFF", "#FFFBEB"],
    rowText: "#292524",
    totalsBackground: "#FEF3C7",
    totalsText: "#78350F",
    totalsBold: true,
    lines: "grid",
    lineColor: "#FDE68A",
    ruleColor: "#B45309",
    fontSize: 9,
  },
  // The app's purple, lavender stripes, lines under rows
  violet: {
    headerBackground: "#6440F4",
    headerText: "#FFFFFF",
    headerBold: true,
    rowColors: ["#FFFFFF", "#F5F3FF"],
    rowText: "#1F2937",
    totalsBackground: "#EDE9FE",
    totalsText: "#4C1D95",
    totalsBold: true,
    lines: "rows",
    lineColor: "#DDD6FE",
    ruleColor: "#6440F4",
    fontSize: 9,
  },
};

const BUILTIN_PREFIX: Record<TableTheme, string> = {
  none: "Table_None",
  corporateBlue: "Table_CorporateBlue",
  minimal: "Table_Minimal",
  emerald: "Table_Emerald",
  slate: "Table_Slate",
  burgundy: "Table_Burgundy",
  teal: "Table_Teal",
  gold: "Table_Gold",
  violet: "Table_Violet",
};

export const isBuiltinTheme = (id: string): id is TableTheme =>
  (TABLE_THEMES as string[]).includes(id);

const COLOR = /^#[0-9a-fA-F]{6}$/;
const color = (value: unknown, fallback: string) =>
  typeof value === "string" && COLOR.test(value) ? value.toUpperCase() : fallback;

export const MAX_ROW_COLORS = 4;

// Row colours from a stored look: the list (1 to 4), or a look saved before
// the list (one row colour and an optional stripe colour)
function readRowColors(raw: Partial<TableLook> & { rowBackground?: unknown; stripe?: unknown }): string[] {
  const base = BUILTIN_LOOKS.corporateBlue.rowColors;
  if (Array.isArray(raw.rowColors) && raw.rowColors.length > 0) {
    return raw.rowColors.slice(0, MAX_ROW_COLORS).map((c, i) => color(c, base[i % base.length]!));
  }
  const first = color(raw.rowBackground, base[0]!);
  if (raw.stripe === null) return [first];
  return [first, color(raw.stripe, base[1]!)];
}

// A look read from a saved report, with anything missing or invalid replaced
export function normalizeLook(raw: Partial<TableLook>): TableLook {
  const base = BUILTIN_LOOKS.corporateBlue;
  return {
    headerBackground: color(raw.headerBackground, base.headerBackground),
    headerText: color(raw.headerText, base.headerText),
    headerBold: raw.headerBold !== false,
    rowColors: readRowColors(raw),
    rowText: color(raw.rowText, base.rowText),
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

// What a table looks like now (a data table's binding or a typed table's setup)
export function resolveLook(binding: { theme?: string; look?: TableLook } | undefined): TableLook {
  if (binding?.look) return normalizeLook(binding.look);
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

// Body row `index` (from 0) takes the row colours in turn
export const rowColorAt = (look: TableLook, index: number): string =>
  look.rowColors[((index % look.rowColors.length) + look.rowColors.length) % look.rowColors.length]!;

// Row colour `i` of `count`: REPORT_COUNT inside a table counts that table's rows from 1
export const rowColorCondition = (i: number, count: number) =>
  `new Boolean(($V{REPORT_COUNT}.intValue() - 1) % ${count} == ${i})`;

const CELL_PADDING = { leftPadding: 4, rightPadding: 4 };
// Line widths: the lines between cells, and the stronger line under the header / above the totals
export const TABLE_LINE_WIDTH = 0.5;
export const TABLE_RULE_WIDTH = 1;
const THIN = TABLE_LINE_WIDTH;
const RULE = TABLE_RULE_WIDTH;
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
    backcolor: look.rowColors[0],
    forecolor: look.rowText,
    ...font,
    box: partBox(look, "row"),
  };
  const count = look.rowColors.length;
  if (count > 1) {
    row.conditionalStyles = look.rowColors.slice(1).map((backcolor, i) => ({
      conditionExpression: rowColorCondition(i + 1, count),
      properties: { mode: "Opaque", backcolor },
    }));
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
  return { header: look.headerBackground, row: look.rowColors[0]!, stripe: look.rowColors[1] ?? look.rowColors[0]! };
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

// CSS for a table cell drawn with a report style (`rowColor`: a body row's colour)
export function tableCellCss(style: ReportStyle, rowColor?: string): Record<string, string> {
  const css: Record<string, string> = {};
  const background = rowColor || (style.mode !== "Transparent" ? style.backcolor : undefined);
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
