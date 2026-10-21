// "Show me how" guides (Help menu): short checklists for common jobs that tick
// themselves off as the user works, read from the report itself. Each step
// says when it is done and what "Show me" points at (the first selector on
// screen). Texts: help.guides.<guide>.steps.<key>Title / <key>Text.
import type { Band, DesignElement, ReportProperties } from "@/types";
import { hasProperty, SECTION_HEADING_PROPERTY } from "@/utils/contentsList";
import { isPagination } from "@/utils/paginationPresets";
import { isSpecialPage, pageKind } from "@/utils/specialPages";
import { isChartComplete, normalizeChartBinding } from "@/utils/chart/chartTypes";
import { SUB_HEADING_PROPERTY } from "@/utils/contentsList";
import { DATE_PROPERTY } from "@/utils/dateElement";
import { findPageBorder, isBoxPart } from "@/utils/framePresets";

export type GuideId =
  // Whole jobs
  | "monthlyReport"
  | "coverPage"
  | "tableOfContents"
  // Basic Elements
  | "text"
  | "sectionHeading"
  | "subHeading"
  | "image"
  | "line"
  | "rectangle"
  | "ellipse"
  | "box"
  | "typedTable"
  | "dataTable"
  | "chart"
  | "barcode"
  // Composite Elements
  | "pageBorder"
  | "pageNumbers"
  | "date"
  // Element Presets
  | "presetBoxes"
  | "presetHeaderFooter"
  | "presetStatus"
  | "presetSignOff"
  | "presetTables";

// The guide list's headings, in the Element Library's order (jobs first)
export type GuideSectionId = "jobs" | "basic" | "composite" | "presets";

// Things done in the designer that the report doesn't record
export type GuideAction = "preview";

export interface GuideContext {
  bands: Band[];
  properties: ReportProperties;
  actions: GuideAction[];
  // The selected element and the page it is on (the box's page for an item in a box)
  selected: DesignElement | null;
  selectedPage: number | null;
  // The selected element's band ("pageHeader", "detail"…)
  selectedBand: string | null;
  // The element being typed in (text, a table opened for typing)
  editing: DesignElement | null;
}

export interface GuideStep {
  key: string;
  done: (ctx: GuideContext) => boolean;
  // Done once seen: something the user only looks at (no trace in the report)
  sticky?: boolean;
  target?: (ctx: GuideContext) => string[];
}

export interface Guide {
  id: GuideId;
  steps: GuideStep[];
}

// Every element with the band it is in and its page (items in a box: the box's page)
function* allElements(bands: Band[]): Generator<{ el: DesignElement; band: Band; page: number }> {
  for (const band of bands) {
    for (const el of band.elements ?? []) {
      const page = el.pageIndex ?? 0;
      yield { el, band, page };
      if (el.type === "frame") {
        for (const child of el.elements ?? []) yield { el: child, band, page };
      }
    }
  }
}

const find = (ctx: GuideContext, test: (el: DesignElement) => boolean) =>
  [...allElements(ctx.bands)].find(({ el }) => test(el))?.el ?? null;

const onPage = (uuid: string | undefined) => (uuid ? [`[data-element-uuid="${uuid}"]`] : []);
const tile = (type: string) => [`.element-item[data-tile="${type}"]`, '[data-help="library"]'];

const PAGE_MENU = ['[data-help="add-page"]', ".more-menu"];
const PREVIEW = ['[data-help="preview"]'];

const hasProject = (ctx: GuideContext) => (ctx.properties.projects?.length ?? 0) > 0;
const hasCover = (ctx: GuideContext) => !!ctx.properties.coverPage;
const coverDesigned = (ctx: GuideContext) =>
  hasCover(ctx) &&
  ctx.bands.some((band) => band.type === "detail" && band.elements.some((el) => (el.pageIndex ?? 0) === 0));
const previewed = (ctx: GuideContext) => ctx.actions.includes("preview");
const dataTable = (ctx: GuideContext) => find(ctx, (el) => el.type === "table");
const chart = (ctx: GuideContext) => find(ctx, (el) => el.type === "chart");
const pageNumber = (ctx: GuideContext) => find(ctx, isPagination);

