/**
 * MCP Tool Schemas - Tool schema definitions
 *
 * Defines the input schema for all MCP tools, for use by the local AI model
 */

export interface MCPToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

// ============================================
// Query tools
// ============================================

export const GET_DESIGN_STATE_SCHEMA: MCPToolSchema = {
  name: 'get_design_state',
  description: "Get the current report's design state, including all elements, bands, fields, parameters, and more",
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
};

export const GET_ELEMENT_SCHEMA: MCPToolSchema = {
  name: 'get_element',
  description: 'Get detailed information about a specified element',
  inputSchema: {
    type: 'object',
    properties: {
      uuid: {
        type: 'string',
        description: 'UUID identifier of the element'
      }
    },
    required: ['uuid']
  }
};

export const FIND_ELEMENTS_SCHEMA: MCPToolSchema = {
  name: 'find_elements',
  description: 'Find elements by criteria (field name, parameter name, element type, or text content)',
  inputSchema: {
    type: 'object',
    properties: {
      fieldName: {
        type: 'string',
        description: 'Find by field name'
      },
      parameterName: {
        type: 'string',
        description: 'Find by parameter name'
      },
      elementType: {
        type: 'string',
        description: 'Find by element type',
        enum: ['staticText', 'textField', 'image', 'line', 'rectangle', 'ellipse', 'break', 'frame', 'table']
      },
      text: {
        type: 'string',
        description: 'Find by displayed text (partial match)'
      }
    },
    required: []
  }
};

// ============================================
// Create tools
// ============================================

export const CREATE_STATIC_TEXT_SCHEMA: MCPToolSchema = {
  name: 'create_static_text',
  description: 'Create a static text element',
  inputSchema: {
    type: 'object',
    properties: {
      bandType: {
        type: 'string',
        description: 'Target band type',
        enum: ['detail', 'pageHeader', 'pageFooter', 'title', 'summary', 'columnHeader', 'columnFooter', 'background', 'lastPageFooter', 'noData']
      },
      x: {
        type: 'number',
        description: 'X coordinate position'
      },
      y: {
        type: 'number',
        description: 'Y coordinate position'
      },
      width: {
        type: 'number',
        description: 'Element width'
      },
      height: {
        type: 'number',
        description: 'Element height'
      },
      text: {
        type: 'string',
        description: 'Static text content'
      },
      fontSize: {
        type: 'number',
        description: 'Font size (default 12)'
      },
      fontFamily: {
        type: 'string',
        description: 'Font name (default Arial)'
      },
      isBold: {
        type: 'boolean',
        description: 'Whether bold'
      },
      isItalic: {
        type: 'boolean',
        description: 'Whether italic'
      },
      forecolor: {
        type: 'string',
        description: 'Foreground color (e.g. "#000000")'
      },
      backcolor: {
        type: 'string',
        description: 'Background color'
      },
      textAlignment: {
        type: 'string',
        description: 'Text alignment',
        enum: ['Left', 'Center', 'Right', 'Justified']
      }
    },
    required: ['bandType', 'x', 'y', 'width', 'height', 'text']
  }
};

export const CREATE_TEXT_FIELD_SCHEMA: MCPToolSchema = {
  name: 'create_text_field',
  description: 'Create a dynamic text field for displaying a field value or expression',
  inputSchema: {
    type: 'object',
    properties: {
      bandType: {
        type: 'string',
        description: 'Target band type',
        enum: ['detail', 'pageHeader', 'pageFooter', 'title', 'summary', 'columnHeader', 'columnFooter', 'background', 'lastPageFooter', 'noData']
      },
      x: {
        type: 'number',
        description: 'X coordinate position'
      },
      y: {
        type: 'number',
        description: 'Y coordinate position'
      },
      width: {
        type: 'number',
        description: 'Element width'
      },
      height: {
        type: 'number',
        description: 'Element height'
      },
      expression: {
        type: 'string',
        description: 'Expression, e.g. "$F{fieldName}" or "$V{variableName}"'
      },
      fontSize: {
        type: 'number',
        description: 'Font size (default 12)'
      },
      fontFamily: {
        type: 'string',
        description: 'Font name (default Arial)'
      },
      isBold: {
        type: 'boolean',
        description: 'Whether bold'
      },
      pattern: {
        type: 'string',
        description: 'Format pattern (e.g. "#,##0.00")'
      }
    },
    required: ['bandType', 'x', 'y', 'width', 'height', 'expression']
  }
};

