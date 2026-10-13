// Cover page and contents pages: the pages at the front of a report that have
// no shared sections (page header, column header, column footer, page footer)
// and use the whole printable page.
//
// In the designer they are ordinary pages of the Detail band (elements with a
// pageIndex): the cover is page 0 when there is one, the contents pages follow.
// In the JRXML:
// - the cover is the <title> band, on a page of its own (isTitleNewPage)
// - each contents page is a frame in the <background> band printed only on its
//   page ($V{PAGE_NUMBER} == n), with an empty Detail band holding its place
// - the shared bands and the other background items print only after them
// Checked in a JasperReports fill: every page in the right place, no shared
// band on the cover or contents pages.

import type { DesignElement, ReportProperties } from "@/types";
import { isPagination } from "./paginationPresets";

// Report property: {"cover":true,"contents":2,"countPages":false} (defaults left out)
export const SPECIAL_PAGES_PROPERTY = "com.cdp.specialPages";
// On the background frame holding a contents page: its number (1, 2…)
export const CONTENTS_PAGE_PROPERTY = "com.cdp.contentsPage";

export type PageKind = "cover" | "contents" | "normal";

type SpecialPageProps =
  | Pick<ReportProperties, "coverPage" | "contentsPages" | "countSpecialPages" | "fullPageCover">
  | undefined;

export interface SpecialPages {
  cover: boolean;
  contents: number;
  // Pages before the first normal page
  count: number;
  // Whether page numbers count the cover and contents pages (default yes)
  countPages: boolean;
  // The cover uses the whole sheet, edge to edge (no margins)
  fullPageCover: boolean;
}

export function specialPages(p: SpecialPageProps): SpecialPages {
  const cover = !!p?.coverPage;
  const contents = Math.max(0, Math.floor(p?.contentsPages ?? 0));
  return {
    cover,
    contents,
    count: (cover ? 1 : 0) + contents,
    countPages: p?.countSpecialPages !== false,
    fullPageCover: cover && !!p?.fullPageCover,
  };
}

export function pageKind(p: SpecialPageProps, pageIndex: number | undefined): PageKind {
  const { cover, count } = specialPages(p);
  const page = pageIndex ?? 0;
  if (cover && page === 0) return "cover";
  return page < count ? "contents" : "normal";
}

export const isSpecialPage = (p: SpecialPageProps, pageIndex: number | undefined) =>
  pageKind(p, pageIndex) !== "normal";

// 1 for the first contents page
export const contentsPageNumber = (p: SpecialPageProps, pageIndex: number) =>
  pageIndex - (specialPages(p).cover ? 1 : 0) + 1;

// The design area of a cover / contents page (null for a normal page): the
// whole sheet for a whole-sheet cover, else the printable page. A whole-sheet
// cover's elements are placed from the sheet's top-left corner.
type PageSizeProps = SpecialPageProps &
  Pick<ReportProperties, "pageWidth" | "pageHeight" | "leftMargin" | "rightMargin" | "topMargin" | "bottomMargin">;

export function specialPageArea(p: PageSizeProps | undefined, pageIndex: number | undefined) {
  if (!p) return null;
  const kind = pageKind(p, pageIndex);
  if (kind === "normal") return null;
  if (kind === "cover" && specialPages(p).fullPageCover) {
    return { width: p.pageWidth, height: p.pageHeight, sheet: true };
  }
  return {
    width: p.pageWidth - (p.leftMargin || 0) - (p.rightMargin || 0),
    height: p.pageHeight - (p.topMargin || 0) - (p.bottomMargin || 0),
    sheet: false,
  };
}

// What can't go on a cover or contents page: page numbers (the shared sections
// carry them), project-data tables (they grow over pages); and on the cover, a
// contents list. `kind`: the page it would go on (normal pages take anything).
export type SpecialPageProblem = "pageNumber" | "dataTable" | "contentsList";

