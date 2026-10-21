<template>
  <!-- One line at the top of the Properties panel: what the selected item is
       and what to do with it. Closed per kind of item (turning Tutorial mode
       back on brings them back). -->
  <Transition name="panel-tip">
    <div v-if="shown" class="panel-tip" role="note">
      <Lightbulb class="panel-tip-icon" :size="16" :stroke-width="2.25" aria-hidden="true" />
      <p class="panel-tip-text">
        {{ t(`help.panelTips.${kind}`) }}
        <button type="button" class="panel-tip-more" @click="help.openPanel('item')">
          {{ t("helpDocs.learnMore") }}
        </button>
      </p>
      <button
        type="button"
        class="panel-tip-close"
        :title="t('help.panelTips.hide')"
        :aria-label="t('help.panelTips.hide')"
        @click="help.hidePanelTip(kind)"
      >
        <X :size="14" :stroke-width="2.25" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Lightbulb, X } from "@lucide/vue";
import { useHelpStore } from "@/stores/help";

const props = defineProps<{ kind: string }>();

const { t, te } = useI18n();
const help = useHelpStore();

// Only in Tutorial mode, and not once closed for this kind
const shown = computed(
  () =>
    help.tutorialMode && te(`help.panelTips.${props.kind}`) && !help.hiddenPanelTips.includes(props.kind),
);
</script>

<style scoped>
.panel-tip {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 0 0 12px;
  padding: 10px 8px 10px 12px;
  border: 1px solid rgba(124, 92, 247, 0.22);
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.07);
}
.panel-tip-icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: #6440f4;
}
.panel-tip-text {
  flex: 1;
  margin: 0;
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.5;
}
.panel-tip-more {
  padding: 0;
  border: 0;
  background: transparent;
  color: #6440f4;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.panel-tip-more:hover {
  text-decoration: underline;
}
.panel-tip-close {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin: -3px 0 0;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #6f6a7e;
  cursor: pointer;
}
.panel-tip-close:hover {
  background: rgba(124, 92, 247, 0.12);
  color: #6440f4;
}
.panel-tip-close:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 1px;
}

.panel-tip-leave-active {
  transition: opacity 0.18s ease;
}
.panel-tip-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .panel-tip-leave-active {
    transition: none;
  }
}
</style>
