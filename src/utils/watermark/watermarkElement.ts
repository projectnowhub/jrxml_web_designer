// Watermark: faint text (DRAFT, CONFIDENTIAL…) or a faded picture printed
// behind the content of every page. One per template.
//
// It is an image in the Background band, the size of the printable area,
// carrying its setup as JSON in the `com.cdp.watermark` property. JasperReports
// can't turn text by any angle or fade a picture, so the designer draws the
// watermark itself (watermarkDraw.ts) and puts the picture in the image's
// expression as a data URI, like a chart's or a Location's map; the report
// server prints it as any embedded picture. `com.cdp.watermark.drawn` = what
// that picture was drawn for, so it is drawn again only when that changes
// (watermarkPictures.ts). Which pages show it is worked out when the JRXML is
// written (`watermarkPrintWhen`), from the template's cover and contents pages.
//
// No browser code here: the report store, the generator and the AI tools use it.

import type { Band, DesignElement, ImageElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { afterSpecialPages, specialPages, type SpecialPages } from "../specialPages";

export const WATERMARK_PROPERTY = "com.cdp.watermark";
export const WATERMARK_DRAWN_PROPERTY = "com.cdp.watermark.drawn";
// The library tile
export const WATERMARK_TYPE = "watermark";

export type WatermarkKind = "text" | "picture";
export const WATERMARK_KINDS: WatermarkKind[] = ["text", "picture"];

export type WatermarkPlace =
  | "topLeft" | "top" | "topRight"
  | "left" | "center" | "right"
  | "bottomLeft" | "bottom" | "bottomRight";
export const WATERMARK_PLACES: WatermarkPlace[] = [
  "topLeft", "top", "topRight",
  "left", "center", "right",
  "bottomLeft", "bottom", "bottomRight",
];

// Which pages show it: every page, all but the cover, only the normal pages
// (not the cover and contents pages)
export type WatermarkPages = "all" | "notCover" | "normal";
export const WATERMARK_PAGES: WatermarkPages[] = ["all", "notCover", "normal"];

export interface WatermarkSetup {
  kind: WatermarkKind;
  // Text: its words (a line per line), colour, bold and size (made smaller
  // when it wouldn't fit the page at its angle)
  text: string;
  color: string;
  bold: boolean;
  size: number;
  // Turned counter-clockwise, in degrees (45 = rising diagonal)
  angle: number;
  // Picture: its source (a stored file's fileRef or a data URI) and file name,
  // its width as a share of the printable width, washed out to grey
  picture: string;
  pictureName: string;
  pictureSize: number;
  grey: boolean;
  // How strong it prints, in % (5 = barely there)
  opacity: number;
  place: WatermarkPlace;
  // Repeated across the whole page instead of once
  repeat: boolean;
  pages: WatermarkPages;
}

export const WATERMARK_LIMITS = {
  size: { min: 12, max: 300 },
  angle: { min: -90, max: 90 },
  pictureSize: { min: 10, max: 100 },
  opacity: { min: 5, max: 60 },
} as const;

// The quick picks of the panel (and the AI's words for them)
export const WATERMARK_SIZES = [48, 72, 96, 140] as const;
export const WATERMARK_ANGLES = [45, 0, -45, 90] as const;
export const WATERMARK_OPACITIES = [10, 15, 25, 40] as const;
export const WATERMARK_WORDS = ["DRAFT", "CONFIDENTIAL", "COPY", "SAMPLE", "APPROVED"] as const;

export const DEFAULT_WATERMARK: WatermarkSetup = {
  kind: "text",
  text: "DRAFT",
  color: "#6B7280",
  bold: true,
  size: 96,
  angle: 45,
  picture: "",
  pictureName: "",
  pictureSize: 60,
  grey: false,
  opacity: 15,
  place: "center",
  repeat: false,
  pages: "all",
};

// Raised when what the picture is drawn from changes, so older pictures are redrawn
const DRAWING_VERSION = 1;

type WithProperties = { type?: string; properties?: { name?: string; value?: string }[] };

const propertyOf = (el: WithProperties | undefined, name: string) =>
  el?.properties?.find((p) => p?.name === name);

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
};

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim());

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export const isWatermark = (el: unknown): boolean =>
  (el as WithProperties | undefined)?.type === "image" && !!propertyOf(el as WithProperties, WATERMARK_PROPERTY);

