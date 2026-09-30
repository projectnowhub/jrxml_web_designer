// Element-related utility functions

import type { DesignElement } from "@/types";
import {
  getElementConfig,
  createElement,
} from "@/components/elements/ElementRegistry";

// Get the unique key for an element
export function getElementKey(element: {
  element: DesignElement;
  bandIndex: number;
  elementIndex: number;
  parentFrameIndex?: number;
}): string {
  if (element.parentFrameIndex !== undefined) {
    return `${element.element.type}-${element.bandIndex}-${element.parentFrameIndex}-${element.elementIndex}`;
  }
  return `${element.element.type}-${element.bandIndex}-${element.elementIndex}`;
}

// Get the element type name
export function getElementTypeName(type: string): string {
  const config = getElementConfig(type);
  return config?.name || type;
}

// Get the element icon
export function getElementIcon(type: string): string {
  const config = getElementConfig(type);
  return config?.icon || "?";
}

// Get the element SVG icon
export function getElementIconSvg(type: string): string | undefined {
  const config = getElementConfig(type);
  return config?.iconSvg;
}

// Strip the surrounding double quotes of a literal expression so the UI can show
// clean text (e.g. `"Hello"` -> `Hello`). Field/variable expressions are returned trimmed.
export function stripExpressionQuotes(expression: string): string {
  const trimmed = (expression || "").trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// Keep the stored JRXML expression valid: plain text typed by the user is wrapped in
// quotes, while field/variable expressions, concatenations and values the user quoted
// manually are preserved exactly as typed.
export function quoteExpressionValue(value: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return '""';
  if (trimmed.startsWith("$") || trimmed.includes("+")) return value;
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return value;
  }
  return `"${value}"`;
}

// Property name used to persist the user-defined image name inside <reportElement>,
// so the image label survives a JRXML save/reload round-trip.
export const IMAGE_NAME_PROPERTY = "com.cdp.image.name";

// Label shown for images that are embedded as base64 data URLs and have no user-defined name
export const EMBEDDED_IMAGE_LABEL = "[Embedded Image]";

// Get a reportElement level property value (used by the image name persistence)
function getElementPropertyValue(element: any, propertyName: string): string {
  const properties = element?.properties;
  if (!Array.isArray(properties)) return "";
  const match = properties.find((prop: any) => prop?.name === propertyName);
  return match && typeof match.value === "string" ? match.value.trim() : "";
}

// Create, update or remove a reportElement level property
function setElementPropertyValue(
  element: any,
  propertyName: string,
  value: string,
): void {
  if (!element) return;

  if (!Array.isArray(element.properties)) {
    if (!value) return;
    element.properties = [];
  }

  const index = element.properties.findIndex(
    (prop: any) => prop?.name === propertyName,
  );

  if (!value) {
    if (index !== -1) {
      element.properties.splice(index, 1);
    }
    if (element.properties.length === 0) {
      delete element.properties;
    }
    return;
  }

  if (index === -1) {
    element.properties.push({ name: propertyName, value });
  } else {
    element.properties[index].value = value;
  }
}

// Label derived from the image expression, used when the element has no image name
// (e.g. `"logo.png"` -> `logo.png`, `$P{imagePath}` -> `$P{imagePath}`,
//  embedded base64 data -> `[Embedded Image]`).
export function getImageExpressionLabel(element: DesignElement): string {
  const expression = stripExpressionQuotes(
    String((element as any)?.imageExpression || ""),
  ).trim();
  if (!expression) return "";
  if (expression.startsWith("data:image/")) return EMBEDDED_IMAGE_LABEL;
  return expression;
}

// Get the user-defined name of an image element (empty when the image has no name)
export function getImageName(element: DesignElement): string {
  if (!element || element.type !== "image") return "";
  const image = element as any;
  const imagePath =
    typeof image.imagePath === "string" ? image.imagePath.trim() : "";
  if (imagePath) return imagePath;
  return getElementPropertyValue(image, IMAGE_NAME_PROPERTY);
}

// Get the name displayed for an image element: the user-defined name when it exists,
// otherwise a label derived from the image expression
export function getImageDisplayName(element: DesignElement): string {
  return getImageName(element) || getImageExpressionLabel(element);
}

