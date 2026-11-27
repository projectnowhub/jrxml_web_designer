// Date fields are treated as plain text so users can type into them directly.
// This utility migrates any legacy autoDate properties and expressions into plain literal text.

import type { DesignElement } from "@/types";
import { isDateElement } from "./dateElement";

export const AUTO_DATE_PROPERTY = "com.cdp.text.autoDate";

const SAMPLE_FORMATS = {
  monthYear: { month: "long", year: "numeric" },
  dayMonthYear: { day: "numeric", month: "long", year: "numeric" },
  numeric: { day: "2-digit", month: "2-digit", year: "numeric" },
} as const;

export function resolveLegacyDateSample(expressionOrStyle?: string): string {
  const date = new Date();
  if (expressionOrStyle?.includes("dd/MM/yyyy") || expressionOrStyle === "numeric") {
    return new Intl.DateTimeFormat("en-GB", SAMPLE_FORMATS.numeric).format(date);
  }
  if (expressionOrStyle?.includes("d MMMM yyyy") || expressionOrStyle === "dayMonthYear") {
    return new Intl.DateTimeFormat("en-GB", SAMPLE_FORMATS.dayMonthYear).format(date);
  }
  return new Intl.DateTimeFormat("en-GB", SAMPLE_FORMATS.monthYear).format(date);
}

export function cleanLegacyAutoDateElement(element: DesignElement | null | undefined): boolean {
  if (!element || element.type !== "textField") return false;
  // A Date element fills itself in on purpose
  if (isDateElement(element)) return false;
  let changed = false;
  if (Array.isArray(element.properties)) {
    const idx = element.properties.findIndex((p) => p?.name === AUTO_DATE_PROPERTY);
    if (idx !== -1) {
      element.properties.splice(idx, 1);
      if (element.properties.length === 0) delete (element as any).properties;
      changed = true;
    }
  }
  const expr = String(element.expression ?? "").trim();
  if (expr.includes("SimpleDateFormat") && expr.includes("java.util.Date")) {
    const sample = resolveLegacyDateSample(expr);
    element.expression = `"${sample}"`;
    changed = true;
  }
  return changed;
}

export function cleanLegacyAutoDate(bands: { elements?: any[] }[] | undefined): void {
  if (!Array.isArray(bands)) return;
  for (const band of bands) {
    cleanLegacyList(band.elements);
  }
}

function cleanLegacyList(elements: any[] | undefined): void {
  if (!Array.isArray(elements)) return;
  for (const el of elements) {
    if (!el) continue;
    if (el.type === "frame" && Array.isArray(el.elements)) {
      cleanLegacyList(el.elements);
    }
    cleanLegacyAutoDateElement(el);
  }
}
