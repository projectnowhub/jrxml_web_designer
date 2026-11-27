// Report catalogue helpers: the list request of the Report Definitions, a
// definition as the Templates page shows it, a run's file name, Preview PDF's
// run request and a failed call's message. No API calls here.

import { ApiError } from "../apiClient";
import type { ApiErrorBody } from "@/types/api";
import type { JmixCondition, JmixListParams } from "@/types/jmix";
import type {
  JmixReportParameterInfo,
  JmixReportRunRequest,
  ReportDefinition,
  ReportDefinitionQuery,
  ReportDefinitionSort,
  ReportDefinitionSummary,
} from "@/types/reportCatalog";
import {
  REPORT_DEFINITION_PAGE_SIZE,
  TENANT_REPORT_LIST_FETCH_PLAN,
} from "@/constants/reportCatalogConstants";
import { Entity } from "@/enums/entityName";

// A run parameter that takes a project (cdp_Project)
const isProjectParameter = (parameter: JmixReportParameterInfo) =>
  parameter.type === "ENTITY" && parameter.entityMetaClass === Entity.PROJECT;

// A FileRef's own file name: "fs://2026/11/04/x.zip?name=Monthly%20report.zip" → "Monthly report.zip"
export function reportFileName(fileRef: string | undefined): string {
  if (!fileRef) return "";
  const name = new URLSearchParams(fileRef.split("?")[1] ?? "").get("name");
  return name || fileRef.split("?")[0]!.split("/").pop() || "";
}

// rptadn_TenantReport's fields for each sort. The name shown is its Jmix
// report's name (report.name; names may repeat, the code is not shown)
const TEMPLATE_SORT_FIELDS: Record<ReportDefinitionSort, string> = {
  name: "report.name",
  createdDate: "createdDate",
  lastModifiedDate: "lastModifiedDate",
};

// The list request of a page: newest edits first unless asked; `isDefault`
// (when given) picks default templates or the tenant's own, `nameContains`
// those whose name contains the words
export function toReportDefinitionListParams({
  isDefault,
  nameContains,
  page = 1,
  size = REPORT_DEFINITION_PAGE_SIZE,
  sort = "lastModifiedDate",
  dir = "desc",
}: ReportDefinitionQuery): JmixListParams {
  const conditions: JmixCondition[] = [];
  if (isDefault !== undefined) conditions.push({ property: "isDefault", operator: "=", value: isDefault });
  if (nameContains) conditions.push({ property: TEMPLATE_SORT_FIELDS.name, operator: "contains", value: nameContains });
  return {
    fetchPlan: TENANT_REPORT_LIST_FETCH_PLAN,
    limit: size,
    offset: (Math.max(1, page) - 1) * size,
    sort: [{ id: TEMPLATE_SORT_FIELDS[sort], desc: dir === "desc" }],
    ...(conditions.length ? { filter: { conditions } } : {}),
  };
}

export function toReportDefinitionSummary(definition: ReportDefinition): ReportDefinitionSummary {
  return {
    id: definition.id,
    name: definition.report?.name || definition.name || definition.id,
    isDefault: definition.isDefault !== false,
    fileName: reportFileName(definition.reportFile),
    createdBy: definition.createdBy ?? "",
    createdAt: definition.createdDate ?? definition.lastModifiedDate ?? "",
    lastModified: definition.lastModifiedDate ?? definition.createdDate ?? "",
  };
}

// The file name in a Content-Disposition header (filename*= first), else `fallback`
export function contentDispositionFileName(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const encoded = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ""));
    } catch {
      // Not encoded after all: read the plain name below
    }
  }
  return /filename="?([^";]+)"?/i.exec(header)?.[1]?.trim() || fallback;
}

// What a failed call says: the server's own words when it sends them (Jmix
// Reports REST: { error, details }; the CDP backend: { message } …), else `fallback`
export async function reportServerErrorText(error: unknown, fallback: string): Promise<string> {
  if (!(error instanceof ApiError) || !error.response) return fallback;
  try {
    const text = await error.response.clone().text();
    try {
      const body = JSON.parse(text) as ApiErrorBody;
      const words = [body.error, body.details ?? body.detail ?? body.message].filter(Boolean);
      return words.length ? words.join(": ") : fallback;
    } catch {
      return text.trim() && text.length < 300 && !text.trim().startsWith("<") ? text.trim() : fallback;
    }
  } catch {
    return fallback;
  }
}

// Preview PDF's run of a template's Jmix report (POST /rest/reports/run/{id}):
// only the parameters, every project parameter (the report's inputParameters,
// read with the template) given the template's project. Null when the report
// needs a project and the template has none
export function toPreviewRunRequest(
  parameters: JmixReportParameterInfo[],
  projectId: string | undefined,
): JmixReportRunRequest | null {
  const projectParameters = parameters.filter(isProjectParameter);
  if (!projectId && projectParameters.some((parameter) => parameter.required)) return null;
  return {
    parameters: projectId ? projectParameters.map((parameter) => ({ name: parameter.alias, value: projectId })) : [],
  };
}
