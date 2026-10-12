<template>
  <!-- The report's projects (chosen in the header): drag a detail (name, logo…) onto the page, or a
       table source (or one column) onto a table -->
  <div class="rdp">
    <div class="rdp-head">
      <h4>{{ t("reportData.title") }}</h4>
      <button
        type="button"
        class="rdp-icon-btn"
        :title="t('reportData.reload')"
        :aria-label="t('reportData.reload')"
        @click="reload"
      >
        <RefreshCw :size="13" :class="{ spinning: reloading }" />
      </button>
    </div>

    <p v-if="!projects.length" class="rdp-hint">{{ t("reportData.noProjects") }}</p>

    <template v-else>
      <!-- One tab per project (its logo and short code; the full name in the
           tooltip and below): the same tables in each, with that project's data.
           Tabs wrap onto more rows in the narrow panel. -->
      <div class="rdp-tabs" role="tablist" :aria-label="t('reportData.projectTabs')" @keydown="onTabKeydown">
        <button
          v-for="project in projects"
          :key="project.id"
          :ref="(el) => (tabRefs[project.id] = el as HTMLElement | null)"
          type="button"
          role="tab"
          class="rdp-tab"
          :class="{ active: project.id === activeId }"
          :aria-selected="project.id === activeId"
          :tabindex="project.id === activeId ? 0 : -1"
          :title="project.name"
          @click="activeId = project.id"
        >
          <img v-if="logoOf(project.id)" :src="logoOf(project.id)!" class="rdp-tab-logo" alt="" />
          <FolderKanban v-else :size="13" aria-hidden="true" />
          <span class="rdp-tab-name">{{ details[project.id]?.code || project.name }}</span>
        </button>
      </div>

      <label class="rdp-search">
        <Search :size="13" aria-hidden="true" />
        <input v-model="query" type="text" :placeholder="t('reportData.search')" />
      </label>
      <p class="rdp-hint">{{ t("reportData.hint") }}</p>
    </template>

    <!-- The chosen tab's project: its details and its tables -->
    <section v-if="activeProject" :key="activeProject.id" class="rdp-project" role="tabpanel">
      <div class="rdp-project-head">
        <span class="rdp-name">{{ activeProject.name }}</span>
        <span class="rdp-meta">{{ details[activeProject.id]?.code }}</span>
      </div>

      <div v-for="project in [activeProject]" :key="project.id" class="rdp-project-body">
        <div v-if="failed[project.id]" class="rdp-message is-error">
          {{ t("reportData.loadFailed") }}
          <button type="button" class="rdp-link" @click="loadProject(project.id)">{{ t("reportData.retry") }}</button>
        </div>
        <div v-else-if="!details[project.id]" class="rdp-message">{{ t("dataTable.loading") }}</div>

        <template v-else>
          <!-- Details: text items (the logo an image item) -->
          <div v-if="visibleFields(project.id).length" class="rdp-group">{{ t("reportData.details") }}</div>
          <ul class="rdp-list">
            <li
              v-for="field in visibleFields(project.id)"
              :key="field.key"
              class="rdp-item"
              draggable="true"
              :title="t(field.type === 'image' ? 'reportData.dragImage' : 'reportData.dragDetail')"
              @dragstart="dragField($event, project, field)"
              @dragend="endDataSourceDrag"
            >
              <component :is="FIELD_ICONS[field.type]" :size="12" class="rdp-type" aria-hidden="true" />
              <span class="rdp-name">{{ field.label }}</span>
              <img
                v-if="field.type === 'image' && valueOf(project.id, field.key)"
                :src="valueOf(project.id, field.key)!"
                class="rdp-thumb"
                alt=""
              />
              <span v-else class="rdp-value" :title="valueOf(project.id, field.key) ?? ''">
                {{ valueOf(project.id, field.key) }}
              </span>
              <GripVertical :size="12" class="rdp-grip" aria-hidden="true" />
            </li>
          </ul>

          <!-- Tables: drag onto a table or the Detail section -->
          <div v-if="visibleSources(project.id).length" class="rdp-group">{{ t("reportData.tables") }}</div>
          <ul class="rdp-list">
            <li v-for="source in visibleSources(project.id)" :key="source.id">
              <div
                class="rdp-item is-source"
                draggable="true"
                :title="t('reportData.dragSource')"
                @dragstart="dragSource($event, project, source)"
                @dragend="endDataSourceDrag"
              >
                <button
                  type="button"
                  class="rdp-icon-btn"
                  :aria-expanded="!!expanded[sourceKey(project.id, source.id)]"
                  :aria-label="t(expanded[sourceKey(project.id, source.id)] ? 'reportData.collapse' : 'reportData.expand')"
                  @click="toggleSource(project.id, source.id)"
                >
                  <component
                    :is="expanded[sourceKey(project.id, source.id)] ? ChevronDown : ChevronRight"
                    :size="13"
                  />
                </button>
                <Database :size="13" class="rdp-accent" aria-hidden="true" />
                <span class="rdp-name">{{ source.name }}</span>
                <span class="rdp-meta">{{ t("reportData.rows", source.rowCount) }}</span>
                <GripVertical :size="12" class="rdp-grip" aria-hidden="true" />
              </div>

              <div v-if="usedBy(project.id, source.id).length" class="rdp-used">
                {{ t("reportData.usedIn", { tables: usedBy(project.id, source.id).join(", ") }) }}
              </div>

              <ul v-if="expanded[sourceKey(project.id, source.id)]" class="rdp-list rdp-columns">
                <li v-if="!schemas[sourceKey(project.id, source.id)]" class="rdp-message">
                  {{ t("dataTable.loading") }}
                </li>
                <li
                  v-for="col in schemas[sourceKey(project.id, source.id)]?.columns ?? []"
                  :key="col.key"
                  class="rdp-item"
                  draggable="true"
                  :title="t('reportData.dragColumn')"
                  @dragstart="dragColumn($event, project, source, col)"
                  @dragend="endDataSourceDrag"
                >
                  <component :is="COLUMN_ICONS[col.type]" :size="12" class="rdp-type" aria-hidden="true" />
                  <span class="rdp-name">{{ col.label }}</span>
                  <span class="rdp-meta">{{ t(`dataTable.types.${col.type}`) }}</span>
                </li>
              </ul>
            </li>
          </ul>

          <div
            v-if="query.trim() && !visibleFields(project.id).length && !visibleSources(project.id).length"
            class="rdp-message"
          >
            {{ t("reportData.noMatch") }}
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch, type Component } from "vue";
import { useI18n } from "vue-i18n";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Database,
  DollarSign,
  FolderKanban,
  GripVertical,
  Hash,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Type,
} from "@lucide/vue";
import {
  clearSchemaCache,
  getProject,
  getSchema,
  listSources,
} from "@/services/dataSourceService";
import { clearTableRowsCache } from "@/composables/useTableRows";
import { endDataSourceDrag, startDataSourceDrag } from "@/utils/table/dataDrag";
import { collectBoundTables } from "@/utils/table/tableDocument";
import { clearChartDataCache } from "@/utils/chart/chartDataStore";
import { isChartBound, normalizeChartBinding } from "@/utils/chart/chartTypes";
import type { Band } from "@/types";
import type {
  DataColumn,
  DataColumnType,
  DataSourceSchema,
  DataSourceSummary,
  ProjectDetails,
  ProjectField,
  ProjectFieldType,
  ReportProject,
} from "@/types/dataSource";

