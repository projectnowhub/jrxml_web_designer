<template>
  <div class="file-menu-container" :class="{ 'is-compact': compact }" ref="fileMenuContainer">
    <n-button
      v-if="compact"
      @click="toggleFileMenu"
      type="default"
      :title="t('fileManager.title')"
      :aria-label="t('fileManager.title')"
    >
      <FolderOpen :size="16" />
    </n-button>
    <n-button v-else @click="toggleFileMenu" type="default">{{ t('fileManager.title') }}</n-button>
    <div v-if="showFileMenu" class="file-menu-dropdown">
      <div class="menu-item" @click="createNewFile">
        <FilePlus class="menu-icon" :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t('fileManager.newFile') }}</span>
      </div>
      <div class="menu-item" @click="openLocalFile">
        <FolderOpen class="menu-icon" :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t('fileManager.openLocalFile') }}</span>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item file-submenu-container" @click="toggleFileSubmenu">
        <FileText class="menu-icon" :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t('fileManager.fileList') }}</span>
        <ChevronRight class="submenu-arrow" :size="14" />
        <div v-if="showFileSubmenu" class="file-submenu" @click.stop>
          <div class="submenu-header">
            <h4>{{ t('fileManager.fileList') }}</h4>
            <div class="file-filter">
              <input 
                v-model="fileFilterText" 
                type="text" 
                :placeholder="t('fileManager.searchFile')" 
                class="filter-input"
                @click.stop
              />
              <n-button 
                v-if="fileFilterText" 
                @click.stop="fileFilterText = ''" 
                type="default"
                quaternary
                circle
                size="small"
                :title="t('fileManager.searchFile')"
              >
                <X :size="14" />
              </n-button>
            </div>
          </div>
          <div class="submenu-file-list">
            <div 
              v-for="file in filteredFiles" 
              :key="file.id"
              class="submenu-file-item"
              :class="{ 'active': currentFileName === file.name }"
              @click.stop="selectFileFromSubmenu(file)"
            >
              <div class="file-info">
                <span class="file-name">{{ file.name }}</span>
                <span class="file-date">{{ formatDate(file.lastModified) }}</span>
              </div>
              <div class="file-item-actions">
                <n-button @click.stop="renameFileFromSubmenu(file)" type="default" quaternary circle size="small" :title="t('fileManager.rename')">
                  <SquarePen :size="14" />
                </n-button>
                <n-button @click.stop="deleteFileFromSubmenu(file)" type="error" quaternary circle size="small" :title="t('fileManager.delete')">
                  <Trash2 :size="14" />
                </n-button>
              </div>
            </div>
            <div v-if="filteredFiles.length === 0" class="empty-state">
              <p>{{ t('fileManager.noFilesFound') }}</p>
              <n-button @click.stop="createNewFile" type="primary">{{ t('fileManager.createNewFile') }}</n-button>
            </div>
          </div>
         
        </div>
      </div>
      <div class="menu-divider"></div>
      <div class="menu-item menu-item-danger" @click="askDeleteAllFiles">
        <Trash2 class="menu-icon" :size="17" :stroke-width="2.25" aria-hidden="true" />
        <span>{{ t('fileManager.deleteAllFiles') }}</span>
      </div>
    </div>

    <!-- Rename dialog -->
    <InputModal
      v-model:visible="showRenameModal"
      :title="t('fileManager.renameFile')"
      :message="t('fileManager.enterNewFileName')"
      :default-value="pendingFile?.name || ''"
      @confirm="handleConfirmRename"
    />

    <!-- Delete confirmation dialog -->
    <ConfirmModal
      v-model:visible="showDeleteModal"
      :title="t('fileManager.deleteFile')"
      :message="t('fileManager.deleteFileConfirm', { name: pendingFile?.name })"
      @confirm="handleConfirmDelete"
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
import {
  ChevronRight,
  FilePlus,
  FileText,
  FolderOpen,
  SquarePen,
  Trash2,
  X,
} from '@lucide/vue';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton } from 'naive-ui';
import notification from '../../../utils/notification';
import { useDesignerFiles } from '@/composables/useDesignerFiles';
import type { DesignerFile } from '@/types/designerFile';
import ConfirmModal from '../../modals/ConfirmModal.vue';
import InputModal from '../../modals/InputModal.vue';

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
const showFileSubmenu = ref(false);
const fileMenuContainer = ref<HTMLElement | null>(null);
const fileFilterText = ref('');
const showRenameModal = ref(false);
const showDeleteModal = ref(false);
const showDeleteAllModal = ref(false);
const pendingFile = ref<DesignerFile | null>(null);

// The open file and the saved list come from the files store
const {
  files,
  currentFileName,
  loadFilesFromStorage,
  renameFile,
  deleteFile
} = useDesignerFiles();