export function specialPageProblem(
  element: { type: string } | null | undefined,
  kind: PageKind = "contents",
): SpecialPageProblem | null {
  if (!element || kind === "normal") return null;
  if (element.type === "table") return "dataTable";
  if (element.type === "textField" && isPagination(element)) return "pageNumber";
  if (element.type === "contentsList" && kind === "cover") return "contentsList";
  if (element.type === "frame") {
    for (const child of (element as { elements?: DesignElement[] }).elements ?? []) {
      const problem = specialPageProblem(child, kind);
      if (problem) return problem;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Moving pages: elements of pages from `from` on move by `delta` pages

export function shiftPages(elements: DesignElement[], from: number, delta: number): void {
  for (const el of elements) {
    const page = el.pageIndex ?? 0;
    if (page >= from) el.pageIndex = page + delta;
  }
}

// ---------------------------------------------------------------------------
// JRXML expressions

// Shared bands and the other background items: only after the special pages
export const afterSpecialPages = (count: number) => `$V{PAGE_NUMBER} > ${count}`;
export const onlyOnPage = (page: number) => `$V{PAGE_NUMBER} == ${page}`;

const GUARD = /^\$V\{PAGE_NUMBER\} > \d+$/;
const GUARDED = /^\(\$V\{PAGE_NUMBER\} > \d+\) && \(\(java\.lang\.Boolean\)\(([\s\S]*)\)\)\.booleanValue\(\)$/;

// An element's own print-when, kept off the special pages
export function guardPrintWhen(count: number, own: string | undefined): string {
  if (!own?.trim()) return afterSpecialPages(count);
  return `(${afterSpecialPages(count)}) && ((java.lang.Boolean)(${own})).booleanValue()`;
}

// The element's own print-when back from what guardPrintWhen wrote
export function unguardPrintWhen(expression: string | undefined): string | undefined {
  if (!expression) return expression;
  const text = expression.trim();
  if (GUARD.test(text)) return "";
  const own = text.match(GUARDED);
  return own ? own[1] : expression;
}

// Page numbers that don't count the special pages: every page variable less `n`
export function shiftPageNumberExpression(expression: string | undefined, n: number): string | undefined {
  if (!expression || n <= 0) return expression;
  return expression.replace(
    /\$V\{(PAGE_NUMBER|MASTER_CURRENT_PAGE|MASTER_TOTAL_PAGES)\}/g,
    (variable) => `(${variable} - ${n})`,
  );
}

// A page number (also inside a box) written with shifted numbers
export function shiftPageNumbers<T extends DesignElement>(element: T, n: number): T {
  if (n <= 0) return element;
  if (element.type === "textField" && isPagination(element)) {
    return {
      ...element,
      expression: shiftPageNumberExpression(element.expression, n),
      printWhenExpression: shiftPageNumberExpression(element.printWhenExpression, n),
    };
  }
  if (element.type === "frame" && element.elements?.length) {
    return { ...element, elements: element.elements.map((child) => shiftPageNumbers(child, n)) };
  }
  return element;
}

// ---------------------------------------------------------------------------
// The report property

// With a whole-sheet cover the report's bottom margin is written as 0 (an
// element can't reach below its band), so the real one is kept here
export function serializeSpecialPages(
  p: SpecialPageProps & { bottomMargin?: number },
): string | null {
  const { cover, contents, countPages, fullPageCover } = specialPages(p);
  if (!cover && !contents && countPages) return null;
  return JSON.stringify({
    ...(cover ? { cover: true } : {}),
    ...(contents ? { contents } : {}),
    ...(countPages ? {} : { countPages: false }),
    ...(fullPageCover ? { fullPage: true, bottomMargin: p?.bottomMargin || 0 } : {}),
  });
}

export function parseSpecialPages(value: string | null | undefined): Partial<ReportProperties> {
  if (!value) return {};
  try {
    const raw = JSON.parse(value);
    const out: Partial<ReportProperties> = {};
    if (raw?.cover === true) out.coverPage = true;
    if (Number.isInteger(raw?.contents) && raw.contents > 0) out.contentsPages = Math.min(raw.contents, 50);
    if (raw?.countPages === false) out.countSpecialPages = false;
    if (raw?.fullPage === true) {
      out.fullPageCover = true;
      if (Number.isFinite(raw.bottomMargin) && raw.bottomMargin >= 0) out.bottomMargin = raw.bottomMargin;
    }
    return out;
  } catch {
    return {};
  }
}
