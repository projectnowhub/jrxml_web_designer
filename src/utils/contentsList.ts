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
    // New lists keep in step with the headings on the pages
    follow: true,
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

export function sectionNumber(list: Pick<ContentsListData, "sectionStyle" | "sectionWord">, n: number): string {
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

export function subNumber(list: Pick<ContentsListData, "subStyle">, section: number, n: number): string {
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
// before it in its chain stopped), else the typed ones. A list that follows
// the headings shows the numbers it was given (the headings' own)
export function listNumbers(list: ContentsListData, start: NumberStart = { section: 0, sub: 0 }): string[] {
  if (!list.autoNumber || list.follow) return list.entries.map((e) => e.number);
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
  if (raw.follow === true) list.follow = true;
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

export const hasProperty = (el: { properties?: { name?: string }[] }, name: string) =>
  !!el.properties?.some((p) => p?.name === name);

// The text a text element shows (plain or formatted)
export function textOf(el: DesignElement | undefined): string {
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

// One heading on the pages: its contents row, the text field carrying its
// PDF bookmark (the title), and the bookmark's name (number and title)
export interface HeadingItem {
  entry: ContentsEntry;
  target?: DesignElement;
  label: string;
  // The heading itself, as selected on the page (the Section Heading box, or
  // the Sub-heading text)
  element: DesignElement;
}

// Every Section Heading and Sub-heading on the normal pages, in page order,
// with the page it prints on. Sub-headings inside a box count too, at the
// box's place plus theirs (Section Headings are boxes, which don't nest)
export function headingItems(
  bands: Band[],
  props: Pick<ReportProperties, "coverPage" | "contentsPages" | "countSpecialPages">,
): HeadingItem[] {
  const detail = bands.find((b) => b.type === "detail");
  const { count, countPages } = specialPages(props);
  const found: { el: DesignElement; page: number; y: number; x: number }[] = [];
  for (const el of detail?.elements ?? []) {
    if (pageKind(props, el.pageIndex) !== "normal") continue;
    const page = el.pageIndex ?? 0;
    if (hasProperty(el, SECTION_HEADING_PROPERTY) || hasProperty(el, SUB_HEADING_PROPERTY)) {
      found.push({ el, page, y: el.y, x: el.x });
    } else if (el.type === "frame") {
      for (const child of el.elements ?? []) {
        if (child.type === "textField" && hasProperty(child, SUB_HEADING_PROPERTY)) {
          found.push({ el: child, page, y: el.y + child.y, x: el.x + child.x });
        }
      }
    }
  }
  found.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  return found
    .map(({ el, page: index }): HeadingItem => {
      const page = String(index + 1 - (countPages ? 0 : count));
      if (hasProperty(el, SECTION_HEADING_PROPERTY) && el.type === "frame") {
        const { numberPart, titleParts } = sectionHeadingParts(el as FrameElement);
        const number = textOf(numberPart ?? undefined);
        const title = titleParts.map(textOf).join(" ").replace(/\s+/g, " ").trim();
        return {
          entry: { number, title, page, level: 0 },
          target: titleParts.find((p) => p.type === "textField"),
          label: [number, title].filter(Boolean).join(" "),
          element: el,
        };
      }
      const title = textOf(el);
      return { entry: { number: "", title, page, level: 1 }, target: el, label: title, element: el };
    })
    .filter((h) => h.entry.title || h.entry.number);
}

// The heading each row stands for: same title and level (the nth row with a
// title goes to the nth heading with it). Used by the PDF links and the canvas
export function matchHeadings(entries: ContentsEntry[], items: HeadingItem[]): (HeadingItem | undefined)[] {
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const key = `${entry.level}|${entry.title.trim()}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const matches = items.filter((h) => `${h.entry.level}|${h.entry.title}` === key);
    return matches[n] ?? matches[0];
  });
}

export const collectHeadings = (...args: Parameters<typeof headingItems>): ContentsEntry[] =>
  headingItems(...args).map((h) => h.entry);

// A Section Heading box: its number (the left part, when there are two or
// more) and its title parts
export function sectionHeadingParts(heading: FrameElement): { numberPart: DesignElement | null; titleParts: DesignElement[] } {
  const parts = [...(heading.elements ?? [])].sort((a, b) => a.x - b.x);
  return parts.length > 1 ? { numberPart: parts[0]!, titleParts: parts.slice(1) } : { numberPart: null, titleParts: parts };
}
