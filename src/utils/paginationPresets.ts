// Page numbers ("Insert > Page Number"): a plain JasperReports text field whose
// expression and printWhenExpression are built from a format and a page range.
// The chosen settings are kept as JRXML properties on the text field, so the
// element keeps working as a page number after export and re-import.
//
// A range also sets where counting starts: with "Skip first page" page 1 has
// no number and page 2 is numbered 1; a custom range starts at 1 on its "From"
// page. Totals count only the numbered pages.
//
// A custom range is one or more groups of pages (1-10, 12-21); each group is
// numbered from 1 with its own total, and pages outside the groups have no
// number. Groups never overlap: a group's empty "To" runs to the page before
// the next group (the last one's to the end of the report).
//
// A custom range can leave out pages inside it ("except 3, 5, 8-10"): no
// number prints there. Except pages exist only in a custom range and always
// lie inside From–To, so the two settings can't contradict each other.
// Hidden pages either still count (page 4 after a hidden page 3 shows 4:
// "keep") or don't (page 4 shows 3, and the total is smaller: "skip").

import type { DesignElement, TextFieldElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { DEFAULT_REPORT_FONT } from "@/config/fonts.config";

export type PaginationFormat = "simple" | "prefixed" | "pageXofY" | "slash";
export type PaginationRange = "all" | "skipFirst" | "skipFirstTwo" | "custom";
export type HiddenNumbering = "keep" | "skip";
// 1, 2, 3 / i, ii, iii / I, II, III / A, B, C
export type NumberStyle = "arabic" | "romanLower" | "romanUpper" | "letters";
// Groups each start again at the first number, or carry the count on
export type GroupNumbering = "restart" | "continue";

export const NUMBER_STYLES: NumberStyle[] = ["arabic", "romanLower", "romanUpper", "letters"];

// A group of numbered pages ("Part" in the panel); no "to" = up to the next
// group or the end. With several groups each may have its own look (text
// and number style); without one it uses the page number's.
export interface PageGroup {
  from: number;
  to?: number;
  format?: PaginationFormat;
  numberStyle?: NumberStyle;
}

export interface PaginationSettings {
  format: PaginationFormat;
  range: PaginationRange;
  // Custom range: first and last numbered page of the first group (either may be left open)
  from?: number;
  to?: number;
  // Custom range: every group, the first one being from/to (one group when absent)
  groups?: PageGroup[];
  // Pages with no number, sorted, no repeats
  hidden?: number[];
  // Whether hidden pages still count ("keep", the default) or not ("skip")
  hiddenNumbering?: HiddenNumbering;
  numberStyle?: NumberStyle;
  // Several groups: each starts again ("restart", the default) or the count goes on
  groupNumbering?: GroupNumbering;
}

export const PAGINATION_PROPERTY = "com.designer.pagination";
export const PAGINATION_FORMAT_PROPERTY = "com.designer.pagination.format";
export const PAGINATION_RANGE_PROPERTY = "com.designer.pagination.range";
export const PAGINATION_FROM_PROPERTY = "com.designer.pagination.from";
export const PAGINATION_TO_PROPERTY = "com.designer.pagination.to";
// "1-10,12-21:slash:romanLower,30-" (only with more than one group; a
// group's own look after colons)
export const PAGINATION_GROUPS_PROPERTY = "com.designer.pagination.groups";
// "3,5,8-10"
export const PAGINATION_HIDDEN_PROPERTY = "com.designer.pagination.hidden";
export const PAGINATION_HIDDEN_NUMBERING_PROPERTY = "com.designer.pagination.hiddenNumbering";
export const PAGINATION_NUMBER_STYLE_PROPERTY = "com.designer.pagination.numberStyle";
export const PAGINATION_GROUP_NUMBERING_PROPERTY = "com.designer.pagination.groupNumbering";

const PAGINATION_PROPERTIES = [
  PAGINATION_PROPERTY,
  PAGINATION_FORMAT_PROPERTY,
  PAGINATION_RANGE_PROPERTY,
  PAGINATION_FROM_PROPERTY,
  PAGINATION_TO_PROPERTY,
  PAGINATION_GROUPS_PROPERTY,
  PAGINATION_HIDDEN_PROPERTY,
  PAGINATION_HIDDEN_NUMBERING_PROPERTY,
  PAGINATION_NUMBER_STYLE_PROPERTY,
  PAGINATION_GROUP_NUMBERING_PROPERTY,
];

// ---------------------------------------------------------------------------
// Number styles

// Roman numerals up to here, letters up to ZZ; larger numbers print as digits
const ROMAN_LIMIT = 300;
const LETTERS_LIMIT = 702;

function toRoman(n: number): string {
  const parts: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [value, symbol] of parts) {
    while (n >= value) {
      out += symbol;
      n -= value;
    }
  }
  return out;
}

