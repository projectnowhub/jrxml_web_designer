// Templates saved while the project list came without each project's UUID
// stored the project's code ("project1") instead: in the report's projects
// (com.cdp.projects) and in every data table's and chart's setup. Once the
// list knows that code's UUID, it is put in their place, so rows and charts
// filter on project.id as the CDP app does. Pure: the caller passes what the
// loaded list knows (code -> UUID); no request is made.

import type { Band, DesignElement } from "@/types";
import type { ReportProject } from "@/types/dataSource";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The UUID for a key that is a project's code, else undefined
const uuidFor = (key: string | undefined, ids: Map<string, string>) =>
  key && !UUID.test(key) ? ids.get(key) : undefined;

// Report projects with their UUIDs (null: nothing to change)
export function upgradedProjects(projects: ReportProject[], ids: Map<string, string>): ReportProject[] | null {
  let changed = false;
  const next = projects.map((p) => {
    const id = uuidFor(p.id, ids);
    if (!id) return p;
    changed = true;
    return { ...p, id };
  });
  // The same project picked twice (once by code, once by UUID) is kept once
  const seen = new Set<string>();
  const unique = next.filter((p) => !seen.has(p.id) && !!seen.add(p.id));
  return changed ? unique : null;
}

function upgradeElements(elements: DesignElement[], ids: Map<string, string>): boolean {
  let changed = false;
  for (const el of elements) {
    if ((el.type === "table" || el.type === "chart") && el.binding) {
      const id = uuidFor(el.binding.projectId, ids);
      if (id) {
        el.binding.projectId = id;
        changed = true;
      }
    }
    if (el.type === "frame" && upgradeElements(el.elements ?? [], ids)) changed = true;
  }
  return changed;
}

// Puts the UUIDs into every data table and chart (changes the bands in place);
// true when something changed
export function upgradeBindings(bands: Band[], ids: Map<string, string>): boolean {
  let changed = false;
  for (const band of bands) if (upgradeElements(band.elements ?? [], ids)) changed = true;
  return changed;
}
