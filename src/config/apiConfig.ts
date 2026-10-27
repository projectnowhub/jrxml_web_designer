// API configuration: one server address (VITE_API_BASE_URL); every API is that
// address plus its route below.
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const API_ROUTES = {
  authorize: "/oauth2/authorize",
  token: "/oauth2/token",
  currentUser: "/v2/user/me",
  logout: "/logout",
  files: "/rest/files",
  reportServer: "/v2",
  analytics: "/v2/analytics/aggregate",
  table: "/v2/table",
  // The project list (Report Data, the header's project picker)
  projectList: "/rest/entities/cdp_Project",
  // Every CDP entity a report can list (Report Data → tables) with its fields
  entities: "/v2/entities",
  // The user's saved CDP settings (each table's column order…), read at login
  propertiesConfig: "/rest/entities/cdp_PropertiesConfig",
} as const;

export const apiUrl = (route: string) => `${API_BASE_URL}${route}`;

// Report server (Preview PDF)
export const PDF_PREVIEW_API = apiUrl(API_ROUTES.reportServer);

// Image upload endpoint
export const IMAGE_UPLOAD_API = apiUrl(API_ROUTES.files);


// Address of a point on the map (Location → "Fill the address from the pin"):
// the reverse geocoder the CDP app's location picker uses, same setting name
export const REVERSE_GEOCODE_API: string =
  import.meta.env.VITE_LAT_AND_LANG_API || "https://nominatim.openstreetmap.org/reverse";
