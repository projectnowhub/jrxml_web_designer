<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useRouter, RouterView } from "vue-router";
import {
  getCurrent,
  onOpenUrl,
} from "@tauri-apps/plugin-deep-link";

const router = useRouter();

let unlisten: (() => void) | undefined;
let lastHandledUrl: string | undefined;

const isTauri = () =>
  Boolean(
    (window as Window & {
      __TAURI_INTERNALS__?: unknown;
    }).__TAURI_INTERNALS__,
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
      localStorage.setItem("jrxml_auth_token", token);
      await router.replace("/");
      return;
    }

    // Logout deep link
    localStorage.removeItem("jrxml_auth_user");
    localStorage.removeItem("jrxml_auth_token");

    await router.replace("/login");
  } catch (error) {
    console.error("Failed to handle deep link:", error);
  }
}

onMounted(async () => {
  console.log("Initializing authentication deep-link listener");

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