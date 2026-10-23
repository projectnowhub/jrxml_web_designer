<template>
  <!-- The report's project(s), chosen in the header: one dropdown. One project
       for now (MAX_REPORT_PROJECTS); several when that allows. Their details
       and tables are in the Report Data list. -->
  <Multiselect
    :key="selectKey"
    class="hpp-select"
    :class="{ 'is-compact': compact }"
    :mode="single ? 'single' : 'multiple'"
    :attrs="{ 'aria-label': t('reportData.projects') }"
    :model-value="single ? (projects[0]?.id ?? null) : projects.map((p) => p.id)"
    :options="projectOptions"
    :searchable="true"
    :close-on-select="single"
    :can-deselect="true"
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
        <span v-else class="hpp-label-name">{{ t("reportData.projectsSelected", projects.length) }}</span>
      </div>
    </template>
    <!-- One project: its short code (the whole name in the tooltip) -->
    <template #singlelabel>
      <div class="multiselect-single-label hpp-label">
        <FolderKanban class="hpp-label-icon" :size="15" aria-hidden="true" />
        <span v-if="!compact && projects[0]" class="hpp-label-name">{{ shortName(projects[0]) }}</span>
      </div>
    </template>
    <template #placeholder>
      <div class="multiselect-placeholder hpp-label is-empty">
        <FolderKanban class="hpp-label-icon" :size="15" aria-hidden="true" />
        <span v-if="!compact" class="hpp-label-name">{{ t("reportData.chooseProjects") }}</span>
        <!-- Narrow: a "+" says projects can be added here -->
        <span v-else class="hpp-count is-add" aria-hidden="true"><Plus :size="10" :stroke-width="3" /></span>
      </div>
    </template>
    <template #option="{ option, isSelected }">
      <span class="hpp-option">
        <!-- One project: a round mark (one choice); several: a tick box -->
        <span class="hpp-check" :class="{ 'is-on': isSelected(option), 'is-radio': single }">
          <span v-if="single && isSelected(option)" class="hpp-dot" aria-hidden="true"></span>
          <Check v-else-if="isSelected(option)" :size="11" :stroke-width="3" />
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
import { Plus, Check, ChevronDown, FolderKanban, LoaderCircle } from "@lucide/vue";
import { listProjects } from "@/services/dataSourceService";
import type { ProjectSummary, ReportProject } from "@/types/dataSource";
import { MAX_REPORT_PROJECTS } from "@/constants/constants";

// One project per template for now: picking another replaces it
const single = MAX_REPORT_PROJECTS === 1;

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

async function selectProjects(value: string[] | string | null) {
  const ids = Array.isArray(value) ? value : value ? [value] : [];
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
  --ms-border-color-active: #c4b5fd;
  --ms-ring-width: 3px;
  --ms-ring-color: rgba(100, 64, 244, 0.15);
  --ms-placeholder-color: #6b7280;
  --ms-bg: #f9fafb;
  --ms-dropdown-border-color: rgba(28, 27, 38, 0.1);
  --ms-dropdown-radius: 12px;
  --ms-option-font-size: 12.5px;
  --ms-option-px: 8px;
  --ms-option-py: 8px;
  --ms-option-bg-pointed: rgba(124, 92, 247, 0.08);
  --ms-option-color-pointed: #1c1b26;
  --ms-option-bg-selected: transparent;
  --ms-option-color-selected: #45425a;
  --ms-option-bg-selected-pointed: rgba(124, 92, 247, 0.08);
  --ms-option-color-selected-pointed: #1c1b26;
  --ms-empty-color: #77718a;
  --ms-spinner-color: #6440f4;
  --ms-max-height: 18rem;
  flex: 0 1 230px;
  width: 230px;
  min-width: 150px;
  min-height: 32px;
  margin: 0;
}

/* The list is wider than the field so long project names fit. Same card
   as the account menu and the File menu */
.hpp-select :deep(.multiselect-dropdown) {
  right: auto;
  bottom: -8px;
  width: 320px;
  min-width: 100%;
  padding: 8px;
  border-radius: 12px;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  box-sizing: border-box;
  animation: hpp-menu-in 0.16s ease;
}

.hpp-select :deep(.multiselect-options) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hpp-select :deep(.multiselect-option) {
  border-radius: 6px;
  font-weight: 600;
  transition: background 0.14s ease;
}

.hpp-select :deep(.multiselect-no-options),
.hpp-select :deep(.multiselect-no-results) {
  padding: 9px 8px;
  font-size: 12.5px;
}

@keyframes hpp-menu-in {
  from {
    opacity: 0;
    transform: translateY(calc(100% - 3px)) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(100%) scale(1);
  }
}

/* Narrow screens: icon and count only; the list spans the screen under the header */
.hpp-select.is-compact {
  flex: 0 0 auto;
  width: 50px;
  min-width: 50px;
}

.hpp-select.is-compact .hpp-label {
  justify-content: center;
  gap: 4px;
  padding: 0 6px;
}

.hpp-select.is-compact .hpp-label-icon {
  color: #6440f4;
  opacity: 1;
}

.hpp-count.is-add {
  min-width: 16px;
  height: 16px;
  padding: 0;
  background: #f1edff;
  color: #6440f4;
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
  animation-name: hpp-menu-in-fixed;
}

@keyframes hpp-menu-in-fixed {
  from {
    opacity: 0;
    transform: translateY(-3px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: none;
  }
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
  color: #6440f4;
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
  background: #6440f4;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  box-sizing: border-box;
}

.hpp-option {
  display: flex;
  align-items: center;
  gap: 10px;
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
  border: 1.5px solid rgba(28, 27, 38, 0.22);
  border-radius: 4px;
  transition: background 0.14s ease, border-color 0.14s ease;
  background: #fff;
  color: #fff;
}

.hpp-check.is-on {
  border-color: #7c5cf7;
  background: #7c5cf7;
}

.hpp-check.is-radio {
  border-radius: 50%;
}

.hpp-check.is-radio.is-on {
  background: #fff;
}

.hpp-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7c5cf7;
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
  color: #77718a;
  font-size: 11px;
  font-weight: 500;
}

.hpp-spinner {
  flex-shrink: 0;
  margin-right: 6px;
  color: #6440f4;
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
