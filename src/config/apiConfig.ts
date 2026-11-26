// API configuration: one server address (VITE_API_BASE_URL); every API is that
// address plus its route below.
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export const API_ROUTES = {
  authorize: "/oauth2/authorize",
  token: "/oauth2/token",
  // The CDP app's route (cdp-contractor App.tsx); /v2/user/me answers the server's web page
  currentUser: "/v1/user/me",
  logout: "/logout",
  files: "/rest/files",
  reportServer: "/v2",
  analytics: "/v2/analytics/aggregate",
  table: "/v2/table",
  projectList: "/v2/table/cdp_Project",
  entities: "/v2/entities",
  // A project's photos (the CDP app's Photos page, project.api.ts getProjectImages)
  projectPhotos: "/v1/image/project/filter",
  // Every photo tag (getAllTags)
  photoTags: "/v2/table/cdp_Tag",
  // The report server's templates (default and the tenant's own, told apart by
  // isDefault): list = GET with the Jmix filter as the `filter` query
  // parameter; one template = GET / DELETE …/{id}
  tenantReports: "/v2/table/rptadn_TenantReport",
  // Duplicate a template (default or own): the copy is one of the tenant's own (isDefault false)
  copyTemplate: "/v2/reports/copy",
  // Create a template (the tenant's own, isDefault false)
  createTemplate: "/v2/reports/create",
  reportTemplates: "/v2/report-templates",
  reports: "/rest/reports/report",
  runReport: "/rest/reports/run",
} as const;

export const apiUrl = (route: string) => `${API_BASE_URL}${route}`;

// Report server (Preview PDF)
export const PDF_PREVIEW_API = apiUrl(API_ROUTES.reportServer);

// Image upload endpoint
export const IMAGE_UPLOAD_API = apiUrl(API_ROUTES.files);


// Address of a point on the map (Location → "Fill the address from the pin"):
// the reverse geocoder the CDP app's location picker uses, same setting name
export const REVERSE_GEOCODE_API: string = "https://nominatim.openstreetmap.org/reverse";
