// Readable summaries of a table's setup ("Status is Approved", "Amount ↓"),
// shown in the properties panel and the read-only preview.

import type { TableDataBinding, TableFilter } from "@/types/dataSource";
import { isActiveFilter } from "./dataBinding";

type Translate = (key: string, values?: Record<string, unknown>) => string;

const columnLabel = (binding: TableDataBinding, key: string) =>
  binding.columns.find((c) => c.key === key)?.label ?? key;

export function describeFilter(binding: TableDataBinding, filter: TableFilter, t: Translate): string {
  const op = t(`dataTable.operators.${filter.operator}`);
  const label = columnLabel(binding, filter.column);
  if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") return `${label} ${op}`;
  if (filter.operator === "between") {
    return t("dataTable.summary.between", { column: label, from: filter.value, to: filter.value2 });
  }
  return `${label} ${op} ${filter.value}`;
}

export function activeFilters(binding: TableDataBinding): TableFilter[] {
  return binding.filters.filter(isActiveFilter);
}

export function describeSorts(binding: TableDataBinding): { label: string; direction: "asc" | "desc" }[] {
  return binding.sort.map((s) => ({ label: columnLabel(binding, s.column), direction: s.direction }));
}
