<template>
  <Collapse>
  <ResizablePanel
    v-show="visible"
    position="bottom"
    :initial-size="bottomPanelHeight"
    :min-size="150"
    :max-size="currentMaxSize"
    :snap-fractions="[1 / 3, 1 / 2, 1]"
    :collapsible="false"
    @size-change="handleBottomPanelSizeChange"
    @handle-dblclick="toggleFullscreen"
  >
    <div class="tab-navigation">
      <div class="tabs-list">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" :size="14" class="tab-icon" />
          <span>{{ tab.name }}</span>
        </button>
      </div>
      <!-- Full height / back, then close: together on the right -->
      <div class="panel-actions">
      <button
        type="button"
        class="panel-close-button"
        :title="t(isFullscreen ? 'bottomPanel.restore' : 'bottomPanel.maximize')"
        :aria-label="t(isFullscreen ? 'bottomPanel.restore' : 'bottomPanel.maximize')"
        @click="toggleFullscreen"
      >
        <component :is="isFullscreen ? Minimize2 : Maximize2" :size="14" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="panel-close-button"
        :title="t('actions.hideBottomPanel')"
        :aria-label="t('actions.hideBottomPanel')"
        @click="emit('update:visible', false)"
      >
        <X :size="15" aria-hidden="true" />
      </button>
      </div>
    </div>

    <!-- JRXML content tab -->
    <div v-if="SHOW_JRXML_TAB" class="tab-content jrxml-tab" v-show="activeTab === 'jrxml'">
      <div class="jrxml-container">
        <div class="jrxml-header">
          <div class="jrxml-actions">
            <n-button @click="copyJRXML" type="default" size="small">{{
              t("bottomPanel.copy")
            }}</n-button>
            <n-button @click="saveJRXML" type="primary" size="small">{{
              t("bottomPanel.apply")
            }}</n-button>
            <n-button @click="regenerateJRXML" type="default" size="small">{{
              t("bottomPanel.regenerate")
            }}</n-button>
            <n-button @click="formatJRXML" type="default" size="small">{{
              t("bottomPanel.format")
            }}</n-button>
            <n-button @click="downloadJRXML" type="primary" size="small">{{
              t("bottomPanel.downloadJRXML")
            }}</n-button>
            <n-button @click="openPdfPreview" type="info" size="small">{{
              t("bottomPanel.previewPDF")
            }}</n-button>
            <n-button
              @click="runValidation"
              :loading="isValidating"
              type="warning"
              size="small"
              class="validation-btn"
            >
              {{ t("bottomPanel.validate") }}
            </n-button>
            <n-button
              @click="runAutoFix"
              :loading="isAutoFixing"
              type="warning"
              size="small"
              class="autofix-btn"
            >
              {{ t("bottomPanel.autoFix") }}
            </n-button>
            <template v-if="showSearch">
              <div class="action-separator"></div>
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                class="inline-search-input"
                :placeholder="t('bottomPanel.search')"
                @input="performSearch"
                @keydown.enter="findNext"
                @keydown.shift.enter="findPrevious"
                @keydown.escape="closeSearch"
              />
              <n-button
                @click="findPrevious"
                type="default"
                size="small"
                :title="t('bottomPanel.searchPrevious')"
                ><ChevronUp :size="14" /></n-button
              >
              <n-button
                @click="findNext"
                type="default"
                size="small"
                :title="t('bottomPanel.searchNext')"
                ><ChevronDown :size="14" /></n-button
              >
              <n-button
                @click="closeSearch"
                type="default"
                size="small"
                :title="t('properties.close')"
                ><X :size="14" /></n-button
              >
              <span v-if="searchResultsCount > 0" class="search-status">
                {{ currentSearchResult }} / {{ searchResultsCount }}
              </span>
            </template>
          </div>
        </div>

        <n-alert
          v-if="validationResult"
          :type="validationResult.valid ? 'success' : 'error'"
          :title="
            validationResult.valid
              ? t('bottomPanel.validationSuccess')
              : t('bottomPanel.validationFailed')
          "
          closable
          @close="clearValidation"
          class="validation-result"
        >
          <div v-if="validationResult.valid">
            <p>{{ t("bottomPanel.validationNoErrors") }}</p>
          </div>
          <div v-else>
            <p>
              {{
                t("bottomPanel.validationErrorCount", {
                  count: validationResult.errors.length,
                })
              }}
            </p>
            <ul class="validation-error-list">
              <li
                v-for="(error, index) in validationResult.errors"
                :key="index"
                :class="[error.severity, { clickable: error.line > 0 }]"
                @click="error.line > 0 && jumpToLine(error.line, error.column)"
              >
                <span class="error-location">
                  {{
                    error.line > 0 ? `[${error.line}:${error.column}]` : "[?]"
                  }}
                </span>
                <span class="error-message">{{ error.message }}</span>
              </li>
            </ul>
          </div>
        </n-alert>

        <n-alert
          v-if="autoFixResult"
          :type="
            autoFixResult.fixed
              ? 'success'
              : autoFixResult.warnings.length > 0
                ? 'warning'
                : 'info'
          "
          :title="
            autoFixResult.fixed
              ? t('bottomPanel.autoFixSuccess')
              : t('bottomPanel.autoFixNoChanges')
          "
          closable
          @close="clearAutoFixResult"
          class="autofix-result"
        >
          <div v-if="autoFixResult.fixed">
            <p>
              {{
                t("bottomPanel.autoFixFixedCount", {
                  count: autoFixResult.fixes.length,
                })
              }}
            </p>
            <ul class="autofix-list">
              <li
                v-for="(fix, index) in autoFixResult.fixes"
                :key="index"
                class="clickable"
                @click="jumpToLine(fix.lineNumber, 0)"
              >
                <span class="fix-location">
                  {{ fix.lineNumber > 0 ? `[${fix.lineNumber}]` : "[?]" }}
                </span>
                <span class="fix-message">
                  {{
                    t("bottomPanel.autoFixRemovedAttribute", {
                      element: fix.elementName,
                      attribute: fix.attributeName,
                    })
                  }}
                </span>
              </li>
            </ul>
          </div>
          <div
            v-if="autoFixResult.warnings.length > 0"
            class="autofix-warnings"
          >
            <p>{{ t("bottomPanel.autoFixWarnings") }}</p>
            <ul class="autofix-list warning-list">
              <li
                v-for="(warning, index) in autoFixResult.warnings"
                :key="index"
              >
                <span class="warning-message">
                  <strong>&lt;{{ warning.elementName }}&gt;</strong>:
                  {{ warning.message }}
                </span>
              </li>
            </ul>
          </div>
          <div
            v-if="!autoFixResult.fixed && autoFixResult.warnings.length === 0"
          >
            <p>{{ t("bottomPanel.autoFixNoIssuesFound") }}</p>
          </div>
        </n-alert>

        <div class="jrxml-content">
          <CodeMirrorEditor
            ref="codeMirrorEditorRef"
            v-model="localJrxmlContent"
            :placeholder="
              localJrxmlContent ? '' : t('bottomPanel.clickToGenerate')
            "
            @update:modelValue="localJrxmlContent = $event"
            @scroll="syncScroll"
          />
        </div>
      </div>
    </div>

    <!-- Report bands (developers): where the template's data comes from, as the report server stores it -->
    <div v-if="SHOW_JRXML_TAB" class="tab-content jrxml-tab" v-show="activeTab === 'bands'">
      <ReportBandsView :active="activeTab === 'bands'" />
    </div>

    <!-- User Defaults JSON (developers): the user's Default Settings as saved with their account, read only -->
    <div v-if="SHOW_JRXML_TAB" class="tab-content jrxml-tab" v-show="activeTab === 'userDefaults'">
      <DefaultSettingsJsonView source="user" :active="activeTab === 'userDefaults'" />
    </div>

    <!-- Developer Defaults JSON (developers): what the app comes with, set only in code -->
    <div v-if="SHOW_JRXML_TAB" class="tab-content jrxml-tab" v-show="activeTab === 'developerDefaults'">
      <DefaultSettingsJsonView source="developer" :active="activeTab === 'developerDefaults'" />
    </div>
  </ResizablePanel>
  </Collapse>

