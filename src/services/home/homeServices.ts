import apiClient from "../apiClient";

export const getTemplates = async () => {
  return await apiClient.get<{ isVerified?: boolean }>('rest/reports/report');
};
