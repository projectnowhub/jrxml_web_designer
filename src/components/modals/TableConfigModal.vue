<template>
  <BaseModal
    :visible="visible"
    :title="t('dataTable.config.title', { name: draftName })"
    :content-style="{ width: 'min(1120px, 96vw)', maxWidth: '96vw' }"
    body-class="tcm-body-wrap"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="tcm">
      <!-- Settings -->
      <div class="tcm-settings">
        <!-- Project, then one of its sources -->
        <section class="tcm-section">
          <h4><FolderKanban :size="14" aria-hidden="true" />{{ t("dataTable.config.project") }}</h4>
          <p v-if="!projectOptions.length" class="tcm-note">{{ t("dataTable.config.noProjects") }}</p>
          <div v-else class="tcm-select-wrap">
            <select class="tcm-select" :value="projectId" @change="changeProject(($event.target as HTMLSelectElement).value)">
              <option value="" disabled>{{ t("dataTable.config.chooseProject") }}</option>
              <option v-for="p in projectOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <ChevronDown class="tcm-chevron" :size="14" aria-hidden="true" />
          </div>
        </section>

        <section v-if="projectId" class="tcm-section">
          <h4><Database :size="14" aria-hidden="true" />{{ t("dataTable.config.source") }}</h4>
          <div class="tcm-select-wrap">
            <select class="tcm-select" :value="sourceId" @change="changeSource(($event.target as HTMLSelectElement).value)">
              <option value="" disabled>{{ t("dataTable.config.chooseSource") }}</option>
              <option v-for="s in sources" :key="s.id" :value="s.id">
                {{ t("dataTable.config.sourceOption", { name: s.name, count: s.rowCount }) }}
              </option>
            </select>
            <ChevronDown class="tcm-chevron" :size="14" aria-hidden="true" />
          </div>
          <p v-if="loadError" class="tcm-error">{{ t("dataTable.loadFailed") }}</p>
          <p v-else-if="replacedSource" class="tcm-note">
            <Replace :size="13" aria-hidden="true" />
            {{ t("dataTable.config.replacesData", { source: replacedSource }) }}
          </p>
        </section>

        <template v-if="schema">
          <!-- Columns -->
          <section class="tcm-section">
            <h4>
              <Columns3 :size="14" aria-hidden="true" />{{ t("dataTable.config.columns") }}
              <span class="tcm-counter" :class="{ 'is-full': columns.length >= maxColumns }">
                {{ t("dataTable.config.columnCounter", { count: columns.length, max: maxColumns }) }}
              </span>
            </h4>
            <ul class="tcm-list">
              <li v-for="(col, i) in columns" :key="col.key" class="tcm-col">
                <div class="tcm-move">
                  <button type="button" class="tcm-icon-btn" :disabled="i === 0" :title="t('dataTable.config.moveUp')" @click="moveColumn(i, -1)">
                    <ChevronUp :size="13" />
                  </button>
                  <button type="button" class="tcm-icon-btn" :disabled="i === columns.length - 1" :title="t('dataTable.config.moveDown')" @click="moveColumn(i, 1)">
                    <ChevronDown :size="13" />
                  </button>
                </div>
                <component :is="TYPE_ICONS[col.type]" :size="13" class="tcm-type" :title="t(`dataTable.types.${col.type}`)" />
                <input
                  class="tcm-input"
                  :value="col.label"
                  :title="t('dataTable.config.headerText')"
                  :aria-label="t('dataTable.config.headerText')"
                  @input="col.label = ($event.target as HTMLInputElement).value"
                />
                <div v-if="showTotals" class="tcm-select-wrap is-small">
                  <select
                    class="tcm-select"
                    :value="col.total ?? ''"
                    :aria-label="t('dataTable.config.total')"
                    @change="setTotal(col, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">{{ t("dataTable.config.noTotal") }}</option>
                    <option v-for="fn in totalsFor(col.type)" :key="fn" :value="fn">{{ t(`dataTable.totals.${fn}`) }}</option>
                  </select>
                  <ChevronDown class="tcm-chevron" :size="12" aria-hidden="true" />
                </div>
                <button type="button" class="tcm-icon-btn danger" :title="t('dataTable.config.removeColumn')" @click="removeColumn(i)">
                  <X :size="14" />
                </button>
              </li>
            </ul>
            <div v-if="unusedColumns.length" class="tcm-select-wrap">
              <select
                class="tcm-select"
                value=""
                :disabled="columns.length >= maxColumns"
                @change="addColumn(($event.target as HTMLSelectElement))"
              >
                <option value="">{{ t("dataTable.config.addColumn") }}</option>
                <option v-for="c in unusedColumns" :key="c.key" :value="c.key">{{ c.label }}</option>
              </select>
              <ChevronDown class="tcm-chevron" :size="14" aria-hidden="true" />
            </div>
            <p v-if="columns.length >= maxColumns && unusedColumns.length" class="tcm-hint">
              {{ t("dataTable.config.columnLimitHint") }}
            </p>
          </section>

          <!-- Filter & sort, like a shop's filter panel -->
          <section class="tcm-section">
            <h4><SlidersHorizontal :size="14" aria-hidden="true" />{{ t("dataTable.filter.title") }}</h4>
            <TableFilterPanel
              :columns="schema.columns"
              :facets="facets"
              :filters="filters"
              :sort="sort"
              :match-count="previewLoading ? null : previewTotal"
              @update:filters="filters = $event"
              @update:sort="sort = $event"
            />
          </section>

          <!-- Rows, totals -->
          <section class="tcm-section">
            <h4><ListOrdered :size="14" aria-hidden="true" />{{ t("dataTable.config.rows") }}</h4>
            <label class="tcm-check">
              <input type="checkbox" :checked="rowLimit !== undefined" @change="toggleRowLimit(($event.target as HTMLInputElement).checked)" />
              {{ t("dataTable.config.limitRows") }}
              <input
                v-if="rowLimit !== undefined"
                class="tcm-input is-narrow"
                type="number"
                min="1"
                :value="rowLimit"
                :aria-label="t('dataTable.config.rowLimit')"
                @input="setRowLimit(($event.target as HTMLInputElement).value)"
              />
            </label>
            <label class="tcm-check">
              <input type="checkbox" :checked="showTotals" @change="toggleTotals(($event.target as HTMLInputElement).checked)" />
              {{ t("dataTable.config.showTotals") }}
            </label>
          </section>

        </template>
      </div>

      <!-- Live preview -->
      <div class="tcm-preview">
        <div class="tcm-preview-head">
          <h4>{{ t("dataTable.config.preview") }}</h4>
          <span v-if="schema && !previewLoading" class="tcm-muted">
            {{ previewSummary }}
          </span>
        </div>
        <div v-if="!schema" class="tcm-empty">
          <DatabaseZap :size="28" :stroke-width="1.5" aria-hidden="true" />
          <span>{{ t("dataTable.config.pickSourceFirst") }}</span>
        </div>
        <div v-else class="tcm-grid-wrap">
          <DataGrid
            :columns="columns"
            :rows="previewRows"
            :look="look"
            :show-totals="showTotals"
            :loading="previewLoading"
            :failed="previewFailed"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <span v-if="applyBlockedReason" class="tcm-footer-hint">{{ applyBlockedReason }}</span>
      <n-button @click="emit('update:visible', false)">{{ t("common.cancel") }}</n-button>
      <n-button type="primary" :disabled="!!applyBlockedReason" @click="apply">
        {{ t("dataTable.config.apply") }}
      </n-button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch, type Component } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import {
  ArrowDownUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Columns3,
  Database,
  FolderKanban,
  DatabaseZap,
  DollarSign,
  Funnel,
  Hash,
  ListOrdered,
  SlidersHorizontal,
  Plus,
  Replace,
  Type,
  X,
} from "@lucide/vue";
import BaseModal from "./BaseModal.vue";
import DataGrid from "../common/DataGrid.vue";
import TableFilterPanel from "../designer/TableFilterPanel.vue";
import { getFacets, getSchema, listSources, queryRows } from "@/services/dataSourceService";
import {
  PREVIEW_ROW_LIMIT,
  createDatasetName,
  maxColumnsForWidth,
  nextTableName,
  toDataQuery,
} from "@/utils/table/dataBinding";
import { createBinding, evenColumnWidths, toColumnBinding, totalsFor } from "@/utils/table/dataTable";
import { resolveLook } from "@/utils/table/tableThemes";
import type { TableElement } from "@/types";
import type {
  DataColumnType,
  DataRow,
  DataSourceSchema,
  DataSourceSummary,
  ReportProject,
  TableColumnBinding,
  TableDataBinding,
  TableFilter,
  TableSort,
  SourceFacets,
  TotalFunction,
} from "@/types/dataSource";

