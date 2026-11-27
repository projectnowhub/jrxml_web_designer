<template>
  <BaseModal
    :visible="visible"
    :title="t('chart.config.title')"
    :content-style="{ width: 'min(1060px, 96vw)', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="ccm">
      <!-- Settings: the CDP app's dashboard widget panel (WidgetPropertiesPanel),
           same words and controls, in boxes so each part is easy to find:
           where the numbers come from (Project and Source, which the CDP app
           takes from its page), the chart (type, then its fields), the
           filters, the title -->
      <div class="ccm-settings">
        <section class="ccm-box">
          <!-- Project, then one of its sources -->
          <div class="ccm-field">
            <label class="ccm-label">{{ t("dataTable.config.project") }}</label>
            <p v-if="!projectOptions.length" class="ccm-hint">{{ t("dataTable.config.noProjects") }}</p>
            <div v-else class="ccm-select-wrap">
              <select class="ccm-select" :value="projectId" @change="changeProject(($event.target as HTMLSelectElement).value)">
                <option value="" disabled>{{ t("dataTable.config.chooseProject") }}</option>
                <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
            </div>
          </div>
          <div v-if="projectId" class="ccm-field">
            <label class="ccm-label">{{ t("dataTable.config.source") }}</label>
            <SkeletonBlock v-if="sourcesLoading" height="36px" radius="6px" />
            <div v-else class="ccm-select-wrap">
              <select class="ccm-select" :value="sourceId" @change="changeSource(($event.target as HTMLSelectElement).value)">
                <option value="" disabled>{{ t("dataTable.config.chooseSource") }}</option>
                <!-- Under the CDP app's sidebar headings, with its names -->
                <optgroup v-for="group in groupTablesLikeCdp(sources)" :key="group.key" :label="group.title">
                  <option v-for="s in group.sections.flatMap((section) => section.tables)" :key="s.id" :value="s.id">
                    {{ s.rowCount !== undefined ? t("dataTable.config.sourceOption", { name: s.label, count: s.rowCount }) : s.label }}
                  </option>
                </optgroup>
              </select>
              <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
            </div>
          </div>
          <p v-if="loadError" class="ccm-error">{{ t("dataTable.loadFailed") }}</p>
          <p v-else-if="replacedSource" class="ccm-note">
            <Replace :size="13" aria-hidden="true" />
            {{ t("chart.config.replacesData", { source: replacedSource }) }}
          </p>

        </section>

        <section class="ccm-box">
          <!-- Chart type: one dropdown, the types by group (the CDP app's
               ChartTypeList groups), the chosen type's icon in the field -->
          <div class="ccm-field">
            <label class="ccm-label" for="ccm-chart-type">{{ t("chart.type") }}</label>
            <div class="ccm-select-wrap has-icon">
              <component :is="CHART_TYPE_ICONS[draft.chartType]" class="ccm-select-icon" :size="15" aria-hidden="true" />
              <select id="ccm-chart-type" class="ccm-select" :value="draft.chartType" @change="pickType(($event.target as HTMLSelectElement).value as ChartType)">
                <optgroup v-for="group in CHART_GROUPS" :key="group" :label="t(`chart.groups.${group}`)">
                  <option v-for="c in chartTypesInGroup(group)" :key="c.type" :value="c.type">{{ t(`chart.types.${c.type}`) }}</option>
                </optgroup>
              </select>
              <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
            </div>
          </div>

            <!-- The chosen table's fields on their way -->
            <div v-if="schemaLoading" class="ccm-skeleton">
              <SkeletonBlock width="40%" height="12px" />
              <SkeletonBlock v-for="i in 3" :key="i" height="36px" radius="6px" />
            </div>

            <template v-if="schema">
              <!-- Categories (DimensionSlotField) and its time granularity -->
              <div v-if="info.shape === 'series' || info.shape === 'parts'" class="ccm-field">
                <label class="ccm-label">{{ t(`chart.panel.slots.${dimensionSlot}`) }}</label>
                <div class="ccm-select-wrap">
                  <select class="ccm-select" :value="draft.dimension?.column ?? ''" @change="setDimension('dimension', ($event.target as HTMLSelectElement).value)">
                    <option v-if="!draft.dimension" value="" disabled></option>
                    <ChartColumnOptions :columns="dimensionColumns" :as-listed="!!cdpFields" />
                  </select>
                  <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
                </div>
                <p v-if="!dimensionColumns.length" class="ccm-hint">
                  {{ t(info.dimensionTypes.includes("text") ? "chart.config.noTextColumns" : "chart.config.noDateColumns") }}
                </p>
                <template v-if="draft.dimension?.type === 'date'">
                  <label class="ccm-label is-next">{{ t("chart.panel.granularity") }}</label>
                  <ChartSegmented
                    :options="DATE_GRANULARITIES.map((g) => ({ value: g, label: t(`chart.granularities.${g}`) }))"
                    :model-value="draft.dimension.granularity"
                    @update:model-value="setGranularity($event as DateGranularity)"
                  />
                </template>
              </div>

              <!-- Tree map: Level 1 and Level 2 (LevelSlotField) -->
              <template v-if="info.shape === 'tree'">
                <div class="ccm-field">
                  <label class="ccm-label">{{ t("chart.panel.slots.level1") }}</label>
                  <div class="ccm-select-wrap">
                    <select class="ccm-select" :value="draft.dimension?.column ?? ''" @change="setDimension('dimension', ($event.target as HTMLSelectElement).value)">
                      <option v-if="!draft.dimension" value="" disabled></option>
                      <ChartColumnOptions :columns="dimensionColumns" :as-listed="!!cdpFields" />
                    </select>
                    <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
                  </div>
                </div>
                <div class="ccm-field">
                  <label class="ccm-label">{{ t("chart.panel.slots.level2") }}</label>
                  <div class="ccm-select-wrap">
                    <select class="ccm-select" :value="draft.level2?.column ?? ''" @change="setDimension('level2', ($event.target as HTMLSelectElement).value)">
                      <option v-if="!draft.level2" value="" disabled></option>
                      <ChartColumnOptions
                        :columns="dimensionColumns.filter((c) => c.key !== draft.dimension?.column)"
                        :as-listed="!!cdpFields"
                      />
                    </select>
                    <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
                  </div>
                </div>
              </template>

              <!-- One number: KPI, gauge, pie, donut, tree map (MeasureSlotField) -->
              <ChartMeasurePicker
                v-if="info.shape !== 'series' && draft.measure"
                :label="t('chart.panel.slots.value')"
                :measure="draft.measure"
                :columns="numberColumns"
                @change="draft.measure = $event"
              />

              <!-- Gauge range: Auto / Manual (GaugeRangeField) -->
              <div v-if="draft.chartType === 'gauge'" class="ccm-field">
                <label class="ccm-label">{{ t("chart.panel.gaugeRange") }}</label>
                <ChartSegmented
                  :options="[
                    { value: 'auto', label: t('chart.panel.rangeAuto') },
                    { value: 'manual', label: t('chart.panel.rangeManual') },
                  ]"
                  :model-value="gaugeManual ? 'manual' : 'auto'"
                  @update:model-value="setGaugeMode($event === 'manual')"
                />
                <div v-if="!gaugeManual" class="ccm-range-auto">
                  <span>{{ t("chart.panel.rangeMin") }}: {{ formatChartNumber(autoRange.min) }}</span>
                  <span>{{ t("chart.panel.rangeMax") }}: {{ formatChartNumber(autoRange.max) }}</span>
                </div>
                <div v-else class="ccm-range-manual">
                  <label>
                    <span>{{ t("chart.panel.rangeMin") }}</span>
                    <input class="ccm-input" type="number" :value="draft.gaugeMin ?? ''" @input="setGaugeEnd('gaugeMin', ($event.target as HTMLInputElement).value)" />
                  </label>
                  <label>
                    <span>{{ t("chart.panel.rangeMax") }}</span>
                    <input class="ccm-input" type="number" :value="draft.gaugeMax ?? ''" @input="setGaugeEnd('gaugeMax', ($event.target as HTMLInputElement).value)" />
                  </label>
                </div>
              </div>

              <!-- Lines / bars / areas, one card each (BlockList / BlockCard) -->
              <div v-if="info.shape === 'series'" class="ccm-field">
                <div v-for="(s, i) in draft.series ?? []" :key="i" class="ccm-block">
                  <div class="ccm-block-head">
                    <span>{{ t(`chart.panel.blockTerms.${blockTerm}`) }} {{ i + 1 }}</span>
                    <button
                      v-if="(draft.series?.length ?? 0) > 1"
                      type="button"
                      class="ccm-icon-box"
                      :aria-label="t('common.delete')"
                      @click="removeSeries(i)"
                    >
                      <Trash2 :size="14" aria-hidden="true" />
                    </button>
                  </div>

                  <ChartMeasurePicker
                    :label="measureLabel(s.measure)"
                    :measure="s.measure"
                    :columns="numberColumns"
                    @change="setSeriesMeasure(i, $event)"
                  />

                  <label class="ccm-label">
                    {{ t("chart.panel.splitBy") }} <span class="ccm-optional">{{ t("chart.panel.optional") }}</span>
                  </label>
                  <div class="ccm-select-wrap">
                    <select class="ccm-select" :value="s.splitBy?.column ?? ''" @change="setSplit(i, ($event.target as HTMLSelectElement).value)">
                      <option value="">{{ t("chart.panel.noSplit") }}</option>
                      <ChartColumnOptions :columns="splitColumns" :as-listed="!!cdpFields" />
                    </select>
                    <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
                  </div>

                  <template v-if="isBarType && s.splitBy">
                    <label class="ccm-label is-next">{{ t("chart.panel.layout") }}</label>
                    <ChartSegmented
                      :options="[
                        { value: 'stacked', label: t('chart.panel.stacked') },
                        { value: 'grouped', label: t('chart.panel.grouped') },
                      ]"
                      :model-value="draft.stacked ? 'stacked' : 'grouped'"
                      @update:model-value="draft.stacked = $event === 'stacked' || undefined"
                    />
                  </template>

                  <template v-if="draft.chartType === 'barH'">
                    <label class="ccm-label is-next">{{ t("chart.panel.showAs") }}</label>
                    <ChartSegmented
                      :options="[
                        { value: 'bar', label: t('chart.panel.bar') },
                        { value: 'line', label: t('chart.panel.line') },
                      ]"
                      :model-value="s.renderAs ?? 'bar'"
                      @update:model-value="setRenderAs(i, $event)"
                    />
                  </template>

                  <div class="ccm-colors">
                    <button type="button" class="ccm-link" @click="toggleColors(`b${i}`)">
                      {{ t(openColors.has(`b${i}`) ? "chart.panel.hideColors" : "chart.panel.customizeColors") }}
                    </button>
                    <ChartColorSwatches
                      v-if="openColors.has(`b${i}`)"
                      :rows="blockColorRows(i)"
                      @set="setColor"
                      @reset="resetColors(blockColorRows(i))"
                    />
                  </div>
                </div>
                <button v-if="(draft.series?.length ?? 0) < MAX_CHART_SERIES" type="button" class="ccm-dashed" @click="addSeries">
                  <Plus :size="14" aria-hidden="true" />
                  {{ t("chart.panel.addBlock", { term: t(`chart.panel.blockTerms.${blockTerm}`).toLowerCase() }) }}
                </button>
              </div>

              <!-- KPI, pie, donut: their colours (WidgetColorField) -->
              <div v-if="['kpi', 'pie', 'donut'].includes(draft.chartType)" class="ccm-field">
                <button type="button" class="ccm-link" @click="toggleColors('top')">
                  {{ t(openColors.has("top") ? "chart.panel.hideColors" : "chart.panel.customizeColors") }}
                </button>
                <ChartColorSwatches v-if="openColors.has('top')" :rows="topColorRows" @set="setColor" @reset="resetColors(topColorRows)" />
              </div>

              <label v-if="info.hasLegend" class="ccm-check">
                <input type="checkbox" :checked="draft.showLegend" @change="draft.showLegend = ($event.target as HTMLInputElement).checked" />
                {{ t("chart.panel.showLegend") }}
              </label>

            </template>
        </section>

        <template v-if="schema">
          <section class="ccm-box">
            <!-- Filters, exactly as the CDP app's dashboard widgets -->
            <TableFilterPanel
              :columns="filterColumns"
              :facets="filterFacets"
              :filters="draft.filters ?? []"
              @update:filters="draft.filters = $event"
            />

          </section>

          <section class="ccm-box">
            <div class="ccm-field">
              <label class="ccm-label">{{ t("chart.panel.widgetTitle") }}</label>
              <input v-model="draft.title" class="ccm-input" type="text" :placeholder="draftBinding.title" />
            </div>
            <div class="ccm-field">
              <label class="ccm-label">
                {{ t("chart.panel.widgetDescription") }} <span class="ccm-optional">({{ t("chart.panel.optional") }})</span>
              </label>
              <textarea
                v-model="draft.note"
                class="ccm-textarea"
                rows="3"
                :maxlength="MAX_CHART_NOTE"
                :placeholder="t('chart.panel.widgetDescriptionPlaceholder')"
              ></textarea>
            </div>
          </section>
        </template>
      </div>

      <!-- Live preview, at the chart's size -->
      <div class="ccm-preview">
        <div class="ccm-preview-head">
          <h4>{{ t("dataTable.config.preview") }}</h4>
          <span v-if="previewView.state === 'ready' && matchCount !== null" class="ccm-muted">
            {{ t("chart.config.basedOn", matchCount) }}
          </span>
        </div>
        <!-- Every category prints (as the CDP app): many make a crowded chart on paper -->
        <p v-if="categoryCount > MANY_CATEGORIES" class="ccm-note">
          <Info :size="13" aria-hidden="true" />
          {{ t("chart.config.manyCategories", { count: categoryCount }) }}
        </p>
        <div class="ccm-stage">
          <!-- New numbers on their way over the last chart -->
          <div v-if="shownPreview && fetching" class="ccm-fetching" role="status">
            <LoaderCircle :size="14" aria-hidden="true" />{{ t("dataTable.loading") }}
          </div>
          <div
            v-if="shownPreview"
            class="ccm-paper"
            :style="{ width: `${chartSize.width * previewScale}px`, height: `${chartSize.height * previewScale}px` }"
          >
            <div :style="{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }">
              <ChartCanvas :option="shownPreview" :width="chartSize.width" :height="chartSize.height" />
            </div>
          </div>
          <!-- Numbers on their way: a chart-shaped skeleton -->
          <div v-else-if="schemaLoading || previewView.state === 'loading'" class="ccm-chart-skeleton" role="status" :aria-label="t('dataTable.loading')">
            <SkeletonBlock width="45%" height="14px" />
            <div class="ccm-chart-skeleton-bars">
              <SkeletonBlock v-for="(h, i) in SKELETON_BARS" :key="i" width="9%" :height="`${h}%`" radius="4px 4px 0 0" />
            </div>
          </div>
          <div v-else class="ccm-stage-note">
            {{ t(`chart.states.${previewView.state === "ready" ? "loading" : previewView.state}Hint`) }}
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <span v-if="applyBlockedReason" class="ccm-footer-hint">{{ applyBlockedReason }}</span>
      <n-button @click="emit('update:visible', false)">{{ t("common.cancel") }}</n-button>
      <n-button type="primary" :disabled="!!applyBlockedReason" :loading="fetching" @click="apply">
        {{ t("dataTable.config.apply") }}
      </n-button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import { cdpTableName, groupTablesLikeCdp } from "@/utils/table/tableGroups";
