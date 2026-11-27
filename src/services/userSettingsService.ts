// The signed-in user's Default Settings on the server (one row per user,
// cdp_UserReportTemplateSetting, the settings JSON as text in `value`).
// Caching is TanStack Query's (queries/userSettingsQueries.ts).
//
//   1. Read   GET /v1/user-report-template-settings/current                    getCurrentUserTemplateSettings
//   2. Save   PUT /rest/entities/cdp_UserReportTemplateSetting/{id}  { tenantId, value }  putUserTemplateSettings

import apiClient, { unwrap } from "./apiClient";
import { API_ROUTES } from "@/config/apiConfig";
import type { ApiResponse } from "@/types/api";
import type { UserReportTemplateSetting, UserReportTemplateSettingUpdate } from "@/types/settingsJson";

// 1. The user's row (null when the server answers nothing)
export async function getCurrentUserTemplateSettings(): Promise<UserReportTemplateSetting | null> {
  const body = await apiClient.get<ApiResponse<UserReportTemplateSetting | null> | undefined>(
    API_ROUTES.currentUserTemplateSettings,
  );
  return body ? unwrap(body) ?? null : null;
}

// 2. Saves the whole settings JSON (as text) into the user's row
export async function putUserTemplateSettings(id: string, update: UserReportTemplateSettingUpdate): Promise<void> {
  await apiClient.put<void>(
    `${API_ROUTES.userTemplateSettingEntity}/${encodeURIComponent(id)}`,
    JSON.stringify(update),
    { responseType: "text" },
  );
}
