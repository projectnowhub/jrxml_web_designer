<template>
  <BaseModal
    :visible="visible"
    :title="t('chart.config.title')"
    :content-style="{ width: 'min(1060px, 96vw)', maxWidth: '96vw' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="ccm">
      <!-- Settings -->
      <div class="ccm-settings">
        <section class="ccm-section">
          <h4><ChartColumn :size="14" aria-hidden="true" />{{ t("chart.type") }}</h4>
          <div class="ccm-select-wrap">
            <select class="ccm-select" :value="draft.chartType" @change="setType(($event.target as HTMLSelectElement).value as ChartType)">
              <optgroup v-for="group in CHART_GROUPS" :key="group" :label="t(`chart.groups.${group}`)">
                <option v-for="c in chartTypesInGroup(group)" :key="c.type" :value="c.type">{{ t(`chart.types.${c.type}`) }}</option>
              </optgroup>
            </select>
            <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
          </div>
        </section>

        <!-- Project, then one of its sources -->
        <section class="ccm-section">
          <h4><FolderKanban :size="14" aria-hidden="true" />{{ t("dataTable.config.project") }}</h4>
          <p v-if="!projectOptions.length" class="ccm-hint">{{ t("dataTable.config.noProjects") }}</p>
          <div v-else class="ccm-select-wrap">
            <select class="ccm-select" :value="projectId" @change="changeProject(($event.target as HTMLSelectElement).value)">
              <option value="" disabled>{{ t("dataTable.config.chooseProject") }}</option>
              <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
          </div>
          <template v-if="projectId">
            <span class="ccm-label">{{ t("dataTable.config.source") }}</span>
            <div class="ccm-select-wrap">
              <select class="ccm-select" :value="sourceId" @change="changeSource(($event.target as HTMLSelectElement).value)">
                <option value="" disabled>{{ t("dataTable.config.chooseSource") }}</option>
                <option v-for="s in sources" :key="s.id" :value="s.id">
                  {{ t("dataTable.config.sourceOption", { name: s.name, count: s.rowCount }) }}
                </option>
              </select>
              <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
            </div>
          </template>
          <p v-if="loadError" class="ccm-error">{{ t("dataTable.loadFailed") }}</p>
          <p v-else-if="replacedSource" class="ccm-note">
            <Replace :size="13" aria-hidden="true" />
            {{ t("chart.config.replacesData", { source: replacedSource }) }}
          </p>
        </section>

        <template v-if="schema">
          <!-- What the chart shows -->
          <section class="ccm-section">
            <h4><Sigma :size="14" aria-hidden="true" />{{ t("chart.config.whatToShow") }}</h4>

            <!-- Categories (bars, slices, points over time) or the tree map's groups -->
            <template v-if="info.shape !== 'value'">
              <span class="ccm-label">{{ t(info.shape === "tree" ? "chart.config.groups" : info.dimensionTypes.length === 1 && info.dimensionTypes[0] === "date" ? "chart.config.overTime" : "chart.config.categories") }}</span>
              <div class="ccm-row">
                <div class="ccm-select-wrap">
                  <select class="ccm-select" :value="draft.dimension?.column ?? ''" @change="setDimension('dimension', ($event.target as HTMLSelectElement).value)">
                    <option value="" disabled>{{ t("chart.config.chooseColumn") }}</option>
                    <option v-for="c in dimensionColumns" :key="c.key" :value="c.key">{{ c.label }}</option>
                  </select>
                  <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
                </div>
                <div v-if="draft.dimension?.type === 'date'" class="ccm-select-wrap is-small">
                  <select
                    class="ccm-select"
                    :value="draft.dimension.granularity"
                    :aria-label="t('chart.config.groupDatesBy')"
                    @change="setGranularity(($event.target as HTMLSelectElement).value as DateGranularity)"
                  >
                    <option v-for="g in DATE_GRANULARITIES" :key="g" :value="g">{{ t(`chart.granularities.${g}`) }}</option>
                  </select>
                  <ChevronDown class="ccm-chevron" :size="12" aria-hidden="true" />
                </div>
              </div>
              <p v-if="!dimensionColumns.length" class="ccm-hint">
                {{ t(info.dimensionTypes.includes("text") ? "chart.config.noTextColumns" : "chart.config.noDateColumns") }}
              </p>
            </template>

            <!-- Tree map: the items inside each group -->
            <template v-if="info.shape === 'tree'">
              <span class="ccm-label">{{ t("chart.config.items") }}</span>
              <div class="ccm-select-wrap">
                <select class="ccm-select" :value="draft.level2?.column ?? ''" @change="setDimension('level2', ($event.target as HTMLSelectElement).value)">
                  <option value="" disabled>{{ t("chart.config.chooseColumn") }}</option>
                  <option v-for="c in textColumns" :key="c.key" :value="c.key" :disabled="c.key === draft.dimension?.column">{{ c.label }}</option>
                </select>
                <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
              </div>
            </template>

            <!-- The number: one, or one per line / set of bars -->
            <span class="ccm-label">{{ t(info.shape === "series" ? "chart.config.series" : "chart.config.value") }}</span>
            <div v-for="row in measureRows" :key="row.id" class="ccm-measure">
              <div class="ccm-row">
                <div class="ccm-select-wrap">
                  <select
                    class="ccm-select"
                    :value="row.measure.aggregation"
                    :aria-label="t('chart.config.calculation')"
                    @change="setAggregation(row, ($event.target as HTMLSelectElement).value as ChartAggregation)"
                  >
                    <option v-for="a in CHART_AGGREGATIONS" :key="a" :value="a" :disabled="a !== 'count' && !numberColumns.length">
                      {{ t(`chart.aggregations.${a}`) }}
                    </option>
                  </select>
                  <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
                </div>
                <div v-if="row.measure.aggregation !== 'count'" class="ccm-select-wrap">
                  <select
                    class="ccm-select"
                    :value="row.measure.column ?? ''"
                    :aria-label="t('chart.config.ofColumn')"
                    @change="setMeasureColumn(row, ($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="c in numberColumns" :key="c.key" :value="c.key">{{ c.label }}</option>
                  </select>
                  <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
                </div>
                <button
                  v-if="row.removable"
                  type="button"
                  class="ccm-icon-btn danger"
                  :title="t('chart.config.removeSeries')"
                  @click="removeSeries(row.index)"
                >
                  <X :size="14" />
                </button>
              </div>
              <!-- A line or set of bars per value of a column -->
              <div v-if="info.shape === 'series'" class="ccm-row ccm-split">
                <span class="ccm-muted">{{ t("chart.config.splitBy") }}</span>
                <div class="ccm-select-wrap">
                  <select class="ccm-select" :value="row.splitBy?.column ?? ''" @change="setSplit(row.index, ($event.target as HTMLSelectElement).value)">
                    <option value="">{{ t("chart.config.noSplit") }}</option>
                    <option v-for="c in textColumns" :key="c.key" :value="c.key" :disabled="c.key === draft.dimension?.column">{{ c.label }}</option>
                  </select>
                  <ChevronDown class="ccm-chevron" :size="14" aria-hidden="true" />
                </div>
              </div>
            </div>
            <button
              v-if="info.shape === 'series' && (draft.series?.length ?? 0) < MAX_CHART_SERIES"
              type="button"
              class="ccm-add"
              @click="addSeries"
            >
              <Plus :size="13" aria-hidden="true" />{{ t("chart.config.addSeries") }}
            </button>

            <!-- Gauge scale -->
            <label v-if="draft.chartType === 'gauge'" class="ccm-inline">
              <span class="ccm-label">{{ t("chart.config.gaugeMax") }}</span>
              <input
                class="ccm-input is-narrow"
                type="number"
                min="0"
                :value="draft.gaugeMax ?? ''"
                :placeholder="t('chart.config.automatic')"
                @change="setGaugeMax(($event.target as HTMLInputElement).value)"
              />
            </label>

            <label v-if="canStack" class="ccm-check">
              <input type="checkbox" :checked="!!draft.stacked" @change="draft.stacked = ($event.target as HTMLInputElement).checked || undefined" />
              {{ t(draft.chartType === "area" ? "chart.config.stackAreas" : "chart.config.stackBars") }}
            </label>

            <label v-if="hasCategoryLimit" class="ccm-inline">
              <span class="ccm-label">{{ t("chart.config.show") }}</span>
              <div class="ccm-select-wrap is-small">
                <select class="ccm-select" :value="draft.limit ?? DEFAULT_CATEGORY_LIMIT" @change="draft.limit = Number(($event.target as HTMLSelectElement).value)">
                  <option v-for="n in CATEGORY_LIMITS" :key="n" :value="n">
                    {{ n ? t("chart.config.largest", { count: n }) : t("chart.config.all") }}
                  </option>
                </select>
                <ChevronDown class="ccm-chevron" :size="12" aria-hidden="true" />
              </div>
            </label>
          </section>

          <!-- Which rows count -->
          <section class="ccm-section">
            <h4><SlidersHorizontal :size="14" aria-hidden="true" />{{ t("chart.config.filters") }}</h4>
            <TableFilterPanel
              :columns="schema.columns"
              :facets="facets"
              :filters="draft.filters ?? []"
              :show-sort="false"
              :match-count="matchCount"
              @update:filters="draft.filters = $event"
            />
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
        <div class="ccm-stage">
          <div
            v-if="shownPreview"
            class="ccm-paper"
            :style="{ width: `${chartSize.width * previewScale}px`, height: `${chartSize.height * previewScale}px` }"
          >
            <div :style="{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }">
              <ChartCanvas :option="shownPreview" :width="chartSize.width" :height="chartSize.height" />
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
      <n-button type="primary" :disabled="!!applyBlockedReason" @click="apply">
        {{ t("dataTable.config.apply") }}
      </n-button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";