export const CREATE_RECTANGLE_SCHEMA: MCPToolSchema = {
  name: 'create_rectangle',
  description: 'Create a rectangle element',
  inputSchema: {
    type: 'object',
    properties: {
      bandType: {
        type: 'string',
        description: 'Target band type',
        enum: ['detail', 'pageHeader', 'pageFooter', 'title', 'summary', 'columnHeader', 'columnFooter', 'background', 'lastPageFooter', 'noData']
      },
      x: {
        type: 'number',
        description: 'X coordinate position'
      },
      y: {
        type: 'number',
        description: 'Y coordinate position'
      },
      width: {
        type: 'number',
        description: 'Element width'
      },
      height: {
        type: 'number',
        description: 'Element height'
      },
      forecolor: {
        type: 'string',
        description: 'Foreground color (border color)'
      },
      backcolor: {
        type: 'string',
        description: 'Background color'
      },
      mode: {
        type: 'string',
        description: 'Display mode',
        enum: ['Opaque', 'Transparent']
      },
      lineWidth: {
        type: 'number',
        description: 'Border width'
      },
      lineStyle: {
        type: 'string',
        description: 'Border style',
        enum: ['Solid', 'Dashed', 'Dotted']
      }
    },
    required: ['bandType', 'x', 'y', 'width', 'height']
  }
};

export const CREATE_FRAME_SCHEMA: MCPToolSchema = {
  name: 'create_frame',
  description: 'Create a Frame container element that can hold other elements',
  inputSchema: {
    type: 'object',
    properties: {
      bandType: {
        type: 'string',
        description: 'Target band type',
        enum: ['detail', 'pageHeader', 'pageFooter', 'title', 'summary', 'columnHeader', 'columnFooter', 'background', 'lastPageFooter', 'noData']
      },
      x: {
        type: 'number',
        description: 'X coordinate position'
      },
      y: {
        type: 'number',
        description: 'Y coordinate position'
      },
      width: {
        type: 'number',
        description: 'Frame width'
      },
      height: {
        type: 'number',
        description: 'Frame height'
      },
      borderColor: {
        type: 'string',
        description: 'Border color'
      },
      backgroundColor: {
        type: 'string',
        description: 'Background color'
      }
    },
    required: ['bandType', 'x', 'y', 'width', 'height']
  }
};

// ============================================
// Modify tools
// ============================================

export const UPDATE_ELEMENT_SCHEMA: MCPToolSchema = {
  name: 'update_element',
  description: 'Update one or more properties of a specified element',
  inputSchema: {
    type: 'object',
    properties: {
      uuid: {
        type: 'string',
        description: 'UUID identifier of the element'
      },
      properties: {
        type: 'object',
        description: 'Key-value pairs of properties to update',
        properties: {
          x: { type: 'number', description: 'New X coordinate' },
          y: { type: 'number', description: 'New Y coordinate' },
          width: { type: 'number', description: 'New width' },
          height: { type: 'number', description: 'New height' },
          text: { type: 'string', description: 'Text content (static text)' },
          expression: { type: 'string', description: 'Expression (dynamic text)' },
          fontSize: { type: 'number', description: 'Font size' },
          fontFamily: { type: 'string', description: 'Font name' },
          isBold: { type: 'boolean', description: 'Whether bold' },
          isItalic: { type: 'boolean', description: 'Whether italic' },
          forecolor: { type: 'string', description: 'Foreground color' },
          backcolor: { type: 'string', description: 'Background color' },
          textAlignment: {
            type: 'string',
            description: 'Text alignment',
            enum: ['Left', 'Center', 'Right', 'Justified']
          }
        }
      }
    },
    required: ['uuid', 'properties']
  }
};

export const MOVE_ELEMENT_SCHEMA: MCPToolSchema = {
  name: 'move_element',
  description: 'Move the element to a new position',
  inputSchema: {
    type: 'object',
    properties: {
      uuid: {
        type: 'string',
        description: 'UUID identifier of the element'
      },
      x: {
        type: 'number',
        description: 'New X coordinate'
      },
      y: {
        type: 'number',
        description: 'New Y coordinate'
      }
    },
    required: ['uuid', 'x', 'y']
  }
};

// ============================================
// Delete tools
// ============================================

