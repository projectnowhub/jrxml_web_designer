<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :selected-elements="selectedElements"
    :is-dragging="isDragging"
    :is-out-of-bounds="isOutOfBounds"
    :parent-frame-index="parentFrameIndex"
    @select="(b, i, multi) => emit('select', b, i, multi, parentFrameIndex)"
    @drag-start="(e, b, i) => emit('dragStart', e, b, i, parentFrameIndex)"
    @resize-start="(e, b, i, _f, dir) => emit('resizeStart', e, b, i, parentFrameIndex, dir)"
    @contextmenu="(e, b, i) => emit('contextmenu', e, b, i, parentFrameIndex)"
    @start-editing="(b, i) => emit('startEditing', b, i, parentFrameIndex)"
  >
    <div
      ref="tableRef"
      class="data-table"
      :class="{ 'is-drop-target': isDropTarget }"
      :data-table-uuid="element.uuid"
      @mousedown.capture="wasSelected = isSelected"
      @dragenter="onDragOver"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="isDropTarget = false"
    >
      <!-- Header -->
      <div class="dt-row" :style="{ height: `${headerHeight}px` }">
        <div
          v-for="(col, i) in displayColumns"
          :key="col.key"
          class="dt-cell"
          :class="{ 'is-placeholder': !binding }"
          :style="cellStyle('header', col, i)"
          @click="chooseColumn(col.key, 'header')"
        >
          {{ col.label }}
        </div>
      </div>

      <!-- Sample rows (the report prints every row) -->
      <template v-if="binding">
        <div
          v-for="(slot, r) in rowSlotsShown"
          :key="r"
          class="dt-row"
          :style="{ height: `${rowHeight}px` }"
        >
          <div
            v-if="slot.kind === 'more'"
            class="dt-cell dt-more"
            :style="cellStyle('row', undefined, 0, r)"
          >
            {{ t("dataTable.moreRows", slot.count) }}
          </div>
          <div
            v-else-if="slot.kind === 'message'"
            class="dt-cell dt-message"
            :style="cellStyle('row', undefined, 0, r)"
          >
            {{ slot.text }}
          </div>
          <template v-else>
            <div
              v-for="(col, i) in binding.columns"
              :key="col.key"
              class="dt-cell"
              :style="cellStyle('row', col, i, r, slot.row)"
              @click="chooseColumn(col.key, 'data')"
            >
              <BarcodeCell
                v-if="tableColumnBarcode(col)"
                :type="tableColumnBarcode(col)!"
                :value="slot.row[col.key]"
                :height="rowHeight"
              />
              <template v-else>{{ formatCellValue(slot.row[col.key], col.type, locale, col.choices) }}</template>
            </div>
          </template>
        </div>

        <!-- Totals: the backend's, over every matching row (the function's name until known) -->
        <div v-if="showTotals" class="dt-row" :style="{ height: `${rowHeight}px` }">
          <div
            v-for="(col, i) in binding.columns"
            :key="col.key"
            class="dt-cell"
            :style="cellStyle('totals', col, i)"
            @click="chooseColumn(col.key, 'total')"
          >
            {{ col.total ? totalText(col) : i === 0 ? t("dataTable.totals.label") : "" }}
          </div>
        </div>
      </template>

      <!-- Empty table: one row and a hint to drop data on it -->
      <template v-else>
        <div class="dt-row" :style="{ height: `${rowHeight}px` }">
          <div
            v-for="(col, i) in displayColumns"
            :key="col.key"
            class="dt-cell is-placeholder"
            :style="cellStyle('row', col, i, 0)"
          ></div>
        </div>
        <div class="dt-drop-hint">
          <DatabaseZap :size="14" aria-hidden="true" />
          <span>{{ t("dataTable.dropHint") }}</span>
        </div>
      </template>

      <!-- While selected: lines to drag, between columns (their widths) and
           under the heading and the sample rows (heading / row height) -->
      <template v-if="isSelected && binding && !isDragging">
        <div
          v-for="(edge, i) in columnEdges"
          :key="`c${i}`"
          class="dt-col-edge"
          :style="{ left: `${edge}px` }"
          :title="t('dataTable.dragColumnEdge')"
          @mousedown.stop.prevent="startColumnDrag($event, i)"
        />
        <div
          v-for="edge in rowEdges"
          :key="`r${edge.index}`"
          class="dt-row-edge"
          :class="{ 'is-bottom': edge.y >= element.height - 1 }"
          :style="{ top: `${edge.y}px` }"
          :title="t(edge.index < 0 ? 'dataTable.dragHeaderEdge' : 'dataTable.dragRowEdge')"
          @mousedown.stop.prevent="startRowDrag($event, edge.index)"
        />
      </template>

      <!-- One outline around the chosen column -->
      <div
        v-if="chosenColumnBounds"
        class="dt-column-frame"
        :style="{
          left: `${chosenColumnBounds.left}px`,
          width: `${chosenColumnBounds.width}px`,
        }"
      />
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { DatabaseZap } from "@lucide/vue";
import BaseElement from "./BaseElement.vue";
import BarcodeCell from "@/components/common/BarcodeCell.vue";
import { tableColumnBarcode } from "@/utils/barcode/barcodeTypes";
import { useTableRows, useTableTotals } from "@/composables/useTableRows";
import {
  CANVAS_SAMPLE_ROWS,
  PLACEHOLDER_COLUMN_COUNT,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  lookAlignFor,
  formatCellValue,
  hasTotalsRow,
  rowSlots,
} from "@/utils/table/dataTable";
import { distributeColumnWidths, MIN_TABLE_COLUMN_WIDTH } from "@/utils/table/dataBinding";
import { lookPartStyles, resolveLook, rowColorAt, tableCellCss, type TableStylePart } from "@/utils/table/tableThemes";
import { isDataSourceDrag } from "@/utils/table/dataDrag";
import { columnPartLook, partLookCss } from "@/utils/table/columnLook";
import { useSelectionStore } from "@/stores/selection";
import { useReportStore } from "@/stores/report";
import { useEditorStore } from "@/stores/editor";
import { storeToRefs } from "pinia";
import type { SelectedElementInfo, TableElement } from "@/types";
import type { DataRow, TableColumnBinding } from "@/types/dataSource";

