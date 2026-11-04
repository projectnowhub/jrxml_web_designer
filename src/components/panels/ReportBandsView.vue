<template>
  <div class="rb">
    <div class="rb-header">
      <span class="rb-status" :title="t('reportBands.draftNote')">
        <CircleDashed :size="13" aria-hidden="true" />
        {{ t("reportBands.draft") }}
      </span>
      <span class="rb-note">{{ t(`reportBands.viewHints.${view}`) }}</span>
      <div class="rb-views" role="tablist">
        <button
          v-for="option in VIEWS"
          :key="option"
          type="button"
          role="tab"
          class="rb-view"
          :class="{ active: view === option }"
          :aria-selected="view === option"
          @click="view = option"
        >
          {{ t(`reportBands.views.${option}`) }}
        </button>
      </div>
      <n-button type="default" size="small" @click="copyJson">
        <template #icon><Copy :size="13" /></template>
        {{ t("bottomPanel.copy") }}
      </n-button>
    </div>

    <pre v-if="view !== 'tree'" class="rb-json">{{ shownJson }}</pre>

    <div v-else class="rb-tree">
      <div class="rb-list">
        <div class="rb-section-title">
          <Variable :size="13" aria-hidden="true" />
          {{ t("reportBands.parametersTitle") }}
        </div>
        <div v-for="param in payload.parameters" :key="param.alias" class="rb-param">
          <span class="rb-mono">{{ param.alias }}</span>
          <span class="rb-muted">{{ param.type }}</span>
          <span class="rb-param-value">= {{ parameterValue(param.alias) }}</span>
        </div>

        <div class="rb-section-title">
          <ListTree :size="13" aria-hidden="true" />
          <span class="rb-mono">{{ ROOT_BAND_NAME }}</span>
        </div>
        <p v-if="!payload.bands.length" class="rb-empty">{{ t("reportBands.empty") }}</p>
        <button
          v-for="band in payload.bands"
          :key="band.name"
          type="button"
          class="rb-band"
          :class="{ selected: selected?.name === band.name }"
          @click="selectedName = band.name"
        >
          <component :is="KIND_ICONS[band.kind]" :size="14" class="rb-band-icon" aria-hidden="true" />
          <span class="rb-band-name rb-mono">{{ band.name }}</span>
          <span class="rb-band-label">{{ band.label }}</span>
          <span class="rb-band-fills">{{ t("reportBands.groovy") }} · {{ fillsText(band) }}</span>
        </button>

        <div class="rb-section-title">
          <FileCode2 :size="13" aria-hidden="true" />
          {{ t("reportBands.templateTitle") }}
        </div>
        <div class="rb-template">
          {{ t("reportBands.templateLine", { code: REPORT_TEMPLATE_CODE, className: templateClassName }) }}
        </div>
      </div>

      <div v-if="selected" class="rb-detail">
        <dl class="rb-rows">
          <template v-for="row in detailRows(selected)" :key="row.label">
            <dt>{{ row.label }}</dt>
            <dd :class="{ 'rb-mono': row.mono }">
              <template v-if="Array.isArray(row.value)">
                <div v-for="(line, i) in row.value" :key="i">{{ line }}</div>
              </template>
              <template v-else>{{ row.value }}</template>
            </dd>
          </template>
        </dl>
        <div class="rb-section-title">{{ t("reportBands.dataSet") }}</div>
        <pre class="rb-code">{{ BAND_LOADER_SCRIPT }}</pre>
        <div class="rb-section-title">{{ t("reportBands.request") }}</div>
        <pre class="rb-code">{{ requestJson(selected) }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import {
  ChartColumn,
  CircleDashed,
  Copy,
  FileCode2,
  FolderKanban,
  List,
  ListTree,
  MapPin,
  Table2,
  Variable,
} from "@lucide/vue";
import { useReportStore } from "@/stores/report";
import { useFilesStore } from "@/stores/files";
import notification from "@/utils/notification";
import { buildReportBands } from "@/utils/reportBands";
import { toJmixStructure } from "@/utils/jmixReportStructure";
import {
  BAND_LOADER_SCRIPT,
  CUSTOM_TEMPLATE_CLASS,
  PROJECT_PARAMETER,
  REPORT_TEMPLATE_CODE,
  ROOT_BAND_NAME,
} from "@/constants/reportBandConstants";
import type { BandField, BandKind, BandSpec } from "@/types/reportBands";
import type { JmixCondition, JmixFilter } from "@/types/jmix";

type View = "tree" | "sent" | "stored";
interface DetailRow {
  label: string;
  value: string | string[];
  mono?: boolean;
}

const VIEWS: View[] = ["tree", "sent", "stored"];

const KIND_ICONS: Record<BandKind, Component> = {
  projectValues: FolderKanban,
  entityRows: Table2,
  projectList: List,
  aggregate: ChartColumn,
  map: MapPin,
};

const props = defineProps<{
  // Built only while the tab is shown
  active: boolean;
}>();

const { t } = useI18n();
const reportStore = useReportStore();
const { bands, reportProperties } = storeToRefs(reportStore);
const filesStore = useFilesStore();

const view = ref<View>("tree");
const selectedName = ref<string | null>(null);

const templateClassName = CUSTOM_TEMPLATE_CLASS.split(".").pop();

// Rebuilt with the JRXML, like the JRXML Content tab
const payload = computed(() => {
  void reportStore.jrxmlVersion;
  if (!props.active) return { parameters: [], bands: [] };
  return buildReportBands(bands.value, reportProperties.value?.projects?.[0]);
});

const structure = computed(() =>
  toJmixStructure(payload.value, { id: filesStore.currentFileId, name: filesStore.currentFileName }),
);

const selected = computed<BandSpec | null>(
  () => payload.value.bands.find((b) => b.name === selectedName.value) ?? payload.value.bands[0] ?? null,
);

const shownJson = computed(() => JSON.stringify(view.value === "stored" ? structure.value : payload.value, null, 2));

function parameterValue(alias: string): string {
  if (alias !== PROJECT_PARAMETER) return t("reportBands.today");
  return reportProperties.value?.projects?.[0]?.name || t("reportBands.noProject");
}

function fillsText(band: BandSpec): string {
  if (band.kind === "projectValues") return t("reportBands.fills.parameters", band.fields.length);
  if (band.kind === "aggregate") return t("reportBands.fills.chart");
  if (band.kind === "map") return t("reportBands.fills.map");
  return t("reportBands.fills.table");
}

// Its request as the band loader reads it (the data set's jsonSourceText)
function requestJson(band: BandSpec): string {
  const { name: _name, ...request } = band;
  return JSON.stringify(request, null, 2);
}

const conditionText = (c: JmixCondition | JmixFilter): string =>
  "conditions" in c
    ? `(${c.conditions.map(conditionText).join(` ${c.group ?? "AND"} `)})`
    : `${c.property} ${c.operator} ${JSON.stringify(c.value)}`;

function fieldText(field: BandField): string {
  if (field.dynamicAttribute) return `${field.name} ← ${t("reportBands.fields.userDefined", { code: field.dynamicAttribute })}`;
  const from = field.paths?.join(field.separator ?? " ") ?? field.path;
  const look = [field.format, field.pattern, field.linked ? t("reportBands.fields.linked") : ""].filter(Boolean).join(", ");
  return [from && from !== field.name ? `${field.name} ← ${from}` : field.name, look && `(${look})`].filter(Boolean).join(" ");
}

function detailRows(band: BandSpec): DetailRow[] {
  const rows: DetailRow[] = [
    { label: t("reportBands.fields.name"), value: band.name, mono: true },
    { label: t("reportBands.fields.kind"), value: t(`reportBands.kinds.${band.kind}`) },
  ];
  if (band.kind === "projectValues") {
    rows.push(
      { label: t("reportBands.fields.source"), value: `${band.source.entity} · ${band.source.id}`, mono: true },
      { label: t("reportBands.fields.fetchPlan"), value: band.source.fetchPlan, mono: true },
      { label: t("reportBands.fields.columns"), value: band.fields.map(fieldText), mono: true },
    );
  } else if (band.kind === "entityRows") {
    rows.push(
      { label: t("reportBands.fields.source"), value: band.source.entity, mono: true },
      { label: t("reportBands.fields.projectProperty"), value: band.source.projectProperty, mono: true },
      ...(band.source.fetchPlan ? [{ label: t("reportBands.fields.fetchPlan"), value: band.source.fetchPlan, mono: true }] : []),
      { label: t("reportBands.fields.columns"), value: band.fields.map(fieldText), mono: true },
      {
        label: t("reportBands.fields.filters"),
        value: band.filter.conditions.length ? band.filter.conditions.map(conditionText) : t("reportBands.fields.noFilters"),
        mono: band.filter.conditions.length > 0,
      },
      {
        label: t("reportBands.fields.sort"),
        value: band.sort.map((s) => t(s.desc ? "reportBands.fields.sortDesc" : "reportBands.fields.sortAsc", { property: s.property })),
      },
      { label: t("reportBands.fields.maxRows"), value: t("reportBands.fields.maxRowsValue", { count: band.maxRows.toLocaleString() }) },
    );
  } else if (band.kind === "projectList") {
    rows.push(
      {
        label: t("reportBands.fields.list"),
        value: band.single ? `${band.list} (${t("reportBands.fields.single")})` : band.list,
        mono: true,
      },
      { label: t("reportBands.fields.columns"), value: band.fields.map(fieldText), mono: true },
    );
  } else if (band.kind === "aggregate") {
    rows.push(
      { label: t("reportBands.fields.source"), value: band.source.entity, mono: true },
      { label: t("reportBands.fields.projectProperty"), value: band.source.projectProperty, mono: true },
      { label: t("reportBands.fields.chartType"), value: band.chart.chartType, mono: true },
      {
        label: t("reportBands.fields.requests"),
        value: band.requests.map((r) =>
          [
            `${r.measure.aggregation}${r.measure.property ? `(${r.measure.property})` : ""}`,
            r.dimension ? `by ${r.dimension.property}${r.dimension.granularity ? ` / ${r.dimension.granularity}` : ""}` : "",
            r.splitBy ? `split by ${r.splitBy.property}` : "",
            r.filter?.conditions.length ? `where ${r.filter.conditions.map(conditionText).join(" AND ")}` : "",
          ].filter(Boolean).join(" "),
        ),
        mono: true,
      },
      { label: t("reportBands.fields.picture"), value: t("reportBands.fields.pictureSize", { width: band.fills.width, height: band.fills.height }) },
    );
  } else {
    rows.push(
      { label: t("reportBands.fields.coordinates"), value: `${band.latitudePath}, ${band.longitudePath}`, mono: true },
      { label: t("reportBands.fields.addressLines"), value: band.addressLines.map((l) => l.paths.join(l.separator ?? " ")), mono: true },
      { label: t("reportBands.fields.picture"), value: t("reportBands.fields.pictureSize", { width: band.fills.width, height: band.fills.height }) },
      { label: t("reportBands.fields.zoom"), value: String(band.fills.zoom ?? "") },
    );
  }
  return rows;
}

async function copyJson() {
  const text = view.value === "tree" ? JSON.stringify(structure.value, null, 2) : shownJson.value;
  try {
    await navigator.clipboard.writeText(text);
    notification.success(t("reportBands.copied"));
  } catch {
    notification.error(t("bottomPanel.copyFailed"));
  }
}
</script>

<style scoped>
.rb {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-size: 12px;
  color: #1c1b26;
}

.rb-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid #e6e5ee;
}

