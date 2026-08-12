<template>
  <div class="designer-canvas" @click="setDesignAreaFocused">
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
        <div class="ruler-content" :style="{ width: (paperWidth * zoomLevel) + 'px' }">
          <div
            v-for="tick in horizontalRulerTicks"
            :key="tick.position"
            class="tick"
            :class="{ 'major': tick.major, 'minor': !tick.major }"
            :style="{ left: (tick.position * zoomLevel) + 'px' }"
          ></div>
          <div
            v-for="label in horizontalRulerLabels"
            :key="label.position"
            class="label"
            :style="{ left: (label.position * zoomLevel) + 'px' }"
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
          <div class="ruler-content" :style="{ height: (paperHeight * zoomLevel) + 'px' }">
            <div
              v-for="tick in verticalRulerTicks"
              :key="tick.position"
              class="tick"
              :class="{ 'major': tick.major, 'minor': !tick.major }"
              :style="{ top: (tick.position * zoomLevel) + 'px' }"
            ></div>
            <div
              v-for="label in verticalRulerLabels"
              :key="label.position"
              class="label"
              :style="{ top: (label.position * zoomLevel) + 'px' }"
            >
              {{ label.value }}
            </div>
          </div>
        </div>
      </div>

      <!-- Paper container -->
      <div class="paper-container" ref="paperContainerRef" @contextmenu="handleCanvasContextMenu">
        <!-- Paper -->
        <div class="paper"
             :style="{
               width: paperWidth + 'px',
               height: paperHeight + 'px',
               transform: `scale(${zoomLevel})`,
               transformOrigin: 'top left'
             }"
             :class="{'focused': isDesignAreaFocused}"
             @drop="handleDrop"
             @dragover="handleDragOver"
             @dragleave="handleDragLeave"
             @mousedown="startSelection"
        >
        <!-- Report margin container -->
        <div class="pager"
             :style="{
               padding: reportProperties.topMargin + 'px ' + reportProperties.rightMargin + 'px ' + reportProperties.bottomMargin + 'px ' + reportProperties.leftMargin + 'px',
               width: '100%',
               height: '100%',
               position: 'relative',
               backgroundImage: showGrid ?
                 'linear-gradient(to right, #e0e0e0 1px, transparent 1px), linear-gradient(to bottom, #e0e0e0 1px, transparent 1px)' : 'none',
               backgroundSize: showGrid ?
                 (uiConstants.GRID_SIZE + 'px ' + uiConstants.GRID_SIZE + 'px') : 'auto'
             }"
        >

        <!-- Report area -->
        <div
          v-for="(band, bandIndex) in bands"
          :key="band.type"
          class="band"
          :style="{ height: band.height + 'px' }"
          @click="selectBand(bandIndex)"
          :class="{
            'selected': selectedBandIndex === bandIndex,
            'dragging-target': highlightedBandIndex === bandIndex,
            'drag-over': highlightedBandIndex === bandIndex
          }"
        >
          <div class="band-background-label-container">
            <span class="band-background-label">{{ t('bandNames.' + band.type) }}</span>
          </div>
          <div class="band-content">
            <ElementFactory
            v-for="(item, index) in band.elements"
            :key="index"
            :element="item"
            :band-index="bandIndex"
            :element-index="index"
            :selected-element="selectedElement"
            :selected-elements="selectedElements"
            :editing-element="editingElement"
            :is-dragging="isDraggingOrResizing"
            :report-font-family="reportProperties.defaultFont.name"
            :report-font-size="reportProperties.defaultFont.size"
            :report-is-bold="reportProperties.defaultFont.isBold"
            :report-is-italic="reportProperties.defaultFont.isItalic"
            :report-is-underline="reportProperties.defaultFont.isUnderline"
            :is-out-of-bounds="isElementOutOfBounds(bandIndex, index)"
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
            @join-columns-to-existing-group="handleJoinColumnsToExistingGroup"
            @update-jrxml="emit('update-jrxml')"
          />
            <div v-if="band.elements.length === 0 && band.type === 'detail'" class="canvas-empty-state">
              <div class="empty-state-text">Drag elements from the left panel onto the canvas</div>
            </div>
          </div>
          <!-- Band height resize handle -->
          <div class="band-resize-handle" @mousedown.stop="startResizingBand($event, bandIndex)"></div>
        </div>

        <!-- Alignment lines -->
        <div v-if="isDraggingOrResizing" class="alignment-lines">
          <!-- Horizontal alignment lines -->
          <div
            v-for="(line, index) in alignmentLines.horizontal"
            :key="'h-' + index"
            class="alignment-line horizontal"
            :style="{ top: line + 'px' }"
          ></div>
          <!-- Vertical alignment lines -->
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
import { onMounted, onBeforeUnmount, ref } from 'vue';
import ElementFactory from '../elements/ElementFactory.vue';
import SelectionBox from './SelectionBox.vue';
import DragFeedbackLayer from './DragFeedbackLayer.vue';
import { BAND_CONSTANTS } from '@/constants/constants';
import { getBandDisplayName } from '@/utils/bandUtils';
import type { Band } from '@/types';
import type { DragFeedback } from '@/composables/useDragFeedback';
import { useI18n } from 'vue-i18n';
import { NCheckbox, NSpace } from 'naive-ui';