import type { EChartsCoreOption } from "echarts/core";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import { ChevronDown, Info, LoaderCircle, Plus, Replace, Trash2 } from "@lucide/vue";
import BaseModal from "./BaseModal.vue";
import ChartCanvas from "../common/ChartCanvas.vue";
import SkeletonBlock from "../common/SkeletonBlock.vue";
import TableFilterPanel from "../designer/TableFilterPanel.vue";
import ChartColumnOptions from "../designer/ChartColumnOptions.vue";
import ChartSegmented from "../designer/ChartSegmented.vue";
import ChartMeasurePicker from "../designer/ChartMeasurePicker.vue";
import ChartColorSwatches from "../designer/ChartColorSwatches.vue";
import { CHART_TYPE_ICONS } from "../elements/chartIcons";
import { chartFieldLists } from "@/utils/chart/chartFields";
import { measureLabel, suggestChartTitle } from "@/utils/chart/chartQuery";
import { fetchFacets, fetchSchema, fetchSources } from "@/queries/dataSourceQueries";
import {
  CHART_GROUPS,
  DATE_GRANULARITIES,
  DEFAULT_GRANULARITY,
  MAX_CHART_NOTE,
  MAX_CHART_SERIES,
  chartColors,
  chartTypeInfo,
  chartTypesInGroup,
  groupingColumns,
  isChartComplete,
  normalizeChartBinding,
} from "@/utils/chart/chartTypes";
import { chartView } from "@/utils/chart/chartImage";
import {
  KPI_COLOR_KEY,
  autoGaugeRange,
  buildChartOption,
  chartColorItems,
  chartFontFamily,
  formatChartNumber,
} from "@/utils/chart/chartOption";
import { chartDataEntry, useChartData } from "@/utils/chart/chartDataStore";
import type {
  ChartAggregation,
  ChartBinding,
  ChartDimension,
  ChartMeasure,
  ChartType,
  DataColumn,
  DataSourceSchema,
  DataSourceSummary,
  DateGranularity,
  ReportProject,
  SourceFacets,
} from "@/types/dataSource";

