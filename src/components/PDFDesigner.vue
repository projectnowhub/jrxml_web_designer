<template>
  <div class="pdf-designer">
    <div class="designer-header">
      <div class="header-left">
        <h1>{{ t('app.title') }}</h1>
        <div class="header-undo-redo">
          <n-button @click="undo" type="default" quaternary circle :title="t('actions.undo')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 10h10a5 5 0 0 1 0 10H9"/><polyline points="7 14 3 10 7 6"/></svg>
          </n-button>
          <n-button @click="redo" type="default" quaternary circle :title="t('actions.redo')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 10H11a5 5 0 0 0 0 10h4"/><polyline points="17 14 21 10 17 6"/></svg>
          </n-button>
        </div>
        <div class="header-toolbar-ops">
          <span class="toolbar-divider"></span>
          <button class="toolbar-btn" @click="deleteElement" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
          <button class="toolbar-btn" @click="copyElement" title="Copy">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="toolbar-btn" @click="pasteElement" title="Paste">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
          </button>
        </div>
      </div>
      <div class="header-actions">
        <!-- Zoom controls -->
        <ZoomControls
          :zoom-level="zoomLevel"
          :paper-width="reportProperties.pageWidth"
          @update:zoomLevel="setZoomLevel($event)"
        />

        <!-- File manager component -->
        <FileManager
          :current-file-name="currentFileName"
          :current-file-id="currentFileId"
          @create-new-file="createNewFile"
          @load-file="loadFile"
          @save-current-file="saveCurrentFileToStorage"
          @save-as-file="saveAsLocalFile"
          @update:currentFileName="currentFileName = $event"
          @update:currentFileId="currentFileId = $event"
        />

        <n-button @click="toggleBottomPanel" type="default">
          {{ showBottomPanel ? t('actions.hideBottomPanel') : t('actions.showBottomPanel') }}
        </n-button>

        <!-- Snap controls -->
        <div class="snap-controls-header">
          <n-checkbox
            :checked="enableSnapToGrid"
            size="small"
            @update:checked="enableSnapToGrid = $event"
          >
            {{ t('actions.snapToGrid') }}
          </n-checkbox>
          <n-checkbox
            :checked="enableSnapToAlignment"
            size="small"
            @update:checked="enableSnapToAlignment = $event"
          >
            {{ t('actions.snapToAlignment') }}
          </n-checkbox>
          <n-checkbox
            :checked="showGrid"
            size="small"
            @update:checked="showGrid = $event"
          >
            {{ t('actions.showGrid') }}
          </n-checkbox>
        </div>

        <SplitButton
          :actions="[
            { label: t('actions.previewPDF'), handler: openPdfPreview, class: 'btn-primary' },
            { label: t('actions.downloadJRXML'), handler: downloadJRXML, class: 'btn-primary' },
            { label: t('actions.setPreviewServer'), handler: openPreviewServerSettings, class: 'btn-primary' }
          ]"
        />
        <!-- <n-button @click="showHelp = true" type="default">{{ t('actions.help') }}</n-button> -->
        <LanguageSwitcher />

        <div class="my-act-menu">
            <n-button
              type="default"
              @click="showMyActMenu = !showMyActMenu"
            >
              My Act
              <span class="dropdown-arrow">▾</span>
            </n-button>

            <div v-if="showMyActMenu" class="my-act-dropdown">
              <button
                type="button"
                class="my-act-dropdown-item"
                @click="handleSignOut"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
        </div>
      </div>
    </div>

    <!-- Coordinate display element -->
      <div
        v-if="dragCoordinates.visible"
        class="coordinates-display"
      >
        {{ t('designer.coordinates', { bandName: dragCoordinates.bandName, x: dragCoordinates.x, y: dragCoordinates.y }) }}
      </div>

      <!-- Band height adjustment tooltip -->
      <div
        v-if="resizingBandInfo.visible"
        class="band-height-display"
      >
        {{ resizingBandInfo.bandName }} Height: {{ resizingBandInfo.height }}px
      </div>

      <div class="designer-layout">
      <!-- Left-side element library -->
      <ResizablePanel
        v-show="showLeftPanel"
        position="left"
        :initial-size="leftPanelWidth"
        :min-size="PANEL_CONSTANTS.LEFT_PANEL_MIN_WIDTH"
        :max-size="PANEL_CONSTANTS.LEFT_PANEL_MAX_WIDTH"
        :collapsible="true"
        @size-change="handleLeftPanelSizeChange"
        @collapse-change="leftPanelCollapsed = $event"
      >
        <ElementLibrary
          :elements="elements"
          :report-fields="reportFields"
          :report-parameters="reportParameters"
          :report-variables="reportVariables"
          :report-styles="reportStyles"
          :bands="bands"
          :selected-element="selectedElement"
          :sub-datasets="subDatasets"
          @drag-start="handleDragStart"
          @element-double-click="handleElementDoubleClick"
          @select-element="selectElement"
          @add-field="handleAddField"
          @edit-field="handleEditField"
          @delete-field="handleDeleteField"
          @add-parameter="handleAddParameter"
          @edit-parameter="handleEditParameter"
          @delete-parameter="handleDeleteParameter"
          @add-variable="handleAddVariable"
          @edit-variable="handleEditVariable"
          @delete-variable="handleDeleteVariable"
          @add-style="handleAddStyle"
          @edit-style="handleEditStyle"
          @delete-style="handleDeleteStyle"
          @delete-element="deleteElement"
          @add-sub-dataset="handleAddSubDataset"
          @edit-sub-dataset="handleEditSubDataset"
          @delete-sub-dataset="handleDeleteSubDataset"
        />
      </ResizablePanel>

      <!-- Center design area -->
      <div class="design-area-wrapper" style="position:relative;flex:1;overflow:auto;">
      <MultiSelectToolbar
        :visible="selectedElements.length > 1"
        :count="selectedElements.length"
        @align="handleMultiAlign"
        @distribute="handleMultiDistribute"
        @resize="handleMultiResize"
      />
      <AlignmentGuides
        :guides="activeAlignmentGuides.map(g => ({ id: g.id, type: g.type, position: g.position, label: g.label, active: g.active }))"
        :zoom-level="zoomLevel"
      />
      <DesignerCanvas
        ref="designerCanvasRef"
        :paper-width="paperWidth"
        :paper-height="paperHeight"
        :zoom-level="zoomLevel"
        :report-properties="reportProperties"
        :bands="bands"
        :selected-band-index="selectedBandIndex"
        :highlighted-band-index="highlightedBandIndex"
        :selected-element="selectedElement"
        :selected-elements="selectedElements"
        :editing-element="editingElement"
        :is-dragging-or-resizing="isDraggingOrResizing"
        :alignment-lines="alignmentLines"
        :horizontal-ruler-ticks="horizontalRulerTicks"
        :horizontal-ruler-labels="horizontalRulerLabels"
        :vertical-ruler-ticks="verticalRulerTicks"
        :vertical-ruler-labels="verticalRulerLabels"
        :is-design-area-focused="isDesignAreaFocused"
        :out-of-bounds-elements="outOfBoundsElements"
        :ui-constants="UI_CONSTANTS"
        :enable-snap-to-grid="enableSnapToGrid"
        :enable-snap-to-alignment="enableSnapToAlignment"
        :show-grid="showGrid"
        :report-styles="reportStyles"
        :table-styles="tableStyles"
        @set-design-area-focused="setDesignAreaFocused"
        @select-band="selectBand"
        @select-element="selectElement"
        @start-dragging="startDragging"
        @start-resizing-element="startResizingElement"
        @start-editing="startEditing"
        @finish-editing="finishEditing"
        @cancel-editing="cancelEditing"
        @handle-drop="handleDrop"
        @handle-drag-over="handleDragOver"
        @handle-drag-leave="handleDragLeave"
        @start-resizing-band="startResizingBand"
        @zoom-change="(newZoom) => zoomLevel = newZoom"
        @select-elements-in-rect="selectElementsInRect"
        @clear-selection="clearSelection"
        @check-fields="handleCheckFields"
        @contextmenu="handleElementContextMenu"
        @canvas-contextmenu="handleCanvasContextMenu"
        @reset-zoom="resetZoom"
        @move-column="handleMoveColumn"
        @add-columns-to-group="handleAddColumnsToGroup"
        @join-columns-to-existing-group="handleJoinColumnsToExistingGroup"
        @update:enable-snap-to-grid="enableSnapToGrid = $event"
        @update:enable-snap-to-alignment="enableSnapToAlignment = $event"
        @update:show-grid="showGrid = $event"
        @update:table-styles="tableStyles = $event"
      />
      </div>

      <!-- Right-side properties panel -->
      <ResizablePanel
        v-show="showRightPanel"
        position="right"
        :initial-size="propertyPanelWidth"
        :min-size="200"
        :max-size="500"
        :collapsible="true"
        :auto-width="true"
        @size-change="handlePropertyPanelSizeChange"
        @collapse-change="rightPanelCollapsed = $event"
      >
        <!-- Right panel tabs -->
        <div class="right-panel-tabs">
          <button
            class="right-panel-tab"
            :class="{ active: rightPanelTab === 'properties' }"
            @click="rightPanelTab = 'properties'"
          >
            Properties
          </button>
          <button
            class="right-panel-tab"
            :class="{ active: rightPanelTab === 'ai' }"
            @click="rightPanelTab = 'ai'"
          >
            🤖 AI Assistant
          </button>
          <button
            v-if="rightPanelTab === 'ai'"
            class="right-panel-settings-btn"
            @click="toggleAISettings"
            title="Configure AI service"
          >
            ⚙️
          </button>
        </div>

        <!-- Element properties component -->
        <div v-show="rightPanelTab === 'properties'">
          <ElementProperties
            :selected-band-index="selectedBandIndex"
            :selected-element="selectedElement"
            :bands="bands"
            :report-properties="reportProperties"
            :sub-datasets="subDatasets"
            :report-styles="reportStyles"
            :report-fields="reportFields"
            :report-parameters="reportParameters"
            :report-variables="reportVariables"
            @update:bands="bands = $event"
            @delete-element="deleteElement"
            @update-jrxml="updateJRXML"
            @save-state="saveStateToHistory"
            @update:reportStyles="reportStyles = $event"
            @add-columns-to-group="handleAddColumnsToGroup"
          />
        </div>

        <!-- AI Assistant panel -->
        <div v-show="rightPanelTab === 'ai'" class="ai-panel-container">
          <AIChatPanel
            :visible="rightPanelTab === 'ai'"
            :initial-height="aiChatPanelHeight"
            :mcp-context="mcpContext"
            :on-update="forceUpdateUI"
            :embedded="true"
            :show-settings="showAISettings"
            @update:show-settings="showAISettings = $event"
          />
        </div>
      </ResizablePanel>
    </div>

    <!-- Bottom tab area -->
    <BottomPanel
      :visible="showBottomPanel"
      :initial-height="bottomPanelHeight"
      :report-properties="reportProperties"
      :bands="bands"
      :all-band-types="allBandTypes"
      :selected-band-types="selectedBandTypes"
      :jrxml-content="jrxmlContent"
      :preview-server-url="previewServerUrl"
      @update:visible="showBottomPanel = $event"
      @size-change="handleBottomPanelSizeChange"
      @update:report-properties="reportProperties = $event"
      @update:selected-band-types="selectedBandTypes = $event"
      @update:jrxml-content="jrxmlContent = $event"
      @copy-jrxml="copyJRXML"
      @save-jrxml="saveJRXML"
      @regenerate-jrxml="regenerateJRXML"
      @download-jrxml="downloadJRXML"
      @band-selection-change="handleBandSelectionChange"
    />

    <!-- Drag feedback layer -->
    <DragFeedbackLayer :feedback="dragFeedback" />

    <!-- Donation modal -->
    <RewardModal v-if="locale === 'zh'" v-model:visible="showReward" />
    <RewardModalEn v-else v-model:visible="showReward" />

    <!-- Help modal -->
    <HelpModal v-if="locale === 'zh'" v-model:visible="showHelp" />
    <HelpModalEn v-else v-model:visible="showHelp" />

    <!-- Field management modal -->
    <FieldManagementModal
      v-model:visible="showFieldModal"
      :field="isEditingParameter ? editingParameter : editingField"
      :is-parameter="isEditingParameter"
      @save="handleFieldSave"
    />

    <!-- Variable management modal -->
    <VariableManagementModal
      v-model:visible="showVariableModal"
      :variable="editingVariable"
      :report-fields="reportFields"
      :report-parameters="reportParameters"
      :report-variables="reportVariables"
      @save="handleVariableSave"
    />

    <!-- Style management modal -->
    <StyleManagementModal
      v-model:visible="showStyleModal"
      :style="editingStyle"
      :all-styles="reportStyles"
      @save="handleStyleSave"
    />

    <!-- PDF preview modal -->
    <PdfPreviewModal
      :visible="showPdfPreview"
      :jrxml-content="jrxmlContent"
      :report-parameters="reportParameters"
      :report-fields="reportFields"
      :sub-datasets="subDatasets"
      :preview-server-url="previewServerUrl"
      @update:visible="showPdfPreview = $event"
    />

    <!-- Preview server settings modal -->
    <PreviewServerSettingsModal
      :visible="showPreviewServerSettings"
      :current-url="previewServerUrl"
      @update:visible="showPreviewServerSettings = $event"
      @update:url="updatePreviewServerUrl"
    />

    <!-- Sub-dataset management modal -->
    <SubDatasetManagementModal
      :visible="showSubDatasetModal"
      :dataset="editingSubDataset"
      @update:visible="showSubDatasetModal = $event"
      @save="handleSubDatasetSave"
    />

    <!-- Group name input dialog -->
    <BaseModal
      v-model:visible="showGroupDialog"
      title="Add columns to group"
      :contentClass="'group-dialog'"
      :useVShow="true"
      @confirm="confirmJoinColumnsToGroup"
    >
      <div class="group-dialog-content">
        <div class="form-group">
          <label>Select an existing group or enter a new group name:</label>
          <n-select
            v-model:value="groupDialogState.selectedGroupName"
            :options="groupDialogState.existingGroups.map(group => ({ label: group.name, value: group.name }))"
            placeholder="Select an existing group or enter a new name"
            filterable
            tag
            style="width: 100%; margin-top: 8px;"
          />
        </div>
      </div>
    </BaseModal>

    <!-- Column selection dialog -->
    <ColumnSelectionModal
      v-model:visible="showColumnSelectionModal"
      :columns="columnSelectionState.columns"
      :children="columnSelectionState.children"
      @confirm="(selectedColumnIndices, selectedRegion, groupText) => handleColumnSelectionConfirm(selectedColumnIndices, selectedRegion, groupText)"
    />

    <!-- Right-click context menu -->
    <div v-if="contextMenu.visible" class="context-menu-overlay" @click="contextMenu.visible = false" @contextmenu.prevent="contextMenu.visible = false">
      <div class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
        <div v-if="contextMenu.type === 'element'" class="context-menu-items">
          <div class="context-menu-item" @click="handleContextMenuAction('copy')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy
          </div>
          <div class="context-menu-item" @click="handleContextMenuAction('paste')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg> Paste
          </div>
          <div class="context-menu-divider"></div>
          <div class="context-menu-item" @click="handleContextMenuAction('delete')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Delete
          </div>
          <div class="context-menu-divider"></div>
          <div class="context-menu-item" @click="handleContextMenuAction('bringToFront')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg> Bring to Front
          </div>
          <div class="context-menu-item" @click="handleContextMenuAction('sendToBack')">
            <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M19 12l-7 7-7-7"/></svg> Send to Back
          </div>
        </div>
        <div v-else class="context-menu-items">
          <div class="context-menu-item" @click="handleContextMenuAction('paste')">
            <span class="menu-icon">📎</span> Paste
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import ResizablePanel from './panels/ResizablePanel.vue';
import DesignerCanvas from './designer/DesignerCanvas.vue';
import RewardModal from './modals/RewardModal.vue';
import RewardModalEn from './modals/RewardModalEn.vue';
import HelpModal from './modals/HelpModal.vue';
import HelpModalEn from './modals/HelpModalEn.vue';
import FieldManagementModal from './modals/FieldManagementModal.vue';
import PdfPreviewModal from './modals/PdfPreviewModal.vue';
import PreviewServerSettingsModal from './modals/PreviewServerSettingsModal.vue';
import SubDatasetManagementModal from './modals/SubDatasetManagementModal.vue';
import VariableManagementModal from './modals/VariableManagementModal.vue';
import StyleManagementModal from './modals/StyleManagementModal.vue';
import BaseModal from './modals/BaseModal.vue';
import ColumnSelectionModal from './modals/ColumnSelectionModal.vue';
import BottomPanel from './panels/BottomPanel.vue';
import AIChatPanel from './ai/AIChatPanel.vue';
import ElementLibrary from './ElementLibrary.vue';
import FileManager from './designer/controls/FileManager.vue';
import ZoomControls from './designer/controls/ZoomControls.vue';
import ElementProperties from './designer/properties/ElementProperties.vue';
import LanguageSwitcher from './common/LanguageSwitcher.vue';
import SplitButton from './common/SplitButton.vue';
import MultiSelectToolbar from './designer/MultiSelectToolbar.vue';
import AlignmentGuides from './designer/AlignmentGuides.vue';
import DragFeedbackLayer from './designer/DragFeedbackLayer.vue';
import {NButton, NSelect, NCheckbox} from 'naive-ui';
import type {
  Band,
  BandType,
  DesignElement,
  DraggingInfo,
  EditingElementInfo,
  FrameElement,
  ReportField,
  ReportParameter,
  ReportVariable,
  SelectedElementInfo,
  TableDataset
} from '../types';
import type {DesignerFile} from '@/types/designerFile';
import type {MCPContext} from '@/mcp';
import {checkWebMCPSupport} from '@/utils/browserCompatibility';
import {computed, nextTick, onMounted, onUnmounted, reactive, ref, watch, getCurrentInstance} from 'vue';
import {useI18n} from 'vue-i18n';
import {useDesignerFiles} from '@/composables/useDesignerFiles';
import {useUndoRedo} from '@/composables/useUndoRedo';
import {useZoom} from '@/composables/useZoom';
import {useSnapAlignment} from '@/composables/useSnapAlignment';
import {
  BAND_CONSTANTS,
  BAND_HEIGHT_CONSTANTS,
  BAND_TYPE_CONSTANTS,
  ELEMENT_CONSTANTS,
  FONT_CONSTANTS,
  HISTORY_CONSTANTS,
  KEYBOARD_CONSTANTS,
  PANEL_CONSTANTS,
  REPORT_CONSTANTS,
  RULER_CONSTANTS,
  UI_CONSTANTS,
  ZOOM_CONSTANTS
} from '../constants/constants';

// Import newly created utility functions and constants
import {getBandDisplayName} from '../utils/bandUtils';

import {loadFromLocalStorage, saveToLocalStorage} from '../utils/fileUtils';

// Import element bounds validation utility
import {getOutOfBoundsElements} from '../utils/elementBoundsValidator';
import {useBoundaryDetection} from '@/composables/useBoundaryDetection';
import {useAlignmentSystem} from '@/composables/useAlignmentSystem';
import {useDragFeedback} from '@/composables/useDragFeedback';

// Ensure DOMParser is available in the browser environment
// Removed the unused getDOMParser function
import {generateJRXMLContent, parseJRXMLContent} from '../utils/jrxmlGenerator';


// Import the notification manager
import notification from '../utils/notification';
import {createElement, getAllElements as getAllElementConfigs} from '@/components/elements/ElementRegistry';
import { syncTableColumns } from '../utils/table/ColumnTreeSync';

// Import the default JRXML example file
import defaultJrxmlContent from '../../tests/build_by_jasper_studio_jrxml/grouped_header_column_table_example.jrxml?raw';

const { t, locale } = useI18n();

// Tab-related state
const activeTab = ref('pageSettings');
const showMyActMenu = ref(false);

// Panel visibility state
const showLeftPanel = ref(true);
const showRightPanel = ref(true);
const showBottomPanel = ref(false);
const showAIChat = ref(false);
const aiChatPanelHeight = ref(300);
const rightPanelTab = ref('properties'); // 'properties' or 'ai'

// Browser compatibility check
const browserSupport = ref(checkWebMCPSupport());
const isAIAssistantSupported = computed(() => browserSupport.value.isSupported);

// MCP context, used by the AI dialog to execute tool calls
const mcpContext = computed<MCPContext>(() => ({
  bands: bands.value,
  reportProperties: reportProperties.value,
  fields: reportFields.value,
  parameters: reportParameters.value,
  variables: reportVariables.value,
  saveStateToHistory,
  updateJRXML,
  selectElement,
  selectedElement: selectedElement.value,
  selectedElements: selectedElements.value
}));

// Force-update function, used to trigger a UI refresh after a tool executes
function forceUpdateUI() {
  console.log('forceUpdateUI called');
  console.log('bands.value before update:', bands.value);

  // Create a new array via deep clone so Vue detects the change
  const newBands = JSON.parse(JSON.stringify(bands.value));
  bands.value = newBands;

  console.log('bands.value after update:', bands.value);

  // Use Vue's force-update mechanism
  const instance = getCurrentInstance();
  if (instance) {
    console.log('Forcing component update');
    instance.proxy?.$forceUpdate();
  }

  // Call nextTick to ensure the DOM has updated
  nextTick(() => {
    console.log('Calling updateJRXML');
    updateJRXML();
  });
}

// Properties panel width
const propertyPanelWidth = ref(PANEL_CONSTANTS.DEFAULT_PROPERTY_PANEL_WIDTH); // Default width 300px
const rightPanelCollapsed = ref(false); // Right panel collapsed state

