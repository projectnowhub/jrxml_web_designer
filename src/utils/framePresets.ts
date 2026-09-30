// Frame style presets and ready-made frame templates (cards, sections, page border).
// Everything here produces plain JasperReports frames: a box (pens), a backcolor and
// child text fields, so the result round-trips through JRXML unchanged.

import type { Box, DesignElement, FrameElement, Pen } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { DEFAULT_REPORT_FONT } from "@/config/fonts.config";

// Palette tuned for formal project/government reports: soft tints, thin rules
export const FRAME_COLORS = {
  navy: "#1F3864",
  accent: "#7C5CF7",
  headerDark: "#1B1D29",
  borderLight: "#D0D5DD",
  borderMuted: "#9CA3AF",
  textDark: "#1F2937",
  textMuted: "#6B7280",
  placeholderFill: "#ECEEF2",
  tintInfo: "#EFEEFA",
  tintSuccess: "#E7F5EE",
  tintWarning: "#FCF3E3",
  tintDanger: "#FBE9E9",
  success: "#2E9E5B",
  warning: "#E08A1E",
  danger: "#E5484D",
} as const;

const pen = (lineWidth: number, lineColor: string, lineStyle = "Solid"): Pen => ({
  lineWidth,
  lineStyle,
  lineColor,
});

type FrameStylePatch = Pick<FrameElement, "box" | "mode" | "backcolor">;

// Looks used by the card templates
const tint = (backcolor: string): FrameStylePatch => ({ box: undefined, mode: "Opaque", backcolor });
const lined = (box: Box, backcolor?: string): FrameStylePatch =>
  backcolor
    ? { box, mode: "Opaque", backcolor }
    : { box, mode: "Transparent", backcolor: "#FFFFFF" };

// ---------------------------------------------------------------------------
// Borders. The Frame panel edits lines only; fills are a separate feature.
// ---------------------------------------------------------------------------

export type BorderSide = "top" | "right" | "bottom" | "left";
export const BORDER_SIDES: BorderSide[] = ["top", "right", "bottom", "left"];

const SIDE_PEN_KEY = {
  top: "topPen",
  right: "rightPen",
  bottom: "bottomPen",
  left: "leftPen",
} as const satisfies Record<BorderSide, keyof Box>;

const DEFAULT_PEN: Pen = pen(1, FRAME_COLORS.navy);

const hasWidth = (p?: Pen | null): p is Pen => !!p && (p.lineWidth ?? 0) > 0;

