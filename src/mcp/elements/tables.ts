// Tables and charts. A typed table is filled with the AI's words; a data table
// and a chart read a project's source (the setup is stored, the rows and
// numbers are fetched each time, as when the user sets them up by hand).

import type { ChartElement, CustomTableCell, CustomTableData, CustomTableElement, TableElement } from "@/types";
import type {
  ChartBinding,
  ChartDimension,
  ChartMeasure,
  DataColumn,
  DataSourceSchema,
  RelativePeriod,
  TableDataBinding,
  TableFilter,
  TotalFunction,
} from "@/types/dataSource";
import { createElement } from "@/components/elements/ElementRegistry";
import {
  fitTableToBox,
  MAX_HEADER_ROWS,
  mergeCells,
  MIN_COLUMN_WIDTH,
  scaleSizes,
  syncTableSize,
  DEFAULT_ROW_HEIGHT,
  visibleCells,
} from "@/utils/customTable";
import { TABLE_THEMES } from "@/utils/table/tableThemes";
import {
  distributeColumnWidths,
  maxColumnsForWidth,
  nextTableName,
  createDatasetName,
  toDataQuery,
  PREVIEW_ROW_LIMIT,
  RELATIVE_PERIODS,
} from "@/utils/table/dataBinding";
import { tableHeight, TABLE_HEADER_HEIGHT, TABLE_ROW_HEIGHT } from "@/utils/table/dataTable";
import { usedDatasetNames, usedTableNames } from "@/utils/table/tableDocument";
import { buildChartElement } from "@/utils/chart/chartElement";
import {
  CATEGORY_LIMITS,
  CHART_AGGREGATIONS,
  CHART_PALETTES,
  CHART_TYPES,
  changeChartType,
  chartTypeInfo,
  DATE_GRANULARITIES,
  DEFAULT_GRANULARITY,
  isChartComplete,
  normalizeChartBinding,
} from "@/utils/chart/chartTypes";
import { getFacets, getSchema, listProjects, queryRows } from "@/services/dataSourceService";
import { useReportStore } from "@/stores/report";
import { applyGeometry } from "./basic";
import { color, defined, has, readColor } from "./common";
import { SpecError, type ElementKind, type ElementSpec, type JsonSchema, type KindContext } from "./types";

const uuid = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// Typed table (the Table tile's "Type my own")
// ---------------------------------------------------------------------------

const CELL_STYLE_PROPS = {
  fill: color("Cell fill"),
  color: color("Text colour"),
  bold: { type: "boolean" as const },
  italic: { type: "boolean" as const },
  underline: { type: "boolean" as const },
  align: { type: "string" as const, enum: ["Left", "Center", "Right", "Justified"] },
  vAlign: { type: "string" as const, enum: ["Top", "Middle", "Bottom"] },
  fontSize: { type: "number" as const, minimum: 4, maximum: 40 },
};

function cellStyle(raw: Record<string, any>, field: string): Partial<CustomTableCell> {
  const style: Partial<CustomTableCell> = {};
  if (has(raw, "fill")) style.fill = readColor(raw.fill, `${field}.fill`) ?? undefined;
  if (has(raw, "color")) style.color = readColor(raw.color, `${field}.color`) ?? undefined;
  for (const key of ["bold", "italic", "underline", "align", "vAlign", "fontSize"] as const) {
    if (has(raw, key)) (style as Record<string, unknown>)[key] = raw[key];
  }
  return style;
}

// The grid from the AI's rows: every row as wide as the widest, shorter rows
// padded with empty cells
function buildGrid(spec: ElementSpec, width: number, base?: CustomTableData): CustomTableData {
  const rows = spec.rows as string[][];
  const count = Math.max(1, ...rows.map((r) => r.length));
  const shares = (spec.columnWidths as number[] | undefined) ?? Array(count).fill(1);
  if (shares.length !== count) throw new SpecError(`columnWidths: give ${count} values, one per column`);
  const rowHeight = Math.round(spec.rowHeight ?? DEFAULT_ROW_HEIGHT);
  const total = shares.reduce((a, b) => a + b, 0) || 1;
  return {
    columns: scaleSizes(shares.map((s) => (s / total) * width), Math.round(width), MIN_COLUMN_WIDTH),
    rows: rows.map((r) => ({
      height: rowHeight,
      cells: Array.from({ length: count }, (_, i) => ({ text: String(r[i] ?? "") })),
    })),
    theme: base?.theme ?? "corporateBlue",
    ...(base?.look ? { look: base.look, customized: base.customized } : {}),
    headerRows: Math.min(base?.headerRows ?? 1, rows.length),
    totalRow: base?.totalRow ?? false,
    padding: base?.padding ?? 3,
  };
}

