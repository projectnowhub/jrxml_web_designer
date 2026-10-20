// What is wrong with a report, as a careful reviewer would see it: "fix" =
// the PDF prints wrong (overlaps, text cut off, unreadable colours, things that
// print nothing); "check" = it looks unfinished (placeholder words, empty photo
// spots, empty pages, a heading stranded at the bottom of a page…). The AI
// reads them in the design state, after each change and with check_report.

import type { BarcodeElement, ChartElement, DesignElement, FrameElement, TableElement } from "@/types";
import { useReportStore } from "@/stores/report";
import { BAND_TYPE_CONSTANTS } from "@/constants/constants";
import { pageKind, specialPages } from "@/utils/specialPages";
import { isChartBound, isChartComplete } from "@/utils/chart/chartTypes";
import { checkBarcodeValue, readBarcodeValue } from "@/utils/barcode/barcodeTypes";
import { SECTION_HEADING_PROPERTY, SUB_HEADING_PROPERTY, hasProperty, sectionHeadingParts } from "@/utils/contentsList";
import { getImageName } from "@/utils/elementUtils";
import en from "@/locales/en.json";
import ms from "@/locales/ms.json";
import i18n from "@/i18n";
import { isRich, plainText } from "./elements/common";
import { allLocations, areaOf, boxAround, kindAt, label, neighbours, overlapsOf, pageOf, shapeUnder, type Location } from "./design";

