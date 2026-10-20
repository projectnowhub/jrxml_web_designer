// Page flow for the AI's fill_page tool: the model lists what goes on a page,
// top to bottom, and this works out every position, the way text flows in a
// document. Texts are sized to their words (reportChecks.neededTextHeight),
// headings stay with what follows them, a paragraph that doesn't fit is split
// at a sentence and carries on, and what is left moves to the next page
// (added at the end when needed). The model never computes a y.

import type { DesignElement } from "@/types";
import { useReportStore } from "@/stores/report";
import { pageKind } from "@/utils/specialPages";
import { findKind } from "./elements/registry";
import { has } from "./elements/common";
import { SpecError, type ElementKind, type ElementSpec } from "./elements/types";
import { kindContext, pageFacts, placeNew, type Location, type Refs } from "./design";
import { neededTextHeight } from "./reportChecks";

export interface FlowRequest {
  page: number;
  items: ElementSpec[];
  startY?: number;
  gap?: number;
  x?: number;
  width?: number;
  overflow?: "nextPage" | "stop";
}

export interface FlowPlaced {
  index: number;
  kind: string;
  uuid: string;
  page: number;
  y: number;
  height: number;
  continued?: boolean;
}

export interface FlowResult {
  placed: FlowPlaced[];
  endsAt: { page: number; y: number; roomLeft: number };
  pagesAdded: number;
}

// Kinds that take the content width unless the item gives one
const FULL_WIDTH = new Set(["text", "sectionHeading", "subHeading", "table", "dataTable", "chart", "tableOfContents", "line", "box", "rectangle"]);
const HEADINGS = new Set(["sectionHeading", "subHeading"]);
const TEXTS = new Set(["text", "subHeading"]);

// Space kept clear at the top and bottom of a page's content
const EDGE = 12;

// Where content can start on a page: under what is already there
function startOf(pageIndex: number, gap: number): number {
  const f = pageFacts(pageIndex);
  return f.usedTo ? f.usedTo + gap : Math.max(EDGE, f.contentLeft);
}

// The height a text item needs at its width (and its own height, if larger)
function textHeight(kind: ElementKind, spec: ElementSpec, width: number): number {
  const probe = kind.create({ ...spec, x: 0, y: 0, width, height: spec.height ?? 1 }, kindContext(width, 2000)) as DesignElement;
  return Math.max(spec.height ?? 0, neededTextHeight(probe), probe.height);
}

