// New Chart elements, from the library tile or its type picker

import type { ChartType } from "@/types/dataSource";
import type { ChartElement } from "@/types";
import { createElement } from "@/components/elements/ElementRegistry";
import { DEFAULT_CHART_TYPE, chartTypeInfo, defaultChartBinding } from "./chartTypes";

export function buildChartElement(chartType: ChartType = DEFAULT_CHART_TYPE): ChartElement {
  return createElement("chart", {
    ...chartTypeInfo(chartType).size,
    binding: defaultChartBinding(chartType),
  } as Partial<ChartElement>) as ChartElement;
}
