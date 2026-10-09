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

  // No file open yet (the designer opening); the saved list stays
  function resetCurrentFile(defaultName: string) {
    currentFileName.value = defaultName;
    currentFileId.value = null;
    saveStatus.value = "saved";
  }

  return { files, currentFileName, currentFileId, saveStatus, resetCurrentFile };
});
