// The user's default settings, saved with their account through the
// properties config API as one setting of this app (appName CDP_REPORT_STUDIO,
// key "user default settings"): Default Settings (paper, margins, font, page
// sections, Section Heights) and the header's Snap & grid switches.
// The app keeps reading them from this browser (their own storage keys,
// constants.ts); this store copies the server's into the browser at login and
// at start, and sends the browser's after a change: shown at once, sent a
// moment later without waiting (several quick changes: one request), as the
// CDP app does with its table settings. A change the server didn't take is
// sent again at the next start; signing out removes them from the browser.
import { defineStore } from "pinia";
import { ref } from "vue";
import { getPropertiesConfig, putPropertiesConfig } from "@/services/propertiesConfigService";
import {
  GLOBAL_BAND_LIMITS_STORAGE_KEY,
  REPORT_DEFAULTS_STORAGE_KEY,
  SNAP_SETTINGS_STORAGE_KEY,
} from "@/constants/constants";
import {
  USER_SETTINGS_APP_NAME,
  USER_SETTINGS_KEY,
  USER_SETTINGS_SAVE_DELAY_MS,
  USER_SETTINGS_UNSENT_KEY,
  USER_SETTINGS_VERSION,
} from "@/constants/userSettingsConstants";
import type { PropertiesConfigRow, UserDefaultSettings } from "@/types/propertiesConfig";

// Each part of the value and the browser key it is kept under
const PARTS = {
  reportDefaults: REPORT_DEFAULTS_STORAGE_KEY,
  sectionHeights: GLOBAL_BAND_LIMITS_STORAGE_KEY,
  snapAndGrid: SNAP_SETTINGS_STORAGE_KEY,
} as const;
type SettingPart = keyof typeof PARTS;
const PART_NAMES = Object.keys(PARTS) as SettingPart[];

// Browser storage can be off (private window): the settings then last until the page closes
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // nothing to keep it in
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

// The settings as they are in this browser (parts never changed are left out)
function collectSettings(): UserDefaultSettings {
  const settings: UserDefaultSettings = { version: USER_SETTINGS_VERSION };
  for (const part of PART_NAMES) {
    try {
      const value: unknown = JSON.parse(readStored(PARTS[part]) ?? "null");
      if (isObject(value)) Object.assign(settings, { [part]: value });
    } catch {
      // unreadable: left out (the original settings)
    }
  }
  return settings;
}

// The server's settings into this browser; a part they leave out goes back to the original
function applySettings(settings: UserDefaultSettings): void {
  for (const part of PART_NAMES) {
    const value = settings[part];
    writeStored(PARTS[part], isObject(value) ? JSON.stringify(value) : null);
  }
}

// This app's row among the user's settings
const isOwnRow = (row: PropertiesConfigRow) =>
  row.key === USER_SETTINGS_KEY && (row.appName === undefined || row.appName === USER_SETTINGS_APP_NAME);

function readServerValue(row: PropertiesConfigRow | undefined): UserDefaultSettings | null {
  if (!row) return null;
  try {
    const value = JSON.parse(row.value) as UserDefaultSettings;
    return isObject(value) && value.version === USER_SETTINGS_VERSION ? value : null;
  } catch {
    return null;
  }
}

export const useUserSettingsStore = defineStore("userSettings", () => {
  // Goes up when the server's settings replace the browser's, so the open
  // designer (Default Settings, Snap & grid) shows them
  const version = ref(0);
  // The value the server has (last read or sent), so an unchanged one is never sent again
  let lastKnown = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function send(): Promise<void> {
    timer = undefined;
    const value = JSON.stringify(collectSettings());
    if (value === lastKnown) {
      writeStored(USER_SETTINGS_UNSENT_KEY, null);
      return;
    }
    try {
      await putPropertiesConfig({ appName: USER_SETTINGS_APP_NAME, key: USER_SETTINGS_KEY, value });
      lastKnown = value;
      // Changed again while on its way: that newer value is sent next
      if (!timer) writeStored(USER_SETTINGS_UNSENT_KEY, null);
    } catch (error) {
      console.error("Failed to save the user's default settings; they are sent again at the next start", error);
    }
  }

  // A setting changed in this browser: sent after a short pause, never waited for
  function saveLater(): void {
    if (JSON.stringify(collectSettings()) === lastKnown) return;
    writeStored(USER_SETTINGS_UNSENT_KEY, "1");
    clearTimeout(timer);
    timer = setTimeout(() => void send(), USER_SETTINGS_SAVE_DELAY_MS);
  }

  // At login and at start: the server's settings into this browser, or, when a
  // change made here hasn't reached it yet, that change to the server
  async function syncFromServer(): Promise<void> {
    try {
      const saved = readServerValue((await getPropertiesConfig()).find(isOwnRow));
      lastKnown = saved ? JSON.stringify(saved) : "";
      if (readStored(USER_SETTINGS_UNSENT_KEY)) {
        void send();
      } else if (saved) {
        applySettings(saved);
        lastKnown = JSON.stringify(collectSettings());
        version.value++;
      }
    } catch (error) {
      // The browser's settings stay: never a reason to stop the login
      console.error("Failed to read the user's default settings", error);
    }
  }

  // Signing out: what is waiting is sent now, and the settings leave this browser
  function forgetSettings(): void {
    if (timer) {
      clearTimeout(timer);
      void send();
    }
    applySettings({ version: USER_SETTINGS_VERSION });
    writeStored(USER_SETTINGS_UNSENT_KEY, null);
    lastKnown = "";
    version.value++;
  }

  return { version, saveLater, syncFromServer, forgetSettings };
});