// The projects are chosen in the designer's header
const props = defineProps<{ bands: Band[]; projects: ReportProject[] }>();

const { t } = useI18n();

// The element a detail becomes: long texts are Text elements too
const FIELD_ICONS: Record<ProjectFieldType, Component> = {
  text: Type,
  longText: Type,
  image: ImageIcon,
};

const COLUMN_ICONS: Record<DataColumnType, Component> = {
  text: Type,
  number: Hash,
  currency: DollarSign,
  date: Calendar,
};

// ---- Each project's details and sources -----------------------------------

const details = reactive<Record<string, ProjectDetails | undefined>>({});
const sources = reactive<Record<string, DataSourceSummary[]>>({});
const failed = reactive<Record<string, boolean>>({});
const schemas = reactive<Record<string, DataSourceSchema | undefined>>({});
const expanded = reactive<Record<string, boolean>>({});
const query = ref("");
const reloading = ref(false);

const sourceKey = (projectId: string, sourceId: string) => `${projectId}/${sourceId}`;

async function loadProject(id: string) {
  failed[id] = false;
  try {
    const [loadedDetails, loadedSources] = await Promise.all([getProject(id), listSources(id)]);
    details[id] = loadedDetails;
    sources[id] = loadedSources;
  } catch {
    failed[id] = true;
  }
}

