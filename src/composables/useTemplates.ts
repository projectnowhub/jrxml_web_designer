// What every template list shares (the Templates page, the designer's Open
// window, the top bar's search): how "edited" reads, and opening a template.
// Every template is the report server's (actions such as Duplicate and Delete
// are in TemplateMenu).
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

type Dated = { lastModified?: Date | string; createdAt?: Date | string };
type Named = { id: string; name: string };

const time = (value: Date | string | undefined) => new Date(value ?? 0).getTime();

// Grid or List: the address's ?view=, else the one chosen last in this
// browser. One switch for the whole Templates page (at its top): the default
// templates and the user's own follow it
export const TEMPLATE_VIEW_KEY = "templates.view";
export function chosenTemplateView(asked: unknown, storageKey = TEMPLATE_VIEW_KEY): "grid" | "list" {
  let choice = typeof asked === "string" ? asked : "";
  if (!choice) {
    try {
      choice = localStorage.getItem(storageKey) ?? "";
    } catch {
      // Remembering is only a convenience
    }
  }
  return choice === "list" ? "list" : "grid";
}

export function useTemplates() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const localeTag = () => (locale.value === "ms" ? "ms-MY" : "en-GB");

  // "Edited today at 10:24", "Edited yesterday", "Edited 2 Sep 2026"
  const editedText = (file: Dated) => {
    const when = new Date(time(file.lastModified ?? file.createdAt));
    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((dayStart(new Date()) - dayStart(when)) / 86_400_000);
    if (days === 0) {
      return t("home.edited.today", {
        time: when.toLocaleTimeString(localeTag(), { hour: "2-digit", minute: "2-digit" }),
      });
    }
    if (days === 1) return t("home.edited.yesterday");
    return t("home.edited.on", { date: dateText(when, false) });
  };

  // "21 Oct 2026" or "21 Oct 2026, 16:39" (the list view's columns)
  const dateText = (value: Date | string | undefined, withTime = true) =>
    new Date(time(value)).toLocaleString(localeTag(), {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });

  // A server template (default or the tenant's own): always /designer/<id>,
  // which the designer always reads from the report server
  const openDefaultTemplate = (template: Named) => router.push({ name: "designer", params: { id: template.id } });

  return { editedText, dateText, openDefaultTemplate };
}
