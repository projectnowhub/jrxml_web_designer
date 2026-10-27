<template>
  <section class="my-templates-view">
    <span class="eyebrow">{{ t("pages.workspace") }}</span>
    <h1>{{ t("pages.myTemplates") }}</h1>
    <p>{{ t("pages.myTemplatesDescription") }}</p>

    <div class="list-bar">
      <span v-if="query" class="search-note">
        {{ t("myTemplates.resultsFor", { query }) }}
        <button type="button" class="clear-search" @click="setQuery({ q: undefined })">
          <X :size="13" :stroke-width="2.5" aria-hidden="true" />
          {{ t("myTemplates.clearSearch") }}
        </button>
      </span>
      <div class="bar-tools">
        <span class="count">{{ t("myTemplates.count", { count: total }, total) }}</span>
        <!-- Grid has no column headings, so its order is chosen here -->
        <label v-if="view === 'grid'" class="sort-select" data-help="template-order">
          <span>{{ t("myTemplates.sortBy") }}</span>
          <select :value="sortChoice" @change="chooseSort(($event.target as HTMLSelectElement).value)">
            <option v-for="choice in SORT_CHOICES" :key="choice" :value="choice">
              {{ t(`myTemplates.sort.${choice}`) }}
            </option>
          </select>
          <ChevronDown :size="14" :stroke-width="2.25" aria-hidden="true" />
        </label>
        <!-- List: how many rows a page shows (always here, so it can be
             changed back even when everything fits on one page) -->
        <label v-else class="page-size" data-help="template-order">
          <span>{{ t("pageNavigation.perPage") }}</span>
          <select :value="pageSize" @change="choosePageSize(Number(($event.target as HTMLSelectElement).value))">
            <option v-for="size in PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
          </select>
          <ChevronDown :size="14" :stroke-width="2.25" aria-hidden="true" />
        </label>
        <div class="view-toggle" data-help="template-view" role="radiogroup" :aria-label="t('myTemplates.view')">
          <button
            v-for="option in VIEWS"
            :key="option"
            type="button"
            role="radio"
            :aria-checked="view === option"
            :class="{ active: view === option }"
            :title="t(`myTemplates.views.${option}`)"
            :aria-label="t(`myTemplates.views.${option}`)"
            @click="setView(option)"
          >
            <component :is="option === 'grid' ? LayoutGrid : List" :size="16" :stroke-width="2.25" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="failed" class="load-failed" role="alert">
      <span>{{ t("myTemplates.loadFailed") }}</span>
      <button type="button" @click="reload">{{ t("myTemplates.tryAgain") }}</button>
    </div>

    <div v-else-if="view === 'grid'" data-help="template-list">
      <TemplateGrid
        :templates="items"
        :owner="displayName"
        :show-new="!query"
        :skeletons="loading ? Math.min(PAGE_SIZE, Math.max(4, total - items.length)) : 0"
      />
      <!-- Reaching this loads the next 25 -->
      <div v-if="items.length < total" ref="sentinelRef" class="scroll-sentinel" />
      <!-- The next 25 also load by themselves when the end comes near (or
           the window is big enough to show it); the button is there too -->
      <div v-if="items.length < total && !loading" class="load-more">
        <span>{{ t("myTemplates.showing", { shown: items.length, total }) }}</span>
        <button type="button" @click="loadMore">
          <ChevronDown :size="15" :stroke-width="2.25" aria-hidden="true" />
          {{ t("myTemplates.loadMore") }}
        </button>
      </div>
    </div>

    <div v-else data-help="template-list">
      <TemplateList
        v-if="items.length || loading"
        :templates="items"
        :owner="displayName"
        :sort="sort"
        :dir="dir"
        :skeletons="loading && !items.length ? 6 : 0"
        @sort="sortByColumn"
      />
      <PageNavigation
        v-if="total > pageSize"
        class="pagination"
        :page="page"
        :page-size="pageSize"
        :total="total"
        @update:page="goToPage"
      />
    </div>

    <div v-if="!failed && !loading && !items.length" class="no-match">
      <template v-if="query">
        <SearchX :size="28" :stroke-width="2" aria-hidden="true" />
        <strong>{{ t("myTemplates.noMatch", { query }) }}</strong>
        <span>{{ t("myTemplates.noMatchHint") }}</span>
      </template>
      <template v-else-if="view === 'list'">
        <FileText :size="28" :stroke-width="2" aria-hidden="true" />
        <strong>{{ t("myTemplates.empty") }}</strong>
        <button type="button" class="new-button" @click="newTemplate">
          <Plus :size="15" :stroke-width="2.25" aria-hidden="true" />
          {{ t("home.createNewTemplate") }}
        </button>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
