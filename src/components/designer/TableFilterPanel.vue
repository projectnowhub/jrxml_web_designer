<template>
  <!-- Filter & sort, laid out like a shop's filter panel: categories on the
       left (Sort, then each column), that category's choices on the right -->
  <div class="tfp">
    <div v-if="appliedChips.length" class="tfp-applied" :aria-label="t('dataTable.filter.applied')">
      <button
        v-for="chip in appliedChips"
        :key="chip.key"
        type="button"
        class="tfp-chip"
        :title="t('dataTable.filter.remove')"
        @click="chip.remove()"
      >
        <component :is="chip.icon" :size="11" aria-hidden="true" />
        <span>{{ chip.text }}</span>
        <X :size="11" aria-hidden="true" />
      </button>
    </div>

    <div class="tfp-box">
      <!-- Categories -->
      <ul class="tfp-rail" role="tablist" :aria-label="t('dataTable.filter.title')">
        <li v-if="showSort">
          <button
            type="button"
            role="tab"
            class="tfp-cat"
            :class="{ active: active === SORT }"
            :aria-selected="active === SORT"
            @click="active = SORT"
          >
            <span class="tfp-cat-name">{{ t("dataTable.filter.sortBy") }}</span>
            <span v-if="sort.length" class="tfp-dot" aria-hidden="true"></span>
          </button>
        </li>
        <li v-for="col in filterableColumns" :key="col.key">
          <button
            type="button"
            role="tab"
            class="tfp-cat"
            :class="{ active: active === col.key }"
            :aria-selected="active === col.key"
            @click="openColumn(col.key)"
          >
            <span class="tfp-cat-name">{{ col.label }}</span>
            <span v-if="selectedCount(col.key)" class="tfp-badge">{{ selectedCount(col.key) }}</span>
          </button>
        </li>
      </ul>

      <!-- Choices -->
      <div class="tfp-pane" role="tabpanel">
        <!-- Sort: one column at a time, then its order -->
        <template v-if="active === SORT">
          <div v-if="sortColumn" class="tfp-order">
            <span class="tfp-order-label">{{ t("dataTable.filter.order") }}</span>
            <div class="tfp-segment" role="radiogroup" :aria-label="t('dataTable.filter.order')">
              <button
                v-for="dir in (['asc', 'desc'] as const)"
                :key="dir"
                type="button"
                role="radio"
                class="tfp-segment-btn"
                :class="{ active: sort[0]?.direction === dir }"
                :aria-checked="sort[0]?.direction === dir"
                @click="setSortColumn(sortColumn, dir)"
              >
                {{ sortDirectionLabel(sortColumn.type, dir, t) }}
              </button>
            </div>
          </div>
          <div class="tfp-options" role="radiogroup" :aria-label="t('dataTable.filter.sortBy')">
            <label class="tfp-option">
              <input type="radio" :name="sortGroup" :checked="!sortColumn" @change="setSort(null)" />
              <span class="tfp-option-text">{{ t("dataTable.filter.defaultOrder") }}</span>
            </label>
            <label v-for="col in columns" :key="col.key" class="tfp-option">
              <input
                type="radio"
                :name="sortGroup"
                :checked="sortColumn?.key === col.key"
                @change="setSortColumn(col, sort[0]?.direction ?? 'asc')"
              />
              <span class="tfp-option-text">{{ col.label }}</span>
            </label>
          </div>
        </template>

        <template v-else-if="activeColumn">
          <div v-if="!facets" class="tfp-message">{{ t("dataTable.loading") }}</div>

          <!-- Text: tick the values to keep -->
          <template v-else-if="activeFacet?.kind === 'values'">
            <label v-if="activeFacet.values.length > SEARCH_FROM" class="tfp-search">
              <Search :size="13" aria-hidden="true" />
              <input
                v-model="search"
                type="text"
                :placeholder="t('dataTable.filter.search', { column: activeColumn.label })"
              />
            </label>
            <div class="tfp-links">
              <button type="button" class="tfp-link" @click="selectAllShown">{{ t("dataTable.filter.selectAll") }}</button>
              <button type="button" class="tfp-link" :disabled="!selectedCount(activeColumn.key)" @click="clearColumn(activeColumn.key)">
                {{ t("dataTable.filter.clear") }}
              </button>
            </div>
            <div class="tfp-options">
              <label v-for="item in shownValues" :key="item.value" class="tfp-option">
                <input
                  type="checkbox"
                  :checked="isTicked(activeColumn.key, item.value)"
                  @change="toggleValue(activeColumn, item.value, ($event.target as HTMLInputElement).checked)"
                />
                <span class="tfp-option-text">{{ item.value }}</span>
                <span class="tfp-count">{{ item.count }}</span>
              </label>
              <div v-if="!shownValues.length" class="tfp-message">
                {{ t(activeFacet.values.length ? "dataTable.filter.noMatchingValues" : "dataTable.filter.noValues") }}
              </div>
            </div>
          </template>

          <!-- Number, amount, date: a range -->
          <template v-else-if="activeFacet?.kind === 'range'">
            <p v-if="activeFacet.min !== null" class="tfp-hint">
              {{ t("dataTable.filter.rangeHint", { from: show(activeFacet.min), to: show(activeFacet.max) }) }}
            </p>
            <!-- Dates: ranges that move with today's date (a report reused next month) -->
            <template v-if="activeColumn.type === 'date'">
              <span class="tfp-group-label">{{ t("dataTable.filter.movingRange") }}</span>
              <div class="tfp-quick" role="group" :aria-label="t('dataTable.filter.movingRange')">
                <button
                  v-for="period in RELATIVE_PERIODS"
                  :key="period"
                  type="button"
                  class="tfp-pill"
                  :class="{ active: periodOf(activeColumn.key) === period }"
                  :aria-pressed="periodOf(activeColumn.key) === period"
                  @click="periodOf(activeColumn.key) === period ? clearColumn(activeColumn.key) : setPeriod(activeColumn, period)"
                >
                  {{ t(`dataTable.filter.periods.${period}`) }}
                </button>
              </div>
              <p v-if="periodOf(activeColumn.key)" class="tfp-hint">
                {{ t("dataTable.filter.movingRangeHint", periodDates(periodOf(activeColumn.key)!)) }}
              </p>
              <span v-if="quickPicks.length" class="tfp-group-label">{{ t("dataTable.filter.fixedRange") }}</span>
            </template>
            <div v-if="quickPicks.length" class="tfp-quick" role="group" :aria-label="t('dataTable.filter.quickPicks')">
              <button
                v-for="pick in quickPicks"
                :key="pick.label"
                type="button"
                class="tfp-pill"
                :class="{ active: isPicked(pick) }"
                :aria-pressed="isPicked(pick)"
                @click="isPicked(pick) ? clearColumn(activeColumn.key) : setRange(activeColumn, pick.from, pick.to)"
              >
                {{ pick.label }}
              </button>
            </div>
            <!-- Dates stack: two date pickers don't fit side by side -->
            <div class="tfp-range" :class="{ 'is-stacked': activeColumn.type === 'date' }">
              <label class="tfp-field">
                <span>{{ t(activeColumn.type === "date" ? "dataTable.filter.from" : "dataTable.filter.min") }}</span>
                <input
                  :type="activeColumn.type === 'date' ? 'date' : 'number'"
                  :value="rangeOf(activeColumn.key).from"
                  :placeholder="activeFacet.min !== null ? String(activeFacet.min) : ''"
                  @change="setRange(activeColumn, ($event.target as HTMLInputElement).value, rangeOf(activeColumn.key).to)"
                />
              </label>
              <span class="tfp-dash" aria-hidden="true">–</span>
              <label class="tfp-field">
                <span>{{ t(activeColumn.type === "date" ? "dataTable.filter.to" : "dataTable.filter.max") }}</span>
                <input
                  :type="activeColumn.type === 'date' ? 'date' : 'number'"
                  :value="rangeOf(activeColumn.key).to"
                  :placeholder="activeFacet.max !== null ? String(activeFacet.max) : ''"
                  @change="setRange(activeColumn, rangeOf(activeColumn.key).from, ($event.target as HTMLInputElement).value)"
                />
              </label>
            </div>
            <button
              type="button"
              class="tfp-link"
              :disabled="!selectedCount(activeColumn.key)"
              @click="clearColumn(activeColumn.key)"
            >
              {{ t("dataTable.filter.clear") }}
            </button>
          </template>
        </template>
      </div>
    </div>

    <div class="tfp-foot">
      <button type="button" class="tfp-link" :disabled="!appliedChips.length" @click="clearAll">
        {{ t("dataTable.filter.clearAll") }}
      </button>
      <span v-if="matchCount !== null" class="tfp-muted">
        {{ t("dataTable.filter.matchCount", matchCount) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch, type Component } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowDownUp, Funnel, Search, X } from "@lucide/vue";
