/**
 * MCP Tool Handlers - Tool handler implementations
 *
 * Every tool works on the report store, through the element schemas
 * (mcp/elements) and the placement rules (mcp/design.ts), so the AI adds and
 * changes elements exactly as a user would. One chat message is one undo step.
 */

import { useReportStore } from '@/stores/report';
import { useSelectionStore } from '@/stores/selection';
import type { BandType, ChartElement, DesignElement, FrameElement } from '@/types';
import { BAND_TYPE_CONSTANTS } from '@/constants/constants';
import { findPageBorder, markBoxPart } from '@/utils/framePresets';
import { specialPages } from '@/utils/specialPages';
import { formatXml } from '@/utils/jrxml/formatXml';
import { generatePdf } from '@/services/reportService';
import { fillPage } from './flow';
import { attachmentImageSource, type ChatAttachment } from './attachments';
import { getFacets, getSchema, listProjects, listSources } from '@/services/dataSourceService';
import { ELEMENT_KINDS, createSchema, findKind, updateSchema } from './elements/registry';
import { validateValue } from './elements/validate';
import { SpecError, type ElementKind, type ElementSpec } from './elements/types';
import {
  allLocations,
  areaOf,
  boxUpCreated,
  describeAt,
  designStateText,
  boxAround,
  findElement,
  itemsOn,
  label,
  overlapsOf,
  pageFacts,
  pageKinds,
  kindAt,
  pageOf,
  placeNew,
  shapeToBox,
  shapeUnder,
  updateAt,
  type Location,
  type Refs
} from './design';
import { MCP_TOOL_SCHEMA_MAP } from './schemas/toolSchemas';
import { elementChecks, reportChecks } from './reportChecks';

// ============================================
// Type definitions
// ============================================

export interface MCPToolResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface MCPToolCall {
  // The model's id for the call (its result is sent back with it)
  id?: string;
  name: string;
  params: Record<string, any>;
}

export interface MCPToolHandler {
  execute: (params: Record<string, any>, context: MCPContext) => Promise<MCPToolResult>;
}

// A page action the designer runs for the AI (pages are 0-based here)
export type PageToolRequest =
  | { action: 'addCover'; design: string; wholeSheet: boolean }
  | { action: 'addContents'; design: string }
  | { action: 'changeDesign'; page: number; design: string; wholeSheet?: boolean }
  | { action: 'setKind'; page: number; kind: 'cover' | 'contents' | 'normal' }
  | { action: 'wholeSheet'; on: boolean }
  | { action: 'deletePage'; page: number };

// What the designer lends the tools (the report itself is read from the stores)
export interface MCPContext {
  selectElement?: (bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number) => void;
  undo?: () => void;
  redo?: () => void;
  // Paper size or margins changed: the designer fits the page border and content
  onPageSetupChange?: () => void;
  // Cover / contents pages and their designs, page kinds, deleting pages;
  // returns why it can't be done, or null
  pageTool?: (request: PageToolRequest) => Promise<string | null>;
  // Files the user attached in the chat, by id ("img-1"): pictures can be put
  // into the report as image source "attachment:<id>"
  attachments?: Map<string, ChatAttachment>;
  // One chat message = one undo step: the chat starts a turn per message; the
  // report plan made in it is checked before the AI may finish
  turn?: { recorded: boolean; plan?: ReportPlan };
}

// The structure plan_report set up, checked before the AI may finish
export interface ReportPlan {
  cover: boolean;
  contents: boolean;
  // Normal pages to fill (0-based)
  pages: number[];
}

// ============================================
// Helpers
// ============================================

const ok = (message: string, extra: Record<string, unknown> = {}): MCPToolResult => ({
  success: true,
  data: { message, ...extra }
});
const fail = (error: string): MCPToolResult => ({ success: false, error });

// The undo step, taken once per chat message before the first change
function beginChange(context: MCPContext): void {
  if (!context.turn) {
    useReportStore().saveStateToHistory();
  } else if (!context.turn.recorded) {
    useReportStore().saveStateToHistory();
    context.turn.recorded = true;
  }
}

// After a change: the JRXML is written (headings renumbered, contents
// rebuilt) and the element is selected so its properties show
function finish(context: MCPContext, selectUuid?: string): void {
  useReportStore().updateJrxml();
  if (!selectUuid || !context.selectElement) return;
  const loc = findElement(selectUuid);
  if (!loc) return;
  if (loc.box && loc.boxIndex !== undefined) context.selectElement(loc.bandIndex, loc.index, false, loc.boxIndex);
  else context.selectElement(loc.bandIndex, loc.index);
}

function clearSelection(): void {
  const selection = useSelectionStore();
  selection.selectedElement = null;
  selection.selectedElements = [];
  selection.editingElement = null;
}

function locate(uuid: string): Location {
  const loc = findElement(uuid);
  if (!loc) throw new SpecError(`no element ${uuid} (read the design state for the uuids)`);
  return loc;
}

function kindOfLocation(loc: Location): ElementKind {
  const kind = kindAt(loc);
  if (!kind) throw new SpecError(`element ${loc.element.uuid} (${loc.element.type}) can't be changed by the assistant`);
  return kind;
}

const errorText = (error: unknown) =>
  error instanceof SpecError ? error.message : `unexpected error: ${error instanceof Error ? error.message : String(error)}`;

const withNotes = (notes: string[]) => (notes.length ? { notes } : {});

// The report before a create call, put back when any part of it fails: a call
// either makes everything it asked for or nothing (sending it again can't
// make things twice)
function snapshot() {
  const r = useReportStore();
  return JSON.parse(JSON.stringify({ bands: r.bands, pageCount: r.pageCount, reportProperties: r.reportProperties }));
}

function restore(saved: ReturnType<typeof snapshot>): void {
  const r = useReportStore();
  r.bands = saved.bands;
  r.pageCount = saved.pageCount;
  r.reportProperties = saved.reportProperties;
  clearSelection();
  r.updateJrxml();
}

