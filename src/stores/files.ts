// The open template: its name (the header's), its id (the report server row's)
// and whether the server has its latest changes (saveStatus, set by
// composables/useServerTemplateSave.ts). Templates are kept only on the
// server, never in this browser.
import { defineStore } from "pinia";
import { ref } from "vue";

export type SaveStatus = "saved" | "saving" | "error";

export const useFilesStore = defineStore("files", () => {
  const currentFileName = ref("");
  const currentFileId = ref<string | null>(null);
  const saveStatus = ref<SaveStatus>("saved");

  // No template open yet (the designer opening)
  function resetCurrentFile(defaultName: string) {
    currentFileName.value = defaultName;
    currentFileId.value = null;
    saveStatus.value = "saved";
  }

  return { currentFileName, currentFileId, saveStatus, resetCurrentFile };
});