.rb-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f6f5fb;
  color: #6440f4;
  font-weight: 600;
  white-space: nowrap;
}

.rb-note {
  flex: 1;
  min-width: 0;
  color: #5b5a6b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rb-views {
  display: inline-flex;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  overflow: hidden;
}

.rb-view {
  padding: 4px 10px;
  border: none;
  background: #fff;
  color: #5b5a6b;
  font-size: 12px;
  cursor: pointer;
}

.rb-view + .rb-view {
  border-left: 1px solid #e6e5ee;
}

.rb-view.active {
  background: #f1edfe;
  color: #6440f4;
  font-weight: 600;
}

.rb-json {
  flex: 1;
  margin: 0;
  padding: 12px;
  overflow: auto;
  line-height: 1.5;
}

.rb-tree {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 2fr) 3fr;
}

.rb-list {
  overflow: auto;
  padding: 8px 12px 12px;
  border-right: 1px solid #e6e5ee;
}

.rb-detail {
  overflow: auto;
  padding: 8px 12px 12px;
}

.rb-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 6px;
  font-weight: 600;
  color: #5b5a6b;
}

.rb-section-title:first-child {
  margin-top: 4px;
}

.rb-param {
  display: flex;
  gap: 8px;
  padding: 2px 0 2px 19px;
}

