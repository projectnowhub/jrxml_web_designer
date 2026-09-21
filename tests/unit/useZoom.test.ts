import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useZoom } from '@/composables/useZoom';
import { ZOOM_CONSTANTS } from '@/constants/constants';

describe('useZoom composable', () => {
  const paperWidth = ref(595);

  it('initializes with default zoom level', () => {
    const { zoomLevel } = useZoom({ paperWidth, zoomConstants: ZOOM_CONSTANTS });
    expect(zoomLevel.value).toBe(1);
  });

  it('zooms in sequentially through presets and clamps at max zoom', () => {
    const { zoomLevel, zoomIn } = useZoom({ paperWidth, zoomConstants: ZOOM_CONSTANTS });
    expect(zoomLevel.value).toBe(1);

    zoomIn();
    expect(zoomLevel.value).toBe(1.25);

    zoomIn();
    expect(zoomLevel.value).toBe(1.5);

    zoomIn();
    expect(zoomLevel.value).toBe(2);

    zoomIn();
    expect(zoomLevel.value).toBe(3);

    // Should clamp at MAX_ZOOM
    zoomIn();
    expect(zoomLevel.value).toBe(3);
  });

  it('zooms out sequentially through presets and clamps at min zoom', () => {
    const { zoomLevel, zoomOut } = useZoom({ paperWidth, zoomConstants: ZOOM_CONSTANTS });
    expect(zoomLevel.value).toBe(1);

    zoomOut();
    expect(zoomLevel.value).toBe(0.75);

    zoomOut();
    expect(zoomLevel.value).toBe(0.5);

    zoomOut();
    expect(zoomLevel.value).toBe(0.25);

    // Should clamp at MIN_ZOOM
    zoomOut();
    expect(zoomLevel.value).toBe(0.25);
  });

  it('zooms out to minimum and then zooms back in without getting stuck', () => {
    const { zoomLevel, zoomIn, zoomOut } = useZoom({ paperWidth, zoomConstants: ZOOM_CONSTANTS });

    // Zoom all the way out
    zoomOut(); // 0.75
    zoomOut(); // 0.5
    zoomOut(); // 0.25
    zoomOut(); // 0.25 (clamped)
    expect(zoomLevel.value).toBe(0.25);

    // Zoom in after zooming out
    zoomIn();
    expect(zoomLevel.value).toBe(0.5);

    zoomIn();
    expect(zoomLevel.value).toBe(0.75);

    zoomIn();
    expect(zoomLevel.value).toBe(1);
  });

  it('handleZoomChange respects delta direction', () => {
    const { zoomLevel, handleZoomChange } = useZoom({ paperWidth, zoomConstants: ZOOM_CONSTANTS });

    handleZoomChange(-1); // zoom out
    expect(zoomLevel.value).toBe(0.75);

    handleZoomChange(1); // zoom in
    expect(zoomLevel.value).toBe(1);

    handleZoomChange(1); // zoom in
    expect(zoomLevel.value).toBe(1.25);
  });

  it('handles arbitrary float zoom levels (e.g. from fit-to-window)', () => {
    const { zoomLevel, setZoom, zoomIn, zoomOut } = useZoom({ paperWidth, zoomConstants: ZOOM_CONSTANTS });

    setZoom(0.88);
    expect(zoomLevel.value).toBe(0.88);

    zoomIn();
    expect(zoomLevel.value).toBe(1);

    setZoom(0.88);
    zoomOut();
    expect(zoomLevel.value).toBe(0.75);
  });

  it('resets zoom to DEFAULT_ZOOM', () => {
    const { zoomLevel, zoomIn, resetZoom } = useZoom({ paperWidth, zoomConstants: ZOOM_CONSTANTS });

    zoomIn();
    zoomIn();
    expect(zoomLevel.value).toBe(1.5);

    resetZoom();
    expect(zoomLevel.value).toBe(1);
  });
});

