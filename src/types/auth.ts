// Sign-in types: the signed-in user (GET /v2/user/me) and the token answer
// (POST /oauth2/token), as cdp-fe-app's platform-shell auth/types.ts.

import type { AuthClientConfig } from "@/config/auth.config";
import type { FileRef, Organisation, Role } from "@/types/entities";

export type AuthConfig = AuthClientConfig;

export interface AuthDesignation {
  id: string;
  desigination: string;
  tenant: string;
}

export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string | null;
  email: string;
  mobileNo: string;
  designation: AuthDesignation;
  organization: Organisation;
  tenant: string;
  tenantName: string;
  active: boolean;
  avatar: FileRef | null;
  role: Role;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface LoginOptions {
  state?: string;
}

// The access token's claims the designer reads
export interface AccessTokenClaims {
  // "tenant|user name"
  sub?: string;
  exp?: number;
}

// What the login page is told about a failed sign-in (a type alias, so it
// fits a route's query)
export type LoginErrorQuery =
  | { error: "tenantSession"; sessionTenant: string; appTenant: string }
  | { error: "callback" };
