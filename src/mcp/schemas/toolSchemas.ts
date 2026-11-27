/**
 * MCP Tool Schemas - Tool schema definitions
 *
 * The tools the AI assistant can call. The create tools come from the element
 * schemas (mcp/elements): one create_<kind> per element of the library, plus
 * create_design to lay out many elements in one go.
 */

import { ELEMENT_KINDS, KIND_NAMES, createSchema } from '../elements/registry';
import type { JsonSchema } from '../elements/types';
import { COVER_DESIGN_TYPES, CONTENTS_DESIGN_TYPES } from '@/utils/pageDesigns';
import { SECTION_STYLES } from '@/utils/contentsList';
import en from '@/locales/en.json';

export interface MCPToolSchema {
  name: string;
  description: string;
  inputSchema: JsonSchema & {
    type: 'object';
    properties: Record<string, JsonSchema>;
    required: string[];
  };
  // Only reads the report (no undo step, nothing changes)
  readOnly?: boolean;
}

const tool = (
  name: string,
  description: string,
  properties: Record<string, JsonSchema> = {},
  required: string[] = [],
  readOnly = false
): MCPToolSchema => ({
  name,
  description,
  inputSchema: { type: 'object', properties, required, additionalProperties: false },
  ...(readOnly ? { readOnly } : {})
});

const UUID: JsonSchema = { type: 'string', description: 'uuid of the element (from the design state)' };
const UUIDS: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 1, description: 'uuids of the elements' };
const BAND_TYPE: JsonSchema = {
  type: 'string',
  enum: ['pageHeader', 'columnHeader', 'detail', 'columnFooter', 'pageFooter'],
  description: 'Band (section of the page)'
};

// ============================================
// Query tools
// ============================================

export const GET_DESIGN_STATE_SCHEMA = tool(
  'get_design_state',
  'Read the whole design again: page size, pages, bands and every element with its uuid, kind, place and settings. The state is also sent with every message; call this after many changes.',
  {},
  [],
  true
);

export const GET_ELEMENT_SCHEMA = tool(
  'get_element',
  'Read one element in full (all its settings, and a box\'s children)',
  { uuid: UUID },
  ['uuid'],
  true
);

export const FIND_ELEMENTS_SCHEMA = tool(
  'find_elements',
  'Find elements by kind, text, band or page',
  {
    kind: { type: 'string', enum: KIND_NAMES.filter((k) => k !== 'preset'), description: 'Element kind' },
    text: { type: 'string', description: 'Words it shows (part of them)' },
    bandType: { ...BAND_TYPE, enum: [...(BAND_TYPE.enum as string[]), 'background'] },
    page: { type: 'integer', minimum: 1, description: 'Detail page number' }
  },
  [],
  true
);

export const GET_REPORT_DATA_SCHEMA = tool(
  'get_report_data',
  'List the projects whose data a report can show (the first 30 A to Z; search finds others by name or code); with projectId, that project\'s details, lists (team, companies, contracts, the manager\'s details: copy them into text / typed tables), data sources (tables of rows) and its location (for create_location); with projectId and sourceId, the source\'s columns (key, name, type). Needed for create_data_table and the data of create_chart.',
  {
    projectId: { type: 'string' },
    sourceId: { type: 'string' },
    search: { type: 'string', description: 'Only projects whose name or code contains this' }
  },
  [],
  true
);

export const CHECK_REPORT_SCHEMA = tool(
  'check_report',
  'Review the whole report like a careful reader: "fix" findings print wrong (overlaps, text cut off or growing over other things, unreadable colours, outside the page, charts / tables / barcodes that print nothing or the wrong thing); "check" findings look unfinished (placeholder words, empty photo spots, empty pages, a heading stranded at the bottom of a page, headings that look different or repeat). Use it when asked to review or tidy the report, and before saying a large job is done.',
  {
    level: { type: 'string', enum: ['fix', 'check'], description: 'Only this kind (default both)' },
    page: { type: 'integer', minimum: 1, description: 'Only this page' }
  },
  [],
  true
);

// ============================================
// Create tools: one per element kind (mcp/elements)
// ============================================

export const CREATE_ELEMENT_SCHEMAS: MCPToolSchema[] = ELEMENT_KINDS.map((kind) => ({
  name: kind.tool,
  description: kind.description,
  inputSchema: createSchema(kind, false) as MCPToolSchema['inputSchema']
}));

