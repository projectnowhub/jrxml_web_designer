// Filter, sort and limit for the dummy sources. The backend will do this once
// its API is ready; then this file and mocks/dataSources.ts can be deleted.

import type {
  DataColumn,
  DataColumnType,
  DataQuery,
  DataQueryResult,
  DataRow,
  TableFilter,
} from "@/types/dataSource";
import { isActiveFilter } from "@/utils/table/dataBinding";

export { isActiveFilter };

const isBlank = (value: unknown) =>
  value === null || value === undefined || String(value).trim() === "";

function matchesFilter(
  row: DataRow,
  filter: TableFilter,
  type: DataColumnType,
): boolean {
  const cell = row[filter.column];
  if (filter.operator === "isEmpty") return isBlank(cell);
  if (filter.operator === "isNotEmpty") return !isBlank(cell);
  if (isBlank(cell)) return false;

  if (type === "number" || type === "currency") {
    const n = Number(cell);
    const a = Number(filter.value);
    const b = Number(filter.value2);
    switch (filter.operator) {
      case "equals": return n === a;
      case "notEquals": return n !== a;
      case "greaterThan": return n > a;
      case "lessThan": return n < a;
      case "between": return n >= Math.min(a, b) && n <= Math.max(a, b);
      default: return true;
    }
  }

  if (type === "date") {
    // ISO dates compare correctly as text
    const d = String(cell).slice(0, 10);
    const a = String(filter.value).slice(0, 10);
    const b = String(filter.value2 ?? "").slice(0, 10);
    switch (filter.operator) {
      case "on": return d === a;
      case "before": return d < a;
      case "after": return d > a;
      case "between": return d >= (a < b ? a : b) && d <= (a < b ? b : a);
      default: return true;
    }
  }

  const text = String(cell).trim().toLowerCase();
  const value = String(filter.value).trim().toLowerCase();
  switch (filter.operator) {
    case "equals": return text === value;
    case "notEquals": return text !== value;
    case "contains": return text.includes(value);
    case "startsWith": return text.startsWith(value);
    default: return true;
  }
}

function compareCells(a: unknown, b: unknown, type: DataColumnType): number {
  // Empty cells always go last
  if (isBlank(a)) return isBlank(b) ? 0 : 1;
  if (isBlank(b)) return -1;
  if (type === "number" || type === "currency") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function queryRows(
  allRows: DataRow[],
  schema: DataColumn[],
  query: DataQuery,
): DataQueryResult {
  const typeOf = (key: string): DataColumnType =>
    schema.find((c) => c.key === key)?.type ?? "text";

  const filters = query.filters.filter(isActiveFilter);
  let rows = filters.length
    ? allRows.filter((row) => {
        const test = (f: TableFilter) => matchesFilter(row, f, typeOf(f.column));
        return query.filterMatch === "any" ? filters.some(test) : filters.every(test);
      })
    : [...allRows];

  if (query.sort.length) {
    rows.sort((a, b) => {
      for (const s of query.sort) {
        const diff = compareCells(a[s.column], b[s.column], typeOf(s.column));
        if (diff !== 0) {
          // Descending reverses the values, but empty cells stay last
          const blankInvolved = isBlank(a[s.column]) || isBlank(b[s.column]);
          return s.direction === "desc" && !blankInvolved ? -diff : diff;
        }
      }
      return 0;
    });
  }

  const totalCount = rows.length;
  if (query.limit !== undefined && query.limit > 0) rows = rows.slice(0, query.limit);

  const keys = query.columns.length ? query.columns : schema.map((c) => c.key);
  return {
    rows: rows.map((row) => Object.fromEntries(keys.map((k) => [k, row[k] ?? null]))),
    totalCount,
  };
}
