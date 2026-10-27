// Composite Elements and ready-made pieces: Page Number, Date, Page Border,
// Barcode, Table of Contents and the Element Presets (boxes, header / footer,
// risk legend, sign-off, table presets). Each is built by the same builder as
// its library tile, then the AI's settings are applied.

import type { BarcodeElement, ContentsListElement, CustomTableElement, DesignElement, FrameElement, TextFieldElement } from "@/types";
import {
  applyPaginationSettings,
  buildPaginationElement,
  getPaginationSettings,
  isPagination,
  NUMBER_STYLES,
  PAGINATION_FORMATS,
  PAGINATION_POSITIONS,
  pagesOutsideRange,
  placePaginationInBand,
  type NumberStyle,
  type PageGroup,
  type PaginationFormat,
  type PaginationPosition,
  type PaginationSettings,
} from "@/utils/paginationPresets";
import {
  applyDateSetup,
  buildDateElement,
  DATE_TIME_STYLES,
  DATE_WHENS,
  DAY_FORMATS,
  formatsFor,
  getDateSetup,
  isDateElement,
  MONTH_FORMATS,
  type DateSetup,
} from "@/utils/dateElement";
import {
  BARCODE_SIZES,
  BARCODE_TYPE_IDS,
  BARCODE_TYPES,
  barcodeTypeInfo,
  buildBarcodeElement,
  checkBarcodeValue,
  readBarcodeValue,
  switchBarcodeType,
  toBarcodeExpression,
  type BarcodeType,
} from "@/utils/barcode/barcodeTypes";
import {
  buildFrameTemplate,
  FRAME_TEMPLATE_TYPES,
  getBoxCornerRadii,
  PAGE_BORDER_TYPE,
  setBoxCornerRadii,
} from "@/utils/framePresets";
import { buildReportPart, isReportPartType, reportPartBand, type ReportPartType } from "@/utils/reportParts";
import { TABLE_PRESET_TYPES } from "@/utils/tablePresets";
import { fitTableToBox, visibleCells } from "@/utils/customTable";
import {
  applyListLook,
  currentListLook,
  LIST_LOOKS,
  SECTION_STYLES,
  SUB_STYLES,
  syncContentsListSize,
  type ListLook,
} from "@/utils/contentsList";
import { applyGeometry, boxKind, frameCtx } from "./basic";
import {
  applyBoxLines,
  applyTextStyle,
  BORDER_PROPS,
  color,
  defined,
  describeBoxLines,
  describeCorners,
  describeTextStyle,
  ensureTextHeight,
  has,
  readCorners,
  requireColor,
  TEXT_STYLE_PROPS,
  writeText,
} from "./common";
import { SpecError, type ElementKind, type ElementSpec, type KindContext } from "./types";
import i18n from "@/i18n";
import {
  ADDRESS_LINES,
  addressLines,
  buildLocationElement,
  coordinateProblem,
  getLocationSetup,
  isLocationElement,
  LOCATION_LAYOUTS,
  PLACE_FIELDS,
  toPlace,
  updateLocation,
  type LocationSetup,
} from "@/utils/location/locationElement";
import { MAX_MAP_ZOOM, MIN_MAP_ZOOM } from "@/utils/location/locationMap";
import { getProject } from "@/queries/projectQueries";

const uuid = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// Page Number
// ---------------------------------------------------------------------------

const PAGE_RANGES = ["all", "skipFirst", "skipFirstTwo"] as const;

// Space between a page number and the side of the page (and its border line)
const SIDE_GAP = 10;

type PartSpec = { from: number; to?: number; format?: PaginationFormat; numberStyle?: NumberStyle };

// Parts in page order, refused (with the reason) when they run into each other
function readParts(parts: PartSpec[]): PageGroup[] {
  const sorted = [...parts].sort((a, b) => a.from - b.from);
  sorted.forEach((part, i) => {
    if (part.to !== undefined && part.to < part.from) throw new SpecError(`parts: a part can't end (page ${part.to}) before it starts (page ${part.from})`);
    const next = sorted[i + 1];
    if (next && part.to !== undefined && next.from <= part.to) {
      throw new SpecError(`parts: pages ${part.from}-${part.to} and ${next.from}-${next.to ?? "end"} overlap; a page belongs to one part only`);
    }
  });
  return sorted.map((p) => ({ from: p.from, ...(p.to !== undefined ? { to: p.to } : {}), ...(p.format ? { format: p.format } : {}), ...(p.numberStyle ? { numberStyle: p.numberStyle } : {}) }));
}