const { t } = useI18n();

// Props
interface Props {
  paperWidth: number;
  paperHeight: number;
  zoomLevel: number;
  reportProperties: any;
  bands: Band[];
  selectedBandIndex: number | null;
  highlightedBandIndex: number | null;
  selectedElement: any;
  selectedElements: {bandIndex: number, elementIndex: number, parentFrameIndex?: number}[]; // Added multi-select support
  editingElement: any;
  isDraggingOrResizing: boolean;
  horizontalRulerTicks: any[];
  horizontalRulerLabels: any[];
  verticalRulerTicks: any[];
  verticalRulerLabels: any[];
  alignmentLines: any;
  isDesignAreaFocused: boolean;
  uiConstants: any;
  outOfBoundsElements: Array<{bandIndex: number, elementIndex: number, element: any}>;
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
    tableHeader: 'Table_TH',
    columnHeader: 'Table_CH',
    columnFooter: 'Table_CH',
    detailCell: 'Table_TD'
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
  'set-design-area-focused',
  'handle-drop',
  'handle-drag-over',
  'handle-drag-leave',
  'select-band',
  'select-element',
  'start-dragging',
  'start-resizing-element',
  'start-editing',
  'finish-editing',
  'cancel-editing',
  'start-resizing-band',
  'zoom-change',
  'select-elements-in-rect', // Added rect-selection event
  'clear-selection', // Added clear-selection event
  'check-fields', // Added field-check event
  'contextmenu', // Added context menu event
  'move-column', // Added column-move event
  'add-columns-to-group', // Added column-grouping event
  'join-columns-to-existing-group', // Added join-column-to-existing-group event
  'update:enableSnapToGrid', // Added snap-to-grid toggle event
  'update:enableSnapToAlignment', // Added snap-to-alignment toggle event
  'update:showGrid', // Added show/hide grid event
  'update:table-styles', // Added table style update event
  'reset-zoom', // Added reset zoom event
  'update-jrxml', // Added JRXML update event
  'canvas-contextmenu' // Added canvas context menu event
]);

// Selection box state
const selectionBox = ref({
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  visible: false
});

const isSelecting = ref(false);

const horizontalRulerRef = ref<HTMLElement | null>(null);
const verticalRulerRef = ref<HTMLElement | null>(null);
const paperContainerRef = ref<HTMLElement | null>(null);

// Methods
const setDesignAreaFocused = () => {
  emit('set-design-area-focused');
};

const handleDrop = (event: DragEvent) => {
  emit('handle-drop', event);
};

const handleDragOver = (event: DragEvent) => {
  emit('handle-drag-over', event);
};

const handleDragLeave = (event: DragEvent) => {
  emit('handle-drag-leave', event);
};

const selectBand = (bandIndex: number) => {
  emit('select-band', bandIndex);
};

const selectElement = (bandIndex: number, elementIndex: number, isMultiSelect = false, parentFrameIndex?: number) => {
  emit('select-element', bandIndex, elementIndex, isMultiSelect, parentFrameIndex);
};

const startDragging = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  emit('start-dragging', event, bandIndex, elementIndex, parentFrameIndex);
};

const startResizingElement = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  emit('start-resizing-element', event, bandIndex, elementIndex, 'se', parentFrameIndex); // Default direction is 'se'
};

const startEditing = (bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  emit('start-editing', bandIndex, elementIndex, parentFrameIndex);
};

const finishEditing = () => {
  // Since ElementFactory's finishEditing event doesn't pass parameters, we need to get the info from editingElement
  if (props.editingElement) {
    emit('finish-editing');
  }
};

const cancelEditing = () => {
  // Since ElementFactory's cancelEditing event doesn't pass parameters, we need to get the info from editingElement
  if (props.editingElement) {
    emit('cancel-editing');
  }
};

const checkFields = (fields: string[]) => {
  emit('check-fields', fields);
};

// Handle column move event
const handleMoveColumn = (elementIndex: number, fromIndex: number, toIndex: number, bandIndex: number, parentFrameIndex?: number) => {
  emit('move-column', elementIndex, fromIndex, toIndex, bandIndex, parentFrameIndex);
};

