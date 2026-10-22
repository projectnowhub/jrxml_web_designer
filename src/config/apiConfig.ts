// API configuration: one server address (VITE_API_BASE_URL); every API is that
// address plus its route below.
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const API_ROUTES = {
  authorize: "/oauth2/authorize",
  token: "/oauth2/token",
  currentUser: "/v1/user/me",
  logout: "/logout",
  files: "/rest/files",
  reportServer: "/v2",
  analytics: "/v2/analytics/aggregate",
} as const;

export const apiUrl = (route: string) => `${API_BASE_URL}${route}`;

// Report server (Preview PDF)
export const PDF_PREVIEW_API = apiUrl(API_ROUTES.reportServer);

// Image upload endpoint
export const IMAGE_UPLOAD_API = apiUrl(API_ROUTES.files);


// Report data (the "Report Data" list: projects, their details and tables). Unset: the designer uses dummy data
// (src/mocks/dataSources.ts) until the backend API is ready.
export const DATA_SOURCE_API: string | undefined =
  import.meta.env.VITE_DATA_SOURCE_API || undefined;
