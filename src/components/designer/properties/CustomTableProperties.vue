<template>
  <div class="custom-table-properties">
    <!-- Basic Properties: size of the grid, then the look of the chosen cells -->
    <template v-if="part === 'basic'">
      <div class="card">
        <h5>{{ t("customTable.grid") }}</h5>
        <div class="counter-row">
          <span class="field-label">{{ t("customTable.rows") }}</span>
          <div class="counter">
            <button
              type="button"
              :disabled="table.rows.length <= 1"
              :aria-label="t('customTable.removeRow')"
              :title="t('customTable.removeRow')"
              @click="change(() => deleteRows(table, table.rows.length - 1, table.rows.length - 1))"
            >
              <Minus :size="13" aria-hidden="true" />
            </button>
            <span>{{ table.rows.length }}</span>
            <button
              type="button"
              :aria-label="t('customTable.addRow')"
              :title="t('customTable.addRow')"
              @click="change(() => insertRow(table, table.rows.length, table.rows.length - 1))"
            >
              <Plus :size="13" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="counter-row">
          <span class="field-label">{{ t("customTable.columns") }}</span>
          <div class="counter">
            <button
              type="button"
              :disabled="table.columns.length <= 1"
              :aria-label="t('customTable.removeColumn')"
              :title="t('customTable.removeColumn')"
              @click="change(() => deleteColumns(table, table.columns.length - 1, table.columns.length - 1))"
            >
              <Minus :size="13" aria-hidden="true" />
            </button>
            <span>{{ table.columns.length }}</span>
            <button
              type="button"
              :aria-label="t('customTable.addColumn')"
              :title="t('customTable.addColumn')"
              @click="change(() => insertColumn(table, table.columns.length, table.columns.length - 1))"
            >
              <Plus :size="13" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="counter-row">
          <span class="field-label">{{ t("customTable.headerRows") }}</span>
          <div class="counter">
            <button
              type="button"
              :disabled="table.headerRows <= 0"
              :aria-label="t('customTable.fewerHeaderRows')"
              :title="t('customTable.fewerHeaderRows')"
              @click="change(() => (table.headerRows -= 1))"
            >
              <Minus :size="13" aria-hidden="true" />
            </button>
            <span>{{ table.headerRows }}</span>
            <button
              type="button"
              :disabled="table.headerRows >= Math.min(MAX_HEADER_ROWS, table.rows.length)"
              :aria-label="t('customTable.moreHeaderRows')"
              :title="t('customTable.moreHeaderRows')"
              @click="change(() => (table.headerRows += 1))"
            >
              <Plus :size="13" aria-hidden="true" />
            </button>
          </div>
        </div>
        <label class="toggle-row">
          <input
            type="checkbox"
            :checked="table.totalRow"
            @change="change(() => (table.totalRow = ($event.target as HTMLInputElement).checked))"
          />
          {{ t("customTable.totalRow") }}
        </label>
        <button v-if="!isEditing" type="button" class="wide-btn" @click="startEditing">
          <PencilLine :size="13" aria-hidden="true" />
          {{ t("customTable.editCells") }}
        </button>
        <p class="form-hint">{{ t(isEditing ? "customTable.editingHint" : "customTable.editHint") }}</p>
      </div>

      <div class="card">
        <h5>{{ targetTitle }}</h5>

        <div class="color-row">
          <div class="field">
            <span class="field-label">{{ t("customTable.fill") }}</span>
            <div class="color-with-clear">
              <ColorSwatchPicker
                :model-value="shown('fill') ?? null"
                class="swatch-fill"
                @update:model-value="$event && setStyle('fill', $event, 'fill')"
              />
              <button
                type="button"
                class="icon-btn"
                :class="{ active: !hasOwnColors }"
                :title="t('customTable.styleColors')"
                :aria-label="t('customTable.styleColors')"
                @click="clearOwnColors"
              >
                <RotateCcw :size="13" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="field">
            <span class="field-label">{{ t("customTable.textColor") }}</span>
            <ColorSwatchPicker
              :model-value="shown('color') ?? null"
              class="swatch-fill"
              @update:model-value="$event && setStyle('color', $event, 'color')"
            />
          </div>
        </div>

        <span class="field-label">{{ t("customTable.textStyle") }}</span>
        <div class="seg">
          <button
            v-for="toggle in FONT_TOGGLES"
            :key="toggle.key"
            type="button"
            class="seg-btn"
            :class="{ active: shown(toggle.key) === true }"
            :aria-pressed="shown(toggle.key) === true"
            :title="t(toggle.labelKey)"
            @click="setStyle(toggle.key, shown(toggle.key) !== true)"
          >
            <component :is="toggle.icon" :size="14" aria-hidden="true" />
          </button>
          <label class="size-input" :title="t('customTable.textSize')">
            <input
              type="number"
              min="4"
              max="72"
              step="1"
              :value="shown('fontSize') ?? ''"
              :aria-label="t('customTable.textSize')"
              @change="setFontSize(($event.target as HTMLInputElement).value)"
            />
            <span>pt</span>
          </label>
        </div>

        <span class="field-label">{{ t("customTable.alignment") }}</span>
        <div class="seg">
          <button
            v-for="align in H_ALIGNS"
            :key="align.value"
            type="button"
            class="seg-btn"
            :class="{ active: shown('align') === align.value }"
            :title="t(align.labelKey)"
            :aria-label="t(align.labelKey)"
            @click="setStyle('align', align.value)"
          >
            <component :is="align.icon" :size="14" aria-hidden="true" />
          </button>
          <span class="seg-gap" aria-hidden="true" />
          <button
            v-for="align in V_ALIGNS"
            :key="align.value"
            type="button"
            class="seg-btn"
            :class="{ active: shown('vAlign') === align.value }"
            :title="t(align.labelKey)"
            :aria-label="t(align.labelKey)"
            @click="setStyle('vAlign', align.value)"
          >
            <component :is="align.icon" :size="14" aria-hidden="true" />
          </button>
        </div>

        <div v-if="rect" class="merge-row">
          <button type="button" class="wide-btn" :disabled="!canMerge" @click="merge">
            <TableCellsMerge :size="13" aria-hidden="true" />
            {{ t("customTable.menu.merge") }}
          </button>
          <button type="button" class="wide-btn" :disabled="!canSplit" @click="split">
            <TableCellsSplit :size="13" aria-hidden="true" />
            {{ t("customTable.menu.split") }}
          </button>
        </div>
      </div>
    </template>

    <!-- Style Settings (below the table style editor): space inside the cells -->
    <template v-else>
      <div class="card">
        <h5>{{ t("customTable.text") }}</h5>
        <label class="field">
          <span class="field-label">{{ t("customTable.padding") }}</span>
          <span class="unit-input">
            <input
              type="number"
              min="0"
              max="40"
              step="1"
              :value="table.padding"
              @change="setPadding(($event.target as HTMLInputElement).value)"
            />
            <span>px</span>
          </span>
        </label>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  Italic,
  Minus,
  PencilLine,
  Plus,
  RotateCcw,
  TableCellsMerge,
  TableCellsSplit,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  Underline,
} from "@lucide/vue";
import ColorSwatchPicker from "../../common/ColorSwatchPicker.vue";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import {
  customTableLook,
  MAX_HEADER_ROWS,
  resolveCell,
  type ResolvedCell,
  deleteColumns,
  deleteRows,
  hasMergedCells,
  insertColumn,
  insertRow,
  mergeCells,
  rectCellCount,
  selectionRect,
  splitCells,
  syncTableSize,
  visibleCells,
} from "@/utils/customTable";
import type { CustomTableElement } from "@/types";

