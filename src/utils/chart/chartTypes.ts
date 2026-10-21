// The Chart element: one element with nine chart types, grouped by what they
// show (the same set as the dashboard in the CDP app). A chart keeps only its
// setup (ChartBinding); the JRXML gets an image of it (chartImage.ts).

import type {
  ChartAggregation,
  ChartBinding,
  ChartDimension,
  ChartMeasure,
  ChartPaletteId,
  ChartSeriesBinding,
  ChartType,
  DataColumnType,
  DateGranularity,
} from "@/types/dataSource";
import { readFilters } from "../table/dataBinding";

// JRXML property on the chart image's <reportElement> holding its ChartBinding
export const CHART_BINDING_PROPERTY = "com.cdp.chart.binding";

export type ChartGroup = "metric" | "trend" | "compare" | "partOfWhole";

// What a chart type is drawn from: one number, one number per category,
// series over the categories, or groups with items
export type ChartShape = "value" | "parts" | "series" | "tree";

export interface ChartTypeInfo {
  type: ChartType;
  group: ChartGroup;
  shape: ChartShape;
  // Column types its categories can come from
  dimensionTypes: DataColumnType[];
  // Whether the chart has a legend to show or hide
  hasLegend: boolean;
  // Size of a new chart of this type
  size: { width: number; height: number };
}

const WIDE = { width: 320, height: 200 };
const CATEGORY_TYPES: DataColumnType[] = ["text", "date"];

export const CHART_TYPES: ChartTypeInfo[] = [
  { type: "kpi", group: "metric", shape: "value", dimensionTypes: [], hasLegend: false, size: { width: 180, height: 100 } },
  { type: "gauge", group: "metric", shape: "value", dimensionTypes: [], hasLegend: false, size: { width: 220, height: 160 } },
  { type: "line", group: "trend", shape: "series", dimensionTypes: ["date"], hasLegend: true, size: WIDE },
  { type: "area", group: "trend", shape: "series", dimensionTypes: ["date"], hasLegend: true, size: WIDE },
  { type: "bar", group: "compare", shape: "series", dimensionTypes: CATEGORY_TYPES, hasLegend: true, size: WIDE },
  { type: "barH", group: "compare", shape: "series", dimensionTypes: CATEGORY_TYPES, hasLegend: true, size: WIDE },
  { type: "pie", group: "partOfWhole", shape: "parts", dimensionTypes: CATEGORY_TYPES, hasLegend: true, size: { width: 260, height: 200 } },
  { type: "donut", group: "partOfWhole", shape: "parts", dimensionTypes: CATEGORY_TYPES, hasLegend: true, size: { width: 260, height: 200 } },
  { type: "treemap", group: "partOfWhole", shape: "tree", dimensionTypes: ["text"], hasLegend: false, size: WIDE },
];

export const CHART_AGGREGATIONS: ChartAggregation[] = ["count", "sum", "avg", "min", "max"];
export const DATE_GRANULARITIES: DateGranularity[] = ["day", "week", "month", "quarter", "year"];
export const DEFAULT_GRANULARITY: DateGranularity = "month";
// Choices for "show the largest N categories"; 0 = all of them
export const CATEGORY_LIMITS = [5, 8, 10, 20, 0];
export const DEFAULT_CATEGORY_LIMIT = 10;
// Lines or sets of bars a chart may have
export const MAX_CHART_SERIES = 4;

export const CHART_GROUPS: ChartGroup[] = ["metric", "trend", "compare", "partOfWhole"];

// A chart dragged in from the library starts as a bar chart
export const DEFAULT_CHART_TYPE: ChartType = "bar";

export const chartTypeInfo = (type: ChartType): ChartTypeInfo =>
  CHART_TYPES.find((c) => c.type === type) ?? CHART_TYPES.find((c) => c.type === DEFAULT_CHART_TYPE)!;

export const chartTypesInGroup = (group: ChartGroup): ChartTypeInfo[] =>
  CHART_TYPES.filter((c) => c.group === group);

const isChartType = (value: unknown): value is ChartType =>
  CHART_TYPES.some((c) => c.type === value);

