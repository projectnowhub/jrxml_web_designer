<template>
  <!-- One look for the whole app (home page and designer): the home page's purple -->
  <NConfigProvider :theme-overrides="themeOverrides">
    <div id="app">
      <RouterView />
    </div>
    <!-- Help (home page and designer): the guided tour, the Quick guide and the toolbar's hover cards -->
    <GuidedTour />
    <HelpModal />
    <HintLayer />
    <!-- Every title as a tooltip in the app's light look -->
    <TooltipLayer />
  </NConfigProvider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRouter, RouterView } from "vue-router";
import { NConfigProvider, type GlobalThemeOverrides } from "naive-ui";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, getAccessToken } from "./services/apiClient";
import { useUserSettingsStore } from "./stores/userSettings";
import { fetchUser, loginErrorQuery } from "./services/authService";
import { isDesktopApp } from "./utils/desktopApp";
import GuidedTour from "./components/help/GuidedTour.vue";
import HelpModal from "./components/modals/HelpModal.vue";
import HintLayer from "./components/help/HintLayer.vue";
import TooltipLayer from "./components/common/TooltipLayer.vue";
import { missingHelpTexts } from "./utils/helpCoverage";

const router = useRouter();

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: "#6366F1",
    primaryColorHover: "#7C5CF7",
    primaryColorPressed: "#4F46E5",
    primaryColorSuppl: "#7C5CF7",
    borderRadius: "8px",
    borderColor: "#E6E5EE",
    textColorBase: "#1C1B26",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  },
  // Tooltips in the light look, like the title tooltips (TooltipLayer)
  Tooltip: {
    color: "#FFFFFF",
    textColor: "#1C1B26",
    borderRadius: "8px",
    padding: "6px 10px",
    boxShadow: "0 0 0 1px rgba(28, 27, 38, 0.08), 0 8px 24px rgba(23, 20, 44, 0.14), 0 2px 6px rgba(23, 20, 44, 0.06)",
  },
};

let unlisten: (() => void) | undefined;
let lastHandledUrl: string | undefined;

async function handleDeepLink(urls: string[]) {
  const urlString = urls[0];

  if (!urlString || urlString === lastHandledUrl) {
    return;
  }

  lastHandledUrl = urlString;

  try {
    const url = new URL(urlString);
    const token = url.searchParams.get("token");

    // Login deep link
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      try {
        const user = await fetchUser();
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user ?? {}));
      } catch (error) {
        // Signed in to another tenant: the login page says which
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        await router.replace({ path: "/login", query: loginErrorQuery(error) });
        return;
      }
      // The user's default settings (Default Settings, Snap & grid)
      await useUserSettingsStore().syncFromServer();

      await router.replace("/");
      return;
    }

    // Logout deep link
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);

    await router.replace("/login");
  } catch (error) {
    console.error("Failed to handle deep link:", error);
  }
}

// Development: help texts that are missing in any language are named in the console
if (import.meta.env.DEV) {
  const missing = missingHelpTexts();
  if (missing.length) console.warn(`[help] Missing help texts:\n${missing.join("\n")}`);
}

onMounted(async () => {
  // Already signed in: the user's default settings, which may have changed on
  // another computer (a new login reads them itself)
  if (getAccessToken()) void useUserSettingsStore().syncFromServer();

  if (!isDesktopApp()) {
    return;
  }

  try {
    unlisten = await onOpenUrl((urls) => {
      void handleDeepLink(urls);
    });

    const currentUrls = await getCurrent();

    if (currentUrls?.length) {
      await handleDeepLink(currentUrls);
    }
  } catch (error) {
    console.error(
      "Failed to initialize authentication deep-link listener",
      error,
    );
  }
});

onUnmounted(() => {
  unlisten?.();
});
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>
