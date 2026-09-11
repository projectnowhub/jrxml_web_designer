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
          <p>
            {{
              isDesktop
                ? "Desktop Application"
                : "Sign in to continue to your workspace"
            }}
          </p>
        </div>

        <form
          v-if="isDesktop && !tenantUrl"
          class="tenant-form"
          @submit.prevent="handleTenantSubmit"
        >
          <label for="tenant-url">Enter your tenant URL to get started</label>
          <input
            id="tenant-url"
            v-model="tenantUrlInput"
            type="url"
            placeholder="https://your-tenant.cdp.com"
            :disabled="isVerifyingTenant"
            required
          />
          <p v-if="tenantFormError" class="tenant-form-error">
            {{ tenantFormError }}
          </p>
          <button
            class="primary-button"
            type="submit"
            :disabled="isVerifyingTenant"
          >
            {{ isVerifyingTenant ? "Verifying..." : "Verify Tenant" }}
          </button>
        </form>

        <button
          v-if="!isDesktop || tenantUrl"
          class="primary-button"
          type="button"
          :disabled="isLoading || !isTenantVerified"
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
              : isDesktop && !isTenantVerified
                ? "Verify your tenant URL before continuing."
                : "Secure access to your workspace and dashboard."
          }}</span>
        </div>

        <div
          v-if="isDesktop && tenantUrl && isTenantVerified"
          class="tenant-info-panel"
        >
          <div class="tenant-info-main">
            <div class="tenant-info-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                />
                <path
                  d="M12 8h.01M12 11v5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </div>
            <div class="tenant-info-details">
              <p class="tenant-info-label">Current Tenant</p>
              <p class="tenant-info-url">{{ tenantUrl }}</p>
              <button
                type="button"
                class="change-url-button"
                @click="changeTenantUrl"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                Change Tenant URL
              </button>
            </div>
          </div>
          <div class="tenant-info-status" aria-hidden="true">
            <span class="verified-dot" />
          </div>
        </div>

        <div class="divider" />

        <div class="footer-row">
          <span class="copyright"
            >&copy; {{ new Date().getFullYear() }} CDP Platform</span
          >
          <button type="button" class="lang-button">
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
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { desktopLogin, login } from "../services/authService";
import {
  getTenantIdFromUrl,
  verifyTenant,
  verifyTenantSession,
} from "../utils/auth";
import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  TENANT_URL_KEY,
} from "../services/apiClient";

const router = useRouter();
const isLoading = ref(false);
const isError = ref(false);
const errorMessage = ref("");
const tenantUrl = ref(localStorage.getItem(TENANT_URL_KEY) ?? "");
const tenantUrlInput = ref(tenantUrl.value);
const isTenantVerified = ref<boolean | null>(null);
const isVerifyingTenant = ref(false);
const tenantFormError = ref("");

const isDesktop = computed(
  () =>
    Boolean(
      (window as Window & { isTauri?: boolean; __TAURI_INTERNALS__?: unknown })
        .isTauri,
    ) ||
    Boolean(
      (window as Window & { __TAURI_INTERNALS__?: unknown })
        .__TAURI_INTERNALS__,
    ),
);

onMounted(async () => {
  console.log(
    "LoginView mounted. Checking tenant verification...",
    isDesktop.value,
    tenantUrl.value,
  );
  if (isDesktop.value && !tenantUrl.value) {
    return;
  }

  try {
    const verified = isDesktop.value
      ? await verifyTenant(getTenantIdFromUrl(tenantUrl.value) || "")
      : await verifyTenantSession();

    if (verified) {
      isTenantVerified.value = true;
      return;
    }

    console.warn("Tenant verification failed.");

    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);

    isError.value = true;
    isTenantVerified.value = false;
    errorMessage.value =
      "Tenant verification failed. Please contact your administrator to get the proper URL to proceed further.";
  } catch (error) {
    console.error("Tenant verification failed on login page:", error);

    isError.value = true;
    isTenantVerified.value = false;
    errorMessage.value =
      "Tenant verification failed. Please contact your administrator to get the proper URL to proceed further.";
  }
});

const handleTenantSubmit = async () => {
  tenantFormError.value = "";
  const normalizedUrl = tenantUrlInput.value.trim();
  const tenantId = getTenantIdFromUrl(normalizedUrl);

  if (!tenantId) {
    tenantFormError.value = "Please enter a valid tenant URL.";
    return;
  }

  isVerifyingTenant.value = true;
  try {
    if (await verifyTenant(tenantId)) {
      tenantUrl.value = normalizedUrl;
      isTenantVerified.value = true;
      localStorage.setItem(TENANT_URL_KEY, normalizedUrl);
    } else {
      isTenantVerified.value = false;
      tenantFormError.value =
        "Tenant verification failed. Please contact your administrator.";
    }
  } catch (error) {
    console.error("Tenant verification failed:", error);
    isTenantVerified.value = false;
    tenantFormError.value = "Tenant verification failed. Please try again.";
  } finally {
    isVerifyingTenant.value = false;
  }
};

const changeTenantUrl = () => {
  localStorage.removeItem(TENANT_URL_KEY);
  tenantUrl.value = "";
  tenantUrlInput.value = "";
  isTenantVerified.value = null;
  tenantFormError.value = "";
  isError.value = false;
  errorMessage.value = "";
};

