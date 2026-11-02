// Template list types (home page, My Templates; services/templateService.ts):
// the planned templates API's request and answer.

export type TemplateSort = "lastModified" | "createdAt" | "name";
export type TemplateSortDirection = "asc" | "desc";

export interface TemplateSummary {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
}

export interface TemplatePage {
  items: TemplateSummary[];
  total: number;
}

export interface TemplateQuery {
  page?: number;
  size?: number;
  q?: string;
  sort?: TemplateSort;
  dir?: TemplateSortDirection;
}

// GET rest/reports/report (services/home/homeServices.ts)
export interface ReportVerifyResponse {
  isVerified?: boolean;
}
