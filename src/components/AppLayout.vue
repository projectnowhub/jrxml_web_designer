<template>
  <div class="app-layout">
    <header class="topbar">
      <div class="brand-wrap">
        <button
          class="menu-button"
          type="button"
          :aria-label="
            isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
          "
          :aria-expanded="!isSidebarCollapsed"
          @click="isSidebarCollapsed = !isSidebarCollapsed"
        >
          <Menu :size="19" :stroke-width="1.7" aria-hidden="true" />
        </button>
        <div class="brand-img">
          <img src="/assets/cdp-logo.png" alt="CDP Report" />
        </div>
        <span class="brand-text">CDP REPORT</span>
      </div>
      <label class="search-box">
        <Search :size="19" :stroke-width="1.7" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search templates"
          aria-label="Search templates"
        />
        <kbd>/</kbd>
      </label>
      <div class="topbar-actions">
        <button class="icon-button" type="button" aria-label="Help">
          <CircleHelp :size="19" :stroke-width="1.7" aria-hidden="true" />
        </button>
        <button class="icon-button" type="button" aria-label="Notifications">
          <Bell :size="19" :stroke-width="1.7" aria-hidden="true" />
        </button>
        <div ref="accountMenuRef" class="account-menu">
          <button
            class="account-button"
            type="button"
            @click="isAccountOpen = !isAccountOpen"
          >
            <span class="avatar">{{ userInitial }}</span>
          </button>
          <div v-if="isAccountOpen" class="account-popover">
            <div class="account-popover-header">
              <span class="avatar">{{ userInitial }}</span>
              <div>
                <strong>{{ userName }}</strong>
                <span>{{ userEmail }}</span>
              </div>
            </div>
            <div class="account-popover-divider" />
            <button class="account-action" type="button" @click="goToMyProfile">
              <UserRound :size="16" :stroke-width="1.7" aria-hidden="true" />
              <span>My profile</span>
            </button>
            <button
              class="account-action sign-out"
              type="button"
              @click="signOut"
            >
              <LogOut :size="16" :stroke-width="1.7" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <div
      class="workspace-layout"
      :class="{ 'sidebar-collapsed': isSidebarCollapsed }"
    >
      <aside class="sidebar">
        <nav>
          <button
            class="nav-item"
            :class="{ active: route.name === 'home' }"
            type="button"
            title="Templates"
            @click="router.push('/')"
          >
            <LayoutTemplate class="nav-symbol" :size="18" :stroke-width="1.7" />
            <span>Templates</span>
          </button>
          <button class="nav-item" type="button" title="My templates">
            <Files class="nav-symbol" :size="18" :stroke-width="1.7" />
            <span>My templates</span>
          </button>
          <button class="nav-item" type="button" title="Activity">
            <Activity class="nav-symbol" :size="18" :stroke-width="1.7" />
            <span>Activity</span>
          </button>
        </nav>
        <div class="sidebar-footer"><i /> All systems operational</div>
      </aside>
      <button
        v-if="!isSidebarCollapsed"
        class="sidebar-backdrop"
        type="button"
        aria-label="Close navigation"
        @click="isSidebarCollapsed = true"
      />
      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Activity,
  Bell,
  CircleHelp,
  Files,
  LayoutTemplate,
  LogOut,
  Menu,
  Search,
  UserRound,
} from "@lucide/vue";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../services/apiClient";
import { getStoredUser } from "../utils/auth";

const router = useRouter();
const route = useRoute();
const isAccountOpen = ref(false);
const isSidebarCollapsed = ref(false);
const searchQuery = ref("");
const storedUser = getStoredUser();
const userName =
  storedUser.firstName || storedUser.name || storedUser.username || "Designer";
const userEmail = storedUser.email || "Your CDP workspace";
const userInitial = userName.charAt(0).toUpperCase();

function goToMyProfile() {
  isAccountOpen.value = false;
  router.push("/myprofile");
}

async function signOut() {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);

  const isTauri = Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
  const redirectTo = isTauri ? "cdp-report-app://" : window.location.origin;
  const url = `${import.meta.env.VITE_OAUTH_BASE_URL}/logout?redirect_to=${encodeURIComponent(redirectTo)}`;

  if (isTauri) {
    await openUrl(url);
  } else {
    window.location.href = url;
  }
}

const accountMenuRef = ref<HTMLElement | null>(null);

