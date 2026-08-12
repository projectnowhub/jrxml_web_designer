/**
 * AI Configuration Manager - Configuration management
 *
 * Supports dynamically configuring AI service parameters and persisting them to localStorage
 */

import { ref, watch } from 'vue';

// ============================================
// Type definitions
// ============================================

export interface AIConfiguration {
  apiEndpoint: string;
  apiKey: string;
  modelName: string;
  maxTokens: number;
  temperature: number;
  requestTimeout: number; // Timeout duration, in milliseconds
}

export interface AIConfigManagerReturn {
  config: AIConfiguration;
  updateConfig: (newConfig: Partial<AIConfiguration>) => void;
  resetConfig: () => void;
  getConfigFromStorage: () => AIConfiguration;
}

// ============================================
// Default configuration
// ============================================

const DEFAULT_CONFIG: AIConfiguration = {
  apiEndpoint: 'http://127.0.0.1:1234/v1',
  apiKey: 'lm-studio',
  modelName: 'local-model',
  maxTokens: 4096,
  temperature: 0.7,
  requestTimeout: 300000 // 5 minutes
};

const STORAGE_KEY = 'jrxml_ai_config';

// ============================================
// Configuration management implementation
// ============================================

/**
 * Create a configuration manager
 */
export function useAIConfigManager(): AIConfigManagerReturn {
  // Load configuration from localStorage
  const loadConfigFromStorage = (): AIConfiguration => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load AI config from storage:', error);
    }
    return { ...DEFAULT_CONFIG };
  };

  // Current configuration
  const config = ref<AIConfiguration>(loadConfigFromStorage());

  // Save configuration to localStorage
  const saveConfigToStorage = (newConfig: AIConfiguration) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('Failed to save AI config to storage:', error);
    }
  };

  // Update configuration
  const updateConfig = (newConfig: Partial<AIConfiguration>) => {
    config.value = { ...config.value, ...newConfig };
    saveConfigToStorage(config.value);
  };

  // Reset configuration to defaults
  const resetConfig = () => {
    config.value = { ...DEFAULT_CONFIG };
    saveConfigToStorage(config.value);
  };

  // Get configuration
  const getConfigFromStorage = (): AIConfiguration => {
    return loadConfigFromStorage();
  };

  return {
    config: config.value,
    updateConfig,
    resetConfig,
    getConfigFromStorage
  };
}

/**
 * Export the default configuration for external use
 */
export { DEFAULT_CONFIG, STORAGE_KEY };
