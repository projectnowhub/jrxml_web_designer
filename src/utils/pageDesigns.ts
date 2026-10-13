// Ready-made designs for the cover page and the contents pages.
// A cover design is one box (frame) the size of the printable page holding its
// parts (photos, colour panels, logo spot, title texts), so it is moved and
// edited like any box. A contents design is a few ordinary elements: a heading
// and one or two Contents lists. Everything stays editable.

import type { ContentsEntry, DesignElement, FrameElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { BOX_PART_PROPERTY, frame, photo, releaseBoxPart, text, type FrameTemplateContext, type TextOptions } from "./framePresets";
import { buildContentsList } from "./contentsList";
import { setAutoDate } from "./autoDate";

export const DESIGN_COLORS = {
  navy: "#14284B",
  accent: "#F2A900",
  light: "#EEF2F7",
  line: "#D0D5DD",
  muted: "#6B7280",
  ink: "#111827",
  white: "#FFFFFF",
} as const;

export const COVER_DESIGN_TYPES = [
  "coverPhotoPanel",
  "coverFullPhoto",
  "coverMinimal",
  "coverColourBlock",
  "coverProjectCard",
] as const;
export type CoverDesignType = (typeof COVER_DESIGN_TYPES)[number];
export const isCoverDesignType = (type: string): type is CoverDesignType =>
  (COVER_DESIGN_TYPES as readonly string[]).includes(type);

export const CONTENTS_DESIGN_TYPES = ["contentsClassic", "contentsDotted", "contentsNumbered", "contentsTwoColumns"] as const;
export type ContentsDesignType = (typeof CONTENTS_DESIGN_TYPES)[number];
export const isContentsDesignType = (type: string): type is ContentsDesignType =>
  (CONTENTS_DESIGN_TYPES as readonly string[]).includes(type);

const ph = (ctx: FrameTemplateContext, key: string) => ctx.t(`pageDesigns.placeholder.${key}`);

// A filled shape without outline, as a part of its box
function block(x: number, y: number, width: number, height: number, color: string, radius = 0): DesignElement {
  return createElement("rectangle", {
    uuid: crypto.randomUUID(),
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    mode: "Opaque",
    backcolor: color,
    ...(radius ? { radius } : {}),
    pen: { lineWidth: 0, lineStyle: "Solid", lineColor: color },
    properties: [{ name: BOX_PART_PROPERTY, value: "true" }],
  } as Partial<DesignElement>);
}

// Text parts are at least 1.45 x the font size tall: JasperReports leaves out
// text whose first line doesn't fit (Noto Sans SC)
function label(ctx: FrameTemplateContext, key: string, o: Omit<TextOptions, "text" | "height"> & { height?: number }) {
  const element = text({
    ...o,
    x: Math.round(o.x),
    y: Math.round(o.y),
    width: Math.round(o.width),
    height: Math.max(o.height ?? 0, Math.ceil(o.fontSize * 1.45) + 2),
    text: ph(ctx, key),
  });
  // The cover's date is the month the report is made
  if (key === "period") setAutoDate(element, "monthYear");
  return element;
}

const pic = (x: number, y: number, w: number, h: number) => photo(Math.round(x), Math.round(y), Math.round(w), Math.round(h));

function page(ctx: FrameTemplateContext, parts: DesignElement[]): FrameElement {
  return frame(Math.round(ctx.availableWidth), Math.round(ctx.availableHeight), { box: undefined, mode: "Transparent", backcolor: "#FFFFFF" }, parts);
}

// Like the sample report: photos on the left, a navy panel with logo and title
function photoPanel(ctx: FrameTemplateContext): FrameElement {
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const split = W * 0.62;
  const px = split + 22;
  const pw = W - split - 44;
  const white = { forecolor: DESIGN_COLORS.white };
  return page(ctx, [
    pic(0, 0, split, H / 2),
    pic(0, H / 2, split, H / 2),
    block(split, 0, W - split, H, DESIGN_COLORS.navy),
    pic(px, H * 0.28, pw, 54),
    label(ctx, "projectName", { x: px, y: H * 0.6, width: pw, fontSize: 16, isBold: true, ...white }),
    label(ctx, "reportType", { x: px, y: H * 0.7, width: pw, fontSize: 14, isBold: true, ...white }),
    label(ctx, "reportNumber", { x: px, y: H * 0.7 + 22, width: pw, fontSize: 14, isBold: true, ...white }),
    label(ctx, "period", { x: px, y: H * 0.88, width: pw, fontSize: 12, ...white }),
  ]);
}

// One large photo, a dark title band at the bottom
function fullPhoto(ctx: FrameTemplateContext): FrameElement {
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const bandTop = H - 200;
  const white = { forecolor: DESIGN_COLORS.white };
  return page(ctx, [
    pic(0, 0, W, bandTop),
    block(0, bandTop, W, 200, DESIGN_COLORS.navy),
    block(32, bandTop + 32, 64, 4, DESIGN_COLORS.accent),
    label(ctx, "projectName", { x: 32, y: bandTop + 48, width: W - 220, fontSize: 24, isBold: true, ...white }),
    label(ctx, "reportTitle", { x: 32, y: bandTop + 96, width: W - 220, fontSize: 14, ...white }),
    label(ctx, "period", { x: 32, y: bandTop + 130, width: W - 220, fontSize: 12, forecolor: DESIGN_COLORS.accent }),
    pic(W - 172, bandTop + 52, 140, 56),
  ]);
}

// Logo, a large title with an accent line, and who it is for / by at the foot
function minimal(ctx: FrameTemplateContext): FrameElement {
  const P = ctx.inset ?? 0;
  const W = ctx.availableWidth - 2 * P;
  const H = ctx.availableHeight - P;
  const top = H * 0.32;
  return page(ctx, [
    pic(P, P, 150, 60),
    label(ctx, "reportTitle", { x: P, y: top, width: W, fontSize: 12, isBold: true, forecolor: DESIGN_COLORS.accent }),
    label(ctx, "projectName", { x: P, y: top + 26, width: W, fontSize: 30, isBold: true, forecolor: DESIGN_COLORS.navy }),
    block(P, top + 86, 80, 4, DESIGN_COLORS.accent),
    label(ctx, "period", { x: P, y: top + 104, width: W, fontSize: 14, forecolor: DESIGN_COLORS.muted }),
    block(P, H - 78, W, 1, DESIGN_COLORS.line),
    label(ctx, "preparedFor", { x: P, y: H - 64, width: W, fontSize: 10, forecolor: DESIGN_COLORS.ink }),
    label(ctx, "preparedBy", { x: P, y: H - 40, width: W, fontSize: 10, forecolor: DESIGN_COLORS.ink }),
  ]);
}

// A navy top half with the title, a photo below, project details at the foot
function colourBlock(ctx: FrameTemplateContext): FrameElement {
  const P = ctx.inset ?? 0;
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const half = H * 0.48;
  const white = { forecolor: DESIGN_COLORS.white };
  return page(ctx, [
    block(0, 0, W, half, DESIGN_COLORS.navy),
    pic(W - 162, 30, 132, 52),
    label(ctx, "reportTitle", { x: 32, y: half * 0.5, width: W - 64, fontSize: 13, isBold: true, forecolor: DESIGN_COLORS.accent }),
    label(ctx, "projectName", { x: 32, y: half * 0.5 + 26, width: W - 64, fontSize: 28, isBold: true, ...white }),
    label(ctx, "period", { x: 32, y: half * 0.5 + 78, width: W - 64, fontSize: 13, ...white }),
    pic(0, half, W, H * 0.4),
    label(ctx, "client", { x: P, y: H - P - 64, width: Math.floor(W / 2) - P, fontSize: 10, forecolor: DESIGN_COLORS.ink }),
    label(ctx, "location", { x: Math.floor(W / 2), y: H - P - 64, width: W - Math.floor(W / 2) - P, fontSize: 10, forecolor: DESIGN_COLORS.ink, textAlignment: "Right" }),
    label(ctx, "preparedBy", { x: P, y: H - P - 40, width: W - 2 * P, fontSize: 10, forecolor: DESIGN_COLORS.muted }),
  ]);
}

// A soft page with a centred rounded card holding the title and key facts
function projectCard(ctx: FrameTemplateContext): FrameElement {
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const cx = W * 0.1;
  const cw = W * 0.8;
  const cy = H * 0.2;
  const center = { textAlignment: "Center" as const };
  const card = createElement("rectangle", {
    uuid: crypto.randomUUID(),
    x: Math.round(cx),
    y: Math.round(cy),
    width: Math.round(cw),
    height: Math.round(H * 0.56),
    mode: "Opaque",
    backcolor: DESIGN_COLORS.white,
    radius: 14,
    pen: { lineWidth: 1, lineStyle: "Solid", lineColor: DESIGN_COLORS.line },
    properties: [{ name: BOX_PART_PROPERTY, value: "true" }],
  } as Partial<DesignElement>);
  return page(ctx, [
    block(0, 0, W, H, DESIGN_COLORS.light),
    card,
    pic(W / 2 - 70, cy + 32, 140, 56),
    label(ctx, "projectName", { x: cx + 24, y: cy + 120, width: cw - 48, fontSize: 24, isBold: true, forecolor: DESIGN_COLORS.navy, ...center }),
    label(ctx, "reportTitle", { x: cx + 24, y: cy + 166, width: cw - 48, fontSize: 13, forecolor: DESIGN_COLORS.muted, ...center }),
    block(W / 2 - 30, cy + 198, 60, 4, DESIGN_COLORS.accent),
    label(ctx, "period", { x: cx + 24, y: cy + 214, width: cw - 48, fontSize: 13, forecolor: DESIGN_COLORS.ink, ...center }),
    label(ctx, "client", { x: cx + 24, y: cy + 270, width: cw - 48, fontSize: 10, forecolor: DESIGN_COLORS.ink, ...center }),
    label(ctx, "location", { x: cx + 24, y: cy + 290, width: cw - 48, fontSize: 10, forecolor: DESIGN_COLORS.ink, ...center }),
    label(ctx, "contractSum", { x: cx + 24, y: cy + 310, width: cw - 48, fontSize: 10, forecolor: DESIGN_COLORS.ink, ...center }),
  ]);
}

const COVER_BUILDERS: Record<CoverDesignType, (ctx: FrameTemplateContext) => FrameElement> = {
  coverPhotoPanel: photoPanel,
  coverFullPhoto: fullPhoto,
  coverMinimal: minimal,
  coverColourBlock: colourBlock,
  coverProjectCard: projectCard,
};

export function buildCoverDesign(type: CoverDesignType, ctx: FrameTemplateContext): FrameElement {
  return COVER_BUILDERS[type](ctx);
}

// ---------------------------------------------------------------------------
// Contents designs: ordinary elements with their own ids, placed on the page

const own = (el: DesignElement): DesignElement => {
  releaseBoxPart(el);
  return { ...el, uuid: crypto.randomUUID() };
};

const heading = (ctx: FrameTemplateContext, key: string, o: Omit<TextOptions, "text" | "height">) => own(label(ctx, key, o));

function sampleEntries(ctx: FrameTemplateContext, numbers: string[]): ContentsEntry[] {
  return ["sample1", "sample2", "sample3"].map((key, i) => ({
    number: numbers[i] ?? "",
    title: ph(ctx, key),
    page: String(i + 3),
    level: 0,
  }));
}

function placedList(x: number, y: number, width: number, entries: ContentsEntry[], patch: Parameters<typeof buildContentsList>[2]) {
  return { ...buildContentsList(width, entries, patch), uuid: crypto.randomUUID(), x: Math.round(x), y: Math.round(y) };
}

const CONTENTS_BUILDERS: Record<ContentsDesignType, (ctx: FrameTemplateContext) => DesignElement[]> = {
  // Like the sample report: SECTION n. / TITLE / page
  contentsClassic: (ctx) => {
    const W = ctx.availableWidth;
    const sections = ["1", "2", "3"].map((n) => ctx.t("pageDesigns.placeholder.sectionN", { n }));
    return [
      heading(ctx, "tableOfContents", { x: 0, y: 40, width: W, fontSize: 14, isBold: true, forecolor: DESIGN_COLORS.ink, textAlignment: "Center" }),
      placedList(20, 90, W - 40, sampleEntries(ctx, sections), { numberWidth: 110, leader: false, rowHeight: 28, color: DESIGN_COLORS.ink, sectionStyle: "word" }),
    ];
  },
  // A large heading with an accent line, titles with dotted leaders
  contentsDotted: (ctx) => {
    const W = ctx.availableWidth;
    const line = own(block((W - 64) / 2, 78, 64, 4, DESIGN_COLORS.accent));
    return [
      heading(ctx, "contents", { x: 0, y: 30, width: W, fontSize: 24, isBold: true, forecolor: DESIGN_COLORS.navy, textAlignment: "Center" }),
      line,
      placedList(W * 0.06, 110, W * 0.88, sampleEntries(ctx, ["1", "2", "3"]), { numberWidth: 34, leader: true, rowHeight: 26, color: DESIGN_COLORS.ink, sectionStyle: "1." }),
    ];
  },
  // Big coloured number boxes
  contentsNumbered: (ctx) => {
    const W = ctx.availableWidth;
    return [
      heading(ctx, "contents", { x: 0, y: 30, width: W, fontSize: 24, isBold: true, forecolor: DESIGN_COLORS.navy, textAlignment: "Center" }),
      own(block((W - 64) / 2, 78, 64, 4, DESIGN_COLORS.accent)),
      placedList(W * 0.08, 104, W * 0.84, sampleEntries(ctx, ["01", "02", "03"]), {
        numberWidth: 60,
        leader: false,
        sectionStyle: "01",
        rowHeight: 36,
        fontSize: 12,
        numberFill: DESIGN_COLORS.navy,
        numberColor: DESIGN_COLORS.white,
        color: DESIGN_COLORS.ink,
      }),
    ];
  },
  // Two columns side by side: the right one carries on the left one
  contentsTwoColumns: (ctx) => {
    const W = ctx.availableWidth;
    // Whole pixels, the right column ending exactly at the page edge
    const colW = Math.floor((W - 24) / 2);
    const left = placedList(0, 100, colW, sampleEntries(ctx, ["1", "2", "3"]), { numberWidth: 30, leader: true, rowHeight: 24, color: DESIGN_COLORS.ink, sectionStyle: "1." });
    const right = placedList(W - colW, 100, colW, [], { numberWidth: 30, leader: true, rowHeight: 24, color: DESIGN_COLORS.ink, sectionStyle: "1.", continues: left.uuid });
    return [
      heading(ctx, "contents", { x: 0, y: 30, width: W, fontSize: 24, isBold: true, forecolor: DESIGN_COLORS.navy, textAlignment: "Center" }),
      own(block((W - 64) / 2, 78, 64, 4, DESIGN_COLORS.accent)),
      left,
      right,
    ];
  },
};

export function buildContentsDesign(type: ContentsDesignType, ctx: FrameTemplateContext): DesignElement[] {
  return CONTENTS_BUILDERS[type](ctx);
}