// Sentences of a plain text, for splitting it over two pages
const sentences = (text: string) => text.match(/[^.!?\n]+[.!?]+["')\]]*\s*|[^.!?\n]+\n?|\n/g) ?? [text];

// About how tall an item is before it is made (to keep a heading with it)
function guessHeight(kind: ElementKind | undefined, spec: ElementSpec, width: number): number {
  if (!kind) return 40;
  if (TEXTS.has(kind.kind) && typeof spec.text === "string") {
    return Math.min(textHeight(kind, { ...spec, text: sentences(spec.text).slice(0, 2).join("") }, width), 80);
  }
  return Math.min(spec.height ?? 60, 120);
}

export async function fillPage(request: FlowRequest, refs: Refs, notes: string[]): Promise<FlowResult> {
  const report = useReportStore();
  const gap = request.gap ?? 14;
  let pageIndex = request.page - 1;
  if (pageIndex < 0 || pageIndex >= report.totalPages) {
    throw new SpecError(`page: the report has ${report.totalPages} page(s); plan_report or add_page first`);
  }
  const special = pageKind(report.reportProperties, pageIndex) !== "normal";
  const overflow = special ? "stop" : request.overflow ?? "nextPage";
  let y = request.startY ?? startOf(pageIndex, gap);
  const placed: FlowPlaced[] = [];
  let pagesAdded = 0;

  // Carry on at the top of the next page (added at the end when there is none)
  const nextPage = (why: string, from: number) => {
    if (overflow === "stop") {
      // How much is left over, to shorten by
      const rest = items.slice(from);
      const words = rest.reduce((n, it) => n + String(it.text ?? "").split(/\s+/).filter(Boolean).length, 0);
      throw new SpecError(
        `page ${pageIndex + 1} is full: ${why}. Left over: ${rest.length} item(s)${words ? ` with about ${words} words` : ""} (items[${from}] on). ` +
          (special
            ? "A cover / contents page can't carry on: make items smaller or leave some out, then send this page again."
            : "The next page is planned for other content, so nothing is carried over: shorten the text or leave an item out, then send this page again (or pass overflow: \"nextPage\" to let it run on).")
      );
    }
    pageIndex++;
    if (pageIndex >= report.totalPages) {
      report.pageCount = report.totalPages + 1;
      pagesAdded++;
    } else if (pageKind(report.reportProperties, pageIndex) !== "normal") {
      throw new SpecError(`${why}, and page ${pageIndex + 1} is not a normal page`);
    }
    y = startOf(pageIndex, gap);
  };

  const items = [...request.items];
  for (let i = 0; i < items.length; i++) {
    const { kind: kindName, ...raw } = items[i]!;
    const kind = findKind(kindName);
    if (!kind) throw new SpecError(`items[${i}].kind: unknown kind "${kindName}"`);
    if (kind.fixedPlace) throw new SpecError(`items[${i}]: a ${kind.kind} has its own place; use its create tool`);
    const facts = pageFacts(pageIndex);
    const bottom = facts.height - EDGE;
    const left = request.x ?? facts.contentLeft;
    const fullWidth = request.width ?? facts.contentWidth;
    const spec: ElementSpec = { ...raw };
    delete spec.y;
    delete spec.page;
    delete spec.bandType;
    if (!has(spec, "width") && FULL_WIDTH.has(kind.kind)) spec.width = fullWidth;
    const width = spec.width ?? fullWidth;
    if (!has(spec, "x")) spec.x = left;
    if (spec.spaceBefore !== undefined) {
      y += spec.spaceBefore;
      delete spec.spaceBefore;
    }

    // Texts: as tall as their words; a long one is split at a sentence when
    // the page fills up
    if (TEXTS.has(kind.kind) && typeof spec.text === "string") {
      spec.height = textHeight(kind, spec, width);
      if (kind.kind === "text" && !has(spec, "grow")) spec.grow = true;
      if (y + spec.height > bottom) {
        const room = bottom - y;
        const parts = sentences(spec.text);
        let fit = 0;
        if (!spec.rich && parts.length > 1 && room > (spec.fontSize ?? 10) * 1.45 * 3) {
          while (fit < parts.length - 1 && textHeight(kind, { ...spec, height: 1, text: parts.slice(0, fit + 1).join("").trim() }, width) <= room) fit++;
        }
        if (fit > 0) {
          const head = parts.slice(0, fit).join("").trim();
          const { ref: _ref, spaceBefore: _space, ...rest } = raw;
          items.splice(i + 1, 0, { kind: kindName, ...rest, text: parts.slice(fit).join("").trim(), __continued: true });
          spec.text = head;
          spec.height = textHeight(kind, { ...spec, height: 1 }, width);
        } else if (facts.usedTo > 0) {
          nextPage(`items[${i}] (${kind.kind}) needs ${spec.height} px but only ${Math.max(0, room)} px are left on page ${pageIndex + 1}`, i);
          i--;
          continue;
        }
      }
    }
    const continued = !!spec.__continued;
    delete spec.__continued;

    // A heading never ends a page: it moves on with what follows it
    if (HEADINGS.has(kind.kind) && i + 1 < items.length) {
      const next = items[i + 1]!;
      const own = TEXTS.has(kind.kind) ? spec.height ?? 20 : 30;
      const needed = own + gap + guessHeight(findKind(next.kind), next, width);
      if (y + needed > bottom && facts.usedTo > 0) {
        nextPage(`heading items[${i}] would be left at the bottom of page ${pageIndex + 1}`, i);
        i--;
        continue;
      }
    }

    let location: Location;
    try {
      ({ location } = await placeNew(kind, { ...spec, page: pageIndex + 1, y: Math.round(y) }, refs, notes));
    } catch (error) {
      // Too tall for what is left of the page: the next page, unless it was already at the top
      const tooLow = error instanceof SpecError && error.message.startsWith("doesn't fit");
      if (tooLow && pageFacts(pageIndex).usedTo > 0) {
        nextPage(`items[${i}] (${kind.kind}) doesn't fit in what is left of page ${pageIndex + 1}`, i);
        i--;
        continue;
      }
      throw new SpecError(`items[${i}] (${kind.kind}): ${error instanceof Error ? error.message : String(error)}`);
    }
    if (raw.ref) refs.set(String(raw.ref), location.element.uuid!);
    placed.push({
      index: i,
      kind: kind.kind,
      uuid: location.element.uuid!,
      page: pageIndex + 1,
      y: location.element.y,
      height: location.element.height,
      ...(continued ? { continued } : {}),
    });
    y = location.element.y + location.element.height + gap;
  }

  if (pagesAdded) notes.push(`${pagesAdded} page(s) added at the end for what didn't fit`);
  const end = pageFacts(pageIndex);
  return { placed, endsAt: { page: pageIndex + 1, y: end.usedTo, roomLeft: end.roomLeft }, pagesAdded };
}