// A Section Heading on a normal page (the contents only count those)
const hasHeading = (ctx: GuideContext) =>
  [...allElements(ctx.bands)].some(
    ({ el, band, page }) =>
      hasProperty(el, SECTION_HEADING_PROPERTY) && (band.type !== "detail" || !isSpecialPage(ctx.properties, page)),
  );
// The Table of Contents on a contents page
const contentsToc = (ctx: GuideContext) =>
  [...allElements(ctx.bands)].find(
    ({ el, band, page }) =>
      el.type === "contentsList" && band.type === "detail" && pageKind(ctx.properties, page) === "contents",
  )?.el ?? null;

const PROJECT: GuideStep = { key: "project", done: hasProject, target: () => [".hpp-select"] };
const PREVIEW_STEP: GuideStep = { key: "preview", done: previewed, target: () => PREVIEW };
const ADD_COVER: GuideStep = { key: "cover", done: hasCover, target: () => PAGE_MENU };
const COVER_DESIGN: GuideStep = {
  key: "coverDesign",
  done: coverDesigned,
  target: () => ['[data-help="change-design"]', ...PAGE_MENU],
};
const ADD_PAGE_NUMBER: GuideStep = {
  key: "pageNumber",
  done: (ctx) => !!pageNumber(ctx),
  target: () => tile("pageNumber"),
};

// ---- One element each (Show me how, under the library's headings) ----------

type Test = (el: DesignElement, band: Band) => boolean;
const findIn = (ctx: GuideContext, test: Test) =>
  [...allElements(ctx.bands)].find(({ el, band }) => test(el, band))?.el ?? null;

const isHeading = (el: DesignElement) => hasProperty(el, SECTION_HEADING_PROPERTY);
const isSubHeading = (el: DesignElement) => hasProperty(el, SUB_HEADING_PROPERTY);
const isDate = (el: DesignElement) => hasProperty(el, DATE_PROPERTY);
const inHeaderFooter = (band: Band) => band.type === "pageHeader" || band.type === "pageFooter";
// A plain text the user added (not a page number, date, heading or a box's part)
const isPlainText = (el: DesignElement) =>
  el.type === "textField" && !isPagination(el) && !isDate(el) && !isSubHeading(el) && !isBoxPart(el);
// Sign-off: a box with a signature spot and its name / role / date lines
const isSignOff = (el: DesignElement) =>
  el.type === "frame" &&
  (el.elements ?? []).some((child) => child.type === "image") &&
  (el.elements ?? []).filter((child) => child.type === "textField").length >= 3;
// A ready-made box (Number Box, Alert Box…): a box whose items are its parts
const isPresetBox: Test = (el, band) =>
  el.type === "frame" &&
  band.type !== "background" &&
  !inHeaderFooter(band) &&
  !isHeading(el) &&
  !isSignOff(el) &&
  (el.elements ?? []).some(isBoxPart);
const isUserBox: Test = (el, band) => el.type === "frame" && band.type !== "background" && !isHeading(el);

const pageBorder = (ctx: GuideContext) => {
  const at = findPageBorder(ctx.bands);
  return at ? (ctx.bands[at.bandIndex]?.elements[at.elementIndex] ?? null) : null;
};

// "Add it" from its library tile
const addStep = (test: Test, tileType: string): GuideStep => ({
  key: "add",
  done: (ctx) => !!findIn(ctx, test),
  target: () => tile(tileType),
});
// "Open its settings": select it, the panel on the right shows them (only looked at)
const settingsStep = (test: Test): GuideStep => ({
  key: "settings",
  sticky: true,
  done: (ctx) => !!ctx.selected && test(ctx.selected, { type: ctx.selectedBand ?? "detail" } as Band),
  target: (ctx) => onPage(findIn(ctx, test)?.uuid),
});
// "Type in it": double-click it (only looked at)
const typeStep = (test: Test): GuideStep => ({
  key: "type",
  sticky: true,
  done: (ctx) => !!ctx.editing && test(ctx.editing, { type: ctx.selectedBand ?? "detail" } as Band),
  target: (ctx) => onPage(findIn(ctx, test)?.uuid),
});

