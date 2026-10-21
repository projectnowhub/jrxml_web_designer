// What every template list shares (home page, My Templates, the designer's
// Open window): how "edited" reads, and the actions open, rename, duplicate
// and delete. The lists themselves come a page at a time from
// services/templateService.ts. Saved in this browser by useDesignerFiles until
// the templates API exists; only those two modules change then.
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useDesignerFiles } from "@/composables/useDesignerFiles";
import { useFilesStore } from "@/stores/files";
import type { DesignerFile } from "@/types/designerFile";

type Dated = { lastModified?: Date | string; createdAt?: Date | string };
type Named = { id: string; name: string };

const time = (value: Date | string | undefined) => new Date(value ?? 0).getTime();

export function useTemplates() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const filesStore = useFilesStore();
  const { files, loadFilesFromStorage, saveFilesToStorage, renameFile, deleteFile, findFileById } =
    useDesignerFiles({ defaultFileName: t("fileManager.untitledReport") });

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

  const openTemplate = (file: Named) => router.push({ name: "designer", params: { id: file.id } });

  const newTemplate = () => router.push({ name: "designer" });

  const fresh = () => loadFilesFromStorage();

  const rename = (file: Named, name: string) => {
    fresh();
    const clean = name.trim();
    if (clean && clean !== file.name) renameFile(file.id, clean);
  };

  // A copy saved next to it, "Name (copy)", "Name (copy) 2"…
  const duplicate = (file: Named) => {
    fresh();
    const source = findFileById(file.id);
    if (!source) return;
    const now = new Date().toISOString();
    const copy: DesignerFile = {
      id: `file_${Date.now()}`,
      name: filesStore.newReportName(t("home.copyName", { name: source.name })),
      content: source.content,
      createdAt: now,
      lastModified: now,
    };
    saveFilesToStorage([...files.value, copy]);
  };

  const remove = (file: Named) => {
    fresh();
    deleteFile(file.id);
  };

  return { editedText, dateText, openTemplate, newTemplate, rename, duplicate, remove };
}
