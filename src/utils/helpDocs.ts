// The full help (Help panel → This item / All elements): one page per element
// and for the toolbar, page settings and pages; the explanation of every
// settings card in the Properties panel (the (i) next to its title); the
// toolbar tools' hover cards. Texts in the locale files:
//   helpDocs.pages.<page>.title / what / when / add, work[] and good[] (lists)
//   helpDocs.settings.<setting>.title / text (/ example)
//   helpDocs.tools.<tool>.title / text
// A new element or settings card needs its page or setting here and its texts
// (see CLAUDE.md "Help must follow the elements").
import type { DesignElement } from "@/types";
import type { GuideId } from "@/utils/helpGuides";
import { createElement } from "@/components/elements/ElementRegistry";
import { buildFrameTemplate, type FrameTemplateContext } from "@/utils/framePresets";
import { buildReportPart } from "@/utils/reportParts";
import { buildTablePreset } from "@/utils/tablePresets";
import { buildPaginationElement, isPagination } from "@/utils/paginationPresets";
import { buildDateElement, isDateElement } from "@/utils/dateElement";
import { buildLocationElement, isLocationElement, isLocationPart } from "@/utils/location/locationElement";
import { buildBarcodeElement } from "@/utils/barcode/barcodeTypes";
import { buildChartElement } from "@/utils/chart/chartElement";
import { buildCustomTable } from "@/utils/customTable";
import { buildContentsList, hasProperty, SECTION_HEADING_PROPERTY, SUB_HEADING_PROPERTY } from "@/utils/contentsList";
import { sampleEntries } from "@/utils/pageDesigns";

// Settings cards, by what they set (shared ones are written once)
export type SettingId =
  | "reportSections"
  | "templatePaper"
  | "templateMargins"
  | "templateFont"
  | "templateBands"
  | "tableContent"
  | "positionSize"
  | "picture"
  | "imageShape"
  | "rotation"
  | "statusColor"
  | "lineOrientation"
  | "textContent"
  | "outline"
  | "sideBorders"
  | "innerSpace"
  | "lineSettings"
  | "textSettings"
  | "background"
  | "boxStyle"
  | "headingNumbers"
  | "pnLook"
  | "pnPages"
  | "pnYourPages"
  | "dateWhich"
  | "dateLook"
  | "dateBefore"
  | "locationPlace"
  | "locationMap"
  | "locationLayout"
  | "locationLines"
  | "chartType"
  | "chartData"
  | "chartTitle"
  | "chartColors"
  | "chartOwnColors"
  | "barcodeType"
  | "barcodeValue"
  | "tableData"
  | "tableLook"
  | "tableRowSizes"
  | "tableCustomize"
  | "tableCells"
  | "tableHighlights"
  | "typedGrid"
  | "typedCells"
  | "tocDesign"
  | "tocRowsFrom"
  | "tocRows"
  | "tocPlace"
  | "tocLook"
  | "tocColours";

export type DocGroup = "start" | "basic" | "presets" | "composite";

export type DocPageId =
  | "toolbar"
  | "templateSettings"
  | "pageSettings"
  | "text"
  | "sectionHeading"
  | "subHeading"
  | "image"
  | "line"
  | "rectangle"
  | "ellipse"
  | "box"
  | "table"
  | "chart"
  | "tableOfContents"
  | "barcode"
  | "presetBoxes"
  | "presetHeaderFooter"
  | "presetStatus"
  | "presetSignOff"
  | "presetTables"
  | "pageBorder"
  | "pageNumber"
  | "date"
  | "location";

export interface DocPage {
  id: DocPageId;
  group: DocGroup;
  // The library tile it is about (its icon in the list)
  tile?: string;
  settings: SettingId[];
  guides?: GuideId[];
  // What the element looks like: built as the library builds it, drawn by
  // the canvas's own components
  sample?: (ctx: FrameTemplateContext) => DesignElement[];
}

// Size the samples are built at (then scaled to the panel)
export const SAMPLE_WIDTH = 360;

const sampleText = (text: string, overrides: Partial<DesignElement> = {}) =>
  createElement("textField", {
    width: 240,
    height: 24,
    fontSize: 14,
    markup: "none",
    expression: `"${text}"`,
    ...overrides,
  } as Partial<DesignElement>);