export const DELETE_ELEMENT_SCHEMA: MCPToolSchema = {
  name: 'delete_element',
  description: 'Delete a specified element',
  inputSchema: {
    type: 'object',
    properties: {
      uuid: {
        type: 'string',
        description: 'UUID identifier of the element'
      }
    },
    required: ['uuid']
  }
};

// ============================================
// Band operation tools
// ============================================

export const UPDATE_BAND_HEIGHT_SCHEMA: MCPToolSchema = {
  name: 'update_band_height',
  description: 'Adjust the height of a specified band',
  inputSchema: {
    type: 'object',
    properties: {
      bandType: {
        type: 'string',
        description: 'Band type',
        enum: ['detail', 'pageHeader', 'pageFooter', 'title', 'summary', 'columnHeader', 'columnFooter', 'background', 'lastPageFooter', 'noData']
      },
      height: {
        type: 'number',
        description: 'New band height'
      }
    },
    required: ['bandType', 'height']
  }
};

// ============================================
// Batch operation tools
// ============================================

export const DELETE_ELEMENTS_SCHEMA: MCPToolSchema = {
  name: 'delete_elements',
  description: 'Batch delete multiple elements',
  inputSchema: {
    type: 'object',
    properties: {
      uuids: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of element UUIDs to delete'
      }
    },
    required: ['uuids']
  }
};

export const MOVE_ELEMENTS_SCHEMA: MCPToolSchema = {
  name: 'move_elements',
  description: 'Batch move multiple elements to a relative position',
  inputSchema: {
    type: 'object',
    properties: {
      uuids: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of element UUIDs to move'
      },
      deltaX: {
        type: 'number',
        description: 'X-axis offset (pixels)'
      },
      deltaY: {
        type: 'number',
        description: 'Y-axis offset (pixels)'
      }
    },
    required: ['uuids', 'deltaX', 'deltaY']
  }
};

export const UPDATE_ELEMENTS_STYLE_SCHEMA: MCPToolSchema = {
  name: 'update_elements_style',
  description: 'Batch update the style of multiple elements',
  inputSchema: {
    type: 'object',
    properties: {
      uuids: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of element UUIDs to update'
      },
      fontSize: { type: 'number', description: 'Font size' },
      fontFamily: { type: 'string', description: 'Font name' },
      isBold: { type: 'boolean', description: 'Whether bold' },
      isItalic: { type: 'boolean', description: 'Whether italic' },
      forecolor: { type: 'string', description: 'Foreground color' },
      backcolor: { type: 'string', description: 'Background color' }
    },
    required: ['uuids']
  }
};

// ============================================
// Resize and alignment tools
// ============================================

export const RESIZE_ELEMENT_SCHEMA: MCPToolSchema = {
  name: 'resize_element',
  description: 'Resize an element',
  inputSchema: {
    type: 'object',
    properties: {
      uuid: {
        type: 'string',
        description: 'UUID identifier of the element'
      },
      width: {
        type: 'number',
        description: 'New width'
      },
      height: {
        type: 'number',
        description: 'New height'
      }
    },
    required: ['uuid']
  }
};

export const RESIZE_ELEMENTS_SCHEMA: MCPToolSchema = {
  name: 'resize_elements',
  description: 'Batch resize multiple elements',
  inputSchema: {
    type: 'object',
    properties: {
      uuids: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of element UUIDs to resize'
      },
      width: {
        type: 'number',
        description: 'New width (if provided)'
      },
      height: {
        type: 'number',
        description: 'New height (if provided)'
      }
    },
    required: ['uuids']
  }
};

export const ALIGN_ELEMENTS_SCHEMA: MCPToolSchema = {
  name: 'align_elements',
  description: 'Align multiple elements',
  inputSchema: {
    type: 'object',
    properties: {
      uuids: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of element UUIDs to align'
      },
      alignment: {
        type: 'string',
        description: 'Alignment',
        enum: ['left', 'center', 'right', 'top', 'middle', 'bottom']
      }
    },
    required: ['uuids', 'alignment']
  }
};

export const DISTRIBUTE_ELEMENTS_SCHEMA: MCPToolSchema = {
  name: 'distribute_elements',
  description: 'Evenly distribute multiple elements',
  inputSchema: {
    type: 'object',
    properties: {
      uuids: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of element UUIDs to distribute'
      },
      direction: {
        type: 'string',
        description: 'Distribution direction',
        enum: ['horizontal', 'vertical']
      }
    },
    required: ['uuids', 'direction']
  }
};

// ============================================
// Undo/redo tools
// ============================================

