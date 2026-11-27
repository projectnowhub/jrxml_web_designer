<template>
  <div class="custom-table-properties">
    <!-- Basic Properties: one card for the grid (rows, headings, total, the
         chosen cells' actions, then every column by name) -->
    <template v-if="part === 'basic'">
      <div class="card">
        <h5>{{ t("customTable.grid") }}<SettingHelpButton id="typedGrid" /></h5>
        <SettingHelpText id="typedGrid" />
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
              :disabled="table.headerRows >= maxHeaderRows(table)"
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
            @change="change(() => setTotalRow(table, ($event.target as HTMLInputElement).checked, t('dataTable.totals.label')))"
          />
          {{ t("customTable.totalRow") }}
        </label>
        <button v-if="!isEditing" type="button" class="wide-btn" @click="startEditing">
          <PencilLine :size="13" aria-hidden="true" />
          {{ t("customTable.editCells") }}
        </button>
        <p class="form-hint">{{ t(isEditing ? "customTable.editingHint" : "customTable.editHint") }}</p>

        <!-- The chosen rows / columns: insert next to them, or delete them -->
        <template v-if="rect">
          <span class="field-label" style="margin-top: 10px">{{ t("customTable.rowsAndColumns") }}</span>
          <div class="action-grid">
            <button v-for="a in ROW_ACTIONS" :key="a.id" type="button" class="action-btn" :disabled="a.disabled?.()" @click="runAction(a.id)">
              <component :is="a.icon" :size="13" aria-hidden="true" />
              {{ a.label() }}
            </button>
          </div>
          <div class="merge-row">
            <button type="button" class="wide-btn" :disabled="!canMerge" @click="merge">
              <TableCellsMerge :size="13" aria-hidden="true" />
              {{ t("customTable.menu.merge") }}
            </button>
            <button type="button" class="wide-btn" :disabled="!canSplit" @click="split">
              <TableCellsSplit :size="13" aria-hidden="true" />
              {{ t("customTable.menu.split") }}
            </button>
          </div>
          <!-- The rows from the chosen one on: a new table on a new page -->
          <button
            v-if="canSplitPlace"
            type="button"
            class="wide-btn split-table-btn"
            :disabled="!canSplitHere"
            :title="canSplitHere ? t('customTable.splitHint', { row: rect.top + 1 }) : t('customTable.splitCant', { row: table.headerRows + 2 })"
            @click="splitHere"
          >
            <Scissors :size="13" aria-hidden="true" />
            {{ t("customTable.menu.splitTable") }}
          </button>
        </template>

        <!-- The columns: how many (add one at the end), each one's name (its
             cell in the first heading row) and delete -->
        <div class="column-section">
          <div class="counter-row">
            <span class="field-label">
              {{ t("customTable.columns") }}
              <span class="column-count">{{ table.columns.length }}</span>
            </span>
            <button
              type="button"
              class="add-column-btn"
              :title="t('customTable.addColumnHint')"
              @click="change(() => insertColumn(table, table.columns.length, table.columns.length - 1))"
            >
              <Plus :size="13" aria-hidden="true" />
              {{ t("customTable.addColumn") }}
            </button>
          </div>
          <p v-if="!table.headerRows" class="form-hint column-hint">{{ t("customTable.columnsNoHeader") }}</p>
          <ul class="column-list">
            <li
              v-for="col in columnRows"
              :key="col.index"
              class="column-row"
              :class="{ 'is-chosen': rect && col.index >= rect.left && col.index <= rect.right }"
            >
              <span class="column-letter" aria-hidden="true">{{ columnName(col.index) }}</span>
              <input v-live-change
                class="column-input"
                type="text"
                :value="col.name"
                :disabled="!col.editable"
                :placeholder="table.headerRows ? t('customTable.columnNamePlaceholder') : ''"
                :title="col.mergedWith !== undefined ? t('customTable.columnMerged', { name: columnName(col.mergedWith) }) : t('customTable.columnName')"
                :aria-label="t('customTable.columnNameOf', { name: columnName(col.index) })"
                @change="renameColumn(col.index, $event)"
              />
              <button
                type="button"
                class="column-delete"
                :disabled="table.columns.length <= 1"
                :title="t('customTable.deleteColumnNamed', { name: col.name || columnName(col.index) })"
                :aria-label="t('customTable.deleteColumnNamed', { name: col.name || columnName(col.index) })"
                @click="removeColumn(col.index)"
              >
                <Trash2 :size="13" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <!-- Style Settings: the look of the chosen cells (the whole table's look,
         space inside cells included, is in Customize below) -->
    <template v-else-if="rect">
      <div class="card">
        <h5>{{ targetTitle }}<SettingHelpButton id="typedCells" /></h5>
        <SettingHelpText id="typedCells" />

        <div class="color-row">
          <div class="field">
            <span class="field-label">{{ t("customTable.fill") }}</span>
            <div class="color-with-clear">
              <ColorSwatchPicker
                :model-value="shown('fill') ?? null"
                :mixed="shown('fill') === undefined"
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
              :mixed="shown('color') === undefined"
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
            <input v-live-change
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
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import SettingHelpButton from "../../help/SettingHelpButton.vue";
import SettingHelpText from "../../help/SettingHelpText.vue";
import { computed, type Component } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
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
  Scissors,
  Trash2,
  Underline,
} from "@lucide/vue";
import notification from "@/utils/notification";
import { canSplitTypedTable, splitPlace, splitTypedTable } from "@/utils/table/splitTypedTable";
import ColorSwatchPicker from "../../common/ColorSwatchPicker.vue";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import { hasFormatting, stripInlineColors } from "@/utils/elementUtils";
import {
  anchorMap,
  columnName,
  customTableLook,
  resolveCell,
  type ResolvedCell,
  deleteColumns,
  deleteRows,
  hasMergedCells,
  insertColumn,
  insertRow,
  maxHeaderRows,
  mergeCells,
  canMergeRect,
  selectionRect,
  setTotalRow,
  splitCells,
  syncTableSize,
  visibleCells,
} from "@/utils/customTable";
import type { CustomTableCell, CustomTableElement } from "@/types";

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