import type { EChartsCoreOption } from "echarts/core";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import { ChartColumn, ChevronDown, FolderKanban, Plus, Replace, Sigma, SlidersHorizontal, X } from "@lucide/vue";
import BaseModal from "./BaseModal.vue";
import ChartCanvas from "../common/ChartCanvas.vue";
import TableFilterPanel from "../designer/TableFilterPanel.vue";
import { getFacets, getSchema, listSources } from "@/services/dataSourceService";
import {
  CATEGORY_LIMITS,
  CHART_AGGREGATIONS,
  CHART_GROUPS,
  DATE_GRANULARITIES,
  DEFAULT_CATEGORY_LIMIT,
  DEFAULT_GRANULARITY,
  MAX_CHART_SERIES,
  changeChartType,
  chartTypeInfo,
  chartTypesInGroup,
  isChartComplete,
  normalizeChartBinding,
} from "@/utils/chart/chartTypes";
import { chartView } from "@/utils/chart/chartImage";
import { buildChartOption, chartFontFamily } from "@/utils/chart/chartOption";
import { chartDataEntry, loadChartData } from "@/utils/chart/chartDataStore";
import type {
  ChartAggregation,
  ChartBinding,
  ChartDimension,
  ChartMeasure,
  ChartSeriesBinding,
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

const { t, locale } = useI18n();

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
const columns = computed(() => schema.value?.columns ?? []);
const numberColumns = computed(() => columns.value.filter((c) => c.type === "number" || c.type === "currency"));
const textColumns = computed(() => columns.value.filter((c) => c.type === "text"));
const dimensionColumns = computed(() => columns.value.filter((c) => info.value.dimensionTypes.includes(c.type)));

// Good columns to group by come first: dates for charts over time, then text
// columns with the fewest different values (a column like an order number,
// different on every row, comes last)
function byGroupingFit(list: DataColumn[], preferred?: DataColumn["type"]): DataColumn[] {
  const spread = (c: DataColumn) => {
    const facet = facets.value?.[c.key];
    const n = facet?.kind === "values" ? facet.values.length : Number.MAX_SAFE_INTEGER;
    const unique = facet?.kind === "values" && facet.values.every((v) => v.count === 1);
    return unique || n < 2 ? Number.MAX_SAFE_INTEGER : n;
  };
  return [...list].sort((a, b) => {
    if (preferred && (a.type === preferred) !== (b.type === preferred)) return a.type === preferred ? -1 : 1;
    return spread(a) - spread(b);
  });
}

const toDimension = (c: DataColumn): ChartDimension => ({
  column: c.key,
  label: c.label,
  type: c.type,
  ...(c.type === "date" ? { granularity: DEFAULT_GRANULARITY } : {}),
});
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
  const measure = d.measure ?? d.series?.[0]?.measure ?? toMeasure(isNumber(dropped) ? "sum" : "count", dropped);
  if (info.value.shape === "series") {
    if (!d.series?.length) d.series = [{ measure }];
  } else if (!d.measure) {
    d.measure = measure;
  }
  if (info.value.shape === "tree" && (!d.level2 || d.level2.column === d.dimension?.column)) {
    const pick = byGroupingFit(textColumns.value).find((c) => c.key !== d.dimension?.column);
    d.level2 = pick ? toDimension(pick) : undefined;
  }
}

