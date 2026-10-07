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
      class="data-table"
      :class="{ 'is-drop-target': isDropTarget }"
      :data-table-uuid="element.uuid"
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
            {{
              slot.limit
                ? t("dataTable.moreRowsLimited", { count: slot.count, limit: slot.limit }, slot.count)
                : t("dataTable.moreRows", slot.count)
            }}
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
              :style="cellStyle('row', col, i, r)"
            >
              {{ formatCellValue(slot.row[col.key], col.type, locale) }}
            </div>
          </template>
        </div>

        <!-- Totals: worked out by the report; named here -->
        <div v-if="showTotals" class="dt-row" :style="{ height: `${rowHeight}px` }">
          <div
            v-for="(col, i) in binding.columns"
            :key="col.key"
            class="dt-cell"
            :style="cellStyle('totals', col, i)"
          >
            {{ col.total ? t(`dataTable.totals.${col.total}`) : i === 0 ? t("dataTable.totals.label") : "" }}
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
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";
import { DatabaseZap } from "@lucide/vue";
import BaseElement from "./BaseElement.vue";
import { useTableRows } from "@/composables/useTableRows";
import {
  CANVAS_SAMPLE_ROWS,
  PLACEHOLDER_COLUMN_COUNT,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  cellAlignmentFor,
  formatCellValue,
  hasTotalsRow,
  rowSlots,
} from "@/utils/table/dataTable";
import { distributeColumnWidths } from "@/utils/table/dataBinding";
import { lookPartStyles, resolveLook, tableCellCss, type TableStylePart } from "@/utils/table/tableThemes";
import { isDataSourceDrag } from "@/utils/table/dataDrag";
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
  | { kind: "more"; count: number; limit?: number }
  | { kind: "message"; text: string };

// Fill the table's height with sample rows; the last slot says how many more
const rowSlotsShown = computed<Slot[]>(() => {
  const slots = rowSlots(props.element);
  if (loading.value && !rows.value.length) return [{ kind: "message", text: t("dataTable.loading") }];
  if (failed.value) return [{ kind: "message", text: t("dataTable.loadFailed") }];
  if (!rows.value.length) return [{ kind: "message", text: t("dataTable.noRows") }];
  // The report prints only the first rowLimit rows when there is a limit
  const limit = binding.value?.rowLimit;
  const limited = limit !== undefined && limit < totalCount.value;
  const printed = limited ? limit : totalCount.value;
  const fits = printed <= slots ? printed : slots - 1;
  const shown: Slot[] = rows.value.slice(0, fits).map((row) => ({ kind: "row", row }));
  if (printed > fits) shown.push({ kind: "more", count: printed - fits, limit: limited ? limit : undefined });
  return shown;
});

const partStyles = computed(() => lookPartStyles(resolveLook(binding.value)));

function cellStyle(part: TableStylePart, col: PreviewColumn | undefined, index: number, rowIndex = 0) {
  const css: Record<string, string> = tableCellCss(partStyles.value[part], part === "row" && rowIndex % 2 === 1);
  if (col) {
    css.width = `${col.width}px`;
    css.justifyContent =
      part === "header" ? "flex-start" : { Left: "flex-start", Center: "center", Right: "flex-end" }[cellAlignmentFor(col.type)];
  } else {
    css.flex = "1";
  }
  // Neighbouring cells share one border line
  if (index > 0) css.borderLeft = "none";
  return css;
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
  outline: 2px dashed #1890ff;
  outline-offset: 2px;
}

.data-table.is-drop-target::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(24, 144, 255, 0.08);
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
  color: #1890ff;
  background: rgba(255, 255, 255, 0.55);
  pointer-events: none;
}
</style>
