// Why a server template's content can't be opened as a JRXML (the designer
// then opens an empty layout and says so): shown as
// reportCatalog.defaultTemplates.contentProblems.<value>

export const TemplateContentProblem = {
  // No template of the Jmix report has content
  noContent: "noContent",
  // The content is something else (an HTML template, any other text)
  notJrxml: "notJrxml",
  // A JRXML that is damaged or can't be read by the designer
  badJrxml: "badJrxml",
} as const;

export type TemplateContentProblem = (typeof TemplateContentProblem)[keyof typeof TemplateContentProblem];
