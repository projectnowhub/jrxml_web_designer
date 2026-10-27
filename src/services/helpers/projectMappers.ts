// Project mappers: how the designer names a CDP project and turns one into
// what Report Data shows (summary, details, lists, place). No API calls here:
// the requests are in services/reportDataService.ts.

import i18n, { LOCALE_TAGS, type AppLocale } from "@/i18n";
import type { ProjectDetails, ProjectField, ProjectLocation, ProjectSummary, ProjectTable, ProjectRecord } from "@/types/dataSource";

const t = i18n.global.t;
const te = i18n.global.te;

// How the designer names a project (kept in templates as com.cdp.projects,
// and in tables' and charts' binding.projectId): its UUID, project.id
export const projectKey = (project: ProjectRecord): string => project.id;

export const toProjectSummary = (project: ProjectRecord): ProjectSummary => ({
  id: projectKey(project),
  name: project.projectTitle || project.projectId || projectKey(project),
  code: project.projectId || "",
});

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
function toStatusLabel(status: string): string {
  const key = `reportData.projectStatus.${status.toLowerCase()}`;
  if (te(key)) return t(key);
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}

// Empty texts count as no value (dropping one is refused with a message)
const textOrNull = (value: string | null | undefined) => (value?.trim() ? value.trim() : null);

const richTextOrNull = (html: string | null | undefined) => (html ? textOrNull(htmlToText(html)) : null);

// A date as people write it ("15 Jan 2025"), in the app's language
function formatProjectDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return textOrNull(value);
  const locale = LOCALE_TAGS[i18n.global.locale.value as AppLocale] ?? LOCALE_TAGS.en;
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function toProjectLocation(project: ProjectRecord): ProjectLocation | null {
  const location: ProjectLocation = {
    country: textOrNull(project.country),
    state: textOrNull(project.state),
    city: textOrNull(project.city),
    address: textOrNull(project.projectLocation),
    latitude: textOrNull(project.latitude),
    longitude: textOrNull(project.longitude),
  };
  return Object.values(location).some((v) => v !== null) ? location : null;
}

const toPlainText = (value: string | number | null | undefined) => (value === null || value === undefined ? "" : String(value).trim());

// A phone number as the CDP app shows it ("+82 3498655467")
const formatPhone = (dialCode?: string, mobileNo?: string) => [dialCode, mobileNo].map(toPlainText).filter(Boolean).join(" ");

// An amount with two decimals ("50,064,306.96"); contracts carry no currency
function formatAmount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  const locale = LOCALE_TAGS[i18n.global.locale.value as AppLocale] ?? LOCALE_TAGS.en;
  return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// The project's lists as typed tables (headings in the app's language), and
// its manager as a card: a label and its value per row
function toProjectLists(project: ProjectRecord): ProjectTable[] {
  const col = (key: string) => t(`reportData.columns.${key}`);
  const manager = project.projectManager;
  const managerRows = manager
    ? [
        [col("name"), toPlainText(manager.name)],
        [col("designation"), toPlainText(manager.designation)],
        [col("email"), toPlainText(manager.email)],
        [col("phone"), formatPhone(manager.dialCode, manager.mobileNo)],
        [col("country"), toPlainText(manager.country)],
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
        toPlainText(m.name),
        toPlainText(m.designation),
        toPlainText(m.email),
        formatPhone(m.dialCode, m.mobileNo),
        toPlainText(m.country),
      ]),
    },
    {
      key: "companies",
      label: t("reportData.projectTables.companies"),
      columns: ["name", "businessTypes", "email", "phone", "country", "website"].map(col),
      shares: [20, 18, 20, 15, 12, 15],
      rows: (project.companies ?? []).map((c) => [
        toPlainText(c.name),
        (c.businessTypes ?? []).map((b) => toPlainText(b.name)).filter(Boolean).join(", "),
        toPlainText(c.email),
        formatPhone(c.dialCode, c.mobileNo),
        toPlainText(c.country),
        toPlainText(c.website),
      ]),
    },
    {
      key: "contracts",
      label: t("reportData.projectTables.contracts"),
      columns: ["contract", "contractNumber", "contractType", "originalSum", "adjustedSum", "startDate", "finishDate"].map(col),
      shares: [20, 9, 8, 17, 17, 14, 15],
      rows: (project.contracts ?? []).map((c) => [
        toPlainText(c.contractName),
        toPlainText(c.contractNumber),
        toPlainText(c.contractType),
        formatAmount(c.originalContractSum),
        formatAmount(c.adjustedContractSum),
        formatProjectDate(c.contractStartDate) ?? "",
        formatProjectDate(c.contractFinishDate) ?? "",
      ]),
    },
  ];
}

const isDynamicAttribute = (key: string): key is `+${string}` => key.startsWith("+");

// The project's own fields (dynamic attributes: "+<tenant>_<id>" keys). Their
// names aren't sent yet, so each is offered by its value only
function toMoreDetails(project: ProjectRecord): { fields: ProjectField[]; values: Record<string, string> } {
  const fields: ProjectField[] = [];
  const values: Record<string, string> = {};
  Object.keys(project)
    .filter(isDynamicAttribute)
    .map((key) => project[key])
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .forEach((value, i) => {
      const text = toPlainText(value);
      if (!text) return;
      const key = `more.${i}`;
      fields.push({ key, label: text, type: "text" });
      values[key] = text;
    });
  return { fields, values };
}

// A project's details for Report Data, under the key it is known by. Labels
// are built on each call, so they follow the app's language
export function toProjectDetails(project: ProjectRecord, key = projectKey(project)): ProjectDetails {
  const values: Record<string, string | null> = {
    name: textOrNull(project.projectTitle),
    code: textOrNull(project.projectId),
    status: project.status ? toStatusLabel(project.status) : null,
    manager: textOrNull(project.projectManager?.name),
    startDate: formatProjectDate(project.startDate),
    finishDate: formatProjectDate(project.finishDate),
    description: richTextOrNull(project.description),
    scope: richTextOrNull(project.projectScope),
    milestones: richTextOrNull(project.contractualMilestones),
  };
  const more = toMoreDetails(project);
  return {
    ...toProjectSummary(project),
    id: key,
    fields: DETAIL_FIELDS.map(({ key: field, type }) => ({ key: field, type, label: t(`reportData.fields.${field}`) })),
    values: { ...values, ...more.values },
    location: toProjectLocation(project),
    tables: toProjectLists(project),
    moreDetails: more.fields,
  };
}