// Set (or clear) the user-defined name of an image element. The name is a design-time
// label only: the image expression is never modified, so `$F{}`/`$P{}` expressions and
// embedded base64 data are preserved. A name that is identical to the label derived from
// the expression is not stored, because it would not add any information.
export function setImageName(element: DesignElement, name: string): void {
  if (!element || element.type !== "image") return;
  const image = element as any;
  const trimmed = (name || "").trim();
  const value = trimmed === getImageExpressionLabel(element) ? "" : trimmed;
  image.imagePath = value;
  setElementPropertyValue(image, IMAGE_NAME_PROPERTY, value);
}

// Property used to persist a non-destructive image crop inside <reportElement>. The original
// image is kept; only the visible part is stored, as "left,top,right,bottom" insets that are
// fractions (0..1) of the original image, e.g. "0.1,0,0.25,0.05".
export const IMAGE_CROP_PROPERTY = "com.cdp.image.crop";

export interface ImageCrop {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const CROP_EPSILON = 0.0005;

// Get the crop of an image element, or null when the whole image is shown
export function getImageCrop(element: DesignElement): ImageCrop | null {
  if (!element || element.type !== "image") return null;
  const raw = getElementPropertyValue(element, IMAGE_CROP_PROPERTY);
  if (!raw) return null;
  const parts = raw.split(",").map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n >= 1)) {
    return null;
  }
  const [left = 0, top = 0, right = 0, bottom = 0] = parts;
  if (left + right >= 1 || top + bottom >= 1) return null;
  if (parts.every((n) => n < CROP_EPSILON)) return null;
  return { left, top, right, bottom };
}

// Set (or clear, with null / an empty crop) the crop of an image element
export function setImageCrop(element: DesignElement, crop: ImageCrop | null): void {
  if (!element || element.type !== "image") return;
  const values = crop ? [crop.left, crop.top, crop.right, crop.bottom] : [];
  const isEmpty = values.length === 0 || values.every((n) => n < CROP_EPSILON);
  setElementPropertyValue(
    element,
    IMAGE_CROP_PROPERTY,
    isEmpty ? "" : values.map((n) => Math.max(0, n).toFixed(4)).join(","),
  );
}

// Helper to parse box padding or border dimension safely
function parseBoxDimension(val: any): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : Math.max(0, num);
}

// Get the resolved padding (margin) for all four sides of a box
export function getElementBoxPadding(box?: any): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (!box) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  const globalPad = parseBoxDimension(box.padding) ?? 0;
  const top = parseBoxDimension(box.topPadding) ?? globalPad;
  const right = parseBoxDimension(box.rightPadding) ?? globalPad;
  const bottom = parseBoxDimension(box.bottomPadding) ?? globalPad;
  const left = parseBoxDimension(box.leftPadding) ?? globalPad;

  return { top, right, bottom, left };
}

// Get the resolved border widths for all four sides of a box
export function getElementBoxBorderWidths(box?: any): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (!box) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const getSideBorderWidth = (side: 'top' | 'right' | 'bottom' | 'left'): number => {
    const penProperty = side === 'top' ? box.topPen :
                        side === 'left' ? box.leftPen :
                        side === 'bottom' ? box.bottomPen :
                        box.rightPen;

    const sideBorderStyle = side === 'top' ? box.topBorderStyle :
                            side === 'left' ? box.leftBorderStyle :
                            side === 'bottom' ? box.bottomBorderStyle :
                            box.rightBorderStyle;

    const sideBorderWidth = side === 'top' ? box.topBorderWidth :
                            side === 'left' ? box.leftBorderWidth :
                            side === 'bottom' ? box.bottomBorderWidth :
                            box.rightBorderWidth;

    const borderProperty = side === 'top' ? box.topBorder :
                           side === 'left' ? box.leftBorder :
                           side === 'bottom' ? box.bottomBorder :
                           box.rightBorder;

    if (sideBorderStyle === 'None' || sideBorderStyle === 'none' || borderProperty === 'None' || borderProperty === 'none') {
      return 0;
    }

    if (penProperty?.lineWidth !== undefined && penProperty.lineWidth !== '') {
      return Math.max(0, Number(penProperty.lineWidth) || 0);
    }
    if (sideBorderWidth !== undefined && sideBorderWidth !== '') {
      return Math.max(0, Number(sideBorderWidth) || 0);
    }
    if (box.borderWidth !== undefined && box.borderWidth !== '') {
      return Math.max(0, Number(box.borderWidth) || 0);
    }
    if (box.pen?.lineWidth !== undefined && box.pen.lineWidth !== '') {
      return Math.max(0, Number(box.pen.lineWidth) || 0);
    }
    if (borderProperty === 'Thin' || borderProperty === '1Point') return 1;
    if (borderProperty === '2Point' || borderProperty === 'Medium') return 2;
    if (borderProperty === '4Point' || borderProperty === 'Thick') return 4;

    const hasGlobal = (box.pen?.lineStyle && box.pen.lineStyle !== 'None') ||
                      (box.borderStyle && box.borderStyle !== 'None') ||
                      (box.border && box.border !== 'None' && box.border !== '');
    if (hasGlobal) return 1;

    return 0;
  };

  return {
    top: getSideBorderWidth('top'),
    right: getSideBorderWidth('right'),
    bottom: getSideBorderWidth('bottom'),
    left: getSideBorderWidth('left'),
  };
}

