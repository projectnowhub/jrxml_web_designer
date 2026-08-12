<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton, NAlert } from 'naive-ui';
import ResizablePanel from './ResizablePanel.vue';
import PdfPreviewModal from '../modals/PdfPreviewModal.vue';
import CodeMirrorEditor from '../editor/CodeMirrorEditor.vue';

import { validateJRXML, autoFixJRXML, type ValidationResult, type ValidationError, type AutoFixResult } from '../../utils/jrxml/xsdValidator';
import { html_beautify } from 'js-beautify';

import type { Band, ReportProperties } from '../../types';
import {
  UI_CONSTANTS,
  PANEL_CONSTANTS
} from '../../constants/constants';
import { getAvailableFonts } from '../../utils/fontUtils';
import type { BandType } from '../../types';

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
  reportProperties: any;
  bands: Band[];
  allBandTypes: any[];
  selectedBandTypes: BandType[];
  jrxmlContent: string;
  previewServerUrl?: string;
}

// Define component events
interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'size-change', value: number): void;
  (e: 'update:report-properties', value: any): void;
  (e: 'update:selected-band-types', value: BandType[]): void;
  (e: 'update:jrxml-content', value: string): void;
  (e: 'copy-jrxml'): void;
  (e: 'save-jrxml'): void;
  (e: 'regenerate-jrxml'): void;
  (e: 'download-jrxml'): void;
  (e: 'band-selection-change'): void;
}

// Use defineProps and defineEmits
const props = withDefaults(defineProps<Props>(), {
  visible: false,
  initialHeight: PANEL_CONSTANTS.DEFAULT_BOTTOM_PANEL_HEIGHT
});

const emit = defineEmits<Emits>();

// Tab-related state
const activeTab = ref('pageSettings');
const tabs = ref([
  { id: 'pageSettings', name: t('bottomPanel.jrxmlTabs.pageSettings') },
  { id: 'jrxml', name: t('bottomPanel.jrxmlContent') }
]);

// Bottom panel height
const bottomPanelHeight = ref(props.initialHeight);

// Fullscreen state
const isFullscreen = ref(false);
const originalPanelHeight = ref(props.initialHeight);
const currentMaxSize = ref(window.innerHeight); // No maximum height limit

// Paper size definitions
const PAPER_SIZES = [
  { name: 'Letter', width: 612, height: 792 },
  { name: 'Legal', width: 612, height: 1008 },
  { name: 'A0', width: 2384, height: 3370 },
  { name: 'A1', width: 1684, height: 2384 },
  { name: 'A2', width: 1191, height: 1684 },
  { name: 'A3', width: 842, height: 1190 },
  { name: 'A4', width: 595, height: 842 },
  { name: 'A5', width: 420, height: 595 },
  { name: 'A6', width: 298, height: 420 },
  { name: 'A7', width: 210, height: 298 },
  { name: 'A8', width: 147, height: 210 },
  { name: 'A9', width: 105, height: 147 },
  { name: 'A10', width: 74, height: 105 },
  { name: 'B0', width: 2835, height: 4008 },
  { name: 'B1', width: 2004, height: 2835 },
  { name: 'B2', width: 1417, height: 2004 },
  { name: 'B3', width: 1001, height: 1417 },
  { name: 'B4', width: 708, height: 1000 },
  { name: 'B5', width: 498, height: 708 },
  { name: 'B6', width: 354, height: 499 },
  { name: 'B7', width: 249, height: 354 },
  { name: 'B8', width: 176, height: 249 },
  { name: 'B9', width: 125, height: 176 },
  { name: 'B10', width: 88, height: 125 },
  { name: 'C0', width: 2599, height: 3676 },
  { name: 'C1', width: 1837, height: 2599 },
  { name: 'C2', width: 1298, height: 1837 },
  { name: 'C3', width: 918, height: 1298 },
  { name: 'C4', width: 649, height: 918 },
  { name: 'C5', width: 459, height: 649 },
  { name: 'C6', width: 323, height: 459 },
  { name: 'C7', width: 230, height: 323 },
  { name: 'C8', width: 162, height: 230 },
  { name: 'C9', width: 113, height: 162 },
  { name: 'C10', width: 79, height: 113 },
  { name: 'RA0', width: 2437, height: 3458 },
  { name: 'RA1', width: 1729, height: 2437 },
  { name: 'RA2', width: 1218, height: 1729 },
  { name: 'SRA0', width: 2551, height: 3628 },
  { name: 'SRA1', width: 1814, height: 2551 },
  { name: 'SRA2', width: 1275, height: 1814 },
  { name: 'Executive', width: 522, height: 756 },
  { name: 'Statement', width: 396, height: 612 },
  { name: 'Tabloid', width: 792, height: 1224 },
  { name: 'Ledger', width: 1224, height: 792 },
  { name: 'Note', width: 540, height: 780 },
  { name: 'Folio', width: 612, height: 936 },
  { name: 'Quarto', width: 610, height: 780 },
  { name: '10x14', width: 720, height: 1008 },
  { name: 'Custom', width: 0, height: 0 }
];

