<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :is-dragging="isDragging"
    :is-out-of-bounds="isOutOfBounds"
    :report-font-family="reportFontFamily"
    :report-font-size="reportFontSize"
    :report-is-bold="reportIsBold"
    :report-is-italic="reportIsItalic"
    :report-is-underline="reportIsUnderline"
    :parent-frame-index="parentFrameIndex"
    :zoom-level="zoomLevel"
    @select="handleSelect"
    @drag-start="handleDragStart"
    @resize-start="handleResizeStart"
    @contextmenu="handleContextMenu"
  >
    <!-- Frame element content -->
    <div
      class="frame-content"
      @mousedown.capture="rememberSelectionAtPress"
    >
      <!-- Render child elements -->
      <template v-if="element.elements && element.elements.length > 0">
        <!-- Dynamically load ElementFactory to avoid circular reference -->
        <component 
          :is="ElementFactory"
          v-for="(childElement, childIndex) in element.elements"
          :key="childIndex"
          :element="childElement"
          :band-index="bandIndex"
          :element-index="childIndex"
          :selected-element="selectedElement"
          :selected-elements="selectedElements || []"
          :editing-element="editingElement || null"
          :is-dragging="false" 
          :report-font-family="reportFontFamily"
          :report-font-size="reportFontSize"
          :report-is-bold="reportIsBold"
          :report-is-italic="reportIsItalic"
          :report-is-underline="reportIsUnderline"
          :is-out-of-bounds="false"
          :parent-frame-index="elementIndex"
          :zoom-level="zoomLevel"
          :page-number="pageNumber"
          :total-pages="totalPages"
          @select="handleChildSelect"
          @drag-start="handleChildDragStart"
          @resize-start="handleChildResizeStart"
          @contextmenu="handleChildContextMenu"
          @start-editing="handleChildStartEditing"
          @finish-editing="handleChildFinishEditing"
          @cancel-editing="handleChildCancelEditing"
          @check-fields="handleChildCheckFields"
          @auto-fit-height="(b: number, e: number, p?: number) => emit('autoFitHeight', b, e, p)"
          @rotate="(b: number, e: number, p?: number) => emit('rotate', b, e, p)"
        />
      </template>
      
      <!-- Currently empty; nested elements may be supported in the future -->
      <div v-else class="frame-placeholder">
        <span class="frame-label"></span>
      </div>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import BaseElement from './BaseElement.vue';
import type { FrameElement, SelectedElementInfo, EditingElementInfo } from '../../types';
import { isBoxPart } from '../../utils/framePresets';
import { getElementBoxPadding } from '../../utils/elementUtils';

// Asynchronously import ElementFactory to avoid circular dependencies
const ElementFactory = defineAsyncComponent(() => import('./ElementFactory.vue'));

// Props
const props = defineProps<{
  element: FrameElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements?: {bandIndex: number, elementIndex: number, parentFrameIndex?: number}[]; // Add multi-select support
  editingElement?: EditingElementInfo | null;
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  reportFontFamily?: string;
  reportFontSize?: number;
  reportIsBold?: boolean;
  reportIsItalic?: boolean;
  reportIsUnderline?: boolean;
  parentFrameIndex?: number; // Add the parentFrameIndex prop
  zoomLevel?: number;
  // Canvas page the box is drawn on (page numbers inside it show it)
  pageNumber?: number;
  totalPages?: number;
}>();


const padding = computed(() => getElementBoxPadding(props.element.box));

// Emits
const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  finishEditing: [];
  cancelEditing: [];
  checkFields: [fields: string[]];
  // From items in the box: passed on to the designer
  autoFitHeight: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  rotate: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Handle selection
const handleSelect = (bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number) => {
  emit('select', bandIndex, elementIndex, isMultiSelect, parentFrameIndex);
};

// Handle drag start
const handleDragStart = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  emit('dragStart', event, bandIndex, elementIndex, parentFrameIndex);
};

// Handle resize start
const handleResizeStart = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string) => {
  emit('resizeStart', event, bandIndex, elementIndex, parentFrameIndex, direction);
};

