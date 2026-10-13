<template>
  <!-- One look for the whole app (home page and designer): the home page's purple -->
  <NConfigProvider :theme-overrides="themeOverrides">
    <div id="app">
      <RouterView />
    </div>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRouter, RouterView } from "vue-router";
import { NConfigProvider, type GlobalThemeOverrides } from "naive-ui";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./services/apiClient";
import { fetchUser } from "./services/authService";

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
};

let unlisten: (() => void) | undefined;
let lastHandledUrl: string | undefined;

const isTauri = () =>
  Boolean(
    (
      window as Window & {
        __TAURI_INTERNALS__?: unknown;
      }
    ).__TAURI_INTERNALS__,
  );

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
      const user = await fetchUser();
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user ?? {}));

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

onMounted(async () => {
  if (!isTauri()) {
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
