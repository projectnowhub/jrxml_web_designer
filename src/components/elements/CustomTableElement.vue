<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :selected-elements="selectedElements"
    :editing-element="editingElement"
    :is-dragging="isDragging"
    :is-out-of-bounds="isOutOfBounds"
    :parent-frame-index="parentFrameIndex"
    :zoom-level="zoomLevel"
    @select="(b, e, m, p) => emit('select', b, e, m, p)"
    @drag-start="(ev, b, e, p) => emit('dragStart', ev, b, e, p)"
    @resize-start="(ev, b, e, p, d) => emit('resizeStart', ev, b, e, p, d)"
    @contextmenu="(ev, b, e, p) => emit('contextmenu', ev, b, e, p)"
    @start-editing="(b, e) => emit('startEditing', b, e, parentFrameIndex)"
  >
    <div
      ref="rootRef"
      class="custom-table"
      :class="{ 'is-editing': isEditing }"
      :style="gridStyle"
      :tabindex="isEditing ? 0 : undefined"
      @click="isEditing && $event.stopPropagation()"
      @keydown="onGridKeyDown"
    >
      <div
        v-for="v in cells"
        :key="`${v.row}-${v.col}`"
        class="ct-cell"
        :class="{ 'is-selected': isEditing && inSelection(v) }"
        :style="cellStyleCss(v)"
        @mousedown="onCellMouseDown($event, v)"
        @mouseenter="onCellMouseEnter(v)"
        @dblclick="isEditing && $event.stopPropagation()"
        @contextmenu="onCellContextMenu($event, v)"
      >
        <div
          v-if="isEditing && editor && editor.row === v.row && editor.col === v.col"
          ref="editorRef"
          class="ct-editor ct-rich"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          :style="{ ...textStyle(v), padding: `${table.padding}px` }"
          :aria-label="t('customTable.cellText')"
          @keydown.stop="onEditorKeyDown"
          @mousedown.stop="onEditorMouseDown"
          @mouseup="updateToolbar"
          @keyup="updateToolbar"
          @blur="onEditorBlur"
        />
        <div
          v-else-if="v.cell.rich"
          :ref="(el) => setTextRef(v, el)"
          class="ct-text ct-rich"
          :style="textStyle(v)"
          v-html="sanitizeHtml(v.cell.text)"
        />
        <div v-else :ref="(el) => setTextRef(v, el)" class="ct-text" :style="textStyle(v)">{{ v.cell.text }}</div>
      </div>

      <!-- A single outline around the selected cells / chosen row / chosen column -->
      <div
        v-if="isEditing && selectedRect"
        class="ct-selection-frame"
        :style="{
          gridColumn: `${selectedRect.left + 1} / ${selectedRect.right + 2}`,
          gridRow: `${selectedRect.top + 1} / ${selectedRect.bottom + 2}`,
        }"
      />

      <!-- Row and column handles while the table is open: a click chooses the
           whole column / row (Shift+click several), right-click opens its menu -->
      <template v-if="isEditing">
        <div class="ct-handles is-cols" @mousedown.stop.prevent>
          <button
            v-for="(span, c) in columnSpans"
            :key="`hc${c}`"
            type="button"
            class="ct-handle"
            :class="{ 'is-on': wholeColumnChosen(c) }"
            :style="{ left: `${span.start}%`, width: `${span.size}%` }"
            :title="t('customTable.handles.column', { name: columnName(c) })"
            :aria-label="t('customTable.handles.column', { name: columnName(c) })"
            @mousedown.stop.prevent="chooseColumn($event, c)"
            @contextmenu.prevent.stop="chooseColumn($event, c, true)"
          >{{ columnName(c) }}</button>
          <!-- Grips between the letters: drag to change the two columns' widths -->
          <div
            v-for="(edge, i) in columnEdges"
            :key="`hce${i}`"
            class="ct-bar-edge is-col"
            :style="{ left: `${edge}%` }"
            :title="t('customTable.dragColumn')"
            @mousedown.stop.prevent="startEdgeDrag($event, 'col', i)"
          />
        </div>
        <div class="ct-handles is-rows" @mousedown.stop.prevent>
          <button
            v-for="(span, r) in rowSpans"
            :key="`hr${r}`"
            type="button"
            class="ct-handle"
            :class="{ 'is-on': wholeRowChosen(r) }"
            :style="{ top: `${span.start}%`, height: `${span.size}%` }"
            :title="t('customTable.handles.row', { n: r + 1 })"
            :aria-label="t('customTable.handles.row', { n: r + 1 })"
            @mousedown.stop.prevent="chooseRow($event, r)"
            @contextmenu.prevent.stop="chooseRow($event, r, true)"
          >{{ r + 1 }}</button>
          <!-- Grips under each number: drag to change the row's height -->
          <div
            v-for="(edge, i) in rowEdges"
            :key="`hre${i}`"
            class="ct-bar-edge is-row"
            :style="{ top: `${edge}%` }"
            :title="t('customTable.dragRow')"
            @mousedown.stop.prevent="startEdgeDrag($event, 'row', i)"
          />
        </div>
      </template>

      <!-- Edges to drag: between columns, and under each row -->
      <template v-if="isEditing">
        <div
          v-for="(edge, i) in columnEdges"
          :key="`c${i}`"
          class="ct-col-edge"
          :style="{ left: `${edge}%` }"
          :title="t('customTable.dragColumn')"
          @mousedown.stop.prevent="startEdgeDrag($event, 'col', i)"
        />
        <div
          v-for="(edge, i) in rowEdges"
          :key="`r${i}`"
          class="ct-row-edge"
          :style="{ top: `${edge}%` }"
          :title="t('customTable.dragRow')"
          @mousedown.stop.prevent="startEdgeDrag($event, 'row', i)"
        />
      </template>
    </div>
  </BaseElement>

  <!-- Formatting of the cell being typed in: bold, colours, superscript, bullet points... -->
  <TextFormatToolbar
    v-if="isEditing && editor"
    :visible="!!toolbarPosition"
    :position="toolbarPosition ?? { x: 0, y: 0 }"
    :active-formats="activeFormats"
    @format="onFormat"
    @apply-link="onApplyLink"
    @remove-link="onFormat('unlink')"
    @close="toolbarPosition = null"
  />

  <!-- Right-click menu on the cells while editing -->
  <Teleport to="body">
    <div
      v-if="menu"
      ref="menuRef"
      class="ct-menu"
      role="menu"
      :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
      @mousedown.stop
      @contextmenu.prevent
    >
      <button
        v-for="item in menuItems"
        :key="item.id"
        type="button"
        role="menuitem"
        class="ct-menu-item"
        :class="{ 'has-divider': item.divider }"
        :disabled="item.disabled"
        @click="runMenu(item.id)"
      >
        <component :is="item.icon" :size="15" aria-hidden="true" />
        <span class="ct-menu-text">
          <span>{{ item.label }}</span>
          <small v-if="item.disabled && item.hint" class="ct-menu-hint">{{ item.hint }}</small>
        </span>
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type Component } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Eraser,
  Scissors,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
} from '@lucide/vue';
import BaseElement from './BaseElement.vue';
import TextFormatToolbar from './TextFormatToolbar.vue';
import { cleanEditorHtml, escapeHtml, hasFormatting, rgbToHex, sanitizeHtml } from '../../utils/elementUtils';
import { useReportStore } from '@/stores/report';
import { useSelectionStore } from '@/stores/selection';
import notification from '@/utils/notification';
import { canSplitTypedTable, splitTypedTable } from '@/utils/table/splitTypedTable';
import { resolveReportFont } from '../../config/fonts.config';
import {
  deleteColumns,
  deleteRows,
  fitTableToBox,
  hasMergedCells,
  insertColumn,
  insertRow,
  mergeCells,
  MIN_COLUMN_WIDTH,
  MIN_ROW_HEIGHT,
  canMergeRect,
  selectionRect,
  splitCells,
  syncTableSize,
  TEXT_LINE_HEIGHT,
  cellPens,
  columnName,
  customTableLook,
  resolveCell,
  visibleCells,
  type CellPen,
  type CellPos,
  type VisibleCell,
} from '../../utils/customTable';
import type {
  CustomTableCell,
  CustomTableElement,
  EditingElementInfo,
  SelectedElementInfo,
} from '../../types';