import type {
  ColumnFacet,
  DataColumn,
  RelativePeriod,
  SourceFacets,
  TableFilter,
  TableSort,
} from "@/types/dataSource";
import { RELATIVE_PERIODS, periodRange } from "@/utils/table/dataBinding";
import { formatCellValue } from "@/utils/table/dataTable";
import { describeFilter, describeSort, sortDirectionLabel } from "@/utils/table/summary";

const props = withDefaults(
  defineProps<{
    // Every column of the source (filters may use columns the table doesn't show)
    columns: DataColumn[];
    facets: SourceFacets | null;
    filters: TableFilter[];
    sort?: TableSort[];
    // Rows the current choices keep; null while unknown
    matchCount: number | null;
    // Charts have no row order: no Sort category
    showSort?: boolean;
  }>(),
  { sort: () => [], showSort: true },
);

const emit = defineEmits<{
  "update:filters": [filters: TableFilter[]];
  "update:sort": [sort: TableSort[]];
}>();

const { t, locale } = useI18n();

const SORT = "__sort";
// A search box appears for columns with more values than this
const SEARCH_FROM = 8;

const search = ref("");

// Columns with something to choose from (a column whose cells are all empty has nothing)
const filterableColumns = computed(() =>
  props.columns.filter((c) => {
    const facet = props.facets?.[c.key];
    if (!facet) return !props.facets;
    return facet.kind === "values" ? facet.values.length > 0 : facet.min !== null;
  }),
);

