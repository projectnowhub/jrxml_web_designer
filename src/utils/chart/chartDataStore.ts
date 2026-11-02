// Chart numbers fetched from the backend, kept in the TanStack Query cache by
// request (queries/queryKeys.ts chartKeys), so the canvas, the Configure popup and
// the JRXML image share them. Charts on the canvas and in the popup watch
// their numbers with useChartData (refetched once stale); printing and the
// JRXML writer read the same cache. Nothing here is saved with the report.

import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import { queryOptions, useQuery } from "@tanstack/vue-query";
import type { AggregateResult, ChartBinding } from "@/types/dataSource";
import type { DesignElement } from "@/types";
import { reportDataApi } from "@/services/reportDataService";
import { DATA_STALE_TIME, queryClient } from "@/queries/queryClient";
import { chartKeys } from "@/queries/queryKeys";
import { chartRequests } from "./chartQuery";
import { isChartComplete, normalizeChartBinding } from "./chartTypes";

export interface ChartDataEntry {
  status: "loading" | "ready" | "failed";
  results?: AggregateResult[];
}

// Goes up whenever a chart's numbers arrive or fail (the designer then
// rewrites the JRXML, and chartDataEntry readers update)
export const chartDataVersion = ref(0);

queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== "updated" || event.query.queryKey[0] !== chartKeys.all[0]) return;
  if (event.action.type === "success" || event.action.type === "error") chartDataVersion.value++;
});

// One answer per series request (see chartRequests)
export const chartDataQuery = (binding: ChartBinding) => {
  const requests = chartRequests(binding);
  return queryOptions({
    queryKey: chartKeys.data(requests),
    queryFn: ({ signal }) => Promise.all(requests.map((request) => reportDataApi.postChartAggregate(request, signal))),
    staleTime: DATA_STALE_TIME,
  });
};

// The chart's numbers as far as they are known (reactive); undefined until asked for
export function chartDataEntry(binding: ChartBinding): ChartDataEntry | undefined {
  void chartDataVersion.value;
  if (!isChartComplete(binding)) return undefined;
  const state = queryClient.getQueryState<AggregateResult[]>(chartDataQuery(binding).queryKey);
  if (!state) return undefined;
  if (state.data) return { status: "ready", results: state.data };
  return { status: state.status === "error" ? "failed" : "loading" };
}

// Keeps a chart's numbers loaded while it is shown (canvas, Configure popup's
// preview), and fetches them again once stale
export function useChartData(binding: MaybeRefOrGetter<ChartBinding | undefined>) {
  return useQuery(
    computed(() => {
      const current = normalizeChartBinding(toValue(binding));
      return { ...chartDataQuery(current), enabled: !!toValue(binding) && isChartComplete(current) };
    }),
  );
}

// Fetch a chart's numbers unless they are fresh or on their way (a failure is
// recorded in the cache; the chart then shows it)
export function loadChartData(binding: ChartBinding): Promise<void> {
  if (!isChartComplete(binding)) return Promise.resolve();
  return queryClient.fetchQuery(chartDataQuery(binding)).then(
    () => undefined,
    () => undefined,
  );
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
  await Promise.all(charts.map(loadChartData));
}