// My Templates: every template, as cards (Grid: the next 25 load as you
// scroll) or as a table (List: pages of 25 / 50 / 100). The view, order, page
// and the top bar's search are in the address (?view=list&sort=name&dir=asc
// &page=2&q=…), so Back and reload keep the place. Pages come from
// TanStack Query (queries/templateQueries.ts): List = one page, Grid = an infinite
// list; saving a template invalidates them, so they fetch again.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  ChevronDown,
  FileText,
  LayoutGrid,
  List,
  Plus,
  SearchX,
  X,
} from "@lucide/vue";
import { useTemplates } from "@/composables/useTemplates";
import { useHelpStore } from "@/stores/help";
import { AUTH_USER_KEY } from "@/services/apiClient";
import type { TemplateSortDirection, TemplateSort, TemplateSummary } from "@/types/template";
import { templateGridQuery, templateListQuery } from "@/queries/templateQueries";
import TemplateGrid from "@/components/templates/TemplateGrid.vue";
import TemplateList from "@/components/templates/TemplateList.vue";
import PageNavigation from "@/components/common/PageNavigation.vue";

type View = "grid" | "list";

const PAGE_SIZE = 25;
const PAGE_SIZES = [25, 50, 100];
const VIEWS: View[] = ["grid", "list"];
const SORT_CHOICES = ["lastModified", "createdAt", "nameAsc", "nameDesc"] as const;
const VIEW_KEY = "templates.view";
const PAGE_SIZE_KEY = "templates.pageSize";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { newTemplate } = useTemplates();

const storedUser = JSON.parse(localStorage.getItem(AUTH_USER_KEY) ?? "{}") as { firstName?: string };
const displayName = computed(() => storedUser.firstName ?? t("home.defaultUserName"));

const remembered = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const remember = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Remembering is only a convenience
  }
};

// Everything the list shows is read from the address
const text = (value: unknown) => (typeof value === "string" ? value : "");
const query = computed(() => text(route.query.q).trim());
const view = computed<View>(() => {
  const asked = text(route.query.view) || remembered(VIEW_KEY);
  return asked === "list" ? "list" : "grid";
});
const sort = computed<TemplateSort>(() => {
  const asked = text(route.query.sort);
  return asked === "name" || asked === "createdAt" ? asked : "lastModified";
});
const dir = computed<TemplateSortDirection>(() => {
  const asked = text(route.query.dir);
  if (asked === "asc" || asked === "desc") return asked;
  return sort.value === "name" ? "asc" : "desc";
});
const page = computed(() => Math.max(1, parseInt(text(route.query.page), 10) || 1));
const pageSize = ref(PAGE_SIZES.includes(Number(remembered(PAGE_SIZE_KEY))) ? Number(remembered(PAGE_SIZE_KEY)) : PAGE_SIZE);

// Changes keep the other settings; undefined removes one
function setQuery(change: Record<string, string | number | undefined>) {
  const next: LocationQueryRaw = { ...route.query };
  for (const [key, value] of Object.entries(change)) {
    if (value === undefined || value === "") delete next[key];
    else next[key] = String(value);
  }
  router.replace({ query: next });
}

function setView(option: View) {
  remember(VIEW_KEY, option);
  setQuery({ view: option, page: undefined });
}

// The grid's order menu: newest edits, newest created, name A–Z / Z–A
const sortChoice = computed(() =>
  sort.value === "name" ? (dir.value === "asc" ? "nameAsc" : "nameDesc") : sort.value,
);
function chooseSort(choice: string) {
  if (choice === "nameAsc" || choice === "nameDesc") {
    setQuery({ sort: "name", dir: choice === "nameAsc" ? "asc" : "desc", page: undefined });
  } else {
    setQuery({ sort: choice, dir: undefined, page: undefined });
  }
}

// A heading click sorts by it; a second click turns the order round. Names
// start A–Z, dates newest first
function sortByColumn(column: TemplateSort) {
  const nextDir: TemplateSortDirection =
    sort.value === column ? (dir.value === "asc" ? "desc" : "asc") : column === "name" ? "asc" : "desc";
  setQuery({ sort: column, dir: nextDir, page: undefined });
}

