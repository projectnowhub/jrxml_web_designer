<template>
  <!-- Highlight rules of a project-data table: colour the whole row, or only
       the cell, when a column's value is one of some values, in a range, or a
       date before / after the day the report is printed. The first rule that
       matches a row wins. -->
  <div class="th-container">
    <p v-if="!rules.length" class="th-empty-hint">{{ t("dataTable.highlight.empty") }}</p>

    <div v-for="(rule, i) in rules" :key="rule.id" class="th-rule" :class="{ 'is-open': openId === rule.id }">
      <!-- The rule in one line; click to change it -->
      <div class="th-head">
        <button type="button" class="th-summary" :aria-expanded="openId === rule.id" @click="openId = openId === rule.id ? '' : rule.id">
          <span class="th-chip" :style="{ background: rule.fill || '#ffffff', color: rule.color || '#1c1b26', fontWeight: rule.bold ? 700 : 400 }">Aa</span>
          <span class="th-text">{{ summary(rule) }}</span>
        </button>
        <button
          type="button"
          class="th-icon"
          :disabled="i === 0"
          :title="t('dataTable.highlight.moveUp')"
          :aria-label="t('dataTable.highlight.moveUp')"
          @click="move(i, -1)"
        >
          <ArrowUp :size="13" aria-hidden="true" />
        </button>
        <button type="button" class="th-icon is-danger" :title="t('dataTable.highlight.delete')" :aria-label="t('dataTable.highlight.delete')" @click="remove(i)">
          <Trash2 :size="13" aria-hidden="true" />
        </button>
      </div>

      <div v-if="openId === rule.id" class="th-editor">
        <!-- What is coloured -->
        <span class="th-label">{{ t("dataTable.highlight.colour") }}</span>
        <div class="th-seg" role="radiogroup" :aria-label="t('dataTable.highlight.colour')">
          <button
            v-for="scope in SCOPES"
            :key="scope"
            type="button"
            role="radio"
            class="th-seg-btn"
            :class="{ active: rule.scope === scope }"
            :aria-checked="rule.scope === scope"
            @click="set(rule, { scope })"
          >
            {{ t(`dataTable.highlight.scopes.${scope}`) }}
          </button>
        </div>

        <!-- When -->
        <label class="th-field">
          <span class="th-label">{{ t("dataTable.highlight.when") }}</span>
          <select class="th-select" :value="rule.column" @change="setColumn(rule, ($event.target as HTMLSelectElement).value)">
            <option v-for="c in columns" :key="c.key" :value="c.key">{{ c.label }}</option>
          </select>
        </label>

        <!-- Text: the values to tick -->
        <template v-if="kindOf(rule) === 'text'">
          <span class="th-label">{{ t("dataTable.highlight.isOneOf") }}</span>
          <div class="th-values">
            <label v-for="v in valuesOf(rule)" :key="v.value" class="th-value">
              <input type="checkbox" :checked="(rule.values ?? []).includes(v.value)" @change="toggleValue(rule, v.value)" />
              <span>{{ v.value || t("dataTable.highlight.blank") }}</span>
              <small>{{ v.count }}</small>
            </label>
            <p v-if="!valuesOf(rule).length" class="th-hint">{{ t("dataTable.highlight.noValues") }}</p>
          </div>
        </template>

        <!-- Numbers and amounts: from / to -->
        <div v-else-if="kindOf(rule) === 'number'" class="th-range">
          <label>
            <span class="th-label">{{ t("dataTable.highlight.from") }}</span>
            <input v-live-change type="number" :value="rule.from ?? ''" :placeholder="rangeOf(rule).min" @change="set(rule, { from: ($event.target as HTMLInputElement).value || undefined })" />
          </label>
          <label>
            <span class="th-label">{{ t("dataTable.highlight.to") }}</span>
            <input v-live-change type="number" :value="rule.to ?? ''" :placeholder="rangeOf(rule).max" @change="set(rule, { to: ($event.target as HTMLInputElement).value || undefined })" />
          </label>
        </div>

        <!-- Dates: before / after the print day, or between two dates -->
        <template v-else>
          <div class="th-seg is-wrap" role="radiogroup" :aria-label="t('dataTable.highlight.when')">
            <button
              v-for="op in DATE_OPS"
              :key="op"
              type="button"
              role="radio"
              class="th-seg-btn"
              :class="{ active: rule.operator === op }"
              :aria-checked="rule.operator === op"
              @click="set(rule, { operator: op })"
            >
              {{ t(`dataTable.highlight.dateOps.${op}`) }}
            </button>
          </div>
          <div v-if="rule.operator === 'between'" class="th-range">
            <label>
              <span class="th-label">{{ t("dataTable.highlight.from") }}</span>
              <input type="date" :value="rule.from ?? ''" @change="set(rule, { from: ($event.target as HTMLInputElement).value || undefined })" />
            </label>
            <label>
              <span class="th-label">{{ t("dataTable.highlight.to") }}</span>
              <input type="date" :value="rule.to ?? ''" @change="set(rule, { to: ($event.target as HTMLInputElement).value || undefined })" />
            </label>
          </div>
        </template>

        <!-- How it looks -->
        <span class="th-label">{{ t("dataTable.highlight.look") }}</span>
        <div class="th-look">
          <div class="th-color">
            <small>{{ t("dataTable.highlight.fill") }}</small>
            <ColorSwatchPicker :model-value="rule.fill ?? null" @update:model-value="set(rule, { fill: $event })" />
          </div>
          <div class="th-color">
            <small>{{ t("dataTable.highlight.textColour") }}</small>
            <ColorSwatchPicker :model-value="rule.color ?? null" @update:model-value="set(rule, { color: $event })" />
          </div>
          <button
            type="button"
            class="th-icon is-big"
            :class="{ active: rule.bold }"
            :aria-pressed="!!rule.bold"
            :title="t('properties.bold')"
            :aria-label="t('properties.bold')"
            @click="set(rule, { bold: rule.bold ? undefined : true })"
          >
            <Bold :size="14" aria-hidden="true" />
          </button>
        </div>
        <p v-if="!isComplete(rule)" class="th-warning">{{ t("dataTable.highlight.incomplete") }}</p>
      </div>
    </div>

    <button type="button" class="th-add" @click="add">
      <Plus :size="13" aria-hidden="true" />
      {{ t("dataTable.highlight.add") }}
    </button>
    <p v-if="rules.length > 1" class="th-hint th-order">{{ t("dataTable.highlight.order") }}</p>
  </div>
