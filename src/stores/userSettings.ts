// The user's default settings: Default Settings (paper, margins, font, page
// sections, Section Heights) and the header's Snap & grid switches. Saved with
// the user's account on the server (one cdp_UserReportTemplateSetting row,
// the whole UserDefaultSettings JSON as text in `value`) and kept in this
// browser under their own keys (constants.ts: read by utils/reportDefaults.ts,
// the band defaults and useSnapAlignment), which the app reads.
// - loadFromServer (sign-in / app start, App.vue): the server's settings go
//   into this browser; a user with none yet gets this browser's sent
// - every change (noteChange) is saved USER_SETTINGS_SAVE_DELAY_MS after the
//   last one, the whole JSON each time
// `changes` goes up with every change (the User Defaults JSON tab follows it),
// `fromServer` when the server's settings arrived (the Default Settings page
// shows them).
import { defineStore } from "pinia";
import { ref } from "vue";
import { getEffectiveDefaultBandConfig, USER_SETTINGS_SAVE_DELAY_MS } from "@/constants/constants";
import { useAuthStore } from "@/stores/auth";
import { loadReportDefaults } from "@/utils/reportDefaults";
import { loadSnapSettings } from "@/composables/useSnapAlignment";
import { defaultsToSettingsBody, parseUserSettings, storeUserSettings } from "@/utils/defaultSettingsJson";
import { fetchUserTemplateSettings, saveUserTemplateSettings } from "@/queries/userSettingsQueries";
import { getAccessToken } from "@/services/apiClient";
import i18n from "@/i18n";
import notification from "@/utils/notification";
import type { UserDefaultSettings } from "@/types/settingsJson";

// The settings as they are in this browser, in the one settings format, with
// the signed-in user (the User Defaults JSON tab and what is saved)
export function collectUserSettings(): UserDefaultSettings {
  const auth = useAuthStore();
  return {
    userId: auth.user.id ?? "",
    userName: auth.fullName,
    ...defaultsToSettingsBody(loadReportDefaults(), getEffectiveDefaultBandConfig(), loadSnapSettings()),
  };
}

export const useUserSettingsStore = defineStore("userSettings", () => {
  const changes = ref(0);
  const fromServer = ref(0);

  // The user's row on the server (none until it was read)
  let rowId = "";
  // The server's settings being put into this browser: not a change to send back
  let applying = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  // What the server has (the last JSON sent or read)
  let lastSaved = "";
  // A failure is told once, until a save works again
  let failureShown = false;
  // The user whose settings were read (read again for another one)
  let loadedFor = "";

  // A default setting was changed in this browser: saved on the server shortly
  function noteChange(): void {
    changes.value++;
    if (applying) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void saveToServer();
    }, USER_SETTINGS_SAVE_DELAY_MS);
  }

  // Sends the whole settings JSON (when it differs from what the server has)
  async function saveToServer(): Promise<void> {
    if (!rowId || !getAccessToken()) return;
    const value = JSON.stringify(collectUserSettings());
    if (value === lastSaved) return;
    try {
      await saveUserTemplateSettings(rowId, value);
      lastSaved = value;
      failureShown = false;
    } catch (error) {
      console.error("Couldn't save the default settings:", error);
      if (!failureShown) {
        failureShown = true;
        notification.error(i18n.global.t("defaultSettings.saveFailed"));
      }
    }
  }

  // The user's row read from the server: its settings go into this browser
  // (a user with none yet gets this browser's sent)
  async function readFromServer(): Promise<void> {
    const row = await fetchUserTemplateSettings();
    rowId = row?.id ?? "";
    const settings = parseUserSettings(row?.value);
    if (!settings) {
      await saveToServer();
      return;
    }
    if (row?.value === lastSaved) return;
    applying = true;
    try {
      storeUserSettings(settings);
    } finally {
      applying = false;
    }
    lastSaved = row?.value ?? "";
    fromServer.value++;
  }

  // Reads the user's settings from the server into this browser (once per user)
  async function loadFromServer(userId: string): Promise<void> {
    if (!userId || loadedFor === userId || !getAccessToken()) return;
    loadedFor = userId;
    try {
      await readFromServer();
    } catch (error) {
      // Offline or not there: this browser's settings are used meanwhile
      loadedFor = "";
      console.warn("Couldn't read the default settings from the server:", error);
    }
  }

  // The newest settings in this browser before a new template takes them
  // (Create template): read again from the server (they may have changed on
  // another device or tab since sign-in); a change made here and not sent yet
  // is newer, so it is sent instead. Never fails: offline, this browser's
  // settings are used
  async function refreshFromServer(): Promise<void> {
    if (!getAccessToken()) return;
    try {
      if (timer) {
        clearTimeout(timer);
        timer = null;
        await saveToServer();
        return;
      }
      await readFromServer();
    } catch (error) {
      console.warn("Couldn't read the default settings from the server:", error);
    }
  }

  return { changes, fromServer, noteChange, loadFromServer, refreshFromServer };
});
