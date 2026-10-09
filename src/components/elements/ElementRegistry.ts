import type { Component } from "vue";
import {
  Barcode,
  ChartColumn,
  Circle,
  FileDigit,
  Gauge,
  Image as ImageIcon,
  Images,
  Minus,
  PanelTop,
  Square,
  SquareDashed,
  SquareSquare,
  Table as TableIcon,
  TriangleAlert,
  Type as TypeIcon,
} from "@lucide/vue";
import { buildBarcodeElement } from "../../utils/barcode/barcodeTypes";
import type { DesignElement } from "../../types";
import { TABLE_HEADER_HEIGHT, TABLE_ROW_HEIGHT } from "../../utils/table/dataTable";
import { ELEMENT_DEFAULT_SIZES } from "../../constants/constants";

// Element configuration interface
export interface ElementConfig {
  type: string;
  name: string;
  icon: string;
  iconComponent?: Component;
  category?: string;
  defaultProps: Partial<DesignElement>;
  component?: any;
  validator?: (element: DesignElement) => boolean;
  serializer?: (element: DesignElement) => any;
  deserializer?: (data: any) => DesignElement;
}

// Element registry class
export class ElementRegistry {
  private static instance: ElementRegistry;
  private elements: Map<string, ElementConfig> = new Map();

  private constructor() {
    this.registerDefaultElements();
  }

  public static getInstance(): ElementRegistry {
    if (!ElementRegistry.instance) {
      ElementRegistry.instance = new ElementRegistry();
    }
    return ElementRegistry.instance;
  }

