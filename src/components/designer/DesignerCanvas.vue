<template>
  <div ref="designerCanvasRef" class="designer-canvas" @click="setDesignAreaFocused">
    <!-- Drag feedback layer -->
    <DragFeedbackLayer :feedback="dragFeedback" />

    <!-- Top ruler container -->
    <div class="top-ruler-container">
      <!-- Top-left corner blank area -->
      <div class="corner-space">
        <div class="unit-label">px</div>
      </div>
      <!-- Horizontal ruler -->
      <div class="horizontal-ruler" ref="horizontalRulerRef">
        <div
          class="ruler-content"
          :style="{ width: paperWidth * zoomLevel + 'px' }"
        >
          <div
            v-for="tick in horizontalRulerTicks"
            :key="tick.position"
            class="tick"
            :class="{ major: tick.major, minor: !tick.major }"
            :style="{ left: tick.position * zoomLevel + 'px' }"
          ></div>
          <div
            v-for="label in horizontalRulerLabels"
            :key="label.position"
            class="label"
            :style="{ left: label.position * zoomLevel + 'px' }"
          >
            {{ label.value }}
          </div>
        </div>
      </div>
    </div>

    <!-- Left ruler and paper container -->
    <div class="main-content">
      <!-- Vertical ruler -->
      <div class="vertical-ruler-container">
        <div class="vertical-ruler" ref="verticalRulerRef">
          <div
            class="ruler-content"
            :style="{ height: totalRulerHeight * zoomLevel + 'px' }"
          >
            <div
              v-for="tick in verticalRulerTicks"
              :key="tick.position"
              class="tick"
              :class="{ major: tick.major, minor: !tick.major }"
              :style="{ top: tick.position * zoomLevel + 'px' }"
            ></div>
            <div
              v-for="label in verticalRulerLabels"
              :key="label.position"
              class="label"
              :style="{ top: label.position * zoomLevel + 'px' }"
            >
              {{ label.value }}
            </div>
          </div>
        </div>
      </div>

      <!-- Paper container -->
      <div
        class="paper-container"
        ref="paperContainerRef"
        @contextmenu="handleCanvasContextMenu"
      >
        <div class="pages-wrapper">
          <!-- Multi-page sheets -->
          <div
            v-for="pIndex in totalPages"
            :key="'page-sheet-wrapper-' + pIndex"
            class="page-sheet-wrapper"
            :style="{
              width: paperWidth * zoomLevel + 'px',
              height: paperHeight * zoomLevel + 'px',
              marginBottom: 32 * zoomLevel + 'px',
              position: 'relative',
            }"
          >
            <div
              class="paper page-sheet"
              :data-page-index="pIndex - 1"
              :style="{
                width: paperWidth + 'px',
                height: paperHeight + 'px',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left',
              }"
              :class="{ focused: isDesignAreaFocused }"
              @drop="handleDrop($event, pIndex - 1)"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @mousedown="startSelection"
            >
              <!-- Floating Page Sheet Header / Badge in margin -->
              <div class="page-sheet-header">
                <span class="page-sheet-badge"
                  >Page {{ pIndex }} of {{ totalPages }}</span
                >
                <button
                  v-if="pIndex > 1"
                  class="delete-page-btn"
                  @click.stop="emit('delete-page', pIndex - 1)"
                  title="Delete Page"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    />
                  </svg>
                  Delete Page
                </button>
              </div>

              <!-- Report margin container -->
              <div
                class="pager"
                :style="{
                  padding:
                    (reportProperties.topMargin || 0) +
                    'px ' +
                    (reportProperties.rightMargin || 0) +
                    'px ' +
                    (reportProperties.bottomMargin || 0) +
                    'px ' +
                    (reportProperties.leftMargin || 0) +
                    'px',
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  position: 'relative',
                  backgroundImage: showGrid
                    ? 'linear-gradient(to right, #e0e0e0 1px, transparent 1px), linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)'
                    : 'none',
                  backgroundSize: showGrid
                    ? uiConstants.GRID_SIZE +
                      'px ' +
                      uiConstants.GRID_SIZE +
                      'px'
                    : 'auto',
                }"
              >
                <!-- Dynamic Bands for this Page -->
                <div
                  v-for="bItem in getBandsForPage(pIndex)"
                  :key="`page-${pIndex}-band-${bItem.band.type}-${bItem.bandIndex}`"
                  class="band"
                  :class="[
                    `${bItem.band.type}-band`,
                    bItem.band.type === 'columnFooter' ? 'column-footer-band' : '',
                    bItem.band.type === 'pageFooter' ? 'page-footer-band' : '',
                    bItem.band.type === 'pageHeader' ? 'page-header-band' : '',
                    bItem.band.type === 'columnHeader' ? 'column-header-band' : '',
                    {
                      'dragging-target':
                        highlightedBandIndex === bItem.bandIndex,
                      'drag-over': highlightedBandIndex === bItem.bandIndex,
                    },
                  ]"
                  :data-band-index="bItem.bandIndex"
                  :data-band-name="bItem.band.type"
                  :style="{ height: bItem.effectiveHeight + 'px' }"
                  @click.stop="selectBand(bItem.bandIndex)"
                >
                  <div class="band-background-label-container">
                    <span class="band-background-label">{{
                      bItem.displayLabel
                    }}</span>
                  </div>

                  <div class="band-content">
                    <!-- Detail Band Elements (partitioned by page) -->
                    <template v-if="bItem.isDetail">
                      <ElementFactory
                        v-for="{
                          element: item,
                          originalIndex,
                        } in getDetailElementsForPage(pIndex - 1)"
                        :key="`page-${pIndex}-detail-${item.uuid || originalIndex}`"
                        :element="item"
                        :band-index="bItem.bandIndex"
                        :element-index="originalIndex"
                        :selected-element="selectedElement"
                        :selected-elements="selectedElements"
                        :editing-element="editingElement"
                        :is-dragging="isDraggingOrResizing"
                        :report-font-family="reportProperties.defaultFont?.name"
                        :report-font-size="reportProperties.defaultFont?.size"
                        :report-is-bold="reportProperties.defaultFont?.isBold"
                        :report-is-italic="reportProperties.defaultFont?.isItalic"
                        :report-is-underline="
                          reportProperties.defaultFont?.isUnderline
                        "
                        :is-out-of-bounds="
                          isElementOutOfBounds(bItem.bandIndex, originalIndex)
                        "
                        :zoom-level="zoomLevel"
                        :report-styles="props.reportStyles"
                        :table-styles="props.tableStyles"
                        @select="selectElement"
                        @drag-start="startDragging"
                        @resize-start="startResizingElement"
                        @contextmenu="handleElementContextMenu"
                        @start-editing="startEditing"
                        @finish-editing="finishEditing"
                        @cancel-editing="cancelEditing"
                        @check-fields="checkFields"
                        @move-column="handleMoveColumn"
                        @add-columns-to-group="handleAddColumnsToGroup"
                        @join-columns-to-existing-group="
                          handleJoinColumnsToExistingGroup
                        "
                        @update-jrxml="emit('update-jrxml')"
                      />
                      <div
                        v-if="
                          getDetailElementsForPage(pIndex - 1).length === 0
                        "
                        class="canvas-empty-state"
                      >
                        <div class="empty-state-text">
                          Drag elements onto Page {{ pIndex }}
                        </div>
                      </div>
                    </template>

                    <!-- Standard Band Elements -->
                    <template v-else>
                      <ElementFactory
                        v-for="(item, index) in bItem.band.elements"
                        :key="`page-${pIndex}-${bItem.band.type}-${item.uuid || index}`"
                        :element="item"
                        :band-index="bItem.bandIndex"
                        :element-index="index"
                        :selected-element="selectedElement"
                        :selected-elements="selectedElements"
                        :editing-element="editingElement"
                        :is-dragging="isDraggingOrResizing"
                        :report-font-family="reportProperties.defaultFont?.name"
                        :report-font-size="reportProperties.defaultFont?.size"
                        :report-is-bold="reportProperties.defaultFont?.isBold"
                        :report-is-italic="reportProperties.defaultFont?.isItalic"
                        :report-is-underline="
                          reportProperties.defaultFont?.isUnderline
                        "
                        :is-out-of-bounds="
                          isElementOutOfBounds(bItem.bandIndex, index)
                        "
                        :zoom-level="zoomLevel"
                        :report-styles="props.reportStyles"
                        :table-styles="props.tableStyles"
                        :page-number="pIndex"
                        :total-pages="totalPages"
                        @select="selectElement"
                        @drag-start="startDragging"
                        @resize-start="startResizingElement"
                        @contextmenu="handleElementContextMenu"
                        @start-editing="startEditing"
                        @finish-editing="finishEditing"
                        @cancel-editing="cancelEditing"
                        @check-fields="checkFields"
                        @move-column="handleMoveColumn"
                        @add-columns-to-group="handleAddColumnsToGroup"
                        @join-columns-to-existing-group="
                          handleJoinColumnsToExistingGroup
                        "
                        @update-jrxml="emit('update-jrxml')"
                      />
                      <!-- Default page number indicator if page footer is empty -->
                      <div
                        v-if="
                          bItem.band.type === 'pageFooter' &&
                          (!bItem.band.elements ||
                            bItem.band.elements.length === 0)
                        "
                        class="footer-page-indicator"
                      >
                        <span>Page {{ pIndex }} of {{ totalPages }}</span>
                      </div>
                    </template>
                  </div>

                  <!-- Band resize handle for non-detail bands -->
                  <div
                    v-if="bItem.showResizeHandle"
                    class="band-resize-handle"
                    @mousedown.stop="
                      startResizingBand($event, bItem.bandIndex)
                    "
                  ></div>
                </div>

                <!-- Alignment lines -->
                <div
                  v-if="isDraggingOrResizing && enableSnapToAlignment"
                  class="alignment-lines"
                >
                  <div
                    v-for="(line, index) in alignmentLines.horizontal"
                    :key="'h-' + index"
                    class="alignment-line horizontal"
                    :style="{ top: line + 'px' }"
                  ></div>
                  <div
                    v-for="(line, index) in alignmentLines.vertical"
                    :key="'v-' + index"
                    class="alignment-line vertical"
                    :style="{ left: line + 'px' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Add New Page Button at bottom of sheets -->
          <div
            class="add-page-container"
            :style="{
              width: paperWidth * zoomLevel + 'px',
              paddingTop: '8px',
            }"
          >
            <button class="add-page-btn" @click="emit('add-page')">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add New Page</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Selection box -->
      <SelectionBox
        :start-x="selectionBox.startX"
        :start-y="selectionBox.startY"
        :end-x="selectionBox.endX"
        :end-y="selectionBox.endY"
        :visible="selectionBox.visible"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from "vue";