export const DOC_PAGES: DocPage[] = [
  { id: "toolbar", group: "start", settings: [] },
  {
    id: "templateSettings",
    group: "start",
    settings: ["templatePaper", "templateMargins", "templateFont", "templateBands", "reportSections"],
  },
  { id: "pageSettings", group: "start", settings: [] },
  {
    id: "text",
    group: "basic",
    tile: "textField",
    settings: ["positionSize", "textContent", "rotation", "textSettings", "outline", "sideBorders", "innerSpace", "background"],
    guides: ["text"],
    sample: (ctx) => [sampleText(ctx.t("helpDocs.samples.text"))],
  },
  {
    id: "sectionHeading",
    group: "basic",
    tile: "partSectionHeading",
    settings: ["positionSize", "headingNumbers", "boxStyle", "textSettings"],
    guides: ["sectionHeading", "tableOfContents", "monthlyReport"],
    sample: (ctx) => [buildReportPart("partSectionHeading", ctx)],
  },
  {
    id: "subHeading",
    group: "basic",
    tile: "partSubHeading",
    settings: ["positionSize", "textContent", "textSettings"],
    guides: ["subHeading", "tableOfContents"],
    sample: (ctx) => [buildReportPart("partSubHeading", ctx)],
  },
  {
    id: "image",
    group: "basic",
    tile: "image",
    settings: ["positionSize", "picture", "imageShape", "rotation", "outline"],
    guides: ["image"],
    sample: () => [createElement("image", { width: 160, height: 100 } as Partial<DesignElement>)],
  },
  {
    id: "line",
    group: "basic",
    tile: "line",
    settings: ["positionSize", "lineOrientation", "lineSettings"],
    guides: ["line"],
    sample: () => [createElement("line", { width: 240, height: 1 } as Partial<DesignElement>)],
  },
  {
    id: "rectangle",
    group: "basic",
    tile: "rectangle",
    settings: ["positionSize", "outline", "background"],
    guides: ["rectangle"],
    sample: () => [createElement("rectangle", { width: 200, height: 80 } as Partial<DesignElement>)],
  },
  {
    id: "ellipse",
    group: "basic",
    tile: "ellipse",
    settings: ["positionSize", "statusColor", "outline", "background"],
    guides: ["ellipse"],
    sample: () => [createElement("ellipse", { width: 80, height: 80 } as Partial<DesignElement>)],
  },
  {
    id: "box",
    group: "basic",
    tile: "frame",
    settings: ["positionSize", "boxStyle", "sideBorders", "background"],
    guides: ["box"],
    sample: (ctx) => [buildFrameTemplate("frameTitledSection", ctx)],
  },
  {
    id: "table",
    group: "basic",
    tile: "table",
    settings: [
      "tableContent",
      "positionSize",
      "tableData",
      "tableLook",
      "tableCells",
      "tableHighlights",
      "tableRowSizes",
      "tableCustomize",
      "typedGrid",
      "typedCells",
    ],
    guides: ["typedTable", "dataTable"],
    sample: (ctx) => [
      createElement("customTable", {
        width: 300,
        height: 72,
        table: buildCustomTable(
          300,
          [ctx.t("helpDocs.samples.item"), ctx.t("helpDocs.samples.status"), ctx.t("helpDocs.samples.amount")],
          2,
        ),
      } as Partial<DesignElement>),
    ],
  },
  {
    id: "chart",
    group: "basic",
    tile: "chart",
    settings: ["positionSize", "chartType", "chartData", "chartTitle", "chartColors", "chartOwnColors"],
    guides: ["chart"],
    sample: () => [{ ...buildChartElement(), uuid: crypto.randomUUID() } as DesignElement],
  },
  {
    id: "tableOfContents",
    group: "basic",
    tile: "partContentsList",
    settings: ["tocDesign", "tocRowsFrom", "tocRows", "tocPlace", "tocLook", "tocColours"],
    guides: ["tableOfContents", "monthlyReport"],
    // Typed sample rows: an automatic list would wait for headings
    sample: (ctx) => [
      {
        ...buildContentsList(300, sampleEntries(ctx, ["1."]).slice(0, 5), { follow: false, autoNumber: false }),
        uuid: crypto.randomUUID(),
      },
    ],
  },
  {
    id: "barcode",
    group: "basic",
    tile: "barcode",
    settings: ["positionSize", "barcodeType", "barcodeValue", "rotation"],
    guides: ["barcode"],
    sample: () => [{ ...buildBarcodeElement("Code128"), uuid: crypto.randomUUID() } as DesignElement],
  },
  {
    id: "presetBoxes",
    group: "presets",
    tile: "frameKpiCard",
    settings: ["positionSize", "boxStyle", "background", "textSettings"],
    guides: ["presetBoxes"],
    sample: (ctx) => [buildFrameTemplate("frameKpiCard", ctx)],
  },
  {
    id: "presetHeaderFooter",
    group: "presets",
    tile: "partReportHeader",
    settings: ["positionSize", "boxStyle", "textSettings"],
    guides: ["presetHeaderFooter"],
    sample: (ctx) => [buildReportPart("partReportHeader", ctx)],
  },
  {
    id: "presetStatus",
    group: "presets",
    tile: "partRiskLegend",
    settings: ["statusColor", "positionSize"],
    guides: ["presetStatus"],
    sample: (ctx) => [buildReportPart("partRiskLegend", ctx)],
  },
  {
    id: "presetSignOff",
    group: "presets",
    tile: "partSignOff",
    settings: ["positionSize", "textSettings", "picture"],
    guides: ["presetSignOff"],
    sample: (ctx) => [buildReportPart("partSignOff", ctx)],
  },
  {
    id: "presetTables",
    group: "presets",
    tile: "tableKeyValue",
    settings: ["typedGrid", "typedCells", "tableLook", "tableCustomize"],
    guides: ["presetTables"],
    sample: (ctx) => [buildTablePreset("tableKeyValue", ctx)],
  },
  {
    id: "pageBorder",
    group: "composite",
    tile: "framePageBorder",
    settings: ["boxStyle"],
    guides: ["pageBorder"],
    sample: (ctx) => [buildFrameTemplate("framePageBorder", { ...ctx, availableHeight: 200 })],
  },
  {
    id: "pageNumber",
    group: "composite",
    tile: "pageNumber",
    settings: ["pnLook", "pnPages", "pnYourPages", "textSettings"],
    guides: ["pageNumbers"],
    sample: () => [buildPaginationElement("bottomCenter")],
  },
  {
    id: "date",
    group: "composite",
    tile: "dateTime",
    settings: ["dateWhich", "dateLook", "dateBefore", "textSettings"],
    guides: ["date"],
    sample: () => [buildDateElement()],
  },
  {
    id: "location",
    group: "composite",
    tile: "location",
    settings: ["locationPlace", "locationMap", "locationLayout", "locationLines", "boxStyle"],
    guides: ["location"],
    sample: () => [
      buildLocationElement(
        {
          country: "Malaysia",
          state: "Wilayah Persekutuan Kuala Lumpur",
          city: "Kuala Lumpur",
          postcode: "50470",
          address: "Jalan Stesen Sentral 5, KL Sentral",
          latitude: "3.134",
          longitude: "101.6865",
        },
        { layout: "mapBeside" },
      ),
    ],
  },
];