export interface ReportCheck {
  level: "fix" | "check";
  // Where: "page 3", "pageHeader", "in box <uuid>"
  where: string;
  uuid?: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Text size: how much room a text needs (Noto Sans SC: ~0.55 em per Latin
// letter, a full em for Chinese / Japanese / Korean ones; 1.45 em per line)
// ---------------------------------------------------------------------------

const LINE_HEIGHT = 1.45;

function letters(text: string): number {
  let n = 0;
  for (const ch of text) n += ch.codePointAt(0)! >= 0x2e80 ? 1.8 : 1;
  return n;
}

// The words a text prints, line breaks kept (formatting tags dropped)
function printedText(e: DesignElement): string {
  const raw = plainText(e);
  if (!isRich(e)) return raw;
  return raw
    .replace(/<br\s*\/?>|<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, "x");
}

// Height the text needs at its width
export function neededTextHeight(e: DesignElement): number {
  const size = e.fontSize || 10;
  const pad = (e.box?.leftPadding ?? e.box?.padding ?? 0) + (e.box?.rightPadding ?? e.box?.padding ?? 0);
  const vpad = (e.box?.topPadding ?? e.box?.padding ?? 0) + (e.box?.bottomPadding ?? e.box?.padding ?? 0);
  const perLine = Math.max(1, (e.width - pad) / (size * (e.isBold ? 0.6 : 0.55)));
  const lines = printedText(e)
    .split("\n")
    .reduce((n, para) => n + Math.max(1, Math.ceil(letters(para) / perLine)), 0);
  return Math.ceil(lines * size * LINE_HEIGHT + vpad);
}

const grows = (e: DesignElement) => e.textAdjust === "StretchHeight";

// ---------------------------------------------------------------------------
// Colours: contrast between a text and what is behind it (WCAG ratio)
// ---------------------------------------------------------------------------

function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
};

const fillOf = (e: DesignElement) => (e.mode === "Opaque" && e.backcolor ? e.backcolor : null);

const within = (e: { x: number; y: number; width: number; height: number }, p: DesignElement) =>
  e.x >= p.x - 0.5 && e.y >= p.y - 0.5 && e.x + e.width <= p.x + p.width + 0.5 && e.y + e.height <= p.y + p.height + 0.5;

// The colour behind an element: its own fill, its box's, the panel under it, else the white page
function backgroundOf(loc: Location): string {
  const own = fillOf(loc.element);
  if (own) return own;
  if (loc.box && fillOf(loc.box)) return fillOf(loc.box)!;
  const rect = loc.box ? { ...loc.element, x: loc.box.x + loc.element.x, y: loc.box.y + loc.element.y } : loc.element;
  const top = loc.box ?? loc.element;
  const page = top.pageIndex ?? 0;
  const order = loc.band.elements.indexOf(top);
  const under = loc.band.elements
    .filter(
      (p, i) =>
        i < order &&
        p !== top &&
        (loc.band.type !== BAND_TYPE_CONSTANTS.DETAIL || (p.pageIndex ?? 0) === page) &&
        (p.type === "rectangle" || p.type === "frame" || p.type === "ellipse") &&
        fillOf(p) &&
        within(rect, p),
    )
    .sort((a, b) => a.width * a.height - b.width * b.height);
  return under[0] ? fillOf(under[0])! : "#FFFFFF";
}

// ---------------------------------------------------------------------------
// Placeholder words left from a design or a ready-made piece
// ---------------------------------------------------------------------------

// Words that are only ever placeholders (not "Date", "Low Risk", "Table of Contents"…)
const PLACEHOLDER_KEYS: Array<[string, string[]]> = [
  ["framePresets.placeholder", ["kpiLabel", "kpiValue", "kpiCaption", "alertTitle", "alertBody", "sectionTitle", "photoCaption", "photoMeta"]],
  ["reportParts.placeholder", ["headerLine1", "headerLine2", "headerLine3", "sectionTitle", "subHeading", "note", "signOffName", "signOffRole", "signOffDate"]],
  ["pageDesigns.placeholder", ["projectName", "reportNumber", "period", "reportTitle", "preparedFor", "preparedBy", "client", "location", "contractSum"]],
];

let placeholderWords: Set<string> | null = null;
function placeholders(): Set<string> {
  if (placeholderWords) return placeholderWords;
  const words = new Set<string>();
  for (const messages of [en, ms] as Record<string, any>[]) {
    for (const [path, keys] of PLACEHOLDER_KEYS) {
      const group = path.split(".").reduce((o, k) => o?.[k], messages);
      for (const key of keys) if (typeof group?.[key] === "string") words.add(group[key].trim().toLowerCase());
    }
  }
  placeholderWords = words;
  return words;
}

// ---------------------------------------------------------------------------
// The checks
// ---------------------------------------------------------------------------

// Space kept between text and the page border line
const BORDER_GAP = 8;

const printableWidth = () => {
  const r = useReportStore();
  const p = r.reportProperties;
  return r.paperWidth - (p.leftMargin || 0) - (p.rightMargin || 0);
};

// The page border prints where this element is (every page, except a whole-sheet cover)
function pageBorderShown(loc: Location): boolean {
  const r = useReportStore();
  const hasBorder = r.bands.some((b) => b.type === BAND_TYPE_CONSTANTS.BACKGROUND && b.elements.some((e) => e.type === "frame"));
  if (!hasBorder) return false;
  const page = pageOf(loc);
  return !(page !== undefined && pageKind(r.reportProperties, page) === "cover" && specialPages(r.reportProperties).fullPageCover);
}

const whereOf = (loc: Location) => {
  const page = pageOf(loc);
  return loc.box ? `in box ${loc.box.uuid}` : page !== undefined ? `page ${page + 1}` : loc.band.type;
};

// What is wrong with one element (also told right after it is made or changed)
export function elementChecks(loc: Location): ReportCheck[] {
  const out: ReportCheck[] = [];
  const e = loc.element;
  const kind = kindAt(loc)?.kind;
  const where = whereOf(loc);
  const name = label(e, loc.band.type);
  const fix = (message: string) => out.push({ level: "fix", where, uuid: e.uuid, message: `${name} ${message}` });
  const check = (message: string) => out.push({ level: "check", where, uuid: e.uuid, message: `${name} ${message}` });
  if (loc.band.type === BAND_TYPE_CONSTANTS.BACKGROUND) return out;

  // Outside its band / page / box (it is cut off or pushed in the PDF)
  const area = loc.box ?? (() => {
    const a = areaOf(loc.bandIndex, pageOf(loc));
    return { width: a.width, height: a.height };
  })();
  if (e.x < -0.5 || e.y < -0.5 || e.x + e.width > area.width + 0.5 || e.y + e.height > area.height + 0.5) {
    fix(`goes outside its ${loc.box ? "box" : loc.band.type === "detail" ? "page" : "band"} (${area.width}×${area.height}): move it in or make it smaller`);
  }

  // Text: room for the words, things it grows over, size, colours
  const texts = kind === "sectionHeading" ? sectionHeadingParts(e as FrameElement).titleParts : e.type === "textField" ? [e] : [];
  for (const t of texts) {
    if (kind === "pageNumber" || kind === "date") continue;
    const needed = neededTextHeight(t);
    if (!grows(t) && needed > t.height + (t.fontSize || 10) * 0.6) {
      fix(`is too small for its words (needs about ${needed} px of height, has ${t.height}): the PDF cuts the rest off. Make it taller or wider, or set grow: true`);
    } else if (grows(t) && needed > t.height && t === e && !loc.box) {
      // The PDF pushes what is below it down by the extra height: say when
      // that runs past the bottom of the page (it then goes to the next page)
      const extra = needed - e.height;
      const lowest = Math.max(e.y + e.height, ...neighbours(loc).filter((o) => o.y >= e.y + e.height - 1).map((o) => o.y + o.height));
      if (lowest + extra > area.height + 0.5) {
        check(`grows to about ${needed} px in the PDF (has ${e.height}), pushing what is below it ${extra} px down, past the bottom of the ${loc.band.type === "detail" ? "page" : "band"}: the last items will move onto a new page. Make room (shorter text, smaller items) if they should stay on this page`);
      }
    }
  }
  if (e.type === "textField" && kind !== "pageNumber" && (e.fontSize ?? 10) < 6) check(`has very small text (${e.fontSize} pt); 7 pt or more prints readably`);
  if ((e.type === "textField" || kind === "sectionHeading") && printedText(texts[0] ?? e).trim()) {
    const colour = (texts[0] ?? e).forecolor || "#000000";
    const back = backgroundOf(loc);
    const ratio = contrast(colour, back);
    // Only text that all but disappears (accent colours such as gold on white are a design choice)
    if (ratio < 1.8) fix(`can hardly be seen: ${colour} text on ${back} (contrast ${ratio.toFixed(1)}:1): give it a colour that stands out from what is behind it`);
  }

  // Text against the page border line (the border prints round the printable area)
  if (pageBorderShown(loc)) {
    const width = printableWidth();
    // Each text checks itself (a heading's or box's texts are elements too)
    if (e.type === "textField" && printedText(e).trim()) {
      const left = (loc.box?.x ?? 0) + e.x;
      const align = e.textAlignment ?? "Left";
      const touchesLeft = left < BORDER_GAP && (align === "Left" || align === "Justified");
      const touchesRight = left + e.width > width - BORDER_GAP && align === "Right";
      if (touchesLeft || touchesRight) {
        fix(`touches the page border line on the ${touchesLeft ? "left" : "right"}: keep text at least ${BORDER_GAP} px inside the border (move ${loc.box ? "its box" : "it"} in, or make it narrower)`);
      }
    }
  }

  // Words left from a design or ready-made piece
  const words = e.type === "textField" ? printedText(e).trim().toLowerCase() : "";
  if (words && placeholders().has(words)) check(`still shows the placeholder "${printedText(e).trim()}": put in the real words (ask the user when you don't know them)`);
  if (kind === "sectionHeading") {
    const title = sectionHeadingParts(e as FrameElement).titleParts[0];
    if (title && placeholders().has(printedText(title).trim().toLowerCase())) check("still has the placeholder title");
  }

  // Things that print nothing, or the wrong thing
  if (e.type === "image" && !(e as { imageExpression?: string }).imageExpression?.replace(/"/g, "").trim()) {
    check(`is an empty ${getImageName(e) ? `"${getImageName(e)}" ` : ""}photo spot: it prints nothing until the user drops a picture on it`);
  }
  if (e.type === "chart") {
    const b = (e as ChartElement).binding;
    if (!isChartBound(b)) fix("is not linked to project data: it shows sample numbers and prints nothing (give it data, or the user sets it up)");
    else if (!isChartComplete(b)) fix("is linked but not complete: it prints nothing until it has what its type needs");
  }
  if (e.type === "table" && !(e as TableElement).binding) fix("is an empty data table: it prints nothing until a source is chosen");
  if (e.type === "barcode") {
    const b = e as BarcodeElement;
    const value = readBarcodeValue(b.codeExpression);
    const problem = value.isExpression ? null : checkBarcodeValue(b.barcodeType, value.text.trim());
    if (problem) fix(`has a value its ${b.barcodeType} type can't hold (${i18n.global.t(`barcode.problems.${problem.key}`, problem.params ?? {})}): the PDF would print the wrong code`);
  }
  return out;
}

// Everything: per element (overlaps, in a box's area, on a shape, the checks
// above) and over the whole report (empty pages, headings)
export function reportChecks(): ReportCheck[] {
  const r = useReportStore();
  const props = r.reportProperties;
  const locations = allLocations();
  const out: ReportCheck[] = [];
  const seen = new Set<string>();

  for (const loc of locations) {
    const where = whereOf(loc);
    for (const other of overlapsOf(loc)) {
      const key = [loc.element.uuid, other.uuid].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ level: "fix", where, uuid: loc.element.uuid, message: `${label(loc.element, loc.band.type)} overlaps ${label(other, loc.band.type)}` });
    }
    const box = boxAround(loc);
    if (box) out.push({ level: "fix", where, uuid: loc.element.uuid, message: `${label(loc.element, loc.band.type)} lies in box ${box.uuid}'s area but is not in it (put_in_box, or move it out)` });
    const shape = box ? null : shapeUnder(loc);
    if (shape) out.push({ level: "check", where, uuid: loc.element.uuid, message: `${label(loc.element, loc.band.type)} lies on ${shape.type === "ellipse" ? "circle" : "rectangle"} ${shape.uuid} without being in it (fine if the user wants it so; else ask about convert_to_box)` });
    out.push(...elementChecks(loc));
  }