function goToPage(number: number) {
  setQuery({ page: number > 1 ? number : undefined });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function choosePageSize(size: number) {
  pageSize.value = size;
  remember(PAGE_SIZE_KEY, String(size));
  setQuery({ page: undefined });
}


// What is shown
const baseQuery = computed(() => ({ q: query.value, sort: sort.value, dir: dir.value }));

// List: exactly the page in the address (the last page stays while the next loads)
const listQuery = useQuery(
  computed(() => ({
    ...templateListQuery({ ...baseQuery.value, page: page.value, size: pageSize.value }),
    enabled: view.value === "list",
    placeholderData: keepPreviousData,
  })),
);
// Grid: from the start, the next 25 added near the end
const gridQuery = useInfiniteQuery(
  computed(() => ({ ...templateGridQuery(baseQuery.value, PAGE_SIZE), enabled: view.value === "grid" })),
);

const items = computed<TemplateSummary[]>(() => {
  if (view.value === "list") return listQuery.data.value?.items ?? [];
  // After a delete the pages shift by one: a card is shown once
  const seen = new Set<string>();
  return (gridQuery.data.value?.pages ?? [])
    .flatMap((p) => p.items)
    .filter((item) => !seen.has(item.id) && !!seen.add(item.id));
});
const total = computed(() =>
  view.value === "list" ? (listQuery.data.value?.total ?? 0) : (gridQuery.data.value?.pages[0]?.total ?? 0),
);
const loading = computed(() => (view.value === "list" ? listQuery.isFetching.value : gridQuery.isFetching.value));
const failed = computed(() => (view.value === "list" ? listQuery.isError.value : gridQuery.isError.value));
const settled = computed(() => (view.value === "list" ? !listQuery.isPending.value : !gridQuery.isPending.value));

const reload = () => (view.value === "grid" ? gridQuery.refetch() : listQuery.refetch());

// A page past the end (after deleting) goes back to the last one
watch(
  () => listQuery.data.value,
  (result) => {
    if (view.value === "list" && result && !result.items.length && page.value > 1 && result.total) {
      setQuery({ page: Math.ceil(result.total / pageSize.value) });
    }
  },
);

function loadMore() {
  if (gridQuery.hasNextPage.value && !gridQuery.isFetching.value) gridQuery.fetchNextPage();
}

// Load more when the end of the grid comes near (a tall window may show the
// end already: it keeps filling as each page arrives)
const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
function observeSentinel() {
  observer?.disconnect();
  if (!sentinelRef.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMore();
    },
    { rootMargin: "400px 0px" },
  );
  observer.observe(sentinelRef.value);
}
watch(
  () => [items.value.length, loading.value, view.value],
  () => nextTick(observeSentinel),
);

// First visit: a short tour of this page, once the templates are on screen
const help = useHelpStore();
let tourTimer: ReturnType<typeof setTimeout> | undefined;
onMounted(() => {
  const stop = watch(
    settled,
    (ready) => {
      if (!ready) return;
      stop();
      tourTimer = setTimeout(() => help.startTourOnce("templates"), 600);
    },
    { immediate: true },
  );
});
onBeforeUnmount(() => {
  observer?.disconnect();
  clearTimeout(tourTimer);
  if (help.tourId === "templates") help.endTour();
});
</script>

<style scoped>
.my-templates-view {
  width: 100%;
}

.eyebrow {
  color: #6440f4;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

h1 {
  margin: 10px 0 7px;
  color: #1c1b26;
  font-size: clamp(25px, 3vw, 35px);
}

p {
  margin: 0;
  color: #6e6a80;
  font-size: 13px;
}

.list-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  min-height: 34px;
  margin: 28px 0 16px;
}

.search-note {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 600;
}

.clear-search {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border: 1px solid #e6e5ee;
  border-radius: 999px;
  background: #ffffff;
  color: #6e6a80;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.clear-search:hover {
  border-color: #6440f4;
  color: #6440f4;
}

.bar-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.count {
  color: #6f6a7e;
  font-size: 11.5px;
  white-space: nowrap;
}

.sort-select,
.page-size {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6f6a7e;
  font-size: 11.5px;
}

.sort-select select,
.page-size select {
  appearance: none;
  padding: 6px 28px 6px 10px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #1c1b26;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}


.sort-select select:focus-visible,
.page-size select:focus-visible {
  border-color: #6440f4;
  outline: none;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.12);
}

.sort-select svg,
.page-size svg {
  position: absolute;
  right: 9px;
  pointer-events: none;
}

.view-toggle {
  display: inline-flex;
  padding: 3px;
  border-radius: 9px;
  background: #f1f0f6;
}

.view-toggle button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: #8a84a3;
  cursor: pointer;
}

.view-toggle button:hover {
  color: #6440f4;
}

.view-toggle button.active {
  background: #ffffff;
  color: #6440f4;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.12);
}

.scroll-sentinel {
  height: 1px;
}

.load-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  color: #6f6a7e;
  font-size: 11.5px;
}

.load-more button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #6440f4;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.load-more button:hover {
  border-color: #6440f4;
  background: rgba(124, 92, 247, 0.06);
}

.pagination {
  margin-top: 16px;
}

.load-failed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(229, 72, 77, 0.3);
  border-radius: 10px;
  background: rgba(229, 72, 77, 0.06);
  color: #b4262b;
  font-size: 12.5px;
}

.load-failed button,
.new-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 0;
  border-radius: 8px;
  background: #6440f4;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.no-match {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 40px 16px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #fafafc;
  color: #8172d7;
  text-align: center;
}

.no-match:empty {
  display: none;
}

.no-match strong {
  color: #1c1b26;
  font-size: 12.5px;
  font-weight: 600;
}

.no-match span {
  color: #8a84a3;
  font-size: 11px;
}

.new-button {
  margin-top: 8px;
}

</style>