export const docPageById = (id: DocPageId) => DOC_PAGES.find((page) => page.id === id)!;

/** The help page for an element; `bandType` is its band's, `inBox` when it is an item in a box */
export function docPageFor(element: DesignElement, bandType: string | undefined, inBox: boolean): DocPageId {
  if (isPagination(element)) return "pageNumber";
  if (isDateElement(element)) return "date";
  if (isLocationElement(element) || isLocationPart(element)) return "location";
  if (element.type === "frame" && bandType === "background" && !inBox) return "pageBorder";
  if (hasProperty(element, SECTION_HEADING_PROPERTY)) return "sectionHeading";
  if (hasProperty(element, SUB_HEADING_PROPERTY)) return "subHeading";
  switch (element.type) {
    case "textField":
      return "text";
    case "frame":
      return "box";
    case "customTable":
    case "table":
      return "table";
    case "contentsList":
      return "tableOfContents";
    default:
      return element.type as DocPageId;
  }
}

// The header's tools, in the order they appear (hover cards and the Toolbar page)
export type ToolId =
  | "projects"
  | "reportName"
  | "file"
  | "undo"
  | "redo"
  | "addPage"
  | "delete"
  | "copy"
  | "paste"
  | "zoom"
  | "bottomPanel"
  | "snap"
  | "help"
  | "download"
  | "preview";

// The key a shortcut shows: "Mod" is Ctrl, or ⌘ on a Mac
const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const keyLabel = (key: string) => (key === "Mod" ? (IS_MAC ? "⌘" : "Ctrl") : key);

// `keys`: its shortcuts ("Mod" = Ctrl, or ⌘ on a Mac); `parts`: switches
// explained one by one (helpDocs.tools.<tool>.parts.<part>)
export const TOOLS: { id: ToolId; keys?: string[][]; parts?: string[] }[] = [
  { id: "projects" },
  { id: "reportName" },
  { id: "file", keys: [["Alt", "N"], ["Mod", "O"], ["Mod", "S"]] },
  { id: "undo", keys: [["Mod", "Z"]] },
  { id: "redo", keys: [["Mod", "Y"]] },
  { id: "addPage" },
  { id: "copy", keys: [["Mod", "C"]] },
  { id: "paste", keys: [["Mod", "V"]] },
  { id: "delete", keys: [["Delete"], ["Backspace"]] },
  { id: "zoom", keys: [["Mod", "+"], ["Mod", "-"], ["Mod", "0"]] },
  { id: "bottomPanel", keys: [["Mod", "B"]] },
  { id: "snap", parts: ["grid", "alignment", "showGrid"] },
  { id: "help" },
  { id: "download" },
  { id: "preview" },
];