// Get combined padding and border insets of a box
export function getElementBoxInsets(box?: any): {
  padding: { top: number; right: number; bottom: number; left: number };
  borders: { top: number; right: number; bottom: number; left: number };
  vertical: number;
  horizontal: number;
} {
  const padding = getElementBoxPadding(box);
  const borders = getElementBoxBorderWidths(box);
  return {
    padding,
    borders,
    vertical: padding.top + padding.bottom + borders.top + borders.bottom,
    horizontal: padding.left + padding.right + borders.left + borders.right,
  };
}

// Calculate the required rendered height for a text field based on its text, width, font, padding, and borders
export interface TextFontDefaults {
  name?: string;
  size?: number;
  isBold?: boolean;
  isItalic?: boolean;
}

// Formatting tags the rich text editor writes into a text expression
export const hasHtmlTags = (str: string): boolean =>
  /<\/?(b|strong|i|em|u|s|strike|del|font|a|span|p|div|br)\b[^>]*>/i.test(str);

export const isRichTextElement = (element: { markup?: string; expression?: string }): boolean =>
  element.markup === 'html' || hasHtmlTags(element.expression || '');

// Removes scripts, embedded content and event handlers from text HTML
export const sanitizeHtml = (html: string): string =>
  html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/javascript:/gi, '');

// HTML the canvas shows for a formatted text expression
export function textExpressionToHtml(expression: string): string {
  let expr = expression || '';
  const trimmed = expr.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    expr = trimmed.slice(1, -1);
  }
  expr = expr.replace(/\\"/g, '"').replace(/\\n/g, '<br>');
  return sanitizeHtml(expr);
}

export function calculateTextElementHeight(
  element: {
    expression?: string;
    fieldName?: string;
    markup?: string;
    width: number;
    fontSize?: number;
    fontFamily?: string;
    isBold?: boolean;
    isItalic?: boolean;
    box?: any;
  },
  // Report default font, used by the canvas when the element sets none
  reportFont: TextFontDefaults = {},
): number {
  if (typeof document === 'undefined') return 20;

  const insets = getElementBoxInsets(element.box);

  const div = document.createElement('div');
  div.style.visibility = 'hidden';
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  div.style.top = '-9999px';
  div.style.width = `${Math.max(element.width || 100, 10)}px`;
  // Same font as the canvas draws (TextFieldElement typographyStyle)
  div.style.fontSize = `${element.fontSize || reportFont.size || 10}px`;
  div.style.fontFamily = element.fontFamily || reportFont.name || 'SansSerif';
  div.style.fontWeight =
    element.isBold === true || (element.isBold === undefined && reportFont.isBold) ? 'bold' : 'normal';
  div.style.fontStyle =
    element.isItalic === true || (element.isItalic === undefined && reportFont.isItalic) ? 'italic' : 'normal';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordBreak = 'break-word';
  div.style.overflowWrap = 'break-word';
  div.style.lineHeight = '1.3';
  div.style.boxSizing = 'border-box';

  div.style.paddingTop = `${insets.padding.top}px`;
  div.style.paddingBottom = `${insets.padding.bottom}px`;
  div.style.paddingLeft = `${insets.padding.left}px`;
  div.style.paddingRight = `${insets.padding.right}px`;

  if (insets.borders.top > 0) div.style.borderTop = `${insets.borders.top}px solid transparent`;
  if (insets.borders.bottom > 0) div.style.borderBottom = `${insets.borders.bottom}px solid transparent`;
  if (insets.borders.left > 0) div.style.borderLeft = `${insets.borders.left}px solid transparent`;
  if (insets.borders.right > 0) div.style.borderRight = `${insets.borders.right}px solid transparent`;

  let raw = element.expression || (element.fieldName ? `$F{${element.fieldName}}` : '');
  const displayText = stripExpressionQuotes(raw).replace(/\\n/g, '\n');
  // Formatted text is measured as the canvas shows it (tags as formatting,
  // not as characters), otherwise it measures too long and too tall
  if (isRichTextElement(element)) {
    div.innerHTML = textExpressionToHtml(raw) || ' ';
  } else {
    div.textContent = displayText || ' ';
  }

  document.body.appendChild(div);
  const domHeight = Math.ceil(div.getBoundingClientRect().height);
  document.body.removeChild(div);

  if (domHeight > 0) {
    return Math.max(domHeight, 15);
  }

  // Fallback for environments without CSS layout engine (e.g. JSDOM in tests)
  const lineCount = Math.max((displayText || ' ').split('\n').length, 1);
  const approxLineHeight = (element.fontSize || 10) * 1.35;
  const estimated = Math.ceil(lineCount * approxLineHeight + insets.vertical);
  return Math.max(estimated, 15);
}