function applyPageNumber(element: TextFieldElement, spec: ElementSpec, ctx: KindContext): void {
  applyGeometry(element, spec);
  const keys = ["format", "numberStyle", "range", "parts", "partNumbering", "pagesWithoutNumber", "afterPageWithoutNumber"];
  if (keys.some((k) => has(spec, k))) {
    const settings: PaginationSettings = { ...getPaginationSettings(element) };
    if (has(spec, "format")) settings.format = spec.format;
    if (has(spec, "numberStyle")) settings.numberStyle = spec.numberStyle;
    if (has(spec, "range")) Object.assign(settings, { range: spec.range, groups: undefined, from: undefined, to: undefined });
    if (has(spec, "parts")) {
      const groups = readParts(spec.parts as PartSpec[]);
      Object.assign(settings, { range: "custom", groups, from: groups[0]?.from, to: groups[0]?.to });
    }
    if (has(spec, "partNumbering")) settings.groupNumbering = spec.partNumbering;
    if (has(spec, "pagesWithoutNumber")) settings.hidden = [...new Set(spec.pagesWithoutNumber as number[])].sort((a, b) => a - b);
    if (has(spec, "afterPageWithoutNumber")) settings.hiddenNumbering = spec.afterPageWithoutNumber === "skip" ? "skip" : "keep";
    // Pages without a number only exist inside the numbered parts
    const outside = settings.range === "custom" && settings.hidden?.length ? pagesOutsideRange(settings, settings.hidden) : [];
    if (outside.length) throw new SpecError(`pagesWithoutNumber: ${outside.join(", ")} ${outside.length > 1 ? "are" : "is"} outside every part, so they have no number anyway`);
    applyPaginationSettings(element, settings);
  }
  applyTextStyle(element, spec);
  ensureTextHeight(element, ctx);
}

export const pageNumberKind: ElementKind = {
  kind: "pageNumber",
  tool: "create_page_number",
  description:
    "Add a page number (\"Page 3\", \"Page 3 of 12\"…). It goes in the page header or footer (it repeats on every page there); never on the cover or contents pages. Give position for a usual place, or bandType + x / y.",
  properties: {
    format: {
      type: "string",
      enum: PAGINATION_FORMATS.map((f) => f.id),
      description: 'simple "3", prefixed "Page 3" (default), pageXofY "Page 3 of 12", slash "3 / 12"',
    },
    numberStyle: { type: "string", enum: NUMBER_STYLES, description: "arabic 1 2 3 (default), romanLower i ii, romanUpper I II, letters A B" },
    range: { type: "string", enum: PAGE_RANGES, description: "Which pages get a number: all (default), skipFirst, skipFirstTwo. Use parts for anything else" },
    parts: {
      type: "array",
      minItems: 1,
      description:
        "Only some pages get a number: the parts that do, e.g. [{from: 3, to: 10}, {from: 11, format: \"simple\", numberStyle: \"romanLower\"}]. Page numbers as the report counts them. A part may have its own format / numberStyle (else the page number's). Parts can't overlap; a part without \"to\" runs until the next part (the last one to the end)",
      items: {
        type: "object",
        properties: {
          from: { type: "integer", minimum: 1 },
          to: { type: "integer", minimum: 1 },
          format: { type: "string", enum: PAGINATION_FORMATS.map((f) => f.id) },
          numberStyle: { type: "string", enum: NUMBER_STYLES },
        },
        required: ["from"],
        additionalProperties: false,
      },
    },
    partNumbering: { type: "string", enum: ["restart", "continue"], description: "With two or more parts: each part starts again at 1 (restart, default) or the count carries on" },
    pagesWithoutNumber: {
      type: "array",
      items: { type: "integer", minimum: 1 },
      description: "Pages inside the numbered parts that show no number, e.g. [3, 5, 8, 9, 10]; [] for none",
    },
    afterPageWithoutNumber: {
      type: "string",
      enum: ["count", "skip"],
      description: "A page without a number still counts (count, default) or the next page takes its number (skip)",
    },
    position: {
      type: "string",
      enum: PAGINATION_POSITIONS.map((p) => p.id),
      description: "Usual place: topRight (page header), bottomRight or bottomCenter (page footer); used when x / y are not given",
    },
    ...TEXT_STYLE_PROPS,
  },
  inBox: true,
  defaultBand: (spec) =>
    PAGINATION_POSITIONS.find((p) => p.id === spec.position)?.edge === "top" ? "pageHeader" : "pageFooter",
  matches: (e) => e.type === "textField" && isPagination(e),
  create(spec, ctx) {
    const position = spec.position as PaginationPosition | undefined;
    const element = buildPaginationElement(position ?? "bottomCenter", { fontFamily: ctx.fontName, fontSize: ctx.fontSize });
    applyPageNumber(element, spec, ctx);
    return element;
  },
  autoPlace(element, spec, area) {
    const position = (spec.position as PaginationPosition) ?? "bottomCenter";
    Object.assign(element, placePaginationInBand(element, position, area.width, area.height));
    // Not flush against the side: clear of the page border line
    if (PAGINATION_POSITIONS.find((p) => p.id === position)?.align === "Right") element.x = Math.max(0, element.x - SIDE_GAP);
  },
  update: (e, spec, ctx) => applyPageNumber(e as TextFieldElement, spec, ctx),
  describe(e) {
    const s = getPaginationSettings(e);
    const custom = s.range === "custom";
    return defined({
      format: s.format,
      numberStyle: s.numberStyle,
      range: custom ? undefined : s.range,
      parts: custom ? (s.groups?.length ? s.groups : [{ from: s.from ?? 1, ...(s.to ? { to: s.to } : {}) }]) : undefined,
      partNumbering: s.groups && s.groups.length > 1 ? s.groupNumbering ?? "restart" : undefined,
      pagesWithoutNumber: s.hidden?.length ? s.hidden : undefined,
      afterPageWithoutNumber: s.hidden?.length ? (s.hiddenNumbering === "skip" ? "skip" : "count") : undefined,
      ...describeTextStyle(e),
    });
  },
};