const props = defineProps<{
  visible: boolean;
  // The chart's current setup and size
  binding: ChartBinding | undefined;
  chartSize: { width: number; height: number };
  // The report's projects (the Report Data list)
  projects: ReportProject[];
  // Project, source (and column) dragged onto the chart, if it was opened by a drop
  initialProjectId?: string;
  initialSourceId?: string;
  initialColumnKey?: string;
}>();

const emit = defineEmits<{
  "update:visible": [visible: boolean];
  apply: [binding: ChartBinding];
}>();

const { t, te, locale } = useI18n();

// The chart's setup is reactive and plain JSON
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// The draft; nothing changes on the chart until Apply
const draft = ref<ChartBinding>(normalizeChartBinding(undefined));
// The preview's chart (set once real numbers are there)
const shownPreview = shallowRef<EChartsCoreOption | null>(null);
const info = computed(() => chartTypeInfo(draft.value.chartType));

const sources = ref<DataSourceSummary[]>([]);
const projectId = ref("");
const sourceId = ref("");
const schema = ref<DataSourceSchema | null>(null);
const facets = ref<SourceFacets | null>(null);
const loadError = ref(false);
// Waiting for the project's tables, or for the chosen table's fields
const sourcesLoading = computed(() => !!projectId.value && !sources.value.length && !loadError.value);
const schemaLoading = computed(() => !!sourceId.value && !schema.value && !loadError.value);
// The chart skeleton's bars (% of its height)
const SKELETON_BARS = [45, 70, 55, 85, 40, 65, 75];

