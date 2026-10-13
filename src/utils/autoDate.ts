// A text that shows the date the report is made ("October 2026"): the
// report server works it out each time it prints the report, so a monthly
// report never needs its date typed again. The canvas shows today's date.
// The style is kept in AUTO_DATE_PROPERTY next to the expression; month
// names are English, like "Page 1 of 3".

import type { DesignElement } from "@/types";

export const AUTO_DATE_PROPERTY = "com.cdp.text.autoDate";

export const AUTO_DATE_STYLES = ["monthYear", "dayMonthYear", "numeric"] as const;
export type AutoDateStyle = (typeof AUTO_DATE_STYLES)[number];

const JAVA_PATTERNS: Record<AutoDateStyle, string> = {
  monthYear: "MMMM yyyy",
  dayMonthYear: "d MMMM yyyy",
  numeric: "dd/MM/yyyy",
};

const SAMPLE_FORMATS: Record<AutoDateStyle, Intl.DateTimeFormatOptions> = {
  monthYear: { month: "long", year: "numeric" },
  dayMonthYear: { day: "numeric", month: "long", year: "numeric" },
  numeric: { day: "2-digit", month: "2-digit", year: "numeric" },
};

export function autoDateOf(element: DesignElement | null | undefined): AutoDateStyle | null {
  const value = element?.properties?.find((p) => p?.name === AUTO_DATE_PROPERTY)?.value;
  return AUTO_DATE_STYLES.includes(value as AutoDateStyle) ? (value as AutoDateStyle) : null;
}

export const autoDateExpression = (style: AutoDateStyle) =>
  `new java.text.SimpleDateFormat("${JAVA_PATTERNS[style]}", java.util.Locale.ENGLISH).format(new java.util.Date())`;

// What the date looks like (today's, on the canvas and in the panel)
export const autoDateSample = (style: AutoDateStyle, date = new Date()) =>
  new Intl.DateTimeFormat("en-GB", SAMPLE_FORMATS[style]).format(date);

// On: the text shows the date in this style. Off (null): it keeps today's
// date as ordinary typed text
export function setAutoDate(element: DesignElement, style: AutoDateStyle | null): void {
  if (element.type !== "textField") return;
  const current = autoDateOf(element);
  const others = (element.properties ?? []).filter((p) => p?.name !== AUTO_DATE_PROPERTY);
  if (style) {
    element.properties = [...others, { name: AUTO_DATE_PROPERTY, value: style }];
    element.expression = autoDateExpression(style);
    element.markup = "none";
  } else {
    element.properties = others;
    element.expression = `"${current ? autoDateSample(current) : ""}"`;
  }
}