const { t } = useI18n();
const report = useReportStore();
const { tableCells } = storeToRefs(useSelectionStore());

const props = defineProps<{
  element: CustomTableElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements: { bandIndex: number; elementIndex: number; parentFrameIndex?: number }[];
  editingElement: EditingElementInfo | null;
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  parentFrameIndex?: number;
  zoomLevel?: number;
}>();

const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  finishEditing: [];
}>();

const table = computed(() => props.element.table);
const cells = computed(() => visibleCells(table.value));

const isSelected = computed(
  () => !!props.element.uuid && props.selectedElement?.uuid === props.element.uuid,
);
const isEditing = computed(
  () =>
    props.editingElement !== null &&
    props.editingElement.bandIndex === props.bandIndex &&
    props.editingElement.elementIndex === props.elementIndex &&
    props.editingElement.parentFrameIndex === props.parentFrameIndex,
);

// ---- Drawing ---------------------------------------------------------------

// The table style (built-in, saved or changed for this table)
const look = computed(() => customTableLook(table.value));

// Columns and rows as shares of the box, so the grid always fills it
const gridStyle = computed(() => ({
  gridTemplateColumns: table.value.columns.map((w) => `${w}fr`).join(' '),
  gridTemplateRows: table.value.rows.map((r) => `${r.height}fr`).join(' '),
  fontFamily: resolveReportFont(undefined),
}));

const V_ALIGN = { Top: 'flex-start', Middle: 'center', Bottom: 'flex-end' } as const;

const penCss = (pen?: CellPen) => (pen ? `${pen.width}px solid ${pen.color}` : undefined);

