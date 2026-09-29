<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :selected-elements="selectedElements"
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
    <div class="line-element-container">
      <svg
        class="line-svg"
        :width="Math.max(1, element.width)"
        :height="Math.max(1, element.height)"
        style="overflow: visible; display: block; width: 100%; height: 100%; pointer-events: none;"
      >
        <template v-if="element.lineStyle === 'Double'">
          <line
            :x1="doubleLineCoords.line1.x1"
            :y1="doubleLineCoords.line1.y1"
            :x2="doubleLineCoords.line1.x2"
            :y2="doubleLineCoords.line1.y2"
            :stroke="element.lineColor || '#000000'"
            :stroke-width="doubleLineWidth"
            stroke-linecap="square"
          />
          <line
            :x1="doubleLineCoords.line2.x1"
            :y1="doubleLineCoords.line2.y1"
            :x2="doubleLineCoords.line2.x2"
            :y2="doubleLineCoords.line2.y2"
            :stroke="element.lineColor || '#000000'"
            :stroke-width="doubleLineWidth"
            stroke-linecap="square"
          />
        </template>
        <line
          v-else
          :x1="lineCoords.x1"
          :y1="lineCoords.y1"
          :x2="lineCoords.x2"
          :y2="lineCoords.y2"
          :stroke="element.lineColor || '#000000'"
          :stroke-width="element.lineWidth || 1"
          :stroke-dasharray="dashArray"
          stroke-linecap="square"
        />
      </svg>
    </div>
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
  selectedElements?: { bandIndex: number; elementIndex: number; parentFrameIndex?: number }[];
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
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Line SVG Coordinates calculation
const lineCoords = computed(() => {
  const w = Math.max(1, props.element.width);
  const h = Math.max(1, props.element.height);
  const direction = props.element.lineDirection || 'TopDown';

  if (direction === 'BottomUp') {
    return {
      x1: 0,
      y1: h,
      x2: w,
      y2: 0,
    };
  }

  // TopDown (default)
  if (h <= 1) {
    return {
      x1: 0,
      y1: h / 2,
      x2: w,
      y2: h / 2,
    };
  }
  if (w <= 1) {
    return {
      x1: w / 2,
      y1: 0,
      x2: w / 2,
      y2: h,
    };
  }

  return {
    x1: 0,
    y1: 0,
    x2: w,
    y2: h,
  };
});

// Stroke dash array for dashed / dotted styles
const dashArray = computed(() => {
  const style = props.element.lineStyle;
  if (style === 'Dashed') return '6,4';
  if (style === 'Dotted') return '2,2';
  return undefined;
});

// Stroke width for double line style
const doubleLineWidth = computed(() => {
  const lw = props.element.lineWidth || 1;
  return Math.max(0.75, lw / 3);
});

// Double line SVG coordinates calculation
const doubleLineCoords = computed(() => {
  const lw = props.element.lineWidth || 1;
  const offset = Math.max(1.5, lw / 2);
  const w = Math.max(1, props.element.width);
  const h = Math.max(1, props.element.height);
  const direction = props.element.lineDirection || 'TopDown';

  if (direction === 'BottomUp') {
    const len = Math.hypot(w, h);
    const nx = (h / len) * offset;
    const ny = (w / len) * offset;
    return {
      line1: { x1: nx, y1: h + ny, x2: w + nx, y2: ny },
      line2: { x1: -nx, y1: h - ny, x2: w - nx, y2: -ny },
    };
  }

  if (h <= 1) {
    return {
      line1: { x1: 0, y1: h / 2 - offset, x2: w, y2: h / 2 - offset },
      line2: { x1: 0, y1: h / 2 + offset, x2: w, y2: h / 2 + offset },
    };
  }

  if (w <= 1) {
    return {
      line1: { x1: w / 2 - offset, y1: 0, x2: w / 2 - offset, y2: h },
      line2: { x1: w / 2 + offset, y1: 0, x2: w / 2 + offset, y2: h },
    };
  }

  const len = Math.hypot(w, h);
  const nx = (-h / len) * offset;
  const ny = (w / len) * offset;
  return {
    line1: { x1: nx, y1: ny, x2: w + nx, y2: h + ny },
    line2: { x1: -nx, y1: -ny, x2: w - nx, y2: h - ny },
  };
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
const handleResizeStart = (event: MouseEvent, bandIndex: number, elementIndex: number, _parentFrameIndex?: number, direction?: string) => {
  emit('resizeStart', event, bandIndex, elementIndex, props.parentFrameIndex, direction);
};

// Handle context menu
const handleContextMenu = (event: MouseEvent, bandIndex: number, elementIndex: number) => {
  emit('contextmenu', event, bandIndex, elementIndex, props.parentFrameIndex);
};
</script>

<style scoped>
.line-element-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>