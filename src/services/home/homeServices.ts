import apiClient from "../apiClient";
import type { ReportVerifyResponse } from "@/types/template";

export const getTemplates = async () => {
  return await apiClient.get<ReportVerifyResponse>('rest/reports/report');
};