// What the chosen cells are: whole rows ("Row 2", "Rows 2–3"), whole columns
// ("Column B", "Columns B–C"), else how many cells
const targetTitle = computed(() => {
  const r = rect.value;
  if (!r) return "";
  const tbl = table.value;
  const wholeRows = r.left === 0 && r.right === tbl.columns.length - 1;
  const wholeCols = r.top === 0 && r.bottom === tbl.rows.length - 1;
  if (wholeRows && wholeCols) return t("customTable.allCells");
  if (wholeRows && !wholeCols) {
    return r.top === r.bottom
      ? t("customTable.chosenRow", { n: r.top + 1 })
      : t("customTable.chosenRows", { from: r.top + 1, to: r.bottom + 1 });
  }
  if (wholeCols && !wholeRows) {
    return r.left === r.right
      ? t("customTable.chosenColumn", { name: columnName(r.left) })
      : t("customTable.chosenColumns", { from: columnName(r.left), to: columnName(r.right) });
  }
  return t("customTable.selectedCells", targets.value.length);
});

// Choose cells (the table stays open)
const choose = (anchor: { row: number; col: number }, focus = anchor) =>
  (tableCells.value = { uuid: props.element.uuid ?? "", anchor, focus });

// Next to / instead of the chosen cells (as in the right-click menu)
type RowActionId = "rowAbove" | "rowBelow" | "colLeft" | "colRight" | "deleteRows" | "deleteCols";
const rowsChosen = () => (rect.value ? rect.value.bottom - rect.value.top + 1 : 0);
const colsChosen = () => (rect.value ? rect.value.right - rect.value.left + 1 : 0);
const ROW_ACTIONS: { id: RowActionId; icon: Component; label: () => string; disabled?: () => boolean }[] = [
  { id: "rowAbove", icon: ArrowUpToLine, label: () => t("customTable.menu.rowAbove") },
  { id: "rowBelow", icon: ArrowDownToLine, label: () => t("customTable.menu.rowBelow") },
  { id: "colLeft", icon: ArrowLeftToLine, label: () => t("customTable.menu.colLeft") },
  { id: "colRight", icon: ArrowRightToLine, label: () => t("customTable.menu.colRight") },
  {
    id: "deleteRows",
    icon: Trash2,
    label: () => t("customTable.menu.deleteRows", rowsChosen()),
    disabled: () => rowsChosen() >= table.value.rows.length,
  },
  {
    id: "deleteCols",
    icon: Trash2,
    label: () => t("customTable.menu.deleteCols", colsChosen()),
    disabled: () => colsChosen() >= table.value.columns.length,
  },
];

