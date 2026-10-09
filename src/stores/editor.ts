// How the designer is shown, not what is in the report: zoom, snapping and
// grid (remembered per browser), alignment guides, and the panel layout.
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useZoom } from "@/composables/useZoom";
import { useSnapAlignment } from "@/composables/useSnapAlignment";
import { PANEL_CONSTANTS, ZOOM_CONSTANTS } from "@/constants/constants";
import { useReportStore } from "./report";

export const useEditorStore = defineStore("editor", () => {
  const report = useReportStore();
  const paperWidth = computed(() => report.paperWidth);

  // Zoom of the canvas
  const zoom = useZoom({ paperWidth, zoomConstants: ZOOM_CONSTANTS });

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
  const propertyPanelWidth = ref(PANEL_CONSTANTS.DEFAULT_PROPERTY_PANEL_WIDTH);
  const rightPanelCollapsed = ref(false);
  const leftPanelWidth = ref(PANEL_CONSTANTS.DEFAULT_LEFT_PANEL_WIDTH);
  const leftPanelCollapsed = ref(false);
  const bottomPanelHeight = ref(PANEL_CONSTANTS.DEFAULT_BOTTOM_PANEL_HEIGHT);

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
    propertyPanelWidth.value = PANEL_CONSTANTS.DEFAULT_PROPERTY_PANEL_WIDTH;
    rightPanelCollapsed.value = false;
    leftPanelWidth.value = PANEL_CONSTANTS.DEFAULT_LEFT_PANEL_WIDTH;
    leftPanelCollapsed.value = false;
    bottomPanelHeight.value = PANEL_CONSTANTS.DEFAULT_BOTTOM_PANEL_HEIGHT;
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
