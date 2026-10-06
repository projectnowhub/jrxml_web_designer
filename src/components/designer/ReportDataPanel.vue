<template>
  <!-- The report's projects: drag a detail (name, logo…) onto the page, or a
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

    <!-- Chosen projects: one select field, several projects allowed -->
    <label class="rdp-label" for="rdp-project-select">{{ t("reportData.projects") }}</label>
    <Multiselect
      :key="selectKey"
      class="rdp-project-select"
      mode="tags"
      :attrs="{ id: 'rdp-project-select' }"
      :model-value="projects.map((p) => p.id)"
      :options="projectOptions"
      :searchable="true"
      :close-on-select="false"
      :hide-selected="false"
      :can-clear="false"
      :loading="!allProjects.length && !allProjectsFailed"
      :placeholder="t('reportData.chooseProjects')"
      :no-options-text="allProjectsFailed ? t('reportData.loadFailed') : t('dataTable.loading')"
      :no-results-text="t('reportData.noProjectMatch')"
      @update:model-value="selectProjects"
    >
      <template #tag="{ option, handleTagRemove }">
        <span class="rdp-tag">
          <FolderKanban :size="12" aria-hidden="true" />
          <span class="rdp-tag-name" :title="option.label">{{ option.label }}</span>
          <button
            type="button"
            class="rdp-tag-remove"
            :title="t('reportData.removeProject', { project: option.label })"
            :aria-label="t('reportData.removeProject', { project: option.label })"
            @mousedown.prevent.stop="handleTagRemove(option, $event)"
          >
            <X :size="11" />
          </button>
        </span>
      </template>
      <template #option="{ option, isSelected }">
        <span class="rdp-option">
          <span class="rdp-option-check" :class="{ 'is-on': isSelected(option) }">
            <Check v-if="isSelected(option)" :size="11" :stroke-width="3" />
          </span>
          <span class="rdp-name">{{ option.label }}</span>
          <span class="rdp-meta">{{ option.code }}</span>
        </span>
      </template>
      <template #spinner>
        <LoaderCircle class="rdp-spinner spinning" :size="14" aria-hidden="true" />
      </template>
      <template #caret="{ handleCaretClick, isOpen }">
        <ChevronDown
          class="rdp-caret"
          :class="{ 'is-open': isOpen }"
          :size="15"
          aria-hidden="true"
          @mousedown.prevent="handleCaretClick"
        />
      </template>
    </Multiselect>
    <div v-if="allProjectsFailed" class="rdp-message is-error">
      {{ t("reportData.loadFailed") }}
      <button type="button" class="rdp-link" @click="loadAllProjects">{{ t("reportData.retry") }}</button>
    </div>

    <p v-if="!projects.length" class="rdp-hint">{{ t("reportData.noProjects") }}</p>

    <template v-else>
      <label class="rdp-search">
        <Search :size="13" aria-hidden="true" />
        <input v-model="query" type="text" :placeholder="t('reportData.search')" />
      </label>
      <p class="rdp-hint">{{ t("reportData.hint") }}</p>
    </template>

    <!-- Each project: its details and its tables -->
    <section v-for="project in projects" :key="project.id" class="rdp-project">
      <button
        type="button"
        class="rdp-project-head"
        :aria-expanded="!collapsed[project.id]"
        @click="collapsed[project.id] = !collapsed[project.id]"
      >
        <component :is="collapsed[project.id] ? ChevronRight : ChevronDown" :size="13" class="rdp-chevron" />
        <img
          v-if="logoOf(project.id)"
          :src="logoOf(project.id)!"
          class="rdp-project-logo"
          alt=""
        />
        <FolderKanban v-else :size="14" class="rdp-accent" aria-hidden="true" />
        <span class="rdp-name">{{ project.name }}</span>
        <span class="rdp-meta">{{ details[project.id]?.code }}</span>
      </button>

      <div v-if="!collapsed[project.id]" class="rdp-project-body">
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
import { computed, nextTick, onMounted, reactive, ref, watch, type Component } from "vue";
import Multiselect from "@vueform/multiselect";
import "@vueform/multiselect/themes/default.css";
import { useI18n } from "vue-i18n";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  DollarSign,
  FolderKanban,
  GripVertical,
  Hash,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  Type,
  X,
} from "@lucide/vue";
import {
  clearSchemaCache,
  getProject,
  getSchema,
  listProjects,
  listSources,
} from "@/services/dataSourceService";
import { clearTableRowsCache } from "@/composables/useTableRows";
import { endDataSourceDrag, startDataSourceDrag } from "@/utils/table/dataDrag";
import { collectBoundTables } from "@/utils/table/tableDocument";
import type { Band } from "@/types";
import type {
  DataColumn,
  DataColumnType,
  DataSourceSchema,
  DataSourceSummary,
  ProjectDetails,
  ProjectField,
  ProjectFieldType,
  ProjectSummary,
  ReportProject,
} from "@/types/dataSource";

const props = defineProps<{ bands: Band[]; projects: ReportProject[] }>();

const emit = defineEmits<{
  // The new list of chosen projects
  "update-projects": [projects: ReportProject[]];
}>();

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

