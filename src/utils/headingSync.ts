// Headings that keep themselves in order, and contents lists that follow them.
//
// - Section Headings number themselves 1, 2… in page order, in the report's
//   style (`ReportProperties.headingNumbers`, written as HEADING_NUMBERS_PROPERTY).
//   A heading's number part is automatic while it carries HEADING_NUMBER_PROPERTY,
//   whose value is the text it was last given: when the text no longer matches,
//   the user typed their own number and that heading keeps it.
// - A contents list with `follow` gets its rows from the headings: the section
//   numbers they show, sub-sections counted with the list's own style, spread
//   over the list's chain (a second column, later contents pages).
//
// Both run after every change, before the JRXML is written (`syncHeadings`
// in the report store), so canvas, undo, saving and the JRXML always agree.
// Plain functions: nothing here uses the browser.

import type {
  Band,
  ContentsEntry,
  ContentsListElement,
  DesignElement,
  FrameElement,
  HeadingNumbering,
  ReportProperties,
} from "@/types";
import {
  collectHeadings,
  fitNumber,
  headingItems,
  hasProperty,
  rowsThatFit,
  SECTION_HEADING_PROPERTY,
  SECTION_STYLES,
  sectionHeadingParts,
  sectionNumber,
  SUB_HEADING_PROPERTY,
  subNumber,
  syncContentsListSize,
  textOf,
} from "./contentsList";
import { pageKind, specialPageArea } from "./specialPages";

// On a Section Heading's number part: the number it was given automatically
export const HEADING_NUMBER_PROPERTY = "com.cdp.heading.number";
// Report property: {"style":"1."} (left out for the default)
export const HEADING_NUMBERS_PROPERTY = "com.cdp.headingNumbers";

export const DEFAULT_HEADING_NUMBERING: HeadingNumbering = { style: "word", word: "SECTION" };

type SyncProps = Pick<
  ReportProperties,
  | "coverPage"
  | "contentsPages"
  | "countSpecialPages"
  | "fullPageCover"
  | "headingNumbers"
  | "pageWidth"
  | "pageHeight"
  | "leftMargin"
  | "rightMargin"
  | "topMargin"
  | "bottomMargin"
>;

export const headingNumbering = (p: Pick<ReportProperties, "headingNumbers"> | undefined): HeadingNumbering =>
  p?.headingNumbers ?? DEFAULT_HEADING_NUMBERING;

export const headingNumberText = (numbering: HeadingNumbering, n: number) =>
  sectionNumber({ sectionStyle: numbering.style, sectionWord: numbering.word }, n);

const detailOf = (bands: Band[]) => bands.find((b) => b.type === "detail");

// The Section Heading boxes on the normal pages, in page order
export function sectionHeadings(bands: Band[], props: SyncProps): FrameElement[] {
  return (detailOf(bands)?.elements ?? [])
    .filter(
      (el): el is FrameElement =>
        el.type === "frame" && hasProperty(el, SECTION_HEADING_PROPERTY) && pageKind(props, el.pageIndex) === "normal",
    )
    .sort((a, b) => (a.pageIndex ?? 0) - (b.pageIndex ?? 0) || a.y - b.y || a.x - b.x);
}

// A heading's number part, when it is a text
export function headingNumberPart(heading: FrameElement): DesignElement | null {
  const { numberPart } = sectionHeadingParts(heading);
  return numberPart?.type === "textField" ? numberPart : null;
}

export const isAutoNumbered = (part: DesignElement | null | undefined) =>
  !!part && hasProperty(part, HEADING_NUMBER_PROPERTY);

// Turn a heading's automatic number on (the next sync writes the right one)
// or off (the number stays as it is, to be typed)
export function setAutoNumbered(part: DesignElement, on: boolean): void {
  const others = (part.properties ?? []).filter((p) => p?.name !== HEADING_NUMBER_PROPERTY);
  part.properties = on ? [...others, { name: HEADING_NUMBER_PROPERTY, value: textOf(part) }] : others;
}

function writeNumber(part: DesignElement, text: string): void {
  if (part.type !== "textField") return;
  part.markup = "none";
  part.expression = `"${text}"`;
  part.properties = [
    ...(part.properties ?? []).filter((p) => p?.name !== HEADING_NUMBER_PROPERTY),
    { name: HEADING_NUMBER_PROPERTY, value: textOf(part) },
  ];
}

// Every automatic heading number counted again; true when one changed
export function renumberHeadings(bands: Band[], props: SyncProps): boolean {
  const numbering = headingNumbering(props);
  let changed = false;
  sectionHeadings(bands, props).forEach((heading, i) => {
    const part = headingNumberPart(heading);
    if (!part || !isAutoNumbered(part)) return;
    const given = part.properties?.find((p) => p?.name === HEADING_NUMBER_PROPERTY)?.value ?? "";
    // Typed over by the user: that heading keeps its own number from now on
    if (textOf(part) !== given) {
      setAutoNumbered(part, false);
      changed = true;
      return;
    }
    const wanted = headingNumberText(numbering, i + 1);
    if (wanted !== given) {
      writeNumber(part, wanted);
      changed = true;
    }
  });
  return changed;
}

// ---------------------------------------------------------------------------
// Contents lists that follow the headings

// Height of the area a Detail page offers (a cover / contents page: the page)
export function pageAreaHeight(bands: Band[], props: SyncProps, pageIndex: number | undefined): number {
  return specialPageArea(props as ReportProperties, pageIndex)?.height ?? detailOf(bands)?.height ?? 0;
}

