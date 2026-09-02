export const AUTH_STORAGE_KEY = "jrxml_auth_token";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) !== null;
}

export function getClientId() {
  const parts = window.location.hostname.split('.');
  return parts.length >= 2 ? (parts[0] ?? "") : "";
}

export async function verifyTenantSession() {
  const tenantId = getClientId();

  const response = await fetch(
    `https://projectnow-dev.ipecsystems.com/v1/tenant/verify?tenantId=${encodeURIComponent(tenantId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Tenant verification failed: ${response.status}`);
  }

  const result = (await response.json()) as { isVerified?: boolean };

  return result.isVerified === true;
}