// The category opened first: Sort, or the first column when there is no Sort
const firstCategory = () => (props.showSort ? SORT : (filterableColumns.value[0]?.key ?? ""));
const active = ref<string>(firstCategory());

const activeColumn = computed(() => props.columns.find((c) => c.key === active.value));
const activeFacet = computed<ColumnFacet | undefined>(() =>
  activeColumn.value ? props.facets?.[activeColumn.value.key] : undefined,
);

// A new source: back to Sort
watch(
  () => props.columns.map((c) => c.key).join(","),
  () => {
    active.value = firstCategory();
    search.value = "";
  },
);

function openColumn(key: string) {
  active.value = key;
  search.value = "";
}

const filterOf = (key: string) => props.filters.find((f) => f.column === key);

function selectedCount(key: string): number {
  const f = filterOf(key);
  if (!f) return 0;
  if (f.operator === "in") return f.values?.length ?? 0;
  return f.period || f.value || f.value2 ? 1 : 0;
}

// Replace (or drop) one column's filter
function putFilter(key: string, filter: TableFilter | null) {
  const others = props.filters.filter((f) => f.column !== key);
  emit("update:filters", filter ? [...others, filter] : others);
}

function clearColumn(key: string) {
  putFilter(key, null);
}

function clearAll() {
  emit("update:filters", []);
  emit("update:sort", []);
}

function setSort(sort: TableSort | null) {
  emit("update:sort", sort ? [sort] : []);
}

// Radio group name of this panel's sort choices, unique on the page
const sortGroup = `tfp-sort-${useId()}`;

// The column sorted on (a sort on a column the source no longer has counts as none)
const sortColumn = computed(() => props.columns.find((c) => c.key === props.sort[0]?.column));

function setSortColumn(col: DataColumn, direction: "asc" | "desc") {
  setSort({ column: col.key, label: col.label, type: col.type, direction });
}

// ── Text values ──
const shownValues = computed(() => {
  const facet = activeFacet.value;
  if (facet?.kind !== "values") return [];
  const q = search.value.trim().toLowerCase();
  return q ? facet.values.filter((v) => v.value.toLowerCase().includes(q)) : facet.values;
});

const isTicked = (key: string, value: string) => filterOf(key)?.values?.includes(value) ?? false;