function applyTypedTable(element: CustomTableElement, spec: ElementSpec, ctx: KindContext): void {
  if (has(spec, "rows")) {
    const width = spec.width ?? (element.width || ctx.availableWidth);
    element.table = buildGrid(spec, width, element.table);
  }
  const table = element.table;
  if (has(spec, "theme")) {
    table.theme = spec.theme;
    delete table.look;
    delete table.customized;
  }
  if (has(spec, "headerRows")) table.headerRows = Math.min(spec.headerRows, MAX_HEADER_ROWS, table.rows.length);
  if (has(spec, "totalRow")) table.totalRow = !!spec.totalRow;
  if (has(spec, "padding")) table.padding = Math.round(spec.padding);
  if (has(spec, "rowHeight") && !has(spec, "rows")) table.rows.forEach((r) => (r.height = Math.round(spec.rowHeight)));
  for (const [i, m] of ((spec.merges as Array<Record<string, number>> | undefined) ?? []).entries()) {
    const bottom = m.row! + (m.rowSpan ?? 1) - 1;
    const right = m.col! + (m.colSpan ?? 1) - 1;
    if (bottom >= table.rows.length || right >= table.columns.length) {
      throw new SpecError(`merges[${i}]: goes past the table (${table.rows.length} rows × ${table.columns.length} columns, counted from 0)`);
    }
    mergeCells(table, { top: m.row!, left: m.col!, bottom, right });
  }
  for (const [i, s] of ((spec.cellStyles as Array<Record<string, any>> | undefined) ?? []).entries()) {
    const rows = s.row === undefined ? table.rows.map((_, r) => r) : [s.row as number];
    const cols = s.col === undefined ? table.columns.map((_, c) => c) : [s.col as number];
    const style = cellStyle(s, `cellStyles[${i}]`);
    for (const r of rows) {
      for (const c of cols) {
        const cell = table.rows[r]?.cells[c];
        if (!cell) throw new SpecError(`cellStyles[${i}]: no cell at row ${r}, column ${c} (counted from 0)`);
        Object.assign(cell, style);
      }
    }
  }
  syncTableSize(element);
  // A size given by the AI: columns and rows take their shares of it
  if (has(spec, "width") || has(spec, "height")) {
    applyGeometry(element, spec);
    fitTableToBox(element);
  } else {
    applyGeometry(element, { x: spec.x, y: spec.y });
  }
}