const props = defineProps<{
  visible: boolean;
  // The table being set up; null when the table is created on Apply
  table: TableElement | null;
  tableWidth: number;
  // The report's projects (the Report Data list)
  projects: ReportProject[];
  // Project, source (and column) dragged onto the table, if it was opened by a drop
  initialProjectId?: string;
  initialSourceId?: string;
  initialColumnKey?: string;
  existingTableNames: string[];
  existingDatasetNames: string[];
}>();

const emit = defineEmits<{
  "update:visible": [visible: boolean];
  apply: [binding: TableDataBinding, rowCount: number];
}>();

const { t } = useI18n();

const TYPE_ICONS: Record<DataColumnType, Component> = {
  text: Type,
  number: Hash,
  currency: DollarSign,
  date: Calendar,
};

const sources = ref<DataSourceSummary[]>([]);
const projectId = ref("");
const sourceId = ref("");

// The report's projects, plus the table's own if it was removed from the list
const projectOptions = computed<ReportProject[]>(() => {
  const list = [...props.projects];
  const own = props.table?.binding;
  if (own?.projectId && !list.some((p) => p.id === own.projectId)) {
    list.push({ id: own.projectId, name: own.projectName });
  }
  return list;
});
const projectName = computed(
  () => projectOptions.value.find((p) => p.id === projectId.value)?.name ?? projectId.value,
);
const schema = ref<DataSourceSchema | null>(null);
const loadError = ref(false);