const elementGuide = (id: GuideId, test: Test, tileType: string, middle: GuideStep[] = []): Guide => ({
  id,
  steps: [addStep(test, tileType), ...middle, PREVIEW_STEP],
});

const ELEMENT_GUIDES: Guide[] = [
  // Basic Elements
  elementGuide("text", isPlainText, "textField", [typeStep(isPlainText), settingsStep(isPlainText)]),
  elementGuide("sectionHeading", isHeading, "partSectionHeading", [settingsStep(isHeading)]),
  elementGuide("subHeading", isSubHeading, "partSubHeading", [typeStep(isSubHeading)]),
  elementGuide("image", (el) => el.type === "image", "image", [
    {
      key: "picture",
      done: (ctx) => !!findIn(ctx, (el) => el.type === "image" && !!el.imageExpression?.trim()),
      target: (ctx) => onPage(findIn(ctx, (el) => el.type === "image")?.uuid),
    },
    settingsStep((el) => el.type === "image"),
  ]),
  elementGuide("line", (el) => el.type === "line", "line", [settingsStep((el) => el.type === "line")]),
  elementGuide("rectangle", (el) => el.type === "rectangle", "rectangle", [
    settingsStep((el) => el.type === "rectangle"),
  ]),
  elementGuide("ellipse", (el) => el.type === "ellipse", "ellipse", [settingsStep((el) => el.type === "ellipse")]),
  elementGuide("box", isUserBox, "frame", [
    {
      key: "fill",
      done: (ctx) =>
        !!findIn(ctx, (el, band) => isUserBox(el, band) && el.type === "frame" && (el.elements?.length ?? 0) > 0),
      target: (ctx) => onPage(findIn(ctx, isUserBox)?.uuid),
    },
    settingsStep(isUserBox),
  ]),
  elementGuide("typedTable", (el) => el.type === "customTable", "table", [
    typeStep((el) => el.type === "customTable"),
  ]),
  elementGuide("barcode", (el) => el.type === "barcode", "barcode", [settingsStep((el) => el.type === "barcode")]),
  // Composite Elements
  {
    id: "pageBorder",
    steps: [
      { key: "add", done: (ctx) => !!pageBorder(ctx), target: () => tile("framePageBorder") },
      {
        key: "settings",
        sticky: true,
        done: (ctx) => !!ctx.selected && ctx.selected.uuid === pageBorder(ctx)?.uuid,
        target: (ctx) => onPage(pageBorder(ctx)?.uuid),
      },
      PREVIEW_STEP,
    ],
  },
  elementGuide("date", isDate, "dateTime", [settingsStep(isDate)]),
  // Element Presets
  elementGuide("presetBoxes", isPresetBox, "frameKpiCard", [typeStep((el) => isBoxPart(el))]),
  elementGuide("presetHeaderFooter", (el, band) => el.type === "frame" && inHeaderFooter(band), "partReportHeader", [
    typeStep((el, band) => el.type === "textField" && inHeaderFooter(band)),
  ]),
  elementGuide("presetStatus", (el) => el.type === "ellipse", "partStatusDot", [
    settingsStep((el) => el.type === "ellipse"),
  ]),
  elementGuide("presetSignOff", isSignOff, "partSignOff", [
    {
      ...typeStep((el) => el.type === "textField"),
      done: (ctx) => ctx.editing?.type === "textField" && !!findIn(ctx, isSignOff),
      target: (ctx) => onPage(findIn(ctx, isSignOff)?.uuid),
    },
  ]),
  elementGuide("presetTables", (el) => el.type === "customTable", "tableKeyValue", [
    typeStep((el) => el.type === "customTable"),
  ]),
];

