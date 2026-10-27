// The report engine: the designer's chart and table logic built into one
// plain JavaScript file (npm run build:engine → dist-engine/cdp-report-engine.js)
// that the report server runs in GraalJS. The designer only sends the JRXML;
// with these functions the server builds the same data requests and the same
// chart pictures from the setups inside it. Every argument and result is a
// string (JSON or SVG), the simplest thing to pass between Java and JS.
// Nothing here may use the browser (window, document, storage) or Vue.
// Contract and Java usage: docs/REPORT_ENGINE.md.
import "./globals";
import type { AggregateResult } from "@/types/dataSource";
import { chartRequests as buildChartRequests, mergeChartData } from "@/utils/chart/chartQuery";
import { isChartComplete, parseChartBinding } from "@/utils/chart/chartTypes";
import { buildChartOption, chartFontFamily } from "@/utils/chart/chartOption";
import { renderChartSvg } from "@/utils/chart/chartSvg";
import { chartTextsFor, setChartTextSource, CHART_TEXTS } from "@/utils/chart/chartText";
import { parseBinding, resolveFilterDates, toDataQuery } from "@/utils/table/dataBinding";

// Bumped whenever a function's arguments or results change
export const ENGINE_VERSION = 4;

// Languages charts can print in ("en", "ms")
export const LOCALES = Object.keys(CHART_TEXTS);

// "2026-11-01" as that local day; anything else: today. Moving date ranges
// ("This month") are worked out from it.
function dayOf(todayIso?: string | null): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayIso ?? "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
}

// ── Charts (<image> with com.cdp.chart.binding) ──

// The requests for a chart's numbers, as a JSON array: POST each one to
// {CDP}/v2/analytics/aggregate. "[]" when the chart isn't set up (it prints
// nothing then).
export function chartRequests(bindingJson: string, todayIso?: string): string {
  const binding = parseChartBinding(bindingJson);
  if (!binding || !isChartComplete(binding)) return "[]";
  return JSON.stringify(buildChartRequests(binding, dayOf(todayIso)));
}

// The chart as SVG text, from its setup and the answers to chartRequests (a
// JSON array in the same order), at the image's size in report points. ""
// when the chart isn't set up or the answers don't match.
export function chartSvg(
  bindingJson: string,
  resultsJson: string,
  width: number,
  height: number,
  locale = "en",
  fontName?: string,
): string {
  const binding = parseChartBinding(bindingJson);
  if (!binding || !isChartComplete(binding)) return "";
  const results = JSON.parse(resultsJson) as AggregateResult[];
  if (!Array.isArray(results)) return "";
  setChartTextSource(chartTextsFor(locale));
  const w = Math.max(1, Math.round(Number(width) || 0));
  const h = Math.max(1, Math.round(Number(height) || 0));
  const data = mergeChartData(binding, results);
  const option = buildChartOption(binding, data, { width: w, height: h, fontFamily: chartFontFamily(fontName) });
  return renderChartSvg(option, w, h);
}

// ── Tables (<jr:table> with com.cdp.table.binding) ──

// Where a table's rows come from, as JSON:
//   { projectId, sourceId, datasetName, query }
// POST query to {DATA_SOURCE_API}/projects/{projectId}/sources/{sourceId}/query
// and pass the rows to the report as the table's dataset (datasetName).
// Moving date ranges are already turned into dates. "null" when the table
// has no data set up.
export function tableQuery(bindingJson: string, todayIso?: string): string {
  const binding = parseBinding(bindingJson);
  if (!binding || !binding.projectId || binding.columns.length === 0) return "null";
  const query = toDataQuery(binding);
  return JSON.stringify({
    projectId: binding.projectId,
    sourceId: binding.sourceId,
    datasetName: binding.datasetName,
    query: { ...query, filters: resolveFilterDates(query.filters, dayOf(todayIso)) },
  });
}
