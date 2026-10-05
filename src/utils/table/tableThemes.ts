// Data table themes. Each theme is a set of named report styles (header, row,
// totals) that appear in Style Management like any other style: editing one
// there restyles every table using that theme. Rows are striped with a
// conditional style on the table's own row count.

import { DEFAULT_REPORT_FONT } from "@/config/fonts.config";
import type { ReportStyle } from "@/types";
import type { TableTheme } from "@/types/dataSource";

export type TableStylePart = "header" | "row" | "totals";

export const TABLE_THEMES: TableTheme[] = ["corporateBlue", "minimal", "emerald"];

const THEME_STYLE_PREFIX: Record<TableTheme, string> = {
  corporateBlue: "Table_CorporateBlue",
  minimal: "Table_Minimal",
  emerald: "Table_Emerald",
};

const PART_SUFFIX: Record<TableStylePart, string> = {
  header: "Header",
  row: "Row",
  totals: "Totals",
};

export function tableStyleName(theme: TableTheme, part: TableStylePart): string {
  return `${THEME_STYLE_PREFIX[theme]}_${PART_SUFFIX[part]}`;
}

// Every second row; REPORT_COUNT inside a table counts that table's rows
export const STRIPE_CONDITION =
  "new Boolean($V{REPORT_COUNT}.intValue() % 2 == 0)";

const CELL_PADDING = { leftPadding: 4, rightPadding: 4 };
const FONT = { fontSize: 9, verticalAlignment: "Middle" };
const pen = (lineWidth: number, lineColor: string) => ({
  lineWidth,
  lineStyle: "Solid",
  lineColor,
});
const allSides = (lineWidth: number, lineColor: string) => ({
  pen: pen(lineWidth, lineColor),
  ...CELL_PADDING,
});
const noLine = pen(0, "#FFFFFF");

interface ThemeColors {
  header: Partial<ReportStyle>;
  row: Partial<ReportStyle>;
  stripe?: string;
  totals: Partial<ReportStyle>;
}

const THEME_STYLES: Record<TableTheme, ThemeColors> = {
  corporateBlue: {
    header: {
      backcolor: "#1E3A8A",
      forecolor: "#FFFFFF",
      isBold: true,
      box: allSides(0.5, "#CBD5E1"),
    },
    row: { backcolor: "#FFFFFF", forecolor: "#1F2937", box: allSides(0.5, "#E2E8F0") },
    stripe: "#F1F5F9",
    totals: {
      backcolor: "#E0E7FF",
      forecolor: "#1E3A8A",
      isBold: true,
      box: { ...allSides(0.5, "#E2E8F0"), topPen: pen(1, "#1E3A8A") },
    },
  },
  minimal: {
    header: {
      backcolor: "#F3F4F6",
      forecolor: "#111827",
      isBold: true,
      box: {
        ...CELL_PADDING,
        topPen: noLine,
        leftPen: noLine,
        rightPen: noLine,
        bottomPen: pen(1, "#9CA3AF"),
      },
    },
    row: {
      backcolor: "#FFFFFF",
      forecolor: "#374151",
      box: {
        ...CELL_PADDING,
        topPen: noLine,
        leftPen: noLine,
        rightPen: noLine,
        bottomPen: pen(0.5, "#E5E7EB"),
      },
    },
    totals: {
      backcolor: "#FFFFFF",
      forecolor: "#111827",
      isBold: true,
      box: {
        ...CELL_PADDING,
        topPen: pen(1, "#9CA3AF"),
        leftPen: noLine,
        rightPen: noLine,
        bottomPen: noLine,
      },
    },
  },
  emerald: {
    header: {
      backcolor: "#047857",
      forecolor: "#FFFFFF",
      isBold: true,
      box: allSides(0.5, "#A7F3D0"),
    },
    row: { backcolor: "#FFFFFF", forecolor: "#1F2937", box: allSides(0.5, "#A7F3D0") },
    stripe: "#ECFDF5",
    totals: {
      backcolor: "#D1FAE5",
      forecolor: "#065F46",
      isBold: true,
      box: { ...allSides(0.5, "#A7F3D0"), topPen: pen(1, "#047857") },
    },
  },
};