// The report's projects, plus the chart's own if it was removed from the list
const projectOptions = computed<ReportProject[]>(() => {
  const list = [...props.projects];
  const own = props.binding;
  if (own?.projectId && !list.some((p) => p.id === own.projectId)) {
    list.push({ id: own.projectId, name: own.projectName ?? own.projectId });
  }
  return list;
});
const projectName = computed(
  () => projectOptions.value.find((p) => p.id === projectId.value)?.name ?? projectId.value,
);

// Another source than the chart shows: Apply replaces its data
const replacedSource = computed(() => {
  const current = props.binding;
  return current?.sourceId &&
    sourceId.value &&
    (sourceId.value !== current.sourceId || projectId.value !== current.projectId)
    ? (current.sourceName ?? current.sourceId)
    : "";
});

// ── Columns by what they can be used for ──
// An entity with a CDP dashboard: only the fields the CDP app's chart builder
// offers for it, in its order and with its names (chartFieldLists); any other
// entity: the source's columns
const cdpFields = computed(() =>
  schema.value ? chartFieldLists(schema.value, (key, fallback) => (te(key) ? t(key) : fallback)) : null,
);
const columns = computed<DataColumn[]>(() => {
  const lists = cdpFields.value;
  if (!lists) return schema.value?.columns ?? [];
  const all = [...lists.groupable, ...lists.measurable, ...lists.filterable];
  return all.filter((c, i) => all.findIndex((o) => o.key === c.key) === i);
});
const numberColumns = computed(() =>
  cdpFields.value ? cdpFields.value.measurable : columns.value.filter((c) => c.type === "number" || c.type === "currency"),
);
const groupColumns = computed(() => cdpFields.value?.groupable ?? columns.value);
const textColumns = computed(() => groupColumns.value.filter((c) => c.type === "text"));
const dimensionColumns = computed(() => groupColumns.value.filter((c) => info.value.dimensionTypes.includes(c.type)));
// Split By: the CDP list's groupable fields (other sources: text columns), never the categories' own field
const splitAllowed = computed(() => (cdpFields.value ? cdpFields.value.groupable : textColumns.value));
const splitColumns = computed(() => splitAllowed.value.filter((c) => c.key !== draft.value.dimension?.column));
// The chart's filters: the CDP list's fields (a path into a linked record is typed words)
const filterColumns = computed(() => cdpFields.value?.filterable ?? columns.value);
const filterFacets = computed<SourceFacets | null>(() => {
  if (!facets.value) return null;
  const extra = filterColumns.value.filter((c) => c.key.includes(".") && !facets.value![c.key]);
  return extra.length ? { ...facets.value, ...Object.fromEntries(extra.map((c) => [c.key, { kind: "text" as const }])) } : facets.value;
});