const toLetters = (n: number) =>
  n <= 26 ? String.fromCharCode(64 + n) : String.fromCharCode(64 + Math.floor((n - 1) / 26)) + String.fromCharCode(65 + ((n - 1) % 26));

// A number in a style, as the canvas shows it
export function styleNumber(n: number, style: NumberStyle = "arabic"): string {
  if (style === "romanLower" || style === "romanUpper") {
    if (n < 1 || n > ROMAN_LIMIT) return String(n);
    const roman = toRoman(n);
    return style === "romanLower" ? roman.toLowerCase() : roman;
  }
  if (style === "letters") return n >= 1 && n <= LETTERS_LIMIT ? toLetters(n) : String(n);
  return String(n);
}

// The same in the report (a Java expression for a number expression).
// Roman numerals come from a list (Java has no built-in for them).
function styleExpression(value: string, style: NumberStyle = "arabic"): string {
  if (style === "arabic") return value;
  const v = `(${value})`;
  if (style === "letters") {
    return `(${v} >= 1 && ${v} <= ${LETTERS_LIMIT} ? (${v} <= 26 ? String.valueOf((char) (64 + ${v})) : "" + (char) (64 + (${v} - 1) / 26) + (char) (65 + (${v} - 1) % 26)) : String.valueOf(${v}))`;
  }
  const list = Array.from({ length: ROMAN_LIMIT + 1 }, (_, i) => `"${i ? styleNumber(i, style) : ""}"`).join(",");
  return `(${v} >= 1 && ${v} <= ${ROMAN_LIMIT} ? new String[]{${list}}[${v}] : String.valueOf(${v}))`;
}

// ---------------------------------------------------------------------------
// Hidden pages, typed as "3, 5, 8-10"

// Highest page number accepted, and most pages hidden at once
const MAX_PAGE = 9999;
const MAX_HIDDEN_PAGES = 500;

// The pages in a list like "3, 5, 8-10" (also "8 - 10", "8–10", "10-8"), and
// the parts that aren't page numbers
export function parsePageList(text: string): { pages: number[]; unreadable: string[] } {
  const pages = new Set<number>();
  const unreadable: string[] = [];
  // "8 – 10" → "8-10", then split on commas, semicolons and spaces
  const normalized = text.replace(/[–—]/g, "-").replace(/\s*-\s*/g, "-");
  for (const part of normalized.split(/[\s,;]+/)) {
    if (!part) continue;
    const range = part.match(/^(\d+)-(\d+)$/);
    const single = part.match(/^\d+$/);
    if (!range && !single) {
      unreadable.push(part);
      continue;
    }
    let a = Number(range ? range[1] : part);
    let b = Number(range ? range[2] : part);
    if (a > b) [a, b] = [b, a];
    if (a < 1 || b > MAX_PAGE) {
      unreadable.push(part);
      continue;
    }
    for (let p = a; p <= b && pages.size < MAX_HIDDEN_PAGES; p++) pages.add(p);
  }
  return { pages: [...pages].sort((x, y) => x - y), unreadable };
}

