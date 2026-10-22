import { API_ROUTES, apiUrl } from "./apiConfig";

const isDesktop =
  typeof window !== "undefined" &&
  Boolean(
    (window as Window & { isTauri?: boolean; __TAURI_INTERNALS__?: unknown })
      .isTauri ||
      (window as Window & { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__,
  );

export interface AuthClientConfig {
  clientId: string;
  tenant?: string;
  authUrl: string;
  tokenUrl: string;
  userUrl: string;
  redirectUri: string;
  logoutUri: string;
  state: string;
}

export const AUTH_CONFIG: AuthClientConfig = {
  clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || "vim-18",
  authUrl: apiUrl(API_ROUTES.authorize),
  tokenUrl: apiUrl(API_ROUTES.token),
  userUrl: apiUrl(API_ROUTES.currentUser),
  redirectUri: `${window.location.origin}/callback`,
  logoutUri: apiUrl(API_ROUTES.logout),
  state: isDesktop ? "DESKTOP" : "WEB",
};