</template>

<script setup lang="ts">
import { SHOW_DEVELOPER_TOOLS } from "@/config/appEnvironment";
import { storeToRefs } from "pinia";
import { useReportStore } from "@/stores/report";
import {
  ChevronDown,
  ChevronUp,
  FileCode2,
  Layers,
  Code,
  UserCog,
  Maximize2,
  Minimize2,
  X,
} from "@lucide/vue";
import {
  ref,
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { NButton, NAlert } from "naive-ui";
import notification from "@/utils/notification";
import ResizablePanel from "./ResizablePanel.vue";
import Collapse from "../common/Collapse.vue";
import CodeMirrorEditor from "../editor/CodeMirrorEditor.vue";
import ReportBandsView from "./ReportBandsView.vue";
import DefaultSettingsJsonView from "./DefaultSettingsJsonView.vue";

import {
  validateJRXML,
  autoFixJRXML,
  type ValidationResult,
  type ValidationError,
  type AutoFixResult,
} from "../../utils/jrxml/xsdValidator";
import { formatXml } from "../../utils/jrxml/formatXml";

import { PANEL_CONSTANTS } from "../../constants/constants";

const { t } = useI18n();

// Get the band's display name
function getBandDisplayName(bandType: string): string {
  // Assuming keys exist in bandNames section of locale files.
  return t(`bandNames.${bandType}`);
}

// Define component props
interface Props {
  visible: boolean;
  initialHeight?: number;
}

// Define component events
interface Emits {
  (e: "open-preview"): void;
  (e: "update:visible", value: boolean): void;
  (e: "size-change", value: number): void;
  (e: "update:jrxml-content", value: string): void;
  (e: "copy-jrxml"): void;
  (e: "save-jrxml"): void;
  (e: "regenerate-jrxml"): void;
  (e: "download-jrxml"): void;
}

// Use defineProps and defineEmits
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  initialHeight: PANEL_CONSTANTS.DEFAULT_BOTTOM_PANEL_HEIGHT,
});

