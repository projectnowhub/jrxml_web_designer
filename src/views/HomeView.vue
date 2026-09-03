<template>
  <div class="home-page">
    <div class="home-shell">
      <div class="home-card">
        <div class="eyebrow">Workspace</div>
        <h1>Welcome to your CDP home</h1>
        <p>
          Your authentication is complete. You can continue to the designer or
          open the dashboard from here.
        </p>

        <div class="action-row">
          <button type="button" class="primary" @click="goToDesigner">
            Open Designer
          </button>
          <button type="button" class="secondary" @click="goToLogin">
            Sign out
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { openUrl } from "@tauri-apps/plugin-opener";

const router = useRouter();

function goToDesigner() {
  router.push("/designer");
}

async function goToLogin() {
  localStorage.removeItem("jrxml_auth_user");
  localStorage.removeItem("jrxml_auth_token");

  const isTauri = Boolean(
    (window as Window & {
      __TAURI_INTERNALS__?: unknown;
    }).__TAURI_INTERNALS__,
  );

  const redirectTo = isTauri
    ? "cdp-report-app://"
    : window.location.origin;

  const url =
    `${import.meta.env.VITE_OAUTH_BASE_URL}/logout` +
    `?redirect_to=${encodeURIComponent(redirectTo)}`;

  if (isTauri) {
    await openUrl(url);
  } else {
    window.location.href = url;
  }
}
  
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at top, rgba(99, 102, 241, 0.16), transparent 30%),
    #09090f;
  color: #f4f4f5;
  padding: 24px;
}

.home-shell {
  width: min(760px, 100%);
}

.home-card {
  background: rgba(18, 19, 28, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.5);
}

.eyebrow {
  display: inline-block;
  padding: 6px 10px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 999px;
  color: #a5b4fc;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 18px;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.1;
  letter-spacing: -0.05em;
}

p {
  margin: 16px 0 0;
  color: rgba(202, 197, 216, 0.8);
  font-size: 1rem;
  line-height: 1.7;
  max-width: 620px;
}

.action-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 30px;
}

button {
  border: none;
  border-radius: 12px;
  padding: 12px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

button:hover {
  transform: translateY(-1px);
}

.primary {
  background: linear-gradient(135deg, #7c5cf7, #6366f1);
  color: white;
}

.secondary {
  background: rgba(255, 255, 255, 0.04);
  color: #f4f4f5;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
