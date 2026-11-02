// Properties config API: the user's saved settings, the CDP app's
// PropertiesConfigAPI (packages/core/api/src/propertieconfig/propertiesConfig.api.ts).
// This app's are sent with appName CDP_REPORT_STUDIO (stores/userSettings.ts
// reads and writes them).
//
//   1. Settings      GET  /v2/table/cdp_PropertiesConfig   getPropertiesConfig
//   2. Save setting  PUT  /v2/properties-config            putPropertiesConfig

import apiClient, { unwrap } from "./apiClient";
import { API_ROUTES } from "@/config/apiConfig";
import { PROPERTIES_CONFIG_LIMIT } from "@/constants/userSettingsConstants";
import type { ApiResponse } from "@/types/api";
import type { PropertiesConfigRow, PropertiesConfigSave } from "@/types/propertiesConfig";
import { buildJmixListQuery } from "./helpers/jmixListHelpers";

// ---- 1. Settings ----------------------------------------------------------------

// Every saved setting of the signed-in user (one request, as the CDP app: up to 500)
export async function getPropertiesConfig(signal?: AbortSignal): Promise<PropertiesConfigRow[]> {
  const rows = unwrap(
    await apiClient.get<ApiResponse<PropertiesConfigRow[]>>(
      `${API_ROUTES.propertiesConfig}?${buildJmixListQuery({ limit: PROPERTIES_CONFIG_LIMIT })}`,
      { signal },
    ),
  );
  if (!Array.isArray(rows)) throw new Error("The properties config is not a list");
  return rows.filter((row) => row && typeof row.key === "string" && typeof row.value === "string");
}

// ---- 2. Save setting ------------------------------------------------------------

// One setting of the signed-in user, created or replaced by its app and key
export async function putPropertiesConfig(setting: PropertiesConfigSave): Promise<void> {
  await apiClient.put<ApiResponse<PropertiesConfigRow>>(API_ROUTES.propertiesConfigSave, JSON.stringify(setting));
}
