// Page numbers ("Insert > Page Number"): a plain JasperReports text field whose
// expression and printWhenExpression are built from a format and a page range.
// The chosen settings are kept as JRXML properties on the text field, so the
// element keeps working as a page number after export and re-import.
//
// A range also sets where counting starts: with "Skip first page" page 1 has
// no number and page 2 is numbered 1; a custom range starts at 1 on its "From"
// page. Totals count only the numbered pages.

import type { DesignElement, TextFieldElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { DEFAULT_REPORT_FONT } from "@/config/fonts.config";

export type PaginationFormat = "simple" | "prefixed" | "pageXofY" | "slash";
export type PaginationRange = "all" | "skipFirst" | "skipFirstTwo" | "custom";

export interface PaginationSettings {
  format: PaginationFormat;
  range: PaginationRange;
  // Custom range: first and last numbered page (either may be left open)
  from?: number;
  to?: number;
}

export const PAGINATION_PROPERTY = "com.designer.pagination";
export const PAGINATION_FORMAT_PROPERTY = "com.designer.pagination.format";
export const PAGINATION_RANGE_PROPERTY = "com.designer.pagination.range";
export const PAGINATION_FROM_PROPERTY = "com.designer.pagination.from";
export const PAGINATION_TO_PROPERTY = "com.designer.pagination.to";

const PAGINATION_PROPERTIES = [
  PAGINATION_PROPERTY,
  PAGINATION_FORMAT_PROPERTY,
  PAGINATION_RANGE_PROPERTY,
  PAGINATION_FROM_PROPERTY,
  PAGINATION_TO_PROPERTY,
];

export const PAGINATION_RANGES: PaginationRange[] = ["all", "skipFirst", "skipFirstTwo", "custom"];

// $V{PAGE_COUNT} is the number of records on the page, not the number of pages.
// The total is only known once the whole report is filled, so the formats that
// show it are evaluated at "Master" time, where MASTER_CURRENT_PAGE and
// MASTER_TOTAL_PAGES hold this page's number and the page count.
// build() gets the page and total as expressions; sample() the same as text
// (also the format buttons' labels, with "N" for the total).
export const PAGINATION_FORMATS: Array<{
  id: PaginationFormat;
  usesTotal: boolean;
  sample: (page: number | string, total: number | string) => string;
  build: (page: string, total: string) => string;
}> = [
  {
    id: "simple",
    usesTotal: false,
    sample: (page) => `${page}`,
    build: (page) => `"" + ${page}`,
  },
  {
    id: "prefixed",
    usesTotal: false,
    sample: (page) => `Page ${page}`,
    build: (page) => `"Page " + ${page}`,
  },
  {
    id: "pageXofY",
    usesTotal: true,
    sample: (page, total) => `Page ${page} of ${total}`,
    build: (page, total) => `"Page " + ${page} + " of " + ${total}`,
  },
  {
    id: "slash",
    usesTotal: true,
    sample: (page, total) => `${page} / ${total}`,
    build: (page, total) => `${page} + " / " + ${total}`,
  },
];

const formatSpec = (format: PaginationFormat) =>
  PAGINATION_FORMATS.find((f) => f.id === format) ?? PAGINATION_FORMATS[0]!;

const evaluationTimeOf = (format: PaginationFormat) =>
  formatSpec(format).usesTotal ? "Master" : "Now";

type WithProperties = { properties?: Array<{ name?: string; value?: string }> };

const propertyValue = (element: WithProperties, name: string) =>
  element.properties?.find((p) => p?.name === name)?.value;

export function isPagination(element: unknown): boolean {
  if ((element as { type?: string } | undefined)?.type !== "textField") return false;
  return propertyValue(element as WithProperties, PAGINATION_PROPERTY) === "true";
}

const positiveInt = (value: unknown): number | undefined => {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isInteger(n) && n >= 1 ? n : undefined;
};

export function getPaginationSettings(element: WithProperties): PaginationSettings {
  const format = propertyValue(element, PAGINATION_FORMAT_PROPERTY);
  const range = propertyValue(element, PAGINATION_RANGE_PROPERTY);
  return {
    format: PAGINATION_FORMATS.some((f) => f.id === format)
      ? (format as PaginationFormat)
      : "simple",
    range: PAGINATION_RANGES.includes(range as PaginationRange)
      ? (range as PaginationRange)
      : "all",
    from: positiveInt(propertyValue(element, PAGINATION_FROM_PROPERTY)),
    to: positiveInt(propertyValue(element, PAGINATION_TO_PROPERTY)),
  };
}

// Formats that print the total page count
export function showsTotalPages(settings: PaginationSettings): boolean {
  return formatSpec(settings.format).usesTotal;
}

// First and last page that get a number (no last = to the end of the report)
export function getNumberedPages(settings: PaginationSettings): { first: number; last?: number } {
  switch (settings.range) {
    case "skipFirst":
      return { first: 2 };
    case "skipFirstTwo":
      return { first: 3 };
    case "custom":
      return { first: settings.from ?? 1, last: settings.to };
    default:
      return { first: 1 };
  }
}

const minus = (value: string, n: number) => (n > 0 ? `(${value} - ${n})` : value);

// textFieldExpression: counts from 1 on the first numbered page
export function buildPageNumberExpression(settings: PaginationSettings): string {
  const spec = formatSpec(settings.format);
  const { first, last } = getNumberedPages(settings);
  const offset = first - 1;
  const current = spec.usesTotal ? "$V{MASTER_CURRENT_PAGE}" : "$V{PAGE_NUMBER}";
  // A range that ends early ends the count there (or at the report's end)
  const lastPage = last ? `Math.min(${last}, $V{MASTER_TOTAL_PAGES})` : "$V{MASTER_TOTAL_PAGES}";
  return spec.build(minus(current, offset), minus(lastPage, offset));
}

// printWhenExpression: the numbered pages ("" = every page)
export function buildPageRangeExpression(settings: PaginationSettings): string {
  const { first, last } = getNumberedPages(settings);
  if (first > 1 && last) return `($V{PAGE_NUMBER} >= ${first}) && ($V{PAGE_NUMBER} <= ${last})`;
  if (last) return `$V{PAGE_NUMBER} <= ${last}`;
  if (first > 1) {
    return settings.range === "custom"
      ? `$V{PAGE_NUMBER} >= ${first}`
      : `$V{PAGE_NUMBER} > ${first - 1}`;
  }
  return "";
}

// Whether the page number is printed on the given page (canvas preview)
export function isPageInRange(settings: PaginationSettings, page: number): boolean {
  const { first, last } = getNumberedPages(settings);
  return page >= first && (!last || page <= last);
}

// Canvas preview of what the given page prints; null when it has no number.
// total is the designer's page count (the PDF's is known only when filled).
export function formatPageNumber(
  settings: PaginationSettings,
  page: number,
  total: number,
): string | null {
  if (!isPageInRange(settings, page)) return null;
  const { first, last } = getNumberedPages(settings);
  const lastPage = Math.min(last ?? Infinity, Math.max(total, page));
  return formatSpec(settings.format).sample(page - first + 1, lastPage - first + 1);
}

// What the first numbered page prints, for a design with fewer pages than
// the range skips (it is shown faded on page 1 so it can still be selected)
export function formatFirstPageNumber(settings: PaginationSettings, total: number): string {
  const { first, last } = getNumberedPages(settings);
  const count = Math.min(last ?? Infinity, Math.max(total, first)) - first + 1;
  return formatSpec(settings.format).sample(1, Math.max(1, count));
}

function writeSettings(element: TextFieldElement, settings: PaginationSettings): void {
  const others = (element.properties ?? []).filter(
    (p) => !PAGINATION_PROPERTIES.includes(p?.name ?? ""),
  );
  element.properties = [
    ...others,
    { name: PAGINATION_PROPERTY, value: "true" },
    { name: PAGINATION_FORMAT_PROPERTY, value: settings.format },
    { name: PAGINATION_RANGE_PROPERTY, value: settings.range },
    ...(settings.from ? [{ name: PAGINATION_FROM_PROPERTY, value: String(settings.from) }] : []),
    ...(settings.to ? [{ name: PAGINATION_TO_PROPERTY, value: String(settings.to) }] : []),
  ];
}

// Write the settings to the element: properties, expression, evaluation time and
// page range. Changes the element in place (the caller records the undo step).
export function applyPaginationSettings(
  element: TextFieldElement,
  settings: PaginationSettings,
): void {
  const custom = settings.range === "custom";
  const normalized: PaginationSettings = {
    format: formatSpec(settings.format).id,
    range: PAGINATION_RANGES.includes(settings.range) ? settings.range : "all",
    from: custom ? positiveInt(settings.from) : undefined,
    to: custom ? positiveInt(settings.to) : undefined,
  };
  writeSettings(element, normalized);
  element.expression = buildPageNumberExpression(normalized);
  element.evaluationTime = evaluationTimeOf(normalized.format);
  element.evaluationGroup = "";
  element.markup = "none";
  element.printWhenExpression = buildPageRangeExpression(normalized);
}

// ---------------------------------------------------------------------------
// Import. Our own page numbers are rebuilt from their properties, so the
// expressions always match the settings. A JRXML from another tool may hold a
// page number without them: a text field whose expression and page range are
// exactly what this designer writes becomes a page number; anything else is
// left alone.

const compact = (expr: string | undefined) => (expr ?? "").replace(/\s+/g, "");

function rangeFromExpression(
  printWhen: string | undefined,
): Omit<PaginationSettings, "format"> | null {
  const expr = compact(printWhen);
  if (!expr) return { range: "all" };
  if (expr === "$V{PAGE_NUMBER}>1") return { range: "skipFirst" };
  if (expr === "$V{PAGE_NUMBER}>2") return { range: "skipFirstTwo" };
  const both = expr.match(/^\(\$V\{PAGE_NUMBER\}>=(\d+)\)&&\(\$V\{PAGE_NUMBER\}<=(\d+)\)$/);
  if (both) return { range: "custom", from: Number(both[1]), to: Number(both[2]) };
  const from = expr.match(/^\$V\{PAGE_NUMBER\}>=(\d+)$/);
  if (from) return { range: "custom", from: Number(from[1]) };
  const to = expr.match(/^\$V\{PAGE_NUMBER\}<=(\d+)$/);
  if (to) return { range: "custom", to: Number(to[1]) };
  return null;
}

// Mark an imported text field as a page number when it is one; returns whether it is
export function detectPagination(element: TextFieldElement): boolean {
  if (element.type !== "textField") return false;
  if (isPagination(element)) {
    applyPaginationSettings(element, getPaginationSettings(element));
    return true;
  }
  const range = rangeFromExpression(element.printWhenExpression);
  if (!range) return false;
  const expr = compact(element.expression);
  const time = element.evaluationTime || "Now";
  let format = PAGINATION_FORMATS.find(
    (f) =>
      evaluationTimeOf(f.id) === time &&
      compact(buildPageNumberExpression({ format: f.id, ...range })) === expr,
  )?.id;
  if (!format && range.range === "all" && time === "Now" && expr === "$V{PAGE_NUMBER}") {
    format = "simple";
  }
  if (!format) return false;
  writeSettings(element, { format, ...range });
  return true;
}

// ---------------------------------------------------------------------------
// Library: one "Page Number" tile. Clicking it offers these positions; dragging
// it drops a centred page number wherever it is released.

export const PAGE_NUMBER_TYPE = "pageNumber";

export const PAGINATION_POSITIONS = [
  { id: "topRight", edge: "top", align: "Right" },
  { id: "bottomRight", edge: "bottom", align: "Right" },
  { id: "bottomCenter", edge: "bottom", align: "Center" },
] as const;

export type PaginationPosition = (typeof PAGINATION_POSITIONS)[number]["id"];

const positionOf = (position: PaginationPosition) =>
  PAGINATION_POSITIONS.find((p) => p.id === position)!;

// Format of a new page number
const DEFAULT_SETTINGS: PaginationSettings = { format: "prefixed", range: "all" };

export const PAGE_NUMBER_SIZE = { width: 120, height: 20 };

export interface PaginationFont {
  fontFamily?: string;
  fontSize?: number;
}

// A new page number at the band's top-left (placePaginationInBand moves it to a
// position); without a position (dragged in) its text is centred
export function buildPaginationElement(
  position?: PaginationPosition,
  font: PaginationFont = {},
): TextFieldElement {
  const align = position ? positionOf(position).align : "Center";
  const element = createElement("textField", {
    uuid: crypto.randomUUID(),
    x: 0,
    y: 0,
    width: PAGE_NUMBER_SIZE.width,
    height: PAGE_NUMBER_SIZE.height,
    fontFamily: font.fontFamily || DEFAULT_REPORT_FONT,
    fontSize: Math.min(font.fontSize || 10, 10),
    isBold: false,
    isItalic: false,
    isUnderline: false,
    pattern: "",
    isBlankWhenNull: false,
    textAlignment: align,
    verticalAlignment: "Middle",
  } as Partial<DesignElement>) as TextFieldElement;
  applyPaginationSettings(element, DEFAULT_SETTINGS);
  return element;
}

// The band a position goes to: the page header (or title, or the first band) for
// the top, the page footer (or last page footer, or the last band) for the bottom
export function findPaginationTargetBand(
  bands: Array<{ type: string }>,
  position: PaginationPosition,
): number {
  const usable = bands
    .map((band, index) => ({ type: band.type, index }))
    .filter((b) => b.type !== "background" && b.type !== "noData");
  const byType = (t: string) => usable.find((b) => b.type === t)?.index;
  if (positionOf(position).edge === "top") {
    return byType("pageHeader") ?? usable[0]?.index ?? -1;
  }
  return (
    byType("pageFooter") ?? byType("lastPageFooter") ?? usable[usable.length - 1]?.index ?? -1
  );
}

// x / y of a position inside a band of the given printable width and height
export function placePaginationInBand(
  element: { width: number; height: number },
  position: PaginationPosition,
  bandWidth: number,
  bandHeight: number,
): { x: number; y: number } {
  const x =
    positionOf(position).align === "Center"
      ? (bandWidth - element.width) / 2
      : bandWidth - element.width;
  const y = (bandHeight - element.height) / 2;
  return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
}
