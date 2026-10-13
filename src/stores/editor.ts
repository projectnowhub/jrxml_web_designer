// How the designer is shown, not what is in the report: zoom, snapping and
// grid (remembered per browser), alignment guides, and the panel layout.
import { defineStore } from "pinia";
import { computed, ref, watch, type Ref } from "vue";
import { useZoom } from "@/composables/useZoom";
import { useSnapAlignment } from "@/composables/useSnapAlignment";
import { PANEL_CONSTANTS, ZOOM_CONSTANTS } from "@/constants/constants";
import { useReportStore } from "./report";

export const useEditorStore = defineStore("editor", () => {
  const report = useReportStore();
  const paperWidth = computed(() => report.paperWidth);
  const paperHeight = computed(() => report.paperHeight);

  // Zoom of the canvas
  const zoom = useZoom({ paperWidth, paperHeight, zoomConstants: ZOOM_CONSTANTS });

  // Snap to grid / to other elements, show the grid; the guides being drawn
  const snap = useSnapAlignment();

  // An element or band is being dragged or resized (the model changes on
  // every mouse move; JRXML, history and auto-save wait for the end)
  const isDraggingOrResizing = ref(false);

  // The page area has the keyboard (Delete, arrows and shortcuts act on the
  // selection; not while typing in a panel)
  const isDesignAreaFocused = ref(true);

  // Panels: which are open, their sizes and tabs
  const activeTab = ref("pageSettings");
  const showLeftPanel = ref(true);
  const showRightPanel = ref(true);
  const showBottomPanel = ref(false);
  const showAIChat = ref(false);
  const aiChatPanelHeight = ref(300);
  // 'properties' or 'ai'
  const rightPanelTab = ref("properties");
  // Panel sizes are remembered per browser
  const savedSize = (key: string, fallback: number, min: number, max = Infinity) => {
    try {
      const raw = localStorage.getItem(key);
      const n = raw === null ? NaN : Number(raw);
      return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
    } catch {
      return fallback;
    }
  };
  const remember = (key: string, size: Ref<number>) =>
    watch(size, (n) => {
      try {
        localStorage.setItem(key, String(Math.round(n)));
      } catch {
        // Storage blocked: the size is just not remembered
      }
    });

  const RIGHT_WIDTH_KEY = "designer.rightPanelWidth";
  const LEFT_WIDTH_KEY = "designer.leftPanelWidth";
  const BOTTOM_HEIGHT_KEY = "designer.bottomPanelHeight";
  const savedRightWidth = () =>
    savedSize(
      RIGHT_WIDTH_KEY,
      PANEL_CONSTANTS.DEFAULT_PROPERTY_PANEL_WIDTH,
      PANEL_CONSTANTS.PROPERTY_PANEL_MIN_WIDTH,
      PANEL_CONSTANTS.PROPERTY_PANEL_MAX_WIDTH,
    );
  const savedLeftWidth = () =>
    savedSize(
      LEFT_WIDTH_KEY,
      PANEL_CONSTANTS.DEFAULT_LEFT_PANEL_WIDTH,
      PANEL_CONSTANTS.LEFT_PANEL_MIN_WIDTH,
      PANEL_CONSTANTS.LEFT_PANEL_MAX_WIDTH,
    );
  const savedBottomHeight = () => savedSize(BOTTOM_HEIGHT_KEY, PANEL_CONSTANTS.DEFAULT_BOTTOM_PANEL_HEIGHT, 150);

  const propertyPanelWidth = ref(savedRightWidth());
  const rightPanelCollapsed = ref(false);
  const leftPanelWidth = ref(savedLeftWidth());
  const leftPanelCollapsed = ref(false);
  const bottomPanelHeight = ref(savedBottomHeight());
  remember(RIGHT_WIDTH_KEY, propertyPanelWidth);
  remember(LEFT_WIDTH_KEY, leftPanelWidth);
  remember(BOTTOM_HEIGHT_KEY, bottomPanelHeight);

  // The layout a designer opens with; the snap and grid toggles are the
  // user's settings and stay as they are
  function reset() {
    zoom.resetZoom();
    isDraggingOrResizing.value = false;
    isDesignAreaFocused.value = true;
    snap.clearAlignmentLines();
    activeTab.value = "pageSettings";
    showLeftPanel.value = true;
    showRightPanel.value = true;
    showBottomPanel.value = false;
    showAIChat.value = false;
    aiChatPanelHeight.value = 300;
    rightPanelTab.value = "properties";
    propertyPanelWidth.value = savedRightWidth();
    rightPanelCollapsed.value = false;
    leftPanelWidth.value = savedLeftWidth();
    leftPanelCollapsed.value = false;
    bottomPanelHeight.value = savedBottomHeight();
  }

  return {
    zoomLevel: zoom.zoomLevel,
    resetZoom: zoom.resetZoom,
    setZoom: zoom.setZoom,
    zoomIn: zoom.zoomIn,
    zoomOut: zoom.zoomOut,
    handleZoomChange: zoom.handleZoomChange,
    calculateOptimalZoom: zoom.calculateOptimalZoom,
    enableSnapToGrid: snap.enableSnapToGrid,
    enableSnapToAlignment: snap.enableSnapToAlignment,
    showGrid: snap.showGrid,
    alignmentLines: snap.alignmentLines,
    setAlignmentLines: snap.setAlignmentLines,
    clearAlignmentLines: snap.clearAlignmentLines,
    isDraggingOrResizing,
    isDesignAreaFocused,
    activeTab,
    showLeftPanel,
    showRightPanel,
    showBottomPanel,
    showAIChat,
    aiChatPanelHeight,
    rightPanelTab,
    propertyPanelWidth,
    rightPanelCollapsed,
    leftPanelWidth,
    leftPanelCollapsed,
    bottomPanelHeight,
    reset,
  };
});