  // Register default elements
  private registerDefaultElements(): void {
    this.registerElement({
      type: "textField",
      name: "elementNames.textField",
      icon: "T",
      iconComponent: TypeIcon,
      category: "basic",
      defaultProps: {
        type: "textField",
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        expression: '"Text"',
        evaluationTime: "Now",
        evaluationGroup: "",
        pattern: "",
        isBlankWhenNull: false,
        hyperlinkType: "None",
        bookmarkLevel: 0,
        markup: "html",
        // Style properties
        fontFamily: "SansSerif",
        fontSize: 12,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        textAlignment: "Left",
        verticalAlignment: "Top",
      },
    });

    this.registerElement({
      type: "image",
      name: "elementNames.image",
      icon: "◻",
      iconComponent: ImageIcon,
      category: "basic",
      defaultProps: {
        type: "image",
        x: 0,
        y: 0,
        ...ELEMENT_DEFAULT_SIZES.image,
        imageExpression: "",
        scaleType: "FillFrame",
        hAlign: "Center",
        vAlign: "Middle",
        isUsingCache: true,
        isLazy: false,
        onErrorType: "Error",
        evaluationTime: "Now",
      },
    });

    this.registerElement({
      type: "line",
      name: "elementNames.line",
      icon: "─",
      iconComponent: Minus,
      category: "basic",
      defaultProps: {
        type: "line",
        x: 0,
        y: 0,
        width: 100,
        height: 2,
        lineDirection: "TopDown",
        lineWidth: 1,
        // New properties
        isPrintRepeatedValues: true,
        printWhenExpression: "",
      },
    });

    this.registerElement({
      type: "rectangle",
      name: "elementNames.rectangle",
      icon: "▭",
      iconComponent: Square,
      category: "basic",
      defaultProps: {
        type: "rectangle",
        x: 0,
        y: 0,
        ...ELEMENT_DEFAULT_SIZES.rectangle,
        mode: "Transparent",
        // New properties
        isPrintRepeatedValues: true,
        isRemoveLineWhenBlank: false,
        printWhenExpression: "",
      },
    });

    this.registerElement({
      type: "ellipse",
      name: "elementNames.ellipse",
      icon: "◯",
      iconComponent: Circle,
      category: "basic",
      defaultProps: {
        type: "ellipse",
        x: 0,
        y: 0,
        ...ELEMENT_DEFAULT_SIZES.ellipse,
        mode: "Transparent",
        // New properties
        isPrintRepeatedValues: true,
        isRemoveLineWhenBlank: false,
        printWhenExpression: "",
      },
    });

    this.registerElement({
      type: "frame",
      name: "elementNames.frame",
      icon: "☐",
      iconComponent: SquareDashed,
      category: "basic",
      defaultProps: {
        type: "frame",
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        backcolor: "#FFFFFF",
        mode: "Transparent", // Default to transparent
        elements: [],
        layout: "FreeLayout",
        // New properties
        printWhenExpression: "",
        isIgnorePagination: false,
        isSplitAllowed: true,
        splitType: "Stretch",
        isRemoveLineWhenBlank: false,
        isPrintRepeatedValues: true,
      },
    });

    // Table: starts empty (3 columns, one row); data is dropped on it from
    // the "Report Data" list. Its size follows its content (utils/table/dataTable.ts).
    this.registerElement({
      type: "table",
      name: "elementNames.table",
      icon: "⊞",
      iconComponent: TableIcon,
      category: "basic",
      defaultProps: {
        type: "table",
        x: 50,
        y: 20,
        width: 455,
        height: TABLE_HEADER_HEIGHT + TABLE_ROW_HEIGHT,
        headerHeight: TABLE_HEADER_HEIGHT,
        rowHeight: TABLE_ROW_HEIGHT,
      },
    });

    // Chart: one tile for the nine chart types. Clicking it asks for a type;
    // dragging it drops a bar chart. Built by buildChartElement() (utils/chart).
    this.registerElement({
      type: "chart",
      name: "elementNames.chart",
      icon: "▊",
      iconComponent: ChartColumn,
      category: "basic",
      defaultProps: { type: "chart", x: 0, y: 0, width: 320, height: 200 },
    });

    // Barcode element
    this.registerElement({
      type: "barcode",
      name: "elementNames.barcode",
      icon: "▐",
      iconComponent: Barcode,
      category: "basic",
      defaultProps: buildBarcodeElement("Code128"),
    });

    // Frame templates: styled frames with placeholder content.
    // The actual element is built by buildFrameTemplate() in utils/framePresets.ts.
    // Element presets: ready-made boxes (a frame with its parts)
    const elementPresets: Array<{ type: string; name: string; iconComponent: Component }> = [
      {
        type: "frameKpiCard",
        name: "elementNames.frameKpiCard",
        iconComponent: Gauge,
      },
      {
        type: "frameAlertBox",
        name: "elementNames.frameAlertBox",
        iconComponent: TriangleAlert,
      },
      {
        type: "frameTitledSection",
        name: "elementNames.frameTitledSection",
        iconComponent: PanelTop,
      },
      {
        type: "framePhotoCard",
        name: "elementNames.framePhotoCard",
        iconComponent: Images,
      },
    ];
    elementPresets.forEach(({ type, name, iconComponent }) =>
      this.registerElement({
        type,
        name,
        icon: "☐",
        iconComponent,
        category: "frames",
        defaultProps: { type: "frame", x: 0, y: 0, width: 200, height: 100, elements: [] },
      }),
    );

    // Composite elements
    // Page border: a frame in the Background band around every page
    this.registerElement({
      type: "framePageBorder",
      name: "elementNames.framePageBorder",
      icon: "☐",
      iconComponent: SquareSquare,
      category: "composite",
      defaultProps: { type: "frame", x: 0, y: 0, width: 200, height: 100, elements: [] },
    });

    // Page number: a text field built by buildPaginationElement() in
    // utils/paginationPresets.ts. Clicking the tile asks where on the page it goes.
    this.registerElement({
      type: "pageNumber",
      name: "elementNames.pageNumber",
      icon: "#",
      iconComponent: FileDigit,
      category: "composite",
      defaultProps: { type: "textField", x: 0, y: 0, width: 120, height: 20 },
    });
  }

  // Register an element
  public registerElement(config: ElementConfig): void {
    this.elements.set(config.type, config);
  }

  // Register multiple elements
  public registerElements(configs: ElementConfig[]): void {
    configs.forEach((config) => this.registerElement(config));
  }

