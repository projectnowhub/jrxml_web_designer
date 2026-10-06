// Dragging from the "Table Data" list: a whole source, or one of its columns.
// The type is also put in the drag's MIME types, which (unlike its data) can
// be read during dragover to highlight the table under the cursor.

import type { DataColumn } from "@/types/dataSource";

export const DATA_SOURCE_MIME = "application/x-cdp-data-source";

export type DataSourceDragPayload =
  | { kind: "source"; sourceId: string; sourceName: string }
  | { kind: "column"; sourceId: string; sourceName: string; column: DataColumn };

// Kept in memory too: some desktop webviews don't hand dataTransfer data to drop
let current: DataSourceDragPayload | null = null;

export function startDataSourceDrag(event: DragEvent, payload: DataSourceDragPayload): void {
  current = payload;
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData(DATA_SOURCE_MIME, JSON.stringify(payload));
}

export function endDataSourceDrag(): void {
  current = null;
}

export function isDataSourceDrag(event: DragEvent): boolean {
  return !!current || !!event.dataTransfer?.types.includes(DATA_SOURCE_MIME);
}

// The dragged source/column, if this drag came from the "Table Data" list
export function readDataSourceDrag(event: DragEvent): DataSourceDragPayload | null {
  if (current) return current;
  try {
    const raw = event.dataTransfer?.getData(DATA_SOURCE_MIME);
    return raw ? (JSON.parse(raw) as DataSourceDragPayload) : null;
  } catch {
    return null;
  }
}
