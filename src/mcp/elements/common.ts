// Settings shared by several element schemas (position, text look, lines,
// fills, corners) and the helpers that write them onto designer elements in
// the same form the property panels do.

import type { Box, DesignElement, Pen } from "@/types";
import {
  applyBorderPreset,
  BORDER_PRESETS,
  BORDER_SIDES,
  getSidePen,
  getUniformPen,
  getActiveBorderPreset,
  setAllSides,
  updateSide,
  type BorderPresetId,
  type BorderSide,
} from "@/utils/framePresets";
import {
  CORNER_NAMES,
  getPropertyCornerRadii,
  sanitizeHtml,
  setPropertyCornerRadii,
  type CornerRadii,
} from "@/utils/elementUtils";
import { TEXT_LINE_HEIGHT } from "@/utils/customTable";
import { SpecError, type ElementSpec, type JsonSchema, type KindContext } from "./types";

// ---------------------------------------------------------------------------
// Schema fragments
// ---------------------------------------------------------------------------

export const color = (description: string): JsonSchema => ({
  type: "string",
  description: `${description}, as "#RRGGBB"`,
});

export const fill = (what = "Background fill"): JsonSchema => ({
  type: "string",
  description: `${what}, as "#RRGGBB", or "transparent" for none`,
});

export const ALIGNMENTS = ["Left", "Center", "Right", "Justified"] as const;
export const V_ALIGNMENTS = ["Top", "Middle", "Bottom"] as const;
export const LINE_STYLES = ["Solid", "Dashed", "Dotted", "Double"] as const;

// Position and size, in px (JRXML points) from the top-left of the band, or of
// the box for a child
export const POSITION_PROPS: Record<string, JsonSchema> = {
  x: { type: "number", minimum: 0, description: "Left edge in px from the left margin (or from the box's left edge for a child)" },
  y: { type: "number", minimum: 0, description: "Top edge in px from the top of the band / page area (or of the box for a child)" },
  width: { type: "number", minimum: 1, description: "Width in px" },
  height: { type: "number", minimum: 1, description: "Height in px" },
};

// Where it goes
export const PLACE_PROPS: Record<string, JsonSchema> = {
  bandType: {
    type: "string",
    enum: ["detail", "pageHeader", "columnHeader", "columnFooter", "pageFooter"],
    description:
      "Section it goes in (default detail = the page body). pageHeader / pageFooter / columnHeader / columnFooter repeat on every normal page",
  },
  page: {
    type: "integer",
    minimum: 1,
    description: "Designer page number (1 = first page, cover and contents pages included) for the detail band. Default: the first normal page",
  },
  parent: {
    type: "string",
    description: "uuid of a box to put it in (or a ref given earlier in the same create_design call); x / y are then relative to the box",
  },
};

export const TEXT_STYLE_PROPS: Record<string, JsonSchema> = {
  fontSize: { type: "number", minimum: 4, maximum: 120, description: "Font size in pt (default: the report's)" },
  isBold: { type: "boolean", description: "Bold" },
  isItalic: { type: "boolean", description: "Italic" },
  isUnderline: { type: "boolean", description: "Underlined" },
  forecolor: color("Text colour"),
  backcolor: fill(),
  textAlignment: { type: "string", enum: ALIGNMENTS, description: "Horizontal alignment" },
  verticalAlignment: { type: "string", enum: V_ALIGNMENTS, description: "Vertical alignment" },
};

const PEN_PROPS: Record<string, JsonSchema> = {
  lineWidth: { type: "number", minimum: 0, maximum: 20, description: "Line width in px (0 = no line)" },
  lineColor: color("Line colour"),
  lineStyle: { type: "string", enum: LINE_STYLES, description: "Line style" },
};

