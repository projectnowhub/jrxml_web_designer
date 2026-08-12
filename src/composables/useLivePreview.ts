import { ref, computed, watch, onUnmounted } from 'vue';

export interface PreviewConfig {
  // Enable live preview
  enabled: boolean;
  // Preview delay (ms)
  debounceDelay: number;
  // Preview scope
  previewScope: 'element' | 'band' | 'page';
  // Preview animation
  animated: boolean;
  // Animation duration (ms)
  animationDuration: number;
}

export interface PreviewState {
  // Whether a preview is in progress
  isPreviewing: boolean;
  // Property being previewed
  previewedProperty: string | null;
  // Original value being previewed
  originalValue: any;
  // New value being previewed
  previewValue: any;
  // Preview start time
  previewStartTime: number;
}

export interface PreviewStyle {
  // Font related
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  // Color related
  color?: string;
  backgroundColor?: string;
  // Size related
  width?: number;
  height?: number;
  // Position related
  x?: number;
  y?: number;
  // Alignment related
  textAlign?: string;
  verticalAlign?: string;
  // Border related
  border?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: string;
  borderRadius?: number;
  // Padding related
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
}

export function useLivePreview(config?: Partial<PreviewConfig>) {
  // Config
  const previewConfig = ref<PreviewConfig>({
    enabled: true,
    debounceDelay: 100,
    previewScope: 'element',
    animated: true,
    animationDuration: 200,
    ...config,
  });

  // Preview state
  const previewState = ref<PreviewState>({
    isPreviewing: false,
    previewedProperty: null,
    originalValue: null,
    previewValue: null,
    previewStartTime: 0,
  });

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Animation frame ID
  let animationFrameId: number | null = null;

  // Preview element cache
  const previewElementCache = new Map<HTMLElement, PreviewStyle>();

  // Apply the preview style
  const applyPreviewStyle = (
    element: HTMLElement,
    property: string,
    value: any,
    originalValue: any
  ) => {
    if (!previewConfig.value.enabled) return;

    // Save the original value
    if (!previewElementCache.has(element)) {
      previewElementCache.set(element, {});
    }
    const cache = previewElementCache.get(element)!;

    // Apply the new value
    switch (property) {
      case 'fontFamily':
        cache.fontFamily = element.style.fontFamily;
        element.style.fontFamily = value;
        break;
      case 'fontSize':
        cache.fontSize = parseInt(element.style.fontSize) || undefined;
        element.style.fontSize = `${value}px`;
        break;
      case 'fontWeight':
        cache.fontWeight = element.style.fontWeight;
        element.style.fontWeight = value ? 'bold' : 'normal';
        break;
      case 'fontStyle':
        cache.fontStyle = element.style.fontStyle;
        element.style.fontStyle = value ? 'italic' : 'normal';
        break;
      case 'textDecoration':
        cache.textDecoration = element.style.textDecoration;
        element.style.textDecoration = value ? 'underline' : 'none';
        break;
      case 'color':
        cache.color = element.style.color;
        element.style.color = value;
        break;
      case 'backgroundColor':
        cache.backgroundColor = element.style.backgroundColor;
        element.style.backgroundColor = value;
        break;
      case 'width':
        cache.width = parseInt(element.style.width) || undefined;
        element.style.width = `${value}px`;
        break;
      case 'height':
        cache.height = parseInt(element.style.height) || undefined;
        element.style.height = `${value}px`;
        break;
      case 'x':
        cache.x = parseInt(element.style.left) || undefined;
        element.style.left = `${value}px`;
        break;
      case 'y':
        cache.y = parseInt(element.style.top) || undefined;
        element.style.top = `${value}px`;
        break;
      case 'textAlign':
        cache.textAlign = element.style.textAlign;
        element.style.textAlign = value;
        break;
      case 'verticalAlign':
        cache.verticalAlign = element.style.verticalAlign;
        element.style.verticalAlign = value;
        break;
      case 'border':
        cache.border = element.style.border;
        element.style.border = value;
        break;
      case 'borderColor':
        cache.borderColor = element.style.borderColor;
        element.style.borderColor = value;
        break;
      case 'borderWidth':
        cache.borderWidth = parseInt(element.style.borderWidth) || undefined;
        element.style.borderWidth = `${value}px`;
        break;
      case 'borderStyle':
        cache.borderStyle = element.style.borderStyle;
        element.style.borderStyle = value;
        break;
      case 'borderRadius':
        cache.borderRadius = parseInt(element.style.borderRadius) || undefined;
        element.style.borderRadius = `${value}px`;
        break;
      case 'padding':
        cache.padding = parseInt(element.style.padding) || undefined;
        element.style.padding = `${value}px`;
        break;
      case 'paddingTop':
        cache.paddingTop = parseInt(element.style.paddingTop) || undefined;
        element.style.paddingTop = `${value}px`;
        break;
      case 'paddingRight':
        cache.paddingRight = parseInt(element.style.paddingRight) || undefined;
        element.style.paddingRight = `${value}px`;
        break;
      case 'paddingBottom':
        cache.paddingBottom = parseInt(element.style.paddingBottom) || undefined;
        element.style.paddingBottom = `${value}px`;
        break;
      case 'paddingLeft':
        cache.paddingLeft = parseInt(element.style.paddingLeft) || undefined;
        element.style.paddingLeft = `${value}px`;
        break;
      default:
        console.warn(`Unsupported preview property: ${property}`);
        return;
    }

    // Add a transition animation
    if (previewConfig.value.animated) {
      element.style.transition = `all ${previewConfig.value.animationDuration}ms ease`;
    }

    // Update the preview state
    previewState.value = {
      isPreviewing: true,
      previewedProperty: property,
      originalValue,
      previewValue: value,
      previewStartTime: Date.now(),
    };
  };

  // Restore the original style
  const restoreOriginalStyle = (element: HTMLElement) => {
    const cache = previewElementCache.get(element);
    if (!cache) return;

    // Restore all cached original values
    Object.entries(cache).forEach(([property, value]) => {
      if (value !== undefined) {
        (element.style as any)[property] = value;
      }
    });

    // Clear the transition animation
    element.style.transition = '';

    // Clear the cache
    previewElementCache.delete(element);

    // Update the preview state
    previewState.value = {
      isPreviewing: false,
      previewedProperty: null,
      originalValue: null,
      previewValue: null,
      previewStartTime: 0,
    };
  };

  // Debounced preview
  const debouncedPreview = (
    element: HTMLElement,
    property: string,
    value: any,
    originalValue: any
  ) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      applyPreviewStyle(element, property, value, originalValue);
    }, previewConfig.value.debounceDelay);
  };

  // Start the preview
  const startPreview = (
    element: HTMLElement,
    property: string,
    value: any,
    originalValue: any
  ) => {
    if (!previewConfig.value.enabled) return;

    // If already previewing the same property, update directly
    if (previewState.value.isPreviewing && previewState.value.previewedProperty === property) {
      applyPreviewStyle(element, property, value, originalValue);
    } else {
      // Otherwise, stop the previous preview first
      if (previewState.value.isPreviewing) {
        stopPreview(element);
      }
      // Start the new preview
      debouncedPreview(element, property, value, originalValue);
    }
  };

  // Stop the preview
  const stopPreview = (element: HTMLElement) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    restoreOriginalStyle(element);
  };

  // Confirm the preview (apply it as the final value)
  const confirmPreview = (element: HTMLElement) => {
    // Clear the cache, keeping the current style
    previewElementCache.delete(element);

    // Clear the transition animation
    element.style.transition = '';

    // Update the state
    previewState.value = {
      isPreviewing: false,
      previewedProperty: null,
      originalValue: null,
      previewValue: null,
      previewStartTime: 0,
    };
  };

  // Toggle the preview state
  const togglePreview = () => {
    previewConfig.value.enabled = !previewConfig.value.enabled;

    // If preview is disabled, restore all elements currently being previewed
    if (!previewConfig.value.enabled) {
      previewElementCache.forEach((_, element) => {
        restoreOriginalStyle(element);
      });
    }
  };

  // Update the preview config
  const updateConfig = (newConfig: Partial<PreviewConfig>) => {
    previewConfig.value = { ...previewConfig.value, ...newConfig };
  };

  // Get the preview duration
  const getPreviewDuration = computed(() => {
    if (!previewState.value.isPreviewing) return 0;
    return Date.now() - previewState.value.previewStartTime;
  });

  // Cleanup
  onUnmounted(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    // Restore all elements currently being previewed
    previewElementCache.forEach((_, element) => {
      restoreOriginalStyle(element);
    });
  });

  return {
    previewConfig,
    previewState,
    startPreview,
    stopPreview,
    confirmPreview,
    togglePreview,
    updateConfig,
    getPreviewDuration,
  };
}
