// Lucide icon for each chart type (library type picker, properties)

import type { Component } from "vue";
import {
  ChartArea,
  ChartBar,
  ChartColumn,
  ChartLine,
  ChartPie,
  Donut,
  Gauge,
  Hash,
  LayoutDashboard,
} from "@lucide/vue";
import type { ChartType } from "../../types/dataSource";

export const CHART_TYPE_ICONS: Record<ChartType, Component> = {
  kpi: Hash,
  gauge: Gauge,
  line: ChartLine,
  area: ChartArea,
  bar: ChartColumn,
  barH: ChartBar,
  pie: ChartPie,
  donut: Donut,
  treemap: LayoutDashboard,
};
