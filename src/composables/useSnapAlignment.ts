import { ref, watch } from 'vue';

// Guide lines shown while an element snaps, in the coordinates of one band on
// one page sheet: x values are vertical lines, y values horizontal ones
export interface AlignmentGuideLines {
  bandIndex: number;
  pageIndex: number;
  x: number[];
  y: number[];
}

const STORAGE_KEY = 'designerSnapSettings';

interface SnapSettings {
  snapToGrid: boolean;
  snapToAlignment: boolean;
  showGrid: boolean;
}

const DEFAULTS: SnapSettings = { snapToGrid: true, snapToAlignment: true, showGrid: true };

function loadSettings(): SnapSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULTS, ...(saved && typeof saved === 'object' ? saved : {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

// Snap and grid toggles (remembered per browser) and the guides being shown
export function useSnapAlignment() {
  const saved = loadSettings();
  const enableSnapToGrid = ref(saved.snapToGrid);
  const enableSnapToAlignment = ref(saved.snapToAlignment);
  const showGrid = ref(saved.showGrid);

  watch([enableSnapToGrid, enableSnapToAlignment, showGrid], ([snapToGrid, snapToAlignment, grid]) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ snapToGrid, snapToAlignment, showGrid: grid }),
      );
    } catch {
      // Storage unavailable: the toggles still work for this session
    }
  });

  const alignmentLines = ref<AlignmentGuideLines | null>(null);

  const setAlignmentLines = (lines: AlignmentGuideLines | null) => {
    alignmentLines.value = lines && (lines.x.length || lines.y.length) ? lines : null;
  };

  const clearAlignmentLines = () => {
    alignmentLines.value = null;
  };

  return {
    enableSnapToGrid,
    enableSnapToAlignment,
    showGrid,
    alignmentLines,
    setAlignmentLines,
    clearAlignmentLines,
  };
}
