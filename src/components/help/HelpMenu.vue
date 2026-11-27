<template>
  <!-- Help in the header (home page and designer), kept short: the tour, the
       Quick guide, and in the designer keyboard shortcuts, Guides and All
       elements (the Help window, whose tabs also hold This item); at
       the bottom, the Tutorial mode switch -->
  <div ref="menuRef" class="help-menu" data-help="help">
    <button
      type="button"
      class="help-button"
      :class="{ 'is-open': isOpen, 'has-label': showLabel }"
      :aria-label="t('help.menu.button')"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <CircleHelp :size="18" :stroke-width="2.25" aria-hidden="true" />
      <span v-if="showLabel">{{ t("help.menu.button") }}</span>
    </button>
    <Transition name="menu-pop">
      <div v-if="isOpen" class="help-popover" role="menu">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="help-item"
          role="menuitem"
          @click="choose(item.id)"
        >
          <span class="help-item-icon">
            <component :is="item.icon" :size="17" :stroke-width="2.25" aria-hidden="true" />
          </span>
          <span class="help-item-text">
            <strong>{{ t(`help.menu.${item.id}`) }}</strong>
            <small>{{ t(`help.menu.${item.id}Hint`) }}</small>
          </span>
        </button>
        <div class="help-divider" />
        <div class="help-switch">
          <SwitchControl
            :model-value="help.tutorialMode"
            :label="t('help.menu.tutorialMode')"
            :description="t('help.menu.tutorialModeHint')"
            @update:model-value="setTutorialMode"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from "vue";
import { useI18n } from "vue-i18n";
import { BookOpen, CircleHelp, Compass, Keyboard, LayoutGrid, ListChecks } from "@lucide/vue";
import { useHelpStore } from "@/stores/help";
import notification from "@/utils/notification";
import SwitchControl from "../designer/properties/common/SwitchControl.vue";
import type { TourId } from "@/utils/helpTours";

type ItemId = "tour" | "guide" | "shortcuts" | "showMeHow" | "allElements";

const props = withDefaults(
  defineProps<{
    // Which page it is on: its tour, and the designer's extra items
    context: TourId;
    showLabel?: boolean;
  }>(),
  { showLabel: false },
);

const { t } = useI18n();
const help = useHelpStore();

const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const items = computed(() => {
  const list: { id: ItemId; icon: Component }[] = [
    { id: "tour", icon: Compass },
    { id: "guide", icon: BookOpen },
  ];
  if (props.context === "designer") {
    list.push(
      { id: "shortcuts", icon: Keyboard },
      { id: "showMeHow", icon: ListChecks },
      { id: "allElements", icon: LayoutGrid },
    );
  }
  return list;
});

function choose(id: ItemId) {
  isOpen.value = false;
  if (id === "tour") help.startTour(props.context);
  else if (id === "guide") help.openGuide(props.context);
  else if (id === "shortcuts") help.openGuide(props.context, "shortcuts");
  else if (id === "showMeHow") help.openPanel("guides");
  else help.openPanel("elements");
}

function setTutorialMode(on: boolean) {
  help.setTutorialMode(on);
  notification.info(t(on ? "help.menu.tutorialOnDone" : "help.menu.tutorialOffDone"));
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

<style scoped>
.help-menu {
  position: relative;
  display: flex;
  align-items: center;
}
.help-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #45425a;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease,
    color 0.14s ease;
}
.help-button.has-label {
  padding: 0 12px 0 10px;
}
.help-button:hover,
.help-button.is-open {
  border-color: rgba(124, 92, 247, 0.35);
  background: rgba(124, 92, 247, 0.08);
  color: #6440f4;
}
.help-button:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 2px;
}
.help-popover {
  position: absolute;
  z-index: 1100;
  top: calc(100% + 8px);
  right: 0;
  width: 290px;
  max-width: calc(100vw - 32px);
  padding: 6px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  box-sizing: border-box;
}
.help-divider {
  height: 1px;
  margin: 6px 4px;
  background: rgba(28, 27, 38, 0.08);
}
.help-switch {
  padding: 6px 10px 8px;
}
.help-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 9px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #1c1b26;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease;
}
.help-item:hover,
.help-item:focus-visible {
  background: rgba(124, 92, 247, 0.08);
  outline: none;
}
.help-item-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
}
.help-item-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.help-item-text strong {
  font-size: 13px;
  font-weight: 700;
}
.help-item-text small {
  color: #6f6a7e;
  font-size: 12px;
  line-height: 1.4;
}
</style>