// Handle adding selected columns to a group
const handleAddColumnsToGroup = (elementIndex: number, columnIndices: number[], bandIndex: number, parentFrameIndex?: number) => {
  emit('add-columns-to-group', elementIndex, columnIndices, bandIndex, parentFrameIndex);
};

// Handle adding selected columns to an existing group
const handleJoinColumnsToExistingGroup = (elementIndex: number, columnIndices: number[], bandIndex: number, parentFrameIndex?: number) => {
  emit('join-columns-to-existing-group', elementIndex, columnIndices, bandIndex, parentFrameIndex);
};

// Handle element context menu
const handleElementContextMenu = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  emit('contextmenu', event, bandIndex, elementIndex, parentFrameIndex);
};

// Handle canvas context menu
const handleCanvasContextMenu = (event: MouseEvent) => {
  emit('canvas-contextmenu', event);
};

const startResizingBand = (event: MouseEvent, bandIndex: number) => {
  emit('start-resizing-band', event, bandIndex);
};

// Check whether the element is out of bounds
const isElementOutOfBounds = (bandIndex: number, elementIndex: number) => {
  return props.outOfBoundsElements.some(
    item => item.bandIndex === bandIndex && item.elementIndex === elementIndex
  );
};

// Keyboard event handling
const handleKeyDown = (event: KeyboardEvent) => {
  // CTRL+0 resets zoom
  if (event.ctrlKey && event.key === '0') {
    event.preventDefault();
    emit('reset-zoom');
  }
};

// Scroll event handling
const handleWheel = (event: WheelEvent) => {
  // If the Ctrl key is held, zoom
  if (event.ctrlKey) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    emit('zoom-change', delta);
  }
};

// Rectangle selection feature
const startSelection = (event: MouseEvent) => {
  // Only the left mouse button can trigger rectangle selection
  if (event.button !== 0) {
    return;
  }

  // Only start rectangle selection when clicking a blank area
  if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('pager')) {
    isSelecting.value = true;

    // Get the position info of the paper element
    const paperEl = document.querySelector('.paper') as HTMLElement;
    const paperContainer = document.querySelector('.paper-container') as HTMLElement;
    if (paperEl && paperContainer) {
      const containerRect = paperContainer.getBoundingClientRect();
      const currentZoom = props.zoomLevel;

      // Get the scroll position
      const scrollLeft = paperContainer.scrollLeft;
      const scrollTop = paperContainer.scrollTop;

      // Calculate coordinates relative to the paper, accounting for zoom and scroll position
      // Mouse position - container position + scroll position = position relative to the unscaled paper
      const paperStartX = (event.clientX - containerRect.left + scrollLeft) / currentZoom;
      const paperStartY = (event.clientY - containerRect.top + scrollTop) / currentZoom;

      // Set the selection box coordinates, accounting for the zoom factor since SelectionBox now sits outside paper-container
      selectionBox.value.startX = paperStartX * currentZoom;
      selectionBox.value.startY = paperStartY * currentZoom;
      selectionBox.value.endX = selectionBox.value.startX;
      selectionBox.value.endY = selectionBox.value.startY;
      selectionBox.value.visible = true;

      // Add global mousemove and mouseup event listeners
      document.addEventListener('mousemove', updateSelection);
      document.addEventListener('mouseup', endSelection);

      // Prevent default behavior and stop propagation
      event.preventDefault();
      event.stopPropagation();
    }
  }
};

const updateSelection = (event: MouseEvent) => {
  if (!isSelecting.value) return;

  // Get the position info of the paper element
  const paperEl = document.querySelector('.paper') as HTMLElement;
  const paperContainer = document.querySelector('.paper-container') as HTMLElement;
  if (paperEl && paperContainer) {
    const containerRect = paperContainer.getBoundingClientRect();
    const currentZoom = props.zoomLevel;

    // Get the scroll position
    const scrollLeft = paperContainer.scrollLeft;
    const scrollTop = paperContainer.scrollTop;

    // Calculate coordinates relative to the paper, accounting for zoom and scroll position
    const paperEndX = (event.clientX - containerRect.left + scrollLeft) / currentZoom;
    const paperEndY = (event.clientY - containerRect.top + scrollTop) / currentZoom;

    // Update the selection box end coordinates, accounting for the zoom factor since SelectionBox now sits outside paper-container
    selectionBox.value.endX = paperEndX * currentZoom;
    selectionBox.value.endY = paperEndY * currentZoom;
  }
};