// Lines around a box, text or image: a preset, or one line on chosen sides
export const BORDER_PROPS: Record<string, JsonSchema> = {
  borderPreset: {
    type: "string",
    enum: BORDER_PRESETS.map((p) => p.id),
    description:
      "Ready-made border: none, outline (navy 1px), hairline, light (grey 0.75px), softDashed, thick, doubleRule, topAccent / leftAccent / rightAccent / bottomAccent (3px purple bar on one side), underline",
  },
  border: {
    type: "object",
    description: "Custom border (after the preset, if both are given)",
    properties: {
      ...PEN_PROPS,
      sides: {
        type: "array",
        items: { type: "string", enum: BORDER_SIDES },
        description: "Sides that get the line (default: all four); the others get none",
      },
    },
    additionalProperties: false,
  },
  padding: { type: "number", minimum: 0, maximum: 100, description: "Space inside the border, in px" },
};

// Outline of a rectangle or ellipse (one line all round)
export const OUTLINE_PROPS: Record<string, JsonSchema> = {
  border: {
    type: "object",
    description: "Outline (lineWidth 0 for none)",
    properties: PEN_PROPS,
    additionalProperties: false,
  },
};

export const CORNER_PROPS: Record<string, JsonSchema> = {
  cornerRadius: { type: "number", minimum: 0, maximum: 500, description: "Rounded corners: radius in px for all four" },
  cornerRadii: {
    type: "array",
    items: { type: "number", minimum: 0 },
    minItems: 4,
    maxItems: 4,
    description: "Each corner's radius in px: [topLeft, topRight, bottomRight, bottomLeft] (instead of cornerRadius)",
  },
};

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

// "#1f3864" / "1F3864" / "#abc" as "#1F3864"; "transparent" / "none" as null
export function readColor(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text || /^(transparent|none)$/i.test(text)) return null;
  const match = text.match(HEX);
  if (!match) throw new SpecError(`${field}: "${text}" is not a colour; use "#RRGGBB"`);
  const hex = match[1]!.length === 3 ? [...match[1]!].map((c) => c + c).join("") : match[1]!;
  return `#${hex.toUpperCase()}`;
}

export function requireColor(value: unknown, field: string): string {
  const c = readColor(value, field);
  if (!c) throw new SpecError(`${field}: needs a colour, as "#RRGGBB"`);
  return c;
}

export const has = (spec: ElementSpec, key: string) => spec[key] !== undefined;

// A JRXML string literal for typed text (line breaks as \n), the form the
// ready-made parts use; the canvas and textOf() read it back
export function textLiteral(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r\n|\r|\n/g, "\\n")}"`;
}

