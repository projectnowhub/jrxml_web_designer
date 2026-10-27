// The template list, a page at a time (home page, My Templates). Answers from
// the templates saved in this browser until the templates API exists; then
// only this file changes, callers stay as they are.
//
// Backend contract (planned):
//   GET {api}/templates?page=1&size=25&q=monthly&sort=lastModified&dir=desc
//       -> TemplatePage { items: TemplateSummary[], total }
//   GET {api}/templates/{id} -> the whole template (opening it)
// `page` starts at 1. `q`: every word must be in the name (any case).
// `sort`: lastModified | createdAt | name. Items carry no template content;
// a template is fetched whole only when it is opened.

import { readStoredFiles } from "@/composables/useDesignerFiles";
import type { DesignerFile } from "@/types/designerFile";
import type { TemplatePage, TemplateQuery, TemplateSummary } from "@/types/template";

const toIsoDate = (value: Date | string | undefined) => {
  const time = new Date(value ?? 0).getTime();
  return new Date(Number.isNaN(time) ? 0 : time).toISOString();
};

export async function listTemplates({
  page = 1,
  size = 25,
  q = "",
  sort = "lastModified",
  dir = "desc",
}: TemplateQuery = {}): Promise<TemplatePage> {
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const all: TemplateSummary[] = readStoredFiles()
    .map((file) => ({
      id: file.id,
      name: file.name,
      createdAt: toIsoDate(file.createdAt ?? file.lastModified),
      lastModified: toIsoDate(file.lastModified ?? file.createdAt),
    }))
    .filter((item) => words.every((word) => item.name.toLowerCase().includes(word)));

  const sign = dir === "asc" ? 1 : -1;
  all.sort((a, b) =>
    sort === "name"
      ? sign * a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      : sign * (new Date(a[sort]).getTime() - new Date(b[sort]).getTime()),
  );

  const start = (Math.max(1, page) - 1) * size;
  return { items: all.slice(start, start + size), total: all.length };
}

// One template, whole, for opening it (undefined: not found)
export async function getTemplate(id: string): Promise<DesignerFile | undefined> {
  return readStoredFiles().find((file) => file.id === id);
}