// Report, selection and editor state come from the stores
const reportStore = useReportStore();
const { jrxmlContent } = storeToRefs(reportStore);

const emit = defineEmits<Emits>();

// Tab-related state
const activeTab = ref("jrxml");
// Every tab is for developers: the panel is shown locally and on the dev
// server only, never on staging or production (config/appEnvironment.ts).
// Default Settings have their own page (account menu → Default Settings)
const SHOW_JRXML_TAB = SHOW_DEVELOPER_TOOLS;
// Computed so the labels follow a language switch
const tabs = computed(() => [
  ...(SHOW_JRXML_TAB
    ? [
        { id: "jrxml", name: t("bottomPanel.jrxmlContent"), icon: FileCode2 },
        { id: "bands", name: t("bottomPanel.reportBands"), icon: Layers },
        { id: "userDefaults", name: t("bottomPanel.userDefaultsJson"), icon: UserCog },
        { id: "developerDefaults", name: t("bottomPanel.developerDefaultsJson"), icon: Code },
      ]
    : []),
]);

// Bottom panel height
const HEADER_HEIGHT = 56;
const bottomPanelHeight = ref(props.initialHeight);

// Opened (also after a reload, with the height kept from last time): the limit
// is measured again (the header may have changed height), and a panel at the
// full height shows Restore, not Maximize
watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    nextTick(() => {
      updateMaxSize();
      if (bottomPanelHeight.value > currentMaxSize.value) bottomPanelHeight.value = currentMaxSize.value;
      isFullscreen.value = bottomPanelHeight.value >= currentMaxSize.value - 2;
    });
  },
  { immediate: true },
);

// Fullscreen state
const isFullscreen = ref(false);
const originalPanelHeight = ref(props.initialHeight);
const currentMaxSize = ref(Math.max(150, window.innerHeight - HEADER_HEIGHT)); // Extend up to the header

// Up to the header's bottom edge (measured: the header's height changes with the window)
const updateMaxSize = () => {
  const header = document.querySelector(".designer-header");
  const top = header ? header.getBoundingClientRect().bottom : HEADER_HEIGHT;
  currentMaxSize.value = Math.max(150, Math.floor(window.innerHeight - top));
};

// PDF preview modal visibility state

// Reference to the CodeMirrorEditor component
const codeMirrorEditorRef = ref<InstanceType<typeof CodeMirrorEditor> | null>(
  null,
);

// Search-related state (consolidated into the button row)
const searchInputRef = ref<HTMLInputElement | null>(null);
const showSearch = ref(false);
const searchQuery = ref("");
const searchResultsCount = ref(0);
const currentSearchResult = ref(0);

const toggleSearch = () => {
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    searchResultsCount.value =
      codeMirrorEditorRef.value?.performSearchWith(searchQuery.value) ?? 0;
    currentSearchResult.value = searchResultsCount.value > 0 ? 1 : 0;
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  } else {
    codeMirrorEditorRef.value?.closeSearch();
  }
};