const selectedPaperSize = ref('A4');
const orientation = ref('Portrait');

// List of available fonts
const availableFonts = ref<string[]>([]);

// PDF preview modal visibility state
const showPdfPreview = ref(false);

// Reference to the CodeMirrorEditor component
const codeMirrorEditorRef = ref<InstanceType<typeof CodeMirrorEditor> | null>(null);

// Search-related state (consolidated into the button row)
const searchInputRef = ref<HTMLInputElement | null>(null);
const showSearch = ref(false);
const searchQuery = ref('');
const searchResultsCount = ref(0);
const currentSearchResult = ref(0);

const toggleSearch = () => {
  showSearch.value = !showSearch.value;
  if (showSearch.value) {
    searchResultsCount.value = codeMirrorEditorRef.value?.performSearchWith(searchQuery.value) ?? 0;
    currentSearchResult.value = searchResultsCount.value > 0 ? 1 : 0;
    nextTick(() => { searchInputRef.value?.focus(); });
  } else {
    codeMirrorEditorRef.value?.closeSearch();
  }
};

const performSearch = () => {
  searchResultsCount.value = codeMirrorEditorRef.value?.performSearchWith(searchQuery.value) ?? 0;
  currentSearchResult.value = searchResultsCount.value > 0 ? 1 : 0;
  // If the query is purely numeric and there are no search results, treat it as a line-number jump
  if (searchResultsCount.value === 0 && /^\d+$/.test(searchQuery.value)) {
    jumpToLine(parseInt(searchQuery.value, 10), 0);
  }
  // Keep focus on the search box so the editor doesn't steal it
  nextTick(() => { searchInputRef.value?.focus(); });
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
    currentSearchResult.value = ((currentSearchResult.value) % searchResultsCount.value) + 1;
  }
};

const findPrevious = () => {
  codeMirrorEditorRef.value?.findPrevious();
  if (searchResultsCount.value > 0) {
    currentSearchResult.value = currentSearchResult.value <= 1
      ? searchResultsCount.value
      : currentSearchResult.value - 1;
  }
};

const closeSearch = () => {
  showSearch.value = false;
  searchQuery.value = '';
  searchResultsCount.value = 0;
  currentSearchResult.value = 0;
  codeMirrorEditorRef.value?.closeSearch();
};

onMounted(async () => {
  availableFonts.value = await getAvailableFonts();
});

// Open the PDF preview
const openPdfPreview = (): void => {
  if (!localJrxmlContent.value) {
    alert(t('bottomPanel.alerts.generateJrxmlFirst'));
    return;
  }
  showPdfPreview.value = false;
  nextTick(() => {
    showPdfPreview.value = true;
  });
};

// Computed property: local binding for reportProperties
const localReportProperties = computed({
  get: () => props.reportProperties,
  set: (value) => emit('update:report-properties', value)
});

// Detect the paper size and orientation
const detectPaperSizeAndOrientation = () => {
  if (!props.reportProperties) return;

  const w = props.reportProperties.pageWidth;
  const h = props.reportProperties.pageHeight;
  const isLandscape = w > h;

  // Ideally we'd only update orientation when it wasn't changed manually (to avoid update loops),
  // but this is mainly used for initial detection.
  // In practice we should always trust the current width/height ratio.
  orientation.value = isLandscape ? 'Landscape' : 'Portrait';

  // Check whether it matches a preset size
  // For landscape, width is the long side; for portrait, height is the long side.
  // In the preset sizes, width is the short side and height is the long side.
  const checkW = isLandscape ? h : w;
  const checkH = isLandscape ? w : h;
  
  const match = PAPER_SIZES.find(s => s.name !== 'Custom' && s.width === checkW && s.height === checkH);
  selectedPaperSize.value = match ? match.name : 'Custom';
};