// Colour sets; the first one matches the CDP app's charts
export const CHART_PALETTES: Array<{ id: ChartPaletteId; colors: string[] }> = [
  {
    id: "vivid",
    colors: ["#7c5cf7", "#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#06b6d4", "#f97316", "#ec4899", "#a855f7", "#14b8a6"],
  },
  {
    id: "ocean",
    colors: ["#1e3a8a", "#2563eb", "#0891b2", "#38bdf8", "#6366f1", "#0d9488", "#93c5fd", "#155e75"],
  },
  {
    id: "forest",
    colors: ["#065f46", "#10b981", "#84cc16", "#15803d", "#6ee7b7", "#a3a3a3", "#4d7c0f", "#34d399"],
  },
  {
    id: "sunset",
    colors: ["#c2410c", "#f97316", "#facc15", "#dc2626", "#fb7185", "#a16207", "#fdba74", "#9f1239"],
  },
  {
    id: "mono",
    colors: ["#1f2937", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#374151", "#e5e7eb", "#111827"],
  },
];

export const DEFAULT_CHART_PALETTE: ChartPaletteId = "vivid";

export const paletteColors = (id: ChartPaletteId | undefined): string[] =>
  (CHART_PALETTES.find((p) => p.id === id) ?? CHART_PALETTES[0]!).colors;

// ── As many colours as a chart needs, never repeating ──

const hexToHsl = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return { h: 0, s: 0, l, chroma: 0 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  // chroma: how far from grey (0 = grey); slightly tinted greys stay low
  return { h: (h * 60 + 360) % 360, s, l, chroma: d };
};

const hslToHex = (h: number, s: number, l: number) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
// Steps around the colour wheel that never land on the same hue twice
const GOLDEN_ANGLE = 137.508;
const GOLDEN_RATIO = 0.618034;
// Plain grey shades tried before tinted ones
const GREY_SHADES = 120;

// The colour set's own colours first; after them new ones in the same style
// (similar strength and brightness; shades of grey for the grey set), each
// different from every colour before it
export function chartColors(id: ChartPaletteId | undefined, count: number): string[] {
  const base = paletteColors(id);
  const colors = base.slice(0, Math.max(0, count));
  if (count <= base.length) return colors;

  const hsl = base.map(hexToHsl);
  const avg = (key: "s" | "l" | "chroma") => hsl.reduce((sum, c) => sum + c[key], 0) / hsl.length;
  const saturation = clamp(avg("s"), 0.45, 0.8);
  const lightness = clamp(avg("l"), 0.4, 0.58);
  const grey = avg("chroma") < 0.12;
  const used = new Set(colors.map((c) => c.toLowerCase()));

  for (let k = 0; colors.length < count; k++) {
    // Greys: plain while there are new shades, then faintly tinted ones
    const level = 0.18 + ((k * GOLDEN_RATIO + 0.11) % 1) * 0.64;
    const color = grey
      ? hslToHex((k * GOLDEN_ANGLE) % 360, k < GREY_SHADES ? 0 : 0.2, level)
      : hslToHex(
          (hsl[0]!.h + (k + 1) * GOLDEN_ANGLE) % 360,
          saturation,
          // Every few colours a lighter, then a darker round, so neighbours differ
          clamp(lightness + [0, 0.14, -0.1][Math.floor(k / 5) % 3]!, 0.3, 0.72),
        );
    // Rounding can rarely give a colour already used; after very many, allow it
    if (!used.has(color) || k > count * 50) {
      used.add(color);
      colors.push(color);
    }
  }
  return colors;
}

export const defaultChartBinding = (chartType: ChartType = DEFAULT_CHART_TYPE): ChartBinding => ({
  chartType,
  title: "",
  showLegend: true,
  palette: DEFAULT_CHART_PALETTE,
});

const COLUMN_TYPES: DataColumnType[] = ["text", "number", "currency", "date"];
const text = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const asObject = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : null);

function readMeasure(value: unknown): ChartMeasure | undefined {
  const m = asObject(value);
  const aggregation = m?.aggregation as ChartAggregation;
  if (!m || !CHART_AGGREGATIONS.includes(aggregation)) return undefined;
  if (aggregation === "count") return { aggregation };
  const column = text(m.column);
  return column ? { aggregation, column, columnLabel: text(m.columnLabel) ?? column } : undefined;
}

function readDimension(value: unknown): ChartDimension | undefined {
  const d = asObject(value);
  const column = text(d?.column);
  if (!d || !column) return undefined;
  const type = COLUMN_TYPES.includes(d.type as DataColumnType) ? (d.type as DataColumnType) : "text";
  const dimension: ChartDimension = { column, label: text(d.label) ?? column, type };
  if (type === "date") {
    dimension.granularity = DATE_GRANULARITIES.includes(d.granularity as DateGranularity)
      ? (d.granularity as DateGranularity)
      : DEFAULT_GRANULARITY;
  }
  return dimension;
}