// What the model should look at after placing or moving an element: what it
// runs into, a box it lies in without being in it, a shape it lies on
function layoutNotes(loc: Location, ignoreShapes?: Set<string>): string[] {
  const notes = overlapsOf(loc).map(
    (o) => `${label(loc.element, loc.band.type)} overlaps ${label(o, loc.band.type)}: move or resize one of them (stack_elements lines them up)`
  );
  const box = boxAround(loc);
  if (box) notes.push(`${loc.element.uuid} lies in box ${box.uuid}'s area but is not in it, so it won't move with the box: put_in_box (or move it out of the box's area)`);
  const loose = box ? null : shapeNote(loc, ignoreShapes);
  if (loose) notes.push(loose);
  // Text cut off or growing over things, colours, placeholders, prints nothing…
  for (const c of elementChecks(loc)) notes.push(`[${c.level}] ${c.message}`);
  return notes;
}

// A new element and, for a box, its children (each placed in it)
async function createWithChildren(
  kind: ElementKind,
  spec: ElementSpec,
  refs: Refs,
  notes: string[],
  path: string
): Promise<{ location: Location; errors: string[] }> {
  const { children, ref, ...own } = spec;
  const placed = await placeNew(kind, own, refs, notes);
  const uuid = placed.location.element.uuid!;
  if (ref) refs.set(String(ref), uuid);
  const errors: string[] = [];
  for (const [i, raw] of ((children as ElementSpec[] | undefined) ?? []).entries()) {
    const at = `${path}children[${i}]`;
    const { kind: childKindName, ...childSpec } = raw;
    const childKind = findKind(childKindName);
    if (!childKind || !childKind.inBox) {
      errors.push(`${at}: "${childKindName}" can't go in a box`);
      continue;
    }
    const problems = validateValue(childSpec, createSchema(childKind, true), at);
    if (problems.length) {
      errors.push(...problems);
      continue;
    }
    try {
      const child = await placeNew(childKind, { ...childSpec, parent: uuid }, refs, notes);
      if (childSpec.ref) refs.set(String(childSpec.ref), child.location.element.uuid!);
    } catch (error) {
      errors.push(`${at}: ${errorText(error)}`);
    }
  }
  return { location: findElement(uuid) ?? placed.location, errors };
}

// A new element on a rectangle / circle but not inside it: the model should
// offer a box (see the system prompt) instead of leaving it loose
function shapeNote(loc: Location, ignore?: Set<string>): string | null {
  const shape = shapeUnder(loc);
  if (!shape || ignore?.has(shape.uuid!)) return null;
  const name = shape.type === 'ellipse' ? 'circle' : 'rectangle';
  return `${loc.element.uuid} lies on ${name} ${shape.uuid} but is not inside it: it won't move with it. If the user meant it to be inside, explain that a box keeps its contents together and ask whether to convert_to_box ${shape.uuid}`;
}

// ============================================
// Query tool handlers
// ============================================

const getDesignStateHandler: MCPToolHandler = {
  execute: async () => {
    const selected = useSelectionStore().selectedElement?.uuid;
    return { success: true, data: { state: designStateText(selected ?? undefined) } };
  }
};

const getElementHandler: MCPToolHandler = {
  execute: async (params) => {
    try {
      return { success: true, data: describeAt(locate(params.uuid)) };
    } catch (error) {
      return fail(errorText(error));
    }
  }
};

const findElementsHandler: MCPToolHandler = {
  execute: async (params) => {
    const { kind, text, bandType, page } = params;
    const words = typeof text === 'string' ? text.toLowerCase() : '';
    const found = allLocations()
      .filter((loc) => !kind || kindAt(loc)?.kind === kind)
      .filter((loc) => !bandType || loc.band.type === bandType)
      .filter((loc) => !page || pageOf(loc) === page - 1)
      .map((loc) => describeAt(loc, false))
      .filter((d) => !words || JSON.stringify(d).toLowerCase().includes(words));
    return { success: true, data: { count: found.length, elements: found.slice(0, 60) } };
  }
};

// A full review of the report (what the design state shows, without its limit)
const checkReportHandler: MCPToolHandler = {
  execute: async ({ level, page }) => {
    const checks = reportChecks().filter(
      (c) => (!level || c.level === level) && (!page || c.where === `page ${page}` || c.where.split(', ').includes(`page ${page}`))
    );
    return {
      success: true,
      data: {
        count: checks.length,
        fix: checks.filter((c) => c.level === 'fix').length,
        check: checks.filter((c) => c.level === 'check').length,
        checks: checks.slice(0, 120)
      }
    };
  }
};