function setType(type: ChartType) {
  draft.value = changeChartType(draft.value, type);
  if (schema.value) fillMissing();
}

function setDimension(slot: "dimension" | "level2", key: string) {
  const c = columns.value.find((col) => col.key === key);
  if (c) draft.value[slot] = toDimension(c);
}

function setGranularity(granularity: DateGranularity) {
  if (draft.value.dimension) draft.value.dimension = { ...draft.value.dimension, granularity };
}

// ── The number(s) ──
interface MeasureRow {
  id: string;
  index: number;
  measure: ChartMeasure;
  splitBy?: ChartDimension;
  removable: boolean;
}
const measureRows = computed<MeasureRow[]>(() => {
  const d = draft.value;
  if (info.value.shape === "series") {
    return (d.series ?? []).map((s, i) => ({
      id: `s${i}`,
      index: i,
      measure: s.measure,
      splitBy: s.splitBy,
      removable: (d.series?.length ?? 0) > 1,
    }));
  }
  return d.measure ? [{ id: "m", index: -1, measure: d.measure, removable: false }] : [];
});

function putMeasure(row: MeasureRow, measure: ChartMeasure) {
  if (row.index < 0) draft.value.measure = measure;
  else draft.value.series![row.index] = { ...draft.value.series![row.index]!, measure };
}

