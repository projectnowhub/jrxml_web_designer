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
      <!-- The report's tables and the rows each one prints (read-only) -->
      <div class="tables-panel" v-show="showTables">
        <div class="tables-head">
          <h4>{{ t("pdfPreview.tables.title") }}</h4>
          <span class="muted">{{ t("pdfPreview.tables.readOnly") }}</span>
        </div>
        <div class="tables-list">
          <div v-if="!tables.length" class="empty-hint">{{ t("pdfPreview.tables.none") }}</div>
          <section v-for="item in tables" :key="item.table.uuid" class="table-card">
            <div class="card-head">
              <div class="card-title">
                <Table2 :size="14" aria-hidden="true" />
                <strong>{{ item.binding.tableName }}</strong>
              </div>
              <n-button size="tiny" quaternary @click="editTable(item.table.uuid ?? '')">
                <template #icon><SquarePen :size="13" /></template>
                {{ t("pdfPreview.tables.edit") }}
              </n-button>
            </div>
            <div class="card-source">
              <Database :size="12" aria-hidden="true" />
              {{ item.binding.sourceName }}
              <span class="muted">· {{ rowCountText(item.binding.datasetName) }}</span>
            </div>
            <div class="chips">
              <span class="chip">{{ t("dataTable.panel.columnCount", item.binding.columns.length) }}</span>
              <span v-for="(f, i) in activeFilters(item.binding)" :key="`f${i}`" class="chip is-filter">
                <Funnel :size="10" aria-hidden="true" />{{ describeFilter(item.binding, f, t) }}
              </span>
              <span v-for="(s, i) in describeSorts(item.binding)" :key="`s${i}`" class="chip">
                {{ s.label }}
                <component :is="s.direction === 'asc' ? ArrowUp : ArrowDown" :size="10" aria-hidden="true" />
              </span>
              <span v-if="item.binding.rowLimit" class="chip">
                {{ t("dataTable.panel.firstRows", item.binding.rowLimit) }}
              </span>
            </div>
            <div class="card-grid">
              <DataGrid
                :columns="item.binding.columns"
                :rows="tableRows[item.binding.datasetName]?.rows ?? []"
                :theme="item.binding.theme"
                :report-styles="reportStyles"
                :show-totals="item.binding.showTotals"
                :loading="tableRows[item.binding.datasetName]?.loading"
                :failed="tableRows[item.binding.datasetName]?.failed"
              />
            </div>
          </section>
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
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Database,
  Funnel,
  RefreshCw,
  SquarePen,
  Table2,
} from "@lucide/vue";
import BaseModal from "./BaseModal.vue";
import DataGrid from "../common/DataGrid.vue";
import { ref, computed, watch, onUnmounted, reactive } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import type { Band, ReportField, ReportParameter, ReportStyle } from "../../types";
import type { DataRow } from "@/types/dataSource";
import { generateMockParameters, generateMockDataSource } from "../../utils/mockDataGenerator";
import { generatePdf, ReportGenerationError } from "../../services/reportService";
import { fetchTableRows } from "@/composables/useTableRows";
import { PREVIEW_ROW_LIMIT } from "@/utils/table/dataBinding";
import { collectBoundTables } from "@/utils/table/tableDocument";
import { activeFilters, describeFilter, describeSorts } from "@/utils/table/summary";
import notification from "../../utils/notification";

const { t } = useI18n();

const props = defineProps<{
  visible: boolean;
  jrxmlContent: string;
  bands: Band[];
  reportStyles: ReportStyle[];
  reportParameters?: ReportParameter[];
  reportFields?: ReportField[];
}>();

const emit = defineEmits<{
  "update:visible": [visible: boolean];
  // Close the preview and open this table's Configure popup
  "edit-table": [uuid: string];
}>();

const showTables = ref(true);
const isGenerating = ref(false);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const previewUrl = ref<string>("about:blank");
let previewController: AbortController | null = null;

const tables = computed(() =>
  collectBoundTables(props.bands).map((table) => ({ table, binding: table.binding })),
);

// Rows per table, by dataset name (the report reads them by that name)
interface TableRowsState {
  rows: DataRow[];
  totalCount: number;
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
      const state: TableRowsState = { rows: [], totalCount: 0, loading: true, failed: false };
      tableRows[binding.datasetName] = state;
      try {
        const result = await fetchTableRows(binding, PREVIEW_ROW_LIMIT);
        tableRows[binding.datasetName] = { ...state, rows: result.rows, totalCount: result.totalCount, loading: false };
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
    const subDataSources: Record<string, DataRow[]> = {};
    for (const [name, state] of Object.entries(tableRows)) {
      if (!state.failed) subDataSources[name] = state.rows;
    }
    const pdf = await generatePdf(
      {
        jrxml: props.jrxmlContent,
        // Fill-in values for anything else the report reads, so it still prints
        parameters: generateMockParameters(props.reportParameters || []),
        // One row: the Detail section (where tables live) prints once
        dataSource: generateMockDataSource(props.reportFields || [], 1),
        subDataSources,
      },
      controller.signal,
    );
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

const closeModal = () => {
  emit("update:visible", false);
};

onUnmounted(() => {
  previewController?.abort();
  setPreviewUrl("about:blank");
});

// Opening the preview fetches every table's rows, then builds the PDF
watch(
  () => props.visible,
  async (open) => {
    if (!open) {
      previewController?.abort();
      return;
    }
    setPreviewUrl("about:blank");
    await loadAllRows();
    if (props.visible) generatePreview();
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

.chip.is-filter {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
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