const props = defineProps<{
  element: TableElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements?: { bandIndex: number; elementIndex: number; parentFrameIndex?: number }[];
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  parentFrameIndex?: number;
}>();

const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

const { t, locale } = useI18n();

const binding = computed(() => props.element.binding);
const headerHeight = computed(() => props.element.headerHeight ?? TABLE_HEADER_HEIGHT);
const rowHeight = computed(() => props.element.rowHeight ?? TABLE_ROW_HEIGHT);
const showTotals = computed(() => hasTotalsRow(binding.value));

const { rows, totalCount, loading, failed } = useTableRows(
  toRef(() => binding.value),
  CANVAS_SAMPLE_ROWS,
);

const { totals } = useTableTotals(toRef(() => binding.value));

function totalText(col: TableColumnBinding): string {
  const value = totals.value[col.key];
  if (value === undefined || value === null) return t(`dataTable.totals.${col.total}`);
  return formatCellValue(value, col.total === "count" ? "number" : col.type, locale.value);
}

type PreviewColumn = Pick<TableColumnBinding, "key" | "label" | "width" | "type">;

const displayColumns = computed<PreviewColumn[]>(() => {
  if (binding.value) return binding.value.columns;
  const widths = distributeColumnWidths(PLACEHOLDER_COLUMN_COUNT, props.element.width);
  return widths.map((width, i) => ({
    key: `placeholder-${i}`,
    label: t("dataTable.placeholderColumn", { n: i + 1 }),
    width,
    type: "text",
  }));
});

type Slot =
  | { kind: "row"; row: DataRow }
  | { kind: "more"; count: number }
  | { kind: "message"; text: string };

// Fill the table's height with sample rows; the last slot says how many more
const rowSlotsShown = computed<Slot[]>(() => {
  const slots = rowSlots(props.element);
  if (loading.value && !rows.value.length) return [{ kind: "message", text: t("dataTable.loading") }];
  if (failed.value) return [{ kind: "message", text: t("dataTable.loadFailed") }];
  if (!rows.value.length) return [{ kind: "message", text: t("dataTable.noRows") }];
  const printed = totalCount.value;
  const fits = printed <= slots ? printed : slots - 1;
  const shown: Slot[] = rows.value.slice(0, fits).map((row) => ({ kind: "row", row }));
  if (printed > fits) shown.push({ kind: "more", count: printed - fits });
  return shown;
});