const props = defineProps<{
  element: CustomTableElement;
  part: "basic" | "style";
}>();

const { t } = useI18n();
const report = useReportStore();
const { selectedElement, editingElement, tableCells } = storeToRefs(useSelectionStore());

const FONT_TOGGLES = [
  { key: "bold", labelKey: "properties.bold", icon: Bold },
  { key: "italic", labelKey: "properties.italic", icon: Italic },
  { key: "underline", labelKey: "properties.underline", icon: Underline },
] as const;
const H_ALIGNS = [
  { value: "Left", labelKey: "properties.left", icon: TextAlignStart },
  { value: "Center", labelKey: "properties.center", icon: TextAlignCenter },
  { value: "Right", labelKey: "properties.right", icon: TextAlignEnd },
  { value: "Justified", labelKey: "customTable.justified", icon: TextAlignJustify },
] as const;
const V_ALIGNS = [
  { value: "Top", labelKey: "properties.top", icon: AlignVerticalJustifyStart },
  { value: "Middle", labelKey: "properties.middle", icon: AlignVerticalJustifyCenter },
  { value: "Bottom", labelKey: "properties.bottom", icon: AlignVerticalJustifyEnd },
] as const;

const table = computed(() => props.element.table);

const isEditing = computed(() => {
  const editing = editingElement.value;
  const selected = selectedElement.value;
  return (
    !!editing &&
    !!selected &&
    editing.bandIndex === selected.bandIndex &&
    editing.elementIndex === selected.elementIndex &&
    editing.parentFrameIndex === selected.parentFrameIndex
  );
});

// Open the table for typing (like a double-click on it)
function startEditing() {
  const selected = selectedElement.value;
  if (!selected) return;
  editingElement.value = {
    bandIndex: selected.bandIndex,
    elementIndex: selected.elementIndex,
    parentFrameIndex: selected.parentFrameIndex,
  };
}

// The chosen cells while the table is open; otherwise every cell
const rect = computed(() => {
  const sel = tableCells.value;
  if (!isEditing.value || !sel || sel.uuid !== props.element.uuid) return null;
  const clamp = (pos: { row: number; col: number }) => ({
    row: Math.min(Math.max(0, pos.row), table.value.rows.length - 1),
    col: Math.min(Math.max(0, pos.col), table.value.columns.length - 1),
  });
  return selectionRect(table.value, clamp(sel.anchor), clamp(sel.focus));
});

const targets = computed(() => {
  const all = visibleCells(table.value);
  const r = rect.value;
  return r
    ? all.filter((v) => v.row >= r.top && v.row <= r.bottom && v.col >= r.left && v.col <= r.right)
    : all;
});

