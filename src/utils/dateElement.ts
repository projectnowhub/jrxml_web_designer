// Date element: a text field that fills in a date by itself. The user picks
// which date (the day the report is printed, this month, last month, or a date
// they choose), how it looks, the time and a text before it. Month and day
// names are English for now. The setup is kept as JSON in the `com.cdp.date` property and
// the expression is rebuilt from it after every change and on import, so the
// two always agree.
//
// The report server works the date out when the report is made, in the time
// zone the element was set up in (the server itself may run in UTC). A date
// the user chooses is written as plain text: nothing runs on the server.
//
// The month and day names here are the ones Java prints for Locale.ENGLISH,
// so the canvas shows exactly what the PDF prints.
import type { DesignElement, TextFieldElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { DEFAULT_REPORT_FONT } from "@/config/fonts.config";
import { javaString } from "@/utils/jrxml/javaString";

export const DATE_PROPERTY = "com.cdp.date";
export const DATE_ELEMENT_TYPE = "dateTime";

export type DateWhen = "printed" | "thisMonth" | "lastMonth" | "fixed";
export type DateTimeStyle = "none" | "24h" | "12h";

export interface DateSetup {
  when: DateWhen;
  // yyyy-MM-dd, only for a date the user chooses
  date?: string;
  // HH:mm, the time the user chose with their date (none: no time shown)
  clock?: string;
  format: string;
  time: DateTimeStyle;
  before: string;
  // IANA time zone the date is worked out in ("Asia/Kuala_Lumpur")
  zone: string;
}

export const DATE_WHENS: DateWhen[] = ["printed", "thisMonth", "lastMonth", "fixed"];
export const DATE_TIME_STYLES: DateTimeStyle[] = ["none", "24h", "12h"];

// Looks: Java DateTimeFormatter patterns (letters only from the set below)
export const DAY_FORMATS = [
  { id: "dayMonthYear", pattern: "d MMMM yyyy" },
  { id: "dayShortMonthYear", pattern: "d MMM yyyy" },
  { id: "numeric", pattern: "dd/MM/yyyy" },
  { id: "weekday", pattern: "EEEE, d MMMM yyyy" },
  { id: "iso", pattern: "yyyy-MM-dd" },
  // Month and year only ("October 2026"), as on the cover designs
  { id: "monthYear", pattern: "MMMM yyyy" },
] as const;

export const MONTH_FORMATS = [
  { id: "monthYear", pattern: "MMMM yyyy" },
  { id: "shortMonthYear", pattern: "MMM yyyy" },
  { id: "numericMonth", pattern: "MM/yyyy" },
] as const;

const TIME_PATTERNS: Record<Exclude<DateTimeStyle, "none">, string> = {
  "24h": "HH:mm",
  "12h": "h:mm a",
};

// Quick picks for the text before the date (translation keys under dateElement.beforePicks)
export const BEFORE_PICKS = ["printedOn", "reportDate", "asAt"] as const;

// Whether the setup shows a month (this / last month) or a day
export const showsMonth = (when: DateWhen) => when === "thisMonth" || when === "lastMonth";
export const formatsFor = (when: DateWhen) => (showsMonth(when) ? MONTH_FORMATS : DAY_FORMATS);
const defaultFormat = (when: DateWhen) => formatsFor(when)[0].id;

const NAMES = {
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  ampm: ["AM", "PM"],
} as const;

// The browser's time zone, or "" when it can't be read
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

// Only plain zone ids reach the JRXML (Java rejects anything else and the report would fail)
const validZone = (zone: unknown): string =>
  typeof zone === "string" && /^[A-Za-z][A-Za-z0-9_+\-/]{0,63}$/.test(zone) ? zone : "";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function todayIso(zone?: string): string {
  const p = zonedParts(new Date(), zone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function normalizeDateSetup(value: Partial<DateSetup> | null | undefined): DateSetup {
  const v = value ?? {};
  const when = DATE_WHENS.includes(v.when as DateWhen) ? (v.when as DateWhen) : "printed";
  const format = formatsFor(when).some((f) => f.id === v.format) ? v.format! : defaultFormat(when);
  const zone = validZone(v.zone);
  // A chosen date shows a time only when one was chosen with it (24-hour unless set)
  const clock = when === "fixed" && CLOCK.test(v.clock ?? "") ? v.clock : undefined;
  const style = DATE_TIME_STYLES.includes(v.time as DateTimeStyle) ? (v.time as DateTimeStyle) : "none";
  const time = when === "printed" ? style : clock ? (style === "none" ? "24h" : style) : "none";
  return {
    when,
    ...(when === "fixed" ? { date: ISO_DATE.test(v.date ?? "") ? v.date : todayIso(zone) } : {}),
    ...(clock ? { clock } : {}),
    format,
    time,
    before: typeof v.before === "string" ? v.before.replace(/\r?\n/g, " ").slice(0, 80) : "",
    zone,
  };
}

type WithProperties = { type?: string; properties?: Array<{ name?: string; value?: string }> };

export function isDateElement(element: unknown): boolean {
  const el = element as WithProperties | undefined;
  return el?.type === "textField" && !!el.properties?.some((p) => p?.name === DATE_PROPERTY);
}

export function getDateSetup(element: WithProperties): DateSetup {
  const raw = element.properties?.find((p) => p?.name === DATE_PROPERTY)?.value;
  try {
    return normalizeDateSetup(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeDateSetup(null);
  }
}

// ── Formatting (canvas, the panel's examples and a chosen date) ──

interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  weekday: number; // 0 = Sunday
}

const pad = (n: number) => String(n).padStart(2, "0");

// Year, month, day and time of a moment in a time zone (the browser's when none)
function zonedParts(date: Date, zone?: string): DateParts {
  let parts: Record<string, string> = {};
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: validZone(zone) || undefined,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  } catch {
    parts = {};
  }
  const year = Number(parts.year) || date.getFullYear();
  const month = Number(parts.month) || date.getMonth() + 1;
  const day = Number(parts.day) || date.getDate();
  const hour = parts.hour !== undefined ? Number(parts.hour) % 24 : date.getHours();
  const minute = parts.minute !== undefined ? Number(parts.minute) : date.getMinutes();
  return { year, month, day, hour, minute, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

function partsOfIso(iso: string, clock?: string): DateParts {
  const m = ISO_DATE.exec(iso);
  const [year, month, day] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [1970, 1, 1];
  const c = CLOCK.exec(clock ?? "");
  const [hour, minute] = c ? [Number(c[1]), Number(c[2])] : [0, 0];
  return { year, month, day, hour, minute, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

// A Java pattern written out the way Java prints it (only the letters the looks use)
function formatPattern(pattern: string, p: DateParts): string {
  const names = NAMES;
  return pattern.replace(/EEEE|MMMM|MMM|MM|dd|d|yyyy|HH|mm|h|a/g, (token) => {
    switch (token) {
      case "EEEE": return names.weekdays[p.weekday]!;
      case "MMMM": return names.months[p.month - 1]!;
      case "MMM": return names.shortMonths[p.month - 1]!;
      case "MM": return pad(p.month);
      case "dd": return pad(p.day);
      case "d": return String(p.day);
      case "yyyy": return String(p.year);
      case "HH": return pad(p.hour);
      case "mm": return pad(p.minute);
      case "h": return String(p.hour % 12 || 12);
      case "a": return names.ampm[p.hour < 12 ? 0 : 1]!;
      default: return token;
    }
  });
}

// The full pattern of a setup: the look, then the time
export function datePattern(setup: DateSetup): string {
  const look = formatsFor(setup.when).find((f) => f.id === setup.format) ?? formatsFor(setup.when)[0];
  return setup.time === "none" ? look.pattern : `${look.pattern}, ${TIME_PATTERNS[setup.time]}`;
}

// The date of a setup, without the text before it
function dateParts(setup: DateSetup, now: Date): DateParts {
  if (setup.when === "fixed") return partsOfIso(setup.date ?? todayIso(setup.zone), setup.clock);
  const p = zonedParts(now, setup.zone);
  if (setup.when === "lastMonth") {
    const month = p.month === 1 ? 12 : p.month - 1;
    const year = p.month === 1 ? p.year - 1 : p.year;
    return { ...p, year, month, day: 1, weekday: new Date(Date.UTC(year, month - 1, 1)).getUTCDay() };
  }
  return p;
}

const beforeText = (setup: DateSetup) => {
  const before = setup.before.trim();
  return before ? `${before} ` : "";
};

// What the element shows (the canvas shows today's date; the PDF the day it's made)
export function dateText(setup: DateSetup, now: Date = new Date()): string {
  return beforeText(setup) + formatPattern(datePattern(setup), dateParts(setup, now));
}

// One look written out for the panel's cards
export function formatSample(setup: DateSetup, format: string, now: Date = new Date()): string {
  return formatPattern(datePattern({ ...setup, format }), dateParts({ ...setup, format }, now));
}

// ── JRXML ──

// The text field's expression. A chosen date is plain text; the others are
// worked out by the report server when the report is made.
export function dateExpression(setup: DateSetup): string {
  if (setup.when === "fixed") return javaString(dateText(setup));
  const zone = validZone(setup.zone);
  let moment = zone
    ? `java.time.ZonedDateTime.now(java.time.ZoneId.of(${javaString(zone)}))`
    : "java.time.ZonedDateTime.now()";
  if (setup.when === "lastMonth") moment += ".minusMonths(1)";
  const formatted =
    `${moment}.format(java.time.format.DateTimeFormatter.ofPattern(` +
    `${javaString(datePattern(setup))}, java.util.Locale.ENGLISH))`;
  const before = beforeText(setup);
  return before ? `${javaString(before)} + ${formatted}` : formatted;
}

// Write a setup to the element: its property and expression. Changes the
// element in place (the caller records the undo step).
export function applyDateSetup(element: TextFieldElement, setup: Partial<DateSetup>): void {
  const normalized = normalizeDateSetup(setup);
  const others = (element.properties ?? []).filter((p) => p?.name !== DATE_PROPERTY);
  element.properties = [...others, { name: DATE_PROPERTY, value: JSON.stringify(normalized) }];
  element.expression = dateExpression(normalized);
  element.markup = "none";
  element.evaluationTime = "Now";
  element.evaluationGroup = "";
}

// On import: rebuild the expression from the stored setup
export function restoreDateElement(element: DesignElement): boolean {
  if (!isDateElement(element)) return false;
  applyDateSetup(element as TextFieldElement, getDateSetup(element as WithProperties));
  return true;
}

// Turn a date into plain Text showing what it shows now (stored like typed text)
export function dateToPlainText(element: TextFieldElement, now: Date = new Date()): void {
  const text = dateText(getDateSetup(element), now);
  element.properties = (element.properties ?? []).filter((p) => p?.name !== DATE_PROPERTY);
  if (element.properties.length === 0) delete element.properties;
  element.expression = `"${text}"`;
  element.markup = "none";
}

export const DATE_ELEMENT_SIZE = { width: 160, height: 20 };

export interface DateFont {
  fontFamily?: string;
  fontSize?: number;
}

// A new date: the day the report is printed, "16 October 2026", in this browser's time zone
export function buildDateElement(font: DateFont = {}): TextFieldElement {
  const element = createElement("textField", {
    uuid: crypto.randomUUID(),
    x: 0,
    y: 0,
    width: DATE_ELEMENT_SIZE.width,
    height: DATE_ELEMENT_SIZE.height,
    fontFamily: font.fontFamily || DEFAULT_REPORT_FONT,
    fontSize: Math.min(font.fontSize || 10, 10),
    isBold: false,
    isItalic: false,
    isUnderline: false,
    pattern: "",
    isBlankWhenNull: false,
    textAlignment: "Left",
    verticalAlignment: "Middle",
  } as Partial<DesignElement>) as TextFieldElement;
  applyDateSetup(element, { when: "printed", zone: browserTimeZone() });
  return element;
}