const performSearch = () => {
  searchResultsCount.value =
    codeMirrorEditorRef.value?.performSearchWith(searchQuery.value) ?? 0;
  currentSearchResult.value = searchResultsCount.value > 0 ? 1 : 0;
  // If the query is purely numeric and there are no search results, treat it as a line-number jump
  if (searchResultsCount.value === 0 && /^\d+$/.test(searchQuery.value)) {
    jumpToLine(parseInt(searchQuery.value, 10), 0);
  }
  // Keep focus on the search box so the editor doesn't steal it
  nextTick(() => {
    searchInputRef.value?.focus();
  });
};

const findNext = () => {
  // If the query is purely numeric with no results, treat it as a line-number jump
  if (searchResultsCount.value === 0 && /^\d+$/.test(searchQuery.value)) {
    performSearch();
    closeSearch();
    return;
  }
  codeMirrorEditorRef.value?.findNext();
  if (searchResultsCount.value > 0) {
    currentSearchResult.value =
      (currentSearchResult.value % searchResultsCount.value) + 1;
  }
};

const findPrevious = () => {
  codeMirrorEditorRef.value?.findPrevious();
  if (searchResultsCount.value > 0) {
    currentSearchResult.value =
      currentSearchResult.value <= 1
        ? searchResultsCount.value
        : currentSearchResult.value - 1;
  }
};

const closeSearch = () => {
  showSearch.value = false;
  searchQuery.value = "";
  searchResultsCount.value = 0;
  currentSearchResult.value = 0;
  codeMirrorEditorRef.value?.closeSearch();
};

// Open the PDF preview (the designer owns it, with the report's table data)
const openPdfPreview = (): void => {
  if (!localJrxmlContent.value) {
    notification.warning(t("bottomPanel.alerts.generateJrxmlFirst"));
    return;
  }
  emit("open-preview");
};

// Computed property: local binding for jrxmlContent
const localJrxmlContent = computed({
  get: () => {
    if (!jrxmlContent.value) return jrxmlContent.value;
    return formatXml(jrxmlContent.value);
  },
  set: (value) => emit("update:jrxml-content", value),
});

// Sync scrolling
const syncScroll = () => {
  // CodeMirrorEditor already has built-in line number and scroll sync support
  // This can be left empty, or extended with additional scroll handling logic if needed
};

// Handle bottom panel size changes
const handleBottomPanelSizeChange = (newSize: number) => {
  bottomPanelHeight.value = newSize;
  // Dragged to the top it is full height; dragged down it is not any more
  isFullscreen.value = newSize >= currentMaxSize.value - 2;
  emit("size-change", newSize);
};

// Copy the JRXML content to the clipboard
const copyJRXML = async (): Promise<void> => {
  emit("copy-jrxml");
};

// Regenerate the JRXML content
const regenerateJRXML = (): void => {
  emit("regenerate-jrxml");
};

const formatJRXML = (): void => {
  codeMirrorEditorRef.value?.formatDocument();
};

// Download the JRXML file
const downloadJRXML = (): void => {
  // Switch to the JRXML tab
  activeTab.value = "jrxml";
  emit("download-jrxml");
};

// Save the edited JRXML content
const saveJRXML = (): void => {
  emit("save-jrxml");
};

// Toggle fullscreen mode
const toggleFullscreen = (): void => {
  isFullscreen.value = !isFullscreen.value;
  if (isFullscreen.value) {
    // Enter fullscreen mode up to the header
    originalPanelHeight.value = bottomPanelHeight.value;
    updateMaxSize();
    bottomPanelHeight.value = currentMaxSize.value;
  } else {
    // Exit fullscreen mode (to a smaller height if the last one was full too)
    updateMaxSize();
    bottomPanelHeight.value =
      originalPanelHeight.value >= currentMaxSize.value - 2
        ? Math.round(currentMaxSize.value / 2)
        : originalPanelHeight.value;
  }
  emit("size-change", bottomPanelHeight.value);
};

