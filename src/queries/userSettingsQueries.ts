// The signed-in user's Default Settings row on the server, through TanStack
// Query: read when they sign in or the app starts (stores/userSettings.ts
// puts it into this browser), saved after each change.
import { queryOptions } from "@tanstack/vue-query";
import { getCurrentUserTemplateSettings, putUserTemplateSettings } from "@/services/userSettingsService";
import { getTenantId } from "@/services/apiClient";
import type { UserReportTemplateSetting } from "@/types/settingsJson";
import { queryClient } from "./queryClient";
import { userSettingsKeys } from "./queryKeys";

// Always read fresh (another browser may have changed them)
export const userTemplateSettingsQuery = () =>
  queryOptions({
    queryKey: userSettingsKeys.current(),
    queryFn: () => getCurrentUserTemplateSettings(),
    staleTime: 0,
  });

export const fetchUserTemplateSettings = () => queryClient.fetchQuery(userTemplateSettingsQuery());

// Saves the settings JSON text into the user's row, with its tenant (the
// row's own, else the app's, the one sent as the tenantId header); the cached
// row follows
export async function saveUserTemplateSettings(id: string, value: string): Promise<void> {
  const row = queryClient.getQueryData<UserReportTemplateSetting | null>(userSettingsKeys.current());
  const tenantId = row?.tenantId || getTenantId();
  await putUserTemplateSettings(id, { tenantId, value });
  queryClient.setQueryData<UserReportTemplateSetting | null>(userSettingsKeys.current(), (cached) => ({
    ...(cached ?? {}),
    id,
    tenantId,
    value,
  }));
}