export function normalizeWatermarkSetup(value: Partial<WatermarkSetup> | null | undefined): WatermarkSetup {
  const v = value ?? {};
  const L = WATERMARK_LIMITS;
  const d = DEFAULT_WATERMARK;
  return {
    kind: pick(v.kind, WATERMARK_KINDS, d.kind),
    text: typeof v.text === "string" ? v.text.replace(/\r\n?/g, "\n") : d.text,
    color: isHexColor(v.color) ? v.color.trim().toUpperCase() : d.color,
    bold: typeof v.bold === "boolean" ? v.bold : d.bold,
    size: clamp(v.size, L.size.min, L.size.max, d.size),
    angle: clamp(v.angle, L.angle.min, L.angle.max, d.angle),
    picture: typeof v.picture === "string" ? v.picture.trim() : "",
    pictureName: typeof v.pictureName === "string" ? v.pictureName : "",
    pictureSize: clamp(v.pictureSize, L.pictureSize.min, L.pictureSize.max, d.pictureSize),
    grey: v.grey === true,
    opacity: clamp(v.opacity, L.opacity.min, L.opacity.max, d.opacity),
    place: pick(v.place, WATERMARK_PLACES, d.place),
    repeat: v.repeat === true,
    pages: pick(v.pages, WATERMARK_PAGES, d.pages),
  };
}