// Left panel width
const leftPanelWidth = ref(PANEL_CONSTANTS.DEFAULT_LEFT_PANEL_WIDTH);
const leftPanelCollapsed = ref(false); // Left panel collapsed state

// DesignerCanvas component reference
const designerCanvasRef = ref<any>(null);

// Bottom panel height
const bottomPanelHeight = ref(PANEL_CONSTANTS.DEFAULT_BOTTOM_PANEL_HEIGHT); // Default height 400px

// JRXML content display
const jrxmlContent = ref('');

// Report properties
const reportProperties = ref({
  name: 'NewReport',
  pageWidth: REPORT_CONSTANTS.DEFAULT_PAGE_WIDTH,
  pageHeight: REPORT_CONSTANTS.DEFAULT_PAGE_HEIGHT,
  leftMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
  rightMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
  topMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
  bottomMargin: REPORT_CONSTANTS.DEFAULT_MARGIN,
  defaultFont: {
    name: FONT_CONSTANTS.DEFAULT_FONT_FAMILY,
    size: REPORT_CONSTANTS.DEFAULT_FONT_SIZE,
    isBold: false,
    isItalic: false,
    isUnderline: false
  },

});

// File management related state
const {
  currentFileName,
  currentFileId,
  loadFilesFromStorage,
  loadLastFile,
  findFileById,
  saveCurrentFileContent,
  setLastFile
} = useDesignerFiles({
  defaultFileName: t('fileManager.untitledReport')
});

// Update the page title
watch(currentFileName, (newName) => {
  document.title = newName ? `${newName} - ${t('app.title')}` : t('app.title');
}, { immediate: true });

// Watch for language changes and update the title
watch(() => t('app.title'), () => {
  const name = currentFileName.value;
  document.title = name ? `${name} - ${t('app.title')}` : t('app.title');
});


const handleSignOut = () => {
  showMyActMenu.value = false;

  localStorage.removeItem("jrxml_auth_user");
  localStorage.removeItem("jrxml_auth_token");

  const redirectUrl = `${window.location.origin}/login`;

  window.location.href =
    `https://projectnow-dev.ipecsystems.com/logout?redirect_to=${encodeURIComponent(
      redirectUrl
    )}`;
};

function createNewFile() {
  // Logic for creating a new file
  const timestamp = new Date().getTime();
  currentFileName.value = `${t('fileManager.untitledReport')}${timestamp}`;
  currentFileId.value = `file_${timestamp}`;

  // Reset the report data
  reportProperties.value = {
    name: 'NewReport',
    pageWidth: 595,
    pageHeight: 842,
    leftMargin: 20,
    rightMargin: 20,
    topMargin: 20,
    bottomMargin: 20,
    defaultFont: {
      name: FONT_CONSTANTS.DEFAULT_FONT_FAMILY,
      size: 12,
      isBold: false,
      isItalic: false,
      isUnderline: false
    }
  };

  bands.value = [
    { type: BAND_TYPE_CONSTANTS.TITLE as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.TITLE] || 50, elements: [] },
    { type: BAND_TYPE_CONSTANTS.PAGE_HEADER as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_HEADER] || 50, elements: [] },
    { type: BAND_TYPE_CONSTANTS.COLUMN_HEADER as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_HEADER] || 30, elements: [] },
    { type: BAND_TYPE_CONSTANTS.DETAIL as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.DETAIL] || 100, elements: [] },
    { type: BAND_TYPE_CONSTANTS.COLUMN_FOOTER as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_FOOTER] || 30, elements: [] },
    { type: BAND_TYPE_CONSTANTS.PAGE_FOOTER as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_FOOTER] || 40, elements: [] },
    { type: BAND_TYPE_CONSTANTS.SUMMARY as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.SUMMARY] || 60, elements: [] }
  ];

  // Update selectedBandTypes to match the new bands
  selectedBandTypes.value = bands.value.map(band => band.type);

  reportFields.value = [];
  reportParameters.value = [];
  subDatasets.value = [];
  jrxmlContent.value = '';

  // Clear the currently selected element
  selectedElement.value = null;
  selectedBandIndex.value = null;
}

function saveCurrentFileToStorage() {
  const fileData = saveCurrentFile();

  const ok = saveCurrentFileContent(fileData);
  if (ok) {
    notification.success(t('notifications.fileSavedSuccess'));
  } else {
    notification.error(t('notifications.fileSaveFailed'));
  }
}

function loadFile(fileData: DesignerFile | any) {
  try {
    // Parse the file content
    const fileContent = typeof fileData.content === 'string'
      ? JSON.parse(fileData.content)
      : fileData;

    // Load the file data into the current report
    if (fileContent.reportProperties) {
      reportProperties.value = { ...reportProperties.value, ...fileContent.reportProperties };
    }

    if (fileContent.bands) {
      bands.value = fileContent.bands;
      // Update selectedBandTypes to match the loaded bands
      selectedBandTypes.value = fileContent.bands.map((band: Band) => band.type);
    }

    if (fileContent.reportFields) {
      reportFields.value = fileContent.reportFields;
    }

    if (fileContent.reportParameters) {
      reportParameters.value = fileContent.reportParameters;
    }

    if (fileContent.subDatasets) {
      subDatasets.value = fileContent.subDatasets;
    }

    if (fileContent.jrxmlContent) {
      jrxmlContent.value = fileContent.jrxmlContent;
    }

    // Update the current file info
    currentFileName.value = fileData.name || t('fileManager.untitledReport');
    currentFileId.value = fileData.id || null;
    if (fileData.id) {
      setLastFile({ id: fileData.id, name: fileData.name });
    }

    // Clear the currently selected element
    selectedElement.value = null;
    selectedBandIndex.value = null;
  } catch (error) {
    console.error('Failed to load file:', error);
    notification.error(t('fileManager.invalidFileFormat'));
  }
}

function saveAsLocalFile() {
  const newName = prompt(t('fileManager.enterNewFileName'), currentFileName.value);
  if (!newName) return;
  const timestamp = Date.now();
  currentFileName.value = newName;
  currentFileId.value = `file_${timestamp}`;
  saveCurrentFileToStorage();
}

function saveCurrentFile() {
  // Create a deep clone of bands so border properties can be processed
  const processedBands = JSON.parse(JSON.stringify(bands.value));

  // Process elements in each band, filtering out border properties with a width of 0
  processedBands.forEach((band: any) => {
    if (band.elements && Array.isArray(band.elements)) {
      band.elements.forEach((element: any) => {
        if (element.box) {
          // Handle the new border model
          if (element.box.pen && element.box.pen.lineWidth <= 0) {
            delete element.box.pen;
          }

          // Handle borders on each side
          ['topPen', 'leftPen', 'bottomPen', 'rightPen'].forEach(penType => {
            if (element.box[penType] && element.box[penType].lineWidth <= 0) {
              delete element.box[penType];
            }
          });

          // If the box object is empty, remove the entire box property
          if (Object.keys(element.box).length === 0) {
            delete element.box;
          }
        }
      });
    }
  });

  // Prepare the data to save
  const fileData = {
    id: currentFileId.value,
    name: currentFileName.value,
    reportProperties: reportProperties.value,
    bands: processedBands,
    reportFields: reportFields.value,
    reportParameters: reportParameters.value,
    subDatasets: subDatasets.value,
    jrxmlContent: jrxmlContent.value,
    lastModified: new Date().toISOString()
  };

  // Return the file data
  return fileData;
}

// Incomplete elements, only visible on localhost
const INCOMPLETE_ELEMENTS = ['map', 'crosstab', 'iconLabel', 'genericElement', 'list', 'subreport'];
const isDev = location.hostname === 'localhost';

// Available elements
const elements = computed(() =>
  getAllElementConfigs()
    .filter(config => isDev || !INCOMPLETE_ELEMENTS.includes(config.type))
    .map(config => ({ type: config.type, name: config.name }))
);

// Define the element interfaces
// Using the Pen and Box interfaces imported from types/index.ts

// Using the interfaces imported from types/index.ts

// Report bands
const bands = ref<Band[]>([
  { type: BAND_TYPE_CONSTANTS.TITLE as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.TITLE] || 50, elements: [] },
  { type: BAND_TYPE_CONSTANTS.PAGE_HEADER as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_HEADER] || 50, elements: [] },
  { type: BAND_TYPE_CONSTANTS.COLUMN_HEADER as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_HEADER] || 30, elements: [] },
  { type: BAND_TYPE_CONSTANTS.DETAIL as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.DETAIL] || 100, elements: [] }, // Default the detail band to a height of 100
  { type: BAND_TYPE_CONSTANTS.COLUMN_FOOTER as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_FOOTER] || 30, elements: [] },
  { type: BAND_TYPE_CONSTANTS.PAGE_FOOTER as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_FOOTER] || 40, elements: [] },
  { type: BAND_TYPE_CONSTANTS.SUMMARY as BandType, height: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.SUMMARY] || 60, elements: [] }
]);

// All possible band types
const allBandTypes = [
  { type: BAND_TYPE_CONSTANTS.TITLE as BandType, name: 'Title', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.TITLE] || 80 },
  { type: BAND_TYPE_CONSTANTS.PAGE_HEADER as BandType, name: 'Page Header', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_HEADER] || 50 },
  { type: BAND_TYPE_CONSTANTS.COLUMN_HEADER as BandType, name: 'Column Header', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_HEADER] || 30 },
  { type: BAND_TYPE_CONSTANTS.DETAIL as BandType, name: 'Detail', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.DETAIL] || 100 },
  { type: BAND_TYPE_CONSTANTS.COLUMN_FOOTER as BandType, name: 'Column Footer', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_FOOTER] || 30 },
  { type: BAND_TYPE_CONSTANTS.PAGE_FOOTER as BandType, name: 'Page Footer', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_FOOTER] || 40 },
  { type: BAND_TYPE_CONSTANTS.SUMMARY as BandType, name: 'Summary', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.SUMMARY] || 60 },
  { type: BAND_TYPE_CONSTANTS.BACKGROUND as BandType, name: 'Background', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.BACKGROUND] || 0 },
  { type: BAND_TYPE_CONSTANTS.LAST_PAGE_FOOTER as BandType, name: 'Last Page Footer', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.LAST_PAGE_FOOTER] || 40 },
  { type: BAND_TYPE_CONSTANTS.NO_DATA as BandType, name: 'No Data', defaultHeight: BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.NO_DATA] || 50 }
];

// The currently selected band type
const selectedBandTypes = ref<BandType[]>(bands.value.map(band => band.type));

// Data fields
const reportFields = ref<ReportField[]>([
]);

// Report parameters
const reportParameters = ref<ReportParameter[]>([
]);

// Sub-datasets
const subDatasets = ref<TableDataset[]>([]);
const showSubDatasetModal = ref(false);
const editingSubDataset = ref<TableDataset | undefined>(undefined);

// Report styles
const reportStyles = ref<any[]>([
  {
    name: 'Table_TH',
    mode: 'Opaque',
    backcolor: '#F0F8FF',
    box: {
      pen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      topPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      leftPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      bottomPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      rightPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      }
    }
  },
  {
    name: 'Table_CH',
    mode: 'Opaque',
    backcolor: '#BFE1FF',
    box: {
      pen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      topPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      leftPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      bottomPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      rightPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      }
    }
  },
  {
    name: 'Table_TD',
    mode: 'Opaque',
    backcolor: '#FFFFFF',
    box: {
      pen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      topPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      leftPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      bottomPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      },
      rightPen: {
        lineWidth: 0.5,
        lineColor: '#000000'
      }
    }
  }
]);

// Report variables
const reportVariables = ref<any[]>([]);

// Report groups
const reportGroups = ref<any[]>([]);

// Context menu state
const contextMenu = ref({ visible: false, x: 0, y: 0, type: 'element' as 'element' | 'canvas' });

// Table styles
const tableStyles = ref({
  tableHeader: 'Table_TH',
  columnHeader: 'Table_CH',
  columnFooter: 'Table_CH',
  detailCell: 'Table_TD'
});

// Handle adding a sub-dataset
const handleAddSubDataset = () => {
  editingSubDataset.value = undefined;
  showSubDatasetModal.value = true;
};

// Handle editing a sub-dataset
const handleEditSubDataset = (dataset: TableDataset, index: number) => {
  editingSubDataset.value = dataset;
  showSubDatasetModal.value = true;
};

// Handle deleting a sub-dataset
const handleDeleteSubDataset = (index: number) => {
  // Save state to history
  saveStateToHistory();

  // Remove the sub-dataset
  subDatasets.value.splice(index, 1);

  // Update JRXML
  updateJRXML();
};

// Handle saving a sub-dataset
const handleSubDatasetSave = (dataset: TableDataset) => {
  // Save state to history
  saveStateToHistory();

  const existingIndex = subDatasets.value.findIndex((d: TableDataset) => d.uuid === dataset.uuid);

  if (existingIndex >= 0) {
    // Update the existing sub-dataset
    subDatasets.value[existingIndex] = dataset;
  } else {
    // Add the new sub-dataset
    subDatasets.value.push(dataset);
  }

  // Update JRXML
  updateJRXML();

  // Close the modal
  showSubDatasetModal.value = false;
};

// Check for and create a default table dataset
const checkAndCreateDefaultTableDataset = (datasetName: string = 'tableDataset') => {
  // Check whether a dataset with the same name already exists
  const existingDataset = subDatasets.value.find((d: TableDataset) => d.name === datasetName);
  if (existingDataset) {
    return;
  }

  // Save state to history
  saveStateToHistory();

  // Create the default dataset
  const defaultDataset: TableDataset = {
    uuid: crypto.randomUUID(),
    name: datasetName,
    fields: [
      { name: 'FIELD_NAME', class: 'java.lang.String' },
      { name: 'FIELD_NAME2', class: 'java.lang.String' },
      { name: 'FIELD_NAME3', class: 'java.lang.String' }
    ]
  };

  // Add it to the sub-dataset list
  subDatasets.value.push(defaultDataset);

  // Update JRXML
  updateJRXML();
};

// Element-created event handler
const handleElementCreated = (element: DesignElement, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  // Fire the element-created event, providing the necessary parameters
  console.log('Element created:', {
    element,
    bandIndex,
    elementIndex,
    parentFrameIndex,
    position: {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height
    }
  });

  // Additional post-creation handling logic can be added here
  // e.g. perform type-specific initialization based on the element type
  switch (element.type) {
    case 'textField':
      // Initialization logic for text field elements
      break;
    // Initialization logic for other element types
  }
};

// History stack - used for the undo feature
type HistoryState = {
  reportProperties: typeof reportProperties.value;
  bands: typeof bands.value;
  reportFields: typeof reportFields.value;
  reportParameters: typeof reportParameters.value;
  subDatasets: typeof subDatasets.value;
};

// Out-of-bounds elements
const outOfBoundsElements = ref<Array<{bandIndex: number, elementIndex: number, element: DesignElement}>>([]);

// Boundary detection composable
const {
  boundaryState: boundaryDetectionState,
  checkAllElements: checkAllBoundaryElements,
  autoFixElement: autoFixBoundaryElement,
  autoFixAllElements: autoFixAllBoundaryElements,
  getViolationSummary: boundaryViolationSummary,
} = useBoundaryDetection({ tolerance: 5, realtime: true });

// Alignment system composable
const {
  activeGuides: activeAlignmentGuides,
  calculateAlignment,
  calculateDistribution,
  alignElements,
} = useAlignmentSystem();

// Drag feedback composable
const {
  feedback: dragFeedback,
  updateDroppableZones,
  startDrag: startDragFeedback,
  stopDrag: stopDragFeedback,
} = useDragFeedback();

// Check for and update out-of-bounds elements
function updateOutOfBoundsElements() {
  // Safety check to ensure bands and reportProperties have been initialized
  if (!bands.value || !reportProperties.value) {
    console.warn('bands or reportProperties not initialized, skipping boundary check');
    return;
  }

  // Get all out-of-bounds elements (keep the original format for DesignerCanvas)
  const outOfBounds = getOutOfBoundsElements(bands.value, reportProperties.value);
  outOfBoundsElements.value = outOfBounds;

  // Also run detailed boundary detection via the composable
  checkAllBoundaryElements(
    bands.value,
    reportProperties.value.pageWidth,
    reportProperties.value
  );

  if (outOfBounds.length > 0) {
    console.warn(`Found ${outOfBounds.length} out-of-bounds element(s):`, outOfBounds);
  }
}

// Get the actual data for the currently selected elements
function getSelectedElementsData() {
  const result: Array<{ x: number; y: number; width: number; height: number; bandIndex: number; elementIndex: number }> = [];
  for (const sel of selectedElements.value) {
    const band = bands.value[sel.bandIndex];
    if (band && band.elements[sel.elementIndex]) {
      const el = band.elements[sel.elementIndex];
      if (!el) continue;
      result.push({ x: el.x, y: el.y, width: el.width, height: el.height, bandIndex: sel.bandIndex, elementIndex: sel.elementIndex });
    }
  }
  return result;
}

// Multi-select alignment operation
function handleMultiAlign(direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  const elementsData = getSelectedElementsData();
  if (elementsData.length < 2) return;
  saveStateToHistory();
  const newPositions = alignElements(elementsData, direction);
  newPositions.forEach((pos, i) => {
    const sel = selectedElements.value[i];
    if (!sel) return;
    const band = bands.value[sel.bandIndex];
    const el = band?.elements[sel.elementIndex];
    if (el) {
      el.x = Math.round(pos.x);
      el.y = Math.round(pos.y);
    }
  });
  updateJRXML();
}

// Multi-select distribution operation
function handleMultiDistribute(direction: 'horizontal' | 'vertical') {
  const elementsData = getSelectedElementsData();
  if (elementsData.length < 3) return;
  saveStateToHistory();
  const newPositions = calculateDistribution(elementsData, direction);
  newPositions.forEach((pos, i) => {
    const sel = selectedElements.value[i];
    if (!sel) return;
    const band = bands.value[sel.bandIndex];
    const el = band?.elements[sel.elementIndex];
    if (el) {
      el.x = Math.round(pos.x);
      el.y = Math.round(pos.y);
    }
  });
  updateJRXML();
}

// Multi-select resize operation
function handleMultiResize(type: 'sameWidth' | 'sameHeight' | 'sameSize') {
  const elementsData = getSelectedElementsData();
  if (elementsData.length < 2) return;
  saveStateToHistory();

  if (type === 'sameWidth' || type === 'sameSize') {
    const maxWidth = Math.max(...elementsData.map(e => e.width));
    elementsData.forEach((_, i) => {
      const sel = selectedElements.value[i];
      if (!sel) return;
      const band = bands.value[sel.bandIndex];
      const el = band?.elements[sel.elementIndex];
      if (el) {
        el.width = maxWidth;
      }
    });
  }
  if (type === 'sameHeight' || type === 'sameSize') {
    const maxHeight = Math.max(...elementsData.map(e => e.height));
    elementsData.forEach((_, i) => {
      const sel = selectedElements.value[i];
      if (!sel) return;
      const band = bands.value[sel.bandIndex];
      const el = band?.elements[sel.elementIndex];
      if (el) {
        el.height = maxHeight;
      }
    });
  }
  updateJRXML();
}

const {
  historyStack,
  redoStack,
  saveStateToHistory,
  undo,
  redo
} = useUndoRedo<HistoryState>({
  maxHistorySize: HISTORY_CONSTANTS.MAX_HISTORY_SIZE,
  getState: () => ({
    reportProperties: reportProperties.value,
    bands: bands.value,
    reportFields: reportFields.value,
    reportParameters: reportParameters.value,
    subDatasets: subDatasets.value
  }),
  applyState: (state) => {
    reportProperties.value = state.reportProperties;
    bands.value = state.bands;
    reportFields.value = state.reportFields;
    reportParameters.value = state.reportParameters;
    subDatasets.value = state.subDatasets;
  },
  onAfterRestore: () => {
    updateJRXML();
  }
});

const isDraggingOrResizing = ref(false); // Flags whether a drag or resize is in progress
const isUpdatingJRXML = ref(false); // Guards against re-entrant calls to updateJRXML

// Add a new parameter
// Removed the unused parameter management function

// Selection state
const selectedBandIndex = ref<number | null>(null);
const selectedElement = ref<SelectedElementInfo | null>(null);
const selectedElements = ref<SelectedElementInfo[]>([]); // Element editing state
const editingElement = ref<EditingElementInfo | null>(null);

// Group name input dialog state
const showGroupDialog = ref(false);
const groupDialogState = ref({
  elementIndex: 0,
  columnIndices: [] as number[],
  bandIndex: 0,
  parentFrameIndex: undefined as number | undefined,
  existingGroups: [] as any[],
  selectedGroupName: ''
});

// Column selection dialog state
const showColumnSelectionModal = ref(false);
const columnSelectionState = ref({
  elementIndex: 0,
  bandIndex: 0,
  parentFrameIndex: undefined as number | undefined,
  columns: [] as any[],
  children: [] as any[]
});



// Report design area focus state
const isDesignAreaFocused = ref(true); // Focus the design area by default

// Set focus on the design area
const setDesignAreaFocused = () => {
  isDesignAreaFocused.value = true;
};

// Remove focus from the design area
const removeDesignAreaFocused = () => {
  isDesignAreaFocused.value = false;
};

// Computed properties
const paperWidth = computed(() => reportProperties.value?.pageWidth || REPORT_CONSTANTS.DEFAULT_PAGE_WIDTH);
const paperHeight = computed(() => reportProperties.value?.pageHeight || REPORT_CONSTANTS.DEFAULT_PAGE_HEIGHT);
const { zoomLevel, resetZoom, calculateOptimalZoom, handleZoomChange } = useZoom({
  paperWidth,
  zoomConstants: ZOOM_CONSTANTS
});

