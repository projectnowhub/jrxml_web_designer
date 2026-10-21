// The numbers a chart plots, as a small table (the preview's side panel):
// one row per category, bar or slice, one column per line or bar group, and
// a total where the numbers add up (counts and totals; not averages or
// extremes). Tree maps list each group with its items under it.
import type { ChartBinding, ChartMeasure } from "@/types/dataSource";
import type { ChartData } from "./chartData";
import { measureLabel } from "./chartQuery";

export interface ChartNumberRow {
  label: string;
  values: (number | null)[];
  // An item inside a tree map group
  nested?: boolean;
}

export interface ChartNumbers {
  // KPI and gauge: one number
  single?: { label: string; value: number | null };
  headers: string[];
  rows: ChartNumberRow[];
  totals?: (number | null)[];
}

const isAdditive = (measure?: ChartMeasure) => measure?.aggregation === "count" || measure?.aggregation === "sum";

const sum = (values: (number | null)[]) => values.reduce<number>((total, v) => total + (v ?? 0), 0);

export function chartNumbers(binding: ChartBinding, data: ChartData): ChartNumbers {
  const category = binding.dimension?.label ?? "";
  switch (data.kind) {
    case "value":
      return { single: { label: data.label, value: data.value }, headers: [], rows: [] };

    case "parts": {
      const rows = data.categories.map((label, i) => ({ label, values: [data.values[i] ?? null] }));
      return {
        headers: [category, binding.measure ? measureLabel(binding.measure) : ""],
        rows,
        totals: isAdditive(binding.measure) ? [sum(data.values)] : undefined,
      };
    }

    case "series": {
      const rows = data.categories.map((label, i) => ({ label, values: data.series.map((s) => s.values[i] ?? null) }));
      const additive = (binding.series ?? []).every((s) => isAdditive(s.measure));
      return {
        headers: [category, ...data.series.map((s) => s.name)],
        rows,
        totals: additive && rows.length ? data.series.map((s) => sum(s.values)) : undefined,
      };
    }

    case "tree": {
      const rows: ChartNumberRow[] = [];
      for (const node of data.nodes) {
        rows.push({ label: node.name, values: [node.value] });
        for (const child of node.children ?? []) rows.push({ label: child.name, values: [child.value], nested: true });
      }
      return {
        headers: [category, binding.measure ? measureLabel(binding.measure) : ""],
        rows,
        totals: isAdditive(binding.measure) ? [data.nodes.reduce((total, n) => total + n.value, 0)] : undefined,
      };
    }
  }
}