.rb-param-value {
  color: #5b5a6b;
}

.rb-muted {
  color: #8a84a3;
}

.rb-mono {
  font-family: "Consolas", "Monaco", "Courier New", monospace;
}

.rb-empty {
  margin: 4px 0 0 19px;
  color: #6f6a7e;
  white-space: pre-line;
}

.rb-band {
  display: grid;
  grid-template-columns: 16px minmax(0, auto) 1fr;
  align-items: center;
  column-gap: 8px;
  width: 100%;
  margin: 2px 0;
  padding: 6px 8px 6px 19px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: none;
  text-align: left;
  font-size: 12px;
  color: inherit;
  cursor: pointer;
}

.rb-band:hover {
  background: rgba(100, 64, 244, 0.05);
}

.rb-band.selected {
  border-color: #c4b5fd;
  background: #f6f5fb;
}

.rb-band-icon {
  color: #6440f4;
}

.rb-band-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rb-band-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #5b5a6b;
}

.rb-band-fills {
  grid-column: 2 / 4;
  color: #8a84a3;
}

.rb-template {
  padding-left: 19px;
  color: #5b5a6b;
}

.rb-rows {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 4px 0 0;
}

.rb-rows dt {
  color: #6f6a7e;
}

.rb-rows dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}

.rb-code {
  margin: 0;
  padding: 8px 10px;
  border: 1px solid #ecebf2;
  border-radius: 8px;
  background: #f6f5fb;
  overflow: auto;
  line-height: 1.5;
  white-space: pre;
}
</style>