// Function to set the zoom level
const setZoomLevel = (newZoom: number) => {
  zoomLevel.value = newZoom;
};
const currentElement = computed(() => {
  if (selectedElement.value && bands.value && Array.isArray(bands.value)) {
    const band = bands.value[selectedElement.value.bandIndex];
    if (band && band.elements && Array.isArray(band.elements)) {
      return band.elements[selectedElement.value.elementIndex];
    }
  }
  return null;
});

// Get all report elements




// Report elements grouped by band - temporarily commented out since it's unused
/*
const groupedReportElements = computed(() => {
  const groups: Record<string, Array<{ element: DesignElement, bandIndex: number, elementIndex: number }>> = {};

  if (!filteredReportElements.value || !bands.value || !Array.isArray(bands.value)) {
    return groups;
  }

  filteredReportElements.value.forEach(item => {
    if (!bands.value || item.bandIndex >= bands.value.length) return;
    const band = bands.value[item.bandIndex];
    if (!band) return;
    const bandType = band.type;
    const bandName = getBandDisplayName(bandType);

    if (!groups[bandName]) {
      groups[bandName] = [];
    }

    groups[bandName].push(item);
  });

  return groups;
});
*/

// Ruler-related computed properties
const horizontalRulerTicks = computed(() => {
  const ticks = [];
  const width = paperWidth.value;
  const unit = RULER_CONSTANTS.UNIT_SIZE; // Reduced base unit, from 10px to 5px, to increase tick density

  for (let i = 0; i <= width; i += unit) {
    ticks.push({
      position: i, // Do not apply the zoom scale, keep the actual position
      major: i % RULER_CONSTANTS.MAJOR_TICK_INTERVAL === 0 // One major tick every 25px, changed from 50px to 25px
    });
  }

  return ticks;
});

const horizontalRulerLabels = computed(() => {
  const labels = [];
  const width = paperWidth.value;

  for (let i = 0; i <= width; i += RULER_CONSTANTS.LABEL_INTERVAL) { // Show a label every 25px, changed from 50px to 25px
    labels.push({
      position: i, // Do not apply the zoom scale, keep the actual position
      value: i.toString()
    });
  }

  return labels;
});

const verticalRulerTicks = computed(() => {
  const ticks = [];
  const height = paperHeight.value;
  const unit = RULER_CONSTANTS.UNIT_SIZE; // Reduced base unit, from 10px to 5px, to increase tick density

  for (let i = 0; i <= height; i += unit) {
    ticks.push({
      position: i, // Do not apply the zoom scale, keep the actual position
      major: i % RULER_CONSTANTS.MAJOR_TICK_INTERVAL === 0 // One major tick every 25px, changed from 50px to 25px
    });
  }

  return ticks;
});

const verticalRulerLabels = computed(() => {
  const labels = [];
  const height = paperHeight.value;

  for (let i = 0; i <= height; i += RULER_CONSTANTS.LABEL_INTERVAL) { // Show a label every 25px, changed from 50px to 25px
    labels.push({
      position: i, // Do not apply the zoom scale, keep the actual position
      value: i.toString()
    });
  }

  return labels;
});

// Drag-related state
const draggingInfo = ref<DraggingInfo | null>(null);
const highlightedBandIndex = ref<number | null>(null); // Index of the highlighted target band
const {
  enableSnapToGrid,
  enableSnapToAlignment,
  alignmentLines,
  detectAlignmentLines,
  clearAlignmentLines
} = useSnapAlignment({
  bands,
  reportProperties,
  highlightedBandIndex,
  bandSpacing: BAND_CONSTANTS.SPACING
});

// Controls whether the grid is shown or hidden
const showGrid = ref(true);
// Coordinate info shown while dragging
const dragCoordinates = ref<{x: number, y: number, visible: boolean, bandName: string}>({ x: 0, y: 0, visible: false, bandName: '' });
// Info shown while resizing a band's height
const resizingBandInfo = reactive({ visible: false, bandName: '', height: 0 });
// Expose it as a ref for template reactivity
const resizingBandInfoRef = ref(resizingBandInfo);
// Resize-related state
const resizingInfo = ref<{bandIndex: number, elementIndex: number, startX: number, startY: number, startWidth: number, startHeight: number, parentFrameIndex?: number} | null>(null);

// Tracks the last-clicked band
const lastClickedBandIndex = ref<number>(3); // Defaults to the DETAIL band (index 3)

// Tracks the element being dragged from the component library (works around dataTransfer sometimes failing in the Mac Tauri environment)
const draggedLibraryElement = ref<any>(null);

// Helper function: generate table columns from a dataset
function generateTableColumnsFromDataset(defaultTableWidth: number = 555) {
  // Prefer the sub-dataset if one exists
  if (subDatasets.value.length > 0) {
    const dataset = subDatasets.value[0];
    if (dataset && dataset.fields && dataset.fields.length > 0) {
      const fieldCount = dataset.fields.length;
      const columnWidth = Math.round(defaultTableWidth / fieldCount); // Distribute column width evenly across the table width
      return dataset.fields.map(field => {
        return {
          uuid: crypto.randomUUID(),
          width: columnWidth,
          name: field.name,
          tableHeader: {
            enable: false,
            element: {
              type: 'staticText',
              x: 0,
              y: 0,
              width: columnWidth,
              height: 30,
              text: field.name,
              forecolor: '#000000',
              backcolor: '#FFFFFF',
              fontFamily: 'SansSerif',
              fontSize: 19,
              isBold: true,
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          },
          columnHeader: {
            enable: true,
            element: {
              type: 'staticText',
              x: 0,
              y: 0,
              width: columnWidth,
              height: 30,
              text: field.name,
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          },
          detailCell: {
            enable: true,
            element: {
              type: 'textField',
              x: 0,
              y: 0,
              width: columnWidth,
              height: 30,
              expression: `$F{${field.name}}`,
              textAlignment: 'Center',
              verticalAlignment: 'Middle'
            }
          }
        };
      });
    }
  }
  // Default to returning an empty array, using the default columns from ElementRegistry
  return [];
}

// Handle drag-and-drop
const handleDragStart = (event: DragEvent, element: any) => {
  draggedLibraryElement.value = element;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', JSON.stringify(element));
  }
};

// Handle element double-click events
const handleElementDoubleClick = (element: any) => {
  // Ensure there is a last-clicked band
  if (lastClickedBandIndex.value === null || lastClickedBandIndex.value === undefined) {
    console.warn('No band selected, falling back to the default band');
    lastClickedBandIndex.value = 3; // Default to the DETAIL band
  }

  // Get the target band
  const targetBand = bands.value[lastClickedBandIndex.value];
  if (!targetBand) {
    console.error('Target band does not exist');
    return;
  }

  // Save state to history
  saveStateToHistory();

  // Create the new element
  let newElement: DesignElement = {
    ...createElement(element.type),
    uuid: crypto.randomUUID(), // Generate a UUID
    x: 50, // Default position
    y: 20, // Default position
    ...getDefaultElementProperties(element.type)
  } as DesignElement;

  // For table elements, check for/create the default dataset, then generate the corresponding columns
  if (element.type === 'table') {
    // Get the default table width
    const defaultTableWidth = (newElement as any).width || 555;

    // Check for and create the default dataset
    const datasetName = (newElement as any).dataset?.name || 'tableDataset';
    checkAndCreateDefaultTableDataset(datasetName);

    // Generate table columns from the dataset
    const columns = generateTableColumnsFromDataset(defaultTableWidth);
    if (columns.length > 0) {
      (newElement as any).columns = columns;
      // Calculate the total table width
      const totalWidth = columns.reduce((sum, column) => sum + (column.width || 150), 0);
      newElement.width = totalWidth;
    }
  }

  // For rectangles, ellipses, frames, and images, default the height to half the band's height
  if (['rectangle', 'ellipse', 'frame', 'image'].includes(element.type)) {
    newElement.height = Math.round(targetBand.height / 2);
  }

  // Ensure the band has an elements array
  if (!targetBand.elements) {
    targetBand.elements = [];
  }

  // Add the element to the target band
  targetBand.elements.push(newElement);

  // Select the newly added element
  const newElementIndex = targetBand.elements.length - 1;
  selectElement(lastClickedBandIndex.value, newElementIndex);

  // Fire the element-created event
  handleElementCreated(newElement, lastClickedBandIndex.value, newElementIndex);

  // Update JRXML
  updateJRXML();

  console.log('Element added to band:', newElement);
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();

  let elementData = null;

  // Prefer reading from internal state (works around dataTransfer sometimes being unavailable in the Mac Tauri environment)
  if (draggedLibraryElement.value) {
    elementData = draggedLibraryElement.value;
    draggedLibraryElement.value = null; // Reset the state
  } else if (event.dataTransfer) {
    try {
      const data = event.dataTransfer.getData('application/json');
      if (data) {
        elementData = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to parse drag data:', e);
    }
  }

  if (elementData) {

    // Get the paper element as a reference point
    const paper = document.querySelector('.paper') as HTMLElement;
    if (!paper) return;

    const paperRect = paper.getBoundingClientRect();
    // Calculate coordinates relative to the paper
    const x = event.clientX - paperRect.left;
    const y = event.clientY - paperRect.top;

    // Account for the zoom scale
    const currentZoom = zoomLevel.value;
    const scaledX = x / currentZoom;
    const scaledY = y / currentZoom;

    // Find the corresponding band
    let bandIndex = 0;
    let currentY = 0;
    if (bands.value && Array.isArray(bands.value)) {
      for (let i = 0; i < bands.value.length; i++) {
        const band = bands.value[i];
        if (band && scaledY >= currentY && scaledY <= currentY + band.height) {
          bandIndex = i;
          break;
        }
        if (band) {
          currentY += band.height;
        }
      }
    }

    // Create the new element
    let newElement: DesignElement = {
      ...createElement(elementData.type),
      uuid: crypto.randomUUID(), // Generate a UUID
      x: Math.round(Math.max(0, scaledX - 50)), // Subtract half the element width to center it, and ensure an integer
      y: Math.round(Math.max(0, scaledY - currentY)), // Position relative to the band, and ensure an integer
      ...getDefaultElementProperties(elementData.type)
    } as DesignElement;

    // For table elements, check for/create the default dataset, then generate the corresponding columns
    if (elementData.type === 'table') {
      // Get the default table width
      const defaultTableWidth = (newElement as any).width || 555;

      // Check for and create the default dataset
      const datasetName = (newElement as any).dataset?.name || 'tableDataset';
      checkAndCreateDefaultTableDataset(datasetName);

      // Generate table columns from the dataset
      const columns = generateTableColumnsFromDataset(defaultTableWidth);
      if (columns.length > 0) {
        (newElement as any).columns = columns;
        // Calculate the total table width
        const totalWidth = columns.reduce((sum, column) => sum + (column.width || 150), 0);
        newElement.width = totalWidth;
        // Update the x coordinate to center it
        newElement.x = Math.round(Math.max(0, scaledX - totalWidth / 2));
      }
    }

    const targetBand = bands.value[bandIndex];
    if (targetBand && targetBand.elements) {
      // For rectangles, ellipses, frames, and images, default the height to half the band's height
      if (['rectangle', 'ellipse', 'frame', 'image'].includes(elementData.type)) {
        newElement.height = Math.round(targetBand.height / 2);
      }
      // Save state to history
      saveStateToHistory();

      // Detect whether it is being dropped on a Frame
      let targetFrameIndex = -1;

      // Iterate over the Frames in the Band to check whether the new element lands on one
      for (let i = targetBand.elements.length - 1; i >= 0; i--) {
        const el = targetBand.elements[i];
        if (!el) continue;
        if (el.type === 'frame') {
          // Check whether the new element's center point is inside the Frame
          const centerX = newElement.x + newElement.width / 2;
          const centerY = newElement.y + newElement.height / 2;

          if (centerX >= el.x && centerX <= el.x + el.width &&
              centerY >= el.y && centerY <= el.y + el.height) {
             targetFrameIndex = i;
             break;
          }
        }
      }

      if (targetFrameIndex !== -1) {
         // Add it to the Frame
         const frame = targetBand.elements[targetFrameIndex] as FrameElement;
         if (!frame.elements) frame.elements = [];

         // Convert to coordinates relative to the Frame
         newElement.x -= frame.x;
         newElement.y -= frame.y;

         // Bounds check within the Frame
         if (newElement.x < 0) newElement.x = 0;
         if (newElement.y < 0) newElement.y = 0;
         if (newElement.x + newElement.width > frame.width) newElement.x = Math.max(0, frame.width - newElement.width);
         if (newElement.y + newElement.height > frame.height) newElement.y = Math.max(0, frame.height - newElement.height);

         frame.elements.push(newElement);
         // Select the newly added element; note that parentFrameIndex must be passed
         const frameElementIndex = frame.elements.length - 1;
         selectElement(bandIndex, frameElementIndex, false, targetFrameIndex);

         // Fire the element-created event; parentFrameIndex must be passed when adding to a Frame
         handleElementCreated(newElement, bandIndex, frameElementIndex, targetFrameIndex);

      } else {
        // Add it to the Band (original logic)
        // Ensure the element does not exceed the margin limits
        const availableWidth = paperWidth.value - (reportProperties.value?.leftMargin || 0) - (reportProperties.value?.rightMargin || 0);

        // Constrain the element so it doesn't exceed the right boundary
        if (newElement.x + newElement.width > availableWidth) {
          newElement.x = Math.round(availableWidth - newElement.width);
        }

        // Ensure the element's width doesn't exceed the available space
        if (newElement.width > availableWidth) {
          newElement.width = Math.round(availableWidth);
        }

        // Ensure the element doesn't exceed the band's height
        if (newElement.y + newElement.height > targetBand.height) {
          newElement.y = Math.round(targetBand.height - newElement.height);
        }

        targetBand.elements.push(newElement);

        // Select the newly added element
        const newElementIndex = targetBand.elements.length - 1;
        selectElement(bandIndex, newElementIndex);

        // Fire the element-created event
        handleElementCreated(newElement, bandIndex, newElementIndex);
      }

      // Update JRXML
      updateJRXML();
    }
  }

  // Clear the highlight state
  highlightedBandIndex.value = null;
};

// Handle visual feedback while dragging
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }

  // Get the paper element as a reference point
  const paper = document.querySelector('.paper') as HTMLElement;
  if (!paper) return;

  const paperRect = paper.getBoundingClientRect();
  // Calculate coordinates relative to the paper
  const y = event.clientY - paperRect.top;

  // Account for the zoom scale
  const currentZoom = zoomLevel.value;
  const scaledY = y / currentZoom;

  // Find the corresponding band
  let bandIndex = -1;
  let currentY = 0;
  for (let i = 0; i < bands.value.length; i++) {
    const band = bands.value[i];
    if (band && scaledY >= currentY && scaledY <= currentY + band.height) {
      bandIndex = i;
      break;
    }
    if (band) {
      currentY += band.height;
    }
  }

  // Update the highlight state
  highlightedBandIndex.value = bandIndex;
};

// Handle the drag-leave event
const handleDragLeave = (event: DragEvent) => {
  // Check whether the paper area was actually left
  const paper = document.querySelector('.paper') as HTMLElement;
  if (paper && !paper.contains(event.relatedTarget as Node)) {
    highlightedBandIndex.value = null;
  }
};

const getDefaultElementProperties = (type: string): Partial<DesignElement> => {
  // Use the report's default font settings
  const defaultFontProps = {
    fontFamily: reportProperties.value?.defaultFont?.name || FONT_CONSTANTS.DEFAULT_FONT_FAMILY,
    fontSize: reportProperties.value?.defaultFont?.size || REPORT_CONSTANTS.DEFAULT_FONT_SIZE,
    isBold: reportProperties.value?.defaultFont?.isBold || false,
    isItalic: reportProperties.value?.defaultFont?.isItalic || false,
    isUnderline: reportProperties.value?.defaultFont?.isUnderline || false
  };

  // Calculate the available width of the report page
  const calculateAvailableWidth = () => {
    const pageWidth = reportProperties.value?.pageWidth || REPORT_CONSTANTS.DEFAULT_PAGE_WIDTH;
    const leftMargin = reportProperties.value?.leftMargin || REPORT_CONSTANTS.DEFAULT_MARGIN;
    const rightMargin = reportProperties.value?.rightMargin || REPORT_CONSTANTS.DEFAULT_MARGIN;
    return Math.round(pageWidth - leftMargin - rightMargin);
  };

  switch (type) {
    case 'staticText':
      return {
        text: t('properties.defaultStaticText'),
        ...defaultFontProps
      };
    case 'textField':
      return {
        expression: `"${t('properties.defaultTextFieldExpression')}"`,
        isStretchWithOverflow: false,
        evaluationTime: 'Now',
        pattern: '',
        isBlankWhenNull: false,
        ...defaultFontProps,
        textAlignment: 'Left',
        verticalAlignment: 'Top'
      };
    case 'image':
      return { imageExpression: '"https://raw.githubusercontent.com/fengyunhe/jrxml_web_designer/refs/heads/master/src/assets/FIREGOD_CN.jpg"' };
    case 'line':
      return { lineDirection: 'TopDown', lineWidth: 1 };
    case 'rectangle':
      return {
        mode: 'Transparent',
        border: '1px solid #ccc' // Add a default border for rectangle elements
      };
    case 'table':
      return {
        width: calculateAvailableWidth()
      };
    default:
      return {};
  }
};

// Select a band
const selectBand = (index: number) => {
  selectedBandIndex.value = index;
  selectedElement.value = null;
  selectedElements.value = []; // Clear the multi-selection
  // Update the last-clicked band index
  lastClickedBandIndex.value = index;
  // Automatically hide the bottom panel
  showBottomPanel.value = false;
};

// Select an element
const selectElement = (bandIndex: number, elementIndex: number, isMultiSelect = false, parentFrameIndex?: number) => {
  // Get the element reference in order to obtain its UUID
  const band = bands.value[bandIndex];
  let element;

  if (parentFrameIndex !== undefined) {
    const frame = band?.elements[parentFrameIndex] as FrameElement;
    if (frame && frame.type === 'frame' && frame.elements) {
      element = frame.elements[elementIndex];
    }
  } else {
    element = band?.elements[elementIndex];
  }

  const uuid = element?.uuid;

  // Quickly update the selection state, avoiding unnecessary DOM operations
  if (isMultiSelect) {
    // Multi-select mode
    const existingIndex = selectedElements.value.findIndex(
      el => el.bandIndex === bandIndex && el.elementIndex === elementIndex && el.parentFrameIndex === parentFrameIndex
    );

    if (existingIndex !== -1) {
      // If the element is already selected, deselect it
      selectedElements.value.splice(existingIndex, 1);
    } else {
      // Add it to the multi-selection list
      selectedElements.value.push({ bandIndex, elementIndex, parentFrameIndex, uuid });
    }

    // If nothing is selected anymore, clear selectedElement
    if (selectedElements.value.length === 0) {
      selectedElement.value = null;
    } else {
      // Use the last-selected element as the current selection
      const lastSelected = selectedElements.value[selectedElements.value.length - 1];
      if (lastSelected) {
        selectedElement.value = {
          bandIndex: lastSelected.bandIndex,
          elementIndex: lastSelected.elementIndex,
          parentFrameIndex: lastSelected.parentFrameIndex,
          uuid: lastSelected.uuid
        };
      }
    }
  } else {
    // Single-select mode
    selectedElement.value = { bandIndex, elementIndex, parentFrameIndex, uuid };
    selectedElements.value = [{ bandIndex, elementIndex, parentFrameIndex, uuid }]; // Clear the multi-selection list, keeping only the currently selected element
  }

  selectedBandIndex.value = null;

  // Automatically hide the bottom panel
  showBottomPanel.value = false;

  if (element && !element.box) {
    // Use initBox to initialize the box property
    initBox();
  }

  // Removed the expensive DOM queries and animation effects; selection state is now managed via Vue's reactivity system and CSS classes
};

// Clear all selections
const clearSelection = () => {
  selectedElement.value = null;
  selectedElements.value = [];
  selectedBandIndex.value = null;
};

// Select elements within a marquee (rubber-band) rectangle
const selectElementsInRect = (rect: { left: number, top: number, right: number, bottom: number }) => {
  // Clear the current selection
  selectedElements.value = [];
  selectedElement.value = null;

  // Calculate the cumulative height of the bands, used to convert absolute coordinates to coordinates relative to a band
  // The initial offset must account for the top margin
  let bandOffsetY = reportProperties.value?.topMargin || 0;

  // Iterate over all bands and elements, checking whether each falls within the marquee area
  bands.value.forEach((band, bandIndex) => {
    // Check whether the current band overlaps the marquee area
    const bandTop = bandOffsetY;
    const bandBottom = bandOffsetY + band.height;

    // If the band does not overlap the marquee area, skip it
    if (bandBottom < rect.top || bandTop > rect.bottom) {
      bandOffsetY += band.height;
      return;
    }

    // Iterate over all elements in the current band
    band.elements.forEach((element, elementIndex) => {
      // Calculate the element's absolute position on the canvas
      // The element's X coordinate must account for the left margin
      const elementLeft = (reportProperties.value?.leftMargin || 0) + element.x;
      const elementTop = bandOffsetY + element.y;
      const elementRight = elementLeft + element.width;
      const elementBottom = elementTop + element.height;

      // Check whether the element overlaps the marquee area
      const isOverlapping = !(
        elementRight < rect.left ||
        elementLeft > rect.right ||
        elementBottom < rect.top ||
        elementTop > rect.bottom
      );

      // If it overlaps, add it to the selection list
      if (isOverlapping) {
        selectedElements.value.push({ bandIndex, elementIndex, uuid: element.uuid });
      }
    });

    // Update the band's Y offset
    bandOffsetY += band.height;
  });

  // If any elements are selected, use the last-selected one as the current selection
  if (selectedElements.value.length > 0) {
    const lastSelected = selectedElements.value[selectedElements.value.length - 1];
    if (lastSelected) {
      selectedElement.value = {
        bandIndex: lastSelected.bandIndex,
        elementIndex: lastSelected.elementIndex,
        uuid: lastSelected.uuid
      };
    }
  }

  // Automatically hide the bottom panel
  showBottomPanel.value = false;
};

