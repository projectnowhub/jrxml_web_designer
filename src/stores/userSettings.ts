// The user's default settings: Default Settings (paper, margins, font, page
// sections, Section Heights) and the header's Snap & grid switches, kept in
// this browser under their own keys (constants.ts: read by
// utils/reportDefaults.ts, the band defaults and useSnapAlignment). For now
// they are saved nowhere else: the backend is to give them their own API,
// integrated later. `changes` goes up with every change, so the bottom
// panel's User Defaults JSON tab follows them.
import { defineStore } from "pinia";
import { ref } from "vue";
import { getEffectiveDefaultBandConfig } from "@/constants/constants";
import { useAuthStore } from "@/stores/auth";
import { loadReportDefaults } from "@/utils/reportDefaults";
import { loadSnapSettings } from "@/composables/useSnapAlignment";
import { defaultsToSettingsBody } from "@/utils/defaultSettingsJson";
import type { UserDefaultSettings } from "@/types/settingsJson";

// The settings as they are in this browser, in the one settings format, with
// the signed-in user (the User Defaults JSON tab)
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

  // A default setting was changed in this browser
  function noteChange(): void {
    changes.value++;
  }

  return { changes, noteChange };
});
