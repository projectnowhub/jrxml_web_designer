<template>
  <!-- A tip at the bottom of the page area the first time something is
       selected (each kind once per browser): how to work with it -->
  <Transition name="first-tip">
    <div v-if="help.firstTip" class="first-tip" role="status">
      <span class="first-tip-icon">
        <Lightbulb :size="18" :stroke-width="2.25" aria-hidden="true" />
      </span>
      <span class="first-tip-text">
        <strong>{{ t(`help.firstTips.${help.firstTip}Title`) }}</strong>
        <span>{{ t(`help.firstTips.${help.firstTip}Text`) }}</span>
      </span>
      <button type="button" class="first-tip-ok" @click="help.closeFirstTip()">
        {{ t("help.firstTips.gotIt") }}
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Lightbulb } from "@lucide/vue";
import { useHelpStore } from "@/stores/help";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import { isPagination } from "@/utils/paginationPresets";
import { isDateElement } from "@/utils/dateElement";
import type { FirstTipId } from "@/utils/helpTours";
import type { DesignElement } from "@/types";

const { t } = useI18n();
const help = useHelpStore();
const report = useReportStore();
const selection = useSelectionStore();

// Long enough to read twice; "Got it" closes it sooner
const SHOW_FOR_MS = 15000;

// The tips for what is selected, the kind's own first, then the general one
// (the page border is the box in the Background band)
function tipsFor(element: DesignElement, bandType: string | undefined): FirstTipId[] {
  if (bandType === "background" || isPagination(element) || isDateElement(element)) return ["select"];
  switch (element.type) {
    case "textField":
      return ["text", "select"];
    case "frame":
      return ["box", "select"];
    case "customTable":
      return ["typedTable", "select"];
    case "table":
      return ["dataTable", "select"];
    case "chart":
      return ["chart", "select"];
    default:
      return ["select"];
  }
}

let hideTimer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => selection.selectedElement,
  (selected) => {
    if (!selected) return;
    const band = report.bands[selected.bandIndex];
    const element =
      selected.parentFrameIndex !== undefined
        ? (band?.elements[selected.parentFrameIndex] as any)?.elements?.[selected.elementIndex]
        : band?.elements[selected.elementIndex];
    if (!element || !help.showFirstTip(tipsFor(element, band?.type))) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => help.closeFirstTip(), SHOW_FOR_MS);
  },
);

onBeforeUnmount(() => {
  clearTimeout(hideTimer);
  help.closeFirstTip();
});
</script>

<style scoped>
.first-tip {
  position: absolute;
  z-index: 80;
  left: 50%;
  bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  width: max-content;
  max-width: min(520px, calc(100% - 32px));
  padding: 12px 12px 12px 14px;
  border: 1px solid #e6e5ee;
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  transform: translateX(-50%);
  box-sizing: border-box;
}
.first-tip-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
}
.first-tip-text {
  display: grid;
  gap: 2px;
  min-width: 0;
  color: #45425a;
  font-size: 13px;
  line-height: 1.45;
}
.first-tip-text strong {
  color: #1c1b26;
  font-size: 13.5px;
}
.first-tip-ok {
  flex-shrink: 0;
  height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c5cf7, #6440f4);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.first-tip-ok:hover {
  filter: brightness(1.06);
}
.first-tip-ok:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 2px;
}

.first-tip-enter-active,
.first-tip-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.first-tip-enter-from,
.first-tip-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
@media (prefers-reduced-motion: reduce) {
  .first-tip-enter-active,
  .first-tip-leave-active {
    transition: none;
  }
}
</style>