// Watch for reportProperties changes and update the selected state
// Use deep: true to watch changes to nested properties
watch(() => props.reportProperties, () => {
  // Re-detect whenever width/height change
  // Note: this may also fire while we're in the middle of changing width/height, so handle it carefully
  // Here we only update when width/height no longer match the currently selected size
  detectPaperSizeAndOrientation();
}, { deep: true, immediate: true });

// Handle paper size changes
const handlePaperSizeChange = () => {
  if (selectedPaperSize.value === 'Custom') return;

  const size = PAPER_SIZES.find(s => s.name === selectedPaperSize.value);
  if (!size) return;

  // Apply the size based on the current orientation
  if (orientation.value === 'Landscape') {
    localReportProperties.value.pageWidth = size.height;
    localReportProperties.value.pageHeight = size.width;
  } else {
    localReportProperties.value.pageWidth = size.width;
    localReportProperties.value.pageHeight = size.height;
  }
};

// Handle orientation changes
const handleOrientationChange = () => {
  const w = localReportProperties.value.pageWidth;
  const h = localReportProperties.value.pageHeight;

  if (orientation.value === 'Landscape') {
    // Switching to landscape: if currently portrait (width < height), swap them
    if (w < h) {
      localReportProperties.value.pageWidth = h;
      localReportProperties.value.pageHeight = w;
    }
  } else {
    // Switching to portrait: if currently landscape (width > height), swap them
    if (w > h) {
      localReportProperties.value.pageWidth = h;
      localReportProperties.value.pageHeight = w;
    }
  }
};

// Computed property: local binding for selectedBandTypes
const localSelectedBandTypes = computed({
  get: () => props.selectedBandTypes,
  set: (value) => emit('update:selected-band-types', value)
});

// Computed property: local binding for jrxmlContent
const localJrxmlContent = computed({
  get: () => {
    if (!props.jrxmlContent) return props.jrxmlContent;
    return html_beautify(props.jrxmlContent, {
      indent_size: 2,
      wrap_attributes: 'auto',
      wrap_line_length: 120,
      content_unformatted: [
        'text', 'textFieldExpression', 'parameterExpression', 'queryString',
        'sortField', 'groupExpression', 'reportFont', 'property',
        'propertyExpression', 'font'
      ],
      extra_liners: ['text', 'textFieldExpression', 'parameterExpression', 'queryString']
    });
  },
  set: (value) => emit('update:jrxml-content', value)
});

// Sync scrolling
const syncScroll = () => {
  // CodeMirrorEditor already has built-in line number and scroll sync support
  // This can be left empty, or extended with additional scroll handling logic if needed
};

// Handle bottom panel size changes
const handleBottomPanelSizeChange = (newSize: number) => {
  bottomPanelHeight.value = newSize;
  emit('size-change', newSize);
};

// Handle Band selection changes
const handleBandSelectionChange = () => {
  // localSelectedBandTypes is a computed property already synced to the parent via v-model
  // Here we just need to emit the band-selection-change event so the parent can run related logic
  emit('band-selection-change');
};

// Copy the JRXML content to the clipboard
const copyJRXML = async (): Promise<void> => {
  emit('copy-jrxml');
};

// Regenerate the JRXML content
const regenerateJRXML = (): void => {
  emit('regenerate-jrxml');
};

const formatJRXML = (): void => {
  codeMirrorEditorRef.value?.formatDocument();
};

// Download the JRXML file
const downloadJRXML = (): void => {
  // Switch to the JRXML tab
  activeTab.value = 'jrxml';
  emit('download-jrxml');
};

// Save the edited JRXML content
const saveJRXML = (): void => {
  emit('save-jrxml');
};

