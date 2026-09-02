<template>
  <div class="login-page">
    <div class="login-backdrop" aria-hidden="true">
      <div class="glow glow-top" />
      <div class="glow glow-bottom" />
      <div class="grid-pattern" />
    </div>

    <div class="login-shell">
      <div class="login-card">
        <div class="brand-wrap">
          <div class="brand-icon" aria-label="CDP brand logo">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <defs>
                <linearGradient
                  id="brand-gradient"
                  x1="0%"
                  x2="100%"
                  y1="0%"
                  y2="100%"
                >
                  <stop offset="0%" stop-color="#7c5cf7" />
                  <stop offset="100%" stop-color="#6366f1" />
                </linearGradient>
              </defs>
              <rect
                x="8"
                y="10"
                width="48"
                height="42"
                rx="14"
                fill="url(#brand-gradient)"
                opacity="0.18"
              />
              <path
                d="M18 40V24h7v16M29 40V17h7v23M40 40V28h7v12"
                fill="none"
                stroke="url(#brand-gradient)"
                stroke-width="4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="brand-text">CDP PLATFORM</div>
        </div>

        <div class="heading-wrap">
          <h1>Welcome back</h1>
          <p>Sign in to continue to your workspace</p>
        </div>

        <button
          class="primary-button"
          type="button"
          :disabled="isLoading"
          @click="handleLogin"
        >
          <span class="icon"
            ><svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M10 17l5-5-5-5M15 12H3M13 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg
          ></span>
          {{ isLoading ? "Signing in..." : "Continue to CDP" }}
        </button>

        <div class="status-box" :class="{ error: isError }">
          <span class="status-icon" aria-hidden="true">
            <svg v-if="isError" viewBox="0 0 24 24">
              <path
                d="M12 8v5M12 16h.01M9.09 3.6L2.7 16.2A2 2 0 004.6 19h14.8a2 2 0 001.9-2.8L14.91 3.6a2 2 0 00-3.82 0z"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24">
              <path
                d="M12 2l8 4v5c0 5-3.4 9.7-8 11-4.6-1.3-8-6-8-11V6l8-4zm-1.1 12.2l-2.5-2.5L7 12.7l3.9 3.9 7-7L17 8.2l-6.1 6z"
                fill="currentColor"
              />
            </svg>
          </span>
         <span>{{
            isError
              ? errorMessage
              : "Secure access to your workspace and dashboard."
          }}</span>
        </div>

        <div class="divider" />

        <div class="footer-row">
          <span class="copyright"
            >&copy; {{ new Date().getFullYear() }} CDP Platform</span
          >
          <button
            type="button"
            class="lang-button"
            @click="handleLanguageToggle"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 0c2.2 1.8 3.8 4.9 3.8 8s-1.6 6.2-3.8 8c-2.2-1.8-3.8-4.9-3.8-8s1.6-6.2 3.8-8zm-1.5 0h3c.3 1.6.8 3.1 1.6 4.4-.8 1.2-1.3 2.7-1.6 4.4h-3c-.3-1.7-.8-3.2-1.6-4.4.8-1.3 1.3-2.8 1.6-4.4zm-3 1.5c-.9 1.3-1.5 3.1-1.7 5h3.1c.3-1.9 1-3.6 1.8-5H7.5zm9 0c.8 1.4 1.5 3.1 1.8 5h-3.1c-.3-1.9-1-3.6-1.8-5h3.1zm-9 12.5c.2 1.9.8 3.7 1.7 5h3.1c-.8-1.4-1.5-3.1-1.8-5H7.5zm9 0c-.3 1.9-1 3.6-1.8 5h-3.1c.2-1.9.8-3.7 1.7-5h3.2z"
                fill="currentColor"
              />
            </svg>
            English
          </button>
        </div>
      </div>

      <p class="footnote">Secure &middot; Encrypted</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { AUTH_CONFIG } from "../config/auth.config";
import { createAuthService } from "../services/authService";
import { verifyTenantSession } from "../utils/auth";

const router = useRouter();
const isLoading = ref(false);
const isError = ref(false);
const errorMessage = ref("");

onMounted(async () => {
  try {
    const verified = await verifyTenantSession();

    if (verified) {
      return;
    }

    console.warn("Tenant verification failed.");

    localStorage.removeItem("jrxml_auth_token");
    localStorage.removeItem("jrxml_auth_user");

    isError.value = true;
    errorMessage.value =
      "Tenant verification failed. Please contact your administrator to get the proper URL to proceed further.";
  } catch (error) {
    console.error("Tenant verification failed on login page:", error);

    isError.value = true;
    errorMessage.value =
      "Tenant verification failed. Please contact your administrator to get the proper URL to proceed further.";
  }
});