const getReportDataHandler: MCPToolHandler = {
  execute: async (params) => {
    const { projectId, sourceId } = params;
    try {
      if (projectId && sourceId) {
        const schema = await getSchema(projectId, sourceId);
        const facets = await getFacets(projectId, sourceId).catch(() => ({} as Record<string, never>));
        // What each column holds, for filters: its values (text) or its range
        const holds = (key: string) => {
          const facet = (facets as Record<string, any>)[key];
          if (facet?.kind === 'values') return { values: facet.values.slice(0, 20).map((v: { value: string }) => v.value), ...(facet.values.length > 20 ? { moreValues: facet.values.length - 20 } : {}) };
          if (facet?.kind === 'range') return { min: facet.min, max: facet.max };
          return {};
        };
        return {
          success: true,
          data: { source: schema.name, columns: schema.columns.map((c) => ({ key: c.key, name: c.label, type: c.type, ...holds(c.key) })) }
        };
      }
      if (projectId) {
        const sources = await listSources(projectId);
        return { success: true, data: { sources: sources.map((s) => ({ sourceId: s.id, name: s.name, rows: s.rowCount })) } };
      }
      const chosen = useReportStore().reportProperties.projects ?? [];
      const all = await listProjects();
      return {
        success: true,
        data: {
          inThisReport: chosen.map((p) => ({ projectId: p.id, name: p.name })),
          available: all.map((p) => ({ projectId: p.id, name: p.name, code: p.code }))
        }
      };
    } catch (error) {
      return fail(`could not read the report data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// ============================================
// Create tool handlers
// ============================================

// create_<kind>: the same handler for every element kind
function createHandler(kind: ElementKind): MCPToolHandler {
  return {
    execute: async (params, context) => {
      const notes: string[] = [];
      beginChange(context);
      const saved = snapshot();
      try {
        const { location, errors } = await createWithChildren(kind, params, new Map(), notes, '');
        if (errors.length) {
          restore(saved);
          return fail(`Nothing was made. Fix these and call again:\n${errors.join('\n')}`);
        }
        notes.push(...layoutNotes(location));
        finish(context, location.element.uuid);
        return ok(`Created ${kind.kind} ${location.element.uuid}`, {
          uuid: location.element.uuid,
          element: describeAt(location),
          ...withNotes(notes)
        });
      } catch (error) {
        restore(saved);
        return fail(`${errorText(error)} (nothing was made)`);
      }
    }
  };
}

const createDesignHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const items = params.elements as ElementSpec[];
    const keepShapes = !!params.keepShapes;
    // Every item checked first: a wrong setting creates nothing
    const problems: string[] = [];
    items.forEach((item, i) => {
      const kind = findKind(item.kind);
      if (!kind) {
        problems.push(`elements[${i}].kind: unknown kind "${item.kind}"`);
        return;
      }
      const { kind: _kind, ...spec } = item;
      problems.push(...validateValue(spec, createSchema(kind, true), `elements[${i}]`));
    });
    if (problems.length) return fail(`Nothing was created. Fix these settings:\n${problems.join('\n')}`);

    beginChange(context);
    const saved = snapshot();
    const refs: Refs = new Map();
    const notes: string[] = [];
    const errors: string[] = [];
    const created: Array<{ index: number; kind: string; uuid: string; ref?: string }> = [];
    const locations: Location[] = [];
    for (const [i, item] of items.entries()) {
      const { kind: kindName, ...spec } = item;
      const kind = findKind(kindName)!;
      try {
        const { location, errors: childErrors } = await createWithChildren(kind, spec, refs, notes, `elements[${i}].`);
        errors.push(...childErrors);
        locations.push(location);
        created.push({ index: i, kind: kind.kind, uuid: location.element.uuid!, ...(spec.ref ? { ref: spec.ref } : {}) });
      } catch (error) {
        errors.push(`elements[${i}] (${kindName}): ${errorText(error)}`);
      }
    }
    // All or nothing: one failed item and nothing of the call stays
    if (errors.length) {
      restore(saved);
      // Sent again after it had worked: it is all there already
      if (errors.some((e) => e.includes('is already there'))) {
        return fail(
          `Nothing was made: parts of this design are already on the page (an earlier call made them). Do not send it again; add only what is missing, or change the elements that are there:\n${errors.join('\n')}`
        );
      }
      return fail(
        `Nothing was made (a create_design call makes all its elements or none). Fix these, then send the whole design again:\n${errors.join('\n')}`
      );
    }
    // Panels with content are boxes (the design rule of ready-made designs),
    // unless the user asked for plain shapes
    const placed = () => locations.map((l) => findElement(l.element.uuid!)).filter((l): l is Location => !!l);
    if (!keepShapes) notes.push(...boxUpCreated(placed()));
    // What runs into what; items lying loose on a shape from before (with
    // keepShapes the shapes made here stay shapes, as the user asked)
    const madeHere = new Set(created.map((c) => c.uuid));
    const seen = new Set<string>();
    for (const loc of placed()) {
      for (const note of layoutNotes(loc, keepShapes ? madeHere : undefined)) {
        const key = note.replace(/ overlaps .*/, '') + [...note.matchAll(/[0-9a-f]{8}-[0-9a-f-]{27}/g)].map((m) => m[0]).sort().join();
        if (!seen.has(key)) notes.push(note);
        seen.add(key);
      }
    }
    finish(context, created[created.length - 1]?.uuid);
    return ok(`Created all ${created.length} element(s). Don't send this design again: it would make everything twice`, {
      created,
      ...withNotes(notes)
    });
  }
};

// ============================================
// Modify tool handlers
// ============================================

async function change(uuid: string, spec: ElementSpec, context: MCPContext, notes: string[]): Promise<Location> {
  const loc = locate(uuid);
  const kind = kindOfLocation(loc);
  const problems = validateValue(spec, updateSchema(kind), 'properties');
  if (problems.length) throw new SpecError(`${problems.join('; ')} (a ${kind.kind} takes the settings of ${kind.tool})`);
  beginChange(context);
  await updateAt(loc, kind, spec, notes);
  return loc;
}

const updateElementHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const notes: string[] = [];
    try {
      const loc = await change(params.uuid, params.properties ?? {}, context, notes);
      notes.push(...layoutNotes(findElement(loc.element.uuid!) ?? loc));
      finish(context, loc.element.uuid);
      return ok(`Updated ${loc.element.uuid}`, { element: describeAt(loc), ...withNotes(notes) });
    } catch (error) {
      return fail(errorText(error));
    }
  }
};

const moveElementHandler: MCPToolHandler = {
  execute: async ({ uuid, x, y }, context) => updateElementHandler.execute({ uuid, properties: { x, y } }, context)
};

const resizeElementHandler: MCPToolHandler = {
  execute: async ({ uuid, width, height }, context) =>
    updateElementHandler.execute({ uuid, properties: { ...(width !== undefined ? { width } : {}), ...(height !== undefined ? { height } : {}) } }, context)
};

