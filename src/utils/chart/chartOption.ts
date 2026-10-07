// A chart's setup and numbers as ECharts settings, laid out for print: no
// animation, no tooltips, sizes in report points. The canvas and the JRXML
// image both draw from this, so they always match.

import type { EChartsCoreOption } from "echarts/core";
import i18n from "@/i18n";
import type { ChartBinding } from "@/types/dataSource";
import { resolveReportFont } from "@/config/fonts.config";
import type { ChartData } from "./chartData";
import { chartColors, chartTypeInfo } from "./chartTypes";

// The report font, then any sans-serif font where it isn't installed
export const chartFontFamily = (name?: string | null) => `'${resolveReportFont(name)}', sans-serif`;

export interface ChartOptionContext {
  width: number;
  height: number;
  fontFamily: string;
}

const TEXT_COLOR = "#1f2937";
const MUTED_COLOR = "#6b7280";
const AXIS_COLOR = "#d1d5db";
const GRID_COLOR = "#eef0f3";
const TITLE_SIZE = 12;
const LABEL_SIZE = 9;
const PAD = 8;
const LEGEND_ROW = 16;
// Gauge bands, as in the CDP app: fine up to half, warning to 80%, then danger
const GAUGE_BANDS: Array<[number, string]> = [
  [0.5, "#22c55e"],
  [0.8, "#f59e0b"],
  [1, "#ef4444"],
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const fullNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const shortNumber = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
export const formatChartNumber = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? "-" : fullNumber.format(value);
const formatAxisNumber = (value: number) => shortNumber.format(value);

// A round upper end for a gauge showing this value (68 -> 100, 1284 -> 2000)
function niceMax(value: number): number {
  if (!(value > 0)) return 100;
  const step = 10 ** Math.floor(Math.log10(value));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    if (step * factor >= value * 1.1) return step * factor;
  }
  return step * 10;
}

