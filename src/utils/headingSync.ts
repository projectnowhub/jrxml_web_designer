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
  fitNumber,
  headingItems,
  hasProperty,
  rowsThatFit,
  SECTION_HEADING_PROPERTY,
  AFFIX_MAX,
  isSectionStyle,
  sectionHeadingParts,
  sectionNumber,
  SUB_HEADING_PROPERTY,
  subNumber,
  syncContentsListSize,
  textOf,
} from "./contentsList";
import { pageKind, shiftPages, specialPageArea, specialPages } from "./specialPages";
import { refreshUuids } from "./elementUtils";

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
  sectionNumber({ sectionStyle: numbering.style, sectionWord: numbering.word, sectionBefore: numbering.before, sectionAfter: numbering.after }, n);

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

// Rows a part holds: room left on the page (leaving a 20px bottom buffer), or within its fixed box if specified
const capacity = (bands: Band[], props: SyncProps, l: ContentsListElement) => {
  const room = Math.max(l.list.rowHeight, pageAreaHeight(bands, props, l.pageIndex) - l.y - 20);
  const maxRows = rowsThatFit(l.list, room);
  if (l.list.fixedBox && l.height > 0) {
    return Math.min(rowsThatFit(l.list, l.height), maxRows);
  }
  return maxRows;
};

// Ensure contents lists fit their content cleanly. If a list was given a bloated
// fixedBox down to the bottom of the page, unfix it so it sizes to its rows.
function fixBoxes(bands: Band[], props: SyncProps, elements: DesignElement[]): boolean {
  let changed = false;
  for (const l of elements) {
    if (l.type !== "contentsList") continue;
    if (l.list.fixedBox) {
      const pageH = pageAreaHeight(bands, props, l.pageIndex);
      const rowsH = Math.max(1, l.list.entries.length) * l.list.rowHeight;
      if (l.height >= pageH - l.y - 10 || l.height > rowsH + l.list.rowHeight * 2) {
        delete l.list.fixedBox;
        l.height = rowsH;
        changed = true;
      }
    }
  }
  return changed;
}

// The parts on later contents pages take the first part's place and width, so
// arranging the first page arranges them all (each part's height fits its own rows)
function sharePlace(first: ContentsListElement, part: ContentsListElement): boolean {
  if ((part.pageIndex ?? 0) === (first.pageIndex ?? 0)) return false;
  let changed = false;
  for (const key of ["x", "y", "width"] as const) {
    if (part[key] !== first[key]) {
      part[key] = first[key];
      changed = true;
    }
  }
  return changed;
}

