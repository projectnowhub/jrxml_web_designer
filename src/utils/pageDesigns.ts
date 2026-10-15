// Ready-made designs for the cover page and the contents pages.
// A cover design is one box (frame) the size of the printable page holding its
// parts (photos, colour panels, logo spot, title texts), so it is moved and
// edited like any box. A contents design is a few ordinary elements: a heading
// and one or two Contents lists. Everything stays editable.

import type { Band, ContentsEntry, DesignElement, FrameElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { frame, isBoxPart, photo, releaseBoxPart, text, type FrameTemplateContext, type TextOptions } from "./framePresets";
import { buildContentsList } from "./contentsList";

export const DESIGN_COLORS = {
  navy: "#14284B",
  accent: "#F2A900",
  light: "#EEF2F7",
  line: "#D0D5DD",
  muted: "#6B7280",
  ink: "#111827",
  white: "#FFFFFF",
  burgundy: "#6B1F2A",
  cream: "#FBF8F1",
  gold: "#B8902F",
  paleGold: "#F3EAD3",
  slate: "#F4F6FA",
} as const;

export const COVER_DESIGN_TYPES = [
  "coverClassic",
  "coverPhotoPanel",
  "coverFullPhoto",
  "coverMinimal",
  "coverColourBlock",
  "coverProjectCard",
  "coverOfficial",
  "coverBand",
  "coverStripe",
  "coverFramed",
  "coverPhotoStrip",
] as const;
export type CoverDesignType = (typeof COVER_DESIGN_TYPES)[number];
export const isCoverDesignType = (type: string): type is CoverDesignType =>
  (COVER_DESIGN_TYPES as readonly string[]).includes(type);

export const CONTENTS_DESIGN_TYPES = [
  "contentsPlain",
  "contentsRegal",
  "contentsHeritage",
  "contentsNavyCrown",
  "contentsGoldCorners",
  "contentsTwoColumns",
  "contentsLedger",
  "contentsCard",
  "contentsElegant",
  "contentsStatesman",
  "contentsBurgundy",
] as const;
export type ContentsDesignType = (typeof CONTENTS_DESIGN_TYPES)[number];
export const isContentsDesignType = (type: string): type is ContentsDesignType =>
  (CONTENTS_DESIGN_TYPES as readonly string[]).includes(type);

const ph = (ctx: FrameTemplateContext, key: string) => ctx.t(`pageDesigns.placeholder.${key}`);

// A filled shape without outline
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
  } as Partial<DesignElement>);
}

// Text parts are at least 1.45 x the font size tall: JasperReports leaves out
// text whose first line doesn't fit (Noto Sans SC)
function label(ctx: FrameTemplateContext, key: string, o: Omit<TextOptions, "text" | "height"> & { height?: number }): DesignElement {
  const isPeriod = key === "period";
  const defaultText = isPeriod
    ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date())
    : ph(ctx, key);
  const el = text({
    ...o,
    x: Math.round(o.x),
    y: Math.round(o.y),
    width: Math.round(o.width),
    height: Math.max(o.height ?? 0, Math.ceil(o.fontSize * 1.45) + 2),
    text: defaultText,
  });
  releaseBoxPart(el);
  return el;
}

// An outline without fill (frame lines on formal covers)
function outline(x: number, y: number, width: number, height: number, color: string, lineWidth: number): DesignElement {
  return createElement("rectangle", {
    uuid: crypto.randomUUID(),
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    mode: "Transparent",
    pen: { lineWidth, lineStyle: "Solid", lineColor: color },
  } as Partial<DesignElement>);
}