// A project-data table is only as tall as its rows (up to the sample rows the
// page shows): its rows come from the project and the PDF prints them all, so
// height beyond them would be empty space that never prints. Dragging it
// taller springs back when the drag ends; shorter (fewer sample rows) stays.
const editor = useEditorStore();
const contentHeight = computed(() => {
  const shownRows = Math.min(Math.max(totalCount.value, 1), CANVAS_SAMPLE_ROWS);
  return headerHeight.value + shownRows * rowHeight.value + (showTotals.value ? rowHeight.value : 0);
});
watch(
  [contentHeight, () => props.element.height, () => editor.isDraggingOrResizing, loading, failed],
  () => {
    if (!binding.value || loading.value || failed.value || editor.isDraggingOrResizing) return;
    if (props.element.height > contentHeight.value + 0.5) {
      props.element.height = contentHeight.value;
      useReportStore().updateJrxml();
    }
  },
  { immediate: true },
);

const look = computed(() => resolveLook(binding.value));
const partStyles = computed(() => lookPartStyles(look.value));

function cellStyle(part: TableStylePart, col: PreviewColumn | undefined, index: number, rowIndex = 0, row?: DataRow) {
  const css: Record<string, string> = tableCellCss(partStyles.value[part], part === "row" ? rowColorAt(look.value, rowIndex) : undefined);
  const bCol = col && binding.value ? (col as TableColumnBinding) : undefined;
  // The column's own look (body cells: with the highlight rules on this row)
  const own = bCol && binding.value ? columnPartLook(binding.value, bCol, part, row ?? null) : undefined;
  Object.assign(css, partLookCss(own));
  // The column's own alignment, else the whole table's (lookAlignFor)
  const align = own?.align ?? (col ? lookAlignFor(look.value, part, col as TableColumnBinding) : undefined);
  if (align) css.justifyContent = { Left: "flex-start", Center: "center", Right: "flex-end" }[align];

  if (col) {
    css.width = `${col.width}px`;
  } else {
    css.flex = "1";
  }
  // Neighbouring cells share one border line
  if (index > 0) css.borderLeft = "none";
  return css;
}

// A click on a column of the selected table chooses it: its look in the panel
const { tableColumn } = storeToRefs(useSelectionStore());
const isSelected = computed(() => !!props.element.uuid && props.selectedElement?.uuid === props.element.uuid);
// Selected before this press: the first click selects the table, the next one a column
const wasSelected = ref(false);
const chosenColumnBounds = computed(() => {
  if (!isSelected.value || !tableColumn.value || tableColumn.value.uuid !== props.element.uuid) return null;
  const key = tableColumn.value.key;
  let left = 0;
  for (const col of displayColumns.value) {
    if (col.key === key) return { left, width: col.width };
    left += col.width;
  }
  return null;
});

function chooseColumn(key: string, part: "header" | "data" | "total" = "data") {
  if (!binding.value || !wasSelected.value || !props.element.uuid) return;
  tableColumn.value = { uuid: props.element.uuid, key, part };
}

// ---- Dragging column and row lines ---------------------------------------------

const report = useReportStore();
// The same limits as the heading / row height fields in Basic Settings
const MIN_ROW_SIZE = 12;
const MAX_ROW_SIZE = 80;

// Where the lines between columns are (px from the table's left)
const columnEdges = computed(() => {
  const edges: number[] = [];
  let left = 0;
  (binding.value?.columns ?? []).slice(0, -1).forEach((col) => edges.push((left += col.width)));
  return edges;
});

// The line under the heading (index -1) and under each sample row shown
const rowEdges = computed(() => {
  const edges = [{ index: -1, y: headerHeight.value }];
  rowSlotsShown.value.forEach((_, k) => edges.push({ index: k, y: headerHeight.value + (k + 1) * rowHeight.value }));
  return edges;
});

// How many canvas pixels one design pixel takes (the page's zoom)
const tableRef = ref<HTMLElement | null>(null);
const scale = () => {
  const width = tableRef.value?.getBoundingClientRect().width ?? 0;
  return width > 0 && props.element.width > 0 ? width / props.element.width : 1;
};

let stopDrag: (() => void) | null = null;
onBeforeUnmount(() => stopDrag?.());