// The styles a theme needs, ready to add to the report's styles
export function buildThemeStyles(theme: TableTheme): ReportStyle[] {
  const colors = THEME_STYLES[theme];
  return (["header", "row", "totals"] as TableStylePart[]).map((part) => {
    const style: ReportStyle = {
      name: tableStyleName(theme, part),
      mode: "Opaque",
      ...FONT,
      ...structuredClone(colors[part]),
    };
    if (part === "row" && colors.stripe) {
      style.conditionalStyles = [
        {
          conditionExpression: STRIPE_CONDITION,
          properties: { mode: "Opaque", backcolor: colors.stripe },
        },
      ];
    }
    return style;
  });
}

// Adds the theme's styles the report doesn't have yet (styles the user
// already edited in Style Management are kept as they are)
export function ensureThemeStyles(styles: ReportStyle[], theme: TableTheme): ReportStyle[] {
  const existing = new Set(styles.map((s) => s.name));
  const missing = buildThemeStyles(theme).filter((s) => !existing.has(s.name));
  return missing.length ? [...styles, ...missing] : styles;
}

// The styles JasperStudio and the old table editor added for every table
// ("Table", "Table_TH", "Table 1_CH"…); the data tables don't use them
const LEGACY_TABLE_STYLE = /^Table( \d+)?(_TH|_CH|_TD)?$/;

export function withoutLegacyTableStyles(styles: ReportStyle[]): ReportStyle[] {
  const kept = styles.filter((s) => !LEGACY_TABLE_STYLE.test(s.name));
  return kept.length === styles.length ? styles : kept;
}

// Same look, whatever the key order or empty values. A saved file names the
// default font and leaves out borders 0 wide, so those don't count either.
const PEN_SIDES = ["pen", "topPen", "leftPen", "bottomPen", "rightPen"] as const;
const lookKey = (style: ReportStyle): string => {
  const look: ReportStyle = { ...style, fontFamily: style.fontFamily ?? DEFAULT_REPORT_FONT };
  if (look.box) {
    const box: Record<string, unknown> = { ...look.box };
    for (const side of PEN_SIDES) {
      if (!(box[side] as { lineWidth?: number } | undefined)?.lineWidth) delete box[side];
    }
    look.box = box as ReportStyle["box"];
  }
  return JSON.stringify(look, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v)
            .filter(([, x]) => x !== undefined && x !== null)
            .sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
};

// The report keeps the styles of the themes its tables use, and no others:
// a theme's styles join on first use and leave when no table uses it, unless
// the user changed them in Style Management
export function syncThemeStyles(styles: ReportStyle[], usedThemes: Iterable<TableTheme>): ReportStyle[] {
  const used = new Set(usedThemes);
  let next = styles;
  for (const theme of TABLE_THEMES) {
    if (used.has(theme)) {
      next = ensureThemeStyles(next, theme);
      continue;
    }
    const defaults = new Map(buildThemeStyles(theme).map((s) => [s.name, lookKey(s)]));
    const kept = next.filter((s) => defaults.get(s.name) !== lookKey(s));
    if (kept.length !== next.length) next = kept;
  }
  return next;
}

// The style a table part uses, as currently defined in the report
export function findTableStyle(
  styles: ReportStyle[],
  theme: TableTheme,
  part: TableStylePart,
): ReportStyle {
  const name = tableStyleName(theme, part);
  return (
    styles.find((s) => s.name === name) ??
    buildThemeStyles(theme).find((s) => s.name === name)!
  );
}

// Colour shown on the theme picker
export function themeSwatch(theme: TableTheme): { header: string; stripe: string } {
  const c = THEME_STYLES[theme];
  return { header: c.header.backcolor!, stripe: c.stripe ?? "#FFFFFF" };
}

const penCss = (p?: { lineWidth?: number; lineStyle?: string; lineColor?: string }) => {
  if (!p || p.lineWidth === undefined) return undefined;
  if (p.lineWidth <= 0) return "none";
  const style = p.lineStyle === "Dashed" ? "dashed" : p.lineStyle === "Dotted" ? "dotted" : "solid";
  return `${p.lineWidth}px ${style} ${p.lineColor || "#000000"}`;
};

// CSS for a table cell drawn with a report style (canvas, popup and preview grids)
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
