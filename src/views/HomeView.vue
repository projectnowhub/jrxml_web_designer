<template>
  <div class="home-page">
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
        <button
          class="icon-button notification-button"
          type="button"
          aria-label="Notifications"
        >
          <Bell :size="19" :stroke-width="1.7" aria-hidden="true" />
        </button>
        <div class="account-menu">
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
            <button
              class="account-action"
              type="button"
              @click="goToMyProfile"
            >
              <UserRound :size="16" :stroke-width="1.7" aria-hidden="true" />
              <span>My profile</span>
            </button>
            <button
              class="account-action sign-out"
              type="button"
              @click="goToLogin"
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
          <button class="nav-item active" type="button" title="Templates">
            <LayoutTemplate
              class="nav-symbol"
              :size="18"
              :stroke-width="1.7"
            /><span>Templates</span></button
          ><button class="nav-item" type="button">
            <Files class="nav-symbol" :size="18" :stroke-width="1.7" /><span
              >My templates</span
            ></button
          ><button class="nav-item" type="button">
            <Activity class="nav-symbol" :size="18" :stroke-width="1.7" /><span
              >Activity</span
            >
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
        <div class="content-heading">
          <div>
            <span class="eyebrow">Template workspace</span>
            <h1>Good morning, {{ userName }}</h1>
            <p>Create, organize, and manage your report templates.</p>
          </div>
        </div>
        <section class="section-block">
          <div class="section-heading">
            <h2>Recent templates</h2>
            <button class="view-all" type="button">
              View all <ArrowRight :size="14" />
            </button>
          </div>
          <div class="template-grid">
            <article class="template-card new-card" @click="goToDesigner">
              <div class="new-icon">+</div>
              <strong>Create a new template</strong
              ><span>Start with a blank JRXML report</span>
            </article>
            <article
              v-for="template in templates"
              :key="template.name"
              class="template-card"
            >
              <div class="template-preview" :class="template.tone">
                <div class="preview-lines"><i /><i /><i /><i /></div>
                <div class="preview-chart"><b /><b /><b /><b /><b /></div>
              </div>
              <div class="template-info">
                <div class="template-title">
                  <strong>{{ template.name }}</strong
                  ><button type="button" aria-label="More options">
                    <MoreHorizontal :size="16" />
                  </button>
                </div>
                <span>{{ template.updated }}</span>
                <div class="owner-row">
                  <i>{{ template.owner.charAt(0) }}</i> Created by
                  {{ template.owner }}
                </div>
              </div>
            </article>
          </div>
        </section>
        <section class="section-block shared-section">
          <div class="section-heading">
            <h2>Shared with you</h2>
            <span class="muted-label">Recently accessed</span>
          </div>
          <div class="empty-state">
            <div><Inbox :size="30" :stroke-width="1.6" /></div>
            <strong>No shared templates yet</strong
            ><span>Templates shared with you will appear here.</span>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Activity,
  ArrowRight,
  Bell,
  ChevronDown,
  CircleHelp,
  Files,
  Inbox,
  LayoutTemplate,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  UserRound,
} from "@lucide/vue";

const router = useRouter();
const isAccountOpen = ref(false);
const isSidebarCollapsed = ref(false);
const searchQuery = ref("");
const storedUser = JSON.parse(
  localStorage.getItem("jrxml_auth_user") || "{}",
) as {
  name?: string;
  username?: string;
  email?: string;
};
const userName = storedUser.firstName || "Designer";
const userEmail = storedUser.email || "Your CDP workspace";
const userInitial = userName.charAt(0).toUpperCase();
const templates = [
  {
    name: "Monthly sales report",
    updated: "Edited today at 10:24 AM",
    owner: userName,
    tone: "violet",
  },
  {
    name: "Customer invoice",
    updated: "Edited yesterday",
    owner: "Ava Morgan",
    tone: "blue",
  },
  {
    name: "Operations summary",
    updated: "Edited Sep 02, 2026",
    owner: "Liam Chen",
    tone: "green",
  },
];