import ElementFactory from "../elements/ElementFactory.vue";
import SelectionBox from "./SelectionBox.vue";
import DragFeedbackLayer from "./DragFeedbackLayer.vue";
import { BAND_CONSTANTS } from "@/constants/constants";
import { getBandDisplayName } from "@/utils/bandUtils";
import type { Band } from "@/types";
import type { DragFeedback } from "@/composables/useDragFeedback";
import { useI18n } from "vue-i18n";
import { NCheckbox, NSpace } from "naive-ui";

const { t } = useI18n();

// Props
interface Props {
  paperWidth: number;
  paperHeight: number;
  zoomLevel: number;
  totalPages?: number;
  reportProperties: any;
  bands: Band[];
  selectedBandIndex: number | null;
  highlightedBandIndex: number | null;
  selectedElement: any;
  selectedElements: {
    bandIndex: number;
    elementIndex: number;
    parentFrameIndex?: number;
  }[]; // Added multi-select support
  editingElement: any;
  isDraggingOrResizing: boolean;
  horizontalRulerTicks: any[];
  horizontalRulerLabels: any[];
  verticalRulerTicks: any[];
  verticalRulerLabels: any[];
  alignmentLines: any;
  isDesignAreaFocused: boolean;
  uiConstants: any;
  outOfBoundsElements: Array<{
    bandIndex: number;
    elementIndex: number;
    element: any;
  }>;
  enableSnapToGrid: boolean;
  enableSnapToAlignment: boolean;
  showGrid: boolean;
  reportStyles?: any[];
  tableStyles?: {
    tableHeader: string;
    columnHeader: string;
    columnFooter: string;
    detailCell: string;
  };
  dragFeedback?: DragFeedback; // New: drag feedback
}