// The draft setup; nothing changes on the table until Apply
const draftName = ref("");
const datasetName = ref("");
const columns = ref<TableColumnBinding[]>([]);
const filters = ref<TableFilter[]>([]);
const sort = ref<TableSort[]>([]);
const rowLimit = ref<number | undefined>(undefined);
const showTotals = ref(false);

const maxColumns = computed(() => maxColumnsForWidth(props.tableWidth));
// Another source than the table shows: Apply replaces its data, like a new image
const replacedSource = computed(() => {
  const current = props.table?.binding;
  return current &&
    sourceId.value &&
    (sourceId.value !== current.sourceId || projectId.value !== current.projectId)
    ? current.sourceName
    : "";
});
const unusedColumns = computed(() =>
  (schema.value?.columns ?? []).filter((c) => !columns.value.some((col) => col.key === c.key)),
);

// The table's setup is reactive (structuredClone can't copy it) and plain JSON
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function loadDraft(binding: TableDataBinding) {
  draftName.value = binding.tableName;
  datasetName.value = binding.datasetName;
  columns.value = copy(binding.columns);
  filters.value = copy(binding.filters);
  sort.value = copy(binding.sort);
  rowLimit.value = binding.rowLimit;
  showTotals.value = binding.showTotals;
}

// Filter choices of the source (values with counts, ranges)
const facets = ref<SourceFacets | null>(null);

async function loadFacets(project: string, id: string) {
  facets.value = null;
  const stillCurrent = () => projectId.value === project && sourceId.value === id;
  try {
    const loaded = await getFacets(project, id);
    if (stillCurrent()) facets.value = loaded;
  } catch {
    if (stillCurrent()) facets.value = {};
  }
}

// The table keeps its look; a new table starts with the first built-in style
const look = computed(() => resolveLook(props.table?.binding));

async function useSchema(id: string, freshColumns: boolean) {
  loadError.value = false;
  const project = projectId.value;
  const stillCurrent = () => projectId.value === project && sourceId.value === id;
  try {
    const loaded = await getSchema(project, id);
    if (!stillCurrent()) return;
    schema.value = loaded;
    loadFacets(project, id);
    if (freshColumns) {
      // A new source: start with as many of its columns as fit; keep the look
      const start = createBinding({
        project: { id: project, name: projectName.value },
        schema: loaded,
        tableName: draftName.value,
        datasetName: datasetName.value,
        tableWidth: props.tableWidth,
      });
      const only = props.initialColumnKey && loaded.columns.find((c) => c.key === props.initialColumnKey);
      columns.value = only ? [toColumnBinding(only, props.tableWidth)] : start.columns;
      filters.value = [];
      sort.value = [];
    }
  } catch {
    if (stillCurrent()) loadError.value = true;
  }
}

