<template>
  <!-- The minimized Help window: a tab at the right side that opens it again.
       In the collapsed Properties rail it sits under "PROPERTIES" (inRail);
       with Properties open, on that panel's left edge. -->
  <button
    v-if="help.panelOpen && help.panelMinimized"
    type="button"
    class="help-dock-tab"
    :class="{ 'in-rail': inRail }"
    :title="t('helpDocs.panel.expand')"
    :aria-label="t('helpDocs.panel.expand')"
    @click="help.panelMinimized = false"
  >
    <CircleHelp :size="15" :stroke-width="2.25" aria-hidden="true" />
    <span class="help-dock-label">{{ t("helpDocs.panel.title") }}</span>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { CircleHelp } from "@lucide/vue";
import { useHelpStore } from "@/stores/help";

defineProps<{ inRail?: boolean }>();

const { t } = useI18n();
const help = useHelpStore();
</script>

<style scoped>
.help-dock-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 7px;
  border: 1px solid rgba(124, 92, 247, 0.35);
  background: #ffffff;
  color: #6440f4;
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;
}
.help-dock-tab:hover {
  border-color: rgba(124, 92, 247, 0.6);
  background: rgba(124, 92, 247, 0.08);
}
.help-dock-tab:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 2px;
}
/* On the open Properties panel's left edge, like a bookmark */
.help-dock-tab:not(.in-rail) {
  position: absolute;
  z-index: 40;
  top: 16px;
  right: 0;
  border-right: 0;
  border-radius: 10px 0 0 10px;
  box-shadow: -4px 4px 14px rgba(23, 20, 44, 0.1);
}
/* In the collapsed Properties rail, under its name */
.help-dock-tab.in-rail {
  border-radius: 9px;
}
.help-dock-label {
  writing-mode: vertical-rl;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