  // Pages
  const detailIndex = r.bands.findIndex((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
  const detail = r.bands[detailIndex];
  const { count } = specialPages(props);
  const onPage = (p: number) => (detail?.elements ?? []).filter((e) => (e.pageIndex ?? 0) === p);
  const normalPages = Array.from({ length: Math.max(0, r.totalPages - count) }, (_, i) => i + count);
  if (normalPages.some((p) => onPage(p).length)) {
    for (const p of normalPages) {
      if (!onPage(p).length) out.push({ level: "check", where: `page ${p + 1}`, message: `page ${p + 1} is empty and prints as a blank page (delete_page, or fill it)` });
    }
  }

  // Cover and contents pages: designed, and holding a real Table of Contents
  const special = specialPages(props);
  if (special.cover && !onPage(0).length) {
    out.push({ level: "fix", where: "page 1", message: "the cover page is empty: design it (title, subtitle, date, organisation, colour panels / accent shapes) on page 1" });
  }
  const contentsIdx = Array.from({ length: special.contents }, (_, i) => i + (special.cover ? 1 : 0));
  if (contentsIdx.length && !contentsIdx.some((p) => onPage(p).some((e) => e.type === "contentsList"))) {
    out.push({ level: "fix", where: `page ${contentsIdx[0]! + 1}`, message: `the contents page has no Table of Contents: add one tableOfContents element (automatic) on page ${contentsIdx[0]! + 1}` });
  }
  // A table of contents typed as separate texts ("1. Introduction ....... 2"): its
  // page numbers are guesses and it doesn't follow the headings
  const LEADER_ROW = /(\.\s?){4,}\s*\d+\s*$/;
  for (let p = 0; p < r.totalPages; p++) {
    const rows = onPage(p).filter((e) => e.type === "textField" && LEADER_ROW.test(printedText(e).trim()));
    if (rows.length >= 3) {
      out.push({ level: "fix", where: `page ${p + 1}`, message: `${rows.length} texts on page ${p + 1} are a table of contents typed by hand (${rows.slice(0, 3).map((e) => e.uuid).join(", ")}…): its page numbers are guesses. Delete them and use one tableOfContents element${contentsIdx.length ? ` on the contents page (page ${contentsIdx[0]! + 1})` : ""}` });
    }
  }
  if (contentsIdx.length) {
    for (const p of normalPages) {
      const title = onPage(p).find((e) => e.type === "textField" && /^(table of )?contents$/i.test(printedText(e).trim()));
      if (title) out.push({ level: "check", where: `page ${p + 1}`, uuid: title.uuid, message: `"${printedText(title).trim()}" is on content page ${p + 1}; the contents belong on the contents page (page ${contentsIdx[0]! + 1})` });
    }
  }

  // Normal pages that are mostly empty (a short summary where a page of content was meant)
  if (detail && normalPages.filter((p) => onPage(p).length).length > 1) {
    for (const p of normalPages) {
      const items = onPage(p);
      if (!items.length) continue;
      const usedTo = Math.max(...items.map((e) => e.y + e.height));
      // A page whose text grows in the PDF uses more than its design height shows
      const grown = items.reduce((n, e) => n + (e.type === "textField" && grows(e) ? Math.max(0, neededTextHeight(e) - e.height) : 0), 0);
      if (usedTo + grown < detail.height * 0.45) {
        out.push({ level: "check", where: `page ${p + 1}`, message: `page ${p + 1} is mostly empty (its content ends at y ${Math.round(usedTo + grown)} of ${detail.height}): add more content (fill_page continues under what is there), or move the next page's content up` });
      }
    }
  }

  // Headings: stranded at the bottom, repeated, styled differently, a sub-heading before any section
  const headings = locations.filter((l) => !l.box && l.band.type === BAND_TYPE_CONSTANTS.DETAIL && pageKind(props, l.element.pageIndex) === "normal" && (hasProperty(l.element, SECTION_HEADING_PROPERTY) || hasProperty(l.element, SUB_HEADING_PROPERTY)));
  const ordered = [...headings].sort((a, b) => (a.element.pageIndex ?? 0) - (b.element.pageIndex ?? 0) || a.element.y - b.element.y);
  for (const h of ordered) {
    const e = h.element;
    const below = onPage(e.pageIndex ?? 0).filter((o) => o !== e && o.y >= e.y + e.height - 1);
    if (detail && e.y + e.height > detail.height - 60 && !below.length) {
      out.push({ level: "check", where: whereOf(h), uuid: e.uuid, message: `${label(e, h.band.type)} sits at the bottom of the page with nothing under it: move it to the top of the next page, with its content` });
    }
  }
  const sections = ordered.filter((h) => hasProperty(h.element, SECTION_HEADING_PROPERTY));
  const titleOf = (h: Location) => printedText(sectionHeadingParts(h.element as FrameElement).titleParts[0] ?? h.element).trim();
  const byTitle = new Map<string, Location[]>();
  for (const s of sections) byTitle.set(titleOf(s).toLowerCase(), [...(byTitle.get(titleOf(s).toLowerCase()) ?? []), s]);
  for (const [title, same] of byTitle) {
    if (title && same.length > 1) {
      out.push({ level: "check", where: same.map(whereOf).join(", "), message: `${same.length} Section Headings are titled "${titleOf(same[0]!)}" (${same.map((s) => s.element.uuid).join(", ")}): the Table of Contents lists it ${same.length} times. Delete the extra one(s) unless they are meant` });
    }
  }
  const looks = new Set(sections.map((s) => { const t = sectionHeadingParts(s.element as FrameElement).titleParts[0]; return `${t?.fontSize}|${t?.forecolor}|${t?.isBold}`; }));
  if (looks.size > 1) out.push({ level: "check", where: "report", message: `the Section Headings don't all look the same (${looks.size} different sizes / colours): give them one look (update_elements_style)` });
  const firstSub = ordered.find((h) => hasProperty(h.element, SUB_HEADING_PROPERTY));
  if (firstSub && (!sections.length || ordered.indexOf(firstSub) < ordered.indexOf(sections[0]!))) {
    out.push({ level: "check", where: whereOf(firstSub), uuid: firstSub.element.uuid, message: `the Sub-heading ${firstSub.element.uuid} comes before any Section Heading: the Table of Contents has no section to put it under` });
  }
  const followingToc = locations.find((l) => l.element.type === "contentsList" && (l.element as { list?: { follow?: boolean } }).list?.follow);
  if (followingToc && !sections.length) {
    out.push({ level: "check", where: whereOf(followingToc), uuid: followingToc.element.uuid, message: "the automatic Table of Contents has no Section Headings to list: it shows sample rows. Add Section Headings to the pages (or give it manual rows)" });
  }
  return out;
}

// For the design state: "fix" first, then "check", at most `max`
export function reportChecksText(max = 40): string {
  const all = reportChecks();
  if (!all.length) return "Report checks: none.";
  const sorted = [...all.filter((c) => c.level === "fix"), ...all.filter((c) => c.level === "check")];
  const lines = sorted.slice(0, max).map((c) => `- [${c.level}] ${c.where}: ${c.message}`);
  if (sorted.length > max) lines.push(`- … ${sorted.length - max} more (check_report lists them all)`);
  return `Report checks (fix = prints wrong, fix it; check = unfinished, finish it or tell the user):\n${lines.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Before the AI may finish: what it left wrong
// ---------------------------------------------------------------------------

// The same finding before and after a change (positions and numbers ignored)
export const findingKey = (c: ReportCheck) =>
  `${c.level}|${c.uuid ?? c.where}|${c.message.replace(/\(x [^)]*\)/g, "").replace(/\d+/g, "#")}`;

// [fix] findings that weren't there before the message, and the planned pages
// that are still missing their content
export function verificationIssues(plan: { cover: boolean; contents: boolean; pages: number[] } | undefined, baseline: Set<string>): string[] {
  const r = useReportStore();
  const all = reportChecks();
  const issues = all.filter((c) => c.level === "fix" && !baseline.has(findingKey(c))).map((c) => `[fix] ${c.where}: ${c.message}`);
  if (plan) {
    const detail = r.bands.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
    const onPage = (p: number) => (detail?.elements ?? []).filter((e) => (e.pageIndex ?? 0) === p);
    const special = specialPages(r.reportProperties);
    if (plan.cover && special.cover && onPage(0).length < 3) issues.push("[plan] the cover page (page 1) is not designed yet: it needs a real composition (title, subtitle, date / organisation, colour panels or accent shapes)");
    const contentsPage = special.cover ? 1 : 0;
    if (plan.contents && special.contents && !onPage(contentsPage).some((e) => e.type === "contentsList")) {
      issues.push(`[plan] the contents page (page ${contentsPage + 1}) has no tableOfContents element`);
    }
    for (const p of plan.pages) {
      if (!onPage(p).length) issues.push(`[plan] page ${p + 1} has no content yet (fill_page)`);
    }
    for (const c of all) if (c.level === "check" && /is mostly empty/.test(c.message) && plan.pages.some((p) => c.where === `page ${p + 1}`)) issues.push(`[plan] ${c.message}`);
  }
  return issues;
}
