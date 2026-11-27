// A project's list (manager, team, companies, contracts) from Report Data, on
// the page: a data table filled with the project's rows (binding.list), in the
// Corporate Blue style, as wide as a data table. It follows the template's project.

import type { TableElement } from "@/types";
import type { ProjectListKey, ProjectTable, ReportProject } from "@/types/dataSource";
import { MIN_COLUMN_WIDTH, scaleSizes } from "./customTable";
import { createDatasetName, nextTableName } from "./table/dataBinding";
import { TABLE_HEADER_HEIGHT, TABLE_ROW_HEIGHT } from "./table/dataTable";

// Rows the canvas shows of a list table at most (as a data table)
const SHOWN_ROWS = 5;

// A list as a table of the project's rows: its columns and headings as Report
// Data shows them, a dataset and name of its own in the report
export function buildProjectListTable(
  source: ProjectTable,
  width: number,
  project: ReportProject,
  taken: { datasets: string[]; names: string[] },
): TableElement {
  const keys = source.keys ?? [];
  const widths = scaleSizes(source.shares, Math.round(width), MIN_COLUMN_WIDTH);
  return {
    type: "table",
    x: 0,
    y: 0,
    width: Math.round(width),
    height: TABLE_HEADER_HEIGHT + Math.max(1, Math.min(source.rows.length, SHOWN_ROWS)) * TABLE_ROW_HEIGHT,
    headerHeight: TABLE_HEADER_HEIGHT,
    rowHeight: TABLE_ROW_HEIGHT,
    binding: {
      tableName: nextTableName(taken.names, source.label),
      datasetName: createDatasetName(taken.datasets),
      projectId: project.id,
      projectName: project.name,
      list: source.key as ProjectListKey,
      sourceId: source.key,
      sourceName: source.label,
      columns: keys.map((key, i) => ({ key, label: source.columns[i] ?? key, type: "text", width: widths[i] ?? MIN_COLUMN_WIDTH })),
      filters: [],
      sort: [],
      showTotals: false,
      theme: "corporateBlue",
    },
  };
}
