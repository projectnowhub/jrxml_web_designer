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

// A template as the cards and the list show it: its own owner when it names
// one (a default template's creator on the report server), else the user
export interface TemplateCard extends TemplateSummary {
  owner?: string;
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
