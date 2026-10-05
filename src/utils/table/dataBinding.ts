// Data tables: helpers shared by the Configure popup, the canvas, the JRXML
// generator/parser and the preview. Each table on a report has its own
// TableDataBinding, so several tables can use the same source independently.

import type {
  DataColumnType,
  DataQuery,
  FilterOperator,
  TableDataBinding,
  TableFilter,
} from "@/types/dataSource";

// JRXML property on the table's <reportElement> holding its TableDataBinding
export const TABLE_BINDING_PROPERTY = "com.cdp.table.binding";

// Narrowest a column may get; limits how many columns fit in a table
export const MIN_TABLE_COLUMN_WIDTH = 60;

// Preview fetches at most this many rows per table; real reports have no limit
export const PREVIEW_ROW_LIMIT = 500;

// Filter operators offered for each column type
export const FILTER_OPERATORS: Record<DataColumnType, FilterOperator[]> = {
  text: ["equals", "notEquals", "contains", "startsWith", "isEmpty", "isNotEmpty"],
  number: ["equals", "notEquals", "greaterThan", "lessThan", "between", "isEmpty", "isNotEmpty"],
  currency: ["equals", "notEquals", "greaterThan", "lessThan", "between", "isEmpty", "isNotEmpty"],
  date: ["on", "before", "after", "between", "isEmpty", "isNotEmpty"],
};

const NO_VALUE_OPERATORS = new Set<FilterOperator>(["isEmpty", "isNotEmpty"]);
const isBlank = (value: unknown) =>
  value === null || value === undefined || String(value).trim() === "";

export const operatorNeedsValue = (op: FilterOperator) => !NO_VALUE_OPERATORS.has(op);

// A filter still being filled in (no value yet) doesn't filter anything
export function isActiveFilter(filter: TableFilter): boolean {
  if (!filter.column || !filter.operator) return false;
  if (!operatorNeedsValue(filter.operator)) return true;
  if (isBlank(filter.value)) return false;
  return filter.operator !== "between" || !isBlank(filter.value2);
}

export function maxColumnsForWidth(tableWidth: number): number {
  return Math.max(1, Math.floor(tableWidth / MIN_TABLE_COLUMN_WIDTH));
}

// Whole-number widths that add up exactly to the table width
export function distributeColumnWidths(count: number, tableWidth: number): number[] {
  if (count <= 0) return [];
  const total = Math.max(count, Math.round(tableWidth));
  const base = Math.floor(total / count);
  const extra = total - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

// "Table 1", "Table 2"…: the lowest number not already used
export function nextTableName(existingNames: string[], base = "Table"): string {
  const used = new Set(existingNames);
  let n = 1;
  while (used.has(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

// Unique dataset name for a new or copied table, e.g. "table_3f9a1c".
// Also a valid JRXML dataset/parameter name.
export function createDatasetName(existingNames: string[]): string {
  const used = new Set(existingNames);
  let name: string;
  do {
    name = `table_${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
  } while (used.has(name));
  return name;
}

// The request for a table's rows; `limit` lets the preview cap large tables
export function toDataQuery(binding: TableDataBinding, limit?: number): DataQuery {
  const caps = [binding.rowLimit, limit].filter(
    (n): n is number => typeof n === "number" && n > 0,
  );
  return {
    columns: binding.columns.map((c) => c.key),
    filters: binding.filters,
    filterMatch: binding.filterMatch,
    sort: binding.sort,
    limit: caps.length ? Math.min(...caps) : undefined,
  };
}

export function serializeBinding(binding: TableDataBinding): string {
  return JSON.stringify(binding);
}

// Reads a saved binding back; anything unreadable gives null (an unlinked table)
export function parseBinding(json: string | null | undefined): TableDataBinding | null {
  if (!json) return null;
  try {
    const b = JSON.parse(json);
    if (
      !b ||
      typeof b.datasetName !== "string" ||
      typeof b.sourceId !== "string" ||
      !Array.isArray(b.columns)
    ) {
      return null;
    }
    return {
      tableName: typeof b.tableName === "string" ? b.tableName : "",
      datasetName: b.datasetName,
      sourceId: b.sourceId,
      sourceName: typeof b.sourceName === "string" ? b.sourceName : b.sourceId,
      columns: b.columns,
      filters: Array.isArray(b.filters) ? b.filters : [],
      filterMatch: b.filterMatch === "any" ? "any" : "all",
      sort: Array.isArray(b.sort) ? b.sort : [],
      rowLimit: typeof b.rowLimit === "number" ? b.rowLimit : undefined,
      showTotals: b.showTotals === true,
      theme: ["corporateBlue", "minimal", "emerald"].includes(b.theme)
        ? b.theme
        : "corporateBlue",
    };
  } catch {
    return null;
  }
}