const props = withDefaults(defineProps<Props>(), {
  paperWidth: 0,
  paperHeight: 0,
  zoomLevel: 1,
  totalPages: 1,
  reportProperties: () => ({}),
  bands: () => [],
  selectedBandIndex: null,
  highlightedBandIndex: null,
  selectedElement: null,
  selectedElements: () => [], // Default value for multi-select support
  editingElement: null,
  isDraggingOrResizing: false,
  horizontalRulerTicks: () => [],
  horizontalRulerLabels: () => [],
  verticalRulerTicks: () => [],
  verticalRulerLabels: () => [],
  alignmentLines: () => ({ horizontal: [], vertical: [] }),
  isDesignAreaFocused: false,
  uiConstants: () => ({}),
  outOfBoundsElements: () => [],
  enableSnapToGrid: false,
  enableSnapToAlignment: false,
  showGrid: true,
  reportStyles: () => [],
  tableStyles: () => ({
    tableHeader: "Table_TH",
    columnHeader: "Table_CH",
    columnFooter: "Table_CH",
    detailCell: "Table_TD",
  }),
  dragFeedback: () => ({
    previewElement: null,
    previewPosition: null,
    previewSize: null,
    droppableZones: [],
    snapPoints: [],
    snapLines: [],
    isDragging: false,
    draggedElementInfo: null,
  }), // New: default value for drag feedback
});

