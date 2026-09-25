import { ref } from 'vue';
import type { Ref } from 'vue';

export function useZoom(options: {
  paperWidth: Ref<number>;
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
    const levels = [...options.zoomConstants.ZOOM_LEVELS].sort((a, b) => a - b);
    const nextLevel = levels.find((level) => level > current + 0.01);
    if (nextLevel !== undefined) {
      zoomLevel.value = nextLevel;
    } else {
      zoomLevel.value = options.zoomConstants.MAX_ZOOM;
    }
  }

  function zoomOut() {
    const current = Number(zoomLevel.value);
    const levels = [...options.zoomConstants.ZOOM_LEVELS].sort((a, b) => a - b);
    const prevLevel = [...levels].reverse().find((level) => level < current - 0.01);
    if (prevLevel !== undefined) {
      zoomLevel.value = prevLevel;
    } else {
      zoomLevel.value = options.zoomConstants.MIN_ZOOM;
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
    const designerContainer = document.querySelector('.designer-canvas') || document.querySelector('.pdf-designer');
    if (!designerContainer) {
      return options.zoomConstants.DEFAULT_ZOOM;
    }

    const availableWidth = (designerContainer as HTMLElement).clientWidth - 40;
    const widthRatio = availableWidth / options.paperWidth.value;
    const optimalZoom = widthRatio * options.zoomConstants.OPTIMAL_ZOOM_MARGIN;

    const zoomLevels = options.zoomConstants.ZOOM_LEVELS;
    let closestZoom = zoomLevels[0] ?? options.zoomConstants.DEFAULT_ZOOM;
    let minDiff = Math.abs(closestZoom - optimalZoom);

    for (let i = 1; i < zoomLevels.length; i++) {
      const level = zoomLevels[i];
      if (level === undefined) continue;
      const diff = Math.abs(level - optimalZoom);
      if (diff < minDiff) {
        minDiff = diff;
        closestZoom = level;
      }
    }

    return Math.max(options.zoomConstants.MIN_ZOOM, Math.min(options.zoomConstants.MAX_ZOOM, closestZoom));
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

