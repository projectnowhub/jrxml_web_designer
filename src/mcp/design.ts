// The report as the AI tools see it: finding elements, where a new element
// goes (band, page, box) and the rules the designer applies when a user adds
// one by hand (cover / contents page rules, one page border, boxes don't nest,
// band growth, fitting the page), plus the design state the model reads.

import type { Band, BandType, DesignElement, FrameElement } from "@/types";
import { useReportStore } from "@/stores/report";
import { BAND_CONSTANTS, BAND_TYPE_CONSTANTS, getEffectiveDefaultBandLimits } from "@/constants/constants";
import { resolveReportFont } from "@/config/fonts.config";
import { pageKind, specialPageArea, specialPageProblem, specialPages } from "@/utils/specialPages";
import { findPageBorder, frame, markBoxPart } from "@/utils/framePresets";
import { DESIGN_BOX_PROPERTY } from "@/utils/pageDesigns";
import { listChain } from "@/utils/headingSync";
import i18n from "@/i18n";
import { findKind, kindOf } from "./elements/registry";
import { has } from "./elements/common";
import { SpecError, type ElementKind, type ElementSpec, type KindContext } from "./elements/types";
import { reportChecksText } from "./reportChecks";
import type { ContentsListElement } from "@/types";

export interface Location {
  bandIndex: number;
  band: Band;
  element: DesignElement;
  // Its list (the band's or its box's) and place in it
  container: DesignElement[];
  index: number;
  // The box it is in
  box?: FrameElement;
  boxIndex?: number;
}

const t = (key: string, named?: Record<string, unknown>) => i18n.global.t(key, named ?? {});

// ---------------------------------------------------------------------------
// Finding elements
// ---------------------------------------------------------------------------

export function allLocations(): Location[] {
  const out: Location[] = [];
  useReportStore().bands.forEach((band, bandIndex) => {
    (band.elements ?? []).forEach((element, index) => {
      out.push({ bandIndex, band, element, container: band.elements, index });
      if (element.type === "frame") {
        const box = element as FrameElement;
        (box.elements ?? []).forEach((child, i) =>
          out.push({ bandIndex, band, element: child, container: box.elements!, index: i, box, boxIndex: index }),
        );
      }
    });
  });
  return out;
}

export const findElement = (uuid: string): Location | null =>
  allLocations().find((l) => l.element.uuid === uuid) ?? null;

export function kindAt(loc: Location): ElementKind | undefined {
  return kindOf(loc.element, loc.band.type);
}

// The detail page an element is on (inside a box: the box's)
export const pageOf = (loc: Location): number | undefined =>
  loc.band.type === BAND_TYPE_CONSTANTS.DETAIL ? ((loc.box ?? loc.element).pageIndex ?? 0) : undefined;

// ---------------------------------------------------------------------------
// Page and band sizes
// ---------------------------------------------------------------------------

export function printableSize() {
  const r = useReportStore();
  const p = r.reportProperties;
  return {
    width: Math.round(r.paperWidth - (p.leftMargin || 0) - (p.rightMargin || 0)),
    height: Math.round(r.paperHeight - (p.topMargin || 0) - (p.bottomMargin || 0)),
  };
}

// The most a band may grow to (its maximum setting and the room left on the
// page), as when an element is dropped in it; Detail fills what is left
function bandMaxHeight(bandIndex: number): number {
  const r = useReportStore();
  const band = r.bands[bandIndex];
  if (!band) return 0;
  if (band.type === BAND_TYPE_CONSTANTS.DETAIL || band.type === BAND_TYPE_CONSTANTS.BACKGROUND) return band.height;
  const limits = r.reportProperties.bandLimits?.[band.type] ?? getEffectiveDefaultBandLimits()[band.type] ?? { min: 20, max: 70 };
  const others = r.bands
    .filter((b, i) => i !== bandIndex && b.type !== BAND_TYPE_CONSTANTS.DETAIL && b.type !== BAND_TYPE_CONSTANTS.BACKGROUND)
    .reduce((sum, b) => sum + (b.height || 0), 0);
  const room = printableSize().height - others - (BAND_CONSTANTS.MIN_HEIGHT || 20);
  return Math.max(band.height, Math.min(limits.max ?? 70, room));
}