// Whole jobs, and the guides of the elements they use most
const JOB_GUIDES: Guide[] = [
  {
    id: "monthlyReport",
    steps: [
      ADD_COVER,
      COVER_DESIGN,
      { key: "contents", done: (ctx) => (ctx.properties.contentsPages ?? 0) > 0, target: () => PAGE_MENU },
      { key: "heading", done: hasHeading, target: () => tile("partSectionHeading") },
      ADD_PAGE_NUMBER,
      PREVIEW_STEP,
    ],
  },
  {
    id: "coverPage",
    steps: [
      ADD_COVER,
      COVER_DESIGN,
      {
        key: "coverEdit",
        sticky: true,
        done: (ctx) => hasCover(ctx) && !!ctx.selected && ctx.selectedPage === 0,
        target: () => [".page-sheet-wrapper"],
      },
      PREVIEW_STEP,
    ],
  },
  {
    // Headings first, so the list fills in as soon as it is added
    id: "tableOfContents",
    steps: [
      { key: "headings", done: hasHeading, target: () => tile("partSectionHeading") },
      { key: "contentsPage", done: (ctx) => (ctx.properties.contentsPages ?? 0) > 0, target: () => PAGE_MENU },
      {
        key: "toc",
        done: (ctx) => !!contentsToc(ctx),
        target: () => ['[data-help="add-toc"]', '[data-help="change-design"]', ...tile("partContentsList")],
      },
      {
        key: "listed",
        // Rows taken from the headings carry the heading's key
        done: (ctx) =>
          [...allElements(ctx.bands)].some(
            ({ el }) => el.type === "contentsList" && el.list.entries.some((entry) => !!entry.key),
          ),
        target: (ctx) => onPage(contentsToc(ctx)?.uuid),
      },
      PREVIEW_STEP,
    ],
  },
  {
    id: "pageNumbers",
    steps: [
      ADD_PAGE_NUMBER,
      {
        key: "pageNumberLook",
        sticky: true,
        done: (ctx) => !!ctx.selected && isPagination(ctx.selected),
        target: (ctx) => onPage(pageNumber(ctx)?.uuid),
      },
      PREVIEW_STEP,
    ],
  },
  {
    id: "dataTable",
    steps: [
      PROJECT,
      { key: "table", done: (ctx) => !!dataTable(ctx), target: () => tile("table") },
      {
        key: "tableData",
        done: (ctx) => !!find(ctx, (el) => el.type === "table" && !!el.binding?.sourceId),
        target: (ctx) => onPage(dataTable(ctx)?.uuid),
      },
      PREVIEW_STEP,
    ],
  },
  {
    id: "chart",
    steps: [
      PROJECT,
      { key: "chart", done: (ctx) => !!chart(ctx), target: () => tile("chart") },
      {
        key: "chartData",
        done: (ctx) =>
          !!find(ctx, (el) => el.type === "chart" && isChartComplete(normalizeChartBinding(el.binding))),
        target: (ctx) => onPage(chart(ctx)?.uuid),
      },
      PREVIEW_STEP,
    ],
  },
];

export const GUIDES: Guide[] = [...JOB_GUIDES, ...ELEMENT_GUIDES];

// The list as shown: the jobs, then one guide per element under the Element
// Library's headings, in its order (Table of Contents is a job above)
export const GUIDE_SECTIONS: { id: GuideSectionId; guides: GuideId[] }[] = [
  { id: "jobs", guides: ["monthlyReport", "coverPage", "tableOfContents"] },
  {
    id: "basic",
    guides: [
      "text",
      "sectionHeading",
      "subHeading",
      "image",
      "line",
      "rectangle",
      "ellipse",
      "box",
      "typedTable",
      "dataTable",
      "chart",
      "barcode",
    ],
  },
  { id: "composite", guides: ["pageBorder", "pageNumbers", "date"] },
  { id: "presets", guides: ["presetBoxes", "presetHeaderFooter", "presetStatus", "presetSignOff", "presetTables"] },
];

export const guideById = (id: GuideId) => GUIDES.find((guide) => guide.id === id)!;

/** The first selector of the list that is on screen */
export function findGuideTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return el;
    }
  }
  return null;
}