// Cache the event handler functions to avoid recreating them
let cachedMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let cachedMouseUpHandler: ((e: MouseEvent) => void) | null = null;

// Start dragging an element
const startDragging = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  event.stopPropagation();
  selectElement(bandIndex, elementIndex, false, parentFrameIndex);

  // Automatically hide the bottom panel
  showBottomPanel.value = false;

  const band = bands.value[bandIndex];
  let draggedElement;

  if (parentFrameIndex !== undefined) {
    const frame = band?.elements[parentFrameIndex] as FrameElement;
    if (frame && frame.type === 'frame' && frame.elements) {
      draggedElement = frame.elements[elementIndex];
    }
  } else {
    draggedElement = band?.elements[elementIndex];
  }

  if (draggedElement) {
    // Get the current zoom scale
    const currentZoom = zoomLevel.value;

    // Get the paper element's position info, for more accurate coordinate calculations
    const paperEl = document.querySelector('.paper') as HTMLElement;
    let paperOffsetX = 0;
    let paperOffsetY = 0;

    if (paperEl) {
      const paperRect = paperEl.getBoundingClientRect();
      // Offset accounting for the zoom scale
      paperOffsetX = paperRect.left;
      paperOffsetY = paperRect.top;
    }

    // Store the drag info, accounting for the zoom scale
    draggingInfo.value = {
      bandIndex,
      elementIndex,
      parentFrameIndex,
      startX: ((event.clientX - paperOffsetX) / currentZoom) - draggedElement.x,
      startY: ((event.clientY - paperOffsetY) / currentZoom) - draggedElement.y,
      lastTargetBandIndex: bandIndex // Initialize to the current band index
    };

    isDraggingOrResizing.value = true;

    // Use the cached event handler functions to avoid creating new ones on every drag
    if (!cachedMouseMoveHandler) {
      cachedMouseMoveHandler = (e: MouseEvent) => {
        if (draggingInfo.value) {
          const currentBand = bands.value[draggingInfo.value.bandIndex];
          let currentElement;
          let containerWidth = (paperWidth.value - (reportProperties.value?.leftMargin || 0) - (reportProperties.value?.rightMargin || 0));
          let containerHeight = null; // Frame height limit

          if (draggingInfo.value.parentFrameIndex !== undefined) {
             const frame = currentBand?.elements[draggingInfo.value.parentFrameIndex];
             if (frame && frame.type === 'frame' && frame.elements) {
               currentElement = frame.elements[draggingInfo.value.elementIndex];
               containerWidth = frame.width;
               containerHeight = frame.height;
             }
          } else {
             currentElement = currentBand?.elements[draggingInfo.value.elementIndex];
          }

          if (currentBand && currentElement) {
            // Get the current zoom scale
            const currentZoom = zoomLevel.value;

            // Calculate the element's position relative to the paper, accounting for the zoom scale
            // Note: since padding is now used, element coordinates are relative to the content area
            // Calculate the available width; no need to divide by currentZoom since the newX calculation already accounts for zoom
            // const availableWidth = ... (already calculated above as containerWidth)

            // Get the paper element's position info, for more accurate coordinate calculations
            let paperOffsetX = 0;
            let paperOffsetY = 0;
            const paperEl = document.querySelector('.paper') as HTMLElement;

            if (paperEl) {
              const paperRect = paperEl.getBoundingClientRect();
              // Offset accounting for the zoom scale
              paperOffsetX = paperRect.left;
              paperOffsetY = paperRect.top;
            }

            // Calculate the new X and Y coordinates, accounting for zoom and offset
            let newX = ((e.clientX - paperOffsetX) / currentZoom) - draggingInfo.value.startX;
            let newY = ((e.clientY - paperOffsetY) / currentZoom) - draggingInfo.value.startY; // Remove the lower bound on the Y coordinate

            // If inside a Frame, don't constrain the coordinates, allowing the element to move outside the Frame
            if (draggingInfo.value.parentFrameIndex !== undefined) {
               // No constraint applied
            } else {
               // Inside a Band, constrain the X coordinate
               newX = Math.max(0, Math.min(newX, containerWidth - currentElement.width));

                // Original Band Y-constraint logic
                // Get the position info of the first and last bands
                const firstBandElement = document.querySelectorAll('.band')[0] as HTMLElement;
                const lastBandElement = document.querySelectorAll('.band')[bands.value.length - 1] as HTMLElement;

                // Calculate the position of the current band on the page
                const currentBandElement = document.querySelectorAll('.band')[draggingInfo.value.bandIndex] as HTMLElement;
                let currentBandTopInPage = 0;

                if (firstBandElement && lastBandElement && currentBandElement && paperEl) {
                  const firstBandRect = firstBandElement.getBoundingClientRect();
                  const lastBandRect = lastBandElement.getBoundingClientRect();
                  const currentBandRect = currentBandElement.getBoundingClientRect();
                  const paperRect = paperEl.getBoundingClientRect();

                  // Calculate the positions of the first and last bands relative to the page
                  const firstBandTopInPage = (firstBandRect.top - paperRect.top) / currentZoom;
                  const lastBandBottomInPage = (lastBandRect.bottom - paperRect.top) / currentZoom;
                  currentBandTopInPage = (currentBandRect.top - paperRect.top) / currentZoom;

                  // Calculate the element's absolute position on the page (relative to the entire page)
                  const elementTopInPage = currentBandTopInPage + newY;

                  // Constrain the element's top so it doesn't exceed the first band's top boundary
                  if (elementTopInPage < firstBandTopInPage) {
                    const adjustment = firstBandTopInPage - elementTopInPage;
                    newY += adjustment;
                  }

                  // For elements in the last band, constrain their bottom so it doesn't exceed the last band's bottom boundary
                  if (draggingInfo.value.bandIndex === bands.value.length - 1) {
                    // Calculate the element's maximum Y coordinate within the last band
                    const maxRelativeY = lastBandBottomInPage - currentBandTopInPage - currentElement.height;
                    newY = Math.min(newY, maxRelativeY);
                  }
                }
            }

            // Apply auto-snap functionality
            if (enableSnapToGrid.value) {
              // Define the grid size as 3 pixels, reducing the snap distance
              const gridSize = 3;

              // Snap the X coordinate
              const remainderX = newX % gridSize;
              if (remainderX < gridSize / 2) {
                newX = newX - remainderX;
              } else {
                newX = newX + (gridSize - remainderX);
              }

              // Snap the Y coordinate
              const remainderY = newY % gridSize;
              if (remainderY < gridSize / 2) {
                newY = newY - remainderY;
              } else {
                newY = newY + (gridSize - remainderY);
              }
            }

            // Apply alignment-line snapping
            if (enableSnapToAlignment.value) {
              // Create a temporary element object for alignment-line detection
              const tempElement = { ...currentElement, x: newX, y: newY };
              const snapInfo = detectAlignmentLines(tempElement, draggingInfo.value.bandIndex, false);

              // Apply horizontal snapping
              if (snapInfo.horizontal) {
                newX += snapInfo.horizontal.offset;
              }

              // Apply vertical snapping
              if (snapInfo.vertical) {
                newY += snapInfo.vertical.offset;
              }
            }

            // Ensure the coordinate values are integers
            currentElement.x = Math.round(newX);
            currentElement.y = Math.round(newY);

            // If the element moves into a different band, constrain the Y coordinate so it doesn't exceed the band's height
            if (highlightedBandIndex.value !== null && highlightedBandIndex.value !== draggingInfo.value.bandIndex) {
              const targetBand = bands.value[highlightedBandIndex.value];
              if (targetBand) {
                const maxY = targetBand.height - currentElement.height;
                // Calculate the element's Y coordinate relative to the target band
                const bandElements = document.querySelectorAll('.band');
                const currentBandElement = bandElements[draggingInfo.value.bandIndex] as HTMLElement;
                const targetBandElement = bandElements[highlightedBandIndex.value] as HTMLElement;

                if (currentBandElement && targetBandElement) {
                  const currentBandRect = currentBandElement.getBoundingClientRect();
                  const targetBandRect = targetBandElement.getBoundingClientRect();
                  const relativeY = newY + (currentBandRect.top - targetBandRect.top) / currentZoom;

                  // Constrain the relative Y coordinate
                  if (relativeY > maxY) {
                    // Adjust the element's actual Y coordinate
                    currentElement.y = newY - (relativeY - maxY);
                  }
                }
              }
            }

            // Detect alignment lines (using the final position)
            // Use the band index the element currently belongs to, ensuring consistent alignment-line detection
            detectAlignmentLines(currentElement, draggingInfo.value.bandIndex);

            // Update and display the coordinate info
            // Show the element's relative coordinate values
            let relativeX = Math.round(newX);
            let relativeY = Math.round(newY);

            // Reuse the already-retrieved paperElement variable
            if (paperEl) {
              const bandElements = document.querySelectorAll('.band');

              // Calculate the element's coordinates relative to the target band while dragging
              if (highlightedBandIndex.value !== null && bandElements[highlightedBandIndex.value]) {
                // If there's a highlighted band (the band the mouse is currently over), calculate the element's coordinates relative to it
                const targetBandElement = bandElements[highlightedBandIndex.value] as HTMLElement;
                const targetBandRect = targetBandElement.getBoundingClientRect();

                // Fix: use the element's actual Y coordinate (newY) rather than the mouse position to calculate the relative Y coordinate
                // Get the top position of the band the current element belongs to
                const currentBandElement = bandElements[draggingInfo.value.bandIndex] as HTMLElement;
                const currentBandRect = currentBandElement.getBoundingClientRect();

                // If the element is in a different band, the calculation must be adjusted
                if (highlightedBandIndex.value !== draggingInfo.value.bandIndex) {
                  // The element moved to a different band; calculate the Y coordinate relative to the new band
                  relativeY = Math.round(newY + (currentBandRect.top - targetBandRect.top) / currentZoom);
                } else {
                  // The element is within the same band; use the element's Y coordinate
                  relativeY = Math.round(newY);
                }

                // Ensure the Y coordinate is relative to the target band
                if (relativeY < 0) {
                  relativeY = 0;
                }

                // Constrain the moved element's relative Y value so it doesn't exceed the target band's height minus the element's height
                const targetBand = bands.value[highlightedBandIndex.value];
                if (targetBand && currentElement) {
                  const maxY = targetBand.height - currentElement.height;
                  if (relativeY > maxY) {
                    relativeY = maxY;
                  }
                }
              }
            }

            dragCoordinates.value = {
              x: relativeX,
              y: relativeY,
              visible: true,
              bandName: ''
            };

            // Use the DOM elements' actual positions to calculate the target band, for greater accuracy
            // Reuse the already-retrieved paperElement variable
            if (paperEl) {
              let targetBandIndex = draggingInfo.value.bandIndex;
              let isOverBand = false;

              // Get all band elements
              const bandElements = document.querySelectorAll('.band');
              for (let i = 0; i < bandElements.length; i++) {
                const bandElement = bandElements[i] as HTMLElement;
                const bandRect = bandElement.getBoundingClientRect();

                // Check whether the mouse position falls within the current band's bounds
                if (e.clientY >= bandRect.top && e.clientY <= bandRect.bottom) {
                  targetBandIndex = i;
                  isOverBand = true;
                  break;
                }
              }

              // Only update the highlighted band when the mouse is over some band
              if (isOverBand) {
                highlightedBandIndex.value = targetBandIndex;
              }

              // Log once the dragged element has moved into the target band
              if (isOverBand && targetBandIndex !== draggingInfo.value.bandIndex &&
                  targetBandIndex !== draggingInfo.value.lastTargetBandIndex) {
                const sourceBand = bands.value[draggingInfo.value.bandIndex];
                const targetBand = bands.value[targetBandIndex];
                if (sourceBand && targetBand) {
                  console.log(`Element moved from ${getBandDisplayName(sourceBand.type)} to ${getBandDisplayName(targetBand.type)}`);
                  // Update the last target band index
                  draggingInfo.value.lastTargetBandIndex = targetBandIndex;

                  // TODO: also constrain the moved element's relative Y value so it doesn't exceed the target band's height minus the element's height

                }
              }
            }

            // Update the position of the coordinate-display element so it follows the mouse
            const coordinatesElement = document.querySelector('.coordinates-display') as HTMLElement;
            if (coordinatesElement) {
              // Get the name of the band the mouse is currently over
              let bandName = '';
              if (highlightedBandIndex.value !== null &&
                  bands.value[highlightedBandIndex.value] !== undefined) {
                const currentBand = bands.value[highlightedBandIndex.value];
                if (currentBand) {
                  bandName = getBandDisplayName(currentBand.type) + ' - ';
                }
              }

              // Coordinate display accounting for the zoom scale
              coordinatesElement.style.left = (e.clientX + 10) + 'px';
              coordinatesElement.style.top = (e.clientY - 30) + 'px';

              // Update dragCoordinates so the template shows the correct coordinates and band name
              dragCoordinates.value.x = relativeX;
              dragCoordinates.value.y = relativeY;
              dragCoordinates.value.bandName = bandName;
            }
          }
        }
      };
    }

    if (!cachedMouseUpHandler) {
      cachedMouseUpHandler = (e: MouseEvent) => {
        // Save state to history
        saveStateToHistory();

        if (draggingInfo.value) {
          const currentBand = bands.value[draggingInfo.value.bandIndex];
          let currentElement;

          if (draggingInfo.value.parentFrameIndex !== undefined) {
            // Add a safety check
            if (currentBand && currentBand.elements && currentBand.elements[draggingInfo.value.parentFrameIndex]) {
              const frame = currentBand.elements[draggingInfo.value.parentFrameIndex];
              if (frame && frame.type === 'frame' && frame.elements) {
                currentElement = frame.elements[draggingInfo.value.elementIndex];
              }
            }
          } else {
            if (currentBand && currentBand.elements) {
              currentElement = currentBand.elements[draggingInfo.value.elementIndex];
            }
          }

          if (currentBand && currentElement) {
            // 1. Get the target Band
            let targetBandIndex = draggingInfo.value.bandIndex;

            // If there is a last-highlighted band index and it's valid, use it
            if (draggingInfo.value.lastTargetBandIndex !== undefined &&
                draggingInfo.value.lastTargetBandIndex >= 0 &&
                draggingInfo.value.lastTargetBandIndex < bands.value.length) {
              targetBandIndex = draggingInfo.value.lastTargetBandIndex;
            } else {
              // Otherwise, use the mouse position to determine the target band
              const paperEl = document.querySelector('.paper') as HTMLElement;
              if (paperEl) {
                const bandElements = document.querySelectorAll('.band');
                for (let i = 0; i < bandElements.length; i++) {
                  const bandElement = bandElements[i] as HTMLElement;
                  const bandRect = bandElement.getBoundingClientRect();
                  if (e.clientY >= bandRect.top && e.clientY <= bandRect.bottom) {
                    targetBandIndex = i;
                    break;
                  }
                }
              }
            }

            const targetBand = bands.value[targetBandIndex];

            // 2. Calculate the element's absolute coordinates on the page (or its coordinates relative to the target Band)
            // Calculate the Source Parent's coordinates relative to the Source Band
            let sourceParentRelX = 0;
            let sourceParentRelY = 0;
            if (draggingInfo.value.parentFrameIndex !== undefined) {
               const frame = bands.value[draggingInfo.value.bandIndex]?.elements[draggingInfo.value.parentFrameIndex];
               if (frame) {
                 sourceParentRelX = frame.x;
                 sourceParentRelY = frame.y;
               }
            }

            // Calculate the element's coordinates relative to the Source Band
            const elementRelSourceBandX = sourceParentRelX + currentElement.x;
            const elementRelSourceBandY = sourceParentRelY + currentElement.y;

            // Calculate the Source Band's offset relative to the Target Band
            const sourceBandEl = document.querySelectorAll('.band')[draggingInfo.value.bandIndex];
            const targetBandEl = document.querySelectorAll('.band')[targetBandIndex];

            if (!sourceBandEl || !targetBandEl) return;

            const sourceBandElement = sourceBandEl.getBoundingClientRect();
            const targetBandElement = targetBandEl.getBoundingClientRect();
            const currentZoom = zoomLevel.value;
            const bandOffsetY = (sourceBandElement.top - targetBandElement.top) / currentZoom;

            const elementRelTargetBandX = elementRelSourceBandX;
            const elementRelTargetBandY = elementRelSourceBandY + bandOffsetY;

            // 3. Look for a target Frame within the Target Band
            let targetFrameIndex = -1;
            if (targetBand && targetBand.elements) {
              // Iterate over the Frames in the Target Band
              for (let i = targetBand.elements.length - 1; i >= 0; i--) {
                  // Avoid dropping a Frame into itself: if we're in the same Band and the Frame being iterated is the one being dragged, skip it
                  if (targetBandIndex === draggingInfo.value.bandIndex &&
                      draggingInfo.value.parentFrameIndex === undefined &&
                      i === draggingInfo.value.elementIndex) {
                    continue;
                  }

                  const el = targetBand.elements[i];
                  if (!el) continue;
                  if (el.type === 'frame') {
                      // Check intersection using element center
                      const centerX = elementRelTargetBandX + currentElement.width / 2;
                      const centerY = elementRelTargetBandY + currentElement.height / 2;

                      if (centerX >= el.x && centerX <= el.x + el.width &&
                          centerY >= el.y && centerY <= el.y + el.height) {
                         targetFrameIndex = i;
                         break;
                      }
                  }
              }
            }

            // 4. Determine whether the container changed
            const isSameBand = draggingInfo.value.bandIndex === targetBandIndex;
            const isSameFrame = draggingInfo.value.parentFrameIndex === (targetFrameIndex === -1 ? undefined : targetFrameIndex);

            if ((!isSameBand || !isSameFrame) && targetBand) {
               // Reparenting

               // Grab the target Frame reference up front (splice would otherwise shift the indices)
               let targetFrame: FrameElement | null = null;
               if (targetFrameIndex !== -1) {
                   targetFrame = targetBand.elements[targetFrameIndex] as FrameElement;
               }

               // Remove from Source
               let element;
               if (draggingInfo.value.parentFrameIndex !== undefined) {
                   const frame = bands.value[draggingInfo.value.bandIndex]?.elements[draggingInfo.value.parentFrameIndex] as FrameElement;
                   if (frame && frame.elements) {
                     element = frame.elements.splice(draggingInfo.value.elementIndex, 1)[0];
                   }
               } else {
                   element = bands.value[draggingInfo.value.bandIndex]?.elements.splice(draggingInfo.value.elementIndex, 1)[0];
               }

               if (element) {
                 // Add to Target
                 if (targetFrame) {
                     if (!targetFrame.elements) targetFrame.elements = [];

                     // Convert to Frame Rel Coords
                     element.x = Math.round(elementRelTargetBandX - targetFrame.x);
                     element.y = Math.round(elementRelTargetBandY - targetFrame.y);

                     // Limit
                     element.x = Math.max(0, element.x);
                     element.y = Math.max(0, element.y);
                     if (element.x + element.width > targetFrame.width) element.x = Math.max(0, targetFrame.width - element.width);
                     if (element.y + element.height > targetFrame.height) element.y = Math.max(0, targetFrame.height - element.height);

                     targetFrame.elements.push(element);
                     selectElement(targetBandIndex, targetFrame.elements.length - 1, false, targetFrameIndex);
                 } else {
                     // Add to Band
                     element.x = Math.round(elementRelTargetBandX);
                     element.y = Math.round(elementRelTargetBandY);

                     // Limit Y >= 0
                     element.y = Math.max(0, element.y);

                     targetBand.elements.push(element);
                     selectElement(targetBandIndex, targetBand.elements.length - 1);
                 }
               }
            } else {
              // Moved within the same container; use the coordinate values shown while dragging
              // Note: dragCoordinates may only have updated the displayed value — the actual value was already updated in mousemove via the currentElement reference
              // This mainly just ensures integers and bounds
              currentElement.x = Math.round(currentElement.x);
              currentElement.y = Math.round(currentElement.y);
              if (currentElement.y < 0) currentElement.y = 0;
            }
          }
        }

        // Clear the highlight and coordinate display
        highlightedBandIndex.value = null;
        dragCoordinates.value.visible = false;

        // Clear the alignment lines
        clearAlignmentLines();

        draggingInfo.value = null;
        isDraggingOrResizing.value = false;

        // Update JRXML
        updateJRXML();

        // Remove the event listeners
        if (cachedMouseMoveHandler) {
          document.removeEventListener('mousemove', cachedMouseMoveHandler);
        }
        if (cachedMouseUpHandler) {
          document.removeEventListener('mouseup', cachedMouseUpHandler);
          cachedMouseUpHandler = null;
        }
      };
    }

    // Add the event listeners
    document.addEventListener('mousemove', cachedMouseMoveHandler);
    document.addEventListener('mouseup', cachedMouseUpHandler);

    // Immediately fire a mousemove event once, so the element follows the mouse right away
    // This fixes the issue where moving the mouse within 100ms of pressing the mouse button left the element lagging behind the mouse position
    setTimeout(() => {
      if (cachedMouseMoveHandler) {
        cachedMouseMoveHandler(event);
      }
    }, 0);
  }
};

