// Every element stays inside its page section. JasperReports refuses a report
// with an element reaching past its section, so this runs after every change
// (the report store's updateJrxml, same undo step) and covers every way an
// element can get there: rows added to a typed table, a size or place typed in
// the panel, a type switched, a section made smaller, the AI.
//
// - Detail on a normal page: a typed table carries on onto a new page right
//   after (heading rows copied, as Split table here); anything else reaching
//   past the bottom moves to that new page, keeping its place relative to the
//   others moved with it.
// - Page header / footer and column sections: the section grows up to its
//   maximum; past that the element moves up, or is made shorter.
// - A cover / contents page: the element moves up, or is made shorter.
// - Past the left / right edge: moved back in (a project-data table may be
//   wider than the page on purpose).
// Only plain pieces (pictures, charts, shapes, barcodes, text) are made
// shorter; anything else too tall for its section is left with a message.
// Items inside a box are the box's own business (it keeps its parts).

import type { Band, CustomTableElement, DesignElement, ReportProperties } from "@/types";
import i18n from "@/i18n";
import notification from "@/utils/notification";
import { BAND_TYPE_CONSTANTS } from "@/constants/constants";
import { getBandDisplayName } from "@/utils/bandUtils";
import { fitTableToBox, splitRowFor, splitTableElement } from "@/utils/customTable";
import { pageKind } from "@/utils/specialPages";

export type SectionFitNotice =
  | { kind: "tableContinued"; page: number }
  | { kind: "movedToPage"; page: number; count: number }
  | { kind: "movedUp"; band: string }
  | { kind: "madeShorter"; band: string }
  | { kind: "tooTall"; band: string; uuid?: string }
  | { kind: "movedIn" };

export interface SectionFitContext {
  bands: Band[];
  props: ReportProperties;
  // The section's area on a page (a cover / contents page: the whole page),
  // and the most it may grow to
  area(bandIndex: number, pageIndex?: number): { width: number; height: number; maxHeight: number };
  totalPages(): number;
  // A new page right after `pageIndex` (later pages move down one); its index
  addPageAfter(pageIndex: number): number;
  // A header / footer grew: Detail takes what is left of the page
  fitBandsToPage(): void;
  // Being typed in: left alone until the typing ends
  skip(element: DesignElement): boolean;
}

// What may simply be made shorter (or narrower) to fit
const SHRINKABLE = new Set(["image", "chart", "rectangle", "ellipse", "barcode", "textField", "line"]);
// Between a table's continued rows and what moves to the new page with them
const GAP = 10;
// Rounding left over from scaling
const SLACK = 0.5;
// More pages than this in one change means something keeps overflowing
const MAX_PAGES_ADDED = 50;

const isShared = (band: Band) =>
  band.type !== BAND_TYPE_CONSTANTS.DETAIL && band.type !== BAND_TYPE_CONSTANTS.BACKGROUND;

// An element that reaches past the bottom of an area that can't grow: moved
// up, else made shorter, else left as it is
function keepAbove(element: DesignElement, height: number, band: Band, notices: SectionFitNotice[]): void {
  if (element.y + element.height <= height + SLACK) return;
  const name = getBandDisplayName(band.type);
  if (element.height <= height + SLACK) {
    element.y = Math.max(0, Math.round(height - element.height));
    notices.push({ kind: "movedUp", band: name });
  } else if (SHRINKABLE.has(element.type)) {
    element.y = 0;
    element.height = Math.floor(height);
    notices.push({ kind: "madeShorter", band: name });
  } else {
    notices.push({ kind: "tooTall", band: name, uuid: element.uuid });
  }
}

// Back inside the left / right edges
function keepAcross(element: DesignElement, width: number, notices: SectionFitNotice[]): void {
  if (element.type === "table") return;
  const before = { x: element.x, width: element.width };
  if (element.width > width + SLACK) {
    if (element.type === "customTable") {
      element.width = Math.floor(width);
      fitTableToBox(element as CustomTableElement);
    } else if (SHRINKABLE.has(element.type) && element.type !== "line") {
      element.width = Math.floor(width);
    }
  }
  if (element.x < 0) element.x = 0;
  if (element.x + element.width > width + SLACK && element.width <= width + SLACK) {
    element.x = Math.max(0, Math.round(width - element.width));
  }
  if (element.x !== before.x || element.width !== before.width) notices.push({ kind: "movedIn" });
}

// Header / footer / column sections: grow to the maximum, then keep above it
function fitSharedBand(ctx: SectionFitContext, bandIndex: number, notices: SectionFitNotice[]): void {
  const band = ctx.bands[bandIndex]!;
  for (const element of band.elements) {
    if (ctx.skip(element)) continue;
    keepAcross(element, ctx.area(bandIndex).width, notices);
    if (element.y < 0) element.y = 0;
    const bottom = element.y + element.height;
    if (bottom <= band.height + SLACK) continue;
    const max = ctx.area(bandIndex).maxHeight;
    band.height = Math.max(band.height, Math.min(max, Math.ceil(bottom)));
    keepAbove(element, band.height, band, notices);
  }
}

