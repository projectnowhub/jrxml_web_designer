// The columns a chart may use, as the CDP app's dashboards offer them: for an
// entity with a CDP field list (constants/chartFieldConstants.ts) only its
// fields, in its order and with its names; for any other entity, null (the
// chart then offers the source's columns). No browser code.

import { CHART_FIELDS, CHART_VALUE_COLORS } from "@/constants/chartFieldConstants";
import type { ChartFieldRule, DataColumn, DataSourceSchema } from "@/types/dataSource";

export interface ChartFieldLists {
  // X-axis / categories, split by, tree map levels (in the CDP list's order)
  groupable: DataColumn[];
  // Added up by Sum / Avg / Min / Max
  measurable: DataColumn[];
  // Shown in the chart's filters
  filterable: DataColumn[];
}

// Locale key of a field's CDP name ("." in a key is "_")
export const chartFieldLabelKey = (entityName: string, key: string) =>
  `chartFields.${entityName}.${key.replace(/\./g, "_")}`;

// A CDP field as a column: the source's own column (its type, choices, yes / no),
// or, for a path into a linked record ("supplier.name"), that record's text
function toChartColumn(rule: ChartFieldRule, columns: DataColumn[], label: string, entityName: string): DataColumn | null {
  const own = columns.find((c) => c.key === rule.key);
  if (own) {
    if (own.linked) return null;
    // Choice values carry the CDP dashboards' colours
    const colors = CHART_VALUE_COLORS[entityName]?.[rule.key];
    const choices = colors && own.choices ? own.choices.map((c) => (colors[c.value] ? { ...c, color: colors[c.value] } : c)) : own.choices;
    return { ...own, label, ...(choices ? { choices } : {}), ...(rule.type === "date" ? { type: "date" as const } : {}) };
  }
  const base = rule.key.split(".")[0]!;
  if (rule.key.includes(".") && columns.some((c) => c.key === base && c.linked)) {
    return { key: rule.key, label, type: "text" };
  }
  // Not a field of this tenant's entity
  return null;
}

export function chartFieldLists(
  schema: DataSourceSchema,
  label: (labelKey: string, fallback: string) => string,
): ChartFieldLists | null {
  const rules = CHART_FIELDS[schema.entityName ?? schema.id];
  if (!rules) return null;
  const fields = rules
    .map((rule) => {
      const fallback = schema.columns.find((c) => c.key === rule.key)?.label ?? rule.key;
      const entityName = schema.entityName ?? schema.id;
      const column = toChartColumn(rule, schema.columns, label(chartFieldLabelKey(entityName, rule.key), fallback), entityName);
      return column ? { rule, column } : null;
    })
    .filter((f): f is { rule: ChartFieldRule; column: DataColumn } => f !== null);
  return {
    groupable: fields.filter((f) => f.rule.groupBy).map((f) => f.column),
    measurable: fields.filter((f) => f.rule.measurable && (f.column.type === "number" || f.column.type === "currency")).map((f) => f.column),
    filterable: fields.filter((f) => f.rule.filterable).map((f) => f.column),
  };
}

// The CDP rules of one field of an entity (undefined: the entity has no list, or not this field)
export const chartFieldRule = (entityName: string, key: string): ChartFieldRule | undefined =>
  CHART_FIELDS[entityName]?.find((r) => r.key === key);