// Get element display info (excluding Band)
export function getElementDisplayInfoWithoutBand(
  element: DesignElement,
): string {
  let info = "";

  // Add type-specific info based on the element type
  if (element.type === "textField") {
    if ((element as any).expression) {
      // Static text is stored as a quoted literal (e.g. `"Hello"`); show it without
      // the quotes so the element list matches what the user actually typed.
      const cleaned = stripExpressionQuotes((element as any).expression);
      info = `${cleaned.substring(0, 15)}${cleaned.length > 15 ? "..." : ""}`;
    } else if ((element as any).fieldName) {
      info = `$F{${(element as any).fieldName}}`;
    }
  } else if (element.type === "image") {
    const imageName = getImageName(element);
    if (imageName) {
      info = imageName;
    } else {
      const label = getImageExpressionLabel(element);
      info =
        label === EMBEDDED_IMAGE_LABEL
          ? label
          : `${label.substring(0, 15)}${label.length > 15 ? "..." : ""}`;
    }
  } else if (element.type === "barcode" && (element as any).codeExpression) {
    info = `${(element as any).codeExpression.substring(0, 15)}${(element as any).codeExpression.length > 15 ? "..." : ""}`;
  } else if (
    element.type === "subreport" &&
    (element as any).subreportExpression
  ) {
    info = `${(element as any).subreportExpression.substring(0, 15)}${(element as any).subreportExpression.length > 15 ? "..." : ""}`;
  }

  return info;
}

// Check whether an element is selected
export function isElementSelected(
  element: {
    element: DesignElement;
    bandIndex: number;
    elementIndex: number;
    parentFrameIndex?: number;
  },
  selectedElement:
    | { bandIndex: number; elementIndex: number; parentFrameIndex?: number }
    | null
    | undefined,
): boolean {
  if (!selectedElement) return false;

  // If both elements have a UUID, prefer comparing by UUID
  if (element.element.uuid && (selectedElement as any).uuid) {
    return element.element.uuid === (selectedElement as any).uuid;
  }

  // Otherwise fall back to position-based comparison
  return (
    selectedElement.bandIndex === element.bandIndex &&
    selectedElement.elementIndex === element.elementIndex &&
    selectedElement.parentFrameIndex === element.parentFrameIndex
  );
}

// Select an element from the list
export function selectElementFromList(
  element: {
    element: DesignElement;
    bandIndex: number;
    elementIndex: number;
    parentFrameIndex?: number;
  },
  selectElement: (
    bandIndex: number,
    elementIndex: number,
    isMultiSelect?: boolean,
    parentFrameIndex?: number,
  ) => void,
): void {
  selectElement(
    element.bandIndex,
    element.elementIndex,
    false,
    element.parentFrameIndex,
  );
}

