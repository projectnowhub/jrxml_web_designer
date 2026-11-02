// Project details (Report Data) on the page. A text detail dragged onto the
// page is a Text element linked to the template's project (utils/projectValue.ts):
// it shows that project's value and follows it when the template's project
// changes. Dropped on a barcode, the value is copied (a barcode holds a fixed
// code its type must accept); the logo is copied as a fixed picture.
//
// The report's chosen projects are the `com.cdp.projects` report property.

import type { Band, BarcodeElement, DesignElement, FrameElement } from "@/types";
import { checkBarcodeValue, toBarcodeExpression } from "./barcode/barcodeTypes";
import { setImageCrop, setImageName } from "./elementUtils";
import { isPagination } from "./paginationPresets";
import { isDateElement } from "./dateElement";
import { isLocationElement, isLocationPart } from "./location/locationElement";
import { isLinkableField, linkProjectValue } from "./projectValue";
import type { ChartBinding, ProjectField, ReportProject, TableDataBinding } from "@/types/dataSource";

export const REPORT_PROJECTS_PROPERTY = "com.cdp.projects";

// The project's whole location (a Location element) or one of its fields
export const isLocationField = (field: ProjectField) => field.type === "location" || field.key.startsWith("location.");

// Whether a project detail can be dropped onto an existing item: text details
// onto a text item (not a page number or a date) or onto a barcode whose type can hold
// the value, an image (the logo) onto an image item, the location or one of
// its fields onto a Location (it changes the place)
export function canTakeProjectField(element: DesignElement, field: ProjectField, value?: string | null): boolean {
  if (isLocationElement(element) || isLocationPart(element)) return isLocationField(field);
  if (field.type === "location") return false;
  if (element.type === "image") return field.type === "image";
  if (element.type === "textField") return field.type !== "image" && !isPagination(element) && !isDateElement(element);
  if (element.type === "barcode") return field.type !== "image" && (value == null || !projectValueProblem(element, value));
  return false;
}

// Why a barcode can't hold a detail's value, or null when it can
export function projectValueProblem(element: BarcodeElement, value: string) {
  return checkBarcodeValue(element.barcodeType, value.trim());
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
    if (isLinkableField(field)) {
      // Linked: shows the project's value, follows the template's project
      linkProjectValue(element, field, value);
      return;
    }
    // Stored like typed text (the generator escapes it), as plain text: not
    // HTML, so "<" and "&" print as written and line breaks are kept
    element.markup = "none";
    element.expression = `"${value.replace(/\r\n|\r|\n/g, "\\n")}"`;
    // Long texts (introductions) grow downwards instead of being cut off
    if (field.type === "longText") element.textAdjust = "StretchHeight";
  } else if (element.type === "barcode") {
    element.codeExpression = toBarcodeExpression(value.trim());
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

// The template moves to another project: every data table, project list and
// chart reads that project from now on (linked texts and places follow it
// through the sync). Returns how many were moved.
export function moveReportToProject(bands: Band[], project: ReportProject): number {
  let moved = 0;
  for (const element of allElements(bands)) {
    if (element.type !== "table" && element.type !== "chart") continue;
    const binding = (element as { binding?: TableDataBinding | ChartBinding }).binding;
    if (!binding?.projectId || binding.projectId === project.id) continue;
    binding.projectId = project.id;
    binding.projectName = project.name;
    moved++;
  }
  return moved;
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