function runAction(id: RowActionId) {
  const r = rect.value;
  if (!r) return;
  const tbl = table.value;
  const lastCol = () => tbl.columns.length - 1;
  const lastRow = () => tbl.rows.length - 1;
  switch (id) {
    case "rowAbove":
      change(() => insertRow(tbl, r.top, r.top));
      choose({ row: r.top, col: 0 }, { row: r.top, col: lastCol() });
      break;
    case "rowBelow":
      change(() => insertRow(tbl, r.bottom + 1, r.bottom));
      choose({ row: r.bottom + 1, col: 0 }, { row: r.bottom + 1, col: lastCol() });
      break;
    case "colLeft":
      change(() => insertColumn(tbl, r.left, r.left));
      choose({ row: 0, col: r.left }, { row: lastRow(), col: r.left });
      break;
    case "colRight":
      change(() => insertColumn(tbl, r.right + 1, r.right));
      choose({ row: 0, col: r.right + 1 }, { row: lastRow(), col: r.right + 1 });
      break;
    case "deleteRows":
      change(() => deleteRows(tbl, r.top, r.bottom));
      choose({ row: Math.min(r.top, lastRow()), col: r.left });
      break;
    case "deleteCols":
      change(() => deleteColumns(tbl, r.left, r.right));
      choose({ row: r.top, col: Math.min(r.left, lastCol()) });
      break;
  }
}

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

// ---- Columns card ----

// A heading cell's words (formatted text without its formatting)
const plainText = (cell: CustomTableCell) =>
  cell.rich ? (new DOMParser().parseFromString(cell.text, "text/html").body.textContent ?? "") : cell.text;

interface ColumnRow {
  index: number;
  name: string;
  editable: boolean;
  // The column whose heading is merged across this one
  mergedWith?: number;
}

// Each column's name: its cell in the first heading row (none without heading rows)
const columnRows = computed<ColumnRow[]>(() => {
  const tbl = table.value;
  const map = tbl.headerRows ? anchorMap(tbl) : null;
  return tbl.columns.map((_, index) => {
    const anchor = map?.[0]?.[index];
    if (!anchor) return { index, name: "", editable: false };
    const cell = tbl.rows[anchor.row]?.cells[anchor.col];
    const merged = anchor.col !== index;
    return { index, name: cell ? plainText(cell) : "", editable: !merged, mergedWith: merged ? anchor.col : undefined };
  });
});

// A new name for a column: its heading cell becomes that plain text (one undo step)
function renameColumn(index: number, event: Event) {
  const cell = table.value.rows[0]?.cells[index];
  const value = (event.target as HTMLInputElement).value;
  if (!cell || !table.value.headerRows || value === plainText(cell)) return;
  change(() => {
    cell.text = value;
    delete cell.rich;
  });
}

// The column and everything in it go (one undo step); cells chosen in the table are let go
function removeColumn(index: number) {
  if (table.value.columns.length <= 1) return;
  change(() => deleteColumns(table.value, index, index));
  if (tableCells.value?.uuid === (props.element.uuid ?? "")) tableCells.value = null;
}