function setAggregation(row: MeasureRow, aggregation: ChartAggregation) {
  const column = numberColumns.value.find((c) => c.key === row.measure.column) ?? numberColumns.value[0];
  putMeasure(row, toMeasure(aggregation, column));
}

function setMeasureColumn(row: MeasureRow, key: string) {
  putMeasure(row, toMeasure(row.measure.aggregation, numberColumns.value.find((c) => c.key === key)));
}

function setSplit(index: number, key: string) {
  const series = draft.value.series![index]!;
  const c = columns.value.find((col) => col.key === key);
  const next: ChartSeriesBinding = { measure: series.measure };
  if (c) next.splitBy = toDimension(c);
  draft.value.series![index] = next;
}

function addSeries() {
  const series = draft.value.series ?? [];
  const used = new Set(series.map((s) => s.measure.column));
  const column = numberColumns.value.find((c) => !used.has(c.key));
  draft.value.series = [...series, { measure: toMeasure(column ? "sum" : "count", column) }];
}

function removeSeries(index: number) {
  draft.value.series = draft.value.series?.filter((_s, i) => i !== index);
}

function setGaugeMax(value: string) {
  const n = Number(value);
  draft.value.gaugeMax = value !== "" && n > 0 ? n : undefined;
}

// Stacking needs more than one line or set of bars
const canStack = computed(() => {
  const series = draft.value.series ?? [];
  return ["bar", "barH", "area"].includes(draft.value.chartType) && (series.length > 1 || series.some((s) => s.splitBy));
});
const hasCategoryLimit = computed(
  () =>
    (info.value.shape === "parts" || info.value.shape === "series" || info.value.shape === "tree") &&
    draft.value.dimension?.type === "text",
);

// ── Loading the project's sources and the chosen source ──
function loadSources(project: string) {
  sources.value = [];
  if (!project) return;
  listSources(project)
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
    const loaded = await getSchema(project, id);
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
    }
    // The filter choices also tell which columns group well
    try {
      const loadedFacets = await getFacets(project, id);
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
const draftBinding = computed<ChartBinding>(() =>
  normalizeChartBinding({
    ...copy(draft.value),
    projectId: projectId.value || undefined,
    projectName: projectName.value || undefined,
    sourceId: schema.value ? sourceId.value : undefined,
    sourceName: schema.value?.name,
    entityName: schema.value?.entityName,
  }),
);

// Fetch the preview's numbers shortly after the setup stops changing
let previewTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => (props.visible && isChartComplete(draftBinding.value) ? JSON.stringify(draftBinding.value) : ""),
  (key) => {
    clearTimeout(previewTimer);
    if (key) previewTimer = setTimeout(() => loadChartData(draftBinding.value), 250);
  },
  { immediate: true },
);

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

const applyBlockedReason = computed(() => {
  if (!schema.value) return t("dataTable.config.pickSourceFirst");
  if (!isChartComplete(draftBinding.value)) return t("chart.config.incomplete");
  return "";
});

function apply() {
  if (applyBlockedReason.value) return;
  emit("apply", draftBinding.value);
  emit("update:visible", false);
}
</script>

<style scoped>
.ccm {
  display: grid;
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  gap: 16px;
  height: min(68vh, 640px);
}

.ccm-settings {
  overflow-y: auto;
  padding-right: 6px;
}

.ccm-section {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background: #fafbfc;
}

.ccm-section h4,
.ccm-preview h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.ccm-label {
  display: block;
  margin: 10px 0 4px;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
}

.ccm-section h4 + .ccm-label,
.ccm-section h4 + .ccm-select-wrap {
  margin-top: 0;
}

.ccm-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ccm-measure + .ccm-measure {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e5e7eb;
}

.ccm-split {
  margin-top: 6px;
}

.ccm-input,
.ccm-select {
  width: 100%;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  box-sizing: border-box;
  color: #1f2937;
}

.ccm-input:focus,
.ccm-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.15);
}

.ccm-input.is-narrow {
  width: 110px;
}

.ccm-select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 26px;
  cursor: pointer;
}

.ccm-select-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.ccm-select-wrap.is-small {
  flex: 0 0 120px;
}

.ccm-chevron {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
}

.ccm-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.ccm-icon-btn.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.ccm-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 4px 8px;
  border: 1px dashed #c7cbd1;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
}

.ccm-add:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.ccm-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.ccm-inline .ccm-label {
  margin: 0;
}

.ccm-check {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  margin-top: 6px;
  font-size: 12px;
  color: #374151;
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
  margin: 8px 0 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fffbeb;
  color: #92400e;
  font-size: 12px;
  line-height: 1.4;
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
</style>