// ---------------------------------------------------------------------------
// Date: fills itself in when the report is printed
// ---------------------------------------------------------------------------

const DATE_FORMAT_IDS = [...new Set([...DAY_FORMATS, ...MONTH_FORMATS].map((f) => f.id))];

function applyDate(element: TextFieldElement, spec: ElementSpec, ctx: KindContext): void {
  applyGeometry(element, spec);
  const keys = ["when", "date", "format", "time", "textBefore"];
  if (keys.some((k) => has(spec, k))) {
    const setup: Partial<DateSetup> = { ...getDateSetup(element) };
    if (has(spec, "when")) setup.when = spec.when;
    if (has(spec, "date")) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(spec.date)) throw new SpecError('date: use "yyyy-MM-dd"');
      setup.date = spec.date;
    }
    if (has(spec, "time")) setup.time = spec.time;
    if (has(spec, "textBefore")) setup.before = String(spec.textBefore);
    const allowed = formatsFor(setup.when ?? "printed").map((f) => f.id as string);
    if (has(spec, "format")) {
      if (!allowed.includes(spec.format)) throw new SpecError(`format: with when "${setup.when}" use one of ${allowed.join(", ")}`);
      setup.format = spec.format;
    } else if (setup.format && !allowed.includes(setup.format)) {
      setup.format = allowed[0];
    }
    applyDateSetup(element, setup);
  }
  applyTextStyle(element, spec);
  ensureTextHeight(element, ctx);
}

export const dateKind: ElementKind = {
  kind: "date",
  tool: "create_date",
  description:
    "Add a date that fills itself in: the day the report is printed, this month, last month, or a chosen date, with optional words before it (\"Printed on 16 October 2026\"). For a date that never changes, a text is fine too.",
  properties: {
    when: { type: "string", enum: DATE_WHENS, description: "printed (default), thisMonth, lastMonth, fixed (give date)" },
    date: { type: "string", description: "yyyy-MM-dd, for when = fixed" },
    format: {
      type: "string",
      enum: DATE_FORMAT_IDS,
      description:
        "Look. Days: dayMonthYear \"16 October 2026\" (default), dayShortMonthYear, numeric \"16/10/2026\", weekday, iso, monthYear. Months (thisMonth / lastMonth): monthYear (default), shortMonthYear, numericMonth",
    },
    time: { type: "string", enum: DATE_TIME_STYLES, description: "Time after the date (printed only): none, 24h, 12h" },
    textBefore: { type: "string", description: "Words before the date, e.g. \"Printed on \"" },
    ...TEXT_STYLE_PROPS,
  },
  inBox: true,
  matches: (e) => e.type === "textField" && isDateElement(e),
  create(spec, ctx) {
    const element = buildDateElement({ fontFamily: ctx.fontName, fontSize: ctx.fontSize });
    applyDate(element, spec, ctx);
    return element;
  },
  update: (e, spec, ctx) => applyDate(e as TextFieldElement, spec, ctx),
  describe(e) {
    const s = getDateSetup(e);
    return defined({ when: s.when, date: s.date, format: s.format, time: s.time !== "none" ? s.time : undefined, textBefore: s.before, ...describeTextStyle(e) });
  },
};