  // Get an element's config
  public getElementConfig(type: string): ElementConfig | undefined {
    return this.elements.get(type);
  }

  // Get all element configs
  public getAllElements(): ElementConfig[] {
    return Array.from(this.elements.values());
  }

  // Get element configs by category
  public getByCategory(category: string): ElementConfig[] {
    return Array.from(this.elements.values()).filter(
      (e) => e.category === category,
    );
  }

  // Get the list of element types
  public getElementTypes(): string[] {
    return Array.from(this.elements.keys());
  }

  // Create an element instance
  public createElement(
    type: string,
    overrides: Partial<DesignElement> = {},
  ): DesignElement {
    const config = this.getElementConfig(type);
    if (!config) {
      throw new Error(`Unknown element type: ${type}`);
    }

    // Composite elements use the actual type from defaultProps (e.g. textField)
    const actualType = config.defaultProps.type || type;

    return {
      ...config.defaultProps,
      ...overrides,
      type: actualType,
    } as DesignElement;
  }

  // Validate an element
  public validateElement(element: DesignElement): boolean {
    const config = this.getElementConfig(element.type);
    if (!config) {
      return false;
    }

    if (config.validator) {
      return config.validator(element);
    }

    // Default validation: check required properties
    return (
      typeof element.x === "number" &&
      typeof element.y === "number" &&
      typeof element.width === "number" &&
      typeof element.height === "number" &&
      element.width >= 0 &&
      element.height >= 0
    );
  }

  // Serialize an element
  public serializeElement(element: DesignElement): any {
    const config = this.getElementConfig(element.type);
    if (config?.serializer) {
      return config.serializer(element);
    }

    // Default serialization
    return { ...element };
  }

  // Deserialize an element
  public deserializeElement(type: string, data: any): DesignElement {
    const config = this.getElementConfig(type);
    if (!config) {
      throw new Error(`Unknown element type: ${type}`);
    }

    if (config.deserializer) {
      return config.deserializer(data);
    }

    // Default deserialization
    return {
      ...config.defaultProps,
      ...data,
      type,
    } as DesignElement;
  }

  // Load an element's component dynamically
  public async loadElementComponent(type: string): Promise<any> {
    const config = this.getElementConfig(type);
    if (!config) {
      throw new Error(`Unknown element type: ${type}`);
    }

    if (config.component) {
      return config.component;
    }

    // Dynamically load the component
    try {
      const componentMap: Record<string, string> = {
        textField: "./TextFieldElement.vue",
        image: "./ImageElement.vue",
        line: "./LineElement.vue",
        rectangle: "./RectangleElement.vue",
        ellipse: "./EllipseElement.vue",
        frame: "./FrameElement.vue",
        table: "./TableElement.vue",
      };

      const componentPath = componentMap[type];
      if (componentPath) {
        const module = await import(/* @vite-ignore */ componentPath);
        config.component = module.default;
        return module.default;
      }
    } catch (error) {
      console.error(
        `Failed to load component for element type ${type}:`,
        error,
      );
    }

    return null;
  }

  // Check whether an element type exists
  public hasElement(type: string): boolean {
    return this.elements.has(type);
  }

  // Remove an element type
  public removeElement(type: string): boolean {
    return this.elements.delete(type);
  }

  // Clear all elements
  public clearElements(): void {
    this.elements.clear();
  }
}

// Export the default instance
export const elementRegistry = ElementRegistry.getInstance();

// Export registration helper functions
export function registerElement(config: ElementConfig): void {
  elementRegistry.registerElement(config);
}

export function registerElements(configs: ElementConfig[]): void {
  elementRegistry.registerElements(configs);
}

export function createElement(
  type: string,
  overrides: Partial<DesignElement> = {},
): DesignElement {
  return elementRegistry.createElement(type, overrides);
}

export function getElementConfig(type: string): ElementConfig | undefined {
  return elementRegistry.getElementConfig(type);
}

export function getAllElements(): ElementConfig[] {
  return elementRegistry.getAllElements();
}
