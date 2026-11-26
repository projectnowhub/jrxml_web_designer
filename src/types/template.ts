// Template types: the report server's templates as the Templates page's cards
// and list show them, and the open template's changes kept in this browser
// (utils/activeTemplate.ts).

export type TemplateSort = "lastModified" | "createdAt" | "name";
export type TemplateSortDirection = "asc" | "desc";

export interface TemplateSummary {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
}

// A template as the cards and the list show it: its owner when it names one
// (its creator on the report server), else the list's own
export interface TemplateCard extends TemplateSummary {
  owner?: string;
}

// The open template's changes kept in this browser until the server can save
// templates: which server template (its row id), its name and its JRXML
export interface ActiveTemplate {
  id: string;
  name: string;
  jrxml: string;
  // ISO time of the last change kept
  savedAt: string;
}