// ---------------------------------------------------------------------------
// Location: a box with a map of the place (with a pin) and its address
// ---------------------------------------------------------------------------

async function applyLocation(box: FrameElement, spec: ElementSpec, ctx: KindContext): Promise<void> {
  const patch: Partial<LocationSetup> = {};
  // A project's location first, then any field given on top of it
  if (has(spec, "projectId")) {
    const details = await getProject(String(spec.projectId)).catch(() => null);
    if (!details) throw new SpecError(`projectId: no project ${spec.projectId} (get_report_data lists them)`);
    const place = toPlace(details.location);
    if (!PLACE_FIELDS.some((f) => place[f])) throw new SpecError(`projectId: ${details.name} has no location`);
    Object.assign(patch, place);
  }
  for (const field of PLACE_FIELDS) {
    if (has(spec, field)) patch[field] = String(spec[field]).trim();
  }
  for (const field of ["latitude", "longitude"] as const) {
    const problem = patch[field] !== undefined ? coordinateProblem(field, patch[field]!) : null;
    if (problem) throw new SpecError(`${field}: ${problem === "notNumber" ? "a number" : field === "latitude" ? "between -90 and 90" : "between -180 and 180"}`);
  }
  if (has(spec, "zoom")) patch.zoom = spec.zoom;
  if (has(spec, "layout")) patch.layout = spec.layout;
  if (has(spec, "show")) patch.show = { ...getLocationSetup(box).show, ...spec.show };
  applyGeometry(box, { x: spec.x, y: spec.y });
  if (has(spec, "width")) box.width = Math.max(80, Math.min(Number(spec.width), ctx.availableWidth));
  if (has(spec, "height")) box.height = Math.max(40, Number(spec.height));
  updateLocation(box, patch, { fontFamily: ctx.fontName, fontSize: ctx.fontSize });
  applyBoxLines(box, spec);
  if (!getLocationSetup(box).latitude || !getLocationSetup(box).longitude) {
    ctx.notes.push("no latitude / longitude yet: the map stays empty until they are set");
  }
}

export const locationKind: ElementKind = {
  kind: "location",
  tool: "create_location",
  description:
    "Add a Location: a map of a place with a pin on it (OpenStreetMap, drawn by the designer) and the place's address. Give projectId to copy a project's location (get_report_data with projectId shows it), or the fields yourself; the map needs latitude and longitude. The box's height follows the layout and the address.",
  properties: {
    projectId: { type: "string", description: "Copy this project's location (country, state, city, postcode, address, latitude, longitude)" },
    country: { type: "string" },
    state: { type: "string", description: "State / province" },
    city: { type: "string" },
    postcode: { type: "string" },
    address: { type: "string", description: "Full address (street, building, landmark)" },
    latitude: { type: "number", minimum: -90, maximum: 90 },
    longitude: { type: "number", minimum: -180, maximum: 180 },
    zoom: {
      type: "integer",
      minimum: MIN_MAP_ZOOM,
      maximum: MAX_MAP_ZOOM,
      description: "How close the map is: 0 whole world, 3 continent, 5 whole country, 8 region, 11 city, 14 town area, 15 streets (default), 17-19 buildings",
    },
    layout: { type: "string", enum: LOCATION_LAYOUTS, description: "mapAbove (default), mapBeside, mapOnly, addressOnly" },
    show: {
      type: "object",
      description: "Address lines to print (default: all but coordinates)",
      properties: Object.fromEntries(ADDRESS_LINES.map((line) => [line, { type: "boolean" }])),
      additionalProperties: false,
    },
    borderPreset: BORDER_PROPS.borderPreset!,
    border: BORDER_PROPS.border!,
  },
  inBox: false,
  matches: (e) => isLocationElement(e),
  async create(spec, ctx) {
    const box = buildLocationElement({}, { font: { fontFamily: ctx.fontName, fontSize: ctx.fontSize }, maxWidth: ctx.availableWidth });
    await applyLocation(box, spec, ctx);
    return box;
  },
  update: (e, spec, ctx) => applyLocation(e as FrameElement, spec, ctx),
  describe(e) {
    const s = getLocationSetup(e);
    return defined({
      ...Object.fromEntries(PLACE_FIELDS.map((f) => [f, s[f] || undefined])),
      zoom: s.zoom,
      layout: s.layout,
      addressShows: addressLines(s).join(" / ") || undefined,
      ...describeBoxLines(e),
    });
  },
};