const handleLogin = async () => {
  if (isDesktop.value) {
    if (!tenantUrl.value || !isTenantVerified.value) {
      return;
    }

    desktopLogin(tenantUrl.value);
    return;
  }

  isLoading.value = true;
  isError.value = false;

  try {
    await login();
  } catch (error) {
    console.error("Login failed:", error);
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
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
  background:
    radial-gradient(
      circle at top,
      rgba(99, 102, 241, 0.1),
      transparent 32%
    ),
    radial-gradient(
      circle at top right,
      rgba(124, 92, 247, 0.06),
      transparent 38%
    ),
    linear-gradient(180deg, #fcfcfe, #f6f6fa);
  color: #1c1b26;
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
  background: rgba(124, 92, 247, 0.16);
}

.glow-bottom {
  left: -8rem;
  bottom: -10rem;
  width: 28rem;
  height: 28rem;
  background: rgba(99, 102, 241, 0.11);
}

.grid-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  background-image:
    linear-gradient(rgba(28, 27, 38, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(28, 27, 38, 0.12) 1px, transparent 1px);
  background-size: 48px 48px;
}

.login-shell {
  position: relative;
  z-index: 1;
  width: min(500px, calc(100vw - 2rem));
}

.login-card {
  background: #ffffff;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 1.5rem;
  box-shadow:
    0 24px 64px rgba(23, 20, 44, 0.14),
    0 2px 6px rgba(23, 20, 44, 0.06);
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
    rgba(124, 92, 247, 0.14),
    rgba(99, 102, 241, 0.06)
  );
  border: 1px solid rgba(124, 92, 247, 0.3);
  box-shadow:
    0 0 0 3px rgba(124, 92, 247, 0.08),
    0 4px 16px rgba(23, 20, 44, 0.12);
}

.brand-icon svg {
  width: 34px;
  height: 34px;
}

.brand-text {
  letter-spacing: 0.18em;
  font-size: 10px;
  font-weight: 700;
  color: #6440f4;
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
  color: #1c1b26;
}

.heading-wrap p {
  margin: 0;
  color: #6e6a80;
  font-size: 13px;
  line-height: 1.5;
}

.tenant-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.tenant-form label {
  color: #4b4660;
  font-size: 13px;
  text-align: center;
}

.tenant-form input {
  width: 100%;
  height: 46px;
  border: 1px solid rgba(28, 27, 38, 0.14);
  border-radius: 0.9rem;
  padding: 0 1rem;
  background: #f2f3f9;
  color: #1c1b26;
  font-size: 13px;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

.tenant-form input:focus {
  border-color: rgba(124, 92, 247, 0.5);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.14);
}

.tenant-form input::placeholder {
  color: #9a94ab;
}

.tenant-form-error {
  margin: 0;
  color: #e5484d;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
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
    0 4px 16px rgba(124, 92, 247, 0.26),
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
  background: #f4f4f8;
  border: 1px solid rgba(28, 27, 38, 0.08);
  color: #6e6a80;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 0.9rem;
  font-size: 12.5px;
  line-height: 1.5;
}

.status-box.error {
  background: rgba(229, 72, 77, 0.08);
  border-color: rgba(229, 72, 77, 0.3);
  color: #d0342e;
}

.tenant-info-panel {
  margin-top: 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 0.9rem;
  background: linear-gradient(
    90deg,
    rgba(59, 130, 246, 0.1),
    rgba(99, 102, 241, 0.07)
  );
}

.tenant-info-main {
  display: flex;
  align-items: flex-start;
  flex: 1;
  gap: 0.75rem;
  min-width: 0;
}

.tenant-info-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 0.5rem;
  background: rgba(37, 99, 235, 0.12);
  color: #3b82f6;
}

.tenant-info-icon svg {
  width: 16px;
  height: 16px;
}

.tenant-info-details {
  flex: 1;
  min-width: 0;
}

.tenant-info-label {
  margin: 0 0 0.25rem;
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
}

.tenant-info-url {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #45425a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.change-url-button {
  margin-top: 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11px;
  font-weight: 500;
  color: #3b82f6;
  cursor: pointer;
  transition: color 0.2s ease;
}

.change-url-button:hover {
  color: #2563eb;
}

.change-url-button svg {
  width: 12px;
  height: 12px;
}

.tenant-info-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 4px;
  border-radius: 999px;
  background: rgba(95, 214, 160, 0.18);
}

.verified-dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #5fd6a0;
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
  background: rgba(28, 27, 38, 0.08);
  margin: 1.5rem 0 1rem;
}

.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.copyright {
  color: #8a84a3;
  font-size: 11px;
}

.lang-button {
  border: 1px solid rgba(28, 27, 38, 0.12);
  background: transparent;
  color: #6f6a7e;
  border-radius: 0.5rem;
  height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.6rem;
  font-size: 11px;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.lang-button:hover {
  border-color: rgba(124, 92, 247, 0.28);
  background: rgba(124, 92, 247, 0.08);
  color: #6440f4;
}

.lang-button svg {
  width: 11px;
  height: 11px;
}

.footnote {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 11px;
  color: #8a84a3;
}
</style>