export const PLAN_REPORT_SCHEMA = tool(
  'plan_report',
  'First step of a whole report (or of changing its page structure): sets up the pages in order — a blank cover (page 1) to design yourself, a blank contents page after it, then contentPages normal pages — turns the page header / footer on, removes empty column bands, adds the page border. Returns every page with its size, content area and what is on it, and the header / footer sizes. Then build page by page.',
  {
    coverPage: { type: 'boolean', description: 'A cover page in front' },
    wholeSheetCover: { type: 'boolean', description: 'The cover uses the whole sheet edge to edge (default false: inside the margins)' },
    contentsPage: { type: 'boolean', description: 'A contents page after the cover' },
    contentPages: { type: 'integer', minimum: 1, maximum: 40, description: 'Normal (content) pages' },
    header: { type: 'boolean', description: 'Page header on content pages (default true)' },
    footer: { type: 'boolean', description: 'Page footer on content pages (default true)' },
    pageBorder: { type: 'boolean', description: 'A border round every page (not a whole-sheet cover)' },
    keepColumnBands: { type: 'boolean', description: 'Keep empty column header / footer bands (default false: removed, the pages get their room)' }
  },
  ['coverPage', 'contentsPage', 'contentPages']
);

export const FILL_PAGE_SCHEMA = tool(
  'fill_page',
  'Put content on a page from top to bottom, like a document: list the items in reading order WITHOUT x / y; positions are worked out for you. Texts get the height their words need, headings stay with what follows, a paragraph that doesn\'t fit is split at a sentence and carries on, and what doesn\'t fit goes on to the next page (added at the end if needed) — except on a page plan_report planned, where the call fails saying how many words fit, so you shorten and send the page again. It starts under what is already on the page. Use it for every content page (one call per page) and for the contents page; use create_design only for free compositions such as a cover. All or nothing.',
  {
    page: { type: 'integer', minimum: 1, description: 'The page to fill' },
    items: {
      type: 'array',
      minItems: 1,
      description:
        'Top to bottom. Each is { kind, ...the settings of create_<kind> } without x / y (width defaults to the content width for texts, headings, tables, charts, boxes). Optional spaceBefore: extra space above it in px. Typical page: sectionHeading, text (60-120 words), subHeading, text, a table / chart / KPI boxes, text…',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: KIND_NAMES.filter((k) => k !== 'pageBorder') },
          spaceBefore: { type: 'number', minimum: 0, maximum: 300 }
        },
        required: ['kind']
      }
    },
    startY: { type: 'number', minimum: 0, description: 'Start here instead of under what is on the page' },
    gap: { type: 'number', minimum: 0, maximum: 80, description: 'Space between items (default 14)' },
    x: { type: 'number', minimum: 0, description: 'Left edge of the column (default: the page\'s content area)' },
    width: { type: 'number', minimum: 20, description: 'Width of the column (default: the content width)' },
    overflow: { type: 'string', enum: ['nextPage', 'stop'], description: 'What doesn\'t fit: carries on on the next page, or the call fails saying how much fits. Default: stop on a page plan_report planned (the next page has its own content), else nextPage' }
  },
  ['page', 'items']
);

export const CHECK_PDF_SCHEMA = tool(
  'check_pdf',
  'Have the report server build the real PDF and compare its page count with the designer\'s pages (more pages = content growing past the bottom of a page). Use it after building a whole report, after check_report is clean.',
  {},
  [],
  true
);

export const CREATE_DESIGN_SCHEMA = tool(
  'create_design',
  'Lay out several elements in one step (a cover, a dashboard row, a page of cards…), as one undo step. Each item is { kind, ...the settings of that kind\'s create tool }. Give an item a ref and later items can use it as parent (to go inside that box). A box may also list its children. Coloured rectangles that end up holding other new items become boxes automatically. All or nothing: if any item fails, nothing is made and the errors say what to fix; then send the whole design again. Once it succeeded, never send it again (everything would be made twice).',
  {
    elements: {
      type: 'array',
      minItems: 1,
      description: 'The elements, in drawing order (later items are on top)',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: KIND_NAMES, description: 'Which create_<kind> tool\'s settings the item uses' },
          ref: { type: 'string', description: 'Name for later items\' parent' },
          parent: { type: 'string', description: 'ref or uuid of a box' }
        },
        required: ['kind']
      }
    },
    keepShapes: {
      type: 'boolean',
      description: 'The user declined boxes: rectangles and circles stay plain shapes with the items lying on top (default false)'
    }
  },
  ['elements']
);

// ============================================
// Modify tools
// ============================================

