<template>
  <!-- Filters exactly as the CDP app's dashboard widget panel (cdp-fe-app
       dashboard-builder WidgetFilterList / WidgetFilterRow and the shared
       FilterField): "FILTERS · optional", one card per filter (the field
       chosen + a bin, then its control), "+ Add filter" for the next field.
       Same words, same controls, nothing more. Applied as they change (the
       popup's own Apply keeps the table / chart as it was until then). -->
  <div class="tfp">
    <label class="tfp-title">
      {{ t("dataTable.filter.filtersTitle") }}
      <span>{{ t("dataTable.filter.optional") }}</span>
    </label>

    <div v-for="(key, index) in rowKeys" :key="key" class="tfp-row">
      <div class="tfp-row-head">
        <div class="tfp-select-wrap">
          <select class="tfp-select" :value="key" :aria-label="t('dataTable.filter.filtersTitle')" @change="changeField(index, ($event.target as HTMLSelectElement).value)">
            <option
              v-for="col in filterableColumns"
              :key="col.key"
              :value="col.key"
              :disabled="col.key !== key && rowKeys.includes(col.key)"
            >
              {{ col.label }}
            </option>
          </select>
          <ChevronDown class="tfp-chevron" :size="14" aria-hidden="true" />
        </div>
        <button type="button" class="tfp-remove" :aria-label="t('dataTable.filter.removeFilter')" @click="removeRow(index)">
          <Trash2 :size="14" aria-hidden="true" />
        </button>
      </div>

      <template v-if="columnOf(key)">
        <!-- The field's control (FilterField) -->
        <div class="tfp-field">
          <span class="tfp-label">{{ columnOf(key)!.label }}</span>

          <!-- Values to tick: search, chips of the ticked ones, the list -->
          <template v-if="kindOf(columnOf(key)!) === 'values'">
            <div class="tfp-search">
              <Search :size="14" aria-hidden="true" />
              <input
                class="tfp-input"
                :value="valueSearch[key] ?? ''"
                :placeholder="t('dataTable.filter.typeToSearch', { column: columnOf(key)!.label.toLowerCase() })"
                @input="valueSearch[key] = ($event.target as HTMLInputElement).value"
              />
            </div>
            <div v-if="tickedOf(key).length" class="tfp-chips">
              <span v-for="value in tickedOf(key)" :key="value" class="tfp-chip">
                {{ labelOf(columnOf(key)!, value) }}
                <button type="button" :aria-label="t('dataTable.filter.remove')" @click="toggleValue(columnOf(key)!, value)">
                  <X :size="10" aria-hidden="true" />
                </button>
              </span>
            </div>
            <div class="tfp-options">
              <button
                v-for="option in visibleOptions(columnOf(key)!)"
                :key="option.value"
                type="button"
                class="tfp-option"
                :class="{ 'is-on': tickedOf(key).includes(option.value) }"
                @click="toggleValue(columnOf(key)!, option.value)"
              >
                <span>{{ option.label ?? option.value }}</span>
                <Check v-if="tickedOf(key).includes(option.value)" :size="13" aria-hidden="true" />
              </button>
              <div v-if="!visibleOptions(columnOf(key)!).length" class="tfp-empty">{{ t("dataTable.filter.noOptions") }}</div>
            </div>
          </template>

          <!-- Words in the cell -->
          <input
            v-else-if="kindOf(columnOf(key)!) === 'text'"
            class="tfp-input"
            :value="containsOf(key)"
            :placeholder="t('dataTable.filter.search', { column: columnOf(key)!.label.toLowerCase() })"
            @input="setContains(columnOf(key)!, ($event.target as HTMLInputElement).value)"
          />

          <!-- All / Yes / No -->
          <div v-else-if="kindOf(columnOf(key)!) === 'boolean'" class="tfp-seg" role="radiogroup" :aria-label="columnOf(key)!.label">
            <button
              v-for="choice in BOOLEAN_CHOICES"
              :key="choice ?? 'all'"
              type="button"
              role="radio"
              class="tfp-seg-btn"
              :class="{ 'is-on': equalsOf(key) === choice }"
              :aria-checked="equalsOf(key) === choice"
              @click="setEquals(columnOf(key)!, choice)"
            >
              {{ choice === null ? t("dataTable.filter.all") : t(choice === "true" ? "dataTable.yes" : "dataTable.no") }}
            </button>
          </div>

          <!-- Min / Max (numbers), From / To (dates) -->
          <template v-else>
            <div class="tfp-range">
              <input
                class="tfp-input"
                :class="{ 'is-date': columnOf(key)!.type === 'date' }"
                :type="columnOf(key)!.type === 'date' ? 'date' : 'number'"
                :value="rangeOf(key).from"
                :placeholder="columnOf(key)!.type === 'date' ? undefined : t('dataTable.filter.min')"
                @input="setRange(columnOf(key)!, ($event.target as HTMLInputElement).value, rangeOf(key).to)"
              />
              <input
                class="tfp-input"
                :class="{ 'is-date': columnOf(key)!.type === 'date' }"
                :type="columnOf(key)!.type === 'date' ? 'date' : 'number'"
                :value="rangeOf(key).to"
                :placeholder="columnOf(key)!.type === 'date' ? undefined : t('dataTable.filter.max')"
                @input="setRange(columnOf(key)!, rangeOf(key).from, ($event.target as HTMLInputElement).value)"
              />
            </div>
            <div class="tfp-range-labels">
              <span>{{ t(columnOf(key)!.type === "date" ? "dataTable.filter.from" : "dataTable.filter.min") }}</span>
              <span>{{ t(columnOf(key)!.type === "date" ? "dataTable.filter.to" : "dataTable.filter.max") }}</span>
            </div>
          </template>
        </div>
      </template>
    </div>

    <button v-if="nextField" type="button" class="tfp-add" @click="addRow">
      <Plus :size="14" aria-hidden="true" />
      {{ t("dataTable.filter.addFilter") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Check, ChevronDown, Plus, Search, Trash2, X } from "@lucide/vue";
import type { DataColumn, SourceFacets, TableFilter } from "@/types/dataSource";
import { periodRange } from "@/utils/table/dataBinding";

const props = defineProps<{
  // The fields that can be filtered (filters may use columns the table doesn't show)
  columns: DataColumn[];
  facets: SourceFacets | null;
  filters: TableFilter[];
}>();

const emit = defineEmits<{
  "update:filters": [filters: TableFilter[]];
}>();

const { t } = useI18n();

// Only this many values are listed at once; typing narrows the list (as the CDP app)
const MAX_VISIBLE_OPTIONS = 20;
const BOOLEAN_CHOICES = [null, "true", "false"] as const;

type FieldKind = "values" | "text" | "boolean" | "range";

// Fields that can be filtered: a list of values to tick, words to type, yes / no, or a range
const filterableColumns = computed(() =>
  props.columns.filter((c) => {
    const facet = props.facets?.[c.key];
    if (!facet) return !props.facets;
    return facet.kind === "values" ? facet.values.length > 0 : true;
  }),
);

const columnOf = (key: string) => filterableColumns.value.find((c) => c.key === key);

const kindOf = (col: DataColumn): FieldKind => {
  const facet = props.facets?.[col.key];
  if (facet) return facet.kind;
  return col.type === "text" ? "text" : "range";
};

// ── Filter rows ──
// One row per filter, in the order they were added; a row just added (or
// emptied) has no filter yet and only lives here, as the CDP app keeps an
// empty filter value that adds no condition
const rowKeys = ref<string[]>(props.filters.map((f) => f.column));

// Filters set from outside (another source, the AI…) get their rows
watch(
  () => props.filters.map((f) => f.column).join(","),
  () => {
    const missing = props.filters.map((f) => f.column).filter((k) => !rowKeys.value.includes(k));
    if (missing.length) rowKeys.value = [...rowKeys.value, ...missing];
  },
);

// Another source: only its own filters
watch(
  () => props.columns.map((c) => c.key).join(","),
  () => {
    rowKeys.value = props.filters.map((f) => f.column);
    Object.keys(valueSearch).forEach((k) => delete valueSearch[k]);
  },
);

// "Add filter": the first field without a filter row (the button hides when none is left)
const nextField = computed(() => filterableColumns.value.find((c) => !rowKeys.value.includes(c.key)));

function addRow() {
  if (nextField.value) rowKeys.value = [...rowKeys.value, nextField.value.key];
}

// Another field in a row: its filter starts empty
function changeField(index: number, key: string) {
  const old = rowKeys.value[index];
  if (!old || old === key) return;
  rowKeys.value = rowKeys.value.map((k, i) => (i === index ? key : k));
  delete valueSearch[old];
  putFilter(old, null);
}

function removeRow(index: number) {
  const key = rowKeys.value[index];
  rowKeys.value = rowKeys.value.filter((_, i) => i !== index);
  if (key) {
    delete valueSearch[key];
    putFilter(key, null);
  }
}

// ── Filters ──
const filterOf = (key: string) => props.filters.find((f) => f.column === key);

// Replace (or drop) one field's filter
function putFilter(key: string, filter: TableFilter | null) {
  const others = props.filters.filter((f) => f.column !== key);
  if (!filter && others.length === props.filters.length) return;
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

// Ranges (a moving date range set earlier, e.g. by the AI, shows today's
// dates; typing a date makes it a fixed range)
const rangeOf = (key: string) => {
  const f = filterOf(key);
  if (f?.operator !== "between") return { from: "", to: "" };
  if (f.period) return periodRange(f.period);
  return { from: f.value ?? "", to: f.value2 ?? "" };
};

function setRange(col: DataColumn, from: string, to: string) {
  putFilter(
    col.key,
    !from && !to ? null : { ...base(col), operator: "between", value: from || undefined, value2: to || undefined },
  );
}
</script>

<style scoped>
/* Sizes and colours of the CDP app's widget filters, in the app's white theme */
.tfp {
  display: flex;
  flex-direction: column;
}

.tfp-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #6f6a7e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.tfp-title span {
  font-weight: 600;
  text-transform: none;
}

.tfp-row {
  margin-bottom: 8px;
  padding: 10px;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background: #f3f2f8;
}

.tfp-row-head {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.tfp-select-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.tfp-select {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 10px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 13px;
  appearance: none;
  cursor: pointer;
}

.tfp-select:focus {
  outline: none;
  border-color: #6440f4;
  box-shadow: 0 0 0 1px #6440f4;
}

.tfp-chevron {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  color: #8a84a3;
  pointer-events: none;
}

.tfp-remove {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #45425a;
  cursor: pointer;
}

.tfp-remove:hover {
  border-color: #fca5a5;
  color: #dc2626;
}

.tfp-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tfp-label {
  color: #45425a;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.tfp-input {
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 14px;
  transition: border-color 0.15s ease;
}

.tfp-input::placeholder {
  color: #8a84a3;
}

.tfp-input:focus {
  outline: none;
  border-color: #6440f4;
  box-shadow: 0 0 0 1px #6440f4;
}

.tfp-input.is-date {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
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

.tfp-search .tfp-input {
  padding-left: 32px;
}

.tfp-field > .tfp-search + .tfp-chips,
.tfp-field > .tfp-search + .tfp-options,
.tfp-chips + .tfp-options {
  margin-top: 4px;
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
  padding: 4px 4px 4px 10px;
  border-radius: 999px;
  background: #6440f4;
  color: #ffffff;
  font-size: 12px;
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
  background: #ffffff;
}

.tfp-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: none;
  color: #1c1b26;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.tfp-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tfp-option:hover {
  background: #f1eff7;
}

.tfp-option.is-on {
  color: #6440f4;
  font-weight: 600;
}

.tfp-empty {
  padding: 8px 12px;
  color: #8a84a3;
  font-size: 12px;
}

.tfp-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tfp-range-labels {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
  color: #8a84a3;
  font-size: 10px;
}

.tfp-seg {
  display: flex;
  gap: 6px;
}

.tfp-seg-btn {
  flex: 1;
  padding: 6px 0;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #f1eff7;
  color: #45425a;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tfp-seg-btn.is-on {
  border-color: #6440f4;
  background: #6440f4;
  color: #ffffff;
}

.tfp-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  border: 1px dashed #d8d5e3;
  border-radius: 12px;
  background: none;
  color: #6f6a7e;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.tfp-add:hover {
  border-color: #6440f4;
  color: #6440f4;
}
</style>