// The rows the headings give a list (automatic mode): section numbers as the
// headings show them, sub-sections counted under each section in the list's
// own style, or the numbers typed per row when the list has `ownNumbers`.
// Headings the user left out are skipped
function followedEntries(bands: Band[], props: SyncProps, first: ContentsListElement): ContentsEntry[] {
  const { hidden = [], numbers = {} } = first.list.adjust ?? {};
  let section = 0;
  let sub = 0;
  const out: ContentsEntry[] = [];
  for (const h of headingItems(bands, props)) {
    const key = h.element.uuid ?? "";
    const left = !!key && hidden.includes(key);
    // A section left out keeps its number on its page; sub-sections have none
    if (h.entry.level === 0) {
      section += 1;
      sub = 0;
    } else if (!left) {
      sub += 1;
    }
    if (left) continue;
    const number = first.list.ownNumbers
      ? (numbers[key] ?? "")
      : h.entry.level === 0
        ? h.entry.number
        : subNumber(first.list, section, sub);
    out.push({ ...h.entry, number, ...(key ? { key } : {}) });
  }
  return out;
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

// What every part of a Table of Contents shares with its first part: its look
// and its numbering (one Table of Contents, however many pages it takes)
const SHARED_KEYS = [
  "rowHeight",
  "fontSize",
  "numberWidth",
  "pageWidth",
  "leader",
  "boldSections",
  "color",
  "numberFill",
  "numberColor",
  "autoNumber",
  "sectionStyle",
  "sectionWord",
  "sectionBefore",
  "sectionAfter",
  "subStyle",
  "follow",
  "ownNumbers",
] as const;

function shareLook(first: ContentsListElement, part: ContentsListElement): boolean {
  let changed = false;
  for (const key of SHARED_KEYS) {
    const value = first.list[key];
    if (part.list[key] === value) continue;
    if (value === undefined) delete part.list[key];
    else (part.list as unknown as Record<string, unknown>)[key] = value;
    changed = true;
  }
  return changed;
}

// A Table of Contents on contents pages is one list: its parts on later
// contents pages (or a second column) share the first part's look, and all its
// rows (from the headings when it follows them, else the typed ones) are spread
// over the parts by the room on each page, the last part taking the rest.
// Elsewhere only a list that follows the headings is rebuilt (typed lists on
// normal pages are left as they are). True when one changed
export const onContentsPages = (props: SyncProps, list: ContentsListElement) =>
  pageKind(props, list.pageIndex) === "contents";

export function syncFollowingLists(bands: Band[], props: SyncProps): boolean {
  const detail = detailOf(bands);
  if (!detail) return false;
  let changed = repairListChains(detail.elements);
  if (fixBoxes(bands, props, detail.elements)) changed = true;
  const firsts = detail.elements.filter(
    (e): e is ContentsListElement => e.type === "contentsList" && !e.list.continues,
  );
  for (const first of firsts) {
    const shared = onContentsPages(props, first);
    if (!shared && !first.list.follow) continue;
    const chain = listChain(detail.elements, first);
    if (shared) {
      for (const part of chain.slice(1)) {
        if (shareLook(first, part)) changed = true;
        if (sharePlace(first, part)) changed = true;
      }
    }
    const followed = first.list.follow ? followedEntries(bands, props, first) : [];
    const rest =
      first.list.follow && followed.length > 0
        ? followed
        : chain.flatMap((l) => l.list.entries.map((e) => ({ ...e })));
    chain.forEach((l, i) => {
      const take = i === chain.length - 1 ? rest.length : Math.min(capacity(bands, props, l), rest.length);
      const entries = rest
        .splice(0, take)
        .map((e) =>
          first.list.follow && !first.list.ownNumbers && e.level === 0 && e.number ? { ...e, number: fitNumber(l.list, e.number) } : e,
        );
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

// A Table of Contents inside a box (normal pages only): its rows follow the
// headings like any list on a normal page, and the box grows to hold it
function syncBoxedLists(bands: Band[], props: SyncProps, elements: DesignElement[]): boolean {
  let changed = false;
  for (const box of elements) {
    if (box.type !== "frame") continue;
    for (const l of box.elements ?? []) {
      if (l.type !== "contentsList") continue;
      if (l.list.continues) {
        delete l.list.continues;
        changed = true;
      }
      if (l.list.follow) {
        const entries = followedEntries(bands, props, l).map((e) =>
          !l.list.ownNumbers && e.level === 0 && e.number ? { ...e, number: fitNumber(l.list, e.number) } : e,
        );
        if (entries.length && JSON.stringify(entries) !== JSON.stringify(l.list.entries)) {
          l.list.entries = entries;
          changed = true;
        }
      }
      const height = l.height;
      syncContentsListSize(l);
      if (l.height !== height) changed = true;
      if (l.y + l.height > box.height) {
        box.height = l.y + l.height;
        changed = true;
      }
    }
  }
  return changed;
}

// Rows of a Table of Contents that don't fit on its last page
export function followOverflow(bands: Band[], props: SyncProps, list: ContentsListElement): number {
  const detail = detailOf(bands);
  if (!detail) return 0;
  const chain = listChain(detail.elements, list);
  if (!chain[0]!.list.follow && !onContentsPages(props, chain[0]!)) return 0;
  const last = chain[chain.length - 1]!;
  return Math.max(0, last.list.entries.length - capacity(bands, props, last));
}

// Both, in order (the lists read the headings' new numbers)
export function syncHeadings(bands: Band[], props: SyncProps): boolean {
  const renumbered = renumberHeadings(bands, props);
  const lists = syncFollowingLists(bands, props);
  const detail = detailOf(bands);
  const boxed = detail ? syncBoxedLists(bands, props, detail.elements) : false;
  return renumbered || lists || boxed;
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
  if (n.style === d.style && (n.word ?? "") === (d.word ?? "") && !n.before && !n.after) return null;
  if (n.style === "word") return JSON.stringify({ style: n.style, word: n.word ?? "" });
  return JSON.stringify({ style: n.style, ...(n.before ? { before: n.before } : {}), ...(n.after ? { after: n.after } : {}) });
}

export function parseHeadingNumbers(value: string | null | undefined): HeadingNumbering | undefined {
  if (!value) return undefined;
  try {
    const raw = JSON.parse(value);
    if (!isSectionStyle(raw?.style)) return undefined;
    if (raw.style === "word") return { style: "word", word: typeof raw.word === "string" ? raw.word.slice(0, 30) : "" };
    const n: HeadingNumbering = { style: raw.style };
    if (typeof raw.before === "string" && raw.before) n.before = raw.before.slice(0, AFFIX_MAX);
    if (typeof raw.after === "string" && raw.after) n.after = raw.after.slice(0, AFFIX_MAX);
    return n;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Contents pages added and removed as a Table of Contents needs them

// A Table of Contents on contents pages with rows that don't fit on its last part
function contentsOverflow(bands: Band[], props: SyncProps): number {
  const detail = detailOf(bands);
  if (!detail) return 0;
  return detail.elements
    .filter((e): e is ContentsListElement => e.type === "contentsList" && !e.list.continues && onContentsPages(props, e))
    .reduce((n, first) => n + followOverflow(bands, props, first), 0);
}

// A new contents page after the last one, a copy of it (same design), its
// lists carrying on their Table of Contents with full room. The caller adds
// one to the report's page count. False when there is nothing to copy
export function addContentsPageCopy(bands: Band[], props: ReportProperties, auto = false): boolean {
  const detail = detailOf(bands);
  const { contents, count } = specialPages(props);
  if (!detail || !contents) return false;
  const source = detail.elements.filter((el) => (el.pageIndex ?? 0) === count - 1);
  shiftPages(detail.elements, count, 1);
  props.contentsPages = contents + 1;
  for (const el of source) {
    const copy = JSON.parse(JSON.stringify(el)) as DesignElement;
    refreshUuids(copy);
    copy.pageIndex = count;
    if (copy.type === "contentsList" && el.type === "contentsList") {
      copy.list.continues = listChain(detail.elements, el)[0]!.uuid;
      copy.list.entries = [];
      if (auto) copy.list.autoPage = true;
      else delete copy.list.autoPage;
      syncContentsListSize(copy);
    }
    detail.elements.push(copy);
  }
  return true;
}

// The same element apart from its id, page and a list's rows
const sameDesign = (a: DesignElement, b: DesignElement) => {
  const strip = (el: DesignElement) =>
    JSON.stringify({ ...el, uuid: undefined, pageIndex: undefined, ...(el.type === "contentsList" ? { list: { ...el.list, entries: [], continues: undefined, autoPage: undefined }, height: undefined } : {}) });
  return strip(a) === strip(b);
};

// The last contents page when it is an unused copy of the one before it (its
// lists empty, nothing added or changed): removed. The caller takes one off
// the report's page count. False when it is kept
export function removeUnusedContentsPage(bands: Band[], props: ReportProperties): boolean {
  const detail = detailOf(bands);
  const { contents, count, cover } = specialPages(props);
  if (!detail || contents < 2) return false;
  const last = count - 1;
  const onLast = detail.elements.filter((el) => (el.pageIndex ?? 0) === last);
  const before = detail.elements.filter((el) => (el.pageIndex ?? 0) === last - 1);
  if (last - 1 < (cover ? 1 : 0)) return false;
  const lists = onLast.filter((e): e is ContentsListElement => e.type === "contentsList");
  // Only a page added by itself (never one the user added)
  if (!lists.length || lists.some((l) => l.list.entries.length || !l.list.continues || !l.list.autoPage)) return false;
  if (onLast.length !== before.length || !onLast.every((el, i) => before[i] && sameDesign(el, before[i]!))) return false;
  detail.elements = detail.elements.filter((el) => (el.pageIndex ?? 0) !== last);
  shiftPages(detail.elements, last + 1, -1);
  props.contentsPages = contents - 1;
  return true;
}

// After a change: contents pages added while a Table of Contents' rows don't
// fit, and unused copies at the end removed. Returns the change in pages
export function fitContentsPages(bands: Band[], props: ReportProperties): number {
  let delta = 0;
  for (let i = 0; i < 20; i++) {
    const over = contentsOverflow(bands, props);
    if (!over) break;
    if (!addContentsPageCopy(bands, props, true)) break;
    delta++;
    syncFollowingLists(bands, props);
    // The new page took nothing (no list of that Table of Contents on it): undo it
    if (contentsOverflow(bands, props) >= over) {
      removeUnusedContentsPage(bands, props);
      delta--;
      break;
    }
  }
  while (delta <= 0 && contentsOverflow(bands, props) === 0 && removeUnusedContentsPage(bands, props)) {
    delta--;
    syncFollowingLists(bands, props);
  }
  return delta;
}