// Toggle fullscreen mode
const toggleFullscreen = (): void => {
  isFullscreen.value = !isFullscreen.value;
  if (isFullscreen.value) {
    // Enter fullscreen mode
    originalPanelHeight.value = bottomPanelHeight.value;
    currentMaxSize.value = window.innerHeight; // Set a larger max height
    bottomPanelHeight.value = window.innerHeight - 100; // Leave some space for other UI elements
  } else {
    // Exit fullscreen mode
    bottomPanelHeight.value = originalPanelHeight.value;
    currentMaxSize.value = window.innerHeight; // Restore the unlimited max height
  }
};

// Listen for keyboard events
function handleKeyDown(event: KeyboardEvent) {
  // Listen for the ESC key to exit fullscreen or hide the bottom panel
  if (event.key === 'Escape') {
    if (isFullscreen.value) {
      toggleFullscreen();
    } else if (props.visible) {
      // When the bottom panel is visible and not fullscreen, ESC hides the bottom panel
      emit('update:visible', false);
    }
  }

  // Listen for Cmd+F or Ctrl+F to switch to the JRXML tab and enter fullscreen
  if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
    event.preventDefault(); // Prevent the browser's default search functionality

    // Open the bottom panel if it isn't already open
    if (!props.visible) {
      emit('update:visible', true);
    }

    // Switch to the JRXML tab
    activeTab.value = 'jrxml';

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

// Add the event listener when the component is mounted
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

// Validation-related state
const validationResult = ref<ValidationResult | null>(null);
const isValidating = ref(false);

// Run XSD validation
const runValidation = async () => {
  if (!localJrxmlContent.value) {
    alert(t('bottomPanel.alerts.generateJrxmlFirst'));
    return;
  }
  
  isValidating.value = true;
  validationResult.value = null;
  
  try {
    validationResult.value = await validateJRXML(localJrxmlContent.value);
    
    // Automatically expand the bottom panel when validation fails
    if (!validationResult.value.valid) {
      bottomPanelHeight.value = window.innerHeight - 100;
      currentMaxSize.value = window.innerHeight;
      activeTab.value = 'jrxml';
    }
  } catch (error) {
    validationResult.value = {
      valid: false,
      errors: [{
        line: 0,
        column: 0,
        message: `Validation failed: ${String(error)}`
      }]
    };
    // Automatically expand the bottom panel when validation fails
    bottomPanelHeight.value = window.innerHeight - 100;
    currentMaxSize.value = window.innerHeight;
    activeTab.value = 'jrxml';
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
    alert(t('bottomPanel.alerts.generateJrxmlFirst'));
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
      activeTab.value = 'jrxml';
    }
  } catch (error) {
    console.error('Auto-fix failed:', error);
  } finally {
    isAutoFixing.value = false;
  }
};

// Clear the auto-fix result
const clearAutoFixResult = () => {
  autoFixResult.value = null;
};

// Add the event listener when the component is mounted
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