function track(onMove: (e: MouseEvent) => void) {
  const onUp = () => {
    stopDrag?.();
    report.updateJrxml();
  };
  stopDrag = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    stopDrag = null;
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

// The two columns next to the line share their width, so the table keeps its width
function startColumnDrag(event: MouseEvent, index: number) {
  const columns = binding.value?.columns;
  const left = columns?.[index];
  const right = columns?.[index + 1];
  if (!left || !right) return;
  report.saveStateToHistory();
  const zoom = scale();
  const startX = event.clientX;
  const startLeft = left.width;
  const pair = left.width + right.width;
  track((e) => {
    const width = Math.round(startLeft + (e.clientX - startX) / zoom);
    left.width = Math.min(pair - MIN_TABLE_COLUMN_WIDTH, Math.max(MIN_TABLE_COLUMN_WIDTH, width));
    right.width = pair - left.width;
  });
}

// The heading's height, or (any body row's line) the one height all rows share;
// the line follows the pointer, and the table keeps its number of sample rows
function startRowDrag(event: MouseEvent, index: number) {
  const table = props.element;
  report.saveStateToHistory();
  const zoom = scale();
  const startY = event.clientY;
  const slots = rowSlots(table);
  const startHeader = headerHeight.value;
  const startRow = rowHeight.value;
  track((e) => {
    const delta = (e.clientY - startY) / zoom;
    const clamp = (value: number) => Math.round(Math.min(MAX_ROW_SIZE, Math.max(MIN_ROW_SIZE, value)));
    if (index < 0) table.headerHeight = clamp(startHeader + delta);
    else table.rowHeight = clamp(startRow + delta / (index + 1));
    const header = table.headerHeight ?? TABLE_HEADER_HEIGHT;
    const row = table.rowHeight ?? TABLE_ROW_HEIGHT;
    table.height = header + slots * row + (showTotals.value ? row : 0);
  });
}

// Highlight while a data source is dragged over this table
const isDropTarget = ref(false);
function onDragOver(event: DragEvent) {
  if (!isDataSourceDrag(event)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  isDropTarget.value = true;
}
function onDragLeave(event: DragEvent) {
  const next = event.relatedTarget as Node | null;
  if (!next || !(event.currentTarget as HTMLElement).contains(next)) isDropTarget.value = false;
}
</script>

<style scoped>
.data-table {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: inherit;
  background: #fff;
}

.data-table.is-drop-target {
  outline: 2px dashed #6440f4;
  outline-offset: 2px;
}

.data-table.is-drop-target::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(100, 64, 244, 0.08);
  pointer-events: none;
}

.dt-row {
  display: flex;
  box-sizing: border-box;
}

/* Every row after the first shares the line above it */
.dt-row + .dt-row .dt-cell {
  border-top: none !important;
}

/* Lines to drag (shown while the table is selected) */
.dt-col-edge,
.dt-row-edge {
  position: absolute;
  z-index: 3;
}

.dt-col-edge {
  top: 0;
  bottom: 0;
  width: 9px;
  margin-left: -4px;
  cursor: col-resize;
}

.dt-row-edge {
  left: 0;
  right: 0;
  height: 9px;
  margin-top: -4px;
  cursor: row-resize;
}

/* A line on the table's bottom edge: its strip stays inside */
.dt-row-edge.is-bottom {
  margin-top: -9px;
}

.dt-col-edge::after,
.dt-row-edge::after {
  content: "";
  position: absolute;
  background: rgba(100, 64, 244, 0.35);
  transition: background 0.12s ease;
}

.dt-col-edge::after {
  top: 0;
  bottom: 0;
  left: 4px;
  width: 1px;
}

.dt-row-edge::after {
  left: 0;
  right: 0;
  top: 4px;
  height: 1px;
}

.dt-row-edge.is-bottom::after {
  top: 8px;
}

.dt-col-edge:hover::after,
.dt-col-edge:active::after {
  left: 3px;
  width: 3px;
  background: #6440f4;
}

.dt-row-edge:hover::after,
.dt-row-edge:active::after {
  top: 3px;
  height: 3px;
  background: #6440f4;
}

.dt-row-edge.is-bottom:hover::after,
.dt-row-edge.is-bottom:active::after {
  top: 6px;
}

.dt-column-frame {
  position: absolute;
  top: 0;
  bottom: 0;
  border: 2px solid #6440f4;
  background: rgba(100, 64, 244, 0.08);
  pointer-events: none;
  box-sizing: border-box;
  z-index: 2;
}

.dt-cell {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.dt-cell.is-placeholder {
  opacity: 0.55;
}

.dt-more,
.dt-message {
  justify-content: center;
  font-style: italic;
  opacity: 0.75;
}

.dt-drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #6440f4;
  background: rgba(255, 255, 255, 0.55);
  pointer-events: none;
}
</style>
