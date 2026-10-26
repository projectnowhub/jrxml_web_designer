// The project last chosen in the header's picker, remembered per browser
// (`designer.lastProject`), so a new template starts with it. Each template
// still keeps its own project (com.cdp.projects); this is only the starting
// choice. Stored as the project's key (its UUID, or its code while the list
// sends no id; utils/projectKeys.ts upgrades it like a template's) and name.

import type { ReportProject } from "@/types/dataSource";

const STORAGE_KEY = "designer.lastProject";
export function rememberLastProject(project: ReportProject | undefined): void {
  try {
    if (project?.id) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: project.id, name: project.name }));
    }
  } catch {
    // Storage off (private window): new templates start without a project
  }
}

export function lastProject(): ReportProject | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return value && typeof value.id === "string" && value.id && typeof value.name === "string"
      ? { id: value.id, name: value.name }
      : null;
  } catch {
    return null;
  }
}

export function forgetLastProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to forget
  }
}
