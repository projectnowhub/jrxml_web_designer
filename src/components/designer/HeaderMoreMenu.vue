<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  ClipboardPaste,
  Copy,
  Download,
  Ellipsis,
  FilePlus,
  PanelBottom,
  PanelBottomClose,
  Redo2,
  Trash2,
  Undo2,
} from "@lucide/vue";
import ZoomControls from "./controls/ZoomControls.vue";
import SnapMenu from "./SnapMenu.vue";

// The header tools that don't fit on a narrow screen, in one "More" menu.
// The designer says which groups are in here; the rest stay in the header.
const props = defineProps<{
  sections: {
    undoRedo?: boolean;
    edit?: boolean;
    zoom?: boolean;
    bottomPanel?: boolean;
    snap?: boolean;
    download?: boolean;
  };
  zoomLevel: number;
  paperWidth: number;
  showBottomPanel: boolean;
}>();

const emit = defineEmits<{
  undo: [];
  redo: [];
  "add-page": [];
  delete: [];
  copy: [];
  paste: [];
  "toggle-bottom-panel": [];
  download: [];
  "update:zoomLevel": [zoom: number];
}>();

const { t } = useI18n();

const isOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const buttonRef = ref<HTMLElement | null>(null);
const popoverStyle = ref<Record<string, string>>({});

const MENU_WIDTH = 280;
const SCREEN_GAP = 8;

// Under the button, kept inside the window
function placePopover() {
  const rect = buttonRef.value?.getBoundingClientRect();
  if (!rect) return;
  const width = Math.min(MENU_WIDTH, window.innerWidth - SCREEN_GAP * 2);
  const left = Math.min(
    Math.max(SCREEN_GAP, rect.right - width),
    window.innerWidth - width - SCREEN_GAP,
  );
  popoverStyle.value = {
    top: `${rect.bottom + 8}px`,
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${window.innerHeight - rect.bottom - 16}px`,
  };
}

async function toggle() {
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    await nextTick();
    placePopover();
  }
}

// Undo / redo keep the menu open (they're often pressed a few times)
function run(action: () => void, keepOpen = false) {
  action();
  if (!keepOpen) isOpen.value = false;
}

const handleClickOutside = (event: MouseEvent): void => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape" && isOpen.value) isOpen.value = false;
};

const handleResize = () => {
  if (isOpen.value) placePopover();
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  document.addEventListener("keydown", handleKeydown);
  window.addEventListener("resize", handleResize);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
  document.removeEventListener("keydown", handleKeydown);
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <div ref="menuRef" class="more-menu">
    <button
      ref="buttonRef"
      class="more-button"
      :class="{ open: isOpen }"
      type="button"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :aria-label="t('editorHeader.more')"
      :title="t('editorHeader.more')"
      @click="toggle"
    >
      <Ellipsis :size="18" :stroke-width="2" aria-hidden="true" />
    </button>

    <div v-if="isOpen" class="more-popover" :style="popoverStyle" role="menu">
      <!-- Undo / redo -->
      <div v-if="props.sections.undoRedo" class="more-row">
        <button type="button" class="more-tool" role="menuitem" @click="run(() => emit('undo'), true)">
          <Undo2 :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t("actions.undo") }}</span>
        </button>
        <button type="button" class="more-tool" role="menuitem" @click="run(() => emit('redo'), true)">
          <Redo2 :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t("actions.redo") }}</span>
        </button>
      </div>

      <!-- Page, delete, copy, paste -->
      <template v-if="props.sections.edit">
        <div v-if="props.sections.undoRedo" class="more-divider" />
        <button type="button" class="more-item" role="menuitem" @click="run(() => emit('add-page'))">
          <FilePlus :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t("editorHeader.addNewPage") }}</span>
        </button>
        <button type="button" class="more-item" role="menuitem" @click="run(() => emit('copy'))">
          <Copy :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t("actions.copy") }}</span>
        </button>
        <button type="button" class="more-item" role="menuitem" @click="run(() => emit('paste'))">
          <ClipboardPaste :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t("actions.paste") }}</span>
        </button>
        <button type="button" class="more-item is-danger" role="menuitem" @click="run(() => emit('delete'))">
          <Trash2 :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t("actions.delete") }}</span>
        </button>
      </template>

      <!-- Zoom -->
      <template v-if="props.sections.zoom">
        <div class="more-divider" />
        <div class="more-heading">{{ t("editorHeader.zoom") }}</div>
        <div class="more-zoom">
          <ZoomControls
            :zoom-level="zoomLevel"
            :paper-width="paperWidth"
            @update:zoomLevel="emit('update:zoomLevel', $event)"
          />
        </div>
      </template>

      <!-- Bottom panel -->
      <template v-if="props.sections.bottomPanel">
        <div class="more-divider" />
        <button type="button" class="more-item" role="menuitem" @click="run(() => emit('toggle-bottom-panel'))">
          <component :is="showBottomPanel ? PanelBottomClose : PanelBottom" :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ showBottomPanel ? t("actions.hideBottomPanel") : t("actions.showBottomPanel") }}</span>
        </button>
      </template>

      <!-- Snap & grid -->
      <template v-if="props.sections.snap">
        <div class="more-divider" />
        <div class="more-heading">{{ t("actions.snapMenu") }}</div>
        <SnapMenu inline />
      </template>

      <!-- Download JRXML -->
      <template v-if="props.sections.download">
        <div class="more-divider" />
        <button type="button" class="more-item" role="menuitem" @click="run(() => emit('download'))">
          <Download :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t("actions.downloadJRXML") }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.more-menu {
  position: relative;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.more-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.15s ease;
}
.more-button:hover,
.more-button.open {
  background: #f3f4f6;
  color: #111827;
}
.more-button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}
.more-popover {
  position: fixed;
  z-index: 1100;
  padding: 8px;
  overflow-y: auto;
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
.more-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.more-tool,
.more-item {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #374151;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s ease;
}
.more-tool {
  justify-content: center;
  gap: 6px;
  padding: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
}
.more-item {
  width: 100%;
  padding: 8px;
}
.more-tool:hover,
.more-item:hover {
  background: rgba(37, 99, 235, 0.07);
}
.more-tool:focus-visible,
.more-item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: -2px;
}
.more-item.is-danger {
  color: #dc2626;
}
.more-item.is-danger:hover {
  background: rgba(220, 38, 38, 0.08);
}
.more-divider {
  height: 1px;
  margin: 6px 0;
  background: rgba(28, 27, 38, 0.08);
}
.more-heading {
  padding: 4px 8px 6px;
  color: #9ca3af;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.more-zoom {
  display: flex;
  justify-content: center;
  padding: 0 4px 4px;
}
</style>
