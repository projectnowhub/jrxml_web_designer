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
          <SkeletonBlock v-if="sourcesLoading" height="34px" radius="8px" />
          <div v-else class="tcm-select-wrap">
            <select class="tcm-select" :value="sourceId" @change="changeSource(($event.target as HTMLSelectElement).value)">
              <option value="" disabled>{{ t("dataTable.config.chooseSource") }}</option>
              <option v-for="s in sources" :key="s.id" :value="s.id">
                {{ s.rowCount !== undefined ? t("dataTable.config.sourceOption", { name: s.name, count: s.rowCount }) : s.name }}
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

        <!-- The chosen table's columns on their way -->
        <section v-if="schemaLoading" class="tcm-section tcm-skeleton">
          <SkeletonBlock width="40%" height="14px" />
          <SkeletonBlock v-for="i in 4" :key="i" height="30px" radius="8px" />
        </section>
        <template v-if="schema">
          <!-- Columns -->
          <section class="tcm-section">
            <h4>
              <Columns3 :size="14" aria-hidden="true" />{{ t("dataTable.config.columns") }}
              <span class="tcm-counter">{{ t("dataTable.config.columnCounter", columns.length) }}</span>
            </h4>
            <!-- Every column of the source, ticked when shown; stays open while choosing;
                 at the top, so it never moves as columns are added -->
            <TableColumnPicker
              :columns="schema.columns"
              :chosen="columns.map((c) => c.key)"
              @toggle="toggleColumn"
              @set="showColumns"
            />
            <!-- Drag a row by its grip to change the column order -->
            <ul
              class="tcm-list"
              @dragover="onColumnDragOver"
              @dragleave="onColumnDragLeave"
              @drop="onColumnDrop"
            >
              <li
                v-for="(col, i) in columns"
                :key="col.key"
                class="tcm-col"
                :class="{
                  'is-dragged': dragFrom === i,
                  'drop-before': showDropLine && dropAt === i,
                  'drop-after': showDropLine && dropAt === columns.length && i === columns.length - 1,
                }"
              >
                <span
                  class="tcm-grip"
                  draggable="true"
                  :title="t('dataTable.config.dragToReorder')"
                  :aria-label="t('dataTable.config.dragToReorder')"
                  @dragstart="onColumnDragStart($event, i)"
                  @dragend="endColumnDrag"
                >
                  <GripVertical :size="14" aria-hidden="true" />
                </span>
                <component :is="TYPE_ICONS[col.type]" :size="13" class="tcm-type" :title="t(`dataTable.types.${col.type}`)" />
                <Zap v-if="userDefinedKeys.has(col.key)" :size="11" class="tcm-bolt" :title="t('reportData.userDefinedField')" />
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
            <!-- No limit: past what fits, the table gets wider than the page -->
            <p v-if="tooWide" class="tcm-hint">{{ t("dataTable.config.widerThanPage") }}</p>
          </section>

          <!-- Filters, like a shop's filter panel (sorting is on the grid's headings) -->
          <section class="tcm-section">
            <h4><SlidersHorizontal :size="14" aria-hidden="true" />{{ t("dataTable.filter.filtersTitle") }}</h4>
            <TableFilterPanel
              :columns="schema.columns"
              :facets="facets"
              :filters="filters"
              :suggested-fields="columns.map((c) => c.key)"
              :match-count="previewLoading ? null : previewTotal"
              @update:filters="filters = $event"
            />
          </section>

          <!-- Highlight rules, next to Filter & sort -->
          <section class="tcm-section">
            <h4><Highlighter :size="14" aria-hidden="true" />{{ t("dataTable.highlight.title") }}</h4>
            <TableHighlights
              :columns="columns"
              :facets="facets ?? {}"
              :highlights="highlights"
              :look="look"
              @update:highlights="highlights = $event"
            />
          </section>

          <!-- Totals -->
          <section class="tcm-section">
            <h4><ListOrdered :size="14" aria-hidden="true" />{{ t("dataTable.config.rows") }}</h4>
            <p class="tcm-hint is-top">{{ t("dataTable.config.rowsNote") }}</p>
            <label class="tcm-check">
              <input type="checkbox" :checked="showTotals" @change="toggleTotals(($event.target as HTMLInputElement).checked)" />
              {{ t("dataTable.config.showTotals") }}
            </label>
          </section>

        </template>
      </div>

      <!-- The table's rows: sorted by a click on a heading, a page at a time -->
      <div class="tcm-preview">
        <div class="tcm-preview-head">
          <h4>{{ t("dataTable.config.tableRows") }}</h4>
          <span v-if="schema && !previewLoading" class="tcm-muted">
            {{ previewSummary }}
          </span>
          <PageSizeChoice v-if="schema && columns.length" class="tcm-page-size" :model-value="pageSize" :sizes="TABLE_PAGE_SIZES" @update:model-value="setPageSize" />
        </div>
        <p v-if="schema && columns.length" class="tcm-hint is-top">{{ t("dataTable.grid.sortHint") }}</p>
        <DataGridSkeleton v-if="schemaLoading" />
        <div v-else-if="!schema" class="tcm-empty">
          <DatabaseZap :size="28" :stroke-width="1.5" aria-hidden="true" />
          <span>{{ t("dataTable.config.pickSourceFirst") }}</span>
        </div>
        <div v-else class="tcm-grid-wrap">
          <DataGrid
            :columns="columns"
            :user-defined-keys="userDefinedKeys"
            :rows="previewRows"
            :look="look"
            :highlights="highlights"
            :show-totals="showTotals"
            :totals="previewTotals"
            :totals-loading="totalsLoading"
            :loading="previewLoading"
            :failed="previewFailed"
            sortable
            :sort="sort"
            :page-index="pageIndex"
            :page-size="pageSize"
            :row-count="printedRowCount"
            :page-sizes="TABLE_PAGE_SIZES"
            @update:sort="sort = $event"
            @update:page-index="pageIndex = $event"
            @update:page-size="pageSize = $event"
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
import { computed, ref, shallowRef, watch, type Component } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import {
  ArrowDownUp,
  Calendar,
  ChevronDown,
  Columns3,
  Database,
  FolderKanban,
  GripVertical,
  Highlighter,
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
  Zap,
} from "@lucide/vue";
import BaseModal from "./BaseModal.vue";
import DataGrid from "../common/DataGrid.vue";
import PageSizeChoice from "../common/PageSizeChoice.vue";
import DataGridSkeleton from "../common/DataGridSkeleton.vue";
import SkeletonBlock from "../common/SkeletonBlock.vue";
import TableFilterPanel from "../designer/TableFilterPanel.vue";
import TableColumnPicker from "../designer/TableColumnPicker.vue";
import TableHighlights from "../designer/properties/TableHighlights.vue";
import { fetchFacets, fetchSchema, fetchSources, rowsQuery } from "@/queries/dataSourceQueries";
import {
  createDatasetName,
  MIN_TABLE_COLUMN_WIDTH,
  nextTableName,
  toDataQuery,
} from "@/utils/table/dataBinding";
import { TABLE_PAGE_SIZES, TABLE_ROWS_LIMIT } from "@/constants/reportDataConstants";
import { useTableTotals } from "@/composables/useTableRows";
import { createBinding, evenColumnWidths, toColumnBinding, totalsFor } from "@/utils/table/dataTable";
import { resolveLook } from "@/utils/table/tableThemes";
import type { TableElement } from "@/types";
import type {
  DataColumnType,
  DataQuery,
  DataRow,
  DataSourceSchema,
  DataSourceSummary,
  ReportProject,
  TableColumnBinding,
  TableDataBinding,
  TableFilter,
  TableHighlight,
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
// Waiting for the project's tables, or for the chosen table's columns
const sourcesLoading = computed(() => !!projectId.value && !sources.value.length && !loadError.value);
const schemaLoading = computed(() => !!sourceId.value && !schema.value && !loadError.value);

// The draft setup; nothing changes on the table until Apply
const draftName = ref("");
const datasetName = ref("");
const columns = ref<TableColumnBinding[]>([]);
const filters = ref<TableFilter[]>([]);
const sort = ref<TableSort[]>([]);
const showTotals = ref(false);
const highlights = ref<TableHighlight[]>([]);

// The source's user-defined fields (marked with a bolt, as the CDP app)
const userDefinedKeys = computed(() => new Set((schema.value?.columns ?? []).filter((c) => c.userDefined).map((c) => c.key)));

// Every column shown at the smallest width would be wider than the table
const tooWide = computed(() => columns.value.length * MIN_TABLE_COLUMN_WIDTH > props.tableWidth);
// Another source than the table shows: Apply replaces its data, like a new image
const replacedSource = computed(() => {
  const current = props.table?.binding;
  return current &&
    sourceId.value &&
    (sourceId.value !== current.sourceId || projectId.value !== current.projectId)
    ? current.sourceName
    : "";
});
// The table's setup is reactive (structuredClone can't copy it) and plain JSON
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function loadDraft(binding: TableDataBinding) {
  draftName.value = binding.tableName;
  datasetName.value = binding.datasetName;
  columns.value = copy(binding.columns);
  filters.value = copy(binding.filters);
  sort.value = copy(binding.sort);
  showTotals.value = binding.showTotals;
  highlights.value = copy(binding.highlights ?? []);
}

// Filter choices of the source (values with counts, ranges)
const facets = ref<SourceFacets | null>(null);

async function loadFacets(project: string, id: string) {
  facets.value = null;
  const stillCurrent = () => projectId.value === project && sourceId.value === id;
  try {
    const loaded = await fetchFacets(project, id);
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
    const loaded = await fetchSchema(project, id);
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
      highlights.value = [];
    } else {
      // The table's own columns: each choice field with the words it prints as now
      columns.value = columns.value.map((col) => {
        const { choices: _old, ...rest } = col;
        const choices = loaded.columns.find((c) => c.key === col.key)?.choices;
        return choices?.length ? { ...rest, choices } : rest;
      });
    }
  } catch {
    if (stillCurrent()) loadError.value = true;
  }
}

