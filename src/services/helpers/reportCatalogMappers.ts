// Report catalogue helpers: the list request of the Report Definitions, a
// definition as the Templates page shows it, a run's file name and a failed
// call's message. No API calls here.

import { ApiError } from "../apiClient";
import type { ApiErrorBody } from "@/types/api";
import type { JmixListParams } from "@/types/jmix";
import type { ReportDefinition, ReportDefinitionQuery, ReportDefinitionSummary } from "@/types/reportCatalog";
import { REPORT_DEFINITION_PAGE_SIZE } from "@/constants/reportCatalogConstants";

// A FileRef's own file name: "fs://2026/11/04/x.zip?name=Monthly%20report.zip" → "Monthly report.zip"
export function reportFileName(fileRef: string | undefined): string {
  if (!fileRef) return "";
  const name = new URLSearchParams(fileRef.split("?")[1] ?? "").get("name");
  return name || fileRef.split("?")[0]!.split("/").pop() || "";
}

// The list request of a page: newest edits first unless asked; a search
// matches every word in the name (Jmix `contains`, any case)
export function toReportDefinitionListParams({
  page = 1,
  size = REPORT_DEFINITION_PAGE_SIZE,
  q = "",
  sort = "lastModifiedDate",
  dir = "desc",
}: ReportDefinitionQuery): JmixListParams {
  const words = q.trim().split(/\s+/).filter(Boolean);
  return {
    limit: size,
    offset: (Math.max(1, page) - 1) * size,
    sort: [{ id: sort, desc: dir === "desc" }],
    ...(words.length
      ? { filter: { group: "AND", conditions: words.map((word) => ({ property: "name", operator: "contains", value: word })) } }
      : {}),
  };
}

export function toReportDefinitionSummary(definition: ReportDefinition): ReportDefinitionSummary {
  return {
    id: definition.id,
    name: definition.name || definition._instanceName || reportFileName(definition.reportFile) || definition.id,
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