export const typedTableKind: ElementKind = {
  kind: "table",
  tool: "create_table",
  description:
    "Add a table the user types into (key statistics, financial summary, risk register…), filled with the given words. The first headerRows rows are headings, totalRow makes the last row a total. Rows grow to fit their text in the PDF. Not inside a box.",
  properties: {
    rows: {
      type: "array",
      items: { type: "array", items: { type: "string" } },
      minItems: 1,
      description: "Cell texts row by row, headings first; \\n for a new line in a cell",
    },
    columnWidths: { type: "array", items: { type: "number", minimum: 0.1 }, description: "Relative column widths, e.g. [1, 3, 1] (default equal)" },
    headerRows: { type: "integer", minimum: 0, maximum: MAX_HEADER_ROWS, description: "Heading rows at the top (default 1)" },
    totalRow: { type: "boolean", description: "Last row drawn as a total" },
    theme: { type: "string", enum: TABLE_THEMES, description: "Table style: corporateBlue (default), minimal, emerald, none" },
    rowHeight: { type: "number", minimum: 12, maximum: 200, description: "Row height in px (default 20)" },
    padding: { type: "number", minimum: 0, maximum: 20, description: "Space inside cells in px (default 3)" },
    merges: {
      type: "array",
      description: "Merged cells: the top-left cell (row, col counted from 0) spans rowSpan rows and colSpan columns",
      items: {
        type: "object",
        properties: {
          row: { type: "integer", minimum: 0 },
          col: { type: "integer", minimum: 0 },
          rowSpan: { type: "integer", minimum: 1 },
          colSpan: { type: "integer", minimum: 1 },
        },
        required: ["row", "col"],
        additionalProperties: false,
      },
    },
    cellStyles: {
      type: "array",
      description: "Looks that differ from the table style. Leave row out for a whole column, col out for a whole row",
      items: {
        type: "object",
        properties: { row: { type: "integer", minimum: 0 }, col: { type: "integer", minimum: 0 }, ...CELL_STYLE_PROPS },
        additionalProperties: false,
      },
    },
  },
  required: ["rows"],
  inBox: false,
  matches: (e) => e.type === "customTable",
  create(spec, ctx) {
    const element = {
      ...createElement("customTable"),
      uuid: uuid(),
      x: 0,
      y: 0,
      width: Math.round(spec.width ?? ctx.availableWidth),
      height: 0,
    } as CustomTableElement;
    element.table = buildGrid(spec, element.width);
    applyTypedTable(element, spec, ctx);
    return element;
  },
  update(e, spec, ctx) {
    applyTypedTable(e as CustomTableElement, spec, ctx);
  },
  describe(e) {
    const table = (e as CustomTableElement).table;
    const shown = visibleCells(table);
    return defined({
      rows: table.rows.slice(0, 30).map((r, ri) =>
        r.cells.map((c, ci) => (shown.some((v) => v.row === ri && v.col === ci) ? c.text.slice(0, 80) : "")),
      ),
      columnWidths: table.columns,
      headerRows: table.headerRows,
      totalRow: table.totalRow,
      theme: table.theme,
      merges: shown.filter((v) => v.rowSpan > 1 || v.colSpan > 1).map((v) => ({ row: v.row, col: v.col, rowSpan: v.rowSpan, colSpan: v.colSpan })),
    });
  },
};

// ---------------------------------------------------------------------------
// Report data: the projects and sources a data table or chart reads
// ---------------------------------------------------------------------------

async function projectName(projectId: string): Promise<string> {
  const report = useReportStore();
  const chosen = report.reportProperties.projects?.find((p) => p.id === projectId);
  if (chosen) return chosen.name;
  const all = await listProjects();
  const found = all.find((p) => p.id === projectId);
  if (!found) throw new SpecError(`projectId: no project "${projectId}"; call get_report_data to see the projects`);
  return found.name;
}

// The report uses the project from now on (the header's project list)
function useProject(projectId: string, name: string): void {
  const props = useReportStore().reportProperties;
  if (!props.projects?.some((p) => p.id === projectId)) props.projects = [...(props.projects ?? []), { id: projectId, name }];
}

async function sourceSchema(projectId: string, sourceId: string): Promise<DataSourceSchema> {
  try {
    return await getSchema(projectId, sourceId);
  } catch {
    throw new SpecError(`sourceId: project "${projectId}" has no source "${sourceId}"; call get_report_data with the projectId to see its sources`);
  }
}

function column(schema: DataSourceSchema, key: string, field: string): DataColumn {
  const found = schema.columns.find((c) => c.key === key);
  if (!found) throw new SpecError(`${field}: "${key}" is not a column of ${schema.name} (columns: ${schema.columns.map((c) => c.key).join(", ")})`);
  return found;
}

// ---------------------------------------------------------------------------
// Filters: which rows a data table or chart uses (as the Filter panel sets them)
// ---------------------------------------------------------------------------

type FilterSpec = { column: string; values?: string[]; from?: string | number; to?: string | number; period?: RelativePeriod };