// A cell from the style for its row plus what is set on it. Neighbours share a
// line: a cell draws its top / left side only on the table's first row / column
// (and a stronger line above a total row).
function cellStyleCss(v: VisibleCell) {
  const resolved = resolveCell(table.value, look.value, v.row, v.cell);
  const pens = cellPens(table.value, look.value, v.row, v.rowSpan);
  const ruleAbove = pens.top && pens.top.width > (pens.left?.width ?? 0) && v.row > 0;
  return {
    gridColumn: `${v.col + 1} / span ${v.colSpan}`,
    gridRow: `${v.row + 1} / span ${v.rowSpan}`,
    background: resolved.fill,
    padding: `${table.value.padding}px`,
    alignItems: V_ALIGN[resolved.vAlign],
    borderTop: v.row === 0 || ruleAbove ? penCss(pens.top) : undefined,
    borderLeft: v.col === 0 ? penCss(pens.left) : undefined,
    borderBottom: penCss(pens.bottom),
    borderRight: penCss(pens.right),
  };
}

function textStyle(v: VisibleCell) {
  const resolved = resolveCell(table.value, look.value, v.row, v.cell);
  return {
    color: resolved.color,
    fontSize: `${resolved.fontSize}px`,
    lineHeight: String(TEXT_LINE_HEIGHT),
    fontWeight: resolved.bold ? 700 : 400,
    fontStyle: resolved.italic ? 'italic' : 'normal',
    textDecoration: resolved.underline ? 'underline' : 'none',
    textAlign: resolved.align.toLowerCase() as 'left',
  };
}

const sumTo = (sizes: number[], count: number) => sizes.slice(0, count).reduce((a, b) => a + b, 0);
const columnEdges = computed(() => {
  const total = sumTo(table.value.columns, table.value.columns.length) || 1;
  return table.value.columns.slice(0, -1).map((_, i) => (sumTo(table.value.columns, i + 1) / total) * 100);
});
const rowEdges = computed(() => {
  const heights = table.value.rows.map((r) => r.height);
  const total = sumTo(heights, heights.length) || 1;
  return heights.map((_, i) => (sumTo(heights, i + 1) / total) * 100);
});

// ---- Changes ---------------------------------------------------------------

// The section the table is in grows when the table gets taller than it
function growBandToFit() {
  const band = report.bands[props.bandIndex];
  if (!band || props.parentFrameIndex !== undefined) return;
  const bottom = Math.ceil(props.element.y + props.element.height);
  if (bottom > band.height) band.height = bottom;
}

function afterChange() {
  syncTableSize(props.element);
  growBandToFit();
  report.updateJrxml();
  nextTick(fitRowsToText);
}

// One undo step: snapshot, change, then the size and the JRXML follow
function change(mutate: () => void) {
  report.saveStateToHistory();
  mutate();
  afterChange();
}

// Rows grow so every cell's text fits (the PDF grows them the same way)
const textRefs = new Map<string, HTMLElement>();
function setTextRef(v: VisibleCell, el: unknown) {
  const key = `${v.row}-${v.col}`;
  if (el instanceof HTMLElement) textRefs.set(key, el);
  else textRefs.delete(key);
}

function fitRowsToText() {
  const t = table.value;
  let changed = false;
  for (const v of cells.value) {
    const text = textRefs.get(`${v.row}-${v.col}`);
    if (!text || !v.cell.text) continue;
    const needed = Math.ceil(text.offsetHeight + 2 * t.padding + 1);
    const rows = t.rows.slice(v.row, v.row + v.rowSpan);
    const have = rows.reduce((a, r) => a + r.height, 0);
    if (needed > have) {
      rows[rows.length - 1]!.height += needed - have;
      changed = true;
    }
  }
  if (changed) {
    syncTableSize(props.element);
    growBandToFit();
    report.updateJrxml();
  }
}

// A width or height typed in the panel: columns and rows take their shares again
watch(
  () => [props.element.width, props.element.height],
  () => {
    const t = table.value;
    const w = t.columns.reduce((a, b) => a + b, 0);
    const h = t.rows.reduce((a, r) => a + r.height, 0);
    if (Math.round(w) !== Math.round(props.element.width) || Math.round(h) !== Math.round(props.element.height)) {
      fitTableToBox(props.element);
    }
  },
);

watch(
  () => (isSelected.value ? JSON.stringify(table.value) : ''),
  (json) => {
    if (json) nextTick(fitRowsToText);
  },
);

// ---- Row and column handles ------------------------------------------------

// Each column's / row's start and size as shares of the table (%), and the
// lines between them, the outer edges included (where + inserts)
const shares = (sizes: number[]) => {
  const total = sizes.reduce((a, b) => a + b, 0) || 1;
  let start = 0;
  return sizes.map((s) => {
    const span = { start: (start / total) * 100, size: (s / total) * 100 };
    start += s;
    return span;
  });
};
const columnSpans = computed(() => shares(table.value.columns));
const rowSpans = computed(() => shares(table.value.rows.map((r) => r.height)));

