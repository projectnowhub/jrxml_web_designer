// Readable summaries of a table's setup ("Status: Approved, Pending",
// "Amount: 1,000 – 5,000", "Amount: High to low"), shown in the properties
// panel, the Configure popup and the read-only preview.

import type { DataColumnType, TableDataBinding, TableFilter, TableSort } from "@/types/dataSource";
import { isActiveFilter } from "./dataBinding";
import { formatCellValue } from "./dataTable";

type Translate = (key: string, values?: Record<string, unknown>) => string;

const columnOf = (binding: TableDataBinding | undefined, key: string) =>
  binding?.columns.find((c) => c.key === key);

const labelOf = (binding: TableDataBinding | undefined, item: { column: string; label?: string }) =>
  item.label ?? columnOf(binding, item.column)?.label ?? item.column;

const typeOf = (binding: TableDataBinding | undefined, item: { column: string; type?: DataColumnType }) =>
  item.type ?? columnOf(binding, item.column)?.type ?? "text";

// How many ticked values a chip lists before "+N"
const LISTED_VALUES = 2;

// "Approved, Pending +1" or "1,000 – 5,000" (without the column name)
export function describeFilterValue(
  filter: TableFilter,
  type: DataColumnType,
  t: Translate,
  locale?: string,
): string {
  if (filter.operator === "in") {
    const values = filter.values ?? [];
    const listed = values.slice(0, LISTED_VALUES).join(", ");
    return values.length > LISTED_VALUES
      ? t("dataTable.filter.moreValues", { values: listed, count: values.length - LISTED_VALUES })
      : listed;
  }
  const show = (v?: string) => formatCellValue(type === "date" ? v : Number(v), type, locale);
  const hasFrom = filter.value !== undefined && filter.value !== "";
  const hasTo = filter.value2 !== undefined && filter.value2 !== "";
  if (hasFrom && hasTo) return t("dataTable.filter.range", { from: show(filter.value), to: show(filter.value2) });
  if (hasFrom) return t(type === "date" ? "dataTable.filter.onOrAfter" : "dataTable.filter.atLeast", { value: show(filter.value) });
  return t(type === "date" ? "dataTable.filter.onOrBefore" : "dataTable.filter.atMost", { value: show(filter.value2) });
}

export function describeFilter(
  binding: TableDataBinding | undefined,
  filter: TableFilter,
  t: Translate,
  locale?: string,
): string {
  return `${labelOf(binding, filter)}: ${describeFilterValue(filter, typeOf(binding, filter), t, locale)}`;
}

export function activeFilters(binding: TableDataBinding): TableFilter[] {
  return binding.filters.filter(isActiveFilter);
}

// Sort directions in words that fit the column: A to Z, Low to high, Oldest first
export function sortDirectionLabel(type: DataColumnType, direction: "asc" | "desc", t: Translate): string {
  const kind = type === "currency" ? "number" : type;
  return t(`dataTable.sort.${kind}.${direction}`);
}

export function describeSort(binding: TableDataBinding | undefined, sort: TableSort, t: Translate): string {
  return `${labelOf(binding, sort)}: ${sortDirectionLabel(typeOf(binding, sort), sort.direction, t)}`;
}

export function describeSorts(binding: TableDataBinding, t: Translate): string[] {
  return binding.sort.slice(0, 1).map((s) => describeSort(binding, s, t));
}
