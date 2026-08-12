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
  >
    <div 
      class="line-element"
      :style="lineStyle"
    ></div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseElement from './BaseElement.vue';
import type { LineElement, SelectedElementInfo } from '../../types';

// Props
const props = defineProps<{
  element: LineElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  reportFontFamily?: string;
  reportFontSize?: number;
  reportIsBold?: boolean;
  reportIsItalic?: boolean;
  reportIsUnderline?: boolean;
  parentFrameIndex?: number;
}>();

// Emits
const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Line style
const lineStyle = computed(() => {
  const direction = props.element.lineDirection || 'TopDown';
  const width = props.element.lineWidth || 1;
  const color = props.element.lineColor || '#000000';

  // Per the XSD spec, the line is a diagonal
  // TopDown: diagonal from top-left to bottom-right
  // BottomUp: diagonal from bottom-left to top-right
  const diagonalLength = Math.sqrt(props.element.width ** 2 + props.element.height ** 2);

  if (direction === 'TopDown') {
    // Diagonal from top-left to bottom-right
    return {
      position: 'absolute' as const,
      top: '0',
      left: '0',
      width: `${diagonalLength}px`,
      height: `${width}px`,
      backgroundColor: color,
      transformOrigin: '0 0',
      transform: `rotate(${Math.atan2(props.element.height, props.element.width)}rad)`
    };
  } else {
    // BottomUp - diagonal from bottom-left to top-right
    return {
      position: 'absolute' as const,
      bottom: '0',
      left: '0',
      width: `${diagonalLength}px`,
      height: `${width}px`,
      backgroundColor: color,
      transformOrigin: '0 0',
      transform: `rotate(${-Math.atan2(props.element.height, props.element.width)}rad)`
    };
  }
});

// Handle selection
const handleSelect = (bandIndex: number, elementIndex: number, isMultiSelect?: boolean) => {
  emit('select', bandIndex, elementIndex, isMultiSelect, props.parentFrameIndex);
};

// Handle drag start
const handleDragStart = (event: MouseEvent, bandIndex: number, elementIndex: number) => {
  emit('dragStart', event, bandIndex, elementIndex, props.parentFrameIndex);
};

// Handle resize start
const handleResizeStart = (event: MouseEvent, bandIndex: number, elementIndex: number) => {
  emit('resizeStart', event, bandIndex, elementIndex, props.parentFrameIndex);
};
</script>

<style scoped>
.line-element {
  background-color: #000;
}
</style>