// The numbers a chart draws, in one of four shapes. Never saved in the design.
// A chart not linked to a project's data shows sample numbers in the designer.

import i18n, { LOCALE_TAGS, type AppLocale } from "@/i18n";
import type { ChartType } from "@/types/dataSource";

export interface ChartSeries {
  name: string;
  values: (number | null)[];
  // 1 = drawn against a second scale, for a number of another kind than the
  // first series (e.g. a count next to amounts)
  axis?: 0 | 1;
}

export interface ChartTreeNode {
  name: string;
  value: number;
  children?: ChartTreeNode[];
}

export type ChartData =
  // KPI and gauge: one number
  | { kind: "value"; value: number | null; label: string }
  // Pie and donut: one number per category
  | { kind: "parts"; categories: string[]; values: (number | null)[] }
  // Line, area and bars: one or more series over the categories
  | { kind: "series"; categories: string[]; series: ChartSeries[] }
  // Tree map: groups and the items in them
  | { kind: "tree"; nodes: ChartTreeNode[] };

const t = (key: string, params: Record<string, unknown> = {}) =>
  i18n.global.t(key, params) as string;

const numbered = (key: string, count: number) =>
  Array.from({ length: count }, (_, i) => t(key, { n: i + 1 }));

// The first six month names in the app's language
function monthNames(): string[] {
  const tag = LOCALE_TAGS[i18n.global.locale.value as AppLocale] ?? LOCALE_TAGS.en;
  const format = new Intl.DateTimeFormat(tag, { month: "short" });
  return Array.from({ length: 6 }, (_, i) => format.format(new Date(2026, i, 1)));
}

export function sampleChartData(type: ChartType): ChartData {
  switch (type) {
    case "kpi":
      return { kind: "value", value: 1284, label: t("chart.sample.total") };
    case "gauge":
      return { kind: "value", value: 68, label: t("chart.sample.total") };
    case "line":
    case "area":
      return {
        kind: "series",
        categories: monthNames(),
        series: [
          { name: t("chart.sample.series", { n: 1 }), values: [32, 45, 41, 58, 64, 72] },
          { name: t("chart.sample.series", { n: 2 }), values: [20, 28, 35, 33, 46, 51] },
        ],
      };
    case "bar":
    case "barH":
      return {
        kind: "series",
        categories: numbered("chart.sample.category", 5),
        series: [
          { name: t("chart.sample.series", { n: 1 }), values: [48, 36, 62, 27, 54] },
          { name: t("chart.sample.series", { n: 2 }), values: [30, 41, 38, 22, 45] },
        ],
      };
    case "pie":
    case "donut":
      return {
        kind: "parts",
        categories: numbered("chart.sample.category", 5),
        values: [38, 24, 18, 12, 8],
      };
    case "treemap":
      return {
        kind: "tree",
        nodes: [
          { name: t("chart.sample.group", { n: 1 }), value: 0, children: [42, 26, 14] },
          { name: t("chart.sample.group", { n: 2 }), value: 0, children: [30, 18] },
          { name: t("chart.sample.group", { n: 3 }), value: 0, children: [22, 12, 8] },
        ].map((group, g) => {
          const children = group.children.map((value, i) => ({
            name: t("chart.sample.item", { n: `${g + 1}.${i + 1}` }),
            value,
          }));
          return { name: group.name, value: children.reduce((s, c) => s + c.value, 0), children };
        }),
      };
  }
}