const lastRow = () => table.value.rows.length - 1;
const lastCol = () => table.value.columns.length - 1;
const wholeColumnChosen = (c: number) => {
  const r = selectedRect.value;
  return !!r && r.top === 0 && r.bottom === lastRow() && c >= r.left && c <= r.right;
};
const wholeRowChosen = (row: number) => {
  const r = selectedRect.value;
  return !!r && r.left === 0 && r.right === lastCol() && row >= r.top && row <= r.bottom;
};

// A column handle: the whole column (Shift: from the chosen column to this one);
// right-click also opens the menu
function chooseColumn(event: MouseEvent, c: number, withMenu = false) {
  commitEditor(false);
  closeMenu();
  rootRef.value?.focus();
  const from = event.shiftKey && selection.value ? selection.value.anchor.col : c;
  if (!(withMenu && wholeColumnChosen(c))) selectCells({ row: 0, col: from }, { row: lastRow(), col: c });
  if (withMenu) openMenuAt(event);
}

function chooseRow(event: MouseEvent, row: number, withMenu = false) {
  commitEditor(false);
  closeMenu();
  rootRef.value?.focus();
  const from = event.shiftKey && selection.value ? selection.value.anchor.row : row;
  if (!(withMenu && wholeRowChosen(row))) selectCells({ row: from, col: 0 }, { row, col: lastCol() });
  if (withMenu) openMenuAt(event);
}

// ---- Selecting cells ---------------------------------------------------------

// Kept inside the grid (an undo can make the table smaller)
const clampPos = (pos: CellPos): CellPos => ({
  row: Math.min(Math.max(0, pos.row), table.value.rows.length - 1),
  col: Math.min(Math.max(0, pos.col), table.value.columns.length - 1),
});
const selection = computed(() =>
  tableCells.value && tableCells.value.uuid === props.element.uuid
    ? { ...tableCells.value, anchor: clampPos(tableCells.value.anchor), focus: clampPos(tableCells.value.focus) }
    : null,
);
const selectedRect = computed(() =>
  selection.value ? selectionRect(table.value, selection.value.anchor, selection.value.focus) : null,
);

function inSelection(v: VisibleCell) {
  const rect = selectedRect.value;
  return !!rect && v.row >= rect.top && v.row <= rect.bottom && v.col >= rect.left && v.col <= rect.right;
}

function selectCells(anchor: CellPos, focus: CellPos = anchor) {
  tableCells.value = { uuid: props.element.uuid ?? '', anchor, focus };
}

let dragSelecting = false;
let dragMoved = false;

function onCellMouseDown(event: MouseEvent, v: VisibleCell) {
  if (!isEditing.value || event.button !== 0) return;
  // Stays in the table: no element drag, no text selection on the page
  event.stopPropagation();
  event.preventDefault();
  closeMenu();
  // Keys go to the table (the default focus change was prevented above)
  if (!editor.value) rootRef.value?.focus();
  const pos = { row: v.row, col: v.col };
  if (event.shiftKey && selection.value) {
    commitEditor(false);
    selectCells(selection.value.anchor, pos);
    return;
  }
  if (editor.value && (editor.value.row !== v.row || editor.value.col !== v.col)) commitEditor(false);
  selectCells(pos);
  dragSelecting = true;
  dragMoved = false;
  document.addEventListener('mouseup', onSelectMouseUp, { once: true });
}

// A press inside the cell being typed in selects its text; dragging on into
// another cell selects cells instead (from the cell being typed in)
let dragFromEditor = false;

function onEditorMouseDown(event: MouseEvent) {
  if (event.button !== 0 || !editor.value) return;
  dragFromEditor = true;
  document.addEventListener('mouseup', () => (dragFromEditor = false), { once: true });
}

function onCellMouseEnter(v: VisibleCell) {
  if (dragFromEditor && editor.value && (v.row !== editor.value.row || v.col !== editor.value.col)) {
    const from = { row: editor.value.row, col: editor.value.col };
    dragFromEditor = false;
    commitEditor(false);
    window.getSelection()?.removeAllRanges();
    rootRef.value?.focus();
    selectCells(from, { row: v.row, col: v.col });
    dragSelecting = true;
    dragMoved = true;
    document.addEventListener('mouseup', onSelectMouseUp, { once: true });
    return;
  }
  if (!dragSelecting || !selection.value) return;
  if (v.row !== selection.value.anchor.row || v.col !== selection.value.anchor.col) dragMoved = true;
  selectCells(selection.value.anchor, { row: v.row, col: v.col });
}

// A click (no drag) on a cell puts the cursor in it
function onSelectMouseUp() {
  dragSelecting = false;
  if (!dragMoved && selection.value) openEditor(selection.value.anchor);
}

// ---- Typing in a cell ----------------------------------------------------------

const editor = ref<{ row: number; col: number } | null>(null);
const editorRef = ref<HTMLElement[] | HTMLElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const editorEl = () => (Array.isArray(editorRef.value) ? editorRef.value[0] : editorRef.value) ?? null;

// A cell's text as editor HTML: formatted text as it is, plain text with its line breaks
const cellHtml = (cell: CustomTableCell) =>
  cell.rich ? sanitizeHtml(cell.text) : escapeHtml(cell.text).replace(/\n/g, '<br>');

