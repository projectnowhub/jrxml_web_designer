export interface AuthClientConfig {
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

export const AUTH_CONFIG: AuthClientConfig = {
  clientId: import.meta.env.VITE_OAUTH_CLIENT_ID || "vim-18",
  tenant: import.meta.env.VITE_OAUTH_TENANT || "vim-18",
  authUrl: import.meta.env.VITE_OAUTH_AUTH_URL,
  tokenUrl: import.meta.env.VITE_OAUTH_TOKEN_URL,
  userUrl: import.meta.env.VITE_OAUTH_USER_URL,
  redirectUri: `${window.location.origin}/callback`,
  logoutUri: import.meta.env.VITE_OAUTH_LOGOUT_URI,
  state: import.meta.env.VITE_OAUTH_STATE || "WEB",
  codeChallenge: import.meta.env.VITE_OAUTH_CODE_CHALLENGE,
};
