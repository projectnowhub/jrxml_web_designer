// From a chart's setup to the backend requests for its numbers, and from the
// answers to the ChartData it draws (categories in order, the largest ones
// kept, empty date buckets filled in, labels in the app's language).

import { chartLocaleTag, chartT } from "./chartText";
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
  TableFilter,
} from "@/types/dataSource";
import type { JmixFilter } from "@/types/jmix";
import { isActiveFilter, resolveFilterDates } from "../table/dataBinding";
import type { ChartData, ChartTreeNode } from "./chartData";
import { DEFAULT_GRANULARITY, chartTypeInfo, isChartComplete } from "./chartTypes";
import { projectCondition, tableFilterConditions } from "../../services/helpers/jmixFilterHelpers";

// Values of a split column shown as their own line or bars; the rest are "Other"
const MAX_SPLIT_VALUES = 6;
// Date buckets drawn at most (a longer range is cut at its start)
const MAX_DATE_BUCKETS = 400;

const t = chartT;
const localeTag = chartLocaleTag;

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

// The chart's filters as a Jmix filter (moving date ranges as today's dates),
// the same conditions as a table's rows request
export function toJmixFilter(filters: TableFilter[], today = new Date()): JmixFilter | undefined {
  const conditions = tableFilterConditions(resolveFilterDates(filters.filter(isActiveFilter), today));
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
  const entityName = binding.entityName ?? binding.sourceId!;
  const base = {
    entityName,
    ...(binding.filters?.length ? { filter: toJmixFilter(binding.filters, today) } : {}),
    globalFilter: {
      group: "AND" as const,
      // The chart's project, as the CDP app sends it ("contract.project.id" for contract records)
      conditions: [projectCondition(entityName, binding.projectId!, "=")],
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

// ── A title to start with, worded as the CDP app's suggestTitle ──
// ("Records by Planned Inspection Date"; the user can change it)
const titleMeasure = (m: ChartMeasure) =>
  m.aggregation === "count"
    ? t("chart.titles.records")
    : `${t(`chart.titles.aggregations.${m.aggregation}`)} ${m.columnLabel ?? m.column ?? ""}`.trim();

export function suggestChartTitle(binding: ChartBinding): string {
  const info = chartTypeInfo(binding.chartType);
  if (info.shape === "tree") {
    return binding.dimension && binding.level2
      ? t("chart.titles.byPair", { first: binding.dimension.label, second: binding.level2.label })
      : t("chart.titles.treemap");
  }
  if (info.shape === "value") {
    const m = binding.measure ?? { aggregation: "count" as const };
    return m.aggregation === "count" ? t("chart.titles.totalRecords") : titleMeasure(m);
  }
  let measure: string;
  if (info.shape === "parts") {
    measure = titleMeasure(binding.measure ?? { aggregation: "count" });
  } else {
    const blocks = (binding.series ?? []).map((s) =>
      s.splitBy ? t("chart.titles.splitBy", { measure: titleMeasure(s.measure), field: s.splitBy.label }) : titleMeasure(s.measure),
    );
    measure =
      blocks.length <= 2
        ? blocks.join(` ${t("chart.titles.and")} `)
        : t("chart.titles.andNMore", { first: blocks[0] ?? "", count: blocks.length - 1 });
  }
  return binding.dimension ? t("chart.titles.by", { measure, field: binding.dimension.label }) : measure;
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

// "Apr 1, 2024" (each date bucket by its first day, as the CDP app); a choice field's words ("Pending"), Yes /
// No; other values as the backend labels them
export function categoryLabel(key: string | null, dimension: ChartDimension, label?: string | null): string {
  if (key === null || key === "") return t("chart.blank");
  if (dimension.yesNo && /^(true|false)$/i.test(String(key))) return t(String(key).toLowerCase() === "true" ? "chart.yes" : "chart.no");
  const choice = dimension.choices?.find((c) => c.value.toUpperCase() === String(key).toUpperCase());
  if (choice) return choice.label;
  if (dimension.type !== "date") return label || key;
  const d = parseDay(key);
  if (Number.isNaN(d.getTime())) return key;
  // Every bucket as its first day, the way the CDP app's charts write it ("Apr 1, 2024")
  return d.toLocaleDateString(localeTag(), { month: "short", day: "numeric", year: "numeric" });
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

// Colour keys (binding.colors): a value as stored, the empty one and "Other"
export const BLANK_COLOR_KEY = "__blank__";
export const OTHER_COLOR_KEY = "__other__";
const colorKeyOf = (key: string | null) => (key === null || key === "" ? BLANK_COLOR_KEY : String(key));

// Where a choice field's value comes in the field's own order (unknown values after)
const choiceRank = (dimension: ChartDimension | undefined, key: string | null) => {
  const i = dimension?.choices?.findIndex((c) => c.value.toUpperCase() === String(key).toUpperCase()) ?? -1;
  return i < 0 ? Number.MAX_SAFE_INTEGER : i;
};

// Keys in a choice field's own order (Pending, In progress, Completed), as the
// CDP app orders them; keys of other fields keep their order (the empty one last)
function inFieldOrder(keys: (string | null)[], dimension: ChartDimension | undefined): (string | null)[] {
  if (!dimension?.choices?.length) return keys;
  return keys
    .map((key, i) => ({ key, i }))
    .sort((a, b) =>
      a.key === null ? 1 : b.key === null ? -1 : choiceRank(dimension, a.key) - choiceRank(dimension, b.key) || a.i - b.i,
    )
    .map((k) => k.key);
}

// Categories in order (dates by time, text by size; a choice field in its own
// order when fieldOrder: bars, lines, areas), cut to the limit (the largest)
// with the rest added up as "Other", and each map's value per category
function arrangeCategories(
  dimension: ChartDimension,
  maps: ValueMap[],
  additive: boolean,
  limit: number,
  backendLabels = new Map<string | null, string>(),
  fieldOrder = false,
): { labels: string[]; values: (number | null)[][]; keys: string[] } {
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

  // The largest ones are kept; then a choice field is put in its own order
  let rest: (string | null)[] = [];
  if (dimension.type !== "date" && limit > 0 && keys.length > limit) {
    rest = keys.slice(limit);
    keys = keys.slice(0, limit);
  }
  if (fieldOrder) keys = inFieldOrder(keys, dimension);
  const labels = keys.map((k) => categoryLabel(k, dimension, backendLabels.get(k)));
  const values = maps.map((m) => {
    const kept = keys.map((k) => valueAt(m, k));
    if (rest.length && additive) kept.push(rest.reduce<number>((sum, k) => sum + (m.get(k) ?? 0), 0));
    return kept;
  });
  const colorKeys = keys.map(colorKeyOf);
  if (rest.length && additive) {
    labels.push(t("chart.other"));
    colorKeys.push(OTHER_COLOR_KEY);
  }
  return { labels, values, keys: colorKeys };
}

// Every category is shown, as the CDP app's charts (no "largest N" with the rest as "Other")
const limitOf = (_binding: ChartBinding) => 0;

// The answers to chartRequests() as the numbers the chart draws
export function mergeChartData(binding: ChartBinding, results: AggregateResult[]): ChartData {
  const info = chartTypeInfo(binding.chartType);
  switch (info.shape) {
    case "value":
      // Like the CDP app: the single row's value
      return { kind: "value", value: results[0]?.rows?.[0]?.value ?? results[0]?.totalValue ?? null, label: measureLabel(binding.measure!) };

    case "parts": {
      const { labels, values, keys } = arrangeCategories(
        binding.dimension!,
        [toMap(results[0]?.rows)],
        isAdditive(binding.measure!),
        limitOf(binding),
        labelsOf(results),
      );
      return { kind: "parts", categories: labels, values: values[0] ?? [], keys };
    }

    case "series": {
      const columns: { name: string; key: string; map: ValueMap; axis: 0 | 1 }[] = [];
      // One series: its split values are its keys; several: "series2", "series2:PENDING"
      const several = binding.series!.length > 1;
      const seriesKey = (i: number, part?: string) =>
        several ? `series${i + 1}${part === undefined ? "" : `:${part}`}` : part ?? `series${i + 1}`;
      // Series measuring something else than the first get their own scale
      const sameAs = (a: ChartMeasure, b: ChartMeasure) => a.aggregation === b.aggregation && a.column === b.column;
      const first = binding.series![0]!.measure;
      binding.series!.forEach((s, i) => {
        const result = results[i];
        if (!result) return;
        const axis = sameAs(s.measure, first) ? 0 : 1;
        if (!s.splitBy || !result.series) {
          columns.push({ name: measureLabel(s.measure), key: seriesKey(i), map: toMap(result.rows), axis });
          return;
        }
        // One line or set of bars per split value, in the order the backend
        // sends them (as the CDP app, whose colours follow that order); with
        // more than MAX_SPLIT_VALUES the largest are kept and the rest is "Other"
        const total = (rows: AggregateRow[]) => rows.reduce((sum, r) => sum + Math.abs(r.value ?? 0), 0);
        const parts = [...result.series].sort((a, b) => total(b.rows) - total(a.rows));
        const kept = new Set(parts.slice(0, MAX_SPLIT_VALUES));
        result.series.filter((part) => kept.has(part)).forEach((part) =>
          columns.push({
            name: categoryLabel(part.key, s.splitBy!, part.label),
            key: seriesKey(i, colorKeyOf(part.key)),
            map: toMap(part.rows),
            axis,
          }),
        );
        const rest = parts.slice(MAX_SPLIT_VALUES);
        if (rest.length && isAdditive(s.measure)) {
          const other: ValueMap = new Map();
          rest.forEach((part) => part.rows.forEach((r) => other.set(r.key, (other.get(r.key) ?? 0) + (r.value ?? 0))));
          columns.push({ name: t("chart.other"), key: seriesKey(i, OTHER_COLOR_KEY), map: other, axis });
        }
      });
      const additive = binding.series!.every((s) => isAdditive(s.measure));
      const { labels, values } = arrangeCategories(
        binding.dimension!,
        columns.map((c) => c.map),
        additive,
        limitOf(binding),
        labelsOf(results),
        true,
      );
      return {
        kind: "series",
        categories: labels,
        series: columns.map((c, i) => ({ name: c.name, key: c.key, values: values[i] ?? [], axis: c.axis })),
      };
    }

    case "tree": {
      const result = results[0];
      const groups = new Map<string | null, ChartTreeNode>();
      for (const row of result?.rows ?? []) {
        groups.set(row.key, {
          name: categoryLabel(row.key, binding.dimension!, row.label),
          key: colorKeyOf(row.key),
          value: row.value ?? 0,
          children: [],
        });
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
