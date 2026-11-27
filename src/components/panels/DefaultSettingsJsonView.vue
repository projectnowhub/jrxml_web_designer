<template>
  <div class="ds">
    <div class="ds-header">
      <span class="ds-badge" :class="`is-${source}`">
        <component :is="source === 'developer' ? Lock : UserPen" :size="12" :stroke-width="2.25" aria-hidden="true" />
        {{ t(`defaultSettingsJson.${source}.badge`) }}
      </span>
      <span class="ds-note">{{ t(`defaultSettingsJson.${source}.hint`) }}</span>
      <n-button type="default" size="small" @click="copyJson">
        <template #icon><Copy :size="13" /></template>
        {{ t("bottomPanel.copy") }}
      </n-button>
    </div>
    <pre class="ds-json">{{ shownJson }}</pre>
  </div>
</template>

<script setup lang="ts">
// Read only: the developer defaults change only in code, the user defaults in
// Default Settings (and Snap & grid); this tab shows them as JSON to copy
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import { Copy, Lock, UserPen } from "@lucide/vue";
import { collectUserSettings, useUserSettingsStore } from "@/stores/userSettings";
import { developerDefaultSettings } from "@/utils/defaultSettingsJson";
import notification from "@/utils/notification";

const props = defineProps<{ active: boolean; source: "user" | "developer" }>();
const { t } = useI18n();
const userSettings = useUserSettingsStore();


// Built only while the tab is shown; the user's follow every change and every sync
const value = computed(() => {
  if (!props.active) return null;
  if (props.source === "developer") return developerDefaultSettings();
  void userSettings.changes;
  return collectUserSettings();
});
const shownJson = computed(() => (value.value ? JSON.stringify(value.value, null, 2) : ""));

async function copyJson() {
  try {
    await navigator.clipboard.writeText(shownJson.value);
    notification.success(t("defaultSettingsJson.copied"));
  } catch {
    notification.error(t("bottomPanel.copyFailed"));
  }
}
</script>

<style scoped>
.ds {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-size: 12px;
  color: #1c1b26;
}

.ds-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid #e6e5ee;
}

.ds-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;
}

.ds-badge.is-developer {
  background: #f6f5fb;
  color: #5b5a6b;
}

.ds-badge.is-user {
  background: #f1edfe;
  color: #6440f4;
}

.ds-note {
  flex: 1;
  min-width: 160px;
  color: #5b5a6b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.ds-json {
  flex: 1;
  margin: 0;
  padding: 12px;
  overflow: auto;
  line-height: 1.5;
}
</style>
