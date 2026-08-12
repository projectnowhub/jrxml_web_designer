import type { DesignElement, Band, ReportProperties } from '../types';

// Plugin interface
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;

  // Plugin initialization
  initialize?: () => void;

  // Plugin destruction
  destroy?: () => void;

  // Element-related hooks
  onElementCreated?: (element: DesignElement, bandIndex: number, elementIndex: number) => void;
  onElementSelected?: (element: DesignElement, bandIndex: number, elementIndex: number) => void;
  onElementModified?: (element: DesignElement, bandIndex: number, elementIndex: number) => void;
  onElementDeleted?: (element: DesignElement, bandIndex: number, elementIndex: number) => void;

  // Band-related hooks
  onBandCreated?: (band: Band) => void;
  onBandModified?: (band: Band) => void;
  onBandDeleted?: (band: Band) => void;

  // Report-related hooks
  onReportLoaded?: (reportProperties: ReportProperties) => void;
  onReportSaved?: (reportProperties: ReportProperties) => void;

  // Custom element types
  customElements?: Array<{
    type: string;
    name: string;
    icon: string;
    defaultProps: Partial<DesignElement>;
    component?: any;
  }>;
}

// Plugin registry class
export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, Plugin> = new Map();
  private initializedPlugins: Set<string> = new Set();

  private constructor() {
    // Load built-in plugins on initialization
    this.loadBuiltInPlugins();
  }

  public static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  // Load built-in plugins
  private loadBuiltInPlugins(): void {
    // Built-in plugins can be loaded here
    // e.g.: this.registerPlugin(builtInPlugin);
  }

  // Register a plugin
  public registerPlugin(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin with id ${plugin.id} already registered.`);
      return;
    }

    this.plugins.set(plugin.id, plugin);
    console.log(`Plugin ${plugin.name} v${plugin.version} registered.`);
  }

  // Register multiple plugins
  public registerPlugins(plugins: Plugin[]): void {
    plugins.forEach(plugin => this.registerPlugin(plugin));
  }

  // Unregister a plugin
  public unregisterPlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin with id ${pluginId} not found.`);
      return false;
    }

    // Destroy the plugin
    if (plugin.destroy && this.initializedPlugins.has(pluginId)) {
      plugin.destroy();
      this.initializedPlugins.delete(pluginId);
    }

    this.plugins.delete(pluginId);
    console.log(`Plugin ${plugin.name} unregistered.`);
    return true;
  }

  // Get a plugin
  public getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  // Get all plugins
  public getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  // Initialize all plugins
  public initializeAllPlugins(): void {
    this.plugins.forEach((plugin, pluginId) => {
      if (plugin.initialize && !this.initializedPlugins.has(pluginId)) {
        try {
          plugin.initialize();
          this.initializedPlugins.add(pluginId);
          console.log(`Plugin ${plugin.name} initialized.`);
        } catch (error) {
          console.error(`Failed to initialize plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Destroy all plugins
  public destroyAllPlugins(): void {
    this.plugins.forEach((plugin, pluginId) => {
      if (plugin.destroy && this.initializedPlugins.has(pluginId)) {
        try {
          plugin.destroy();
          this.initializedPlugins.delete(pluginId);
          console.log(`Plugin ${plugin.name} destroyed.`);
        } catch (error) {
          console.error(`Failed to destroy plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Trigger the element created event
  public triggerElementCreated(element: DesignElement, bandIndex: number, elementIndex: number): void {
    this.plugins.forEach(plugin => {
      if (plugin.onElementCreated) {
        try {
          plugin.onElementCreated(element, bandIndex, elementIndex);
        } catch (error) {
          console.error(`Error in onElementCreated hook for plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Trigger the element selected event
  public triggerElementSelected(element: DesignElement, bandIndex: number, elementIndex: number): void {
    this.plugins.forEach(plugin => {
      if (plugin.onElementSelected) {
        try {
          plugin.onElementSelected(element, bandIndex, elementIndex);
        } catch (error) {
          console.error(`Error in onElementSelected hook for plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Trigger the element modified event
  public triggerElementModified(element: DesignElement, bandIndex: number, elementIndex: number): void {
    this.plugins.forEach(plugin => {
      if (plugin.onElementModified) {
        try {
          plugin.onElementModified(element, bandIndex, elementIndex);
        } catch (error) {
          console.error(`Error in onElementModified hook for plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Trigger the element deleted event
  public triggerElementDeleted(element: DesignElement, bandIndex: number, elementIndex: number): void {
    this.plugins.forEach(plugin => {
      if (plugin.onElementDeleted) {
        try {
          plugin.onElementDeleted(element, bandIndex, elementIndex);
        } catch (error) {
          console.error(`Error in onElementDeleted hook for plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Trigger the Band created event
  public triggerBandCreated(band: Band): void {
    this.plugins.forEach(plugin => {
      if (plugin.onBandCreated) {
        try {
          plugin.onBandCreated(band);
        } catch (error) {
          console.error(`Error in onBandCreated hook for plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Trigger the Band modified event
  public triggerBandModified(band: Band): void {
    this.plugins.forEach(plugin => {
      if (plugin.onBandModified) {
        try {
          plugin.onBandModified(band);
        } catch (error) {
          console.error(`Error in onBandModified hook for plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Trigger the Band deleted event
  public triggerBandDeleted(band: Band): void {
    this.plugins.forEach(plugin => {
      if (plugin.onBandDeleted) {
        try {
          plugin.onBandDeleted(band);
        } catch (error) {
          console.error(`Error in onBandDeleted hook for plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Trigger the report loaded event
  public triggerReportLoaded(reportProperties: ReportProperties): void {
    this.plugins.forEach(plugin => {
      if (plugin.onReportLoaded) {
        try {
          plugin.onReportLoaded(reportProperties);
        } catch (error) {
          console.error(`Error in onReportLoaded hook for plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Trigger the report saved event
  public triggerReportSaved(reportProperties: ReportProperties): void {
    this.plugins.forEach(plugin => {
      if (plugin.onReportSaved) {
        try {
          plugin.onReportSaved(reportProperties);
        } catch (error) {
          console.error(`Error in onReportSaved hook for plugin ${plugin.name}:`, error);
        }
      }
    });
  }

  // Get all custom elements
  public getCustomElements(): Array<{
    type: string;
    name: string;
    icon: string;
    defaultProps: Partial<DesignElement>;
    component?: any;
  }> {
    const customElements: Array<{
      type: string;
      name: string;
      icon: string;
      defaultProps: Partial<DesignElement>;
      component?: any;
    }> = [];

    this.plugins.forEach(plugin => {
      if (plugin.customElements) {
        customElements.push(...plugin.customElements);
      }
    });

    return customElements;
  }
}

// Export the default instance
export const pluginRegistry = PluginRegistry.getInstance();

// Export registration helper functions
export function registerPlugin(plugin: Plugin): void {
  pluginRegistry.registerPlugin(plugin);
}

export function registerPlugins(plugins: Plugin[]): void {
  pluginRegistry.registerPlugins(plugins);
}

export function getPlugin(pluginId: string): Plugin | undefined {
  return pluginRegistry.getPlugin(pluginId);
}

export function getAllPlugins(): Plugin[] {
  return pluginRegistry.getAllPlugins();
}

export function initializeAllPlugins(): void {
  pluginRegistry.initializeAllPlugins();
}

export function destroyAllPlugins(): void {
  pluginRegistry.destroyAllPlugins();
}
