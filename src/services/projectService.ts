// The CDP projects API (plain calls, like the CDP app's projectApi): a page
// of the list (searched by name or code) and one project, read the way the CDP
// app reads entity lists (jmixService.ts), with the user's login:
//   GET {VITE_API_BASE_URL}/v2/table/cdp_Project   fetch plan project-details-fp
// Each row is a whole CDP Project (types/entities, copied from the CDP app);
// toProjectDetails turns one
// into the details (name, code, status, manager, scope) and the place Report
// Data offers to drag. Caching is TanStack Query's: queries/projects.ts.

import i18n, { LOCALE_TAGS, type AppLocale } from "@/i18n";
import { Entity } from "@/types/entity";
import type { Project } from "@/types/entities";
import type { ProjectDetails, ProjectField, ProjectLocation, ProjectSummary, ProjectTable } from "@/types/dataSource";
import { JMIX_PAGE_SIZE, jmixList, type JmixListResponse } from "./jmixService";

const t = i18n.global.t;
const te = i18n.global.te;

// The CDP app's fetch plans: project-list-fp has only the list's columns;
// project-details-fp the whole project (what its project page reads, with
// dynamic attributes), which Report Data needs
const PROJECT_FETCH_PLAN = "project-details-fp";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// How the designer names a project (kept in templates as com.cdp.projects):
// its UUID. The list doesn't send `id` yet, so until it does the project's own
// reference (projectId) stands in; lookups accept either.
export const projectKey = (project: Project): string => project.id || project.projectId || "";

export const toProjectSummary = (project: Project): ProjectSummary => ({
  id: projectKey(project),
  name: project.projectTitle || project.projectId || projectKey(project),
  code: project.projectId || "",
});

export interface ProjectListParams {
  offset?: number;
}

// Every project request asks for one page of this size (never fewer)
const PAGE_SIZE = JMIX_PAGE_SIZE;

// One page of the projects, A to Z by name; rows without a key are left out.
// Never filtered: searching is done in the browser (queries/projects.ts)
async function list({ offset = 0 }: ProjectListParams = {}, signal?: AbortSignal): Promise<JmixListResponse<Project>> {
  const page = await jmixList<Project>(
    Entity.PROJECT,
    {
      limit: PAGE_SIZE,
      offset,
      sort: [{ id: "projectTitle", desc: false }],
      fetchPlan: PROJECT_FETCH_PLAN,
      dynamicAttributes: true,
    },
    signal,
  );
  return { ...page, rows: page.rows.filter((p) => p && projectKey(p)) };
}

// One project by its key (UUID, or its own reference while the list has no id):
// the same page request, filtered to that project
async function getByKey(key: string, signal?: AbortSignal): Promise<Project | null> {
  const { rows } = await jmixList<Project>(
    Entity.PROJECT,
    {
      limit: PAGE_SIZE,
      filter: { conditions: [{ property: UUID_PATTERN.test(key) ? "id" : "projectId", operator: "=", value: key }] },
      fetchPlan: PROJECT_FETCH_PLAN,
      dynamicAttributes: true,
    },
    signal,
  );
  return rows.find((p) => projectKey(p) === key) ?? rows[0] ?? null;
}

export const projectApi = { list, getByKey };

// The details Report Data offers, in the CDP project form's order
const DETAIL_FIELDS: { key: string; type: ProjectField["type"] }[] = [
  { key: "name", type: "text" },
  { key: "code", type: "text" },
  { key: "status", type: "text" },
  { key: "manager", type: "text" },
  { key: "startDate", type: "text" },
  { key: "finishDate", type: "text" },
  { key: "description", type: "longText" },
  { key: "scope", type: "longText" },
  { key: "milestones", type: "longText" },
];

