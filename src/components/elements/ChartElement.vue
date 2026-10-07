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
    @start-editing="(b, e) => emit('startEditing', b, e, parentFrameIndex)"
  >
    <!-- A source or column dropped here sets up this chart's data -->
    <div
      class="chart-element"
      :class="{ 'is-drop-target': isDropTarget, 'is-placeholder': view.state !== 'ready' }"
      :data-chart-uuid="element.uuid"
      @dragenter="onDragOver"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="isDropTarget = false"
    >
      <!-- Drawn from the same settings as the chart's image in the JRXML -->
      <ChartCanvas :option="shownOption" :width="size.width" :height="size.height" />
      <span
        v-if="view.state !== 'ready'"
        class="chart-badge"
        :class="`is-${view.state}`"
        :title="t(`chart.states.${view.state}Hint`)"
      >
        {{ t(`chart.states.${view.state}`) }}
      </span>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { EChartsCoreOption } from 'echarts/core';
import BaseElement from './BaseElement.vue';
import ChartCanvas from '../common/ChartCanvas.vue';
import { chartElementOption, chartView } from '../../utils/chart/chartImage';
import { chartDataKey, loadChartData } from '../../utils/chart/chartDataStore';
import { isChartComplete } from '../../utils/chart/chartTypes';
import { isDataSourceDrag } from '../../utils/table/dataDrag';
import type { ChartElement, SelectedElementInfo, EditingElementInfo } from '../../types';

const { t, locale } = useI18n();

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
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

const size = computed(() => ({
  width: Math.max(1, Math.round(props.element.width)),
  height: Math.max(1, Math.round(props.element.height)),
}));

// Real numbers, or sample numbers while there are none (labels follow the app language)
const view = computed(() => {
  void locale.value;
  return chartView(props.element.binding);
});

// Fetch the numbers whenever what the chart asks for changes
watch(
  () => (isChartComplete(view.value.binding) ? chartDataKey(view.value.binding) : ''),
  (key) => {
    if (key) loadChartData(view.value.binding);
  },
  { immediate: true },
);

// While new numbers load, the chart keeps showing the last real ones
const shownOption = shallowRef<EChartsCoreOption>(chartElementOption(props.element, view.value));
let showingReal = view.value.state === 'ready';
watch(
  () => [view.value, size.value] as const,
  ([current]) => {
    if (current.state === 'loading' && showingReal) return;
    shownOption.value = chartElementOption(props.element, current);
    showingReal = current.state === 'ready';
  },
);

// Highlight while a source or column is dragged over this chart
const isDropTarget = ref(false);
function onDragOver(event: DragEvent) {
  if (!isDataSourceDrag(event)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  isDropTarget.value = true;
}
function onDragLeave(event: DragEvent) {
  const next = event.relatedTarget as Node | null;
  if (!next || !(event.currentTarget as HTMLElement).contains(next)) isDropTarget.value = false;
}
</script>

<style scoped>
.chart-element {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Sample numbers are drawn faded: they never print */
.chart-element.is-placeholder :deep(.chart-canvas) {
  opacity: 0.45;
}

.chart-element.is-drop-target {
  outline: 2px dashed #1890ff;
  outline-offset: 2px;
}

.chart-element.is-drop-target::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(24, 144, 255, 0.08);
  pointer-events: none;
}

.chart-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  max-width: calc(100% - 6px);
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 1px 6px;
  font-size: 9px;
  line-height: 14px;
  color: #4b5563;
  background: rgba(255, 255, 255, 0.92);
  border: 1px dashed #c7cbd1;
  border-radius: 7px;
  white-space: nowrap;
}

.chart-badge.is-failed {
  color: #b91c1c;
  border-color: #fca5a5;
}

.chart-badge.is-incomplete {
  color: #92400e;
  border-color: #fcd34d;
}
</style>
