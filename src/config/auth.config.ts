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
  authUrl: import.meta.env.VITE_OAUTH_AUTH_URL,
  tokenUrl: import.meta.env.VITE_OAUTH_TOKEN_URL,
  userUrl: import.meta.env.VITE_OAUTH_USER_URL,
  redirectUri: `${window.location.origin}/callback`,
  logoutUri: import.meta.env.VITE_OAUTH_LOGOUT_URI,
  state: isDesktop ? "DESKTOP" : "WEB",
};
