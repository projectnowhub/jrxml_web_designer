
// API configuration
export const PDF_PREVIEW_API = import.meta.env.VITE_PDF_PREVIEW_API;

// Image upload endpoint
export const IMAGE_UPLOAD_API = `${import.meta.env.VITE_OAUTH_BASE_URL}/rest/files`;


// Report data (the "Report Data" list: projects, their details and tables). Unset: the designer uses dummy data
// (src/mocks/dataSources.ts) until the backend API is ready.
export const DATA_SOURCE_API: string | undefined =
  import.meta.env.VITE_DATA_SOURCE_API || undefined;
