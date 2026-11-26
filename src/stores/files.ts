// The open template: its name (the header's), its id (the report server row's
// once it is there) and whether its latest changes are kept. Only this
// template's changes are kept in this browser (utils/activeTemplate.ts) until
// templates can be saved on the server.
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
