<template>
  <!-- The report's project(s), chosen in the header: a field that opens a
       searchable list. One project for now (MAX_REPORT_PROJECTS); several when
       that allows. The list comes from the CDP backend a page at a time while
       it is scrolled, and draws only the rows in view. Their details and
       tables are in the Report Data list. -->
  <div ref="rootEl" class="hpp-select" :class="{ 'is-compact': compact, 'is-open': open }" @keydown="onKeydown">
    <button
      ref="fieldEl"
      type="button"
      class="hpp-field"
      :class="{ 'is-empty': !projects.length }"
      :title="projectsTitle"
      :aria-label="t('reportData.projects')"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <FolderKanban class="hpp-label-icon" :size="15" aria-hidden="true" />
      <template v-if="projects.length">
        <!-- One project: its short code; more: how many (narrow: the count only) -->
        <span v-if="compact && !single" class="hpp-count">{{ projects.length }}</span>
        <span v-else-if="!compact && projects.length === 1" class="hpp-label-name">{{ shortName(projects[0]!) }}</span>
        <span v-else-if="!compact" class="hpp-label-name">{{ t("reportData.projectsSelected", projects.length) }}</span>
      </template>
      <template v-else>
        <span v-if="!compact" class="hpp-label-name">{{ t("reportData.chooseProjects") }}</span>
        <!-- Narrow: a "+" says projects can be added here -->
        <span v-else class="hpp-count is-add" aria-hidden="true"><Plus :size="10" :stroke-width="3" /></span>
      </template>
      <ChevronDown class="hpp-caret" :class="{ 'is-open': open }" :size="15" aria-hidden="true" />
    </button>

    <Transition name="menu-pop">
      <div v-if="open" class="hpp-menu">
        <label class="hpp-search">
          <Search class="hpp-search-icon" :size="14" aria-hidden="true" />
          <input
            ref="searchEl"
            v-model="query"
            class="hpp-search-input"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            :aria-controls="listId"
            :aria-activedescendant="rows.length ? optionId(pointer) : undefined"
            :placeholder="t('reportData.searchProjects')"
            :aria-label="t('reportData.searchProjects')"
          />
        </label>

        <div
          :id="listId"
          ref="scrollEl"
          class="hpp-scroll"
          role="listbox"
          :aria-label="t('reportData.projects')"
          :aria-multiselectable="!single || undefined"
          :aria-busy="loading"
        >
          <div class="hpp-rows" :style="{ height: `${totalSize}px` }">
            <div
              v-for="item in items"
              :id="optionId(item.index)"
              :key="rows[item.index]?.id ?? item.index"
              class="hpp-option"
              :class="{ 'is-pointed': item.index === pointer }"
              role="option"
              :aria-selected="isChosen(rows[item.index])"
              :title="rows[item.index]?.name"
              :style="{ transform: `translateY(${item.start}px)`, height: `${ROW_HEIGHT}px` }"
              @mousedown.prevent
              @mousemove="pointer = item.index"
              @click="choose(rows[item.index])"
            >
              <!-- One project: a round mark (one choice); several: a tick box -->
              <span class="hpp-check" :class="{ 'is-on': isChosen(rows[item.index]), 'is-radio': single }">
                <span v-if="single && isChosen(rows[item.index])" class="hpp-dot" aria-hidden="true"></span>
                <Check v-else-if="isChosen(rows[item.index])" :size="11" :stroke-width="3" />
              </span>
              <span class="hpp-name">{{ rows[item.index]?.name }}</span>
              <span class="hpp-code">{{ rows[item.index]?.code }}</span>
            </div>
          </div>
        </div>

        <!-- Under the rows: loading the next page, a failure, or nothing found -->
        <div v-if="loading" class="hpp-status" role="status">
          <LoaderCircle class="hpp-spinner spinning" :size="14" aria-hidden="true" />
          {{ t("reportData.loadingProjects") }}
        </div>
        <div v-else-if="failed" class="hpp-status is-failed" role="alert">
          {{ t("reportData.projectsLoadFailed") }}
          <button type="button" class="hpp-retry" @mousedown.prevent @click="retry">
            {{ t("reportData.retry") }}
          </button>
        </div>
        <div v-else-if="!rows.length && !list.hasNextPage.value" class="hpp-status">
          {{ query.trim() ? t("reportData.noProjectMatch") : t("reportData.noProjectsAvailable") }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useQueries } from "@tanstack/vue-query";
import { Plus, Check, ChevronDown, FolderKanban, LoaderCircle, Search } from "@lucide/vue";
import { matchesSearch, projectQuery, useProjectList } from "@/queries/projects";
import { useVirtualList } from "@/composables/useVirtualList";
import type { ProjectSummary, ReportProject } from "@/types/dataSource";
import { MAX_REPORT_PROJECTS } from "@/constants/constants";

