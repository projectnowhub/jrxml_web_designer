// Element-related utility functions

import type { DesignElement } from '@/types';
import { getElementConfig, createElement } from '@/components/elements/ElementRegistry';

// Get the unique key for an element
export function getElementKey(element: { element: DesignElement, bandIndex: number, elementIndex: number, parentFrameIndex?: number }): string {
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
  return config?.icon || '?';
}

// Get the element SVG icon
export function getElementIconSvg(type: string): string | undefined {
  const config = getElementConfig(type);
  return config?.iconSvg;
}

// Get element display info (excluding Band)
export function getElementDisplayInfoWithoutBand(element: DesignElement): string {
  let info = '';

  // Add type-specific info based on the element type
  if (element.type === 'staticText' && (element as any).text) {
    info = `${(element as any).text.substring(0, 15)}${(element as any).text.length > 15 ? '...' : ''}`;
  } else if (element.type === 'textField') {
    if ((element as any).expression) {
      info = `${(element as any).expression.substring(0, 15)}${(element as any).expression.length > 15 ? '...' : ''}`;
    } else if ((element as any).fieldName) {
      info = `$F{${(element as any).fieldName}}`;
    }
  } else if (element.type === 'image' && (element as any).imagePath) {
    info = (element as any).imagePath;
  }

  return info;
}

// Check whether an element is selected
export function isElementSelected(element: { element: DesignElement, bandIndex: number, elementIndex: number, parentFrameIndex?: number }, selectedElement: { bandIndex: number, elementIndex: number, parentFrameIndex?: number } | null | undefined): boolean {
  if (!selectedElement) return false;

  // If both elements have a UUID, prefer comparing by UUID
  if (element.element.uuid && (selectedElement as any).uuid) {
    return element.element.uuid === (selectedElement as any).uuid;
  }

  // Otherwise fall back to position-based comparison
  return selectedElement.bandIndex === element.bandIndex &&
         selectedElement.elementIndex === element.elementIndex &&
         selectedElement.parentFrameIndex === element.parentFrameIndex;
}

// Select an element from the list
export function selectElementFromList(element: { element: DesignElement, bandIndex: number, elementIndex: number, parentFrameIndex?: number }, selectElement: (bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number) => void): void {
  selectElement(element.bandIndex, element.elementIndex, false, element.parentFrameIndex);
}

// Recursively find elements
function findElementsByPredicate(bands: any[], predicate: (element: DesignElement) => boolean, callback: (bandIndex: number, elementIndex: number, parentFrameIndex?: number) => void): boolean {
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
        if (element.type === 'frame' && (element as any).elements) {
          (element as any).elements.forEach((childElement: DesignElement, childIndex: number) => {
            if (predicate(childElement)) {
              callback(bandIndex, childIndex, elementIndex);
              found = true;
            }
          });
        }
      });
    }
  });

  return found;
}

// Select elements by parameter
export function selectElementsByParameter(bands: any[], paramName: string, selectElement: (bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number) => void): void {
  const predicate = (element: DesignElement) => {
    return element.type === 'textField' && (element as any).expression && (element as any).expression.includes(`$P{${paramName}}`);
  };

  const found = findElementsByPredicate(bands, predicate, (bandIndex, elementIndex, parentFrameIndex) => {
    selectElement(bandIndex, elementIndex, false, parentFrameIndex);
  });

  // If no element using this parameter was found, a hint could be shown
  if (!found) {
    console.log(`No element found using parameter $P{${paramName}}`);
  }
}

// Select elements by field
export function selectElementsByField(bands: any[], fieldName: string, selectElement: (bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number) => void): void {
  const predicate = (element: DesignElement) => {
    return element.type === 'textField' && (element as any).expression && (element as any).expression.includes(`$F{${fieldName}}`);
  };

  const found = findElementsByPredicate(bands, predicate, (bandIndex, elementIndex, parentFrameIndex) => {
    selectElement(bandIndex, elementIndex, false, parentFrameIndex);
  });

  // If no element using this field was found, a hint could be shown
  if (!found) {
    console.log(`No element found using field $F{${fieldName}}`);
  }
}

// Create a new element
export function createNewElement(type: string, x: number, y: number): DesignElement {
  let element: DesignElement;
  try {
    element = createElement(type, { x, y });
  } catch {
    element = {
      type: type as any,
      x,
      y,
      width: 100,
      height: 30
    } as DesignElement;
  }

  // Generate UUID
  if (!element.uuid) {
    element.uuid = crypto.randomUUID();
  }

  return element;
}

// Duplicate an element
export function duplicateElement(element: DesignElement, offsetX: number = 10, offsetY: number = 10): DesignElement {
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
    ['topPen', 'leftPen', 'bottomPen', 'rightPen'].forEach(penType => {
      if (duplicatedElement.box[penType] && duplicatedElement.box[penType].lineWidth <= 0) {
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
export function isPointInElement(x: number, y: number, element: DesignElement): boolean {
  return x >= element.x &&
         x <= element.x + element.width &&
         y >= element.y &&
         y <= element.y + element.height;
}

// Get the bounding box of an element
export function getElementBounds(element: DesignElement): { x: number, y: number, width: number, height: number } {
  return {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
  };
}

// Get the bounding box of multiple elements
export function getElementsBounds(elements: DesignElement[]): { x: number, y: number, width: number, height: number } | null {
  if (elements.length === 0) return null;

  const minX = Math.min(...elements.map(el => el.x));
  const minY = Math.min(...elements.map(el => el.y));
  const maxX = Math.max(...elements.map(el => el.x + el.width));
  const maxY = Math.max(...elements.map(el => el.y + el.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