export const UPDATE_ELEMENT_SCHEMA = tool(
  'update_element',
  'Change an element: properties take the same names as the create tool of its kind (e.g. a text: text, fontSize, isBold, forecolor…; a box: backcolor, borderPreset, cornerRadius…), plus x / y / width / height and page. Only the given settings change.',
  {
    uuid: UUID,
    properties: { type: 'object', description: 'Settings to change' }
  },
  ['uuid', 'properties']
);

export const MOVE_ELEMENT_SCHEMA = tool('move_element', 'Move an element to x / y (in its band, page area or box)', {
  uuid: UUID,
  x: { type: 'number', minimum: 0 },
  y: { type: 'number', minimum: 0 }
}, ['uuid', 'x', 'y']);

export const RESIZE_ELEMENT_SCHEMA = tool('resize_element', 'Resize an element', {
  uuid: UUID,
  width: { type: 'number', minimum: 1 },
  height: { type: 'number', minimum: 1 }
}, ['uuid']);

export const STACK_ELEMENTS_SCHEMA = tool(
  'stack_elements',
  'Line elements up top to bottom in the given order with an even gap, so none run into each other (the usual fix for overlaps on a page or in a box, e.g. a chart and a table). When they don\'t all fit, charts and pictures are made shorter (shrink, default true); if they still don\'t fit nothing is moved and the result says what to move to the next page.',
  {
    uuids: { ...UUIDS, description: 'Elements of one page / band or one box, in top-to-bottom order' },
    y: { type: 'number', minimum: 0, description: 'Top of the first one (default: where the first one is)' },
    gap: { type: 'number', minimum: 0, maximum: 200, description: 'Space between them in px (default 12)' },
    x: { type: 'number', minimum: 0, description: 'Give them all this left edge (default: each keeps its x)' },
    shrink: { type: 'boolean', description: 'Make charts and pictures shorter when they don\'t all fit (default true)' }
  },
  ['uuids']
);

export const PUT_IN_BOX_SCHEMA = tool(
  'put_in_box',
  'Make elements that lie in a box\'s area items of that box, so they move with it (each must lie wholly inside the box, on the same page).',
  { uuids: UUIDS, box: { type: 'string', description: 'uuid of the box' } },
  ['uuids', 'box']
);

export const CONVERT_TO_BOX_SCHEMA = tool(
  'convert_to_box',
  'Change a rectangle or circle into a box with the same look (fill, line, place, size; a circle becomes a box rounded by half its size), so things can go inside it and move with it. moveInside (default true) also puts the elements lying wholly on it inside. Only after the user agreed.',
  { uuid: UUID, moveInside: { type: 'boolean' } },
  ['uuid']
);

export const DELETE_ELEMENT_SCHEMA = tool('delete_element', 'Delete an element (a box with everything in it)', { uuid: UUID }, ['uuid']);

export const DELETE_ELEMENTS_SCHEMA = tool('delete_elements', 'Delete several elements', { uuids: UUIDS }, ['uuids']);

export const MOVE_ELEMENTS_SCHEMA = tool('move_elements', 'Move several elements by the same distance', {
  uuids: UUIDS,
  deltaX: { type: 'number', description: 'Right (+) or left (-), px' },
  deltaY: { type: 'number', description: 'Down (+) or up (-), px' }
}, ['uuids', 'deltaX', 'deltaY']);

export const UPDATE_ELEMENTS_STYLE_SCHEMA = tool(
  'update_elements_style',
  'Give several elements the same look (each takes the settings its kind has)',
  {
    uuids: UUIDS,
    fontSize: { type: 'number', minimum: 4, maximum: 120 },
    isBold: { type: 'boolean' },
    isItalic: { type: 'boolean' },
    isUnderline: { type: 'boolean' },
    forecolor: { type: 'string', description: '"#RRGGBB"' },
    backcolor: { type: 'string', description: '"#RRGGBB" or "transparent"' },
    textAlignment: { type: 'string', enum: ['Left', 'Center', 'Right', 'Justified'] }
  },
  ['uuids']
);

export const RESIZE_ELEMENTS_SCHEMA = tool('resize_elements', 'Give several elements the same width and / or height', {
  uuids: UUIDS,
  width: { type: 'number', minimum: 1 },
  height: { type: 'number', minimum: 1 }
}, ['uuids']);