// Delete an element
const deleteElement = () => {
  // Check whether any elements are selected
  if (selectedElements.value && selectedElements.value.length > 0) {
    // Delete multiple selected elements
    saveStateToHistory();

    // Delete from last to first to avoid index-shift issues
    const sortedElements = [...selectedElements.value].sort((a, b) => {
      if (a.bandIndex !== b.bandIndex) {
        return b.bandIndex - a.bandIndex; // Descending by band index
      }
      return b.elementIndex - a.elementIndex; // Descending by element index
    });

    // Delete the elements
    sortedElements.forEach(({ bandIndex, elementIndex, parentFrameIndex }) => {
      const band = bands.value[bandIndex];
      if (band && band.elements) {
        if (parentFrameIndex !== undefined) {
           // Delete an element inside a Frame
           const frame = band.elements[parentFrameIndex];
           if (frame && frame.type === 'frame' && frame.elements) {
             frame.elements.splice(elementIndex, 1);
           }
        } else {
           // Delete an element inside a Band
           band.elements.splice(elementIndex, 1);
        }
      }
    });

    // Clear the selection list
    selectedElements.value = [];
    selectedElement.value = null;
  } else if (selectedElement.value) {
    // Delete a single selected element (original logic)
    saveStateToHistory();
    const { bandIndex, elementIndex, parentFrameIndex } = selectedElement.value;
    const band = bands.value[bandIndex];
    if (band && band.elements) {
      if (parentFrameIndex !== undefined) {
         // Delete an element inside a Frame
         const frame = band.elements[parentFrameIndex];
         if (frame && frame.type === 'frame' && frame.elements) {
           frame.elements.splice(elementIndex, 1);
         }
      } else {
         band.elements.splice(elementIndex, 1);
      }
      selectedElement.value = null;
    }
  }
};

// Start editing static text
const startEditing = (bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
  editingElement.value = { bandIndex, elementIndex, parentFrameIndex };
  // Select the element
  selectElement(bandIndex, elementIndex, false, parentFrameIndex);

  // Automatically hide the bottom panel
  showBottomPanel.value = false;
};

// Finish editing
const finishEditing = () => {
  editingElement.value = null;
  // Save the data
  saveToLocalStorageWrapper();
  updateJRXML();
};

// Cancel editing
const cancelEditing = () => {
  editingElement.value = null;
};

// Wrapper function for the fileUtils functions
const saveToLocalStorageWrapper = () => {
  // Safety check to ensure reportProperties.value exists
  if (!reportProperties.value) {
    console.error('reportProperties.value is undefined, cannot save to local storage');
    return;
  }

  saveToLocalStorage(
    {
      reportProperties: reportProperties.value,
      bands: bands.value,
      reportFields: reportFields.value,
      jrxmlContent: jrxmlContent.value
    },
    reportProperties.value?.name || 'report'
  );
};

const loadFromLocalStorageWrapper = () => {
  const loadedData = loadFromLocalStorage();
  if (loadedData && loadedData.reportData) {
    reportProperties.value = loadedData.reportData.reportProperties;
    bands.value = loadedData.reportData.bands;
    reportFields.value = loadedData.reportData.reportFields;
    jrxmlContent.value = loadedData.reportData.jrxmlContent;
    // Update selectedBandTypes to match the loaded bands
    if (loadedData.reportData.bands && Array.isArray(loadedData.reportData.bands)) {
      selectedBandTypes.value = loadedData.reportData.bands.map((band: Band) => band.type);
    } else {
      selectedBandTypes.value = [];
    }
    return true;
  }
  return false;
};


// Initialize an element's Box property
const initBox = () => {
  if (currentElement.value) {
    // Create a default box object
    currentElement.value.box = {
      // Global border
      border: '',
      borderColor: '#000000',
      borderWidth: 0,
      borderStyle: '',

      // Per-side borders - style defaults to an empty string, meaning "use the global setting"
      topBorder: '',
      topBorderColor: '#000000',
      topBorderWidth: 0,
      topBorderStyle: '', // Defaults to an empty string, meaning "use the global setting"
      leftBorder: '',
      leftBorderColor: '#000000',
      leftBorderWidth: 0,
      leftBorderStyle: '', // Defaults to an empty string, meaning "use the global setting"
      bottomBorder: '',
      bottomBorderColor: '#000000',
      bottomBorderWidth: 0,
      bottomBorderStyle: '', // Defaults to an empty string, meaning "use the global setting"
      rightBorder: '',
      rightBorderColor: '#000000',
      rightBorderWidth: 0,
      rightBorderStyle: '', // Defaults to an empty string, meaning "use the global setting"

      // Margins
      padding: 0,
      topPadding: 0,
      leftPadding: 0,
      bottomPadding: 0,
      rightPadding: 0
    };
  }
};

// Download the JRXML file
const downloadJRXML = () => {
  const content = generateJRXMLContent(reportProperties.value, bands.value, reportFields.value, reportParameters.value, subDatasets.value, [], reportVariables.value, [], reportGroups.value);
  jrxmlContent.value = content;

  // Automatically switch to the JRXML tab
  activeTab.value = 'jrxml';

  // Create the download link
  const blob = new Blob([content], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportProperties.value?.name || 'report'}.jrxml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Save the data
  saveToLocalStorageWrapper();
};

// Panel visibility control functions
const toggleLeftPanel = () => {
  showLeftPanel.value = !showLeftPanel.value;
};

const toggleRightPanel = () => {
  showRightPanel.value = !showRightPanel.value;
};

const toggleBottomPanel = () => {
  showBottomPanel.value = !showBottomPanel.value;
};

const toggleAIChat = () => {
  showAIChat.value = !showAIChat.value;
};

// AI settings related state
const showAISettings = ref(false);

const toggleAISettings = () => {
  showAISettings.value = !showAISettings.value;
};

// Handle left panel size changes
const handleLeftPanelSizeChange = (newSize: number) => {
  leftPanelWidth.value = newSize;
};

// Properties and methods exposed for testing
defineExpose({
  bands,
  reportProperties,
  createNewFile,
  loadFile,
  loadFromLocalStorageWrapper,
  lastClickedBandIndex,
  handleElementDoubleClick,
  selectElement,
  deleteElement,
  undo,
  redo
});

// Handle properties panel size changes
const handlePropertyPanelSizeChange = (newSize: number) => {
  propertyPanelWidth.value = newSize;
};

// Handle bottom panel size changes
const handleBottomPanelSizeChange = (newSize: number) => {
  bottomPanelHeight.value = newSize;
};


// Automatically update the JRXML content
const updateJRXML = () => {
  // Guard against re-entrancy: if updateJRXML is already running, skip this call
  if (isUpdatingJRXML.value) {
    return;
  }
  isUpdatingJRXML.value = true;
  try {
    // Ensure all data has been initialized
    if (!reportProperties.value || !bands.value || !reportFields.value || !reportParameters.value) {
      return;
    }

    const content = generateJRXMLContent(reportProperties.value, bands.value, reportFields.value, reportParameters.value, subDatasets.value, reportStyles.value, reportVariables.value, [], reportGroups.value);

    // If the content changed, save it to history
    if (content !== jrxmlContent.value) {
      // Only save history while not dragging/resizing
      if (!isDraggingOrResizing.value && historyStack.value.length === 0) {
        // Save the initial state on first run
        saveStateToHistory();
      }
      jrxmlContent.value = content;

      // Save to local storage immediately, ensuring the JRXML content gets persisted
      saveToLocalStorageWrapper();
    }
  } catch (error) {
    console.error('Failed to update JRXML:', error);
  } finally {
    isUpdatingJRXML.value = false;
  }
};

// Copy an element to the clipboard
const copyElement = async () => {
  if (selectedElement.value) {
    const { bandIndex, elementIndex } = selectedElement.value;
    const band = bands.value[bandIndex];
    if (band && band.elements && band.elements[elementIndex]) {
      try {
        // Deep-clone the element data
        let elementData = JSON.parse(JSON.stringify(band.elements[elementIndex]));

        // Generate a new UUID rather than duplicating the original
        elementData.uuid = crypto.randomUUID();

        // Process border properties, keeping only borders with a width greater than 0
        if (elementData.box) {
          // Handle the new border model
          if (elementData.box.pen && elementData.box.pen.lineWidth <= 0) {
            delete elementData.box.pen;
          }

          // Handle borders on each side
          ['topPen', 'leftPen', 'bottomPen', 'rightPen'].forEach(penType => {
            if (elementData.box[penType] && elementData.box[penType].lineWidth <= 0) {
              delete elementData.box[penType];
            }
          });

          // If the box object is empty, remove the entire box property
          if (Object.keys(elementData.box).length === 0) {
            delete elementData.box;
          }
        }

        // Build the data object to copy, including a metadata marker to identify it as a PDF Designer element
        const clipboardData = {
          type: 'PDF_DESIGNER_ELEMENT',
          version: '1.0',
          elementData: elementData
        };
        // Convert the data to a JSON string and write it to the clipboard
        await navigator.clipboard.writeText(JSON.stringify(clipboardData));
        console.log('Element copied to clipboard:', elementData);
        // Optional: show a "copied successfully" notification
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        // Fallback: use the legacy in-memory storage approach as a backup
        let elementData = JSON.parse(JSON.stringify(band.elements[elementIndex]));

        // Process border properties, keeping only borders with a width greater than 0
        if (elementData.box) {
          // Handle the new border model
          if (elementData.box.pen && elementData.box.pen.lineWidth <= 0) {
            delete elementData.box.pen;
          }

          // Handle borders on each side
          ['topPen', 'leftPen', 'bottomPen', 'rightPen'].forEach(penType => {
            if (elementData.box[penType] && elementData.box[penType].lineWidth <= 0) {
              delete elementData.box[penType];
            }
          });

          // If the box object is empty, remove the entire box property
          if (Object.keys(elementData.box).length === 0) {
            delete elementData.box;
          }
        }

        sessionStorage.setItem('pdfDesignerCopiedElement', JSON.stringify({
          type: 'PDF_DESIGNER_ELEMENT',
          version: '1.0',
          elementData: elementData
        }));
      }
    }
  }
};

// Paste an element from the clipboard
const pasteElement = async () => {
  try {
    // First try reading from the clipboard
    const clipboardText = await navigator.clipboard.readText();
    const clipboardData = JSON.parse(clipboardText);

    // Verify this is our own PDF Designer element data
    if (clipboardData.type === 'PDF_DESIGNER_ELEMENT' && clipboardData.elementData) {
      processPastedElement(clipboardData.elementData);
    }
  } catch (err) {
    console.error('Failed to read from clipboard:', err);
    // Fallback: try reading from sessionStorage
    try {
      const savedData = sessionStorage.getItem('pdfDesignerCopiedElement');
      if (savedData) {
        const clipboardData = JSON.parse(savedData);
        if (clipboardData.type === 'PDF_DESIGNER_ELEMENT' && clipboardData.elementData) {
          processPastedElement(clipboardData.elementData);
        }
      }
    } catch (sessionErr) {
      console.error('Failed to read from sessionStorage:', sessionErr);
    }
  }
};

// Handle the pasted element data (extracted into a separate function for reuse)
const processPastedElement = (elementData: any) => {
  saveStateToHistory();

  // Determine the paste location (use the currently selected band, or default to the first editable band)
  let targetBandIndex = selectedBandIndex.value !== null ? selectedBandIndex.value : 0;

  // Find the first band that has an elements array
  if (targetBandIndex === null) {
    targetBandIndex = bands.value.findIndex(band => band.elements && Array.isArray(band.elements));
    // If none is found, use the detail band (usually index 3)
    if (targetBandIndex === -1) {
      targetBandIndex = 3;
    }
  }

  const targetBand = bands.value[targetBandIndex];
  if (!targetBand) {
    console.error('Target band does not exist');
    return;
  }

  // Create the new element (deep clone)
  const newElement = JSON.parse(JSON.stringify(elementData));

  // Offset the position slightly so it doesn't overlap the original element (shift down and to the right)
  newElement.x = Math.round(newElement.x + KEYBOARD_CONSTANTS.ELEMENT_PASTE_OFFSET);
  newElement.y = Math.round(newElement.y + KEYBOARD_CONSTANTS.ELEMENT_PASTE_OFFSET);

  // Ensure the element's width and height are also integers
  if (newElement.width) {
    newElement.width = Math.round(newElement.width);
  }
  if (newElement.height) {
    newElement.height = Math.round(newElement.height);
  }

  // Ensure the element's ID is unique
  if (newElement.id) {
    newElement.id = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add it to the target band
  if (!targetBand.elements) {
    targetBand.elements = [];
  }

  targetBand.elements.push(newElement);

  // Select the newly added element
  const newElementIndex = targetBand.elements.length - 1;
  selectElement(targetBandIndex, newElementIndex);

  // Update JRXML
  updateJRXML();

  console.log('Element pasted:', newElement);
};

// Define the handleKeyDown function at the top level of the component
const handleKeyDown = (event: KeyboardEvent) => {
  // Get the currently active element, used to determine focus state
  const activeEl = document.activeElement;
  const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');
  const isTextareaFocused = activeEl && activeEl.tagName === 'TEXTAREA';

  // Detect whether any text is selected
  const selection = window.getSelection();
  const isTextSelected = selection && selection.toString().trim().length > 0;

  // Detect whether the Ctrl key (Windows) or Meta key (Mac) is pressed
  const isCtrlOrMetaPressed = event.ctrlKey || event.metaKey;

  // CTRL/CMD+0 resets the zoom level
  if (isCtrlOrMetaPressed && event.key === '0') {
    event.preventDefault();
    resetZoom();
    return;
  }

  // CTRL/CMD+S saves the current file
  if (isCtrlOrMetaPressed && event.key === 's') {
    event.preventDefault();
    saveCurrentFileToStorage();
    return;
  }

  // CTRL/CMD+B toggles the bottom panel's visibility
  if (isCtrlOrMetaPressed && event.key === 'b') {
    event.preventDefault();
    toggleBottomPanel();
    return;
  }

  // CTRL/CMD+Z undoes an action
  if (isCtrlOrMetaPressed && event.key === 'z') {
    event.preventDefault();
    undo();
    return;
  }

  // CTRL/CMD+Y redoes an action
  if (isCtrlOrMetaPressed && event.key === 'y') {
    event.preventDefault();
    redo();
    return;
  }

  // CTRL/CMD+C handling: first check whether an input is focused, and if so, fall back to the browser's default copy behavior
  if (isCtrlOrMetaPressed && event.key === 'c') {
    // If an input is focused, use the browser's default copy behavior
    if (isInputFocused) {
      // Don't prevent the default behavior; let the browser perform its default text copy
      return;
    }

    // If text is selected, use the browser's default copy behavior
    if (isTextSelected) {
      // Don't prevent the default behavior; let the browser perform its default text copy
      return;
    }

    // If no text is selected but an element is selected, copy the element
    if (selectedElement.value) {
      event.preventDefault();
      copyElement();
      return;
    }

    // If neither text nor an element is selected, but the design area has focus, copy the JRXML
    if (isDesignAreaFocused.value) {
      event.preventDefault();
      copyJRXML();
      return;
    }
  }

  // CTRL/CMD+V handling: first check whether an input is focused, and if so, fall back to the browser's default paste behavior
  if (isCtrlOrMetaPressed && event.key === 'v') {
    // If an input is focused, use the browser's default paste behavior
    if (isInputFocused) {
      // Don't prevent the default behavior; let the browser perform its default text paste
      return;
    }

    // Paste an element (custom paste only runs while the design area is focused and we're not in a textarea)
    if (isDesignAreaFocused.value && !isTextareaFocused) {
      event.preventDefault();
      pasteElement();
      return;
    }
  }

  // Delete key removes the selected component (only outside edit mode and when no input is focused)
  if ((event.key === 'Delete' || event.key === 'Backspace') &&
      (selectedElement.value || (selectedElements.value && selectedElements.value.length > 0)) &&
      !editingElement.value &&
      !isInputFocused) {
    event.preventDefault();
    deleteElement();
    return;
  }

  // Arrow key handling: Shift+Arrow nudges the element's position, Arrow alone selects a neighboring component
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    // If an input is focused, use the default behavior (move the cursor)
    if (isInputFocused) {
      return;
    }

    event.preventDefault();

    // If Shift is held and an element is selected, nudge its position
    if (event.shiftKey && selectedElement.value) {
      moveElementByKeyboard(event.key);
    } else {
      // Otherwise, perform the original navigation behavior
      navigateElements(event.key);
    }
    return;
  }
};

// Keyboard navigation to select a neighboring component
const navigateElements = (direction: string) => {
  if (!selectedElement.value) return;

  const { bandIndex: currentBandIndex, elementIndex: currentElementIndex } = selectedElement.value;
  const currentBand = bands.value[currentBandIndex];
  const currentElement = currentBand?.elements[currentElementIndex];

  if (!currentBand || !currentElement) return;

  let nearestElement: { bandIndex: number; elementIndex: number; distance: number } | null = null;
  let currentBandY = 0;

  // Calculate the current element's absolute position
  const currentX = currentElement.x;
  const currentY = currentBandY + currentElement.y;

  // Iterate over all elements to find the nearest one matching the direction criteria
  bands.value.forEach((band, bandIdx) => {
    // Accumulate the band's Y offset
    const bandOffsetY = currentBandY;
    currentBandY += band.height;

    band.elements.forEach((element, elementIdx) => {
      // Skip the currently selected element
      if (bandIdx === currentBandIndex && elementIdx === currentElementIndex) return;

      // Calculate the element's absolute position
      const elementX = element.x;
      const elementY = bandOffsetY + element.y;

      // Determine whether it matches the direction criteria
      let isValidDirection = false;

      switch (direction) {
        case 'ArrowUp':
          isValidDirection = elementY < currentY;
          break;
        case 'ArrowDown':
          isValidDirection = elementY > currentY;
          break;
        case 'ArrowLeft':
          isValidDirection = elementX < currentX;
          break;
        case 'ArrowRight':
          isValidDirection = elementX > currentX;
          break;
      }

      if (isValidDirection) {
        // Calculate the distance
        let distance = 0;
        switch (direction) {
          case 'ArrowUp':
          case 'ArrowDown':
            distance = Math.abs(elementY - currentY) + Math.abs(elementX - currentX) * KEYBOARD_CONSTANTS.SECONDARY_AXIS_WEIGHT; // Y axis is primary, X axis is secondary
            break;
          case 'ArrowLeft':
          case 'ArrowRight':
            distance = Math.abs(elementX - currentX) + Math.abs(elementY - currentY) * KEYBOARD_CONSTANTS.SECONDARY_AXIS_WEIGHT; // X axis is primary, Y axis is secondary
            break;
        }

        // Update the nearest element
        if (!nearestElement || distance < nearestElement.distance) {
          nearestElement = { bandIndex: bandIdx, elementIndex: elementIdx, distance };
        }
      }
    });
  });

  // Select the nearest element
  if (nearestElement) {
    // Use a type assertion to ensure valid property access
    const element = nearestElement as { bandIndex: number; elementIndex: number };
    selectElement(element.bandIndex, element.elementIndex);
  }
};

// Nudge an element's position using the keyboard
const moveElementByKeyboard = (direction: string) => {
  if (!selectedElement.value) return;

  const { bandIndex: currentBandIndex, elementIndex: currentElementIndex } = selectedElement.value;
  const currentBand = bands.value[currentBandIndex];
  const currentElement = currentBand?.elements[currentElementIndex];

  if (!currentBand || !currentElement) return;

  // Define the nudge step size (in pixels)
  const MOVE_STEP = 1;

  // Calculate the new position
  let newX = currentElement.x;
  let newY = currentElement.y;

  switch (direction) {
    case 'ArrowUp':
      newY = Math.max(0, currentElement.y - MOVE_STEP);
      break;
    case 'ArrowDown':
      newY = Math.min(currentBand.height - currentElement.height, currentElement.y + MOVE_STEP);
      break;
    case 'ArrowLeft':
      newX = Math.max(0, currentElement.x - MOVE_STEP);
      break;
    case 'ArrowRight':
      newX = Math.min(reportProperties.value.pageWidth - currentElement.width, currentElement.x + MOVE_STEP);
      break;
  }

  // Save the pre-move state to history (for undo)
  saveStateToHistory();

  // Update the element's position
  currentElement.x = newX;
  currentElement.y = newY;

  // Trigger an update
  updateJRXML();
  saveToLocalStorageWrapper();

  // Check whether it's now out of bounds
  updateOutOfBoundsElements();
};

// Handle click events on the report area, clearing the selection
const handlePaperClick = () => {
  // Only clear the selection if no other element was clicked
  selectedElement.value = null;
  selectedBandIndex.value = null;
};