// The text of a text element, line breaks kept (formatted text keeps its tags)
export function plainText(element: DesignElement): string {
  if (element.type !== "textField") return "";
  const expr = (element.expression ?? "").trim();
  if (!(expr.startsWith('"') && expr.endsWith('"') && expr.length >= 2)) return expr;
  return expr.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

// Text, plain or formatted (simple HTML: <b> <i> <u> <s> <sup> <sub> <br>
// <ul>/<ol>/<li> <font color>), written the way the text editor writes it
export function writeText(element: DesignElement, text: string, rich: boolean): void {
  if (rich) {
    // A backslash as its HTML entity: written raw it would break the Java string
    const html = sanitizeHtml(text).replace(/\\/g, "&#92;").replace(/\r\n|\r|\n/g, "<br>");
    element.markup = "html";
    (element as { expression?: string }).expression = `"${html.replace(/"/g, '\\"')}"`;
  } else {
    element.markup = "none";
    (element as { expression?: string }).expression = textLiteral(text);
  }
}

export const isRich = (element: DesignElement) =>
  element.markup === "html" && /<\/?[a-z][^>]*>/i.test((element as { expression?: string }).expression ?? "");

// ---------------------------------------------------------------------------
// Text size: how much room a text needs (Noto Sans SC: ~0.55 em per Latin
// letter, a full em for Chinese / Japanese / Korean ones; 1.45 em per line)
// ---------------------------------------------------------------------------

export const LINE_HEIGHT = 1.45;

export function letters(text: string): number {
  let n = 0;
  for (const ch of text) n += ch.codePointAt(0)! >= 0x2e80 ? 1.8 : 1;
  return n;
}

// The words a text prints, line breaks kept (formatting tags dropped)
export function printedText(e: DesignElement): string {
  const raw = plainText(e);
  if (!isRich(e)) return raw;
  return raw
    .replace(/<br\s*\/?>|<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, "x");
}

// Height the text needs at its width
export function neededTextHeight(e: DesignElement): number {
  const size = e.fontSize || 10;
  const pad = (e.box?.leftPadding ?? e.box?.padding ?? 0) + (e.box?.rightPadding ?? e.box?.padding ?? 0);
  const vpad = (e.box?.topPadding ?? e.box?.padding ?? 0) + (e.box?.bottomPadding ?? e.box?.padding ?? 0);
  const perLine = Math.max(1, (e.width - pad) / (size * (e.isBold ? 0.6 : 0.55)));
  const lines = printedText(e)
    .split("\n")
    .reduce((n, para) => n + Math.max(1, Math.ceil(letters(para) / perLine)), 0);
  return Math.ceil(lines * size * LINE_HEIGHT + vpad);
}

// Height a text needs at a width (cells of a typed table, before they exist)
export function textHeightFor(text: string, width: number, fontSize: number, bold = false): number {
  const perLine = Math.max(1, width / (fontSize * (bold ? 0.6 : 0.55)));
  const lines = text.split("\n").reduce((n, para) => n + Math.max(1, Math.ceil(letters(para) / perLine)), 0);
  return Math.ceil(lines * fontSize * LINE_HEIGHT);
}

// ---------------------------------------------------------------------------
// Writing settings
// ---------------------------------------------------------------------------

export function applyFill(element: DesignElement, value: unknown, field = "backcolor"): void {
  const c = readColor(value, field);
  if (c) {
    element.mode = "Opaque";
    element.backcolor = c;
  } else {
    element.mode = "Transparent";
  }
}

export function applyTextStyle(element: DesignElement, spec: ElementSpec): void {
  if (has(spec, "fontSize")) element.fontSize = Math.round(spec.fontSize * 2) / 2;
  if (has(spec, "isBold")) element.isBold = !!spec.isBold;
  if (has(spec, "isItalic")) element.isItalic = !!spec.isItalic;
  if (has(spec, "isUnderline")) element.isUnderline = !!spec.isUnderline;
  if (has(spec, "forecolor")) element.forecolor = requireColor(spec.forecolor, "forecolor");
  if (has(spec, "backcolor")) applyFill(element, spec.backcolor);
  if (has(spec, "textAlignment")) element.textAlignment = spec.textAlignment;
  if (has(spec, "verticalAlignment")) element.verticalAlignment = spec.verticalAlignment;
}

const readPen = (raw: Record<string, any>, base?: Pen | null): Pen => ({
  lineWidth: raw.lineWidth ?? base?.lineWidth ?? 1,
  lineStyle: raw.lineStyle ?? base?.lineStyle ?? "Solid",
  lineColor: has(raw, "lineColor") ? requireColor(raw.lineColor, "border.lineColor") : base?.lineColor ?? "#000000",
});

// Lines on a box / text / image (`box` pens, like the Style Settings side borders)
export function applyBoxLines(element: DesignElement, spec: ElementSpec): void {
  if (has(spec, "borderPreset")) element.box = applyBorderPreset(element.box, spec.borderPreset as BorderPresetId);
  if (has(spec, "border")) {
    const raw = spec.border as Record<string, any>;
    const uniform = getUniformPen(element.box);
    const pen = readPen(raw, uniform === "mixed" ? null : uniform);
    const sides = (raw.sides as BorderSide[] | undefined) ?? BORDER_SIDES;
    if (!pen.lineWidth) {
      element.box = setAllSides(element.box, false);
    } else {
      let box: Box | undefined = element.box;
      for (const side of BORDER_SIDES) box = updateSide(box, side, sides.includes(side) ? pen : null);
      element.box = box;
    }
  }
  if (has(spec, "padding")) element.box = { ...(element.box ?? {}), padding: Math.round(spec.padding) };
}

// Outline of a rectangle / ellipse
export function applyOutline(element: DesignElement & { pen?: Pen }, spec: ElementSpec): void {
  if (!has(spec, "border")) return;
  element.pen = readPen(spec.border, element.pen);
}

export function readCorners(spec: ElementSpec): CornerRadii | null {
  if (has(spec, "cornerRadii")) {
    const [tl, tr, br, bl] = spec.cornerRadii as number[];
    return { topLeft: tl!, topRight: tr!, bottomRight: br!, bottomLeft: bl! };
  }
  if (has(spec, "cornerRadius")) {
    const r = spec.cornerRadius as number;
    return { topLeft: r, topRight: r, bottomRight: r, bottomLeft: r };
  }
  return null;
}

// Text and images keep their corners as a reportElement property
export function applyPropertyCorners(element: DesignElement, spec: ElementSpec): void {
  const radii = readCorners(spec);
  if (radii) setPropertyCornerRadii(element, radii);
}

// Text whose first line doesn't fit is dropped by JasperReports: at least
// ~1.45 × the font size per line, plus the padding
export function ensureTextHeight(element: DesignElement, ctx: KindContext, lines = 1): void {
  const fontSize = element.fontSize || ctx.fontSize;
  const pad = (element.box?.topPadding ?? element.box?.padding ?? 0) + (element.box?.bottomPadding ?? element.box?.padding ?? 0);
  const min = Math.ceil(fontSize * TEXT_LINE_HEIGHT * Math.max(1, lines)) + pad;
  if (element.height < min) {
    ctx.notes.push(`height raised from ${element.height} to ${min} px so ${fontSize} pt text prints`);
    element.height = min;
  }
}

export const lineCount = (text: string) => Math.max(1, text.split(/\r\n|\r|\n/).length);

// ---------------------------------------------------------------------------
// Reading settings back (describe)
// ---------------------------------------------------------------------------

const defined = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== false));