// The same change on several elements; each that can't take it is reported
async function changeEach(
  uuids: string[],
  specFor: (loc: Location, kind: ElementKind) => ElementSpec | null,
  context: MCPContext,
  done: string
): Promise<MCPToolResult> {
  const notes: string[] = [];
  const errors: string[] = [];
  const changed: string[] = [];
  let count = 0;
  for (const uuid of uuids) {
    try {
      const loc = locate(uuid);
      const spec = specFor(loc, kindOfLocation(loc));
      if (!spec || !Object.keys(spec).length) continue;
      await change(uuid, spec, context, notes);
      changed.push(uuid);
      count++;
    } catch (error) {
      errors.push(`${uuid}: ${errorText(error)}`);
    }
  }
  // Overlaps once everything has moved (between the moved ones too)
  const seen = new Set<string>();
  for (const uuid of changed) {
    const loc = findElement(uuid);
    for (const note of loc ? layoutNotes(loc) : []) {
      const key = [...note.matchAll(/[0-9a-f]{8}-[0-9a-f-]{27}/g)].map((m) => m[0]).sort().join();
      if (!seen.has(key)) notes.push(note);
      seen.add(key);
    }
  }
  if (count) finish(context);
  return count
    ? ok(`${done} ${count} element(s)`, { ...withNotes(notes), ...(errors.length ? { errors } : {}) })
    : fail(errors.join('\n') || 'Nothing to change');
}

const moveElementsHandler: MCPToolHandler = {
  execute: async ({ uuids, deltaX, deltaY }, context) =>
    changeEach(uuids, (loc) => ({ x: Math.max(0, loc.element.x + deltaX), y: Math.max(0, loc.element.y + deltaY) }), context, 'Moved')
};

const resizeElementsHandler: MCPToolHandler = {
  execute: async ({ uuids, width, height }, context) =>
    changeEach(uuids, () => ({ ...(width !== undefined ? { width } : {}), ...(height !== undefined ? { height } : {}) }), context, 'Resized')
};

const STYLE_KEYS = ['fontSize', 'isBold', 'isItalic', 'isUnderline', 'forecolor', 'backcolor', 'textAlignment'];

const updateElementsStyleHandler: MCPToolHandler = {
  execute: async (params, context) =>
    changeEach(
      params.uuids,
      (_loc, kind) => {
        const allowed = updateSchema(kind).properties ?? {};
        return Object.fromEntries(STYLE_KEYS.filter((k) => params[k] !== undefined && allowed[k]).map((k) => [k, params[k]]));
      },
      context,
      'Restyled'
    )
};

const alignElementsHandler: MCPToolHandler = {
  execute: async ({ uuids, alignment }, context) => {
    let locs: Location[];
    try {
      locs = (uuids as string[]).map(locate);
    } catch (error) {
      return fail(errorText(error));
    }
    if (locs.length < 2) return fail('Need at least 2 elements to align');
    const els = locs.map((l) => l.element);
    const left = Math.min(...els.map((e) => e.x));
    const right = Math.max(...els.map((e) => e.x + e.width));
    const top = Math.min(...els.map((e) => e.y));
    const bottom = Math.max(...els.map((e) => e.y + e.height));
    const target = (e: typeof els[number]) => {
      switch (alignment) {
        case 'left': return { x: left };
        case 'right': return { x: right - e.width };
        case 'center': return { x: Math.round((left + right) / 2 - e.width / 2) };
        case 'top': return { y: top };
        case 'bottom': return { y: bottom - e.height };
        default: return { y: Math.round((top + bottom) / 2 - e.height / 2) };
      }
    };
    return changeEach(uuids, (loc) => target(loc.element), context, `Aligned (${alignment})`);
  }
};

const distributeElementsHandler: MCPToolHandler = {
  execute: async ({ uuids, direction }, context) => {
    let locs: Location[];
    try {
      locs = (uuids as string[]).map(locate);
    } catch (error) {
      return fail(errorText(error));
    }
    if (locs.length < 3) return fail('Need at least 3 elements to distribute');
    const horizontal = direction === 'horizontal';
    const pos = (l: Location) => (horizontal ? l.element.x : l.element.y);
    const size = (l: Location) => (horizontal ? l.element.width : l.element.height);
    const sorted = [...locs].sort((a, b) => pos(a) - pos(b));
    const start = pos(sorted[0]!);
    const end = pos(sorted[sorted.length - 1]!) + size(sorted[sorted.length - 1]!);
    const gap = (end - start - sorted.reduce((s, l) => s + size(l), 0)) / (sorted.length - 1);
    const targets = new Map<Location, number>();
    let at = start;
    for (const l of sorted) {
      targets.set(l, Math.round(at));
      at += size(l) + gap;
    }
    return changeEach(uuids, (loc) => {
      const l = sorted.find((s) => s.element === loc.element)!;
      return horizontal ? { x: targets.get(l) } : { y: targets.get(l) };
    }, context, `Distributed (${direction})`);
  }
};

// The least height an element can be shrunk to when a page is full: charts
// and pictures give up height; texts, tables and boxes keep theirs
function shrinkableTo(loc: Location): number {
  const e = loc.element;
  if (e.type === 'chart') return (e as ChartElement).binding.chartType === 'kpi' ? 60 : 140;
  if (e.type === 'image') return 40;
  return e.height;
}

