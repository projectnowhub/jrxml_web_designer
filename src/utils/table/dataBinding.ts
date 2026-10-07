// Data tables: helpers shared by the Configure popup, the canvas, the JRXML
// generator/parser and the preview. Each table on a report has its own
// TableDataBinding, so several tables can use the same source independently.

import type { DataQuery, RelativePeriod, TableDataBinding, TableFilter } from "@/types/dataSource";
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
  if (filter.operator === "between") {
    return !!filter.period || !isBlank(filter.value) || !isBlank(filter.value2);
  }
  return false;
}

export const RELATIVE_PERIODS: RelativePeriod[] = ["thisMonth", "lastMonth", "thisQuarter", "thisYear", "last30Days"];

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// First and last day (YYYY-MM-DD) of a moving date range, as of `today`
export function periodRange(period: RelativePeriod, today = new Date()): { from: string; to: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (period) {
    case "thisMonth":
      return { from: isoDay(new Date(y, m, 1)), to: isoDay(new Date(y, m + 1, 0)) };
    case "lastMonth":
      return { from: isoDay(new Date(y, m - 1, 1)), to: isoDay(new Date(y, m, 0)) };
    case "thisQuarter": {
      const q = m - (m % 3);
      return { from: isoDay(new Date(y, q, 1)), to: isoDay(new Date(y, q + 3, 0)) };
    }
    case "thisYear":
      return { from: isoDay(new Date(y, 0, 1)), to: isoDay(new Date(y, 11, 31)) };
    case "last30Days":
      return { from: isoDay(new Date(y, m, today.getDate() - 29)), to: isoDay(today) };
  }
}

// Filters as sent to the backend: moving date ranges become today's dates
export function resolveFilterDates(filters: TableFilter[], today = new Date()): TableFilter[] {
  return filters.map((f) => {
    if (f.operator !== "between" || !f.period) return f;
    const { from, to } = periodRange(f.period, today);
    const { period: _period, ...rest } = f;
    return { ...rest, value: from, value2: to };
  });
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

// Saved filters, keeping only the kinds the designer knows
export function readFilters(value: unknown): TableFilter[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((f: TableFilter) => f && typeof f.column === "string" && (f.operator === "in" || f.operator === "between"))
    .map((f: TableFilter) => (f.period && !RELATIVE_PERIODS.includes(f.period) ? { ...f, period: undefined } : f));
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
      // Tables set up before projects existed have none: they keep their
      // setup and get a project when the user edits their data
      projectId: typeof b.projectId === "string" ? b.projectId : "",
      projectName: typeof b.projectName === "string" ? b.projectName : "",
      sourceId: b.sourceId,
      sourceName: typeof b.sourceName === "string" ? b.sourceName : b.sourceId,
      columns: b.columns,
      filters: readFilters(b.filters),
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