function readSeries(value: unknown): ChartSeriesBinding[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const series = value
    .map((item) => {
      const measure = readMeasure(asObject(item)?.measure);
      const splitBy = readDimension(asObject(item)?.splitBy);
      return measure ? { measure, ...(splitBy ? { splitBy } : {}) } : null;
    })
    .filter((item): item is ChartSeriesBinding => item !== null)
    .slice(0, MAX_CHART_SERIES);
  return series.length ? series : undefined;
}

// Any stored value as a complete binding (unknown values fall back to the
// defaults, and data settings that don't make sense are left out)
export function normalizeChartBinding(value: unknown): ChartBinding {
  const b = (asObject(value) ?? {}) as Partial<ChartBinding> & Record<string, unknown>;
  const defaults = defaultChartBinding();
  const binding: ChartBinding = {
    chartType: isChartType(b.chartType) ? b.chartType : defaults.chartType,
    title: typeof b.title === "string" ? b.title : defaults.title,
    showLegend: typeof b.showLegend === "boolean" ? b.showLegend : defaults.showLegend,
    palette: CHART_PALETTES.some((p) => p.id === b.palette) ? b.palette! : defaults.palette,
  };
  const projectId = text(b.projectId);
  const sourceId = text(b.sourceId);
  if (!projectId || !sourceId) return binding;

  Object.assign(binding, {
    projectId,
    projectName: text(b.projectName) ?? projectId,
    sourceId,
    sourceName: text(b.sourceName) ?? sourceId,
    ...(text(b.entityName) ? { entityName: text(b.entityName) } : {}),
  });
  const optional: Partial<ChartBinding> = {
    measure: readMeasure(b.measure),
    dimension: readDimension(b.dimension),
    level2: readDimension(b.level2),
    series: readSeries(b.series),
    stacked: b.stacked === true || undefined,
    limit: CATEGORY_LIMITS.includes(b.limit as number) ? (b.limit as number) : undefined,
    gaugeMax: typeof b.gaugeMax === "number" && b.gaugeMax > 0 ? b.gaugeMax : undefined,
    filters: readFilters(b.filters),
  };
  for (const [key, v] of Object.entries(optional)) {
    if (v !== undefined && !(Array.isArray(v) && !v.length)) (binding as unknown as Record<string, unknown>)[key] = v;
  }
  return binding;
}

// Linked to a project's data (otherwise it shows sample numbers and prints nothing)
export const isChartBound = (binding: ChartBinding): boolean => !!(binding.projectId && binding.sourceId);

// Linked, with everything its type needs to draw real numbers
export function isChartComplete(binding: ChartBinding): boolean {
  if (!isChartBound(binding)) return false;
  const info = chartTypeInfo(binding.chartType);
  const dimensionOk = (d?: ChartDimension) => !!d && info.dimensionTypes.includes(d.type);
  switch (info.shape) {
    case "value":
      return !!binding.measure;
    case "parts":
      return !!binding.measure && dimensionOk(binding.dimension);
    case "series":
      return !!binding.series?.length && dimensionOk(binding.dimension);
    case "tree":
      return !!binding.measure && dimensionOk(binding.dimension) && dimensionOk(binding.level2);
  }
}

// Another chart type for the same data: what the new type needs is filled in
// from what the chart already has (the number shown, its categories)
export function changeChartType(binding: ChartBinding, chartType: ChartType): ChartBinding {
  const next: ChartBinding = { ...binding, chartType };
  const info = chartTypeInfo(chartType);
  const measure = binding.measure ?? binding.series?.[0]?.measure;
  if (info.shape === "series") {
    if (!next.series?.length && measure) next.series = [{ measure }];
  } else if (measure) {
    next.measure = measure;
  }
  if (info.shape === "tree" && !next.level2) {
    next.level2 = binding.series?.find((s) => s.splitBy?.type === "text")?.splitBy;
  }
  return next;
}

// The binding written in the JRXML property, or null when it isn't a chart's
export function parseChartBinding(json: string | null | undefined): ChartBinding | null {
  if (!json) return null;
  try {
    const value = JSON.parse(json);
    return value && typeof value === "object" && isChartType(value.chartType)
      ? normalizeChartBinding(value)
      : null;
  } catch {
    return null;
  }
}