// Top to bottom in the given order, with an even gap: the usual fix for a
// page whose items run into each other. When they don't all fit, charts and
// pictures are made shorter (shrink); if that isn't enough nothing changes and
// the model is told what to move to the next page
const stackElementsHandler: MCPToolHandler = {
  execute: async ({ uuids, y, gap = 12, x, shrink = true }, context) => {
    let locs: Location[];
    try {
      locs = (uuids as string[]).map(locate);
    } catch (error) {
      return fail(errorText(error));
    }
    const where = (l: Location) => `${l.bandIndex}|${l.box?.uuid ?? ''}|${l.box ? '' : l.element.pageIndex ?? 0}`;
    if (new Set(locs.map(where)).size > 1) return fail('stack_elements lines up elements of one band page or one box at a time');
    const first = locs[0]!;
    const room = first.box ? first.box.height : areaOf(first.bandIndex, pageOf(first)).maxHeight;
    const start = y ?? first.element.y;
    const heights = new Map(locs.map((l) => [l.element.uuid!, l.element.height]));
    const needed = () => start + [...heights.values()].reduce((a, b) => a + b, 0) + gap * (locs.length - 1);
    const notes: string[] = [];
    let over = needed() - room;
    if (over > 0 && shrink) {
      const give = locs.map((l) => ({ l, can: Math.max(0, l.element.height - shrinkableTo(l)) })).filter((g) => g.can > 0);
      const total = give.reduce((a, g) => a + g.can, 0);
      if (total >= over) {
        for (const g of give) {
          const cut = Math.ceil((g.can / total) * over);
          heights.set(g.l.element.uuid!, g.l.element.height - Math.min(cut, g.can));
          notes.push(`${label(g.l.element, g.l.band.type)} made ${Math.min(cut, g.can)} px shorter so everything fits`);
        }
        over = needed() - room;
      }
    }
    if (over > 0) {
      const page = pageOf(first);
      const area = first.box ? 'box' : page !== undefined ? 'page body' : `${first.band.type} band`;
      return fail(
        `Nothing was moved: stacked from y ${start} they need ${needed()} px, but the ${area} is ${room} px tall (${over} px too much${shrink ? ', even with charts and pictures made shorter' : ''}). ` +
          (page !== undefined && !first.box
            ? `Move the last item(s) to the top of page ${page + 2} (update_element with page and y; add_page if needed), or make something smaller, then stack again.`
            : 'Make something smaller or leave something out, then stack again.')
      );
    }
    let at = start;
    const targets = new Map<string, ElementSpec>();
    for (const l of locs) {
      const h = heights.get(l.element.uuid!)!;
      targets.set(l.element.uuid!, { ...(x !== undefined ? { x } : {}), y: Math.round(at), ...(h !== l.element.height ? { height: h } : {}) });
      at += h + gap;
    }
    const result = await changeEach(uuids, (loc) => targets.get(loc.element.uuid!) ?? null, context, 'Stacked');
    if (result.success && notes.length) result.data.notes = [...notes, ...(result.data.notes ?? [])];
    return result;
  }
};

// Elements lying in a box's area become its items (they then move with it)
const putInBoxHandler: MCPToolHandler = {
  execute: async ({ uuids, box: boxUuid }, context) => {
    try {
      const boxLoc = locate(boxUuid);
      if (kindAt(boxLoc)?.kind !== 'box' || boxLoc.box) return fail(`${boxUuid} is not a box`);
      const box = boxLoc.element as FrameElement;
      const locs = (uuids as string[]).map(locate);
      for (const loc of locs) {
        const kind = kindAt(loc);
        if (loc.box) return fail(`${loc.element.uuid} is already in a box`);
        if (!kind?.inBox || loc.element.type === 'frame') return fail(`a ${kind?.kind ?? loc.element.type} can't go in a box`);
        if (loc.bandIndex !== boxLoc.bandIndex || (loc.element.pageIndex ?? 0) !== (box.pageIndex ?? 0)) {
          return fail(`${loc.element.uuid} is not on the same page / band as the box`);
        }
        const e = loc.element;
        if (e.x < box.x - 0.5 || e.y < box.y - 0.5 || e.x + e.width > box.x + box.width + 0.5 || e.y + e.height > box.y + box.height + 0.5) {
          return fail(`${label(e, loc.band.type)} is not wholly inside the box (x ${box.x}-${box.x + box.width}, y ${box.y}-${box.y + box.height}): move it into the box's area or make the box bigger first`);
        }
      }
      beginChange(context);
      for (const loc of locs) {
        const e = loc.element;
        loc.band.elements.splice(loc.band.elements.indexOf(e), 1);
        const child = { ...e, x: Math.round(e.x - box.x), y: Math.round(e.y - box.y) } as DesignElement;
        delete child.pageIndex;
        markBoxPart(child);
        box.elements = [...(box.elements ?? []), child];
      }
      finish(context, box.uuid);
      return ok(`Put ${locs.length} element(s) in box ${box.uuid}; they now move with it`, { element: describeAt(findElement(box.uuid!)!) });
    } catch (error) {
      return fail(errorText(error));
    }
  }
};

const convertToBoxHandler: MCPToolHandler = {
  execute: async ({ uuid, moveInside = true }, context) => {
    try {
      const loc = locate(uuid);
      if (loc.element.type !== 'rectangle' && loc.element.type !== 'ellipse') {
        return fail(`${uuid} is a ${kindAt(loc)?.kind ?? loc.element.type}; only a rectangle or a circle can become a box`);
      }
      if (loc.box) return fail(`${uuid} is inside a box, and boxes don't go inside boxes`);
      const children = moveInside ? itemsOn(loc) : [];
      beginChange(context);
      const box = shapeToBox(loc.band, loc.element, children);
      finish(context, box.uuid);
      return ok(`${loc.element.type === 'ellipse' ? 'The circle' : 'The rectangle'} is now a box with the same look${children.length ? `, holding ${children.length} element(s) that were on it` : ''}`, {
        element: describeAt(findElement(box.uuid!)!),
        ...(loc.element.type === 'ellipse' && loc.element.width !== loc.element.height ? { notes: ['an oval becomes a box with fully rounded ends'] } : {})
      });
    } catch (error) {
      return fail(errorText(error));
    }
  }
};

// ============================================
// Delete tool handlers
// ============================================

function deleteAll(uuids: string[], context: MCPContext): MCPToolResult {
  const found = uuids.map((uuid) => findElement(uuid));
  const missing = uuids.filter((_, i) => !found[i]);
  const locs = found.filter((l): l is Location => !!l);
  if (!locs.length) return fail(`No element found with ${missing.join(', ')}`);
  beginChange(context);
  for (const loc of locs) {
    const at = loc.container.indexOf(loc.element);
    if (at !== -1) loc.container.splice(at, 1);
  }
  clearSelection();
  finish(context);
  return ok(`Deleted ${locs.length} element(s)`, missing.length ? { notFound: missing } : {});
}

const deleteElementHandler: MCPToolHandler = {
  execute: async ({ uuid }, context) => deleteAll([uuid], context)
};

const deleteElementsHandler: MCPToolHandler = {
  execute: async ({ uuids }, context) => deleteAll(uuids, context)
};

// ============================================
// Bands, pages, report settings
// ============================================

