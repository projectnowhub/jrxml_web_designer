import apiClient from "../services/apiClient";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../services/apiClient";

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) !== null;
};

export const getClientId = (): string => {
  const parts = window.location.hostname.split(".");

  return parts.length >= 2 ? (parts[0] ?? "") : "";
};

export const getTenantIdFromUrl = (tenantUrl: string): string | null => {
  try {
    const hostnameParts = new URL(tenantUrl).hostname.split(".");

    return hostnameParts[0] || null;
  } catch {
    return null;
  }
};

export const verifyTenant = async (tenantId: string): Promise<boolean> => {
  const result = await apiClient.get<{ isVerified?: boolean }>(
    `/v1/tenant/verify?tenantId=${encodeURIComponent(tenantId)}`,
  );

  return result.isVerified === true;
};

export const verifyTenantSession = async (): Promise<boolean> => {
  const tenantId = getClientId();

  return verifyTenant(tenantId);
};

export const getStoredUser = (): {
  firstName?: string;
  name?: string;
  username?: string;
  email?: string;
} => {
  const storedUser = localStorage.getItem(AUTH_USER_KEY);

  if (!storedUser) {
    return {};
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    return {};
  }
};
