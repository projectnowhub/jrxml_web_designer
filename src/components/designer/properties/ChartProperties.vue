<template>
  <div class="chart-properties">
    <!-- Basic Properties: data, chart type, title, legend -->
    <template v-if="part === 'basic'">
      <div class="card">
        <h5>{{ t("chart.data") }}</h5>
        <template v-if="isChartBound(binding)">
          <p class="data-source">
            <Database :size="13" aria-hidden="true" />
            <span>{{ t("chart.dataFrom", { source: binding.sourceName, project: binding.projectName }) }}</span>
          </p>
          <ul v-if="filterSummary.length" class="data-filters">
            <li v-for="line in filterSummary" :key="line">{{ line }}</li>
          </ul>
        </template>
        <p v-else class="form-hint is-top">{{ t("chart.dataHint") }}</p>
        <button type="button" class="data-btn" @click="emit('configure')">
          <SlidersHorizontal :size="13" aria-hidden="true" />
          {{ t(isChartBound(binding) ? "chart.editData" : "chart.setUpData") }}
        </button>
      </div>

      <div class="card">
        <h5>{{ t("chart.type") }}</h5>
        <div v-for="group in CHART_GROUPS" :key="group" class="type-group">
          <span class="field-label">{{ t(`chart.groups.${group}`) }}</span>
          <div class="type-grid" role="radiogroup" :aria-label="t(`chart.groups.${group}`)">
            <button
              v-for="chart in chartTypesInGroup(group)"
              :key="chart.type"
              type="button"
              role="radio"
              class="type-option"
              :class="{ active: binding.chartType === chart.type }"
              :aria-checked="binding.chartType === chart.type"
              @click="setType(chart.type)"
            >
              <component :is="CHART_TYPE_ICONS[chart.type]" :size="14" :stroke-width="1.75" aria-hidden="true" />
              <span>{{ t(`chart.types.${chart.type}`) }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <h5>{{ t("chart.title") }}</h5>
        <label class="field">
          <span class="field-label">{{ t("chart.chartTitle") }}</span>
          <input
            type="text"
            :value="binding.title"
            :placeholder="t('chart.chartTitlePlaceholder')"
            @change="update({ title: ($event.target as HTMLInputElement).value.trim() })"
          />
        </label>
        <label v-if="hasLegend" class="toggle-row">
          <input
            type="checkbox"
            :checked="binding.showLegend"
            @change="update({ showLegend: ($event.target as HTMLInputElement).checked })"
          />
          <span>{{ t("chart.showLegend") }}</span>
        </label>
      </div>
    </template>

    <!-- Style Settings: colours -->
    <div v-else class="card">
      <h5>{{ t("chart.colors") }}</h5>
      <div class="palette-list" role="radiogroup" :aria-label="t('chart.colors')">
        <button
          v-for="palette in CHART_PALETTES"
          :key="palette.id"
          type="button"
          role="radio"
          class="palette-option"
          :class="{ active: binding.palette === palette.id }"
          :aria-checked="binding.palette === palette.id"
          @click="update({ palette: palette.id })"
        >
          <span class="palette-swatches" aria-hidden="true">
            <span v-for="color in palette.colors.slice(0, 6)" :key="color" :style="{ background: color }" />
          </span>
          <span>{{ t(`chart.palettes.${palette.id}`) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReportStore } from "@/stores/report";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { ChartElement } from "../../../types";
import { Database, SlidersHorizontal } from "@lucide/vue";
import type { ChartBinding, ChartType } from "../../../types/dataSource";
import {
  CHART_GROUPS,
  CHART_PALETTES,
  changeChartType,
  chartTypeInfo,
  chartTypesInGroup,
  isChartBound,
  normalizeChartBinding,
} from "../../../utils/chart/chartTypes";
import { isActiveFilter } from "../../../utils/table/dataBinding";
import { describeFilter } from "../../../utils/table/summary";
import { CHART_TYPE_ICONS } from "../../elements/chartIcons";

const props = defineProps<{
  element: ChartElement;
  part: "basic" | "style";
}>();

// Changes: an undo step before, the JRXML rewritten after
const report = useReportStore();

const emit = defineEmits<{
  // Open the Configure popup
  configure: [];
}>();

const { t, locale } = useI18n();

const binding = computed(() => normalizeChartBinding(props.element.binding));
const hasLegend = computed(() => chartTypeInfo(binding.value.chartType).hasLegend);

const filterSummary = computed(() =>
  (binding.value.filters ?? []).filter(isActiveFilter).map((f) => describeFilter(undefined, f, t, locale.value)),
);

// One undo step per change; the element keeps its place and size
const commit = (next: ChartBinding) => {
  if (JSON.stringify(next) === JSON.stringify(binding.value)) return;
  report.saveStateToHistory();
  props.element.binding = next;
  report.updateJrxml();
};
const update = (patch: Partial<ChartBinding>) => commit({ ...binding.value, ...patch });

// Another type for the same data
const setType = (chartType: ChartType) => commit(changeChartType(binding.value, chartType));
</script>

<style scoped>
/* Cards, matching the rest of the property panel */
.card {
  margin-bottom: var(--prop-spacing-md);
  padding: var(--prop-spacing-sm) 10px 10px;
  border-radius: var(--prop-border-radius-md);
  background: var(--prop-bg-secondary);
}

.card h5 {
  margin: 0 0 8px;
  font-size: var(--prop-font-size-sm);
  font-weight: 600;
  color: var(--prop-text-primary);
}

.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary);
}

.field {
  display: block;
  margin-bottom: 8px;
}

.field input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  box-sizing: border-box;
}

.field input:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.type-group + .type-group {
  margin-top: 8px;
}

.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.type-option,
.palette-option {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-secondary);
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.type-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-option:hover,
.palette-option:hover {
  color: var(--prop-text-primary);
  border-color: var(--prop-border-focus);
}

.type-option.active,
.palette-option.active {
  border-color: var(--prop-primary-color, #1890ff);
  background: #e6f4ff;
  color: var(--prop-primary-color, #1890ff);
  font-weight: 600;
}

.type-option:focus-visible,
.palette-option:focus-visible {
  outline: 2px solid var(--prop-border-focus);
  outline-offset: 1px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.toggle-row input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--prop-primary-color, #1890ff);
}

.palette-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.palette-swatches {
  display: flex;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 3px;
}

.palette-swatches span {
  width: 14px;
  height: 14px;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.form-hint.is-top {
  margin: 0 0 8px;
  line-height: 1.4;
}

.data-source {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--prop-text-primary);
}

.data-source svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--prop-text-secondary);
}

.data-filters {
  margin: 0 0 8px;
  padding-left: 19px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--prop-text-secondary);
}

.data-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  justify-content: center;
  height: 30px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.data-btn:hover {
  border-color: var(--prop-border-focus);
  color: var(--prop-primary-color, #1890ff);
}
</style>
