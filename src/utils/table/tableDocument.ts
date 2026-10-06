// Data tables across the whole report: finding them, and keeping each one's
// name and dataset unique (copies get their own, so their rows never mix).

import type { Band, DesignElement, TableElement } from "@/types";
import type { TableDataBinding } from "@/types/dataSource";
import { createDatasetName, nextTableName } from "./dataBinding";

export type BoundTable = TableElement & { binding: TableDataBinding };

// Every table, including tables inside boxes
export function collectTables(bands: Band[]): TableElement[] {
  const tables: TableElement[] = [];
  const visit = (elements: DesignElement[] | undefined) => {
    elements?.forEach((el) => {
      if (el.type === "table") tables.push(el as TableElement);
      if (el.type === "frame") visit((el as any).elements);
    });
  };
  bands.forEach((band) => visit(band.elements));
  return tables;
}

export function collectBoundTables(bands: Band[]): BoundTable[] {
  return collectTables(bands).filter((t): t is BoundTable => !!t.binding);
}

export const usedTableNames = (bands: Band[]) =>
  collectBoundTables(bands).map((t) => t.binding.tableName);

export const usedDatasetNames = (bands: Band[]) =>
  collectBoundTables(bands).map((t) => t.binding.datasetName);

// After a paste or duplicate: a table sharing another's dataset gets its own
// dataset and name. Returns whether anything changed.
export function ensureUniqueTableDatasets(bands: Band[]): boolean {
  const datasets = new Set<string>();
  const names = new Set<string>();
  let changed = false;
  for (const table of collectBoundTables(bands)) {
    const b = table.binding;
    if (datasets.has(b.datasetName)) {
      b.datasetName = createDatasetName([...datasets]);
      changed = true;
    }
    if (!b.tableName || names.has(b.tableName)) {
      b.tableName = nextTableName([...names]);
      changed = true;
    }
    datasets.add(b.datasetName);
    names.add(b.tableName);
  }
  return changed;
}