// ---------------------------------------------------------------------------
// Page Border: one frame around the printable area of every page
// ---------------------------------------------------------------------------

function applyPageBorder(box: FrameElement, spec: ElementSpec): void {
  applyBoxLines(box, spec);
  const radii = readCorners(spec);
  if (radii) setBoxCornerRadii(box, radii);
}

export const pageBorderKind: ElementKind = {
  kind: "pageBorder",
  tool: "create_page_border",
  description:
    "Add a border around the printable area of every page (it sits in the background layer). Only one is allowed; to change it, use update_element on it. A whole-sheet cover never shows it.",
  properties: {
    borderPreset: BORDER_PROPS.borderPreset!,
    border: BORDER_PROPS.border!,
    cornerRadius: { type: "number", minimum: 0, maximum: 100, description: "Rounded corners, radius in px" },
  },
  fixedPlace: true,
  inBox: false,
  matches: (e, bandType) => e.type === "frame" && bandType === "background",
  create(spec, ctx) {
    const box = { ...buildFrameTemplate(PAGE_BORDER_TYPE, frameCtx(ctx)), uuid: uuid(), x: 0, y: 0 };
    applyPageBorder(box, spec);
    return box;
  },
  update: (e, spec) => applyPageBorder(e as FrameElement, spec),
  describe: (e) => defined({ ...describeBoxLines(e), ...describeCorners(getBoxCornerRadii(e as FrameElement)) }),
};

// ---------------------------------------------------------------------------
// Barcode
// ---------------------------------------------------------------------------

function setBarcodeValue(element: BarcodeElement, value: string): void {
  const problem = checkBarcodeValue(element.barcodeType, value.trim());
  if (problem) {
    throw new SpecError(`value: ${i18n.global.t(`barcode.problems.${problem.key}`, problem.params ?? {})} (sample for ${element.barcodeType}: "${barcodeTypeInfo(element.barcodeType).sample}")`);
  }
  element.codeExpression = toBarcodeExpression(value.trim());
}

function applyBarcode(element: BarcodeElement, spec: ElementSpec, ctx: KindContext): void {
  if (has(spec, "barcodeType") && spec.barcodeType !== element.barcodeType) {
    const before = barcodeTypeInfo(element.barcodeType).kind;
    switchBarcodeType(element, spec.barcodeType as BarcodeType);
    const after = barcodeTypeInfo(element.barcodeType).kind;
    // Another kind of code (bars, square, postal) gets that kind's box size,
    // as far as there is room for it
    if (before !== after) {
      const size = BARCODE_SIZES[after];
      element.width = Math.max(20, Math.min(size.width, ctx.availableWidth - element.x));
      element.height = Math.max(20, Math.min(size.height, ctx.availableHeight - element.y));
    }
    // A QR code can't be turned
    if (element.barcodeType === "QRCode") element.rotation = "None";
  }
  applyGeometry(element, spec);
  if (has(spec, "value")) setBarcodeValue(element, String(spec.value));
}

export const barcodeKind: ElementKind = {
  kind: "barcode",
  tool: "create_barcode",
  description:
    "Add a barcode or QR code. The value must suit the type (EAN13: 12 or 13 digits; QRCode: any text or a link, e.g. \"https://…\"). It fills its box like a picture.",
  properties: {
    barcodeType: {
      type: "string",
      enum: BARCODE_TYPE_IDS,
      description: `Default Code128. Kinds: ${BARCODE_TYPES.map((b) => `${b.type} (${b.group})`).join(", ")}`,
    },
    value: { type: "string", description: "What the code holds (default: the type's sample)" },
  },
  inBox: true,
  matches: (e) => e.type === "barcode",
  create(spec, ctx) {
    const type = (spec.barcodeType as BarcodeType | undefined) ?? "Code128";
    const element = { ...buildBarcodeElement(type), uuid: uuid() } as BarcodeElement;
    applyBarcode(element, spec, ctx);
    return element;
  },
  update: (e, spec, ctx) => applyBarcode(e as BarcodeElement, spec, ctx),
  describe(e) {
    const b = e as BarcodeElement;
    return { barcodeType: b.barcodeType, value: readBarcodeValue(b.codeExpression).text };
  },
};

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------

