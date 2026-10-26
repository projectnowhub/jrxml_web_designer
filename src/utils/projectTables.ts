// A project's list (team, companies, contracts) or its manager's card, from
// Report Data, as a typed table: an ordinary custom table in the Corporate
// Blue style holding the values (copied, never linked), as wide as the page.
// A list gets a heading row; a card has none, its labels in bold.

import type { CustomTableElement, CustomTableRow } from "@/types";
import type { ProjectTable } from "@/types/dataSource";
import { MIN_COLUMN_WIDTH, scaleSizes, syncTableSize } from "./customTable";

const ROW_HEIGHT = 18;
const HEADER_HEIGHT = 20;

export function buildProjectTable(source: ProjectTable, width: number): CustomTableElement {
  const rows: CustomTableRow[] = source.card
    ? source.rows.map(([label = "", value = ""]) => ({
        height: ROW_HEIGHT,
        cells: [{ text: label, bold: true }, { text: value }],
      }))
    : [
        { height: HEADER_HEIGHT, cells: source.columns.map((text) => ({ text })) },
        ...source.rows.map((row) => ({
          height: ROW_HEIGHT,
          cells: source.columns.map((_, i) => ({ text: row[i] ?? "" })),
        })),
      ];
  const element: CustomTableElement = {
    type: "customTable",
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    table: {
      columns: scaleSizes(source.shares, Math.round(width), MIN_COLUMN_WIDTH),
      rows,
      theme: "corporateBlue",
      headerRows: source.card ? 0 : 1,
      totalRow: false,
      padding: 3,
    },
  };
  syncTableSize(element);
  return element;
}
