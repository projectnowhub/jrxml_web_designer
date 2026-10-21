// Filter, sort, limit and chart totals for the dummy sources. The backend will
// do this once its API is ready; then this file and mocks/dataSources.ts can
// be deleted.

import type {
  AggregateGranularity,
  AggregateMeasure,
  AggregateRequest,
  AggregateResult,
  AggregateRow,
  DataColumn,
  DataColumnType,
  DataQuery,
  DataQueryResult,
  DataRow,
  JmixCondition,
  JmixFilter,
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

const matchingRows = (allRows: DataRow[], schema: DataColumn[], filters: TableFilter[]) => {
  const typeOf = (key: string): DataColumnType => schema.find((c) => c.key === key)?.type ?? "text";
  const active = filters.filter(isActiveFilter);
  return active.length
    ? allRows.filter((row) => active.every((f) => matchesFilter(row, f, typeOf(f.column))))
    : allRows;
};

export function queryRows(
  allRows: DataRow[],
  schema: DataColumn[],
  query: DataQuery,
): DataQueryResult {
  const typeOf = (key: string): DataColumnType =>
    schema.find((c) => c.key === key)?.type ?? "text";

  let rows = [...matchingRows(allRows, schema, query.filters)];

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

// ── Charts: the CDP analytics endpoint (POST /v2/analytics/aggregate) ──

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// The first day of the bucket a date falls in (weeks start on Monday)
function dateBucket(value: unknown, granularity: AggregateGranularity): string {
  const day = asDate(value);
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  switch (granularity) {
    case "DAY":
      return day;
    case "WEEK":
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      return isoDay(d);
    case "MONTH":
      return `${day.slice(0, 7)}-01`;
    case "QUARTER":
      return `${day.slice(0, 4)}-${String(Math.floor(d.getUTCMonth() / 3) * 3 + 1).padStart(2, "0")}-01`;
    case "YEAR":
      return `${day.slice(0, 4)}-01-01`;
  }
}

function aggregateGroup(rows: DataRow[], measure: AggregateMeasure): number | null {
  if (measure.aggregation === "COUNT") return rows.length;
  const nums = rows
    .map((r) => (measure.property ? r[measure.property] : null))
    .filter((v) => !isBlank(v))
    .map(Number)
    .filter(Number.isFinite);
  if (!nums.length) return null;
  switch (measure.aggregation) {
    case "SUM":
      return nums.reduce((a, b) => a + b, 0);
    case "AVG":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "MIN":
      return Math.min(...nums);
    case "MAX":
      return Math.max(...nums);
  }
}

// A row against a Jmix filter (the operators the designer sends)
function matchesJmix(row: DataRow, filter: JmixFilter, typeOf: (key: string) => DataColumnType): boolean {
  const test = (c: JmixCondition | JmixFilter): boolean => {
    if ("conditions" in c) return matchesJmix(row, c, typeOf);
    const cell = row[c.property];
    if (isBlank(cell)) return false;
    const isDate = typeOf(c.property) === "date";
    const a = isDate ? asDate(cell) : typeOf(c.property) === "text" ? String(cell).trim().toLowerCase() : Number(cell);
    const b = (v: unknown) => (isDate ? asDate(v) : typeof a === "number" ? Number(v) : String(v).trim().toLowerCase());
    switch (c.operator) {
      case "in":
        return (c.value as unknown[]).some((v) => b(v) === a);
      case "notIn":
        return !(c.value as unknown[]).some((v) => b(v) === a);
      case "=":
        return a === b(c.value);
      case "!=":
      case "<>":
        return a !== b(c.value);
      case ">":
        return a > b(c.value);
      case "<":
        return a < b(c.value);
      case ">=":
        return a >= b(c.value);
      case "<=":
        return a <= b(c.value);
      case "contains":
        return String(a).includes(String(b(c.value)));
      case "startsWith":
        return String(a).startsWith(String(b(c.value)));
      case "endsWith":
        return String(a).endsWith(String(b(c.value)));
    }
  };
  return filter.group === "OR" ? filter.conditions.some(test) : filter.conditions.every(test);
}

// The dummy rows already belong to one project: its project.id condition is dropped
const withoutProject = (filter?: JmixFilter): JmixFilter | undefined =>
  filter && {
    ...filter,
    conditions: filter.conditions.filter((c) => "conditions" in c || c.property !== "project.id"),
  };

export function aggregateRows(allRows: DataRow[], schema: DataColumn[], request: AggregateRequest): AggregateResult {
  const typeOf = (key: string): DataColumnType => schema.find((c) => c.key === key)?.type ?? "text";
  const filters = [withoutProject(request.globalFilter), request.filter].filter(
    (f): f is JmixFilter => !!f && f.conditions.length > 0,
  );
  const rows = allRows.filter((row) => filters.every((f) => matchesJmix(row, f, typeOf)));

  const keyOf = (row: DataRow, spec: { property: string; granularity?: AggregateGranularity }): string | null => {
    const cell = row[spec.property];
    if (isBlank(cell)) return null;
    return typeOf(spec.property) === "date" ? dateBucket(cell, spec.granularity ?? "MONTH") : String(cell).trim();
  };
  const labelOf = (key: string | null) => key;
  const group = (list: DataRow[]): AggregateRow[] => {
    if (!request.dimension) {
      return [{ key: null, label: null, value: aggregateGroup(list, request.measure), count: list.length }];
    }
    const groups = new Map<string | null, DataRow[]>();
    for (const row of list) {
      const key = keyOf(row, request.dimension);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups].map(([key, members]) => ({
      key,
      label: labelOf(key),
      value: aggregateGroup(members, request.measure),
      count: members.length,
    }));
  };

  const result: AggregateResult = {
    entityName: request.entityName,
    measure: request.measure,
    ...(request.dimension ? { dimension: request.dimension } : {}),
    ...(request.splitBy ? { splitBy: request.splitBy } : {}),
    rows: group(rows),
    totalValue: aggregateGroup(rows, request.measure),
    totalCount: rows.length,
    truncated: false,
  };
  if (request.splitBy) {
    const split = new Map<string | null, DataRow[]>();
    for (const row of rows) {
      const key = keyOf(row, request.splitBy);
      split.set(key, [...(split.get(key) ?? []), row]);
    }
    result.series = [...split].map(([key, members]) => ({ key, label: labelOf(key), rows: group(members) }));
  }
  return result;
}