// Listen for keyboard events
function handleKeyDown(event: KeyboardEvent) {
  // ESC only leaves fullscreen; the panel closes only from its close button or the header toggle
  if (event.key === "Escape" && isFullscreen.value) {
    toggleFullscreen();
  }

  // Listen for Cmd+F or Ctrl+F to switch to the JRXML tab and enter fullscreen
  if (SHOW_JRXML_TAB && (event.metaKey || event.ctrlKey) && event.key === "f") {
    event.preventDefault(); // Prevent the browser's default search functionality

    // Open the bottom panel if it isn't already open
    if (!props.visible) {
      emit("update:visible", true);
    }

    // Switch to the JRXML tab
    activeTab.value = "jrxml";

    // Enter fullscreen mode
    if (!isFullscreen.value) {
      toggleFullscreen();
    }

    // Wait briefly to ensure the DOM has updated, then open the search bar and focus its input
    setTimeout(() => {
      toggleSearch();
    }, 200);
  }
}

// Validation-related state
const validationResult = ref<ValidationResult | null>(null);
const isValidating = ref(false);

// Run XSD validation
const runValidation = async () => {
  if (!localJrxmlContent.value) {
    notification.warning(t("bottomPanel.alerts.generateJrxmlFirst"));
    return;
  }

  isValidating.value = true;
  validationResult.value = null;

  try {
    validationResult.value = await validateJRXML(localJrxmlContent.value);

    // Automatically expand the bottom panel when validation fails
    if (!validationResult.value.valid) {
      updateMaxSize();
      bottomPanelHeight.value = Math.min(currentMaxSize.value, 500);
      activeTab.value = "jrxml";
    }
  } catch (error) {
    validationResult.value = {
      valid: false,
      errors: [
        {
          line: 0,
          column: 0,
          message: `Validation failed: ${String(error)}`,
        },
      ],
    };
    // Automatically expand the bottom panel when validation fails
    updateMaxSize();
    bottomPanelHeight.value = Math.min(currentMaxSize.value, 500);
    activeTab.value = "jrxml";
  } finally {
    isValidating.value = false;
  }
};

// Clear the validation result
const clearValidation = () => {
  validationResult.value = null;
};

// Jump to a specific line
const jumpToLine = (line: number, column: number) => {
  if (codeMirrorEditorRef.value) {
    codeMirrorEditorRef.value.jumpToLine(line, column);
  }
};

// Auto-fix-related state
const isAutoFixing = ref(false);
const autoFixResult = ref<AutoFixResult | null>(null);

// Run auto-fix
const runAutoFix = async () => {
  if (!localJrxmlContent.value) {
    notification.warning(t("bottomPanel.alerts.generateJrxmlFirst"));
    return;
  }

  isAutoFixing.value = true;
  autoFixResult.value = null;

  try {
    autoFixResult.value = await autoFixJRXML(localJrxmlContent.value);

    if (autoFixResult.value.fixed) {
      // Update the editor with the fixed content
      localJrxmlContent.value = autoFixResult.value.fixedContent;
      // Switch to the JRXML tab to show the fix result
      activeTab.value = "jrxml";
    }
  } catch (error) {
    console.error("Auto-fix failed:", error);
  } finally {
    isAutoFixing.value = false;
  }
};

// Clear the auto-fix result
const clearAutoFixResult = () => {
  autoFixResult.value = null;
};

// Add event listeners when the component is mounted
onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("resize", updateMaxSize);
  updateMaxSize();
});

// Remove event listeners before the component is unmounted
onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("resize", updateMaxSize);
});
</script>

<style scoped>
.tabs-container {
  background-color: #ffffff;
  border-top: 1px solid rgba(28, 27, 38, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tab-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #ffffff;
  border-bottom: 1px solid rgba(28, 27, 38, 0.08);
  padding: 0 16px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 10;
  height: 42px;
}

.tabs-list {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
}

.tab-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 100%;
  padding: 0 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 500;
  color: #6f6a7e;
  border-bottom: 2px solid transparent;
  transition: all 0.18s ease;
  letter-spacing: -0.01em;
}

.tab-icon {
  flex-shrink: 0;
  color: inherit;
}

.tab-button:hover:not(.active) {
  color: #1c1b26;
  background-color: rgba(99, 102, 241, 0.04);
}

.tab-button.active {
  border-bottom-color: #6366f1;
  color: #6366f1;
  font-weight: 600;
}

.panel-close-button {
  margin-left: auto;
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8a84a3;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.panel-close-button:hover,
.panel-close-button:focus-visible {
  outline: none;
  background-color: rgba(28, 27, 38, 0.06);
  color: #1c1b26;
}

.tab-content {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 0;
  box-sizing: border-box;
}

.jrxml-tab {
  background-color: #ffffff;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.jrxml-container {
  background-color: #ffffff;
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-height: 0;
}

.jrxml-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background-color: #fafafc;
  border-bottom: 1px solid rgba(28, 27, 38, 0.08);
  flex-shrink: 0;
}

