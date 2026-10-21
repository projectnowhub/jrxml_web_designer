// The designer's files: the reports saved in this browser, the one that is
// open (its name and id) and whether its latest changes are saved. Saving to
// and reading from browser storage is done by useDesignerFiles.
import { defineStore } from "pinia";
import { ref } from "vue";
import type { DesignerFile } from "@/types/designerFile";

export type SaveStatus = "saved" | "saving" | "error";

export const useFilesStore = defineStore("files", () => {
  const files = ref<DesignerFile[]>([]);
  const currentFileName = ref("");
  const currentFileId = ref<string | null>(null);
  const saveStatus = ref<SaveStatus>("saved");
  // Bumped whenever the saved templates change, so paged lists reload
  const templatesVersion = ref(0);

  // No file open yet (the designer opening); the saved list stays
  function resetCurrentFile(defaultName: string) {
    currentFileName.value = defaultName;
    currentFileId.value = null;
    saveStatus.value = "saved";
  }

  // A name for a new report: the base ("Untitled Report") if no report saved in
  // this browser has it, else "Untitled Report 2", "Untitled Report 3"…
  function newReportName(base: string): string {
    const used = new Set(files.value.map((file) => file.name.trim().toLowerCase()));
    if (!used.has(base.toLowerCase())) return base;
    for (let n = 2; ; n++) {
      const name = `${base} ${n}`;
      if (!used.has(name.toLowerCase())) return name;
    }
  }

  return { files, currentFileName, currentFileId, saveStatus, templatesVersion, resetCurrentFile, newReportName };
});
