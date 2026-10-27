<template>
  <!-- Filters, laid out like the CDP app's Filters panel (ModuleFilters /
       FilterField / FieldsListPopover): the fields shown, chosen with the
       "3/34" button (user-defined fields marked with a bolt), each with its own
       control: tick values, type words, Min / Max, From / To, All / Yes / No.
       Applied as they change (the popup's own Apply keeps the table as it was
       until then). -->
  <div class="tfp">
    <div class="tfp-bar">
      <span class="tfp-match">
        {{ matchCount === null ? t("dataTable.loading") : t("dataTable.filter.matchCount", matchCount) }}
      </span>
      <button v-if="filters.length" type="button" class="tfp-action" :title="t('dataTable.filter.clearAllHint')" @click="emit('update:filters', [])">
        <X :size="12" aria-hidden="true" />{{ t("dataTable.filter.clearAll") }}
      </button>
      <!-- Which fields are shown here -->
      <div ref="pickerRoot" class="tfp-picker">
        <button
          type="button"
          class="tfp-picker-btn"
          :class="{ 'is-open': pickerOpen }"
          :title="t('dataTable.filter.fieldsShown')"
          :aria-expanded="pickerOpen"
          @click="pickerOpen = !pickerOpen"
        >
          <ListChecks :size="12" aria-hidden="true" />
          {{ shownKeys.length }}/{{ filterableColumns.length }}
        </button>
        <div v-if="pickerOpen" class="tfp-picker-menu" role="dialog" :aria-label="t('dataTable.filter.fieldsShown')">
          <div class="tfp-search">
            <Search :size="12" aria-hidden="true" />
            <input v-model="fieldSearch" :placeholder="t('dataTable.filter.searchFields')" />
          </div>
          <div class="tfp-picker-actions">
            <button type="button" class="tfp-link" @click="showFields(filterableColumns.map((c) => c.key))">
              {{ t("dataTable.filter.selectAll") }}
            </button>
            <button type="button" class="tfp-link" @click="showFields([])">{{ t("dataTable.filter.clearAll") }}</button>
          </div>
          <div class="tfp-picker-list">
            <label v-for="col in pickerColumns" :key="col.key" class="tfp-picker-row">
              <input type="checkbox" :checked="shownKeys.includes(col.key)" @change="toggleField(col.key)" />
              <Zap v-if="col.userDefined" :size="11" class="tfp-bolt" aria-hidden="true" />
              <span>{{ col.label }}</span>
            </label>
            <p v-if="!pickerColumns.length" class="tfp-empty">{{ t("dataTable.filter.noFieldsMatch", { words: fieldSearch }) }}</p>
          </div>
        </div>
      </div>
    </div>

    <p v-if="!shownColumns.length" class="tfp-empty">{{ t("dataTable.filter.noFields") }}</p>

    <!-- One block per field shown -->
    <div v-for="col in shownColumns" :key="col.key" class="tfp-field">
      <div class="tfp-field-head">
        <span class="tfp-label">
          <Zap v-if="col.userDefined" :size="11" class="tfp-bolt" aria-hidden="true" />{{ col.label }}
        </span>
        <button v-if="filterOf(col.key)" type="button" class="tfp-clear" @click="putFilter(col.key, null)">
          {{ t("dataTable.filter.clear") }}
        </button>
      </div>

      <!-- Values to tick: search, chips of the ticked ones, the list -->
      <template v-if="kindOf(col) === 'values'">
        <div class="tfp-search">
          <Search :size="13" aria-hidden="true" />
          <input
            :value="valueSearch[col.key] ?? ''"
            :placeholder="t('dataTable.filter.typeToSearch', { column: col.label.toLowerCase() })"
            @input="valueSearch[col.key] = ($event.target as HTMLInputElement).value"
          />
        </div>
        <div v-if="tickedOf(col.key).length" class="tfp-chips">
          <span v-for="value in tickedOf(col.key)" :key="value" class="tfp-chip">
            {{ labelOf(col, value) }}
            <button type="button" :aria-label="t('dataTable.filter.remove')" @click="toggleValue(col, value)">
              <X :size="10" aria-hidden="true" />
            </button>
          </span>
        </div>
        <div class="tfp-options">
          <button
            v-for="option in visibleOptions(col)"
            :key="option.value"
            type="button"
            class="tfp-option"
            :class="{ 'is-on': tickedOf(col.key).includes(option.value) }"
            @click="toggleValue(col, option.value)"
          >
            <span>{{ option.label ?? option.value }}</span>
            <small v-if="option.count !== undefined">{{ option.count }}</small>
            <Check v-if="tickedOf(col.key).includes(option.value)" :size="13" aria-hidden="true" />
          </button>
          <p v-if="!visibleOptions(col).length" class="tfp-empty">{{ t("dataTable.filter.noMatchingValues") }}</p>
        </div>
      </template>

      <!-- Words in the cell -->
      <input
        v-else-if="kindOf(col) === 'text'"
        class="tfp-input"
        :value="containsOf(col.key)"
        :placeholder="t('dataTable.filter.search', { column: col.label.toLowerCase() })"
        @input="setContains(col, ($event.target as HTMLInputElement).value)"
      />

      <!-- All / Yes / No -->
      <div v-else-if="kindOf(col) === 'boolean'" class="tfp-seg" role="radiogroup" :aria-label="col.label">
        <button
          v-for="choice in BOOLEAN_CHOICES"
          :key="choice ?? 'all'"
          type="button"
          role="radio"
          class="tfp-seg-btn"
          :class="{ 'is-on': equalsOf(col.key) === choice }"
          :aria-checked="equalsOf(col.key) === choice"
          @click="setEquals(col, choice)"
        >
          {{ choice === null ? t("dataTable.filter.all") : t(choice === "true" ? "dataTable.yes" : "dataTable.no") }}
        </button>
      </div>

      <!-- Min / Max, From / To (dates also move with today's date) -->
      <template v-else>
        <div class="tfp-range">
          <input
            class="tfp-input"
            :type="col.type === 'date' ? 'date' : 'number'"
            :value="rangeOf(col.key).from"
            :placeholder="t('dataTable.filter.min')"
            @input="setRange(col, ($event.target as HTMLInputElement).value, rangeOf(col.key).to)"
          />
          <input
            class="tfp-input"
            :type="col.type === 'date' ? 'date' : 'number'"
            :value="rangeOf(col.key).to"
            :placeholder="t('dataTable.filter.max')"
            @input="setRange(col, rangeOf(col.key).from, ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="tfp-range-labels">
          <span>{{ t(col.type === "date" ? "dataTable.filter.from" : "dataTable.filter.min") }}</span>
          <span>{{ t(col.type === "date" ? "dataTable.filter.to" : "dataTable.filter.max") }}</span>
        </div>
        <div v-if="col.type === 'date'" class="tfp-periods">
          <button
            v-for="period in RELATIVE_PERIODS"
            :key="period"
            type="button"
            class="tfp-period"
            :class="{ 'is-on': periodOf(col.key) === period }"
            :title="t('dataTable.filter.movingRangeHint', periodDates(period))"
            @click="periodOf(col.key) === period ? putFilter(col.key, null) : setPeriod(col, period)"
          >
            {{ t(`dataTable.filter.periods.${period}`) }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Check, ListChecks, Search, X, Zap } from "@lucide/vue";
import type { DataColumn, RelativePeriod, SourceFacets, TableFilter } from "@/types/dataSource";
import { RELATIVE_PERIODS, periodRange } from "@/utils/table/dataBinding";
import { formatCellValue } from "@/utils/table/dataTable";

const props = defineProps<{
  // Every column of the source (filters may use columns the table doesn't show)
  columns: DataColumn[];
  facets: SourceFacets | null;
  filters: TableFilter[];
  // Rows the current choices keep; null while unknown
  matchCount: number | null;
  // Fields shown at first besides the filtered ones (the table's columns)
  suggestedFields?: string[];
}>();

const emit = defineEmits<{
  "update:filters": [filters: TableFilter[]];
}>();

const { t, locale } = useI18n();

// Only this many values are listed at once; typing narrows the list (as the CDP app)
const MAX_VISIBLE_OPTIONS = 20;
// Fields shown when nothing suggests any
const FIRST_FIELDS = 3;
const BOOLEAN_CHOICES = [null, "true", "false"] as const;

type FieldKind = "values" | "text" | "boolean" | "range";

// Columns that can be filtered: a list of values to tick, words to type, yes / no, or a range
const filterableColumns = computed(() =>
  props.columns.filter((c) => {
    const facet = props.facets?.[c.key];
    if (!facet) return !props.facets;
    return facet.kind === "values" ? facet.values.length > 0 : true;
  }),
);

const kindOf = (col: DataColumn): FieldKind => {
  const facet = props.facets?.[col.key];
  if (facet) return facet.kind;
  return col.type === "text" ? "text" : "range";
};

// ── Fields shown ──
// Which fields: the user's choice; until then the filtered fields and the suggested ones
const chosenKeys = ref<string[] | null>(null);
const shownKeys = computed(() => {
  if (chosenKeys.value) return chosenKeys.value;
  const known = new Set(filterableColumns.value.map((c) => c.key));
  const start = [...props.filters.map((f) => f.column), ...(props.suggestedFields ?? [])].filter((k) => known.has(k));
  const keys = [...new Set(start)];
  return keys.length ? keys : filterableColumns.value.slice(0, FIRST_FIELDS).map((c) => c.key);
});
// Always in the columns' order, so a field never moves when it gets a filter
const shownColumns = computed(() => {
  const shown = new Set(shownKeys.value);
  return filterableColumns.value.filter((c) => shown.has(c.key));
});

// Another source: its own fields
watch(
  () => props.columns.map((c) => c.key).join(","),
  () => {
    chosenKeys.value = null;
    Object.keys(valueSearch).forEach((k) => delete valueSearch[k]);
  },
);

// A field taken away loses its filter (as the CDP app)
function showFields(keys: string[]) {
  const dropped = props.filters.filter((f) => !keys.includes(f.column));
  chosenKeys.value = keys;
  if (dropped.length) emit("update:filters", props.filters.filter((f) => keys.includes(f.column)));
}

function toggleField(key: string) {
  showFields(shownKeys.value.includes(key) ? shownKeys.value.filter((k) => k !== key) : [...shownKeys.value, key]);
}

const pickerOpen = ref(false);
const fieldSearch = ref("");
const pickerRoot = ref<HTMLElement | null>(null);
const pickerColumns = computed(() => {
  const q = fieldSearch.value.trim().toLowerCase();
  return q ? filterableColumns.value.filter((c) => c.label.toLowerCase().includes(q)) : filterableColumns.value;
});

// The list closes on a click elsewhere
function closePicker(event: PointerEvent) {
  if (pickerOpen.value && !pickerRoot.value?.contains(event.target as Node)) pickerOpen.value = false;
}
onMounted(() => document.addEventListener("pointerdown", closePicker, true));
onBeforeUnmount(() => document.removeEventListener("pointerdown", closePicker, true));

// ── Filters ──
const filterOf = (key: string) => props.filters.find((f) => f.column === key);

// Replace (or drop) one column's filter
function putFilter(key: string, filter: TableFilter | null) {
  const others = props.filters.filter((f) => f.column !== key);
  emit("update:filters", filter ? [...others, filter] : others);
}

const base = (col: DataColumn) => ({ column: col.key, label: col.label, type: col.type });

// Values to tick
const valueSearch = reactive<Record<string, string>>({});
const tickedOf = (key: string) => filterOf(key)?.values ?? [];

function visibleOptions(col: DataColumn) {
  const facet = props.facets?.[col.key];
  if (facet?.kind !== "values") return [];
  const q = (valueSearch[col.key] ?? "").trim().toLowerCase();
  const matching = q ? facet.values.filter((v) => (v.label ?? v.value).toLowerCase().includes(q)) : facet.values;
  return matching.slice(0, MAX_VISIBLE_OPTIONS);
}

const labelOf = (col: DataColumn, value: string) => {
  const facet = props.facets?.[col.key];
  const known = facet?.kind === "values" ? facet.values.find((v) => v.value === value)?.label : undefined;
  return known ?? filterOf(col.key)?.labels?.[value] ?? value;
};

// The ticked values with their names as shown (the chips show the names,
// the stored values are what is filtered on)
function toggleValue(col: DataColumn, value: string) {
  const current = tickedOf(col.key);
  const values = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  if (!values.length) return putFilter(col.key, null);
  const labels = Object.fromEntries(values.map((v) => [v, labelOf(col, v)]).filter(([v, l]) => v !== l));
  putFilter(col.key, { ...base(col), operator: "in", values, ...(Object.keys(labels).length ? { labels } : {}) });
}

// Yes / no
const equalsOf = (key: string): "true" | "false" | null => {
  const f = filterOf(key);
  return f?.operator === "equals" && (f.value === "true" || f.value === "false") ? f.value : null;
};

function setEquals(col: DataColumn, value: "true" | "false" | null) {
  putFilter(col.key, value ? { ...base(col), operator: "equals", value } : null);
}

// Typed words
const containsOf = (key: string) => {
  const f = filterOf(key);
  return f?.operator === "contains" ? (f.value ?? "") : "";
};

function setContains(col: DataColumn, words: string) {
  putFilter(col.key, words.trim() ? { ...base(col), operator: "contains", value: words } : null);
}

// Ranges (a typed date ends a moving range)
const rangeOf = (key: string) => {
  const f = filterOf(key);
  const typed = f?.operator === "between" && !f.period;
  return { from: typed ? (f.value ?? "") : "", to: typed ? (f.value2 ?? "") : "" };
};

function setRange(col: DataColumn, from: string, to: string) {
  putFilter(
    col.key,
    !from && !to ? null : { ...base(col), operator: "between", value: from || undefined, value2: to || undefined },
  );
}

// Moving date ranges
const periodOf = (key: string): RelativePeriod | undefined => {
  const f = filterOf(key);
  return f?.operator === "between" ? f.period : undefined;
};

function setPeriod(col: DataColumn, period: RelativePeriod) {
  putFilter(col.key, { ...base(col), operator: "between", period });
}

// Today's dates for a moving range, for its tooltip
const periodDates = (period: RelativePeriod) => {
  const { from, to } = periodRange(period);
  return { from: formatCellValue(from, "date", locale.value), to: formatCellValue(to, "date", locale.value) };
};
</script>

<style scoped>
.tfp {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.tfp-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tfp-match {
  margin-right: auto;
  color: #6f6a7e;
  font-size: 11.5px;
}

.tfp-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #f6f5fa;
  color: #45425a;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.tfp-action:hover {
  border-color: #c9bdfb;
  color: #6440f4;
}

.tfp-link,
.tfp-clear {
  padding: 0;
  border: none;
  background: none;
  color: #6f6a7e;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
}

.tfp-link:hover,
.tfp-clear:hover {
  color: #1c1b26;
}

.tfp-picker {
  position: relative;
}

.tfp-picker-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #6f6a7e;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.tfp-picker-btn:hover,
.tfp-picker-btn.is-open {
  border-color: #c9bdfb;
  background: #f4f1ff;
  color: #6440f4;
}

.tfp-picker-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 256px;
  padding: 10px;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(28, 27, 38, 0.14);
}

