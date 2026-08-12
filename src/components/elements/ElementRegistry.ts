import type { DesignElement } from '../../types';

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
      type: 'staticText',
      name: 'elementNames.staticText',
      icon: 'T',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'staticText',
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        text: '静态文本',
        markup: 'none',
        textAdjust: 'CutText',
        rotation: 'None',
        // Style properties
        fontFamily: 'SansSerif',
        fontSize: 12,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        textAlignment: 'Left',
        verticalAlignment: 'Top'
      }
    });

    this.registerElement({
      type: 'textField',
      name: 'elementNames.textField',
      icon: '{ }',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 9l-3 3 3 3M16 9l3 3-3 3M14 4l-4 16"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'textField',
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        expression: '"Text Field"',
        evaluationTime: 'Now',
        evaluationGroup: '',
        pattern: '',
        isBlankWhenNull: false,
        hyperlinkType: 'None',
        bookmarkLevel: 0,
        // Deprecated property (kept for backward compatibility)
        isStretchWithOverflow: false,
        // Style properties
        fontFamily: 'SansSerif',
        fontSize: 12,
        isBold: false,
        isItalic: false,
        isUnderline: false,
        textAlignment: 'Left',
        verticalAlignment: 'Top'
      }
    });

    this.registerElement({
      type: 'image',
      name: 'elementNames.image',
      icon: '◻',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'image',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        imageExpression: '"https://raw.githubusercontent.com/fengyunhe/jrxml_web_designer/refs/heads/master/src/assets/FIREGOD_CN.jpg"',
        scaleType: 'FillFrame',
        hAlign: 'Center',
        vAlign: 'Middle',
        isUsingCache: true,
        isLazy: false,
        onErrorType: 'Error',
        evaluationTime: 'Now'
      }
    });

    this.registerElement({
      type: 'line',
      name: 'elementNames.line',
      icon: '─',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'line',
        x: 0,
        y: 0,
        width: 100,
        height: 2,
        lineDirection: 'TopDown',
        lineWidth: 1,
        // New properties
        isPrintRepeatedValues: true,
        printWhenExpression: ''
      }
    });

    this.registerElement({
      type: 'rectangle',
      name: 'elementNames.rectangle',
      icon: '▭',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        mode: 'Transparent',
        // New properties
        isPrintRepeatedValues: true,
        isRemoveLineWhenBlank: false,
        printWhenExpression: ''
      }
    });

    this.registerElement({
      type: 'ellipse',
      name: 'elementNames.ellipse',
      icon: '◯',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="12" rx="10" ry="8"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'ellipse',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        mode: 'Transparent',
        // New properties
        isPrintRepeatedValues: true,
        isRemoveLineWhenBlank: false,
        printWhenExpression: ''
      }
    });

    this.registerElement({
      type: 'break',
      name: 'elementNames.break',
      icon: '⤓',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'break',
        x: 0,
        y: 0,
        width: 100,
        height: 1, // Breaks are usually thin
        breakType: 'Page',
        // New properties
        isResetPageNumber: false
      }
    });

    this.registerElement({
      type: 'frame',
      name: 'elementNames.frame',
      icon: '☐',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="4 2"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'frame',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        backcolor: '#FFFFFF',
        mode: 'Transparent', // Default to transparent
        elements: [],
        layout: 'FreeLayout',
        // New properties
        printWhenExpression: '',
        isIgnorePagination: false,
        isSplitAllowed: true,
        splitType: 'Stretch',
        isRemoveLineWhenBlank: false,
        isPrintRepeatedValues: true
      }
    });

    this.registerElement({
      type: 'table',
      name: 'elementNames.table',
      icon: '⊞',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'table',
        x: 0,
        y: 0,
        width: 555,
        height: 60,
        dataset: {
          uuid: crypto.randomUUID(),
          name: 'tableDataset'
        },
        columns: [
          {
            uuid: crypto.randomUUID(),
            width: 160,
            name: 'Column1',
            tableHeader: {
              enable: false,
              element: {
                type: 'staticText',
                x: 0,
                y: 0,
                width: 160,
                height: 30,
                text: 'Header',
                forecolor: '#000000',
                backcolor: '#FFFFFF',
                fontFamily: 'SansSerif',
                fontSize: 19,
                isBold: true,
                textAlignment: 'Center',
                verticalAlignment: 'Middle'
              }
            },
            columnHeader: {
              enable: true,
              element: {
                type: 'staticText',
                x: 0,
                y: 0,
                width: 160,
                height: 30,
                text: 'Column Header',
                textAlignment: 'Center',
                verticalAlignment: 'Middle'
              }
            },
            detailCell: {
              enable: true,
              element: {
                type: 'textField',
                x: 0,
                y: 0,
                width: 160,
                height: 30,
                expression: '$F{FIELD_NAME}',
                textAlignment: 'Center',
                verticalAlignment: 'Middle'
              }
            }
          },
          {
            uuid: crypto.randomUUID(),
            width: 180,
            name: 'Column2',
            tableHeader: {
              enable: false,
              element: {
                type: 'staticText',
                x: 0,
                y: 0,
                width: 180,
                height: 30,
                text: '',
                forecolor: '#000000',
                backcolor: '#FFFFFF',
                fontFamily: 'SansSerif',
                fontSize: 19,
                isBold: true,
                textAlignment: 'Center',
                verticalAlignment: 'Middle'
              }
            },
            columnHeader: {
              enable: true,
              element: {
                type: 'staticText',
                x: 0,
                y: 0,
                width: 180,
                height: 30,
                text: 'Column Header',
                textAlignment: 'Center',
                verticalAlignment: 'Middle'
              }
            },
            detailCell: {
              enable: true,
              element: {
                type: 'textField',
                x: 0,
                y: 0,
                width: 180,
                height: 30,
                expression: '$F{FIELD_NAME}',
                textAlignment: 'Center',
                verticalAlignment: 'Middle'
              }
            }
          }
        ],
        styles: {
          tableHeader: 'Table_TH',
          columnHeader: 'Table_CH',
          detail: 'Table_TD'
        },
        whenNoDataType: 'AllSectionsNoDetail'
      }
    });

    // Subreport element
    this.registerElement({
      type: 'subreport',
      name: 'elementNames.subreport',
      icon: '⊡',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><rect x="6" y="6" width="12" height="12" rx="1"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'subreport',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        subreportExpression: '""',
        parametersMapExpression: '',
        connectionExpression: '',
        dataSourceExpression: '',
        evaluationTime: 'Now',
        printWhenExpression: '',
        isUsingCache: false,
        isIgnorePagination: false
      }
    });

    // List element
    this.registerElement({
      type: 'list',
      name: 'elementNames.list',
      icon: '☰',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'list',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        listContents: {
          elements: [],
          height: 100,
          width: 200
        },
        printOrder: 'Vertical',
        ignoreWidth: false,
        subDataset: '',
        dataSourceExpression: '',
        connectionExpression: '',
        printWhenExpression: '',
        evaluationTime: 'Now',
        splitType: 'Stretch',
        isIgnorePagination: false
      }
    });

    // Chart element
    this.registerElement({
      type: 'chart',
      name: 'elementNames.chart',
      icon: '▊',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'chart',
        x: 0,
        y: 0,
        width: 200,
        height: 150,
        chartType: 'pie',
        title: 'Chart',
        titleExpression: '',
        subtitleExpression: '',
        legendExpression: '',
        evaluationTime: 'Now',
        printWhenExpression: ''
      }
    });

    // Barcode element
    this.registerElement({
      type: 'barcode',
      name: 'elementNames.barcode',
      icon: '▐',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v20M10 2v20M14 2v20M18 2v20M22 2v20"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'barcode',
        x: 0,
        y: 0,
        width: 150,
        height: 60,
        barcodeType: 'Code128',
        codeExpression: '"1234567890"',
        evaluationTime: 'Now',
        printWhenExpression: ''
      }
    });

    // Map element
    this.registerElement({
      type: 'map',
      name: 'elementNames.map',
      icon: '📍',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'map',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        mapType: 'html',
        latExpression: '',
        lngExpression: '',
        zoomExpression: '',
        languageExpression: '',
        evaluationTime: 'Now',
        printWhenExpression: ''
      }
    });

    // Crosstab element
    this.registerElement({
      type: 'crosstab',
      name: 'elementNames.crosstab',
      icon: '⊞',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/><path d="M9 9h6v6H9z" fill="currentColor" opacity="0.2"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'crosstab',
        x: 0,
        y: 0,
        width: 400,
        height: 200,
        crosstabWidth: 400,
        crosstabHeight: 200,
        printWhenExpression: '',
        whenNoDataType: 'AllSectionsNoDetail'
      }
    });

    // Icon label element
    this.registerElement({
      type: 'iconLabel',
      name: 'elementNames.iconLabel',
      icon: '🏷️',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'iconLabel',
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        icon: '',
        label: '',
        labelExpression: '',
        evaluationTime: 'Now',
        printWhenExpression: ''
      }
    });

    // Generic element
    this.registerElement({
      type: 'genericElement',
      name: 'elementNames.genericElement',
      icon: '❓',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      category: 'basic',
      defaultProps: {
        type: 'genericElement',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        namespace: '',
        evaluationTime: 'Now',
        printWhenExpression: ''
      }
    });

    // Composite Elements
    this.registerElement({
      type: 'pageNumber',
      name: 'elementNames.pageNumber',
      icon: '#',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12h6M12 9v6"/></svg>',
      category: 'composite',
      defaultProps: {
        type: 'textField',
        x: 0, y: 0, width: 50, height: 20,
        expression: '$V{PAGE_NUMBER}',
        evaluationTime: 'Now',
        fontFamily: 'SansSerif', fontSize: 12,
        textAlignment: 'Center', verticalAlignment: 'Middle'
      }
    });

    this.registerElement({
      type: 'totalPages',
      name: 'elementNames.totalPages',
      icon: 'Σ',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8l5-3 5 3M7 16l5 3 5-3"/></svg>',
      category: 'composite',
      defaultProps: {
        type: 'textField',
        x: 0, y: 0, width: 50, height: 20,
        expression: '$V{PAGE_NUMBER}',
        evaluationTime: 'Report',
        fontFamily: 'SansSerif', fontSize: 12,
        textAlignment: 'Center', verticalAlignment: 'Middle'
      }
    });

    this.registerElement({
      type: 'currentDate',
      name: 'elementNames.currentDate',
      icon: '📅',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
      category: 'composite',
      defaultProps: {
        type: 'textField',
        x: 0, y: 0, width: 100, height: 20,
        expression: 'new java.util.Date()',
        evaluationTime: 'Now', pattern: 'yyyy-MM-dd',
        fontFamily: 'SansSerif', fontSize: 12,
        textAlignment: 'Center', verticalAlignment: 'Middle'
      }
    });

    this.registerElement({
      type: 'currentTime',
      name: 'elementNames.currentTime',
      icon: '🕒',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
      category: 'composite',
      defaultProps: {
        type: 'textField',
        x: 0, y: 0, width: 80, height: 20,
        expression: 'new java.util.Date()',
        evaluationTime: 'Now', pattern: 'HH:mm:ss',
        fontFamily: 'SansSerif', fontSize: 12,
        textAlignment: 'Center', verticalAlignment: 'Middle'
      }
    });

    this.registerElement({
      type: 'percentage',
      name: 'elementNames.percentage',
      icon: '%',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/><path d="M20 4L4 20"/></svg>',
      category: 'composite',
      defaultProps: {
        type: 'textField',
        x: 0, y: 0, width: 60, height: 20,
        expression: '$V{REPORT_COUNT} / $V{REPORT_TOTAL_COUNT}',
        evaluationTime: 'Report', pattern: '#,##0.0%',
        fontFamily: 'SansSerif', fontSize: 12,
        textAlignment: 'Center', verticalAlignment: 'Middle'
      }
    });

    this.registerElement({
      type: 'pageXofY',
      name: 'elementNames.pageXofY',
      icon: '#/#',
      iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12h8"/></svg>',
      category: 'composite',
      defaultProps: {
        type: 'textField',
        x: 0, y: 0, width: 80, height: 20,
        expression: '$V{PAGE_NUMBER} + " / " + $V{NUMBER_OF_PAGES}',
        evaluationTime: 'Now',
        fontFamily: 'SansSerif', fontSize: 12,
        textAlignment: 'Center', verticalAlignment: 'Middle'
      }
    });
  }

  // Register an element
  public registerElement(config: ElementConfig): void {
    this.elements.set(config.type, config);
  }

  // Register multiple elements
  public registerElements(configs: ElementConfig[]): void {
    configs.forEach(config => this.registerElement(config));
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
    return Array.from(this.elements.values()).filter(e => e.category === category);
  }

  // Get the list of element types
  public getElementTypes(): string[] {
    return Array.from(this.elements.keys());
  }

  // Create an element instance
  public createElement(type: string, overrides: Partial<DesignElement> = {}): DesignElement {
    const config = this.getElementConfig(type);
    if (!config) {
      throw new Error(`Unknown element type: ${type}`);
    }

    // Composite elements use the actual type from defaultProps (e.g. textField)
    const actualType = config.defaultProps.type || type;

    return {
      ...config.defaultProps,
      ...overrides,
      type: actualType
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
    return typeof element.x === 'number' &&
           typeof element.y === 'number' &&
           typeof element.width === 'number' &&
           typeof element.height === 'number' &&
           element.width >= 0 &&
           element.height >= 0;
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
      type
    } as DesignElement;
  }

  // Load an element component
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
        staticText: './StaticTextElement.vue',
        textField: './TextFieldElement.vue',
        image: './ImageElement.vue',
        line: './LineElement.vue',
        rectangle: './RectangleElement.vue',
        ellipse: './EllipseElement.vue',
        break: './BreakElement.vue',
        frame: './FrameElement.vue',
        table: './TableElement.vue'
      };

      const componentPath = componentMap[type];
      if (componentPath) {
        const module = await import(/* @vite-ignore */ componentPath);
        config.component = module.default;
        return module.default;
      }
    } catch (error) {
      console.error(`Failed to load component for element type ${type}:`, error);
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

export function createElement(type: string, overrides: Partial<DesignElement> = {}): DesignElement {
  return elementRegistry.createElement(type, overrides);
}

export function getElementConfig(type: string): ElementConfig | undefined {
  return elementRegistry.getElementConfig(type);
}

export function getAllElements(): ElementConfig[] {
  return elementRegistry.getAllElements();
}
