// The open template's changes, kept in this browser until the report server
// can save templates (no update API yet). Only one template is ever kept: the
// one being worked on, as its JRXML (the template saved as JRXML round-trips
// every setting). Opening that template again (a refresh, the Templates list)
// gives these changes back instead of the server's content.
import type { ActiveTemplate } from "@/types/template";

const ACTIVE_TEMPLATE_KEY = "designer.activeTemplate";
// What older builds kept in the browser (every template, the open report): no
// longer read, removed once so it doesn't fill the browser's storage
const OLD_TEMPLATE_KEYS = ["pdfDesignerFiles", "pdfDesignerLastFile", "pdf_report_data", "pdf_report_name", "pdf_auto_save"];

let oldKeysRemoved = false;
function removeOldTemplateStorage(): void {
  if (oldKeysRemoved) return;
  oldKeysRemoved = true;
  try {
    OLD_TEMPLATE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage blocked: nothing to remove
  }
}

// The kept template, or null (nothing kept, storage blocked or unreadable)
export function readActiveTemplate(): ActiveTemplate | null {
  removeOldTemplateStorage();
  try {
    const text = localStorage.getItem(ACTIVE_TEMPLATE_KEY);
    if (!text) return null;
    const stored = JSON.parse(text) as ActiveTemplate;
    return stored?.id && typeof stored.jrxml === "string" ? stored : null;
  } catch {
    return null;
  }
}

// Keeps this template's changes (replacing any other template's); false when
// the browser refused (storage full or blocked)
export function saveActiveTemplate(template: ActiveTemplate): boolean {
  removeOldTemplateStorage();
  try {
    localStorage.setItem(ACTIVE_TEMPLATE_KEY, JSON.stringify(template));
    return true;
  } catch {
    return false;
  }
}

// Forgets the kept changes (the template was deleted, or signing out)
export function clearActiveTemplate(): void {
  try {
    localStorage.removeItem(ACTIVE_TEMPLATE_KEY);
  } catch {
    // Storage blocked: nothing kept
  }
}