function loadSources(project: string) {
  sources.value = [];
  if (!project) return;
  listSources(project)
    .then((list) => {
      if (projectId.value === project) sources.value = list;
    })
    .catch(() => (loadError.value = true));
}

// Fill the draft each time the popup opens
watch(
  () => props.visible,
  async (open) => {
    if (!open) return;
    const current = props.table?.binding;
    schema.value = null;
    if (current) {
      loadDraft(current);
    } else {
      draftName.value = nextTableName(props.existingTableNames);
      datasetName.value = createDatasetName(props.existingDatasetNames);
      columns.value = [];
      filters.value = [];
      sort.value = [];
      rowLimit.value = undefined;
      showTotals.value = false;
    }
    // A dropped source, the table's own, or the only project there is
    const project =
      props.initialProjectId ??
      (current?.projectId || undefined) ??
      (projectOptions.value.length === 1 ? projectOptions.value[0]!.id : "");
    const id = props.initialSourceId ?? (project === current?.projectId ? current?.sourceId : "") ?? "";
    projectId.value = project;
    sourceId.value = id;
    loadError.value = false;
    loadSources(project);
    if (project && id) {
      await useSchema(id, id !== current?.sourceId || project !== current?.projectId);
    }
  },
  { immediate: true },
);

// Another project: choose one of its sources again
function changeProject(id: string) {
  projectId.value = id;
  sourceId.value = "";
  schema.value = null;
  loadError.value = false;
  loadSources(id);
}

function changeSource(id: string) {
  sourceId.value = id;
  useSchema(id, true);
}

function moveColumn(index: number, step: number) {
  const list = columns.value;
  const [col] = list.splice(index, 1);
  if (col) list.splice(index + step, 0, col);
}

function removeColumn(index: number) {
  columns.value.splice(index, 1);
}

function addColumn(select: HTMLSelectElement) {
  const column = schema.value?.columns.find((c) => c.key === select.value);
  select.value = "";
  if (!column || columns.value.length >= maxColumns.value) return;
  columns.value.push(toColumnBinding(column, 0));
}

function setTotal(col: TableColumnBinding, value: string) {
  col.total = (value || undefined) as TotalFunction | undefined;
}

function toggleRowLimit(on: boolean) {
  rowLimit.value = on ? 10 : undefined;
}

function setRowLimit(value: string) {
  const n = Math.round(Number(value));
  rowLimit.value = n > 0 ? n : 1;
}

function toggleTotals(on: boolean) {
  showTotals.value = on;
  // Start with a sum under every number column
  if (on && !columns.value.some((c) => c.total)) {
    columns.value.forEach((c) => {
      if (c.type === "number" || c.type === "currency") c.total = "sum";
    });
  }
}

const current = computed(() => props.table?.binding);

// The setup as it would be applied
const draftBinding = computed<TableDataBinding | null>(() => {
  if (!schema.value || !sourceId.value || !projectId.value) return null;
  return {
    tableName: draftName.value,
    datasetName: datasetName.value,
    projectId: projectId.value,
    projectName: projectName.value,
    sourceId: sourceId.value,
    sourceName: schema.value.name,
    columns: evenColumnWidths(
      columns.value.map((c) => ({ ...c, label: c.label.trim() || c.key })),
      props.tableWidth,
    ),
    filters: copy(filters.value),
    sort: copy(sort.value.slice(0, 1)),
    rowLimit: rowLimit.value,
    showTotals: showTotals.value && columns.value.some((c) => c.total),
    // The look is set in the properties panel; the popup keeps it
    theme: current.value?.theme ?? "corporateBlue",
    look: current.value?.look ? copy(current.value.look) : undefined,
    customized: current.value?.customized || undefined,
  };
});

// Preview rows: refetched (shortly after typing stops) when the request changes
const previewRows = ref<DataRow[]>([]);
const previewTotal = ref(0);
const previewLoading = ref(false);
const previewFailed = ref(false);
let previewTimer: ReturnType<typeof setTimeout> | undefined;
let previewController: AbortController | null = null;