async function loadSchema(projectId: string, sourceId: string) {
  const key = sourceKey(projectId, sourceId);
  if (schemas[key]) return;
  try {
    schemas[key] = await getSchema(projectId, sourceId);
  } catch {
    expanded[key] = false;
  }
}

function toggleSource(projectId: string, sourceId: string) {
  const key = sourceKey(projectId, sourceId);
  expanded[key] = !expanded[key];
  if (expanded[key]) loadSchema(projectId, sourceId);
}

// ---- Tabs: one project shown at a time ------------------------------------

const activeId = ref("");
const activeProject = computed(() => props.projects.find((p) => p.id === activeId.value));
const tabRefs: Record<string, HTMLElement | null> = {};

// Load newly chosen projects; a project just added opens in its tab, and
// when the open one is removed the first one opens
watch(
  () => props.projects.map((p) => p.id),
  (ids, before) => {
    ids.forEach((id) => {
      if (!details[id] && !failed[id]) loadProject(id);
    });
    const added = before ? ids.filter((id) => !before.includes(id)) : [];
    if (added.length) activeId.value = added[added.length - 1]!;
    else if (!ids.includes(activeId.value)) activeId.value = ids[0] ?? "";
  },
  { immediate: true },
);

// Left / right arrows (and Home / End) move between tabs
function onTabKeydown(event: KeyboardEvent) {
  const ids = props.projects.map((p) => p.id);
  const at = ids.indexOf(activeId.value);
  const next =
    event.key === "ArrowRight" ? ids[(at + 1) % ids.length]
    : event.key === "ArrowLeft" ? ids[(at - 1 + ids.length) % ids.length]
    : event.key === "Home" ? ids[0]
    : event.key === "End" ? ids[ids.length - 1]
    : undefined;
  if (!next) return;
  event.preventDefault();
  activeId.value = next;
  nextTick(() => {
    tabRefs[next]?.focus();
  });
}

// Fetch everything again (e.g. after the backend changed a project)
async function reload() {
  reloading.value = true;
  clearSchemaCache();
  clearTableRowsCache();
  clearChartDataCache();
  Object.keys(details).forEach((k) => delete details[k]);
  Object.keys(schemas).forEach((k) => delete schemas[k]);
  try {
    await Promise.all([
      ...props.projects.map((p) => loadProject(p.id)),
    ]);
    Object.keys(expanded).forEach((key) => {
      const [projectId, sourceId] = key.split("/");
      if (expanded[key] && projectId && sourceId) loadSchema(projectId, sourceId);
    });
  } finally {
    reloading.value = false;
  }
}

const valueOf = (projectId: string, key: string) => details[projectId]?.values[key] ?? null;
const logoOf = (projectId: string) => {
  const logo = details[projectId]?.fields.find((f) => f.type === "image");
  return logo ? valueOf(projectId, logo.key) : null;
};

// Search matches a detail, a source or one of its (loaded) columns
const matches = (text: string) => text.toLowerCase().includes(query.value.trim().toLowerCase());

const visibleFields = (projectId: string): ProjectField[] =>
  (details[projectId]?.fields ?? []).filter((f) => !query.value.trim() || matches(f.label));

const visibleSources = (projectId: string): DataSourceSummary[] =>
  (sources[projectId] ?? []).filter(
    (s) =>
      !query.value.trim() ||
      matches(s.name) ||
      !!schemas[sourceKey(projectId, s.id)]?.columns.some((c) => matches(c.label)),
  );

// Tables and charts on the report that show each source (a chart by its
// title, or its type when it has none)
const tablesBySource = computed(() => {
  const map: Record<string, string[]> = {};
  for (const table of collectBoundTables(props.bands)) {
    const key = sourceKey(table.binding.projectId, table.binding.sourceId);
    (map[key] ??= []).push(table.binding.tableName);
  }
  for (const band of props.bands) {
    for (const el of band.elements ?? []) {
      for (const item of el.type === "frame" ? [el, ...(el.elements ?? [])] : [el]) {
        if (item.type !== "chart") continue;
        const chart = normalizeChartBinding(item.binding);
        if (!isChartBound(chart)) continue;
        const key = sourceKey(chart.projectId!, chart.sourceId!);
        (map[key] ??= []).push(chart.title.trim() || t(`chart.types.${chart.chartType}`));
      }
    }
  }
  return map;
});
const usedBy = (projectId: string, sourceId: string) =>
  tablesBySource.value[sourceKey(projectId, sourceId)] ?? [];

