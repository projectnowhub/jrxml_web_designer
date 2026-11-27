// Why a report server list failed, as one line for its failure box: the HTTP
// status and the server's own words ("HTTP 404 · Not Found"), or the browser's
// ("Failed to fetch": the server can't be reached or refuses this address).
// The Templates and Reports pages show it, so a missing endpoint is plain to see.

import { ref, watch, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { ApiError } from "@/services/apiClient";
import { reportServerErrorText } from "@/services/helpers/reportCatalogMappers";

export function useReportServerError(error: Ref<Error | null | undefined>): Ref<string> {
  const { t } = useI18n();
  const reason = ref("");
  watch(
    error,
    async (failure) => {
      if (!failure) {
        reason.value = "";
        return;
      }
      if (!(failure instanceof ApiError)) {
        reason.value = failure.message;
        return;
      }
      const words = await reportServerErrorText(failure, failure.response?.statusText || t("reportCatalog.errors.server"));
      if (error.value === failure) {
        reason.value = failure.status ? t("reportCatalog.errors.status", { status: failure.status, reason: words }) : words;
      }
    },
    { immediate: true },
  );
  return reason;
}
