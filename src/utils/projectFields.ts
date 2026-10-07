// Project details (Report Data) on the page. A detail dragged onto the page
// becomes ordinary content: its value as plain text in a Text element, or the
// logo as a fixed picture in an Image element. Nothing stays linked to the
// project; to show a newer value, the user drags the detail again.
//
// The report's chosen projects are the `com.cdp.projects` report property.

import type { Band, DesignElement, FrameElement } from "@/types";
import { setImageCrop, setImageName } from "./elementUtils";
import { isPagination } from "./paginationPresets";
import type { ChartBinding, ProjectField, ReportProject, TableDataBinding } from "@/types/dataSource";

export const REPORT_PROJECTS_PROPERTY = "com.cdp.projects";

// Whether a project detail can be dropped onto an existing item: text details
// onto a text item (not a page number), an image (the logo) onto an image item
export function canTakeProjectField(element: DesignElement, field: ProjectField): boolean {
  if (element.type === "image") return field.type === "image";
  if (element.type === "textField") return field.type !== "image" && !isPagination(element);
  return false;
}

// Put a detail's value into a text or image item. An existing item keeps its
// place, size and look; only its content changes.
export function applyProjectValue(
  element: DesignElement,
  project: ReportProject,
  field: ProjectField,
  value: string,
): void {
  if (element.type === "image") {
    // A crop was for the previous picture
    setImageCrop(element, null);
    setImageName(element, `${project.name} · ${field.label}`);
    // Same form as toImageExpression (services/imageService), not imported:
    // the generator reads this module and must not load the API client
    element.imageExpression = `"${value.replace(/"/g, "%22")}"`;
  } else if (element.type === "textField") {
    // Stored like typed text (the generator escapes it), as plain text: not
    // HTML, so "<" and "&" print as written and line breaks are kept
    element.markup = "none";
    element.expression = `"${value.replace(/\r\n|\r|\n/g, "\\n")}"`;
    // Long texts (introductions) grow downwards instead of being cut off
    if (field.type === "longText") element.textAdjust = "StretchHeight";
  }
}

// Size of a newly dropped project item
export function projectFieldSize(field: ProjectField): { width: number; height: number } {
  if (field.type === "image") return { width: 80, height: 80 };
  if (field.type === "longText") return { width: 420, height: 64 };
  return { width: 220, height: 20 };
}

// Every element on the report, boxes' contents included
function* allElements(bands: Band[]): Generator<DesignElement> {
  for (const band of bands) {
    for (const element of band.elements ?? []) {
      yield element;
      if (element.type === "frame") {
        for (const child of (element as FrameElement).elements ?? []) yield child;
      }
    }
  }
}

// How many tables and charts of the report use a project (it can't be removed then)
export function countProjectUsage(bands: Band[], projectId: string): number {
  let count = 0;
  for (const element of allElements(bands)) {
    const binding = (element as { binding?: TableDataBinding | ChartBinding }).binding;
    if ((element.type === "table" || element.type === "chart") && binding?.projectId === projectId) count++;
  }
  return count;
}

export function parseReportProjects(json: string | null | undefined): ReportProject[] {
  if (!json) return [];
  try {
    const list = JSON.parse(json);
    if (!Array.isArray(list)) return [];
    return list
      .filter((p) => typeof p?.id === "string" && p.id)
      .map((p) => ({ id: p.id, name: typeof p.name === "string" ? p.name : p.id }));
  } catch {
    return [];
  }
}
