// Report parts: ready-made pieces of a monthly project report (header banner,
// page footer, section heading, risk legend, sign-off...). Like the box
// templates in framePresets.ts they are plain JasperReports elements: a frame
// holding its parts (text fields, shapes, images), or a single element.

import type { DesignElement, FrameElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import {
  BOX_PART_PROPERTY,
  frame,
  photo,
  releaseBoxPart,
  text,
  tint,
  type FrameTemplateContext,
} from "@/utils/framePresets";
import { applyPaginationSettings, buildPaginationElement } from "@/utils/paginationPresets";
import { buildTablePreset, isTablePresetType, TABLE_PRESET_TYPES, type TablePresetType } from "@/utils/tablePresets";

export const REPORT_PART_COLORS = {
  banner: "#03053A",
  bannerBars: "#A6A6A6",
  rule: "#7F7F7F",
  ink: "#000000",
} as const;

// Traffic-light colours of the risk legend and status dots
export const STATUS_COLORS = [
  { id: "low", color: "#92D050" },
  { id: "moderate", color: "#FFC000" },
  { id: "high", color: "#FF0000" },
] as const;

export const REPORT_PART_TYPES = [
  "partReportHeader",
  "partPageFooter",
  "partSectionHeading",
  "partSubHeading",
  "partNote",
  "partRiskLegend",
  "partStatusDot",
  "partSignOff",
  // Tables of the report, as typed tables (utils/tablePresets.ts)
  ...TABLE_PRESET_TYPES,
] as const;

export type ReportPartType = (typeof REPORT_PART_TYPES)[number];

export function isReportPartType(type: string): type is ReportPartType {
  return (REPORT_PART_TYPES as readonly string[]).includes(type);
}

// The band a part goes to when its tile is clicked; others go to the last clicked band
export function reportPartBand(type: ReportPartType): "pageHeader" | "pageFooter" | null {
  if (type === "partReportHeader") return "pageHeader";
  if (type === "partPageFooter") return "pageFooter";
  return null;
}

// Parts spanning the printable width start at the left margin
export function isFullWidthPart(type: ReportPartType): boolean {
  return ["partReportHeader", "partPageFooter", "partSectionHeading"].includes(type) || isTablePresetType(type);
}

const placeholder = (ctx: FrameTemplateContext, key: string) =>
  ctx.t(`reportParts.placeholder.${key}`);

// A filled shape without an outline, as a part of its box
function shape(
  type: "rectangle" | "ellipse",
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): DesignElement {
  return createElement(type, {
    uuid: crypto.randomUUID(),
    x,
    y,
    width,
    height,
    mode: "Opaque",
    backcolor: color,
    pen: { lineWidth: 0, lineStyle: "Solid", lineColor: color },
    properties: [{ name: BOX_PART_PROPERTY, value: "true" }],
  } as Partial<DesignElement>);
}

function rule(x: number, y: number, width: number, lineWidth: number, color: string): DesignElement {
  return createElement("line", {
    uuid: crypto.randomUUID(),
    x,
    y,
    width,
    height: 1,
    lineDirection: "TopDown",
    lineWidth,
    lineColor: color,
    properties: [{ name: BOX_PART_PROPERTY, value: "true" }],
  } as Partial<DesignElement>);
}

// Dark banner across the page: three grey bars, then three lines of white title
function reportHeader(ctx: FrameTemplateContext): FrameElement {
  const w = ctx.availableWidth;
  const h = 56;
  const textX = 46;
  const line = (y: number, key: string) =>
    text({ x: textX, y, width: w - textX - 10, height: 14, fontSize: 9, isBold: true,
      forecolor: "#FFFFFF", verticalAlignment: "Middle", text: placeholder(ctx, key) });
  return frame(w, h, tint(REPORT_PART_COLORS.banner), [
    shape("rectangle", 0, 11, 36, 5, REPORT_PART_COLORS.bannerBars),
    shape("rectangle", 0, 25, 36, 5, REPORT_PART_COLORS.bannerBars),
    shape("rectangle", 0, 39, 36, 5, REPORT_PART_COLORS.bannerBars),
    line(7, "headerLine1"),
    line(21, "headerLine2"),
    line(35, "headerLine3"),
  ]);
}

// Thin rule, "Page X of N" in the middle, logo on the right
function pageFooter(ctx: FrameTemplateContext): FrameElement {
  const w = ctx.availableWidth;
  const h = 30;
  const logoW = 70;
  const pageNumber = buildPaginationElement("bottomCenter", { fontSize: 7 });
  applyPaginationSettings(pageNumber, { format: "pageXofY", range: "all" });
  Object.assign(pageNumber, {
    x: Math.round((w - pageNumber.width) / 2),
    y: 6,
    height: 14,
    forecolor: REPORT_PART_COLORS.rule,
    properties: [{ name: BOX_PART_PROPERTY, value: "true" }, ...(pageNumber.properties ?? [])],
  });
  return frame(w, h, { box: undefined, mode: "Transparent", backcolor: "#FFFFFF" }, [
    rule(0, 2, w, 0.5, REPORT_PART_COLORS.rule),
    pageNumber,
    photo(w - logoW, 6, logoW, 22),
  ]);
}

// "SECTION 1.   PROJECT DETAILS"
function sectionHeading(ctx: FrameTemplateContext): FrameElement {
  const w = ctx.availableWidth;
  const numberW = 90;
  const heading = (x: number, width: number, key: string) =>
    text({ x, y: 0, width, height: 18, fontSize: 11, isBold: true,
      forecolor: REPORT_PART_COLORS.ink, verticalAlignment: "Middle", text: placeholder(ctx, key) });
  return frame(w, 18, { box: undefined, mode: "Transparent", backcolor: "#FFFFFF" }, [
    heading(0, numberW, "sectionNumber"),
    heading(numberW, w - numberW, "sectionTitle"),
  ]);
}

// A single text element, not a box part
function standaloneText(options: Parameters<typeof text>[0]): DesignElement {
  const element = text(options);
  releaseBoxPart(element);
  return element;
}

// "TOWER A: KEY ACTIVITIES / MILESTONES"
const subHeading = (ctx: FrameTemplateContext) =>
  standaloneText({ x: 0, y: 0, width: 320, height: 14, fontSize: 9, isBold: true, isUnderline: true,
    forecolor: REPORT_PART_COLORS.ink, verticalAlignment: "Middle", text: placeholder(ctx, "subHeading") });

// Small italic line under a table: "*Per QS Financial Report No.21"
const note = (ctx: FrameTemplateContext) =>
  standaloneText({ x: 0, y: 0, width: 320, height: 13, fontSize: 8, isItalic: true, stretch: true,
    forecolor: REPORT_PART_COLORS.ink, text: placeholder(ctx, "note") });

// Green / amber / red dots, each with its name
function riskLegend(ctx: FrameTemplateContext): FrameElement {
  const dot = 12;
  const h = 16;
  const labelWidths = [50, 64, 48];
  const parts: DesignElement[] = [];
  let x = 0;
  STATUS_COLORS.forEach(({ id, color }, i) => {
    parts.push(shape("ellipse", x, (h - dot) / 2, dot, dot, color));
    parts.push(text({ x: x + dot + 4, y: 0, width: labelWidths[i]!, height: h, fontSize: 7,
      forecolor: REPORT_PART_COLORS.ink, verticalAlignment: "Middle",
      text: placeholder(ctx, `${id}Risk`) }));
    x += dot + 4 + labelWidths[i]! + 6;
  });
  return frame(x - 6, h, { box: undefined, mode: "Transparent", backcolor: "#FFFFFF" }, parts);
}

// One traffic-light dot, for a status column; its colour is picked in Basic Properties
function statusDot(): DesignElement {
  const element = shape("ellipse", 0, 0, 18, 18, STATUS_COLORS[0].color);
  releaseBoxPart(element);
  return element;
}

// Signature picture over a thick line, name and role under it, the date on the right
function signOff(ctx: FrameTemplateContext): FrameElement {
  const w = 340;
  const dateX = 210;
  const dateW = w - dateX;
  const label = (x: number, y: number, width: number, key: string, style: { isBold?: boolean; isItalic?: boolean } = {}) =>
    text({ x, y, width, height: 14, fontSize: 9, forecolor: REPORT_PART_COLORS.ink,
      ...style, text: placeholder(ctx, key) });
  return frame(w, 68, { box: undefined, mode: "Transparent", backcolor: "#FFFFFF" }, [
    photo(0, 0, 130, 34),
    label(dateX, 20, dateW, "signOffDate"),
    rule(0, 36, w, 1.5, REPORT_PART_COLORS.ink),
    label(0, 39, 200, "signOffName", { isBold: true }),
    label(0, 53, 200, "signOffRole", { isItalic: true }),
    label(dateX, 39, dateW, "signOffDateLabel"),
  ]);
}

const BUILDERS: Record<ReportPartType, (ctx: FrameTemplateContext) => DesignElement> = {
  partReportHeader: reportHeader,
  partPageFooter: pageFooter,
  partSectionHeading: sectionHeading,
  partSubHeading: subHeading,
  partNote: note,
  partRiskLegend: riskLegend,
  partStatusDot: statusDot,
  partSignOff: signOff,
  ...(Object.fromEntries(
    TABLE_PRESET_TYPES.map((type) => [type, (ctx: FrameTemplateContext) => buildTablePreset(type, ctx)]),
  ) as Record<TablePresetType, (ctx: FrameTemplateContext) => DesignElement>),
};

export function buildReportPart(type: ReportPartType, ctx: FrameTemplateContext): DesignElement {
  return BUILDERS[type](ctx);
}
