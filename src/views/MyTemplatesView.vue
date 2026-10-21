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
        <label v-if="view === 'grid'" class="sort-select">
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
        <label v-else class="page-size">
          <span>{{ t("myTemplates.perPage") }}</span>
          <select :value="pageSize" @change="choosePageSize(Number(($event.target as HTMLSelectElement).value))">
            <option v-for="size in PAGE_SIZES" :key="size" :value="size">{{ size }}</option>
          </select>
          <ChevronDown :size="14" :stroke-width="2.25" aria-hidden="true" />
        </label>
        <div class="view-toggle" role="radiogroup" :aria-label="t('myTemplates.view')">
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

    <template v-else-if="view === 'grid'">
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
        <button type="button" @click="loadGrid('more')">
          <ChevronDown :size="15" :stroke-width="2.25" aria-hidden="true" />
          {{ t("myTemplates.loadMore") }}
        </button>
      </div>
    </template>

    <template v-else>
      <TemplateList
        v-if="items.length || loading"
        :templates="items"
        :owner="displayName"
        :sort="sort"
        :dir="dir"
        :skeletons="loading && !items.length ? 6 : 0"
        @sort="sortByColumn"
      />
      <nav v-if="total > pageSize" class="pagination" :aria-label="t('myTemplates.pages')">
        <span class="page-range">
          {{ t("myTemplates.range", { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total), total }) }}
        </span>
        <div class="page-buttons">
          <button
            type="button"
            class="page-step"
            :disabled="page <= 1"
            :title="t('myTemplates.first')"
            :aria-label="t('myTemplates.first')"
            @click="goToPage(1)"
          >
            <ChevronsLeft :size="15" :stroke-width="2.25" aria-hidden="true" />
          </button>
          <button type="button" class="page-step" :disabled="page <= 1" @click="goToPage(page - 1)">
            <ChevronLeft :size="15" :stroke-width="2.25" aria-hidden="true" />
            {{ t("myTemplates.previous") }}
          </button>
          <template v-for="(number, index) in pageNumbers" :key="index">
            <span v-if="number === 0" class="page-gap">…</span>
            <button
              v-else
              type="button"
              class="page-number"
              :class="{ active: number === page }"
              :aria-current="number === page ? 'page' : undefined"
              @click="goToPage(number)"
            >
              {{ number }}
            </button>
          </template>
          <button type="button" class="page-step" :disabled="page >= pageCount" @click="goToPage(page + 1)">
            {{ t("myTemplates.next") }}
            <ChevronRight :size="15" :stroke-width="2.25" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="page-step"
            :disabled="page >= pageCount"
            :title="t('myTemplates.last')"
            :aria-label="t('myTemplates.last')"
            @click="goToPage(pageCount)"
          >
            <ChevronsRight :size="15" :stroke-width="2.25" aria-hidden="true" />
          </button>
        </div>
      </nav>
    </template>

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
// listTemplates (services/templateService.ts).
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  LayoutGrid,
  List,
  Plus,
  SearchX,
  X,
} from "@lucide/vue";
import { useTemplates } from "@/composables/useTemplates";
import { useFilesStore } from "@/stores/files";
import { AUTH_USER_KEY } from "@/services/apiClient";
import {
  listTemplates,
  type SortDirection,
  type TemplateSort,
  type TemplateSummary,
} from "@/services/templateService";
import TemplateGrid from "@/components/templates/TemplateGrid.vue";
import TemplateList from "@/components/templates/TemplateList.vue";

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
const filesStore = useFilesStore();
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
const dir = computed<SortDirection>(() => {
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
  const nextDir: SortDirection =
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
  loadList();
}

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
// 1 … 4 5 6 … 12 (0 = the gap)
const pageNumbers = computed(() => {
  const last = pageCount.value;
  const current = page.value;
  const shown = new Set([1, last, current - 1, current, current + 1].filter((n) => n >= 1 && n <= last));
  const sorted = [...shown].sort((a, b) => a - b);
  const result: number[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - (sorted[i - 1] ?? n) > 1) result.push(0);
    result.push(n);
  });
  return result;
});

// What is shown
const items = ref<TemplateSummary[]>([]);
const total = ref(0);
const loading = ref(false);
const failed = ref(false);
let request = 0;

const baseQuery = () => ({ q: query.value, sort: sort.value, dir: dir.value });

// List: exactly the page in the address (a page past the end goes back to the last)
async function loadList() {
  const id = ++request;
  loading.value = true;
  failed.value = false;
  try {
    const result = await listTemplates({ ...baseQuery(), page: page.value, size: pageSize.value });
    if (id !== request) return;
    if (!result.items.length && page.value > 1 && result.total) {
      setQuery({ page: Math.ceil(result.total / pageSize.value) });
      return;
    }
    items.value = result.items;
    total.value = result.total;
  } catch {
    if (id === request) failed.value = true;
  } finally {
    if (id === request) loading.value = false;
  }
}

// Grid: from the start, or the next 25 after what is shown. `keep` reloads
// as many as are shown (after a rename or delete) without jumping back
async function loadGrid(mode: "start" | "more" | "keep") {
  if (mode === "more" && (loading.value || items.value.length >= total.value)) return;
  const id = ++request;
  loading.value = true;
  failed.value = false;
  try {
    const size = mode === "keep" ? Math.max(PAGE_SIZE, items.value.length) : PAGE_SIZE;
    const nextPage = mode === "more" ? Math.floor(items.value.length / PAGE_SIZE) + 1 : 1;
    const result = await listTemplates({ ...baseQuery(), page: nextPage, size });
    if (id !== request) return;
    if (mode === "more") {
      // After a delete the pages shift by one: skip cards already shown
      const shown = new Set(items.value.map((item) => item.id));
      items.value = [...items.value, ...result.items.filter((item) => !shown.has(item.id))];
    } else {
      items.value = result.items;
    }
    total.value = result.total;
  } catch {
    if (id === request) failed.value = true;
  } finally {
    if (id === request) loading.value = false;
  }
  // A tall window may show the end already: keep filling it
  await nextTick();
  observeSentinel();
}

const reload = () => (view.value === "grid" ? loadGrid("start") : loadList());

// Search, order or view changed: start again
watch([query, sort, dir, view], () => {
  items.value = [];
  total.value = 0;
  reload();
});
watch(page, () => view.value === "list" && loadList());
// A template renamed, copied or deleted here
watch(
  () => filesStore.templatesVersion,
  () => (view.value === "grid" ? loadGrid("keep") : loadList()),
);

// Load more when the end of the grid comes near
const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
function observeSentinel() {
  observer?.disconnect();
  if (!sentinelRef.value) return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadGrid("more");
    },
    { rootMargin: "400px 0px" },
  );
  observer.observe(sentinelRef.value);
}

onMounted(reload);
onBeforeUnmount(() => observer?.disconnect());
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}

.page-range {
  color: #6f6a7e;
  font-size: 11.5px;
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-step,
.page-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 32px;
  height: 32px;
  padding: 0 9px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #45425a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.page-step:hover:not(:disabled),
.page-number:hover {
  border-color: #6440f4;
  color: #6440f4;
}

.page-step:disabled {
  opacity: 0.45;
  cursor: default;
}

.page-number.active {
  border-color: #6440f4;
  background: #6440f4;
  color: #ffffff;
}

.page-gap {
  padding: 0 4px;
  color: #8a84a3;
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

@media (max-width: 620px) {
  .page-number:not(.active) {
    display: none;
  }
}
</style>