// One project per template for now: picking another replaces it
const single = MAX_REPORT_PROJECTS === 1;

// Height of one row in the list (the virtual list needs it fixed)
const ROW_HEIGHT = 34;
// The next page is asked for when this many rows are left below the view
const LOAD_AHEAD = 8;

// `compact`: just the icon and how many projects (narrow screens)
const props = defineProps<{ projects: ReportProject[]; compact?: boolean }>();

const emit = defineEmits<{
  // The new list of chosen projects
  "update-projects": [projects: ReportProject[]];
}>();

const { t } = useI18n();

const rootEl = ref<HTMLElement | null>(null);
const fieldEl = ref<HTMLButtonElement | null>(null);
const searchEl = ref<HTMLInputElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);
const listId = `hpp-list-${useId()}`;
const optionId = (index: number) => `${listId}-${index}`;

const open = ref(false);
// What is typed: the loaded projects are searched in the browser
const query = ref("");
// The row the keyboard (or the mouse) points at
const pointer = ref(0);

// The projects, a page of 30 at a time (TanStack Query, the CDP app's infinite
// list; kept fresh for 5 minutes, like its project list), and those matching
// the search (while searching, the rest of the pages load too)
const list = useProjectList(query, open);

// The chosen projects, for their codes (also when not on the pages loaded;
// a project seen on a list page is already in the cache)
const chosen = useQueries({ queries: computed(() => props.projects.map((p) => projectQuery(p.id))) });

// The template's chosen projects not on the loaded pages yet come first, so
// the list shows them at once (after a refresh) while the rest loads
// (a template saved while projects came without their UUID keeps the project's
// code as its key: a loaded project with that code is the same one)
const chosenFirst = computed<ProjectSummary[]>(() => {
  const loaded = new Set(list.projects.value.flatMap((p) => [p.id, p.code]));
  return props.projects
    .map((p, i) => ({ id: p.id, name: p.name, code: chosen.value[i]?.data?.projectId ?? "" }))
    .filter((p) => !loaded.has(p.id) && matchesSearch(p, query.value));
});
const rows = computed(() => [...chosenFirst.value, ...list.matching.value]);
const loading = computed(() => list.isFetching.value);
const failed = computed(() => list.isError.value);

const { items, totalSize, scrollToIndex } = useVirtualList({
  scrollElement: scrollEl,
  count: () => rows.value.length,
  rowHeight: ROW_HEIGHT,
});

// After a failure, page one again (or the page that failed)
const retry = () => list.refetch();

// Scrolled near the end of what is loaded: the next page
watch(items, (shown) => {
  const last = shown[shown.length - 1];
  const nearEnd = !!last && last.index >= rows.value.length - 1 - LOAD_AHEAD;
  if (open.value && nearEnd && list.hasNextPage.value && !list.isFetching.value && !failed.value) {
    list.fetchNextPage();
  }
});

// Another search: back to its first row
watch(query, () => {
  pointer.value = 0;
  scrollEl.value?.scrollTo({ top: 0 });
});

async function openList() {
  open.value = true;
  document.addEventListener("pointerdown", onOutsidePointer, true);
  await nextTick();
  searchEl.value?.focus();
}

function closeList(focusField = false) {
  if (!open.value) return;
  open.value = false;
  query.value = "";
  document.removeEventListener("pointerdown", onOutsidePointer, true);
  if (focusField) fieldEl.value?.focus();
}

const toggleOpen = () => (open.value ? closeList() : openList());

function onOutsidePointer(event: PointerEvent) {
  if (!rootEl.value?.contains(event.target as Node)) closeList();
}

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onOutsidePointer, true);
});

function movePointer(to: number) {
  if (!rows.value.length) return;
  pointer.value = Math.max(0, Math.min(rows.value.length - 1, to));
  scrollToIndex(pointer.value);
}

// The list's keys stay here, so the designer's own shortcuts (arrows nudge,
// Esc clears the selection) don't act behind it
function onKeydown(event: KeyboardEvent) {
  if (!open.value) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openList();
    }
    return;
  }
  const page = Math.max(1, Math.floor((scrollEl.value?.clientHeight ?? ROW_HEIGHT) / ROW_HEIGHT) - 1);
  const moves: Record<string, () => void> = {
    ArrowDown: () => movePointer(pointer.value + 1),
    ArrowUp: () => movePointer(pointer.value - 1),
    PageDown: () => movePointer(pointer.value + page),
    PageUp: () => movePointer(pointer.value - page),
    Enter: () => choose(rows.value[pointer.value]),
    Escape: () => closeList(true),
  };
  const move = moves[event.key];
  if (move) {
    event.preventDefault();
    event.stopPropagation();
    move();
  } else if (event.key === "Tab") {
    closeList();
  }
}