// Runs of following pages: [3,5,8,9,10] → [[3,3],[5,5],[8,10]]
export function pageRuns(pages: number[] | undefined): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  for (const p of pages ?? []) {
    const last = runs[runs.length - 1];
    if (last && p === last[1] + 1) last[1] = p;
    else runs.push([p, p]);
  }
  return runs;
}

// "3, 5, 8-10"
export function formatPageList(pages: number[] | undefined): string {
  return pageRuns(pages)
    .map(([a, b]) => (a === b ? String(a) : `${a}-${b}`))
    .join(", ");
}

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
  return normalizeSettings({
    format: PAGINATION_FORMATS.some((f) => f.id === format)
      ? (format as PaginationFormat)
      : "simple",
    range: PAGINATION_RANGES.includes(range as PaginationRange)
      ? (range as PaginationRange)
      : "all",
    from: positiveInt(propertyValue(element, PAGINATION_FROM_PROPERTY)),
    to: positiveInt(propertyValue(element, PAGINATION_TO_PROPERTY)),
    groups: parseGroups(propertyValue(element, PAGINATION_GROUPS_PROPERTY)),
    hidden: parsePageList(propertyValue(element, PAGINATION_HIDDEN_PROPERTY) ?? "").pages,
    hiddenNumbering: propertyValue(element, PAGINATION_HIDDEN_NUMBERING_PROPERTY) === "skip" ? "skip" : "keep",
    numberStyle: propertyValue(element, PAGINATION_NUMBER_STYLE_PROPERTY) as NumberStyle,
    groupNumbering: propertyValue(element, PAGINATION_GROUP_NUMBERING_PROPERTY) === "continue" ? "continue" : "restart",
  });
}