function applyContents(element: ContentsListElement, spec: ElementSpec): void {
  applyGeometry(element, spec);
  const list = element.list;
  if (has(spec, "look")) applyListLook(list, spec.look as ListLook);
  if (has(spec, "mode")) list.follow = spec.mode === "automatic";
  if (has(spec, "rows")) {
    const rows = spec.rows as Array<{ title: string; level?: number; page?: string | number; number?: string }>;
    list.follow = false;
    list.entries = rows.map((r) => ({
      title: r.title,
      level: r.level === 1 ? 1 : 0,
      page: r.page === undefined ? "" : String(r.page),
      number: r.number ?? "",
    }));
    // Numbers typed in the rows: not counted automatically
    list.autoNumber = !rows.some((r) => r.number);
  }
  if (has(spec, "sectionStyle")) list.sectionStyle = spec.sectionStyle;
  if (has(spec, "subStyle")) list.subStyle = spec.subStyle;
  if (has(spec, "sectionsOnly")) list.sectionsOnly = !!spec.sectionsOnly || undefined;
  if (has(spec, "leader")) list.leader = !!spec.leader;
  if (has(spec, "fontSize")) list.fontSize = spec.fontSize;
  if (has(spec, "rowHeight")) list.rowHeight = Math.round(spec.rowHeight);
  if (has(spec, "forecolor")) list.color = requireColor(spec.forecolor, "forecolor");
  if (list.rowHeight < Math.ceil(list.fontSize * 1.45)) list.rowHeight = Math.ceil(list.fontSize * 1.45);
  syncContentsListSize(element);
}