.jrxml-content {
  flex: 1;
  min-height: 0;
  border-radius: 0;
  border: none;
}

.editor-container {
  display: flex;
  width: 100%;
  height: 100%;
}

.line-numbers {
  flex-shrink: 0;
  width: 44px;
  background-color: #f8f9fb;
  color: #8a84a3;
  text-align: right;
  padding: 10px 8px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow: hidden;
  user-select: none;
  border-right: 1px solid rgba(28, 27, 38, 0.08);
  white-space: pre;
  box-sizing: border-box;
}

.jrxml-editor {
  flex: 1;
  width: 100%;
  height: 100%;
  padding: 10px 12px;
  background-color: #ffffff;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre;
  word-wrap: normal;
  overflow-x: auto;
  border: none;
  outline: none;
  resize: none;
  tab-size: 2;
  box-sizing: border-box;
  color: #1c1b26;
}

.jrxml-editor:focus {
  border: none;
  outline: none;
}

.jrxml-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.action-separator {
  width: 1px;
  height: 20px;
  background-color: rgba(28, 27, 38, 0.12);
  margin: 0 4px;
  flex-shrink: 0;
}

.inline-search-input {
  width: 160px;
  padding: 4px 10px;
  border: 1px solid rgba(28, 27, 38, 0.12);
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  height: 24px;
  flex-shrink: 0;
  background: #ffffff;
  color: #1c1b26;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.inline-search-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(124, 92, 247, 0.14);
}

.search-status {
  font-size: 11px;
  color: #8a84a3;
  white-space: nowrap;
  flex-shrink: 0;
}

.jrxml-actions .fullscreen-active {
  background-color: #6366f1;
  color: white;
}

.jrxml-placeholder {
  padding: 16px 12px;
  text-align: center;
  color: #8a84a3;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.validation-btn {
  margin-left: auto;
}

.validation-result {
  margin: 8px 16px;
  border-radius: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.validation-error-list {
  margin: 8px 0 0 0;
  padding-left: 16px;
  list-style: none;
  max-height: 100px;
  overflow-y: auto;
}

.validation-error-list li {
  padding: 4px 0;
  border-bottom: 1px solid rgba(28, 27, 38, 0.06);
  font-size: 12px;
}

.validation-error-list li:last-child {
  border-bottom: none;
}

.validation-error-list li.clickable {
  cursor: pointer;
  transition: background-color 0.15s;
}

.validation-error-list li.clickable:hover {
  background-color: rgba(99, 102, 241, 0.05);
}

.validation-error-list .error-location {
  color: #8a84a3;
  margin-right: 8px;
  font-family: monospace;
}

.validation-error-list .error-message {
  color: #dc3545;
}

.validation-error-list .warning .error-message {
  color: #eab308;
}

.validation-error-list .fatal .error-message {
  color: #dc3545;
  font-weight: bold;
}

/* Auto-fix button style */
.autofix-btn {
  margin-left: 4px;
}

.autofix-result {
  margin: 8px 16px;
  border-radius: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.autofix-list {
  margin: 8px 0 0 0;
  padding-left: 16px;
  list-style: none;
  max-height: 100px;
  overflow-y: auto;
}

.autofix-list li {
  padding: 4px 0;
  border-bottom: 1px solid rgba(28, 27, 38, 0.06);
  font-size: 12px;
}

.autofix-list li:last-child {
  border-bottom: none;
}

.autofix-list li.clickable {
  cursor: pointer;
  transition: background-color 0.15s;
}

.autofix-list li.clickable:hover {
  background-color: rgba(99, 102, 241, 0.05);
}

.autofix-list .fix-location {
  color: #8a84a3;
  margin-right: 8px;
  font-family: monospace;
}

.autofix-list .fix-message {
  color: #10b981;
}

/* Warning list style */
.autofix-warnings {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(28, 27, 38, 0.08);
}

.warning-list li {
  color: #856404;
  background-color: #fffbe6;
  padding: 6px 10px;
  margin: 4px 0;
  border-radius: 6px;
  border-left: 3px solid #f59e0b;
}

.warning-list .warning-message {
  font-size: 12px;
}

.warning-list strong {
  color: #533f03;
}
</style>