// Emits
const emit = defineEmits([
  "set-design-area-focused",
  "handle-drop",
  "handle-drag-over",
  "handle-drag-leave",
  "select-band",
  "select-element",
  "start-dragging",
  "start-resizing-element",
  "start-editing",
  "finish-editing",
  "cancel-editing",
  "start-resizing-band",
  "zoom-change",
  "select-elements-in-rect", // Added rect-selection event
  "clear-selection", // Added clear-selection event
  "check-fields", // Added field-check event
  "contextmenu", // Added context menu event
  "move-column", // Added column-move event
  "add-columns-to-group", // Added column-grouping event
  "join-columns-to-existing-group", // Added join-column-to-existing-group event
  "update:enableSnapToGrid", // Added snap-to-grid toggle event
  "update:enableSnapToAlignment", // Added snap-to-alignment toggle event
  "update:showGrid", // Added show/hide grid event
  "update:table-styles", // Added table style update event
  "reset-zoom", // Added reset zoom event
  "update-jrxml", // Added JRXML update event
  "canvas-contextmenu", // Added canvas context menu event
  "add-page",
  "delete-page",
]);

// Computed detail band index
const detailBandIndex = computed(() =>
  props.bands.findIndex((b) => b.type === "detail"),
);

const totalPages = computed(() => Math.max(1, props.totalPages || 1));

const totalRulerHeight = computed(() => {
  const pages = totalPages.value;
  const pageGap = 32;
  return props.paperHeight * pages + Math.max(0, (pages - 1) * pageGap);
});

// Determine if a band is visible on the given page
function isBandVisibleOnPage(
  band: Band,
  _pIndex: number,
  _total: number,
): boolean {
  // Background is an underlay layer, excluded from stacked vertical flow
  if (band.type === "background") return false;

  // Non-detail bands with <= 0 height and no elements are hidden
  if (
    band.type !== "detail" &&
    band.height <= 0 &&
    (!band.elements || band.elements.length === 0)
  ) {
    return false;
  }

  return true;
}

// Generate contextual display label for each band
function getBandDisplayLabel(bandType: string, pIndex: number): string {
  const name = getBandDisplayName(bandType);
  if (bandType === "detail") {
    return `${name} (Page ${pIndex})`;
  }

  return name;
}

const getDetailElementsForPage = (pageIdx: number) => {
  if (detailBandIndex.value === -1) return [];
  const detailBand = props.bands[detailBandIndex.value];
  if (!detailBand || !detailBand.elements) return [];
  const result: Array<{ element: any; originalIndex: number }> = [];
  detailBand.elements.forEach((el, index) => {
    const elPage = el.pageIndex ?? 0;
    if (elPage === pageIdx) {
      result.push({ element: el, originalIndex: index });
    }
  });
  return result;
};

// Calculate remaining height for detail band dynamically based on all visible non-detail bands on page
const getPageDetailHeight = (pageIdx: number) => {
  if (detailBandIndex.value === -1) return 100;
  const detailBand = props.bands[detailBandIndex.value];
  if (!detailBand) return 100;

  const pIndex = pageIdx + 1;
  const topMargin = props.reportProperties?.topMargin || 0;
  const bottomMargin = props.reportProperties?.bottomMargin || 0;
  const availableHeight = props.paperHeight - topMargin - bottomMargin;

  let otherBandsHeight = 0;
  props.bands.forEach((b) => {
    if (
      b.type !== "detail" &&
      isBandVisibleOnPage(b, pIndex, totalPages.value)
    ) {
      otherBandsHeight += b.height || 0;
    }
  });

  return Math.max(20, availableHeight - otherBandsHeight);
};

interface PageBandInfo {
  band: Band;
  bandIndex: number;
  isDetail: boolean;
  effectiveHeight: number;
  displayLabel: string;
  showResizeHandle: boolean;
}

// Get the dynamic list of bands for a given page
const getBandsForPage = (pIndex: number): PageBandInfo[] => {
  const result: PageBandInfo[] = [];
  props.bands.forEach((band, bandIndex) => {
    if (!isBandVisibleOnPage(band, pIndex, totalPages.value)) {
      return;
    }
    const isDetail = band.type === "detail";
    result.push({
      band,
      bandIndex,
      isDetail,
      effectiveHeight: isDetail
        ? getPageDetailHeight(pIndex - 1)
        : band.height || 0,
      displayLabel: getBandDisplayLabel(band.type, pIndex),
      showResizeHandle: !isDetail,
    });
  });
  return result;
};