const updateBandHeightHandler: MCPToolHandler = {
  execute: async ({ bandType, height }, context) => {
    const report = useReportStore();
    const bandIndex = report.bands.findIndex((b) => b.type === bandType);
    const band = report.bands[bandIndex];
    if (!band) return fail(`The report has no ${bandType} band (it has ${report.bands.map((b) => b.type).join(', ')})`);
    if (band.type === BAND_TYPE_CONSTANTS.DETAIL) return fail('The detail band takes the rest of the page; change the other bands instead');
    const old = band.height;
    const max = areaOf(bandIndex).maxHeight;
    const wanted = Math.round(height);
    const lowest = Math.max(0, ...(band.elements ?? []).map((e) => e.y + e.height));
    if (wanted > Math.max(max, old)) return fail(`The ${bandType} band can be at most ${Math.max(max, old)} px tall`);
    if (wanted < lowest) return fail(`Its elements reach ${lowest} px; move them up first`);
    beginChange(context);
    band.height = wanted;
    finish(context);
    return ok(`The ${bandType} band is now ${band.height} px tall (was ${old})`);
  }
};

const addPageHandler: MCPToolHandler = {
  execute: async ({ count = 1 }, context) => {
    const report = useReportStore();
    beginChange(context);
    const before = report.totalPages;
    report.pageCount = before + count;
    finish(context);
    return ok(`Added ${count} page(s): pages ${before + 1} to ${before + count}`);
  }
};

const PAGE_SETUP_KEYS = ['pageWidth', 'pageHeight', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin'];

const updateReportPropertiesHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const keys = Object.keys(params).filter((k) => params[k] !== undefined);
    if (!keys.length) return fail('No properties to update');
    const props = useReportStore().reportProperties;
    beginChange(context);
    for (const key of keys) {
      const value = params[key];
      if (key === 'name') props.name = String(value);
      else if (key === 'countSpecialPages') {
        // Only "false" is kept (the default counts them)
        if (value) delete props.countSpecialPages;
        else props.countSpecialPages = false;
      } else if (key === 'sectionNumbering') {
        const { style, word, before, after } = value;
        props.headingNumbers =
          style === 'word'
            ? { style, word: word || 'SECTION' }
            : { style, ...(before ? { before } : {}), ...(after ? { after } : {}) };
      } else (props as unknown as Record<string, number>)[key] = Math.round(value);
    }
    if (keys.some((k) => PAGE_SETUP_KEYS.includes(k))) context.onPageSetupChange?.();
    finish(context);
    return ok(`Updated report ${keys.join(', ')}`);
  }
};

// ============================================
// A whole report: its structure, page flow, the real PDF
// ============================================

const planReportHandler: MCPToolHandler = {
  execute: async (params, context) => {
    if (!context.pageTool) return fail('Page changes are not available here');
    const r = useReportStore();
    const notes: string[] = [];
    beginChange(context);
    // Header / footer on, empty column bands off (they only take room from the pages)
    const types = new Set<BandType>(r.bands.map((b) => b.type));
    if (params.header !== false) types.add('pageHeader');
    if (params.footer !== false) types.add('pageFooter');
    if (!params.keepColumnBands) {
      for (const t of ['columnHeader', 'columnFooter'] as BandType[]) {
        if (r.bands.find((b) => b.type === t && !b.elements.length)) types.delete(t);
      }
    }
    r.setBandTypes([...types], { record: false });

    let special = specialPages(r.reportProperties);
    const run = async (request: PageToolRequest) => {
      const problem = await context.pageTool!(request);
      if (problem) throw new SpecError(problem);
    };
    try {
      if (params.coverPage && !special.cover) await run({ action: 'addCover', design: 'blank', wholeSheet: !!params.wholeSheetCover });
      else if (params.coverPage && params.wholeSheetCover !== undefined && !!special.fullPageCover !== !!params.wholeSheetCover) {
        await run({ action: 'wholeSheet', on: !!params.wholeSheetCover });
      } else if (!params.coverPage && special.cover) notes.push('the report already has a cover page; it was left as it is');
      special = specialPages(r.reportProperties);
      if (params.contentsPage && !special.contents) await run({ action: 'addContents', design: 'blank' });
      else if (!params.contentsPage && special.contents) notes.push('the report already has contents pages; they were left as they are');
    } catch (error) {
      finish(context);
      return fail(errorText(error));
    }

    // Normal pages: as many as asked (empty pages at the end beyond that are removed)
    special = specialPages(r.reportProperties);
    const detail = r.bands.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
    const used = (p: number) => (detail?.elements ?? []).some((e) => (e.pageIndex ?? 0) === p);
    const wanted = params.contentPages as number;
    if (r.totalPages - special.count < wanted) r.pageCount = r.totalPages + (wanted - (r.totalPages - special.count));
    while (r.totalPages - special.count > wanted && !used(r.totalPages - 1)) {
      const before = r.totalPages;
      r.pageCount = before - 1;
      if (r.totalPages === before) break;
    }
    if (r.totalPages - special.count > wanted) notes.push(`there are ${r.totalPages - special.count} normal pages with content; none were deleted`);

    if (params.pageBorder && !findPageBorder(r.bands)) {
      const border = findKind('pageBorder')!;
      await placeNew(border, { borderPreset: 'outline' }, new Map(), notes);
    }

    const pages = Array.from({ length: wanted }, (_, i) => i + special.count);
    if (context.turn) context.turn.plan = { cover: !!params.coverPage, contents: !!params.contentsPage, pages };
    finish(context);
    const band = (t: string) => r.bands.find((b) => b.type === t);
    return ok(
      `Report structure ready: ${pageKinds()}. Now design each page, page by page: ${special.cover ? 'the cover (page 1) with create_design, ' : ''}${special.contents ? `the contents page (page ${special.cover ? 2 : 1}) with a heading and one tableOfContents, ` : ''}then pages ${pages[0]! + 1}-${pages[pages.length - 1]! + 1} with fill_page (one call per page), the page header / footer, then check_report`,
      {
        pages: Array.from({ length: r.totalPages }, (_, i) => pageFacts(i)),
        pageHeader: band('pageHeader') ? { height: band('pageHeader')!.height, width: pageFacts(pages[0] ?? 0).width } : 'off',
        pageFooter: band('pageFooter') ? { height: band('pageFooter')!.height } : 'off',
        ...withNotes(notes)
      }
    );
  }
};

const fillPageHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const items = params.items as ElementSpec[];
    const problems: string[] = [];
    items.forEach((item, i) => {
      const kind = findKind(item.kind);
      if (!kind) return problems.push(`items[${i}].kind: unknown kind "${item.kind}"`);
      const { kind: _k, spaceBefore: _s, y: _y, page: _p, ...spec } = item;
      problems.push(...validateValue(spec, createSchema(kind, true), `items[${i}]`));
    });
    if (problems.length) return fail(`Nothing was placed. Fix these settings:\n${problems.join('\n')}`);

    beginChange(context);
    const saved = snapshot();
    const notes: string[] = [];
    try {
      // A page of the plan keeps to itself: running on would push the next
      // planned page's content along (and add pages that weren't asked for)
      const planned = !!context.turn?.plan?.pages.includes(params.page - 1);
      const result = await fillPage(
        { page: params.page, items, startY: params.startY, gap: params.gap, x: params.x, width: params.width, overflow: params.overflow ?? (planned ? 'stop' : 'nextPage') },
        new Map(),
        notes
      );
      const seen = new Set<string>();
      for (const p of result.placed) {
        const loc = findElement(p.uuid);
        for (const note of loc ? layoutNotes(loc) : []) {
          if (!seen.has(note)) notes.push(note);
          seen.add(note);
        }
      }
      finish(context, result.placed[result.placed.length - 1]?.uuid);
      const pagesUsed = [...new Set(result.placed.map((p) => p.page))];
      return ok(
        `Placed ${result.placed.length} item(s) on page${pagesUsed.length > 1 ? 's' : ''} ${pagesUsed.join(', ')}; the content ends at y ${result.endsAt.y} of page ${result.endsAt.page} (${result.endsAt.roomLeft} px free there). Don't send these items again`,
        { placed: result.placed, endsAt: result.endsAt, ...withNotes(notes) }
      );
    } catch (error) {
      restore(saved);
      return fail(`${errorText(error)} (nothing was placed)`);
    }
  }
};