// ---- Dragging ---------------------------------------------------------------

function dragField(event: DragEvent, project: ReportProject, field: ProjectField) {
  startDataSourceDrag(event, {
    kind: "projectField",
    projectId: project.id,
    projectName: project.name,
    field: { ...field },
    value: valueOf(project.id, field.key),
  });
}

function dragSource(event: DragEvent, project: ReportProject, source: DataSourceSummary) {
  startDataSourceDrag(event, {
    kind: "source",
    projectId: project.id,
    projectName: project.name,
    sourceId: source.id,
    sourceName: source.name,
  });
}

function dragColumn(
  event: DragEvent,
  project: ReportProject,
  source: DataSourceSummary,
  column: DataColumn,
) {
  event.stopPropagation();
  startDataSourceDrag(event, {
    kind: "column",
    projectId: project.id,
    projectName: project.name,
    sourceId: source.id,
    sourceName: source.name,
    column,
  });
}

</script>

<style scoped>
.rdp {
  padding: 10px 0;
}

.rdp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rdp-head h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.rdp-group {
  display: block;
  margin: 10px 0 4px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9ca3af;
}

.rdp-group {
  margin: 8px 0 2px 2px;
}

.rdp-search {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 6px;
  padding: 0 8px;
  height: 30px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  background: #fff;
  color: #9ca3af;
}


.rdp-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 12px;
  background: transparent;
  color: #1f2937;
}

.rdp-hint {
  margin: 6px 0 8px;
  font-size: 11px;
  line-height: 1.4;
  color: #9ca3af;
}

/* Project tabs: equal columns, wrapping onto more rows; a tab alone on the
   last row keeps its column's width */
.rdp-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 4px;
  margin: 10px 0 0;
  padding: 3px;
  border-radius: 8px;
  background: #f3f4f6;
}

.rdp-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  font-size: 11.5px;
  color: #6b7280;
  cursor: pointer;
}

.rdp-tab:hover {
  color: #1f2937;
  background: rgba(255, 255, 255, 0.6);
}

.rdp-tab.active {
  border-color: #bfdbfe;
  background: #fff;
  color: #1d4ed8;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
}

.rdp-tab:focus-visible {
  outline: 2px solid #93c5fd;
  outline-offset: -2px;
}

.rdp-tab svg {
  flex-shrink: 0;
  color: #2563eb;
}

.rdp-tab-logo {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  object-fit: cover;
  flex-shrink: 0;
}

.rdp-tab-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rdp-project {
  margin-bottom: 6px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 8px;
  background: #fff;
}

/* The open project's full name and code */
.rdp-project-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px 2px;
  font-size: 12px;
}

.rdp-project-head .rdp-name {
  font-weight: 600;
  white-space: normal;
}

.rdp-project-body {
  padding: 0 6px 6px;
}

.rdp-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rdp-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 12px;
  cursor: grab;
  user-select: none;
}

.rdp-item:hover {
  border-color: #93c5fd;
  background: #eff6ff;
}

.rdp-item.is-source {
  padding-left: 2px;
}

.rdp-columns .rdp-item {
  margin-left: 22px;
}

.rdp-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f2937;
}

.rdp-value {
  flex: 0 1 45%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: #6b7280;
}

.rdp-thumb {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  object-fit: cover;
}

.rdp-meta {
  flex-shrink: 0;
  font-size: 10.5px;
  color: #9ca3af;
}

.rdp-accent {
  flex-shrink: 0;
  color: #2563eb;
}

.rdp-type,
.rdp-grip {
  flex-shrink: 0;
  color: #9ca3af;
}

.rdp-used {
  margin: 1px 0 2px 28px;
  font-size: 10.5px;
  color: #059669;
}

.rdp-icon-btn {
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

.rdp-icon-btn:hover {
  background: #eef0f4;
}

.rdp-message {
  padding: 6px 4px;
  font-size: 12px;
  font-style: italic;
  color: #9ca3af;
}

.rdp-message.is-error {
  color: #dc2626;
  font-style: normal;
}

.rdp-link {
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
  animation: rdp-spin 0.9s linear infinite;
}

@keyframes rdp-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
