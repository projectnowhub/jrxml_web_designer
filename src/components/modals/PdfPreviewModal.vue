<template>
  <BaseModal
    :visible="visible"
    :title="t('pdfPreview.title')"
    :showFooter="false"
    @update:visible="$emit('update:visible', $event)"
    @cancel="closeModal"
    :contentClass="'pdf-preview-modal'"
    :bodyHeight="'90vh'"
    :contentStyle="{
      width: '98vw',
      maxWidth: 'none',
      height: '98vh',
      maxHeight: '98vh',
    }"
    :bodyStyle="{ padding: '0', overflow: 'hidden', display: 'flex' }"
  >
    <div class="pdf-preview-body">
      <!-- The report's tables and charts, in page order, and the data each one
           prints (read-only) -->
      <div class="tables-panel" v-show="showTables">
        <div class="tables-head">
          <h4>{{ t("pdfPreview.data.title") }}</h4>
          <span class="muted">{{ t("pdfPreview.tables.readOnly") }}</span>
        </div>
        <div class="tables-list">
          <div v-if="!dataItems.length" class="empty-hint">{{ t("pdfPreview.data.none") }}</div>
          <p v-else class="server-note">
            <Info :size="12" aria-hidden="true" />
            {{ t("pdfPreview.data.serverNote") }}
          </p>
          <template v-for="entry in dataItems" :key="entry.element.uuid">
          <PreviewChartCard
            v-if="entry.kind === 'chart'"
            :chart="entry.element"
            :number="entry.number"
            @edit="editChart(entry.element.uuid ?? '')"
          />
          <section v-else-if="entry.kind === 'table'" class="table-card">
            <div class="card-head">
              <div class="card-title">
                <Table2 :size="14" aria-hidden="true" />
                <strong>{{ entry.binding.tableName }}</strong>
              </div>
              <n-button size="tiny" quaternary @click="editTable(entry.table.uuid ?? '')">
                <template #icon><SquarePen :size="13" /></template>
                {{ t("pdfPreview.tables.edit") }}
              </n-button>
            </div>
            <div class="card-source">
              <Database :size="12" aria-hidden="true" />
              {{ t("reportData.projectSource", { project: entry.binding.projectName, source: entry.binding.sourceName }) }}
              <span class="muted">· {{ rowCountText(entry.binding.datasetName) }}</span>
            </div>
            <div class="chips">
              <span class="chip">{{ t("dataTable.panel.columnCount", entry.binding.columns.length) }}</span>
              <span v-for="(f, i) in activeFilters(entry.binding)" :key="`f${i}`" class="chip is-applied">
                <Funnel :size="10" aria-hidden="true" />{{ describeFilter(entry.binding, f, t, locale) }}
              </span>
              <span v-for="(s, i) in describeSorts(entry.binding, t)" :key="`s${i}`" class="chip is-applied">
                <ArrowDownUp :size="10" aria-hidden="true" />{{ s }}
              </span>
            </div>
            <div class="card-grid">
              <DataGrid
                :columns="entry.binding.columns"
                :rows="tableRows[entry.binding.datasetName]?.rows ?? []"
                :look="resolveLook(entry.binding)"
                :highlights="entry.binding.highlights"
                :show-totals="entry.binding.showTotals"
                :totals="tableRows[entry.binding.datasetName]?.totals"
                :loading="tableRows[entry.binding.datasetName]?.loading"
                :failed="tableRows[entry.binding.datasetName]?.failed"
              />
            </div>
          </section>
          </template>
        </div>
      </div>

      <!-- Toggle Button -->
      <button
        class="panel-toggle"
        @click="showTables = !showTables"
        :title="showTables ? t('pdfPreview.editor.hidePanel') : t('pdfPreview.editor.showPanel')"
      >
        <component :is="showTables ? ChevronLeft : ChevronRight" :size="14" />
      </button>

      <!-- PDF Preview -->
      <div class="pdf-panel">
        <div class="pdf-toolbar">
          <n-button type="primary" size="small" @click="generatePreview" :loading="isGenerating">
            <template #icon><RefreshCw :size="13" /></template>
            {{ t("pdfPreview.generateBtn") }}
          </n-button>
        </div>
        <iframe ref="iframeRef" class="pdf-iframe" :src="previewUrl"></iframe>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Database,
  Funnel,
  Info,
  RefreshCw,
  SquarePen,
  Table2,
} from "@lucide/vue";
import BaseModal from "./BaseModal.vue";
import DataGrid from "../common/DataGrid.vue";
import PreviewChartCard from "./PreviewChartCard.vue";
import { ref, computed, watch, onUnmounted, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import type { Band, ChartElement, DesignElement, FrameElement } from "../../types";
import type { TableDataBinding } from "@/types/dataSource";
import type { DataRow, TableTotals } from "@/types/dataSource";
import { fetchTableTotals } from "@/queries/dataSourceQueries";
import { generatePdf, ReportGenerationError } from "../../services/reportService";
import { fetchTableRows } from "@/composables/useTableRows";
import { TABLE_ROWS_LIMIT } from "@/constants/reportDataConstants";
import { collectBoundTables } from "@/utils/table/tableDocument";
import { activeFilters, describeFilter, describeSorts } from "@/utils/table/summary";
import { resolveLook } from "@/utils/table/tableThemes";
import notification from "../../utils/notification";

const { t, locale } = useI18n();

const props = defineProps<{
  visible: boolean;
  jrxmlContent: string;
  bands: Band[];
}>();

const emit = defineEmits<{
  "update:visible": [visible: boolean];
  // Close the preview and open this table's Configure popup
  "edit-table": [uuid: string];
  // Close the preview and open this chart's Set up data popup
  "edit-chart": [uuid: string];
}>();

const showTables = ref(true);
const isGenerating = ref(false);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const previewUrl = ref<string>("about:blank");
let previewController: AbortController | null = null;

const tables = computed(() =>
  collectBoundTables(props.bands).map((table) => ({ table, binding: table.binding })),
);

// Tables (with data) and charts as they come in the report: band by band,
// then page, top to bottom, left to right (items in boxes at their place)
type DataItem =
  | { kind: "table"; element: DesignElement; table: (typeof tables.value)[number]["table"]; binding: TableDataBinding }
  | { kind: "chart"; element: ChartElement; number: number };

const dataItems = computed<DataItem[]>(() => {
  const items: DataItem[] = [];
  let charts = 0;
  for (const band of props.bands) {
    const found: { element: DesignElement; page: number; y: number; x: number }[] = [];
    const visit = (elements: DesignElement[] | undefined, dx: number, dy: number, page?: number) => {
      for (const el of elements ?? []) {
        const at = { page: (el as any).pageIndex ?? page ?? 0, y: dy + el.y, x: dx + el.x };
        if (el.type === "chart" || (el.type === "table" && (el as any).binding)) found.push({ element: el, ...at });
        if (el.type === "frame") visit((el as FrameElement).elements, at.x, at.y, at.page);
      }
    };
    visit(band.elements, 0, 0);
    found.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
    for (const { element } of found) {
      if (element.type === "chart") items.push({ kind: "chart", element: element as ChartElement, number: ++charts });
      else {
        const table = tables.value.find((t) => t.table === element);
        if (table) items.push({ kind: "table", element, table: table.table, binding: table.binding });
      }
    }
  }
  return items;
});

// Rows per table, by dataset name (the report reads them by that name)
interface TableRowsState {
  rows: DataRow[];
  totalCount: number;
  totals: TableTotals;
  loading: boolean;
  failed: boolean;
}
const tableRows = reactive<Record<string, TableRowsState>>({});

function rowCountText(datasetName: string): string {
  const state = tableRows[datasetName];
  if (!state || state.loading) return t("dataTable.loading");
  if (state.failed) return t("dataTable.loadFailed");
  if (state.totalCount > state.rows.length) {
    return t("pdfPreview.tables.rowsCapped", { shown: state.rows.length, count: state.totalCount });
  }
  return t("dataTable.config.rowCount", state.rows.length);
}

// Every table's rows, fetched side by side; one failing doesn't stop the others
async function loadAllRows(): Promise<void> {
  Object.keys(tableRows).forEach((k) => delete tableRows[k]);
  await Promise.all(
    tables.value.map(async ({ binding }) => {
      const state: TableRowsState = { rows: [], totalCount: 0, totals: {}, loading: true, failed: false };
      tableRows[binding.datasetName] = state;
      try {
        const [result, totals] = await Promise.all([fetchTableRows(binding, TABLE_ROWS_LIMIT), fetchTableTotals(binding)]);
        tableRows[binding.datasetName] = { ...state, rows: result.rows, totalCount: result.totalCount, totals, loading: false };
      } catch {
        tableRows[binding.datasetName] = { ...state, loading: false, failed: true };
      }
    }),
  );
}

function setPreviewUrl(url: string) {
  if (previewUrl.value.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = url;
}

async function generatePreview() {
  // Cancel an in-flight request so a slower, older response can't overwrite a newer one
  previewController?.abort();
  const controller = new AbortController();
  previewController = controller;
  isGenerating.value = true;

  try {
    // Only the JRXML: the report server fetches the tables' rows and the
    // charts' numbers from the setups inside it
    const pdf = await generatePdf({ jrxml: props.jrxmlContent }, controller.signal);
    if (controller.signal.aborted) return;
    setPreviewUrl(URL.createObjectURL(pdf));
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    // 401 is already handled by apiClient (redirect to login)
    if (error instanceof ReportGenerationError && error.status === 401) return;
    // Server messages are shown as sent; the fallback is translated
    notification.error((error as Error).message || t("pdfPreview.generationFailed"));
  } finally {
    if (previewController === controller) {
      previewController = null;
      isGenerating.value = false;
    }
  }
}

function editTable(uuid: string) {
  emit("update:visible", false);
  emit("edit-table", uuid);
}

function editChart(uuid: string) {
  emit("update:visible", false);
  emit("edit-chart", uuid);
}

const closeModal = () => {
  emit("update:visible", false);
};

onUnmounted(() => {
  previewController?.abort();
  setPreviewUrl("about:blank");
});

// Opening the preview builds the PDF and, side by side, fetches every
// table's rows for the panel (they are shown here, not sent)
watch(
  () => props.visible,
  (open) => {
    if (!open) {
      previewController?.abort();
      return;
    }
    setPreviewUrl("about:blank");
    generatePreview();
    loadAllRows();
  },
  { immediate: true },
);
</script>

<style scoped>
:deep(.modal-header) {
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  align-items: center;
  gap: 12px;
}

.pdf-preview-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: 100%;
}

.tables-panel {
  width: 440px;
  min-width: 440px;
  border-right: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fafbfc;
}

.tables-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.tables-head h4 {
  margin: 0;
  font-size: 13px;
}

.tables-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.server-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0 0 12px;
  font-size: 11px;
  line-height: 1.4;
  color: #6b7280;
}

.server-note svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.table-card {
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
  font-size: 13px;
  color: #1f2937;
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

.muted {
  font-size: 11px;
  color: #9ca3af;
}

.empty-hint {
  color: var(--text-color-3, #999);
  text-align: center;
  padding: 40px 20px;
  font-size: 13px;
}

.panel-toggle {
  width: 18px;
  min-width: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--bg-color, #fafafa);
  border: none;
  border-left: 1px solid var(--border-color, #e0e0e0);
  border-right: 1px solid var(--border-color, #e0e0e0);
  color: var(--text-color-3, #999);
  transition: background 0.2s;
}

.panel-toggle:hover {
  background: var(--hover-color, #f0f0f0);
}

.pdf-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pdf-toolbar {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  display: flex;
  justify-content: flex-end;
}

.pdf-iframe {
  flex: 1;
  width: 100%;
  border: none;
}
</style>
