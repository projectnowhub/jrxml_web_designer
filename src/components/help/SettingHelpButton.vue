<template>
  <!-- The (i) next to a settings card's title: opens or closes the card's
       explanation (SettingHelpText, placed under the title) -->
  <button
    type="button"
    class="setting-help-btn"
    :class="{ 'is-open': open }"
    :title="t('helpDocs.settingHelp', { name: t(`helpDocs.settings.${id}.title`) })"
    :aria-label="t('helpDocs.settingHelp', { name: t(`helpDocs.settings.${id}.title`) })"
    :aria-expanded="open"
    @click.stop="help.toggleSetting(id)"
  >
    <Info :size="13" :stroke-width="2.25" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Info } from "@lucide/vue";
import { useHelpStore } from "@/stores/help";
import type { SettingId } from "@/utils/helpDocs";

const props = defineProps<{ id: SettingId }>();

const { t } = useI18n();
const help = useHelpStore();

const open = computed(() => help.openSettings.includes(props.id));
</script>

<style scoped>
.setting-help-btn {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-left: 4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #9a94ab;
  vertical-align: middle;
  cursor: pointer;
}
.setting-help-btn:hover,
.setting-help-btn.is-open {
  background: rgba(124, 92, 247, 0.12);
  color: #6440f4;
}
.setting-help-btn:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 1px;
}
</style>