// Chosen: the template keeps its key, or (saved before projects had their UUID) its code
const isChosen = (project: ProjectSummary | undefined) =>
  !!project && props.projects.some((p) => p.id === project.id || (!!project.code && p.id === project.code));

// A project's code (e.g. KL-MRT3), or its name until the code is known
const shortName = (project: ReportProject) =>
  chosen.value[props.projects.findIndex((p) => p.id === project.id)]?.data?.projectId || project.name;

const projectsTitle = computed(() =>
  props.projects.length
    ? `${t("reportData.projects")}: ${props.projects.map((p) => p.name).join(", ")}`
    : t("reportData.projects"),
);

// The designer refuses (with a message) to remove a project still in use;
// the field keeps showing the report's projects then
function choose(project: ProjectSummary | undefined) {
  if (!project) return;
  const picked: ReportProject = { id: project.id, name: project.name };
  if (single) {
    emit("update-projects", isChosen(project) ? [] : [picked]);
    closeList(true);
    return;
  }
  emit(
    "update-projects",
    isChosen(project) ? props.projects.filter((p) => p.id !== project.id && p.id !== project.code) : [...props.projects, picked],
  );
}
</script>

<style scoped>
.hpp-select {
  position: relative;
  flex: 0 1 230px;
  width: 230px;
  min-width: 150px;
  margin: 0;
}

.hpp-field {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 32px;
  padding: 5px 8px 5px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #f9fafb;
  color: #1f2937;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}

.hpp-field:focus-visible,
.hpp-select.is-open .hpp-field {
  border-color: #c4b5fd;
  outline: none;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.15);
}

.hpp-field.is-empty {
  color: #6b7280;
  font-weight: 400;
}

/* The list is wider than the field so long project names fit. Same card
   as the account menu and the File menu */
.hpp-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 320px;
  min-width: 100%;
  padding: 8px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 12px;
  background: #fff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  box-sizing: border-box;
}

.hpp-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #f9fafb;
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}

.hpp-search:focus-within {
  border-color: #c4b5fd;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.12);
}

.hpp-search-icon {
  flex-shrink: 0;
  color: #9ca3af;
}

.hpp-search-input {
  flex: 1;
  min-width: 0;
  height: 30px;
  border: none;
  background: transparent;
  color: #1c1b26;
  font: inherit;
  font-size: 12.5px;
  outline: none;
}

.hpp-scroll {
  max-height: 18rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.hpp-rows {
  position: relative;
  width: 100%;
}

.hpp-option {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 0 8px;
  border-radius: 6px;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.14s ease;
}

.hpp-option.is-pointed {
  background: rgba(124, 92, 247, 0.08);
  color: #1c1b26;
}

.hpp-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 2px;
  color: #77718a;
  font-size: 12.5px;
}

.hpp-status.is-failed {
  color: #b42318;
}

.hpp-retry {
  margin-left: auto;
  padding: 3px 8px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #fff;
  color: #6440f4;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.hpp-retry:hover {
  background: #f5f3ff;
}

/* Narrow screens: icon and count only; the list spans the screen under the header */
.hpp-select.is-compact {
  flex: 0 0 auto;
  width: 50px;
  min-width: 50px;
}

.hpp-select.is-compact .hpp-field {
  justify-content: center;
  gap: 4px;
  padding: 5px 6px;
}

.hpp-select.is-compact .hpp-caret {
  display: none;
}

.hpp-select.is-compact .hpp-menu {
  position: fixed;
  top: 52px;
  left: 8px;
  right: 8px;
  width: auto;
  max-width: 360px;
}

.hpp-label-icon {
  flex-shrink: 0;
  color: #6440f4;
}

.hpp-field.is-empty .hpp-label-icon {
  color: #9ca3af;
}

.hpp-select.is-compact .hpp-label-icon {
  color: #6440f4;
}

.hpp-label-name {
  flex: 1;
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

.hpp-count.is-add {
  min-width: 16px;
  height: 16px;
  padding: 0;
  background: #f1edff;
  color: #6440f4;
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
  box-sizing: border-box;
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
  color: #6440f4;
}

.hpp-caret {
  flex-shrink: 0;
  margin-left: auto;
  color: #6b7280;
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

@media (prefers-reduced-motion: reduce) {
  .spinning {
    animation: none;
  }
}
</style>