export function getWatermarkSetup(el: WithProperties): WatermarkSetup {
  const raw = propertyOf(el, WATERMARK_PROPERTY)?.value;
  try {
    return normalizeWatermarkSetup(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeWatermarkSetup(null);
  }
}

export function setWatermarkSetup(el: DesignElement, setup: Partial<WatermarkSetup>): void {
  const value = JSON.stringify(normalizeWatermarkSetup({ ...getWatermarkSetup(el), ...setup }));
  const properties = (el.properties ?? []).filter((p) => p?.name !== WATERMARK_PROPERTY);
  el.properties = [...properties, { name: WATERMARK_PROPERTY, value }];
}

// Whether there is anything to print: words, or a picture
export const hasWatermarkContent = (setup: WatermarkSetup): boolean =>
  setup.kind === "text" ? setup.text.trim().length > 0 : setup.picture.length > 0;

// ── The picture it prints ──

// A short fingerprint of a text (the setup may hold a picture as a data URI)
function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// What the picture is drawn from: the setup's look (not which pages) and the
// size; "none" when there is nothing to draw
export function watermarkKey(setup: WatermarkSetup, width: number, height: number): string {
  if (!hasWatermarkContent(setup)) return "none";
  const { pages: _pages, ...look } = setup;
  return `${DRAWING_VERSION}:${Math.round(width)}x${Math.round(height)}:${fingerprint(JSON.stringify(look))}`;
}

export const drawnKeyOf = (el: WithProperties): string => propertyOf(el, WATERMARK_DRAWN_PROPERTY)?.value ?? "";

export function setDrawnKey(el: DesignElement, key: string): void {
  const properties = (el.properties ?? []).filter((p) => p?.name !== WATERMARK_DRAWN_PROPERTY);
  el.properties = key ? [...properties, { name: WATERMARK_DRAWN_PROPERTY, value: key }] : properties;
}

// The data URI it prints, when it was drawn for its setup and size ("" none)
export function watermarkPicture(el: ImageElement): string {
  if (drawnKeyOf(el) !== watermarkKey(getWatermarkSetup(el), el.width, el.height)) return "";
  const source = (el.imageExpression ?? "").trim().replace(/^"|"$/g, "");
  return source.startsWith("data:image/") ? source : "";
}

// ── In the report ──

export function findWatermark(bands: Band[]): { bandIndex: number; elementIndex: number } | null {
  for (let bandIndex = 0; bandIndex < bands.length; bandIndex++) {
    const band = bands[bandIndex]!;
    if (band.type !== "background") continue;
    const elementIndex = (band.elements ?? []).findIndex(isWatermark);
    if (elementIndex !== -1) return { bandIndex, elementIndex };
  }
  return null;
}

export function getWatermark(bands: Band[]): ImageElement | null {
  const at = findWatermark(bands);
  return at ? (bands[at.bandIndex]!.elements[at.elementIndex] as ImageElement) : null;
}

// A new watermark covering the printable area
export function buildWatermarkElement(
  area: { width: number; height: number },
  setup: Partial<WatermarkSetup> = {},
): ImageElement {
  const element = {
    ...createElement("image"),
    uuid: crypto.randomUUID(),
    x: 0,
    y: 0,
    width: Math.max(1, Math.round(area.width)),
    height: Math.max(1, Math.round(area.height)),
    imageExpression: "",
    scaleType: "FillFrame",
    onErrorType: "Blank",
    mode: "Transparent",
    properties: [],
  } as ImageElement;
  setWatermarkSetup(element, { ...DEFAULT_WATERMARK, ...setup });
  return element;
}

// After every change (report store's updateJrxml): the watermark covers the
// printable area, so does the Background band; only the first one is kept
// (a second one would lie on top of it). Its look is fixed: nothing of an
// ordinary picture (borders, shape, crop) applies to it.
// Changes only what differs, in place: the designer rewrites the JRXML on any
// change to the bands, so writing even an equal value (a new array) would
// start that again and again.
export function syncWatermarks(bands: Band[], area: { width: number; height: number }): void {
  const width = Math.max(1, Math.round(area.width));
  const height = Math.max(1, Math.round(area.height));
  let seen = false;
  for (const band of bands) {
    if (band.type !== "background") continue;
    for (let i = band.elements.length - 1; i >= 0; i--) {
      if (!isWatermark(band.elements[i])) continue;
      // Only the first one in the report is kept
      const first = !band.elements.slice(0, i).some(isWatermark) && !seen;
      if (!first) band.elements.splice(i, 1);
    }
    const image = band.elements.find(isWatermark) as ImageElement | undefined;
    if (!image || seen) continue;
    seen = true;
    const fixed: Partial<ImageElement> = {
      x: 0,
      y: 0,
      width,
      height,
      scaleType: "FillFrame",
      onErrorType: "Blank",
      mode: "Transparent",
    };
    for (const [key, value] of Object.entries(fixed) as [keyof ImageElement, never][]) {
      if (image[key] !== value) image[key] = value;
    }
    if ("printWhenExpression" in image) delete image.printWhenExpression;
    if ("box" in image) delete image.box;
    if (band.height < height) band.height = height;
  }
}

// ── Which pages ──

// The report's cover / contents settings (any report properties will do)
type PagesInput = Parameters<typeof specialPages>[0] | null;

// The printed pages before the first one that shows it
export function watermarkSkippedPages(setup: WatermarkSetup, special: SpecialPages): number {
  if (setup.pages === "normal") return special.count;
  if (setup.pages === "notCover") return special.cover ? 1 : 0;
  // Every page, a whole-sheet cover included (unlike the page border: a
  // watermark looks right on an edge-to-edge cover; checked in a fill)
  return 0;
}

// Its print-when in the JRXML (none: every page)
export function watermarkPrintWhen(setup: WatermarkSetup, properties: PagesInput): string | undefined {
  const skipped = watermarkSkippedPages(setup, specialPages(properties ?? undefined));
  return skipped > 0 ? afterSpecialPages(skipped) : undefined;
}

// Whether a designer page (0 = the first) shows it
export function watermarkOnPage(
  setup: WatermarkSetup,
  properties: PagesInput,
  pageIndex: number,
): boolean {
  return pageIndex >= watermarkSkippedPages(setup, specialPages(properties ?? undefined));
}

// The pages choice only matters with a cover or contents pages
export const hasSpecialPagesFor = (properties: PagesInput): boolean =>
  specialPages(properties ?? undefined).count > 0;