// Selection box state
const selectionBox = ref({
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  visible: false,
});

const isSelecting = ref(false);

const designerCanvasRef = ref<HTMLElement | null>(null);
const horizontalRulerRef = ref<HTMLElement | null>(null);
const verticalRulerRef = ref<HTMLElement | null>(null);
const paperContainerRef = ref<HTMLElement | null>(null);

// Methods
const setDesignAreaFocused = () => {
  emit("set-design-area-focused");
};

const handleDrop = (event: DragEvent, pageIndex: number = 0) => {
  emit("handle-drop", event, pageIndex);
};

const handleDragOver = (event: DragEvent) => {
  emit("handle-drag-over", event);
};

const handleDragLeave = (event: DragEvent) => {
  emit("handle-drag-leave", event);
};

const selectBand = (bandIndex: number) => {
  emit("select-band", bandIndex);
};

const selectElement = (
  bandIndex: number,
  elementIndex: number,
  isMultiSelect = false,
  parentFrameIndex?: number,
) => {
  emit(
    "select-element",
    bandIndex,
    elementIndex,
    isMultiSelect,
    parentFrameIndex,
  );
};

const startDragging = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  emit("start-dragging", event, bandIndex, elementIndex, parentFrameIndex);
};

const startResizingElement = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  emit(
    "start-resizing-element",
    event,
    bandIndex,
    elementIndex,
    "se",
    parentFrameIndex,
  ); // Default direction is 'se'
};

const startEditing = (
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  emit("start-editing", bandIndex, elementIndex, parentFrameIndex);
};

const finishEditing = () => {
  // Since ElementFactory's finishEditing event doesn't pass parameters, we need to get the info from editingElement
  if (props.editingElement) {
    emit("finish-editing");
  }
};

const cancelEditing = () => {
  // Since ElementFactory's cancelEditing event doesn't pass parameters, we need to get the info from editingElement
  if (props.editingElement) {
    emit("cancel-editing");
  }
};

const checkFields = (fields: string[]) => {
  emit("check-fields", fields);
};

// Handle column move event
const handleMoveColumn = (
  elementIndex: number,
  fromIndex: number,
  toIndex: number,
  bandIndex: number,
  parentFrameIndex?: number,
) => {
  emit(
    "move-column",
    elementIndex,
    fromIndex,
    toIndex,
    bandIndex,
    parentFrameIndex,
  );
};

// Handle adding selected columns to a group
const handleAddColumnsToGroup = (
  elementIndex: number,
  columnIndices: number[],
  bandIndex: number,
  parentFrameIndex?: number,
) => {
  emit(
    "add-columns-to-group",
    elementIndex,
    columnIndices,
    bandIndex,
    parentFrameIndex,
  );
};

// Handle adding selected columns to an existing group
const handleJoinColumnsToExistingGroup = (
  elementIndex: number,
  columnIndices: number[],
  bandIndex: number,
  parentFrameIndex?: number,
) => {
  emit(
    "join-columns-to-existing-group",
    elementIndex,
    columnIndices,
    bandIndex,
    parentFrameIndex,
  );
};

// Handle element context menu
const handleElementContextMenu = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  emit("contextmenu", event, bandIndex, elementIndex, parentFrameIndex);
};

// Handle canvas context menu
const handleCanvasContextMenu = (event: MouseEvent) => {
  emit("canvas-contextmenu", event);
};

const startResizingBand = (event: MouseEvent, bandIndex: number) => {
  emit("start-resizing-band", event, bandIndex);
};

// Check whether the element is out of bounds
const isElementOutOfBounds = (bandIndex: number, elementIndex: number) => {
  return props.outOfBoundsElements.some(
    (item) =>
      item.bandIndex === bandIndex && item.elementIndex === elementIndex,
  );
};

// Keyboard event handling
const handleKeyDown = (event: KeyboardEvent) => {
  // CTRL+0 resets zoom
  if (event.ctrlKey && event.key === "0") {
    event.preventDefault();
    emit("reset-zoom");
  }
};

// Scroll event handling
const handleWheel = (event: WheelEvent) => {
  // If the Ctrl or Meta key is held, zoom
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY < 0 ? 1 : -1;
    emit("zoom-change", delta);
  }
};

