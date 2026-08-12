/**
 * MCP Tool Handlers - Tool handler implementations
 *
 * Implements the core logic for all MCP tools, ensuring integration with the Vue reactivity system
 */

import type { DesignElement, Band, BandType } from '@/types';
import { createNewElement } from '@/utils/elementUtils';

// ============================================
// Type definitions
// ============================================

export interface MCPToolResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface MCPToolCall {
  name: string;
  params: Record<string, any>;
}

export interface MCPToolHandler {
  execute: (params: Record<string, any>, context: MCPContext) => Promise<MCPToolResult>;
}

export interface MCPContext {
  bands: Band[];
  reportProperties: any;
  fields: any[];
  parameters: any[];
  variables: any[];
  saveStateToHistory: () => void;
  updateJRXML: () => void;
  selectElement: (bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number) => void;
  selectedElement?: any;
  selectedElements?: any[];
  undo?: () => Promise<void>;
  redo?: () => Promise<void>;
}

// ============================================
// Query tool handlers
// ============================================

const getDesignStateHandler: MCPToolHandler = {
  execute: async (params, context) => {
    return {
      success: true,
      data: {
        reportProperties: context.reportProperties,
        bands: context.bands.map(band => ({
          type: band.type,
          height: band.height,
          elementsCount: band.elements?.length || 0
        })),
        fields: context.fields,
        parameters: context.parameters,
        variables: context.variables
      }
    };
  }
};

const getElementHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuid } = params;

    for (const band of context.bands) {
      const element = band.elements?.find(e => e.uuid === uuid);
      if (element) {
        return {
          success: true,
          data: {
            ...element,
            bandType: band.type
          }
        };
      }
    }

    return {
      success: false,
      error: `Element with UUID ${uuid} not found`
    };
  }
};

const findElementsHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { fieldName, parameterName, elementType, text } = params;
    const results: Array<{
      element: DesignElement;
      bandType: BandType;
      index: number;
      parentFrameIndex?: number;
    }> = [];

    for (const band of context.bands) {
      if (!band.elements) continue;

      band.elements.forEach((element, index) => {
        let matches = true;

        // Filter by field name
        if (fieldName) {
          const hasField = element.type === 'textField' &&
            (element as any).expression?.includes(`$F{${fieldName}}`);
          if (!hasField) matches = false;
        }

        // Filter by parameter name
        if (parameterName) {
          const hasParam = element.type === 'textField' &&
            (element as any).expression?.includes(`$P{${parameterName}}`);
          if (!hasParam) matches = false;
        }

        // Filter by element type
        if (elementType && element.type !== elementType) {
          matches = false;
        }

        // Filter by text content
        if (text) {
          const elementText = (element as any).text || (element as any).expression || '';
          if (!elementText.toLowerCase().includes(text.toLowerCase())) {
            matches = false;
          }
        }

        if (matches) {
          results.push({
            element,
            bandType: band.type,
            index,
            parentFrameIndex: undefined
          });
        }
      });
    }

    return {
      success: true,
      data: results
    };
  }
};

// ============================================
// Create tool handlers
// ============================================

const createStaticTextHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const {
      bandType,
      x,
      y,
      width,
      height,
      text,
      fontSize = 12,
      fontFamily = 'Arial',
      isBold = false,
      isItalic = false,
      forecolor = '#000000',
      backcolor = 'transparent',
      textAlignment = 'Left'
    } = params;

    // Find the index of the target band
    const bandIndex = context.bands.findIndex(b => b.type === bandType);
    if (bandIndex === -1) {
      return {
        success: false,
        error: `Band ${bandType} not found`
      };
    }

    // Create the element
    const newElement = createNewElement('staticText', x, y) as any;
    Object.assign(newElement, {
      width,
      height,
      text,
      fontSize,
      fontFamily,
      isBold,
      isItalic,
      forecolor,
      backcolor,
      textAlignment
    });

    // Key: mutate the reactive array directly so Vue detects the change
    const band = context.bands[bandIndex];
    if (band) {
      if (!band.elements) {
        band.elements = [];
      }

      // Use push() so Vue detects the array change
      band.elements.push(newElement);

      // Save history and update the JRXML
      context.saveStateToHistory();
      context.updateJRXML();

      // Key: force-trigger Vue's reactive update
      // Trigger Vue's update by reassigning the bands array
      const newBands = [...context.bands];
      context.bands.length = 0;
      context.bands.push(...newBands);
    }

    return {
      success: true,
      data: {
        uuid: newElement.uuid,
        message: `Created static text "${text}" in ${bandType} band`
      }
    };
  }
};

const createTextFieldHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const {
      bandType,
      x,
      y,
      width,
      height,
      expression,
      fontSize = 12,
      fontFamily = 'Arial',
      isBold = false,
      pattern
    } = params;

    // Find the index of the target band
    const bandIndex = context.bands.findIndex(b => b.type === bandType);
    if (bandIndex === -1) {
      return {
        success: false,
        error: `Band ${bandType} not found`
      };
    }

    // Create the element
    const newElement = createNewElement('textField', x, y) as any;
    Object.assign(newElement, {
      width,
      height,
      expression,
      fontSize,
      fontFamily,
      isBold,
      pattern
    });

    // Mutate the reactive array directly
    const band = context.bands[bandIndex];
    if (band) {
      if (!band.elements) {
        band.elements = [];
      }
      band.elements.push(newElement);

      // Save history and update the JRXML
      context.saveStateToHistory();
      context.updateJRXML();
    }

    return {
      success: true,
      data: {
        uuid: newElement.uuid,
        message: `Created text field with expression "${expression}" in ${bandType} band`
      }
    };
  }
};

const createRectangleHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const {
      bandType,
      x,
      y,
      width,
      height,
      forecolor = '#000000',
      backcolor = 'transparent',
      mode = 'Opaque',
      lineWidth = 1,
      lineStyle = 'Solid'
    } = params;

    // Find the index of the target band
    const bandIndex = context.bands.findIndex(b => b.type === bandType);
    if (bandIndex === -1) {
      return {
        success: false,
        error: `Band ${bandType} not found`
      };
    }

    // Create the element
    const newElement = createNewElement('rectangle', x, y) as any;
    Object.assign(newElement, {
      width,
      height,
      forecolor,
      backcolor,
      mode,
      pen: {
        lineWidth,
        lineStyle,
        lineColor: forecolor
      }
    });

    // Mutate the reactive array directly
    const band = context.bands[bandIndex];
    if (band) {
      if (!band.elements) {
        band.elements = [];
      }
      band.elements.push(newElement);

      // Save history and update the JRXML
      context.saveStateToHistory();
      context.updateJRXML();
    }

    return {
      success: true,
      data: {
        uuid: newElement.uuid,
        message: `Created rectangle in ${bandType} band`
      }
    };
  }
};

const createFrameHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const {
      bandType,
      x,
      y,
      width,
      height,
      borderColor,
      backgroundColor
    } = params;

    // Find the index of the target band
    const bandIndex = context.bands.findIndex(b => b.type === bandType);
    if (bandIndex === -1) {
      return {
        success: false,
        error: `Band ${bandType} not found`
      };
    }

    // Create the element
    const newElement = createNewElement('frame', x, y) as any;
    Object.assign(newElement, {
      width,
      height,
      elements: [],
      borderColor,
      backgroundColor
    });

    // Mutate the reactive array directly
    const band = context.bands[bandIndex];
    if (band) {
      if (!band.elements) {
        band.elements = [];
      }
      band.elements.push(newElement);

      // Save history and update the JRXML
      context.saveStateToHistory();
      context.updateJRXML();
    }

    return {
      success: true,
      data: {
        uuid: newElement.uuid,
        message: `Created frame in ${bandType} band`
      }
    };
  }
};

// ============================================
// Modify tool handlers
// ============================================

const updateElementHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuid, properties } = params;

    // Find the element
    for (const band of context.bands) {
      const elementIndex = band.elements?.findIndex(e => e.uuid === uuid);
      if (elementIndex !== undefined && elementIndex !== -1) {
        const element = band.elements[elementIndex];
        if (element) {
          // Update properties
          Object.assign(element, properties);

          // Save history and update
          context.saveStateToHistory();
          context.updateJRXML();

          // Key: force-trigger Vue's reactive update
          const newBands = [...context.bands];
          context.bands.length = 0;
          context.bands.push(...newBands);

          return {
            success: true,
            data: {
              message: `Updated element ${uuid} with properties: ${Object.keys(properties).join(', ')}`
            }
          };
        }
      }
    }

    return {
      success: false,
      error: `Element with UUID ${uuid} not found`
    };
  }
};

const moveElementHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuid, x, y } = params;

    // Find the element
    for (const band of context.bands) {
      const element = band.elements?.find(e => e.uuid === uuid);
      if (element) {
        // Update position
        element.x = x;
        element.y = y;

        // Save history and update
        context.saveStateToHistory();
        context.updateJRXML();

        // Key: force-trigger Vue's reactive update
        const newBands = [...context.bands];
        context.bands.length = 0;
        context.bands.push(...newBands);

        return {
          success: true,
          data: {
            message: `Moved element ${uuid} to position (${x}, ${y})`
          }
        };
      }
    }

    return {
      success: false,
      error: `Element with UUID ${uuid} not found`
    };
  }
};

// ============================================
// Delete tool handlers
// ============================================

const deleteElementHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuid } = params;

    for (const band of context.bands) {
      if (!band.elements) continue;

      const elementIndex = band.elements.findIndex(e => e.uuid === uuid);
      if (elementIndex !== -1) {
        // Delete the element
        band.elements.splice(elementIndex, 1);

        // Save history and update
        context.saveStateToHistory();
        context.updateJRXML();

        // Key: force-trigger Vue's reactive update
        const newBands = [...context.bands];
        context.bands.length = 0;
        context.bands.push(...newBands);

        return {
          success: true,
          data: {
            message: `Deleted element ${uuid}`
          }
        };
      }
    }

    return {
      success: false,
      error: `Element with UUID ${uuid} not found`
    };
  }
};

// ============================================
// Batch operation tool handlers
// ============================================

const deleteElementsHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuids } = params;
    let deletedCount = 0;

    for (const uuid of uuids) {
      for (const band of context.bands) {
        if (!band.elements) continue;

        const elementIndex = band.elements.findIndex(e => e.uuid === uuid);
        if (elementIndex !== -1) {
          band.elements.splice(elementIndex, 1);
          deletedCount++;
          break;
        }
      }
    }

    if (deletedCount > 0) {
      context.saveStateToHistory();
      context.updateJRXML();

      const newBands = [...context.bands];
      context.bands.length = 0;
      context.bands.push(...newBands);

      return {
        success: true,
        data: {
          message: `Deleted ${deletedCount} elements successfully`
        }
      };
    }

    return {
      success: false,
      error: 'No elements found with the provided UUIDs'
    };
  }
};

const moveElementsHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuids, deltaX, deltaY } = params;
    let movedCount = 0;

    for (const uuid of uuids) {
      for (const band of context.bands) {
        const element = band.elements?.find(e => e.uuid === uuid);
        if (element) {
          element.x = Math.max(0, element.x + deltaX);
          element.y = Math.max(0, element.y + deltaY);
          movedCount++;
          break;
        }
      }
    }

    if (movedCount > 0) {
      context.saveStateToHistory();
      context.updateJRXML();

      const newBands = [...context.bands];
      context.bands.length = 0;
      context.bands.push(...newBands);

      return {
        success: true,
        data: {
          message: `Moved ${movedCount} elements by (${deltaX}, ${deltaY})`
        }
      };
    }

    return {
      success: false,
      error: 'No elements found with the provided UUIDs'
    };
  }
};

const updateElementsStyleHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuids, fontSize, fontFamily, isBold, isItalic, forecolor, backcolor } = params;
    let updatedCount = 0;

    for (const uuid of uuids) {
      for (const band of context.bands) {
        const element = band.elements?.find(e => e.uuid === uuid);
        if (element) {
          if (fontSize !== undefined) (element as any).fontSize = fontSize;
          if (fontFamily !== undefined) (element as any).fontFamily = fontFamily;
          if (isBold !== undefined) (element as any).isBold = isBold;
          if (isItalic !== undefined) (element as any).isItalic = isItalic;
          if (forecolor !== undefined) element.forecolor = forecolor;
          if (backcolor !== undefined) element.backcolor = backcolor;
          updatedCount++;
          break;
        }
      }
    }

    if (updatedCount > 0) {
      context.saveStateToHistory();
      context.updateJRXML();

      const newBands = [...context.bands];
      context.bands.length = 0;
      context.bands.push(...newBands);

      return {
        success: true,
        data: {
          message: `Updated style for ${updatedCount} elements`
        }
      };
    }

    return {
      success: false,
      error: 'No elements found with the provided UUIDs'
    };
  }
};

// ============================================
// Resize and alignment tool handlers
// ============================================

const resizeElementHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuid, width, height } = params;

    for (const band of context.bands) {
      const element = band.elements?.find(e => e.uuid === uuid);
      if (element) {
        if (width !== undefined) element.width = Math.max(1, width);
        if (height !== undefined) element.height = Math.max(1, height);

        context.saveStateToHistory();
        context.updateJRXML();

        const newBands = [...context.bands];
        context.bands.length = 0;
        context.bands.push(...newBands);

        return {
          success: true,
          data: {
            message: `Resized element ${uuid} to (${element.width}x${element.height})`
          }
        };
      }
    }

    return {
      success: false,
      error: `Element with UUID ${uuid} not found`
    };
  }
};

const resizeElementsHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuids, width, height } = params;
    let resizedCount = 0;

    for (const uuid of uuids) {
      for (const band of context.bands) {
        const element = band.elements?.find(e => e.uuid === uuid);
        if (element) {
          if (width !== undefined) element.width = Math.max(1, width);
          if (height !== undefined) element.height = Math.max(1, height);
          resizedCount++;
          break;
        }
      }
    }

    if (resizedCount > 0) {
      context.saveStateToHistory();
      context.updateJRXML();

      const newBands = [...context.bands];
      context.bands.length = 0;
      context.bands.push(...newBands);

      return {
        success: true,
        data: {
          message: `Resized ${resizedCount} elements`
        }
      };
    }

    return {
      success: false,
      error: 'No elements found with the provided UUIDs'
    };
  }
};

const alignElementsHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuids, alignment } = params;
    const elements: Array<{ element: DesignElement; band: Band }> = [];

    // Find all elements
    for (const uuid of uuids) {
      for (const band of context.bands) {
        const element = band.elements?.find(e => e.uuid === uuid);
        if (element) {
          elements.push({ element, band });
          break;
        }
      }
    }

    if (elements.length < 2) {
      return {
        success: false,
        error: 'Need at least 2 elements to align'
      };
    }

    // Compute the target position based on the alignment
    let targetValue: number;
    switch (alignment) {
      case 'left':
        targetValue = Math.min(...elements.map(e => e.element.x));
        elements.forEach(e => e.element.x = targetValue);
        break;
      case 'right':
        targetValue = Math.max(...elements.map(e => e.element.x + e.element.width));
        elements.forEach(e => e.element.x = targetValue - e.element.width);
        break;
      case 'center':
        const centerX = Math.min(...elements.map(e => e.element.x)) +
          Math.max(...elements.map(e => e.element.x + e.element.width)) / 2;
        elements.forEach(e => e.element.x = centerX - e.element.width / 2);
        break;
      case 'top':
        targetValue = Math.min(...elements.map(e => e.element.y));
        elements.forEach(e => e.element.y = targetValue);
        break;
      case 'bottom':
        targetValue = Math.max(...elements.map(e => e.element.y + e.element.height));
        elements.forEach(e => e.element.y = targetValue - e.element.height);
        break;
      case 'middle':
        const centerY = Math.min(...elements.map(e => e.element.y)) +
          Math.max(...elements.map(e => e.element.y + e.element.height)) / 2;
        elements.forEach(e => e.element.y = centerY - e.element.height / 2);
        break;
    }

    context.saveStateToHistory();
    context.updateJRXML();

    const newBands = [...context.bands];
    context.bands.length = 0;
    context.bands.push(...newBands);

    return {
      success: true,
      data: {
        message: `Aligned ${elements.length} elements to ${alignment}`
      }
    };
  }
};

const distributeElementsHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { uuids, direction } = params;
    const elements: Array<{ element: DesignElement; band: Band }> = [];

    for (const uuid of uuids) {
      for (const band of context.bands) {
        const element = band.elements?.find(e => e.uuid === uuid);
        if (element) {
          elements.push({ element, band });
          break;
        }
      }
    }

    if (elements.length < 3) {
      return {
        success: false,
        error: 'Need at least 3 elements to distribute'
      };
    }

    // Sort by position
    if (direction === 'horizontal') {
      elements.sort((a, b) => a.element.x - b.element.x);
      const totalWidth = elements.reduce((sum, e) => sum + e.element.width, 0);
      const firstElem = elements[0];
      if (!firstElem) {
        return { success: false, error: 'Unexpected error: no elements' };
      }
      const startX = firstElem.element.x;
      const lastElem = elements[elements.length - 1];
      if (!lastElem) {
        return { success: false, error: 'Unexpected error: no last element' };
      }
      const totalSpace = (lastElem.element.x + lastElem.element.width) - startX;
      const spacing = (totalSpace - totalWidth) / (elements.length - 1);

      let currentX = startX;
      elements.forEach(e => {
        e.element.x = currentX;
        currentX += e.element.width + spacing;
      });
    } else {
      elements.sort((a, b) => a.element.y - b.element.y);
      const totalHeight = elements.reduce((sum, e) => sum + e.element.height, 0);
      const firstElem = elements[0];
      if (!firstElem) {
        return { success: false, error: 'Unexpected error: no elements' };
      }
      const startY = firstElem.element.y;
      const lastElem = elements[elements.length - 1];
      if (!lastElem) {
        return { success: false, error: 'Unexpected error: no last element' };
      }
      const totalSpace = (lastElem.element.y + lastElem.element.height) - startY;
      const spacing = (totalSpace - totalHeight) / (elements.length - 1);

      let currentY = startY;
      elements.forEach(e => {
        e.element.y = currentY;
        currentY += e.element.height + spacing;
      });
    }

    context.saveStateToHistory();
    context.updateJRXML();

    const newBands = [...context.bands];
    context.bands.length = 0;
    context.bands.push(...newBands);

    return {
      success: true,
      data: {
        message: `Distributed ${elements.length} elements ${direction === 'horizontal' ? 'horizontally' : 'vertically'}`
      }
    };
  }
};

// ============================================
// Undo/redo tool handlers
// ============================================

const undoHandler: MCPToolHandler = {
  execute: async (params, context) => {
    try {
      // Call the parent component's undo function
      if (typeof context.undo === 'function') {
        await context.undo();
        return {
          success: true,
          data: {
            message: 'Undone successfully'
          }
        };
      }
      return {
        success: false,
        error: 'Undo function not available'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to undo'
      };
    }
  }
};

const redoHandler: MCPToolHandler = {
  execute: async (params, context) => {
    try {
      if (typeof context.redo === 'function') {
        await context.redo();
        return {
          success: true,
          data: {
            message: 'Redone successfully'
          }
        };
      }
      return {
        success: false,
        error: 'Redo function not available'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to redo'
      };
    }
  }
};

// ============================================
// Report property tool handlers
// ============================================

const updateReportPropertiesHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const updates = Object.keys(params).filter(k => params[k] !== undefined);

    if (updates.length === 0) {
      return {
        success: false,
        error: 'No properties to update'
      };
    }

    updates.forEach(key => {
      if (params[key] !== undefined) {
        (context.reportProperties as any)[key] = params[key];
      }
    });

    context.saveStateToHistory();
    context.updateJRXML();

    return {
      success: true,
      data: {
        message: `Updated report properties: ${updates.join(', ')}`
      }
    };
  }
};

const addFieldHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { name, classType = 'java.lang.String', description } = params;

    // Check whether a field with the same name already exists
    const exists = context.fields.some(f => f.name === name);
    if (exists) {
      return {
        success: false,
        error: `Field with name "${name}" already exists`
      };
    }

    context.fields.push({
      name,
      classType,
      description: description || '',
      isForPrompting: true
    });

    context.saveStateToHistory();
    context.updateJRXML();

    return {
      success: true,
      data: {
        message: `Added field "${name}" of type ${classType}`
      }
    };
  }
};

const addParameterHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { name, classType = 'java.lang.String', description, defaultValue } = params;

    const exists = context.parameters.some(p => p.name === name);
    if (exists) {
      return {
        success: false,
        error: `Parameter with name "${name}" already exists`
      };
    }

    context.parameters.push({
      name,
      classType,
      description: description || '',
      defaultValue: defaultValue || ''
    });

    context.saveStateToHistory();
    context.updateJRXML();

    return {
      success: true,
      data: {
        message: `Added parameter "${name}" of type ${classType}`
      }
    };
  }
};

const updateBandHeightHandler: MCPToolHandler = {
  execute: async (params, context) => {
    const { bandType, height } = params;

    // Find the index of the band
    const bandIndex = context.bands.findIndex(b => b.type === bandType);
    if (bandIndex === -1) {
      return {
        success: false,
        error: `Band ${bandType} not found`
      };
    }

    // Update the height
    const band = context.bands[bandIndex];
    if (band) {
      band.height = height;

      // Save history and update
      context.saveStateToHistory();
      context.updateJRXML();
    }

    return {
      success: true,
      data: {
        message: `Updated ${bandType} band height to ${height}px`
      }
    };
  }
};

// ============================================
// Tool handler map
// ============================================

export const MCPToolHandlers: Record<string, MCPToolHandler> = {
  // Query tools
  'get_design_state': getDesignStateHandler,
  'get_element': getElementHandler,
  'find_elements': findElementsHandler,
  // Create tools
  'create_static_text': createStaticTextHandler,
  'create_text_field': createTextFieldHandler,
  'create_rectangle': createRectangleHandler,
  'create_frame': createFrameHandler,
  // Modify tools
  'update_element': updateElementHandler,
  'move_element': moveElementHandler,
  // Delete tools
  'delete_element': deleteElementHandler,
  // Band operation tools
  'update_band_height': updateBandHeightHandler,
  // Batch operation tools
  'delete_elements': deleteElementsHandler,
  'move_elements': moveElementsHandler,
  'update_elements_style': updateElementsStyleHandler,
  // Resize and alignment tools
  'resize_element': resizeElementHandler,
  'resize_elements': resizeElementsHandler,
  'align_elements': alignElementsHandler,
  'distribute_elements': distributeElementsHandler,
  // Undo/redo tools
  'undo': undoHandler,
  'redo': redoHandler,
  // Report property tools
  'update_report_properties': updateReportPropertiesHandler,
  'add_field': addFieldHandler,
  'add_parameter': addParameterHandler
};

// ============================================
// Tool execution interface
// ============================================

/**
 * Execute an MCP tool
 */
export async function executeMCPTool(
  toolCall: MCPToolCall,
  context: MCPContext
): Promise<MCPToolResult> {
  const handler = MCPToolHandlers[toolCall.name];

  if (!handler) {
    return {
      success: false,
      error: `Unknown tool: ${toolCall.name}`
    };
  }

  try {
    return await handler.execute(toolCall.params, context);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Execute MCP tools in batch
 */
export async function executeMCPToolsBatch(
  toolCalls: MCPToolCall[],
  context: MCPContext
): Promise<MCPToolResult[]> {
  const results: MCPToolResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executeMCPTool(toolCall, context);
    results.push(result);

    // If a tool execution fails, stop the batch
    if (!result.success) {
      break;
    }
  }

  return results;
}