const targetTitle = computed(() =>
  rect.value ? t("customTable.selectedCells", targets.value.length) : t("customTable.allCells"),
);

type StyleKey = keyof ResolvedCell;

const look = computed(() => customTableLook(table.value));
// How a cell looks with nothing set on it: the table style for its row
const styleOf = (row: number) => resolveCell(table.value, look.value, row, { text: "" });

// What all target cells show (style + their own settings), or undefined when they differ
function shown<K extends StyleKey>(key: K): ResolvedCell[K] | undefined {
  const values = targets.value.map((v) => resolveCell(table.value, look.value, v.row, v.cell)[key]);
  return values.every((v) => v === values[0]) ? values[0] : undefined;
}

// Colours set on the target cells themselves (exceptions to the table style)
const hasOwnColors = computed(() => targets.value.some((v) => v.cell.fill || v.cell.color));
function clearOwnColors() {
  if (!hasOwnColors.value) return;
  change(() =>
    targets.value.forEach((v) => {
      delete v.cell.fill;
      delete v.cell.color;
    }),
  );
}

// One undo step per action; a colour being dragged is one step too
let lastEdit = { key: "", time: 0 };
function record(key?: string) {
  const now = Date.now();
  if (!key || key !== lastEdit.key || now - lastEdit.time > 1000) report.saveStateToHistory();
  lastEdit = { key: key ?? "", time: now };
}

function done() {
  syncTableSize(props.element);
  report.updateJrxml();
}

function change(mutate: () => void) {
  record();
  mutate();
  done();
}

// Set on each target cell; a value the table style already gives is not kept
// (so the cell follows the style again)
function setStyle<K extends StyleKey>(key: K, value: ResolvedCell[K], recordKey?: string) {
  record(recordKey);
  for (const v of targets.value) {
    const cell = v.cell as unknown as Record<string, unknown>;
    if (styleOf(v.row)[key] === value) delete cell[key];
    else cell[key] = value;
  }
  done();
}

function setFontSize(raw: string) {
  const size = Math.round(Number(raw));
  if (!Number.isFinite(size) || size < 4 || size > 72) return;
  setStyle("fontSize", size);
}

function setPadding(raw: string) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return;
  change(() => (table.value.padding = Math.min(40, Math.max(0, value))));
}

const canMerge = computed(() => !!rect.value && rectCellCount(table.value, rect.value) > 1);
const canSplit = computed(() => !!rect.value && hasMergedCells(table.value, rect.value));

function merge() {
  const r = rect.value;
  if (!r) return;
  change(() => mergeCells(table.value, r));
  tableCells.value = { uuid: props.element.uuid ?? "", anchor: { row: r.top, col: r.left }, focus: { row: r.top, col: r.left } };
}

function split() {
  const r = rect.value;
  if (r) change(() => splitCells(table.value, r));
}
</script>

<style scoped>
.card {
  margin-bottom: var(--prop-spacing-md);
  padding: var(--prop-spacing-sm) 10px 10px;
  border-radius: var(--prop-border-radius-md);
  background: var(--prop-bg-secondary);
}

.card h5 {
  margin: 0 0 8px;
  font-size: var(--prop-font-size-sm);
  font-weight: 600;
  color: var(--prop-text-primary);
}

.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary);
}

.field {
  display: block;
  min-width: 0;
}

.counter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.counter-row .field-label {
  margin: 0;
}

.counter {
  display: flex;
  align-items: center;
  gap: 6px;
}

.counter span {
  min-width: 22px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.counter button,
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.counter button:disabled {
  opacity: 0.45;
  cursor: default;
}

.icon-btn.active {
  border-color: var(--prop-primary-color, #1890ff);
  background: #e6f4ff;
  color: var(--prop-primary-color, #1890ff);
}

.wide-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 30px;
  margin-top: 4px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.wide-btn:hover:not(:disabled),
.counter button:hover:not(:disabled),
.icon-btn:hover {
  border-color: var(--prop-border-focus);
}

.wide-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.form-hint {
  margin: 6px 0 0;
  font-size: var(--prop-font-size-xs);
  line-height: 1.4;
  color: var(--prop-text-tertiary);
}

.color-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.color-with-clear {
  display: flex;
  gap: 4px;
}

.color-with-clear > :first-child {
  flex: 1;
  min-width: 0;
}

.seg {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  color: var(--prop-text-secondary);
  cursor: pointer;
}

.seg-btn.active {
  border-color: var(--prop-primary-color, #1890ff);
  background: #e6f4ff;
  color: var(--prop-primary-color, #1890ff);
}

.seg-gap {
  width: 6px;
}

.size-input,
.unit-input {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  color: var(--prop-text-secondary);
  box-sizing: border-box;
}

.size-input {
  margin-left: auto;
  width: 64px;
}

.unit-input {
  width: 100%;
}

.size-input input,
.unit-input input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: var(--prop-text-primary);
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 0 6px;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.toggle-row input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--prop-primary-color, #1890ff);
}

.merge-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
</style>