function toggleValue(col: DataColumn, value: string, on: boolean) {
  const current = filterOf(col.key)?.values ?? [];
  const values = on ? [...current, value] : current.filter((v) => v !== value);
  putFilter(col.key, values.length ? { column: col.key, label: col.label, type: col.type, operator: "in", values } : null);
}

function selectAllShown() {
  const col = activeColumn.value;
  if (!col) return;
  const current = filterOf(col.key)?.values ?? [];
  const values = [...new Set([...current, ...shownValues.value.map((v) => v.value)])];
  putFilter(col.key, { column: col.key, label: col.label, type: col.type, operator: "in", values });
}

// ── Ranges ──
const rangeOf = (key: string) => {
  const f = filterOf(key);
  return { from: f?.operator === "between" ? (f.value ?? "") : "", to: f?.operator === "between" ? (f.value2 ?? "") : "" };
};

function setRange(col: DataColumn, from: string, to: string) {
  const empty = !from && !to;
  putFilter(
    col.key,
    empty ? null : { column: col.key, label: col.label, type: col.type, operator: "between", value: from || undefined, value2: to || undefined },
  );
}

// ── Moving date ranges ──
const periodOf = (key: string): RelativePeriod | undefined => {
  const f = filterOf(key);
  return f?.operator === "between" ? f.period : undefined;
};

function setPeriod(col: DataColumn, period: RelativePeriod) {
  putFilter(col.key, { column: col.key, label: col.label, type: col.type, operator: "between", period });
}

// Today's dates for a moving range, for the hint under the choices
const periodDates = (period: RelativePeriod) => {
  const { from, to } = periodRange(period);
  return { from: show(from), to: show(to) };
};

// Numbers in labels without trailing ".00"
function show(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const type = activeColumn.value?.type ?? "text";
  if (type === "date") return formatCellValue(value, "date", locale.value);
  const n = Number(value);
  return n.toLocaleString(locale.value, { maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });
}

interface QuickPick {
  label: string;
  from: string;
  to: string;
}

// A round step that splits the range into about four parts: 1, 2, 2.5 or 5 × 10^n
function niceStep(span: number): number {
  const rough = span / 4;
  if (rough <= 0) return 0;
  const power = 10 ** Math.floor(Math.log10(rough));
  const unit = [1, 2, 2.5, 5, 10].find((m) => m * power >= rough) ?? 10;
  return unit * power;
}

const MAX_MONTH_PICKS = 12;

const quickPicks = computed<QuickPick[]>(() => {
  const col = activeColumn.value;
  const facet = activeFacet.value;
  if (!col || facet?.kind !== "range" || facet.min === null || facet.max === null) return [];

  if (col.type === "date") {
    // One pick per month in the data
    const picks: QuickPick[] = [];
    const start = new Date(String(facet.min).slice(0, 7) + "-01T00:00:00");
    const end = new Date(String(facet.max).slice(0, 7) + "-01T00:00:00");
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    for (let d = start; d <= end && picks.length < MAX_MONTH_PICKS; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      picks.push({
        label: d.toLocaleDateString(locale.value, { month: "short", year: "numeric" }),
        from: iso(d),
        to: iso(last),
      });
    }
    return picks.length > 1 ? picks : [];
  }

  const min = Number(facet.min);
  const max = Number(facet.max);
  const step = niceStep(max - min);
  if (!step) return [];
  const cuts: number[] = [];
  for (let c = Math.ceil(min / step) * step; c < max; c += step) if (c > min) cuts.push(c);
  if (!cuts.length) return [];
  const picks: QuickPick[] = [{ label: t("dataTable.filter.under", { value: show(cuts[0]) }), from: "", to: String(cuts[0]) }];
  for (let i = 1; i < cuts.length; i++) {
    picks.push({
      label: t("dataTable.filter.range", { from: show(cuts[i - 1]), to: show(cuts[i]) }),
      from: String(cuts[i - 1]),
      to: String(cuts[i]),
    });
  }
  const top = cuts[cuts.length - 1]!;
  picks.push({ label: t("dataTable.filter.andAbove", { value: show(top) }), from: String(top), to: "" });
  return picks;
});