const handleLogin = async () => {
  isLoading.value = true;
  isError.value = false;

  try {
    const authService = createAuthService({
      clientId: AUTH_CONFIG.clientId,
      tenant: AUTH_CONFIG.tenant,
      authUrl: AUTH_CONFIG.authUrl,
      tokenUrl: AUTH_CONFIG.tokenUrl,
      userUrl: AUTH_CONFIG.userUrl,
      redirectUri: AUTH_CONFIG.redirectUri,
      logoutUri: AUTH_CONFIG.logoutUri,
      state: AUTH_CONFIG.state,
      codeChallenge: AUTH_CONFIG.codeChallenge,
    });

    await authService.login();
  } catch (error) {
    console.error("Login failed:", error);
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
};

const handleLanguageToggle = () => {
  // Placeholder for future language switching
};
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #09090f;
  color: #f4f4f5;
}

.login-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(70px);
  opacity: 0.8;
}

.glow-top {
  top: -10rem;
  right: -8rem;
  width: 32rem;
  height: 32rem;
  background: rgba(124, 92, 247, 0.2);
}

.glow-bottom {
  left: -8rem;
  bottom: -10rem;
  width: 28rem;
  height: 28rem;
  background: rgba(99, 102, 241, 0.14);
}

.grid-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.04;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.18) 1px, transparent 1px);
  background-size: 48px 48px;
}

.login-shell {
  position: relative;
  z-index: 1;
  width: min(500px, calc(100vw - 2rem));
}

.login-card {
  background: rgba(18, 19, 28, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1.5rem;
  box-shadow:
    0 24px 64px rgba(0, 0, 0, 0.72),
    0 0 0 1px rgba(255, 255, 255, 0.02);
  padding: 2rem 2rem 1.5rem;
}

.brand-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.brand-icon {
  width: 60px;
  height: 60px;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  background: linear-gradient(
    135deg,
    rgba(124, 92, 247, 0.2),
    rgba(99, 102, 241, 0.08)
  );
  border: 1px solid rgba(167, 139, 250, 0.28);
  box-shadow:
    0 0 0 3px rgba(124, 92, 247, 0.08),
    0 4px 16px rgba(0, 0, 0, 0.35);
}

.brand-icon svg {
  width: 34px;
  height: 34px;
}

.brand-text {
  letter-spacing: 0.18em;
  font-size: 10px;
  font-weight: 700;
  color: rgba(167, 139, 250, 0.95);
  text-transform: uppercase;
}

.heading-wrap {
  text-align: center;
  margin-bottom: 1.8rem;
}

.heading-wrap h1 {
  margin: 0 0 0.4rem;
  font-size: clamp(1.6rem, 2vw, 2.1rem);
  letter-spacing: -0.04em;
  color: #f4f4f5;
}

.heading-wrap p {
  margin: 0;
  color: rgba(202, 197, 216, 0.8);
  font-size: 13px;
  line-height: 1.5;
}

.primary-button {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 0.9rem;
  background: linear-gradient(135deg, #7c5cf7 0%, #6366f1 100%);
  color: white;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  cursor: pointer;
  box-shadow:
    0 4px 20px rgba(124, 92, 247, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.primary-button:hover {
  transform: translateY(-1px);
}

.primary-button:disabled {
  opacity: 0.75;
  cursor: wait;
}

.icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.icon svg {
  width: 15px;
  height: 15px;
}

.status-box {
  margin-top: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(202, 197, 216, 0.9);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 0.9rem;
  font-size: 12.5px;
  line-height: 1.5;
}

.status-box.error {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  margin-top: 0.15rem;
}

.status-icon svg {
  width: 14px;
  height: 14px;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 1.5rem 0 1rem;
}

.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.copyright {
  color: rgba(174, 166, 196, 0.92);
  font-size: 11px;
}

.lang-button {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: rgba(174, 166, 196, 0.95);
  border-radius: 0.5rem;
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.6rem;
  font-size: 11px;
  cursor: pointer;
}

.lang-button svg {
  width: 11px;
  height: 11px;
}

.footnote {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 11px;
  color: rgba(174, 166, 196, 0.9);
}
</style>