const handleClickOutside = (event: MouseEvent): void => {
  if (
    accountMenuRef.value &&
    !accountMenuRef.value.contains(event.target as Node)
  ) {
    isAccountOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
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

button {
  border: none;
  border-radius: 12px;
  padding: 8px 12px;
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

.app-layout {
  min-height: 100vh;
  width: 100%;
  color: #f4f4f5;
  background:
    radial-gradient(circle at top, rgba(99, 102, 241, 0.16), transparent 30%),
    #09090f;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  width: 100%;
  height: 74px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(9, 9, 15, 0.84);
  backdrop-filter: blur(18px);
  box-sizing: border-box;
}
.brand-wrap,
.topbar-actions,
.account-button {
  display: flex;
  align-items: center;
}
.brand-wrap {
  gap: 10px;
}
.brand-img img {
  width: 34px;
  height: 34px;
}
.brand-text {
  color: #e7e3ff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.account-button {
  border: 0;
  color: #aca8bc;
  background: transparent;
  cursor: pointer;
}

.account-button {
  gap: 10px;
  text-align: left;
}
.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 2px solid #7c5cf7;
  border-radius: 50%;
  color: white;
  font-size: 13px;
  font-weight: 700;
}
.account-menu {
  position: relative;
}
.account-popover {
  position: absolute;
  z-index: 2;
  top: 46px;
  right: 0;
  width: 238px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: #171622;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.4);
}
.account-popover-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
}
.account-popover-header > div {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.account-popover-header strong,
.account-popover-header span:not(.avatar) {
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-popover-header strong {
  color: #f4f4f5;
  font-size: 12px;
}
.account-popover-header span:not(.avatar) {
  color: #8f8a9e;
}
.account-popover-divider {
  height: 1px;
  margin: 4px 0;
  background: rgba(255, 255, 255, 0.08);
}
.account-action {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #d6d2df;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}
.account-action:hover {
  background: rgba(255, 255, 255, 0.07);
}
.account-action.sign-out {
  color: #ff7373;
}
.workspace-layout {
  display: flex;
  min-height: calc(100vh - 74px);
  width: 100%;
  align-items: stretch;
}
.sidebar {
  position: sticky;
  top: 74px;
  width: 224px;
  height: calc(100vh - 74px);
  flex: 0 0 224px;
  padding: 32px 16px 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(12, 11, 19, 0.62);
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
}
.sidebar-backdrop {
  display: none;
}
.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 12px 14px;
  margin-bottom: 5px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #9994aa;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}
.nav-item.active {
  border-color: rgba(124, 92, 247, 0.2);
  background: rgba(124, 92, 247, 0.12);
  color: #e2dcff;
}
.nav-item:hover {
  color: #fff;
}
.nav-symbol {
  color: #aaa2c4;
}
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  color: #6f6a7e;
  font-size: 10px;
}
.sidebar-footer i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #5fd6a0;
  box-shadow: 0 0 9px #5fd6a0;
}
.main-content {
  flex: 1 1 auto;
  min-width: 0;
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 54px 52px 80px;
}
.menu-button {
  display: grid;
  place-items: center;
  margin-right: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #f4f4f5;
  background: transparent;
  cursor: pointer;
}
.icon-button {
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #f4f4f5;
  background: transparent;
  cursor: pointer;
}
.menu-button:hover,
.icon-button:hover {
  border-color: rgba(157, 140, 255, 0.28);
  color: #f4f4f5;
  background: rgba(124, 92, 247, 0.12);
}

.search-box {
  position: absolute;
  left: 50%;
  width: min(570px, 38vw);
  height: 40px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 12px 0 15px;
  transform: translateX(-50%);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  color: #817b91;
  background: rgba(255, 255, 255, 0.055);
  box-sizing: border-box;
}
.search-box input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: #f4f4f5;
  background: transparent;
  font-size: 12px;
}
.search-box input::placeholder {
  color: #817b91;
}
.search-box kbd {
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: #777184;
  font-size: 10px;
  font-family: inherit;
}
.sidebar-collapsed .sidebar {
  width: 72px;
  flex-basis: 72px;
  padding-right: 10px;
  padding-left: 10px;
}
.sidebar-collapsed .nav-item {
  justify-content: center;
  padding-right: 10px;
  padding-left: 10px;
}
.sidebar-collapsed .nav-item > span:last-child,
.sidebar-collapsed .sidebar-footer {
  display: none;
}
.sidebar-collapsed .nav-symbol {
  color: #d7d0f8;
}
@media (max-width: 900px) {
  .sidebar {
    width: 190px;
  }
  .main-content {
    padding: 42px 28px;
  }
}
@media (max-width: 700px) {
  .brand-text {
    display: none;
  }
  .search-box {
    left: 48%;
    width: min(300px, 42vw);
  }
  .topbar-actions {
    gap: 5px;
  }
}
@media (max-width: 620px) {
  .topbar {
    height: 64px;
    padding: 0 18px;
  }
  .workspace-layout {
    min-height: calc(100vh - 64px);
  }
  .sidebar {
    width: 58px;
    padding: 22px 8px;
  }
  .nav-item {
    justify-content: center;
    padding: 11px;
    font-size: 0;
  }
  .main-content {
    padding: 32px 16px 60px;
  }
  .workspace-layout:not(.sidebar-collapsed) .sidebar {
    position: fixed;
    z-index: 30;
    top: 64px;
    left: 0;
    width: min(280px, 82vw);
    height: calc(100vh - 64px);
    flex-basis: min(280px, 82vw);
    box-shadow: 18px 0 40px rgba(0, 0, 0, 0.38);
  }
  .workspace-layout:not(.sidebar-collapsed) .sidebar-backdrop {
    position: fixed;
    z-index: 25;
    inset: 64px 0 0;
    display: block;
    width: 100%;
    height: auto;
    padding: 0;
    border: 0;
    background: rgba(0, 0, 0, 0.5);
    cursor: pointer;
  }
}
@media (max-width: 480px) {
  .topbar {
    height: 62px;
  }
  .search-box {
    position: static;
    width: auto;
    flex: 1;
    margin: 0 8px;
    transform: none;
  }
  .search-box kbd {
    display: none;
  }
  .topbar-actions .icon-button:first-child {
    display: none;
  }
  .sidebar-collapsed .sidebar {
    width: 58px;
    flex-basis: 58px;
  }
  .workspace-layout:not(.sidebar-collapsed) .sidebar {
    top: 62px;
    height: calc(100vh - 62px);
  }
  .workspace-layout:not(.sidebar-collapsed) .sidebar-backdrop {
    inset: 62px 0 0;
  }
  .main-content {
    padding-top: 28px;
  }
}
</style>