const endSelection = () => {
  if (!isSelecting.value) return;

  // Remove global event listeners
  document.removeEventListener('mousemove', updateSelection);
  document.removeEventListener('mouseup', endSelection);

  // Calculate the selection area (scaled coordinates)
  const scaledLeft = Math.min(selectionBox.value.startX, selectionBox.value.endX);
  const scaledTop = Math.min(selectionBox.value.startY, selectionBox.value.endY);
  const scaledRight = Math.max(selectionBox.value.startX, selectionBox.value.endX);
  const scaledBottom = Math.max(selectionBox.value.startY, selectionBox.value.endY);

  // If the selection area is too small (less than 5 pixels), skip selection and clear it instead
  if (Math.abs(scaledRight - scaledLeft) < 5 || Math.abs(scaledBottom - scaledTop) < 5) {
    selectionBox.value.visible = false;
    isSelecting.value = false;
    // Emit the clear-selection event
    emit('clear-selection');
    return;
  }

  // Convert the scaled coordinates to coordinates relative to the paper
  const currentZoom = props.zoomLevel;
  const left = scaledLeft / currentZoom;
  const top = scaledTop / currentZoom;
  const right = scaledRight / currentZoom;
  const bottom = scaledBottom / currentZoom;

  // Emit the rect-selection event, passing the selection area coordinates (relative to the paper)
  emit('select-elements-in-rect', {
    left,
    top,
    right,
    bottom
  });

  // Hide the selection box
  selectionBox.value.visible = false;
  isSelecting.value = false;
};

// Lifecycle hooks
onMounted(() => {
  // Add mouse wheel event listener
  const designerCanvas = document.querySelector('.designer-canvas');
  if (designerCanvas) {
    designerCanvas.addEventListener('wheel', handleWheel as EventListener, { passive: false });
    (window as any).designerCanvasWheelListener = handleWheel;

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown as EventListener);
    (window as any).designerCanvasKeyDownListener = handleKeyDown;
  }

  // Add scroll event listener
    if (paperContainerRef.value) {
      const handleScroll = () => {
        if (horizontalRulerRef.value && verticalRulerRef.value && paperContainerRef.value) {
          horizontalRulerRef.value.scrollLeft = paperContainerRef.value.scrollLeft;
          verticalRulerRef.value.scrollTop = paperContainerRef.value.scrollTop;
        }
      };

      paperContainerRef.value.addEventListener('scroll', handleScroll);
      (window as any).paperContainerScrollListener = handleScroll;
    }

  // Add paper click event listener
  const paper = document.querySelector('.paper');
  if (paper) {
    const handlePaperClick = () => {
      emit('set-design-area-focused');
    };

    paper.addEventListener('click', handlePaperClick);
    (window as any).paperClickListener = handlePaperClick;
  }
});

onBeforeUnmount(() => {
  // Remove scroll event listener
  const scrollListener = (window as any).paperContainerScrollListener;
  if (scrollListener && paperContainerRef.value) {
    paperContainerRef.value.removeEventListener('scroll', scrollListener);
  }

  // Remove mouse wheel event listener
  const wheelListener = (window as any).designerCanvasWheelListener;
  const designerCanvas = document.querySelector('.designer-canvas');
  if (wheelListener && designerCanvas) {
    designerCanvas.removeEventListener('wheel', wheelListener as EventListener);
  }

  // Remove keyboard event listener
  const keyDownListener = (window as any).designerCanvasKeyDownListener;
  if (keyDownListener) {
    document.removeEventListener('keydown', keyDownListener as EventListener);
  }

  // Remove paper click event listener
  const paperClickListener = (window as any).paperClickListener;
  const paper = document.querySelector('.paper');
  if (paperClickListener && paper) {
    paper.removeEventListener('click', paperClickListener);
  }

  // Clean up global references
  delete (window as any).paperContainerScrollListener;
  delete (window as any).designerCanvasWheelListener;
  delete (window as any).designerCanvasKeyDownListener;
  delete (window as any).paperClickListener;
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

.paper {
  background-color: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  position: relative;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.paper.focused {
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);
}

.pager {
  position: relative;
  background-image:
    linear-gradient(to right, #e0e0e0 1px, transparent 1px),
    linear-gradient(to bottom, #e0e0e0 1px, transparent 1px);
}

.band {
  border: 1px solid #ddd;
  margin-bottom: v-bind('BAND_CONSTANTS.SPACING + "px"');
  position: relative;
  background-color: rgba(255, 255, 255, 0.8);
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.band:hover {
  background-color: rgba(240, 240, 255, 0.8);
}

.band.selected {
  border-color: #4a90e2;
  background-color: rgba(240, 248, 255, 0.8);
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
  bottom: -2px;
  left: 0;
  right: 0;
  height: 5px;
  cursor: ns-resize;
  background-color: rgba(74, 144, 226, 0.3);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.band:hover .band-resize-handle {
  opacity: 1;
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
