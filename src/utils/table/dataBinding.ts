// Data tables: helpers shared by the Configure popup, the canvas, the JRXML
// generator/parser and the preview. Each table on a report has its own
// TableDataBinding, so several tables can use the same source independently.

import type { DataQuery, TableDataBinding, TableFilter } from "@/types/dataSource";
import { normalizeLook } from "./tableThemes";

// JRXML property on the table's <reportElement> holding its TableDataBinding
export const TABLE_BINDING_PROPERTY = "com.cdp.table.binding";

// Narrowest a column may get; limits how many columns fit in a table
export const MIN_TABLE_COLUMN_WIDTH = 60;

// Preview fetches at most this many rows per table; real reports have no limit
export const PREVIEW_ROW_LIMIT = 500;

const isBlank = (value: unknown) =>
  value === null || value === undefined || String(value).trim() === "";

// A filter with nothing ticked or no bound set doesn't filter anything
export function isActiveFilter(filter: TableFilter): boolean {
  if (!filter.column) return false;
  if (filter.operator === "in") return (filter.values?.length ?? 0) > 0;
  if (filter.operator === "between") return !isBlank(filter.value) || !isBlank(filter.value2);
  return false;
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
    filters: binding.filters.filter(isActiveFilter),
    sort: binding.sort.slice(0, 1),
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
      filters: Array.isArray(b.filters)
        ? b.filters.filter((f: TableFilter) => f && (f.operator === "in" || f.operator === "between"))
        : [],
      sort: Array.isArray(b.sort) ? b.sort.slice(0, 1) : [],
      rowLimit: typeof b.rowLimit === "number" ? b.rowLimit : undefined,
      showTotals: b.showTotals === true,
      theme: typeof b.theme === "string" && b.theme ? b.theme : "corporateBlue",
      look: b.look && typeof b.look === "object" ? normalizeLook(b.look) : undefined,
      customized: b.customized === true,
    };
  } catch {
    return null;
  }
}