// Computed property: filtered file list
const filteredFiles = computed(() => {
  if (!fileFilterText.value) {
    return files.value;
  }
  return files.value.filter((file: DesignerFile) => 
    file.name.toLowerCase().includes(fileFilterText.value.toLowerCase())
  );
});

// Format the date
function formatDate(date: Date | string | undefined) {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// Toggle the file menu
function toggleFileMenu() {
  showFileMenu.value = !showFileMenu.value;
  showFileSubmenu.value = false;
}

// Toggle the file list submenu
function toggleFileSubmenu() {
  showFileSubmenu.value = !showFileSubmenu.value;
  if (showFileSubmenu.value) {
    loadFilesFromStorage();
  }
}

// Select a file from the submenu
function selectFileFromSubmenu(file: DesignerFile) {
  showFileSubmenu.value = false;
  showFileMenu.value = false;
  emit('load-file', file);
}

// Rename a file from the submenu
function renameFileFromSubmenu(file: DesignerFile) {
  pendingFile.value = file;
  showRenameModal.value = true;
}

// Confirm rename
function handleConfirmRename(newName: string) {
  if (pendingFile.value && newName && newName !== pendingFile.value.name) {
    renameFile(pendingFile.value.id, newName);
  }
  pendingFile.value = null;
}

// Delete a file from the submenu
function deleteFileFromSubmenu(file: DesignerFile) {
  pendingFile.value = file;
  showDeleteModal.value = true;
}

// Confirm delete
function handleConfirmDelete() {
  if (pendingFile.value) {
    deleteFile(pendingFile.value.id);
  }
  pendingFile.value = null;
}

// Delete every report saved in this browser (asks first)
function askDeleteAllFiles() {
  showFileMenu.value = false;
  showFileSubmenu.value = false;
  showDeleteAllModal.value = true;
}

// Create a new file
function createNewFile() {
  showFileMenu.value = false;
  emit('create-new-file');
}

// Open a local file
function openLocalFile() {
  showFileMenu.value = false;
  const input = document.createElement('input');
  input.type = 'file';
  // Only JRXML reports (what Download saves)
  input.accept = '.jrxml';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      // "All files" in the dialog can still pick something else
      if (!/\.jrxml$/i.test(file.name)) {
        notification.error(t('fileManager.onlyJrxml'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        emit('open-jrxml', { name: file.name, content: e.target?.result as string });
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

// Load a file
function loadFile(fileData: any) {
  emit('load-file', fileData);
}

// Close the menu when clicking outside
function handleClickOutside(event: MouseEvent) {
  if (fileMenuContainer.value && !fileMenuContainer.value.contains(event.target as Node)) {
    showFileMenu.value = false;
    showFileSubmenu.value = false;
  }
}

// Listen for click events
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  loadFilesFromStorage();
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

.is-compact .file-submenu-container {
  flex-wrap: wrap;
}

.is-compact .file-submenu {
  position: static;
  flex-basis: 100%;
  min-width: 0;
  margin: 8px 0 0;
  box-shadow: none;
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

.submenu-arrow {
  margin-left: auto;
  font-size: 12px;
  transition: transform 0.2s ease;
}

.file-submenu-container:hover .submenu-arrow {
  transform: rotate(90deg);
}

.file-submenu {
  position: absolute;
  top: -8px;
  left: 100%;
  margin-left: 12px;
  z-index: 1001;
  min-width: 300px;
  max-height: 400px;
  padding: 8px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  box-sizing: border-box;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 400;
  cursor: default;
  animation: file-menu-in 0.16s ease;
}

.submenu-header {
  padding: 4px 4px 8px;
  border-bottom: 1px solid rgba(28, 27, 38, 0.08);
}

.submenu-header h4 {
  margin: 0 0 8px 0;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}

.file-filter {
  position: relative;
}

.filter-input {
  width: 100%;
  padding: 7px 30px 7px 10px;
  border: 1px solid rgba(28, 27, 38, 0.14);
  border-radius: 8px;
  font-size: 12.5px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.14s ease, box-shadow 0.14s ease;
}

.filter-input:focus {
  border-color: #7c5cf7;
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.12);
}

.submenu-file-list {
  max-height: 250px;
  overflow-y: auto;
  padding: 6px 0 0;
}

.submenu-file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 6px;
  color: #45425a;
  font-size: 12.5px;
  cursor: pointer;
  transition: background 0.14s ease;
  margin: 6px;
}

.submenu-file-item:hover {
  background: rgba(124, 92, 247, 0.08);
}

.submenu-file-item.active {
  background: rgba(124, 92, 247, 0.12);
  color: #1c1b26;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  display: block;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.file-date {
  display: block;
  font-size: 11px;
  color: #77718a;
}

.file-item-actions {
  display: flex;
  gap: 4px;
}

.submenu-footer {
  padding: 8px 4px 0;
  border-top: 1px solid rgba(28, 27, 38, 0.08);
  display: flex;
  gap: 8px;
}

.empty-state :deep(.n-button) {
  margin-top: 8px;
}
</style>
