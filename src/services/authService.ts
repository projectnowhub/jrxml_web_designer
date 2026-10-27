import {
  clearVerifier,
  generatePKCE,
  getClientId,
  getVerifier,
  saveVerifier,
} from "../utils/pkce";
import { openUrl } from "@tauri-apps/plugin-opener";
import apiClient, { ApiError, AUTH_TOKEN_KEY, AUTH_USER_KEY, getAccessToken, getTenantId } from "./apiClient";
import { AUTH_CONFIG } from "../config/auth.config";
import type { ApiErrorBody } from "@/types/api";
import type { AccessTokenClaims, AuthUser, LoginErrorQuery, LoginOptions, TokenResponse } from "@/types/auth";
import { isDesktopApp } from "@/utils/desktopApp";
import { queryClient } from "../queries/queryClient";
import { forgetLastProject } from "../utils/lastProject";

export const login = async (options: LoginOptions = {}): Promise<void> => {
  const clientId = getClientId(AUTH_CONFIG.clientId);
  const pkce = await generatePKCE();

  saveVerifier(pkce.verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    state: options.state ?? AUTH_CONFIG.state,
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    redirect_uri: AUTH_CONFIG.redirectUri,
  });

  window.location.href = `${AUTH_CONFIG.authUrl}?${params.toString()}`;
};

export const exchangeCode = async (code: string): Promise<string> => {
  const verifier = getVerifier();

  if (!verifier) {
    throw new Error("PKCE verifier not found. Login session may have expired.");
  }

  const clientId = getClientId(AUTH_CONFIG.clientId);

  const body = new URLSearchParams({
    code,
    code_verifier: verifier,
    client_id: clientId,
    redirect_uri: AUTH_CONFIG.redirectUri,
    grant_type: "authorization_code",
  });

  const data = await apiClient.post<TokenResponse>(AUTH_CONFIG.tokenUrl, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  clearVerifier();

  return data.access_token;
};

// The signed-in user. When it can't be read, the session usually belongs to
// another tenant (signed in there in the same browser): TenantSessionError
// says which one, and this app's tenant
export const fetchUser = async (): Promise<AuthUser> => {
  // Taken before the call: a 401 removes the stored token on its way to the login page
  const token = getAccessToken();
  try {
    return await apiClient.get<AuthUser>(AUTH_CONFIG.userUrl);
  } catch (error) {
    throw new TenantSessionError(await sessionTenantOf(error, token), getTenantId(), error);
  }
};

export class TenantSessionError extends Error {
  readonly sessionTenant: string;
  readonly appTenant: string;
  // The failed request's error
  readonly reason: unknown;

  constructor(sessionTenant: string, appTenant: string, reason: unknown) {
    super(`The user could not be read (session tenant "${sessionTenant}", this tenant "${appTenant}")`);
    this.sessionTenant = sessionTenant;
    this.appTenant = appTenant;
    this.reason = reason;
  }
}

// What the login page is told about a failed sign-in (it shows the tenant
// popup for a session in another tenant)
export const loginErrorQuery = (error: unknown): LoginErrorQuery =>
  error instanceof TenantSessionError
    ? { error: "tenantSession", sessionTenant: error.sessionTenant, appTenant: error.appTenant }
    : { error: "callback" };

// The token's claims (its middle part), or null
const tokenClaims = (token: string | null): AccessTokenClaims | null => {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="))) as AccessTokenClaims;
  } catch {
    return null;
  }
};

// The tenant the session belongs to: named by the server's error, else the
// tenant in front of the user name in the token ("vim-2|name@mail"), else ""
const sessionTenantOf = async (error: unknown, token: string | null): Promise<string> => {
  if (error instanceof ApiError && error.response) {
    try {
      const body = JSON.parse(await error.response.clone().text()) as ApiErrorBody;
      const named = body.tenantId ?? body.tenant ?? body.sessionTenant;
      if (typeof named === "string" && named) return named;
    } catch {
      // Not JSON: fall back to the token
    }
  }
  const subject = tokenClaims(token)?.sub;
  return typeof subject === "string" && subject.includes("|") ? subject.split("|")[0]! : "";
};

export const logout = async (redirectTo = "/login"): Promise<void> => {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  // The next person to sign in never sees this one's projects or data
  queryClient.clear();
  forgetLastProject();

  const isTauri = isDesktopApp();

  const target = isTauri
    ? "cdp-report-app://"
    : `${window.location.origin}${redirectTo}`;

  const url = `${AUTH_CONFIG.logoutUri}?redirect_to=${encodeURIComponent(target)}`;

  if (isTauri) {
    await openUrl(url);
  } else {
    window.location.href = url;
  }
};

export const desktopLogin = (tenantUrl: string): void => {
  const { origin } = new URL(tenantUrl);

  openUrl(`${origin}/desktop-login`);
};