// Rectangle selection feature
const startSelection = (event: MouseEvent) => {
  // Only the left mouse button can trigger rectangle selection
  if (event.button !== 0) {
    return;
  }

  // Only start rectangle selection when clicking a blank area
  if (
    event.target === event.currentTarget ||
    (event.target as HTMLElement).classList.contains("pager")
  ) {
    isSelecting.value = true;

    // Get the position info of the paper element
    const paperEl = document.querySelector(".paper") as HTMLElement;
    const paperContainer = document.querySelector(
      ".paper-container",
    ) as HTMLElement;
    if (paperEl && paperContainer) {
      const containerRect = paperContainer.getBoundingClientRect();
      const currentZoom = props.zoomLevel;

      // Get the scroll position
      const scrollLeft = paperContainer.scrollLeft;
      const scrollTop = paperContainer.scrollTop;

      // Calculate coordinates relative to the paper, accounting for zoom and scroll position
      // Mouse position - container position + scroll position = position relative to the unscaled paper
      const paperStartX =
        (event.clientX - containerRect.left + scrollLeft) / currentZoom;
      const paperStartY =
        (event.clientY - containerRect.top + scrollTop) / currentZoom;

      // Set the selection box coordinates, accounting for the zoom factor since SelectionBox now sits outside paper-container
      selectionBox.value.startX = paperStartX * currentZoom;
      selectionBox.value.startY = paperStartY * currentZoom;
      selectionBox.value.endX = selectionBox.value.startX;
      selectionBox.value.endY = selectionBox.value.startY;
      selectionBox.value.visible = true;

      // Add global mousemove and mouseup event listeners
      document.addEventListener("mousemove", updateSelection);
      document.addEventListener("mouseup", endSelection);

      // Prevent default behavior and stop propagation
      event.preventDefault();
      event.stopPropagation();
    }
  }
};

const updateSelection = (event: MouseEvent) => {
  if (!isSelecting.value) return;

  // Get the position info of the paper element
  const paperEl = document.querySelector(".paper") as HTMLElement;
  const paperContainer = document.querySelector(
    ".paper-container",
  ) as HTMLElement;
  if (paperEl && paperContainer) {
    const containerRect = paperContainer.getBoundingClientRect();
    const currentZoom = props.zoomLevel;

    // Get the scroll position
    const scrollLeft = paperContainer.scrollLeft;
    const scrollTop = paperContainer.scrollTop;

    // Calculate coordinates relative to the paper, accounting for zoom and scroll position
    const paperEndX =
      (event.clientX - containerRect.left + scrollLeft) / currentZoom;
    const paperEndY =
      (event.clientY - containerRect.top + scrollTop) / currentZoom;

    // Update the selection box end coordinates, accounting for the zoom factor since SelectionBox now sits outside paper-container
    selectionBox.value.endX = paperEndX * currentZoom;
    selectionBox.value.endY = paperEndY * currentZoom;
  }
};

const endSelection = () => {
  if (!isSelecting.value) return;

  // Remove global event listeners
  document.removeEventListener("mousemove", updateSelection);
  document.removeEventListener("mouseup", endSelection);

  // Calculate the selection area (scaled coordinates)
  const scaledLeft = Math.min(
    selectionBox.value.startX,
    selectionBox.value.endX,
  );
  const scaledTop = Math.min(
    selectionBox.value.startY,
    selectionBox.value.endY,
  );
  const scaledRight = Math.max(
    selectionBox.value.startX,
    selectionBox.value.endX,
  );
  const scaledBottom = Math.max(
    selectionBox.value.startY,
    selectionBox.value.endY,
  );

  // If the selection area is too small (less than 5 pixels), skip selection and clear it instead
  if (
    Math.abs(scaledRight - scaledLeft) < 5 ||
    Math.abs(scaledBottom - scaledTop) < 5
  ) {
    selectionBox.value.visible = false;
    isSelecting.value = false;
    // Emit the clear-selection event
    emit("clear-selection");
    return;
  }

  // Convert the scaled coordinates to coordinates relative to the paper
  const currentZoom = props.zoomLevel;
  const left = scaledLeft / currentZoom;
  const top = scaledTop / currentZoom;
  const right = scaledRight / currentZoom;
  const bottom = scaledBottom / currentZoom;

  // Emit the rect-selection event, passing the selection area coordinates (relative to the paper)
  emit("select-elements-in-rect", {
    left,
    top,
    right,
    bottom,
  });

  // Hide the selection box
  selectionBox.value.visible = false;
  isSelecting.value = false;
};

