// A chart's ECharts settings drawn as SVG text, without a browser (ECharts'
// server-side rendering). Used by the designer for the chart's image in the
// JRXML and by the report engine the report server runs, so both match.
import type { EChartsCoreOption } from "echarts/core";
import { echarts } from "./echartsSetup";

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
