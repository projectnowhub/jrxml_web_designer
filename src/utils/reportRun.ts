// Getting a template ready for the report server (Preview PDF, the AI's
// check_pdf): the template's project loaded, so its linked details show its
// values in the JRXML (their parameters' defaults). The report server will
// load the project's values, the tables' rows and the charts' numbers itself
// from the template's report bands (utils/reportBands.ts, docs/REPORT_ENGINE.md).
// TEMPORARY until it does: Preview PDF sends each data table's first rows
// (previewSubDataSources).

import type { Band } from "@/types";
import type { DataRow, TableDataBinding } from "@/types/dataSource";
import type { PreviewSubDataSources } from "@/types/reportServer";
import { fetchProject } from "@/queries/projectQueries";
import { fetchTableRows } from "@/composables/useTableRows";
import { PREVIEW_PDF_ROWS } from "@/constants/reportDataConstants";
import { collectBoundTables } from "./table/tableDocument";

// A row as the table's dataset reads it: only its columns, empty values left
// out (the server would read a JSON null as the text "null"), number columns
// as numbers (their fields are java.lang.Number)
const toDatasetRow = (binding: TableDataBinding, row: DataRow): DataRow => {
  const out: DataRow = {};
  for (const column of binding.columns) {
    const value = row[column.key];
    if (value === null || value === undefined || value === "") continue;
    if (column.type === "number") {
      const number = typeof value === "number" ? value : Number(value);
      if (Number.isFinite(number)) out[column.key] = number;
    } else {
      out[column.key] = value;
    }
  }
  return out;
};

// The template's project loaded (so its linked details show its values when the JRXML is written)
export async function ensureTemplateProject(projectId: string | undefined): Promise<void> {
  if (projectId) await fetchProject(projectId).catch(() => null);
}

// TEMPORARY, until the report server loads the report bands: every data table's
// first PREVIEW_PDF_ROWS rows by dataset name, for Preview PDF. The same
// request as the preview's side panel (answered from its larger cached one);
// a table whose rows fail is left out and prints its "no rows" line.
export async function previewSubDataSources(bands: Band[]): Promise<PreviewSubDataSources> {
  const result: PreviewSubDataSources = {};
  await Promise.all(
    collectBoundTables(bands).map(async ({ binding }) => {
      try {
        const { rows } = await fetchTableRows(binding, PREVIEW_PDF_ROWS);
        result[binding.datasetName] = rows.slice(0, PREVIEW_PDF_ROWS).map((row) => toDatasetRow(binding, row));
      } catch {
        // Left out: the PDF still builds
      }
    }),
  );
  return result;
}
