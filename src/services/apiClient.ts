import router from "@/router";

export const AUTH_TOKEN_KEY = "jrxml_auth_token";
export const AUTH_USER_KEY = "jrxml_auth_user";
export const TENANT_URL_KEY = "cdp_tenant_url";

const baseURL = import.meta.env.VITE_OAUTH_BASE_URL;

export type ApiResponseType = "json" | "text" | "blob" | "arrayBuffer";

export interface ApiRequestOptions extends Omit<
  RequestInit,
  "body" | "headers"
> {
  body?: BodyInit | null;
  headers?: HeadersInit;
  responseType?: ApiResponseType;
  baseURL?: string;
}

export class ApiError extends Error {
  readonly status?: number;
  readonly response?: Response;

  constructor(message: string, status?: number, response?: Response) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.response = response;
  }
}

const getAccessToken = (): string | null => {
  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!storedToken) {
    return null;
  }

  try {
    const parsedToken = JSON.parse(storedToken) as {
      accessToken?: string;
    };

    return parsedToken.accessToken || storedToken;
  } catch {
    return storedToken;
  }
};

const getTenantId = (): string => {
  const isTauri = Boolean(
    (
      window as Window & {
        __TAURI_INTERNALS__?: unknown;
      }
    ).__TAURI_INTERNALS__,
  );

  if (isTauri) {
    try {
      const tenantUrl = localStorage.getItem(TENANT_URL_KEY);

      if (!tenantUrl) {
        return "";
      }

      return new URL(tenantUrl).hostname.split(".")[0] || "";
    } catch {
      return "";
    }
  }

  return window.location.hostname.split(".")[0] || "";
};

const resolveUrl = (path: string, requestBaseURL?: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiBaseURL = requestBaseURL || baseURL;

  if (!apiBaseURL) {
    throw new ApiError("VITE_BASE_API_URL is not configured");
  }

  return `${apiBaseURL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

const notifyStatus = (status: number): void => {
  window.dispatchEvent(
    new CustomEvent("api:status", {
      detail: { status },
    }),
  );

  if (typeof window.postMessage === "function") {
    window.postMessage({ status }, window.location.origin);
  }
};

let isRedirectingToLogin = false;

const redirectToLogin = async (): Promise<void> => {
  if (isRedirectingToLogin) {
    return;
  }

  isRedirectingToLogin = true;

  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    notifyStatus(401);

    if (router.currentRoute.value.name !== "login") {
      await router.replace({
        name: "login",
      });
    }
  } finally {
    isRedirectingToLogin = false;
  }
};

const parseResponse = async <T>(
  response: Response,
  responseType: ApiResponseType,
): Promise<T> => {
  if (responseType === "blob") {
    return (await response.blob()) as T;
  }

  if (responseType === "arrayBuffer") {
    return (await response.arrayBuffer()) as T;
  }

  if (responseType === "text") {
    return (await response.text()) as T;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const text = await response.text();

    if (!text) {
      return undefined as T;
    }

    return text as T;
  }

  return (await response.json()) as T;
};

const request = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const {
    responseType = "json",
    baseURL: requestBaseURL,
    headers,
    body,
    ...requestInit
  } = options;

  const requestHeaders = new Headers(headers);

  if (body && typeof body === "string" && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const accessToken = getAccessToken();

  if (accessToken) {
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);

    const tenantId = getTenantId();

    if (tenantId) {
      requestHeaders.set("tenantId", tenantId);
    }
  }

  const response = await fetch(resolveUrl(path, requestBaseURL), {
    ...requestInit,
    body,
    headers: requestHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      await redirectToLogin();
    }

    if (response.status === 503) {
      notifyStatus(503);
    }

    let message = `API request failed: ${response.status} ${response.statusText}`;

    try {
      const errorBody = await response.clone().text();

      if (errorBody) {
        message += ` - ${errorBody}`;
      }
    } catch {
      // Ignore response parsing errors.
    }

    throw new ApiError(message, response.status, response);
  }

  return parseResponse<T>(response, responseType);
};

export const apiClient = {
  request,

  get: <T>(path: string, options?: ApiRequestOptions): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "GET",
    }),

  post: <T>(
    path: string,
    body?: BodyInit | null,
    options?: ApiRequestOptions,
  ): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "POST",
      body,
    }),

  put: <T>(
    path: string,
    body?: BodyInit | null,
    options?: ApiRequestOptions,
  ): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body,
    }),

  patch: <T>(
    path: string,
    body?: BodyInit | null,
    options?: ApiRequestOptions,
  ): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body,
    }),

  delete: <T>(path: string, options?: ApiRequestOptions): Promise<T> =>
    request<T>(path, {
      ...options,
      method: "DELETE",
    }),
};

export default apiClient;