export const describePlace = (e: DesignElement) => ({ x: e.x, y: e.y, width: e.width, height: e.height });

export const describeFill = (e: DesignElement) => (e.mode === "Opaque" && e.backcolor ? e.backcolor : undefined);

export function describeTextStyle(e: DesignElement): Record<string, unknown> {
  return defined({
    fontSize: e.fontSize,
    isBold: e.isBold,
    isItalic: e.isItalic,
    isUnderline: e.isUnderline,
    forecolor: e.forecolor,
    backcolor: describeFill(e),
    textAlignment: e.textAlignment,
    verticalAlignment: e.verticalAlignment,
  });
}

export function describeBoxLines(e: DesignElement): Record<string, unknown> {
  const preset = getActiveBorderPreset(e.box);
  const out: Record<string, unknown> = {};
  if (preset && preset !== "none") out.borderPreset = preset;
  else if (!preset) {
    const sides = BORDER_SIDES.filter((s) => getSidePen(e.box, s));
    const first = sides.length ? getSidePen(e.box, sides[0]!) : null;
    if (first) out.border = { ...first, ...(sides.length < 4 ? { sides } : {}) };
  }
  const padding = e.box?.padding;
  if (padding) out.padding = padding;
  return out;
}

export function describeCorners(radii: CornerRadii): Record<string, unknown> {
  const values = CORNER_NAMES.map((c) => radii[c]);
  if (values.every((v) => v === 0)) return {};
  return values.every((v) => v === values[0]) ? { cornerRadius: values[0] } : { cornerRadii: values };
}

export const describePropertyCorners = (e: DesignElement) => describeCorners(getPropertyCornerRadii(e));

export { defined };