const pic = (x: number, y: number, w: number, h: number): DesignElement => {
  const el = photo(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  releaseBoxPart(el);
  return el;
};

// A box made by a design (a coloured panel holding its texts and photos); kept
// as a box when a report is opened (old cover boxes are unwrapped)
export const DESIGN_BOX_PROPERTY = "com.cdp.design.box";

const inside = (e: DesignElement, p: DesignElement) =>
  e.x >= p.x - 0.5 && e.y >= p.y - 0.5 && e.x + e.width <= p.x + p.width + 0.5 && e.y + e.height <= p.y + p.height + 0.5;

// Rule for designs: a coloured panel with things on it is a box (frame) holding
// them, so clicking the panel never hides its texts and they move with it. A
// rectangle is only used when nothing sits on it (bars, rules, outlines, and
// page-wide backgrounds). Each item goes into the smallest panel around it;
// Contents lists never go in a box; boxes don't nest (a panel that holds
// things stays on its own, drawn above the larger panel).
export function boxUp(parts: DesignElement[], pageWidth: number, pageHeight: number): DesignElement[] {
  const isPanel = (e: DesignElement) =>
    e.type === "rectangle" && e.mode === "Opaque" && e.width * e.height < pageWidth * pageHeight * 0.9;
  const owner = new Map<DesignElement, DesignElement>();
  parts.forEach((e, i) => {
    if (e.type === "contentsList") return;
    let best: DesignElement | undefined;
    for (const p of parts.slice(0, i)) {
      if (isPanel(p) && inside(e, p) && (!best || p.width * p.height < best.width * best.height)) best = p;
    }
    if (best) owner.set(e, best);
  });
  const holders = new Set(owner.values());
  // A panel holding things stays on its own (no box inside a box)
  for (const h of holders) owner.delete(h);
  const used = new Set([...owner.values()]);
  const out: DesignElement[] = [];
  for (const e of parts) {
    if (owner.has(e)) continue;
    if (!used.has(e)) {
      out.push(e);
      continue;
    }
    const r = e as DesignElement & { radius?: number; pen?: { lineWidth: number; lineStyle: string; lineColor: string } };
    const children = parts
      .filter((c) => owner.get(c) === e)
      .map((c) => ({ ...c, x: Math.round(c.x - e.x), y: Math.round(c.y - e.y) }) as DesignElement);
    const box: FrameElement = {
      ...frame(e.width, e.height, { mode: "Opaque", backcolor: e.backcolor ?? DESIGN_COLORS.white, box: r.pen?.lineWidth ? { pen: r.pen as never } : undefined }, children),
      uuid: crypto.randomUUID(),
      x: e.x,
      y: e.y,
      ...(r.radius ? { radius: r.radius } : {}),
      properties: [{ name: DESIGN_BOX_PROPERTY, value: "true" }],
    };
    out.push(box);
  }
  return out;
}

// Cover page elements are placed on the page so every title, photo and shape
// can be moved, resized and edited; coloured panels hold what sits on them
function page(ctx: FrameTemplateContext, parts: DesignElement[]): DesignElement[] {
  for (const part of parts) releaseBoxPart(part);
  return boxUp(parts, ctx.availableWidth, ctx.availableHeight);
}

// Just the words, in black: report title, a thin rule, project and date in the
// middle, who it is for / by at the foot; no colours, no pictures
function classic(ctx: FrameTemplateContext): DesignElement[] {
  const P = Math.max(ctx.inset ?? 0, 24);
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const tw = W - 2 * P;
  const black = "#000000";
  const center = { textAlignment: "Center" as const };
  const top = Math.round(H * 0.34);
  return page(ctx, [
    label(ctx, "reportTitle", { x: P, y: top, width: tw, fontSize: 26, isBold: true, forecolor: black, ...center }),
    block(W / 2 - 60, top + 52, 120, 1, black),
    label(ctx, "projectName", { x: P, y: top + 70, width: tw, fontSize: 16, forecolor: black, ...center }),
    label(ctx, "period", { x: P, y: top + 100, width: tw, fontSize: 12, forecolor: black, ...center }),
    label(ctx, "preparedFor", { x: P, y: H - P - 64, width: tw, fontSize: 10, forecolor: black, ...center }),
    label(ctx, "preparedBy", { x: P, y: H - P - 42, width: tw, fontSize: 10, forecolor: black, ...center }),
  ]);
}

// Like the sample report: photos on the left, a navy panel with logo and title
function photoPanel(ctx: FrameTemplateContext): DesignElement[] {
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
function fullPhoto(ctx: FrameTemplateContext): DesignElement[] {
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
function minimal(ctx: FrameTemplateContext): DesignElement[] {
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
function colourBlock(ctx: FrameTemplateContext): DesignElement[] {
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
function projectCard(ctx: FrameTemplateContext): DesignElement[] {
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

// ---- Formal covers for government reports ----

// Centred crest (logo), ministry, title, a gold rule; navy and gold bars top and bottom
function official(ctx: FrameTemplateContext): DesignElement[] {
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const P = Math.max(ctx.inset ?? 0, 24);
  const tw = W - 2 * P;
  const center = { textAlignment: "Center" as const };
  return page(ctx, [
    block(0, 0, W, 10, DESIGN_COLORS.navy),
    block(0, 10, W, 3, DESIGN_COLORS.accent),
    pic(W / 2 - 50, H * 0.1, 100, 100),
    label(ctx, "ministry", { x: P, y: H * 0.1 + 116, width: tw, fontSize: 12, isBold: true, forecolor: DESIGN_COLORS.navy, ...center }),
    label(ctx, "agency", { x: P, y: H * 0.1 + 136, width: tw, fontSize: 10, forecolor: DESIGN_COLORS.muted, ...center }),
    label(ctx, "reportTitle", { x: P, y: H * 0.42, width: tw, fontSize: 24, isBold: true, forecolor: DESIGN_COLORS.navy, ...center }),
    block(W / 2 - 40, H * 0.42 + 48, 80, 3, DESIGN_COLORS.accent),
    label(ctx, "projectName", { x: P, y: H * 0.42 + 64, width: tw, fontSize: 14, isBold: true, forecolor: DESIGN_COLORS.ink, ...center }),
    label(ctx, "period", { x: P, y: H * 0.42 + 90, width: tw, fontSize: 12, forecolor: DESIGN_COLORS.muted, ...center }),
    label(ctx, "preparedBy", { x: P, y: H - 74, width: tw, fontSize: 10, forecolor: DESIGN_COLORS.ink, ...center }),
    label(ctx, "documentNo", { x: P, y: H - 54, width: tw, fontSize: 9, forecolor: DESIGN_COLORS.muted, ...center }),
    block(0, H - 13, W, 3, DESIGN_COLORS.accent),
    block(0, H - 10, W, 10, DESIGN_COLORS.navy),
  ]);
}

// Logo and ministry on white, a navy band across the middle with the title, details below
function band(ctx: FrameTemplateContext): DesignElement[] {
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const P = Math.max(ctx.inset ?? 0, 28);
  const tw = W - 2 * P;
  const top = Math.round(H * 0.3);
  const bandH = Math.round(H * 0.3);
  const white = { forecolor: DESIGN_COLORS.white };
  return page(ctx, [
    pic(P, P, 70, 70),
    label(ctx, "ministry", { x: P + 84, y: P + 14, width: tw - 84, fontSize: 12, isBold: true, forecolor: DESIGN_COLORS.navy }),
    label(ctx, "agency", { x: P + 84, y: P + 34, width: tw - 84, fontSize: 10, forecolor: DESIGN_COLORS.muted }),
    block(0, top, W, bandH, DESIGN_COLORS.navy),
    block(0, top + bandH, W, 4, DESIGN_COLORS.accent),
    label(ctx, "reportType", { x: P, y: top + bandH * 0.22, width: tw, fontSize: 12, isBold: true, forecolor: DESIGN_COLORS.accent }),
    label(ctx, "reportTitle", { x: P, y: top + bandH * 0.22 + 24, width: tw, fontSize: 26, isBold: true, ...white }),
    label(ctx, "projectName", { x: P, y: top + bandH * 0.22 + 70, width: tw, fontSize: 14, ...white }),
    label(ctx, "period", { x: P, y: top + bandH + 30, width: tw, fontSize: 13, isBold: true, forecolor: DESIGN_COLORS.navy }),
    label(ctx, "client", { x: P, y: top + bandH + 60, width: tw, fontSize: 10, forecolor: DESIGN_COLORS.ink }),
    label(ctx, "location", { x: P, y: top + bandH + 80, width: tw, fontSize: 10, forecolor: DESIGN_COLORS.ink }),
    label(ctx, "contractSum", { x: P, y: top + bandH + 100, width: tw, fontSize: 10, forecolor: DESIGN_COLORS.ink }),
    block(P, H - 60, tw, 1, DESIGN_COLORS.line),
    label(ctx, "preparedBy", { x: P, y: H - 50, width: tw, fontSize: 10, forecolor: DESIGN_COLORS.muted }),
  ]);
}

// A navy stripe with a gold edge down the left, everything aligned beside it
function stripe(ctx: FrameTemplateContext): DesignElement[] {
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const P = Math.max(ctx.inset ?? 0, 24);
  const x = 74;
  const tw = W - x - P;
  return page(ctx, [
    block(0, 0, 36, H, DESIGN_COLORS.navy),
    block(36, 0, 6, H, DESIGN_COLORS.accent),
    pic(x, P + 10, 140, 56),
    label(ctx, "ministry", { x, y: H * 0.3, width: tw, fontSize: 11, isBold: true, forecolor: DESIGN_COLORS.muted }),
    label(ctx, "reportTitle", { x, y: H * 0.3 + 24, width: tw, fontSize: 28, isBold: true, forecolor: DESIGN_COLORS.navy, height: 82 }),
    block(x, H * 0.3 + 116, 90, 4, DESIGN_COLORS.accent),
    label(ctx, "projectName", { x, y: H * 0.3 + 134, width: tw, fontSize: 15, isBold: true, forecolor: DESIGN_COLORS.ink }),
    label(ctx, "period", { x, y: H * 0.3 + 162, width: tw, fontSize: 12, forecolor: DESIGN_COLORS.muted }),
    label(ctx, "preparedFor", { x, y: H - 70, width: tw, fontSize: 10, forecolor: DESIGN_COLORS.ink }),
    label(ctx, "preparedBy", { x, y: H - 48, width: tw, fontSize: 10, forecolor: DESIGN_COLORS.ink }),
  ]);
}

// A double frame (navy outside, gold inside) with everything centred, like a certificate
function framed(ctx: FrameTemplateContext): DesignElement[] {
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const o = Math.max(ctx.inset ?? 0, 16);
  const i = o + 8;
  const P = i + 24;
  const tw = W - 2 * P;
  const center = { textAlignment: "Center" as const };
  return page(ctx, [
    outline(o, o, W - 2 * o, H - 2 * o, DESIGN_COLORS.navy, 2),
    outline(i, i, W - 2 * i, H - 2 * i, DESIGN_COLORS.accent, 0.75),
    pic(W / 2 - 45, H * 0.12, 90, 90),
    label(ctx, "ministry", { x: P, y: H * 0.12 + 104, width: tw, fontSize: 12, isBold: true, forecolor: DESIGN_COLORS.navy, ...center }),
    label(ctx, "reportType", { x: P, y: H * 0.38, width: tw, fontSize: 12, isBold: true, forecolor: DESIGN_COLORS.accent, ...center }),
    label(ctx, "reportTitle", { x: P, y: H * 0.38 + 24, width: tw, fontSize: 24, isBold: true, forecolor: DESIGN_COLORS.navy, ...center }),
    block(W / 2 - 60, H * 0.38 + 72, 120, 1, DESIGN_COLORS.navy),
    label(ctx, "projectName", { x: P, y: H * 0.38 + 86, width: tw, fontSize: 14, forecolor: DESIGN_COLORS.ink, ...center }),
    label(ctx, "period", { x: P, y: H * 0.38 + 112, width: tw, fontSize: 12, forecolor: DESIGN_COLORS.muted, ...center }),
    label(ctx, "preparedBy", { x: P, y: H - P - 40, width: tw, fontSize: 10, forecolor: DESIGN_COLORS.ink, ...center }),
    label(ctx, "documentNo", { x: P, y: H - P - 20, width: tw, fontSize: 9, forecolor: DESIGN_COLORS.muted, ...center }),
  ]);
}

// Logo and title on top, a wide photo strip, a navy footer with the date
function photoStrip(ctx: FrameTemplateContext): DesignElement[] {
  const W = ctx.availableWidth;
  const H = ctx.availableHeight;
  const P = Math.max(ctx.inset ?? 0, 28);
  const tw = W - 2 * P;
  const stripTop = Math.round(H * 0.42);
  const stripH = Math.round(H * 0.3);
  const footer = 70;
  const white = { forecolor: DESIGN_COLORS.white };
  return page(ctx, [
    pic(P, P, 70, 70),
    label(ctx, "ministry", { x: P + 84, y: P + 14, width: tw - 84, fontSize: 12, isBold: true, forecolor: DESIGN_COLORS.navy }),
    label(ctx, "agency", { x: P + 84, y: P + 34, width: tw - 84, fontSize: 10, forecolor: DESIGN_COLORS.muted }),
    label(ctx, "reportType", { x: P, y: H * 0.2, width: tw, fontSize: 12, isBold: true, forecolor: DESIGN_COLORS.accent }),
    label(ctx, "reportTitle", { x: P, y: H * 0.2 + 22, width: tw, fontSize: 26, isBold: true, forecolor: DESIGN_COLORS.navy }),
    label(ctx, "projectName", { x: P, y: H * 0.2 + 66, width: tw, fontSize: 14, forecolor: DESIGN_COLORS.ink }),
    pic(0, stripTop, W, stripH),
    block(0, stripTop + stripH, W, 4, DESIGN_COLORS.accent),
    block(0, H - footer, W, footer, DESIGN_COLORS.navy),
    label(ctx, "period", { x: P, y: H - footer + 16, width: tw, fontSize: 13, isBold: true, ...white }),
    label(ctx, "preparedBy", { x: P, y: H - footer + 38, width: tw, fontSize: 10, ...white }),
  ]);
}

const COVER_BUILDERS: Record<CoverDesignType, (ctx: FrameTemplateContext) => DesignElement[]> = {
  coverClassic: classic,
  coverOfficial: official,
  coverBand: band,
  coverStripe: stripe,
  coverFramed: framed,
  coverPhotoStrip: photoStrip,
  coverPhotoPanel: photoPanel,
  coverFullPhoto: fullPhoto,
  coverMinimal: minimal,
  coverColourBlock: colourBlock,
  coverProjectCard: projectCard,
};

export function buildCoverDesign(type: CoverDesignType, ctx: FrameTemplateContext): DesignElement[] {
  return COVER_BUILDERS[type](ctx);
}

// Unwraps old cover frames into direct editable elements on the cover page
export function unwrapLegacyCoverFrames(bands: Band[]): boolean {
  const detail = bands.find((b) => b.type === "detail");
  if (!detail || !detail.elements) return false;
  let changed = false;
  for (let i = detail.elements.length - 1; i >= 0; i--) {
    const el = detail.elements[i];
    if (
      el &&
      el.type === "frame" &&
      (el.pageIndex ?? 0) === 0 &&
      !(el.properties ?? []).some((p) => p?.name === DESIGN_BOX_PROPERTY) &&
      el.elements &&
      el.elements.length > 0 &&
      (el.elements.some(isBoxPart) || (el.width >= 400 && el.height >= 500))
    ) {
      const unwrapped: DesignElement[] = [];
      if ((el.mode === "Opaque" && el.backcolor) || el.box?.pen?.lineWidth) {
        unwrapped.push(
          createElement("rectangle", {
            uuid: crypto.randomUUID(),
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            mode: el.mode ?? "Transparent",
            backcolor: el.backcolor,
            pen: el.box?.pen ?? { lineWidth: 0, lineStyle: "Solid", lineColor: "#000000" },
            pageIndex: 0,
          } as Partial<DesignElement>),
        );
      }
      for (const child of el.elements) {
        releaseBoxPart(child);
        unwrapped.push({
          ...child,
          x: el.x + child.x,
          y: el.y + child.y,
          pageIndex: 0,
        });
      }
      detail.elements.splice(i, 1, ...unwrapped);
      changed = true;
    }
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Contents designs: ordinary elements with their own ids, placed on the page

const own = (el: DesignElement): DesignElement => {
  releaseBoxPart(el);
  return { ...el, uuid: crypto.randomUUID() };
};

const heading = (ctx: FrameTemplateContext, key: string, o: Omit<TextOptions, "text" | "height">) => own(label(ctx, key, o));

// Sample rows: five sections, three of them with sub-sections, so a design
// looks like a real Table of Contents (a list that keeps in step with the
// headings shows the report's own headings instead)
const SAMPLE_ROWS: [key: string, level: 0 | 1][] = [
  ["sample1", 0],
  ["sampleSub1", 1],
  ["sampleSub2", 1],
  ["sample2", 0],
  ["sampleSub3", 1],
  ["sample4", 0],
  ["sample3", 0],
  ["sample5", 0],
];

// `numbers`: the first sections' numbers; later ones follow their pattern
// ("1." → "5.", "01" → "05", "SECTION 1." → "SECTION 5.")
function sampleEntries(ctx: FrameTemplateContext, numbers: string[]): ContentsEntry[] {
  let section = -1;
  let sub = 0;
  const sectionNo = (n: number) =>
    numbers[n] ?? (numbers[0] ?? "").replace(/\d+/, (d) => String(n + 1).padStart(d.length, "0"));
  return SAMPLE_ROWS.map(([key, level], i) => {
    if (level === 0) {
      section++;
      sub = 0;
    } else sub++;
    return {
      number: level === 0 ? sectionNo(section) : ["i", "ii", "iii"][sub - 1] ?? "",
      title: ph(ctx, key),
      page: String(3 + i + section),
      level,
    };
  });
}

function placedList(x: number, y: number, width: number, entries: ContentsEntry[], patch: Parameters<typeof buildContentsList>[2]) {
  return { ...buildContentsList(width, entries, patch), uuid: crypto.randomUUID(), x: Math.round(x), y: Math.round(y) };
}

// A list centred across the page
const centredList = (W: number, y: number, width: number, entries: ContentsEntry[], patch: Parameters<typeof buildContentsList>[2]) =>
  placedList((W - width) / 2, y, width, entries, patch);

const sectionWords = (ctx: FrameTemplateContext) => ["1", "2", "3"].map((n) => ctx.t("pageDesigns.placeholder.sectionN", { n }));

// A centred heading
const title = (ctx: FrameTemplateContext, W: number, y: number, fontSize: number, color: string, key = "tableOfContentsTitle") =>
  heading(ctx, key, { x: 0, y, width: W, fontSize, isBold: true, forecolor: color, textAlignment: "Center" });

// A small centred line of text (project name, document number)
const caption = (ctx: FrameTemplateContext, W: number, y: number, key: string, color: string, fontSize = 9, italic = false) =>
  heading(ctx, key, { x: W * 0.1, y, width: W * 0.8, fontSize, forecolor: color, textAlignment: "Center", isItalic: italic });

// Centred rules: a thick one with a thin one under it
const doubleRule = (W: number, y: number, width: number, thick: string, thin: string) => [
  own(block((W - width) / 2, y, width, 2, thick)),
  own(block((W - width * 0.6) / 2, y + 5, width * 0.6, 1, thin)),
];

// Three small squares in a row: a quiet ornament under a heading
const ornament = (W: number, y: number, color: string) =>
  [-14, -3, 8].map((dx, i) => own(block(W / 2 + dx, y + (i === 1 ? -1 : 0), i === 1 ? 6 : 4, i === 1 ? 6 : 4, color)));

const CONTENTS_BUILDERS: Record<ContentsDesignType, (ctx: FrameTemplateContext) => DesignElement[]> = {
  // Just the contents, in black: sections 1, 2…, sub-sections i, ii…, dotted lines
  contentsPlain: (ctx) => {
    const W = ctx.availableWidth;
    const black = "#000000";
    return [
      title(ctx, W, 40, 20, black),
      centredList(W, 100, Math.round(W * 0.8), sampleEntries(ctx, ["1", "2", "3"]), {
        numberWidth: 30,
        leader: true,
        rowHeight: 26,
        fontSize: 11,
        color: black,
        sectionStyle: "1",
        subStyle: "roman",
      }),
    ];
  },
  // A navy and gold double frame, crest, heading over a double rule, dotted list
  contentsRegal: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const lw = Math.round(W * 0.76);
    return [
      own(outline(8, 8, W - 16, H - 16, DESIGN_COLORS.navy, 2)),
      own(outline(15, 15, W - 30, H - 30, DESIGN_COLORS.gold, 0.75)),
      own(pic(W / 2 - 26, 44, 52, 52)),
      title(ctx, W, 108, 22, DESIGN_COLORS.navy),
      ...doubleRule(W, 146, W * 0.4, DESIGN_COLORS.navy, DESIGN_COLORS.gold),
      centredList(W, 180, lw, sampleEntries(ctx, ["1.", "2.", "3."]), { numberWidth: 36, leader: true, rowHeight: 28, fontSize: 11, color: DESIGN_COLORS.ink, sectionStyle: "1." }),
      own(block(W * 0.3, H - 64, W * 0.4, 1, DESIGN_COLORS.gold)),
      caption(ctx, W, H - 56, "projectName", DESIGN_COLORS.muted),
    ];
  },
  // A warm cream page, burgundy heading with a gold ornament, SECTION words
  contentsHeritage: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const lw = Math.round(W * 0.8);
    return [
      own(block(0, 0, W, H, DESIGN_COLORS.cream)),
      own(outline(12, 12, W - 24, H - 24, DESIGN_COLORS.gold, 1)),
      caption(ctx, W, 46, "projectName", DESIGN_COLORS.gold, 10),
      title(ctx, W, 66, 24, DESIGN_COLORS.burgundy),
      ...ornament(W, 110, DESIGN_COLORS.gold),
      centredList(W, 140, lw, sampleEntries(ctx, sectionWords(ctx)), { numberWidth: 100, leader: true, rowHeight: 30, fontSize: 11, color: DESIGN_COLORS.ink, sectionStyle: "word" }),
      ...ornament(W, H - 48, DESIGN_COLORS.gold),
    ];
  },
  // A navy crown band with the heading in white, gold edge, navy number boxes
  contentsNavyCrown: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const lw = Math.round(W * 0.78);
    return [
      own(block(0, 0, W, 112, DESIGN_COLORS.navy)),
      own(block(0, 112, W, 4, DESIGN_COLORS.accent)),
      caption(ctx, W, 26, "projectName", DESIGN_COLORS.accent, 10),
      title(ctx, W, 46, 24, DESIGN_COLORS.white),
      centredList(W, 156, lw, sampleEntries(ctx, ["01", "02", "03"]), {
        numberWidth: 56,
        leader: true,
        rowHeight: 34,
        fontSize: 11,
        sectionStyle: "01",
        numberFill: DESIGN_COLORS.navy,
        numberColor: DESIGN_COLORS.white,
        color: DESIGN_COLORS.ink,
      }),
      own(block(0, H - 18, W, 4, DESIGN_COLORS.accent)),
      own(block(0, H - 14, W, 14, DESIGN_COLORS.navy)),
    ];
  },
  // A thin gold frame with navy corner squares, heading between two rules
  contentsGoldCorners: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const lw = Math.round(W * 0.74);
    const c = 14;
    return [
      own(outline(20, 20, W - 40, H - 40, DESIGN_COLORS.gold, 1)),
      own(block(13, 13, c, c, DESIGN_COLORS.navy)),
      own(block(W - 13 - c, 13, c, c, DESIGN_COLORS.navy)),
      own(block(13, H - 13 - c, c, c, DESIGN_COLORS.navy)),
      own(block(W - 13 - c, H - 13 - c, c, c, DESIGN_COLORS.navy)),
      own(block(W * 0.3, 62, W * 0.4, 1, DESIGN_COLORS.gold)),
      title(ctx, W, 72, 22, DESIGN_COLORS.navy),
      own(block(W * 0.3, 112, W * 0.4, 1, DESIGN_COLORS.gold)),
      centredList(W, 146, lw, sampleEntries(ctx, ["I", "II", "III"]), { numberWidth: 40, leader: true, rowHeight: 28, fontSize: 11, color: DESIGN_COLORS.ink, sectionStyle: "I" }),
    ];
  },
  // Two columns centred as a pair, a gold line between them
  contentsTwoColumns: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const gap = 32;
    const colW = Math.floor((W * 0.9 - gap) / 2);
    const x0 = Math.round((W - (colW * 2 + gap)) / 2);
    const patch = { numberWidth: 30, leader: true, rowHeight: 26, fontSize: 10, color: DESIGN_COLORS.ink, sectionStyle: "1." as const };
    const left = placedList(x0, 150, colW, sampleEntries(ctx, ["1.", "2.", "3."]), patch);
    const right = placedList(x0 + colW + gap, 150, colW, [], { ...patch, continues: left.uuid });
    return [
      own(block(0, 0, W, 6, DESIGN_COLORS.navy)),
      title(ctx, W, 44, 24, DESIGN_COLORS.navy),
      ...doubleRule(W, 88, W * 0.3, DESIGN_COLORS.navy, DESIGN_COLORS.accent),
      caption(ctx, W, 104, "projectName", DESIGN_COLORS.muted),
      own(block(W / 2 - 0.5, 150, 1, 230, DESIGN_COLORS.gold)),
      left,
      right,
      own(block(0, H - 6, W, 6, DESIGN_COLORS.navy)),
    ];
  },
  // An official index: column labels in a navy bar, rows on a pale panel
  contentsLedger: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const lw = Math.round(W * 0.82);
    const x = (W - lw) / 2;
    const small = { fontSize: 9, isBold: true, forecolor: DESIGN_COLORS.white };
    return [
      title(ctx, W, 40, 22, DESIGN_COLORS.navy),
      caption(ctx, W, 76, "documentNo", DESIGN_COLORS.muted),
      own(block(x, 112, lw, 26, DESIGN_COLORS.navy)),
      heading(ctx, "colNumber", { x: x + 10, y: 117, width: 60, ...small }),
      heading(ctx, "colTitle", { x: x + 66, y: 117, width: 200, ...small }),
      heading(ctx, "colPage", { x: x + lw - 70, y: 117, width: 60, ...small, textAlignment: "Right" }),
      own(block(x, 138, lw, 8 * 28 + 16, DESIGN_COLORS.slate)),
      placedList(x, 146, lw, sampleEntries(ctx, ["1.0", "2.0", "3.0"]), { numberWidth: 56, leader: false, rowHeight: 28, fontSize: 11, color: DESIGN_COLORS.ink, sectionStyle: "1." }),
      own(block(x, 138 + 8 * 28 + 16, lw, 2, DESIGN_COLORS.navy)),
      own(block(W * 0.35, H - 40, W * 0.3, 1, DESIGN_COLORS.line)),
      caption(ctx, W, H - 32, "projectName", DESIGN_COLORS.muted, 8),
    ];
  },
  // A white card on a soft page, gold number boxes inside
  contentsCard: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const cw = Math.round(W * 0.84);
    const lw = Math.round(cw - 56);
    return [
      own(block(0, 0, W, H, DESIGN_COLORS.slate)),
      own(block((W - cw) / 2, 50, cw, H - 100, DESIGN_COLORS.white, 12)),
      own(block((W - cw) / 2, 50, cw, 6, DESIGN_COLORS.accent)),
      heading(ctx, "tableOfContentsTitle", { x: (W - cw) / 2 + 16, y: 84, width: cw - 32, fontSize: 22, isBold: true, forecolor: DESIGN_COLORS.navy, textAlignment: "Center" }),
      heading(ctx, "projectName", { x: (W - cw) / 2 + 16, y: 118, width: cw - 32, fontSize: 9, forecolor: DESIGN_COLORS.muted, textAlignment: "Center" }),
      centredList(W, 156, lw, sampleEntries(ctx, ["01", "02", "03"]), {
        numberWidth: 52,
        leader: true,
        rowHeight: 32,
        fontSize: 11,
        sectionStyle: "01",
        numberFill: DESIGN_COLORS.accent,
        numberColor: DESIGN_COLORS.navy,
        color: DESIGN_COLORS.ink,
      }),
    ];
  },
  // Quiet and refined: thin rules above and below, a large light heading
  contentsElegant: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const lw = Math.round(W * 0.7);
    return [
      caption(ctx, W, 60, "reportTitle", DESIGN_COLORS.gold, 10),
      heading(ctx, "tableOfContentsTitle", { x: 0, y: 80, width: W, fontSize: 28, forecolor: DESIGN_COLORS.ink, textAlignment: "Center" }),
      own(block((W - 40) / 2, 130, 40, 2, DESIGN_COLORS.gold)),
      own(block((W - lw) / 2, 160, lw, 1, DESIGN_COLORS.line)),
      centredList(W, 172, lw, sampleEntries(ctx, ["1", "2", "3"]), { numberWidth: 30, leader: true, rowHeight: 28, fontSize: 11, color: DESIGN_COLORS.ink, sectionStyle: "1" }),
      own(block((W - lw) / 2, 172 + 8 * 28 + 12, lw, 1, DESIGN_COLORS.line)),
      caption(ctx, W, H - 40, "period", DESIGN_COLORS.muted, 9, true),
    ];
  },
  // Government style: crest and ministry name, navy bars top and bottom
  contentsStatesman: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const lw = Math.round(W * 0.78);
    return [
      own(block(0, 0, W, 8, DESIGN_COLORS.navy)),
      own(block(0, 10, W, 2, DESIGN_COLORS.accent)),
      own(pic(W / 2 - 22, 30, 44, 44)),
      caption(ctx, W, 80, "ministry", DESIGN_COLORS.navy, 10),
      title(ctx, W, 104, 20, DESIGN_COLORS.navy),
      ...doubleRule(W, 138, W * 0.5, DESIGN_COLORS.navy, DESIGN_COLORS.accent),
      centredList(W, 168, lw, sampleEntries(ctx, sectionWords(ctx)), { numberWidth: 100, leader: true, rowHeight: 28, fontSize: 11, color: DESIGN_COLORS.ink, sectionStyle: "word" }),
      caption(ctx, W, H - 38, "documentNo", DESIGN_COLORS.muted, 8),
      own(block(0, H - 12, W, 2, DESIGN_COLORS.accent)),
      own(block(0, H - 8, W, 8, DESIGN_COLORS.navy)),
    ];
  },
  // Burgundy and gold: a deep heading band inside a double frame
  contentsBurgundy: (ctx) => {
    const W = ctx.availableWidth;
    const H = ctx.availableHeight;
    const lw = Math.round(W * 0.76);
    return [
      own(outline(6, 6, W - 12, H - 12, DESIGN_COLORS.burgundy, 2)),
      own(outline(12, 12, W - 24, H - 24, DESIGN_COLORS.gold, 0.75)),
      own(block(W * 0.15, 44, W * 0.7, 64, DESIGN_COLORS.burgundy, 4)),
      heading(ctx, "tableOfContentsTitle", { x: W * 0.15 + 8, y: 60, width: W * 0.7 - 16, fontSize: 22, isBold: true, forecolor: DESIGN_COLORS.white, textAlignment: "Center" }),
      ...ornament(W, 124, DESIGN_COLORS.gold),
      centredList(W, 150, lw, sampleEntries(ctx, ["01", "02", "03"]), {
        numberWidth: 50,
        leader: true,
        rowHeight: 32,
        fontSize: 11,
        sectionStyle: "01",
        numberFill: DESIGN_COLORS.burgundy,
        numberColor: DESIGN_COLORS.white,
        color: DESIGN_COLORS.ink,
      }),
      caption(ctx, W, H - 44, "projectName", DESIGN_COLORS.burgundy, 9, true),
    ];
  },
};

export function buildContentsDesign(type: ContentsDesignType, ctx: FrameTemplateContext): DesignElement[] {
  return boxUp(CONTENTS_BUILDERS[type](ctx), ctx.availableWidth, ctx.availableHeight);
}
