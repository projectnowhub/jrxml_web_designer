import {
  clearVerifier,
  generatePKCE,
  getClientId,
  getVerifier,
  saveVerifier,
} from "../utils/pkce";
import { openUrl } from "@tauri-apps/plugin-opener";

export interface AuthConfig {
  clientId: string;
  tenant?: string;
  authUrl: string;
  tokenUrl: string;
  userUrl: string;
  redirectUri: string;
  logoutUri: string;
  state: string;
  codeChallenge: string;
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

  async login(): Promise<void> {
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
  }

  async exchangeCode(code: string): Promise<string> {
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

    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const data = (await response.json()) as TokenResponse;
    clearVerifier();
    return data.access_token;
  }

  async fetchUser(token: string): Promise<AuthUser> {
    const response = await fetch(this.config.userUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const data = (await response.json()) as AuthUser;
    return data;
  }

  logout(redirectTo = "/login"): void {
    window.location.href = `${this.config.logoutUri}?redirect_to=${window.location.origin}${redirectTo}`;
  }
}

export function desktopLogin(tenantUrl: string): void {
  console.log("Hiii")
  const { origin } = new URL(tenantUrl);
  openUrl(`${origin}/desktop-login`);
}

let instance: AuthService | null = null;

export function createAuthService(config: AuthConfig): AuthService {
  instance = new AuthService(config);
  return instance;
}

export function getAuthService(): AuthService {
  if (!instance) {
    throw new Error(
      "AuthService not initialized. Call createAuthService() first.",
    );
  }
  return instance;
}