watch(
  () =>
    draftBinding.value
      ? JSON.stringify([projectId.value, sourceId.value, toDataQuery(draftBinding.value, PREVIEW_ROW_LIMIT)])
      : "",
  (key) => {
    clearTimeout(previewTimer);
    previewController?.abort();
    if (!key || !draftBinding.value || !props.visible) {
      previewRows.value = [];
      previewTotal.value = 0;
      previewLoading.value = false;
      return;
    }
    previewLoading.value = true;
    const binding = draftBinding.value;
    previewTimer = setTimeout(async () => {
      const controller = new AbortController();
      previewController = controller;
      try {
        const result = await queryRows(
          binding.projectId,
          binding.sourceId,
          toDataQuery(binding, PREVIEW_ROW_LIMIT),
          controller.signal,
        );
        if (controller.signal.aborted) return;
        previewRows.value = result.rows;
        previewTotal.value = result.totalCount;
        previewFailed.value = false;
      } catch {
        if (!controller.signal.aborted) previewFailed.value = true;
      } finally {
        if (!controller.signal.aborted) previewLoading.value = false;
      }
    }, 250);
  },
  { immediate: true },
);

// Rows the report will print, as far as the preview can tell
const printedRowCount = computed(() =>
  rowLimit.value ? Math.min(rowLimit.value, previewTotal.value) : previewTotal.value,
);

const previewSummary = computed(() =>
  previewTotal.value > previewRows.value.length && previewRows.value.length >= PREVIEW_ROW_LIMIT
    ? t("dataTable.config.previewCapped", { shown: previewRows.value.length, count: printedRowCount.value })
    : t("dataTable.config.rowCount", printedRowCount.value),
);

const applyBlockedReason = computed(() => {
  if (!schema.value) return t("dataTable.config.pickSourceFirst");
  if (!columns.value.length) return t("dataTable.config.needColumn");
  if (columns.value.length > maxColumns.value) return t("dataTable.config.tooManyColumns", { max: maxColumns.value });
  return "";
});

function apply() {
  if (!draftBinding.value || applyBlockedReason.value) return;
  emit("apply", draftBinding.value, printedRowCount.value);
  emit("update:visible", false);
}
</script>

<style scoped>
.tcm {
  display: grid;
  grid-template-columns: minmax(340px, 420px) minmax(0, 1fr);
  gap: 16px;
  height: min(68vh, 640px);
}

.tcm-settings {
  overflow-y: auto;
  padding-right: 6px;
}

.tcm-section {
  padding: 12px;
  margin-bottom: 10px;
  border: 1px solid #eef0f4;
  border-radius: 8px;
  background: #fafbfc;
}

.tcm-section h4,
.tcm-preview h4 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.tcm-counter {
  margin-left: auto;
  font-size: 11px;
  font-weight: 500;
  color: #6b7280;
}

.tcm-counter.is-full {
  color: #d97706;
}

.tcm-list {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tcm-col {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tcm-empty {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.4;
  color: #6b7280;
}

.tcm-move {
  display: flex;
  flex-direction: column;
}

.tcm-type {
  flex-shrink: 0;
  color: #6b7280;
}

.tcm-input,
.tcm-select {
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

.tcm-input:focus,
.tcm-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.15);
}

.tcm-input.is-narrow {
  width: 72px;
  margin-left: 6px;
}

.tcm-select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 26px;
  cursor: pointer;
}

.tcm-select-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.tcm-select-wrap.is-small {
  flex: 0 0 96px;
}

.tcm-chevron {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
}

.tcm-icon-btn {
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

.tcm-move .tcm-icon-btn {
  height: 14px;
}

.tcm-icon-btn:hover:not(:disabled) {
  background: #eef0f4;
  color: #1f2937;
}

.tcm-icon-btn.danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.tcm-icon-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.tcm-check {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  font-size: 12px;
  color: #374151;
}

.tcm-muted {
  font-size: 11px;
  color: #6b7280;
  white-space: nowrap;
}

.tcm-hint,
.tcm-error {
  margin: 6px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: #6b7280;
}

.tcm-error {
  color: #dc2626;
}

.tcm-note {
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

.tcm-note svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.tcm-preview {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.tcm-preview-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.tcm-grid-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #eef0f4;
  border-radius: 8px;
}

.tcm-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  color: #9ca3af;
  font-size: 12px;
}

.tcm-footer-hint {
  margin-right: auto;
  font-size: 12px;
  color: #d97706;
}

@media (max-width: 760px) {
  .tcm {
    grid-template-columns: 1fr;
    height: auto;
  }
}
</style>