// The project form's rich texts (scope, milestones): printed as plain text, a line per paragraph
function htmlToText(html: string): string {
  if (!html.includes("<")) return html.trim();
  const withBreaks = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
  const text = new DOMParser().parseFromString(withBreaks, "text/html").body.textContent ?? "";
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

// The status as the CDP app shows it ("Planned", "On Hold")
function statusLabel(status: string): string {
  const key = `reportData.projectStatus.${status.toLowerCase()}`;
  if (te(key)) return t(key);
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}

// Empty texts count as no value (dropping one is refused with a message)
const valueOrNull = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

const richText = (html: string | null | undefined) => (html ? valueOrNull(htmlToText(html)) : null);

// A date as people write it ("15 Jan 2025"), in the app's language
function dateText(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return valueOrNull(value);
  const locale = LOCALE_TAGS[i18n.global.locale.value as AppLocale] ?? LOCALE_TAGS.en;
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function projectLocation(project: Project): ProjectLocation | null {
  const location: ProjectLocation = {
    country: valueOrNull(project.country),
    state: valueOrNull(project.state),
    city: valueOrNull(project.city),
    address: valueOrNull(project.projectLocation),
    latitude: valueOrNull(project.latitude),
    longitude: valueOrNull(project.longitude),
  };
  return Object.values(location).some((v) => v !== null) ? location : null;
}

const cellText = (value: unknown) => (value === null || value === undefined ? "" : String(value).trim());

// A phone number as the CDP app shows it ("+82 3498655467")
const phone = (dialCode?: string, mobileNo?: string) => [dialCode, mobileNo].map(cellText).filter(Boolean).join(" ");

// An amount with two decimals ("50,064,306.96"); contracts carry no currency
function amount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const locale = LOCALE_TAGS[i18n.global.locale.value as AppLocale] ?? LOCALE_TAGS.en;
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// The project's lists as typed tables (headings in the app's language), and
// its manager as a card: a label and its value per row
function projectTables(project: Project): ProjectTable[] {
  const col = (key: string) => t(`reportData.columns.${key}`);
  const manager = project.projectManager;
  const managerRows = manager
    ? [
        [col("name"), cellText(manager.name)],
        [col("designation"), cellText(manager.designation)],
        [col("email"), cellText(manager.email)],
        [col("phone"), phone(manager.dialCode, manager.mobileNo)],
        [col("country"), cellText(manager.country)],
      ].filter(([, value]) => value)
    : [];
  return [
    {
      key: "manager",
      label: t("reportData.projectTables.manager"),
      columns: [],
      shares: [35, 65],
      rows: managerRows,
      card: true,
    },
    {
      key: "team",
      label: t("reportData.projectTables.team"),
      columns: ["name", "designation", "email", "phone", "country"].map(col),
      shares: [22, 20, 26, 18, 14],
      rows: (project.projectTeams ?? []).map((m) => [
        cellText(m.name),
        cellText(m.designation),
        cellText(m.email),
        phone(m.dialCode, m.mobileNo),
        cellText(m.country),
      ]),
    },
    {
      key: "companies",
      label: t("reportData.projectTables.companies"),
      columns: ["name", "businessTypes", "email", "phone", "country", "website"].map(col),
      shares: [20, 18, 20, 15, 12, 15],
      rows: (project.companies ?? []).map((c) => [
        cellText(c.name),
        (c.businessTypes ?? []).map((b) => cellText(b.name)).filter(Boolean).join(", "),
        cellText(c.email),
        phone(c.dialCode, c.mobileNo),
        cellText(c.country),
        cellText(c.website),
      ]),
    },
    {
      key: "contracts",
      label: t("reportData.projectTables.contracts"),
      columns: ["contract", "contractNumber", "contractType", "originalSum", "adjustedSum", "startDate", "finishDate"].map(col),
      shares: [20, 9, 8, 17, 17, 14, 15],
      rows: (project.contracts ?? []).map((c) => [
        cellText(c.contractName),
        cellText(c.contractNumber),
        cellText(c.contractType),
        amount(c.originalContractSum),
        amount(c.adjustedContractSum),
        dateText(c.contractStartDate) ?? "",
        dateText(c.contractFinishDate) ?? "",
      ]),
    },
  ];
}

// The project's own fields (dynamic attributes: "+<tenant>_<id>" keys). Their
// names aren't sent yet, so each is offered by its value only
function moreDetails(project: Project): { fields: ProjectField[]; values: Record<string, string> } {
  const fields: ProjectField[] = [];
  const values: Record<string, string> = {};
  Object.entries(project as unknown as Record<string, unknown>)
    .filter(([key, value]) => key.startsWith("+") && (typeof value === "string" || typeof value === "number"))
    .forEach(([, value], i) => {
      const text = cellText(value);
      if (!text) return;
      const key = `more.${i}`;
      fields.push({ key, label: text, type: "text" });
      values[key] = text;
    });
  return { fields, values };
}

// A project's details for Report Data, under the key it is known by. Labels
// are built on each call, so they follow the app's language
export function toProjectDetails(project: Project, key = projectKey(project)): ProjectDetails {
  const values: Record<string, string | null> = {
    name: valueOrNull(project.projectTitle),
    code: valueOrNull(project.projectId),
    status: project.status ? statusLabel(project.status) : null,
    manager: valueOrNull(project.projectManager?.name),
    startDate: dateText(project.startDate),
    finishDate: dateText(project.finishDate),
    description: richText(project.description),
    scope: richText(project.projectScope),
    milestones: richText(project.contractualMilestones),
  };
  const more = moreDetails(project);
  return {
    ...toProjectSummary(project),
    id: key,
    fields: DETAIL_FIELDS.map(({ key: field, type }) => ({ key: field, type, label: t(`reportData.fields.${field}`) })),
    values: { ...values, ...more.values },
    location: projectLocation(project),
    tables: projectTables(project),
    moreDetails: more.fields,
  };
}