// Set on each target cell; a value the table style already gives is not kept
// (so the cell follows the style again)
function setStyle<K extends StyleKey>(key: K, value: ResolvedCell[K], recordKey?: string) {
  record(recordKey);
  for (const v of targets.value) {
    const cell = v.cell as unknown as Record<string, unknown>;
    if (styleOf(v.row)[key] === value) delete cell[key];
    else cell[key] = value;

    if (key === "color" && typeof v.cell.text === "string" && v.cell.rich) {
      v.cell.text = stripInlineColors(v.cell.text);
      if (!hasFormatting(v.cell.text)) {
        delete v.cell.rich;
      }
    }
  }
  done();
}

function setFontSize(raw: string) {
  const size = Math.round(Number(raw));
  if (!Number.isFinite(size) || size < 4 || size > 72) return;
  setStyle("fontSize", size);
}

const canMerge = computed(() => !!rect.value && canMergeRect(table.value, rect.value));
const canSplit = computed(() => !!rect.value && hasMergedCells(table.value, rect.value));

function merge() {
  const r = rect.value;
  if (!r) return;
  change(() => mergeCells(table.value, r));
  tableCells.value = { uuid: props.element.uuid ?? "", anchor: { row: r.top, col: r.left }, focus: { row: r.top, col: r.left } };
}

// Split table here: the rows from the chosen one on go to a new page
const canSplitPlace = computed(() => !!splitPlace(props.element));
const canSplitHere = computed(() => !!rect.value && canSplitTypedTable(props.element, rect.value.top));
function splitHere() {
  const r = rect.value;
  if (!r) return;
  const moved = splitTypedTable(props.element, r.top);
  if (!moved) return;
  editingElement.value = null;
  tableCells.value = null;
  notification.success(t("customTable.splitDone", { row: r.top + 1, page: (moved.pageIndex ?? 0) + 1 }));
}

function split() {
  const r = rect.value;
  if (r) change(() => splitCells(table.value, r));
}
</script>

<style scoped>
.split-table-btn {
  margin-top: 6px;
}

.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  font: inherit;
  font-size: 12px;
  color: var(--prop-text-primary);
  text-align: left;
  cursor: pointer;
}

.action-btn:hover:not(:disabled) {
  border-color: var(--prop-primary-color, #6440f4);
  color: var(--prop-primary-color, #6440f4);
}

.action-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.card {
  /* Same card as the other property sections */
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.column-section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--prop-border-color);
}

.column-count {
  display: inline-block;
  min-width: 18px;
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 9px;
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
}

.add-column-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font: inherit;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.add-column-btn:hover {
  border-color: var(--prop-primary-color, #6440f4);
  color: var(--prop-primary-color, #6440f4);
}

.column-hint {
  margin: 0 0 8px;
}

.column-row.is-chosen .column-letter {
  border-radius: 4px;
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
}

.column-row.is-chosen .column-input {
  border-color: #c4b5fd;
}

.column-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.column-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.column-letter {
  flex-shrink: 0;
  width: 18px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  color: var(--prop-text-secondary);
}

.column-input {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: var(--prop-text-primary);
  font: inherit;
  font-size: 12px;
  box-sizing: border-box;
}

.column-input:focus {
  outline: none;
  border-color: #c4b5fd;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.12);
}

.column-input:disabled {
  background: #f9fafb;
  color: var(--prop-text-secondary);
}

.column-delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
}

.column-delete:hover:not(:disabled) {
  border-color: #fecaca;
  background: #fef2f2;
  color: #dc2626;
}

.column-delete:disabled {
  opacity: 0.45;
  cursor: default;
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

.counter button {
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

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  color: var(--prop-text-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.counter button:disabled {
  opacity: 0.45;
  cursor: default;
}

.icon-btn.active {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
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
  align-items: center;
  gap: 4px;
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
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
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
  accent-color: var(--prop-primary-color, #6440f4);
}

.merge-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
</style>
