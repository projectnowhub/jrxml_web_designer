// From a chart's setup to the backend requests for its numbers, and from the
// answers to the ChartData it draws (categories in order, the largest ones
// kept, empty date buckets filled in, labels in the app's language).

import i18n, { LOCALE_TAGS, type AppLocale } from "@/i18n";
import type {
  AggregateGranularity,
  AggregateRequest,
  AggregateResult,
  AggregateRow,
  AggregationType,
  ChartAggregation,
  ChartBinding,
  ChartDimension,
  ChartMeasure,
  DateGranularity,
  JmixCondition,
  JmixFilter,
  TableFilter,
} from "@/types/dataSource";
import { isActiveFilter, resolveFilterDates } from "../table/dataBinding";
import type { ChartData, ChartTreeNode } from "./chartData";
import { DEFAULT_CATEGORY_LIMIT, DEFAULT_GRANULARITY, chartTypeInfo, isChartComplete } from "./chartTypes";

// Values of a split column shown as their own line or bars; the rest are "Other"
const MAX_SPLIT_VALUES = 6;
// Date buckets drawn at most (a longer range is cut at its start)
const MAX_DATE_BUCKETS = 400;

const t = (key: string, params: Record<string, unknown> = {}) => i18n.global.t(key, params) as string;
const localeTag = () => LOCALE_TAGS[i18n.global.locale.value as AppLocale] ?? LOCALE_TAGS.en;

// ── Requests: the CDP analytics contract (POST /v2/analytics/aggregate) ──

const AGGREGATIONS: Record<ChartAggregation, AggregationType> = {
  count: "COUNT",
  sum: "SUM",
  avg: "AVG",
  min: "MIN",
  max: "MAX",
};
const GRANULARITIES: Record<DateGranularity, AggregateGranularity> = {
  day: "DAY",
  week: "WEEK",
  month: "MONTH",
  quarter: "QUARTER",
  year: "YEAR",
};

// The report-wide filter: the chart's project, as the CDP app sends it
export const PROJECT_PROPERTY = "project.id";

// The chart's filters as a Jmix filter (moving date ranges as today's dates),
// like the CDP app's buildJmixFilter: ticked values = "in", a range = >= and <=
export function toJmixFilter(filters: TableFilter[], today = new Date()): JmixFilter | undefined {
  const conditions: JmixCondition[] = [];
  for (const f of resolveFilterDates(filters.filter(isActiveFilter), today)) {
    if (f.operator === "in") {
      conditions.push({ property: f.column, operator: "in", value: f.values ?? [] });
      continue;
    }
    const bound = (v: string) => (f.type === "date" ? v : Number(v));
    if (f.value) conditions.push({ property: f.column, operator: ">=", value: bound(f.value) });
    if (f.value2) conditions.push({ property: f.column, operator: "<=", value: bound(f.value2) });
  }
  return conditions.length ? { group: "AND", conditions } : undefined;
}

const toMeasure = (m: ChartMeasure) => ({
  aggregation: AGGREGATIONS[m.aggregation],
  ...(m.aggregation !== "count" ? { property: m.column } : {}),
});
const toDimension = (d: ChartDimension) => ({
  property: d.column,
  ...(d.type === "date" ? { granularity: GRANULARITIES[d.granularity ?? DEFAULT_GRANULARITY] } : {}),
});

// One request per series (one for the other chart types), exactly as the
// CDP app's dashboards send them; none until the chart has everything its
// type needs
export function chartRequests(binding: ChartBinding, today = new Date()): AggregateRequest[] {
  if (!isChartComplete(binding)) return [];
  const base = {
    entityName: binding.entityName ?? binding.sourceId!,
    ...(binding.filters?.length ? { filter: toJmixFilter(binding.filters, today) } : {}),
    globalFilter: {
      group: "AND" as const,
      conditions: [{ property: PROJECT_PROPERTY, operator: "=" as const, value: binding.projectId }],
    },
  };
  if (!base.filter) delete base.filter;
  switch (chartTypeInfo(binding.chartType).shape) {
    case "value":
      return [{ ...base, measure: toMeasure(binding.measure!) }];
    case "parts":
      return [{ ...base, measure: toMeasure(binding.measure!), dimension: toDimension(binding.dimension!) }];
    case "tree":
      return [
        {
          ...base,
          measure: toMeasure(binding.measure!),
          dimension: toDimension(binding.dimension!),
          splitBy: { property: binding.level2!.column },
        },
      ];
    case "series":
      return binding.series!.map((s) => ({
        ...base,
        measure: toMeasure(s.measure),
        dimension: toDimension(binding.dimension!),
        ...(s.splitBy ? { splitBy: { property: s.splitBy.column } } : {}),
      }));
  }
}

