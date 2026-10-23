// Basic Elements of the library: Text, Heading, Sub-heading, Image,
// Line, Rectangle, Circle (ellipse) and Box. The text schema is the one the
// others follow: plain words for what a user sets in the property panels.

import type { DesignElement, FrameElement, LineElement, RectangleElement, TextFieldElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { frame, fitChildrenToFrame, applyBorderPreset, getBoxCornerRadii, setBoxCornerRadii } from "@/utils/framePresets";
import { buildReportPart } from "@/utils/reportParts";
import { getImageName, getImageShape, IMAGE_SHAPES, setImageName, setImageShape } from "@/utils/elementUtils";
import { hasProperty, SECTION_HEADING_PROPERTY, SUB_HEADING_PROPERTY, sectionHeadingParts } from "@/utils/contentsList";
import { headingNumberPart, isAutoNumbered, setAutoNumbered } from "@/utils/headingSync";
import { isPagination } from "@/utils/paginationPresets";
import { isDateElement } from "@/utils/dateElement";
import { ELEMENT_DEFAULT_SIZES } from "@/constants/constants";
import {
  applyBoxLines,
  applyFill,
  applyOutline,
  applyPropertyCorners,
  applyTextStyle,
  BORDER_PROPS,
  CORNER_PROPS,
  defined,
  describeBoxLines,
  describeCorners,
  describeFill,
  describePlace,
  describePropertyCorners,
  describeTextStyle,
  ensureTextHeight,
  fill,
  has,
  isRich,
  LINE_STYLES,
  lineCount,
  OUTLINE_PROPS,
  plainText,
  readCorners,
  requireColor,
  TEXT_STYLE_PROPS,
  writeText,
  color,
} from "./common";
import { SpecError, type ElementKind, type ElementSpec, type KindContext } from "./types";
import { isAttachmentSource } from "../attachments";

const uuid = () => crypto.randomUUID();

// x / y / width / height from the settings (whole px, as JasperReports wants)
export function applyGeometry(element: DesignElement, spec: ElementSpec): void {
  for (const key of ["x", "y", "width", "height"] as const) {
    if (has(spec, key)) element[key] = Math.round(spec[key]);
  }
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

const TEXT_PROPS = {
  text: {
    type: "string" as const,
    description: "The words shown. Use \\n for a new line. With rich: true, simple HTML is allowed (<b> <i> <u> <s> <sup> <sub> <br> <ul><li> <ol><li> <font color=\"#RRGGBB\">)",
  },
  rich: { type: "boolean" as const, description: "The text holds simple HTML formatting" },
  ...TEXT_STYLE_PROPS,
  grow: { type: "boolean" as const, description: "Grows downward in the PDF when the text is longer than the box (for paragraphs)" },
  rotation: { type: "string" as const, enum: ["None", "Left", "Right", "UpsideDown"], description: "Turned text" },
  ...BORDER_PROPS,
  ...CORNER_PROPS,
};

function applyTextSettings(element: TextFieldElement, spec: ElementSpec, ctx: KindContext): void {
  applyGeometry(element, spec);
  if (has(spec, "text") || has(spec, "rich")) {
    const rich = has(spec, "rich") ? !!spec.rich : isRich(element);
    writeText(element, has(spec, "text") ? String(spec.text) : plainText(element), rich);
  }
  applyTextStyle(element, spec);
  if (has(spec, "grow")) {
    if (spec.grow) element.textAdjust = "StretchHeight";
    else delete element.textAdjust;
  }
  if (has(spec, "rotation")) element.rotation = spec.rotation;
  applyBoxLines(element, spec);
  applyPropertyCorners(element, spec);
  ensureTextHeight(element, ctx, element.textAdjust === "StretchHeight" ? 1 : lineCount(plainText(element)));
}

function newText(ctx: KindContext, overrides: Partial<TextFieldElement> = {}): TextFieldElement {
  return createElement("textField", {
    uuid: uuid(),
    x: 0,
    y: 0,
    width: 200,
    height: 1,
    expression: '""',
    fontFamily: ctx.fontName,
    fontSize: ctx.fontSize,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    forecolor: "#000000",
    textAlignment: "Left",
    verticalAlignment: "Top",
    markup: "none",
    ...overrides,
  } as Partial<DesignElement>) as TextFieldElement;
}

const describeText = (e: DesignElement) =>
  defined({
    text: plainText(e),
    rich: isRich(e),
    ...describeTextStyle(e),
    grow: e.textAdjust === "StretchHeight",
    rotation: (e as TextFieldElement).rotation !== "None" ? (e as TextFieldElement).rotation : undefined,
    ...describeBoxLines(e),
    ...describePropertyCorners(e),
  });

export const textKind: ElementKind = {
  kind: "text",
  tool: "create_text",
  description:
    "Add a text: a title, label, paragraph, caption, number on a card… Plain typed words (not linked to data). Height must be at least 1.45 × fontSize per line.",
  properties: TEXT_PROPS,
  required: ["text"],
  inBox: true,
  matches: (e) =>
    e.type === "textField" && !isPagination(e) && !isDateElement(e) && !hasProperty(e, SUB_HEADING_PROPERTY),
  create(spec, ctx) {
    const element = newText(ctx);
    applyTextSettings(element, spec, ctx);
    return element;
  },
  update: (e, spec, ctx) => applyTextSettings(e as TextFieldElement, spec, ctx),
  describe: describeText,
};

// ---------------------------------------------------------------------------
// Sub-heading: a text the Table of Contents lists as a sub-section
// ---------------------------------------------------------------------------

export const subHeadingKind: ElementKind = {
  kind: "subHeading",
  tool: "create_sub_heading",
  description:
    "Add a Sub-heading (e.g. \"TOWER A: KEY ACTIVITIES\"): a bold underlined line that the Table of Contents lists as a sub-section under the Heading before it. Use only on normal pages.",
  properties: { text: TEXT_PROPS.text, ...TEXT_STYLE_PROPS },
  required: ["text"],
  inBox: true,
  matches: (e) => e.type === "textField" && hasProperty(e, SUB_HEADING_PROPERTY),
  create(spec, ctx) {
    const element = { ...buildReportPart("partSubHeading", frameCtx(ctx)), uuid: uuid() } as TextFieldElement;
    element.fontFamily = ctx.fontName;
    applyTextSettings(element, { ...spec, rich: false }, ctx);
    return element;
  },
  update: (e, spec, ctx) => applyTextSettings(e as TextFieldElement, { ...spec, rich: false }, ctx),
  describe: (e) => defined({ text: plainText(e), ...describeTextStyle(e) }),
};

// The context the library's builders take
export const frameCtx = (ctx: KindContext) => ({
  availableWidth: ctx.availableWidth,
  availableHeight: ctx.availableHeight,
  t: ctx.t,
});

// ---------------------------------------------------------------------------
// Heading: "1.  PROJECT DETAILS", numbers itself in the report's style
// ---------------------------------------------------------------------------

function applySectionHeading(box: FrameElement, spec: ElementSpec, ctx: KindContext): void {
  applyGeometry(box, spec);
  const { numberPart, titleParts } = sectionHeadingParts(box);
  const title = titleParts[0];
  if (has(spec, "title") && title) writeText(title, String(spec.title), false);
  if (has(spec, "numbered") && numberPart) {
    setAutoNumbered(numberPart, false);
    if (spec.numbered) setAutoNumbered(numberPart, true);
    else writeText(numberPart, "", false);
  }
  const parts = [numberPart, ...titleParts].filter((p): p is DesignElement => !!p);
  for (const part of parts) {
    const { textAlignment: _a, ...style } = spec;
    applyTextStyle(part, style);
  }
  // The parts are as tall as the heading, which is tall enough for its text
  const probe = { ...(title ?? box), height: box.height } as DesignElement;
  ensureTextHeight(probe, ctx);
  box.height = probe.height;
  for (const part of parts) part.height = box.height;
  // The title keeps the same space inside the right edge as the number on the left
  if (title && numberPart) title.width = Math.max(20, box.width - title.x - numberPart.x);
}

export const sectionHeadingKind: ElementKind = {
  kind: "sectionHeading",
  tool: "create_section_heading",
  description:
    "Add a Heading (the library's Heading tile): a number (\"1.\", counted automatically in page order in the report's numbering style) and a title across the page. Headings fill the Table of Contents and get PDF bookmarks. Use on normal pages, usually x 0; it starts about three quarters of the printable width wide.",
  properties: {
    title: { type: "string", description: "The heading's title, e.g. \"PROJECT DETAILS\"" },
    numbered: { type: "boolean", description: "Shows its automatic number (default true)" },
    fontSize: TEXT_STYLE_PROPS.fontSize!,
    isBold: TEXT_STYLE_PROPS.isBold!,
    isUnderline: TEXT_STYLE_PROPS.isUnderline!,
    forecolor: TEXT_STYLE_PROPS.forecolor!,
  },
  required: ["title"],
  inBox: false,
  matches: (e) => e.type === "frame" && hasProperty(e, SECTION_HEADING_PROPERTY),
  create(spec, ctx) {
    const box = { ...buildReportPart("partSectionHeading", frameCtx(ctx)), uuid: uuid() } as FrameElement;
    for (const part of box.elements ?? []) part.fontFamily = ctx.fontName;
    applySectionHeading(box, spec, ctx);
    return box;
  },
  update: (e, spec, ctx) => applySectionHeading(e as FrameElement, spec, ctx),
  describe(e) {
    const { numberPart, titleParts } = sectionHeadingParts(e as FrameElement);
    const title = titleParts[0];
    return defined({
      title: title ? plainText(title) : "",
      numbered: isAutoNumbered(headingNumberPart(e as FrameElement)),
      number: numberPart ? plainText(numberPart) : undefined,
      ...(title ? describeTextStyle(title) : {}),
    });
  },
};

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

const SCALE_TYPES = ["RetainShape", "FillFrame", "Clip"] as const;

function applyImage(element: DesignElement, spec: ElementSpec): void {
  applyGeometry(element, spec);
  if (has(spec, "source")) {
    const source = String(spec.source).trim();
    // No web addresses: one that isn't a picture (or is gone) stops the whole
    // PDF. A picture the user attached in the chat is fine (stored for it).
    if (source && !/^data:image\/(png|jpe?g|gif|svg\+xml);base64,/i.test(source) && !isAttachmentSource(source)) {
      throw new SpecError("source: use a picture the user attached (\"attachment:<id>\") or an embedded picture (data:image/png|jpeg|gif|svg+xml;base64,…); leave source out for a photo spot the user fills by dropping a picture on it");
    }
    // Same form as toImageExpression (services/imageService)
    (element as { imageExpression?: string }).imageExpression = source ? `"${source.replace(/"/g, "%22")}"` : "";
  }
  if (has(spec, "scaleType")) {
    const image = element as { scaleType?: string; scaleImage?: string };
    image.scaleType = spec.scaleType;
    // Read from an opened report; scaleType wins when written
    delete image.scaleImage;
  }
  if (has(spec, "name")) setImageName(element, String(spec.name));
  applyBoxLines(element, spec);
  if (has(spec, "shape")) setImageShape(element, spec.shape);
  applyPropertyCorners(element, spec);
}

export const imageKind: ElementKind = {
  kind: "image",
  tool: "create_image",
  description:
    "Add a picture the user attached in the chat (source \"attachment:<id>\"), a photo or logo spot the user fills by dropping a picture on it, or an embedded picture. Web addresses can't be used.",
  properties: {
    source: {
      type: "string",
      description:
        "A picture the user attached in the chat: \"attachment:<id>\" (e.g. \"attachment:img-1\"; keep its proportions), or an embedded picture (data:image/…;base64,…) such as a simple SVG emblem you draw; leave out for a photo / logo spot the user fills",
    },
    name: { type: "string", description: "Label shown on an empty spot, e.g. \"Company logo\"" },
    scaleType: {
      type: "string",
      enum: SCALE_TYPES,
      description: "RetainShape: whole picture, proportions kept (default); FillFrame: stretched to the box; Clip: real size, cut at the edges",
    },
    shape: {
      type: "string",
      enum: IMAGE_SHAPES.map((s) => s.id),
      description: "Corner shape: square, rounded, soft, circle (makes the image square), pill (makes a square image wide), leaf, tab, drop, or one rounded corner: cornerTopLeft, cornerTopRight, cornerBottomRight, cornerBottomLeft",
    },
    ...BORDER_PROPS,
    ...CORNER_PROPS,
  },
  inBox: true,
  matches: (e) => e.type === "image",
  create(spec) {
    const element = createElement("image", {
      uuid: uuid(),
      x: 0,
      y: 0,
      ...ELEMENT_DEFAULT_SIZES.image,
      imageExpression: "",
      scaleType: "RetainShape",
      // An empty or unreachable picture prints nothing instead of stopping the PDF
      onErrorType: "Blank",
    } as Partial<DesignElement>);
    applyImage(element, spec);
    return element;
  },
  update: (e, spec) => applyImage(e, spec),
  describe(e) {
    const expr = ((e as { imageExpression?: string }).imageExpression ?? "").replace(/^"|"$/g, "");
    const shape = getImageShape(e);
    return defined({
      source: expr.startsWith("data:") ? "(embedded picture)" : expr || undefined,
      name: getImageName(e) || undefined,
      scaleType: (e as { scaleType?: string; scaleImage?: string }).scaleType ?? (e as { scaleImage?: string }).scaleImage,
      shape,
      ...describeBoxLines(e),
      ...(shape ? {} : describePropertyCorners(e)),
    });
  },
};

// ---------------------------------------------------------------------------
// Line
// ---------------------------------------------------------------------------

const LINE_DIRECTIONS = ["horizontal", "vertical", "diagonalDown", "diagonalUp"] as const;

function lineDirection(e: LineElement): (typeof LINE_DIRECTIONS)[number] {
  if (e.height <= 1) return "horizontal";
  if (e.width <= 1) return "vertical";
  return e.lineDirection === "BottomUp" ? "diagonalUp" : "diagonalDown";
}

function applyLine(element: LineElement, spec: ElementSpec): void {
  applyGeometry(element, spec);
  const direction = has(spec, "direction") ? spec.direction : lineDirection(element);
  if (direction === "horizontal") element.height = 1;
  if (direction === "vertical") element.width = 1;
  element.lineDirection = direction === "diagonalUp" ? "BottomUp" : "TopDown";
  if (has(spec, "lineWidth")) element.lineWidth = spec.lineWidth;
  if (has(spec, "lineColor")) element.lineColor = requireColor(spec.lineColor, "lineColor");
  if (has(spec, "lineStyle")) element.lineStyle = spec.lineStyle;
}

export const lineKind: ElementKind = {
  kind: "line",
  tool: "create_line",
  description:
    "Add a line (rule or divider). Horizontal: width is its length; vertical: height is its length; diagonal lines go corner to corner of their box.",
  properties: {
    direction: { type: "string", enum: LINE_DIRECTIONS, description: "Default horizontal" },
    lineWidth: { type: "number", minimum: 0.25, maximum: 20, description: "Thickness in px (default 1)" },
    lineColor: color("Line colour"),
    lineStyle: { type: "string", enum: LINE_STYLES, description: "Default Solid" },
  },
  inBox: true,
  matches: (e) => e.type === "line",
  create(spec) {
    const element = createElement("line", {
      uuid: uuid(),
      x: 0,
      y: 0,
      width: 200,
      height: 1,
      lineDirection: "TopDown",
      lineWidth: 1,
      lineColor: "#000000",
      lineStyle: "Solid",
    } as Partial<DesignElement>) as LineElement;
    applyLine(element, { direction: "horizontal", ...spec });
    return element;
  },
  update: (e, spec) => applyLine(e as LineElement, spec),
  describe: (e) => {
    const l = e as LineElement;
    return defined({ direction: lineDirection(l), lineWidth: l.lineWidth, lineColor: l.lineColor, lineStyle: l.lineStyle });
  },
};

// ---------------------------------------------------------------------------
// Rectangle and circle
// ---------------------------------------------------------------------------

type Shape = DesignElement & { pen?: { lineWidth?: number; lineColor?: string; lineStyle?: string }; radius?: number };

function applyShape(element: Shape, spec: ElementSpec, isNew: boolean): void {
  applyGeometry(element, spec);
  if (has(spec, "backcolor")) applyFill(element, spec.backcolor);
  applyOutline(element, spec);
  // New: a filled shape has no outline unless asked; an empty one a thin black line
  if (isNew && !has(spec, "border")) {
    element.pen =
      element.mode === "Opaque"
        ? { lineWidth: 0, lineStyle: "Solid", lineColor: element.backcolor }
        : { lineWidth: 1, lineStyle: "Solid", lineColor: "#000000" };
  }
  if (has(spec, "cornerRadius")) element.radius = Math.round(spec.cornerRadius) || undefined;
}

const describeShape = (e: DesignElement) => {
  const s = e as Shape;
  return defined({
    backcolor: describeFill(e),
    border: s.pen?.lineWidth ? { lineWidth: s.pen.lineWidth, lineColor: s.pen.lineColor, lineStyle: s.pen.lineStyle } : undefined,
    cornerRadius: s.radius,
  });
};

const newShape = (type: "rectangle" | "ellipse") =>
  createElement(type, {
    uuid: uuid(),
    x: 0,
    y: 0,
    ...ELEMENT_DEFAULT_SIZES[type],
    mode: "Transparent",
  } as Partial<DesignElement>) as Shape;

export const rectangleKind: ElementKind = {
  kind: "rectangle",
  tool: "create_rectangle",
  description:
    "Add a rectangle for things with nothing on them: bars, colour strips, outlines, a page-wide background. A coloured panel that holds texts or pictures must be a box instead (create_box with children).",
  properties: {
    backcolor: fill("Fill colour"),
    ...OUTLINE_PROPS,
    cornerRadius: CORNER_PROPS.cornerRadius!,
  },
  inBox: true,
  matches: (e) => e.type === "rectangle",
  create(spec) {
    const element = newShape("rectangle");
    applyShape(element, spec, true);
    return element as RectangleElement;
  },
  update: (e, spec) => applyShape(e as Shape, spec, false),
  describe: describeShape,
};

export const ellipseKind: ElementKind = {
  kind: "ellipse",
  tool: "create_ellipse",
  description:
    "Add a circle or oval with nothing inside it (equal width and height for a circle): status dots (green #92D050, amber #FFC000, red #FF0000), decorations. A circle holding a number, icon or text is a box with cornerRadius = half its width instead.",
  properties: { backcolor: fill("Fill colour"), ...OUTLINE_PROPS },
  inBox: true,
  matches: (e) => e.type === "ellipse",
  create(spec) {
    const element = newShape("ellipse");
    applyShape(element, spec, true);
    return element;
  },
  update: (e, spec) => applyShape(e as Shape, spec, false),
  describe: describeShape,
};

// ---------------------------------------------------------------------------
// Box (frame): a panel holding other elements, which move with it
// ---------------------------------------------------------------------------

function applyBoxSettings(box: FrameElement, spec: ElementSpec): void {
  const before = { width: box.width, height: box.height };
  applyGeometry(box, spec);
  // Its items keep their place / stretch with it, as when resized on the page
  if ((box.width !== before.width || box.height !== before.height) && box.elements?.length) {
    const fitted = fitChildrenToFrame(box.elements, before, box);
    box.elements.forEach((child, i) => Object.assign(child, fitted[i]));
  }
  if (has(spec, "backcolor")) applyFill(box, spec.backcolor);
  applyBoxLines(box, spec);
  const radii = readCorners(spec);
  if (radii) setBoxCornerRadii(box, radii);
}

export const boxKind: ElementKind = {
  kind: "box",
  tool: "create_box",
  description:
    "Add a box: a panel (optionally filled, bordered, rounded; a circle with cornerRadius = half its width) holding other elements, which stay inside it and move with it. Use it for every element that has something inside it (panels, cards, banners, \"a rectangle with text inside\"), even when the user says rectangle or circle. Give its contents as children (x / y relative to the box); boxes don't go inside boxes, and tables don't go in boxes. With neither backcolor nor a border it gets a thin light grey line; borderPreset \"none\" makes an invisible box (a group).",
  properties: {
    backcolor: fill("Fill colour of the panel"),
    ...BORDER_PROPS,
    ...CORNER_PROPS,
    children: {
      type: "array",
      description:
        "Elements inside the box, each { kind, ...the settings of create_<kind> } with x / y relative to the box. Kinds: text, subHeading, image, line, rectangle, ellipse, chart, barcode, date, pageNumber, tableOfContents (normal pages only)",
      items: { type: "object", properties: { kind: { type: "string" } }, required: ["kind"] },
    },
  },
  inBox: false,
  matches: (e) => e.type === "frame",
  create(spec) {
    const box: FrameElement = {
      ...frame(200, 100, { box: undefined, mode: "Transparent", backcolor: "#FFFFFF" }),
      uuid: uuid(),
    };
    applyBoxSettings(box, spec);
    // Like the Box tile: a box with neither fill nor border gets a light line, so it can be seen
    if (!has(spec, "backcolor") && !has(spec, "border") && !has(spec, "borderPreset")) {
      box.box = applyBorderPreset(box.box, "light");
    }
    return box;
  },
  update: (e, spec) => applyBoxSettings(e as FrameElement, spec),
  describe: (e) =>
    defined({
      backcolor: describeFill(e),
      ...describeBoxLines(e),
      ...describeCorners(getBoxCornerRadii(e as FrameElement)),
    }),
};
