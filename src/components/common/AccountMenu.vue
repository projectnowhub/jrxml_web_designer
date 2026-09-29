<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { Languages, LogOut, UserRound } from "@lucide/vue";
import { getStoredUser } from "../../utils/auth";
import { logout } from "../../services/authService";
import LanguageSwitcher from "./LanguageSwitcher.vue";

const { t } = useI18n();
const router = useRouter();

const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const storedUser = getStoredUser();
const userName =
  storedUser.firstName || storedUser.name || storedUser.username || "";
const userEmail = storedUser.email || "";
const userInitial = (userName || t("home.defaultUserName")).charAt(0).toUpperCase();

function goToMyProfile() {
  isOpen.value = false;
  router.push("/myprofile");
}

function signOut() {
  isOpen.value = false;
  void logout();
}

const handleClickOutside = (event: MouseEvent): void => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape" && isOpen.value) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <div ref="menuRef" class="account-menu">
    <button
      class="account-button"
      type="button"
      :aria-label="t('layout.accountMenu')"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span class="avatar">{{ userInitial }}</span>
    </button>
    <div v-if="isOpen" class="account-popover" role="menu">
      <div class="account-popover-header">
        <span class="avatar">{{ userInitial }}</span>
        <div>
          <strong>{{ userName || t("home.defaultUserName") }}</strong>
          <span>{{ userEmail || t("layout.defaultWorkspace") }}</span>
        </div>
      </div>
      <div class="account-popover-divider" />
      <button
        class="account-action"
        type="button"
        role="menuitem"
        @click="goToMyProfile"
      >
        <UserRound :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t("layout.myProfile") }}</span>
      </button>
      <div class="account-language">
        <Languages :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t("language.label") }}</span>
        <LanguageSwitcher :show-icon="false" />
      </div>
      <div class="account-popover-divider" />
      <button
        class="account-action sign-out"
        type="button"
        role="menuitem"
        @click="signOut"
      >
        <LogOut :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t("layout.signOut") }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.account-menu {
  position: relative;
  display: flex;
  align-items: center;
}
.account-button {
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}
.account-button:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 2px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: 2px solid #7c5cf7;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c5cf7, #6366f1);
  color: white;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 3px 12px rgba(99, 102, 241, 0.32);
  box-sizing: border-box;
}
.account-popover {
  position: absolute;
  z-index: 1100;
  top: calc(100% + 8px);
  right: 0;
  width: 256px;
  padding: 8px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  box-sizing: border-box;
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
.account-language {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 600;
}
.account-language > span {
  flex: 1;
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
</style>