// What the editor holds, as a cell's text: HTML when it has formatting, else plain text
function readEditor(el: HTMLElement): { text: string; rich: boolean } {
  const html = el.innerHTML.replace(/(<br\s*\/?>)+$/i, '');
  if (hasFormatting(html)) return { text: cleanEditorHtml(sanitizeHtml(html)), rich: true };
  const lines = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '');
  const text = new DOMParser().parseFromString(lines, 'text/html').documentElement.textContent ?? '';
  return { text: text.replace(/^\n/, ''), rich: false };
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function openEditor(pos: CellPos, typed?: string) {
  const cell = table.value.rows[pos.row]?.cells[pos.col];
  if (!cell) return;
  if (editor.value?.row === pos.row && editor.value?.col === pos.col) return;
  editor.value = { row: pos.row, col: pos.col };
  nextTick(() => {
    const el = editorEl();
    if (!el) return;
    el.innerHTML = cellHtml(cell) + (typed ? escapeHtml(typed) : '');
    el.focus();
    placeCaretAtEnd(el);
    updateToolbar();
  });
}

function commitEditor(refocus = true) {
  const current = editor.value;
  const el = editorEl();
  if (!current) return;
  editor.value = null;
  toolbarPosition.value = null;
  savedRange = null;
  const cell = table.value.rows[current.row]?.cells[current.col];
  if (cell && el) {
    const { text, rich } = readEditor(el);
    if (cell.text !== text || !!cell.rich !== rich) {
      change(() => {
        cell.text = text;
        if (rich) cell.rich = true;
        else delete cell.rich;
        // Typed over: no longer the column's sum
        delete cell.sum;
      });
    }
  }
  if (refocus && isEditing.value) nextTick(() => rootRef.value?.focus());
}

// Leaving the cell: clicks in the formatting toolbar keep it open
function onEditorBlur(event: FocusEvent) {
  const related = event.relatedTarget as HTMLElement | null;
  if (related?.closest('.text-format-floating-toolbar')) return;
  setTimeout(() => {
    const active = document.activeElement;
    if (active?.closest('.text-format-floating-toolbar')) return;
    if (editor.value && !editorEl()?.contains(active)) commitEditor(false);
  }, 150);
}

// ---- Formatting toolbar ----

const toolbarPosition = ref<{ x: number; y: number } | null>(null);
const activeFormats = ref<Record<string, boolean | string | undefined>>({});
let savedRange: Range | null = null;

function getExplicitColor(node: Node | null, root: HTMLElement): string {
  let curr: Node | null = node;
  while (curr && curr !== root) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      const el = curr as HTMLElement;
      if (el.tagName.toLowerCase() === 'font' && (el as HTMLFontElement).color) {
        return (el as HTMLFontElement).color;
      }
      const color = el.style?.color;
      if (color && color !== 'inherit') {
        return color;
      }
    }
    curr = curr.parentNode;
  }
  return '';
}

