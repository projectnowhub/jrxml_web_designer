// The picture of a chart that goes into the JRXML: an SVG drawn from the
// chart's setup and numbers, written as a data URI in the image expression.
// The report server prints it as vector graphics. Kept in a small cache so
// regenerating the JRXML doesn't redraw unchanged charts. A chart without
// real numbers (not linked, not finished, still loading) prints nothing.

import type { EChartsCoreOption } from "echarts/core";
import i18n from "@/i18n";
import type { ChartElement } from "@/types";
import type { ChartBinding } from "@/types/dataSource";
import { resolveReportFont } from "@/config/fonts.config";
import { echarts } from "./echartsSetup";
import { sampleChartData, type ChartData } from "./chartData";
import { chartDataEntry } from "./chartDataStore";
import { buildChartOption, chartFontFamily } from "./chartOption";
import { mergeChartData } from "./chartQuery";
import { isChartBound, isChartComplete, normalizeChartBinding } from "./chartTypes";

const MAX_CACHED_IMAGES = 64;
const imageCache = new Map<string, string>();

const elementSize = (element: Pick<ChartElement, "width" | "height">) => ({
  width: Math.max(1, Math.round(Number(element.width) || 0)),
  height: Math.max(1, Math.round(Number(element.height) || 0)),
});

// Where a chart's numbers stand: sample (not linked to data), incomplete
// (linked, but something its type needs is missing), loading, failed, ready
export type ChartState = "sample" | "incomplete" | "loading" | "failed" | "ready";

export interface ChartView {
  state: ChartState;
  binding: ChartBinding;
  // Real numbers when ready, sample numbers otherwise
  data: ChartData;
}

// What a chart shows right now (reactive: follows the data store)
export function chartView(value: ChartBinding | undefined): ChartView {
  const binding = normalizeChartBinding(value);
  const sample = () => sampleChartData(binding.chartType);
  if (!isChartBound(binding)) return { state: "sample", binding, data: sample() };
  if (!isChartComplete(binding)) return { state: "incomplete", binding, data: sample() };
  const entry = chartDataEntry(binding);
  if (entry?.status === "ready" && entry.results) {
    return { state: "ready", binding, data: mergeChartData(binding, entry.results) };
  }
  return { state: entry?.status === "failed" ? "failed" : "loading", binding, data: sample() };
}

// The ECharts settings for a chart element at its size
export function chartElementOption(element: ChartElement, view = chartView(element.binding)): EChartsCoreOption {
  return buildChartOption(view.binding, view.data, {
    ...elementSize(element),
    fontFamily: chartFontFamily(element.fontFamily),
  });
}

export function renderChartSvg(option: EChartsCoreOption, width: number, height: number): string {
  const chart = echarts.init(null, null, { renderer: "svg", ssr: true, width, height });
  try {
    chart.setOption(option);
    // The report server's SVG reader (Batik) fails on an embedded stylesheet,
    // and the one ECharts writes only holds mouse-hover rules
    return chart.renderToSVGString().replace(/<style[\s\S]*?<\/style>/g, "");
  } finally {
    chart.dispose();
  }
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

// "data:image/svg+xml;base64,…" for the chart with its real numbers; empty
// when it has none yet
export function chartImageDataUri(element: ChartElement): string {
  const view = chartView(element.binding);
  if (view.state !== "ready") return "";
  const { width, height } = elementSize(element);
  const key = JSON.stringify([
    view.binding,
    view.data,
    width,
    height,
    resolveReportFont(element.fontFamily),
    i18n.global.locale.value,
  ]);
  const cached = imageCache.get(key);
  if (cached) return cached;

  const svg = renderChartSvg(chartElementOption(element, view), width, height);
  const uri = `data:image/svg+xml;base64,${toBase64(svg)}`;
  if (imageCache.size >= MAX_CACHED_IMAGES) {
    imageCache.delete(imageCache.keys().next().value!);
  }
  imageCache.set(key, uri);
  return uri;
}
