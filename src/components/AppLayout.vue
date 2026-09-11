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
          <Menu :size="20" :stroke-width="2.25" aria-hidden="true" />
        </button>
        <div class="brand-img">
          <img src="/assets/cdp-logo.png" alt="ProjectNow CDP" />
        </div>
        <div class="brand-name">
          <span class="brand-text">ProjectNow CDP</span>
          <span class="brand-badge">REPORT STUDIO</span>
        </div>
      </div>
      <label class="search-box">
        <Search :size="20" :stroke-width="2.25" aria-hidden="true" />
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
          <CircleHelp :size="20" :stroke-width="2.25" aria-hidden="true" />
        </button>
        <button class="icon-button" type="button" aria-label="Notifications">
          <Bell :size="20" :stroke-width="2.25" aria-hidden="true" />
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
              <UserRound :size="17" :stroke-width="2.25" aria-hidden="true" />
              <span>My profile</span>
            </button>
            <button
              class="account-action sign-out"
              type="button"
              @click="signOut"
            >
              <LogOut :size="17" :stroke-width="2.25" aria-hidden="true" />
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
            v-for="menu in sidebarMenus"
            :key="menu.routeName"
            class="nav-item"
            :class="{ active: route.name === menu.routeName }"
            type="button"
            :title="menu.label"
            @click="router.push(menu.route)"
          >
            <component
              :is="menu.icon"
              class="nav-symbol"
              :size="19"
              :stroke-width="2.25"
            />
            <span>{{ menu.label }}</span>
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
import { getStoredUser } from "../utils/auth";
import { logout } from "../services/authService";

const sidebarMenus = [
  {
    label: "Templates",
    route: "/",
    routeName: "home",
    icon: LayoutTemplate,
  },
  {
    label: "My templates",
    route: "/mytemplates",
    routeName: "mytemplates",
    icon: Files,
  },
  {
    label: "Activity",
    route: "/activity",
    routeName: "activity",
    icon: Activity,
  },
];

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

function signOut() {
  isAccountOpen.value = false;
  void logout();
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
  color: #6e6a80;
  font-size: 1rem;
  line-height: 1.7;
  max-width: 620px;
}

button {
  border: none;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 0.95rem;
  font-weight: 650;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    box-shadow 0.2s ease,
    opacity 0.18s ease;
}

button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0) scale(0.97);
}

.primary {
  background: linear-gradient(135deg, #7c5cf7, #6366f1);
  color: white;
}

.secondary {
  background: #f4f4f8;
  color: #45425a;
  border: 1px solid #e6e5ee;
}

.app-layout {
  min-height: 100vh;
  width: 100%;
  color: #1c1b26;
  background:
    radial-gradient(circle at top, rgba(99, 102, 241, 0.1), transparent 32%),
    radial-gradient(circle at top right, rgba(124, 92, 247, 0.06), transparent 38%),
    #ffffff;
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
  border-bottom: 1px solid rgba(28, 27, 38, 0.08);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(18px);
  box-shadow:
    0 1px 0 rgba(28, 27, 38, 0.05),
    0 16px 34px -22px rgba(23, 20, 44, 0.14);
  box-sizing: border-box;
}
.brand-wrap,
.topbar-actions,
.account-button {
  display: flex;
  align-items: center;
}
.brand-wrap {
}
.brand-img img {
  width: 34px;
  height: 34px;
  filter: drop-shadow(0 2px 8px rgba(124, 92, 247, 0.2));
  margin-right: 10px;
}
.brand-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1;
  min-width: 0;
}
.brand-text {
  color: #1c1b26;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.brand-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px 6px;
  border: 1px solid rgba(124, 92, 247, 0.28);
  border-radius: 4px;
  color: #6440f4;
  background: rgba(124, 92, 247, 0.14);
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
}
@media (max-width: 1023px) {
  .brand-badge {
    display: none;
  }
}

