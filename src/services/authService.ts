import {
  clearVerifier,
  generatePKCE,
  getClientId,
  getVerifier,
  saveVerifier,
} from "../utils/pkce";
import { openUrl } from "@tauri-apps/plugin-opener";
import apiClient, { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./apiClient";
import { AUTH_CONFIG, type AuthClientConfig } from "../config/auth.config";

export type AuthConfig = AuthClientConfig;

export interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
  username?: string;
  [key: string]: unknown;
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface LoginOptions {
  state?: string;
}

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

export const fetchUser = async (): Promise<AuthUser> => {
  return apiClient.get<AuthUser>(AUTH_CONFIG.userUrl);
};

export const logout = async (redirectTo = "/login"): Promise<void> => {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);

  const isTauri = Boolean(
    (
      window as Window & {
        __TAURI_INTERNALS__?: unknown;
      }
    ).__TAURI_INTERNALS__,
  );

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
