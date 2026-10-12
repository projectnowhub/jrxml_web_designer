<template>
  <!-- The report's projects, chosen in the header: one dropdown, several
       projects allowed. Their details and tables are in the Report Data list. -->
  <Multiselect
    :key="selectKey"
    class="hpp-select"
    :class="{ 'is-compact': compact }"
    mode="multiple"
    :attrs="{ 'aria-label': t('reportData.projects') }"
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
    :title="projectsTitle"
    @open="loadAllProjects"
    @update:model-value="selectProjects"
  >
    <!-- One project: its short code; more: how many. The library's own label
         classes keep these above its (hidden) search box. -->
    <template #multiplelabel>
      <div class="multiselect-multiple-label hpp-label">
        <FolderKanban class="hpp-label-icon" :size="15" aria-hidden="true" />
        <span v-if="compact" class="hpp-count">{{ projects.length }}</span>
        <span v-else-if="projects.length === 1" class="hpp-label-name">{{ shortName(projects[0]!) }}</span>
        <template v-else>
          <span class="hpp-count">{{ projects.length }}</span>
          <span class="hpp-label-name">{{ t("reportData.projectsSelected", projects.length) }}</span>
        </template>
      </div>
    </template>
    <template #placeholder>
      <div class="multiselect-placeholder hpp-label is-empty">
        <FolderKanban class="hpp-label-icon" :size="15" aria-hidden="true" />
        <span v-if="!compact" class="hpp-label-name">{{ t("reportData.chooseProjects") }}</span>
      </div>
    </template>
    <template #option="{ option, isSelected }">
      <span class="hpp-option">
        <span class="hpp-check" :class="{ 'is-on': isSelected(option) }">
          <Check v-if="isSelected(option)" :size="11" :stroke-width="3" />
        </span>
        <span class="hpp-name">{{ option.label }}</span>
        <span class="hpp-code">{{ option.code }}</span>
      </span>
    </template>
    <template #spinner>
      <LoaderCircle class="hpp-spinner spinning" :size="14" aria-hidden="true" />
    </template>
    <template #caret="{ handleCaretClick, isOpen }">
      <ChevronDown
        class="hpp-caret"
        :class="{ 'is-open': isOpen }"
        :size="15"
        aria-hidden="true"
        @mousedown.prevent="handleCaretClick"
      />
    </template>
  </Multiselect>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import Multiselect from "@vueform/multiselect";
import "@vueform/multiselect/themes/default.css";
import { useI18n } from "vue-i18n";
import { Check, ChevronDown, FolderKanban, LoaderCircle } from "@lucide/vue";
import { listProjects } from "@/services/dataSourceService";
import type { ProjectSummary, ReportProject } from "@/types/dataSource";

// `compact`: just the icon and how many projects (narrow screens)
const props = defineProps<{ projects: ReportProject[]; compact?: boolean }>();

const emit = defineEmits<{
  // The new list of chosen projects
  "update-projects": [projects: ReportProject[]];
}>();

const { t } = useI18n();

const allProjects = ref<ProjectSummary[]>([]);
const allProjectsFailed = ref(false);

// Fetched on start and again each time the list opens (projects may have
// been added in the backend meanwhile)
async function loadAllProjects() {
  allProjectsFailed.value = false;
  try {
    allProjects.value = await listProjects();
  } catch {
    if (!allProjects.value.length) allProjectsFailed.value = true;
  }
}

onMounted(loadAllProjects);

// Every project, plus chosen ones the list doesn't have (yet), so they show
const projectOptions = computed(() => {
  const options = allProjects.value.map((p) => ({ label: p.name, value: p.id, code: p.code }));
  for (const p of props.projects) {
    if (!options.some((o) => o.value === p.id)) options.push({ label: p.name, value: p.id, code: "" });
  }
  return options;
});

// A project's code (e.g. KL-MRT3), or its name while the list is loading
const shortName = (project: ReportProject) =>
  allProjects.value.find((p) => p.id === project.id)?.code || project.name;

const projectsTitle = computed(() =>
  props.projects.length
    ? `${t("reportData.projects")}: ${props.projects.map((p) => p.name).join(", ")}`
    : t("reportData.projects"),
);

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
</script>

<style scoped>
/* @vueform/multiselect, sized for the header */
.hpp-select {
  --ms-font-size: 13px;
  --ms-line-height: 1.3;
  --ms-py: 5px;
  --ms-px: 10px;
  --ms-radius: 6px;
  --ms-border-color: #d1d5db;
  --ms-border-color-active: #93c5fd;
  --ms-ring-width: 3px;
  --ms-ring-color: rgba(37, 99, 235, 0.15);
  --ms-placeholder-color: #6b7280;
  --ms-bg: #f9fafb;
  --ms-dropdown-border-color: #e5e7eb;
  --ms-dropdown-radius: 8px;
  --ms-option-font-size: 13px;
  --ms-option-px: 10px;
  --ms-option-py: 7px;
  --ms-option-bg-pointed: #f3f4f6;
  --ms-option-color-pointed: #1f2937;
  --ms-option-bg-selected: #fff;
  --ms-option-color-selected: #1f2937;
  --ms-option-bg-selected-pointed: #eff6ff;
  --ms-option-color-selected-pointed: #1f2937;
  --ms-empty-color: #9ca3af;
  --ms-spinner-color: #2563eb;
  --ms-max-height: 18rem;
  flex: 0 1 230px;
  width: 230px;
  min-width: 150px;
  min-height: 32px;
  margin: 0;
}

/* The list is wider than the field so long project names fit */
.hpp-select :deep(.multiselect-dropdown) {
  right: auto;
  width: 320px;
  min-width: 100%;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
}

/* Narrow screens: icon and count only; the list spans the screen under the header */
.hpp-select.is-compact {
  flex: 0 0 auto;
  width: 50px;
  min-width: 50px;
}

.hpp-select.is-compact .hpp-label {
  padding-right: 0;
  padding-left: 8px;
}

.hpp-select.is-compact :deep(.hpp-caret) {
  display: none;
}

.hpp-select.is-compact :deep(.multiselect-dropdown) {
  position: fixed;
  top: 52px;
  left: 8px;
  right: 8px;
  bottom: auto;
  width: auto;
  max-width: 360px;
  transform: none;
}

.hpp-label {
  gap: 6px;
  min-width: 0;
  padding-right: 30px;
  color: #1f2937;
  font-weight: 500;
}

.hpp-label.is-empty {
  color: #6b7280;
  font-weight: 400;
}

.hpp-label-icon {
  flex-shrink: 0;
  color: #2563eb;
}

.hpp-label.is-empty .hpp-label-icon {
  color: #9ca3af;
}

.hpp-label-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hpp-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  box-sizing: border-box;
}

.hpp-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.hpp-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  border: 1.5px solid #cbd5e1;
  border-radius: 4px;
  background: #fff;
  color: #fff;
}

.hpp-check.is-on {
  border-color: #2563eb;
  background: #2563eb;
}

.hpp-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hpp-code {
  flex-shrink: 0;
  color: #9ca3af;
  font-size: 11px;
}

.hpp-spinner {
  flex-shrink: 0;
  margin-right: 6px;
  color: #2563eb;
}

.hpp-caret {
  flex-shrink: 0;
  margin-right: 8px;
  color: #6b7280;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.hpp-caret.is-open {
  transform: rotate(180deg);
}

.spinning {
  animation: hpp-spin 0.9s linear infinite;
}

@keyframes hpp-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