export const ALIGN_ELEMENTS_SCHEMA = tool('align_elements', 'Line up 2 or more elements (in the same band / box)', {
  uuids: UUIDS,
  alignment: { type: 'string', enum: ['left', 'center', 'right', 'top', 'middle', 'bottom'] }
}, ['uuids', 'alignment']);

export const DISTRIBUTE_ELEMENTS_SCHEMA = tool('distribute_elements', 'Space 3 or more elements evenly', {
  uuids: UUIDS,
  direction: { type: 'string', enum: ['horizontal', 'vertical'] }
}, ['uuids', 'direction']);

// ============================================
// Bands, pages and report settings
// ============================================

export const UPDATE_BAND_HEIGHT_SCHEMA = tool(
  'update_band_height',
  'Set the height of a page header / footer / column header / footer band (the detail band takes the rest of the page)',
  { bandType: BAND_TYPE, height: { type: 'number', minimum: 0 } },
  ['bandType', 'height']
);

export const ADD_PAGE_SCHEMA = tool('add_page', 'Add normal pages at the end of the report', {
  count: { type: 'integer', minimum: 1, maximum: 20, description: 'How many (default 1)' }
});

export const UPDATE_REPORT_PROPERTIES_SCHEMA = tool(
  'update_report_properties',
  'Change the report name, paper size or margins (px; A4 portrait is 595 × 842, landscape 842 × 595). The page border and content are fitted to the new page.',
  {
    name: { type: 'string', description: 'Report name' },
    pageWidth: { type: 'number', minimum: 100, maximum: 3000 },
    pageHeight: { type: 'number', minimum: 100, maximum: 3000 },
    leftMargin: { type: 'number', minimum: 0, maximum: 300 },
    rightMargin: { type: 'number', minimum: 0, maximum: 300 },
    topMargin: { type: 'number', minimum: 0, maximum: 300 },
    bottomMargin: { type: 'number', minimum: 0, maximum: 300 },
    countSpecialPages: {
      type: 'boolean',
      description: 'Page numbers count the cover and contents pages (true, default, as in printed reports: the first normal page is page N+1) or start at 1 on the first normal page (false)'
    },
    sectionNumbering: {
      type: 'object',
      description: 'How every Heading is numbered (and the automatic Table of Contents with it): style "word" with word, e.g. "SECTION" → "SECTION 1."; or a style with optional before / after, e.g. style "1", before "Chapter ", after ":" → "Chapter 1:"',
      properties: {
        style: { type: 'string', enum: [...SECTION_STYLES, 'word'] },
        word: { type: 'string' },
        before: { type: 'string' },
        after: { type: 'string' }
      },
      required: ['style'],
      additionalProperties: false
    }
  }
);

// ============================================
// Cover and contents pages
// ============================================

// "id (Name: what it looks like)" for each design, from the design picker's texts
const designList = (ids: readonly string[]) =>
  ids
    .map((id) => {
      const d = (en.pageDesigns.designs as Record<string, { name?: string; desc?: string }>)[id];
      return d ? `${id} (${d.name}: ${d.desc})` : id;
    })
    .join('; ');

const PAGE: JsonSchema = { type: 'integer', minimum: 1, description: 'Designer page number (1 = first page)' };

export const ADD_COVER_PAGE_SCHEMA = tool(
  'add_cover_page',
  `Add a cover page in front of the report (no header / footer on it; page numbers and data tables are not allowed there). design: blank, or ${designList(COVER_DESIGN_TYPES)}. Design words and pictures are placeholders to change afterwards.`,
  {
    design: { type: 'string', enum: ['blank', ...COVER_DESIGN_TYPES] },
    wholeSheet: { type: 'boolean', description: 'Designed edge to edge on the whole sheet (default true); false keeps the margins' }
  },
  ['design']
);

export const ADD_CONTENTS_PAGE_SCHEMA = tool(
  'add_contents_page',
  `Add a contents page after the cover (and after the other contents pages). The first one gets a design: blank, or ${designList(CONTENTS_DESIGN_TYPES)}; later ones copy the last contents page and carry its Table of Contents on. A contents design also sets how the Headings are numbered.`,
  { design: { type: 'string', enum: ['blank', ...CONTENTS_DESIGN_TYPES], description: 'For the first contents page (default contentsPlain)' } }
);

