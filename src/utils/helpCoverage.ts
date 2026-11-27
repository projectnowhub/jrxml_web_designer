// Development only: says in the browser console which help is missing, so a
// new element, settings card or tool never ships without its explanation
// (CLAUDE.md "Help must follow the elements").
import i18n, { SUPPORTED_LOCALES } from "@/i18n";
import { DOC_PAGES, TOOLS } from "@/utils/helpDocs";
import { isMouseAction, mouseAction, SHORTCUT_GROUPS } from "@/utils/helpShortcuts";

/** Every help text the pages, settings, tools and shortcuts need, missing in any language */
export function missingHelpTexts(): string[] {
  const keys = new Set<string>();
  for (const page of DOC_PAGES) {
    keys.add(`helpDocs.pages.${page.id}.title`);
    keys.add(`helpDocs.pages.${page.id}.what`);
    for (const setting of page.settings) {
      keys.add(`helpDocs.settings.${setting}.title`);
      keys.add(`helpDocs.settings.${setting}.text`);
    }
  }
  for (const tool of TOOLS) {
    keys.add(`helpDocs.tools.${tool.id}.title`);
    keys.add(`helpDocs.tools.${tool.id}.text`);
  }
  for (const group of SHORTCUT_GROUPS) {
    keys.add(`help.shortcutGroups.${group.id}`);
    for (const row of group.rows) {
      keys.add(`help.shortcuts.${row.id}`);
      for (const token of row.combos.flat()) {
        if (isMouseAction(token)) keys.add(`help.mouse.${mouseAction(token)}`);
      }
    }
  }
  const { te } = i18n.global;
  return SUPPORTED_LOCALES.flatMap((locale) =>
    [...keys].filter((key) => !te(key, locale)).map((key) => `${locale}: ${key}`),
  );
}

/** Settings cards (titles in the Properties panel) without their (i) */
export function cardsWithoutHelp(panel: HTMLElement): string[] {
  return [...panel.querySelectorAll("h4, h5")]
    .filter((title) => !title.querySelector(".setting-help-btn") && !title.closest(".setting-help"))
    .map((title) => title.textContent?.trim() ?? "")
    .filter(Boolean);
}
