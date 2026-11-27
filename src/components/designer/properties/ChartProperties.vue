<template>
  <div class="chart-properties">
    <!-- Basic Properties: data, chart type, title, legend -->
    <template v-if="part === 'basic'">
      <div class="card">
        <h5>{{ t("chart.data") }}<SettingHelpButton id="chartData" /></h5>
        <SettingHelpText id="chartData" />
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
        <h5>{{ t("chart.type") }}<SettingHelpButton id="chartType" /></h5>
        <SettingHelpText id="chartType" />
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
        <h5>{{ t("chart.title") }}<SettingHelpButton id="chartTitle" /></h5>
        <SettingHelpText id="chartTitle" />
        <label class="field">
          <span class="field-label">{{ t("chart.chartTitle") }}</span>
          <input v-live-change
            type="text"
            :value="binding.title"
            :placeholder="t('chart.chartTitlePlaceholder')"
            @change="update({ title: ($event.target as HTMLInputElement).value.trim() })"
          />
        </label>
        <label class="field">
          <span class="field-label">{{ t("chart.note") }}</span>
          <input v-live-change
            type="text"
            :value="binding.note ?? ''"
            :maxlength="MAX_CHART_NOTE"
            :placeholder="t('chart.notePlaceholder')"
            @change="setNote(($event.target as HTMLInputElement).value)"
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
    <template v-else>
    <div class="card">
      <h5>{{ t("chart.colors") }}<SettingHelpButton id="chartColors" /></h5>
      <SettingHelpText id="chartColors" />
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

    <!-- A colour of its own for some values, over the colour set -->
    <div v-if="binding.chartType !== 'gauge'" class="card">
      <h5>{{ t("chart.ownColors") }}<SettingHelpButton id="chartOwnColors" /></h5>
      <SettingHelpText id="chartOwnColors" />
      <template v-if="colorItems.length">
        <ul class="own-colors">
          <li v-for="item in colorItems" :key="item.key" class="own-color">
            <ColorSwatchPicker
              :model-value="item.color"
              @update:model-value="setOwnColor(item.key, $event)"
              @change="endColorEdit"
            />
            <span class="own-color-name" :title="item.name">{{ item.name }}</span>
            <button
              v-if="item.own"
              type="button"
              class="own-color-reset"
              :title="t('chart.useSetColor')"
              :aria-label="t('chart.useSetColor')"
              @click="clearOwnColor(item.key)"
            >
              <RotateCcw :size="12" />
            </button>
          </li>
        </ul>
        <button v-if="hasOwnColors" type="button" class="data-btn" @click="clearAllOwnColors">
          <RotateCcw :size="13" aria-hidden="true" />
          {{ t("chart.useSetColors") }}
        </button>
      </template>
      <p v-else class="form-hint is-top">{{ t("chart.ownColorsHint") }}</p>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import SettingHelpButton from "../../help/SettingHelpButton.vue";
import SettingHelpText from "../../help/SettingHelpText.vue";
import { useReportStore } from "@/stores/report";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { ChartElement } from "../../../types";
import { Database, RotateCcw, SlidersHorizontal } from "@lucide/vue";
import ColorSwatchPicker from "../../common/ColorSwatchPicker.vue";
import { chartView } from "../../../utils/chart/chartImage";
import { chartColorItems } from "../../../utils/chart/chartOption";
import type { ChartBinding, ChartType } from "../../../types/dataSource";
import {
  CHART_GROUPS,
  CHART_PALETTES,
  MAX_CHART_NOTE,
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

const setNote = (value: string) => {
  const note = value.replace(/\s+/g, " ").trim().slice(0, MAX_CHART_NOTE);
  const { note: _old, ...rest } = binding.value;
  commit(note ? { ...rest, note } : rest);
};

// ── A colour of its own per value (real numbers only) ──
const colorItems = computed(() => {
  void locale.value;
  const view = chartView(props.element.binding);
  return view.state === "ready" ? chartColorItems(view.binding, view.data) : [];
});
const hasOwnColors = computed(() => Object.keys(binding.value.colors ?? {}).length > 0);

// One undo step per colour picked: a colour dragged in the picker is one change
let editingColor: string | null = null;
function setOwnColor(key: string, color: string) {
  if (binding.value.colors?.[key] === color) return;
  if (editingColor !== key) {
    report.saveStateToHistory();
    editingColor = key;
  }
  props.element.binding = { ...binding.value, colors: { ...binding.value.colors, [key]: color } };
  report.updateJrxml();
}
function endColorEdit() {
  editingColor = null;
}
function withoutColors(keys: string[]): ChartBinding {
  const colors = { ...binding.value.colors };
  keys.forEach((key) => delete colors[key]);
  const { colors: _old, ...rest } = binding.value;
  return Object.keys(colors).length ? { ...rest, colors } : rest;
}
const clearOwnColor = (key: string) => commit(withoutColors([key]));
const clearAllOwnColors = () => commit(withoutColors(Object.keys(binding.value.colors ?? {})));
</script>

<style scoped>
/* Cards, matching the rest of the property panel */
.card {
  /* Same card as the other property sections */
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.own-colors {
  margin: 0 0 8px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.own-color {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.own-color-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--prop-text-primary);
}

.own-color-reset {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--prop-border, #e6e5ee);
  border-radius: 6px;
  background: #ffffff;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
}

.own-color-reset:hover {
  color: #6440f4;
  border-color: #6440f4;
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
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
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
  accent-color: var(--prop-primary-color, #6440f4);
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
  color: var(--prop-primary-color, #6440f4);
}
</style>