// "1-10,12-21,30-" → groups (undefined when there's nothing to read)
function parseGroups(value: string | undefined): PageGroup[] | undefined {
  const groups = (value ?? "")
    .split(",")
    .map((part) => part.trim().match(/^(\d+)(?:-(\d*))?(?::(\w*))?(?::(\w*))?$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({
      from: Number(m[1]),
      to: positiveInt(m[2]),
      ...(PAGINATION_FORMATS.some((f) => f.id === m[3]) ? { format: m[3] as PaginationFormat } : {}),
      ...(NUMBER_STYLES.includes(m[4] as NumberStyle) ? { numberStyle: m[4] as NumberStyle } : {}),
    }))
    .filter((g) => g.from >= 1);
  return groups.length ? groups : undefined;
}

const formatGroups = (groups: PageGroup[]) =>
  groups
    .map((g) => `${g.from}-${g.to ?? ""}${g.format || g.numberStyle ? `:${g.format ?? ""}:${g.numberStyle ?? ""}` : ""}`)
    .join(",");

// Groups in page order without overlaps: a group starting inside the one
// before it starts after it instead (and is dropped if nothing is left)
function tidyGroups(groups: PageGroup[]): PageGroup[] {
  const sorted = groups
    .map((g) => ({ ...g, from: positiveInt(g.from) ?? 1, to: positiveInt(g.to) }))
    .sort((a, b) => a.from - b.from);
  const out: PageGroup[] = [];
  for (const g of sorted) {
    const prev = out[out.length - 1];
    if (prev && prev.to === undefined) prev.to = g.from - 1;
    if (prev && prev.to !== undefined && g.from <= prev.to) g.from = prev.to + 1;
    if (prev && g.to !== undefined && g.to < g.from) continue;
    out.push(g);
  }
  return out;
}

// Except pages and page groups belong to a custom range: a preset range with
// except pages becomes the same custom range ("Skip first page" → From 2).
// Groups are put in order without overlaps, and except pages outside every
// group are dropped (they have no number anyway).
function normalizeSettings(settings: PaginationSettings): PaginationSettings {
  const format = formatSpec(settings.format).id;
  let range: PaginationRange = PAGINATION_RANGES.includes(settings.range) ? settings.range : "all";
  const hidden = parsePageList(formatPageList(settings.hidden)).pages;
  let groups: PageGroup[] = settings.groups?.length
    ? settings.groups
    : [{ from: positiveInt(settings.from) ?? 1, to: positiveInt(settings.to) }];
  if (hidden.length && range !== "custom") {
    groups = [{ from: presetFirst(range) }];
    range = "custom";
  }
  // How numbers look; only non-default values are kept
  const numberStyle = NUMBER_STYLES.includes(settings.numberStyle as NumberStyle) ? settings.numberStyle : undefined;
  const look: Partial<PaginationSettings> = {
    ...(numberStyle && numberStyle !== "arabic" ? { numberStyle } : {}),
  };
  if (range !== "custom") return { format, range, ...look };
  // One group may still have From after To while it's being typed: kept, it
  // numbers nothing. A single group uses the page number's own look.
  groups = groups.length > 1 ? tidyGroups(groups) : groups.map((g) => ({ from: g.from, to: g.to }));
  const first = groups[0]!;
  const next: PaginationSettings = {
    format,
    range,
    ...look,
    ...(groups.length > 1 && settings.groupNumbering === "continue" ? { groupNumbering: "continue" as const } : {}),
    from: first.from === 1 && settings.from === undefined ? undefined : first.from,
    to: first.to,
    groups: groups.length > 1 ? groups : undefined,
  };
  const inside = hidden.filter((p) => groupOf(next, p));
  if (inside.length) {
    next.hidden = inside;
    next.hiddenNumbering = settings.hiddenNumbering === "skip" ? "skip" : "keep";
  }
  return next;
}

// The numbered groups with their real ends: an open "To" runs to the page
// before the next group; only the last one may run to the end of the report
export function pageGroups(settings: PaginationSettings): PageGroup[] {
  if (settings.range !== "custom") return [{ from: presetFirst(settings.range) }];
  const groups = settings.groups?.length ? settings.groups : [{ from: settings.from ?? 1, to: settings.to }];
  return groups.map((g, i) => ({ ...g, to: g.to ?? (groups[i + 1] ? groups[i + 1]!.from - 1 : undefined) }));
}

// The text and number style a group prints with
export const groupFormat = (settings: PaginationSettings, group: PageGroup) => group.format ?? settings.format;
export const groupStyle = (settings: PaginationSettings, group: PageGroup) => group.numberStyle ?? settings.numberStyle;

const presetFirst = (range: PaginationRange) => (range === "skipFirst" ? 2 : range === "skipFirstTwo" ? 3 : 1);

// The group a page is in, if any
function groupOf(settings: PaginationSettings, page: number): PageGroup | undefined {
  return pageGroups(settings).find((g) => page >= g.from && (g.to === undefined || page <= g.to));
}

// Except pages that would fall outside every group (they need no hiding)
export function pagesOutsideRange(settings: PaginationSettings, pages: number[]): number[] {
  return pages.filter((p) => !groupOf(settings, p));
}

// Formats that print the total page count
export function showsTotalPages(settings: PaginationSettings): boolean {
  return [settings.format, ...pageGroups(settings).map((g) => g.format)].some((f) => f && formatSpec(f).usesTotal);
}

// First and last page that get a number (no last = to the end of the report)
export function getNumberedPages(settings: PaginationSettings): { first: number; last?: number } {
  const groups = pageGroups(settings);
  return { first: groups[0]!.from, last: groups[groups.length - 1]!.to };
}

const minus = (value: string, n: number) => (n > 0 ? `(${value} - ${n})` : value);

// Except pages a group leaves out of its count: only when they are skipped
function skippedRuns(settings: PaginationSettings, group: PageGroup): Array<[number, number]> {
  if (settings.hiddenNumbering !== "skip") return [];
  return pageRuns(settings.hidden)
    .map(([a, b]): [number, number] => [Math.max(a, group.from), group.to ? Math.min(b, group.to) : b])
    .filter(([a, b]) => a <= b);
}

// Java: how many skipped pages are at or before `page` (an expression)
const skippedUpTo = (runs: Array<[number, number]>, page: string) =>
  runs.map(([a, b]) => `Math.max(0, Math.min(${page}, ${b}) - ${a} + 1)`).join(" + ");

const minusSkipped = (value: string, runs: Array<[number, number]>, page: string) =>
  runs.length ? `(${value} - (${skippedUpTo(runs, page)}))` : value;

// Numbered pages of a group up to page `upTo` (pages before it and skipped
// except pages don't count)
function countInGroup(settings: PaginationSettings, group: PageGroup, upTo: number): number {
  const end = Math.min(upTo, group.to ?? Infinity);
  const skipped = skippedRuns(settings, group).reduce((n, [a, b]) => n + Math.max(0, Math.min(end, b) - a + 1), 0);
  return Math.max(0, end - group.from + 1 - skipped);
}

const continues = (settings: PaginationSettings, groups: PageGroup[]) =>
  settings.groupNumbering === "continue" && groups.length > 1;

// textFieldExpression: each group counts from the first number on its first
// page with its own total, or the count goes on across groups; skipped
// except pages are left out of the number and the total
export function buildPageNumberExpression(settings: PaginationSettings): string {
  // Any total in any group: everything is worked out when the report is complete
  const current = showsTotalPages(settings) ? "$V{MASTER_CURRENT_PAGE}" : "$V{PAGE_NUMBER}";
  const total = "$V{MASTER_TOTAL_PAGES}";
  const groups = pageGroups(settings);
  const shownIn = (group: PageGroup) => (value: string) => styleExpression(value, groupStyle(settings, group));
  // Pages counted in a group up to a page expression
  const counted = (group: PageGroup, upTo: string) =>
    minusSkipped(minus(upTo, group.from - 1), skippedRuns(settings, group), upTo);
  // A group that ends early ends its count there (or at the report's end)
  const groupEnd = (group: PageGroup) => (group.to ? `Math.min(${group.to}, ${total})` : total);
  const carryOn = continues(settings, groups);
  // Continuing: every group's pages, the report may end before a group starts
  const allPages = groups.map((g) => `Math.max(0, ${counted(g, groupEnd(g))})`).join(" + ");
  const piece = (group: PageGroup, index: number) => {
    // Earlier groups lie wholly before this page: their count is a constant
    const before = carryOn ? groups.slice(0, index).reduce((n, g) => n + countInGroup(settings, g, g.to!), 0) : 0;
    const number = counted(group, current);
    const shown = shownIn(group);
    return formatSpec(groupFormat(settings, group)).build(
      shown(before ? `(${number} + ${before})` : number),
      shown(carryOn ? `(${allPages})` : counted(group, groupEnd(group))),
    );
  };
  // Several groups: the page picks its group ("page <= 10 ? group 1 : …")
  return groups
    .slice(0, -1)
    .reduceRight(
      (rest, group, i) => `(${current} <= ${group.to}) ? (${piece(group, i)}) : (${rest})`,
      piece(groups[groups.length - 1]!, groups.length - 1),
    );
}

// printWhenExpression: the numbered pages, without the except pages ("" = every page)
export function buildPageRangeExpression(settings: PaginationSettings): string {
  const p = "$V{PAGE_NUMBER}";
  const groups = pageGroups(settings);
  const span = ({ from, to }: PageGroup, preset = false): string => {
    if (from > 1 && to) return `(${p} >= ${from}) && (${p} <= ${to})`;
    if (to) return `${p} <= ${to}`;
    if (from > 1) return preset ? `${p} > ${from - 1}` : `${p} >= ${from}`;
    return "";
  };
  const range =
    groups.length === 1 ? span(groups[0]!, settings.range !== "custom") : groups.map((g) => `(${span(g) || "true"})`).join(" || ");
  const runs = pageRuns(settings.hidden);
  if (!runs.length) return range;
  const hidden = runs.map(([a, b]) => (a === b ? `${p} == ${a}` : `(${p} >= ${a} && ${p} <= ${b})`)).join(" || ");
  return range ? `(${range}) && !(${hidden})` : `!(${hidden})`;
}

export const isHiddenPage = (settings: PaginationSettings, page: number): boolean =>
  !!settings.hidden?.includes(page);

// Whether the page number is printed on the given page (canvas preview)
export function isPageInRange(settings: PaginationSettings, page: number): boolean {
  return !!groupOf(settings, page) && !isHiddenPage(settings, page);
}

// Canvas preview of what the given page prints; null when it has no number.
// total is the designer's page count (the PDF's is known only when filled).
export function formatPageNumber(
  settings: PaginationSettings,
  page: number,
  total: number,
): string | null {
  const group = groupOf(settings, page);
  if (!group || isHiddenPage(settings, page)) return null;
  const groups = pageGroups(settings);
  const index = groups.findIndex((g) => g.from === group.from);
  const lastPage = Math.max(total, page);
  let number = countInGroup(settings, group, page);
  let count = countInGroup(settings, group, lastPage);
  if (continues(settings, groups)) {
    number += groups.slice(0, index).reduce((n, g) => n + countInGroup(settings, g, g.to!), 0);
    count = groups.reduce((n, g) => n + countInGroup(settings, g, lastPage), 0);
  }
  const style = groupStyle(settings, group);
  return formatSpec(groupFormat(settings, group)).sample(styleNumber(number, style), styleNumber(Math.max(number, count), style));
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
    ...(settings.groups && settings.groups.length > 1
      ? [{ name: PAGINATION_GROUPS_PROPERTY, value: formatGroups(settings.groups) }]
      : []),
    ...(settings.numberStyle ? [{ name: PAGINATION_NUMBER_STYLE_PROPERTY, value: settings.numberStyle }] : []),
    ...(settings.groupNumbering ? [{ name: PAGINATION_GROUP_NUMBERING_PROPERTY, value: settings.groupNumbering }] : []),
    ...(settings.hidden?.length
      ? [
          { name: PAGINATION_HIDDEN_PROPERTY, value: formatPageList(settings.hidden).replace(/\s/g, "") },
          { name: PAGINATION_HIDDEN_NUMBERING_PROPERTY, value: settings.hiddenNumbering ?? "keep" },
        ]
      : []),
  ];
}

// Write the settings to the element: properties, expression, evaluation time and
// page range. Changes the element in place (the caller records the undo step).
export function applyPaginationSettings(
  element: TextFieldElement,
  settings: PaginationSettings,
): void {
  const normalized = normalizeSettings(settings);
  writeSettings(element, normalized);
  element.expression = buildPageNumberExpression(normalized);
  element.evaluationTime = showsTotalPages(normalized) ? "Master" : "Now";
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

// Space kept between a right-hand page number and the page's edge
const PAGE_NUMBER_EDGE_GAP = 12;

// x / y of a position inside a band of the given printable width and height
export function placePaginationInBand(
  element: { width: number; height: number },
  position: PaginationPosition,
  bandWidth: number,
  bandHeight: number,
): { x: number; y: number } {
  // On the right it keeps clear of the page's edge (and a page border's line,
  // which the report checks flag within 8 px), as printed page numbers do
  const x =
    positionOf(position).align === "Center"
      ? (bandWidth - element.width) / 2
      : bandWidth - element.width - PAGE_NUMBER_EDGE_GAP;
  const y = (bandHeight - element.height) / 2;
  return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) };
}