const isPicked = (pick: QuickPick) => {
  const key = activeColumn.value?.key;
  if (!key) return false;
  const r = rangeOf(key);
  return r.from === pick.from && r.to === pick.to;
};

// ── What's applied ──
const appliedChips = computed<{ key: string; text: string; icon: Component; remove: () => void }[]>(() => {
  const chips = props.filters
    .filter((f) => selectedCount(f.column) > 0)
    .map((f) => ({
      key: `f-${f.column}`,
      text: describeFilter(undefined, f, t, locale.value),
      icon: Funnel as Component,
      remove: () => clearColumn(f.column),
    }));
  const s = props.sort[0];
  if (s) {
    chips.push({ key: "sort", text: describeSort(undefined, s, t), icon: ArrowDownUp as Component, remove: () => setSort(null) });
  }
  return chips;
});
</script>

<style scoped>
.tfp {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tfp-applied {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tfp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 3px 8px;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  cursor: pointer;
}

.tfp-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tfp-chip:hover {
  border-color: #93c5fd;
  background: #dbeafe;
}

.tfp-box {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  height: 300px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.tfp-rail {
  margin: 0;
  padding: 4px 0;
  list-style: none;
  overflow-y: auto;
  background: #f6f7f9;
  border-right: 1px solid #e5e7eb;
}

.tfp-cat {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  background: transparent;
  color: #4b5563;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.tfp-cat:hover {
  color: #111827;
}

.tfp-cat.active {
  background: #fff;
  color: #111827;
  font-weight: 600;
}

.tfp-cat.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #2563eb;
}

.tfp-cat-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tfp-badge {
  flex-shrink: 0;
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
}

.tfp-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #2563eb;
}

.tfp-pane {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 10px;
  overflow-y: auto;
}

.tfp-options {
  display: flex;
  flex-direction: column;
}

.tfp-order {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef0f4;
}

.tfp-order-label {
  flex-shrink: 0;
  font-size: 11px;
  color: #6b7280;
}

.tfp-segment {
  display: flex;
  flex: 1;
  min-width: 0;
  padding: 2px;
  border-radius: 6px;
  background: #f3f4f6;
}

.tfp-segment-btn {
  flex: 1;
  min-width: 0;
  padding: 4px 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #4b5563;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.tfp-segment-btn:hover {
  color: #111827;
}

.tfp-segment-btn.active {
  background: #fff;
  color: #1d4ed8;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.tfp-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 6px;
  font-size: 12px;
  color: #1f2937;
  cursor: pointer;
}

.tfp-option:hover {
  background: #f3f4f6;
}

.tfp-option input {
  flex-shrink: 0;
  margin: 0;
  accent-color: #2563eb;
}

.tfp-option-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tfp-count {
  flex-shrink: 0;
  font-size: 11px;
  color: #9ca3af;
}

.tfp-search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #9ca3af;
}

.tfp-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: #1f2937;
}

.tfp-links {
  display: flex;
  gap: 12px;
}

.tfp-link {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: #2563eb;
  font-size: 12px;
  cursor: pointer;
}

.tfp-link:disabled {
  color: #9ca3af;
  cursor: default;
}

.tfp-hint {
  margin: 0;
  font-size: 11px;
  color: #6b7280;
}

.tfp-group-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9ca3af;
}

.tfp-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tfp-pill {
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  font-size: 11px;
  cursor: pointer;
}

.tfp-pill:hover {
  border-color: #93c5fd;
}

.tfp-pill.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.tfp-range {
  display: flex;
  align-items: flex-end;
  gap: 6px;
}

.tfp-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  font-size: 11px;
  color: #6b7280;
}

.tfp-field input {
  height: 30px;
  min-width: 0;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  color: #1f2937;
}

.tfp-range.is-stacked {
  flex-direction: column;
  align-items: stretch;
}

.tfp-range.is-stacked .tfp-dash {
  display: none;
}

.tfp-field input {
  width: 100%;
  box-sizing: border-box;
}

.tfp-dash {
  padding-bottom: 7px;
  color: #9ca3af;
}

.tfp-message {
  padding: 12px 4px;
  font-size: 12px;
  color: #9ca3af;
}

.tfp-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tfp-muted {
  font-size: 11px;
  color: #9ca3af;
}
</style>
