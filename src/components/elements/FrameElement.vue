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
    @select="handleSelect"
    @drag-start="handleDragStart"
    @resize-start="handleResizeStart"
    @contextmenu="handleContextMenu"
  >
    <!-- Frame element content -->
    <div class="frame-content" :class="{ 'frame-empty': !element.elements || element.elements.length === 0 }">
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
          @select="handleChildSelect"
          @drag-start="handleChildDragStart"
          @resize-start="handleChildResizeStart"
          @contextmenu="handleChildContextMenu"
          @start-editing="handleChildStartEditing"
          @finish-editing="handleChildFinishEditing"
          @cancel-editing="handleChildCancelEditing"
          @check-fields="handleChildCheckFields"
        />
      </template>
      
      <!-- Currently empty; nested elements may be supported in the future -->
      <div v-else class="frame-placeholder">
        <span class="frame-label">Frame</span>
      </div>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue';
import BaseElement from './BaseElement.vue';
import type { FrameElement, SelectedElementInfo, EditingElementInfo } from '../../types';

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
}>();

// Emits
const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  finishEditing: [];
  cancelEditing: [];
  checkFields: [fields: string[]];
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
const handleResizeStart = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  emit('resizeStart', event, bandIndex, elementIndex, parentFrameIndex);
};

// Handle context menu
const handleContextMenu = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  emit('contextmenu', event, bandIndex, elementIndex, parentFrameIndex);
};

// Handle child element events
const handleChildSelect = (bIndex: number, childIndex: number, isMultiSelect?: boolean) => {
  // When a child element inside the Frame is selected, pass the Frame's elementIndex as parentFrameIndex
  emit('select', props.bandIndex, childIndex, isMultiSelect, props.elementIndex);
};

const handleChildDragStart = (event: MouseEvent, bIndex: number, childIndex: number) => {
  event.stopPropagation(); // Prevent the event from bubbling up to the Frame
  emit('dragStart', event, props.bandIndex, childIndex, props.elementIndex);
};

const handleChildResizeStart = (event: MouseEvent, bIndex: number, childIndex: number) => {
  event.stopPropagation(); // Prevent the event from bubbling up to the Frame
  emit('resizeStart', event, props.bandIndex, childIndex, props.elementIndex);
};

const handleChildContextMenu = (event: MouseEvent, bIndex: number, childIndex: number) => {
  event.stopPropagation(); // Prevent the event from bubbling up to the Frame
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

.frame-empty {
  /* When empty, show a light gray background and dashed border to make it easier to design */
  border: 1px dashed #e0e0e0;
  background-color: rgba(240, 240, 240, 0.2);
}

/* Deepen the border color when selected */
:deep(.design-element.selected) .frame-empty {
  border-color: #a0a0a0;
}


</style>
