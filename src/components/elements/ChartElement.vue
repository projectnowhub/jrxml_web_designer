<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :selected-elements="selectedElements"
    :editing-element="editingElement"
    :is-dragging="isDragging"
    :is-out-of-bounds="isOutOfBounds"
    :parent-frame-index="parentFrameIndex"
    :zoom-level="zoomLevel"
    @select="(b, e, m, p) => emit('select', b, e, m, p)"
    @drag-start="(ev, b, e, p) => emit('dragStart', ev, b, e, p)"
    @resize-start="(ev, b, e, p, d) => emit('resizeStart', ev, b, e, p, d)"
    @contextmenu="(ev, b, e, p) => emit('contextmenu', ev, b, e, p)"
  >
    <div class="chart-element">
      <div class="chart-content">
        <component :is="chartIcon" class="chart-icon" :stroke-width="1.5" />
        <span class="chart-label">{{ getChartLabel() }}</span>
      </div>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  ChartArea,
  ChartColumn,
  ChartColumnBig,
  ChartLine,
  ChartPie,
  ChartScatter,
  Gauge,
} from '@lucide/vue';
import BaseElement from './BaseElement.vue';
import { stripExpressionQuotes } from '../../utils/elementUtils';
import type { ChartElement, SelectedElementInfo, EditingElementInfo } from '../../types';

const { t, te } = useI18n();

const props = defineProps<{
  element: ChartElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements: {bandIndex: number, elementIndex: number, parentFrameIndex?: number}[];
  editingElement: EditingElementInfo | null;
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  parentFrameIndex?: number;
  zoomLevel?: number;
}>();

const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Placeholder icon for the chart family
const chartIcon = computed(() => {
  switch (props.element.chartType) {
    case 'pie':
    case 'pie3D':
      return ChartPie;
    case 'bar':
    case 'bar3D':
    case 'stackedBar':
    case 'stackedBar3D':
      return ChartColumn;
    case 'line':
    case 'xyLine':
    case 'timeSeries':
      return ChartLine;
    case 'area':
    case 'xyArea':
    case 'stackedArea':
      return ChartArea;
    case 'scatter':
    case 'bubble':
      return ChartScatter;
    case 'meter':
    case 'thermometer':
      return Gauge;
    default:
      return ChartColumnBig;
  }
});

// The chart's title when it has one, else its type
function getChartLabel(): string {
  const el = props.element as any;
  const title = el.titleExpression ? stripExpressionQuotes(el.titleExpression) : el.title;
  if (title) return title;
  const key = `chart.types.${props.element.chartType}`;
  return te(key) ? t(key) : t('chart.title');
}
</script>

<style scoped>
.chart-element {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff7e6;
  border: 1px dashed #ffc53d;
  border-radius: 2px;
}

.chart-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #fa8c16;
}

.chart-icon {
  width: 24px;
  height: 24px;
}

.chart-label {
  font-size: 10px;
  font-weight: 500;
}
</style>