// Recursively find elements
function findElementsByPredicate(
  bands: any[],
  predicate: (element: DesignElement) => boolean,
  callback: (
    bandIndex: number,
    elementIndex: number,
    parentFrameIndex?: number,
  ) => void,
): boolean {
  let found = false;

  bands.forEach((band, bandIndex) => {
    if (band.elements) {
      band.elements.forEach((element: DesignElement, elementIndex: number) => {
        // Check the element itself
        if (predicate(element)) {
          callback(bandIndex, elementIndex, undefined);
          found = true;
          return;
        }

        // If it's a Frame, recursively check child elements
        if (element.type === "frame" && (element as any).elements) {
          (element as any).elements.forEach(
            (childElement: DesignElement, childIndex: number) => {
              if (predicate(childElement)) {
                callback(bandIndex, childIndex, elementIndex);
                found = true;
              }
            },
          );
        }
      });
    }
  });

  return found;
}

// Select elements by parameter
export function selectElementsByParameter(
  bands: any[],
  paramName: string,
  selectElement: (
    bandIndex: number,
    elementIndex: number,
    isMultiSelect?: boolean,
    parentFrameIndex?: number,
  ) => void,
): void {
  const predicate = (element: DesignElement) => {
    return (
      element.type === "textField" &&
      (element as any).expression &&
      (element as any).expression.includes(`$P{${paramName}}`)
    );
  };

  const found = findElementsByPredicate(
    bands,
    predicate,
    (bandIndex, elementIndex, parentFrameIndex) => {
      selectElement(bandIndex, elementIndex, false, parentFrameIndex);
    },
  );

  // If no element using this parameter was found, a hint could be shown
  if (!found) {
    console.log(`No element found using parameter $P{${paramName}}`);
  }
}

// Select elements by field
export function selectElementsByField(
  bands: any[],
  fieldName: string,
  selectElement: (
    bandIndex: number,
    elementIndex: number,
    isMultiSelect?: boolean,
    parentFrameIndex?: number,
  ) => void,
): void {
  const predicate = (element: DesignElement) => {
    return (
      element.type === "textField" &&
      (element as any).expression &&
      (element as any).expression.includes(`$F{${fieldName}}`)
    );
  };

  const found = findElementsByPredicate(
    bands,
    predicate,
    (bandIndex, elementIndex, parentFrameIndex) => {
      selectElement(bandIndex, elementIndex, false, parentFrameIndex);
    },
  );

  // If no element using this field was found, a hint could be shown
  if (!found) {
    console.log(`No element found using field $F{${fieldName}}`);
  }
}

// Create a new element
export function createNewElement(
  type: string,
  x: number,
  y: number,
): DesignElement {
  let element: DesignElement;
  try {
    element = createElement(type, { x, y });
  } catch {
    element = {
      type: type as any,
      x,
      y,
      width: 100,
      height: 30,
    } as DesignElement;
  }

  // Generate UUID
  if (!element.uuid) {
    element.uuid = crypto.randomUUID();
  }

  return element;
}

// Duplicate an element
export function duplicateElement(
  element: DesignElement,
  offsetX: number = 10,
  offsetY: number = 10,
): DesignElement {
  // Deep clone the element
  const duplicatedElement = JSON.parse(JSON.stringify(element));

  // Generate a new UUID
  duplicatedElement.uuid = crypto.randomUUID();

  // Process border properties, keeping only borders with width greater than 0
  if (duplicatedElement.box) {
    // Process the new border model
    if (duplicatedElement.box.pen && duplicatedElement.box.pen.lineWidth <= 0) {
      delete duplicatedElement.box.pen;
    }

    // Process each side's border
    ["topPen", "leftPen", "bottomPen", "rightPen"].forEach((penType) => {
      if (
        duplicatedElement.box[penType] &&
        duplicatedElement.box[penType].lineWidth <= 0
      ) {
        delete duplicatedElement.box[penType];
      }
    });

    // If the box object is empty, remove the entire box property
    if (Object.keys(duplicatedElement.box).length === 0) {
      delete duplicatedElement.box;
    }
  }

  // Adjust position
  duplicatedElement.x = element.x + offsetX;
  duplicatedElement.y = element.y + offsetY;

  return duplicatedElement;
}

