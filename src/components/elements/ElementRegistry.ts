import type { DesignElement } from "../../types";
import { ELEMENT_DEFAULT_SIZES } from "../../constants/constants";

// Element configuration interface
export interface ElementConfig {
  type: string;
  name: string;
  icon: string;
  iconSvg?: string;
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
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
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
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
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
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>',
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
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>',
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
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="10" ry="8"/></svg>',
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
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/></svg>',
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

    this.registerElement({
      type: "table",
      name: "elementNames.table",
      icon: "⊞",
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
      category: "basic",
      defaultProps: {
        type: "table",
        x: 0,
        y: 0,
        width: 555,
        height: 60,
        dataset: {
          uuid: crypto.randomUUID(),
          name: "tableDataset",
        },
        columns: [
          {
            uuid: crypto.randomUUID(),
            width: 160,
            name: "Column1",
            tableHeader: {
              enable: false,
              element: {
                type: "textField",
                x: 0,
                y: 0,
                width: 160,
                height: 30,
                expression: '"Header"',
                forecolor: "#000000",
                backcolor: "#FFFFFF",
                fontFamily: "SansSerif",
                fontSize: 19,
                isBold: true,
                textAlignment: "Center",
                verticalAlignment: "Middle",
              },
            },
            columnHeader: {
              enable: true,
              element: {
                type: "textField",
                x: 0,
                y: 0,
                width: 160,
                height: 30,
                expression: '"Column Header"',
                textAlignment: "Center",
                verticalAlignment: "Middle",
              },
            },
            detailCell: {
              enable: true,
              element: {
                type: "textField",
                x: 0,
                y: 0,
                width: 160,
                height: 30,
                expression: "$F{FIELD_NAME}",
                textAlignment: "Center",
                verticalAlignment: "Middle",
              },
            },
          },
          {
            uuid: crypto.randomUUID(),
            width: 180,
            name: "Column2",
            tableHeader: {
              enable: false,
              element: {
                type: "textField",
                x: 0,
                y: 0,
                width: 180,
                height: 30,
                expression: '""',
                forecolor: "#000000",
                backcolor: "#FFFFFF",
                fontFamily: "SansSerif",
                fontSize: 19,
                isBold: true,
                textAlignment: "Center",
                verticalAlignment: "Middle",
              },
            },
            columnHeader: {
              enable: true,
              element: {
                type: "textField",
                x: 0,
                y: 0,
                width: 180,
                height: 30,
                expression: '"Column Header"',
                textAlignment: "Center",
                verticalAlignment: "Middle",
              },
            },
            detailCell: {
              enable: true,
              element: {
                type: "textField",
                x: 0,
                y: 0,
                width: 180,
                height: 30,
                expression: "$F{FIELD_NAME}",
                textAlignment: "Center",
                verticalAlignment: "Middle",
              },
            },
          },
        ],
        styles: {
          tableHeader: "Table_TH",
          columnHeader: "Table_CH",
          detail: "Table_TD",
        },
        whenNoDataType: "AllSectionsNoDetail",
      },
    });

    // Chart element
    this.registerElement({
      type: "chart",
      name: "elementNames.chart",
      icon: "▊",
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
      category: "basic",
      defaultProps: {
        type: "chart",
        x: 0,
        y: 0,
        width: 200,
        height: 150,
        chartType: "pie",
        title: "Chart",
        titleExpression: "",
        subtitleExpression: "",
        legendExpression: "",
        evaluationTime: "Now",
        printWhenExpression: "",
      },
    });

    // Barcode element
    this.registerElement({
      type: "barcode",
      name: "elementNames.barcode",
      icon: "▐",
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v20M10 2v20M14 2v20M18 2v20M22 2v20"/></svg>',
      category: "basic",
      defaultProps: {
        type: "barcode",
        x: 0,
        y: 0,
        width: 150,
        height: 60,
        barcodeType: "Code128",
        codeExpression: '"1234567890"',
        evaluationTime: "Now",
        printWhenExpression: "",
      },
    });

    // Frame templates: styled frames with placeholder content.
    // The actual element is built by buildFrameTemplate() in utils/framePresets.ts.
    // Element presets: ready-made boxes (a frame with its parts)
    const elementPresets: Array<{ type: string; name: string; iconSvg: string }> = [
      {
        type: "frameKpiCard",
        name: "elementNames.frameKpiCard",
        iconSvg:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="1" fill="currentColor" fill-opacity="0.15" stroke="none"/><path d="M6 9h5M6 13h9M6 16h4"/></svg>',
      },
      {
        type: "frameAlertBox",
        name: "elementNames.frameAlertBox",
        iconSvg:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1" fill="currentColor" fill-opacity="0.15" stroke="none"/><path d="M8 11l2-4 2 4z"/><path d="M6 15h12M6 18h8"/></svg>',
      },
      {
        type: "frameTitledSection",
        name: "elementNames.frameTitledSection",
        iconSvg:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1"/><rect x="3" y="4" width="18" height="4" fill="currentColor"/></svg>',
      },
      {
        type: "framePhotoCard",
        name: "elementNames.framePhotoCard",
        iconSvg:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 15h18M6 12l3-3 3 3 2-2 4 4"/><path d="M6 18h8"/></svg>',
      },
    ];
    elementPresets.forEach(({ type, name, iconSvg }) =>
      this.registerElement({
        type,
        name,
        icon: "☐",
        iconSvg,
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
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20"/><rect x="6.5" y="4.5" width="11" height="15" stroke-width="1"/></svg>',
      category: "composite",
      defaultProps: { type: "frame", x: 0, y: 0, width: 200, height: 100, elements: [] },
    });

    // Page number: a text field built by buildPaginationElement() in
    // utils/paginationPresets.ts. Clicking the tile asks where on the page it goes.
    this.registerElement({
      type: "pageNumber",
      name: "elementNames.pageNumber",
      icon: "#",
      iconSvg:
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M10.5 12.5l-1 6M14.5 12.5l-1 6M8.5 14.5h7M8 16.5h7" stroke-width="1.5"/></svg>',
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