export const FILTERS_PROP: JsonSchema = {
  type: "array",
  description:
    "Which rows are used (all filters apply together; [] for none). Per column: values (rows with any of these texts; see get_report_data for the values), from / to (numbers, amounts, or dates yyyy-MM-dd; either may be left out), or period for dates (moves with the run date, so next month's report shows next month's rows)",
  items: {
    type: "object",
    properties: {
      column: { type: "string", description: "Column key" },
      values: { type: "array", items: { type: "string" }, minItems: 1 },
      from: { type: ["string", "number"] },
      to: { type: ["string", "number"] },
      period: { type: "string", enum: RELATIVE_PERIODS },
    },
    required: ["column"],
    additionalProperties: false,
  },
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

async function readFilters(projectId: string, sourceId: string, schema: DataSourceSchema, raw: FilterSpec[], field: string): Promise<TableFilter[]> {
  let facets: Awaited<ReturnType<typeof getFacets>> | null = null;
  const out: TableFilter[] = [];
  for (const [i, f] of raw.entries()) {
    const at = `${field}[${i}]`;
    const c = column(schema, f.column, `${at}.column`);
    const base = { column: c.key, label: c.label, type: c.type };
    const ranged = f.from !== undefined || f.to !== undefined;
    if ([f.values?.length, ranged, f.period].filter(Boolean).length !== 1) {
      throw new SpecError(`${at}: give exactly one of values, from / to, or period`);
    }
    if (f.values) {
      facets ??= await getFacets(projectId, sourceId).catch(() => ({}));
      const facet = facets?.[c.key];
      const known = facet?.kind === "values" ? facet.values.map((v) => v.value) : null;
      const unknown = known ? f.values.filter((v) => !known.includes(v)) : [];
      if (unknown.length) {
        throw new SpecError(`${at}.values: ${unknown.map((v) => `"${v}"`).join(", ")} not found in ${c.key} (its values: ${known!.slice(0, 25).map((v) => `"${v}"`).join(", ")})`);
      }
      out.push({ ...base, operator: "in", values: [...f.values] });
    } else if (f.period) {
      if (c.type !== "date") throw new SpecError(`${at}.period: only for date columns; ${c.key} is ${c.type}`);
      out.push({ ...base, operator: "between", period: f.period });
    } else {
      const bound = (v: string | number | undefined, name: string) => {
        if (v === undefined || v === "") return undefined;
        if (c.type === "date") {
          if (!ISO_DAY.test(String(v))) throw new SpecError(`${at}.${name}: a date as yyyy-MM-dd`);
          return String(v);
        }
        if (c.type === "text") throw new SpecError(`${at}: ${c.key} is a text column; use values`);
        if (!Number.isFinite(Number(v))) throw new SpecError(`${at}.${name}: a number`);
        return String(Number(v));
      };
      out.push({ ...base, operator: "between", value: bound(f.from, "from"), value2: bound(f.to, "to") });
    }
  }
  return out;
}

export const describeFilters = (filters: TableFilter[] | undefined) =>
  filters?.length
    ? filters.map((f) =>
        defined({
          column: f.column,
          values: f.operator === "in" ? f.values : undefined,
          period: f.period,
          from: f.operator === "between" && !f.period ? f.value : undefined,
          to: f.operator === "between" && !f.period ? f.value2 : undefined,
        }),
      )
    : undefined;

// ---------------------------------------------------------------------------
// Data table (the Table tile's "Use project data")
// ---------------------------------------------------------------------------

async function applyDataTable(element: TableElement, spec: ElementSpec, ctx: KindContext): Promise<void> {
  applyGeometry(element, spec);
  const current = element.binding;
  const projectId = spec.projectId ?? current?.projectId;
  const sourceId = spec.sourceId ?? current?.sourceId;
  if (!projectId || !sourceId) throw new SpecError("projectId and sourceId are required (see get_report_data)");
  const schema = await sourceSchema(projectId, sourceId);
  const name = current && current.projectId === projectId ? current.projectName : await projectName(projectId);
  const width = element.width;
  const max = maxColumnsForWidth(width);

  // The table's setup for the same source, kept where the AI changes nothing
  const same = current && current.sourceId === sourceId ? current : undefined;
  let columns = same?.columns ?? [];
  if (has(spec, "columns") || !columns.length) {
    const wanted: Array<{ column: string; header?: string; total?: string }> =
      spec.columns ?? schema.columns.slice(0, max).map((c) => ({ column: c.key }));
    if (wanted.length > max) throw new SpecError(`columns: at most ${max} fit in ${width} px (60 px each); make the table wider or show fewer`);
    const widths = distributeColumnWidths(wanted.length, width);
    columns = wanted.map((w, i) => {
      const c = column(schema, w.column, `columns[${i}].column`);
      if (w.total && w.total !== "count" && c.type !== "number" && c.type !== "currency") {
        throw new SpecError(`columns[${i}].total: "${w.total}" needs a number or amount column; ${c.key} is ${c.type}`);
      }
      return { key: c.key, label: w.header ?? c.label, type: c.type, width: widths[i] ?? MIN_COLUMN_WIDTH, ...(w.total ? { total: w.total as TotalFunction } : {}) };
    });
  }
  const sortSpec = spec.sort as { column: string; direction?: "asc" | "desc" } | undefined;
  const sort = sortSpec
    ? (() => {
        const c = column(schema, sortSpec.column, "sort.column");
        return [{ column: c.key, label: c.label, type: c.type, direction: sortSpec.direction ?? "asc" }];
      })()
    : same?.sort ?? [];

  const bands = useReportStore().bands;
  const binding: TableDataBinding = {
    tableName: spec.tableName ?? current?.tableName ?? nextTableName(usedTableNames(bands)),
    datasetName: current?.datasetName ?? createDatasetName(usedDatasetNames(bands)),
    projectId,
    projectName: name,
    sourceId,
    sourceName: schema.name,
    columns,
    filters: has(spec, "filters") ? await readFilters(projectId, sourceId, schema, spec.filters, "filters") : same?.filters ?? [],
    sort,
    ...(has(spec, "rowLimit") ? (spec.rowLimit ? { rowLimit: spec.rowLimit } : {}) : current?.rowLimit ? { rowLimit: current.rowLimit } : {}),
    showTotals: columns.some((c) => c.total),
    theme: spec.theme ?? current?.theme ?? "corporateBlue",
    ...(!has(spec, "theme") && current?.look ? { look: current.look, customized: current.customized } : {}),
  };
  element.binding = binding;
  useProject(projectId, name);

  // As tall as the canvas shows it (header, up to 5 sample rows, totals)
  let rowCount = 1;
  try {
    rowCount = (await queryRows(projectId, sourceId, toDataQuery(binding, PREVIEW_ROW_LIMIT))).totalCount;
  } catch {
    ctx.notes.push("rows could not be fetched now; they are fetched again on the page and in the PDF");
  }
  element.height = tableHeight(binding, rowCount, element.headerHeight, element.rowHeight);
  ctx.notes.push(`${rowCount} row(s) in ${schema.name}; the PDF prints them all, growing onto more pages`);
}

export const dataTableKind: ElementKind = {
  kind: "dataTable",
  tool: "create_data_table",
  description:
    "Add a table showing the rows of a project's data source (Procurement, Materials…), fetched each time the report runs; it grows onto more pages. Call get_report_data first for the project, source and column ids. Only in the detail band of a normal page, never in a box. Width: at least 60 px per column.",
  properties: {
    projectId: { type: "string" },
    sourceId: { type: "string" },
    columns: {
      type: "array",
      description: "Columns in order (default: as many as fit)",
      items: {
        type: "object",
        properties: {
          column: { type: "string", description: "Column key" },
          header: { type: "string", description: "Heading text (default the column's name)" },
          total: { type: "string", enum: ["sum", "avg", "count"], description: "Total under the column" },
        },
        required: ["column"],
        additionalProperties: false,
      },
    },
    sort: {
      type: "object",
      properties: { column: { type: "string" }, direction: { type: "string", enum: ["asc", "desc"] } },
      required: ["column"],
      additionalProperties: false,
    },
    filters: FILTERS_PROP,
    rowLimit: { type: "integer", minimum: 0, description: "Show at most this many rows (0: all)" },
    theme: { type: "string", enum: TABLE_THEMES, description: "Table style (default corporateBlue)" },
    tableName: { type: "string" },
  },
  required: ["projectId", "sourceId"],
  inBox: false,
  defaultBand: () => "detail",
  matches: (e) => e.type === "table",
  async create(spec, ctx) {
    const element = {
      ...createElement("table"),
      uuid: uuid(),
      x: 0,
      y: 0,
      width: Math.round(spec.width ?? ctx.availableWidth),
      headerHeight: TABLE_HEADER_HEIGHT,
      rowHeight: TABLE_ROW_HEIGHT,
    } as TableElement;
    await applyDataTable(element, spec, ctx);
    return element;
  },
  async update(e, spec, ctx) {
    const table = e as TableElement;
    // A new width: the columns keep their shares
    if (has(spec, "width") && table.binding && !has(spec, "columns")) {
      const widths = distributeColumnWidths(table.binding.columns.length, spec.width);
      table.binding.columns = table.binding.columns.map((c, i) => ({ ...c, width: widths[i] ?? c.width }));
    }
    await applyDataTable(table, { ...spec, height: undefined }, ctx);
  },
  describe(e) {
    const b = (e as TableElement).binding;
    if (!b) return { empty: true };
    return defined({
      projectId: b.projectId,
      sourceId: b.sourceId,
      source: b.sourceName,
      columns: b.columns.map((c) => defined({ column: c.key, header: c.label, total: c.total })),
      sort: b.sort[0] ? { column: b.sort[0].column, direction: b.sort[0].direction } : undefined,
      rowLimit: b.rowLimit,
      theme: b.theme,
      tableName: b.tableName,
      filters: describeFilters(b.filters),
    });
  },
};

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

function dimensionOf(schema: DataSourceSchema, raw: { column: string; granularity?: string } | undefined, field: string): ChartDimension | undefined {
  if (!raw) return undefined;
  const c = column(schema, raw.column, `${field}.column`);
  return {
    column: c.key,
    label: c.label,
    type: c.type,
    ...(c.type === "date" ? { granularity: (raw.granularity as ChartDimension["granularity"]) ?? DEFAULT_GRANULARITY } : {}),
  };
}

function measureOf(schema: DataSourceSchema, raw: { aggregation: string; column?: string }, field: string): ChartMeasure {
  if (raw.aggregation === "count") return { aggregation: "count" };
  if (!raw.column) throw new SpecError(`${field}.column: "${raw.aggregation}" needs a number column`);
  const c = column(schema, raw.column, `${field}.column`);
  if (c.type !== "number" && c.type !== "currency") throw new SpecError(`${field}.column: ${c.key} is ${c.type}; use a number or amount column, or aggregation "count"`);
  return { aggregation: raw.aggregation as ChartMeasure["aggregation"], column: c.key, columnLabel: c.label };
}

async function applyChart(element: ChartElement, spec: ElementSpec, ctx: KindContext): Promise<void> {
  applyGeometry(element, spec);
  let binding: ChartBinding = { ...element.binding };
  if (has(spec, "chartType")) binding = changeChartType(binding, spec.chartType);
  if (has(spec, "title")) binding.title = String(spec.title);
  if (has(spec, "showLegend")) binding.showLegend = !!spec.showLegend;
  if (has(spec, "palette")) binding.palette = spec.palette;

  const data = spec.data as Record<string, any> | undefined;
  if (data) {
    const projectId = data.projectId ?? binding.projectId;
    const sourceId = data.sourceId ?? binding.sourceId;
    if (!projectId || !sourceId) throw new SpecError("data.projectId and data.sourceId are required (see get_report_data)");
    const schema = await sourceSchema(projectId, sourceId);
    const name = await projectName(projectId);
    const info = chartTypeInfo(binding.chartType);
    const measure = data.measure ? measureOf(schema, data.measure, "data.measure") : binding.measure ?? binding.series?.[0]?.measure;
    const dimension = data.dimension ? dimensionOf(schema, data.dimension, "data.dimension") : binding.dimension;
    if (dimension && info.dimensionTypes.length && !info.dimensionTypes.includes(dimension.type)) {
      throw new SpecError(`data.dimension: a ${binding.chartType} chart needs a ${info.dimensionTypes.join(" or ")} column; ${dimension.column} is ${dimension.type}`);
    }
    binding = {
      ...binding,
      projectId,
      projectName: name,
      sourceId,
      sourceName: schema.name,
      ...(schema.entityName ? { entityName: schema.entityName } : {}),
      ...(measure ? { measure } : {}),
      ...(dimension ? { dimension } : {}),
    };
    if (info.shape === "series" && measure) {
      const splitBy = data.splitBy ? dimensionOf(schema, { column: data.splitBy }, "data.splitBy") : undefined;
      binding.series = [{ measure, ...(splitBy ? { splitBy } : {}) }];
    }
    if (data.level2) binding.level2 = dimensionOf(schema, { column: data.level2 }, "data.level2");
    if (has(data, "stacked")) binding.stacked = !!data.stacked || undefined;
    if (has(data, "limit")) binding.limit = data.limit;
    if (has(data, "gaugeMax")) binding.gaugeMax = data.gaugeMax || undefined;
    if (has(data, "filters")) binding.filters = await readFilters(projectId, sourceId, schema, data.filters, "data.filters");
    useProject(projectId, name);
  }
  element.binding = normalizeChartBinding(binding);
  if (element.binding.projectId && !isChartComplete(element.binding)) {
    ctx.notes.push(`the ${element.binding.chartType} chart is linked but not complete (it needs ${chartNeeds(element.binding.chartType)}); it shows sample numbers and prints nothing until then`);
  } else if (!element.binding.projectId) {
    ctx.notes.push("the chart shows sample numbers until it is linked to data (give data, or the user sets it up)");
  }
}

function chartNeeds(type: ChartBinding["chartType"]): string {
  switch (chartTypeInfo(type).shape) {
    case "value":
      return "a measure";
    case "tree":
      return "a measure, a text dimension and level2";
    default:
      return `a measure and a ${chartTypeInfo(type).dimensionTypes.join(" or ")} dimension`;
  }
}

export const chartKind: ElementKind = {
  kind: "chart",
  tool: "create_chart",
  description:
    "Add a chart of a project's data: kpi (one big number), gauge, line / area (over time: date dimension), bar / barH (compare categories), pie / donut (parts of a whole), treemap. Numbers are fetched when the report runs. Without data it shows sample numbers and prints nothing. Call get_report_data for the ids.",
  properties: {
    chartType: { type: "string", enum: CHART_TYPES.map((c) => c.type), description: "Default bar" },
    title: { type: "string", description: "Printed above the chart (empty for none)" },
    showLegend: { type: "boolean" },
    palette: { type: "string", enum: CHART_PALETTES.map((p) => p.id), description: "Colour set (default vivid)" },
    data: {
      type: "object",
      description: "What it shows",
      properties: {
        projectId: { type: "string" },
        sourceId: { type: "string" },
        measure: {
          type: "object",
          description: "The number: count of rows, or sum / avg / min / max of a number column",
          properties: { aggregation: { type: "string", enum: CHART_AGGREGATIONS }, column: { type: "string" } },
          required: ["aggregation"],
          additionalProperties: false,
        },
        dimension: {
          type: "object",
          description: "Categories (bars, slices, points over time)",
          properties: { column: { type: "string" }, granularity: { type: "string", enum: DATE_GRANULARITIES, description: "Date columns: grouped by" } },
          required: ["column"],
          additionalProperties: false,
        },
        splitBy: { type: "string", description: "Line / area / bar: one line or bar set per value of this text column" },
        level2: { type: "string", description: "Tree map: text column for the items inside each group" },
        stacked: { type: "boolean", description: "Bars / areas on top of each other" },
        limit: { type: "integer", enum: CATEGORY_LIMITS, description: "Largest N text categories, the rest as \"Other\" (0: all)" },
        gaugeMax: { type: "number", minimum: 0, description: "Gauge: end of the scale" },
        filters: FILTERS_PROP,
      },
      additionalProperties: false,
    },
  },
  inBox: true,
  matches: (e) => e.type === "chart",
  async create(spec, ctx) {
    const element = { ...buildChartElement(spec.chartType ?? "bar"), uuid: uuid() } as ChartElement;
    element.width = Math.min(element.width, ctx.availableWidth);
    await applyChart(element, spec, ctx);
    return element;
  },
  update: (e, spec, ctx) => applyChart(e as ChartElement, spec, ctx),
  describe(e) {
    const b = (e as ChartElement).binding;
    const measure = b.measure ?? b.series?.[0]?.measure;
    return defined({
      chartType: b.chartType,
      title: b.title,
      showLegend: b.showLegend,
      palette: b.palette,
      data: b.projectId
        ? defined({
            projectId: b.projectId,
            sourceId: b.sourceId,
            measure,
            dimension: b.dimension ? defined({ column: b.dimension.column, granularity: b.dimension.granularity }) : undefined,
            splitBy: b.series?.[0]?.splitBy?.column,
            level2: b.level2?.column,
            stacked: b.stacked,
            limit: b.limit,
            filters: describeFilters(b.filters),
            complete: isChartComplete(b),
          })
        : undefined,
    });
  },
};