// Good columns to group by come first: dates for charts over time, then text
// columns with the fewest different values (a column like an order number,
// different on every row, comes last); links to other records never
function byGroupingFit(list: DataColumn[], preferred?: DataColumn["type"]): DataColumn[] {
  // The CDP app takes the first field of its list
  if (cdpFields.value) return list;
  const { good, free } = groupingColumns(list);
  const spread = (c: DataColumn) => {
    const facet = facets.value?.[c.key];
    const n = facet?.kind === "values" ? facet.values.length : facet?.kind === "boolean" ? 2 : Number.MAX_SAFE_INTEGER;
    const unique = facet?.kind === "values" && facet.values.every((v) => v.count === 1);
    return unique || n < 2 ? Number.MAX_SAFE_INTEGER : n;
  };
  const sorted = (cols: DataColumn[]) =>
    [...cols].sort((a, b) => {
      if (preferred && (a.type === preferred) !== (b.type === preferred)) return a.type === preferred ? -1 : 1;
      return spread(a) - spread(b);
    });
  return [...sorted(good), ...sorted(free)];
}

const toDimension = (c: DataColumn): ChartDimension => ({
  column: c.key,
  label: c.label,
  type: c.type,
  ...(c.type === "date" ? { granularity: DEFAULT_GRANULARITY } : {}),
  ...(c.choices?.length ? { choices: c.choices } : {}),
  ...(c.yesNo ? { yesNo: true } : {}),
});

// A grouping of the chart with its column's choice words and yes / no as the source has them now
function withColumnWords(dimension: ChartDimension | undefined): ChartDimension | undefined {
  const c = dimension && columns.value.find((col) => col.key === dimension.column);
  if (!dimension || !c) return dimension;
  const { choices: _choices, yesNo: _yesNo, ...rest } = dimension;
  return { ...rest, ...(c.choices?.length ? { choices: c.choices } : {}), ...(c.yesNo ? { yesNo: true } : {}) };
}
const toMeasure = (aggregation: ChartAggregation, c?: DataColumn): ChartMeasure =>
  aggregation === "count" || !c ? { aggregation: "count" } : { aggregation, column: c.key, columnLabel: c.label };

// What the chart's type needs and doesn't have yet, picked from the source
// (a dropped column first)
function fillMissing() {
  const d = draft.value;
  const dropped = columns.value.find((c) => c.key === props.initialColumnKey);
  const isNumber = (c?: DataColumn) => c?.type === "number" || c?.type === "currency";
  const allowed = dimensionColumns.value;
  if (!d.dimension || !allowed.some((c) => c.key === d.dimension!.column)) {
    const pick =
      (dropped && allowed.includes(dropped) ? dropped : undefined) ??
      byGroupingFit(allowed, info.value.dimensionTypes[0])[0];
    d.dimension = pick ? toDimension(pick) : undefined;
  }
  // Only what this chart may use: a number that can't be added up becomes a
  // count, a split by a column it can't group by goes, filters on fields it
  // doesn't offer go
  const usable = (m?: ChartMeasure) =>
    !m || m.aggregation === "count" || numberColumns.value.some((c) => c.key === m.column) ? m : toMeasure("count");
  d.measure = usable(d.measure);
  d.series = d.series?.map((s) => ({
    ...s,
    measure: usable(s.measure)!,
    ...(s.splitBy && !splitAllowed.value.some((c) => c.key === s.splitBy!.column) ? { splitBy: undefined } : {}),
  }));
  d.filters = (d.filters ?? []).filter((f) => filterColumns.value.some((c) => c.key === f.column));
  const usableDropped = dropped && isNumber(dropped) && numberColumns.value.includes(dropped) ? dropped : undefined;
  const measure = d.measure ?? d.series?.[0]?.measure ?? toMeasure(usableDropped ? "sum" : "count", usableDropped);
  if (info.value.shape === "series") {
    if (!d.series?.length) d.series = [{ measure }];
  } else if (!d.measure) {
    d.measure = measure;
  }
  if (info.value.shape === "tree" && (!d.level2 || d.level2.column === d.dimension?.column)) {
    const pick = byGroupingFit(dimensionColumns.value).find((c) => c.key !== d.dimension?.column);
    d.level2 = pick ? toDimension(pick) : undefined;
  }
}

// ── Chart type (the dropdown) ──

// Another type starts afresh with the type's defaults, as the CDP app's
// changeWidgetType (buildDefaultQuery): the first field of the list, Number
// of records, one line / bar, Auto gauge range, no filters or own colours;
// the title and description stay
function pickType(type: ChartType) {
  if (type === draft.value.chartType) return;
  draft.value = {
    ...draft.value,
    chartType: type,
    measure: undefined,
    dimension: undefined,
    level2: undefined,
    series: undefined,
    stacked: undefined,
    gaugeMin: undefined,
    gaugeMax: undefined,
    filters: [],
    colors: undefined,
  };
  gaugeManual.value = false;
  openColors.value = new Set();
  if (schema.value) fillMissing();
}

// The categories' label (the CDP app's slot labels)
const dimensionSlot = computed(() => {
  const type = draft.value.chartType;
  return type === "bar" || type === "line" || type === "area" ? "xAxis" : type === "barH" ? "categoryAxis" : "category";
});
// What one card of a series chart is called ("Bar 1", "Add line")
const blockTerm = computed(() => (draft.value.chartType === "line" ? "line" : draft.value.chartType === "area" ? "area" : "bar"));
const isBarType = computed(() => draft.value.chartType === "bar" || draft.value.chartType === "barH");