const goToDesigner = () => {
  router.push("/designer");
};

const goToMyProfile = () => {
  router.push("/myprofile");
};

const goToLogin = async () => {
  localStorage.removeItem("jrxml_auth_user");
  localStorage.removeItem("jrxml_auth_token");

  const isTauri = Boolean(
    (
      window as Window & {
        __TAURI_INTERNALS__?: unknown;
      }
    ).__TAURI_INTERNALS__,
  );

  const redirectTo = isTauri ? "cdp-report-app://" : window.location.origin;

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

.home-page {
  display: block;
  width: 100%;
  min-height: 100vh;
  padding: 0;
  background-color: #09090f;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px);
  background-size: 48px 48px;
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
.account-button,
.template-title,
.owner-row {
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
.topbar-actions {
  gap: 8px;
}
.icon-button,
.account-button {
  border: 0;
  color: #aca8bc;
  background: transparent;
  cursor: pointer;
}
.icon-button {
  border: 1px solid #5f5a70;
  border-radius: 50%;
  font-size: 13px;
}
.account-button {
  gap: 10px;
  text-align: left;
}
.avatar,
.owner-row i {
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: white;
  border:#7c5cf7  2px solid;
  font-style: normal;
  font-weight: 700;
}
.avatar {
  width: 34px;
  height: 34px;
  font-size: 13px;
}
.account-copy {
  display: grid;
  gap: 1px;
}
.account-copy strong {
  color: #f4f4f5;
  font-size: 12px;
}
.account-copy small {
  color: #858294;
  font-size: 10px;
}
.chevron {
  margin-left: 5px;
  color: #888296;
}
.account-menu {
  position: relative;
}
.account-popover {
  position: absolute;
  z-index: 2;
  right: 0;
  top: 46px;
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
  scrollbar-width: thin;
  scrollbar-color: rgba(157, 140, 255, 0.35) transparent;
}
.sidebar::-webkit-scrollbar {
  width: 5px;
}
.sidebar::-webkit-scrollbar-thumb {
  border-radius: 8px;
  background: rgba(157, 140, 255, 0.35);
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
.content-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 30px;
}
.content-heading .eyebrow {
  display: inline;
  padding: 0;
  margin: 0;
  border: 0;
  background: none;
  color: #9d8cff;
  font-size: 10px;
}
.content-heading h1 {
  margin: 10px 0 7px;
  font-size: clamp(25px, 3vw, 35px);
  letter-spacing: -0.035em;
}
.content-heading p {
  margin: 0;
  color: #8b869a;
  font-size: 13px;
}
.primary-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c5cf7, #6366f1);
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(99, 102, 241, 0.22);
}
.primary-button b {
  font-size: 18px;
  font-weight: 400;
  line-height: 12px;
}
.section-block {
  margin-top: 52px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.section-heading h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}
.view-all,
.muted-label {
  color: #918ba3;
  font-size: 11px;
}
.view-all {
  border: 0;
  background: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.template-card {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  background: rgba(20, 19, 29, 0.82);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}
.template-card:hover {
  transform: translateY(-3px);
  border-color: rgba(124, 92, 247, 0.5);
}
.new-card {
  min-height: 238px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-style: dashed;
  background: rgba(124, 92, 247, 0.045);
  color: #e9e6f5;
  cursor: pointer;
}
.new-card span,
.template-info > span,
.empty-state span {
  color: #777285;
  font-size: 11px;
}
.new-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: 3px;
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.16);
  color: #aa99ff;
  font-size: 27px;
  font-weight: 300;
}
.template-preview {
  height: 130px;
  padding: 19px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(135deg, #2c234a, #1d1b2a);
}
.template-preview.blue {
  background: linear-gradient(135deg, #1e3448, #1b202d);
}
.template-preview.green {
  background: linear-gradient(135deg, #1c3937, #1c252b);
}
.preview-lines {
  display: grid;
  gap: 7px;
  width: 60%;
}
.preview-lines i {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.38);
}
.preview-lines i:not(:first-child) {
  width: 70%;
  background: rgba(255, 255, 255, 0.18);
}
.preview-chart {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 35px;
  margin-top: 15px;
}
.preview-chart b {
  width: 11px;
  height: 40%;
  border-radius: 2px 2px 0 0;
  background: #9d8cff;
  opacity: 0.75;
}
.preview-chart b:nth-child(2) {
  height: 75%;
}
.preview-chart b:nth-child(3) {
  height: 52%;
}
.preview-chart b:nth-child(4) {
  height: 90%;
}
.preview-chart b:nth-child(5) {
  height: 65%;
}
.template-info {
  padding: 14px;
}
.template-title {
  justify-content: space-between;
  gap: 8px;
}
.template-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.template-title button {
  display: grid;
  place-items: center;
  padding: 4px;
  border: 0;
  background: none;
  color: #777285;
  cursor: pointer;
}
.template-info > span {
  display: block;
  margin-top: 5px;
}
.owner-row {
  gap: 6px;
  margin-top: 14px;
  color: #858092;
  font-size: 10px;
}
.owner-row i {
  width: 19px;
  height: 19px;
  font-size: 9px;
}
.shared-section {
  margin-top: 54px;
}
.empty-state {
  min-height: 145px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  background: rgba(17, 16, 25, 0.55);
}
.empty-state > div {
  color: #8172d7;
  font-size: 30px;
  line-height: 25px;
}
.empty-state strong {
  font-size: 12px;
}
@media (max-width: 900px) {
  .sidebar {
    width: 190px;
  }
  .main-content {
    padding: 42px 28px;
  }
  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 620px) {
  .topbar {
    height: 64px;
    padding: 0 18px;
  }
  .account-copy,
  .chevron,
  .sidebar-footer {
    display: none;
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
  .content-heading {
    align-items: start;
    flex-direction: column;
    gap: 20px;
  }
  .template-grid {
    grid-template-columns: 1fr;
  }
  .new-card {
    min-height: 180px;
  }
}

.menu-button {
  display: grid;
  place-items: center;
  margin-right: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #aaa5b7;
  background: transparent;
  cursor: pointer;
}
.menu-button:hover,
.icon-button:hover {
  border-color: rgba(157, 140, 255, 0.28);
  color: #f4f4f5;
  background: rgba(124, 92, 247, 0.12);
}
.menu-button svg,
.icon-button svg,
.search-box svg {
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
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
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease;
}
.search-box:focus-within {
  border-color: rgba(157, 140, 255, 0.62);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.12);
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
.icon-button {
  position: relative;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 0;
}

.nav-symbol {
  width: 18px;
  color: #aaa2c4;
  font-size: 20px;
  line-height: 1;
  text-align: center;
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
.sidebar-collapsed .main-content {
  width: min(1300px, 100%);
}
@media (max-width: 700px) {
  .topbar {
    padding: 0 16px;
  }
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
  .account-button {
    padding-left: 4px;
  }
  .account-copy,
  .chevron {
    display: none;
  }
}
@media (max-width: 620px) {
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
    position: fixed;
    z-index: 30;
    top: 62px;
    left: 0;
    width: min(280px, 82vw);
    height: calc(100vh - 62px);
    flex-basis: min(280px, 82vw);
    box-shadow: 18px 0 40px rgba(0, 0, 0, 0.38);
  }
  .workspace-layout:not(.sidebar-collapsed) .sidebar-backdrop {
    position: fixed;
    z-index: 25;
    inset: 62px 0 0;
    display: block;
    width: 100%;
    height: auto;
    padding: 0;
    border: 0;
    background: rgba(0, 0, 0, 0.5);
    cursor: pointer;
  }
  .main-content {
    padding-top: 28px;
  }
}
</style>