// Detail: special pages keep their items on the page; normal pages pass what
// doesn't fit on to a new page after them
function fitDetail(ctx: SectionFitContext, bandIndex: number, notices: SectionFitNotice[]): void {
  const band = ctx.bands[bandIndex]!;
  const leftAlone = new Set<DesignElement>();
  let added = 0;
  for (let page = 0; page < ctx.totalPages(); page++) {
    const area = ctx.area(bandIndex, page);
    const onPage = band.elements.filter((e) => (e.pageIndex ?? 0) === page && !ctx.skip(e));
    for (const element of onPage) {
      keepAcross(element, area.width, notices);
      if (element.y < 0) element.y = 0;
    }
    if (pageKind(ctx.props, page) !== "normal") {
      // A contents list there carries on onto contents pages by itself
      for (const element of onPage) if (element.type !== "contentsList") keepAbove(element, area.height, band, notices);
      continue;
    }

    const over = onPage.filter((e) => !leftAlone.has(e) && e.y + e.height > area.height + SLACK);
    if (!over.length || added >= MAX_PAGES_ADDED) continue;
    const rests: CustomTableElement[] = [];
    const moving: DesignElement[] = [];
    for (const element of over) {
      if (element.type === "customTable") {
        const table = element as CustomTableElement;
        const at = splitRowFor(table.table, table.y, area.height);
        if (at !== null) rests.push(splitTableElement(table, at));
        else if (table.y > SLACK) moving.push(table);
        else {
          leftAlone.add(table);
          notices.push({ kind: "tooTall", band: getBandDisplayName(band.type), uuid: table.uuid });
        }
      } else if (element.height > area.height + SLACK) {
        // Taller than a whole page: made shorter (it then moves on if it still
        // doesn't fit where it is), else left with a message
        if (SHRINKABLE.has(element.type)) {
          element.height = Math.floor(area.height);
          notices.push({ kind: "madeShorter", band: getBandDisplayName(band.type) });
          if (element.y > SLACK) moving.push(element);
        } else {
          leftAlone.add(element);
          notices.push({ kind: "tooTall", band: getBandDisplayName(band.type), uuid: element.uuid });
        }
      } else {
        moving.push(element);
      }
    }
    if (!rests.length && !moving.length) continue;

    const newPage = ctx.addPageAfter(page);
    added++;
    let top = 0;
    for (const rest of rests) {
      rest.pageIndex = newPage;
      rest.y = top;
      band.elements.push(rest);
      top += rest.height + GAP;
      notices.push({ kind: "tableContinued", page: newPage + 1 });
    }
    if (moving.length) {
      const shift = Math.min(...moving.map((e) => e.y));
      for (const element of moving) {
        element.y = Math.round(top + element.y - shift);
        element.pageIndex = newPage;
      }
      notices.push({ kind: "movedToPage", page: newPage + 1, count: moving.length });
    }
  }
}

export function keepElementsInSections(ctx: SectionFitContext): SectionFitNotice[] {
  const notices: SectionFitNotice[] = [];
  // A typed table's rows follow a size typed in the panel first
  for (const band of ctx.bands) {
    for (const element of band.elements) {
      if (element.type === "customTable" && !ctx.skip(element)) fitTableToBox(element as CustomTableElement);
    }
  }
  ctx.bands.forEach((band, i) => {
    if (isShared(band)) fitSharedBand(ctx, i, notices);
  });
  ctx.fitBandsToPage();
  const detail = ctx.bands.findIndex((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
  if (detail !== -1) fitDetail(ctx, detail, notices);
  return notices;
}

// Elements already told to be too tall (they stay so until the user acts)
const warnedTooTall = new Set<string>();

// One message per kind of change (the first one's details)
export function announceSectionFit(notices: SectionFitNotice[]): void {
  const t = i18n.global.t;
  const seen = new Set<string>();
  for (const notice of notices) {
    if (notice.kind === "tooTall" && notice.uuid) {
      if (warnedTooTall.has(notice.uuid)) continue;
      warnedTooTall.add(notice.uuid);
    }
    if (seen.has(notice.kind)) continue;
    seen.add(notice.kind);
    switch (notice.kind) {
      case "tableContinued":
        notification.info(t("sectionFit.tableContinued", { page: notice.page }));
        break;
      case "movedToPage":
        notification.info(t("sectionFit.movedToPage", { page: notice.page, n: notice.count }, notice.count));
        break;
      case "movedUp":
        notification.info(t("sectionFit.movedUp", { band: notice.band }));
        break;
      case "madeShorter":
        notification.warning(t("sectionFit.madeShorter", { band: notice.band }));
        break;
      case "tooTall":
        notification.warning(t("sectionFit.tooTall", { band: notice.band }));
        break;
      case "movedIn":
        notification.info(t("sectionFit.movedIn"));
        break;
    }
  }
}