function setDimension(slot: "dimension" | "level2", key: string) {
  const c = columns.value.find((col) => col.key === key);
  if (c) draft.value[slot] = toDimension(c);
}

function setGranularity(granularity: DateGranularity) {
  if (draft.value.dimension) draft.value.dimension = { ...draft.value.dimension, granularity };
}

// ── Lines / bars / areas (BlockList) ──
function setSeriesMeasure(index: number, measure: ChartMeasure) {
  draft.value.series![index] = { ...draft.value.series![index]!, measure };
}

function setSplit(index: number, key: string) {
  const series = draft.value.series![index]!;
  const c = columns.value.find((col) => col.key === key);
  const { splitBy: _old, ...rest } = series;
  // Split bars are Stacked at first, as the CDP app's (its Layout default)
  if (c && !series.splitBy && isBarType.value && !draft.value.series!.some((s) => s.splitBy)) draft.value.stacked = true;
  draft.value.series![index] = c ? { ...rest, splitBy: toDimension(c) } : rest;
}

function setRenderAs(index: number, value: string) {
  const { renderAs: _old, ...rest } = draft.value.series![index]!;
  draft.value.series![index] = value === "line" ? { ...rest, renderAs: "line" } : rest;
}

// A new card counts records; on horizontal bars it is shown as a line (as the CDP app)
function addSeries() {
  const series = draft.value.series ?? [];
  draft.value.series = [
    ...series,
    { measure: { aggregation: "count" }, ...(draft.value.chartType === "barH" ? { renderAs: "line" as const } : {}) },
  ];
}

function removeSeries(index: number) {
  draft.value.series = draft.value.series?.filter((_s, i) => i !== index);
  openColors.value = new Set();
}

// ── Gauge range (GaugeRangeField) ──
const gaugeManual = ref(false);
const autoRange = computed(() => {
  const view = previewView.value;
  return autoGaugeRange(view.state === "ready" && view.data.kind === "value" ? view.data.value : null);
});

// Manual starts from the Auto range; Auto clears it
function setGaugeMode(manual: boolean) {
  gaugeManual.value = manual;
  if (manual) {
    draft.value.gaugeMin ??= autoRange.value.min;
    draft.value.gaugeMax ??= autoRange.value.max;
  } else {
    draft.value.gaugeMin = undefined;
    draft.value.gaugeMax = undefined;
  }
}

function setGaugeEnd(end: "gaugeMin" | "gaugeMax", value: string) {
  const n = value === "" ? NaN : Number(value);
  draft.value[end] = Number.isFinite(n) ? n : undefined;
}

// ── Customize colors (ColorSwatchPanel) ──
interface ColorRow {
  key: string;
  label: string;
  color: string;
}
const openColors = ref<Set<string>>(new Set());
function toggleColors(id: string) {
  const next = new Set(openColors.value);
  if (!next.delete(id)) next.add(id);
  openColors.value = next;
}

// What the preview draws now, by colour key (the user's own colours included)
const liveColors = computed(() => {
  const view = previewView.value;
  return view.state === "ready" ? chartColorItems(view.binding, view.data) : [];
});
const colorRow = (key: string, label: string, start?: string): ColorRow => ({
  key,
  label,
  color: draft.value.colors?.[key] ?? liveColors.value.find((c) => c.key === key)?.color ?? start ?? chartColors(draft.value.palette, 1)[0]!,
});
// A field's values with their CDP colours, else the values the chart draws now
function valueRows(dimension: ChartDimension | undefined, keyOf: (value: string) => string, belongs: (key: string) => boolean): ColorRow[] {
  if (dimension?.choices?.length) return dimension.choices.map((c) => colorRow(keyOf(c.value), c.label || c.value, c.color));
  return liveColors.value.filter((c) => belongs(c.key)).map((c) => colorRow(c.key, c.name));
}

// One card's colours: its split's values, else its one colour (keys as chartQuery's seriesKey)
function blockColorRows(index: number): ColorRow[] {
  const series = draft.value.series?.[index];
  if (!series) return [];
  const several = (draft.value.series?.length ?? 0) > 1;
  const own = `series${index + 1}`;
  if (!series.splitBy) return [colorRow(own, measureLabel(series.measure))];
  return valueRows(
    series.splitBy,
    (value) => (several ? `${own}:${value}` : value),
    (key) => (several ? key.startsWith(`${own}:`) : true),
  );
}

// KPI: its number; pie / donut: the categories' values
const topColorRows = computed<ColorRow[]>(() => {
  if (draft.value.chartType === "kpi") return [colorRow(KPI_COLOR_KEY, t("chart.panel.numberColor"))];
  return valueRows(draft.value.dimension, (value) => value, () => true);
});

function setColor(key: string, color: string) {
  draft.value.colors = { ...draft.value.colors, [key]: color };
}

function resetColors(rows: ColorRow[]) {
  const colors = { ...draft.value.colors };
  rows.forEach((row) => delete colors[row.key]);
  draft.value.colors = Object.keys(colors).length ? colors : undefined;
}

// ── Loading the project's sources and the chosen source ──
function loadSources(project: string) {
  sources.value = [];
  if (!project) return;
  fetchSources(project)
    .then((list) => {
      if (projectId.value === project) sources.value = list;
    })
    .catch(() => (loadError.value = true));
}