// Box without any lines: pens and legacy border fields go, padding stays
export function withoutLines(box?: Box): Box {
  const next: Box = {};
  for (const [key, value] of Object.entries(box ?? {})) {
    if (key === "pen" || key.endsWith("Pen") || /order/.test(key)) continue;
    (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

export const orUndefined = (box: Box): Box | undefined =>
  Object.keys(box).length > 0 ? box : undefined;

// The line actually drawn on a side, or null. A side pen inherits unset
// attributes from the shared pen (JasperReports' rule).
export function getSidePen(box: Box | undefined, side: BorderSide): Pen | null {
  const own = box?.[SIDE_PEN_KEY[side]] as Pen | undefined;
  const merged: Pen = { ...box?.pen, ...stripUndefined(own) };
  if (!hasWidth(merged)) return null;
  return {
    lineWidth: merged.lineWidth,
    lineStyle: merged.lineStyle || "Solid",
    lineColor: (merged.lineColor || "#000000").toUpperCase(),
  };
}

function stripUndefined(p?: Pen): Pen {
  return Object.fromEntries(Object.entries(p ?? {}).filter(([, v]) => v !== undefined)) as Pen;
}

export function getBorderSides(box?: Box): Record<BorderSide, boolean> {
  return Object.fromEntries(
    BORDER_SIDES.map((side) => [side, getSidePen(box, side) !== null]),
  ) as Record<BorderSide, boolean>;
}

const samePen = (a: Pen | null, b: Pen | null) =>
  a === b ||
  (!!a && !!b &&
    a.lineWidth === b.lineWidth &&
    a.lineStyle === b.lineStyle &&
    a.lineColor === b.lineColor);

// The pen shared by all four sides, null when there is no border at all,
// or "mixed" when the sides differ
export function getUniformPen(box?: Box): Pen | null | "mixed" {
  const pens = BORDER_SIDES.map((side) => getSidePen(box, side));
  return pens.every((p) => samePen(p, pens[0]!)) ? pens[0]! : "mixed";
}

// Pen to start from when a side is switched on
function seedPen(box?: Box): Pen {
  return BORDER_SIDES.map((s) => getSidePen(box, s)).find(hasWidth) ?? DEFAULT_PEN;
}

// Change one side: a partial pen edits it (switching it on if needed), null removes it.
// Unless all four sides match, each drawn side gets its own full pen and there is
// no shared pen, so a removed side can't inherit a line.
export function updateSide(box: Box | undefined, side: BorderSide, change: Partial<Pen> | null): Box | undefined {
  return writePens(
    box,
    BORDER_SIDES.map((s) => {
      const p = getSidePen(box, s);
      if (s !== side) return p;
      return change === null ? null : { ...(p ?? seedPen(box)), ...change };
    }),
  );
}

// Write one pen per side (null = side off). Four identical pens collapse into
// the shared pen, which is how JasperReports Studio writes a uniform border.
function writePens(box: Box | undefined, pens: (Pen | null)[]): Box | undefined {
  const next = withoutLines(box);
  const drawn = pens.filter(hasWidth);
  if (drawn.length === BORDER_SIDES.length && drawn.every((p) => samePen(p, drawn[0]!))) {
    next.pen = drawn[0];
  } else {
    BORDER_SIDES.forEach((side, i) => {
      const p = pens[i];
      if (hasWidth(p)) next[SIDE_PEN_KEY[side]] = p;
    });
  }
  return orUndefined(next);
}

// "All sides" checkbox: switch every side on (sides that were off start from an
// existing line) or remove the whole border
export function setAllSides(box: Box | undefined, on: boolean): Box | undefined {
  if (!on) return orUndefined(withoutLines(box));
  const seed = seedPen(box);
  return writePens(box, BORDER_SIDES.map((side) => getSidePen(box, side) ?? seed));
}

// "All sides" style/width/colour: change the sides that are on; sides that are
// off stay off
export function updateAllSides(box: Box | undefined, change: Partial<Pen>): Box | undefined {
  return writePens(
    box,
    BORDER_SIDES.map((side) => {
      const p = getSidePen(box, side);
      return p ? { ...p, ...change } : null;
    }),
  );
}

export type BorderPresetId =
  | "none"
  | "outline"
  | "hairline"
  | "light"
  | "softDashed"
  | "thick"
  | "doubleRule"
  | "topAccent"
  | "leftAccent"
  | "rightAccent"
  | "bottomAccent"
  | "underline";

export interface BorderPreset {
  id: BorderPresetId;
  labelKey: string;
  pens: () => Partial<Record<"pen" | (typeof SIDE_PEN_KEY)[BorderSide], Pen>>;
}

const preset = (id: BorderPresetId, pens: BorderPreset["pens"]): BorderPreset => ({
  id,
  labelKey: `framePresets.style.${id}`,
  pens,
});

// Quiet, print-friendly lines for formal reports
export const BORDER_PRESETS: BorderPreset[] = [
  preset("none", () => ({})),
  preset("outline", () => ({ pen: pen(1, FRAME_COLORS.navy) })),
  preset("hairline", () => ({ pen: pen(0.5, FRAME_COLORS.borderMuted) })),
  preset("light", () => ({ pen: pen(0.75, FRAME_COLORS.borderLight) })),
  preset("softDashed", () => ({ pen: pen(0.75, FRAME_COLORS.borderMuted, "Dashed") })),
  preset("thick", () => ({ pen: pen(2.5, FRAME_COLORS.navy) })),
  preset("doubleRule", () => ({ pen: pen(3, FRAME_COLORS.navy, "Double") })),
  preset("topAccent", () => ({ topPen: pen(3, FRAME_COLORS.accent) })),
  preset("leftAccent", () => ({ leftPen: pen(3, FRAME_COLORS.accent) })),
  preset("rightAccent", () => ({ rightPen: pen(3, FRAME_COLORS.accent) })),
  preset("bottomAccent", () => ({ bottomPen: pen(3, FRAME_COLORS.accent) })),
  preset("underline", () => ({ bottomPen: pen(1.5, FRAME_COLORS.accent) })),
];

// Replace the border with a preset's lines, keeping any padding
export function applyBorderPreset(box: Box | undefined, id: BorderPresetId): Box | undefined {
  const preset = BORDER_PRESETS.find((p) => p.id === id) ?? BORDER_PRESETS[0]!;
  return orUndefined({ ...withoutLines(box), ...preset.pens() });
}

// The preset whose lines match the box exactly, for highlighting in the panel
export function getActiveBorderPreset(box?: Box): BorderPresetId | null {
  const match = BORDER_PRESETS.find((preset) =>
    BORDER_SIDES.every((side) => samePen(getSidePen(box, side), getSidePen(preset.pens(), side))),
  );
  return match?.id ?? null;
}

// ---------------------------------------------------------------------------
// Keeping children in place when a frame is resized
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// One axis: children covering at least half the frame stretch with it, children
// closer to the far edge (right/bottom) move with that edge, the rest stay put
function fitAxis(pos: number, size: number, oldTotal: number, newTotal: number): [number, number] {
  const delta = newTotal - oldTotal;
  if (size >= oldTotal * 0.5) return [pos, Math.max(1, Math.round(size + delta))];
  const farGap = oldTotal - (pos + size);
  if (farGap < pos) return [Math.max(0, Math.round(pos + delta)), size];
  return [pos, size];
}

// Positions for a frame's children after resizing the frame from `from` to `to`.
// Always computed from the positions at the start of the resize, so repeated
// calls during a drag don't accumulate rounding errors.
export function fitChildrenToFrame(
  children: Rect[],
  from: { width: number; height: number },
  to: { width: number; height: number },
): Rect[] {
  return children.map((c) => {
    const [x, width] = fitAxis(c.x, c.width, from.width, to.width);
    const [y, height] = fitAxis(c.y, c.height, from.height, to.height);
    return { x, y, width, height };
  });
}

// ---------------------------------------------------------------------------
// Templates: library items that create a styled frame with placeholder content
// ---------------------------------------------------------------------------

export const PAGE_BORDER_TYPE = "framePageBorder";

// The page border: a frame in the Background band. Only one is allowed, since the
// band repeats on every page and a second border would lie on top of the first.
export function findPageBorder(
  bands: { type: string; elements?: { type: string }[] }[],
): { bandIndex: number; elementIndex: number } | null {
  for (let bandIndex = 0; bandIndex < bands.length; bandIndex++) {
    const band = bands[bandIndex]!;
    if (band.type !== "background") continue;
    const elementIndex = (band.elements ?? []).findIndex((e) => e.type === "frame");
    if (elementIndex !== -1) return { bandIndex, elementIndex };
  }
  return null;
}

export const FRAME_TEMPLATE_TYPES = [
  "frameKpiCard",
  "frameAlertBox",
  "frameTitledSection",
  "framePhotoCard",
  PAGE_BORDER_TYPE,
] as const;

export type FrameTemplateType = (typeof FRAME_TEMPLATE_TYPES)[number];

export function isFrameTemplateType(type: string): type is FrameTemplateType {
  return (FRAME_TEMPLATE_TYPES as readonly string[]).includes(type);
}

export interface FrameTemplateContext {
  // Printable width (page width minus left/right margins)
  availableWidth: number;
  // Printable height (page height minus top/bottom margins)
  availableHeight: number;
  // Translator for placeholder text
  t: (key: string) => string;
}

interface TextOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  forecolor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  textAlignment?: "Left" | "Center" | "Right" | "Justified";
  verticalAlignment?: "Top" | "Middle" | "Bottom";
  backcolor?: string;
  leftPadding?: number;
  stretch?: boolean;
}

// JRXML string literal for a text field expression
const literal = (text: string) =>
  `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// Items a ready-made box is built from (its label, number, photo...) carry this
// JRXML property, so they stay part of the box after export and re-import.
// Only these are kept inside the box; items the user drops in move freely.
export const BOX_PART_PROPERTY = "com.cdp.box.part";

const boxPartProperties = () => [{ name: BOX_PART_PROPERTY, value: "true" }];

export function isBoxPart(element: unknown): boolean {
  const properties = (element as { properties?: { name?: string }[] } | undefined)?.properties;
  return Array.isArray(properties) && properties.some((p) => p?.name === BOX_PART_PROPERTY);
}

// "Add to box": an item dropped into a box becomes one of its parts
export function markBoxPart(element: { properties?: { name?: string; value?: string }[] }): void {
  if (isBoxPart(element)) return;
  element.properties = [...(element.properties ?? []), ...boxPartProperties()];
}

// "Move out of box": the item becomes an ordinary element
export function releaseBoxPart(element: { properties?: { name?: string }[] }): void {
  if (!Array.isArray(element.properties)) return;
  element.properties = element.properties.filter((p) => p?.name !== BOX_PART_PROPERTY);
  if (element.properties.length === 0) delete element.properties;
}

function text(options: TextOptions): DesignElement {
  const box: Box | undefined = options.leftPadding
    ? { leftPadding: options.leftPadding }
    : undefined;
  return createElement("textField", {
    uuid: crypto.randomUUID(),
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    expression: literal(options.text),
    fontFamily: DEFAULT_REPORT_FONT,
    fontSize: options.fontSize,
    isBold: options.isBold ?? false,
    isItalic: options.isItalic ?? false,
    forecolor: options.forecolor ?? FRAME_COLORS.textDark,
    textAlignment: options.textAlignment ?? "Left",
    verticalAlignment: options.verticalAlignment ?? "Top",
    markup: "none",
    isStretchWithOverflow: options.stretch ?? false,
    ...(options.backcolor
      ? { mode: "Opaque", backcolor: options.backcolor }
      : {}),
    ...(box ? { box } : {}),
    properties: boxPartProperties(),
  } as Partial<DesignElement>);
}

// Base settings of every box created from the library
const FRAME_DEFAULTS: FrameElement = {
  type: "frame",
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  backcolor: "#FFFFFF",
  mode: "Transparent",
  elements: [],
  printWhenExpression: "",
  isIgnorePagination: false,
  isSplitAllowed: true,
  splitType: "Stretch",
  isRemoveLineWhenBlank: false,
  isPrintRepeatedValues: true,
};

function frame(
  width: number,
  height: number,
  look: FrameStylePatch,
  elements: DesignElement[] = [],
): FrameElement {
  return {
    ...FRAME_DEFAULTS,
    width,
    height,
    elements,
    ...look,
  };
}

// KPI tile, e.g. "PROGRESS / 17.93% / Planned: 49.24%"
function kpiCard({ t }: FrameTemplateContext): FrameElement {
  const w = 130;
  const inner = w - 20;
  return frame(w, 62, tint(FRAME_COLORS.tintInfo), [
    text({ x: 10, y: 8, width: inner, height: 11, fontSize: 7, isBold: true,
      forecolor: FRAME_COLORS.textMuted, text: t("framePresets.placeholder.kpiLabel") }),
    text({ x: 10, y: 20, width: inner, height: 22, fontSize: 16, isBold: true,
      forecolor: FRAME_COLORS.accent, text: t("framePresets.placeholder.kpiValue") }),
    text({ x: 10, y: 44, width: inner, height: 11, fontSize: 7, isItalic: true,
      forecolor: FRAME_COLORS.textMuted, text: t("framePresets.placeholder.kpiCaption") }),
  ]);
}

// Highlighted notice, e.g. "⚠ SCHEDULE CRITICAL" with a short description
function alertBox({ t }: FrameTemplateContext): FrameElement {
  const w = 175;
  const inner = w - 20;
  return frame(w, 80, tint(FRAME_COLORS.tintDanger), [
    text({ x: 10, y: 8, width: inner, height: 13, fontSize: 8, isBold: true,
      forecolor: FRAME_COLORS.danger, text: t("framePresets.placeholder.alertTitle") }),
    text({ x: 10, y: 24, width: inner, height: 48, fontSize: 8, stretch: true,
      forecolor: FRAME_COLORS.textDark, text: t("framePresets.placeholder.alertBody") }),
  ]);
}

// Bordered block with a dark heading strip across the full printable width
function titledSection({ t, availableWidth }: FrameTemplateContext): FrameElement {
  const w = availableWidth;
  return frame(w, 120, lined({ pen: pen(0.75, FRAME_COLORS.borderLight) }, "#FFFFFF"), [
    text({ x: 0, y: 0, width: w, height: 20, fontSize: 9, isBold: true,
      forecolor: "#FFFFFF", backcolor: FRAME_COLORS.headerDark,
      verticalAlignment: "Middle", leftPadding: 8,
      text: t("framePresets.placeholder.sectionTitle") }),
  ]);
}

// Gallery card: photo area on top, caption underneath
// Photo area of the Photo Box: an image element. Until a picture is uploaded it
// prints as a light grey block ("Blank" on error: an empty image source would
// otherwise stop the PDF), and the picture keeps its shape when it arrives.
function photo(width: number, height: number): DesignElement {
  return createElement("image", {
    uuid: crypto.randomUUID(),
    x: 0,
    y: 0,
    width,
    height,
    imageExpression: "",
    scaleType: "RetainShape",
    hAlign: "Center",
    vAlign: "Middle",
    onErrorType: "Blank",
    mode: "Opaque",
    backcolor: FRAME_COLORS.placeholderFill,
    properties: boxPartProperties(),
  } as Partial<DesignElement>);
}

function photoCard({ t }: FrameTemplateContext): FrameElement {
  const w = 250;
  const photoH = 110;
  return frame(w, 158, lined({ pen: pen(0.75, FRAME_COLORS.borderLight) }, "#FFFFFF"), [
    photo(w, photoH),
    text({ x: 8, y: photoH + 8, width: w - 16, height: 13, fontSize: 8, isBold: true,
      text: t("framePresets.placeholder.photoCaption") }),
    text({ x: 8, y: photoH + 22, width: w - 16, height: 11, fontSize: 7,
      forecolor: FRAME_COLORS.textMuted, text: t("framePresets.placeholder.photoMeta") }),
  ]);
}

// Border around the whole printable area; lives in the Background band
function pageBorder({ availableWidth, availableHeight }: FrameTemplateContext): FrameElement {
  return frame(availableWidth, availableHeight, lined({ pen: { ...DEFAULT_PEN } }));
}

const TEMPLATE_BUILDERS: Record<
  FrameTemplateType,
  (ctx: FrameTemplateContext) => FrameElement
> = {
  frameKpiCard: kpiCard,
  frameAlertBox: alertBox,
  frameTitledSection: titledSection,
  framePhotoCard: photoCard,
  [PAGE_BORDER_TYPE]: pageBorder,
};

export function buildFrameTemplate(
  type: FrameTemplateType,
  ctx: FrameTemplateContext,
): FrameElement {
  return TEMPLATE_BUILDERS[type](ctx);
}

// ---------------------------------------------------------------------------
// Rounded corners
// ---------------------------------------------------------------------------
// A JasperReports frame border can't be rounded; only a rectangle has a radius,
// with one pen for all four sides. So a frame with `radius` is written as a frame
// holding marked rounded rectangles as its first children, and read back into a
// frame with a radius:
// - same line on all four sides: one rounded rectangle carrying that pen
// - any other border (e.g. a left accent): two stacked rounded rectangles, the
//   back one filled with the border colour, the front one filled with the inside
//   colour and inset by each side's width, so the border shows as a curved strip.
//   Drawn solid in one colour, over a filled inside.

export const ROUNDED_BORDER_PROPERTY = "com.jrxmldesigner.frame.roundedBorder";
// On the back shape of a layered border: the exact side pens
export const ROUNDED_BORDER_PENS_PROPERTY = "com.jrxmldesigner.frame.borderPens";

// Marker values on the rectangles
export const ROUNDED_MARKER = {
  outline: "true",
  layeredBack: "layered",
  // Front shape filled with the frame's own background
  layeredFrontFill: "inner-fill",
  // Front shape filled white because the frame has no background
  layeredFrontPlain: "inner",
  // A border line drawn as a bar with rounded ends
  lineEnd: "line-end",
} as const;

// Fill behind a frame with no background of its own (the paper)
export const PAPER_COLOR = "#FFFFFF";

export const hasRoundedCorners = (element: { radius?: number }): boolean =>
  (element.radius ?? 0) > 0;

// Whether a box draws the same line on all four sides (or none at all)
export const isUniformBorder = (box?: Box): boolean => getUniformPen(box) !== "mixed";

// The single line a rounded outline is drawn with, or null for no line
export function getRoundedBorderPen(box?: Box): Pen | null {
  return BORDER_SIDES.map((side) => getSidePen(box, side)).find(hasWidth) ?? null;
}

export interface LayeredBorder {
  color: string;
  widths: Record<BorderSide, number>;
}

// Border of a rounded frame that isn't the same on all sides: drawn solid in the
// colour of its first drawn side. Null when the frame isn't drawn that way.
export function getLayeredBorder(element: { radius?: number; box?: Box }): LayeredBorder | null {
  if (!hasRoundedCorners(element) || isUniformBorder(element.box)) return null;
  const pens = BORDER_SIDES.map((side) => getSidePen(element.box, side));
  const first = pens.find(hasWidth)!;
  return {
    color: first.lineColor ?? "#000000",
    widths: Object.fromEntries(
      BORDER_SIDES.map((side, i) => [side, pens[i]?.lineWidth ?? 0]),
    ) as Record<BorderSide, number>,
  };
}

// Side pens as text for a JRXML property value ("left=3,Solid,#7C5CF7;..."), so the
// exact widths survive a round trip (element positions in JRXML are whole numbers)
export function encodeSidePens(box?: Box): string {
  return BORDER_SIDES.flatMap((side) => {
    const p = getSidePen(box, side);
    return p ? [`${side}=${p.lineWidth},${p.lineStyle},${p.lineColor}`] : [];
  }).join(";");
}

export function decodeSidePens(text: string): Box {
  const box: Box = {};
  for (const part of text.split(";")) {
    const [side, values] = part.split("=");
    if (!side || !values || !(BORDER_SIDES as string[]).includes(side)) continue;
    const [width, lineStyle, lineColor] = values.split(",");
    const lineWidth = parseFloat(width ?? "");
    if (lineWidth > 0) {
      box[SIDE_PEN_KEY[side as BorderSide]] = { lineWidth, lineStyle: lineStyle || "Solid", lineColor: lineColor || "#000000" };
    }
  }
  return box;
}

// ---------------------------------------------------------------------------
// Rounded line ends
// ---------------------------------------------------------------------------
// With `roundedLineEnds`, each line of a partial border (e.g. a left accent) is
// drawn as a bar with semicircle ends: a rounded rectangle filled with the line's
// colour, no pen. Applies to frames without rounded corners; with a corner
// radius the border follows the corners instead (see getLayeredBorder).

export interface LineEndBar {
  side: BorderSide;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  color: string;
}

export function getRoundedLineEndBars(
  element: { width: number; height: number; radius?: number; box?: Box; roundedLineEnds?: boolean },
  // JRXML positions and radius are whole points
  wholePoints = false,
): LineEndBar[] | null {
  if (!element.roundedLineEnds || hasRoundedCorners(element) || isUniformBorder(element.box)) {
    return null;
  }
  const { width: W, height: H } = element;
  const bars: LineEndBar[] = [];
  for (const side of BORDER_SIDES) {
    const p = getSidePen(element.box, side);
    if (!p) continue;
    const w = wholePoints ? Math.max(1, Math.round(p.lineWidth ?? 1)) : (p.lineWidth ?? 1);
    const radius = wholePoints ? Math.floor(w / 2) : w / 2;
    const color = p.lineColor ?? "#000000";
    const box = {
      top: { x: 0, y: 0, width: W, height: w },
      bottom: { x: 0, y: H - w, width: W, height: w },
      left: { x: 0, y: 0, width: w, height: H },
      right: { x: W - w, y: 0, width: w, height: H },
    }[side];
    bars.push({ side, ...box, radius, color });
  }
  return bars;
}

// ---------------------------------------------------------------------------
// Keeping a box's items inside it
// ---------------------------------------------------------------------------
// A box's own parts (isBoxPart) are positioned from the box's top-left corner and
// can't leave it by dragging, resizing or nudging. "Move out of box" in the
// right-click menu takes one out on purpose.

type Size = { width: number; height: number };

// Moving: the item keeps its size and is pushed back inside
export function clampPositionInBox(item: Rect, box: Size): { x: number; y: number } {
  return {
    x: Math.round(Math.max(0, Math.min(item.x, box.width - item.width))),
    y: Math.round(Math.max(0, Math.min(item.y, box.height - item.height))),
  };
}

// Resizing: edges that go past the box are trimmed to it
export function clampRectInBox(item: Rect, box: Size): Rect {
  const x = Math.max(0, Math.min(item.x, box.width - 1));
  const y = Math.max(0, Math.min(item.y, box.height - 1));
  const right = Math.min(item.x + item.width, box.width);
  const bottom = Math.min(item.y + item.height, box.height);
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(right - x)),
    height: Math.max(1, Math.round(bottom - y)),
  };
}