function loadSources(project: string) {
  sources.value = [];
  if (!project) return;
  fetchSources(project)
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
      showTotals.value = false;
      highlights.value = [];
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

// ── Column order: drag a row by its grip ──
const dragFrom = ref<number | null>(null);
// Where the dragged column would go: before row dropAt (columns.length = at the end)
const dropAt = ref<number | null>(null);
// No line where dropping wouldn't move anything
const showDropLine = computed(
  () =>
    dragFrom.value !== null &&
    dropAt.value !== null &&
    dropAt.value !== dragFrom.value &&
    dropAt.value !== dragFrom.value + 1,
);
const COLUMN_DRAG_TYPE = "application/x-table-column";

function onColumnDragStart(event: DragEvent, index: number) {
  dragFrom.value = index;
  dropAt.value = null;
  const dt = event.dataTransfer;
  if (!dt) return;
  dt.effectAllowed = "move";
  dt.setData(COLUMN_DRAG_TYPE, String(index));
  // Drag the whole row, not just the grip
  const row = (event.currentTarget as HTMLElement).closest("li");
  if (row) dt.setDragImage(row, 12, row.offsetHeight / 2);
}

function onColumnDragOver(event: DragEvent) {
  if (dragFrom.value === null) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  const rows = Array.from((event.currentTarget as HTMLElement).children);
  const at = rows.findIndex((row) => {
    const r = row.getBoundingClientRect();
    return event.clientY < r.top + r.height / 2;
  });
  dropAt.value = at === -1 ? rows.length : at;
}

function onColumnDragLeave(event: DragEvent) {
  const list = event.currentTarget as HTMLElement;
  if (!list.contains(event.relatedTarget as Node | null)) dropAt.value = null;
}

function onColumnDrop(event: DragEvent) {
  const from = dragFrom.value;
  const at = dropAt.value;
  if (from === null || at === null) return;
  event.preventDefault();
  const to = at > from ? at - 1 : at;
  if (to !== from) {
    const [col] = columns.value.splice(from, 1);
    if (col) columns.value.splice(to, 0, col);
  }
  endColumnDrag();
}

function endColumnDrag() {
  dragFrom.value = null;
  dropAt.value = null;
}

function removeColumn(index: number) {
  columns.value.splice(index, 1);
}

// Show or hide one column (a new one goes at the end)
function toggleColumn(key: string) {
  const at = columns.value.findIndex((c) => c.key === key);
  if (at >= 0) {
    columns.value.splice(at, 1);
    return;
  }
  const column = schema.value?.columns.find((c) => c.key === key);
  if (column) columns.value.push(toColumnBinding(column, 0));
}

// Show exactly these: the ones already shown keep their place and settings,
// the others follow in the source's order
function showColumns(keys: string[]) {
  const wanted = new Set(keys);
  const kept = columns.value.filter((c) => wanted.has(c.key));
  const added = (schema.value?.columns ?? [])
    .filter((c) => wanted.has(c.key) && !kept.some((k) => k.key === c.key))
    .map((c) => toColumnBinding(c, 0));
  columns.value = [...kept, ...added];
}

function setTotal(col: TableColumnBinding, value: string) {
  col.total = (value || undefined) as TotalFunction | undefined;
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
    showTotals: showTotals.value && columns.value.some((c) => c.total),
    // The look is set in the properties panel; the popup keeps it
    theme: current.value?.theme ?? "corporateBlue",
    look: current.value?.look ? copy(current.value.look) : undefined,
    customized: current.value?.customized || undefined,
    // Highlight rules: kept while their column is shown
    highlights: (() => {
      const shown = new Set(columns.value.map((c) => c.key));
      const kept = highlights.value.filter((r) => shown.has(r.column));
      return kept.length ? copy(kept) : undefined;
    })(),
  };
});

