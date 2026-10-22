<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useReportStore } from "@/stores/report";
import {
  ChevronDown,
  ChevronUp,
  FileCode2,
  Info,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  RotateCcw,
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

import {
  validateJRXML,
  autoFixJRXML,
  type ValidationResult,
  type ValidationError,
  type AutoFixResult,
} from "../../utils/jrxml/xsdValidator";
import { formatXml } from "../../utils/jrxml/formatXml";

import type { Band, ReportProperties } from "../../types";
import {
  UI_CONSTANTS,
  PANEL_CONSTANTS,
  BAND_TYPE_CONSTANTS,
  DEFAULT_BAND_LIMITS,
  DEVELOPER_DEFAULT_BAND_CONFIG,
  GLOBAL_BAND_LIMITS_STORAGE_KEY,
  getEffectiveDefaultBandConfig,
  getEffectiveDefaultBandLimits,
} from "../../constants/constants";
import PageSetupSection, { type PageSetupValue } from "../designer/PageSetupSection.vue";
import {
  DEFAULT_BAND_CHOICES,
  loadReportDefaults,
  resetReportDefaults,
  saveReportDefaults,
  builtInReportDefaults,
  type ReportDefaults,
} from "../../utils/reportDefaults";

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
  allBandTypes: any[];
}

// Define component events
interface Emits {
  (e: "open-preview"): void;
  (e: "update:visible", value: boolean): void;
  (e: "size-change", value: number): void;
  (e: "update:report-properties", value: any): void;
  (e: "update:jrxml-content", value: string): void;
  (e: "copy-jrxml"): void;
  (e: "save-jrxml"): void;
  (e: "regenerate-jrxml"): void;
  (e: "download-jrxml"): void;
  // Before a page size/margin change (undo snapshot), and after it (fit content)
  (e: "page-setup-change"): void;
}

// Use defineProps and defineEmits
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  initialHeight: PANEL_CONSTANTS.DEFAULT_BOTTOM_PANEL_HEIGHT,
});

// Changes: an undo step before, the JRXML rewritten after
const report = useReportStore();

// Report, selection and editor state come from the stores
const reportStore = useReportStore();
const { reportProperties, bands, jrxmlContent } = storeToRefs(reportStore);

const emit = defineEmits<Emits>();

