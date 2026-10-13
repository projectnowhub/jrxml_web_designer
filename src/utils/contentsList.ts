// Contents list (table of contents): rows of number, title, dotted leader and
// page. Written as plain text fields in a marked frame (jrxml/contentsListXml.ts)
// and rebuilt from its setup (CONTENTS_LIST_PROPERTY) when read.
//
// Dotted leader: the title is followed by ". . . ." and its text field is one
// line high, so the dots fill the rest of the line and the rest is cut, in the
// PDF as on the canvas (no measuring needed).

import type {
  Band,
  ContentsEntry,
  ContentsListData,
  ContentsListElement,
  ContentsSectionStyle,
  ContentsSubStyle,
  DesignElement,
  FrameElement,
  ReportProperties,
} from "@/types";
import { styleNumber } from "./paginationPresets";
import { pageKind, specialPages } from "./specialPages";

export const CONTENTS_LIST_PROPERTY = "com.cdp.contentsList";
// On the Section Heading / Sub-heading presets, so "Fill from my section headings" finds them
export const SECTION_HEADING_PROPERTY = "com.cdp.sectionHeading";
export const SUB_HEADING_PROPERTY = "com.cdp.subHeading";

export const LEADER_DOTS = " " + ". ".repeat(150).trim();
export const SUB_INDENT = 18;
// Line height of the report font (Noto Sans SC) as a share of the font size
const LINE_HEIGHT = 1.45;

export const titleLineHeight = (fontSize: number) => Math.ceil(fontSize * LINE_HEIGHT) + 1;

export function defaultContentsList(): ContentsListData {
  return {
    entries: [],
    autoNumber: true,
    sectionStyle: "1.",
    subStyle: "roman",
    rowHeight: 22,
    fontSize: 10,
    numberWidth: 90,
    pageWidth: 40,
    leader: true,
    boldSections: true,
    color: "#1F2937",
  };
}

// Style fields only (what Reset style puts back)
export function resetContentsListStyle(list: ContentsListData): void {
  const d = defaultContentsList();
  list.rowHeight = d.rowHeight;
  list.fontSize = d.fontSize;
  list.leader = d.leader;
  list.boldSections = d.boldSections;
  list.color = d.color;
  delete list.numberFill;
  delete list.numberColor;
}

export function buildContentsList(width: number, entries: ContentsEntry[] = [], patch: Partial<ContentsListData> = {}): ContentsListElement {
  const element: ContentsListElement = {
    type: "contentsList",
    x: 0,
    y: 0,
    width: Math.round(width),
    height: 0,
    list: { ...defaultContentsList(), ...patch, entries },
  };
  syncContentsListSize(element);
  return element;
}

// The box is as tall as its rows (one empty row at least)
export function syncContentsListSize(element: ContentsListElement): void {
  element.height = Math.max(1, element.list.entries.length) * element.list.rowHeight;
}

// Rows that fit in a height
export const rowsThatFit = (list: ContentsListData, height: number) =>
  Math.max(1, Math.floor(height / list.rowHeight));

// ---------------------------------------------------------------------------
// Automatic numbers: sections 1, 2…, sub-sections i, ii… under each section,
// counted on across the lists that carry one list on

export const SECTION_STYLES: ContentsSectionStyle[] = ["1", "1.", "01", "I", "A", "word"];
export const SUB_STYLES: ContentsSubStyle[] = ["roman", "letters", "decimal", "none"];
export const DEFAULT_SECTION_WORD = "SECTION";

export function sectionNumber(list: ContentsListData, n: number): string {
  switch (list.sectionStyle ?? "1.") {
    case "1":
      return String(n);
    case "01":
      return String(n).padStart(2, "0");
    case "I":
      return styleNumber(n, "romanUpper");
    case "A":
      return styleNumber(n, "letters");
    case "word":
      return `${(list.sectionWord ?? DEFAULT_SECTION_WORD).trim()} ${n}.`.trim();
    default:
      return `${n}.`;
  }
}

export function subNumber(list: ContentsListData, section: number, n: number): string {
  switch (list.subStyle ?? "roman") {
    case "letters":
      return styleNumber(n, "letters").toLowerCase();
    case "decimal":
      return `${Math.max(1, section)}.${n}`;
    case "none":
      return "";
    default:
      return styleNumber(n, "romanLower");
  }
}

export interface NumberStart {
  section: number;
  sub: number;
}

// The numbers a list shows: counted when automatic (from where the lists
// before it in its chain stopped), else the typed ones
export function listNumbers(list: ContentsListData, start: NumberStart = { section: 0, sub: 0 }): string[] {
  if (!list.autoNumber) return list.entries.map((e) => e.number);
  let { section, sub } = start;
  return list.entries.map((e) => {
    if (e.level === 0) {
      section += 1;
      sub = 0;
      return sectionNumber(list, section);
    }
    sub += 1;
    return subNumber(list, section, sub);
  });
}

// Where each list of a chain starts counting: a list carried on by others
// (`continues`) is followed by them in page order, then left to right
export function numberStarts(elements: DesignElement[]): Map<string, NumberStart> {
  const lists = elements.filter((e): e is ContentsListElement => e.type === "contentsList");
  const starts = new Map<string, NumberStart>();
  for (const first of lists.filter((l) => !l.list.continues)) {
    const chain = [
      first,
      ...lists
        .filter((l) => l.list.continues === first.uuid)
        .sort((a, b) => (a.pageIndex ?? 0) - (b.pageIndex ?? 0) || a.x - b.x),
    ];
    let at: NumberStart = { section: 0, sub: 0 };
    for (const l of chain) {
      if (l.uuid) starts.set(l.uuid, at);
      for (const e of l.list.entries) {
        at = e.level === 0 ? { section: at.section + 1, sub: 0 } : { section: at.section, sub: at.sub + 1 };
      }
    }
  }
  return starts;
}