// Shown above the cell; the buttons reflect the text where the cursor is
function updateToolbar() {
  const el = editorEl();
  if (!el) return;
  const sel = window.getSelection();
  if (sel && sel.rangeCount && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }
  const rect = el.getBoundingClientRect();
  toolbarPosition.value = { x: rect.left + rect.width / 2, y: rect.top };
  const state = (command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  let colorVal = '';
  if (sel && sel.anchorNode && el.contains(sel.anchorNode)) {
    colorVal = getExplicitColor(sel.anchorNode, el);
    if (!colorVal && sel.focusNode) {
      colorVal = getExplicitColor(sel.focusNode, el);
    }
  }
  if (!colorVal && editor.value) {
    const curCell = table.value.rows[editor.value.row]?.cells[editor.value.col];
    const lookVal = customTableLook(table.value);
    const rowStyle = resolveCell(table.value, lookVal, editor.value.row, { text: '' });
    colorVal = curCell?.color || rowStyle.color || '';
  }
  if (colorVal) {
    colorVal = rgbToHex(colorVal).toLowerCase();
  }

  activeFormats.value = {
    bold: state('bold'),
    italic: state('italic'),
    underline: state('underline'),
    strike: state('strikeThrough'),
    superscript: state('superscript'),
    subscript: state('subscript'),
    bulletList: state('insertUnorderedList'),
    numberedList: state('insertOrderedList'),
    color: colorVal || undefined,
  };
}

// Back to the text chosen before a toolbar button took the focus
function restoreSelection() {
  const el = editorEl();
  if (!el) return;
  el.focus();
  if (savedRange) {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(savedRange);
  }
}

function onFormat(command: string, value?: string) {
  restoreSelection();
  if (command === 'hiliteColor' && (!value || value === 'transparent')) {
    document.execCommand('hiliteColor', false, 'transparent');
  } else if (command === 'foreColor' && (!value || value === 'inherit' || value === 'default')) {
    document.execCommand('removeFormat');
  } else {
    document.execCommand(command, false, value);
  }
  updateToolbar();
}

function onApplyLink(target: string, _type: 'url' | 'email' | 'phone', label?: string) {
  restoreSelection();
  const sel = window.getSelection();
  if (sel?.isCollapsed && label) {
    document.execCommand('insertHTML', false, `<a href="${escapeHtml(target)}">${escapeHtml(label)}</a>`);
  } else {
    document.execCommand('createLink', false, target);
  }
  updateToolbar();
}

// The next / previous shown cell, row by row
function stepCell(pos: CellPos, forward: boolean): CellPos | null {
  const list = cells.value;
  const i = list.findIndex((v) => v.row === pos.row && v.col === pos.col);
  const next = list[i + (forward ? 1 : -1)];
  return next ? { row: next.row, col: next.col } : null;
}

function onEditorKeyDown(event: KeyboardEvent) {
  if (!editor.value) return;
  // A new line; in a bullet or numbered list, the next point
  if (event.key === 'Enter') {
    const anchor = window.getSelection()?.anchorNode ?? null;
    const anchorEl = anchor && (anchor.nodeType === Node.ELEMENT_NODE ? (anchor as Element) : anchor.parentElement);
    if (anchorEl?.closest('li') && !event.shiftKey) return;
    event.preventDefault();
    document.execCommand('insertLineBreak');
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    commitEditor();
  } else if (event.key === 'Tab') {
    event.preventDefault();
    const from = { row: editor.value.row, col: editor.value.col };
    commitEditor(false);
    const next = stepCell(from, !event.shiftKey);
    if (next) {
      selectCells(next);
      openEditor(next);
    }
  }
}

// Keys on the table while no cell is being typed in
function onGridKeyDown(event: KeyboardEvent) {
  if (!isEditing.value || editor.value) return;
  const sel = selection.value;
  const handled = () => {
    event.preventDefault();
    event.stopPropagation();
  };
  if (event.key === 'Escape') {
    handled();
    emit('finishEditing');
    return;
  }
  // Ctrl / Cmd + A: every cell (to style them all at once)
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && !event.altKey) {
    handled();
    selectCells({ row: 0, col: 0 }, { row: lastRow(), col: lastCol() });
    return;
  }
  if (!sel) return;
  const arrows: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  };
  const move = arrows[event.key];
  if (move) {
    handled();
    const from = event.shiftKey ? sel.focus : sel.anchor;
    const target = {
      row: Math.min(table.value.rows.length - 1, Math.max(0, from.row + move[0])),
      col: Math.min(table.value.columns.length - 1, Math.max(0, from.col + move[1])),
    };
    if (event.shiftKey) selectCells(sel.anchor, target);
    else selectCells(target);
    return;
  }
  if (event.key === 'Enter' || event.key === 'F2') {
    handled();
    openEditor(sel.anchor);
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    handled();
    clearSelectedText();
    return;
  }
  // Typing starts writing in the cell, after its text
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    handled();
    openEditor(sel.anchor, event.key);
  }
}

function clearSelectedText() {
  const rect = selectedRect.value;
  if (!rect) return;
  const targets = cells.value.filter((v) => inSelection(v) && v.cell.text !== '');
  if (targets.length) {
    change(() =>
      targets.forEach((v) => {
        v.cell.text = '';
        delete v.cell.rich;
        delete v.cell.sum;
      }),
    );
  }
}

// ---- Edit mode: in and out -----------------------------------------------------

function onOutsideMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target || rootRef.value?.contains(target) || menuRef.value?.contains(target)) return;
  // Clicks in the panels (cell colours...) keep the table open; the page ends it
  if (target.closest('.designer-canvas')) emit('finishEditing');
}

watch(isEditing, (editing) => {
  if (editing) {
    if (!selection.value) selectCells({ row: 0, col: 0 });
    document.addEventListener('mousedown', onOutsideMouseDown, true);
    nextTick(() => rootRef.value?.focus());
  } else {
    commitEditor(false);
    closeMenu();
    document.removeEventListener('mousedown', onOutsideMouseDown, true);
    if (selection.value) tableCells.value = null;
  }
});

// Rows or columns added from the panel: the section grows with the table
watch(
  () => props.element.y + props.element.height,
  () => growBandToFit(),
);

watch(isSelected, (selected) => {
  if (!selected && isEditing.value) emit('finishEditing');
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onOutsideMouseDown, true);
  document.removeEventListener('mousedown', onMenuOutside, true);
  if (selection.value) tableCells.value = null;
});

// ---- Dragging column and row edges ------------------------------------------------