// A list and the lists carrying it on, in order
export function listChain(elements: DesignElement[], list: ContentsListElement): ContentsListElement[] {
  const lists = elements.filter((e): e is ContentsListElement => e.type === "contentsList");
  const first = (list.list.continues && lists.find((l) => l.uuid === list.list.continues)) || list;
  return [
    first,
    ...lists
      .filter((l) => l !== first && l.list.continues && l.list.continues === first.uuid)
      .sort((a, b) => (a.pageIndex ?? 0) - (b.pageIndex ?? 0) || a.x - b.x),
  ];
}

const capacity = (bands: Band[], props: SyncProps, l: ContentsListElement) =>
  rowsThatFit(l.list, pageAreaHeight(bands, props, l.pageIndex) - l.y);

// The rows the headings give a list: section numbers as the headings show
// them, sub-sections counted under each section in the list's own style
function followedEntries(bands: Band[], props: SyncProps, first: ContentsListElement): ContentsEntry[] {
  let section = 0;
  let sub = 0;
  return collectHeadings(bands, props).map((e) => {
    if (e.level === 0) {
      section += 1;
      sub = 0;
      return e;
    }
    sub += 1;
    return { ...e, number: subNumber(first.list, section, sub) };
  });
}

// Lists carrying on a list that is gone (deleted): the first of them in page
// order becomes the first list, the others carry it on; true when one changed
export function repairListChains(elements: DesignElement[]): boolean {
  const lists = elements.filter((e): e is ContentsListElement => e.type === "contentsList");
  const ids = new Set(lists.map((l) => l.uuid).filter(Boolean));
  const orphans = new Map<string, ContentsListElement[]>();
  for (const l of lists) {
    const target = l.list.continues;
    if (target && !ids.has(target)) orphans.set(target, [...(orphans.get(target) ?? []), l]);
  }
  for (const group of orphans.values()) {
    group.sort((a, b) => (a.pageIndex ?? 0) - (b.pageIndex ?? 0) || a.x - b.x);
    const [first, ...rest] = group;
    delete first!.list.continues;
    for (const l of rest) l.list.continues = first!.uuid;
  }
  return orphans.size > 0;
}

// Every following list rebuilt from the headings; true when one changed
export function syncFollowingLists(bands: Band[], props: SyncProps): boolean {
  const detail = detailOf(bands);
  if (!detail) return false;
  let changed = repairListChains(detail.elements);
  const firsts = detail.elements.filter(
    (e): e is ContentsListElement => e.type === "contentsList" && !!e.list.follow && !e.list.continues,
  );
  for (const first of firsts) {
    const chain = listChain(detail.elements, first);
    const rest = followedEntries(bands, props, first);
    chain.forEach((l, i) => {
      const take = i === chain.length - 1 ? rest.length : Math.min(capacity(bands, props, l), rest.length);
      const entries = rest
        .splice(0, take)
        .map((e) => (e.level === 0 ? { ...e, number: fitNumber(l.list, e.number) } : e));
      if (JSON.stringify(entries) !== JSON.stringify(l.list.entries)) {
        l.list.entries = entries;
        changed = true;
      }
      const height = l.height;
      syncContentsListSize(l);
      if (l.height !== height) changed = true;
    });
  }
  return changed;
}

// Rows of a following list's chain that don't fit on its last page
export function followOverflow(bands: Band[], props: SyncProps, list: ContentsListElement): number {
  const detail = detailOf(bands);
  if (!detail || !list.list.follow) return 0;
  const chain = listChain(detail.elements, list);
  const last = chain[chain.length - 1]!;
  return Math.max(0, last.list.entries.length - capacity(bands, props, last));
}

// Both, in order (the lists read the headings' new numbers)
export function syncHeadings(bands: Band[], props: SyncProps): boolean {
  const renumbered = renumberHeadings(bands, props);
  const lists = syncFollowingLists(bands, props);
  return renumbered || lists;
}

// ---------------------------------------------------------------------------
// PDF bookmarks: each heading's title is a bookmark (sections level 1,
// sub-sections level 2), so PDF viewers list them in their sidebar

export function headingBookmarks(bands: Band[], props: SyncProps): Map<string, { level: number; label: string }> {
  const marks = new Map<string, { level: number; label: string }>();
  for (const h of headingItems(bands, props)) {
    if (h.target?.uuid && h.label) marks.set(h.target.uuid, { level: h.entry.level + 1, label: h.label });
  }
  return marks;
}

// ---------------------------------------------------------------------------
// The report property

export function serializeHeadingNumbers(p: Pick<ReportProperties, "headingNumbers"> | undefined): string | null {
  const n = p?.headingNumbers;
  if (!n) return null;
  const d = DEFAULT_HEADING_NUMBERING;
  if (n.style === d.style && (n.word ?? "") === (d.word ?? "")) return null;
  return JSON.stringify(n.style === "word" ? { style: n.style, word: n.word ?? "" } : { style: n.style });
}

export function parseHeadingNumbers(value: string | null | undefined): HeadingNumbering | undefined {
  if (!value) return undefined;
  try {
    const raw = JSON.parse(value);
    if (!SECTION_STYLES.includes(raw?.style)) return undefined;
    return raw.style === "word"
      ? { style: "word", word: typeof raw.word === "string" ? raw.word.slice(0, 30) : "" }
      : { style: raw.style };
  } catch {
    return undefined;
  }
}
