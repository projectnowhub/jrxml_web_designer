<template>
  <div class="file-menu-container" :class="{ 'is-compact': compact }" ref="fileMenuContainer">
    <n-button
      v-if="compact"
      @click="toggleFileMenu"
      type="default"
      :title="showFileMenu ? undefined : t('fileManager.title')"
      :aria-label="t('fileManager.title')"
      aria-haspopup="menu"
      :aria-expanded="showFileMenu"
    >
      <FolderOpen :size="16" />
    </n-button>
    <n-button v-else @click="toggleFileMenu" type="default" aria-haspopup="menu" :aria-expanded="showFileMenu">
      <template #icon><FolderOpen :size="16" :stroke-width="2" aria-hidden="true" /></template>
      {{ t('fileManager.title') }}
    </n-button>
    <div v-if="showFileMenu" class="file-menu-dropdown">
      <div class="menu-item" @click="createNewFile">
        <FilePlus class="menu-icon" :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t('fileManager.newFile') }}</span>
        <span class="menu-keys"><kbd>Alt</kbd><kbd>N</kbd></span>
      </div>
      <div class="menu-item" @click="openLocalFile">
        <FolderOpen class="menu-icon" :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t('fileManager.openLocalFile') }}</span>
        <span class="menu-keys"><kbd>{{ keyLabel('Mod') }}</kbd><kbd>O</kbd></span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item menu-item-danger" @click="askDeleteAllFiles">
        <Trash2 class="menu-icon" :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t('fileManager.deleteAllFiles') }}</span>
      </div>
    </div>

    <OpenTemplateModal
      v-model:visible="showOpen"
      @load-file="emit('load-file', $event)"
      @open-jrxml="emit('open-jrxml', $event)"
    />

    <!-- Delete all confirmation dialog -->
    <ConfirmModal
      v-model:visible="showDeleteAllModal"
      :title="t('fileManager.deleteAllFiles')"
      :message="t('fileManager.deleteAllFilesConfirm')"
      @confirm="emit('delete-all-files')"
    />
  </div>
</template>

<script setup lang="ts">
import { FilePlus, FolderOpen, Trash2 } from '@lucide/vue';
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton } from 'naive-ui';
import type { DesignerFile } from '@/types/designerFile';
import ConfirmModal from '../../modals/ConfirmModal.vue';
import OpenTemplateModal from '../../modals/OpenTemplateModal.vue';
import { keyLabel } from '@/utils/helpDocs';

const { t } = useI18n();

interface Emits {
  (e: 'create-new-file'): void;
  (e: 'load-file', file: DesignerFile): void;
  (e: 'open-jrxml', file: { name: string; content: string }): void;
  (e: 'delete-all-files'): void;
}

const emit = defineEmits<Emits>();

// `compact`: an icon button, and the menu spans the screen (narrow screens)
defineProps<{ compact?: boolean }>();

// File management related state
const showFileMenu = ref(false);
const fileMenuContainer = ref<HTMLElement | null>(null);
const showDeleteAllModal = ref(false);

// Toggle the file menu
function toggleFileMenu() {
  showFileMenu.value = !showFileMenu.value;
}

// Delete every report saved in this browser (asks first)
function askDeleteAllFiles() {
  showFileMenu.value = false;
  showDeleteAllModal.value = true;
}

// Create a new file
function createNewFile() {
  showFileMenu.value = false;
  emit('create-new-file');
}

// Open: a saved template or a .jrxml file from the computer (OpenTemplateModal)
const showOpen = ref(false);
function openLocalFile() {
  showFileMenu.value = false;
  showOpen.value = true;
}
// Ctrl/⌘+O in the designer
defineExpose({ showOpenWindow: openLocalFile });

// Close the menu when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (fileMenuContainer.value && !fileMenuContainer.value.contains(event.target as Node)) {
    showFileMenu.value = false;
    }
}

// Listen for click events
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.file-menu-container {
  position: relative;
  display: inline-block;
}

/* Narrow screens: the menu sits under the header across the screen, and the
   file list opens below its item instead of beside it */
.is-compact .file-menu-dropdown {
  position: fixed;
  top: 52px;
  left: 8px;
  right: 8px;
  max-width: 360px;
  min-width: 0;
  max-height: calc(100vh - 64px);
  margin-top: 0;
  overflow-y: auto;
}




/* Same look as the account menu */
.file-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 1000;
  min-width: 232px;
  padding: 8px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  box-sizing: border-box;
  animation: file-menu-in 0.16s ease;
}

@keyframes file-menu-in {
  from {
    opacity: 0;
    transform: translateY(-3px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border-radius: 6px;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s ease;
  position: relative;
}

.menu-item:hover {
  background: rgba(124, 92, 247, 0.08);
}

.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-icon {
  flex-shrink: 0;
}

/* The item's shortcut, at its right edge */
.menu-keys {
  display: inline-flex;
  gap: 3px;
  margin-left: auto;
  padding-left: 16px;
}

.menu-keys kbd {
  padding: 1px 5px;
  border: 1px solid #e6e5ee;
  border-bottom-width: 2px;
  border-radius: 4px;
  background: #fafafc;
  color: #6e6a80;
  font-family: inherit;
  font-size: 10.5px;
  font-weight: 600;
}

/* Same look as Sign out in the account menu */
.menu-item-danger {
  color: #e5484d;
}

.menu-item-danger:hover {
  background: rgba(229, 72, 77, 0.09);
  color: #d0342e;
}

.menu-divider {
  height: 1px;
  margin: 4px 0;
  background: rgba(28, 27, 38, 0.08);
}
</style>