// The area an element is placed in: a cover / contents page is the whole
// (printable or sheet) page; otherwise the band, which may grow to maxHeight
export function areaOf(bandIndex: number, pageIndex?: number) {
  const r = useReportStore();
  const band = r.bands[bandIndex]!;
  const special = band.type === BAND_TYPE_CONSTANTS.DETAIL ? specialPageArea(r.reportProperties, pageIndex) : null;
  if (special) return { width: Math.round(special.width), height: Math.round(special.height), maxHeight: Math.round(special.height) };
  return { width: printableSize().width, height: band.height, maxHeight: bandMaxHeight(bandIndex) };
}

export function kindContext(width: number, height: number, notes: string[] = []): KindContext {
  const font = useReportStore().reportProperties.defaultFont;
  return {
    availableWidth: width,
    availableHeight: height,
    fontName: resolveReportFont(font?.name),
    fontSize: Math.min(font?.size || 10, 12),
    t,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Pages: what each one is and how much of it is used
// ---------------------------------------------------------------------------

// "1 cover, 2 contents, 3-9 normal"
export function pageKinds(): string {
  const r = useReportStore();
  const runs: string[] = [];
  let start = 0;
  for (let i = 1; i <= r.totalPages; i++) {
    const kind = pageKind(r.reportProperties, start);
    if (i === r.totalPages || pageKind(r.reportProperties, i) !== kind) {
      runs.push(`${start + 1 === i ? start + 1 : `${start + 1}-${i}`} ${kind}`);
      start = i;
    }
  }
  return runs.join(", ");
}

// Space kept inside the page border (none without one, more on a whole-sheet cover)
export function contentInset(pageIndex: number | undefined): number {
  const r = useReportStore();
  if (pageIndex !== undefined && pageKind(r.reportProperties, pageIndex) === "cover" && specialPages(r.reportProperties).fullPageCover) return 24;
  return findPageBorder(r.bands) ? 12 : 0;
}

export interface PageFacts {
  page: number;
  kind: string;
  width: number;
  height: number;
  // Where content goes: from x contentLeft, contentWidth wide
  contentLeft: number;
  contentWidth: number;
  // Bottom of the lowest element on the page (0: empty), and the room under it
  usedTo: number;
  roomLeft: number;
  wholeSheet?: boolean;
}

export function pageFacts(pageIndex: number): PageFacts {
  const r = useReportStore();
  const detailIndex = r.bands.findIndex((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
  const area = areaOf(detailIndex, pageIndex);
  const inset = contentInset(pageIndex);
  const on = (r.bands[detailIndex]?.elements ?? []).filter((e) => (e.pageIndex ?? 0) === pageIndex);
  const usedTo = on.length ? Math.max(...on.map((e) => e.y + e.height)) : 0;
  const kind = pageKind(r.reportProperties, pageIndex);
  return {
    page: pageIndex + 1,
    kind,
    width: area.width,
    height: area.height,
    contentLeft: inset,
    contentWidth: area.width - 2 * inset,
    usedTo: Math.round(usedTo),
    roomLeft: Math.round(area.height - usedTo),
    ...(kind === "cover" && specialPages(r.reportProperties).fullPageCover ? { wholeSheet: true } : {}),
  };
}

export const pageFactsText = (f: PageFacts) =>
  `page ${f.page} (${f.kind}${f.wholeSheet ? ", whole sheet: x / y from the paper's corner" : ""}): ${f.width}×${f.height} px, content x ${f.contentLeft}-${f.contentLeft + f.contentWidth}, ${f.usedTo ? `used to y ${f.usedTo} (${f.roomLeft} px free)` : "empty"}`;

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

// What stops an element from going on a detail page (as on a drop)
export function pageRule(element: DesignElement, pageIndex: number): string | null {
  const props = useReportStore().reportProperties;
  const kind = pageKind(props, pageIndex);
  const problem = specialPageProblem(element, kind);
  if (problem) return t(`specialPages.notAllowed.${problem}`);
  if (element.type === "contentsList" && kind === "contents") {
    const detail = useReportStore().bands.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
    const own = new Set(detail ? listChain(detail.elements, element as ContentsListElement).map((l) => l.uuid) : [element.uuid]);
    const other = (detail?.elements ?? []).find(
      (e) => e.type === "contentsList" && !own.has(e.uuid) && pageKind(props, e.pageIndex) === "contents",
    );
    if (other) return `${t("specialPages.notAllowed.secondContents")} (existing: ${other.uuid}; change it with update_element)`;
  }
  return null;
}

function checkFits(element: DesignElement, area: { width: number; height: number }, where: string): void {
  if (element.x + element.width > area.width + 0.5) {
    throw new SpecError(
      `doesn't fit across ${where}: x ${element.x} + width ${element.width} = ${element.x + element.width}, but ${where} is ${area.width} px wide`,
    );
  }
}

// Bottom inside the area, growing a band that may grow
function fitDown(loc: { bandIndex: number }, element: DesignElement, area: { height: number; maxHeight: number }, notes: string[]): void {
  const bottom = element.y + element.height;
  if (bottom <= area.height + 0.5) return;
  const band = useReportStore().bands[loc.bandIndex]!;
  if (bottom <= area.maxHeight) {
    notes.push(`the ${band.type} band grew from ${band.height} to ${Math.ceil(bottom)} px to hold it`);
    band.height = Math.ceil(bottom);
    return;
  }
  throw new SpecError(
    `doesn't fit: its bottom would be at ${bottom} px but the ${band.type === "detail" ? "page body" : `${band.type} band`} can be at most ${area.maxHeight} px tall; move it up, make it smaller, or put it on another page`,
  );
}

// ---------------------------------------------------------------------------
// Placing a new element
// ---------------------------------------------------------------------------

export interface Placed {
  location: Location;
  kind: ElementKind;
}

// Refs given in one create_design call (ref → uuid)
export type Refs = Map<string, string>;

function resolveBox(parent: string, refs: Refs): Location {
  const uuid = refs.get(parent) ?? parent;
  const loc = findElement(uuid);
  if (!loc) throw new SpecError(`parent: no element "${parent}"`);
  if (loc.element.type !== "frame" || kindAt(loc)?.kind !== "box") {
    throw new SpecError(`parent: ${parent} is a ${kindAt(loc)?.kind ?? loc.element.type}, not a box`);
  }
  return loc;
}

// Add an element of `kind` made from `spec`, with the designer's rules
export async function placeNew(kind: ElementKind, spec: ElementSpec, refs: Refs, notes: string[]): Promise<Placed> {
  const report = useReportStore();
  if (kind.fixedPlace) return placePageBorder(kind, spec, notes);
  const autoPlaced = !has(spec, "x") && !has(spec, "y");

  if (spec.parent) {
    const boxLoc = resolveBox(spec.parent, refs);
    const box = boxLoc.element as FrameElement;
    if (!kind.inBox) throw new SpecError(`a ${kind.kind} can't go in a box`);
    const pageIndex = pageOf(boxLoc);
    const element = await kind.create(spec, kindContext(box.width, box.height, notes));
    if (autoPlaced) kind.autoPlace?.(element, spec, box);
    if (element.type === "contentsList" && pageIndex !== undefined && pageKind(report.reportProperties, pageIndex) !== "normal") {
      throw new SpecError(t("specialPages.notAllowed.contentsListInBox"));
    }
    if (pageIndex !== undefined) {
      const rule = pageRule(element, pageIndex);
      if (rule) throw new SpecError(rule);
    }
    checkFits(element, box, "the box");
    if (element.y + element.height > box.height + 0.5) {
      throw new SpecError(`doesn't fit in the box: y ${element.y} + height ${element.height} = ${element.y + element.height}, but the box is ${box.height} px tall`);
    }
    refuseDuplicate(element, box.elements ?? [], boxLoc.band.type);
    // Part of the box: kept inside it and moved with it
    markBoxPart(element);
    box.elements = box.elements ?? [];
    box.elements.push(element);
    return {
      kind,
      location: { ...boxLoc, element, container: box.elements, index: box.elements.length - 1, box, boxIndex: boxLoc.index },
    };
  }

  const bandType = (spec.bandType as string | undefined) ?? kind.defaultBand?.(spec) ?? BAND_TYPE_CONSTANTS.DETAIL;
  const bandIndex = report.bands.findIndex((b) => b.type === bandType);
  if (bandIndex === -1) {
    throw new SpecError(
      `the report has no ${bandType} band (it has ${report.bands.map((b) => b.type).join(", ")}); use another band, or ask the user to turn it on in Page Settings`,
    );
  }
  const band = report.bands[bandIndex]!;
  const isDetail = band.type === BAND_TYPE_CONSTANTS.DETAIL;
  if (kind.kind === "dataTable" && !isDetail) throw new SpecError("a data table can only go in the detail band");

  let pageIndex: number | undefined;
  if (isDetail) {
    // Several pages: the page must be said (a cover's title once landed on page 3)
    if (!has(spec, "page") && report.totalPages > 1) {
      throw new SpecError(
        `page: say which page it goes on (1-${report.totalPages}: ${pageKinds()}); headers and footers go in bandType pageHeader / pageFooter`,
      );
    }
    pageIndex = has(spec, "page") ? spec.page - 1 : specialPages(report.reportProperties).count;
    if (pageIndex! > report.totalPages) {
      throw new SpecError(`page: the report has ${report.totalPages} page(s); use add_page first, or page ${report.totalPages + 1} to add one`);
    }
    if (pageIndex === report.totalPages) {
      report.pageCount = report.totalPages + 1;
      notes.push(`page ${pageIndex! + 1} was added`);
    }
  } else if (has(spec, "page")) {
    notes.push(`page ignored: the ${bandType} band repeats on every normal page`);
  }

  const area = areaOf(bandIndex, pageIndex);
  const element = await kind.create(spec, kindContext(area.width, area.maxHeight, notes));
  if (pageIndex !== undefined) {
    element.pageIndex = pageIndex;
    const rule = pageRule(element, pageIndex);
    if (rule) throw new SpecError(rule);
  }
  if (autoPlaced) kind.autoPlace?.(element, spec, area);
  checkFits(element, area, "the printable area");
  refuseDuplicate(
    element,
    band.elements.filter((e) => !isDetail || (e.pageIndex ?? 0) === pageIndex),
    band.type,
  );
  fitDown({ bandIndex }, element, area, notes);
  // Boxes keep being boxes when the report is opened again (old cover boxes are unwrapped)
  if (element.type === "frame" && isDetail) {
    element.properties = [...(element.properties ?? []).filter((p) => p.name !== DESIGN_BOX_PROPERTY), { name: DESIGN_BOX_PROPERTY, value: "true" }];
  }
  band.elements.push(element);
  return { kind, location: { bandIndex, band, element, container: band.elements, index: band.elements.length - 1 } };
}

// Made twice (a call sent again after it had worked): refused, naming the first one
function refuseDuplicate(element: DesignElement, others: DesignElement[], bandType: string): void {
  const twin = duplicateOf(element, others, bandType);
  if (twin) {
    throw new SpecError(
      `the same ${kindOf(twin, bandType)?.kind ?? twin.type} is already there (${twin.uuid}), probably made by an earlier call; don't create it again (change or move that one instead)`,
    );
  }
}

// The page border: a frame of the printable area in the Background band (one only)
async function placePageBorder(kind: ElementKind, spec: ElementSpec, notes: string[]): Promise<Placed> {
  const report = useReportStore();
  const existing = findPageBorder(report.bands);
  if (existing) {
    const uuid = report.bands[existing.bandIndex]!.elements[existing.elementIndex]!.uuid;
    throw new SpecError(`the report already has a page border (${uuid}); change it with update_element`);
  }
  const size = printableSize();
  let bandIndex = report.bands.findIndex((b) => b.type === BAND_TYPE_CONSTANTS.BACKGROUND);
  if (bandIndex === -1) {
    report.bands.push({ type: BAND_TYPE_CONSTANTS.BACKGROUND as BandType, height: size.height, elements: [] });
    bandIndex = report.bands.length - 1;
  }
  const band = report.bands[bandIndex]!;
  band.height = size.height;
  const element = await kind.create(spec, kindContext(size.width, size.height, notes));
  band.elements.push(element);
  if (specialPages(report.reportProperties).fullPageCover) notes.push(t("specialPages.borderNotOnCover"));
  return { kind, location: { bandIndex, band, element, container: band.elements, index: band.elements.length - 1 } };
}

// ---------------------------------------------------------------------------
// Changing an element
// ---------------------------------------------------------------------------

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// Apply settings with the kind's own rules; undone when the result breaks a rule
export async function updateAt(loc: Location, kind: ElementKind, spec: ElementSpec, notes: string[]): Promise<void> {
  const element = loc.element;
  const backup = clone(element);
  const bandHeight = loc.band.height;
  try {
    const pageIndex = pageOf(loc);
    const area = loc.box ? { width: loc.box.width, height: loc.box.height, maxHeight: loc.box.height } : areaOf(loc.bandIndex, pageIndex);
    await kind.update(element, spec, kindContext(area.width, area.maxHeight, notes));
    if (has(spec, "page")) {
      if (loc.band.type !== BAND_TYPE_CONSTANTS.DETAIL || loc.box) throw new SpecError("page: only elements placed directly on a detail page can move to another page");
      const report = useReportStore();
      if (spec.page > report.totalPages) throw new SpecError(`page: the report has ${report.totalPages} page(s)`);
      element.pageIndex = spec.page - 1;
    }
    const nowPage = pageOf(loc);
    if (nowPage !== undefined) {
      const rule = pageRule(loc.box ?? element, nowPage);
      if (rule) throw new SpecError(rule);
    }
    if (loc.box) {
      checkFits(element, loc.box, "the box");
      if (element.y + element.height > loc.box.height + 0.5) {
        throw new SpecError(`doesn't fit in the box: bottom at ${element.y + element.height}, the box is ${loc.box.height} px tall`);
      }
    } else if (loc.band.type !== BAND_TYPE_CONSTANTS.BACKGROUND) {
      const now = areaOf(loc.bandIndex, nowPage);
      checkFits(element, now, "the printable area");
      fitDown(loc, element, now, notes);
    }
  } catch (error) {
    for (const key of Object.keys(element)) delete (element as unknown as Record<string, unknown>)[key];
    Object.assign(element, backup);
    loc.band.height = bandHeight;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Design rule: a coloured panel with things on it is a box holding them
// ---------------------------------------------------------------------------

const inside = (e: DesignElement, p: DesignElement) =>
  e.x >= p.x - 0.5 && e.y >= p.y - 0.5 && e.x + e.width <= p.x + p.width + 0.5 && e.y + e.height <= p.y + p.height + 0.5;

// Among elements just created on the same band / page: each item that lies
// wholly on an opaque rectangle (not a page-wide one) goes into the smallest
// such panel, which becomes a box (keeping its uuid). Returns what changed.
export function boxUpCreated(created: Location[]): string[] {
  const out: string[] = [];
  const groups = new Map<string, Location[]>();
  for (const loc of created) {
    if (loc.box) continue;
    const key = `${loc.bandIndex}:${loc.element.pageIndex ?? 0}`;
    groups.set(key, [...(groups.get(key) ?? []), loc]);
  }
  for (const group of groups.values()) {
    const area = areaOf(group[0]!.bandIndex, group[0]!.element.pageIndex);
    const isPanel = (e: DesignElement) =>
      e.type === "rectangle" && e.mode === "Opaque" && e.width * e.height < area.width * area.maxHeight * 0.9;
    const owner = new Map<DesignElement, DesignElement>();
    for (const { element } of group) {
      const kind = kindOf(element, group[0]!.band.type);
      if (!kind?.inBox || element.type === "contentsList") continue;
      let best: DesignElement | undefined;
      for (const { element: p } of group) {
        if (p !== element && isPanel(p) && inside(element, p) && (!best || p.width * p.height < best.width * best.height)) best = p;
      }
      if (best) owner.set(element, best);
    }
    // A panel holding things is not itself put in a box (boxes don't nest)
    for (const holder of new Set(owner.values())) owner.delete(holder);
    for (const panel of new Set(owner.values())) {
      const children = [...owner.entries()].filter(([, p]) => p === panel).map(([c]) => c);
      shapeToBox(group[0]!.band, panel, children);
      out.push(`rectangle ${panel.uuid} became a box holding ${children.map((c) => c.uuid).join(", ")} (panels with content are boxes)`);
    }
  }
  return out;
}

type ShapeLike = DesignElement & { pen?: { lineWidth?: number; lineStyle?: string; lineColor?: string }; radius?: number };

// A rectangle or circle made into a box with the same look (keeping its uuid
// and place), holding `children` (elements of the same band, moved into it as
// its parts). A circle becomes a box rounded by half its size.
export function shapeToBox(band: Band, shape: DesignElement, children: DesignElement[]): FrameElement {
  const r = shape as ShapeLike;
  const filled = shape.mode === "Opaque" && !!shape.backcolor;
  const radius = shape.type === "ellipse" ? Math.floor(Math.min(shape.width, shape.height) / 2) : r.radius;
  const box: FrameElement = {
    ...frame(shape.width, shape.height, {
      mode: filled ? "Opaque" : "Transparent",
      backcolor: shape.backcolor ?? "#FFFFFF",
      box: r.pen?.lineWidth ? { pen: { ...r.pen } } : undefined,
    }),
    uuid: shape.uuid,
    x: shape.x,
    y: shape.y,
    ...(shape.pageIndex !== undefined ? { pageIndex: shape.pageIndex } : {}),
    ...(radius ? { radius } : {}),
    properties: [{ name: DESIGN_BOX_PROPERTY, value: "true" }],
    elements: children.map((c) => {
      const child = { ...c, x: Math.round(c.x - shape.x), y: Math.round(c.y - shape.y) } as DesignElement;
      delete child.pageIndex;
      markBoxPart(child);
      return child;
    }),
  };
  band.elements.splice(band.elements.indexOf(shape), 1, box);
  for (const c of children) band.elements.splice(band.elements.indexOf(c), 1);
  return box;
}

// Elements lying wholly on a shape, in the same band and page, that a box could hold
export function itemsOn(loc: Location): DesignElement[] {
  const shape = loc.element;
  return (loc.band.elements ?? []).filter((e) => {
    if (e === shape || (e.pageIndex ?? 0) !== (shape.pageIndex ?? 0) || !inside(e, shape)) return false;
    // Drawn above the shape (later in the list), and allowed in a box
    if (loc.band.elements.indexOf(e) < loc.band.elements.indexOf(shape)) return false;
    const kind = kindOf(e, loc.band.type);
    return !!kind?.inBox && e.type !== "contentsList";
  });
}

// The rectangle or circle a new element lies on without being inside it (it
// won't move with it): the model is told, so it can offer a box
export function shapeUnder(loc: Location): DesignElement | null {
  if (loc.box) return null;
  const el = loc.element;
  const under = (loc.band.elements ?? []).filter(
    (s) =>
      s !== el &&
      (s.type === "rectangle" || s.type === "ellipse") &&
      (s.pageIndex ?? 0) === (el.pageIndex ?? 0) &&
      inside(el, s) &&
      // Page-wide backgrounds are not panels
      s.width * s.height < areaOf(loc.bandIndex, el.pageIndex).width * areaOf(loc.bandIndex, el.pageIndex).maxHeight * 0.9,
  );
  return under.sort((a, b) => a.width * a.height - b.width * b.height)[0] ?? null;
}

// ---------------------------------------------------------------------------
// Neighbours: overlaps, duplicates, lying in a box's area without being in it
// ---------------------------------------------------------------------------

// The other elements in the same place: its box, or its band (and detail page)
export function neighbours(loc: Location): DesignElement[] {
  const page = loc.element.pageIndex ?? 0;
  return loc.container.filter(
    (e) => e !== loc.element && (loc.box || loc.band.type !== BAND_TYPE_CONSTANTS.DETAIL || (e.pageIndex ?? 0) === page),
  );
}

// How much two elements cover each other (width and height of the shared part)
const shared = (a: DesignElement, b: DesignElement) => ({
  w: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  h: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
});

// Drawn lines with nothing filled in (rules, outlines, frames round the page):
// things may cross them on purpose
const outlineOnly = (e: DesignElement) =>
  e.type === "line" || ((e.type === "rectangle" || e.type === "ellipse") && !(e.mode === "Opaque" && e.backcolor));

// Elements it runs into: they cover each other by more than a few px each way,
// and neither lies wholly on the other (that is "on a shape" / "in a box's
// area", told separately). Lines, outlines and the background layer never count.
export function overlapsOf(loc: Location): DesignElement[] {
  if (loc.band.type === BAND_TYPE_CONSTANTS.BACKGROUND) return [];
  const el = loc.element;
  if (outlineOnly(el)) return [];
  return neighbours(loc).filter((o) => {
    if (outlineOnly(o)) return false;
    const s = shared(el, o);
    // Lying wholly on a panel or a photo is a design (told as "on a shape" /
    // "in a box's area"); wholly on a chart, table or text it is an overlap
    return s.w > 6 && s.h > 6 && !(inside(el, o) && isBackdrop(o)) && !(inside(o, el) && isBackdrop(el));
  });
}

// What other things may lie on: panels, boxes, photos
const isBackdrop = (e: DesignElement) => e.type === "rectangle" || e.type === "ellipse" || e.type === "frame" || e.type === "image";

// What an element shows, to recognise the same one made twice
function identity(element: DesignElement, bandType: string): string {
  const kind = kindOf(element, bandType);
  const d = kind?.describe(element) ?? {};
  return `${kind?.kind}|${JSON.stringify(d.text ?? d.title ?? d.rows ?? d.value ?? "")}`;
}

// The same element already there (made by an earlier call): same kind, same
// words, covering most of it; or the same kind in exactly the same place
export function duplicateOf(element: DesignElement, others: DesignElement[], bandType: string): DesignElement | null {
  const id = identity(element, bandType);
  return (
    others.find((o) => {
      if (identity(o, bandType) !== id) return false;
      if (o.x === element.x && o.y === element.y && o.width === element.width && o.height === element.height) return true;
      const s = shared(element, o);
      const smaller = Math.min(element.width * element.height, o.width * o.height) || 1;
      return s.w > 0 && s.h > 0 && (s.w * s.h) / smaller >= 0.5 && !id.endsWith('|""');
    }) ?? null
  );
}

// A box whose area it lies in without being one of its items (it won't move
// with the box): the model is told, so it can put it in the box
export function boxAround(loc: Location): FrameElement | null {
  // Only what a box can hold (a Table of Contents never goes in a design box)
  const kind = kindOf(loc.element, loc.band.type);
  if (loc.box || !kind?.inBox || loc.element.type === "contentsList") return null;
  const around = neighbours(loc).filter(
    (b): b is FrameElement => b.type === "frame" && kindOf(b, loc.band.type)?.kind === "box" && inside(loc.element, b),
  );
  return around.sort((a, b) => a.width * a.height - b.width * b.height)[0] ?? null;
}

// Short words for an element in a note
export function label(element: DesignElement, bandType: string): string {
  const kind = kindOf(element, bandType);
  const d = kind?.describe(element) ?? {};
  const words = String(d.text ?? d.title ?? "").slice(0, 30);
  return `${kind?.kind ?? element.type} ${element.uuid}${words ? ` "${words}"` : ""} (x ${element.x}-${element.x + element.width}, y ${element.y}-${element.y + element.height})`;
}

// ---------------------------------------------------------------------------
// Reading the design
// ---------------------------------------------------------------------------

export function describeAt(loc: Location, withChildren = true): Record<string, unknown> {
  const kind = kindAt(loc);
  const el = loc.element;
  const page = pageOf(loc);
  const out: Record<string, unknown> = {
    uuid: el.uuid,
    kind: kind?.kind ?? el.type,
    bandType: loc.band.type,
    ...(page !== undefined && !loc.box ? { page: page + 1 } : {}),
    ...(loc.box ? { parent: loc.box.uuid } : {}),
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    ...(kind ? kind.describe(el) : {}),
  };
  if (withChildren && el.type === "frame" && kind?.kind !== "sectionHeading") {
    const box = el as FrameElement;
    const children = allLocations().filter((l) => l.box === box);
    if (children.length) out.children = children.map((c) => describeAt(c, false));
  }
  return out;
}

const brief = (value: unknown) => {
  const text = JSON.stringify(value);
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
};

// One line per element for the model: uuid, kind, place and its main settings
function line(loc: Location, indent: string): string {
  const d = describeAt(loc, false);
  const { uuid, kind, bandType: _b, page: _p, parent: _parent, x, y, width, height, ...settings } = d;
  return `${indent}- ${uuid} ${kind} @${x},${y} ${width}×${height} ${brief(settings)}`;
}

const MAX_LISTED = 250;

// The report for the model: page, pages, bands, every element, the selection
export function designStateText(selectedUuid?: string): string {
  const r = useReportStore();
  const p = r.reportProperties;
  const size = printableSize();
  const special = specialPages(p);
  const lines: string[] = [];
  lines.push(
    `Paper ${r.paperWidth}×${r.paperHeight} px; margins left ${p.leftMargin} right ${p.rightMargin} top ${p.topMargin} bottom ${p.bottomMargin}; printable area ${size.width}×${size.height} px (x 0 to ${size.width}). Font: ${resolveReportFont(p.defaultFont?.name)} ${p.defaultFont?.size ?? 10} pt.`,
  );
  lines.push(`Pages (${r.totalPages}): ${pageKinds()}.${special.count ? " Cover / contents pages are one area with no header / footer." : ""}`);
  for (let i = 0; i < Math.min(r.totalPages, 40); i++) lines.push(`- ${pageFactsText(pageFacts(i))}`);
  lines.push(
    `Bands on a normal page, top to bottom: ${r.bands
      .filter((b) => b.type !== "background")
      .map((b) => `${b.type} ${b.height} px${b.type === "detail" ? " (page body)" : ` (may grow to ${bandMaxHeight(r.bands.indexOf(b))})`}`)
      .join(", ")}.`,
  );
  const projects = p.projects ?? [];
  lines.push(projects.length ? `Report data projects: ${projects.map((x) => `${x.name} (${x.id})`).join(", ")} (a template uses one project for now: use this one).` : "Report data: no project chosen yet (get_report_data lists them; a template uses one project for now).");
  if (selectedUuid) {
    const sel = findElement(selectedUuid);
    if (sel) lines.push(`Selected element ("this"): ${line(sel, "").slice(2)}`);
  }

  const locations = allLocations();
  lines.push(locations.length ? "Elements (x / y relative to the band, page area, or parent box):" : "Elements: none yet.");
  let listed = 0;
  const sections = new Map<string, Location[]>();
  for (const loc of locations) {
    if (loc.box) continue;
    const page = pageOf(loc);
    const key = page === undefined ? loc.band.type : `detail page ${page + 1} (${pageKind(p, page)})`;
    sections.set(key, [...(sections.get(key) ?? []), loc]);
  }
  for (const [key, items] of sections) {
    lines.push(`${key}:`);
    for (const loc of items) {
      if (listed++ >= MAX_LISTED) break;
      lines.push(line(loc, "  "));
      if (loc.element.type === "frame" && kindAt(loc)?.kind !== "sectionHeading") {
        for (const child of locations.filter((l) => l.box === loc.element)) {
          if (listed++ >= MAX_LISTED) break;
          lines.push(line(child, "    "));
        }
      }
    }
  }
  if (listed > MAX_LISTED) lines.push(`… ${locations.length - MAX_LISTED} more (use find_elements / get_element).`);
  lines.push(reportChecksText());
  return lines.join("\n");
}

export { findKind };
