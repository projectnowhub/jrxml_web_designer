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

// Calculate the required rendered height for a text field based on its text, width, font, and padding
export function calculateTextElementHeight(element: {
  expression?: string;
  fieldName?: string;
  width: number;
  fontSize?: number;
  fontFamily?: string;
  isBold?: boolean;
  isItalic?: boolean;
  box?: any;
}): number {
  if (typeof document === 'undefined') return 20;

  const div = document.createElement('div');
  div.style.visibility = 'hidden';
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  div.style.top = '-9999px';
  div.style.width = `${Math.max(element.width || 100, 10)}px`;
  div.style.fontSize = `${element.fontSize || 10}px`;
  div.style.fontFamily = element.fontFamily || 'SansSerif';
  div.style.fontWeight = element.isBold ? 'bold' : 'normal';
  div.style.fontStyle = element.isItalic ? 'italic' : 'normal';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordBreak = 'break-word';
  div.style.overflowWrap = 'break-word';
  div.style.lineHeight = '1.3';
  div.style.boxSizing = 'border-box';

  if (element.box) {
    const padTop = element.box.topPadding ?? element.box.padding ?? 0;
    const padBottom = element.box.bottomPadding ?? element.box.padding ?? 0;
    const padLeft = element.box.leftPadding ?? element.box.padding ?? 0;
    const padRight = element.box.rightPadding ?? element.box.padding ?? 0;
    div.style.paddingTop = `${padTop}px`;
    div.style.paddingBottom = `${padBottom}px`;
    div.style.paddingLeft = `${padLeft}px`;
    div.style.paddingRight = `${padRight}px`;
  }

  let raw = element.expression || (element.fieldName ? `$F{${element.fieldName}}` : '');
  const displayText = stripExpressionQuotes(raw).replace(/\\n/g, '\n');
  div.textContent = displayText || ' ';

  document.body.appendChild(div);
  const domHeight = Math.ceil(div.getBoundingClientRect().height);
  document.body.removeChild(div);

  if (domHeight > 0) {
    return Math.max(domHeight, 15);
  }

  // Fallback for environments without CSS layout engine (e.g. JSDOM in tests)
  const lineCount = Math.max((displayText || ' ').split('\n').length, 1);
  const approxLineHeight = (element.fontSize || 10) * 1.35;
  const padTop = element.box?.topPadding ?? element.box?.padding ?? 0;
  const padBottom = element.box?.bottomPadding ?? element.box?.padding ?? 0;
  const estimated = Math.ceil(lineCount * approxLineHeight + padTop + padBottom);
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
    if ((element as any).imagePath) {
      info = (element as any).imagePath;
    } else if ((element as any).imageExpression) {
      const expr = ((element as any).imageExpression || "").trim();
      if (expr.startsWith('"data:image/') || expr.startsWith("data:image/")) {
        info = "[Embedded Image]";
      } else {
        const cleaned = expr.replace(/^"|"$/g, "");
        info = `${cleaned.substring(0, 15)}${cleaned.length > 15 ? "..." : ""}`;
      }
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