function startEdgeDrag(event: MouseEvent, kind: 'col' | 'row', index: number) {
  commitEditor(false);
  report.saveStateToHistory();
  const zoom = props.zoomLevel || 1;
  const startX = event.clientX;
  const startY = event.clientY;
  const columns = [...table.value.columns];
  const heights = table.value.rows.map((r) => r.height);

  const onMove = (e: MouseEvent) => {
    if (kind === 'col') {
      // The two columns next to the edge share their width
      const delta = (e.clientX - startX) / zoom;
      const pair = columns[index]! + columns[index + 1]!;
      const left = Math.round(Math.min(pair - MIN_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, columns[index]! + delta)));
      table.value.columns[index] = left;
      table.value.columns[index + 1] = pair - left;
    } else {
      const delta = (e.clientY - startY) / zoom;
      table.value.rows[index]!.height = Math.round(Math.max(MIN_ROW_HEIGHT, heights[index]! + delta));
      syncTableSize(props.element);
    }
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    afterChange();
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ---- Right-click menu ----------------------------------------------------------

type MenuId =
  | 'rowAbove'
  | 'rowBelow'
  | 'colLeft'
  | 'colRight'
  | 'deleteRows'
  | 'deleteCols'
  | 'merge'
  | 'split'
  | 'splitTable'
  | 'clear';

const menu = ref<{ x: number; y: number } | null>(null);
const menuRef = ref<HTMLElement | null>(null);

function onMenuOutside(event: MouseEvent) {
  if (!menuRef.value?.contains(event.target as Node)) closeMenu();
}

function closeMenu() {
  menu.value = null;
  document.removeEventListener('mousedown', onMenuOutside, true);
}

function onCellContextMenu(event: MouseEvent, v: VisibleCell) {
  if (!isEditing.value) return;
  event.preventDefault();
  event.stopPropagation();
  commitEditor(false);
  if (!inSelection(v)) selectCells({ row: v.row, col: v.col });
  openMenuAt(event);
}

// Keep the menu inside the window
function openMenuAt(event: MouseEvent) {
  menu.value = {
    x: Math.min(event.clientX, window.innerWidth - 220),
    y: Math.max(8, Math.min(event.clientY, window.innerHeight - 430)),
  };
  document.addEventListener('mousedown', onMenuOutside, true);
}

const menuItems = computed(() => {
  const rect = selectedRect.value;
  const rows = rect ? rect.bottom - rect.top + 1 : 1;
  const cols = rect ? rect.right - rect.left + 1 : 1;
  const items: { id: MenuId; label: string; icon: Component; disabled?: boolean; divider?: boolean; hint?: string }[] = [
    { id: 'rowAbove', label: t('customTable.menu.rowAbove'), icon: ArrowUpToLine },
    { id: 'rowBelow', label: t('customTable.menu.rowBelow'), icon: ArrowDownToLine },
    { id: 'colLeft', label: t('customTable.menu.colLeft'), icon: ArrowLeftToLine },
    { id: 'colRight', label: t('customTable.menu.colRight'), icon: ArrowRightToLine },
    {
      id: 'deleteRows',
      label: t('customTable.menu.deleteRows', rows),
      icon: Trash2,
      divider: true,
      disabled: rows >= table.value.rows.length,
    },
    {
      id: 'deleteCols',
      label: t('customTable.menu.deleteCols', cols),
      icon: Trash2,
      disabled: cols >= table.value.columns.length,
    },
    {
      id: 'merge',
      label: t('customTable.menu.merge'),
      icon: TableCellsMerge,
      divider: true,
      disabled: !rect || !canMergeRect(table.value, rect),
    },
    {
      id: 'split',
      label: t('customTable.menu.split'),
      icon: TableCellsSplit,
      disabled: !rect || !hasMergedCells(table.value, rect),
    },
    { id: 'clear', label: t('customTable.menu.clear'), icon: Eraser, divider: true },
    {
      id: 'splitTable',
      label: t('customTable.menu.splitTable'),
      icon: Scissors,
      divider: true,
      disabled: !rect || !canSplitTypedTable(props.element, rect.top),
      // Why it can't split here
      hint: t('customTable.splitCant', { row: table.value.headerRows + 2 }),
    },
  ];
  return items;
});

// The rows from `at` on go to a new table on a new page after this one
function splitHere(at: number) {
  const moved = splitTypedTable(props.element, at);
  if (!moved) return;
  emit('finishEditing');
  notification.success(t('customTable.splitDone', { row: at + 1, page: (moved.pageIndex ?? 0) + 1 }));
}

function runMenu(id: MenuId) {
  const rect = selectedRect.value;
  closeMenu();
  if (!rect) return;
  const tbl = table.value;
  switch (id) {
    case 'rowAbove':
      change(() => insertRow(tbl, rect.top, rect.top));
      selectCells({ row: rect.top, col: rect.left });
      break;
    case 'rowBelow':
      change(() => insertRow(tbl, rect.bottom + 1, rect.bottom));
      selectCells({ row: rect.bottom + 1, col: rect.left });
      break;
    case 'colLeft':
      change(() => insertColumn(tbl, rect.left, rect.left));
      selectCells({ row: rect.top, col: rect.left });
      break;
    case 'colRight':
      change(() => insertColumn(tbl, rect.right + 1, rect.right));
      selectCells({ row: rect.top, col: rect.right + 1 });
      break;
    case 'deleteRows':
      change(() => deleteRows(tbl, rect.top, rect.bottom));
      selectCells({ row: Math.min(rect.top, tbl.rows.length - 1), col: rect.left });
      break;
    case 'deleteCols':
      change(() => deleteColumns(tbl, rect.left, rect.right));
      selectCells({ row: rect.top, col: Math.min(rect.left, tbl.columns.length - 1) });
      break;
    case 'merge':
      change(() => mergeCells(tbl, rect));
      selectCells({ row: rect.top, col: rect.left });
      break;
    case 'split':
      change(() => splitCells(tbl, rect));
      break;
    case 'clear':
      clearSelectedText();
      break;
    case 'splitTable':
      splitHere(rect.top);
      return;
  }
  nextTick(() => rootRef.value?.focus());
}
</script>

<style scoped>
.custom-table {
  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  outline: none;
}

.ct-cell {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.ct-text {
  width: 100%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.is-editing .ct-cell {
  cursor: text;
}

.ct-cell.is-selected::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(100, 64, 244, 0.08);
  pointer-events: none;
}

/* One outline around the selected cells / chosen row / chosen column */
.ct-selection-frame {
  position: relative;
  pointer-events: none;
  z-index: 2;
  border: 2px solid #6440f4;
  box-sizing: border-box;
}

.ct-editor {
  position: absolute;
  inset: 0;
  z-index: 1;
  margin: 0;
  border: none;
  outline: 2px solid #6440f4;
  outline-offset: -2px;
  background: rgba(255, 255, 255, 0.95);
  font-family: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: hidden;
  box-sizing: border-box;
  cursor: text;
}

/* Bullet / numbered points and superscript, as in text elements */
.ct-rich :deep(ul),
.ct-rich :deep(ol) {
  margin: 0;
  /* JasperReports indents each list level by 50pt, whatever the font size */
  padding-left: 50px;
}

.ct-rich :deep(li) {
  margin: 0;
}

.ct-rich :deep(sup),
.ct-rich :deep(sub) {
  font-size: 0.7em;
  line-height: 0;
}

.ct-menu-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ct-menu-hint {
  max-width: 190px;
  margin-top: 2px;
  font-size: 10.5px;
  line-height: 1.3;
  white-space: normal;
  color: #9ca3af;
}

/* Row and column handles, just outside the table */
.ct-handles {
  position: absolute;
  z-index: 3;
}

.ct-handles.is-cols {
  left: 0;
  right: 0;
  top: -14px;
  height: 11px;
}

.ct-handles.is-rows {
  top: 0;
  bottom: 0;
  left: -14px;
  width: 11px;
}

.ct-handle {
  position: absolute;
  display: grid;
  place-items: center;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  background: #f8fafc;
  color: #94a3b8;
  font: 500 8px/1 sans-serif;
  cursor: pointer;
  box-sizing: border-box;
}

.is-cols .ct-handle {
  top: 0;
  bottom: 0;
}

.is-rows .ct-handle {
  left: 0;
  right: 0;
}

.ct-handle:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
  color: #64748b;
}

.ct-handle.is-on {
  border-color: #6440f4;
  background: #6440f4;
  color: #ffffff;
}

/* Resize grips in the row / column bars: a short line between the handles */
.ct-bar-edge {
  position: absolute;
  z-index: 4;
}

.ct-bar-edge.is-col {
  top: -2px;
  bottom: -2px;
  width: 9px;
  margin-left: -4px;
  cursor: col-resize;
}

.ct-bar-edge.is-row {
  left: -2px;
  right: -2px;
  height: 9px;
  margin-top: -4px;
  cursor: row-resize;
}

.ct-bar-edge::after {
  content: "";
  position: absolute;
  border-radius: 1px;
  background: #94a3b8;
  transition: background 0.12s ease;
}

.ct-bar-edge.is-col::after {
  top: 0;
  bottom: 0;
  left: 3px;
  width: 3px;
}

.ct-bar-edge.is-row::after {
  left: 0;
  right: 0;
  top: 3px;
  height: 3px;
}

.ct-bar-edge:hover::after,
.ct-bar-edge:active::after {
  background: #6440f4;
}

.ct-col-edge,
.ct-row-edge {
  position: absolute;
  z-index: 2;
}

.ct-col-edge {
  top: 0;
  bottom: 0;
  width: 7px;
  margin-left: -3px;
  cursor: col-resize;
}

.ct-row-edge {
  left: 0;
  right: 0;
  height: 7px;
  margin-top: -3px;
  cursor: row-resize;
}

.ct-col-edge:hover,
.ct-row-edge:hover {
  background: rgba(100, 64, 244, 0.35);
}

.ct-menu {
  position: fixed;
  z-index: 3000;
  min-width: 200px;
  padding: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
}

.ct-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 10px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #1f2937;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.ct-menu-item.has-divider {
  margin-top: 5px;
  position: relative;
}

.ct-menu-item.has-divider::before {
  content: "";
  position: absolute;
  top: -3px;
  left: 6px;
  right: 6px;
  border-top: 1px solid #e5e7eb;
}

.ct-menu-item:hover:not(:disabled) {
  background: #f4f1ff;
}

.ct-menu-item:disabled {
  color: #9ca3af;
  cursor: default;
}
</style>