// "Total Amount", "Average Quantity", "Count"
export function measureLabel(measure: ChartMeasure): string {
  return measure.aggregation === "count"
    ? t("chart.measures.countOf")
    : t(`chart.measures.${measure.aggregation}Of`, { column: measure.columnLabel ?? measure.column ?? "" });
}

// Sums and counts can be added up into "Other"; averages and extremes can't
const isAdditive = (measure: ChartMeasure) => measure.aggregation === "count" || measure.aggregation === "sum";

const parseDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
};
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function nextBucket(d: Date, granularity: DateGranularity): Date {
  switch (granularity) {
    case "day":
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    case "week":
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
    case "month":
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    case "quarter":
      return new Date(d.getFullYear(), d.getMonth() + 3, 1);
    case "year":
      return new Date(d.getFullYear() + 1, 0, 1);
  }
}

// Every bucket from the first to the last, so gaps show as zero
function fillDateGaps(keys: string[], granularity: DateGranularity): string[] {
  if (keys.length < 2) return keys;
  const sorted = [...keys].sort();
  const end = sorted[sorted.length - 1]!;
  const all: string[] = [];
  for (let d = parseDay(sorted[0]!); dayKey(d) <= end && all.length < MAX_DATE_BUCKETS * 2; d = nextBucket(d, granularity)) {
    all.push(dayKey(d));
  }
  // Keep any key the stepping didn't land on (e.g. a backend week start on another day)
  const merged = [...new Set([...all, ...sorted])].sort();
  return merged.slice(-MAX_DATE_BUCKETS);
}

// "Jan 2026", "Q1 2026", "7 Jan"…; other values as the backend labels them
export function categoryLabel(key: string | null, dimension: ChartDimension, label?: string | null): string {
  if (key === null || key === "") return t("chart.blank");
  if (dimension.type !== "date") return label || key;
  const d = parseDay(key);
  if (Number.isNaN(d.getTime())) return key;
  switch (dimension.granularity ?? DEFAULT_GRANULARITY) {
    case "day":
    case "week":
      return d.toLocaleDateString(localeTag(), { day: "numeric", month: "short" });
    case "month":
      return d.toLocaleDateString(localeTag(), { month: "short", year: "numeric" });
    case "quarter":
      return t("chart.quarterLabel", { quarter: Math.floor(d.getMonth() / 3) + 1, year: d.getFullYear() });
    case "year":
      return String(d.getFullYear());
  }
}

type ValueMap = Map<string | null, number | null>;
const toMap = (rows: AggregateRow[] = []): ValueMap => new Map(rows.map((r) => [r.key, r.value]));
// The backend's label for each key (e.g. an enum's display name)
const labelsOf = (results: AggregateResult[]) => {
  const labels = new Map<string | null, string>();
  for (const r of results) {
    for (const row of [...(r.rows ?? []), ...(r.series ?? []).flatMap((s) => s.rows)]) {
      if (row.label) labels.set(row.key, row.label);
    }
  }
  return labels;
};

// Categories in order (dates by time, text by size), cut to the limit with the
// rest added up as "Other", and each map's value per category
function arrangeCategories(
  dimension: ChartDimension,
  maps: ValueMap[],
  additive: boolean,
  limit: number,
  backendLabels = new Map<string | null, string>(),
): { labels: string[]; values: (number | null)[][] } {
  const allKeys = new Set<string | null>();
  maps.forEach((m) => m.forEach((_v, k) => allKeys.add(k)));
  const missing = additive ? 0 : null;
  const valueAt = (m: ValueMap, k: string | null) => (m.has(k) ? m.get(k)! : missing);

  let keys: (string | null)[];
  if (dimension.type === "date") {
    const dates = [...allKeys].filter((k): k is string => k !== null);
    keys = fillDateGaps(dates, dimension.granularity ?? DEFAULT_GRANULARITY);
    if (allKeys.has(null)) keys.push(null);
  } else {
    const size = (k: string | null) => maps.reduce((sum, m) => sum + Math.abs(m.get(k) ?? 0), 0);
    keys = [...allKeys].sort((a, b) => (a === null ? 1 : b === null ? -1 : size(b) - size(a)));
  }

  const labels = keys.map((k) => categoryLabel(k, dimension, backendLabels.get(k)));
  let values = maps.map((m) => keys.map((k) => valueAt(m, k)));
  if (dimension.type !== "date" && limit > 0 && keys.length > limit) {
    labels.splice(limit);
    values = maps.map((m, i) => {
      const kept = values[i]!.slice(0, limit);
      if (additive) kept.push(keys.slice(limit).reduce<number>((sum, k) => sum + (m.get(k) ?? 0), 0));
      return kept;
    });
    if (additive) labels.push(t("chart.other"));
  }
  return { labels, values };
}

