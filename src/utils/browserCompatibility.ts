/**
 * Browser Compatibility Checker
 *
 * Detects whether the browser supports WebMCP features
 */

import { ref, onMounted } from 'vue';

export interface BrowserSupportResult {
  isSupported: boolean;
  features: {
    webassembly: boolean;
    webWorkers: boolean;
    fetch: boolean;
    bigUint64Array: boolean;
  };
  missingFeatures: string[];
  message: string;
}

/**
 * Detects whether the browser supports WebMCP
 */
export function checkWebMCPSupport(): BrowserSupportResult {
  const features = {
    webassembly: typeof WebAssembly !== 'undefined',
    webWorkers: typeof Worker !== 'undefined',
    fetch: typeof fetch !== 'undefined',
    bigUint64Array: typeof BigUint64Array !== 'undefined'
  };

  const missingFeatures: string[] = [];

  if (!features.webassembly) {
    missingFeatures.push('WebAssembly');
  }
  if (!features.webWorkers) {
    missingFeatures.push('Web Workers');
  }
  if (!features.fetch) {
    missingFeatures.push('Fetch API');
  }
  if (!features.bigUint64Array) {
    missingFeatures.push('BigUint64Array');
  }

  const isSupported = missingFeatures.length === 0;

  let message: string;
  if (isSupported) {
    message = "The browser supports WebMCP, so the AI assistant feature can be used";
  } else {
    message = `The browser does not support the following features, so the AI assistant cannot be used: ${missingFeatures.join(', ')}`;
  }

  return {
    isSupported,
    features,
    missingFeatures,
    message
  };
}

/**
 * Vue Composable: detects WebMCP support
 */
export function useWebMCPSupport() {
  const supportResult = ref<BrowserSupportResult | null>(null);
  const isLoading = ref(true);

  onMounted(() => {
    try {
      supportResult.value = checkWebMCPSupport();
    } catch (error) {
      supportResult.value = {
        isSupported: false,
        features: {
          webassembly: false,
          webWorkers: false,
          fetch: false,
          bigUint64Array: false
        },
        missingFeatures: ['WebAssembly', 'Web Workers', 'Fetch API', 'BigUint64Array'],
        message: 'An error occurred while detecting browser support'
      };
    } finally {
      isLoading.value = false;
    }
  });

  return {
    supportResult,
    isLoading,
    isSupported: supportResult.value?.isSupported ?? false
  };
}

export default checkWebMCPSupport;