// Load data when the component mounts
onMounted(() => {
  console.log('Component mount started...');
  const hasLocalData = loadFromLocalStorageWrapper();
  console.log('Local data load complete');

  // Try loading the last-edited file
  loadFilesFromStorage();
  const lastFile = loadLastFile();
  let hasFileData = false;
  if (lastFile) {
    const lastFileInList = findFileById(lastFile.id);
    if (lastFileInList) {
      loadFile(lastFileInList);
      hasFileData = true;
    }
  }

  // Update JRXML after the initial load; use setTimeout to ensure all data has finished loading
  setTimeout(() => {
    console.log('Starting initial JRXML generation...');
    updateJRXML();
  }, 100);

  // Initial zoom setup - automatically fit the window
  // Use setTimeout to ensure the DOM has fully rendered before calculating the zoom scale
  setTimeout(() => {
    zoomLevel.value = calculateOptimalZoom();
  }, 200);

  // Add the keyboard event listener
  document.addEventListener('keydown', handleKeyDown);

  // Add a mouse wheel event listener, used for the zoom feature
  const handleWheel = (event: Event) => {
    // Check whether the Ctrl key is pressed
    const wheelEvent = event as WheelEvent;
    if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
      // Prevent the default behavior (page zoom)
      wheelEvent.preventDefault();

      // Zoom according to the wheel direction
      const delta = wheelEvent.deltaY < 0 ? 0.1 : -0.1;
      handleZoomChange(delta);
    }
  };

  document.addEventListener('wheel', handleWheel, { passive: false });
  (window as any).pdfDesignerWheelListener = handleWheel;

  // Get the paper element and add a click event listener
  const paperElement = document.querySelector('.paper');
  if (paperElement) {
    paperElement.addEventListener('click', () => {
      handlePaperClick();
      setDesignAreaFocused();
    });
  }

  // Store listener references so they can be removed when the component unmounts
  (window as any).pdfDesignerKeydownListener = handleKeyDown;
  (window as any).pdfDesignerPaperClickListener = handlePaperClick;
  (window as any).pdfDesignerSetFocused = setDesignAreaFocused;
  (window as any).pdfDesignerRemoveFocused = removeDesignAreaFocused;
});

// Clean up event listeners when the component unmounts
onUnmounted(() => {
  // Remove the keyboard event listener
  const keydownListener = (window as any).pdfDesignerKeydownListener;
  if (keydownListener) {
    document.removeEventListener('keydown', keydownListener);
  }

  // Remove the mouse wheel event listener
  const wheelListener = (window as any).pdfDesignerWheelListener;
  if (wheelListener) {
    document.removeEventListener('wheel', wheelListener);
  }

  // Remove the paper click event listener
  const handlePaperClick = (window as any).pdfDesignerPaperClickListener;
  const paperElement = document.querySelector('.paper');
  if (handlePaperClick && paperElement) {
    paperElement.removeEventListener('click', handlePaperClick);
  }
});

// Watch for changes to key data, auto-saving and updating JRXML
watch(
  [reportProperties, bands, reportFields, reportParameters],
  () => {
    // Only update while not dragging/resizing and not already in the middle of a JRXML update
    if (!isDraggingOrResizing.value && !isUpdatingJRXML.value) {
      saveToLocalStorageWrapper();
      updateJRXML();
      // Update the out-of-bounds elements
      updateOutOfBoundsElements();
    }
  },
  { deep: true }
);

// Watch for drag-state changes, updating out-of-bounds elements once dragging ends
watch(
  isDraggingOrResizing,
  (newValue, oldValue) => {
    // Update the out-of-bounds elements when transitioning from dragging to not dragging
    if (oldValue === true && newValue === false) {
      updateOutOfBoundsElements();
    }
  }
);

// Copy the JRXML content to the clipboard
const copyJRXML = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(jrxmlContent.value);
    notification.success(t('notifications.jrxmlCopiedSuccess'));
  } catch (err: unknown) {
    console.error('Copy failed:', err);
    notification.error(t('notifications.jrxmlCopyFailed'));
  }
};

// Regenerate the JRXML content
const regenerateJRXML = (): void => {
  updateJRXML();
  // Show a notification message
  notification.info('JRXML has been regenerated');
};

// Open the PDF preview
const openPdfPreview = (): void => {
  try {
    if (!jrxmlContent.value) {
      // Generate the JRXML content directly, without downloading it
      const content = generateJRXMLContent(reportProperties.value, bands.value, reportFields.value, reportParameters.value, subDatasets.value, [], reportVariables.value, [], reportGroups.value);
      jrxmlContent.value = content;
    }
    // If subDatasets is empty, extract it from the table elements
    if (subDatasets.value.length === 0) {
      const extracted: TableDataset[] = [];
      for (const band of bands.value) {
        for (const el of (band.elements || [])) {
          if (el.type === 'table' && (el as any).dataset?.fields?.length > 0) {
            const ds = (el as any).dataset;
            if (!extracted.find(d => d.name === ds.name)) {
              extracted.push({ uuid: ds.uuid || crypto.randomUUID(), name: ds.name, fields: ds.fields, query: ds.query });
            }
          }
        }
      }
      if (extracted.length > 0) {
        subDatasets.value = extracted;
      }
    }
    showPdfPreview.value = false;
    nextTick(() => {
      showPdfPreview.value = true;
    });
  } catch (error) {
    console.error('Failed to preview PDF:', error);
    alert('Failed to preview PDF, please check the console for error details');
  }
};

// Save the edited JRXML content
const saveJRXML = (): void => {
  try {
    // Use our parseJRXMLContent function to parse the JRXML content
    const parsedData = parseJRXMLContent(jrxmlContent.value);

    // Update the report properties
    reportProperties.value = {
      ...parsedData.properties,
      defaultFont: reportProperties.value?.defaultFont || {
        name: FONT_CONSTANTS.DEFAULT_FONT_FAMILY,
        size: REPORT_CONSTANTS.DEFAULT_FONT_SIZE,
        isBold: false,
        isItalic: false,
        isUnderline: false
      }
    };

    // Update the field definitions
    reportFields.value = parsedData.fields;

    // Update the parameter definitions
    reportParameters.value = parsedData.parameters || [];

    // Update the variable definitions
    if (parsedData.variables) {
      reportVariables.value = parsedData.variables;
    }

    // Update the group definitions
    if (parsedData.groups) {
      reportGroups.value = parsedData.groups;
    }

    // Update the style definitions
    if (parsedData.styles) {
      reportStyles.value = parsedData.styles;
    }

    // Update the sub-datasets
    if (parsedData.datasets) {
      subDatasets.value = parsedData.datasets.map(dataset => ({
        uuid: crypto.randomUUID(),
        name: dataset.name,
        fields: dataset.fields,
        query: dataset.query
      })) as any;
    }

    // Update the bands
    bands.value = parsedData.bands;

    // Update the selected band types
    selectedBandTypes.value = parsedData.bands.map(band => band.type);

    // Add a default border to rectangle elements to ensure they render correctly
    bands.value.forEach(band => {
      band.elements.forEach(element => {
        // Ensure the element's width is reasonable (but don't force a minimum height, to preserve the JRXML's original settings)
        if (element.width < ELEMENT_CONSTANTS.MIN_WIDTH) element.width = ELEMENT_CONSTANTS.MIN_WIDTH; // Enforce the minimum width

        // For box elements, ensure the parsed border properties are applied correctly
        if (element.box) {
          // Convert the border style within a pen element
          const processPen = (pen: any): string => {
            if (!pen) return '';

            // If lineWidth is 0 or undefined, return an empty string to indicate no border
            if (pen.lineWidth === 0 || pen.lineWidth === undefined) {
              return '';
            }

            let width = `${pen.lineWidth}px`;
            let style = 'solid';
            let color = '#000000';

            if (pen.lineStyle) {
              switch (pen.lineStyle) {
                case 'Dashed':
                  style = 'dashed';
                  break;
                case 'Dotted':
                  style = 'dotted';
                  break;
                case 'Double':
                  style = 'double';
                  break;
                default:
                  style = 'solid';
              }
            }

            if (pen.lineColor) {
              color = pen.lineColor;
            }

            return `${width} ${style} ${color}`;
          };

          // Convert a border style string into the border style name used by the UI
          const convertBorderStyleToName = (borderStyle: string): string => {
            if (!borderStyle || borderStyle === '') return '';

            // If it's already a style name, return it as-is
            if (['Thin', 'Medium', 'Thick', 'Dashed', 'Dotted', 'Double', '1Point', '2Point', '4Point'].includes(borderStyle)) {
              return borderStyle;
            }

            // Parse a border style string, e.g. "1px solid #000000"
            const parts = borderStyle.split(' ');
            if (parts.length >= 2) {
              const width = parts[0];
              const style = parts[1];

              // If the width is 0, return an empty string to indicate no border
              if (width === '0px') {
                return '';
              }

              // Determine the style name based on the width
              if (width === '1px') {
                if (style === 'solid') return 'Thin';
                if (style === 'dashed') return 'Dashed';
                if (style === 'dotted') return 'Dotted';
              } else if (width === '2px') {
                if (style === 'solid') return 'Medium';
              } else if (width === '3px' && style === 'double') {
                return 'Double';
              } else if (width === '4px') {
                if (style === 'solid') return 'Thick';
              }
            }

            // Default to an empty string rather than Thin, to avoid unexpectedly displaying a border
            return '';
          };

          // Extract the color from a border style string
          const extractBorderColor = (borderStyle: string): string => {
            if (!borderStyle || borderStyle === '') return '#000000';

            // If it's already a style name, return the default color
            if (['Thin', 'Medium', 'Thick', 'Dashed', 'Dotted', 'Double', '1Point', '2Point', '4Point'].includes(borderStyle)) {
              return '#000000';
            }

            // Parse a border style string, e.g. "1px solid #000000"
            const parts = borderStyle.split(' ');
            if (parts.length >= 3 && parts[2]) {
              return parts[2];
            }

            return '#000000';
          };

          // Set the border style for each side's pen
          // Process the pen property, without using the non-existent borderStyle
          if (element.box.topPen) {
            // Convert the pen property's value and assign it to topBorder
            element.box.topBorder = processPen(element.box.topPen);
          }
          if (element.box.leftPen) {
            // Convert the pen property's value and assign it to leftBorder
            element.box.leftBorder = processPen(element.box.leftPen);
          }
          // Process the pen property, without using the non-existent borderStyle
          if (element.box.bottomPen) {
            // Convert the pen property's value and assign it to bottomBorder
            element.box.bottomBorder = processPen(element.box.bottomPen);
          }
          if (element.box.rightPen) {
            // Convert the pen property's value and assign it to rightBorder
            element.box.rightBorder = processPen(element.box.rightPen);
          }

          // Handle the border property mapping
          const borderMap: Record<string, string> = {
            'Thin': '1px',
            '1Point': '1px',
            '2Point': '2px',
            '4Point': '4px',
            'Dotted': '1px dotted',
            'Dashed': '1px dashed',
            'Double': '3px double'
          };

          // Apply the border properties
          const applyBorder = (borderAttr: string, colorAttr: string): string => {
            if (!borderAttr) return '';

            let borderValue = borderMap[borderAttr] || '1px';
            // Use a type assertion to work around the indexing issue
            let borderColor = (element.box as any)?.[colorAttr] || '#000000';

            // If borderAttr is a style name (not a pixel value), build the full border style string
            if (borderAttr !== 'Thin' && borderAttr !== '1Point' && borderAttr !== '2Point' && borderAttr !== '4Point') {
              if (borderValue.includes(' ')) {
                return borderValue + ' ' + borderColor;
              }
              return `${borderValue} solid ${borderColor}`;
            }

            return `${borderValue} solid ${borderColor}`;
          };

          // Set the border style for each side
          // Use the existing border property directly, no extra borderStyle needed
          if (element.box.topBorder) {
            // topBorder is already set; just ensure its value is correct
          }
          // Use the existing border property directly, no extra borderStyle needed
          if (element.box.leftBorder) {
            // leftBorder is already set; just ensure its value is correct
          }
          if (element.box.bottomBorder) {
            // bottomBorder is already set; just ensure its value is correct
          }
          if (element.box.rightBorder) {
            // rightBorder is already set; just ensure its value is correct
          }

          // If a global border property is set, apply it to all sides
          if (element.box.border && (!element.box.topBorder || !element.box.leftBorder || !element.box.bottomBorder || !element.box.rightBorder)) {
            const globalBorder = applyBorder(element.box.border, 'borderColor');
            if (!element.box.topBorder) element.box.topBorder = globalBorder;
            if (!element.box.leftBorder) element.box.leftBorder = globalBorder;
            if (!element.box.bottomBorder) element.box.bottomBorder = globalBorder;
            if (!element.box.rightBorder) element.box.rightBorder = globalBorder;
          }

          // Convert a border style string into the border style name used by the UI
          if (element.box.border && typeof element.box.border === 'string' && element.box.border.includes(' ')) {
            element.box.border = convertBorderStyleToName(element.box.border);
          }
          if (element.box.topBorder && typeof element.box.topBorder === 'string' && element.box.topBorder.includes(' ')) {
            element.box.topBorderColor = extractBorderColor(element.box.topBorder);
            element.box.topBorder = convertBorderStyleToName(element.box.topBorder);
          }
          if (element.box.leftBorder && typeof element.box.leftBorder === 'string' && element.box.leftBorder.includes(' ')) {
            element.box.leftBorderColor = extractBorderColor(element.box.leftBorder);
            element.box.leftBorder = convertBorderStyleToName(element.box.leftBorder);
          }
          if (element.box.bottomBorder && typeof element.box.bottomBorder === 'string' && element.box.bottomBorder.includes(' ')) {
            element.box.bottomBorderColor = extractBorderColor(element.box.bottomBorder);
            element.box.bottomBorder = convertBorderStyleToName(element.box.bottomBorder);
          }
          if (element.box.rightBorder && typeof element.box.rightBorder === 'string' && element.box.rightBorder.includes(' ')) {
            element.box.rightBorderColor = extractBorderColor(element.box.rightBorder);
            element.box.rightBorder = convertBorderStyleToName(element.box.rightBorder);
          }
        }

        // Ensure the element doesn't exceed the paper boundary
        element.x = Math.max(0, element.x);
        element.y = Math.max(0, element.y);
        if (element.x + element.width > paperWidth.value) {
          element.width = paperWidth.value - element.x;
        }
      });

      // Ensure the band height is at least the minimum height
      const minHeight = BAND_CONSTANTS.MIN_HEIGHT;
      band.height = Math.max(band.height, minHeight);
    });

    // Regenerate the JRXML content, ensuring parameters are included
    updateJRXML();

    // Save to local storage
    saveToLocalStorageWrapper();

    // Show a success notification
    notification.success(t('notifications.jrxmlEditSaved'));
  } catch (error: unknown) {
    console.error('Failed to save JRXML:', error);
    notification.error(t('notifications.jrxmlEditSaveFailed', { error: error instanceof Error ? error.message : 'Unknown error' }));
  }
};

// Watch for border-setting changes, updating the border style in real time
watch(() => currentElement.value?.box?.border, (newBorderStyle) => {
  if (!currentElement.value || !currentElement.value.box) return;

  const box = currentElement.value.box;

  // If the border style is an empty string, clear all borders
  if (!newBorderStyle || newBorderStyle === '') {
    box.topBorder = '';
    box.leftBorder = '';
    box.bottomBorder = '';
    box.rightBorder = '';
    // Update JRXML
    updateJRXML();
    return;
  }

  const borderColor = box.borderColor || '#000000';

  // Border style mapping
  const borderMap: Record<string, string> = {
    'Thin': '1px',
    '1Point': '1px',
    '2Point': '2px',
    '4Point': '4px',
    'Dotted': '1px dotted',
    'Dashed': '1px dashed',
    'Double': '3px double'
  };

  // Build the border style string
  const borderValue = borderMap[newBorderStyle] || '1px';
  const fullBorderStyle = `${borderValue} solid ${borderColor}`;

  // Apply it to all sides immediately
  box.topBorder = fullBorderStyle;
  box.leftBorder = fullBorderStyle;
  box.bottomBorder = fullBorderStyle;
  box.rightBorder = fullBorderStyle;

  // Update JRXML
  updateJRXML();
});

// Watch for border-width changes, ensuring the pen object includes a lineWidth property
watch(() => currentElement.value?.box?.borderWidth, (newBorderWidth) => {
  if (!currentElement.value || !currentElement.value.box) return;

  const box = currentElement.value.box;

  // If the border width is 0, automatically set the border style to "None"
  if (newBorderWidth === 0 || newBorderWidth === undefined || newBorderWidth === null) {
    box.borderStyle = '';

    // Remove the pen object
    delete box.pen;
  } else {
    // Ensure the pen object exists
    if (!box.pen) {
      box.pen = {};
    }

    // Update the pen object's lineWidth property
    box.pen.lineWidth = newBorderWidth;

    // If no border style is set, use the default style
    if (!box.pen.lineStyle) {
      box.pen.lineStyle = box.borderStyle || 'Solid';
    }

    // If no border color is set, use the default color
    if (!box.pen.lineColor) {
      box.pen.lineColor = box.borderColor || '#000000';
    }
  }

  // Update JRXML
  updateJRXML();
});

// Watch for border-style changes, ensuring the pen object includes a lineStyle property
watch(() => currentElement.value?.box?.borderStyle, (newBorderStyle, oldBorderStyle) => {
  if (!currentElement.value || !currentElement.value.box) return;

  const box = currentElement.value.box;

  // If the border style is set to "None" (an empty string), automatically set the width to 0
  if (newBorderStyle === undefined || newBorderStyle === null || newBorderStyle === '') {
    box.borderWidth = 0;

    // Remove the pen object
    delete box.pen;
  } else {
    // When the border style switches from "None" to another option, automatically default the width to 1 if it's currently 0
    if ((oldBorderStyle === '' || oldBorderStyle === undefined || oldBorderStyle === null) &&
        box.borderWidth === 0) {
      box.borderWidth = 1;
    }

    // Ensure the pen object exists
    if (!box.pen) {
      box.pen = {};
    }

    // Update the pen object's lineStyle property
    box.pen.lineStyle = newBorderStyle;

    // If no border width is set, use the default width
    if (!box.pen.lineWidth) {
      box.pen.lineWidth = box.borderWidth || 1;
    }

    // If no border color is set, use the default color
    if (!box.pen.lineColor) {
      box.pen.lineColor = box.borderColor || '#000000';
    }
  }

  // Update JRXML
  updateJRXML();
});

// Watch for border-color changes, updating the border style in real time
watch(() => currentElement.value?.box?.borderColor, (newBorderColor) => {
  if (!currentElement.value || !currentElement.value.box) return;

  const box = currentElement.value.box;

  // If a border style is set, update the color on each side
  if (box.border && box.border !== '') {
    const borderMap: Record<string, string> = {
      'Thin': '1px',
      '1Point': '1px',
      '2Point': '2px',
      '4Point': '4px',
      'Dotted': '1px dotted',
      'Dashed': '1px dashed',
      'Double': '3px double'
    };

    const borderValue = borderMap[box.border] || '1px';
    const fullBorderStyle = `${borderValue} solid ${newBorderColor || '#000000'}`;

    // Apply it to all sides immediately
    box.topBorder = fullBorderStyle;
    box.leftBorder = fullBorderStyle;
    box.bottomBorder = fullBorderStyle;
    box.rightBorder = fullBorderStyle;

    // Update JRXML
    updateJRXML();
  }
});

// Watch for top-border changes
watch(() => currentElement.value?.box?.topBorder, (newTopBorder) => {
  if (!currentElement.value || !currentElement.value.box) return;

  // If the border style is an empty string, clear the top border
  if (!newTopBorder || newTopBorder === '') {
    // Border cleared; update JRXML
    updateJRXML();
    return;
  }

  // If the border is a style name (e.g. "Thin"), convert it to a full border style string
  if (['Thin', 'Medium', 'Thick', 'Dashed', 'Dotted', 'Double', '1Point', '2Point', '4Point'].includes(newTopBorder)) {
    const box = currentElement.value.box;
    const borderColor = box.topBorderColor || '#000000';

    const borderMap: Record<string, string> = {
      'Thin': '1px',
      '1Point': '1px',
      '2Point': '2px',
      '4Point': '4px',
      'Dotted': '1px dotted',
      'Dashed': '1px dashed',
      'Double': '3px double'
    };

    const borderValue = borderMap[newTopBorder] || '1px';
    box.topBorder = `${borderValue} solid ${borderColor}`;
    // Update JRXML
    updateJRXML();
  }
});

// Watch for left-border changes
watch(() => currentElement.value?.box?.leftBorder, (newLeftBorder) => {
  if (!currentElement.value || !currentElement.value.box) return;

  // If the border style is an empty string, clear the left border
  if (!newLeftBorder || newLeftBorder === '') {
    // Border cleared; update JRXML
    updateJRXML();
    return;
  }

  // If the border is a style name (e.g. "Thin"), convert it to a full border style string
  if (['Thin', 'Medium', 'Thick', 'Dashed', 'Dotted', 'Double', '1Point', '2Point', '4Point'].includes(newLeftBorder)) {
    const box = currentElement.value.box;
    const borderColor = box.leftBorderColor || '#000000';

    const borderMap: Record<string, string> = {
      'Thin': '1px',
      '1Point': '1px',
      '2Point': '2px',
      '4Point': '4px',
      'Dotted': '1px dotted',
      'Dashed': '1px dashed',
      'Double': '3px double'
    };

    const borderValue = borderMap[newLeftBorder] || '1px';
    box.leftBorder = `${borderValue} solid ${borderColor}`;
    // Update JRXML
    updateJRXML();
  }
});