// Tab-related state
const activeTab = ref("pageSettings");
// JRXML Content is for developers: shown when running the app locally (npm run
// dev), never in a production build, where anything asking for it gets Page settings
const SHOW_JRXML_TAB = import.meta.env.DEV;
watch(activeTab, (tab) => {
  if (tab === "jrxml" && !SHOW_JRXML_TAB) activeTab.value = "pageSettings";
});
// Computed so the labels follow a language switch
const tabs = computed(() => [
  { id: "pageSettings", name: t("bottomPanel.jrxmlTabs.pageSettings"), icon: SlidersHorizontal },
  ...(SHOW_JRXML_TAB ? [{ id: "jrxml", name: t("bottomPanel.jrxmlContent"), icon: FileCode2 }] : []),
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

// Paper size definitions



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

// Computed property: local binding for reportProperties
const localReportProperties = computed({
  get: () => reportProperties.value,
  set: (value) => emit("update:report-properties", value),
});

// The sections in page order (as Template Settings lists them), Detail included
const PAGE_ORDER = ["pageHeader", "columnHeader", "detail", "columnFooter", "pageFooter"];
const pageOrder = (type: string) => {
  const index = PAGE_ORDER.indexOf(type);
  return index === -1 ? PAGE_ORDER.length : index;
};

// Resizable band types list for limit constraints (excluding background and detail which is auto-calculated)
const resizableBandTypes = computed(() => {
  return (props.allBandTypes || [])
    .filter((bt) => bt.type !== "background" && bt.type !== "detail")
    .map((bt) => ({ type: bt.type }));
});

// Dedicated state for global default band limits (independent from active template)
const globalDefaultBandLimits = ref<
  Record<string, { min: number; max: number }>
>(getEffectiveDefaultBandLimits());
// Dedicated state for global default band settings (independent from active template)
const globalDefaultBandConfig = ref<
  Record<string, { defaultHeight: number; min: number; max: number }>
>(getEffectiveDefaultBandConfig());

const getGlobalBandConfig = (bandType: string) => {
  if (!globalDefaultBandConfig.value[bandType]) {
    const dev = DEVELOPER_DEFAULT_BAND_CONFIG[bandType] || {
      defaultHeight: 50,
      min: 20,
      max: 70,
    };
    globalDefaultBandConfig.value[bandType] = { ...dev };
  }
  return globalDefaultBandConfig.value[bandType]!;
};

const standardActiveBands = [
  BAND_TYPE_CONSTANTS.PAGE_HEADER,
  BAND_TYPE_CONSTANTS.COLUMN_HEADER,
  BAND_TYPE_CONSTANTS.COLUMN_FOOTER,
  BAND_TYPE_CONSTANTS.PAGE_FOOTER,
];

// Calculate remaining A4 space for Detail band based on configured default band heights
const defaultDetailCalculatedHeight = computed(() => {
  const pageH = localReportProperties.value?.pageHeight || 842;
  const topM = localReportProperties.value?.topMargin || 20;
  const bottomM = localReportProperties.value?.bottomMargin || 20;
  const printableH = pageH - topM - bottomM;

  let otherDefaults = 0;
  standardActiveBands.forEach((type) => {
    const conf = getGlobalBandConfig(type);
    otherDefaults += conf?.defaultHeight || 0;
  });

  return Math.max(20, printableH - otherDefaults);
});

const onDefaultHeightChange = (bandType: string) => {
  const conf = getGlobalBandConfig(bandType);
  if (typeof conf.defaultHeight === "number") {
    if (conf.defaultHeight < 10) {
      conf.defaultHeight = 10;
    }
    if (conf.defaultHeight > conf.max) {
      conf.max = conf.defaultHeight;
    }
    if (conf.defaultHeight < conf.min) {
      conf.min = conf.defaultHeight;
    }
  }
  autoSaveGlobalBandConfig();
};

const onGlobalMinChange = (bandType: string) => {
  const conf = getGlobalBandConfig(bandType);
  if (typeof conf.min === "number") {
    if (conf.min < 10) {
      conf.min = 10;
    }
    if (conf.min > conf.max) {
      conf.max = conf.min;
    }
    if (typeof conf.defaultHeight === "number" && conf.defaultHeight < conf.min) {
      conf.defaultHeight = conf.min;
    }
  }
  autoSaveGlobalBandConfig();
};

const getMaxAllowedGlobalLimit = (bandType: string): number => {
  const pageH = localReportProperties.value?.pageHeight || 842;
  const topM = localReportProperties.value?.topMargin || 20;
  const bottomM = localReportProperties.value?.bottomMargin || 20;
  const printableH = pageH - topM - bottomM;
  let otherBandsMin = 0;
  standardActiveBands.forEach((type) => {
    if (type !== bandType) {
      const conf = getGlobalBandConfig(type);
      otherBandsMin += Math.max(10, conf?.min || 10);
    }
  });
  const detailMin = 10;
  return Math.max(10, printableH - otherBandsMin - detailMin);
};

const onGlobalMaxChange = (bandType: string) => {
  const conf = getGlobalBandConfig(bandType);
  const maxCeiling = getMaxAllowedGlobalLimit(bandType);
  if (typeof conf.max === "number") {
    if (conf.max < 10) {
      conf.max = 10;
    }
    if (conf.max > maxCeiling) {
      conf.max = maxCeiling;
    }
    if (conf.max < conf.min) {
      conf.min = conf.max;
    }
    if (typeof conf.defaultHeight === "number" && conf.defaultHeight > conf.max) {
      conf.defaultHeight = conf.max;
    }
  }
  autoSaveGlobalBandConfig();
};

const autoSaveGlobalBandConfig = () => {
  try {
    localStorage.setItem(
      GLOBAL_BAND_LIMITS_STORAGE_KEY,
      JSON.stringify(globalDefaultBandConfig.value),
    );
  } catch (e) {
    console.error("Failed to save default band config to localStorage:", e);
  }
};

const resetBandLimitsToDefault = (notify: boolean | Event = true) => {
  globalDefaultBandConfig.value = JSON.parse(
    JSON.stringify(DEVELOPER_DEFAULT_BAND_CONFIG),
  );
  try {
    localStorage.removeItem(GLOBAL_BAND_LIMITS_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to remove saved band limits from localStorage:", e);
  }
  if (notify !== false) notification.success(t("defaultSettings.originalDone"));
};

// One undo step; the JRXML is written from the changed report (re-reading the
// JRXML text, which still held the old heights, put them back)
const applyGlobalDefaultsToCurrentTemplate = () => {
  if (!localReportProperties.value) return;
  report.saveStateToHistory();
  const config = globalDefaultBandConfig.value;
  const limits: Record<string, { min: number; max: number }> = {};
  for (const key of Object.keys(config)) {
    const item = config[key];
    if (item) {
      limits[key] = { min: item.min, max: item.max };
    }
  }
  localReportProperties.value.bandLimits = limits;
  emit("update:report-properties", localReportProperties.value);

  if (bands.value && Array.isArray(bands.value)) {
    let otherBandsH = 0;
    bands.value.forEach((band) => {
      const bConf = config[band.type];
      if (band.type !== "detail" && bConf?.defaultHeight) {
        band.height = bConf.defaultHeight;
        otherBandsH += band.height;
      }
    });
    // Detail band absorbs whatever space remains on the page
    const detailBand = bands.value.find((b) => b.type === "detail");
    if (detailBand) {
      const pageH = localReportProperties.value?.pageHeight || 842;
      const topM = localReportProperties.value?.topMargin || 20;
      const bottomM = localReportProperties.value?.bottomMargin || 20;
      detailBand.height = Math.max(20, pageH - topM - bottomM - otherBandsH);
    }
  }
  report.updateJrxml();

  notification.success(t("bottomPanel.appliedToTemplateSuccess"));
};

// Default Settings: what new reports start with, saved in this browser on
// every change. "Apply to this report" copies one part into the open report
// (one undo step; paper and margins refit the page).
const defaults = ref<ReportDefaults>(loadReportDefaults());
const DEFAULT_CARDS = [
  { section: "paper", title: "templateSettings.paper" },
  { section: "margins", title: "bottomPanel.pageMargins" },
  { section: "font", title: "templateSettings.font" },
  { section: "bands", title: "bottomPanel.bandSelection" },
] as const;

function changeDefaults(patch: Partial<PageSetupValue>) {
  const bandTypes = patch.bandTypes
    ? DEFAULT_BAND_CHOICES.filter((type) => patch.bandTypes!.includes(type) || type === BAND_TYPE_CONSTANTS.DETAIL)
    : defaults.value.bandTypes;
  defaults.value = { ...defaults.value, ...patch, bandTypes };
  saveReportDefaults(defaults.value);
}

// One card back to the app's original settings
function useOriginal(section: (typeof DEFAULT_CARDS)[number]["section"]) {
  const original = builtInReportDefaults();
  if (section === "paper") changeDefaults({ pageWidth: original.pageWidth, pageHeight: original.pageHeight });
  else if (section === "margins") {
    const { leftMargin, rightMargin, topMargin, bottomMargin } = original;
    changeDefaults({ leftMargin, rightMargin, topMargin, bottomMargin });
  } else if (section === "font") changeDefaults({ font: { ...original.font } });
  else changeDefaults({ bandTypes: original.bandTypes });
  notification.success(t("defaultSettings.originalDone"));
}

// Every card and the section heights back to the original settings
function resetAllToOriginal() {
  defaults.value = resetReportDefaults();
  resetBandLimitsToDefault(false);
  notification.success(t("defaultSettings.resetDone"));
}

function applyToThisReport(section: (typeof DEFAULT_CARDS)[number]["section"]) {
  const page = localReportProperties.value;
  const wanted = defaults.value;
  if (section === "bands") {
    report.setBandTypes(wanted.bandTypes);
  } else {
    report.saveStateToHistory();
    if (section === "paper") {
      page.pageWidth = wanted.pageWidth;
      page.pageHeight = wanted.pageHeight;
    } else if (section === "margins") {
      page.leftMargin = wanted.leftMargin;
      page.rightMargin = wanted.rightMargin;
      page.topMargin = wanted.topMargin;
      page.bottomMargin = wanted.bottomMargin;
    } else {
      page.defaultFont = { ...wanted.font };
    }
    if (section === "font") report.updateJrxml();
    else emit("page-setup-change");
  }
  notification.success(t("defaultSettings.applied"));
}

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

    <!-- Page settings tab -->
    <div
      class="tab-content page-settings-tab"
      v-show="activeTab === 'pageSettings'"
    >
      <!-- Default Settings: what new reports start with (kept in this browser,
           utils/reportDefaults.ts). This report's own settings are Template
           Settings, in the right panel when nothing is selected. -->
      <div class="defaults-intro">
        <Info :size="15" :stroke-width="2" aria-hidden="true" />
        <span>{{ t("defaultSettings.intro") }}</span>
        <button type="button" class="defaults-reset" @click="resetAllToOriginal">
          <RotateCcw :size="12" :stroke-width="2.2" aria-hidden="true" />
          {{ t("defaultSettings.resetAll") }}
        </button>
      </div>
      <div class="settings-grid">
        <PageSetupSection
          v-for="card in DEFAULT_CARDS"
          :key="card.section"
          :section="card.section"
          :title="t(card.title)"
          :value="defaults"
          :bands-hint="t('defaultSettings.bandsHint')"
          @change="changeDefaults"
        >
          <template #actions>
            <span class="defaults-actions">
              <button type="button" class="defaults-reset" @click="useOriginal(card.section)">
                <RotateCcw :size="11" :stroke-width="2.2" aria-hidden="true" />
                {{ t("defaultSettings.original") }}
              </button>
              <button type="button" class="defaults-apply" @click="applyToThisReport(card.section)">
                {{ t("defaultSettings.apply") }}
              </button>
            </span>
          </template>
        </PageSetupSection>

        <!-- Band height limits constraints -->
        <div class="settings-section band-limits-section">
          <div class="band-limits-header">
            <div class="band-limits-title-area">
              <h5>{{ t("bottomPanel.defaultBandSettings") }}</h5>
            </div>
            <span class="defaults-actions">
              <button type="button" class="defaults-reset" @click="resetBandLimitsToDefault">
                <RotateCcw :size="11" :stroke-width="2.2" aria-hidden="true" />
                {{ t("defaultSettings.original") }}
              </button>
              <button type="button" class="defaults-apply" @click="applyGlobalDefaultsToCurrentTemplate">
                {{ t("defaultSettings.apply") }}
              </button>
            </span>
          </div>
          <div class="band-limits-grid">
            <div
              v-for="bType in resizableBandTypes"
              :key="bType.type"
              class="band-limit-card"
              :style="{ order: pageOrder(bType.type) }"
            >
              <div class="band-limit-title">
                {{ getBandDisplayName(bType.type) }}
              </div>
              <div class="band-limit-inputs">
                <div class="band-limit-input-group">
                  <label :title="t('bottomPanel.defaultHeight')">{{ t("bottomPanel.defaultShort") }}</label>
                  <div class="input-unit-wrapper">
                    <input
                      v-model.number="
                        getGlobalBandConfig(bType.type).defaultHeight
                      "
                      type="number"
                      min="10"
                      step="1"
                      @change="onDefaultHeightChange(bType.type)"
                      @blur="onDefaultHeightChange(bType.type)"
                    />
                    <span class="unit">px</span>
                  </div>
                </div>
                <div class="band-limit-input-group">
                  <label :title="t('bottomPanel.minHeight')">{{ t("bottomPanel.minShort") }}</label>
                  <div class="input-unit-wrapper">
                    <input
                      v-model.number="getGlobalBandConfig(bType.type).min"
                      type="number"
                      min="10"
                      step="1"
                      @change="onGlobalMinChange(bType.type)"
                      @blur="onGlobalMinChange(bType.type)"
                    />
                    <span class="unit">px</span>
                  </div>
                </div>
                <div class="band-limit-input-group">
                  <label :title="t('bottomPanel.maxHeight')">{{ t("bottomPanel.maxShort") }}</label>
                  <div class="input-unit-wrapper">
                    <input
                      v-model.number="getGlobalBandConfig(bType.type).max"
                      type="number"
                      :min="getGlobalBandConfig(bType.type).min || 10"
                      :max="getMaxAllowedGlobalLimit(bType.type)"
                      step="1"
                      @change="onGlobalMaxChange(bType.type)"
                      @blur="onGlobalMaxChange(bType.type)"
                    />
                    <span class="unit">px</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detail Band (Auto-Calculated Remaining A4 Space) -->
            <div class="band-limit-card band-limit-card-detail" :style="{ order: pageOrder('detail') }">
              <div class="band-limit-title">
                <span>{{ t("bandNames.detail") }}</span>
                <span class="band-badge-auto">{{
                  t("properties.detailAutoCalculated")
                }}</span>
              </div>
              <div class="band-limit-inputs">
                <div class="band-limit-input-group">
                  <label :title="t('bottomPanel.defaultHeight')">{{ t("bottomPanel.defaultShort") }}</label>
                  <div
                    class="input-unit-wrapper is-disabled"
                    :title="t('properties.detailAutoCalculatedHint')"
                  >
                    <input
                      :value="defaultDetailCalculatedHeight"
                      type="number"
                      disabled
                    />
                    <span class="unit">px</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
  </ResizablePanel>
  </Collapse>

</template>

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

.page-settings-tab {
  background-color: #f8f9fb;
  height: 100%;
  box-sizing: border-box;
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

/* Default Settings: what they are for, and putting back the app's own */
.defaults-intro {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(124, 92, 247, 0.22);
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.07);
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.45;
}
.defaults-intro > :first-child {
  flex-shrink: 0;
  color: #6440f4;
}
.defaults-intro > span {
  flex: 1;
}
.defaults-actions {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}
.defaults-reset,
.defaults-apply {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid #e6e5ee;
  border-radius: 999px;
  background: #ffffff;
  color: #45425a;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.defaults-apply {
  border-color: rgba(124, 92, 247, 0.35);
  color: #6440f4;
}
.defaults-reset:hover,
.defaults-apply:hover {
  border-color: rgba(124, 92, 247, 0.55);
  background: rgba(124, 92, 247, 0.06);
}

.settings-grid {
  display: grid;
  /* Four cards fill the row (auto-fit left an empty fifth column next to them,
     because the full-width Default Band Settings keeps every track) */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 16px 20px 24px;
}

@media (max-width: 1280px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.settings-grid::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.settings-grid::-webkit-scrollbar-track {
  background: transparent;
}

.settings-grid::-webkit-scrollbar-thumb {
  background: #cfd5e1;
  border-radius: 4px;
}

.settings-grid::-webkit-scrollbar-thumb:hover {
  background: #b0b8c9;
}

.settings-section {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.settings-section:hover {
  border-color: rgba(124, 92, 247, 0.22);
  box-shadow: 0 4px 12px rgba(23, 20, 44, 0.05);
}

.settings-section h4 {
  margin-top: 0;
  margin-bottom: 14px;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.01em;
  border-bottom: 1px solid rgba(28, 27, 38, 0.06);
  padding-bottom: 8px;
}

/* Form row layout */
.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.flex-1 {
  flex: 1;
}

/* Compact font settings style */
.font-settings-compact {
  grid-column: span 1;
}

.font-settings-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.font-info {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.4;
  color: #6b7280;
}

.font-info svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: #6366f1;
}

.font-setting-item {
  flex: 1;
}

.font-style-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.font-style-options label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
  font-weight: 500;
  font-size: 12px;
  color: #45425a;
  cursor: pointer;
  user-select: none;
}

.font-style-options label input[type="checkbox"],
.band-selection-item label input[type="checkbox"] {
  accent-color: #6366f1;
  cursor: pointer;
}

.checkbox-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
  font-weight: 500;
  font-size: 12px;
  color: #45425a;
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

.band-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.band-selection-item {
  margin: 0;
}

.band-selection-item label {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  background: #fbfbfe;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #1c1b26;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}

.band-selection-item label:hover:not(.is-disabled) {
  background: rgba(99, 102, 241, 0.05);
  border-color: rgba(99, 102, 241, 0.25);
  color: #5b3ee0;
}

.band-selection-item label.is-disabled {
  cursor: not-allowed;
  opacity: 0.7;
  background: #f6f6fa;
  color: #8a84a3;
}

.band-required-tag {
  font-size: 10px;
  font-weight: 650;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;
  margin-left: auto;
}

.band-selection-note {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(28, 27, 38, 0.08);
  color: #8a84a3;
  font-size: 11px;
}

/* Section Heights: the same card look as Paper, Margins… across the row */
.band-limits-section {
  grid-column: 1 / -1;
  padding: 12px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.band-limits-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.band-limits-title-area h5 {
  margin: 0;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}

.band-limits-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.band-limits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
  gap: 12px;
}

.band-limit-card {
  background-color: #fbfbfe;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.band-limit-card:hover {
  border-color: rgba(99, 102, 241, 0.25);
  background-color: #ffffff;
  box-shadow: 0 2px 6px rgba(23, 20, 44, 0.04);
}

.band-limit-title {
  font-weight: 650;
  font-size: 12px;
  color: #1c1b26;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(28, 27, 38, 0.05);
  padding-bottom: 6px;
}

/* The same green pill as Template Settings */
.band-badge-auto {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  font-size: 10px;
  font-weight: 650;
  color: #059669;
}

.band-limit-inputs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.band-limit-card-detail .band-limit-inputs {
  grid-template-columns: minmax(0, 1fr);
}

.band-limit-input-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.band-limit-input-group label {
  font-size: 11px;
  font-weight: 600;
  color: #6f6a7e;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.input-unit-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 6px;
  padding: 4px 6px;
  background-color: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-unit-wrapper:hover {
  border-color: #c4b5fd;
}

.input-unit-wrapper:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(124, 92, 247, 0.14);
}

.input-unit-wrapper.is-disabled {
  opacity: 0.65;
  background-color: #f6f6fa;
  cursor: not-allowed;
  border-color: rgba(28, 27, 38, 0.06);
}

.input-unit-wrapper.is-disabled input {
  cursor: not-allowed;
  color: #8a84a3;
}

.input-unit-wrapper input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 12px;
  outline: none;
  padding: 0;
  color: #1c1b26;
}

.input-unit-wrapper .unit {
  font-size: 10px;
  color: #8a84a3;
  margin-left: 2px;
  font-weight: 500;
}

.margin-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.margin-inputs input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  background-color: #ffffff;
  border: 1px solid rgba(28, 27, 38, 0.12);
  border-radius: 7px;
  font-size: 12px;
  color: #1c1b26;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.margin-inputs input:hover {
  border-color: #c4b5fd;
}

.margin-inputs input:focus {
  border-color: #6366f1;
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.14);
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label,
.font-setting-item label {
  display: block;
  margin-bottom: 5px;
  font-weight: 550;
  font-size: 11.5px;
  color: #6f6a7e;
  letter-spacing: 0.01em;
}

.form-group input,
.form-group select,
.font-setting-item select,
.font-setting-item input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  background-color: #ffffff;
  border: 1px solid rgba(28, 27, 38, 0.12);
  border-radius: 7px;
  font-size: 12px;
  color: #1c1b26;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.form-group input:hover,
.form-group select:hover,
.font-setting-item select:hover,
.font-setting-item input:hover {
  border-color: #c4b5fd;
}

.form-group input:focus,
.form-group select:focus,
.font-setting-item select:focus,
.font-setting-item input:focus {
  border-color: #6366f1;
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.14);
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
