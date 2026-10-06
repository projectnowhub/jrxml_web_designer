<template>
  <!-- Backend sources: drag one (or one of its columns) onto a table -->
  <div class="tdl">
    <div class="tdl-head">
      <h4>{{ t("dataTable.library.title") }}</h4>
      <button
        type="button"
        class="tdl-icon-btn"
        :title="t('dataTable.library.reload')"
        :aria-label="t('dataTable.library.reload')"
        @click="load(true)"
      >
        <RefreshCw :size="13" :class="{ spinning: loading }" />
      </button>
    </div>

    <label class="tdl-search">
      <Search :size="13" aria-hidden="true" />
      <input v-model="query" type="text" :placeholder="t('dataTable.library.search')" />
    </label>

    <p class="tdl-hint">{{ t("dataTable.library.hint") }}</p>

    <div v-if="failed" class="tdl-message is-error">
      {{ t("dataTable.loadFailed") }}
      <button type="button" class="tdl-link" @click="load(true)">{{ t("dataTable.library.retry") }}</button>
    </div>
    <div v-else-if="loading && !sources.length" class="tdl-message">{{ t("dataTable.loading") }}</div>
    <div v-else-if="!visibleSources.length" class="tdl-message">{{ t("dataTable.library.noMatch") }}</div>

    <ul class="tdl-sources">
      <li v-for="source in visibleSources" :key="source.id" class="tdl-source">
        <div
          class="tdl-source-row"
          draggable="true"
          :title="t('dataTable.library.dragSource')"
          @dragstart="dragSource($event, source)"
          @dragend="endDataSourceDrag"
        >
          <button
            type="button"
            class="tdl-icon-btn"
            :aria-expanded="!!expanded[source.id]"
            :aria-label="t(expanded[source.id] ? 'dataTable.library.collapse' : 'dataTable.library.expand')"
            @click="toggle(source.id)"
          >
            <component :is="expanded[source.id] ? ChevronDown : ChevronRight" :size="13" />
          </button>
          <Database :size="14" class="tdl-db" aria-hidden="true" />
          <span class="tdl-name">{{ source.name }}</span>
          <span class="tdl-count">{{ t("dataTable.library.rows", source.rowCount) }}</span>
          <GripVertical :size="13" class="tdl-grip" aria-hidden="true" />
        </div>

        <div v-if="usedBy(source.id).length" class="tdl-used">
          {{ t("dataTable.library.usedIn", { tables: usedBy(source.id).join(", ") }) }}
        </div>

        <ul v-if="expanded[source.id]" class="tdl-columns">
          <li v-if="!schemas[source.id]" class="tdl-message">{{ t("dataTable.loading") }}</li>
          <li
            v-for="col in schemas[source.id]?.columns ?? []"
            :key="col.key"
            class="tdl-column"
            draggable="true"
            :title="t('dataTable.library.dragColumn')"
            @dragstart="dragColumn($event, source, col)"
            @dragend="endDataSourceDrag"
          >
            <component :is="TYPE_ICONS[col.type]" :size="12" class="tdl-type" aria-hidden="true" />
            <span class="tdl-name">{{ col.label }}</span>
            <span class="tdl-type-name">{{ t(`dataTable.types.${col.type}`) }}</span>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, type Component } from "vue";
import { useI18n } from "vue-i18n";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Database,
  DollarSign,
  GripVertical,
  Hash,
  RefreshCw,
  Search,
  Type,
} from "@lucide/vue";
import { clearSchemaCache, getSchema, listSources } from "@/services/dataSourceService";
import { clearTableRowsCache } from "@/composables/useTableRows";
import { endDataSourceDrag, startDataSourceDrag } from "@/utils/table/dataDrag";
import { collectBoundTables } from "@/utils/table/tableDocument";
import type { Band } from "@/types";
import type { DataColumn, DataColumnType, DataSourceSchema, DataSourceSummary } from "@/types/dataSource";

const props = defineProps<{ bands: Band[] }>();

const { t } = useI18n();

