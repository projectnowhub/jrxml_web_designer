<template>
  <!-- Rows of a data table, drawn with its theme (Configure popup, preview
       window), on TanStack Table (@tanstack/vue-table, the core of the CDP
       app's react-table): sorting and pages are the backend's (manual mode),
       so the grid only shows the page it is given and asks for others -->
  <div class="data-grid" :class="{ 'has-pages': paged }">
    <div class="dg-scroll">
      <table v-if="columns.length">
        <thead>
          <tr v-for="group in table.getHeaderGroups()" :key="group.id">
            <th
              v-for="(header, i) in group.headers"
              :key="header.id"
              :style="cellStyle('header', columns[i]!, i)"
              :class="{ 'is-sortable': header.column.getCanSort() }"
              :aria-sort="ariaSort(header.column.getIsSorted())"
              :title="header.column.getCanSort() ? sortTitle(columns[i]!, header.column.getIsSorted()) : undefined"
              @click="header.column.getToggleSortingHandler()?.($event)"
            >
              <span class="dg-head">
                <Zap v-if="userDefinedKeys?.has(columns[i]!.key)" :size="11" class="dg-bolt" aria-hidden="true" />
                <span class="dg-head-label">{{ columns[i]!.label }}</span>
                <template v-if="header.column.getCanSort()">
                  <ArrowUp v-if="header.column.getIsSorted() === 'asc'" :size="12" class="dg-sort is-on" aria-hidden="true" />
                  <ArrowDown v-else-if="header.column.getIsSorted() === 'desc'" :size="12" class="dg-sort is-on" aria-hidden="true" />
                  <ArrowUpDown v-else :size="12" class="dg-sort" aria-hidden="true" />
                </template>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- First rows on their way: skeleton rows (CDP DataTableSkeleton) -->
          <template v-if="loading && !rows.length">
            <tr v-for="i in SKELETON_ROWS" :key="`skeleton-${i}`" :style="{ opacity: Math.max(0.25, 1 - (i - 1) * 0.1) }">
              <td v-for="(col, j) in columns" :key="col.key" class="dg-skeleton-cell">
                <SkeletonBlock :width="`${SKELETON_WIDTHS[j % SKELETON_WIDTHS.length]}%`" height="10px" radius="4px" />
              </td>
            </tr>
          </template>
          <tr v-else-if="failed">
            <td :colspan="columns.length" class="dg-message is-error">{{ t("dataTable.loadFailed") }}</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td :colspan="columns.length" class="dg-message">{{ t("dataTable.noRows") }}</td>
          </tr>
          <tr v-for="row in table.getRowModel().rows" v-else :key="row.id" :class="{ 'is-stale': loading }">
            <td v-for="(col, i) in columns" :key="col.key" :style="cellStyle('row', col, i, row.index)">
              <div v-if="tableColumnBarcode(col)" class="dg-barcode">
                <BarcodeCell :type="tableColumnBarcode(col)!" :value="row.original[col.key]" :height="BARCODE_CELL_HEIGHT" />
              </div>
              <template v-else>{{ formatCellValue(row.original[col.key], col.type, locale, col.choices) }}</template>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="showTotals && rows.length">
          <tr>
            <td v-for="(col, i) in columns" :key="col.key" :style="cellStyle('totals', col, i)">
              <template v-if="col.total">{{ totalText(col) }}</template>
              <template v-else-if="i === 0">{{ t("dataTable.totals.label") }}</template>
            </td>
          </tr>
        </tfoot>
      </table>
      <div v-else class="dg-message">{{ t("dataTable.config.needColumn") }}</div>
    </div>
    <PageNavigation
      v-if="paged && columns.length && rowCount! > 0"
      class="dg-pages"
      :page="pageIndex! + 1"
      :page-size="pageSize!"
      :total="rowCount!"
      @update:page="table.setPageIndex($event - 1)"
      @update:page-size="table.setPageSize($event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SkeletonBlock from "./SkeletonBlock.vue";
import { useI18n } from "vue-i18n";
import { ArrowDown, ArrowUp, ArrowUpDown, Zap } from "@lucide/vue";
import {
  getCoreRowModel,
  useVueTable,
  type ColumnDef,
  type PaginationState,
  type SortDirection as GridSortDirection,
  type SortingState,
  type Updater,
} from "@tanstack/vue-table";
import type {
  DataRow,
  TableColumnBinding,
  TableHighlight,
  TableLook,
  TableSort,
  TableTotals,
} from "@/types/dataSource";
import { formatCellValue, lookAlignFor } from "@/utils/table/dataTable";
import { lookPartStyles, rowColorAt, tableCellCss, type TableStylePart } from "@/utils/table/tableThemes";
import { columnPartLook, partLookCss } from "@/utils/table/columnLook";
import { sortDirectionLabel } from "@/utils/table/summary";
import { tableColumnBarcode } from "@/utils/barcode/barcodeTypes";
import BarcodeCell from "./BarcodeCell.vue";
import PageNavigation from "./PageNavigation.vue";

// Skeleton rows while the first rows load, and their bars' widths (% of a cell)
const SKELETON_ROWS = 8;
const SKELETON_WIDTHS = [70, 90, 55, 80, 65, 45];

// Barcode columns in the preview: a row this tall (points)
const BARCODE_CELL_HEIGHT = 30;

const props = defineProps<{
  columns: TableColumnBinding[];
  // User-defined fields: a bolt in their heading (as the CDP app's ⚡)
  userDefinedKeys?: Set<string>;
  rows: DataRow[];
  look: TableLook;
  highlights?: TableHighlight[];
  showTotals?: boolean;
  // Each total column's value over every matching row (the backend's)
  totals?: TableTotals;
  totalsLoading?: boolean;
  loading?: boolean;
  failed?: boolean;
  // A click on a heading sorts by that column (low to high, high to low, off)
  sortable?: boolean;
  sort?: TableSort[];
  // Pages: shown when pageIndex, pageSize and rowCount are all given
  pageIndex?: number;
  pageSize?: number;
  rowCount?: number;
  pageSizes?: readonly number[];
}>();

const emit = defineEmits<{
  "update:sort": [sort: TableSort[]];
  "update:pageIndex": [pageIndex: number];
  "update:pageSize": [pageSize: number];
}>();

const { t, locale } = useI18n();

const paged = computed(
  () => props.pageIndex !== undefined && props.pageSize !== undefined && props.rowCount !== undefined,
);

const columnDefs = computed<ColumnDef<DataRow>[]>(() =>
  props.columns.map((col) => ({
    id: col.key,
    accessorFn: (row: DataRow) => row[col.key],
    header: col.label,
    // Barcodes print as pictures, links as a record's name: nothing to sort them by
    enableSorting: !!props.sortable && !tableColumnBarcode(col) && !col.linked,
  })),
);

const sorting = computed<SortingState>(() =>
  (props.sort ?? []).slice(0, 1).map((s) => ({ id: s.column, desc: s.direction === "desc" })),
);
const pagination = computed<PaginationState>(() => ({ pageIndex: props.pageIndex ?? 0, pageSize: props.pageSize ?? 25 }));

const resolve = <T,>(updater: Updater<T>, current: T): T =>
  typeof updater === "function" ? (updater as (old: T) => T)(current) : updater;

const table = useVueTable<DataRow>({
  get data() {
    return props.rows;
  },
  get columns() {
    return columnDefs.value;
  },
  getCoreRowModel: getCoreRowModel(),
  manualSorting: true,
  manualPagination: true,
  enableMultiSort: false,
  sortDescFirst: false,
  get rowCount() {
    return props.rowCount ?? props.rows.length;
  },
  state: {
    get sorting() {
      return sorting.value;
    },
    get pagination() {
      return pagination.value;
    },
  },
  onSortingChange: (updater) => {
    const next = resolve(updater, sorting.value)[0];
    const col = next ? props.columns.find((c) => c.key === next.id) : undefined;
    emit(
      "update:sort",
      col ? [{ column: col.key, label: col.label, type: col.type, direction: next!.desc ? "desc" : "asc" }] : [],
    );
    // Another order starts again at the first page
    if (props.pageIndex) emit("update:pageIndex", 0);
  },
  onPaginationChange: (updater) => {
    const next = resolve(updater, pagination.value);
    if (next.pageSize !== pagination.value.pageSize) {
      emit("update:pageSize", next.pageSize);
      emit("update:pageIndex", 0);
    } else if (next.pageIndex !== pagination.value.pageIndex) {
      emit("update:pageIndex", next.pageIndex);
    }
  },
});

const styles = computed(() => lookPartStyles(props.look));

// Body rows take the row colours in turn over the whole list, not each page
const rowOffset = computed(() => (paged.value ? props.pageIndex! * props.pageSize! : 0));

function cellStyle(part: TableStylePart, col: TableColumnBinding, index: number, rowIndex = 0) {
  const css: Record<string, string> = tableCellCss(
    styles.value[part],
    part === "row" ? rowColorAt(props.look, rowOffset.value + rowIndex) : undefined,
  );
  // The column's own look (body cells: with the highlight rules on this row)
  const own = columnPartLook(
    { columns: props.columns, highlights: props.highlights },
    col,
    part,
    part === "row" ? (props.rows[rowIndex] ?? null) : null,
  );
  Object.assign(css, partLookCss(own));
  css.textAlign = (own?.align ?? lookAlignFor(props.look, part, col)).toLowerCase();
  if (index > 0) css.borderLeft = "none";
  return css;
}

function ariaSort(sorted: false | GridSortDirection): "ascending" | "descending" | undefined {
  return sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined;
}

// "Sorted: Low to high. Click to sort High to low" (in the column's own words)
function sortTitle(col: TableColumnBinding, sorted: false | GridSortDirection): string {
  if (!sorted) return t("dataTable.grid.sortBy", { order: sortDirectionLabel(col.type, "asc", t) });
  const now = sortDirectionLabel(col.type, sorted, t);
  return sorted === "asc"
    ? t("dataTable.grid.sortedThen", { now, next: sortDirectionLabel(col.type, "desc", t) })
    : t("dataTable.grid.sortedOff", { now });
}

function totalText(col: TableColumnBinding): string {
  const value = props.totals?.[col.key];
  if (value === undefined || value === null) return props.totalsLoading ? "…" : "";
  return formatCellValue(value, col.total === "count" ? "number" : col.type, locale.value);
}
</script>

<style scoped>
.data-grid {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  max-height: 100%;
}

.data-grid:not(.has-pages) {
  width: max-content;
}

/* The same card as My Templates' list (the app's one table frame); the page
   bar sits under it. Cells keep the table's own colours: they preview the report */
.dg-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  border: 1px solid rgba(28, 27, 38, 0.09);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.05);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

th,
td {
  height: 32px;
  padding: 0 10px;
  white-space: nowrap;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}

thead th {
  position: sticky;
  top: 0;
  z-index: 1;
}

th.is-sortable {
  cursor: pointer;
  user-select: none;
}

.dg-head {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}

.dg-head-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.dg-bolt {
  flex: none;
  color: #f59e0b;
}

.dg-sort {
  flex: none;
  opacity: 0.45;
}

.dg-sort.is-on,
th.is-sortable:hover .dg-sort {
  opacity: 1;
}

tbody tr + tr td {
  border-top: none !important;
}

tfoot td {
  position: sticky;
  bottom: 0;
}

.is-stale td {
  opacity: 0.55;
}

.dg-skeleton-cell {
  padding: 10px 8px;
}

.dg-message {
  padding: 16px;
  text-align: center;
  font-style: italic;
  color: #6b7280;
}

.dg-message.is-error {
  color: #dc2626;
}

.dg-barcode {
  width: 100%;
  height: 30px;
}

.dg-pages {
  flex: none;
  padding-top: 12px;
}
</style>