</template>

<script setup lang="ts">
import ColorSwatchPicker from "../../common/ColorSwatchPicker.vue";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowUp, Bold, Plus, Trash2 } from "@lucide/vue";
import { newHighlightId } from "@/utils/table/columnLook";
import type { SourceFacets, TableColumnBinding, TableHighlight } from "@/types/dataSource";

const props = defineProps<{
  columns: TableColumnBinding[];
  facets: SourceFacets;
  highlights: TableHighlight[];
}>();

const emit = defineEmits<{
  (e: "update:highlights", value: TableHighlight[]): void;
}>();

const { t } = useI18n();

const SCOPES = ["row", "cell"] as const;
const DATE_OPS = ["past", "future", "between"] as const;

const rules = computed(() => props.highlights ?? []);
const openId = ref("");

const columnOf = (rule: TableHighlight) => props.columns.find((c) => c.key === rule.column);
const kindOf = (rule: TableHighlight): "text" | "number" | "date" => {
  const type = columnOf(rule)?.type;
  return type === "date" ? "date" : type === "number" || type === "currency" ? "number" : "text";
};
const valuesOf = (rule: TableHighlight) => {
  const facet = props.facets[rule.column];
  return facet?.kind === "values" ? facet.values.slice(0, 60) : [];
};
const rangeOf = (rule: TableHighlight) => {
  const facet = props.facets[rule.column];
  return facet?.kind === "range" ? { min: String(facet.min ?? ""), max: String(facet.max ?? "") } : { min: "", max: "" };
};

const isComplete = (rule: TableHighlight) =>
  (rule.fill || rule.color || rule.bold) &&
  (rule.operator === "in" ? (rule.values ?? []).length > 0 : rule.operator === "between" ? !!(rule.from || rule.to) : true);

// The rule in plain words: "Row · Status is Delayed, On hold"
function summary(rule: TableHighlight): string {
  const column = columnOf(rule)?.label ?? rule.column;
  let condition: string;
  if (rule.operator === "in") {
    const values = rule.values ?? [];
    condition = values.length
      ? t("dataTable.highlight.summaryIn", { values: values.slice(0, 3).join(", ") + (values.length > 3 ? "…" : "") })
      : t("dataTable.highlight.summaryNothing");
  } else if (rule.operator === "past" || rule.operator === "future") {
    condition = t(`dataTable.highlight.dateOps.${rule.operator}`).toLowerCase();
  } else if (rule.from && rule.to) {
    condition = t("dataTable.highlight.summaryBetween", { from: rule.from, to: rule.to });
  } else if (rule.from) {
    condition = t("dataTable.highlight.summaryFrom", { from: rule.from });
  } else if (rule.to) {
    condition = t("dataTable.highlight.summaryTo", { to: rule.to });
  } else {
    condition = t("dataTable.highlight.summaryNothing");
  }
  return t("dataTable.highlight.summary", { scope: t(`dataTable.highlight.scopes.${rule.scope}`), column, condition });
}