// The grid's page (from 0) and rows per page
const pageIndex = ref(0);
const pageSize = ref(TABLE_ROWS_LIMIT);
// Rows a page shows (above the grid); back to the first page
function setPageSize(size: number) {
  pageSize.value = size;
  pageIndex.value = 0;
}

// Other rows (filters, sort, columns, source) start again at the first page
watch(
  () => (draftBinding.value ? JSON.stringify([projectId.value, sourceId.value, toDataQuery(draftBinding.value)]) : ""),
  () => (pageIndex.value = 0),
);

// The page's request
const pageQuery = (binding: TableDataBinding): DataQuery => ({
  ...toDataQuery(binding),
  offset: pageIndex.value * pageSize.value,
  limit: pageSize.value,
});

// The grid's rows and totals: asked for shortly after typing stops, whenever
// the request changes (the last rows stay while the next ones load)
type PreviewRequest = [projectId: string, sourceId: string, query: DataQuery];
const previewRequest = shallowRef<PreviewRequest | null>(null);
const previewBinding = shallowRef<TableDataBinding | null>(null);
const previewWaiting = ref(false);
let previewTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () =>
    draftBinding.value && props.visible
      ? JSON.stringify([[projectId.value, sourceId.value, pageQuery(draftBinding.value)], draftBinding.value])
      : "",
  (key) => {
    clearTimeout(previewTimer);
    if (!key) {
      previewRequest.value = null;
      previewBinding.value = null;
      previewWaiting.value = false;
      return;
    }
    previewWaiting.value = true;
    previewTimer = setTimeout(() => {
      const [request, binding] = JSON.parse(key) as [PreviewRequest, TableDataBinding];
      previewRequest.value = request;
      previewBinding.value = binding;
      previewWaiting.value = false;
    }, 250);
  },
  { immediate: true },
);

