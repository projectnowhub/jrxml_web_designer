// A project detail linked to the template's project: a Text element that
// shows the project's value (name, status, a user-defined field…) and follows
// it, so the same template prints the right value for another project. The
// link is kept as JSON in the `com.cdp.projectValue` property: which detail
// (its Report Data key), its label, and in the designer the value last read
// from the project (so the canvas and undo agree; syncProjectValues refreshes it).
//
// In the JRXML the text is `$P{cdp_project_status}`, a String parameter whose
// default is that value, so the file prints on its own; a backend running the
// template passes the project's value for the parameter, which replaces the
// default. The value is written once, as that default: the property in the
// JRXML holds only key, label and long (linkForJrxml), and the parser reads
// the value back from the default (restoreProjectValueDefaults).
// "Type my own text instead" turns it into plain text (unlinkProjectValue).

import type { Band, DesignElement, FrameElement, TextFieldElement } from "@/types";
import type { ProjectDetails, ProjectField } from "@/types/dataSource";
import { javaString, readJavaString } from "./jrxml/javaString";
import { formatIsoDay } from "./dateElement";

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
  // A date (start / finish), like the Date element: its look (a DAY_FORMATS
  // id; none = PROJECT_DATE_FORMAT) and words printed before it
  format?: string;
  before?: string;
}

type WithProperties = { type?: string; properties?: Array<{ name?: string; value?: string }> };

// Every parameter name starts with this; the parser drops them (the generator writes them again)
export const PROJECT_PARAM_PREFIX = "cdp_";

const PROJECT_KEYS = ["name", "code", "status", "manager", "startDate", "finishDate", "description", "scope", "milestones"];

// The project's dates: shown in a look the user picks, like the Date element
const PROJECT_DATE_KEYS = ["startDate", "finishDate"];
export const isProjectDateKey = (key: string) => PROJECT_DATE_KEYS.includes(key);
// The look a linked date starts with ("22 May 2026")
export const PROJECT_DATE_FORMAT = "dayShortMonthYear";

// The JRXML parameter holding a detail ("cdp_project_status", "cdp_udf_BANK_NAME",
// "cdp_location_city"); only letters, digits and "_"
export function projectParamName(key: string): string {
  const safe = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "_");
  if (key.startsWith("more.")) return `${PROJECT_PARAM_PREFIX}udf_${safe(key.slice(5))}`;
  if (key.startsWith("location.")) return `${PROJECT_PARAM_PREFIX}location_${safe(key.slice(9))}`;
  return `${PROJECT_PARAM_PREFIX}project_${safe(key)}`;
}

// The parameter of one linked text: a date in another look than the first one
// gets its own ("cdp_project_startDate_numeric"), since the value is the
// date written in that look
export function linkParamName(link: Pick<ProjectValueLink, "key" | "format">): string {
  const base = projectParamName(link.key);
  return isProjectDateKey(link.key) && link.format && link.format !== PROJECT_DATE_FORMAT ? `${base}_${link.format}` : base;
}

// The expression of a linked text: its parameter, with the words before it
// (nothing at all when the project has no value)
function linkExpression(link: ProjectValueLink): string {
  const param = `$P{${linkParamName(link)}}`;
  const before = link.before?.trim();
  return before ? `(${param} == null ? null : ${javaString(`${before} `)} + ${param})` : param;
}

// What a linked text shows: the words before it and the value (null when none)
export function linkShownText(link: ProjectValueLink): string | null {
  if (!link.value) return null;
  const before = link.before?.trim();
  return before ? `${before} ${link.value}` : link.value;
}

// Whether a detail can be linked (a text detail; not the logo, nor the whole place)
export const isLinkableField = (field: ProjectField) =>
  field.type === "text" || field.type === "longText"
    ? PROJECT_KEYS.includes(field.key) || /^(more|location)\.[^.]+$/.test(field.key)
    : false;

// A detail's value in a project's details (null when it has none); a date in
// the given look (`format`, a DAY_FORMATS id)
export function projectValueOf(details: ProjectDetails | null | undefined, key: string, format?: string): string | null {
  if (!details) return null;
  const day = isProjectDateKey(key) ? details.dates?.[key] : null;
  if (day) return formatIsoDay(day, format ?? PROJECT_DATE_FORMAT);
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
      ...(typeof v.format === "string" && v.format ? { format: v.format } : {}),
      ...(typeof v.before === "string" && v.before.trim() ? { before: v.before } : {}),
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
  element.expression = linkExpression(link);
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

// The element's properties as written to the JRXML: a link without its value
// (the value is the parameter's default, written once)
export function linkForJrxml<T extends { name?: string; value?: string }>(properties: T[]): T[] {
  return properties.map((p) => {
    if (p?.name !== PROJECT_VALUE_PROPERTY || !p.value) return p;
    const link = getProjectValueLink({ properties: [p] });
    if (!link) return p;
    const { value: _value, ...written } = link;
    return { ...p, value: JSON.stringify(written) };
  });
}

// On import: each linked text's value from its parameter's default (`defaults`
// = parameter name → default expression)
export function restoreProjectValueDefaults(bands: Band[], defaults: Map<string, string>): void {
  for (const element of projectValueElements(bands)) {
    const link = getProjectValueLink(element);
    const expression = link ? defaults.get(linkParamName(link)) : undefined;
    if (!link || expression === undefined) continue;
    const value = readJavaString(expression);
    setProjectValueLink(element, { ...link, value: value?.trim() ? value : null });
  }
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
  element.expression = `"${((link && linkShownText(link)) ?? "").replace(/\r\n|\r|\n/g, "\\n")}"`;
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
    const value = projectValueOf(details, link.key, link.format);
    if (value !== link.value || element.expression !== linkExpression(link)) {
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
    const name = linkParamName(link);
    if (!seen.has(name)) seen.set(name, link.value);
  }
  return [...seen].map(([name, value]) => ({ name, value }));
}