.tfp-picker-actions {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
}

.tfp-picker-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 256px;
  overflow-y: auto;
}

.tfp-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  color: #45425a;
  font-size: 12px;
  cursor: pointer;
}

.tfp-picker-row:hover {
  background: #f6f5fa;
}

.tfp-picker-row input {
  flex: none;
  accent-color: #6440f4;
}

.tfp-picker-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tfp-bolt {
  flex: none;
  margin-right: 3px;
  color: #f59e0b;
}

.tfp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tfp-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tfp-label {
  display: inline-flex;
  align-items: center;
  color: #6f6a7e;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tfp-clear {
  font-size: 10px;
  color: #8a84a3;
}

.tfp-input,
.tfp-search input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 12.5px;
}

.tfp-input:focus,
.tfp-search input:focus {
  outline: none;
  border-color: #6440f4;
  box-shadow: 0 0 0 1px #6440f4;
}

.tfp-search {
  position: relative;
}

.tfp-search svg {
  position: absolute;
  top: 50%;
  left: 10px;
  transform: translateY(-50%);
  color: #8a84a3;
  pointer-events: none;
}

.tfp-search input {
  padding-left: 30px;
}

.tfp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tfp-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  background: #6440f4;
  color: #ffffff;
  font-size: 11.5px;
  font-weight: 500;
}