// Remove the event listener before the component is unmounted
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <ResizablePanel 
    v-show="visible"
    position="bottom"
    :initial-size="bottomPanelHeight"
    :min-size="150"
    :max-size="currentMaxSize"
    :collapsible="true"
    @size-change="handleBottomPanelSizeChange"
  >
    <div class="tab-navigation">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        class="tab-button" 
        :class="{ 'active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>
    
    <!-- Page settings tab -->
    <div class="tab-content page-settings-tab" v-show="activeTab === 'pageSettings'">
      <div class="settings-grid">
        <div class="settings-section">
          <h4>{{ t('bottomPanel.basicInfo') }}</h4>
          <div class="form-group">
            <label>{{ t('bottomPanel.reportName') }}</label>
            <input v-model="localReportProperties.name" type="text" />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>{{ t('bottomPanel.paperSize') }}</label>
              <select v-model="selectedPaperSize" @change="handlePaperSizeChange">
                <option v-for="size in PAPER_SIZES" :key="size.name" :value="size.name">
                  {{ size.name }}
                </option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label>{{ t('bottomPanel.paperOrientation') }}</label>
              <select v-model="orientation" @change="handleOrientationChange">
                <option value="Portrait">{{ t('bottomPanel.portrait') }}</option>
                <option value="Landscape">{{ t('bottomPanel.landscape') }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group flex-1">
              <label>{{ t('bottomPanel.pageWidth') }}</label>
              <input v-model.number="localReportProperties.pageWidth" type="number" />
            </div>
            <div class="form-group flex-1">
              <label>{{ t('bottomPanel.pageHeight') }}</label>
              <input v-model.number="localReportProperties.pageHeight" type="number" />
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <h4>{{ t('bottomPanel.pageMargins') }}</h4>
          <div class="form-group">
            <label>{{ t('bottomPanel.marginsPx') }}</label>
            <div class="margin-inputs">
              <input v-model.number="localReportProperties.leftMargin" type="number" :placeholder="t('properties.leftSide')" />
              <input v-model.number="localReportProperties.rightMargin" type="number" :placeholder="t('properties.rightSide')" />
              <input v-model.number="localReportProperties.topMargin" type="number" :placeholder="t('properties.topSide')" />
              <input v-model.number="localReportProperties.bottomMargin" type="number" :placeholder="t('properties.bottomSide')" />
            </div>
          </div>
        </div>

        <!-- Font settings - compact layout -->
        <div class="settings-section font-settings-compact">
          <h4>{{ t('bottomPanel.defaultFontSettings') }}</h4>
          <div class="font-settings-row">
            <div class="font-setting-item">
              <label>{{ t('properties.fontName') }}</label>
              <select v-model="localReportProperties.defaultFont.name">
                <option v-for="font in availableFonts" :key="font" :value="font">{{ font }}</option>
              </select>
            </div>
            <div class="font-setting-item">
              <label>{{ t('properties.fontSize') }}</label>
              <input v-model.number="localReportProperties.defaultFont.size" type="number" />
            </div>
          </div>
          <div class="font-style-options">
            <label>
              <input v-model="localReportProperties.defaultFont.isBold" type="checkbox" />
              {{ t('properties.bold') }}
            </label>
            <label>
              <input v-model="localReportProperties.defaultFont.isItalic" type="checkbox" />
              {{ t('properties.italic') }}
            </label>
            <label>
              <input v-model="localReportProperties.defaultFont.isUnderline" type="checkbox" />
              {{ t('properties.underline') }}
            </label>
          </div>
        </div>
        
        <!-- Band selection -->
        <div class="settings-section band-selection-section">
          <h4>{{ t('bottomPanel.bandSelection') }}</h4>
          <div class="band-selection-grid">
            <div v-for="bandType in allBandTypes" :key="bandType.type" class="band-selection-item">
              <label>
                <input 
                  type="checkbox" 
                  :value="bandType.type"
                  v-model="localSelectedBandTypes"
                  @change="handleBandSelectionChange"
                />
                {{ getBandDisplayName(bandType.type) }}
              </label>
            </div>
          </div>
          <div class="band-selection-note">
            <small>{{ t('bottomPanel.bandSelectionHint') }}</small>
          </div>
        </div>
      </div>
    </div>
    
    <!-- JRXML content tab -->
    <div class="tab-content jrxml-tab" v-show="activeTab === 'jrxml'">
      <div class="jrxml-container">
        <div class="jrxml-header">
          <div class="jrxml-actions">
            <n-button @click="copyJRXML" type="default" size="small">{{ t('bottomPanel.copy') }}</n-button>
            <n-button @click="saveJRXML" type="primary" size="small">{{ t('bottomPanel.apply') }}</n-button>
            <n-button @click="regenerateJRXML" type="default" size="small">{{ t('bottomPanel.regenerate') }}</n-button>
            <n-button @click="formatJRXML" type="default" size="small">{{ t('bottomPanel.format') }}</n-button>
            <n-button @click="downloadJRXML" type="primary" size="small">{{ t('bottomPanel.downloadJRXML') }}</n-button>
            <n-button @click="openPdfPreview" type="info" size="small">{{ t('bottomPanel.previewPDF') }}</n-button>
            <n-button
              @click="runValidation"
              :loading="isValidating"
              type="warning"
              size="small"
              class="validation-btn"
            >
              {{ t('bottomPanel.validate') }}
            </n-button>
            <n-button
              @click="runAutoFix"
              :loading="isAutoFixing"
              type="warning"
              size="small"
              class="autofix-btn"
            >
              {{ t('bottomPanel.autoFix') }}
            </n-button>
            <template v-if="showSearch">
              <div class="action-separator"></div>
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                class="inline-search-input"
                placeholder="Search... (Ctrl+F)"
                @input="performSearch"
                @keydown.enter="findNext"
                @keydown.shift.enter="findPrevious"
                @keydown.escape="closeSearch"
              />
              <n-button @click="findPrevious" type="default" size="small" title="Previous">↑</n-button>
              <n-button @click="findNext" type="default" size="small" title="Next">↓</n-button>
              <n-button @click="closeSearch" type="default" size="small" title="Close">×</n-button>
              <span v-if="searchResultsCount > 0" class="search-status">
                {{ currentSearchResult }} / {{ searchResultsCount }}
              </span>
            </template>
          </div>
        </div>
        
        <n-alert
          v-if="validationResult"
          :type="validationResult.valid ? 'success' : 'error'"
          :title="validationResult.valid ? t('bottomPanel.validationSuccess') : t('bottomPanel.validationFailed')"
          closable
          @close="clearValidation"
          class="validation-result"
        >
          <div v-if="validationResult.valid">
            <p>{{ t('bottomPanel.validationNoErrors') }}</p>
          </div>
          <div v-else>
            <p>{{ t('bottomPanel.validationErrorCount', { count: validationResult.errors.length }) }}</p>
            <ul class="validation-error-list">
              <li 
                v-for="(error, index) in validationResult.errors" 
                :key="index"
                :class="[error.severity, { 'clickable': error.line > 0 }]"
                @click="error.line > 0 && jumpToLine(error.line, error.column)"
              >
                <span class="error-location">
                  {{ error.line > 0 ? `[${error.line}:${error.column}]` : '[?]' }}
                </span>
                <span class="error-message">{{ error.message }}</span>
              </li>
            </ul>
          </div>
        </n-alert>

        <n-alert
          v-if="autoFixResult"
          :type="autoFixResult.fixed ? 'success' : (autoFixResult.warnings.length > 0 ? 'warning' : 'info')"
          :title="autoFixResult.fixed ? t('bottomPanel.autoFixSuccess') : t('bottomPanel.autoFixNoChanges')"
          closable
          @close="clearAutoFixResult"
          class="autofix-result"
        >
          <div v-if="autoFixResult.fixed">
            <p>{{ t('bottomPanel.autoFixFixedCount', { count: autoFixResult.fixes.length }) }}</p>
            <ul class="autofix-list">
              <li
                v-for="(fix, index) in autoFixResult.fixes"
                :key="index"
                class="clickable"
                @click="jumpToLine(fix.lineNumber, 0)"
              >
                <span class="fix-location">
                  {{ fix.lineNumber > 0 ? `[${fix.lineNumber}]` : '[?]' }}
                </span>
                <span class="fix-message">
                  {{ t('bottomPanel.autoFixRemovedAttribute', { element: fix.elementName, attribute: fix.attributeName }) }}
                </span>
              </li>
            </ul>
          </div>
          <div v-if="autoFixResult.warnings.length > 0" class="autofix-warnings">
            <p>{{ t('bottomPanel.autoFixWarnings') }}</p>
            <ul class="autofix-list warning-list">
              <li
                v-for="(warning, index) in autoFixResult.warnings"
                :key="index"
              >
                <span class="warning-message">
                  <strong>&lt;{{ warning.elementName }}&gt;</strong>: {{ warning.message }}
                </span>
              </li>
            </ul>
          </div>
          <div v-if="!autoFixResult.fixed && autoFixResult.warnings.length === 0">
            <p>{{ t('bottomPanel.autoFixNoIssuesFound') }}</p>
          </div>
        </n-alert>

        <div class="jrxml-content">
          <CodeMirrorEditor
            ref="codeMirrorEditorRef"
            v-model="localJrxmlContent"
            :placeholder="localJrxmlContent ? '' : t('bottomPanel.clickToGenerate')"
            @update:modelValue="localJrxmlContent = $event"
            @scroll="syncScroll"
          />
        </div>
      </div>
    </div>

  </ResizablePanel>

  <PdfPreviewModal
    :visible="showPdfPreview"
    :jrxml-content="localJrxmlContent"
    :preview-server-url="props.previewServerUrl"
    @update:visible="showPdfPreview = $event"
  />
</template>

<style scoped>
.tabs-container {
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 70vh; /* Limit the maximum height to avoid taking up too much screen space */
}

.tab-navigation {
  display: flex;
  background-color: #e9e9e9;
  border-bottom: 1px solid #ddd;
  padding: 0 8px;
  flex-shrink: 0; /* Ensure the navigation bar doesn't get compressed */
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab-button {
  padding: 6px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.tab-button.active {
  border-bottom-color: #4a90e2;
  color: #4a90e2;
  font-weight: bold;
}

.tab-button:hover:not(.active) {
  background-color: #f0f0f0;
}

.tab-content {
  flex: 1;
  overflow: auto;
  min-height: 0; /* Ensure flex child elements can shrink */
  padding: 10px;
  box-sizing: border-box;
}

.jrxml-tab {
  background-color: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-settings-tab {
  background-color: white;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 15px;
}

.settings-section {
  background-color: #f9f9f9;
  border-radius: v-bind('UI_CONSTANTS.BORDER_RADIUS_MEDIUM + "px"');
  padding: v-bind('UI_CONSTANTS.PANEL_PADDING + "px"');
  border: v-bind('UI_CONSTANTS.BORDER_THIN + "px"') solid #e8e8e8;
}

.settings-section h4 {
  margin-top: 0;
  margin-bottom: v-bind('UI_CONSTANTS.MEDIUM_MARGIN + "px"');
  color: #333;
  font-size: v-bind('UI_CONSTANTS.FONT_SIZE_MEDIUM + "px"');
  font-weight: 600;
  border-bottom: v-bind('UI_CONSTANTS.BORDER_THIN + "px"') solid #e0e0e0;
  padding-bottom: v-bind('UI_CONSTANTS.SMALL_MARGIN + "px"');
}

/* Form row layout */
.form-row {
  display: flex;
  gap: v-bind('UI_CONSTANTS.MEDIUM_MARGIN + "px"');
  margin-bottom: 0.75rem;
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
  gap: v-bind('UI_CONSTANTS.MEDIUM_MARGIN + "px"');
  margin-bottom: v-bind('UI_CONSTANTS.MEDIUM_MARGIN + "px"');
}

.font-setting-item {
  flex: 1;
}

.font-setting-item select,
.font-setting-item input {
  width: 100%;
  padding: v-bind('UI_CONSTANTS.INPUT_PADDING_SMALL');
  border: v-bind('UI_CONSTANTS.BORDER_THIN + "px"') solid #ddd;
  border-radius: v-bind('UI_CONSTANTS.BORDER_RADIUS_SMALL + "px"');
  font-size: v-bind('UI_CONSTANTS.FONT_SIZE_SMALL + "px"');
}

.font-style-options {
  display: flex;
  gap: v-bind('UI_CONSTANTS.MEDIUM_GAP + "px"');
  flex-wrap: wrap;
}

.font-style-options label {
  display: flex;
  align-items: center;
  gap: v-bind('UI_CONSTANTS.SMALL_GAP + "px"');
  margin-bottom: 0;
  font-weight: normal;
  font-size: v-bind('UI_CONSTANTS.FONT_SIZE_SMALL + "px"');
}

.checkbox-group {
  display: flex;
  gap: v-bind('UI_CONSTANTS.MEDIUM_GAP + "px"');
  flex-wrap: wrap;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: v-bind('UI_CONSTANTS.SMALL_GAP + "px"');
  margin-bottom: 0;
  font-weight: normal;
  font-size: v-bind('UI_CONSTANTS.FONT_SIZE_DEFAULT + "px"');
}

.jrxml-container {
  background-color: #f5f5f5;
  border-radius: v-bind('UI_CONSTANTS.BORDER_RADIUS_SMALL + "px"');
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
  padding: v-bind('UI_CONSTANTS.SMALL_MARGIN + "px"') v-bind('UI_CONSTANTS.MEDIUM_MARGIN + "px"');
  background-color: #e9e9e9;
  border-bottom: v-bind('UI_CONSTANTS.BORDER_THIN + "px"') solid #ddd;
  flex-shrink: 0;
}

.jrxml-content {
  flex: 1;
  min-height: 0;
  border-radius: v-bind('UI_CONSTANTS.BORDER_RADIUS_SMALL + "px"');
  border: v-bind('UI_CONSTANTS.BORDER_THIN + "px"') solid #ddd;
}

.editor-container {
  display: flex;
  width: 100%;
  height: 100%;
}

.line-numbers {
  flex-shrink: 0;
  width: 40px;
  background-color: #f0f0f0;
  color: #999;
  text-align: right;
  padding: v-bind('UI_CONSTANTS.PANEL_PADDING + "px"') 8px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: v-bind('UI_CONSTANTS.FONT_SIZE_SMALL + "px"');
  line-height: 1.5;
  overflow: hidden;
  user-select: none;
  border-right: 1px solid #ddd;
  white-space: pre;
  box-sizing: border-box;
}

.jrxml-editor {
  flex: 1;
  width: 100%;
  height: 100%;
  padding: v-bind('UI_CONSTANTS.PANEL_PADDING + "px"');
  background-color: #f8f9fa;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: v-bind('UI_CONSTANTS.FONT_SIZE_SMALL + "px"');
  line-height: 1.5;
  white-space: pre; /* Keep pre (no wrapping) to preserve line-number alignment */
  word-wrap: normal; /* Do not wrap automatically */
  overflow-x: auto; /* Allow horizontal scrolling */
  border: none;
  outline: none;
  resize: none;
  tab-size: 2;
  box-sizing: border-box;
  color: #333;
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
  background-color: #ddd;
  margin: 0 2px;
  flex-shrink: 0;
}

.inline-search-input {
  width: 160px;
  padding: 3px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  height: 20px;
  flex-shrink: 0;
}

.inline-search-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.search-status {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
  flex-shrink: 0;
}

.jrxml-actions .fullscreen-active {
  background-color: #4a90e2;
  color: white;
}

.jrxml-placeholder {
  padding: 16px 12px;
  text-align: center;
  color: #999;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.band-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
}

.band-selection-item {
  margin: 0;
}

.band-selection-note {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #e0e0e0;
}

.margin-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  font-size: v-bind('UI_CONSTANTS.FONT_SIZE_SMALL + "px"');
  color: #555;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: v-bind('UI_CONSTANTS.INPUT_PADDING_SMALL');
  border: v-bind('UI_CONSTANTS.BORDER_THIN + "px"') solid #ddd;
  border-radius: v-bind('UI_CONSTANTS.BORDER_RADIUS_SMALL + "px"');
  font-size: v-bind('UI_CONSTANTS.FONT_SIZE_SMALL + "px"');
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #4a90e2;
  outline: none;
}

.validation-btn {
  margin-left: auto;
}

.validation-result {
  margin: 8px;
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
  border-bottom: 1px solid #eee;
  font-size: 13px;
}

.validation-error-list li:last-child {
  border-bottom: none;
}

.validation-error-list li.clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.validation-error-list li.clickable:hover {
  background-color: #f5f5f5;
}

.validation-error-list .error-location {
  color: #999;
  margin-right: 8px;
  font-family: monospace;
}

.validation-error-list .error-message {
  color: #dc3545;
}

.validation-error-list .warning .error-message {
  color: #ffc107;
}

.validation-error-list .fatal .error-message {
  color: #dc3545;
  font-weight: bold;
}

/* Auto-fix button style */
.autofix-btn {
  margin-left: 8px;
}

.autofix-result {
  margin: 8px;
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
  border-bottom: 1px solid #eee;
  font-size: 13px;
}

.autofix-list li:last-child {
  border-bottom: none;
}

.autofix-list li.clickable {
  cursor: pointer;
  transition: background-color 0.2s;
}

.autofix-list li.clickable:hover {
  background-color: #f5f5f5;
}

.autofix-list .fix-location {
  color: #999;
  margin-right: 8px;
  font-family: monospace;
}

.autofix-list .fix-message {
  color: #28a745;
}

/* Warning list style */
.autofix-warnings {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #ddd;
}

.warning-list li {
  color: #856404;
  background-color: #fff3cd;
  padding: 6px 10px;
  margin: 4px 0;
  border-radius: 4px;
  border-left: 3px solid #ffc107;
}

.warning-list .warning-message {
  font-size: 13px;
}

.warning-list strong {
  color: #533f03;
}

</style>