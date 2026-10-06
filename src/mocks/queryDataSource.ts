// Filter, sort and limit for the dummy sources. The backend will do this once
// its API is ready; then this file and mocks/dataSources.ts can be deleted.

import type {
  DataColumn,
  DataColumnType,
  DataQuery,
  DataQueryResult,
  DataRow,
  SourceFacets,
  TableFilter,
} from "@/types/dataSource";
import { isActiveFilter } from "@/utils/table/dataBinding";

export { isActiveFilter };

const isBlank = (value: unknown) =>
  value === null || value === undefined || String(value).trim() === "";

const asDate = (value: unknown) => String(value ?? "").slice(0, 10);

function matchesFilter(row: DataRow, filter: TableFilter, type: DataColumnType): boolean {
  const cell = row[filter.column];
  if (filter.operator === "in") {
    const wanted = new Set((filter.values ?? []).map((v) => v.trim().toLowerCase()));
    return !isBlank(cell) && wanted.has(String(cell).trim().toLowerCase());
  }
  // "between": inclusive, either end may be empty
  if (isBlank(cell)) return false;
  const hasFrom = !isBlank(filter.value);
  const hasTo = !isBlank(filter.value2);
  if (type === "date") {
    // ISO dates compare correctly as text
    const d = asDate(cell);
    return (!hasFrom || d >= asDate(filter.value)) && (!hasTo || d <= asDate(filter.value2));
  }
  const n = Number(cell);
  return (!hasFrom || n >= Number(filter.value)) && (!hasTo || n <= Number(filter.value2));
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
    ? allRows.filter((row) => filters.every((f) => matchesFilter(row, f, typeOf(f.column))))
    : [...allRows];

  if (query.sort.length) {
    rows.sort((a, b) => {
      for (const s of query.sort.slice(0, 1)) {
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

// The filter panel's choices: each text column's values with how many rows
// have them (most common first), each number, amount or date column's range
export function columnFacets(allRows: DataRow[], schema: DataColumn[]): SourceFacets {
  const facets: SourceFacets = {};
  for (const col of schema) {
    const cells = allRows.map((r) => r[col.key]).filter((v) => !isBlank(v));
    if (col.type === "text") {
      const counts = new Map<string, number>();
      for (const v of cells) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
      facets[col.key] = {
        kind: "values",
        values: [...counts]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
      };
    } else if (col.type === "date") {
      const days = cells.map(asDate).sort();
      facets[col.key] = { kind: "range", min: days[0] ?? null, max: days[days.length - 1] ?? null };
    } else {
      const nums = cells.map(Number).filter(Number.isFinite);
      facets[col.key] = {
        kind: "range",
        min: nums.length ? Math.min(...nums) : null,
        max: nums.length ? Math.max(...nums) : null,
      };
    }
  }
  return facets;
}
