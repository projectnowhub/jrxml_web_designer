import {
  clearVerifier,
  generatePKCE,
  getClientId,
  getVerifier,
  saveVerifier,
} from "../utils/pkce";
import { openUrl } from "@tauri-apps/plugin-opener";
import apiClient from "./apiClient";

export interface AuthConfig {
  clientId: string;
  authUrl: string;
  tokenUrl: string;
  userUrl: string;
  redirectUri: string;
  logoutUri: string;
  state: string;
}

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

export class AuthService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  login = async (): Promise<void> => {
    const clientId = getClientId(this.config.clientId);
    const pkce = await generatePKCE();

    saveVerifier(pkce.verifier);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      state: this.config.state,
      code_challenge: pkce.challenge,
      code_challenge_method: "S256",
      redirect_uri: this.config.redirectUri,
    });

    window.location.href = `${this.config.authUrl}?${params.toString()}`;
  };

  exchangeCode = async (code: string): Promise<string> => {
    const verifier = getVerifier();

    if (!verifier) {
      throw new Error(
        "PKCE verifier not found. Login session may have expired.",
      );
    }

    const clientId = getClientId(this.config.clientId);

    const body = new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: clientId,
      redirect_uri: this.config.redirectUri,
      grant_type: "authorization_code",
    });

    const data = await apiClient.post<TokenResponse>(
      this.config.tokenUrl,
      body,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    clearVerifier();

    return data.access_token;
  };

  fetchUser = async (): Promise<AuthUser> => {
    return apiClient.get<AuthUser>(this.config.userUrl);
  };

  logout = (redirectTo = "/login"): void => {
    window.location.href = `${this.config.logoutUri}?redirect_to=${window.location.origin}${redirectTo}`;
  };
}

export const desktopLogin = (tenantUrl: string): void => {
  const { origin } = new URL(tenantUrl);

  openUrl(`${origin}/desktop-login`);
};

let instance: AuthService | null = null;

export const createAuthService = (config: AuthConfig): AuthService => {
  instance = new AuthService(config);

  return instance;
};

export const getAuthService = (): AuthService => {
  if (!instance) {
    throw new Error(
      "AuthService not initialized. Call createAuthService() first.",
    );
  }

  return instance;
};
