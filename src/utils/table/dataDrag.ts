// Dragging from the "Report Data" list: a project's table source or one of its
// columns (onto a table), or one of its details (name, logo… onto the page).
// The type is also put in the drag's MIME types, which (unlike its data) can
// be read during dragover to highlight the table under the cursor.

import type { DataColumn, ProjectField } from "@/types/dataSource";

export const DATA_SOURCE_MIME = "application/x-cdp-data-source";
export const PROJECT_FIELD_MIME = "application/x-cdp-project-field";

interface ProjectRef {
  projectId: string;
  projectName: string;
}

export type DataSourceDragPayload =
  | (ProjectRef & { kind: "source"; sourceId: string; sourceName: string })
  | (ProjectRef & { kind: "column"; sourceId: string; sourceName: string; column: DataColumn })
  // A detail and its value (copied into the element on drop)
  | (ProjectRef & { kind: "projectField"; field: ProjectField; value: string | null });

// Kept in memory too: some desktop webviews don't hand dataTransfer data to drop
let current: DataSourceDragPayload | null = null;

export function startDataSourceDrag(event: DragEvent, payload: DataSourceDragPayload): void {
  current = payload;
  if (!event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "copy";
  const mime = payload.kind === "projectField" ? PROJECT_FIELD_MIME : DATA_SOURCE_MIME;
  event.dataTransfer.setData(mime, JSON.stringify(payload));
}

export function endDataSourceDrag(): void {
  current = null;
}

// A table source or column (something a table takes)
export function isDataSourceDrag(event: DragEvent): boolean {
  if (current) return current.kind !== "projectField";
  return !!event.dataTransfer?.types.includes(DATA_SOURCE_MIME);
}

// The dragged item, if this drag came from the "Report Data" list
export function readDataSourceDrag(event: DragEvent): DataSourceDragPayload | null {
  if (current) return current;
  try {
    const raw =
      event.dataTransfer?.getData(DATA_SOURCE_MIME) ||
      event.dataTransfer?.getData(PROJECT_FIELD_MIME);
    return raw ? (JSON.parse(raw) as DataSourceDragPayload) : null;
  } catch {
    return null;
  }
}