// Watch for bottom-border changes
watch(() => currentElement.value?.box?.bottomBorder, (newBottomBorder) => {
  if (!currentElement.value || !currentElement.value.box) return;

  // If the border style is an empty string, clear the bottom border
  if (!newBottomBorder || newBottomBorder === '') {
    // Border cleared; update JRXML
    updateJRXML();
    return;
  }

  // If the border is a style name (e.g. "Thin"), convert it to a full border style string
  if (['Thin', 'Medium', 'Thick', 'Dashed', 'Dotted', 'Double', '1Point', '2Point', '4Point'].includes(newBottomBorder)) {
    const box = currentElement.value.box;
    const borderColor = box.bottomBorderColor || '#000000';

    const borderMap: Record<string, string> = {
      'Thin': '1px',
      '1Point': '1px',
      '2Point': '2px',
      '4Point': '4px',
      'Dotted': '1px dotted',
      'Dashed': '1px dashed',
      'Double': '3px double'
    };

    const borderValue = borderMap[newBottomBorder] || '1px';
    box.bottomBorder = `${borderValue} solid ${borderColor}`;
    // Update JRXML
    updateJRXML();
  }
});

// Watch for right-border changes
watch(() => currentElement.value?.box?.rightBorder, (newRightBorder) => {
  if (!currentElement.value || !currentElement.value.box) return;

  // If the border style is an empty string, clear the right border
  if (!newRightBorder || newRightBorder === '') {
    // Border cleared; update JRXML
    updateJRXML();
    return;
  }

  // If the border is a style name (e.g. "Thin"), convert it to a full border style string
  if (['Thin', 'Medium', 'Thick', 'Dashed', 'Dotted', 'Double', '1Point', '2Point', '4Point'].includes(newRightBorder)) {
    const box = currentElement.value.box;
    const borderColor = box.rightBorderColor || '#000000';

    const borderMap: Record<string, string> = {
      'Thin': '1px',
      '1Point': '1px',
      '2Point': '2px',
      '4Point': '4px',
      'Dotted': '1px dotted',
      'Dashed': '1px dashed',
      'Double': '3px double'
    };

    const borderValue = borderMap[newRightBorder] || '1px';
    box.rightBorder = `${borderValue} solid ${borderColor}`;
    // Update JRXML
    updateJRXML();
  }
});



// Start resizing a band's height
const startResizingBand = (event: MouseEvent, bandIndex: number): void => {
  event.preventDefault();

  // Automatically hide the bottom panel
  showBottomPanel.value = false;

  const startY = event.clientY;
  if (!bands.value || !bands.value[bandIndex]) return;

  // Get the current zoom scale
  const currentZoom = zoomLevel.value;
  const startHeight = bands.value[bandIndex].height;

  // Get the paper element's position info, for more accurate coordinate calculations
  const paperElement = document.querySelector('.paper') as HTMLElement;
  let paperOffsetY = 0;

  if (paperElement) {
    const paperRect = paperElement.getBoundingClientRect();
    // Offset accounting for the zoom scale
    paperOffsetY = paperRect.top;
  }

  // Show the band height adjustment tooltip
  const band = bands.value[bandIndex];
  resizingBandInfo.visible = true;
  resizingBandInfo.bandName = getBandDisplayName(band.type);
  resizingBandInfo.height = startHeight;

  const handleMouseMove = (e: MouseEvent): void => {
    if (!bands.value || !bands.value[bandIndex]) return;
    // Calculate the height change accounting for the zoom scale, using paperOffsetY for more accuracy
    const deltaY = (e.clientY - paperOffsetY) / currentZoom - (startY - paperOffsetY) / currentZoom;
    const newHeight = Math.max(BAND_CONSTANTS.MIN_HEIGHT, Math.round(startHeight + deltaY));

    // Update the band height
    bands.value = bands.value.map((b, i) => {
      if (i === bandIndex) {
        return { ...b, height: newHeight };
      }
      return b;
    });

    // Update the band height adjustment tooltip
    resizingBandInfo.bandName = bands.value[bandIndex] ? getBandDisplayName(bands.value[bandIndex].type) : '';
    resizingBandInfo.height = newHeight;

    // Position the band-height display element so it follows the mouse
    const bandHeightElement = document.querySelector('.band-height-display') as HTMLElement;
    if (bandHeightElement) {
      bandHeightElement.style.left = (e.clientX + 10) + 'px';
      bandHeightElement.style.top = (e.clientY - 30) + 'px';
    }

    // Adjust the positions of elements within this band so they don't exceed the band's bounds
    const band = bands.value[bandIndex];
    if (band && band.elements) {
      band.elements.forEach(element => {
        // Adjust the element's position accounting for the zoom scale
        if ((element.y + element.height) > newHeight) {
          element.y = Math.max(0, newHeight - element.height);
        }
      });
    }
  };

  const handleMouseUp = (): void => {
    // Hide the band height adjustment tooltip
    resizingBandInfo.visible = false;
    resizingBandInfo.bandName = '';
    resizingBandInfo.height = 0;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// Get the given Band's Y offset
const getBandOffsetY = (bandIndex: number): number => {
  let offset = 0;
  for (let i = 0; i < bandIndex; i++) {
    offset += bands.value[i]?.height || 0;
  }
  return offset;
};

// Start resizing an element
const startResizingElement = (event: MouseEvent, bandIndex: number, elementIndex: number, direction: string, parentFrameIndex?: number): void => {
  event.preventDefault();

  // Automatically hide the bottom panel
  showBottomPanel.value = false;

  const band = bands.value[bandIndex];
  let element;

  if (parentFrameIndex !== undefined) {
    const frame = band?.elements[parentFrameIndex];
    if (frame && frame.type === 'frame' && frame.elements) {
      element = frame.elements[elementIndex];
    }
  } else {
    element = band?.elements[elementIndex];
  }

  if (element) {
    // Get the current zoom scale
    const currentZoom = zoomLevel.value;

    // Get the paper element's position info, for more accurate coordinate calculations
    const paperElement = document.querySelector('.paper') as HTMLElement;
    let paperOffsetX = 0;
    let paperOffsetY = 0;

    if (paperElement) {
      const paperRect = paperElement.getBoundingClientRect();
      // Offset accounting for the zoom scale
      paperOffsetX = paperRect.left;
      paperOffsetY = paperRect.top;
    }

    resizingInfo.value = {
      bandIndex,
      elementIndex,
      startX: (event.clientX - paperOffsetX) / currentZoom,
      startY: (event.clientY - paperOffsetY) / currentZoom,
      startWidth: element.width,
      startHeight: element.height,
      parentFrameIndex
    };

    isDraggingOrResizing.value = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingInfo.value) return;

      const currentBand = bands.value[resizingInfo.value.bandIndex];
      if (!currentBand) return;

      let element: DesignElement | undefined;
      let containerWidth = (paperWidth.value - (reportProperties.value?.leftMargin || 0) - (reportProperties.value?.rightMargin || 0));
      let containerHeight = currentBand.height;

      if (resizingInfo.value.parentFrameIndex !== undefined) {
        const frame = currentBand.elements[resizingInfo.value.parentFrameIndex];
        if (frame && frame.type === 'frame' && frame.elements) {
          element = frame.elements[resizingInfo.value.elementIndex];
          containerWidth = frame.width;
          containerHeight = frame.height;
        }
      } else {
        element = currentBand.elements[resizingInfo.value.elementIndex];
      }

      if (!element) return;

      // Get the current zoom scale
      const currentZoom = zoomLevel.value;

      // Get the paper element's current position info, for more accurate coordinate calculations
      const paperEl = document.querySelector('.paper') as HTMLElement;
      let currentPaperOffsetX = 0;
      let currentPaperOffsetY = 0;

      if (paperEl) {
        const paperRect = paperEl.getBoundingClientRect();
        // Offset accounting for the zoom scale
        currentPaperOffsetX = paperRect.left;
        currentPaperOffsetY = paperRect.top;
      }

      // Calculate the new width and height, accounting for the zoom scale
      let newWidth = resizingInfo.value.startWidth + ((e.clientX - currentPaperOffsetX) / currentZoom - resizingInfo.value.startX);
      let newHeight = resizingInfo.value.startHeight + ((e.clientY - currentPaperOffsetY) / currentZoom - resizingInfo.value.startY);

      // Constrain the minimum size
      const minSize = 1;
      newWidth = Math.max(minSize, newWidth);
      newHeight = Math.max(minSize, newHeight);

      // Get the report's margin settings
      const { leftMargin = 0, rightMargin = 0 } = reportProperties.value;
      // Constrain the size so it doesn't exceed the paper's right boundary or the band's bottom boundary
      let maxElementWidth;
      if (resizingInfo.value.parentFrameIndex !== undefined) {
         maxElementWidth = containerWidth - element.x;
      } else {
         maxElementWidth = paperWidth.value - leftMargin - rightMargin - element.x;
      }

      const availableHeight = (containerHeight - element.y);
      newWidth = Math.min(newWidth, maxElementWidth);
      newHeight = Math.min(newHeight, availableHeight);

      // If the SHIFT key is held, preserve the original aspect ratio
      if (e.shiftKey) {
        // Calculate the original aspect ratio
        const aspectRatio = resizingInfo.value.startWidth / resizingInfo.value.startHeight;

        // Calculate the height derived from the width, and the width derived from the height
        const heightBasedOnWidth = newWidth / aspectRatio;
        const widthBasedOnHeight = newHeight * aspectRatio;

        // Choose whichever dimension is closer to the original ratio
        if (Math.abs(newHeight - heightBasedOnWidth) < Math.abs(newWidth - widthBasedOnHeight)) {
          // Use the width as the basis, and adjust the height
          newHeight = heightBasedOnWidth;
        } else {
          // Use the height as the basis, and adjust the width
          newWidth = widthBasedOnHeight;
        }

        // Constrain the size again to ensure it doesn't exceed the bounds
        newWidth = Math.max(minSize, Math.min(newWidth, maxElementWidth));
        newHeight = Math.max(minSize, Math.min(newHeight, availableHeight));
      } else if (e.altKey) {
        // If the ALT key is held, lock the aspect ratio to 1:1
        // Calculate the 1:1 height derived from the width, and the 1:1 width derived from the height
        const size1x1FromWidth = newWidth;
        const size1x1FromHeight = newHeight;

        // Use whichever dimension changed more as the basis
        const widthChange = Math.abs(newWidth - resizingInfo.value.startWidth);
        const heightChange = Math.abs(newHeight - resizingInfo.value.startHeight);

        if (widthChange >= heightChange) {
          // Use the width as the basis; height equals width
          newHeight = size1x1FromWidth;
        } else {
          // Use the height as the basis; width equals height
          newWidth = size1x1FromHeight;
        }

        // Constrain the size again to ensure it doesn't exceed the bounds
        newWidth = Math.max(minSize, Math.min(newWidth, maxElementWidth));
        newHeight = Math.max(minSize, Math.min(newHeight, availableHeight));
      }

      // First, store the temporary size
      const tempWidth = Math.round(newWidth);
      const tempHeight = Math.round(newHeight);

      // Special handling for table elements: automatically adjust column widths when the table width changes
      if (element.type === 'table') {
        // Look up the corresponding column within the children array (recursive search)
        const findColumnInChildren = (children: any[], targetColumn: any): any | null => {
          for (const child of children) {
            if (child.uuid === targetColumn.uuid) {
              return child;
            }
            if (child.children) {
              const found = findColumnInChildren(child.children, targetColumn);
              if (found) {
                return found;
              }
            }
          }
          return null;
        };

        if (element.columns && element.columns.length > 0) {
          // Get the current width of each column
          const columnWidths = element.columns.map(col => col.width || 0);
          const totalColumnWidth = columnWidths.reduce((sum, width) => sum + width, 0);

          if (totalColumnWidth > 0) {
            // Calculate the width ratio each column should receive
            const ratios = columnWidths.map(width => width / totalColumnWidth);

            // Distribute column widths proportionally based on the new table width
            const newColumnWidths = ratios.map(ratio => {
              // Distribute the new width proportionally
              const newColWidth = tempWidth * ratio;
              // Ensure every column has at least a minimum width
              return Math.max(10, Math.round(newColWidth));
            });

            // Adjust the last column's width so the total matches the table width
            const sumNewWidths = newColumnWidths.reduce((sum, width) => sum + width, 0);
            if (sumNewWidths !== tempWidth && newColumnWidths.length > 0) {
              const diff = tempWidth - sumNewWidths;
              const lastIndex = newColumnWidths.length - 1;
              // Ensure newColumnWidths[lastIndex] isn't undefined
              newColumnWidths[lastIndex] = (newColumnWidths[lastIndex] || 0) + diff;
            }

            // Update the width of every column
            element.columns.forEach((col, index) => {
              const newColWidth = newColumnWidths[index]!;
              col.width = newColWidth;

              // Also update the width of every cell within the column
              if (col.tableHeader && col.tableHeader.element) {
                col.tableHeader.element.width = newColWidth;
              }
              if (col.columnHeader && col.columnHeader.element) {
                col.columnHeader.element.width = newColWidth;
              }
              if (col.detailCell && col.detailCell.element) {
                col.detailCell.element.width = newColWidth;
              }
              if (col.columnFooter && col.columnFooter.element) {
                col.columnFooter.element.width = newColWidth;
              }
              if (col.tableFooter && col.tableFooter.element) {
                col.tableFooter.element.width = newColWidth;
              }

              // If the table has a children property, also update the width of the corresponding column within it
              if (element.children) {
                const childColumn = findColumnInChildren(element.children, col);
                if (childColumn) {
                  childColumn.width = newColWidth;

                  // Also update the width of every related cell within childColumn
                  if (childColumn.tableHeader) {
                    childColumn.tableHeader.width = newColWidth;
                  }
                  if (childColumn.columnHeader) {
                    childColumn.columnHeader.width = newColWidth;
                  }
                  if (childColumn.detailCell) {
                    childColumn.detailCell.width = newColWidth;
                  }
                  if (childColumn.columnFooter) {
                    childColumn.columnFooter.width = newColWidth;
                  }
                  if (childColumn.tableFooter) {
                    childColumn.tableFooter.width = newColWidth;
                  }
                }
              }
            });
          }
        }

        // Set the table's final width and height
        element.width = tempWidth;
      } else {
        // Non-table element; apply the size adjustment directly
        element.width = tempWidth;
      }

      // Apply the height adjustment
      element.height = tempHeight;

      // Re-run alignment-line detection using the final size (to ensure alignment lines display correctly)
      if (enableSnapToAlignment.value) {
        detectAlignmentLines(element, resizingInfo.value.bandIndex);
      }
    };

    const handleMouseUp = () => {
      // Clear the alignment lines
      clearAlignmentLines();

      // Save state to history
      saveStateToHistory();

      resizingInfo.value = null;
      isDraggingOrResizing.value = false;

      // Update JRXML
      updateJRXML();

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
}

// Clean up event listeners when the component unmounts
onUnmounted(() => {
  if ((window as any).pdfDesignerKeydownListener) {
    document.removeEventListener('keydown', (window as any).pdfDesignerKeydownListener);
    delete (window as any).pdfDesignerKeydownListener;
  }
});

// Donation-related state
const showReward = ref(false);

// Help-related state
const showHelp = ref(false);

// PDF preview related state
const showPdfPreview = ref(false);

// Preview server settings related state
const showPreviewServerSettings = ref(false);
const previewServerUrl = ref(localStorage.getItem('previewServerUrl') || 'http://localhost:8084/api/pdf/generateForm');

// Field management related state
const showFieldModal = ref(false);
const editingField = ref<ReportField | undefined>(undefined);
const editingParameter = ref<ReportParameter | undefined>(undefined);

// Variable management related state
const showVariableModal = ref(false);
const editingVariable = ref<ReportVariable | undefined>(undefined);

// Open the preview server settings
const openPreviewServerSettings = (): void => {
  showPreviewServerSettings.value = true;
};

// Update the preview server address
const updatePreviewServerUrl = (url: string): void => {
  previewServerUrl.value = url;
  localStorage.setItem('previewServerUrl', url);
};
const isEditingParameter = ref(false);

// Handle adding a field
const handleAddField = (): void => {
  editingField.value = undefined;
  isEditingParameter.value = false;
  showFieldModal.value = true;
};

// Handle editing a field
const handleEditField = (field: ReportField): void => {
  editingField.value = { ...field };
  isEditingParameter.value = false;
  showFieldModal.value = true;
};

// Handle deleting a field
const handleDeleteField = (fieldName: string): void => {
  if (confirm(`Are you sure you want to delete field "${fieldName}"?`)) {
    const fieldIndex = reportFields.value.findIndex(field => field.name === fieldName);
    if (fieldIndex !== -1) {
      reportFields.value.splice(fieldIndex, 1);
      saveStateToHistory();
      updateJRXML();
    }
  }
};

// Handle adding a report parameter
const handleAddParameter = (): void => {
  // Reuse the field management modal, since parameters and fields share a similar structure
  editingParameter.value = undefined;
  showFieldModal.value = true;
  isEditingParameter.value = true;
};

// Handle editing a report parameter
const handleEditParameter = (parameter: ReportParameter): void => {
  editingParameter.value = { ...parameter };
  showFieldModal.value = true;
  isEditingParameter.value = true;
};

// Handle deleting a report parameter
const handleDeleteParameter = (parameterName: string): void => {
  if (confirm(`Are you sure you want to delete parameter "${parameterName}"?`)) {
    const parameterIndex = reportParameters.value.findIndex(param => param.name === parameterName);
    if (parameterIndex !== -1) {
      reportParameters.value.splice(parameterIndex, 1);
      saveStateToHistory();
      updateJRXML();
    }
  }
};

// Handle adding a variable
const handleAddVariable = (): void => {
  editingVariable.value = undefined;
  showVariableModal.value = true;
};

// Handle editing a variable
const handleEditVariable = (variable: ReportVariable): void => {
  editingVariable.value = { ...variable };
  showVariableModal.value = true;
};

// Handle deleting a variable
const handleDeleteVariable = (variableName: string): void => {
  if (confirm(`Are you sure you want to delete variable "${variableName}"?`)) {
    const variableIndex = reportVariables.value.findIndex(v => v.name === variableName);
    if (variableIndex !== -1) {
      reportVariables.value.splice(variableIndex, 1);
      saveStateToHistory();
      updateJRXML();
    }
  }
};

// Handle saving a variable
const handleVariableSave = (variable: ReportVariable): void => {
  const existingIndex = reportVariables.value.findIndex(v => v.name === variable.name);
  if (existingIndex !== -1 && editingVariable.value?.name !== variable.name) {
    alert('A variable with this name already exists, please use a different name');
    return;
  }
  if (existingIndex !== -1) {
    reportVariables.value[existingIndex] = variable;
  } else {
    reportVariables.value.push(variable);
  }
  saveStateToHistory();
  updateJRXML();
};

// Style management related state
const showStyleModal = ref(false);
const editingStyle = ref<any | undefined>(undefined);

// Handle adding a style
const handleAddStyle = (): void => {
  editingStyle.value = undefined;
  showStyleModal.value = true;
};

// Handle editing a style
const handleEditStyle = (style: any): void => {
  editingStyle.value = { ...style, box: style.box ? { ...style.box } : undefined };
  showStyleModal.value = true;
};

// Handle deleting a style
const handleDeleteStyle = (styleName: string): void => {
  if (confirm(`Are you sure you want to delete style "${styleName}"?`)) {
    const styleIndex = reportStyles.value.findIndex(s => s.name === styleName);
    if (styleIndex !== -1) {
      reportStyles.value.splice(styleIndex, 1);
      saveStateToHistory();
      updateJRXML();
    }
  }
};

// Handle saving a style
const handleStyleSave = (style: any): void => {
  const existingIndex = reportStyles.value.findIndex(s => s.name === style.name);
  if (existingIndex !== -1 && editingStyle.value?.name !== style.name) {
    alert('A style with this name already exists, please use a different name');
    return;
  }
  if (existingIndex !== -1) {
    reportStyles.value[existingIndex] = style;
  } else {
    reportStyles.value.push(style);
  }
  saveStateToHistory();
  updateJRXML();
};

// Handle deleting an element
const handleDeleteElement = (bandIndex: number, elementIndex: number): void => {
  const band = bands.value[bandIndex];
  if (band && band.elements) {
    band.elements.splice(elementIndex, 1);
    saveStateToHistory();
    updateJRXML();
    // Clear the selection state
    if (selectedElement.value && selectedElement.value.bandIndex === bandIndex && selectedElement.value.elementIndex === elementIndex) {
      selectedElement.value = null;
      selectedElements.value = [];
    }
  }
};

// Handle saving a field
const handleFieldSave = (fieldOrParam: ReportField | ReportParameter): void => {
  if (isEditingParameter.value) {
    // Handle saving a parameter
    const existingParamIndex = reportParameters.value.findIndex(p => p.name === fieldOrParam.name);

    if (existingParamIndex !== -1 && editingParameter.value?.name !== fieldOrParam.name) {
      // If editing and a parameter with this name already exists, show an error
      alert('A parameter with this name already exists, please use a different name');
      return;
    }

    if (existingParamIndex !== -1) {
      // Update the existing parameter
      reportParameters.value[existingParamIndex] = fieldOrParam as ReportParameter;
    } else {
      // Add the new parameter
      reportParameters.value.push(fieldOrParam as ReportParameter);
    }
  } else {
    // Handle saving a field
    const existingFieldIndex = reportFields.value.findIndex(f => f.name === fieldOrParam.name);

    if (existingFieldIndex !== -1 && editingField.value?.name !== fieldOrParam.name) {
      // If editing and a field with this name already exists, show an error
      alert('A field with this name already exists, please use a different name');
      return;
    }

    if (existingFieldIndex !== -1) {
      // Update the existing field
      reportFields.value[existingFieldIndex] = fieldOrParam as ReportField;
    } else {
      // Add the new field
      reportFields.value.push(fieldOrParam as ReportField);
    }
  }

  saveStateToHistory();
  updateJRXML();
};

// Handle checking fields
const handleCheckFields = (fields: string[]): void => {
  let fieldsAdded = false;

  fields.forEach(fieldName => {
    // Check whether the field already exists
    const existingFieldIndex = reportFields.value.findIndex(f => f.name === fieldName);

    if (existingFieldIndex === -1) {
      // The field doesn't exist yet; add it automatically
      reportFields.value.push({
        name: fieldName,
        class: 'java.lang.String'
      });
      fieldsAdded = true;
    }
  });

  if (fieldsAdded) {
    // Save state to history
    saveStateToHistory();
    // Update JRXML
    updateJRXML();
  }
};

// Handle moving a table column
const handleMoveColumn = (elementIndex: number, fromIndex: number, toIndex: number, bandIndex: number, parentFrameIndex?: number): void => {
  // Get the current band
  const band = bands.value[bandIndex];
  if (!band) return;

  // Get the element to operate on
  let element;
  if (parentFrameIndex !== undefined) {
    // Handle an element inside a Frame
    const frame = band.elements[parentFrameIndex];
    if (frame && frame.type === 'frame' && frame.elements) {
      element = frame.elements[elementIndex];
    }
  } else {
    // Handle an element directly within a Band
    element = band.elements[elementIndex];
  }

  // Ensure it is a table element
  if (!element || element.type !== 'table') return;

  const tableElement = element as any;
  if (!tableElement.columns || !Array.isArray(tableElement.columns)) return;

  // Save state to history
  saveStateToHistory();

  // Perform the column move
  const columns = [...tableElement.columns];
  const [movedColumn] = columns.splice(fromIndex, 1);
  columns.splice(toIndex, 0, movedColumn);

  // Update the table's columns
  tableElement.columns = columns;

  // Update JRXML
  updateJRXML();
};

// Handle adding the selected columns to a group
const handleAddColumnsToGroup = (params: { elementIndex: number; columnIndices: number[]; bandIndex: number; parentFrameIndex?: number }): void => {
  const { elementIndex, columnIndices, bandIndex, parentFrameIndex } = params;

  // Get the current band
  const band = bands.value[bandIndex];
  if (!band) return;

  // Get the element to operate on
  let element;
  if (parentFrameIndex !== undefined) {
    // Handle an element inside a Frame
    const frame = band.elements[parentFrameIndex];
    if (frame && frame.type === 'frame' && frame.elements) {
      element = frame.elements[elementIndex];
    }
  } else {
    // Handle an element directly within a Band
    element = band.elements[elementIndex];
  }

  // Ensure it is a table element
  if (!element || element.type !== 'table') return;

  const tableElement = element as any;
  if (!tableElement.columns || !Array.isArray(tableElement.columns)) return;

  // Collect all existing column groups
  const existingGroups: any[] = [];

  // Recursively collect all groups
  const collectGroups = (items: any[]): void => {
    items.forEach(item => {
      if (item.children) {
        existingGroups.push(item);
        collectGroups(item.children);
      }
    });
  };

  // Initialize the children property if it doesn't exist
  if (!tableElement.children) {
    tableElement.children = [...tableElement.columns];
  }

  // Collect the existing groups
  collectGroups(tableElement.children);

  // Update the column selection dialog state
  columnSelectionState.value = {
    elementIndex,
    bandIndex,
    parentFrameIndex,
    columns: tableElement.columns,
    children: tableElement.children || tableElement.columns
  };

  // Show the column selection dialog
  showColumnSelectionModal.value = true;
};

// Handle confirmation of the column selection
const handleColumnSelectionConfirm = (selectedColumnIndices: number[], selectedRegion: string, groupText: string): void => {
  const { elementIndex, bandIndex, parentFrameIndex } = columnSelectionState.value;

  // Get the current band
  const band = bands.value[bandIndex];
  if (!band) return;

  // Get the element to operate on
  let element;
  if (parentFrameIndex !== undefined) {
    // Handle an element inside a Frame
    const frame = band.elements[parentFrameIndex];
    if (frame && frame.type === 'frame' && frame.elements) {
      element = frame.elements[elementIndex];
    }
  } else {
    // Handle an element directly within a Band
    element = band.elements[elementIndex];
  }

  // Ensure it is a table element
  if (!element || element.type !== 'table') return;

  const tableElement = element as any;
  if (!tableElement.columns || !Array.isArray(tableElement.columns)) return;

  // Ensure at least 2 columns are selected
  if (selectedColumnIndices.length < 2) return;

  // Save state to history
  saveStateToHistory();

  // Sort the selected column indices to process them left to right
  const sortedIndices = [...selectedColumnIndices].sort((a, b) => a - b);

  // Ensure sortedIndices isn't empty
  if (sortedIndices.length === 0) return;

  // Get the selected columns or groups (from the children array, since it includes combined columns)
  const selectedColumns = sortedIndices.map(index => tableElement.children[index]);

  // Calculate the group's width (recursively, to handle combined columns)
  function calculateWidth(item: any): number {
    if (item.children) {
      // A combined column; recursively sum the widths of all child columns
      return item.children.reduce((sum: number, child: any) => sum + calculateWidth(child), 0);
    } else {
      // A regular column; use its width directly
      return item.width || 0;
    }
  }

  const groupWidth = selectedColumns.reduce((sum: number, column: any) => sum + calculateWidth(column), 0);

  // Create the new column group (preserving the original combined-column structure)
  const newGroup: any = {
    uuid: crypto.randomUUID(),
    name: `Group_${Date.now()}`,
    width: groupWidth,
    children: selectedColumns // Use the selected items directly (including combined columns), rather than flattening the child columns
  };

  // Set the corresponding property based on the selected region
  const textContent = groupText || newGroup.name;
  if (selectedRegion === 'tableHeader') {
    newGroup.hasTableHeader = true;
    newGroup.tableHeader = {
      enable: true,
      element: {
        type: 'staticText',
        text: textContent,
        x: 0,
        y: 0,
        width: groupWidth,
        height: 30,
        textAlignment: 'Center',
        verticalAlignment: 'Middle'
      }
    };
  } else if (selectedRegion === 'columnHeader') {
    newGroup.columnHeader = {
      enable: true,
      element: {
        type: 'staticText',
        text: textContent,
        x: 0,
        y: 0,
        width: groupWidth,
        height: 30,
        textAlignment: 'Center',
        verticalAlignment: 'Middle'
      }
    };
  } else if (selectedRegion === 'columnFooter') {
    newGroup.columnFooter = {
      enable: true,
      element: {
        type: 'staticText',
        text: textContent,
        x: 0,
        y: 0,
        width: groupWidth,
        height: 30,
        textAlignment: 'Center',
        verticalAlignment: 'Middle'
      }
    };
  } else if (selectedRegion === 'tableFooter') {
    newGroup.tableFooter = {
      enable: true,
      element: {
        type: 'staticText',
        text: textContent,
        x: 0,
        y: 0,
        width: groupWidth,
        height: 30,
        textAlignment: 'Center',
        verticalAlignment: 'Middle'
      }
    };
  }

  // Initialize the children property if it doesn't exist
  if (!tableElement.children) {
    tableElement.children = [...tableElement.columns];
  }

  // Update the children array, removing the selected columns and adding the new group
  const newChildren = [...tableElement.children];

  // Remove the selected columns from last to first to avoid index shifting
  for (let i = sortedIndices.length - 1; i >= 0; i--) {
    const index = sortedIndices[i] as number;
    newChildren.splice(index, 1);
  }

  // Insert the new group at the position of the first selected column
  const firstIndex = sortedIndices[0] as number;
  newChildren.splice(firstIndex, 0, newGroup);

  // Update the table element
  tableElement.children = newChildren;

  // Calculate the maximum nesting depth of combined columns in the table
  function calculateMaxDepth(node: any, depth: number = 0): number {
    if (!node.children || node.children.length === 0) {
      return depth;
    }
    let maxDepth = depth;
    for (const child of node.children) {
      const childDepth = calculateMaxDepth(child, depth + 1);
      if (childDepth > maxDepth) {
        maxDepth = childDepth;
      }
    }
    return maxDepth;
  }

  // Calculate the maximum nesting depth
  const maxDepth = calculateMaxDepth({ children: tableElement.children });
  const requiredRowSpan = maxDepth;

  // Update the rowSpan value of ungrouped columns
  tableElement.children.forEach((child: any) => {
    if (!child.children) {
      // This is an ungrouped column
      if (child.tableHeader) {
        child.tableHeader.rowSpan = requiredRowSpan;
      }
      if (child.columnHeader) {
        child.columnHeader.rowSpan = requiredRowSpan;
      }
    }
  });

  // Sync columns, rebuilding it from children
  syncTableColumns(tableElement);

  // Update JRXML
  updateJRXML();
};

// Handle adding the selected columns to an existing group
const handleJoinColumnsToExistingGroup = (elementIndex: number, columnIndices: number[], bandIndex: number, parentFrameIndex?: number): void => {
  // Get the current band
  const band = bands.value[bandIndex];
  if (!band) return;

  // Get the element to operate on
  let element;
  if (parentFrameIndex !== undefined) {
    // Handle an element inside a Frame
    const frame = band.elements[parentFrameIndex];
    if (frame && frame.type === 'frame' && frame.elements) {
      element = frame.elements[elementIndex];
    }
  } else {
    // Handle an element directly within a Band
    element = band.elements[elementIndex];
  }

  // Ensure it is a table element
  if (!element || element.type !== 'table') return;

  const tableElement = element as any;
  if (!tableElement.columns || !Array.isArray(tableElement.columns)) return;

  // Ensure at least 1 column is selected
  if (columnIndices.length < 1) return;

  // Collect all existing column groups
  const existingGroups: any[] = [];

  // Recursively collect all groups
  const collectGroups = (items: any[]): void => {
    items.forEach(item => {
      if (item.children) {
        existingGroups.push(item);
        collectGroups(item.children);
      }
    });
  };

  // Initialize the children property if it doesn't exist
  if (!tableElement.children) {
    tableElement.children = [...tableElement.columns];
  }

  // Collect the existing groups
  collectGroups(tableElement.children);

  // Update the dialog state
  groupDialogState.value = {
    elementIndex,
    columnIndices,
    bandIndex,
    parentFrameIndex,
    existingGroups,
    selectedGroupName: ''
  };

  // Show the dialog
  showGroupDialog.value = true;
};

// Confirm adding the columns to a group
const confirmJoinColumnsToGroup = (): void => {
  const { elementIndex, columnIndices, bandIndex, parentFrameIndex, existingGroups, selectedGroupName } = groupDialogState.value;

  if (!selectedGroupName) {
    // If the user didn't enter a group name, return immediately
    return;
  }

  // Get the current band
  const band = bands.value[bandIndex];
  if (!band) return;

  // Get the element to operate on
  let element;
  if (parentFrameIndex !== undefined) {
    // Handle an element inside a Frame
    const frame = band.elements[parentFrameIndex];
    if (frame && frame.type === 'frame' && frame.elements) {
      element = frame.elements[elementIndex];
    }
  } else {
    // Handle an element directly within a Band
    element = band.elements[elementIndex];
  }

  // Ensure it is a table element
  if (!element || element.type !== 'table') return;

  const tableElement = element as any;
  if (!tableElement.columns || !Array.isArray(tableElement.columns)) return;

  // Save state to history
  saveStateToHistory();

  // Initialize the children array if it doesn't exist
  if (!tableElement.children) {
    tableElement.children = [...tableElement.columns];
  }

  // Sort the selected column indices to process them left to right
  const sortedIndices = [...columnIndices].sort((a, b) => a - b);

  // Get the selected columns from the children array (indices are derived from the children array)
  const selectedColumns = sortedIndices.map(index => tableElement.children[index]);

  // Look up the group specified by the user
  let targetGroup = existingGroups.find(group => group.name === selectedGroupName);

  // Build the new children array first, to avoid index-shift issues
  const newChildren = [...tableElement.children];

  // Remove the selected columns from last to first to avoid index shifting
  for (let i = sortedIndices.length - 1; i >= 0; i--) {
    const index = sortedIndices[i] as number;
    newChildren.splice(index, 1);
  }

  if (!targetGroup) {
    // If the group doesn't exist, create a new one
    const groupWidth = selectedColumns.reduce((sum: number, column: any) => sum + column.width, 0);

    let defaultTableHeaderHeight = 30;
    let defaultColumnHeaderHeight = 30;
    if (selectedColumns.length > 0 && selectedColumns[0]) {
      const firstColumn = selectedColumns[0];
      defaultTableHeaderHeight = firstColumn.tableHeader?.element?.height || 30;
      defaultColumnHeaderHeight = firstColumn.columnHeader?.element?.height || 30;
    }

    targetGroup = {
      uuid: crypto.randomUUID(),
      name: selectedGroupName,
      width: groupWidth,
      hasTableHeader: true,
      tableHeader: {
        enable: true,
        element: {
          type: 'staticText',
          text: selectedGroupName,
          x: 0,
          y: 0,
          width: groupWidth,
          height: defaultTableHeaderHeight,
          textAlignment: 'Center',
          verticalAlignment: 'Middle'
        }
      },
      children: []
    };

    // Insert the new group at the position of the first selected column
    const firstIndex = sortedIndices[0] as number;
    newChildren.splice(firstIndex, 0, targetGroup);
  }

  // Add the selected columns to the target group
  targetGroup.children.push(...selectedColumns);

  // Recalculate the target group's width
  targetGroup.width = targetGroup.children.reduce((sum: number, item: any) => sum + item.width, 0);

  // Update the target group's header width
  if (targetGroup.tableHeader && targetGroup.tableHeader.element) {
    targetGroup.tableHeader.element.width = targetGroup.width;
  }
  if (targetGroup.columnHeader && targetGroup.columnHeader.element) {
    targetGroup.columnHeader.element.width = targetGroup.width;
  }

  // Update the table element
  tableElement.children = newChildren;

  // Sync columns, rebuilding it from children (including rowSpan calculation)
  syncTableColumns(tableElement);

  // Update JRXML
  updateJRXML();

  // Close the dialog
  showGroupDialog.value = false;
};

// Handle the element context menu
const handleElementContextMenu = (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number): void => {
  event.preventDefault();
  event.stopPropagation();
  selectElement(bandIndex, elementIndex, false, parentFrameIndex);
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, type: 'element' };
};

// Handle the canvas context menu
const handleCanvasContextMenu = (event: MouseEvent): void => {
  event.preventDefault();
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, type: 'canvas' };
};