function set(rule: TableHighlight, patch: Partial<TableHighlight>) {
  const next = props.highlights.map((r) => {
    if (r.id !== rule.id) return r;
    const updated = { ...r, ...patch };
    for (const k of Object.keys(patch) as (keyof TableHighlight)[]) {
      if (updated[k] === undefined) delete updated[k];
    }
    return updated;
  });
  emit("update:highlights", next);
}

// Another column: its own kind of condition
function setColumn(rule: TableHighlight, key: string) {
  const col = props.columns.find((c) => c.key === key);
  const patch: Partial<TableHighlight> = {
    column: key,
    operator: col?.type === "date" ? "past" : col?.type === "number" || col?.type === "currency" ? "between" : "in",
    values: undefined,
    from: undefined,
    to: undefined,
  };
  set(rule, patch);
}

function toggleValue(rule: TableHighlight, value: string) {
  const cur = rule.values ?? [];
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  set(rule, { values: next.length ? next : undefined });
}

function add() {
  const col = props.columns[0];
  const rule: TableHighlight = {
    id: newHighlightId(),
    column: col?.key ?? "",
    operator: col?.type === "date" ? "past" : col?.type === "number" || col?.type === "currency" ? "between" : "in",
    scope: "row",
    fill: "#ece8fd",
    color: "#6440f4",
    bold: true,
  };
  openId.value = rule.id;
  emit("update:highlights", [...props.highlights, rule]);
}

function remove(i: number) {
  const next = [...props.highlights];
  next.splice(i, 1);
  emit("update:highlights", next);
}

function move(i: number, delta: number) {
  const next = [...props.highlights];
  const target = i + delta;
  if (target < 0 || target >= next.length) return;
  const temp = next[i]!;
  next[i] = next[target]!;
  next[target] = temp;
  emit("update:highlights", next);
}
</script>

<style scoped>
.th-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.th-empty-hint {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--prop-text-secondary, #6b7280);
}

.th-hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--prop-text-secondary, #6b7280);
}

.th-order {
  margin-top: 4px;
}

.th-rule {
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.th-rule.is-open {
  border-color: #6440f4;
}

.th-head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
}

.th-summary {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.th-summary:hover {
  background: rgba(28, 27, 38, 0.04);
}

.th-chip {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 11px;
  flex-shrink: 0;
}

.th-text {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-icon {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
}

.th-icon:hover:not(:disabled) {
  border-color: rgba(28, 27, 38, 0.12);
  background: rgba(28, 27, 38, 0.04);
  color: var(--prop-text-primary, #1f2937);
}

.th-icon:disabled {
  opacity: 0.35;
  cursor: default;
}

.th-icon.is-danger:hover {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
}

.th-icon.is-big {
  width: 28px;
  height: 28px;
}

.th-icon.is-big.active {
  border-color: #6440f4;
  background: #6440f4;
  color: #ffffff;
}

.th-editor {
  padding: 8px 10px 10px;
  border-top: 1px solid rgba(28, 27, 38, 0.08);
  background: #fbfafd;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.th-label {
  display: block;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary, #6b7280);
}

.th-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.th-select {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid rgba(28, 27, 38, 0.15);
  border-radius: 6px;
  background: #ffffff;
  font: inherit;
  font-size: 12px;
  color: var(--prop-text-primary, #1f2937);
}

.th-seg {
  display: flex;
  gap: 4px;
}

.th-seg.is-wrap {
  flex-wrap: wrap;
}

.th-seg-btn {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid rgba(28, 27, 38, 0.15);
  border-radius: 6px;
  background: #ffffff;
  font: inherit;
  font-size: 11.5px;
  color: var(--prop-text-primary, #1f2937);
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
}

.th-seg-btn:hover {
  border-color: #a99cf0;
}

.th-seg-btn.active {
  border-color: #6440f4;
  background: #6440f4;
  color: #ffffff;
}

.th-values {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 140px;
  overflow-y: auto;
  padding: 4px 6px;
  border: 1px solid rgba(28, 27, 38, 0.15);
  border-radius: 6px;
  background: #ffffff;
}

.th-value {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  cursor: pointer;
}

.th-value small {
  margin-left: auto;
  color: var(--prop-text-secondary, #6b7280);
}

.th-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.th-range input {
  width: 100%;
  padding: 5px 8px;
  border: 1px solid rgba(28, 27, 38, 0.15);
  border-radius: 6px;
  background: #ffffff;
  font: inherit;
  font-size: 12px;
  box-sizing: border-box;
}

.th-look {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.th-color {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.th-color small {
  font-size: 10.5px;
  color: var(--prop-text-secondary, #6b7280);
}

.th-warning {
  margin: 2px 0 0;
  font-size: 11px;
  color: #b45309;
}

.th-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 6px 10px;
  border: 1px dashed rgba(100, 64, 244, 0.4);
  border-radius: 6px;
  background: rgba(100, 64, 244, 0.04);
  color: #6440f4;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.th-add:hover {
  background: rgba(100, 64, 244, 0.08);
}
</style>