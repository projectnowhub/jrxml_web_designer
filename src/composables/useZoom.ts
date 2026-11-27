import { ref } from 'vue';
import type { Ref } from 'vue';

export function useZoom(options: {
  paperWidth: Ref<number>;
  paperHeight?: Ref<number>;
  zoomConstants: {
    DEFAULT_ZOOM: number;
    MIN_ZOOM: number;
    MAX_ZOOM: number;
    OPTIMAL_ZOOM_MARGIN: number;
    ZOOM_LEVELS: number[];
  };
}) {
  const zoomLevel = ref(options.zoomConstants.DEFAULT_ZOOM);

  function resetZoom() {
    zoomLevel.value = options.zoomConstants.DEFAULT_ZOOM;
  }

  function setZoom(level: number) {
    const clamped = Math.max(
      options.zoomConstants.MIN_ZOOM,
      Math.min(options.zoomConstants.MAX_ZOOM, Number(level))
    );
    zoomLevel.value = Math.round(clamped * 100) / 100;
  }

  function zoomIn() {
    const current = Number(zoomLevel.value);
    const levels = options.zoomConstants.ZOOM_LEVELS;
    const nextLevel = levels.find((level) => level > current + 0.005);
    if (nextLevel !== undefined) {
      zoomLevel.value = nextLevel;
    } else {
      zoomLevel.value = options.zoomConstants.MAX_ZOOM;
    }
  }

  function zoomOut() {
    const current = Number(zoomLevel.value);
    const levels = options.zoomConstants.ZOOM_LEVELS;
    const prevLevel = [...levels].reverse().find((level) => level < current - 0.005);
    if (prevLevel !== undefined) {
      zoomLevel.value = prevLevel;
    } else {
      zoomLevel.value = levels[0] ?? options.zoomConstants.MIN_ZOOM;
    }
  }

  function handleZoomChange(delta: number) {
    if (delta > 0) {
      zoomIn();
    } else if (delta < 0) {
      zoomOut();
    }
  }

  function calculateOptimalZoom(): number {
    const container =
      (document.querySelector('.paper-container') as HTMLElement) ||
      (document.querySelector('.designer-canvas') as HTMLElement) ||
      (document.querySelector('.design-area-wrapper') as HTMLElement);

    let availableWidth: number;
    if (container) {
      const isPaperContainer = container.classList.contains('paper-container');
      // Fit 100% flush to available width (reserve 1px to prevent subpixel rounding scrollbar)
      availableWidth = isPaperContainer ? container.clientWidth - 1 : container.clientWidth - 31;
    } else {
      availableWidth = 800;
    }

    const pWidth = options.paperWidth.value || 595;
    const optimalZoom = Math.max(100, availableWidth) / pWidth;
    const exactZoom = Math.round(optimalZoom * 100) / 100;
    return Math.max(options.zoomConstants.MIN_ZOOM, Math.min(options.zoomConstants.MAX_ZOOM, exactZoom));
  }

  return {
    zoomLevel,
    resetZoom,
    setZoom,
    zoomIn,
    zoomOut,
    calculateOptimalZoom,
    handleZoomChange
  };
}