// Handle context menu
const handleContextMenu = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  emit('contextmenu', event, bandIndex, elementIndex, parentFrameIndex);
};

// A ready-made box's own parts (label, number, photo...) cover most of the box,
// so they behave like a group in PowerPoint:
// - dragging a part moves the whole box, unless that part is already selected
// - clicking a part selects the box first; clicking again selects the part
// - right-clicking a part opens the box's menu unless that part is selected
// Decided from the selection at mouse press, before this press changes it.
let boxWasActive = false;
let selectedPartAtPress: number | null = null;
let boxDraggedThisPress = false;

const rememberSelectionAtPress = () => {
  const selected = props.selectedElement;
  const inThisBand = !!selected && selected.bandIndex === props.bandIndex;
  selectedPartAtPress =
    inThisBand && selected!.parentFrameIndex === props.elementIndex ? selected!.elementIndex : null;
  boxWasActive =
    selectedPartAtPress !== null ||
    (inThisBand &&
      selected!.parentFrameIndex === undefined &&
      selected!.elementIndex === props.elementIndex);
  boxDraggedThisPress = false;
};

const isPart = (childIndex: number) => isBoxPart(props.element.elements?.[childIndex]);

const selectBox = (isMultiSelect?: boolean) =>
  emit('select', props.bandIndex, props.elementIndex, isMultiSelect, props.parentFrameIndex);

// Handle child element events
const handleChildSelect = (bIndex: number, childIndex: number, isMultiSelect?: boolean) => {
  if (isPart(childIndex) && (boxDraggedThisPress || !boxWasActive)) {
    // The click that ends a box drag, or the first click on a box: keep the box selected
    selectBox(isMultiSelect);
    return;
  }
  // When a child element inside the Frame is selected, pass the Frame's elementIndex as parentFrameIndex
  emit('select', props.bandIndex, childIndex, isMultiSelect, props.elementIndex);
};

const handleChildDragStart = (event: MouseEvent, bIndex: number, childIndex: number) => {
  event.stopPropagation(); // Prevent the event from bubbling up to the Frame
  if (isPart(childIndex) && selectedPartAtPress !== childIndex) {
    boxDraggedThisPress = true;
    emit('dragStart', event, props.bandIndex, props.elementIndex, props.parentFrameIndex);
    return;
  }
  emit('dragStart', event, props.bandIndex, childIndex, props.elementIndex);
};

const handleChildResizeStart = (event: MouseEvent, bIndex: number, childIndex: number, _parentFrameIndex?: number, direction?: string) => {
  event.stopPropagation(); // Prevent the event from bubbling up to the Frame
  emit('resizeStart', event, props.bandIndex, childIndex, props.elementIndex, direction);
};

const handleChildContextMenu = (event: MouseEvent, bIndex: number, childIndex: number) => {
  event.stopPropagation(); // Prevent the event from bubbling up to the Frame
  // Right-click opens the box's menu (copy, paste, delete...) unless this part is
  // itself the selected item, like right-clicking inside a group in PowerPoint
  const selected = props.selectedElement;
  const partIsSelected =
    !!selected &&
    selected.bandIndex === props.bandIndex &&
    selected.parentFrameIndex === props.elementIndex &&
    selected.elementIndex === childIndex;
  if (isPart(childIndex) && !partIsSelected) {
    emit('contextmenu', event, props.bandIndex, props.elementIndex, props.parentFrameIndex);
    return;
  }
  emit('contextmenu', event, props.bandIndex, childIndex, props.elementIndex);
};

const handleChildStartEditing = (bIndex: number, childIndex: number) => {
  emit('startEditing', props.bandIndex, childIndex, props.elementIndex);
};

const handleChildFinishEditing = () => {
  emit('finishEditing');
};

const handleChildCancelEditing = () => {
  emit('cancelEditing');
};

const handleChildCheckFields = (fields: string[]) => {
  emit('checkFields', fields);
};
</script>

<style scoped>
.frame-content {
  width: 100%;
  height: 100%;
  position: relative;
}

</style>