// Lifecycle hooks
onMounted(() => {
  // Add mouse wheel event listener
  const designerCanvas = designerCanvasRef.value || document.querySelector(".designer-canvas");
  if (designerCanvas) {
    designerCanvas.addEventListener("wheel", handleWheel as EventListener, {
      passive: false,
    });
    (window as any).designerCanvasWheelListener = handleWheel;

    // Add keyboard event listener
    document.addEventListener("keydown", handleKeyDown as EventListener);
    (window as any).designerCanvasKeyDownListener = handleKeyDown;
  }

  // Add scroll event listener
  if (paperContainerRef.value) {
    const handleScroll = () => {
      if (
        horizontalRulerRef.value &&
        verticalRulerRef.value &&
        paperContainerRef.value
      ) {
        horizontalRulerRef.value.scrollLeft =
          paperContainerRef.value.scrollLeft;
        verticalRulerRef.value.scrollTop = paperContainerRef.value.scrollTop;
      }
    };

    paperContainerRef.value.addEventListener("scroll", handleScroll);
    (window as any).paperContainerScrollListener = handleScroll;
  }
});

onBeforeUnmount(() => {
  // Remove scroll event listener
  const scrollListener = (window as any).paperContainerScrollListener;
  if (scrollListener && paperContainerRef.value) {
    paperContainerRef.value.removeEventListener("scroll", scrollListener);
  }

  // Remove mouse wheel event listener
  const wheelListener = (window as any).designerCanvasWheelListener;
  const designerCanvas = designerCanvasRef.value || document.querySelector(".designer-canvas");
  if (wheelListener && designerCanvas) {
    designerCanvas.removeEventListener("wheel", wheelListener as EventListener);
  }

  // Remove keyboard event listener
  const keyDownListener = (window as any).designerCanvasKeyDownListener;
  if (keyDownListener) {
    document.removeEventListener("keydown", keyDownListener as EventListener);
  }

  // Clean up global references
  delete (window as any).paperContainerScrollListener;
  delete (window as any).designerCanvasWheelListener;
  delete (window as any).designerCanvasKeyDownListener;
});
</script>

<style scoped>
.designer-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f0f0f0;
  position: relative;
  min-height: 0;
}

.top-ruler-container {
  display: flex;
  height: 30px;
  background-color: #e8e8e8;
  border-bottom: 1px solid #ccc;
  position: sticky;
  top: 0;
  z-index: 10;
}

