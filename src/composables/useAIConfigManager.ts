/**
 * AI Configuration Manager - Configuration management
 *
 * Supports dynamically configuring AI service parameters and persisting them to localStorage
 */

import { ref, watch } from "vue";
import { AI_CONFIG } from "@/config/aiConfig";

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
  apiEndpoint: AI_CONFIG.API_ENDPOINT || "https://api.anthropic.com/v1",
  apiKey: AI_CONFIG.API_KEY || "",
  modelName: AI_CONFIG.MODEL_NAME || "claude-3-5-sonnet-20241022",
  maxTokens: AI_CONFIG.MAX_TOKENS || 4096,
  temperature: AI_CONFIG.TEMPERATURE || 0.7,
  requestTimeout: AI_CONFIG.REQUEST_TIMEOUT_MS || 300000, // 5 minutes
};

const STORAGE_KEY = "jrxml_ai_config";

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
        const merged = { ...DEFAULT_CONFIG, ...parsed };
        // Migrate away from old lm-studio / local defaults
        if (merged.apiEndpoint === "http://127.0.0.1:1234/v1") {
          merged.apiEndpoint =
            AI_CONFIG.API_ENDPOINT || "https://api.anthropic.com/v1";
        }
        if (merged.modelName === "local-model") {
          merged.modelName =
            AI_CONFIG.MODEL_NAME || "claude-3-5-sonnet-20241022";
        }
        if (
          merged.apiKey === "lm-studio" ||
          (!merged.apiKey && AI_CONFIG.API_KEY)
        ) {
          merged.apiKey = AI_CONFIG.API_KEY;
        }
        // If .env specifies a key, use it if stored key is empty or placeholder
        if (
          AI_CONFIG.API_KEY &&
          (!merged.apiKey || merged.apiKey === "lm-studio")
        ) {
          merged.apiKey = AI_CONFIG.API_KEY;
        }
        return merged;
      }
    } catch (error) {
      console.error("Failed to load AI config from storage:", error);
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
      console.error("Failed to save AI config to storage:", error);
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
    getConfigFromStorage,
  };
}

/**
 * Export the default configuration for external use
 */
export { DEFAULT_CONFIG, STORAGE_KEY };
