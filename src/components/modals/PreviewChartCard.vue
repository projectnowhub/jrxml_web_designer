<template>
  <!-- A chart in the preview's side panel: what it shows and the numbers it plots (read-only) -->
  <section class="data-card">
    <div class="card-head">
      <div class="card-title">
        <component :is="CHART_TYPE_ICONS[binding.chartType]" :size="14" aria-hidden="true" />
        <strong>{{ binding.title.trim() || t("pdfPreview.data.untitledChart", { n: number }) }}</strong>
      </div>
      <n-button size="tiny" quaternary @click="emit('edit')">
        <template #icon><SquarePen :size="13" /></template>
        {{ t("pdfPreview.tables.edit") }}
      </n-button>
    </div>

    <div class="card-source">
      <Database :size="12" aria-hidden="true" />
      <template v-if="isChartBound(binding)">
        {{ t("reportData.projectSource", { project: binding.projectName, source: binding.sourceName }) }}
      </template>
      <span class="muted">· {{ t(`chart.types.${binding.chartType}`) }}</span>
    </div>

    <div v-if="chips.length" class="chips">
      <span v-for="chip in chips" :key="chip.text" class="chip" :class="{ 'is-applied': chip.filter }">
        <Funnel v-if="chip.filter" :size="10" aria-hidden="true" />{{ chip.text }}
      </span>
    </div>

    <!-- Not printed: say why -->
    <p v-if="view.state !== 'ready'" class="state-note" :class="`is-${view.state}`">
      <TriangleAlert v-if="view.state !== 'loading'" :size="13" aria-hidden="true" />
      <span>
        <strong>{{ t(`chart.states.${view.state}`) }}</strong>
        · {{ view.state === "loading" ? t("chart.states.loadingHint") : t("pdfPreview.data.printsNothing") }}
      </span>
    </p>

    <!-- KPI and gauge: one number -->
    <div v-else-if="numbers.single" class="single">
      <span class="single-value">{{ formatChartNumber(numbers.single.value) }}</span>
      <span class="muted">{{ numbers.single.label }}</span>
    </div>

    <div v-else-if="numbers.rows.length" class="card-grid">
      <table>
        <thead>
          <tr>
            <th v-for="(header, i) in numbers.headers" :key="i" :class="{ num: i > 0 }">{{ header }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in numbers.rows" :key="r" :class="{ nested: row.nested, group: isTree && !row.nested }">
            <td>{{ row.label }}</td>
            <td v-for="(value, c) in row.values" :key="c" class="num">{{ formatChartNumber(value) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="numbers.totals">
          <tr>
            <td>{{ t("pdfPreview.data.total") }}</td>
            <td v-for="(value, c) in numbers.totals" :key="c" class="num">{{ formatChartNumber(value) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <p v-else class="muted no-data">{{ t("chart.noData") }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import { Database, Funnel, SquarePen, TriangleAlert } from "@lucide/vue";
import type { ChartElement } from "@/types";
import { CHART_TYPE_ICONS } from "../elements/chartIcons";
import { chartView } from "@/utils/chart/chartImage";
import { chartNumbers } from "@/utils/chart/chartNumbers";
import { formatChartNumber } from "@/utils/chart/chartOption";
import { measureLabel } from "@/utils/chart/chartQuery";
import { isChartBound } from "@/utils/chart/chartTypes";
import { isActiveFilter } from "@/utils/table/dataBinding";
import { describeFilter } from "@/utils/table/summary";

const props = defineProps<{
  chart: ChartElement;
  // "Chart 2" for a chart without a title
  number: number;
}>();

const emit = defineEmits<{
  // Close the preview and open this chart's Set up data popup
  edit: [];
}>();

const { t, locale } = useI18n();

// Follows the chart data store: the same numbers the canvas and the PDF picture use
const view = computed(() => chartView(props.chart.binding));
const binding = computed(() => view.value.binding);
const numbers = computed(() => chartNumbers(binding.value, view.value.data));
const isTree = computed(() => view.value.data.kind === "tree");

// What it measures, what it groups by, and its filters (moving ranges with their dates)
const chips = computed(() => {
  const b = binding.value;
  if (!isChartBound(b)) return [];
  const measures = [b.measure, ...(b.series ?? []).map((s) => s.measure)].filter((m) => !!m);
  const out = [...new Set(measures.map((m) => measureLabel(m!)))].map((text) => ({ text, filter: false }));
  const groups = [b.dimension?.label, b.level2?.label].filter(Boolean).join(" › ");
  if (groups) out.push({ text: t("pdfPreview.data.byDimension", { name: groups }), filter: false });
  const today = new Date();
  for (const f of (b.filters ?? []).filter(isActiveFilter)) {
    out.push({ text: describeFilter(undefined, f, t, locale.value, today), filter: true });
  }
  return out;
});
</script>

<style scoped>
.data-card {
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  color: #1f2937;
}

.card-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-source {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 0 8px;
  font-size: 12px;
  color: #374151;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  font-size: 11px;
  color: #374151;
  background: #fff;
}

.chip.is-applied {
  background: #f4f1ff;
  border-color: #ddd6fe;
  color: #5b3ee0;
}

.card-grid {
  max-height: 240px;
  overflow: auto;
  border: 1px solid #eef0f4;
  border-radius: 6px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

th,
td {
  padding: 5px 8px;
  border-bottom: 1px solid #eef0f4;
  text-align: left;
  color: #374151;
}

th {
  position: sticky;
  top: 0;
  background: #f8fafc;
  font-weight: 600;
  color: #4b5563;
}

.num {
  text-align: right;
  white-space: nowrap;
}

tr.group td {
  font-weight: 600;
}

tr.nested td:first-child {
  padding-left: 20px;
}

tfoot td {
  border-bottom: none;
  background: #f8fafc;
  font-weight: 600;
}

.single {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 2px;
}

.single-value {
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
}

.state-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
  background: #f8fafc;
  color: #4b5563;
}

.state-note svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.state-note.is-failed {
  background: #fef2f2;
  color: #b91c1c;
}

.state-note.is-incomplete,
.state-note.is-sample {
  background: #fffbeb;
  color: #92400e;
}

.muted {
  font-size: 11px;
  color: #9ca3af;
}

.no-data {
  margin: 0;
  padding: 6px 2px;
}
</style>