// Check whether a point is inside an element
export function isPointInElement(
  x: number,
  y: number,
  element: DesignElement,
): boolean {
  return (
    x >= element.x &&
    x <= element.x + element.width &&
    y >= element.y &&
    y <= element.y + element.height
  );
}

// Get the bounding box of an element
export function getElementBounds(element: DesignElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

// Get the bounding box of multiple elements
export function getElementsBounds(
  elements: DesignElement[],
): { x: number; y: number; width: number; height: number } | null {
  if (elements.length === 0) return null;

  const minX = Math.min(...elements.map((el) => el.x));
  const minY = Math.min(...elements.map((el) => el.y));
  const maxX = Math.max(...elements.map((el) => el.x + el.width));
  const maxY = Math.max(...elements.map((el) => el.y + el.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ---------------------------------------------------------------------------
// Unique element IDs
// ---------------------------------------------------------------------------
// The canvas tells elements apart by UUID (selection, keys), and JasperReports
// requires them to be unique. A copy needs new ones, including every item
// inside a box and every column, group and cell of a table. A table's dataset
// keeps its ID: a copied table reads the same data.

type WithUuid = { uuid?: string; type?: string; elements?: WithUuid[]; [key: string]: any };

const TABLE_CELLS = ["tableHeader", "columnHeader", "detailCell", "columnFooter", "tableFooter"];

// Calls `visit` for every object with an ID inside a table: columns and column
// groups (in `children` and the older `columns` list), row groups, and the
// elements in its cells (with anything nested in them)
function forEachTableInnerId(table: WithUuid, visit: (holder: WithUuid) => void): void {
  const visitElement = (el: WithUuid) => {
    if (el.uuid) visit(el);
    el.elements?.forEach(visitElement);
  };
  const visitColumn = (col: WithUuid) => {
    if (!col || typeof col !== "object") return;
    if (col.uuid) visit(col);
    for (const key of TABLE_CELLS) {
      const cellElement = col[key]?.element;
      if (cellElement) visitElement(cellElement);
    }
    col.children?.forEach(visitColumn);
  };
  [...(table.children ?? []), ...(table.columns ?? [])].forEach(visitColumn);
  table.rowGroups?.forEach((group: WithUuid) => group?.uuid && visit(group));
}

// Replaces old IDs with new ones; the same old ID always gets the same new one,
// so a column listed in both `children` and `columns` stays one column
function idRenamer(): (old: string | undefined) => string {
  const renamed = new Map<string, string>();
  return (old) => {
    if (!old) return crypto.randomUUID();
    if (!renamed.has(old)) renamed.set(old, crypto.randomUUID());
    return renamed.get(old)!;
  };
}

export function refreshUuids(element: WithUuid): void {
  const fresh = idRenamer();
  const visit = (el: WithUuid) => {
    el.uuid = fresh(el.uuid);
    el.elements?.forEach(visit);
    if (el.type === "table") forEachTableInnerId(el, (holder) => (holder.uuid = fresh(holder.uuid)));
  };
  visit(element);
}

// Gives new IDs where an element (or a table's inner part) reuses an ID that
// another element already has, e.g. copies pasted before copies got their own.
// The first one keeps its ID. Returns whether anything changed.
export function ensureUniqueUuids(bands: { elements?: WithUuid[] }[] | undefined): boolean {
  const seen = new Set<string>();
  let changed = false;
  const visit = (element: WithUuid) => {
    if (element.uuid) {
      if (seen.has(element.uuid)) {
        element.uuid = crypto.randomUUID();
        changed = true;
      }
      seen.add(element.uuid);
    }
    element.elements?.forEach(visit);
    if (element.type === "table") {
      // Inside one table the same column ID appears twice on purpose
      // (children + columns); only a clash with another element counts
      const inner = new Set<string>();
      forEachTableInnerId(element, (holder) => inner.add(holder.uuid!));
      if ([...inner].some((id) => seen.has(id))) {
        const fresh = idRenamer();
        forEachTableInnerId(element, (holder) => (holder.uuid = fresh(holder.uuid)));
        inner.clear();
        forEachTableInnerId(element, (holder) => inner.add(holder.uuid!));
        changed = true;
      }
      inner.forEach((id) => seen.add(id));
    }
  };
  bands?.forEach((band) => band.elements?.forEach(visit));
  return changed;
}
