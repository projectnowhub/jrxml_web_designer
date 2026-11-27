<template>
  <div ref="surfaceRef" class="chart-canvas" :style="{ width: `${width}px`, height: `${height}px` }" />
</template>

<script setup lang="ts">
// A chart drawn live with ECharts (SVG, like the chart's image in the JRXML),
// at a fixed size in report points. Used by the Chart element and the
// Configure popup's preview.
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { EChartsCoreOption } from "echarts/core";
import { echarts } from "../../utils/chart/echartsSetup";

const props = defineProps<{
  option: EChartsCoreOption;
  width: number;
  height: number;
}>();

const surfaceRef = ref<HTMLElement | null>(null);
let chart: ReturnType<typeof echarts.init> | null = null;

onMounted(() => {
  if (!surfaceRef.value) return;
  chart = echarts.init(surfaceRef.value, null, { renderer: "svg", width: props.width, height: props.height });
  chart.setOption(props.option);
});

watch(
  () => [props.option, props.width, props.height] as const,
  ([option, width, height]) => {
    if (!chart) return;
    chart.resize({ width, height });
    chart.setOption(option, { notMerge: true });
  },
);

onBeforeUnmount(() => {
  chart?.dispose();
  chart = null;
});
</script>

<style scoped>
/* Selection and dragging belong to whatever holds the chart */
.chart-canvas {
  pointer-events: none;
}
</style>