// Pages in a PDF: its page objects, or the page tree's count
function pdfPageCount(bytes: Uint8Array): number {
  const text = new TextDecoder('latin1').decode(bytes);
  const counts = [...text.matchAll(/\/Type\s*\/Pages\b[\s\S]{0,200}?\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  if (counts.length) return Math.max(...counts);
  return [...text.matchAll(/\/Type\s*\/Page(?![a-zA-Z])/g)].length;
}

// The real thing: the report server builds the PDF from the JRXML
const checkPdfHandler: MCPToolHandler = {
  execute: async () => {
    const r = useReportStore();
    r.updateJrxml();
    try {
      const blob = await generatePdf({ jrxml: formatXml(r.jrxmlContent) });
      const pages = pdfPageCount(new Uint8Array(await blob.arrayBuffer()));
      const expected = r.totalPages;
      const tables = r.bands.some((b) => b.elements.some((e) => e.type === 'table'));
      return ok(`The report server built the PDF: ${pages} page(s); the designer has ${expected}`, {
        pdfPages: pages,
        designerPages: expected,
        ...(pages > expected
          ? { notes: [`${pages - expected} more page(s) than designed: ${tables ? 'project-data tables printing many rows, or ' : ''}text growing past the bottom of a page pushes content onto extra pages. Run check_report for pages whose content grows too far`] }
          : pages < expected
            ? { notes: ['fewer pages than designed: an empty page may have been left out'] }
            : {})
      });
    } catch (error) {
      return fail(`The PDF could not be built: ${error instanceof Error ? error.message : String(error)}. If it is a report error, fix it; if the report server is not set up, skip this check`);
    }
  }
};

// ============================================
// Cover and contents pages (run by the designer)
// ============================================

// Things on a detail page (index from 0)
const itemsOnPage = (pageIndex: number) =>
  (useReportStore().bands.find((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL)?.elements ?? []).filter(
    (e) => (e.pageIndex ?? 0) === pageIndex
  ).length;

function pageHandler(
  toRequest: (params: Record<string, any>) => PageToolRequest | string,
  done: (params: Record<string, any>) => string
): MCPToolHandler {
  return {
    execute: async (params, context) => {
      if (!context.pageTool) return fail('Page changes are not available here');
      const request = toRequest(params);
      if (typeof request === 'string') return fail(request);
      beginChange(context);
      const problem = await context.pageTool(request);
      finish(context);
      if (problem) return fail(problem);
      clearSelection();
      const r = useReportStore();
      return ok(done(params), { pages: r.totalPages, cover: !!r.reportProperties.coverPage, contentsPages: r.reportProperties.contentsPages ?? 0 });
    }
  };
}

// Content on a page is only replaced or deleted once the user said yes
const askFirst = (pageIndex: number, flag: boolean | undefined, what: string, flagName: string) => {
  const count = itemsOnPage(pageIndex);
  return count && !flag
    ? `Page ${pageIndex + 1} has ${count} item(s). Ask the user whether to ${what} them; if they agree, call again with ${flagName}: true`
    : null;
};

const addCoverPageHandler = pageHandler(
  ({ design, wholeSheet }) => ({ action: 'addCover', design, wholeSheet: wholeSheet ?? true }),
  ({ design }) => `Added a cover page (${design}) as page 1; the other pages moved down one`
);

const addContentsPageHandler = pageHandler(
  ({ design }) => ({ action: 'addContents', design: design ?? 'contentsPlain' }),
  () => {
    const r = useReportStore();
    return `Contents pages: ${r.reportProperties.contentsPages ?? 0}${(r.reportProperties.contentsPages ?? 0) > 1 ? ' (the new one copies the last contents page)' : ''}`;
  }
);

const changePageDesignHandler = pageHandler(
  ({ page, design, wholeSheet, replaceContent }) =>
    askFirst(page - 1, replaceContent, 'replace', 'replaceContent') ?? { action: 'changeDesign', page: page - 1, design, wholeSheet },
  ({ page, design }) => `Page ${page} now has the ${design} design`
);

const setPageKindHandler = pageHandler(
  ({ page, kind }) => ({ action: 'setKind', page: page - 1, kind }),
  ({ page, kind }) => `Page ${page} is now a ${kind} page`
);

const setCoverWholeSheetHandler = pageHandler(
  ({ wholeSheet }) => ({ action: 'wholeSheet', on: !!wholeSheet }),
  ({ wholeSheet }) => (wholeSheet ? 'The cover now uses the whole sheet' : 'The cover now keeps the margins')
);

const deletePageHandler = pageHandler(
  ({ page, confirmed }) => askFirst(page - 1, confirmed, 'delete', 'confirmed') ?? { action: 'deletePage', page: page - 1 },
  ({ page }) => `Deleted page ${page}; later pages moved up`
);

// ============================================
// Undo/redo tool handlers
// ============================================

function historyHandler(action: 'undo' | 'redo'): MCPToolHandler {
  return {
    execute: async (_params, context) => {
      const run = context[action];
      if (!run) return fail(`${action} is not available here`);
      run();
      // A change after this is a new undo step
      if (context.turn) context.turn.recorded = false;
      clearSelection();
      return ok(action === 'undo' ? 'Undone' : 'Redone');
    }
  };
}

// ============================================
// Tool handler map
// ============================================

export const MCPToolHandlers: Record<string, MCPToolHandler> = {
  // Query tools
  get_design_state: getDesignStateHandler,
  get_element: getElementHandler,
  find_elements: findElementsHandler,
  get_report_data: getReportDataHandler,
  check_report: checkReportHandler,
  check_pdf: checkPdfHandler,
  plan_report: planReportHandler,
  fill_page: fillPageHandler,
  // Create tools
  create_design: createDesignHandler,
  ...Object.fromEntries(ELEMENT_KINDS.map((kind) => [kind.tool, createHandler(kind)])),
  // Modify tools
  update_element: updateElementHandler,
  move_element: moveElementHandler,
  resize_element: resizeElementHandler,
  delete_element: deleteElementHandler,
  delete_elements: deleteElementsHandler,
  move_elements: moveElementsHandler,
  update_elements_style: updateElementsStyleHandler,
  resize_elements: resizeElementsHandler,
  align_elements: alignElementsHandler,
  distribute_elements: distributeElementsHandler,
  convert_to_box: convertToBoxHandler,
  stack_elements: stackElementsHandler,
  put_in_box: putInBoxHandler,
  // Bands, pages, report
  update_band_height: updateBandHeightHandler,
  add_page: addPageHandler,
  update_report_properties: updateReportPropertiesHandler,
  // Cover and contents pages
  add_cover_page: addCoverPageHandler,
  add_contents_page: addContentsPageHandler,
  change_page_design: changePageDesignHandler,
  set_page_kind: setPageKindHandler,
  set_cover_whole_sheet: setCoverWholeSheetHandler,
  delete_page: deletePageHandler,
  undo: historyHandler('undo'),
  redo: historyHandler('redo')
};

// ============================================
// Tool execution interface
// ============================================

// Image sources naming an attached picture ("attachment:img-1") become the
// stored picture, wherever they are in the arguments (create_design items, children…)
async function withAttachedPictures(params: Record<string, any>, context: MCPContext): Promise<Record<string, any>> {
  if (!JSON.stringify(params).includes('"attachment:')) return params;
  const resolve = async (value: unknown, key?: string): Promise<unknown> => {
    if (typeof value === 'string' && key === 'source' && value.startsWith('attachment:')) {
      const id = value.slice('attachment:'.length).trim();
      const attachment = context.attachments?.get(id);
      const known = [...(context.attachments?.values() ?? [])].filter((a) => a.kind === 'image').map((a) => `${a.id} (${a.name})`);
      if (!attachment) throw new SpecError(`source: no attached picture "${id}"${known.length ? ` (attached: ${known.join(', ')})` : ' (nothing is attached)'}`);
      if (attachment.kind !== 'image') throw new SpecError(`source: ${id} (${attachment.name}) is not a picture`);
      try {
        return await attachmentImageSource(attachment);
      } catch (error) {
        throw new SpecError(`source: ${attachment.name} could not be stored for the report (${error instanceof Error ? error.message : String(error)})`);
      }
    }
    if (Array.isArray(value)) return Promise.all(value.map((v) => resolve(v)));
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = await resolve(v, k);
      return out;
    }
    return value;
  };
  return (await resolve(params)) as Record<string, any>;
}

/**
 * Execute an MCP tool (its arguments are checked against its schema first)
 */
export async function executeMCPTool(
  toolCall: MCPToolCall,
  context: MCPContext
): Promise<MCPToolResult> {
  const handler = MCPToolHandlers[toolCall.name];
  const schema = MCP_TOOL_SCHEMA_MAP[toolCall.name];

  if (!handler || !schema) {
    return fail(`Unknown tool: ${toolCall.name}`);
  }
  const problems = validateValue(toolCall.params ?? {}, schema.inputSchema);
  if (problems.length) return fail(`Wrong settings:\n${problems.join('\n')}`);

  try {
    const params = await withAttachedPictures(toolCall.params ?? {}, context);
    return await handler.execute(params, context);
  } catch (error) {
    return fail(errorText(error));
  }
}

/**
 * Execute MCP tools in batch
 */
export async function executeMCPToolsBatch(
  toolCalls: MCPToolCall[],
  context: MCPContext
): Promise<MCPToolResult[]> {
  const results: MCPToolResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executeMCPTool(toolCall, context);
    results.push(result);

    // If a tool execution fails, stop the batch
    if (!result.success) {
      break;
    }
  }

  return results;
}
