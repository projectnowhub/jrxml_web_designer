export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem('jrxml_auth_token') !== null;
}

export function getClientId() {
  const parts = window.location.hostname.split(".");
  return parts.length >= 2 ? (parts[0] ?? "") : "";
}

export function getTenantIdFromUrl(tenantUrl: string): string | null {
  try {
    const hostnameParts = new URL(tenantUrl).hostname.split(".");
    return hostnameParts[0] || null;
  } catch {
    return null;
  }
}

export async function verifyTenant(tenantId: string): Promise<boolean> {
  const response = await fetch(
    `https://projectnow-dev.ipecsystems.com/v1/tenant/verify?tenantId=${encodeURIComponent(tenantId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Tenant verification failed: ${response.status}`);
  }

  const result = (await response.json()) as { isVerified?: boolean };
  return result.isVerified === true;
}

export async function verifyTenantSession() {
  const tenantId = getClientId();
  return verifyTenant(tenantId);
}