const TYPE_ICONS: Record<DataColumnType, Component> = {
  text: Type,
  number: Hash,
  currency: DollarSign,
  date: Calendar,
};

const sources = ref<DataSourceSummary[]>([]);
const schemas = reactive<Record<string, DataSourceSchema | undefined>>({});
const expanded = reactive<Record<string, boolean>>({});
const loading = ref(false);
const failed = ref(false);
const query = ref("");

async function load(fresh = false) {
  if (fresh) {
    clearSchemaCache();
    clearTableRowsCache();
    Object.keys(schemas).forEach((k) => delete schemas[k]);
  }
  loading.value = true;
  failed.value = false;
  try {
    sources.value = await listSources();
    Object.keys(expanded).forEach((id) => expanded[id] && loadSchema(id));
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadSchema(id: string) {
  if (schemas[id]) return;
  try {
    schemas[id] = await getSchema(id);
  } catch {
    expanded[id] = false;
  }
}

function toggle(id: string) {
  expanded[id] = !expanded[id];
  if (expanded[id]) loadSchema(id);
}

onMounted(() => load());

// Search matches a source's name or one of its (loaded) columns
const visibleSources = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return sources.value;
  return sources.value.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      schemas[s.id]?.columns.some((c) => c.label.toLowerCase().includes(q)),
  );
});

// Tables on the report that show each source
const tablesBySource = computed(() => {
  const map: Record<string, string[]> = {};
  for (const table of collectBoundTables(props.bands)) {
    (map[table.binding.sourceId] ??= []).push(table.binding.tableName);
  }
  return map;
});
const usedBy = (id: string) => tablesBySource.value[id] ?? [];

function dragSource(event: DragEvent, source: DataSourceSummary) {
  startDataSourceDrag(event, { kind: "source", sourceId: source.id, sourceName: source.name });
}

function dragColumn(event: DragEvent, source: DataSourceSummary, column: DataColumn) {
  event.stopPropagation();
  startDataSourceDrag(event, { kind: "column", sourceId: source.id, sourceName: source.name, column });
}
</script>

<style scoped>
.tdl {
  padding: 10px 0;
}

.tdl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tdl-head h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.tdl-search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 6px;
  padding: 0 8px;
  height: 30px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  background: #fff;
  color: #9ca3af;
}

.tdl-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 12px;
  background: transparent;
  color: #1f2937;
}

.tdl-hint {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.4;
  color: #9ca3af;
}

.tdl-sources,
.tdl-columns {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tdl-source {
  margin-bottom: 4px;
}

.tdl-source-row,
.tdl-column {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 6px;
  border-radius: 6px;
  font-size: 12px;
  cursor: grab;
  user-select: none;
}

.tdl-source-row {
  border: 1px solid var(--prop-border-color, #e5e7eb);
  background: #fff;
}

.tdl-source-row:hover,
.tdl-column:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.tdl-column {
  margin-left: 22px;
  border: 1px solid transparent;
}

.tdl-db {
  color: #2563eb;
  flex-shrink: 0;
}

.tdl-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2937;
}

.tdl-source-row .tdl-name {
  font-weight: 600;
}

.tdl-count,
.tdl-type-name {
  flex-shrink: 0;
  font-size: 10.5px;
  color: #9ca3af;
}

.tdl-type,
.tdl-grip {
  flex-shrink: 0;
  color: #9ca3af;
}

.tdl-used {
  margin: 2px 0 0 28px;
  font-size: 10.5px;
  color: #059669;
}

.tdl-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
}

.tdl-icon-btn:hover {
  background: #eef0f4;
}

.tdl-message {
  padding: 8px 4px;
  font-size: 12px;
  font-style: italic;
  color: #9ca3af;
}

.tdl-message.is-error {
  color: #dc2626;
  font-style: normal;
}

.tdl-link {
  margin-left: 4px;
  padding: 0;
  border: none;
  background: none;
  color: #2563eb;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
}

.spinning {
  animation: tdl-spin 0.9s linear infinite;
}

@keyframes tdl-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
