// Jmix filter helpers: the conditions a rows or chart request filters by, the
// project first, then the table's or chart's own filters, as the CDP app's
// buildJmixFilter. No API calls and no browser code (the report engine
// bundles this file through utils/chart/chartQuery.ts).

import {
  CONTRACT_ENTITIES,
  CONTRACT_PROJECT_ID_PROPERTY,
  PROJECT_ID_PROPERTY,
} from "@/constants/reportDataConstants";
import type { TableFilter } from "@/types/dataSource";
import type { JmixCondition, JmixOperator } from "@/types/jmix";

// The property holding an entity's project id: through the contract for
// contract records (payment, variation order, final account, LAD)
export const projectPropertyOf = (entityName: string): string =>
  CONTRACT_ENTITIES.includes(entityName) ? CONTRACT_PROJECT_ID_PROPERTY : PROJECT_ID_PROPERTY;

// The project's records only, by the project's UUID (project.id), as the CDP app filters them
export function projectCondition(entityName: string, projectId: string, operator: JmixOperator = "in"): JmixCondition {
  return {
    property: projectPropertyOf(entityName),
    operator,
    value: operator === "in" ? [projectId] : projectId,
  };
}

// The day after a "YYYY-MM-DD" day (null for anything else)
function nextDay(day: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return next.toISOString().slice(0, 10);
}

// Filters as Jmix conditions (moving date ranges already turned into dates):
// ticked values = "in", typed words = "contains", Yes / No = "=" true / false,
// a range = >= and <=, a date's "to" as "before the next day" (so a date with
// a time on that day counts too); unfinished filters give none
export function tableFilterConditions(filters: TableFilter[]): JmixCondition[] {
  const bound = (filter: TableFilter, value: string) => (filter.type === "date" ? value : Number(value));
  return filters.flatMap((filter): JmixCondition[] => {
    if (filter.operator === "in") {
      return filter.values?.length ? [{ property: filter.column, operator: "in", value: filter.values }] : [];
    }
    if (filter.operator === "contains") {
      const words = (filter.value ?? "").trim();
      return words ? [{ property: filter.column, operator: "contains", value: words }] : [];
    }
    if (filter.operator === "equals") {
      return filter.value === "true" || filter.value === "false"
        ? [{ property: filter.column, operator: "=", value: filter.value === "true" }]
        : [];
    }
    const range: JmixCondition[] = [];
    if (filter.value) range.push({ property: filter.column, operator: ">=", value: bound(filter, filter.value) });
    const dayAfter = filter.type === "date" && filter.value2 ? nextDay(filter.value2) : null;
    if (dayAfter) range.push({ property: filter.column, operator: "<", value: dayAfter });
    else if (filter.value2) range.push({ property: filter.column, operator: "<=", value: bound(filter, filter.value2) });
    return range;
  });
}
