// The words a Text element shows on the canvas: a page number's text, a
// Date's date, a linked project detail's value, a Location's address, or the
// typed text without its quotes. The canvas draws it (TextFieldElement.vue)
// and "Fit to text" measures it (PDFDesigner.vue), so the two always agree;
// measuring the expression instead fitted "$P{cdp_project_name}", not the name.

import { resolveLegacyDateSample } from "./autoDate";
import { isRichTextElement } from "./elementUtils";
import { dateText, getDateSetup, isDateElement } from "./dateElement";
import { isLocationAddress } from "./location/locationElement";
import { formatPageNumber, getPaginationSettings, isPagination } from "./paginationPresets";
import { getProjectValueLink, isProjectValue, linkShownText } from "./projectValue";
import type { TextFieldElement } from "@/types";

export interface CanvasTextPages {
  // The page number a page number element shows here, and the page count
  // (already less the cover and contents pages when they aren't counted)
  numberPage?: number;
  numberPageCount?: number;
  // The design page it is drawn on, for $V{PAGE_NUMBER} written by other tools
  designPage?: number;
  designPageCount?: number;
}

// A text written by another tool that uses $V{PAGE_NUMBER}: "Page " + n + " of " + total
function evaluatePageExpression(expression: string, page: number, pageCount: number): string {
  const pNum = String(page);
  const totalP = String(pageCount || page);
  if (expression.trim() === "$V{PAGE_NUMBER}") return pNum;
  let evaluated = expression;
  if (evaluated.includes('" of "') || evaluated.includes('" / "') || evaluated.includes('"/"')) {
    let count = 0;
    evaluated = evaluated.replace(/\$V\{PAGE_NUMBER\}/g, () => {
      count++;
      return count === 1 ? pNum : totalP;
    });
  } else {
    evaluated = evaluated.replace(/\$V\{PAGE_NUMBER\}/g, pNum);
  }
  evaluated = evaluated
    .replace(/"\s*\+\s*/g, "")
    .replace(/\s*\+\s*"/g, "")
    .replace(/\s*\+\s*/g, " ")
    .replace(/^"|"$/g, "");
  return evaluated.replace(/\\n/g, "\n");
}

// Whether the canvas draws the text as formatting (bold, lists…) from its HTML;
// page numbers, dates, linked details and addresses are always plain words
export function canvasShowsHtml(element: TextFieldElement): boolean {
  return (
    !isPagination(element) &&
    !isDateElement(element) &&
    !isProjectValue(element) &&
    !isLocationAddress(element) &&
    isRichTextElement(element)
  );
}

export function formatCanvasText(element: TextFieldElement, pages: CanvasTextPages = {}): string {
  if (isPagination(element)) {
    const page = Math.max(1, pages.numberPage ?? 1);
    return formatPageNumber(getPaginationSettings(element), page, Math.max(pages.numberPageCount ?? 1, page)) ?? "";
  }
  if (isDateElement(element)) return dateText(getDateSetup(element));
  if (isProjectValue(element)) {
    const link = getProjectValueLink(element);
    if (link) return linkShownText(link) ?? link.label;
  }
  const expr = element.expression;
  if (!expr) return "";
  if (expr.includes("SimpleDateFormat") && expr.includes("java.util.Date")) return resolveLegacyDateSample(expr);
  if (pages.designPage !== undefined && expr.includes("$V{PAGE_NUMBER}")) {
    return evaluatePageExpression(expr, pages.designPage, pages.designPageCount ?? pages.designPage);
  }
  const trimmed = expr.trim();
  // A Location's address is a full Java string (quotes and backslashes escaped)
  if (isLocationAddress(element) && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\([\\"n])/g, (_, c: string) => (c === "n" ? "\n" : c));
  }
  // Plain literal strings show without their quotes
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/\\n/g, "\n");
  }
  return expr.replace(/\\n/g, "\n");
}