.account-button {
  border: 0;
  color: #6e6a80;
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
  background: linear-gradient(135deg, #7c5cf7, #6366f1);
  color: white;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 3px 12px rgba(99, 102, 241, 0.32);
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
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  animation: popover-in 0.16s ease;
}
@keyframes popover-in {
  from {
    opacity: 0;
    transform: translateY(-3px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
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
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}
.account-popover-header span:not(.avatar) {
  color: #77718a;
}
.account-popover-divider {
  height: 1px;
  margin: 4px 0;
  background: rgba(28, 27, 38, 0.08);
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
  color: #45425a;
  font-size: 12.5px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease;
}
.account-action:hover {
  background: rgba(124, 92, 247, 0.08);
}
.account-action.sign-out {
  color: #e5484d;
}
.account-action.sign-out:hover {
  background: rgba(229, 72, 77, 0.09);
  color: #d0342e;
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
  border-right: 1px solid rgba(28, 27, 38, 0.07);
  background:
    radial-gradient(circle at top left, rgba(124, 92, 247, 0.06), transparent 62%),
    linear-gradient(180deg, #fcfcfe, #f6f6fa);
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
}
.sidebar-backdrop {
  display: none;
}
.nav-item {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 11px 14px;
  margin-bottom: 5px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: #4b4660;
  font-size: 13.5px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.2s ease,
    color 0.16s ease;
}
.nav-item:hover {
  border-color: rgba(124, 92, 247, 0.18);
  background: rgba(124, 92, 247, 0.07);
  color: #1c1b26;
}
.nav-item.active {
  border-color: rgba(124, 92, 247, 0.32);
  background: linear-gradient(
    135deg,
    rgba(124, 92, 247, 0.14),
    rgba(99, 102, 241, 0.09)
  );
  color: #5b3ee0;
  font-weight: 700;
  box-shadow:
    inset 3px 0 0 rgba(124, 92, 247, 0.55),
    0 1px 3px rgba(124, 92, 247, 0.12);
}
.nav-symbol {
  color: #8a84a3;
}
.nav-item:hover .nav-symbol {
  color: #6440f4;
}
.nav-item.active .nav-symbol {
  color: #5b3ee0;
}
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px;
  color: #6f6a7e;
  font-size: 10.5px;
  font-weight: 600;
}
.sidebar-footer i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5fd6a0;
  animation: status-pulse 2.4s ease-in-out infinite;
}
@keyframes status-pulse {
  0%,
  100% {
    box-shadow: 0 0 5px rgba(95, 214, 160, 0.5);
  }
  50% {
    box-shadow: 0 0 13px rgba(95, 214, 160, 0.95);
  }
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
  color: #45425a;
  background: transparent;
  cursor: pointer;
}
.icon-button {
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #45425a;
  background: transparent;
  cursor: pointer;
}
.menu-button:hover,
.icon-button:hover {
  border-color: rgba(124, 92, 247, 0.35);
  color: #6440f4;
  background: rgba(124, 92, 247, 0.08);
}

.search-box {
  position: absolute;
  left: 50%;
  width: min(570px, 38vw);
  height: 42px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 12px 0 15px;
  transform: translateX(-50%);
  border: 1px solid rgba(28, 27, 38, 0.12);
  border-radius: 11px;
  color: #8a84a3;
  background: #f2f3f9;
  box-sizing: border-box;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}
.search-box:focus-within {
  border-color: rgba(124, 92, 247, 0.5);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.14);
}
.search-box input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: #1c1b26;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
}
.search-box input::placeholder {
  color: #9a94ab;
}
.search-box kbd {
  padding: 2px 7px;
  border: 1px solid rgba(28, 27, 38, 0.16);
  border-radius: 4px;
  color: #6f6a7e;
  font-size: 10px;
  font-weight: 600;
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
.sidebar-collapsed .nav-item.active {
  box-shadow: none;
}
.sidebar-collapsed .nav-symbol {
  color: #45425a;
}
.sidebar-collapsed .nav-item:hover .nav-symbol,
.sidebar-collapsed .nav-item.active .nav-symbol {
  color: #6440f4;
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
  .brand-name {
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
    box-shadow: 18px 0 40px rgba(23, 20, 44, 0.14);
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
    background: rgba(23, 20, 44, 0.32);
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