// A colour mixed with white (0 = unchanged, 1 = white)
function lighten(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  const rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(mix);
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function isEmpty(data: ChartData): boolean {
  switch (data.kind) {
    case "value":
      return false;
    case "parts":
      return !data.values.some((v) => (v ?? 0) > 0);
    case "series":
      return !data.categories.length;
    case "tree":
      return !data.nodes.length;
  }
}

// Bars of a single series: each category gets its own colour (the axis names them)
const barsByCategory = (binding: ChartBinding, data: ChartData) =>
  (binding.chartType === "bar" || binding.chartType === "barH") && data.kind === "series" && data.series.length === 1;

const legendNames = (binding: ChartBinding, data: ChartData): string[] => {
  if (barsByCategory(binding, data)) return [];
  return data.kind === "series" ? data.series.map((s) => s.name) : data.kind === "parts" ? data.categories : [];
};

// How many different colours the chart draws
function colorCount(binding: ChartBinding, data: ChartData): number {
  switch (data.kind) {
    case "value":
      return 1;
    case "parts":
      return data.categories.length;
    case "tree":
      return data.nodes.length;
    case "series":
      return barsByCategory(binding, data) ? data.categories.length : data.series.length;
  }
}

// Rows a legend needs at this width (each entry: marker, text, gap)
function legendRows(names: string[], width: number): number {
  const entryWidths = names.map((name) => 24 + name.length * LABEL_SIZE * 0.6);
  let rows = 1;
  let used = 0;
  for (const w of entryWidths) {
    if (used > 0 && used + w > width - 2 * PAD) {
      rows += 1;
      used = 0;
    }
    used += w;
  }
  return rows;
}

export function buildChartOption(
  binding: ChartBinding,
  data: ChartData,
  ctx: ChartOptionContext,
): EChartsCoreOption {
  const { width, height } = ctx;
  const colors = chartColors(binding.palette, Math.max(1, colorCount(binding, data)));
  const title = binding.title.trim();
  const names = legendNames(binding, data);
  const showLegend = chartTypeInfo(binding.chartType).hasLegend && binding.showLegend && names.length > 0;

  // Plot area between the title and the legend
  const plotTop = PAD + (title ? TITLE_SIZE + 8 : 0);
  const legendHeight = showLegend ? legendRows(names, width) * LEGEND_ROW : 0;
  const plotBottom = PAD + legendHeight;
  const plotHeight = Math.max(10, height - plotTop - plotBottom);
  const plotWidth = Math.max(10, width - 2 * PAD);
  const centerX = width / 2;
  const centerY = plotTop + plotHeight / 2;

  const titles: Record<string, unknown>[] = [];
  if (title) {
    titles.push({
      text: title,
      left: "center",
      top: PAD,
      textStyle: { fontSize: TITLE_SIZE, fontWeight: 600, color: TEXT_COLOR },
    });
  }

  const option: EChartsCoreOption = {
    animation: false,
    color: colors,
    textStyle: { fontFamily: ctx.fontFamily },
    title: titles,
    legend: {
      show: showLegend,
      bottom: PAD,
      left: "center",
      itemWidth: 10,
      itemHeight: 8,
      itemGap: 10,
      icon: "roundRect",
      textStyle: { fontSize: LABEL_SIZE, color: TEXT_COLOR },
    },
  };

  // Dates: labels that would overlap are skipped, and the first and last stay
  // inside the chart. Text: every category keeps its label, shortened to fit.
  const categoryAxis = (categories: string[], boundaryGap: boolean, horizontal = false) => ({
    type: "category",
    data: categories,
    boundaryGap,
    axisLine: { lineStyle: { color: AXIS_COLOR } },
    axisTick: { show: false },
    axisLabel: {
      fontSize: LABEL_SIZE,
      color: MUTED_COLOR,
      ...(binding.dimension?.type === "text"
        ? {
            interval: 0,
            overflow: "truncate",
            width: horizontal ? Math.max(30, width * 0.28) : Math.max(16, plotWidth / Math.max(1, categories.length) - 6),
          }
        : { hideOverlap: true, ...(horizontal ? {} : { alignMinLabel: "left", alignMaxLabel: "right" }) }),
    },
  });
  const valueAxis = {
    type: "value",
    axisLine: { show: false },
    splitLine: { lineStyle: { color: GRID_COLOR } },
    axisLabel: { fontSize: LABEL_SIZE, color: MUTED_COLOR, formatter: formatAxisNumber },
  };
  // A second scale (right, or top for horizontal bars) when a series needs one
  const valueAxes = (series: { axis?: 0 | 1 }[]) =>
    series.some((s) => s.axis === 1) ? [valueAxis, { ...valueAxis, splitLine: { show: false } }] : valueAxis;
  const grid = {
    top: plotTop + 4,
    bottom: plotBottom + 2,
    left: PAD,
    right: PAD + 4,
    containLabel: true,
  };

  // Nothing matched the filters: say so instead of drawing empty axes
  if (isEmpty(data)) {
    titles.push({
      text: i18n.global.t("chart.noData") as string,
      left: "center",
      top: centerY,
      textVerticalAlign: "middle",
      textStyle: { fontSize: LABEL_SIZE + 2, fontWeight: 400, color: MUTED_COLOR },
    });
    option.legend = { show: false };
    return option;
  }

  switch (binding.chartType) {
    case "kpi": {
      if (data.kind !== "value") break;
      const text = formatChartNumber(data.value);
      // As large as fits: the plot's height, and roughly the text's width
      const valueSize = Math.round(
        clamp(Math.min(plotHeight * 0.5, plotWidth / Math.max(3, text.length * 0.62)), 12, 56),
      );
      const blockHeight = valueSize + 4 + LABEL_SIZE + 2;
      const valueTop = plotTop + (plotHeight - blockHeight) / 2;
      titles.push(
        {
          text,
          left: "center",
          top: valueTop,
          textStyle: { fontSize: valueSize, fontWeight: 700, color: colors[0] },
        },
        {
          text: data.label,
          left: "center",
          top: valueTop + valueSize + 4,
          textStyle: { fontSize: LABEL_SIZE + 1, fontWeight: 400, color: MUTED_COLOR },
        },
      );
      break;
    }

    case "gauge": {
      if (data.kind !== "value") break;
      const value = data.value ?? 0;
      // The 240° arc reaches about 0.6 r below its centre with the value under it
      const radius = Math.max(10, Math.min((plotWidth / 2) * 0.92, plotHeight / 1.65));
      const gaugeCenterY = plotTop + (plotHeight - radius * 1.6) / 2 + radius;
      const lineWidth = Math.round(clamp(radius * 0.12, 4, 16));
      option.series = [
        {
          type: "gauge",
          min: 0,
          max: binding.gaugeMax ?? niceMax(value),
          center: [centerX, gaugeCenterY],
          radius,
          startAngle: 210,
          endAngle: -30,
          splitNumber: 4,
          axisLine: { lineStyle: { width: lineWidth, color: GAUGE_BANDS } },
          axisTick: { show: false },
          splitLine: { length: lineWidth, lineStyle: { color: "#ffffff", width: 2 } },
          axisLabel: {
            distance: lineWidth + 4,
            fontSize: LABEL_SIZE,
            color: MUTED_COLOR,
            formatter: formatAxisNumber,
          },
          pointer: { length: "62%", width: Math.max(2, lineWidth / 3), itemStyle: { color: TEXT_COLOR } },
          anchor: { show: true, size: Math.max(4, lineWidth * 0.8), itemStyle: { color: TEXT_COLOR } },
          title: { show: false },
          detail: {
            offsetCenter: [0, "42%"],
            fontSize: Math.round(clamp(radius * 0.26, 10, 26)),
            fontWeight: 700,
            color: TEXT_COLOR,
            formatter: (v: number) => formatChartNumber(v),
          },
          data: [{ value, name: data.label }],
        },
      ];
      break;
    }

    case "line":
    case "area": {
      if (data.kind !== "series") break;
      const isArea = binding.chartType === "area";
      option.grid = grid;
      option.xAxis = categoryAxis(data.categories, false);
      option.yAxis = valueAxes(data.series);
      option.series = data.series.map((s) => ({
        type: "line",
        name: s.name,
        data: s.values,
        yAxisIndex: s.axis ?? 0,
        symbol: "circle",
        symbolSize: 4,
        lineStyle: { width: 2 },
        ...(isArea ? { areaStyle: { opacity: 0.18 } } : {}),
        ...(isArea && binding.stacked ? { stack: `total${s.axis ?? 0}` } : {}),
      }));
      break;
    }

    case "bar":
    case "barH": {
      if (data.kind !== "series") break;
      const horizontal = binding.chartType === "barH";
      option.grid = grid;
      // Horizontal bars list the first category at the top
      option.xAxis = horizontal ? valueAxes(data.series) : categoryAxis(data.categories, true);
      option.yAxis = horizontal ? { ...categoryAxis(data.categories, true, true), inverse: true } : valueAxes(data.series);
      const byCategory = barsByCategory(binding, data);
      option.series = data.series.map((s) => ({
        type: "bar",
        name: s.name,
        data: byCategory ? s.values.map((value, i) => ({ value, itemStyle: { color: colors[i] } })) : s.values,
        [horizontal ? "xAxisIndex" : "yAxisIndex"]: s.axis ?? 0,
        barMaxWidth: 24,
        barGap: "20%",
        ...(binding.stacked ? { stack: `total${s.axis ?? 0}` } : {}),
        itemStyle: { borderRadius: binding.stacked ? 0 : horizontal ? [0, 2, 2, 0] : [2, 2, 0, 0] },
      }));
      break;
    }

    case "pie":
    case "donut": {
      if (data.kind !== "parts") break;
      const isDonut = binding.chartType === "donut";
      // Room around the pie for the percentage labels
      const radius = Math.max(8, (Math.min(plotWidth, plotHeight) / 2) * 0.72);
      option.series = [
        {
          type: "pie",
          center: [centerX, centerY],
          radius: isDonut ? [radius * 0.58, radius] : radius,
          data: data.categories.map((name, i) => ({ name, value: data.values[i] ?? 0 })),
          avoidLabelOverlap: true,
          label: {
            show: true,
            formatter: showLegend ? "{d}%" : "{b}: {d}%",
            fontSize: LABEL_SIZE,
            color: TEXT_COLOR,
          },
          labelLine: { length: 6, length2: 6 },
          itemStyle: { borderColor: "#ffffff", borderWidth: 1 },
        },
      ];
      // The donut's total in its middle
      if (isDonut) {
        const total = data.values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
        const full = formatChartNumber(total);
        titles.push({
          text: full.length > 7 ? formatAxisNumber(total) : full,
          left: centerX,
          top: centerY,
          textAlign: "center",
          textVerticalAlign: "middle",
          textStyle: {
            fontSize: Math.round(clamp(radius * 0.3, 9, 22)),
            fontWeight: 700,
            color: TEXT_COLOR,
          },
        });
      }
      break;
    }

    case "treemap": {
      if (data.kind !== "tree") break;
      option.series = [
        {
          type: "treemap",
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          left: PAD,
          right: PAD,
          top: plotTop,
          bottom: PAD,
          // A group's name sits in its top border, drawn in the group's colour;
          // its items get lighter shades of it
          data: data.nodes.map((node, i) => {
            const color = colors[i]!;
            return {
              ...node,
              itemStyle: { color, borderColor: color },
              children: node.children?.map((child, j) => ({
                ...child,
                itemStyle: { color: lighten(color, Math.min(0.5, j * 0.16)) },
              })),
            };
          }),
          label: { show: true, fontSize: LABEL_SIZE, color: "#ffffff", formatter: "{b}" },
          upperLabel: { show: true, height: 16, fontSize: LABEL_SIZE, fontWeight: 600, color: "#ffffff" },
          // Level 0 is the hidden root, then the groups, then their items
          levels: [
            { itemStyle: { borderWidth: 0, gapWidth: 3 } },
            { itemStyle: { borderWidth: 2, gapWidth: 0 } },
            { itemStyle: { borderWidth: 1, borderColor: "#ffffff" } },
          ],
        },
      ];
      break;
    }
  }

  return option;
}
