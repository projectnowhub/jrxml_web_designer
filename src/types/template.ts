// Template types: the report server's templates as the Templates page's cards
// and list show them (templates are kept only on the server).

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