// The totals row: the backend's totals over every matching row, like the PDF's
const { totals: previewTotals, loading: totalsLoading } = useTableTotals(previewBinding);

const previewQuery = useQuery(
  computed(() => {
    const [project = "", source = "", query = {} as DataQuery] = previewRequest.value ?? [];
    return { ...rowsQuery(project, source, query), enabled: !!previewRequest.value, placeholderData: keepPreviousData };
  }),
);
const previewRows = computed<DataRow[]>(() => (previewRequest.value ? (previewQuery.data.value?.rows ?? []) : []));
const previewTotal = computed(() => (previewRequest.value ? (previewQuery.data.value?.totalCount ?? 0) : 0));
const previewLoading = computed(() => previewWaiting.value || (!!previewRequest.value && previewQuery.isFetching.value));
const previewFailed = computed(() => !!previewRequest.value && previewQuery.isError.value);

// Rows the report will print, as far as the preview can tell
const printedRowCount = computed(() => previewTotal.value);

const previewSummary = computed(() => t("dataTable.config.rowCount", printedRowCount.value));

const applyBlockedReason = computed(() => {
  if (!schema.value) return t("dataTable.config.pickSourceFirst");
  if (!columns.value.length) return t("dataTable.config.needColumn");
  return "";
});

function apply() {
  if (!draftBinding.value || applyBlockedReason.value) return;
  emit("apply", draftBinding.value, printedRowCount.value);
  emit("update:visible", false);
}
</script>

<style scoped>
.tcm-page-size {
  margin-left: auto;
}

.tcm-skeleton {
  display: grid;
  gap: 8px;
}

.tcm-bolt {
  flex: none;
  margin-left: -4px;
  color: #f59e0b;
}

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
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tcm-col.is-dragged {
  opacity: 0.4;
}

/* Where the dragged column will land */
.tcm-col.drop-before::before,
.tcm-col.drop-after::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 1px;
  background: #6440f4;
  pointer-events: none;
}

.tcm-col.drop-before::before {
  top: -4px;
}

.tcm-col.drop-after::after {
  bottom: -4px;
}

.tcm-grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
  height: 30px;
  border-radius: 4px;
  color: #9ca3af;
  cursor: grab;
}

.tcm-grip:hover {
  background: #eef0f4;
  color: #4b5563;
}

.tcm-grip:active {
  cursor: grabbing;
}

.tcm-empty {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.4;
  color: #6b7280;
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
  border-color: #6440f4;
  box-shadow: 0 0 0 2px rgba(100, 64, 244, 0.15);
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

.tcm-hint.is-top {
  margin: -4px 0 6px;
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* The grid scrolls inside; its page bar stays under it */
.tcm-grid-wrap > .data-grid {
  flex: 1;
  min-height: 0;
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
