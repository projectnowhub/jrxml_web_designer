// Table total helpers: a data table's totals row as analytics requests (the
// chart endpoint, POST /v2/analytics/aggregate), so each total is worked out
// by the backend over every matching row, like the PDF's. No API calls here.

import type { AggregateRequest, AggregationType, TableColumnBinding, TableDataBinding, TotalFunction } from "@/types/dataSource";
import { isActiveFilter, resolveFilterDates } from "@/utils/table/dataBinding";
import { projectCondition, tableFilterConditions } from "./jmixFilterHelpers";

const TOTAL_AGGREGATIONS: Record<TotalFunction, AggregationType> = {
  sum: "SUM",
  avg: "AVG",
  count: "COUNT",
};

// The columns with a total, in the table's order
export const totalColumns = (binding: TableDataBinding): TableColumnBinding[] =>
  binding.showTotals ? binding.columns.filter((col) => col.total) : [];

// One request per total column: the table's filters and its project
export function buildTableTotalRequests(binding: TableDataBinding, today = new Date()): AggregateRequest[] {
  const conditions = tableFilterConditions(resolveFilterDates(binding.filters.filter(isActiveFilter), today));
  return totalColumns(binding).map((col) => ({
    entityName: binding.sourceId,
    measure: col.total === "count" ? { aggregation: "COUNT" } : { aggregation: TOTAL_AGGREGATIONS[col.total!], property: col.key },
    ...(conditions.length ? { filter: { group: "AND" as const, conditions } } : {}),
    globalFilter: { group: "AND" as const, conditions: [projectCondition(binding.sourceId, binding.projectId, "=")] },
  }));
}
