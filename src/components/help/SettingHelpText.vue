<template>
  <!-- A settings card's explanation, inside the card under its title, while
       its (i) is open: what the setting does, an example, and the element's
       full help page -->
  <div v-if="open" class="setting-help" role="note">
    <p>{{ t(`helpDocs.settings.${id}.text`) }}</p>
    <p v-if="te(`helpDocs.settings.${id}.example`)" class="setting-help-example">
      {{ t(`helpDocs.settings.${id}.example`) }}
    </p>
    <div class="setting-help-actions">
      <button type="button" class="setting-help-more" @click="help.openPanel('item')">
        {{ t("helpDocs.learnMore") }}
      </button>
      <button type="button" class="setting-help-close" @click="help.toggleSetting(id)">
        {{ t("helpDocs.closeExplanation") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useHelpStore } from "@/stores/help";
import type { SettingId } from "@/utils/helpDocs";

const props = defineProps<{ id: SettingId }>();

const { t, te } = useI18n();
const help = useHelpStore();

const open = computed(() => help.openSettings.includes(props.id));
</script>

<style scoped>
.setting-help {
  display: grid;
  gap: 6px;
  margin: 0 0 10px;
  padding: 10px 12px;
  border-left: 3px solid #7c5cf7;
  border-radius: 0 8px 8px 0;
  background: rgba(124, 92, 247, 0.06);
}
.setting-help p {
  margin: 0;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.5;
  text-transform: none;
  letter-spacing: normal;
}
.setting-help .setting-help-example {
  color: #6f6a7e;
  font-style: italic;
}
.setting-help-actions {
  display: flex;
  gap: 12px;
}
.setting-help-more,
.setting-help-close {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.setting-help-more {
  color: #6440f4;
}
.setting-help-close {
  color: #6f6a7e;
}
.setting-help-more:hover,
.setting-help-close:hover {
  text-decoration: underline;
}
</style>