async function useSource(id: string, fresh: boolean) {
  loadError.value = false;
  facets.value = null;
  const project = projectId.value;
  const stillCurrent = () => projectId.value === project && sourceId.value === id;
  try {
    const loaded = await fetchSchema(project, id);
    if (!stillCurrent()) return;
    schema.value = loaded;
    if (fresh) {
      // Another source: what to show is picked again from its columns
      const d = draft.value;
      d.measure = undefined;
      d.dimension = undefined;
      d.level2 = undefined;
      d.series = undefined;
      d.filters = [];
      // Own colours were for the other source's values
      d.colors = undefined;
    }
    if (!fresh) {
      // The chart's own groupings: their columns' words as the source has them now
      const d = draft.value;
      d.dimension = withColumnWords(d.dimension);
      d.level2 = withColumnWords(d.level2);
      d.series = d.series?.map((s) => (s.splitBy ? { ...s, splitBy: withColumnWords(s.splitBy) } : s));
    }
    // The filter choices also tell which columns group well
    try {
      const loadedFacets = await fetchFacets(project, id);
      if (!stillCurrent()) return;
      facets.value = loadedFacets;
    } catch {
      if (stillCurrent()) facets.value = {};
    }
    fillMissing();
  } catch {
    if (stillCurrent()) loadError.value = true;
  }
}

function changeProject(id: string) {
  projectId.value = id;
  sourceId.value = "";
  schema.value = null;
  loadError.value = false;
  loadSources(id);
}

function changeSource(id: string) {
  sourceId.value = id;
  schema.value = null;
  useSource(id, true);
}

// Fill the draft each time the popup opens
watch(
  () => props.visible,
  async (open) => {
    if (!open) return;
    const current = normalizeChartBinding(props.binding ? copy(props.binding) : undefined);
    draft.value = current;
    openColors.value = new Set();
    gaugeManual.value = current.gaugeMin !== undefined || current.gaugeMax !== undefined;
    shownPreview.value = null;
    schema.value = null;
    loadError.value = false;
    // A dropped source, the chart's own, or the only project there is
    const project =
      props.initialProjectId ??
      current.projectId ??
      (projectOptions.value.length === 1 ? projectOptions.value[0]!.id : "");
    const id = props.initialSourceId ?? (project === current.projectId ? current.sourceId : "") ?? "";
    projectId.value = project;
    sourceId.value = id ?? "";
    loadSources(project);
    if (project && id) await useSource(id, id !== current.sourceId || project !== current.projectId);
  },
  { immediate: true },
);

// ── The setup as it would be applied, and its preview ──
const draftBinding = computed<ChartBinding>(() => {
  const binding = normalizeChartBinding({
    ...copy(draft.value),
    projectId: projectId.value || undefined,
    projectName: projectName.value || undefined,
    sourceId: schema.value ? sourceId.value : undefined,
    sourceName: schema.value ? cdpTableName(schema.value.entityName ?? sourceId.value, schema.value.name) : undefined,
    entityName: schema.value?.entityName,
  });
  // A chart set up for the first time without a title gets the CDP app's
  // suggested one ("Records by Planned Inspection Date"), changed in Basic Settings
  if (!props.binding?.sourceId && !binding.title && isChartComplete(binding)) {
    binding.title = suggestChartTitle(binding);
  }
  return binding;
});

// The preview's numbers, asked for shortly after the setup stops changing (a
// copy, so editing the draft doesn't skip the pause)
const previewBinding = shallowRef<ChartBinding | undefined>();
let previewTimer: ReturnType<typeof setTimeout> | undefined;
// The pause before asking is part of the wait (the loaders show through it)
const previewPending = ref(false);
watch(
  () => (props.visible && isChartComplete(draftBinding.value) ? JSON.stringify(draftBinding.value) : ""),
  (key) => {
    clearTimeout(previewTimer);
    previewPending.value = !!key;
    if (!key) previewBinding.value = undefined;
    else
      previewTimer = setTimeout(() => {
        previewPending.value = false;
        previewBinding.value = JSON.parse(key) as ChartBinding;
      }, 250);
  },
  { immediate: true },
);
useChartData(previewBinding);

// More than this many categories is hard to read on paper
const MANY_CATEGORIES = 15;
const categoryCount = computed(() => {
  const view = previewView.value;
  if (view.state !== "ready") return 0;
  const data = view.data;
  return data.kind === "parts" || data.kind === "series" ? data.categories.length : data.kind === "tree" ? data.nodes.length : 0;
});

const previewView = computed(() => {
  void locale.value;
  return chartView(draftBinding.value);
});
const chartSize = computed(() => ({
  width: Math.max(40, Math.round(props.chartSize.width)),
  height: Math.max(30, Math.round(props.chartSize.height)),
}));
// The chart with real numbers; while new ones load, the last one stays
watch(
  () => [previewView.value, chartSize.value] as const,
  ([view, size]) => {
    if (view.state === "ready") {
      shownPreview.value = buildChartOption(view.binding, view.data, { ...size, fontFamily: chartFontFamily() });
    } else if (view.state !== "loading") {
      shownPreview.value = null;
    }
  },
  { immediate: true },
);
// Sized to fill the preview area (the chart is vector, so it stays sharp)
const STAGE = { width: 520, height: 380 };
const MAX_PREVIEW_SCALE = 1.75;
const previewScale = computed(() =>
  Math.min(MAX_PREVIEW_SCALE, STAGE.width / chartSize.value.width, STAGE.height / chartSize.value.height),
);

// Rows the filters keep, from the chart's numbers
const matchCount = computed(() => {
  const entry = chartDataEntry(draftBinding.value);
  return entry?.status === "ready" ? (entry.results?.[0]?.totalCount ?? null) : null;
});

