// Chart numbers fetched from the backend, kept for the session by request
// (like table rows), so the canvas, the Configure popup and the JRXML image
// share them. Nothing here is saved with the report.

import { reactive, ref } from "vue";
import type { AggregateResult, ChartBinding } from "@/types/dataSource";
import type { DesignElement } from "@/types";
import { aggregate } from "@/services/dataSourceService";
import { chartRequests } from "./chartQuery";
import { isChartComplete, normalizeChartBinding } from "./chartTypes";

export interface ChartDataEntry {
  status: "loading" | "ready" | "failed";
  results?: AggregateResult[];
}

const entries = reactive(new Map<string, ChartDataEntry>());
const pending = new Map<string, Promise<void>>();

// Goes up whenever a chart's numbers arrive (the designer then rewrites the JRXML)
export const chartDataVersion = ref(0);
// Goes up when the cache is emptied, so every chart asks again
const generation = ref(0);

// Same requests = same numbers (moving date ranges are in them as today's dates)
export function chartDataKey(binding: ChartBinding): string {
  return JSON.stringify([chartRequests(binding), generation.value]);
}

// The chart's numbers as far as they are known (reactive); undefined until asked for
export function chartDataEntry(binding: ChartBinding): ChartDataEntry | undefined {
  return isChartComplete(binding) ? entries.get(chartDataKey(binding)) : undefined;
}

// Fetch a chart's numbers unless they are known or on their way
export function loadChartData(binding: ChartBinding): Promise<void> {
  if (!isChartComplete(binding)) return Promise.resolve();
  const key = chartDataKey(binding);
  if (entries.get(key)?.status === "ready") return Promise.resolve();
  const running = pending.get(key);
  if (running) return running;

  const requests = chartRequests(binding);
  entries.set(key, { status: "loading", results: entries.get(key)?.results });
  const promise = Promise.all(requests.map((request) => aggregate(request)))
    .then((results) => {
      entries.set(key, { status: "ready", results });
    })
    .catch(() => {
      // Asked again the next time the chart is drawn or the report printed
      entries.set(key, { status: "failed" });
    })
    .finally(() => {
      pending.delete(key);
      chartDataVersion.value++;
    });
  pending.set(key, promise);
  return promise;
}

// Forget every chart's numbers (e.g. after the backend changed); charts on
// the page fetch them again
export function clearChartDataCache(): void {
  entries.clear();
  pending.clear();
  generation.value++;
}

function collectCharts(elements: DesignElement[], into: ChartBinding[]): void {
  for (const el of elements) {
    if (el.type === "chart") into.push(normalizeChartBinding(el.binding));
    else if (el.type === "frame") collectCharts(el.elements ?? [], into);
  }
}

// Before printing: every linked chart's numbers fetched (a chart whose data
// can't be loaded prints blank rather than stopping the report)
export async function ensureChartData(bands: { elements?: DesignElement[] }[]): Promise<void> {
  const charts: ChartBinding[] = [];
  bands.forEach((band) => collectCharts(band.elements ?? [], charts));
  await Promise.all(
    charts.map((binding) => {
      const entry = chartDataEntry(binding);
      return entry?.status === "ready" ? undefined : loadChartData(binding);
    }),
  );
}
