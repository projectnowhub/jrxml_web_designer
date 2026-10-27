// Properties config API: the user's saved settings of the CDP app (each
// table's column order, widths, hidden columns…), read the way the CDP app
// reads them at login (cdp-fe-app PropertiesConfigAPI.get, propertiesConfigSync.ts).
// Only read here: the designer never writes them back (no PUT /v2/properties-config).
//
//   1. Settings   GET  /rest/entities/cdp_PropertiesConfig   getPropertiesConfig
//
// Stored and used by stores/columnOrder.ts.

import apiClient, { unwrap } from "./apiClient";
import { API_ROUTES } from "@/config/apiConfig";
import { PROPERTIES_CONFIG_LIMIT } from "@/constants/reportDataConstants";
import type { ApiResponse } from "@/types/api";
import type { PropertiesConfigRow } from "@/types/propertiesConfig";
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
