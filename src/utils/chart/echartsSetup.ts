// ECharts with only what the Chart element draws, rendered as SVG: the canvas
// and the JRXML image (chartImage.ts) use the same renderer, so they match.

import * as echarts from "echarts/core";
import { BarChart, GaugeChart, LineChart, PieChart, TreemapChart } from "echarts/charts";
import { GridComponent, LegendComponent, TitleComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  GaugeChart,
  LineChart,
  PieChart,
  TreemapChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  SVGRenderer,
]);

export { echarts };
