<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  BookImage,
  ClipboardPaste,
  Copy,
  Download,
  FilePlus,
  Menu,
  TableOfContents,
  PanelBottom,
  PanelBottomClose,
  Redo2,
  Trash2,
  Undo2,
} from "@lucide/vue";
import ZoomControls from "./controls/ZoomControls.vue";
import SnapMenu from "./SnapMenu.vue";

// The menu (☰ next to the logo) for the header tools that no longer fit on a
// narrow window, grouped by what they are for; the designer says which are hidden
const props = defineProps<{
  sections: {
    undoRedo?: boolean;
    edit?: boolean;
    view?: boolean;
    download?: boolean;
  };
  zoomLevel: number;
  // The report already has a cover page (its "Add" item is hidden)
  hasCover?: boolean;
  paperWidth: number;
  paperHeight?: number;
  showBottomPanel: boolean;
}>();

const emit = defineEmits<{
  undo: [];
  redo: [];
  "add-page": [];
  "add-cover": [];
  "add-contents": [];
  preview: [];
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
  // Opens under the button, from its left edge
  const left = Math.min(Math.max(SCREEN_GAP, rect.left), window.innerWidth - width - SCREEN_GAP);
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
      :aria-label="t('appMenu.title')"
      :title="t('appMenu.title')"
      @click="toggle"
    >
      <Menu :size="18" :stroke-width="2" aria-hidden="true" />
    </button>

    <Transition name="menu-pop"><div v-if="isOpen" class="more-popover" :style="popoverStyle" role="menu">
      <!-- Edit -->
      <div v-if="sections.undoRedo || sections.edit" class="more-heading">{{ t("appMenu.edit") }}</div>
      <div v-if="sections.undoRedo" class="more-row">
        <button type="button" class="more-tool" role="menuitem" @click="run(() => emit('undo'), true)">
          <Undo2 :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t("actions.undo") }}</span>
        </button>
        <button type="button" class="more-tool" role="menuitem" @click="run(() => emit('redo'), true)">
          <Redo2 :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t("actions.redo") }}</span>
        </button>
      </div>
      <template v-if="sections.edit">
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

      <!-- Pages -->
      <div class="more-divider" />
      <div class="more-heading">{{ t("appMenu.pages") }}</div>
      <button type="button" class="more-item" role="menuitem" @click="run(() => emit('add-page'))">
        <FilePlus :size="16" :stroke-width="2" aria-hidden="true" />
        <span>{{ t("editorHeader.addNewPage") }}</span>
      </button>
      <button v-if="!hasCover" type="button" class="more-item" role="menuitem" @click="run(() => emit('add-cover'))">
        <BookImage :size="16" :stroke-width="2" aria-hidden="true" />
        <span>{{ t("specialPages.addCover") }}</span>
      </button>
      <button type="button" class="more-item" role="menuitem" @click="run(() => emit('add-contents'))">
        <TableOfContents :size="16" :stroke-width="2" aria-hidden="true" />
        <span>{{ t("specialPages.addContents") }}</span>
      </button>
      </template>

      <!-- View -->
      <template v-if="sections.view">
      <div v-if="sections.undoRedo || sections.edit" class="more-divider" />
      <div class="more-heading">{{ t("appMenu.view") }}</div>
      <div class="more-zoom">
        <ZoomControls
          :zoom-level="zoomLevel"
          :paper-width="paperWidth"
          :paper-height="paperHeight"
          @update:zoomLevel="emit('update:zoomLevel', $event)"
        />
      </div>
      <button type="button" class="more-item" role="menuitem" @click="run(() => emit('toggle-bottom-panel'))">
        <component :is="showBottomPanel ? PanelBottomClose : PanelBottom" :size="16" :stroke-width="2" aria-hidden="true" />
        <span>{{ showBottomPanel ? t("actions.hideBottomPanel") : t("actions.showBottomPanel") }}</span>
      </button>
      <div class="more-subheading">{{ t("actions.snapMenu") }}</div>
      <SnapMenu inline />
      </template>

      <!-- Export -->
      <template v-if="sections.download">
      <div class="more-divider" />
      <div class="more-heading">{{ t("appMenu.export") }}</div>
      <button type="button" class="more-item" role="menuitem" @click="run(() => emit('download'))">
        <Download :size="16" :stroke-width="2" aria-hidden="true" />
        <span>{{ t("actions.downloadJRXML") }}</span>
      </button>
      </template>
    </div></Transition>
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
  outline: 2px solid #6440f4;
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
  background: rgba(100, 64, 244, 0.07);
}
.more-tool:focus-visible,
.more-item:focus-visible {
  outline: 2px solid #6440f4;
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
.more-subheading {
  padding: 6px 8px 4px;
  color: #6f6a7e;
  font-size: 12px;
  font-weight: 600;
}
.more-zoom {
  display: flex;
  justify-content: center;
  padding: 0 4px 4px;
}
</style>