export const CHANGE_PAGE_DESIGN_SCHEMA = tool(
  'change_page_design',
  'Give the cover or the contents pages another design (from the same lists as add_cover_page / add_contents_page). It replaces what is on the page (on contents pages: on every contents page, keeping the Table of Contents rows). If the page has content, ask the user first and pass replaceContent: true only after they agree.',
  {
    page: PAGE,
    design: { type: 'string', enum: ['blank', ...COVER_DESIGN_TYPES, ...CONTENTS_DESIGN_TYPES] },
    wholeSheet: { type: 'boolean', description: 'Cover only: designed on the whole sheet' },
    replaceContent: { type: 'boolean', description: 'The user agreed to replace what is on the page' }
  },
  ['page', 'design']
);

export const SET_PAGE_KIND_SCHEMA = tool(
  'set_page_kind',
  'Make a page the cover (only page 1, when there is no cover or contents page yet), a contents page (only the first normal page), or a normal page again (the cover when there are no contents pages; the last contents page). Its content stays. Not allowed when the page holds something that can\'t be on that kind of page.',
  { page: PAGE, kind: { type: 'string', enum: ['cover', 'contents', 'normal'] } },
  ['page', 'kind']
);

export const SET_COVER_WHOLE_SHEET_SCHEMA = tool(
  'set_cover_whole_sheet',
  'The cover uses the whole sheet edge to edge (true) or keeps the margins (false); its content is fitted to the new area.',
  { wholeSheet: { type: 'boolean' } },
  ['wholeSheet']
);

export const DELETE_PAGE_SCHEMA = tool(
  'delete_page',
  'Delete a page and everything on it (one normal page always stays; later pages move up). If the page has content, ask the user first and pass confirmed: true only after they agree.',
  { page: PAGE, confirmed: { type: 'boolean', description: 'The user agreed to delete the page\'s content' } },
  ['page']
);

export const UNDO_SCHEMA = tool('undo', 'Undo the last change', {});
export const REDO_SCHEMA = tool('redo', 'Redo the last undone change', {});

// ============================================
// Export all tool schemas
// ============================================

export const ALL_MCP_TOOL_SCHEMAS: MCPToolSchema[] = [
  // Query tools
  GET_DESIGN_STATE_SCHEMA,
  GET_ELEMENT_SCHEMA,
  FIND_ELEMENTS_SCHEMA,
  GET_REPORT_DATA_SCHEMA,
  CHECK_REPORT_SCHEMA,
  CHECK_PDF_SCHEMA,
  // Whole reports
  PLAN_REPORT_SCHEMA,
  FILL_PAGE_SCHEMA,
  // Create tools
  CREATE_DESIGN_SCHEMA,
  ...CREATE_ELEMENT_SCHEMAS,
  // Modify tools
  UPDATE_ELEMENT_SCHEMA,
  MOVE_ELEMENT_SCHEMA,
  RESIZE_ELEMENT_SCHEMA,
  DELETE_ELEMENT_SCHEMA,
  DELETE_ELEMENTS_SCHEMA,
  MOVE_ELEMENTS_SCHEMA,
  UPDATE_ELEMENTS_STYLE_SCHEMA,
  RESIZE_ELEMENTS_SCHEMA,
  ALIGN_ELEMENTS_SCHEMA,
  DISTRIBUTE_ELEMENTS_SCHEMA,
  CONVERT_TO_BOX_SCHEMA,
  STACK_ELEMENTS_SCHEMA,
  PUT_IN_BOX_SCHEMA,
  // Bands, pages, report
  UPDATE_BAND_HEIGHT_SCHEMA,
  ADD_PAGE_SCHEMA,
  UPDATE_REPORT_PROPERTIES_SCHEMA,
  // Cover and contents pages
  ADD_COVER_PAGE_SCHEMA,
  ADD_CONTENTS_PAGE_SCHEMA,
  CHANGE_PAGE_DESIGN_SCHEMA,
  SET_PAGE_KIND_SCHEMA,
  SET_COVER_WHOLE_SHEET_SCHEMA,
  DELETE_PAGE_SCHEMA,
  UNDO_SCHEMA,
  REDO_SCHEMA
];

// Get the tool schema map
export const MCP_TOOL_SCHEMA_MAP: Record<string, MCPToolSchema> = {};
ALL_MCP_TOOL_SCHEMAS.forEach(schema => {
  MCP_TOOL_SCHEMA_MAP[schema.name] = schema;
});

// Generate a tool definition format understandable by AI models
export function generateAIToolDefinitions(): Array<{
  name: string;
  description: string;
  parameters: any;
}> {
  return ALL_MCP_TOOL_SCHEMAS.map(schema => ({
    name: schema.name,
    description: schema.description,
    parameters: schema.inputSchema
  }));
}