// Handle a context menu action
const handleContextMenuAction = (action: string) => {
  contextMenu.value.visible = false;
  switch (action) {
    case 'copy': copyElement(); break;
    case 'paste': pasteElement(); break;
    case 'delete': deleteElement(); break;
    case 'bringToFront': moveElementZOrder('front'); break;
    case 'sendToBack': moveElementZOrder('back'); break;
  }
};

// Move an element's Z-order
const moveElementZOrder = (direction: 'front' | 'back') => {
  if (!selectedElement.value) return;
  saveStateToHistory();
  const { bandIndex, elementIndex, parentFrameIndex } = selectedElement.value;
  const band = bands.value[bandIndex];
  if (!band) return;
  const elements = parentFrameIndex !== undefined
    ? (band.elements[parentFrameIndex] as any).elements
    : band.elements;
  if (!elements) return;
  const [element] = elements.splice(elementIndex, 1);
  if (direction === 'front') elements.push(element);
  else elements.unshift(element);
  const newIndex = direction === 'front' ? elements.length - 1 : 0;
  selectElement(bandIndex, newIndex, false, parentFrameIndex);
  updateJRXML();
};

// Handle Band selection changes
const handleBandSelectionChange = (): void => {
  // Get the currently selected band types
  const currentSelectedTypes = [...selectedBandTypes.value] as BandType[];

  // Get the types currently present in bands
  const currentBandTypes = bands.value.map(band => band.type);

  // Determine which bands need to be added (present in selectedBandTypes but not in currentBandTypes)
  const bandsToAdd = currentSelectedTypes.filter(type => !currentBandTypes.includes(type));

  // Determine which bands need to be removed (present in currentBandTypes but not in selectedBandTypes)
  const bandsToRemove = currentBandTypes.filter(type => !currentSelectedTypes.includes(type));

  // Remove the bands that are no longer needed
  if (bandsToRemove.length > 0) {
    bands.value = bands.value.filter(band => !bandsToRemove.includes(band.type));
  }

  // Add the new bands
  if (bandsToAdd.length > 0) {
    const newBands = bandsToAdd.map(type => {
      const bandTypeConfig = allBandTypes.find(bt => bt.type === type);
      return {
        type: type as BandType,
        height: bandTypeConfig ? bandTypeConfig.defaultHeight : 50,
        elements: []
      };
    });

    // Insert the new bands in the order defined by allBandTypes
    allBandTypes.forEach(bandType => {
      if (bandsToAdd.includes(bandType.type as BandType)) {
        const newBand = newBands.find(b => b.type === bandType.type);
        if (newBand) {
          // Ensure the height property isn't undefined
          if (newBand.height === undefined) {
            newBand.height = BAND_HEIGHT_CONSTANTS[bandType.type] || 50;
          }
          // Find the appropriate insertion position
          let insertIndex = bands.value.length;
          for (let i = 0; i < bands.value.length; i++) {
            const currentBandTypeIndex = allBandTypes.findIndex(bt => bt.type === bands.value[i]?.type);
            const newBandTypeIndex = allBandTypes.findIndex(bt => bt.type === bandType.type);
            if (newBandTypeIndex < currentBandTypeIndex) {
              insertIndex = i;
              break;
            }
          }
          // Use a type assertion to ensure newBand satisfies the Band interface
          bands.value.splice(insertIndex, 0, newBand as Band);
        }
      }
    });
  }

  // Save state to history
  saveStateToHistory();

  // Update JRXML
  updateJRXML();
};
</script>

<style scoped>

.my-act-menu {
  position: relative;
  display: inline-block;
}

.dropdown-arrow {
  margin-left: 6px;
  font-size: 12px;
}

.my-act-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 150px;
  padding: 6px;
  background: rgba(18, 19, 28, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.my-act-dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: rgba(244, 244, 245, 0.9);
  cursor: pointer;
  text-align: left;
  font-size: 13px;
}

.my-act-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.my-act-dropdown-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Group name input dialog styles */
.group-dialog {
  width: 400px;
}

.existing-groups-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.existing-group-tag {
  display: inline-block;
  padding: 4px 12px;
  background-color: #f0f0f0;
  border: 1px solid #d9d9d9;
  border-radius: 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.existing-group-tag:hover {
  background-color: #e6f7ff;
  border-color: #91d5ff;
  color: #1890ff;
}

/* CSS variable definitions */
:root {
  --primary-color: #1890ff;
  --primary-hover: #40a9ff;
  --text-color: #333;
  --border-color: #ddd;
  --hover-color: #f0f0f0;
  --font-size-medium: 14px;
}

.pdf-designer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: Arial, sans-serif;
}

/* Right panel tab styles */
.right-panel-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  background-color: #fafafa;
}

.right-panel-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.right-panel-tab:hover {
  background-color: #f0f0f0;
  color: var(--primary-color);
}

.right-panel-tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background-color: #fff;
}

.right-panel-settings-btn {
  padding: 8px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.2s;
  border-left: 1px solid #e0e0e0;
}

.right-panel-settings-btn:hover {
  background-color: #f0f0f0;
  color: var(--primary-color);
}

.ai-panel-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.designer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  height: 60px;
  flex-shrink: 0;
}

.designer-header h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-undo-redo {
  display: flex;
  gap: 6px;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.snap-controls-header {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 0 8px;
  border-left: 1px solid #ddd;
  border-right: 1px solid #ddd;
  margin: 0 4px;
}

.designer-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 v-bind('UI_CONSTANTS.BORDER_MEDIUM + "px"') #1890ff;
  }
  50% {
    box-shadow: 0 0 0 v-bind('UI_CONSTANTS.BORDER_THICK + "px"') rgba(24, 144, 255, 0.5);
  }
  100% {
    box-shadow: 0 0 0 v-bind('UI_CONSTANTS.BORDER_MEDIUM + "px"') #1890ff;
  }
}

/* Coordinate display styles */
.coordinates-display, .band-height-display {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: v-bind('UI_CONSTANTS.SMALL_MARGIN + "px"') v-bind('UI_CONSTANTS.MEDIUM_MARGIN + "px"');
  border-radius: v-bind('UI_CONSTANTS.BORDER_RADIUS_SMALL + "px"');
  font-size: v-bind('UI_CONSTANTS.FONT_SIZE_TINY + "px"');
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
}

.empty-state p {
  margin: 0 0 10px 0;
}

/* Right-click context menu */
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
}

.context-menu {
  position: fixed;
  min-width: 160px;
  background: var(--prop-bg-primary, #fff);
  border: 1px solid var(--prop-border-color, #d9d9d9);
  border-radius: var(--prop-border-radius-md, 4px);
  box-shadow: var(--prop-shadow-md, 0 3px 6px -4px rgba(0,0,0,0.12), 0 6px 16px 0 rgba(0,0,0,0.08));
  padding: 4px 0;
  z-index: 10001;
}

.context-menu-items {
  display: flex;
  flex-direction: column;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--prop-text-primary, #333);
  cursor: pointer;
  transition: background-color 0.1s;
}

.context-menu-item:hover {
  background-color: var(--prop-bg-hover, #f0f0f0);
}

.context-menu-divider {
  height: 1px;
  background-color: var(--prop-divider-color, #f0f0f0);
  margin: 4px 0;
}

.menu-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

/* Toolbar action buttons */
.header-toolbar-ops {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--prop-divider-color, #f0f0f0);
  margin: 0 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.1s;
}

.toolbar-btn:hover {
  background-color: var(--prop-bg-hover, #f0f0f0);
}

</style>