export const tableOfContentsKind: ElementKind = {
  kind: "tableOfContents",
  tool: "create_table_of_contents",
  description:
    "Add a Table of Contents. Automatic (default): one row per Heading / Sub-heading on the normal pages, with their page numbers, kept up to date. Manual: give the rows. Not allowed on the cover; only one on the contents pages. Its height follows its rows.",
  properties: {
    mode: { type: "string", enum: ["automatic", "manual"], description: "automatic (default) follows the headings; manual uses rows" },
    rows: {
      type: "array",
      description: "Manual rows",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          level: { type: "integer", enum: [0, 1], description: "0 section, 1 indented sub-section" },
          page: { type: "string", description: "Page shown on the right" },
          number: { type: "string", description: "Own number (leave out to number automatically)" },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
    look: { type: "string", enum: LIST_LOOKS, description: "classic, dotted (dotted lines to the page), numbered (number boxes), plain" },
    sectionStyle: { type: "string", enum: SECTION_STYLES, description: "How sections are numbered" },
    subStyle: { type: "string", enum: SUB_STYLES, description: "How sub-sections are numbered" },
    sectionsOnly: { type: "boolean", description: "Leave the sub-sections out" },
    leader: { type: "boolean", description: "Dotted line between title and page" },
    fontSize: { type: "number", minimum: 6, maximum: 30 },
    rowHeight: { type: "number", minimum: 10, maximum: 60, description: "Height of each row in px" },
    forecolor: color("Text colour"),
  },
  inBox: true,
  matches: (e) => e.type === "contentsList",
  create(spec, ctx) {
    const element = { ...buildReportPart("partContentsList", frameCtx(ctx)), uuid: uuid() } as ContentsListElement;
    applyContents(element, spec);
    return element;
  },
  autoPlace(element, _spec, area) {
    element.x = Math.max(0, Math.round((area.width - element.width) / 2));
    element.y = 40;
  },
  update: (e, spec) => applyContents(e as ContentsListElement, spec),
  describe(e) {
    const list = (e as ContentsListElement).list;
    return defined({
      mode: list.follow ? "automatic" : "manual",
      rows: list.entries.slice(0, 40).map((r) => defined({ number: r.number, title: r.title, level: r.level || undefined, page: r.page })),
      look: currentListLook(list) ?? undefined,
      sectionStyle: list.sectionStyle,
      subStyle: list.subStyle,
      sectionsOnly: list.sectionsOnly,
      leader: list.leader,
      fontSize: list.fontSize,
      rowHeight: list.rowHeight,
      forecolor: list.color,
    });
  },
};

// ---------------------------------------------------------------------------
// Presets: the library's ready-made pieces, with their placeholder texts
// replaced by the AI's
// ---------------------------------------------------------------------------

const BOX_PRESETS = FRAME_TEMPLATE_TYPES.filter((t) => t !== PAGE_BORDER_TYPE);
const PART_PRESETS = ["partReportHeader", "partPageFooter", "partNote", "partRiskLegend", "partStatusDot", "partSignOff"] as const;
export const PRESETS = [...BOX_PRESETS, ...PART_PRESETS, ...TABLE_PRESET_TYPES] as const;

// The texts of a preset in reading order (top to bottom, left to right)
function presetTexts(element: DesignElement): TextFieldElement[] {
  // Page numbers and dates fill themselves in: not texts to replace
  if (element.type === "textField") return isPagination(element) || isDateElement(element) ? [] : [element];
  if (element.type !== "frame") return [];
  return ((element as FrameElement).elements ?? [])
    .filter((c): c is TextFieldElement => c.type === "textField" && !isPagination(c) && !isDateElement(c))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function fillPresetTexts(element: DesignElement, texts: string[]): void {
  if (element.type === "customTable") {
    const cells = visibleCells((element as CustomTableElement).table);
    cells.forEach((c, i) => {
      if (texts[i] !== undefined) {
        c.cell.text = texts[i]!;
        delete c.cell.rich;
      }
    });
    return;
  }
  presetTexts(element).forEach((part, i) => {
    if (texts[i] !== undefined) writeText(part, texts[i]!, false);
  });
}

export const presetKind: ElementKind = {
  kind: "preset",
  tool: "create_preset",
  description:
    "Add one of the library's ready-made pieces: frameKpiCard (label / big number / caption card), frameAlertBox (title + text on red tint), frameTitledSection (bordered block with dark title strip, full width), framePhotoCard (photo + caption + meta), partReportHeader (dark banner, 2 title lines and the report's month, a date that fills itself in; page header), partPageFooter (rule, \"Page X of N\", logo spot; page footer), partNote (small italic note), partRiskLegend (green / amber / red legend), partStatusDot, partSignOff (signature spot, name, role, and the date, which fills itself in), and typed tables tableKeyValue, tableFinancial, tableProgress, tableComparison, tableActionPlan, tableRiskRegister. Use texts to replace its placeholder words.",
  properties: {
    preset: { type: "string", enum: PRESETS },
    texts: {
      type: "array",
      items: { type: "string" },
      description:
        "New words for its placeholder texts in reading order (top to bottom, left to right); for a table preset, its cells row by row (a merged cell once). Leave an item out (or the array short) to keep the placeholder",
    },
  },
  required: ["preset"],
  inBox: false,
  createOnly: true,
  defaultBand: (spec) => (isReportPartType(spec.preset) ? reportPartBand(spec.preset as ReportPartType) ?? undefined : undefined),
  matches: () => false,
  create(spec, ctx) {
    const type = spec.preset as string;
    const base = (BOX_PRESETS as readonly string[]).includes(type)
      ? buildFrameTemplate(type as (typeof BOX_PRESETS)[number], frameCtx(ctx))
      : buildReportPart(type as ReportPartType, frameCtx(ctx));
    const element = { ...base, uuid: uuid() } as DesignElement;
    for (const part of element.type === "frame" ? (element as FrameElement).elements ?? [] : [element]) {
      if (part.type === "textField") part.fontFamily = ctx.fontName;
    }
    if (has(spec, "texts")) fillPresetTexts(element, spec.texts as string[]);
    // A size given: a box's parts and a table's columns follow it
    const size = Object.fromEntries((["width", "height"] as const).filter((k) => has(spec, k)).map((k) => [k, spec[k]]));
    if (element.type === "frame") boxKind.update(element, size, ctx);
    else if (element.type === "customTable") {
      applyGeometry(element, size);
      fitTableToBox(element as CustomTableElement);
    } else applyGeometry(element, size);
    return element;
  },
  update() {},
  describe: () => ({}),
};
