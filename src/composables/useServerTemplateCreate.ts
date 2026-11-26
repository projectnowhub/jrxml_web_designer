// A new template made on the report server (POST /v2/reports/create) as soon
// as the user asks for one (Create template, File → New), so the designer
// always shows /designer/<server id>. The name shown is the server's name
// (report.name; names may repeat); the code is sent the same as the name and
// is the backend's business.
//
// - freeTemplateName(base): base when no template (default or the tenant's
//   own) is named so, else the first free "base 2", "base 3"…, read from every
//   name containing base (fetchTemplateNames)
// - createServerTemplate(base): creates it under that free name and answers
//   the name and the new row's id, found as the newest own template with that
//   name (the create answers no id); id null when not found
import { fetchNewestTemplateIdByName, fetchTemplateNames, useCreateTemplate } from "@/queries/reportCatalogQueries";
import { CREATE_TEMPLATE_FIXED } from "@/constants/reportCatalogConstants";
import { firstFreeTemplateName, templateNameBase } from "@/utils/templateNames";

export function useServerTemplateCreate() {
  const creating = useCreateTemplate();

  async function freeTemplateName(wanted: string): Promise<string> {
    const base = templateNameBase(wanted);
    return firstFreeTemplateName(base, await fetchTemplateNames(base));
  }

  // `exactName`: made under `wanted` as it is (a .jrxml opened from the
  // computer keeps its file's name; names may repeat)
  async function createServerTemplate(
    wanted: string,
    { exactName = false }: { exactName?: boolean } = {},
  ): Promise<{ name: string; id: string | null }> {
    const name = exactName ? wanted.trim() : await freeTemplateName(wanted);
    await creating.mutateAsync({ name, code: name, ...CREATE_TEMPLATE_FIXED });
    const id = await fetchNewestTemplateIdByName(name).catch(() => null);
    return { name, id };
  }

  return { freeTemplateName, createServerTemplate };
}