const limitOf = (binding: ChartBinding) => binding.limit ?? DEFAULT_CATEGORY_LIMIT;

// The answers to chartRequests() as the numbers the chart draws
export function mergeChartData(binding: ChartBinding, results: AggregateResult[]): ChartData {
  const info = chartTypeInfo(binding.chartType);
  switch (info.shape) {
    case "value":
      // Like the CDP app: the single row's value
      return { kind: "value", value: results[0]?.rows?.[0]?.value ?? results[0]?.totalValue ?? null, label: measureLabel(binding.measure!) };

    case "parts": {
      const { labels, values } = arrangeCategories(
        binding.dimension!,
        [toMap(results[0]?.rows)],
        isAdditive(binding.measure!),
        limitOf(binding),
        labelsOf(results),
      );
      return { kind: "parts", categories: labels, values: values[0] ?? [] };
    }

    case "series": {
      const columns: { name: string; map: ValueMap; axis: 0 | 1 }[] = [];
      // Series measuring something else than the first get their own scale
      const sameAs = (a: ChartMeasure, b: ChartMeasure) => a.aggregation === b.aggregation && a.column === b.column;
      const first = binding.series![0]!.measure;
      binding.series!.forEach((s, i) => {
        const result = results[i];
        if (!result) return;
        const axis = sameAs(s.measure, first) ? 0 : 1;
        if (!s.splitBy || !result.series) {
          columns.push({ name: measureLabel(s.measure), map: toMap(result.rows), axis });
          return;
        }
        // One line or set of bars per split value, the largest first
        const total = (rows: AggregateRow[]) => rows.reduce((sum, r) => sum + Math.abs(r.value ?? 0), 0);
        const parts = [...result.series].sort((a, b) => total(b.rows) - total(a.rows));
        parts.slice(0, MAX_SPLIT_VALUES).forEach((part) =>
          columns.push({ name: categoryLabel(part.key, s.splitBy!, part.label), map: toMap(part.rows), axis }),
        );
        const rest = parts.slice(MAX_SPLIT_VALUES);
        if (rest.length && isAdditive(s.measure)) {
          const other: ValueMap = new Map();
          rest.forEach((part) => part.rows.forEach((r) => other.set(r.key, (other.get(r.key) ?? 0) + (r.value ?? 0))));
          columns.push({ name: t("chart.other"), map: other, axis });
        }
      });
      const additive = binding.series!.every((s) => isAdditive(s.measure));
      const { labels, values } = arrangeCategories(
        binding.dimension!,
        columns.map((c) => c.map),
        additive,
        limitOf(binding),
        labelsOf(results),
      );
      return {
        kind: "series",
        categories: labels,
        series: columns.map((c, i) => ({ name: c.name, values: values[i] ?? [], axis: c.axis })),
      };
    }

    case "tree": {
      const result = results[0];
      const groups = new Map<string | null, ChartTreeNode>();
      for (const row of result?.rows ?? []) {
        groups.set(row.key, { name: categoryLabel(row.key, binding.dimension!, row.label), value: row.value ?? 0, children: [] });
      }
      for (const part of result?.series ?? []) {
        const name = categoryLabel(part.key, binding.level2!, part.label);
        for (const row of part.rows) {
          if ((row.value ?? 0) > 0) groups.get(row.key)?.children!.push({ name, value: row.value! });
        }
      }
      const nodes = [...groups.values()]
        .filter((g) => g.value > 0)
        .map((g) => ({ ...g, children: g.children!.sort((a, b) => b.value - a.value) }))
        .sort((a, b) => b.value - a.value);
      const limit = limitOf(binding);
      return { kind: "tree", nodes: limit > 0 ? nodes.slice(0, limit) : nodes };
    }
  }
}
