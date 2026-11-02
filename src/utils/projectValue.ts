// A project detail linked to the template's project: a Text element that
// shows the project's value (name, status, a user-defined field…) and follows
// it, so the same template prints the right value for another project. The
// link is kept as JSON in the `com.cdp.projectValue` property: which detail
// (its Report Data key), its label, and the value last read from the project
// (so the canvas, the JRXML and undo agree; syncProjectValues refreshes it).
//
// In the JRXML the text is `$P{cdp_project_status}`, a String parameter whose
// default is that value. Preview PDF passes the current value as a parameter;
// a backend running the template for another project passes that project's.
// "Type my own text instead" turns it into plain text (unlinkProjectValue).

import type { Band, DesignElement, FrameElement, TextFieldElement } from "@/types";
import type { ProjectDetails, ProjectField } from "@/types/dataSource";

export const PROJECT_VALUE_PROPERTY = "com.cdp.projectValue";

export interface ProjectValueLink {
  // Report Data's key: name, code, status, manager, startDate, finishDate,
  // description, scope, milestones, more.<code>, location.<field>
  key: string;
  // The detail's name as Report Data showed it ("Status", "BANK NAME")
  label: string;
  // The value last read from the project; null when it has none
  value: string | null;
  // Long texts (introductions, scope) grow downwards
  long?: boolean;
}

type WithProperties = { type?: string; properties?: Array<{ name?: string; value?: string }> };

// Every parameter name starts with this; the parser drops them (the generator writes them again)
export const PROJECT_PARAM_PREFIX = "cdp_";

const PROJECT_KEYS = ["name", "code", "status", "manager", "startDate", "finishDate", "description", "scope", "milestones"];

// The JRXML parameter holding a detail ("cdp_project_status", "cdp_udf_BANK_NAME",
// "cdp_location_city"); only letters, digits and "_"
export function projectParamName(key: string): string {
  const safe = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "_");
  if (key.startsWith("more.")) return `${PROJECT_PARAM_PREFIX}udf_${safe(key.slice(5))}`;
  if (key.startsWith("location.")) return `${PROJECT_PARAM_PREFIX}location_${safe(key.slice(9))}`;
  return `${PROJECT_PARAM_PREFIX}project_${safe(key)}`;
}

// Whether a detail can be linked (a text detail; not the logo, nor the whole place)
export const isLinkableField = (field: ProjectField) =>
  field.type === "text" || field.type === "longText"
    ? PROJECT_KEYS.includes(field.key) || /^(more|location)\.[^.]+$/.test(field.key)
    : false;

// A detail's value in a project's details (null when it has none)
export function projectValueOf(details: ProjectDetails | null | undefined, key: string): string | null {
  if (!details) return null;
  let value: string | number | null | undefined;
  if (key.startsWith("location.")) value = details.location?.[key.slice(9) as keyof NonNullable<ProjectDetails["location"]>];
  else value = details.values[key];
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  // A coordinate of 0 means "not set" (as Report Data shows it)
  if ((key === "location.latitude" || key === "location.longitude") && Number(text) === 0) return null;
  return text || null;
}

export function isProjectValue(element: unknown): boolean {
  const el = element as WithProperties | undefined;
  return el?.type === "textField" && !!el.properties?.some((p) => p?.name === PROJECT_VALUE_PROPERTY);
}

export function getProjectValueLink(element: WithProperties): ProjectValueLink | null {
  const raw = element.properties?.find((p) => p?.name === PROJECT_VALUE_PROPERTY)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ProjectValueLink>;
    if (typeof v.key !== "string" || !v.key) return null;
    return {
      key: v.key,
      label: typeof v.label === "string" ? v.label : v.key,
      value: typeof v.value === "string" ? v.value : null,
      ...(v.long ? { long: true } : {}),
    };
  } catch {
    return null;
  }
}

// Write a link to a text element: its property and expression. Changes the
// element in place (the caller records the undo step).
export function setProjectValueLink(element: TextFieldElement, link: ProjectValueLink): void {
  const others = (element.properties ?? []).filter((p) => p?.name !== PROJECT_VALUE_PROPERTY);
  element.properties = [...others, { name: PROJECT_VALUE_PROPERTY, value: JSON.stringify(link) }];
  element.expression = `$P{${projectParamName(link.key)}}`;
  // Plain text: a "<" or "&" in a project's value prints as written
  element.markup = "none";
  element.isBlankWhenNull = true;
  if (link.long) element.textAdjust = "StretchHeight";
}

// A dropped detail: the text shows the project's value and follows the project
export function linkProjectValue(element: TextFieldElement, field: ProjectField, value: string | null): void {
  setProjectValueLink(element, {
    key: field.key,
    label: field.label,
    value: value?.trim() ? value.trim() : null,
    ...(field.type === "longText" ? { long: true } : {}),
  });
}

// On import: rebuild the expression from the stored link
export function restoreProjectValue(element: DesignElement): boolean {
  const link = isProjectValue(element) ? getProjectValueLink(element as WithProperties) : null;
  if (!link) return false;
  setProjectValueLink(element as TextFieldElement, link);
  return true;
}

// "Type my own text instead": plain text showing the value it shows now
export function unlinkProjectValue(element: TextFieldElement): void {
  const link = getProjectValueLink(element);
  element.properties = (element.properties ?? []).filter((p) => p?.name !== PROJECT_VALUE_PROPERTY);
  if (element.properties.length === 0) delete element.properties;
  element.expression = `"${(link?.value ?? "").replace(/\r\n|\r|\n/g, "\\n")}"`;
  element.markup = "none";
}

// Every linked text of the report, boxes' contents included
export function* projectValueElements(bands: Band[]): Generator<TextFieldElement> {
  for (const band of bands) {
    for (const element of band.elements ?? []) {
      if (isProjectValue(element)) yield element as TextFieldElement;
      if (element.type === "frame") {
        for (const child of (element as FrameElement).elements ?? []) {
          if (isProjectValue(child)) yield child as TextFieldElement;
        }
      }
    }
  }
}

// The values of the template's project into its linked texts. Returns whether
// anything changed. Nothing changes while the project isn't loaded.
export function syncProjectValues(bands: Band[], details: ProjectDetails | null | undefined): boolean {
  if (!details) return false;
  let changed = false;
  for (const element of projectValueElements(bands)) {
    const link = getProjectValueLink(element);
    if (!link) continue;
    const value = projectValueOf(details, link.key);
    if (value !== link.value || element.expression !== `$P{${projectParamName(link.key)}}`) {
      setProjectValueLink(element, { ...link, value });
      changed = true;
    }
  }
  return changed;
}

// The report's parameters: one String per detail used, its default the value
// last read (so the JRXML also prints on its own), in order of first use
export function projectParameters(bands: Band[]): { name: string; value: string | null }[] {
  const seen = new Map<string, string | null>();
  for (const element of projectValueElements(bands)) {
    const link = getProjectValueLink(element);
    if (!link) continue;
    const name = projectParamName(link.key);
    if (!seen.has(name)) seen.set(name, link.value);
  }
  return [...seen].map(([name, value]) => ({ name, value }));
}