// Fields or numbers on their way: Apply shows its loader and the preview a
// "Loading data…" pill over the last chart
const fetching = computed(() => schemaLoading.value || previewPending.value || previewView.value.state === "loading");

const applyBlockedReason = computed(() => {
  if (!schema.value) return t("dataTable.config.pickSourceFirst");
  if (!isChartComplete(draftBinding.value)) return t("chart.config.incomplete");
  return "";
});

function apply() {
  if (applyBlockedReason.value || fetching.value) return;
  emit("apply", draftBinding.value);
  emit("update:visible", false);
}
</script>

<style scoped>
.ccm-skeleton {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.ccm-chart-skeleton {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: min(480px, 90%);
  height: 280px;
  padding: 16px;
  border-radius: 8px;
  background: #ffffff;
}

.ccm-chart-skeleton-bars {
  display: flex;
  flex: 1;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  border-bottom: 1px solid #e6e5ee;
}

.ccm {
  display: grid;
  grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
  gap: 20px;
  height: min(68vh, 640px);
}

/* The CDP app's widget panel: labels in small capitals, 16px between fields */
.ccm-settings {
  overflow-y: auto;
  padding: 2px 8px 2px 2px;
}

/* The chosen chart type's icon inside its dropdown */
.ccm-select-wrap.has-icon .ccm-select {
  padding-left: 34px;
}

.ccm-select-icon {
  position: absolute;
  top: 50%;
  left: 11px;
  transform: translateY(-50%);
  color: #6440f4;
  pointer-events: none;
}

.ccm-field {
  margin-bottom: 16px;
}

.ccm-label {
  display: block;
  margin-bottom: 8px;
  color: #6f6a7e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.ccm-label.is-next {
  margin-top: 14px;
}

.ccm-optional {
  font-weight: 600;
  text-transform: none;
}

.ccm-input,
.ccm-select,
.ccm-textarea {
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 13px;
  box-sizing: border-box;
}

.ccm-textarea {
  height: auto;
  min-height: 72px;
  padding: 8px 10px;
  resize: vertical;
  font-family: inherit;
}

.ccm-input::placeholder,
.ccm-textarea::placeholder {
  color: #8a84a3;
}

.ccm-input:focus,
.ccm-select:focus,
.ccm-textarea:focus {
  outline: none;
  border-color: #6440f4;
  box-shadow: 0 0 0 1px #6440f4;
}

.ccm-select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 32px;
  cursor: pointer;
}

.ccm-select-wrap {
  position: relative;
  min-width: 0;
}

.ccm-chevron {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  color: #8a84a3;
  pointer-events: none;
}

.ccm-range-auto {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 8px 12px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #f8f7fc;
  color: #6f6a7e;
  font-size: 12.5px;
}

.ccm-range-manual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

.ccm-range-manual span {
  display: block;
  margin-bottom: 6px;
  color: #6f6a7e;
  font-size: 11px;
  font-weight: 600;
}

/* One line / bar / area (BlockCard) */
.ccm-block {
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid #e6e5ee;
  border-radius: 12px;
  background: #f8f7fc;
}

.ccm-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  margin-bottom: 10px;
  color: #6f6a7e;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.ccm-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #45425a;
  cursor: pointer;
}

.ccm-icon-box:hover {
  border-color: #fca5a5;
  color: #dc2626;
}

.ccm-colors {
  margin-top: 12px;
}

.ccm-link {
  padding: 0;
  border: none;
  background: none;
  color: #6440f4;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.ccm-colors .ccm-link + *,
.ccm-field > .ccm-link + * {
  margin-top: 8px;
}

.ccm-dashed {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  border: 1px dashed #d8d5e3;
  border-radius: 12px;
  background: none;
  color: #6f6a7e;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.ccm-dashed:hover {
  border-color: #6440f4;
  color: #6440f4;
}

.ccm-check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.ccm-check input {
  accent-color: #6440f4;
}

/* One box per part: data, chart, filters, title */
.ccm-box {
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(28, 27, 38, 0.04);
}

.ccm-box:last-child {
  margin-bottom: 2px;
}

/* The box's padding ends it, not its last field's gap */
.ccm-box > :last-child {
  margin-bottom: 0;
}

.ccm-preview h4 {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.ccm-muted {
  flex-shrink: 0;
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
}

.ccm-hint,
.ccm-error {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: #6b7280;
}

.ccm-error {
  color: #dc2626;
}

.ccm-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0 0 16px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fffbeb;
  color: #92400e;
  font-size: 12px;
  line-height: 1.4;
}

.ccm-preview .ccm-note {
  margin: 8px 0 0;
}

.ccm-note svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.ccm-preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.ccm-preview-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.ccm-stage {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 16px;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background: #f5f6f8;
}

/* The chart on a piece of paper, as it prints */
.ccm-paper {
  overflow: hidden;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
}

.ccm-stage-note {
  max-width: 280px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
  text-align: center;
}

.ccm-footer-hint {
  margin-right: auto;
  font-size: 12px;
  color: #6b7280;
}

/* Fetching while the last result is still shown: a pill over it */
.ccm-fetching {
  position: absolute;
  top: 10px;
  left: 50%;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid #e6e5ee;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgba(28, 27, 38, 0.12);
  color: #45425a;
  font-size: 12px;
  font-weight: 500;
  transform: translateX(-50%);
  pointer-events: none;
}

.ccm-fetching svg {
  color: #6440f4;
  animation: ccm-spin 0.9s linear infinite;
}

@keyframes ccm-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ccm-fetching svg {
    animation: none;
  }
}
</style>