.corner-space {
  width: 30px;
  height: 30px;
  background-color: #e0e0e0;
  border-right: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.unit-label {
  font-size: 10px;
  color: #666;
}

.horizontal-ruler {
  position: relative;
  flex: 1;
  width: 0;
  height: 30px;
  background-color: #e8e8e8;
  border-bottom: 1px solid #ccc;
  overflow-x: auto;
  overflow-y: hidden;
  /* Hide scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  flex-shrink: 0;
}

.horizontal-ruler::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.ruler-content {
  position: relative;
  width: 100%;
  height: 100%;
}

.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
}

.vertical-ruler-container {
  width: 30px;
  background-color: #e8e8e8;
  border-right: 1px solid #ccc;
  position: sticky;
  left: 0;
  z-index: 5;
}

.vertical-ruler {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #e8e8e8;
  border-top: 1px solid #ccc;
  overflow-x: hidden;
  overflow-y: auto;
  /* Hide scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  flex-shrink: 0;
}

.vertical-ruler::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.paper-container {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  overflow: auto;
  min-width: 0;
  min-height: 0;
}

.pages-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0 0 60px 0;
  min-width: 100%;
}

.page-sheet-wrapper {
  flex-shrink: 0;
  box-sizing: border-box;
}

.paper {
  background-color: white;
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.12),
    0 1px 3px rgba(0, 0, 0, 0.08);
  position: relative;
  transition: box-shadow 0.2s ease;
  flex-shrink: 0;
  border-radius: 2px;
  box-sizing: border-box;
  overflow: hidden;
}

.paper.focused {
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.18),
    0 2px 6px rgba(0, 0, 0, 0.12);
}

.page-sheet-header {
  position: absolute;
  top: 4px;
  right: 8px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  user-select: none;
}

.page-sheet-badge {
  font-size: 11px;
  font-weight: 600;
  color: #718096;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.delete-page-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  color: #e53e3e;
  background: transparent;
  border: 1px solid rgba(229, 62, 62, 0.3);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.delete-page-btn:hover {
  background: #fff5f5;
  border-color: #e53e3e;
}

.add-page-container {
  display: flex;
  justify-content: flex-start;
  padding: 16px 0;
}

.add-page-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  font-size: 13px;
  font-weight: 500;
  color: #2b6cb0;
  background: #ffffff;
  border: 1.5px dashed #63b3ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.add-page-btn:hover {
  background: #ebf8ff;
  border-color: #3182ce;
  color: #2c5282;
  box-shadow: 0 2px 6px rgba(49, 130, 206, 0.2);
}

.footer-page-indicator {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
  padding: 0 16px;
  font-size: 11px;
  color: #a0aec0;
  font-style: italic;
}

.pager {
  position: relative;
  box-sizing: border-box;
  background-image:
    linear-gradient(to right, #e0e0e0 1px, transparent 1px),
    linear-gradient(to bottom, #e0e0e0 1px, transparent 1px);
}

.band {
  border: 1px solid #ddd;
  box-sizing: border-box;
  margin-bottom: 0;
  position: relative;
  background-color: rgba(255, 255, 255, 0.8);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.band:hover {
  background-color: rgba(240, 240, 255, 0.8);
  z-index: 5;
}

.band.dragging-target {
  border-color: #ff9500;
  background-color: rgba(255, 248, 240, 0.8);
}

.band.drag-over {
  border-color: #ff9500;
  background-color: rgba(255, 248, 240, 0.9);
}

.band-background-label-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.band-background-label {
  font-size: 40px;
  font-weight: bold;
  color: rgba(0, 0, 0, 0.05);
  user-select: none;
  white-space: nowrap;
}

.band-content {
  position: relative;
  min-height: 0;
  z-index: 1;
}

.band-resize-handle {
  position: absolute;
  bottom: -5px;
  left: 0;
  right: 0;
  height: 10px;
  cursor: ns-resize;
  background-color: rgba(74, 144, 226, 0.4);
  opacity: 0;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;
  z-index: 25;
}

.band:hover .band-resize-handle,
.band-resize-handle:hover {
  opacity: 1;
  background-color: rgba(74, 144, 226, 0.95);
  z-index: 30;
}

/* Bottom bands: handle is located at the TOP edge so dragging up expands the band */
.columnFooter-band .band-resize-handle,
.column-footer-band .band-resize-handle,
.pageFooter-band .band-resize-handle,
.page-footer-band .band-resize-handle {
  top: -5px;
  bottom: auto;
}

/* When hovering Detail, highlight the dragger between Detail and the following footer band */
.detail-band:hover + .columnFooter-band .band-resize-handle,
.detail-band:hover + .column-footer-band .band-resize-handle,
.detail-band:hover + .pageFooter-band .band-resize-handle,
.detail-band:hover + .page-footer-band .band-resize-handle {
  opacity: 0.7;
  background-color: rgba(74, 144, 226, 0.6);
}

/* When hovering Column Footer, also highlight the dragger between Column Footer and Page Footer */
.columnFooter-band:hover + .pageFooter-band .band-resize-handle,
.column-footer-band:hover + .page-footer-band .band-resize-handle {
  opacity: 0.7;
  background-color: rgba(74, 144, 226, 0.6);
}

.alignment-lines {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 100;
}

.alignment-line {
  position: absolute;
  background-color: rgba(24, 144, 255, 0.8);
  opacity: 0.7;
}

.alignment-line.horizontal {
  height: 1px;
  left: 0;
  right: 0;
}

.alignment-line.vertical {
  width: 1px;
  top: 0;
  bottom: 0;
}

.canvas-empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 60px;
}

.empty-state-text {
  font-size: 13px;
  color: var(--prop-text-tertiary, #999);
  text-align: center;
  pointer-events: none;
}

.tick {
  position: absolute;
  background-color: #666;
}

.tick.major {
  height: 10px;
  width: 1px;
}

.tick.minor {
  height: 5px;
  width: 1px;
}

.horizontal-ruler .tick {
  top: 0;
}

.vertical-ruler .tick {
  left: 0;
  width: 10px;
  height: 1px;
}

.label {
  position: absolute;
  font-size: 10px;
  color: #666;
}

.horizontal-ruler .label {
  top: 12px;
  transform: translateX(-50%);
}

.vertical-ruler .label {
  left: 12px;
  transform: translateY(-50%);
}

/* Right-side control panel container */
.right-side-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: white;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Snap control styles */
.snap-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Zoom control component style reset */
:deep(.zoom-controls) {
  position: static !important;
  box-shadow: none !important;
  background-color: transparent !important;
  border: none !important;
  padding: 0 !important;
  gap: 4px !important;
}
</style>
