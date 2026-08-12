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
    <!-- Ellipse element content -->
    <div class="ellipse-content" :style="ellipseStyle">
      <!-- Custom content can be added to the ellipse element -->
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseElement from './BaseElement.vue';
import type { EllipseElement, SelectedElementInfo } from '../../types';

// Props
const props = defineProps<{
  element: EllipseElement;
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
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Compute the ellipse style
const ellipseStyle = computed(() => {
  const style: any = {
    borderRadius: '50%' // Ellipse shape
  };

  // Border setting - prefer the pen property
  if (props.element.pen) {
    const width = props.element.pen.lineWidth || 0;
    const color = props.element.pen.lineColor || '#000000';
    let lineStyle = 'solid';

    if (props.element.pen.lineStyle) {
      if (props.element.pen.lineStyle === 'Dashed') lineStyle = 'dashed';
      else if (props.element.pen.lineStyle === 'Dotted') lineStyle = 'dotted';
      else if (props.element.pen.lineStyle === 'Double') lineStyle = 'double';
    }

    // No border if the line width is 0
    if (width > 0) {
      style.border = `${width}px ${lineStyle} ${color}`;
    } else {
      style.border = 'none';
    }
  } else {
    // Default style: if pen isn't set, use a default 1px solid black border
    // Check whether the box property sets a border (for compatibility)
    const box = props.element.box;
    if (box && (box.borderWidth || box.pen?.lineWidth)) {
      // BaseElement handles the box property, but for the ellipse we need to override it
    } else {
      // Default border
      style.border = '1px solid #000000';
    }
  }

  return style;
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

// Handle context menu
const handleContextMenu = (event: MouseEvent, bandIndex: number, elementIndex: number) => {
  emit('contextmenu', event, bandIndex, elementIndex, props.parentFrameIndex);
};
</script>

<style scoped>
.ellipse-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