export const UNDO_SCHEMA: MCPToolSchema = {
  name: 'undo',
  description: 'Undo the last operation',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
};

export const REDO_SCHEMA: MCPToolSchema = {
  name: 'redo',
  description: 'Redo the last operation',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  }
};

// ============================================
// Report property tools
// ============================================

export const UPDATE_REPORT_PROPERTIES_SCHEMA: MCPToolSchema = {
  name: 'update_report_properties',
  description: 'Update report properties (page size, margins, title, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Report name' },
      pageWidth: { type: 'number', description: 'Page width' },
      pageHeight: { type: 'number', description: 'Page height' },
      leftMargin: { type: 'number', description: 'Left margin' },
      rightMargin: { type: 'number', description: 'Right margin' },
      topMargin: { type: 'number', description: 'Top margin' },
      bottomMargin: { type: 'number', description: 'Bottom margin' },
      title: { type: 'string', description: 'Report title' }
    },
    required: []
  }
};

export const ADD_FIELD_SCHEMA: MCPToolSchema = {
  name: 'add_field',
  description: 'Add a new data field',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Field name'
      },
      classType: {
        type: 'string',
        description: 'Field type',
        enum: ['java.lang.String', 'java.lang.Integer', 'java.lang.Long', 'java.lang.Float', 'java.lang.Double', 'java.math.BigDecimal', 'java.util.Date', 'java.sql.Date', 'java.sql.Timestamp']
      },
      description: {
        type: 'string',
        description: 'Field description'
      }
    },
    required: ['name']
  }
};

export const ADD_PARAMETER_SCHEMA: MCPToolSchema = {
  name: 'add_parameter',
  description: 'Add a new report parameter',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Parameter name'
      },
      classType: {
        type: 'string',
        description: 'Parameter type',
        enum: ['java.lang.String', 'java.lang.Integer', 'java.lang.Long', 'java.lang.Float', 'java.lang.Double', 'java.math.BigDecimal', 'java.util.Date', 'java.sql.Date', 'java.sql.Timestamp']
      },
      description: {
        type: 'string',
        description: 'Parameter description'
      },
      defaultValue: {
        type: 'string',
        description: 'Default value expression'
      }
    },
    required: ['name']
  }
};

// ============================================
// Export all tool schemas
// ============================================

export const ALL_MCP_TOOL_SCHEMAS: MCPToolSchema[] = [
  // Query tools
  GET_DESIGN_STATE_SCHEMA,
  GET_ELEMENT_SCHEMA,
  FIND_ELEMENTS_SCHEMA,
  // Create tools
  CREATE_STATIC_TEXT_SCHEMA,
  CREATE_TEXT_FIELD_SCHEMA,
  CREATE_RECTANGLE_SCHEMA,
  CREATE_FRAME_SCHEMA,
  // Modify tools
  UPDATE_ELEMENT_SCHEMA,
  MOVE_ELEMENT_SCHEMA,
  // Delete tools
  DELETE_ELEMENT_SCHEMA,
  // Band operation tools
  UPDATE_BAND_HEIGHT_SCHEMA,
  // Batch operation tools
  DELETE_ELEMENTS_SCHEMA,
  MOVE_ELEMENTS_SCHEMA,
  UPDATE_ELEMENTS_STYLE_SCHEMA,
  // Resize and alignment tools
  RESIZE_ELEMENT_SCHEMA,
  RESIZE_ELEMENTS_SCHEMA,
  ALIGN_ELEMENTS_SCHEMA,
  DISTRIBUTE_ELEMENTS_SCHEMA,
  // Undo/redo tools
  UNDO_SCHEMA,
  REDO_SCHEMA,
  // Report property tools
  UPDATE_REPORT_PROPERTIES_SCHEMA,
  ADD_FIELD_SCHEMA,
  ADD_PARAMETER_SCHEMA
];

// Get the tool schema map
export const MCP_TOOL_SCHEMA_MAP: Record<string, MCPToolSchema> = {};
ALL_MCP_TOOL_SCHEMAS.forEach(schema => {
  MCP_TOOL_SCHEMA_MAP[schema.name] = schema;
});

// Generate a tool definition format understandable by AI models
export function generateAIToolDefinitions(): Array<{
  name: string;
  description: string;
  parameters: any;
}> {
  return ALL_MCP_TOOL_SCHEMAS.map(schema => ({
    name: schema.name,
    description: schema.description,
    parameters: schema.inputSchema
  }));
}
