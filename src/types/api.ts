// API types shared by every service: apiClient's request options, the CDP
// backend's answer wrapper and its error body.

export type ApiResponseType = "json" | "text" | "blob" | "arrayBuffer";

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: BodyInit | null;
  headers?: HeadersInit;
  responseType?: ApiResponseType;
  baseURL?: string;
}

// The CDP backend answers either with the data itself or wrapped like this
// (cdp-fe-app's unwrap)
export interface ApiEnvelope<T> {
  data: T;
  message?: string;
  status?: number | string;
}

// What an endpoint answers: its data, bare or wrapped
export type ApiResponse<T> = T | ApiEnvelope<T>;

// A failed request's JSON body: the fields the designer reads from it
export interface ApiErrorBody {
  detail?: string;
  message?: string;
  error?: string;
  title?: string;
  code?: string;
  // The tenant a session belongs to (GET /v2/user/me from another tenant)
  tenantId?: string;
  tenant?: string;
  sessionTenant?: string;
}

// The status the API client reports on window ("api:status" event)
export interface ApiStatusDetail {
  status: number;
}