.tfp-chip button {
  display: inline-flex;
  padding: 2px;
  border: none;
  border-radius: 999px;
  background: none;
  color: inherit;
  cursor: pointer;
}

.tfp-chip button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.tfp-options {
  display: flex;
  flex-direction: column;
  max-height: 192px;
  overflow-y: auto;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #fbfbfd;
}

.tfp-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: none;
  color: #45425a;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.tfp-option span {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tfp-option small {
  color: #8a84a3;
}

.tfp-option:hover {
  background: #f1eff7;
}

.tfp-option.is-on {
  color: #6440f4;
  font-weight: 600;
}

.tfp-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tfp-range-labels {
  display: flex;
  justify-content: space-between;
  margin-top: -2px;
  padding: 0 2px;
  color: #8a84a3;
  font-size: 10px;
}

.tfp-seg {
  display: flex;
  gap: 6px;
}

.tfp-seg-btn,
.tfp-period {
  flex: 1;
  padding: 6px 0;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #f6f5fa;
  color: #6f6a7e;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.tfp-seg-btn.is-on,
.tfp-period.is-on {
  border-color: #6440f4;
  background: #6440f4;
  color: #ffffff;
}

.tfp-periods {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tfp-period {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
}

.tfp-empty {
  margin: 0;
  padding: 8px 12px;
  color: #8a84a3;
  font-size: 11.5px;
}
</style>