// ---- Choosing projects ----------------------------------------------------

const allProjects = ref<ProjectSummary[]>([]);
const allProjectsFailed = ref(false);

async function loadAllProjects() {
  allProjectsFailed.value = false;
  try {
    allProjects.value = await listProjects();
  } catch {
    allProjectsFailed.value = true;
  }
}

// Every project, plus chosen ones the list doesn't have (yet), so their tags show
const projectOptions = computed(() => {
  const options = allProjects.value.map((p) => ({ label: p.name, value: p.id, code: p.code }));
  for (const p of props.projects) {
    if (!options.some((o) => o.value === p.id)) options.push({ label: p.name, value: p.id, code: "" });
  }
  return options;
});

// The designer refuses (with a message) to remove a project still in use;
// the field then shows the report's projects again
const selectKey = ref(0);

async function selectProjects(ids: string[]) {
  const nameOf = (id: string) =>
    props.projects.find((p) => p.id === id)?.name ??
    allProjects.value.find((p) => p.id === id)?.name ??
    id;
  emit("update-projects", ids.map((id) => ({ id, name: nameOf(id) })));
  await nextTick();
  if (props.projects.map((p) => p.id).join("\n") !== ids.join("\n")) selectKey.value++;
}

// ---- Each project's details and sources -----------------------------------

const details = reactive<Record<string, ProjectDetails | undefined>>({});
const sources = reactive<Record<string, DataSourceSummary[]>>({});
const failed = reactive<Record<string, boolean>>({});
const collapsed = reactive<Record<string, boolean>>({});
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

// Load newly chosen projects
watch(
  () => props.projects.map((p) => p.id),
  (ids) => {
    ids.forEach((id) => {
      if (!details[id] && !failed[id]) loadProject(id);
    });
  },
  { immediate: true },
);

// Fetch everything again (e.g. after the backend changed a project)
async function reload() {
  reloading.value = true;
  clearSchemaCache();
  clearTableRowsCache();
  Object.keys(details).forEach((k) => delete details[k]);
  Object.keys(schemas).forEach((k) => delete schemas[k]);
  try {
    await Promise.all([
      loadAllProjects(),
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

// Tables on the report that show each source
const tablesBySource = computed(() => {
  const map: Record<string, string[]> = {};
  for (const table of collectBoundTables(props.bands)) {
    const key = sourceKey(table.binding.projectId, table.binding.sourceId);
    (map[key] ??= []).push(table.binding.tableName);
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

onMounted(() => loadAllProjects());
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

.rdp-label,
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















/* The project field (@vueform/multiselect), in the panel's colours */
.rdp-project-select {
  --ms-font-size: 12px;
  --ms-line-height: 1.4;
  --ms-py: 4px;
  --ms-px: 8px;
  --ms-radius: 6px;
  --ms-border-color: var(--prop-border-color, #e5e7eb);
  --ms-border-color-active: #93c5fd;
  --ms-ring-width: 3px;
  --ms-ring-color: rgba(37, 99, 235, 0.15);
  --ms-placeholder-color: #9ca3af;
  --ms-dropdown-border-color: var(--prop-border-color, #e5e7eb);
  --ms-dropdown-radius: 8px;
  --ms-option-font-size: 12px;
  --ms-option-px: 8px;
  --ms-option-py: 6px;
  --ms-option-bg-pointed: #f3f4f6;
  --ms-option-color-pointed: #1f2937;
  --ms-option-bg-selected: #fff;
  --ms-option-color-selected: #1f2937;
  --ms-option-bg-selected-pointed: #eff6ff;
  --ms-option-color-selected-pointed: #1f2937;
  --ms-empty-color: #9ca3af;
  --ms-spinner-color: #2563eb;
  --ms-max-height: 15rem;
  margin-bottom: 4px;
  min-height: 32px;
  background: #fff;
}

.rdp-project-select :deep(.multiselect-dropdown) {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
}

.rdp-project-select :deep(.multiselect-tags) {
  gap: 4px;
  margin: 0;
  padding-left: 4px;
}

.rdp-project-select :deep(.multiselect-tags-search-wrapper) {
  margin: 0 4px;
}

.rdp-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 3px 2px 7px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11.5px;
  line-height: 1.3;
}

.rdp-tag-name {
  min-width: 0;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rdp-tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.rdp-tag-remove:hover {
  background: #dbeafe;
}

.rdp-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.rdp-option-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border: 1.5px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  color: #fff;
}

.rdp-option-check.is-on {
  border-color: #2563eb;
  background: #2563eb;
}

.rdp-spinner {
  flex-shrink: 0;
  margin-right: 6px;
  color: #2563eb;
}

.rdp-caret {
  flex-shrink: 0;
  margin-right: 8px;
  color: #9ca3af;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.rdp-caret.is-open {
  transform: rotate(180deg);
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

.rdp-project {
  margin-bottom: 6px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 8px;
  background: #fff;
}

.rdp-project-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.rdp-project-head:hover {
  background: #f9fafb;
}

.rdp-project-head .rdp-name {
  font-weight: 600;
}

.rdp-project-logo {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
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
.rdp-grip,
.rdp-chevron {
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