// ---------------------------------------------------------------------------
// Reading a stored setup

const COLOR = /^#[0-9a-fA-F]{6}$/;
const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");

export function normalizeContentsList(raw: any): ContentsListData | null {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.entries)) return null;
  const d = defaultContentsList();
  const list: ContentsListData = {
    entries: raw.entries.slice(0, 500).map((e: any) => ({
      number: str(e?.number, 40),
      title: str(e?.title),
      page: str(e?.page, 12),
      level: e?.level === 1 ? 1 : 0,
    })),
    rowHeight: num(raw.rowHeight, d.rowHeight, 12, 80),
    fontSize: num(raw.fontSize, d.fontSize, 6, 36),
    numberWidth: num(raw.numberWidth, d.numberWidth, 0, 300),
    pageWidth: num(raw.pageWidth, d.pageWidth, 20, 120),
    leader: raw.leader !== false,
    boldSections: raw.boldSections !== false,
    color: COLOR.test(raw.color) ? raw.color : d.color,
  };
  if (COLOR.test(raw.numberFill)) list.numberFill = raw.numberFill;
  if (COLOR.test(raw.numberColor)) list.numberColor = raw.numberColor;
  if (typeof raw.continues === "string" && /^[0-9a-fA-F-]{8,40}$/.test(raw.continues)) list.continues = raw.continues;
  if (raw.autoNumber === true) {
    list.autoNumber = true;
    list.sectionStyle = SECTION_STYLES.includes(raw.sectionStyle) ? raw.sectionStyle : "1.";
    list.subStyle = SUB_STYLES.includes(raw.subStyle) ? raw.subStyle : "roman";
    if (typeof raw.sectionWord === "string") list.sectionWord = raw.sectionWord.slice(0, 30);
  }
  return list;
}

export function parseContentsList(value: string | null | undefined): ContentsListData | null {
  if (!value) return null;
  try {
    return normalizeContentsList(JSON.parse(value));
  } catch {
    return null;
  }
}

export const serializeContentsList = (list: ContentsListData) => JSON.stringify(normalizeContentsList(list) ?? list);

// ---------------------------------------------------------------------------
// "Fill from my section headings"

// A heading's number as the list shows it: in full in a wide number column
// ("SECTION 1."), just the number in a narrow one ("1"), two digits in a
// number box ("01")
export function fitNumber(list: ContentsListData, number: string): string {
  if (!number || list.numberWidth >= 80) return number;
  const digits = number.match(/\d+(?:\.\d+)*/)?.[0] ?? number;
  return list.numberFill && /^\d$/.test(digits) ? digits.padStart(2, "0") : digits;
}

export const entriesFor = (list: ContentsListData, entries: ContentsEntry[]): ContentsEntry[] =>
  entries.map((e) => ({ ...e, number: fitNumber(list, e.number) }));

const hasProperty = (el: { properties?: { name?: string }[] }, name: string) =>
  !!el.properties?.some((p) => p?.name === name);

// The text a text element shows (plain or formatted)
function textOf(el: DesignElement | undefined): string {
  if (!el || el.type !== "textField") return "";
  let expr = (el.expression ?? "").trim();
  if (expr.startsWith('"') && expr.endsWith('"') && expr.length >= 2) {
    expr = expr.slice(1, -1).replace(/\\n/g, " ").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  // Plain text is kept as it is; formatted text loses its tags
  const formatted = el.markup === "html" && /<\/?[a-z][^>]*>/i.test(expr);
  if (!formatted) return expr.replace(/\s+/g, " ").trim();
  return expr
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Every Section Heading and Sub-heading on the normal pages, in page order,
// with the page it prints on
export function collectHeadings(bands: Band[], props: Pick<ReportProperties, "coverPage" | "contentsPages" | "countSpecialPages">): ContentsEntry[] {
  const detail = bands.find((b) => b.type === "detail");
  const { count, countPages } = specialPages(props);
  const found = (detail?.elements ?? [])
    .filter((el) => pageKind(props, el.pageIndex) === "normal")
    .filter((el) => hasProperty(el, SECTION_HEADING_PROPERTY) || hasProperty(el, SUB_HEADING_PROPERTY))
    .sort((a, b) => (a.pageIndex ?? 0) - (b.pageIndex ?? 0) || a.y - b.y || a.x - b.x);
  return found
    .map((el): ContentsEntry => {
      const page = String((el.pageIndex ?? 0) + 1 - (countPages ? 0 : count));
      if (hasProperty(el, SECTION_HEADING_PROPERTY) && el.type === "frame") {
        const parts = [...((el as FrameElement).elements ?? [])].sort((a, b) => a.x - b.x);
        const number = parts.length > 1 ? textOf(parts[0]) : "";
        const title = parts.length > 1 ? parts.slice(1).map(textOf).join(" ") : textOf(parts[0]);
        return { number, title, page, level: 0 };
      }
      return { number: "", title: textOf(el), page, level: 1 };
    })
    .filter((e) => e.title || e.number);
}
