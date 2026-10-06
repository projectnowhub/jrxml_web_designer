<template>
  <!-- Rows of a data table, drawn with its theme (Configure popup, preview) -->
  <div class="data-grid">
    <table v-if="columns.length">
      <thead>
        <tr>
          <th v-for="(col, i) in columns" :key="col.key" :style="cellStyle('header', col, i)">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading && !rows.length">
          <td :colspan="columns.length" class="dg-message">{{ t("dataTable.loading") }}</td>
        </tr>
        <tr v-else-if="failed">
          <td :colspan="columns.length" class="dg-message is-error">{{ t("dataTable.loadFailed") }}</td>
        </tr>
        <tr v-else-if="!rows.length">
          <td :colspan="columns.length" class="dg-message">{{ t("dataTable.noRows") }}</td>
        </tr>
        <tr v-for="(row, r) in rows" v-else :key="r" :class="{ 'is-stale': loading }">
          <td v-for="(col, i) in columns" :key="col.key" :style="cellStyle('row', col, i, r)">
            {{ formatCellValue(row[col.key], col.type, locale) }}
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
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { DataRow, TableColumnBinding, TableLook } from "@/types/dataSource";
import { cellAlignmentFor, computeTotal, formatCellValue } from "@/utils/table/dataTable";
import { lookPartStyles, tableCellCss, type TableStylePart } from "@/utils/table/tableThemes";

const props = defineProps<{
  columns: TableColumnBinding[];
  rows: DataRow[];
  look: TableLook;
  showTotals?: boolean;
  loading?: boolean;
  failed?: boolean;
}>();

const { t, locale } = useI18n();

const styles = computed(() => lookPartStyles(props.look));

function cellStyle(part: TableStylePart, col: TableColumnBinding, index: number, rowIndex = 0) {
  const css: Record<string, string> = tableCellCss(styles.value[part], part === "row" && rowIndex % 2 === 1);
  css.textAlign = part === "header" ? "left" : cellAlignmentFor(col.type).toLowerCase();
  if (part === "totals" && col.total) css.textAlign = "right";
  if (index > 0) css.borderLeft = "none";
  return css;
}

function totalText(col: TableColumnBinding): string {
  const value = computeTotal(props.rows, col);
  if (value === null) return "";
  return formatCellValue(value, col.total === "count" ? "number" : col.type, locale.value);
}
</script>

<style scoped>
.data-grid {
  min-width: 100%;
  width: max-content;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

th,
td {
  height: 26px;
  padding: 0 6px;
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

.dg-message {
  padding: 16px;
  text-align: center;
  font-style: italic;
  color: #6b7280;
}

.dg-message.is-error {
  color: #dc2626;
}
</style>
