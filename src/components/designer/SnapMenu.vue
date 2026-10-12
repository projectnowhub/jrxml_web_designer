<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { NCheckbox, NTooltip } from "naive-ui";
import { ChevronDown, Info, Magnet } from "@lucide/vue";
import { useEditorStore } from "@/stores/editor";

// Snapping and grid choices, in one dropdown so the header stays roomy
// `inline`: just the choices, for the header's More menu on narrow screens;
// `compact`: the button without its label
defineProps<{ inline?: boolean; compact?: boolean }>();

const { t } = useI18n();
const editorStore = useEditorStore();
const { enableSnapToGrid, enableSnapToAlignment, showGrid } = storeToRefs(editorStore);

const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);

function setSnapToAlignment(on: boolean) {
  enableSnapToAlignment.value = on;
  if (!on) editorStore.clearAlignmentLines();
}

// Each choice with a short explanation behind its info icon
const options = computed(() => [
  {
    key: "grid",
    label: t("actions.snapToGrid"),
    info: t("actions.snapToGridInfo"),
    checked: enableSnapToGrid.value,
    set: (on: boolean) => (enableSnapToGrid.value = on),
  },
  {
    key: "alignment",
    label: t("actions.snapToAlignment"),
    info: t("actions.snapToAlignmentInfo"),
    checked: enableSnapToAlignment.value,
    set: setSnapToAlignment,
  },
  {
    key: "showGrid",
    label: t("actions.showGrid"),
    info: t("actions.showGridInfo"),
    checked: showGrid.value,
    set: (on: boolean) => (showGrid.value = on),
  },
]);

const handleClickOutside = (event: MouseEvent): void => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape" && isOpen.value) isOpen.value = false;
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
  <div v-if="inline" class="snap-inline">
    <div v-for="option in options" :key="option.key" class="snap-option">
      <n-checkbox
        class="snap-check"
        :checked="option.checked"
        @update:checked="option.set"
      >
        {{ option.label }}
      </n-checkbox>
      <n-tooltip :placement="inline ? 'left' : 'right'" :style="{ maxWidth: '240px' }">
        <template #trigger>
          <button
            type="button"
            class="snap-info"
            :aria-label="option.info"
            @click.stop
          >
            <Info :size="14" :stroke-width="2" aria-hidden="true" />
          </button>
        </template>
        {{ option.info }}
      </n-tooltip>
    </div>
    <p class="snap-hint">{{ t("actions.snapBypassHint") }}</p>
  </div>
  <div v-else ref="menuRef" class="snap-menu">
    <button
      class="snap-button"
      :class="{ open: isOpen }"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-label="t('actions.snapMenu')"
      :title="compact ? t('actions.snapMenu') : undefined"
      @click="isOpen = !isOpen"
    >
      <Magnet :size="16" :stroke-width="2" aria-hidden="true" />
      <span v-if="!compact">{{ t("actions.snapMenu") }}</span>
      <ChevronDown class="snap-caret" :size="14" aria-hidden="true" />
    </button>
    <div v-if="isOpen" class="snap-popover" role="menu">
      <div v-for="option in options" :key="option.key" class="snap-option">
        <n-checkbox
          class="snap-check"
          :checked="option.checked"
          @update:checked="option.set"
        >
          {{ option.label }}
        </n-checkbox>
        <n-tooltip :placement="inline ? 'left' : 'right'" :style="{ maxWidth: '240px' }">
          <template #trigger>
            <button
              type="button"
              class="snap-info"
              :aria-label="option.info"
              @click.stop
            >
              <Info :size="14" :stroke-width="2" aria-hidden="true" />
            </button>
          </template>
          {{ option.info }}
        </n-tooltip>
      </div>
      <div class="snap-divider" />
      <p class="snap-hint">{{ t("actions.snapBypassHint") }}</p>
    </div>
  </div>
</template>

<style scoped>
.snap-menu {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.snap-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #4b5563;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}
.snap-button:hover,
.snap-button.open {
  background: #f3f4f6;
  color: #111827;
}
.snap-button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
.snap-caret {
  color: #9ca3af;
  transition: transform 0.15s ease;
}
.snap-button.open .snap-caret {
  transform: rotate(180deg);
}
.snap-popover {
  position: absolute;
  z-index: 1100;
  top: calc(100% + 8px);
  left: 0;
  width: 240px;
  padding: 8px;
  display: flex;
  flex-direction: column;
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
.snap-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px 3px 8px;
  border-radius: 6px;
  transition: background 0.14s ease;
}
.snap-check {
  flex: 1;
  min-width: 0;
  padding: 4px 0;
  font-size: 13px;
}
.snap-info {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #9ca3af;
  cursor: help;
  transition: all 0.14s ease;
}
.snap-info:hover,
.snap-info:focus-visible {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  outline: none;
}
.snap-option:hover {
  background: rgba(37, 99, 235, 0.06);
}
.snap-divider {
  height: 1px;
  margin: 6px 0;
  background: rgba(28, 27, 38, 0.08);
}
.snap-inline .snap-hint {
  padding-top: 6px;
}
.snap-hint {
  margin: 0;
  padding: 2px 8px 4px;
  color: #6b7280;
  font-size: 11.5px;
  line-height: 1.45;
}
</style>
