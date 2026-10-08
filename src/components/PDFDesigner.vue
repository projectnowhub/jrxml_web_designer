<template>
  <div class="pdf-designer">
    <div class="designer-header">
      <div class="header-left header-workflow">
        <!-- 1. Logo & App Name (Option C) -->
        <div class="brand-wrap">
          <div class="brand-img">
            <img src="/assets/cdp-logo.png" alt="ProjectNow CDP" />
          </div>
          <div class="brand-name">
            <span class="brand-text">ProjectNow CDP</span>
            <span class="brand-badge">REPORT STUDIO</span>
          </div>
        </div>

        <!-- 2. File Name (Inline Editable Google Docs Style) & Auto-save Status -->
        <div class="document-title-wrap">
          <input
            v-model="headerFileName"
            class="document-title-input"
            @focus="isTitleEditing = true"
            @blur="handleHeaderTitleCommit"
            @keydown.enter.prevent="onTitleEnter"
            :placeholder="t('editorHeader.untitledReport')"
            :title="t('editorHeader.renameReport')"
          />
          <div class="auto-save-badge" :title="saveStatusTitle">
            <span v-if="saveStatus === 'saving'" class="save-status-text saving">
              <span class="save-spinner"></span>
              {{ t("editorHeader.saving") }}
            </span>
            <span v-else-if="saveStatus === 'error'" class="save-status-text error">
              {{ t("editorHeader.saveFailed") }}
            </span>
            <span v-else class="save-status-text saved">
              <Check class="saved-icon" :size="13" :stroke-width="2.5" />
              {{ t("editorHeader.saved") }}
            </span>
          </div>
        </div>

        <span class="toolbar-divider"></span>

        <!-- 3. File Manager -->
        <FileManager
          :current-file-name="currentFileName"
          :current-file-id="currentFileId"
          @create-new-file="createNewFile"
          @load-file="loadFile"
          @update:currentFileName="currentFileName = $event"
          @update:currentFileId="currentFileId = $event"
        />

        <span class="toolbar-divider"></span>

        <!-- 4. Undo / Redo -->
        <div class="header-undo-redo">
          <n-button
            @click="undo"
            type="default"
            quaternary
            circle
            :title="t('actions.undo') + ' (Ctrl+Z)'"
          >
            <Undo2 :size="16" :stroke-width="2" aria-hidden="true" />
          </n-button>
          <n-button
            @click="redo"
            type="default"
            quaternary
            circle
            :title="t('actions.redo') + ' (Ctrl+Y)'"
          >
            <Redo2 :size="16" :stroke-width="2" aria-hidden="true" />
          </n-button>
        </div>

        <span class="toolbar-divider"></span>

        <!-- 5. Delete, Copy, Paste, Add Page -->
        <div class="header-toolbar-ops">
           <button
            class="toolbar-btn add-page-btn"
            @click="addNewPage()"
            :title="t('editorHeader.addNewPage')"
          >
            <FilePlus :size="16" :stroke-width="2" aria-hidden="true" />
            <span>{{ t("editorHeader.pageButton") }}</span>
          </button>
          <button class="toolbar-btn" @click="deleteElement" :title="t('actions.delete')">
            <Trash2 :size="16" :stroke-width="2" aria-hidden="true" />
          </button>
          <button class="toolbar-btn" @click="copyElement" :title="t('actions.copy')">
            <Copy :size="16" :stroke-width="2" aria-hidden="true" />
          </button>
          <button class="toolbar-btn" @click="pasteElement()" :title="t('actions.paste')">
            <ClipboardPaste :size="16" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>

        <span class="toolbar-divider"></span>

        <!-- 6. Zoom controls -->
        <ZoomControls
          :zoom-level="zoomLevel"
          :paper-width="reportProperties.pageWidth"
          @update:zoomLevel="setZoomLevel($event)"
        />

        <span class="toolbar-divider"></span>

        <!-- 7. Show Bottom Panel -->
        <n-button @click="toggleBottomPanel" type="default" size="small" class="bottom-panel-btn">
          {{
            showBottomPanel
              ? t("actions.hideBottomPanel")
              : t("actions.showBottomPanel")
          }}
        </n-button>

        <span class="toolbar-divider"></span>

        <!-- 8. Snap controls -->
        <div class="snap-controls-header" :title="t('actions.snapBypassHint')">
          <n-checkbox
            :checked="enableSnapToGrid"
            size="small"
            @update:checked="enableSnapToGrid = $event"
          >
            {{ t("actions.snapToGrid") }}
          </n-checkbox>
          <n-checkbox
            :checked="enableSnapToAlignment"
            size="small"
            @update:checked="
              enableSnapToAlignment = $event;
              if (!$event) clearAlignmentLines();
            "
          >
            {{ t("actions.snapToAlignment") }}
          </n-checkbox>
          <n-checkbox
            :checked="showGrid"
            size="small"
            @update:checked="showGrid = $event"
          >
            {{ t("actions.showGrid") }}
          </n-checkbox>
        </div>
        <span class="toolbar-divider"></span>
      </div>

      <div class="header-actions">
        <!-- 9. Preview PDF -->
        <SplitButton
          :actions="[
            {
              label: t('actions.previewPDF'),
              handler: openPdfPreview,
              class: 'btn-primary',
            },
            {
              label: t('actions.downloadJRXML'),
              handler: downloadJRXML,
              class: 'btn-primary',
            },
          ]"
        />

        <!-- 10. Account menu (language, profile, sign out) -->
        <AccountMenu />
      </div>
    </div>

    <!-- Coordinate display element -->
    <div v-if="dragCoordinates.visible" class="coordinates-display">
      {{
        t("designer.coordinates", {
          bandName: dragCoordinates.bandName,
          x: dragCoordinates.x,
          y: dragCoordinates.y,
        })
      }}
    </div>

    <!-- Band height adjustment tooltip -->
    <div v-if="resizingBandInfo.visible" class="band-height-display">
      {{
        t("editorHeader.bandHeight", {
          bandName: resizingBandInfo.bandName,
          height: resizingBandInfo.height,
        })
      }}
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
        :title="t('elementLibrary.title')"
      >
        <template #default="{ toggleCollapse }">
        <ElementLibrary
          :elements="elements"
          :report-fields="reportFields"
          :report-parameters="reportParameters"
          :report-variables="reportVariables"
          :bands="bands"
          :projects="reportProjects"
          @drag-start="handleDragStart"
          @element-double-click="handleElementDoubleClick"
          @insert-page-number="addPageNumber"
          @insert-chart="addChart"
          @update-projects="setReportProjects"
          @add-field="handleAddField"
          @edit-field="handleEditField"
          @delete-field="handleDeleteField"
          @add-parameter="handleAddParameter"
          @edit-parameter="handleEditParameter"
          @delete-parameter="handleDeleteParameter"
          @add-variable="handleAddVariable"
          @edit-variable="handleEditVariable"
          @delete-variable="handleDeleteVariable"
        >
          <template #header-actions>
            <PanelToggleButton side="left" :collapsed="false" @toggle="toggleCollapse" />
          </template>
        </ElementLibrary>
        </template>
      </ResizablePanel>

      <!-- Center design area -->
      <div
        class="design-area-wrapper"
        style="position: relative; flex: 1; overflow: auto"
      >
        <MultiSelectToolbar
          :visible="selectedElements.length > 1"
          :count="selectedElements.length"
          @align="handleMultiAlign"
          @distribute="handleMultiDistribute"
          @resize="handleMultiResize"
        />
        <AlignmentGuides
          :guides="
            activeAlignmentGuides.map((g) => ({
              id: g.id,
              type: g.type,
              position: g.position,
              label: g.label,
              active: g.active,
            }))
          "
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
          :drop-target-blocked="dropTargetBlocked"
          :background-drop-target="backgroundDropTarget"
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
          :total-pages="totalPages"
          @set-design-area-focused="setDesignAreaFocused"
          @select-band="selectBand"
          @select-element="selectElement"
          @start-dragging="startDragging"
          @start-resizing-element="startResizingElement"
          @auto-fit-height="autoFitElementHeight"
          @start-editing="startEditing"
          @finish-editing="finishEditing"
          @cancel-editing="cancelEditing"
          @handle-drop="handleDrop"
          @handle-drag-over="handleDragOver"
          @handle-drag-leave="handleDragLeave"
          @start-resizing-band="startResizingBand"
          @zoom-change="handleZoomChange"
          @select-elements-in-rect="selectElementsInRect"
          @clear-selection="clearSelection"
          @check-fields="handleCheckFields"
          @contextmenu="handleElementContextMenu"
          @canvas-contextmenu="handleCanvasContextMenu"
          @reset-zoom="resetZoom"
          @update:enable-snap-to-grid="enableSnapToGrid = $event"
          @update:enable-snap-to-alignment="enableSnapToAlignment = $event"
          @update:show-grid="showGrid = $event"
          @add-page="addNewPage"
          @delete-page="deletePage"
          @rotate="handleElementRotate"
          @save-state="saveStateToHistory"
          @update-jrxml="updateJRXML"
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
        :title="rightPanelTab === 'ai' ? t('ai.title') : t('properties.title')"
      >
        <template #default="{ toggleCollapse }">
        <!-- Right panel tabs -->
        <div class="right-panel-tabs">
          <div
            class="right-panel-seg"
            role="tablist"
            :style="{ '--tab-index': rightPanelTab === 'ai' ? 1 : 0 }"
          >
            <span class="right-panel-indicator" aria-hidden="true"></span>
            <button
              type="button"
              role="tab"
              class="right-panel-tab"
              :class="{ active: rightPanelTab === 'properties' }"
              :aria-selected="rightPanelTab === 'properties'"
              @click="rightPanelTab = 'properties'"
            >
              <SlidersHorizontal :size="14" :stroke-width="2" aria-hidden="true" />
              {{ t("properties.title") }}
            </button>
            <button
              type="button"
              role="tab"
              class="right-panel-tab"
              :class="{ active: rightPanelTab === 'ai' }"
              :aria-selected="rightPanelTab === 'ai'"
              @click="rightPanelTab = 'ai'"
            >
              <Sparkles :size="14" :stroke-width="2" aria-hidden="true" />
              {{ t("ai.title") }}
            </button>
          </div>
          <button
            v-if="rightPanelTab === 'ai'"
            type="button"
            class="right-panel-settings-btn"
            :title="t('ai.configure')"
            :aria-label="t('ai.configure')"
            @click="toggleAISettings"
          >
            <Settings :size="15" :stroke-width="2" aria-hidden="true" />
          </button>
          <PanelToggleButton side="right" :collapsed="false" @toggle="toggleCollapse" />
        </div>

        <!-- Element properties component -->
        <Transition name="right-panel-fade">
        <div v-show="rightPanelTab === 'properties'">
          <ElementProperties
            :selected-band-index="selectedBandIndex"
            :selected-element="selectedElement"
            :bands="bands"
            :report-properties="reportProperties"
            :table-styles="tableStyles"
            :report-fields="reportFields"
            :report-parameters="reportParameters"
            :report-variables="reportVariables"
            @update:bands="bands = $event"
            @delete-element="deleteElement"
            @update-jrxml="updateJRXML"
            @save-state="saveStateToHistory"
            @fit-to-text="
              selectedElement &&
                autoFitElementHeight(
                  selectedElement.bandIndex,
                  selectedElement.elementIndex,
                  selectedElement.parentFrameIndex,
                )
            "
            @save-table-style="saveTableStyle"
            @update-table-style="updateTableStyle"
            @rename-table-style="renameTableStyle"
            @delete-table-style="deleteTableStyle"
            @configure-table="openTableConfigForSelection"
            @configure-chart="openChartConfigForSelection"
          />
        </div>

        </Transition>

        <!-- AI Assistant panel -->
        <Transition name="right-panel-fade">
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
        </Transition>
        </template>
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
      @update:visible="showBottomPanel = $event"
      @size-change="handleBottomPanelSizeChange"
      @update:report-properties="reportProperties = $event"
      @save-state="saveStateToHistory"
      @page-setup-change="handlePageSetupChange"
      @update:selected-band-types="selectedBandTypes = $event"
      @update:jrxml-content="jrxmlContent = $event"
      @copy-jrxml="copyJRXML"
      @save-jrxml="saveJRXML"
      @regenerate-jrxml="regenerateJRXML"
      @download-jrxml="downloadJRXML"
      @open-preview="openPdfPreview"
      @band-selection-change="handleBandSelectionChange"
    />

    <!-- Drag feedback layer -->
    <DragFeedbackLayer :feedback="dragFeedback" />

    <!-- Help modal -->
    <HelpModal v-model:visible="showHelp" />

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

    <!-- PDF preview modal -->
    <PdfPreviewModal
      :visible="showPdfPreview"
      :jrxml-content="jrxmlContent"
      :bands="bands"
      :report-parameters="reportParameters"
      :report-fields="reportFields"
      @update:visible="showPdfPreview = $event"
      @edit-table="openTableConfigByUuid"
    />

    <!-- Data table setup: source, columns, filters, sort, totals, theme -->
    <TableConfigModal
      v-model:visible="tableConfig.visible"
      :table="tableConfigTable"
      :table-width="tableConfigWidth"
      :projects="reportProjects"
      :initial-project-id="tableConfig.projectId"
      :initial-source-id="tableConfig.sourceId"
      :initial-column-key="tableConfig.columnKey"
      :existing-table-names="usedTableNames(bands)"
      :existing-dataset-names="usedDatasetNames(bands)"
      @apply="applyTableConfig"
    />

    <!-- Chart setup: type, source, what to show, filters -->
    <ChartConfigModal
      v-model:visible="chartConfig.visible"
      :binding="chartConfigElement?.binding"
      :chart-size="{ width: chartConfigElement?.width ?? 320, height: chartConfigElement?.height ?? 200 }"
      :projects="reportProjects"
      :initial-project-id="chartConfig.projectId"
      :initial-source-id="chartConfig.sourceId"
      :initial-column-key="chartConfig.columnKey"
      @apply="applyChartConfig"
    />

    <!-- Right-click context menu -->
    <div
      v-if="contextMenu.visible"
      class="context-menu-overlay"
      @click="contextMenu.visible = false"
      @contextmenu.prevent="contextMenu.visible = false"
    >
      <div
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      >
        <div v-if="contextMenu.type === 'element'" class="context-menu-items">
          <div
            class="context-menu-item"
            @click="handleContextMenuAction('copy')"
          >
            <Copy class="menu-icon" :size="16" />
            {{ t("actions.copy") }}
          </div>
          <div
            class="context-menu-item"
            @click="handleContextMenuAction('paste')"
          >
            <ClipboardPaste class="menu-icon" :size="16" />
            {{ t("actions.paste") }}
          </div>
          <div class="context-menu-divider"></div>
          <div
            class="context-menu-item"
            @click="handleContextMenuAction('delete')"
          >
            <Trash2 class="menu-icon" :size="16" />
            {{ t("actions.delete") }}
          </div>
          <div class="context-menu-divider"></div>
          <div
            class="context-menu-item"
            @click="handleContextMenuAction('bringToFront')"
          >
            <BringToFront class="menu-icon" :size="16" />
            {{ t("editor.contextMenu.bringToFront") }}
          </div>
          <div
            class="context-menu-item"
            @click="handleContextMenuAction('sendToBack')"
          >
            <SendToBack class="menu-icon" :size="16" />
            {{ t("editor.contextMenu.sendToBack") }}
          </div>
          <!-- Item inside a box or frame: one of the two, never both -->
          <template v-if="selectedBoxItem">
            <div class="context-menu-divider"></div>
            <div
              v-if="selectedBoxItem.isPart"
              class="context-menu-item"
              @click="handleContextMenuAction('moveOutOfBox')"
            >
              <SquareArrowOutDownRight class="menu-icon" :size="16" />
              {{ t("framePresets.moveOutOfBox") }}
            </div>
            <div
              v-else
              class="context-menu-item"
              @click="handleContextMenuAction('addToBox')"
            >
              <SquarePlus class="menu-icon" :size="16" />
              {{ t("framePresets.addToBox") }}
            </div>
          </template>
        </div>
        <div v-else class="context-menu-items">
          <div
            class="context-menu-item"
            @click="handleContextMenuAction('paste')"
          >
            <ClipboardPaste class="menu-icon" :size="16" /> {{ t("actions.paste") }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ResizablePanel from "./panels/ResizablePanel.vue";
import DesignerCanvas from "./designer/DesignerCanvas.vue";
import HelpModal from "./modals/HelpModal.vue";
import FieldManagementModal from "./modals/FieldManagementModal.vue";
import PdfPreviewModal from "./modals/PdfPreviewModal.vue";
import TableConfigModal from "./modals/TableConfigModal.vue";
import ChartConfigModal from "./modals/ChartConfigModal.vue";
import { chartDataVersion, ensureChartData } from "../utils/chart/chartDataStore";
import VariableManagementModal from "./modals/VariableManagementModal.vue";
import BaseModal from "./modals/BaseModal.vue";
import BottomPanel from "./panels/BottomPanel.vue";
import PanelToggleButton from "./panels/PanelToggleButton.vue";
import AIChatPanel from "./ai/AIChatPanel.vue";
import ElementLibrary from "./ElementLibrary.vue";
import FileManager from "./designer/controls/FileManager.vue";
import ZoomControls from "./designer/controls/ZoomControls.vue";
import ElementProperties from "./designer/properties/ElementProperties.vue";
import AccountMenu from "./common/AccountMenu.vue";
import SplitButton from "./common/SplitButton.vue";
import MultiSelectToolbar from "./designer/MultiSelectToolbar.vue";
import AlignmentGuides from "./designer/AlignmentGuides.vue";
import DragFeedbackLayer from "./designer/DragFeedbackLayer.vue";
import { NButton, NSelect, NCheckbox } from "naive-ui";
import {
  BringToFront,
  Check,
  ClipboardPaste,
  Copy,
  FilePlus,
  Redo2,
  SendToBack,
  Settings,
  SlidersHorizontal,
  Sparkles,
  SquareArrowOutDownRight,
  SquarePlus,
  Trash2,
  Undo2,
} from "@lucide/vue";
import type {
  Band,
  BandType,
  ChartElement,
  DesignElement,
  DraggingInfo,
  EditingElementInfo,
  FrameElement,
  ReportField,
  ReportParameter,
  ReportProperties,
  ReportVariable,
  SelectedElementInfo,
  TableDataset,
  TableElement,
} from "../types";
import type {
  ChartBinding,
  ChartType,
  DataColumn,
  ProjectField,
  ReportProject,
  SavedTableStyle,
  TableDataBinding,
  TableLook,
} from "@/types/dataSource";
import {
  applyProjectValue,
  canTakeProjectField,
  countProjectUsage,
  projectFieldSize,
} from "@/utils/projectFields";
import {
  endDataSourceDrag,
  isDataSourceDrag,
  readDataSourceDrag,
  type DataSourceDragPayload,
} from "@/utils/table/dataDrag";
import { MIN_TABLE_COLUMN_WIDTH, maxColumnsForWidth } from "@/utils/table/dataBinding";
import {
  PLACEHOLDER_COLUMN_COUNT,
  evenColumnWidths,
  scaleColumnWidths,
  snapTableHeight,
  tableHeight,
  toColumnBinding,
} from "@/utils/table/dataTable";
import { createTableStyleId, parseSavedTableStyles, resolveLook } from "@/utils/table/tableThemes";
import {
  collectBoundTables,
  ensureUniqueTableDatasets,
  usedDatasetNames,
  usedTableNames,
} from "@/utils/table/tableDocument";
import type { DesignerFile } from "@/types/designerFile";
import type { MCPContext } from "@/mcp";
import { checkWebMCPSupport } from "@/utils/browserCompatibility";
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
  getCurrentInstance,
} from "vue";
import { useI18n } from "vue-i18n";
import { useDesignerFiles } from "@/composables/useDesignerFiles";
import { useUndoRedo } from "@/composables/useUndoRedo";
import { useZoom } from "@/composables/useZoom";
import { useSnapAlignment } from "@/composables/useSnapAlignment";
import { fitContentToPage } from "@/utils/pageFit";
import { planBandFit, type BandFitPlan } from "@/utils/bandFit";
import { planTextFit, type TextFitElement } from "@/utils/textFit";
import {
  nextGridLine,
  snapEdge,
  snapMove,
  snapToGrid,
  type SnapGuides,
  type SnapOptions,
  type SnapRect,
  type SnapTargets,
} from "@/utils/snapping";
import {
  ALL_CONFIGURABLE_BANDS,
  BAND_CONSTANTS,
  BAND_HEIGHT_CONSTANTS,
  BAND_TYPE_CONSTANTS,
  getEffectiveDefaultBandLimits,
  getEffectiveDefaultBandConfig,
  ELEMENT_CONSTANTS,
  FONT_CONSTANTS,
  getDefaultElementSize,
  HISTORY_CONSTANTS,
  KEYBOARD_CONSTANTS,
  PANEL_CONSTANTS,
  REPORT_CONSTANTS,
  UI_CONSTANTS,
  ZOOM_CONSTANTS,
} from "../constants/constants";

// Import newly created utility functions and constants
import { getBandDisplayName } from "../utils/bandUtils";
import {
  buildRulerMarks,
  type RulerLabel,
  type RulerTick,
} from "../utils/rulerUtils";

import { loadFromLocalStorage, saveToLocalStorage } from "../utils/fileUtils";

// Import element bounds validation utility
import { getOutOfBoundsElements } from "../utils/elementBoundsValidator";
import {
  calculateTextElementHeight,
  measureTextElementWidth,
  ensureUniqueUuids,
  refreshUuids,
} from "../utils/elementUtils";
import {
  applyBorderPreset,
  buildFrameTemplate,
  clampPositionInBox,
  clampRectInBox,
  findPageBorder,
  isBoxPart,
  resetBoxPhotos,
  markBoxPart,
  releaseBoxPart,
  fitChildrenToFrame,
  isFrameTemplateType,
  PAGE_BORDER_TYPE,
  type FrameTemplateContext,
} from "../utils/framePresets";
import { useBoundaryDetection } from "@/composables/useBoundaryDetection";
import { useAlignmentSystem } from "@/composables/useAlignmentSystem";
import { useDragFeedback } from "@/composables/useDragFeedback";

// Ensure DOMParser is available in the browser environment
// Removed the unused getDOMParser function
import {
  generateJRXMLContent,
  parseJRXMLContent,
} from "../utils/jrxmlGenerator";

// Import the notification manager
import notification from "../utils/notification";
import {
  buildPaginationElement,
  findPaginationTargetBand,
  isPagination,
  PAGE_NUMBER_TYPE,
  placePaginationInBand,
  type PaginationPosition,
} from "../utils/paginationPresets";
import { buildChartElement } from "../utils/chart/chartElement";
import {
  createElement,
  getAllElements as getAllElementConfigs,
} from "@/components/elements/ElementRegistry";

// Import the default JRXML example file

const { t } = useI18n();

// Tab-related state
const activeTab = ref("pageSettings");

// Panel visibility state
const showLeftPanel = ref(true);
const showRightPanel = ref(true);
const showBottomPanel = ref(false);
const showAIChat = ref(false);
const aiChatPanelHeight = ref(300);
const rightPanelTab = ref("properties"); // 'properties' or 'ai'

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
  selectedElements: selectedElements.value,
}));

// Force-update function, used to trigger a UI refresh after a tool executes
function forceUpdateUI() {
  console.log("forceUpdateUI called");
  console.log("bands.value before update:", bands.value);

  // Create a new array via deep clone so Vue detects the change
  const newBands = JSON.parse(JSON.stringify(bands.value));
  bands.value = newBands;

  console.log("bands.value after update:", bands.value);

  // Use Vue's force-update mechanism
  const instance = getCurrentInstance();
  if (instance) {
    console.log("Forcing component update");
    instance.proxy?.$forceUpdate();
  }

  // Call nextTick to ensure the DOM has updated
  nextTick(() => {
    console.log("Calling updateJRXML");
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
const jrxmlContent = ref("");

// Report properties
const reportProperties = ref<ReportProperties>({
  name: "NewReport",
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
    isUnderline: false,
  },
  bandLimits: getEffectiveDefaultBandLimits(),
});

// File management related state
const {
  currentFileName,
  currentFileId,
  loadFilesFromStorage,
  loadLastFile,
  findFileById,
  saveCurrentFileContent,
  setLastFile,
  renameFile,
} = useDesignerFiles({
  defaultFileName: t("fileManager.untitledReport"),
});

// Editable document title in header (Google Docs style)
const headerFileName = ref(currentFileName.value);
const isTitleEditing = ref(false);

watch(currentFileName, (newVal) => {
  if (newVal !== headerFileName.value) {
    headerFileName.value = newVal;
  }
});

function handleHeaderTitleCommit() {
  isTitleEditing.value = false;
  const trimmed = headerFileName.value.trim();
  if (!trimmed) {
    headerFileName.value = currentFileName.value || t("fileManager.untitledReport");
    return;
  }
  if (currentFileId.value) {
    renameFile(currentFileId.value, trimmed);
  }
  currentFileName.value = trimmed;
  if (reportProperties.value) {
    reportProperties.value.name = trimmed;
  }
  scheduleAutoSave(true);
}

// Auto-save state and helpers
const saveStatus = ref<"saved" | "saving" | "error">("saved");
const isLoadingFile = ref(false);
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

const saveStatusTitle = computed(() => {
  if (saveStatus.value === "saving") return t("editorHeader.savingTitle");
  if (saveStatus.value === "error") return t("editorHeader.saveFailedTitle");
  return t("editorHeader.savedTitle");
});

function flushAutoSave(): boolean {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  return saveCurrentFileToStorage(false);
}

function scheduleAutoSave(immediate = false) {
  if (isLoadingFile.value) return;

  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }

  saveStatus.value = "saving";

  if (immediate) {
    saveCurrentFileToStorage(false);
  } else {
    autoSaveTimer = setTimeout(() => {
      saveCurrentFileToStorage(false);
      autoSaveTimer = null;
    }, 400);
  }
}

function onTitleEnter(e: Event) {
  (e.target as HTMLInputElement)?.blur();
}

// Update the page title
watch(
  currentFileName,
  (newName) => {
    document.title = newName
      ? `${newName} - ${t("app.title")}`
      : t("app.title");
  },
  { immediate: true },
);

// Watch for language changes and update the title
watch(
  () => t("app.title"),
  () => {
    const name = currentFileName.value;
    document.title = name ? `${name} - ${t("app.title")}` : t("app.title");
  },
);

function createNewFile() {
  flushAutoSave();
  isLoadingFile.value = true;

  // Logic for creating a new file
  const timestamp = new Date().getTime();
  currentFileName.value = `${t("fileManager.untitledReport")}${timestamp}`;
  currentFileId.value = `file_${timestamp}`;

  // Reset the report data
  reportProperties.value = {
    name: "NewReport",
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
      isUnderline: false,
    },
    bandLimits: getEffectiveDefaultBandLimits(),
  };

  const defaultBandConfig = getEffectiveDefaultBandConfig();
  const pageHeaderH =
    defaultBandConfig[BAND_TYPE_CONSTANTS.PAGE_HEADER]?.defaultHeight ??
    (BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_HEADER] || 50);
  const columnHeaderH =
    defaultBandConfig[BAND_TYPE_CONSTANTS.COLUMN_HEADER]?.defaultHeight ??
    (BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_HEADER] || 30);
  const columnFooterH =
    defaultBandConfig[BAND_TYPE_CONSTANTS.COLUMN_FOOTER]?.defaultHeight ??
    (BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_FOOTER] || 30);
  const pageFooterH =
    defaultBandConfig[BAND_TYPE_CONSTANTS.PAGE_FOOTER]?.defaultHeight ??
    (BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_FOOTER] || 40);
  const detailH = Math.max(
    50,
    802 - (pageHeaderH + columnHeaderH + columnFooterH + pageFooterH),
  );

  bands.value = [
    {
      type: BAND_TYPE_CONSTANTS.PAGE_HEADER as BandType,
      height: pageHeaderH,
      elements: [],
    },
    {
      type: BAND_TYPE_CONSTANTS.COLUMN_HEADER as BandType,
      height: columnHeaderH,
      elements: [],
    },
    {
      type: BAND_TYPE_CONSTANTS.DETAIL as BandType,
      height: detailH,
      elements: [],
    },
    {
      type: BAND_TYPE_CONSTANTS.COLUMN_FOOTER as BandType,
      height: columnFooterH,
      elements: [],
    },
    {
      type: BAND_TYPE_CONSTANTS.PAGE_FOOTER as BandType,
      height: pageFooterH,
      elements: [],
    },
  ];

  pageCount.value = 1;

  // Update selectedBandTypes to match the new bands
  selectedBandTypes.value = bands.value.map((band) => band.type);

  reportFields.value = [];
  reportParameters.value = [];
  subDatasets.value = [];
  reportVariables.value = [];
  reportGroups.value = [];
  jrxmlContent.value = "";

  // Clear the currently selected element
  selectedElement.value = null;
  selectedBandIndex.value = null;

  nextTick(() => {
    isLoadingFile.value = false;
    updateJRXML();
    saveCurrentFileToStorage(false);
  });
}

function saveCurrentFileToStorage(showNotification = false): boolean {
  if (isLoadingFile.value) {
    return false;
  }

  try {
    saveStatus.value = "saving";

    if (!currentFileId.value) {
      currentFileId.value = `file_${Date.now()}`;
    }

    const fileData = saveCurrentFile();
    const ok = saveCurrentFileContent(fileData);
    saveToLocalStorageWrapper();

    if (ok) {
      saveStatus.value = "saved";
      if (showNotification) {
        notification.success(t("notifications.fileSavedSuccess"));
      }
    } else {
      saveStatus.value = "error";
      if (showNotification) {
        notification.error(t("notifications.fileSaveFailed"));
      }
    }
    return ok;
  } catch (error) {
    console.error("Auto-save error:", error);
    saveStatus.value = "error";
    if (showNotification) {
      notification.error(t("notifications.fileSaveFailed"));
    }
    return false;
  }
}

function loadFile(fileData: DesignerFile | any) {
  try {
    flushAutoSave();
    isLoadingFile.value = true;

    // Parse the file content
    const fileContent =
      typeof fileData.content === "string"
        ? JSON.parse(fileData.content)
        : fileData;

    // Load the file data into the current report
    if (fileContent.reportProperties) {
      reportProperties.value = {
        ...reportProperties.value,
        ...fileContent.reportProperties,
        // Each report has its own projects
        projects: fileContent.reportProperties.projects ?? [],
      };
    }

    if (fileContent.bands) {
      bands.value = fileContent.bands;
      // Repair copies that share IDs with their original (pasted before copies got their own)
      ensureUniqueUuids(bands.value);
      ensureUniqueTableDatasets(bands.value);
      resetBoxPhotos(bands.value);
      // Update selectedBandTypes to match the loaded bands
      selectedBandTypes.value = fileContent.bands.map(
        (band: Band) => band.type,
      );
      const detailBand = fileContent.bands.find(
        (band: Band) => band.type === BAND_TYPE_CONSTANTS.DETAIL,
      );
      if (detailBand && detailBand.elements) {
        const maxPage = Math.max(
          0,
          ...detailBand.elements.map((e: any) => e.pageIndex || 0),
        );
        pageCount.value = maxPage + 1;
      } else {
        pageCount.value = 1;
      }
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

    if (fileContent.reportVariables) {
      reportVariables.value = fileContent.reportVariables;
    }

    if (fileContent.reportGroups) {
      reportGroups.value = fileContent.reportGroups;
    }

    if (Array.isArray(fileContent.tableStyles)) {
      tableStyles.value = parseSavedTableStyles(JSON.stringify(fileContent.tableStyles));
    }

    if (fileContent.jrxmlContent) {
      jrxmlContent.value = fileContent.jrxmlContent;
    }

    // Update the current file info
    currentFileName.value = fileData.name || t("fileManager.untitledReport");
    currentFileId.value = fileData.id || `file_${Date.now()}`;
    if (fileData.id) {
      setLastFile({ id: fileData.id, name: fileData.name });
    }

    // Clear the currently selected element
    selectedElement.value = null;
    selectedBandIndex.value = null;

    nextTick(() => {
      isLoadingFile.value = false;
      updateJRXML();
      updateOutOfBoundsElements();
      saveStatus.value = "saved";
    });
  } catch (error) {
    isLoadingFile.value = false;
    console.error("Failed to load file:", error);
    notification.error(t("fileManager.invalidFileFormat"));
  }
}

function saveCurrentFile() {
  if (!currentFileId.value) {
    currentFileId.value = `file_${Date.now()}`;
  }

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
          ["topPen", "leftPen", "bottomPen", "rightPen"].forEach((penType) => {
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
    reportVariables: reportVariables.value,
    reportGroups: reportGroups.value,
    tableStyles: tableStyles.value,
    jrxmlContent: jrxmlContent.value,
    lastModified: new Date().toISOString(),
  };

  // Return the file data
  return fileData;
}

// Available elements
const elements = computed(() =>
  getAllElementConfigs()
    .map((config) => ({ type: config.type, name: config.name })),
);

// Define the element interfaces
// Using the Pen and Box interfaces imported from types/index.ts

// Using the interfaces imported from types/index.ts

// Report bands
const initDefaultBandConfig = getEffectiveDefaultBandConfig();
const initPageHeaderH =
  initDefaultBandConfig[BAND_TYPE_CONSTANTS.PAGE_HEADER]?.defaultHeight ??
  (BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_HEADER] || 50);
const initColumnHeaderH =
  initDefaultBandConfig[BAND_TYPE_CONSTANTS.COLUMN_HEADER]?.defaultHeight ??
  (BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_HEADER] || 30);
const initColumnFooterH =
  initDefaultBandConfig[BAND_TYPE_CONSTANTS.COLUMN_FOOTER]?.defaultHeight ??
  (BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.COLUMN_FOOTER] || 30);
const initPageFooterH =
  initDefaultBandConfig[BAND_TYPE_CONSTANTS.PAGE_FOOTER]?.defaultHeight ??
  (BAND_HEIGHT_CONSTANTS[BAND_TYPE_CONSTANTS.PAGE_FOOTER] || 40);
const initDetailH = Math.max(
  50,
  802 - (initPageHeaderH + initColumnHeaderH + initColumnFooterH + initPageFooterH),
);

const bands = ref<Band[]>([
  {
    type: BAND_TYPE_CONSTANTS.PAGE_HEADER as BandType,
    height: initPageHeaderH,
    elements: [],
  },
  {
    type: BAND_TYPE_CONSTANTS.COLUMN_HEADER as BandType,
    height: initColumnHeaderH,
    elements: [],
  },
  {
    type: BAND_TYPE_CONSTANTS.DETAIL as BandType,
    height: initDetailH,
    elements: [],
  },
  {
    type: BAND_TYPE_CONSTANTS.COLUMN_FOOTER as BandType,
    height: initColumnFooterH,
    elements: [],
  },
  {
    type: BAND_TYPE_CONSTANTS.PAGE_FOOTER as BandType,
    height: initPageFooterH,
    elements: [],
  },
]);

// Multi-page state and methods
const pageCount = ref(1);

const maxDetailPageIndex = computed(() => {
  const detailBand = bands.value.find(
    (b) => b.type === BAND_TYPE_CONSTANTS.DETAIL,
  );
  if (!detailBand || !detailBand.elements) return 0;
  return Math.max(0, ...detailBand.elements.map((e: any) => e.pageIndex || 0));
});

const totalPages = computed(() =>
  Math.max(pageCount.value, maxDetailPageIndex.value + 1),
);

// afterPage: 1-based page the new one follows (default: at the end). Detail
// content of later pages moves down one page.
const addNewPage = (afterPage?: number) => {
  saveStateToHistory();
  const insertAt =
    typeof afterPage === "number" ? Math.min(afterPage, totalPages.value) : totalPages.value;
  const detailBand = bands.value.find(
    (b) => b.type === BAND_TYPE_CONSTANTS.DETAIL,
  );
  detailBand?.elements?.forEach((el: any) => {
    if ((el.pageIndex ?? 0) >= insertAt) el.pageIndex = (el.pageIndex ?? 0) + 1;
  });
  pageCount.value = totalPages.value + 1;
  notification.success(t("editor.pageAdded", { page: insertAt + 1 }));
  updateJRXML();
};

const deletePage = (pageIndex: number) => {
  if (pageIndex <= 0) return;
  saveStateToHistory();
  const detailBand = bands.value.find(
    (b) => b.type === BAND_TYPE_CONSTANTS.DETAIL,
  );
  if (detailBand && detailBand.elements) {
    detailBand.elements = detailBand.elements.filter(
      (el: any) => (el.pageIndex ?? 0) !== pageIndex,
    );
    detailBand.elements.forEach((el: any) => {
      if ((el.pageIndex ?? 0) > pageIndex) {
        el.pageIndex = (el.pageIndex ?? 0) - 1;
      }
    });
  }
  selectedElement.value = null;
  pageCount.value = Math.max(1, pageCount.value - 1);
  notification.info(t("editor.pageDeleted", { page: pageIndex + 1 }));
  updateJRXML();
};

// All possible band types
const allBandTypes = ALL_CONFIGURABLE_BANDS;

// The currently selected band type
const selectedBandTypes = ref<BandType[]>(bands.value.map((band) => band.type));

// Data fields
const reportFields = ref<ReportField[]>([]);

// Report parameters
const reportParameters = ref<ReportParameter[]>([]);

// Sub-datasets
const subDatasets = ref<TableDataset[]>([]);

// Report styles
// Report styles (table theme styles are added when a table first uses them)
// Table styles the user saved in this report (built-in ones are not listed)
const tableStyles = ref<SavedTableStyle[]>([]);

// Projects chosen in the Report Data list (kept with the report properties,
// so undo and saving cover them)
const reportProjects = computed<ReportProject[]>(() => reportProperties.value?.projects ?? []);

// A project still shown on the report can't be removed from the list
const setReportProjects = (projects: ReportProject[]) => {
  const removed = reportProjects.value.find((p) => !projects.some((n) => n.id === p.id));
  const usage = removed ? countProjectUsage(bands.value, removed.id) : 0;
  if (removed && usage > 0) {
    notification.warning(t("reportData.projectInUse", { project: removed.name, count: usage }));
    return;
  }
  saveStateToHistory();
  reportProperties.value = { ...reportProperties.value, projects };
  updateJRXML();
};

// Report variables
const reportVariables = ref<any[]>([]);

// Report groups
const reportGroups = ref<any[]>([]);

// Context menu state
const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  type: "element" as "element" | "canvas",
});


// Element-created event handler
const handleElementCreated = (
  element: DesignElement,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  // Fire the element-created event, providing the necessary parameters
  console.log("Element created:", {
    element,
    bandIndex,
    elementIndex,
    parentFrameIndex,
    position: {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
    },
  });

  // Additional post-creation handling logic can be added here
  // e.g. perform type-specific initialization based on the element type
  switch (element.type) {
    case "textField":
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
  tableStyles: typeof tableStyles.value;
};

// Out-of-bounds elements
const outOfBoundsElements = ref<
  Array<{ bandIndex: number; elementIndex: number; element: DesignElement }>
>([]);

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
    console.warn(
      "bands or reportProperties not initialized, skipping boundary check",
    );
    return;
  }

  // Get all out-of-bounds elements (keep the original format for DesignerCanvas)
  const outOfBounds = getOutOfBoundsElements(
    bands.value,
    reportProperties.value,
  );
  outOfBoundsElements.value = outOfBounds;

  // Also run detailed boundary detection via the composable
  checkAllBoundaryElements(
    bands.value,
    reportProperties.value.pageWidth,
    reportProperties.value,
  );

  if (outOfBounds.length > 0) {
    console.warn(
      `Found ${outOfBounds.length} out-of-bounds element(s):`,
      outOfBounds,
    );
  }
}

// Get the actual data for the currently selected elements
function getSelectedElementsData() {
  const result: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    bandIndex: number;
    elementIndex: number;
  }> = [];
  for (const sel of selectedElements.value) {
    const band = bands.value[sel.bandIndex];
    if (band && band.elements[sel.elementIndex]) {
      const el = band.elements[sel.elementIndex];
      if (!el) continue;
      result.push({
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        bandIndex: sel.bandIndex,
        elementIndex: sel.elementIndex,
      });
    }
  }
  return result;
}

// Multi-select alignment operation
function handleMultiAlign(
  direction: "left" | "center" | "right" | "top" | "middle" | "bottom",
) {
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
function handleMultiDistribute(direction: "horizontal" | "vertical") {
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
function handleMultiResize(type: "sameWidth" | "sameHeight" | "sameSize") {
  const elementsData = getSelectedElementsData();
  if (elementsData.length < 2) return;
  saveStateToHistory();

  if (type === "sameWidth" || type === "sameSize") {
    const maxWidth = Math.max(...elementsData.map((e) => e.width));
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
  if (type === "sameHeight" || type === "sameSize") {
    const maxHeight = Math.max(...elementsData.map((e) => e.height));
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

const { historyStack, redoStack, saveStateToHistory, undo, redo } =
  useUndoRedo<HistoryState>({
    maxHistorySize: HISTORY_CONSTANTS.MAX_HISTORY_SIZE,
    getState: () => ({
      reportProperties: reportProperties.value,
      bands: bands.value,
      reportFields: reportFields.value,
      reportParameters: reportParameters.value,
      subDatasets: subDatasets.value,
      tableStyles: tableStyles.value,
    }),
    applyState: (state) => {
      reportProperties.value = state.reportProperties;
      bands.value = state.bands;
      reportFields.value = state.reportFields;
      reportParameters.value = state.reportParameters;
      subDatasets.value = state.subDatasets;
      // Older snapshots (taken before styles were recorded) keep the current styles
      if (state.tableStyles) tableStyles.value = state.tableStyles;
    },
    onAfterRestore: () => {
      updateJRXML();
    },
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
const paperWidth = computed(
  () =>
    reportProperties.value?.pageWidth || REPORT_CONSTANTS.DEFAULT_PAGE_WIDTH,
);
const paperHeight = computed(
  () =>
    reportProperties.value?.pageHeight || REPORT_CONSTANTS.DEFAULT_PAGE_HEIGHT,
);

// Ensure the bands fit within the page height and detail takes the remaining space
const ensureBandsFitPage = () => {
  const topMargin = reportProperties.value?.topMargin || 0;
  const bottomMargin = reportProperties.value?.bottomMargin || 0;
  const availableHeight = paperHeight.value - topMargin - bottomMargin;

  const detailIndex = bands.value.findIndex(
    (b) => b.type === BAND_TYPE_CONSTANTS.DETAIL,
  );
  if (detailIndex === -1) return;

  let otherBandsHeight = 0;
  bands.value.forEach((b, i) => {
    // Exclude detail itself, and non-stacking band (background underlay)
    if (i !== detailIndex && b.type !== BAND_TYPE_CONSTANTS.BACKGROUND) {
      otherBandsHeight += b.height || 0;
    }
  });

  const remaining = Math.max(
    BAND_CONSTANTS.MIN_HEIGHT,
    availableHeight - otherBandsHeight,
  );
  if (bands.value[detailIndex]) {
    bands.value[detailIndex].height = remaining;
  }
};

// Watch paper dimensions, margins, and non-detail band heights to ensure Detail always fits remaining space
watch(
  [
    () => paperHeight.value,
    () => reportProperties.value?.topMargin,
    () => reportProperties.value?.bottomMargin,
    () =>
      bands.value
        .filter(
          (b) =>
            b.type !== BAND_TYPE_CONSTANTS.DETAIL &&
            b.type !== BAND_TYPE_CONSTANTS.BACKGROUND,
        )
        .map((b) => b.height)
        .join(","),
  ],
  () => {
    ensureBandsFitPage();
  },
);
const {
  zoomLevel,
  resetZoom,
  calculateOptimalZoom,
  handleZoomChange,
  zoomIn,
  zoomOut,
} = useZoom({
  paperWidth,
  zoomConstants: ZOOM_CONSTANTS,
});

// Function to set the zoom level
const setZoomLevel = (newZoom: number) => {
  zoomLevel.value = newZoom;
};
// The selected element; an item inside a box is looked up inside that box
const currentElement = computed(() => {
  const selection = selectedElement.value;
  if (selection && bands.value && Array.isArray(bands.value)) {
    const band = bands.value[selection.bandIndex];
    if (band && band.elements && Array.isArray(band.elements)) {
      if (selection.parentFrameIndex !== undefined) {
        const box = band.elements[selection.parentFrameIndex] as FrameElement | undefined;
        return box?.type === "frame" ? (box.elements?.[selection.elementIndex] ?? null) : null;
      }
      return band.elements[selection.elementIndex];
    }
  }
  return null;
});

// Ruler marks: numbered from the margins, so they read the same as element X/Y
const horizontalRulerMarks = computed(() =>
  buildRulerMarks(
    paperWidth.value,
    reportProperties.value.leftMargin,
    reportProperties.value.rightMargin,
  ),
);
const horizontalRulerTicks = computed(() => horizontalRulerMarks.value.ticks);
const horizontalRulerLabels = computed(() => horizontalRulerMarks.value.labels);

// One set of marks per page sheet; sheets are 32px apart on the canvas
const verticalRulerMarks = computed(() => {
  const height = paperHeight.value;
  const pageGap = 32;
  const ticks: RulerTick[] = [];
  const labels: RulerLabel[] = [];
  for (let p = 0; p < totalPages.value; p++) {
    const marks = buildRulerMarks(
      height,
      reportProperties.value.topMargin,
      reportProperties.value.bottomMargin,
      p * (height + pageGap),
    );
    ticks.push(...marks.ticks);
    labels.push(...marks.labels);
  }
  return { ticks, labels };
});
const verticalRulerTicks = computed(() => verticalRulerMarks.value.ticks);
const verticalRulerLabels = computed(() => verticalRulerMarks.value.labels);

// Drag-related state
const draggingInfo = ref<DraggingInfo | null>(null);
const highlightedBandIndex = ref<number | null>(null); // Index of the highlighted target band
const {
  enableSnapToGrid,
  enableSnapToAlignment,
  showGrid,
  alignmentLines,
  setAlignmentLines,
  clearAlignmentLines,
} = useSnapAlignment();

// How close (in screen pixels) an edge must come to another to align with it;
// in screen pixels so it feels the same at every zoom
const ALIGN_SNAP_SCREEN_PX = 6;

const printableWidth = computed(
  () =>
    paperWidth.value -
    (reportProperties.value?.leftMargin || 0) -
    (reportProperties.value?.rightMargin || 0),
);

// What a moving element can snap to, in its container's coordinates (its band,
// or its box for an item in a box: `offset` is then the box's position)
interface SnapContext {
  bandIndex: number;
  pageIndex: number;
  offset: { x: number; y: number };
  targets: SnapTargets;
}

const buildSnapContext = (
  bandIndex: number,
  pageIndex: number,
  parentFrameIndex: number | undefined,
  moving: DesignElement,
): SnapContext => {
  const band = bands.value[bandIndex];
  const box =
    parentFrameIndex !== undefined
      ? (band?.elements[parentFrameIndex] as FrameElement | undefined)
      : undefined;
  const offset = box ? { x: box.x, y: box.y } : { x: 0, y: 0 };
  const width = printableWidth.value;
  const height = band?.height ?? 0;

  // Band coordinates; other bands share X but not Y (each band has its own top)
  const xs = [0, width / 2, width];
  const ys = [0, height / 2, height];
  const add = (r: SnapRect, sameBand: boolean) => {
    xs.push(r.x, r.x + r.width / 2, r.x + r.width);
    if (sameBand) ys.push(r.y, r.y + r.height / 2, r.y + r.height);
  };
  bands.value.forEach((b, i) => {
    if (b.type === BAND_TYPE_CONSTANTS.BACKGROUND) return;
    for (const el of b.elements ?? []) {
      // Moving element (and a moving box's own items) are not targets; nor is
      // the detail content of other pages
      if (el === moving) continue;
      if (b.type === BAND_TYPE_CONSTANTS.DETAIL && (el.pageIndex ?? 0) !== pageIndex) continue;
      add(el, i === bandIndex);
      if (el.type === "frame") {
        for (const child of (el as FrameElement).elements ?? []) {
          if (child === moving) continue;
          add({ ...child, x: el.x + child.x, y: el.y + child.y }, i === bandIndex);
        }
      }
    }
  });

  return {
    bandIndex,
    pageIndex,
    offset,
    targets: {
      x: [...new Set(xs)].map((v) => v - offset.x),
      y: [...new Set(ys)].map((v) => v - offset.y),
    },
  };
};

// Snap settings for one mouse move or drop; holding Ctrl/Cmd skips snapping
const getSnapOptions = (
  event: { ctrlKey?: boolean; metaKey?: boolean } | null,
  offset = { x: 0, y: 0 },
): SnapOptions => {
  const bypass = !!(event?.ctrlKey || event?.metaKey);
  return {
    grid: enableSnapToGrid.value && !bypass ? UI_CONSTANTS.GRID_SIZE : null,
    threshold:
      enableSnapToAlignment.value && !bypass
        ? ALIGN_SNAP_SCREEN_PX / zoomLevel.value
        : null,
    gridOffsetX: offset.x,
    gridOffsetY: offset.y,
  };
};

// The most a band may grow to when something is dropped in it: its maximum
// height setting, and the room left on the page (Detail keeps its minimum).
// Detail fills whatever space remains, so it can't grow on its own.
const getBandMaxHeight = (bandIndex: number): number => {
  const band = bands.value[bandIndex];
  if (!band) return 0;
  if (
    band.type === BAND_TYPE_CONSTANTS.DETAIL ||
    band.type === BAND_TYPE_CONSTANTS.BACKGROUND
  ) {
    return band.height;
  }
  const limits = reportProperties.value?.bandLimits?.[band.type] ||
    getEffectiveDefaultBandLimits()[band.type] || { min: 20, max: 70 };
  const maxSetting = typeof limits.max === "number" ? limits.max : 70;
  const printableHeight =
    paperHeight.value -
    (reportProperties.value?.topMargin || 0) -
    (reportProperties.value?.bottomMargin || 0);
  let otherBands = 0;
  bands.value.forEach((b, i) => {
    if (
      i !== bandIndex &&
      b.type !== BAND_TYPE_CONSTANTS.DETAIL &&
      b.type !== BAND_TYPE_CONSTANTS.BACKGROUND
    ) {
      otherBands += b.height || 0;
    }
  });
  const pageRoom = printableHeight - otherBands - (BAND_CONSTANTS.MIN_HEIGHT || 20);
  return Math.max(band.height, Math.min(maxSetting, pageRoom));
};

// Where an element would end up if dropped in a band (see planBandFit)
const planDropInBand = (
  bandIndex: number,
  element: { y: number; height: number },
): BandFitPlan =>
  planBandFit(
    element,
    bands.value[bandIndex]?.height ?? 0,
    getBandMaxHeight(bandIndex),
  );

// Put a dropped element in place, growing the band if the plan says so
const applyDropInBand = (
  bandIndex: number,
  element: DesignElement,
  plan: Exclude<BandFitPlan, { kind: "tooTall" }>,
) => {
  element.y = plan.y;
  const band = bands.value[bandIndex];
  if (plan.kind === "grow" && band) {
    band.height = plan.bandHeight;
    notification.info(
      t("editor.bandLimits.grewToFit", {
        band: getBandDisplayName(band.type),
        height: plan.bandHeight,
      }),
    );
  }
};

const warnTooTallForBand = (bandIndex: number, height: number, maxHeight: number) => {
  const band = bands.value[bandIndex];
  notification.warning(
    t("editor.bandLimits.tooTallForBand", {
      height: Math.round(height),
      band: band ? getBandDisplayName(band.type) : "",
      max: Math.round(maxHeight),
    }),
  );
};

// While dragging: the target band turns red when the element can't fit in it
const dropTargetBlocked = ref(false);

// While dragging the Page Border tile over the page: the Background band is the target
const backgroundDropTarget = computed(
  () =>
    highlightedBandIndex.value !== null &&
    draggedLibraryElement.value?.type === PAGE_BORDER_TYPE,
);

// Whether an element at (x, y) in a band would land in one of its boxes
// (same rule as the drop: its centre is inside the box; boxes don't nest)
const isOverBox = (
  bandIndex: number,
  element: { type: string; width: number; height: number },
  x: number,
  y: number,
) => {
  if (element.type === "frame") return false;
  const cx = x + element.width / 2;
  const cy = y + element.height / 2;
  return (bands.value[bandIndex]?.elements ?? []).some(
    (el) =>
      el.type === "frame" &&
      cx >= el.x &&
      cx <= el.x + el.width &&
      cy >= el.y &&
      cy <= el.y + el.height,
  );
};

// Show the lines an element has snapped to (in band coordinates)
const showSnapGuides = (
  context: SnapContext,
  guides: SnapGuides,
  options: SnapOptions,
) => {
  if (options.threshold === null) {
    clearAlignmentLines();
    return;
  }
  setAlignmentLines({
    bandIndex: context.bandIndex,
    pageIndex: context.pageIndex,
    x: guides.x.map((v) => v + context.offset.x),
    y: guides.y.map((v) => v + context.offset.y),
  });
};
// Coordinate info shown while dragging
const dragCoordinates = ref<{
  x: number;
  y: number;
  visible: boolean;
  bandName: string;
}>({ x: 0, y: 0, visible: false, bandName: "" });
// Info shown while resizing a band's height
const resizingBandInfo = reactive({ visible: false, bandName: "", height: 0 });
// Expose it as a ref for template reactivity
const resizingBandInfoRef = ref(resizingBandInfo);
// Resize-related state
const resizingInfo = ref<{
  bandIndex: number;
  elementIndex: number;
  direction?: string;
  startX: number;
  startY: number;
  startElementX: number;
  startElementY: number;
  startWidth: number;
  startHeight: number;
  parentFrameIndex?: number;
  targetSheet?: HTMLElement;
  startLineDirection?: "TopDown" | "BottomUp";
} | null>(null);

// Tracks the last-clicked band
const lastClickedBandIndex = ref<number>(3); // Defaults to the DETAIL band (index 3)

// Tracks the element being dragged from the component library (works around dataTransfer sometimes failing in the Mac Tauri environment)
const draggedLibraryElement = ref<any>(null);

// Handle drag-and-drop
const handleDragStart = (event: DragEvent, element: any) => {
  draggedLibraryElement.value = element;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/json", JSON.stringify(element));
  }
};

// Printable page area (inside the margins) and translator, used to size frame templates
const getFrameTemplateContext = (): FrameTemplateContext => ({
  availableWidth: Math.round(
    paperWidth.value -
      (reportProperties.value?.leftMargin || 0) -
      (reportProperties.value?.rightMargin || 0),
  ),
  availableHeight: Math.round(
    paperHeight.value -
      (reportProperties.value?.topMargin || 0) -
      (reportProperties.value?.bottomMargin || 0),
  ),
  t,
});

// Base element for a library item: frame templates are built with their content,
// everything else comes from the registry defaults
const createLibraryElement = (type: string): DesignElement =>
  isFrameTemplateType(type)
    ? buildFrameTemplate(type, getFrameTemplateContext())
    : type === PAGE_NUMBER_TYPE
    ? buildPaginationElement(undefined, {
        fontFamily: reportProperties.value?.defaultFont?.name,
        fontSize: reportProperties.value?.defaultFont?.size,
      })
    : type === "chart"
    ? buildChartElement()
    : ({
        ...createElement(type),
        ...getDefaultElementProperties(type),
      } as DesignElement);

// Tell the user a page border already exists and select it for editing
const rejectSecondPageBorder = (): boolean => {
  const existing = findPageBorder(bands.value);
  if (!existing) return false;
  notification.warning(t("framePresets.pageBorderExists"));
  selectElement(existing.bandIndex, existing.elementIndex);
  return true;
};

// Add a border around the printable area of every page. It lives in the Background
// band, which JasperReports prints behind all other content on each page.
const addPageBorder = () => {
  if (rejectSecondPageBorder()) return;
  saveStateToHistory();

  const ctx = getFrameTemplateContext();
  let bandIndex = bands.value.findIndex(
    (b) => b.type === BAND_TYPE_CONSTANTS.BACKGROUND,
  );
  if (bandIndex === -1) {
    bands.value.push({
      type: BAND_TYPE_CONSTANTS.BACKGROUND as BandType,
      height: ctx.availableHeight,
      elements: [],
    });
    bandIndex = bands.value.length - 1;
    selectedBandTypes.value = bands.value.map((band) => band.type);
  }

  const backgroundBand = bands.value[bandIndex]!;
  backgroundBand.height = ctx.availableHeight;
  if (!backgroundBand.elements) backgroundBand.elements = [];

  const border = {
    ...buildFrameTemplate(PAGE_BORDER_TYPE, ctx),
    uuid: crypto.randomUUID(),
    x: 0,
    y: 0,
  } as DesignElement;
  backgroundBand.elements.push(border);

  const elementIndex = backgroundBand.elements.length - 1;
  selectElement(bandIndex, elementIndex);
  handleElementCreated(border, bandIndex, elementIndex);
  updateJRXML();
};

// Page Number tile, position picked: the page header (top) or footer (bottom),
// aligned the way the position says. Dragging the tile drops it in any band.
const addPageNumber = (position: PaginationPosition) => {
  const bandIndex = findPaginationTargetBand(bands.value, position);
  const band = bands.value[bandIndex];
  if (!band) {
    notification.warning(t("pagination.noBand"));
    return;
  }

  const element = buildPaginationElement(position, {
    fontFamily: reportProperties.value?.defaultFont?.name,
    fontSize: reportProperties.value?.defaultFont?.size,
  });
  Object.assign(
    element,
    placePaginationInBand(
      element,
      position,
      getFrameTemplateContext().availableWidth,
      band.height,
    ),
  );

  // Fits the band, growing it when it is too short; too tall is refused
  const plan = planDropInBand(bandIndex, element);
  if (plan.kind === "tooTall") {
    warnTooTallForBand(bandIndex, element.height, plan.maxHeight);
    return;
  }

  saveStateToHistory();
  applyDropInBand(bandIndex, element, plan);
  if (!band.elements) band.elements = [];
  band.elements.push(element);

  const elementIndex = band.elements.length - 1;
  selectElement(bandIndex, elementIndex);
  handleElementCreated(element, bandIndex, elementIndex);
  updateJRXML();
};

// Chart tile, type picked: goes in the last clicked band, centred across the
// page. Dragging the tile drops a bar chart wherever it is released.
const addChart = (chartType: ChartType) => {
  const bandIndex = bands.value[lastClickedBandIndex.value]
    ? lastClickedBandIndex.value
    : bands.value.findIndex((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
  const band = bands.value[bandIndex];
  if (!band) return;

  const element: DesignElement = { ...buildChartElement(chartType), uuid: crypto.randomUUID() };
  const availableWidth = Math.round(getFrameTemplateContext().availableWidth);
  element.width = Math.min(element.width, availableWidth);
  element.x = Math.round((availableWidth - element.width) / 2);
  element.y = 20;

  // Fits the band, growing it when it is too short; too tall is refused
  const plan = planDropInBand(bandIndex, element);
  if (plan.kind === "tooTall") {
    warnTooTallForBand(bandIndex, element.height, plan.maxHeight);
    return;
  }

  saveStateToHistory();
  applyDropInBand(bandIndex, element, plan);
  if (!band.elements) band.elements = [];
  band.elements.push(element);

  const elementIndex = band.elements.length - 1;
  selectElement(bandIndex, elementIndex);
  handleElementCreated(element, bandIndex, elementIndex);
  updateJRXML();
};

// After the paper size or margins change (already one undo step): resize the
// page border to the new printable area and move elements that no longer fit
const handlePageSetupChange = () => {
  ensureBandsFitPage();
  const ctx = getFrameTemplateContext();
  const { borderResized, moved } = fitContentToPage(bands.value, {
    width: ctx.availableWidth,
    height: ctx.availableHeight,
  });
  const messages = [
    borderResized ? t("canvas.pageBorderResized") : "",
    moved > 0 ? t("canvas.elementsMovedToFit", moved) : "",
  ].filter(Boolean);
  if (messages.length) notification.info(messages.join(" "));
  updateJRXML();
};

// Handle element double-click events
const handleElementDoubleClick = (element: any) => {
  if (element.type === PAGE_BORDER_TYPE) {
    addPageBorder();
    return;
  }
  // The library asks for a position or a chart type first
  if (element.type === PAGE_NUMBER_TYPE || element.type === "chart") return;

  // Ensure there is a last-clicked band
  if (
    lastClickedBandIndex.value === null ||
    lastClickedBandIndex.value === undefined
  ) {
    console.warn("No band selected, falling back to the default band");
    lastClickedBandIndex.value = 3; // Default to the DETAIL band
  }

  // Tables always go in the Detail section (the one that grows onto new pages)
  if (element.type === "table") {
    const detailIndex = bands.value.findIndex((b) => b.type === BAND_TYPE_CONSTANTS.DETAIL);
    if (detailIndex !== -1) lastClickedBandIndex.value = detailIndex;
  }

  // Get the target band
  const targetBand = bands.value[lastClickedBandIndex.value];
  if (!targetBand) {
    console.error("Target band does not exist");
    return;
  }

  // Save state to history
  saveStateToHistory();

  // Create the new element
  let newElement: DesignElement = {
    ...createLibraryElement(element.type),
    uuid: crypto.randomUUID(), // Generate a UUID
    x: 50, // Default position
    y: 20, // Default position
  } as DesignElement;

  // A table is horizontally centered with equal space on left and right sides
  if (element.type === "table") {
    const availableWidth = Math.round(getFrameTemplateContext().availableWidth);
    const sideMargin = 50;
    newElement.width = Math.max(100, availableWidth - sideMargin * 2);
    newElement.x = Math.round((availableWidth - newElement.width) / 2);
    newElement.y = 20;
  }

  // For rectangles, ellipses, frames, and images, use a compact default size
  // instead of stretching the element across the whole band
  if (["rectangle", "ellipse", "frame", "image"].includes(element.type)) {
    const defaultSize = getDefaultElementSize(element.type, targetBand.height);
    newElement.width = defaultSize.width;
    newElement.height = defaultSize.height;
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

  console.log("Element added to band:", newElement);
};

const handleDrop = (event: DragEvent, pageIndex?: number) => {
  event.preventDefault();

  // A source, column or project detail from the "Report Data" list
  const dataDrag = readDataSourceDrag(event);
  let elementData = null;
  if (dataDrag?.kind === "projectField") {
    endDataSourceDrag();
    highlightedBandIndex.value = null;
    dropTargetBlocked.value = false;
    // A detail without a value has nothing to copy
    if (!dataDrag.value) {
      notification.info(t("reportData.noValue", { project: dataDrag.projectName, label: dataDrag.field.label }));
      return;
    }
    // Onto an existing text or image element: its content becomes the value
    if (fillDroppedProjectValue(event, dataDrag)) return;
    // Elsewhere: a new Text element (or an Image for the logo) placed like a
    // library element, holding the value
    elementData = {
      type: dataDrag.field.type === "image" ? "image" : "textField",
      projectValue: {
        project: { id: dataDrag.projectId, name: dataDrag.projectName },
        field: dataDrag.field,
        value: dataDrag.value,
      },
    };
  } else if (dataDrag) {
    endDataSourceDrag();
    highlightedBandIndex.value = null;
    dropTargetBlocked.value = false;
    handleDataSourceDrop(event, dataDrag, pageIndex);
    return;
  }

  // Prefer reading from internal state (works around dataTransfer sometimes being unavailable in the Mac Tauri environment)
  if (elementData) {
    // Already known (a project detail)
  } else if (draggedLibraryElement.value) {
    elementData = draggedLibraryElement.value;
    draggedLibraryElement.value = null; // Reset the state
  } else if (event.dataTransfer) {
    try {
      const data = event.dataTransfer.getData("application/json");
      if (data) {
        elementData = JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to parse drag data:", e);
    }
  }

  if (elementData) {
    // Get the target page sheet
    const targetSheet =
      ((event.target as HTMLElement)?.closest(".page-sheet") as HTMLElement) ||
      (document.querySelector(".page-sheet") as HTMLElement) ||
      (document.querySelector(".paper") as HTMLElement);
    if (!targetSheet) return;

    let targetPageIndex = pageIndex ?? 0;
    if (targetSheet.dataset.pageIndex !== undefined) {
      targetPageIndex = parseInt(targetSheet.dataset.pageIndex, 10);
    }

    const currentZoom = zoomLevel.value;
    const targetBandEl = (event.target as HTMLElement)?.closest(
      ".band",
    ) as HTMLElement;

    let bandIndex = 0;
    let scaledX = 0;
    let scaledY = 0;

    if (targetBandEl && targetBandEl.dataset.bandIndex !== undefined) {
      bandIndex = parseInt(targetBandEl.dataset.bandIndex, 10);
      const bandRect = targetBandEl.getBoundingClientRect();
      scaledX = (event.clientX - bandRect.left) / currentZoom;
      scaledY = (event.clientY - bandRect.top) / currentZoom;
    } else {
      // Fallback: Find detail band
      const dIndex = bands.value.findIndex(
        (b) => b.type === BAND_TYPE_CONSTANTS.DETAIL,
      );
      bandIndex = dIndex !== -1 ? dIndex : 0;
      const sheetRect = targetSheet.getBoundingClientRect();
      scaledX = (event.clientX - sheetRect.left) / currentZoom;
      scaledY = (event.clientY - sheetRect.top) / currentZoom;
    }

    // A page border always goes to the Background band, wherever it is dropped
    if (elementData.type === PAGE_BORDER_TYPE) {
      addPageBorder();
      highlightedBandIndex.value = null;
      return;
    }

    // Create the new element
    // Center it on the cursor using its own compact default size
    const baseElement = createLibraryElement(elementData.type);
    const droppedSize =
      isFrameTemplateType(elementData.type) ||
      [PAGE_NUMBER_TYPE, "table", "chart"].includes(elementData.type)
      ? { width: baseElement.width, height: baseElement.height }
      : getDefaultElementSize(elementData.type);
    let newElement: DesignElement = {
      ...baseElement,
      uuid: crypto.randomUUID(), // Generate a UUID
      x: Math.round(Math.max(0, scaledX - droppedSize.width / 2)), // Center horizontally on the cursor
      y: Math.round(Math.max(0, scaledY - droppedSize.height / 2)), // Center vertically on the cursor
    } as DesignElement;

    // For detail band elements, assign pageIndex
    if (bands.value[bandIndex]?.type === BAND_TYPE_CONSTANTS.DETAIL) {
      newElement.pageIndex = targetPageIndex;
    }

    // Tables live in the Detail section, the only one that grows onto new
    // pages, and are centered with equal space on left and right sides
    if (elementData.type === "table") {
      if (bands.value[bandIndex]?.type !== BAND_TYPE_CONSTANTS.DETAIL) {
        notification.warning(t("dataTable.onlyInDetail"));
        highlightedBandIndex.value = null;
        return;
      }
      const availableWidth = Math.round(getFrameTemplateContext().availableWidth);
      const sideMargin = 50;
      newElement.width = Math.max(100, availableWidth - sideMargin * 2);
      newElement.x = Math.round((availableWidth - newElement.width) / 2);
    }

    const targetBand = bands.value[bandIndex];
    if (targetBand && targetBand.elements) {
      // For rectangles, ellipses, frames, and images, apply a compact default
      // size instead of stretching the element across the whole band
      if (
        ["rectangle", "ellipse", "frame", "image"].includes(elementData.type)
      ) {
        const defaultSize = getDefaultElementSize(
          elementData.type,
          targetBand.height,
        );
        newElement.width = defaultSize.width;
        newElement.height = defaultSize.height;
      }

      // A project detail: its value as the content, sized for what it shows,
      // centred on the cursor
      if (elementData.projectValue) {
        const { project, field, value } = elementData.projectValue as {
          project: ReportProject;
          field: ProjectField;
          value: string;
        };
        applyProjectValue(newElement, project, field, value);
        const size = projectFieldSize(field);
        newElement.width = Math.min(size.width, Math.round(printableWidth.value));
        newElement.height = size.height;
        newElement.x = Math.round(Math.max(0, scaledX - newElement.width / 2));
        newElement.y = Math.round(Math.max(0, scaledY - newElement.height / 2));
      }

      // Land on the grid, or in line with a nearby element, like a dragged one
      const dropSnap = buildSnapContext(bandIndex, targetPageIndex, undefined, newElement);
      const snappedDrop = snapMove(newElement, dropSnap.targets, getSnapOptions(event));
      newElement.x = Math.max(0, snappedDrop.x);
      newElement.y = Math.max(0, snappedDrop.y);

      // Keep table horizontally centered with equal space on left and right
      if (newElement.type === "table") {
        const availableWidth = Math.round(getFrameTemplateContext().availableWidth);
        newElement.x = Math.round((availableWidth - newElement.width) / 2);
      }

      // Detect whether it is being dropped on a Frame
      let targetFrameIndex = -1;

      // Iterate over the Frames in the Band to check whether the new element lands on one.
      // Frames themselves are never nested: selection only supports one frame level.
      const canNest = newElement.type !== "frame" && newElement.type !== "table";
      for (let i = targetBand.elements.length - 1; canNest && i >= 0; i--) {
        const el = targetBand.elements[i];
        if (!el) continue;
        if (el.type === "frame") {
          // Check whether the new element's center point is inside the Frame
          const centerX = newElement.x + newElement.width / 2;
          const centerY = newElement.y + newElement.height / 2;

          if (
            centerX >= el.x &&
            centerX <= el.x + el.width &&
            centerY >= el.y &&
            centerY <= el.y + el.height
          ) {
            targetFrameIndex = i;
            break;
          }
        }
      }

      // Dropped in the band itself: it must fit, growing the band up to its
      // maximum if needed; too tall is refused before anything changes
      const bandPlan =
        targetFrameIndex === -1 ? planDropInBand(bandIndex, newElement) : null;
      if (bandPlan?.kind === "tooTall") {
        warnTooTallForBand(bandIndex, newElement.height, bandPlan.maxHeight);
        highlightedBandIndex.value = null;
        dropTargetBlocked.value = false;
        return;
      }

      // Save state to history
      saveStateToHistory();

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
        if (newElement.x + newElement.width > frame.width)
          newElement.x = Math.max(0, frame.width - newElement.width);
        if (newElement.y + newElement.height > frame.height)
          newElement.y = Math.max(0, frame.height - newElement.height);

        frame.elements.push(newElement);
        // Select the newly added element; note that parentFrameIndex must be passed
        const frameElementIndex = frame.elements.length - 1;
        selectElement(bandIndex, frameElementIndex, false, targetFrameIndex);

        // Fire the element-created event; parentFrameIndex must be passed when adding to a Frame
        handleElementCreated(
          newElement,
          bandIndex,
          frameElementIndex,
          targetFrameIndex,
        );
      } else {
        // Add it to the Band (original logic)
        // Ensure the element does not exceed the margin limits
        const availableWidth =
          paperWidth.value -
          (reportProperties.value?.leftMargin || 0) -
          (reportProperties.value?.rightMargin || 0);

        // Constrain the element so it doesn't exceed the right boundary
        if (newElement.x + newElement.width > availableWidth) {
          newElement.x = Math.round(availableWidth - newElement.width);
        }

        // Ensure the element's width doesn't exceed the available space
        if (newElement.width > availableWidth) {
          newElement.width = Math.round(availableWidth);
        }

        // Inside the band: moved up, or the band grows (checked above)
        if (bandPlan) applyDropInBand(bandIndex, newElement, bandPlan);

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
  dropTargetBlocked.value = false;
};

// Handle visual feedback while dragging
const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }

  // A page border goes to the Background band wherever it is dropped: the whole
  // printable area lights up instead of the band under the pointer
  if (draggedLibraryElement.value?.type === PAGE_BORDER_TYPE && !isDataSourceDrag(event)) {
    highlightedBandIndex.value = -1;
    dropTargetBlocked.value = false;
    return;
  }

  // The band under the pointer (same lookup as moving an element)
  const { bandUnderMouse } = getTargetBandAndSheetUnderPoint(event.clientX, event.clientY);
  const bandIndex =
    bandUnderMouse?.dataset.bandIndex !== undefined
      ? parseInt(bandUnderMouse.dataset.bandIndex, 10)
      : -1;
  highlightedBandIndex.value = bandIndex;

  // Red when the new element is too tall for that band (the drop is refused)
  const type: string | undefined = draggedLibraryElement.value?.type;
  const band = bands.value[bandIndex];
  // A table (or data dropped beside one) can only go in the Detail section
  const needsDetail =
    type === "table" ||
    (isDataSourceDrag(event) &&
      !(event.target as HTMLElement)?.closest?.("[data-table-uuid], [data-chart-uuid]"));
  dropTargetBlocked.value =
    (needsDetail && !!band && band.type !== BAND_TYPE_CONSTANTS.DETAIL) ||
    (!!type &&
      !!band &&
      type !== PAGE_BORDER_TYPE &&
      getLibraryDropHeight(type, band.height) > getBandMaxHeight(bandIndex));
};

// Height a library item gets when dropped in a band of the given height
// (same sizes as handleDrop); built items are cached for the drag
const libraryHeightCache = new Map<string, number>();
const getLibraryDropHeight = (type: string, bandHeight: number): number => {
  if (["rectangle", "ellipse", "frame", "image"].includes(type)) {
    return getDefaultElementSize(type, bandHeight).height;
  }
  let height = libraryHeightCache.get(type);
  if (height === undefined) {
    height = createLibraryElement(type).height;
    libraryHeightCache.set(type, height);
  }
  return height;
};

// ==================== Data tables ====================

// Where a table sits in the model
interface TableLocation {
  bandIndex: number;
  elementIndex: number;
  parentFrameIndex?: number;
}

// Any element (boxes' contents included) by its uuid
const findElementByUuid = (uuid: string): TableLocation | null => {
  for (let b = 0; b < bands.value.length; b++) {
    const elements = bands.value[b]?.elements ?? [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el?.uuid === uuid) return { bandIndex: b, elementIndex: i };
      if (el?.type === "frame") {
        const j = ((el as FrameElement).elements ?? []).findIndex((child) => child.uuid === uuid);
        if (j !== -1) return { bandIndex: b, elementIndex: j, parentFrameIndex: i };
      }
    }
  }
  return null;
};

const elementAtLocation = (location: TableLocation): DesignElement | undefined => {
  const band = bands.value[location.bandIndex];
  return location.parentFrameIndex !== undefined
    ? (band?.elements[location.parentFrameIndex] as FrameElement | undefined)?.elements?.[location.elementIndex]
    : band?.elements[location.elementIndex];
};

// A project detail dropped onto a text or image element: its content becomes
// the value, keeping its place, size and look (one undo step). Text details go
// in text elements, the logo in image elements; the wrong kind is refused with
// a message. Returns false when the drop wasn't on such an element.
const fillDroppedProjectValue = (
  event: DragEvent,
  drag: Extract<DataSourceDragPayload, { kind: "projectField" }>,
): boolean => {
  const target = (event.target as HTMLElement)?.closest?.("[data-element-uuid]") as HTMLElement | null;
  const location = target?.dataset.elementUuid ? findElementByUuid(target.dataset.elementUuid) : null;
  const element = location ? elementAtLocation(location) : undefined;
  if (!location || !element || (element.type !== "textField" && element.type !== "image")) return false;

  if (!canTakeProjectField(element, drag.field)) {
    notification.warning(
      t(
        drag.field.type === "image"
          ? "reportData.dropImageOnImage"
          : isPagination(element)
            ? "reportData.dropNotOnPageNumber"
            : "reportData.dropTextOnText",
      ),
    );
    return true;
  }
  saveStateToHistory();
  applyProjectValue(element, { id: drag.projectId, name: drag.projectName }, drag.field, drag.value ?? "");
  selectElement(location.bandIndex, location.elementIndex, false, location.parentFrameIndex);
  updateJRXML();
  return true;
};

const findTableByUuid = (uuid: string): TableLocation | null => {
  for (let b = 0; b < bands.value.length; b++) {
    const elements = bands.value[b]?.elements ?? [];
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el?.type === "table" && el.uuid === uuid) return { bandIndex: b, elementIndex: i };
      if (el?.type === "frame") {
        const j = ((el as FrameElement).elements ?? []).findIndex(
          (child) => child.type === "table" && child.uuid === uuid,
        );
        if (j !== -1) return { bandIndex: b, elementIndex: j, parentFrameIndex: i };
      }
    }
  }
  return null;
};

const tableAt = (loc: TableLocation | null): TableElement | null => {
  if (!loc) return null;
  const band = bands.value[loc.bandIndex];
  const el =
    loc.parentFrameIndex !== undefined
      ? (band?.elements?.[loc.parentFrameIndex] as FrameElement | undefined)?.elements?.[loc.elementIndex]
      : band?.elements?.[loc.elementIndex];
  return el?.type === "table" ? (el as TableElement) : null;
};

// The Configure popup: for an existing table, or for a new one created on Apply
const tableConfig = ref<{
  visible: boolean;
  target: TableLocation | null;
  newAt: { bandIndex: number; y: number; pageIndex?: number } | null;
  // Project and source dragged onto the table, if it was opened by a drop
  projectId?: string;
  sourceId?: string;
  columnKey?: string;
}>({ visible: false, target: null, newAt: null });

const tableConfigTable = computed(() => tableAt(tableConfig.value.target));
const tableConfigWidth = computed(() => {
  if (tableConfigTable.value?.width) return tableConfigTable.value.width;
  const availableWidth = Math.round(getFrameTemplateContext().availableWidth);
  const sideMargin = 50;
  return Math.max(100, availableWidth - sideMargin * 2);
});

const openTableConfig = (
  target: TableLocation | null,
  options: {
    newAt?: { bandIndex: number; y: number; pageIndex?: number };
    projectId?: string;
    sourceId?: string;
    columnKey?: string;
  } = {},
) => {
  tableConfig.value = {
    visible: true,
    target,
    newAt: options.newAt ?? null,
    projectId: options.projectId,
    sourceId: options.sourceId,
    columnKey: options.columnKey,
  };
};

const openTableConfigByUuid = (uuid: string) => {
  const location = findTableByUuid(uuid);
  if (!location) return;
  selectElement(location.bandIndex, location.elementIndex, false, location.parentFrameIndex);
  openTableConfig(location);
};

const openTableConfigForSelection = () => {
  if (!selectedElement.value) return;
  const { bandIndex, elementIndex, parentFrameIndex } = selectedElement.value;
  if (tableAt({ bandIndex, elementIndex, parentFrameIndex })) {
    openTableConfig({ bandIndex, elementIndex, parentFrameIndex });
  }
};

// Apply the popup: one undo step, whether the table is new or not
const applyTableConfig = (binding: TableDataBinding, rowCount: number) => {
  const { target, newAt } = tableConfig.value;
  let table = tableAt(target);
  let location = target;
  if (!table && !newAt) return;

  saveStateToHistory();

  if (!table && newAt) {
    const band = bands.value[newAt.bandIndex];
    if (!band) return;
    const availableWidth = Math.round(getFrameTemplateContext().availableWidth);
    const width = tableConfigWidth.value;
    table = {
      ...(createLibraryElement("table") as TableElement),
      uuid: crypto.randomUUID(),
      x: Math.round((availableWidth - width) / 2),
      y: newAt.y,
      width,
    };
    if (newAt.pageIndex !== undefined) table.pageIndex = newAt.pageIndex;
    band.elements.push(table);
    location = { bandIndex: newAt.bandIndex, elementIndex: band.elements.length - 1 };
  }
  if (!table || !location) return;

  table.binding = binding;
  table.height = tableHeight(binding, rowCount, table.headerHeight, table.rowHeight);

  // The table must still fit its section: moved up, or the section grows
  if (location.parentFrameIndex === undefined) {
    const plan = planDropInBand(location.bandIndex, table);
    if (plan.kind !== "tooTall") applyDropInBand(location.bandIndex, table, plan);
  }

  selectElement(location.bandIndex, location.elementIndex, false, location.parentFrameIndex);
  updateJRXML();
};

// ---- Charts: the Configure popup ----
const chartAt = (location: TableLocation | null): ChartElement | null => {
  const el = location ? elementAtLocation(location) : undefined;
  return el?.type === "chart" ? (el as ChartElement) : null;
};

const chartConfig = ref<{
  visible: boolean;
  target: TableLocation | null;
  // Project and source dragged onto the chart, if it was opened by a drop
  projectId?: string;
  sourceId?: string;
  columnKey?: string;
}>({ visible: false, target: null });

const chartConfigElement = computed(() => chartAt(chartConfig.value.target));

const openChartConfig = (
  target: TableLocation,
  options: { projectId?: string; sourceId?: string; columnKey?: string } = {},
) => {
  chartConfig.value = { visible: true, target, ...options };
};

const openChartConfigForSelection = () => {
  if (!selectedElement.value) return;
  const { bandIndex, elementIndex, parentFrameIndex } = selectedElement.value;
  const location = { bandIndex, elementIndex, parentFrameIndex };
  if (chartAt(location)) openChartConfig(location);
};

// Apply the popup: one undo step
const applyChartConfig = (binding: ChartBinding) => {
  const location = chartConfig.value.target;
  const chart = chartAt(location);
  if (!chart || !location) return;
  saveStateToHistory();
  chart.binding = binding;
  selectElement(location.bandIndex, location.elementIndex, false, location.parentFrameIndex);
  updateJRXML();
};

// A chart's numbers arrived: its picture in the JRXML is redrawn
watch(chartDataVersion, () => updateJRXML());

// A source or column dropped from the "Report Data" list
const handleDataSourceDrop = (
  event: DragEvent,
  drag: Exclude<DataSourceDragPayload, { kind: "projectField" }>,
  pageIndex?: number,
) => {
  const columnKey = drag.kind === "column" ? drag.column.key : undefined;

  // Onto a chart: its Configure popup opens with that source (and column)
  const chartEl = (event.target as HTMLElement)?.closest?.("[data-chart-uuid]") as HTMLElement | null;
  const chartLocation = chartEl ? findElementByUuid(chartEl.dataset.chartUuid || "") : null;
  if (chartLocation && chartAt(chartLocation)) {
    selectElement(chartLocation.bandIndex, chartLocation.elementIndex, false, chartLocation.parentFrameIndex);
    openChartConfig(chartLocation, { projectId: drag.projectId, sourceId: drag.sourceId, columnKey });
    return;
  }

  const tableEl = (event.target as HTMLElement)?.closest?.("[data-table-uuid]") as HTMLElement | null;
  const location = tableEl ? findTableByUuid(tableEl.dataset.tableUuid || "") : null;
  const table = tableAt(location);

  if (table && location) {
    // One more column of the source the table already shows: added directly
    if (
      drag.kind === "column" &&
      table.binding?.projectId === drag.projectId &&
      table.binding?.sourceId === drag.sourceId
    ) {
      addColumnToTable(table, drag.column);
      return;
    }
    openTableConfig(location, { projectId: drag.projectId, sourceId: drag.sourceId, columnKey });
    return;
  }

  // Dropped beside any table: a new table in the Detail section, made on Apply
  const bandEl = (event.target as HTMLElement)?.closest?.(".band") as HTMLElement | null;
  const bandIndex = bandEl?.dataset.bandIndex !== undefined ? parseInt(bandEl.dataset.bandIndex, 10) : -1;
  const band = bands.value[bandIndex];
  if (!band || band.type !== BAND_TYPE_CONSTANTS.DETAIL || !bandEl) {
    notification.warning(t("dataTable.onlyInDetail"));
    return;
  }
  const y = Math.max(0, Math.round((event.clientY - bandEl.getBoundingClientRect().top) / zoomLevel.value));
  const sheet = (event.target as HTMLElement)?.closest?.(".page-sheet") as HTMLElement | null;
  const sheetPage = sheet?.dataset.pageIndex !== undefined ? parseInt(sheet.dataset.pageIndex, 10) : undefined;
  openTableConfig(null, {
    newAt: { bandIndex, y, pageIndex: sheetPage ?? pageIndex },
    projectId: drag.projectId,
    sourceId: drag.sourceId,
    columnKey,
  });
};

const addColumnToTable = (table: TableElement, column: DataColumn) => {
  const binding = table.binding;
  if (!binding) return;
  if (binding.columns.some((c) => c.key === column.key)) {
    notification.info(t("dataTable.columnAlreadyShown", { column: column.label }));
    return;
  }
  if (binding.columns.length >= maxColumnsForWidth(table.width)) {
    notification.warning(t("dataTable.columnLimitReached", { max: maxColumnsForWidth(table.width) }));
    return;
  }
  saveStateToHistory();
  binding.columns = evenColumnWidths([...binding.columns, toColumnBinding(column, 0)], table.width);
  updateJRXML();
};

// Handle the drag-leave event
const handleDragLeave = (event: DragEvent) => {
  // Check whether the paper area was actually left
  const paper = document.querySelector(".paper") as HTMLElement;
  if (paper && !paper.contains(event.relatedTarget as Node)) {
    highlightedBandIndex.value = null;
    dropTargetBlocked.value = false;
  }
};

const getDefaultElementProperties = (type: string): Partial<DesignElement> => {
  // Use the report's default font settings
  const defaultFontProps = {
    fontFamily:
      reportProperties.value?.defaultFont?.name ||
      FONT_CONSTANTS.DEFAULT_FONT_FAMILY,
    fontSize:
      reportProperties.value?.defaultFont?.size ||
      REPORT_CONSTANTS.DEFAULT_FONT_SIZE,
    isBold: reportProperties.value?.defaultFont?.isBold || false,
    isItalic: reportProperties.value?.defaultFont?.isItalic || false,
    isUnderline: reportProperties.value?.defaultFont?.isUnderline || false,
  };

  // Calculate the available width of the report page
  const calculateAvailableWidth = () => {
    const pageWidth =
      reportProperties.value?.pageWidth || REPORT_CONSTANTS.DEFAULT_PAGE_WIDTH;
    const leftMargin =
      reportProperties.value?.leftMargin || REPORT_CONSTANTS.DEFAULT_MARGIN;
    const rightMargin =
      reportProperties.value?.rightMargin || REPORT_CONSTANTS.DEFAULT_MARGIN;
    return Math.round(pageWidth - leftMargin - rightMargin);
  };

  switch (type) {
    case "textField":
      return {
        expression: `"${t("properties.defaultTextFieldExpression")}"`,
        evaluationTime: "Now",
        pattern: "",
        isBlankWhenNull: false,
        ...defaultFontProps,
        textAlignment: "Left",
        verticalAlignment: "Top",
      };
    case "image":
      return {
        imageExpression: "",
      };
    case "line":
      return { lineDirection: "TopDown", lineWidth: 1, height: 1 };
    case "rectangle":
      return {
        mode: "Transparent",
        border: "1px solid #ccc", // Add a default border for rectangle elements
      };
    case "frame":
      // A new Box starts with a thin light border so it can be seen (and is
      // printed); a fresh object each time, since border edits change it in place
      return { box: applyBorderPreset(undefined, "light") };
    case "table":
      return {
        width: calculateAvailableWidth(),
      };
    default:
      return {};
  }
};

// Guard flag to prevent drag/resize release from inadvertently unselecting the active element
const isJustDraggedOrResized = ref(false);

// Select a band
const selectBand = (index: number) => {
  if (isJustDraggedOrResized.value) {
    return;
  }
  setDesignAreaFocused();
  selectedBandIndex.value = index;
  selectedElement.value = null;
  selectedElements.value = []; // Clear the multi-selection
  // Update the last-clicked band index
  lastClickedBandIndex.value = index;
  // Automatically hide the bottom panel
  showBottomPanel.value = false;
  // Automatically switch to the properties tab
  rightPanelTab.value = "properties";
};

// Select an element
const selectElement = (
  bandIndex: number,
  elementIndex: number,
  isMultiSelect = false,
  parentFrameIndex?: number,
) => {
  // Get the element reference in order to obtain its UUID
  const band = bands.value[bandIndex];
  let element;

  if (parentFrameIndex !== undefined) {
    const frame = band?.elements[parentFrameIndex] as FrameElement;
    if (frame && frame.type === "frame" && frame.elements) {
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
      (el) =>
        el.bandIndex === bandIndex &&
        el.elementIndex === elementIndex &&
        el.parentFrameIndex === parentFrameIndex,
    );

    if (existingIndex !== -1) {
      // If the element is already selected, deselect it
      selectedElements.value.splice(existingIndex, 1);
    } else {
      // Add it to the multi-selection list
      selectedElements.value.push({
        bandIndex,
        elementIndex,
        parentFrameIndex,
        uuid,
      });
    }

    // If nothing is selected anymore, clear selectedElement
    if (selectedElements.value.length === 0) {
      selectedElement.value = null;
    } else {
      // Use the last-selected element as the current selection
      const lastSelected =
        selectedElements.value[selectedElements.value.length - 1];
      if (lastSelected) {
        selectedElement.value = {
          bandIndex: lastSelected.bandIndex,
          elementIndex: lastSelected.elementIndex,
          parentFrameIndex: lastSelected.parentFrameIndex,
          uuid: lastSelected.uuid,
        };
      }
    }
  } else {
    // Single-select mode
    selectedElement.value = { bandIndex, elementIndex, parentFrameIndex, uuid };
    selectedElements.value = [
      { bandIndex, elementIndex, parentFrameIndex, uuid },
    ]; // Clear the multi-selection list, keeping only the currently selected element
  }

  selectedBandIndex.value = null;

  // Automatically hide the bottom panel
  showBottomPanel.value = false;

  if (element && !element.box) {
    initBox(element);
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
const selectElementsInRect = (rect: {
  left: number;
  top: number;
  right: number;
  bottom: number;
}) => {
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
        selectedElements.value.push({
          bandIndex,
          elementIndex,
          uuid: element.uuid,
        });
      }
    });

    // Update the band's Y offset
    bandOffsetY += band.height;
  });

  // If any elements are selected, use the last-selected one as the current selection
  if (selectedElements.value.length > 0) {
    const lastSelected =
      selectedElements.value[selectedElements.value.length - 1];
    if (lastSelected) {
      selectedElement.value = {
        bandIndex: lastSelected.bandIndex,
        elementIndex: lastSelected.elementIndex,
        uuid: lastSelected.uuid,
      };
    }
  }

  // Automatically hide the bottom panel
  showBottomPanel.value = false;
};

// Cache the event handler functions to avoid recreating them
let cachedMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let cachedMouseUpHandler: ((e: MouseEvent) => void) | null = null;

// Detect target band and sheet under coordinates (combines elementFromPoint with geometric fallback)
// The page sheet and band at a screen point, found from their positions on screen.
// Not from what is drawn there: while dragging, that is usually the dragged
// element itself, which still sits in its old band.
const getTargetBandAndSheetUnderPoint = (clientX: number, clientY: number) => {
  const sheets = Array.from(document.querySelectorAll<HTMLElement>(".page-sheet"));
  const sheetUnderMouse =
    sheets.find((sheet) => {
      const rect = sheet.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX < rect.right &&
        clientY >= rect.top &&
        clientY < rect.bottom
      );
    }) ??
    sheets.find((sheet) => {
      const rect = sheet.getBoundingClientRect();
      return clientY >= rect.top && clientY < rect.bottom;
    }) ??
    sheets[0] ??
    null;

  let bandUnderMouse: HTMLElement | null = null;
  if (sheetUnderMouse) {
    const bandEls = Array.from(sheetUnderMouse.querySelectorAll<HTMLElement>(".band"));
    // Bands are stacked; a point on the line between two belongs to the lower
    // one, so an element snapped to a band's bottom edge moves into the next band
    bandUnderMouse =
      bandEls.find((bandEl) => {
        const rect = bandEl.getBoundingClientRect();
        return clientY >= rect.top && clientY < rect.bottom;
      }) ?? null;
    if (!bandUnderMouse && bandEls.length > 0) {
      // Above the first band or below the last (in the margins): the nearest one
      const first = bandEls[0]!;
      bandUnderMouse =
        clientY < first.getBoundingClientRect().top ? first : bandEls[bandEls.length - 1]!;
    }
  }

  return { bandUnderMouse, sheetUnderMouse };
};

// Start dragging an element
// Drag an item inside its box, kept within the box's edges
const startDraggingInsideBox = (
  event: MouseEvent,
  element: DesignElement,
  bandIndex: number,
  boxIndex: number,
) => {
  const box = bands.value[bandIndex]!.elements[boxIndex] as FrameElement;
  const zoom = zoomLevel.value;
  const startX = event.clientX;
  const startY = event.clientY;
  const origX = element.x;
  const origY = element.y;
  const snapContext = buildSnapContext(
    bandIndex,
    getEventPageIndex(event, element),
    boxIndex,
    element,
  );

  // Undo snapshot before the item moves (a drag only starts after the mouse moved)
  saveStateToHistory();
  isDraggingOrResizing.value = true;

  const onMove = (e: MouseEvent) => {
    const options = getSnapOptions(e, snapContext.offset);
    const snapped = snapMove(
      {
        x: origX + (e.clientX - startX) / zoom,
        y: origY + (e.clientY - startY) / zoom,
        width: element.width,
        height: element.height,
      },
      snapContext.targets,
      options,
    );
    const position = clampPositionInBox({ ...element, ...snapped }, box);
    element.x = position.x;
    element.y = position.y;
    showSnapGuides(snapContext, snapped.guides, options);
  };
  const frameMove = throttleToAnimationFrame(onMove);

  const onUp = () => {
    frameMove.flush();
    clearAlignmentLines();
    document.removeEventListener("mousemove", frameMove);
    document.removeEventListener("mouseup", onUp);
    isDraggingOrResizing.value = false;
    isJustDraggedOrResized.value = true;
    setTimeout(() => {
      isJustDraggedOrResized.value = false;
    }, 150);
    updateJRXML();
  };

  document.addEventListener("mousemove", frameMove);
  document.addEventListener("mouseup", onUp);
};

// The page sheet a mouse event happened on (detail content is per page)
const getEventPageIndex = (event: Event, element?: DesignElement): number => {
  const sheet = (event.target as HTMLElement | null)?.closest?.(
    ".page-sheet",
  ) as HTMLElement | null;
  if (sheet?.dataset.pageIndex !== undefined) {
    return parseInt(sheet.dataset.pageIndex, 10);
  }
  return element?.pageIndex ?? 0;
};

// Run a mouse-move handler at most once per screen frame, with the latest event:
// the canvas never does more work than it can draw. `flush` applies a pending
// move at once (call it on mouse-up so the final position is the last one).
const throttleToAnimationFrame = (handler: (e: MouseEvent) => void) => {
  let pending: MouseEvent | null = null;
  let frame = 0;
  const flush = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (pending) {
      const e = pending;
      pending = null;
      handler(e);
    }
  };
  const onMove = (e: MouseEvent) => {
    pending = e;
    if (!frame) frame = requestAnimationFrame(flush);
  };
  return Object.assign(onMove, { flush });
};

const startDragging = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  event.stopPropagation();
  selectElement(bandIndex, elementIndex, false, parentFrameIndex);

  // Automatically hide the bottom panel
  showBottomPanel.value = false;

  const band = bands.value[bandIndex];
  let draggedElement: DesignElement | undefined;

  if (parentFrameIndex !== undefined) {
    const frame = band?.elements[parentFrameIndex] as FrameElement;
    if (frame && frame.type === "frame" && frame.elements) {
      draggedElement = frame.elements[elementIndex];
    }
  } else {
    draggedElement = band?.elements[elementIndex];
  }

  // A ready-made box's own parts move only within the box; a drag never pulls
  // them out. Other items in a box can be dragged anywhere.
  if (draggedElement && parentFrameIndex !== undefined && isBoxPart(draggedElement)) {
    startDraggingInsideBox(event, draggedElement, bandIndex, parentFrameIndex);
    return;
  }

  if (draggedElement) {
    const currentZoom = zoomLevel.value;

    const targetSheet =
      ((event.target as HTMLElement)?.closest(".page-sheet") as HTMLElement) ||
      (document.querySelector(".page-sheet") as HTMLElement) ||
      (document.querySelector(".paper") as HTMLElement);
    let sourcePageIndex = 0;
    if (targetSheet && targetSheet.dataset.pageIndex !== undefined) {
      sourcePageIndex = parseInt(targetSheet.dataset.pageIndex, 10);
    } else if ((draggedElement as any).pageIndex !== undefined) {
      sourcePageIndex = (draggedElement as any).pageIndex;
    }

    draggingInfo.value = {
      bandIndex,
      elementIndex,
      parentFrameIndex,
      startX: event.clientX,
      startY: event.clientY,
      origElementX: draggedElement.x,
      origElementY: draggedElement.y,
      lastTargetBandIndex: bandIndex,
      sourcePageIndex,
      lastTargetPageIndex: sourcePageIndex,
    };

    // Undo snapshot before the element moves (a drag only starts after the
    // mouse has moved, so plain clicks add no undo step)
    saveStateToHistory();

    isDraggingOrResizing.value = true;

    // Drop handlers left over from a drag whose mouse-up was missed
    if (cachedMouseMoveHandler) {
      document.removeEventListener("mousemove", cachedMouseMoveHandler);
      cachedMouseMoveHandler = null;
    }
    if (cachedMouseUpHandler) {
      document.removeEventListener("mouseup", cachedMouseUpHandler);
      cachedMouseUpHandler = null;
    }

    // What the element can snap to; the other elements stay put during the drag
    const snapContext = buildSnapContext(
      bandIndex,
      sourcePageIndex,
      parentFrameIndex,
      draggedElement,
    );

    {
      const applyDragMove = (e: MouseEvent) => {
        if (draggingInfo.value) {
          const currentBand = bands.value[draggingInfo.value.bandIndex];
          let currentElement: DesignElement | undefined;
          let containerWidth =
            paperWidth.value -
            (reportProperties.value?.leftMargin || 0) -
            (reportProperties.value?.rightMargin || 0);

          if (draggingInfo.value.parentFrameIndex !== undefined) {
            const frame =
              currentBand?.elements[draggingInfo.value.parentFrameIndex];
            if (frame && frame.type === "frame" && frame.elements) {
              currentElement = frame.elements[draggingInfo.value.elementIndex];
              containerWidth = frame.width;
            }
          } else {
            currentElement =
              currentBand?.elements[draggingInfo.value.elementIndex];
          }

          if (currentBand && currentElement) {
            const currentZoom = zoomLevel.value;

            // Direct delta from starting mouse position (1:1 cursor following, zero jitter)
            const deltaX =
              (e.clientX - draggingInfo.value.startX) / currentZoom;
            const deltaY =
              (e.clientY - draggingInfo.value.startY) / currentZoom;

            // Snap: line up with other elements first, else the grid
            const snapOptions = getSnapOptions(e, snapContext.offset);
            const snapped = snapMove(
              {
                x: (draggingInfo.value.origElementX ?? 0) + deltaX,
                y: (draggingInfo.value.origElementY ?? 0) + deltaY,
                width: currentElement.width,
                height: currentElement.height,
              },
              snapContext.targets,
              snapOptions,
            );
            let newX = snapped.x;
            const newY = snapped.y;

            // Inside band, constrain X coordinate to container width
            if (draggingInfo.value.parentFrameIndex === undefined) {
              newX = Math.max(
                0,
                Math.min(newX, containerWidth - currentElement.width),
              );
            }

            currentElement.x = Math.round(newX);
            currentElement.y = Math.round(newY);
            showSnapGuides(snapContext, snapped.guides, snapOptions);

            // Target band and sheet detection:
            // Use the visual position of the element's top to prevent accidental reparenting
            // when grabbing the lower portion of a tall or overflowing element
            const sourceSheet =
              document.querySelector(
                `.page-sheet[data-page-index="${draggingInfo.value.sourcePageIndex}"]`,
              ) ||
              document.querySelector(".page-sheet") ||
              document.querySelector(".paper");
            const sourceBandEl = sourceSheet?.querySelector(
              `.band[data-band-index="${draggingInfo.value.bandIndex}"]`,
            ) as HTMLElement | null;

            let checkY = e.clientY;
            if (sourceBandEl) {
              const sRect = sourceBandEl.getBoundingClientRect();
              checkY = sRect.top + newY * currentZoom;
            }

            const { bandUnderMouse, sheetUnderMouse } =
              getTargetBandAndSheetUnderPoint(e.clientX, checkY);

            let targetBandIndex = draggingInfo.value.bandIndex;
            if (
              bandUnderMouse &&
              bandUnderMouse.dataset.bandIndex !== undefined
            ) {
              targetBandIndex = parseInt(bandUnderMouse.dataset.bandIndex, 10);
              highlightedBandIndex.value = targetBandIndex;
              draggingInfo.value.lastTargetBandIndex = targetBandIndex;
            }

            if (
              sheetUnderMouse &&
              sheetUnderMouse.dataset.pageIndex !== undefined
            ) {
              draggingInfo.value.lastTargetPageIndex = parseInt(
                sheetUnderMouse.dataset.pageIndex,
                10,
              );
            }

            // Display coordinates relative to target band
            let relativeX = Math.max(0, Math.round(newX));
            let relativeY = Math.round(newY);

            if (
              bandUnderMouse &&
              targetBandIndex !== draggingInfo.value.bandIndex
            ) {
              const sourceSheet =
                document.querySelector(
                  `.page-sheet[data-page-index="${draggingInfo.value.sourcePageIndex}"]`,
                ) ||
                document.querySelector(".page-sheet") ||
                document.querySelector(".paper");
              const sourceBandEl = sourceSheet?.querySelector(
                `.band[data-band-index="${draggingInfo.value.bandIndex}"]`,
              ) as HTMLElement | null;
              if (sourceBandEl) {
                const sourceRect = sourceBandEl.getBoundingClientRect();
                const targetRect = bandUnderMouse.getBoundingClientRect();
                relativeY = Math.round(
                  newY + (sourceRect.top - targetRect.top) / currentZoom,
                );
              }
            }
            if (relativeY < 0) relativeY = 0;

            // Red target band when the element is too tall for it (the drop
            // would be refused); not when it lands in a box in that band
            dropTargetBlocked.value =
              targetBandIndex !== draggingInfo.value.bandIndex &&
              !isOverBox(targetBandIndex, currentElement, relativeX, relativeY) &&
              planDropInBand(targetBandIndex, {
                y: relativeY,
                height: currentElement.height,
              }).kind === "tooTall";

            const targetBand = bands.value[targetBandIndex];
            const bandName = targetBand
              ? getBandDisplayName(targetBand.type) + " - "
              : "";

            dragCoordinates.value = {
              x: relativeX,
              y: relativeY,
              visible: true,
              bandName,
            };

            const coordinatesElement = document.querySelector(
              ".coordinates-display",
            ) as HTMLElement;
            if (coordinatesElement) {
              coordinatesElement.style.left = e.clientX + 10 + "px";
              coordinatesElement.style.top = e.clientY - 30 + "px";
            }
          }
        }
      };
      const frameMove = throttleToAnimationFrame(applyDragMove);
      cachedMouseMoveHandler = frameMove;

      cachedMouseUpHandler = (e: MouseEvent) => {
        // Apply the last mouse move before reading the final position
        frameMove.flush();
        if (draggingInfo.value) {
          const currentBand = bands.value[draggingInfo.value.bandIndex];
          let currentElement: DesignElement | undefined;

          if (draggingInfo.value.parentFrameIndex !== undefined) {
            if (
              currentBand &&
              currentBand.elements &&
              currentBand.elements[draggingInfo.value.parentFrameIndex]
            ) {
              const frame =
                currentBand.elements[draggingInfo.value.parentFrameIndex];
              if (frame && frame.type === "frame" && frame.elements) {
                currentElement =
                  frame.elements[draggingInfo.value.elementIndex];
              }
            }
          } else {
            if (currentBand && currentBand.elements) {
              currentElement =
                currentBand.elements[draggingInfo.value.elementIndex];
            }
          }

          if (currentBand && currentElement) {
            const currentZoom = zoomLevel.value;
            const sourcePageIndex = draggingInfo.value.sourcePageIndex ?? 0;

            const sourceSheet =
              document.querySelector(
                `.page-sheet[data-page-index="${draggingInfo.value.sourcePageIndex}"]`,
              ) ||
              document.querySelector(".page-sheet") ||
              document.querySelector(".paper");
            const sourceBandEl =
              (sourceSheet?.querySelector(
                `.band[data-band-index="${draggingInfo.value.bandIndex}"]`,
              ) as HTMLElement | null) ||
              (document.querySelectorAll(".band")[
                draggingInfo.value.bandIndex
              ] as HTMLElement | undefined);

            let checkY = e.clientY;
            if (sourceBandEl) {
              const sRect = sourceBandEl.getBoundingClientRect();
              checkY = sRect.top + currentElement.y * currentZoom;
            }

            // Target band and sheet identification
            const { bandUnderMouse, sheetUnderMouse } =
              getTargetBandAndSheetUnderPoint(e.clientX, checkY);

            let targetBandIndex =
              draggingInfo.value.lastTargetBandIndex ??
              draggingInfo.value.bandIndex;
            if (
              bandUnderMouse &&
              bandUnderMouse.dataset.bandIndex !== undefined
            ) {
              targetBandIndex = parseInt(bandUnderMouse.dataset.bandIndex, 10);
            }

            let targetSheetPageIndex =
              draggingInfo.value.lastTargetPageIndex ??
              draggingInfo.value.sourcePageIndex ??
              0;
            if (
              sheetUnderMouse &&
              sheetUnderMouse.dataset.pageIndex !== undefined
            ) {
              targetSheetPageIndex = parseInt(
                sheetUnderMouse.dataset.pageIndex,
                10,
              );
            }

            const targetBand = bands.value[targetBandIndex];

            // Source parent coordinates if inside a frame
            let sourceParentRelX = 0;
            let sourceParentRelY = 0;
            if (draggingInfo.value.parentFrameIndex !== undefined) {
              const frame =
                bands.value[draggingInfo.value.bandIndex]?.elements[
                  draggingInfo.value.parentFrameIndex
                ];
              if (frame) {
                sourceParentRelX = frame.x;
                sourceParentRelY = frame.y;
              }
            }

            const elementRelSourceBandX = sourceParentRelX + currentElement.x;
            const elementRelSourceBandY = sourceParentRelY + currentElement.y;

            const targetSheetEl =
              document.querySelector(
                `.page-sheet[data-page-index="${targetSheetPageIndex}"]`,
              ) ||
              document.querySelector(".page-sheet") ||
              document.querySelector(".paper");

            const targetBandEl =
              (targetSheetEl?.querySelector(
                `.band[data-band-index="${targetBandIndex}"]`,
              ) as HTMLElement) ||
              document.querySelectorAll(".band")[targetBandIndex];

            let elementRelTargetBandX = elementRelSourceBandX;
            let elementRelTargetBandY = elementRelSourceBandY;

            if (
              sourceBandEl &&
              targetBandEl &&
              (draggingInfo.value.bandIndex !== targetBandIndex ||
                sourcePageIndex !== targetSheetPageIndex)
            ) {
              const sourceBandRect = sourceBandEl.getBoundingClientRect();
              const targetBandRect = targetBandEl.getBoundingClientRect();
              const bandOffsetY =
                (sourceBandRect.top - targetBandRect.top) / currentZoom;
              elementRelTargetBandY = elementRelSourceBandY + bandOffsetY;
            }

            // Find target frame within target band (if dropped inside a frame).
            // Frames themselves are never nested: selection only supports one frame level.
            let targetFrameIndex = -1;
            if (currentElement.type !== "frame" && targetBand && targetBand.elements) {
              for (let i = targetBand.elements.length - 1; i >= 0; i--) {
                if (
                  targetBandIndex === draggingInfo.value.bandIndex &&
                  draggingInfo.value.parentFrameIndex === undefined &&
                  i === draggingInfo.value.elementIndex
                ) {
                  continue;
                }

                const el = targetBand.elements[i];
                if (!el) continue;
                if (el.type === "frame") {
                  const centerX =
                    elementRelTargetBandX + currentElement.width / 2;
                  const centerY =
                    elementRelTargetBandY + currentElement.height / 2;

                  if (
                    centerX >= el.x &&
                    centerX <= el.x + el.width &&
                    centerY >= el.y &&
                    centerY <= el.y + el.height
                  ) {
                    targetFrameIndex = i;
                    break;
                  }
                }
              }
            }

            const isSameBand = draggingInfo.value.bandIndex === targetBandIndex;
            const isSameFrame =
              draggingInfo.value.parentFrameIndex ===
              (targetFrameIndex === -1 ? undefined : targetFrameIndex);
            const isSamePage = sourcePageIndex === targetSheetPageIndex;

            // Y was snapped in the source band; snap it again to the grid of the
            // band it lands in (bands start at different heights; X is shared)
            const landingGrid = getSnapOptions(e).grid;
            if (landingGrid && !isSameBand) {
              elementRelTargetBandY = snapToGrid(elementRelTargetBandY, landingGrid);
            }

            // Landing in a band (not in a box): it must fit, growing the band up
            // to its maximum if needed. Too tall for another band: refused.
            const bandPlan =
              targetFrameIndex === -1 && targetBand
                ? planDropInBand(targetBandIndex, {
                    y: elementRelTargetBandY,
                    height: currentElement.height,
                  })
                : null;

            if (bandPlan?.kind === "tooTall" && !isSameBand) {
              currentElement.x = draggingInfo.value.origElementX ?? currentElement.x;
              currentElement.y = draggingInfo.value.origElementY ?? currentElement.y;
              warnTooTallForBand(targetBandIndex, currentElement.height, bandPlan.maxHeight);
              selectElement(
                draggingInfo.value.bandIndex,
                draggingInfo.value.elementIndex,
                false,
                draggingInfo.value.parentFrameIndex,
              );
            } else if ((!isSameBand || !isSameFrame) && targetBand) {
              // Reparenting
              let targetFrame: FrameElement | null = null;
              if (targetFrameIndex !== -1) {
                targetFrame = targetBand.elements[
                  targetFrameIndex
                ] as FrameElement;
              }

              // Remove from source
              let element: DesignElement | undefined;
              if (draggingInfo.value.parentFrameIndex !== undefined) {
                const frame = bands.value[draggingInfo.value.bandIndex]
                  ?.elements[
                  draggingInfo.value.parentFrameIndex
                ] as FrameElement;
                if (frame && frame.elements) {
                  element = frame.elements.splice(
                    draggingInfo.value.elementIndex,
                    1,
                  )[0];
                }
              } else {
                element = bands.value[
                  draggingInfo.value.bandIndex
                ]?.elements.splice(draggingInfo.value.elementIndex, 1)[0];
              }

              if (element) {
                if (targetFrame) {
                  if (!targetFrame.elements) targetFrame.elements = [];
                  element.x = Math.round(elementRelTargetBandX - targetFrame.x);
                  element.y = Math.round(elementRelTargetBandY - targetFrame.y);
                  element.x = Math.max(0, element.x);
                  element.y = Math.max(0, element.y);
                  if (element.x + element.width > targetFrame.width)
                    element.x = Math.max(0, targetFrame.width - element.width);
                  if (element.y + element.height > targetFrame.height)
                    element.y = Math.max(
                      0,
                      targetFrame.height - element.height,
                    );
                  delete (element as any).pageIndex;

                  targetFrame.elements.push(element);
                  selectElement(
                    targetBandIndex,
                    targetFrame.elements.length - 1,
                    false,
                    targetFrameIndex,
                  );
                } else {
                  element.x = Math.max(0, Math.round(elementRelTargetBandX));
                  if (bandPlan && bandPlan.kind !== "tooTall") {
                    applyDropInBand(targetBandIndex, element, bandPlan);
                  } else {
                    element.y = Math.max(0, Math.round(elementRelTargetBandY));
                  }

                  if (targetBand.type === BAND_TYPE_CONSTANTS.DETAIL) {
                    (element as any).pageIndex = targetSheetPageIndex;
                  } else {
                    delete (element as any).pageIndex;
                  }

                  targetBand.elements.push(element);
                  selectElement(
                    targetBandIndex,
                    targetBand.elements.length - 1,
                  );
                }
              }
            } else {
              // Within the same container
              const movedAcrossPages =
                isSameBand &&
                !isSamePage &&
                currentBand.type === BAND_TYPE_CONSTANTS.DETAIL;
              if (movedAcrossPages) {
                (currentElement as any).pageIndex = targetSheetPageIndex;
              }
              currentElement.x = Math.max(0, Math.round(currentElement.x));
              if (bandPlan && bandPlan.kind !== "tooTall") {
                // Kept inside its band (moved up, or the band grows)
                applyDropInBand(targetBandIndex, currentElement, bandPlan);
              } else {
                currentElement.y = Math.max(
                  0,
                  Math.round(movedAcrossPages ? elementRelTargetBandY : currentElement.y),
                );
              }

              // Ensure the element remains selected after moving within the same container
              selectElement(
                draggingInfo.value.bandIndex,
                draggingInfo.value.elementIndex,
                false,
                draggingInfo.value.parentFrameIndex,
              );
            }

            if (targetSheetPageIndex >= pageCount.value) {
              pageCount.value = targetSheetPageIndex + 1;
            }
          }
        }

        // Clear highlight and coordinate display
        highlightedBandIndex.value = null;
        dropTargetBlocked.value = false;
        dragCoordinates.value.visible = false;
        clearAlignmentLines();
        draggingInfo.value = null;
        isDraggingOrResizing.value = false;
        isJustDraggedOrResized.value = true;
        setTimeout(() => {
          isJustDraggedOrResized.value = false;
        }, 150);

        // Remove event listeners
        if (cachedMouseMoveHandler) {
          document.removeEventListener("mousemove", cachedMouseMoveHandler);
          cachedMouseMoveHandler = null;
        }
        if (cachedMouseUpHandler) {
          document.removeEventListener("mouseup", cachedMouseUpHandler);
          cachedMouseUpHandler = null;
        }

        // Update JRXML
        updateJRXML();
      };
    }

    // Add the event listeners
    document.addEventListener("mousemove", cachedMouseMoveHandler);
    document.addEventListener("mouseup", cachedMouseUpHandler);

    // Immediately fire a mousemove event once, so the element follows the mouse right away
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
          if (frame && frame.type === "frame" && frame.elements) {
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
        if (frame && frame.type === "frame" && frame.elements) {
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
const startEditing = (
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  // Page numbers are generated by the report: only their format, range and
  // style can change, from the property panel
  const band = bands.value[bandIndex];
  const target =
    parentFrameIndex !== undefined
      ? (band?.elements?.[parentFrameIndex] as FrameElement | undefined)
          ?.elements?.[elementIndex]
      : band?.elements?.[elementIndex];
  if (target?.type === "table") {
    selectElement(bandIndex, elementIndex, false, parentFrameIndex);
    openTableConfig({ bandIndex, elementIndex, parentFrameIndex });
    return;
  }
  if (target?.type === "chart") {
    selectElement(bandIndex, elementIndex, false, parentFrameIndex);
    openChartConfig({ bandIndex, elementIndex, parentFrameIndex });
    return;
  }
  if (isPagination(target)) {
    selectElement(bandIndex, elementIndex, false, parentFrameIndex);
    notification.warning(t("pagination.cannotEdit"));
    return;
  }

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
    console.error(
      "reportProperties.value is undefined, cannot save to local storage",
    );
    return;
  }

  saveToLocalStorage(
    {
      reportProperties: reportProperties.value,
      bands: bands.value,
      reportFields: reportFields.value,
      jrxmlContent: jrxmlContent.value,
    },
    reportProperties.value?.name || "report",
  );
};

const loadFromLocalStorageWrapper = () => {
  const loadedData = loadFromLocalStorage();
  if (loadedData && loadedData.reportData) {
    reportProperties.value = {
      ...loadedData.reportData.reportProperties,
      bandLimits:
        loadedData.reportData.reportProperties.bandLimits ||
        getEffectiveDefaultBandLimits(),
    };
    bands.value = loadedData.reportData.bands;
    // Repair copies that share IDs with their original (pasted before copies got their own)
    ensureUniqueUuids(bands.value);
    ensureUniqueTableDatasets(bands.value);
    resetBoxPhotos(bands.value);
    reportFields.value = loadedData.reportData.reportFields;
    jrxmlContent.value = loadedData.reportData.jrxmlContent;
    // Update selectedBandTypes to match the loaded bands
    if (
      loadedData.reportData.bands &&
      Array.isArray(loadedData.reportData.bands)
    ) {
      selectedBandTypes.value = loadedData.reportData.bands.map(
        (band: Band) => band.type,
      );
    } else {
      selectedBandTypes.value = [];
    }
    return true;
  }
  return false;
};

// Initialize an element's Box property: padding only. Borders are pens, written
// by the border presets and Style Settings when the user sets one.
const initBox = (element: DesignElement) => {
  element.box = {
    padding: 0,
    topPadding: 0,
    leftPadding: 0,
    bottomPadding: 0,
    rightPadding: 0,
  };
};

// Download the JRXML file (charts drawn with their numbers first)
const downloadJRXML = async () => {
  await ensureChartData(bands.value);
  const content = generateJRXMLContent(
    {
      ...reportProperties.value,
      pageCount: totalPages.value,
    },
    bands.value,
    reportFields.value,
    reportParameters.value,
    subDatasets.value,
    tableStyles.value,
    reportVariables.value,
    [],
    reportGroups.value,
    totalPages.value,
  );
  jrxmlContent.value = content;

  // Automatically switch to the JRXML tab
  activeTab.value = "jrxml";

  // Create the download link
  const blob = new Blob([content], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportProperties.value?.name || "report"}.jrxml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Save the data
  flushAutoSave();
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
  redo,
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
    if (
      !reportProperties.value ||
      !bands.value ||
      !reportFields.value ||
      !reportParameters.value
    ) {
      return;
    }

    // Ensure bands fit within the A4 page height and detail takes the remaining space
    ensureBandsFitPage();

    const content = generateJRXMLContent(
      {
        ...reportProperties.value,
        pageCount: totalPages.value,
      },
      bands.value,
      reportFields.value,
      reportParameters.value,
      subDatasets.value,
      tableStyles.value,
      reportVariables.value,
      [],
      reportGroups.value,
      totalPages.value,
    );

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
    console.error("Failed to update JRXML:", error);
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
        let elementData = JSON.parse(
          JSON.stringify(band.elements[elementIndex]),
        );

        // Generate a new UUID rather than duplicating the original
        elementData.uuid = crypto.randomUUID();

        // Process border properties, keeping only borders with a width greater than 0
        if (elementData.box) {
          // Handle the new border model
          if (elementData.box.pen && elementData.box.pen.lineWidth <= 0) {
            delete elementData.box.pen;
          }

          // Handle borders on each side
          ["topPen", "leftPen", "bottomPen", "rightPen"].forEach((penType) => {
            if (
              elementData.box[penType] &&
              elementData.box[penType].lineWidth <= 0
            ) {
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
          type: "PDF_DESIGNER_ELEMENT",
          version: "1.0",
          elementData: elementData,
          // Ctrl+V pastes back into the section it was copied from
          sourceBandType: band.type,
        };
        // Convert the data to a JSON string and write it to the clipboard
        await navigator.clipboard.writeText(JSON.stringify(clipboardData));
        console.log("Element copied to clipboard:", elementData);
        // Optional: show a "copied successfully" notification
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
        // Fallback: use the legacy in-memory storage approach as a backup
        let elementData = JSON.parse(
          JSON.stringify(band.elements[elementIndex]),
        );

        // Process border properties, keeping only borders with a width greater than 0
        if (elementData.box) {
          // Handle the new border model
          if (elementData.box.pen && elementData.box.pen.lineWidth <= 0) {
            delete elementData.box.pen;
          }

          // Handle borders on each side
          ["topPen", "leftPen", "bottomPen", "rightPen"].forEach((penType) => {
            if (
              elementData.box[penType] &&
              elementData.box[penType].lineWidth <= 0
            ) {
              delete elementData.box[penType];
            }
          });

          // If the box object is empty, remove the entire box property
          if (Object.keys(elementData.box).length === 0) {
            delete elementData.box;
          }
        }

        sessionStorage.setItem(
          "pdfDesignerCopiedElement",
          JSON.stringify({
            type: "PDF_DESIGNER_ELEMENT",
            version: "1.0",
            elementData: elementData,
            sourceBandType: band.type,
          }),
        );
      }
    }
  }
};

// Paste an element from the clipboard. With a screen point (right-click → Paste)
// it lands there; otherwise (Ctrl+V, toolbar) next to the original.
const pasteElement = async (at?: { clientX: number; clientY: number }) => {
  const isOurs = (data: any) =>
    data?.type === "PDF_DESIGNER_ELEMENT" && data.elementData;
  try {
    // First try reading from the clipboard
    const clipboardData = JSON.parse(await navigator.clipboard.readText());
    if (isOurs(clipboardData)) processPastedElement(clipboardData, at);
  } catch (err) {
    console.error("Failed to read from clipboard:", err);
    // Fallback: try reading from sessionStorage
    try {
      const savedData = sessionStorage.getItem("pdfDesignerCopiedElement");
      const clipboardData = savedData ? JSON.parse(savedData) : null;
      if (isOurs(clipboardData)) processPastedElement(clipboardData, at);
    } catch (sessionErr) {
      console.error("Failed to read from sessionStorage:", sessionErr);
    }
  }
};

// Screen rectangles of a band on the canvas: one per page sheet it shows on
// (a Detail band only on its own page)
const getBandScreenRects = (bandIndex: number, pageIndex?: number): DOMRect[] => {
  const sheetSelector =
    pageIndex === undefined ? ".page-sheet" : `.page-sheet[data-page-index="${pageIndex}"]`;
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      `${sheetSelector} .band[data-band-index="${bandIndex}"]`,
    ),
  ).map((el) => el.getBoundingClientRect());
};

// The part of the canvas the user can see right now
const getCanvasViewportRect = (): DOMRect | null =>
  document.querySelector<HTMLElement>(".paper-container")?.getBoundingClientRect() ?? null;

// Whether the middle of an element at (x, y) in a band is on screen
const isBandSpotOnScreen = (
  bandIndex: number,
  pageIndex: number | undefined,
  element: { x: number; y: number; width: number; height: number },
): boolean => {
  const view = getCanvasViewportRect();
  if (!view) return true;
  const zoom = zoomLevel.value;
  return getBandScreenRects(bandIndex, pageIndex).some((rect) => {
    const cx = rect.left + (element.x + element.width / 2) * zoom;
    const cy = rect.top + (element.y + element.height / 2) * zoom;
    return cx >= view.left && cx <= view.right && cy >= view.top && cy <= view.bottom;
  });
};

// The middle of the visible part of the Detail section: the page showing the
// most of it, in that band's coordinates
const getVisibleDetailCentre = (
  detailIndex: number,
): { pageIndex: number; x: number; y: number } | null => {
  const view = getCanvasViewportRect();
  if (!view) return null;
  let best: { pageIndex: number; x: number; y: number; area: number } | null = null;
  document.querySelectorAll<HTMLElement>(".page-sheet").forEach((sheet) => {
    const bandEl = sheet.querySelector<HTMLElement>(
      `.band[data-band-index="${detailIndex}"]`,
    );
    if (!bandEl || sheet.dataset.pageIndex === undefined) return;
    const rect = bandEl.getBoundingClientRect();
    const left = Math.max(rect.left, view.left);
    const right = Math.min(rect.right, view.right);
    const top = Math.max(rect.top, view.top);
    const bottom = Math.min(rect.bottom, view.bottom);
    const area = Math.max(0, right - left) * Math.max(0, bottom - top);
    if (area > 0 && (!best || area > best.area)) {
      best = {
        pageIndex: parseInt(sheet.dataset.pageIndex, 10),
        x: ((left + right) / 2 - rect.left) / zoomLevel.value,
        y: ((top + bottom) / 2 - rect.top) / zoomLevel.value,
        area,
      };
    }
  });
  return best;
};

// Keep an element inside the printable width (and below the band's top)
const fitInPrintableWidth = (element: DesignElement) => {
  const maxX = Math.max(0, printableWidth.value - (element.width || 0));
  element.x = Math.min(Math.max(0, element.x), Math.round(maxX));
  element.y = Math.max(0, element.y);
};

// Step a pasted element down and right past copies already at its spot, so
// repeated pastes fan out instead of stacking exactly on top of each other
const stepPastCopies = (element: DesignElement, bandIndex: number, pageIndex: number) => {
  const band = bands.value[bandIndex];
  if (!band) return;
  const isDetail = band.type === BAND_TYPE_CONSTANTS.DETAIL;
  const offset = KEYBOARD_CONSTANTS.ELEMENT_PASTE_OFFSET;
  const isTaken = () =>
    band.elements.some(
      (el) =>
        (!isDetail || (el.pageIndex ?? 0) === pageIndex) &&
        Math.abs(el.x - element.x) < 1 &&
        Math.abs(el.y - element.y) < 1,
    );
  for (let i = 0; i < 100 && isTaken(); i++) {
    const before = { x: element.x, y: element.y };
    element.x += offset;
    element.y += offset;
    fitInPrintableWidth(element);
    if (element.x === before.x && element.y === before.y) break;
  }
};

// Handle the pasted clipboard data (extracted into a separate function for reuse)
const processPastedElement = (
  clipboardData: { elementData: any; sourceBandType?: string },
  at?: { clientX: number; clientY: number },
) => {
  const detailIndex = bands.value.findIndex(
    (b) => b.type === BAND_TYPE_CONSTANTS.DETAIL,
  );

  // Create the new element (deep clone)
  const newElement = JSON.parse(JSON.stringify(clipboardData.elementData));
  // A copy is a separate element: new IDs for it and everything inside it
  refreshUuids(newElement);
  if (newElement.id) {
    newElement.id = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  // Ensure the element's position and size are integers
  newElement.x = Math.round(newElement.x || 0);
  newElement.y = Math.round(newElement.y || 0);
  if (newElement.width) newElement.width = Math.round(newElement.width);
  if (newElement.height) newElement.height = Math.round(newElement.height);

  // A page border goes back to the Background band, where only one is allowed
  if (clipboardData.sourceBandType === BAND_TYPE_CONSTANTS.BACKGROUND) {
    if (rejectSecondPageBorder()) return;
    const backgroundIndex = bands.value.findIndex(
      (b) => b.type === BAND_TYPE_CONSTANTS.BACKGROUND,
    );
    const background = bands.value[backgroundIndex];
    if (!background) return;
    saveStateToHistory();
    background.elements.push(newElement);
    selectElement(backgroundIndex, background.elements.length - 1);
    updateJRXML();
    return;
  }

  // Right-click → Paste on a page: the element's top-left corner at the
  // clicked point. A click in the grey area around the pages pastes like Ctrl+V.
  let target: { bandIndex: number; pageIndex: number } | null = null;
  if (at) {
    const { bandUnderMouse, sheetUnderMouse } = getTargetBandAndSheetUnderPoint(
      at.clientX,
      at.clientY,
    );
    const sheetRect = sheetUnderMouse?.getBoundingClientRect();
    const onPage =
      !!sheetRect &&
      at.clientX >= sheetRect.left &&
      at.clientX < sheetRect.right &&
      at.clientY >= sheetRect.top &&
      at.clientY < sheetRect.bottom;
    if (onPage && bandUnderMouse?.dataset.bandIndex !== undefined) {
      const bandRect = bandUnderMouse.getBoundingClientRect();
      target = {
        bandIndex: parseInt(bandUnderMouse.dataset.bandIndex, 10),
        pageIndex: parseInt(sheetUnderMouse?.dataset.pageIndex ?? "0", 10),
      };
      newElement.x = Math.round((at.clientX - bandRect.left) / zoomLevel.value);
      newElement.y = Math.round((at.clientY - bandRect.top) / zoomLevel.value);
      fitInPrintableWidth(newElement);
    }
  }

  if (!target) {
    // Ctrl+V / toolbar: back into the section it was copied from, next to the
    // original. Tables only live in Detail; an unknown section (an older copy,
    // or one from another report) means Detail as well.
    let bandIndex =
      newElement.type === "table"
        ? detailIndex
        : bands.value.findIndex(
            (b) =>
              b.type === clipboardData.sourceBandType &&
              b.type !== BAND_TYPE_CONSTANTS.BACKGROUND,
          );
    if (bandIndex === -1) bandIndex = detailIndex;
    target = {
      bandIndex,
      pageIndex: Math.min(newElement.pageIndex ?? 0, Math.max(0, totalPages.value - 1)),
    };
    fitInPrintableWidth(newElement);
    stepPastCopies(newElement, target.bandIndex, target.pageIndex);

    // Out of sight (scrolled away, or on another page): the middle of the
    // visible part of Detail instead, so the user sees what was pasted
    const isDetail = bands.value[bandIndex]?.type === BAND_TYPE_CONSTANTS.DETAIL;
    if (
      detailIndex !== -1 &&
      !isBandSpotOnScreen(bandIndex, isDetail ? target.pageIndex : undefined, newElement)
    ) {
      const centre = getVisibleDetailCentre(detailIndex);
      if (centre) {
        target = { bandIndex: detailIndex, pageIndex: centre.pageIndex };
        newElement.x = Math.round(centre.x - (newElement.width || 0) / 2);
        newElement.y = Math.round(centre.y - (newElement.height || 0) / 2);
        fitInPrintableWidth(newElement);
        stepPastCopies(newElement, target.bandIndex, target.pageIndex);
      }
    }
  }

  const targetBandIndex = target.bandIndex;
  const targetBand = bands.value[targetBandIndex];
  if (!targetBand) {
    console.error("Target band does not exist");
    return;
  }
  // Tables only live in the Detail section
  if (newElement.type === "table" && targetBand.type !== BAND_TYPE_CONSTANTS.DETAIL) {
    notification.warning(t("dataTable.onlyInDetail"));
    return;
  }
  // Detail elements belong to a page; other sections repeat on every page
  if (targetBand.type === BAND_TYPE_CONSTANTS.DETAIL) {
    newElement.pageIndex = target.pageIndex;
  } else {
    delete newElement.pageIndex;
  }

  // It must fit in the band, growing it up to its maximum if needed; too tall
  // is refused before anything changes
  const bandPlan = planDropInBand(targetBandIndex, newElement);
  if (bandPlan.kind === "tooTall") {
    warnTooTallForBand(targetBandIndex, newElement.height, bandPlan.maxHeight);
    return;
  }
  saveStateToHistory();
  applyDropInBand(targetBandIndex, newElement, bandPlan);

  // Add it to the target band
  if (!targetBand.elements) {
    targetBand.elements = [];
  }

  targetBand.elements.push(newElement);
  // A pasted table gets its own dataset and name
  ensureUniqueTableDatasets(bands.value);

  // Select the newly added element
  const newElementIndex = targetBand.elements.length - 1;
  selectElement(targetBandIndex, newElementIndex);

  // Update JRXML
  updateJRXML();
};

// Define the handleKeyDown function at the top level of the component
const handleKeyDown = (event: KeyboardEvent) => {
  // Get the currently active element, used to determine focus state
  const activeEl = document.activeElement;
  const isInputFocused =
    activeEl &&
    (activeEl.tagName === "INPUT" ||
      activeEl.tagName === "TEXTAREA" ||
      activeEl.tagName === "SELECT");
  const isTextareaFocused = activeEl && activeEl.tagName === "TEXTAREA";

  // Detect whether any text is selected
  const selection = window.getSelection();
  const isTextSelected = selection && selection.toString().trim().length > 0;

  // Detect whether the Ctrl key (Windows) or Meta key (Mac) is pressed
  const isCtrlOrMetaPressed = event.ctrlKey || event.metaKey;

  // CTRL/CMD+0 resets the zoom level
  if (isCtrlOrMetaPressed && event.key === "0") {
    event.preventDefault();
    resetZoom();
    return;
  }

  // CTRL/CMD+Plus/Equal zooms in
  if (isCtrlOrMetaPressed && (event.key === "=" || event.key === "+")) {
    event.preventDefault();
    zoomIn();
    return;
  }

  // CTRL/CMD+Minus zooms out
  if (isCtrlOrMetaPressed && (event.key === "-" || event.key === "_")) {
    event.preventDefault();
    zoomOut();
    return;
  }

  // CTRL/CMD+S saves the current file
  if (isCtrlOrMetaPressed && event.key === "s") {
    event.preventDefault();
    saveCurrentFileToStorage(true);
    return;
  }

  // CTRL/CMD+B toggles the bottom panel's visibility
  if (isCtrlOrMetaPressed && event.key === "b") {
    event.preventDefault();
    toggleBottomPanel();
    return;
  }

  // CTRL/CMD+Z undoes an action
  if (isCtrlOrMetaPressed && event.key === "z") {
    event.preventDefault();
    undo();
    return;
  }

  // CTRL/CMD+Y redoes an action
  if (isCtrlOrMetaPressed && event.key === "y") {
    event.preventDefault();
    redo();
    return;
  }

  // CTRL/CMD+C handling: first check whether an input is focused, and if so, fall back to the browser's default copy behavior
  if (isCtrlOrMetaPressed && event.key === "c") {
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
  if (isCtrlOrMetaPressed && event.key === "v") {
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
  if (
    (event.key === "Delete" || event.key === "Backspace") &&
    (selectedElement.value ||
      (selectedElements.value && selectedElements.value.length > 0)) &&
    !editingElement.value &&
    !isInputFocused
  ) {
    event.preventDefault();
    deleteElement();
    return;
  }

  // Arrow key handling: Shift+Arrow nudges the element's position, Arrow alone selects a neighboring component
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    // If an input is focused, use the default behavior (move the cursor)
    if (isInputFocused) {
      return;
    }

    event.preventDefault();

    // If Shift is held and an element is selected, nudge its position
    if (event.shiftKey && selectedElement.value) {
      moveElementByKeyboard(event.key, event.repeat);
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

  const { bandIndex: currentBandIndex, elementIndex: currentElementIndex } =
    selectedElement.value;
  const currentBand = bands.value[currentBandIndex];
  const currentElement = currentBand?.elements[currentElementIndex];

  if (!currentBand || !currentElement) return;

  let nearestElement: {
    bandIndex: number;
    elementIndex: number;
    distance: number;
  } | null = null;
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
      if (bandIdx === currentBandIndex && elementIdx === currentElementIndex)
        return;

      // Calculate the element's absolute position
      const elementX = element.x;
      const elementY = bandOffsetY + element.y;

      // Determine whether it matches the direction criteria
      let isValidDirection = false;

      switch (direction) {
        case "ArrowUp":
          isValidDirection = elementY < currentY;
          break;
        case "ArrowDown":
          isValidDirection = elementY > currentY;
          break;
        case "ArrowLeft":
          isValidDirection = elementX < currentX;
          break;
        case "ArrowRight":
          isValidDirection = elementX > currentX;
          break;
      }

      if (isValidDirection) {
        // Calculate the distance
        let distance = 0;
        switch (direction) {
          case "ArrowUp":
          case "ArrowDown":
            distance =
              Math.abs(elementY - currentY) +
              Math.abs(elementX - currentX) *
                KEYBOARD_CONSTANTS.SECONDARY_AXIS_WEIGHT; // Y axis is primary, X axis is secondary
            break;
          case "ArrowLeft":
          case "ArrowRight":
            distance =
              Math.abs(elementX - currentX) +
              Math.abs(elementY - currentY) *
                KEYBOARD_CONSTANTS.SECONDARY_AXIS_WEIGHT; // X axis is primary, Y axis is secondary
            break;
        }

        // Update the nearest element
        if (!nearestElement || distance < nearestElement.distance) {
          nearestElement = {
            bandIndex: bandIdx,
            elementIndex: elementIdx,
            distance,
          };
        }
      }
    });
  });

  // Select the nearest element
  if (nearestElement) {
    // Use a type assertion to ensure valid property access
    const element = nearestElement as {
      bandIndex: number;
      elementIndex: number;
    };
    selectElement(element.bandIndex, element.elementIndex);
  }
};

// Nudge an element's position using the keyboard: to the next grid line with
// Snap to Grid on, else 1px. Holding the key down is one undo step.
const moveElementByKeyboard = (direction: string, repeat = false) => {
  if (!selectedElement.value) return;

  const {
    bandIndex: currentBandIndex,
    elementIndex: currentElementIndex,
    parentFrameIndex,
  } = selectedElement.value;
  const currentBand = bands.value[currentBandIndex];
  // An item in a box is found inside the box, and moves only within it
  const parentBox =
    parentFrameIndex !== undefined
      ? (currentBand?.elements[parentFrameIndex] as FrameElement | undefined)
      : undefined;
  const currentElement =
    parentFrameIndex !== undefined
      ? parentBox?.elements?.[currentElementIndex]
      : currentBand?.elements[currentElementIndex];

  if (!currentBand || !currentElement) return;

  // The grid is drawn per band, so an item in a box steps to band grid lines
  const grid = enableSnapToGrid.value ? UI_CONSTANTS.GRID_SIZE : null;
  const offsetX = parentBox?.x ?? 0;
  const offsetY = parentBox?.y ?? 0;
  const step = (value: number, dir: 1 | -1, offset: number) =>
    grid ? nextGridLine(value, grid, dir, offset) : value + dir;

  // Calculate the new position
  let newX = currentElement.x;
  let newY = currentElement.y;

  switch (direction) {
    case "ArrowUp":
      newY = Math.max(0, step(currentElement.y, -1, offsetY));
      break;
    case "ArrowDown": {
      const next = step(currentElement.y, 1, offsetY);
      // Elements in a band stay within it (box parts are kept in their box below)
      const maxDown = parentBox ? Infinity : currentBand.height - currentElement.height;
      newY = maxDown > 0 ? Math.min(maxDown, next) : next;
      break;
    }
    case "ArrowLeft":
      newX = Math.max(0, step(currentElement.x, -1, offsetX));
      break;
    case "ArrowRight": {
      const next = step(currentElement.x, 1, offsetX);
      newX = parentBox
        ? next
        : Math.min(Math.max(0, printableWidth.value - currentElement.width), next);
      break;
    }
  }

  if (parentBox && isBoxPart(currentElement)) {
    ({ x: newX, y: newY } = clampPositionInBox(
      { ...currentElement, x: newX, y: newY },
      parentBox,
    ));
  }

  if (newX === currentElement.x && newY === currentElement.y) return;

  // Save the pre-move state to history (for undo), once per key press
  if (!repeat) saveStateToHistory();

  // Update the element's position
  currentElement.x = newX;
  currentElement.y = newY;

  // Trigger an update
  updateJRXML();
  saveToLocalStorageWrapper();

  // Check whether it's now out of bounds
  updateOutOfBoundsElements();
};

// Load data when the component mounts
onMounted(() => {
  isLoadingFile.value = true;
  console.log("Component mount started...");
  const hasLocalData = loadFromLocalStorageWrapper();
  console.log("Local data load complete");

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

  if (!hasFileData) {
    if (!currentFileId.value) {
      currentFileId.value = `file_${Date.now()}`;
    }
    saveCurrentFileToStorage(false);
  }

  // Update JRXML after the initial load; use setTimeout to ensure all data has finished loading
  setTimeout(() => {
    isLoadingFile.value = false;
    ensureBandsFitPage();
    console.log("Starting initial JRXML generation...");
    updateJRXML();
    saveStatus.value = "saved";
  }, 100);

  // Initial zoom setup - automatically fit the window
  // Use setTimeout to ensure the DOM has fully rendered before calculating the zoom scale
  setTimeout(() => {
    zoomLevel.value = calculateOptimalZoom();
  }, 200);

  // Add the keyboard event listener
  document.addEventListener("keydown", handleKeyDown);

  // Add a mouse wheel event listener, used for the zoom feature
  const handleWheel = (event: Event) => {
    // Check whether the Ctrl key is pressed
    const wheelEvent = event as WheelEvent;
    if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
      // Prevent the default behavior (page zoom)
      wheelEvent.preventDefault();

      // Zoom according to the wheel direction
      const delta = wheelEvent.deltaY < 0 ? 1 : -1;
      handleZoomChange(delta);
    }
  };

  document.addEventListener("wheel", handleWheel, { passive: false });
  (window as any).pdfDesignerWheelListener = handleWheel;

  // Store listener references so they can be removed when the component unmounts
  (window as any).pdfDesignerKeydownListener = handleKeyDown;
  (window as any).pdfDesignerSetFocused = setDesignAreaFocused;
  (window as any).pdfDesignerRemoveFocused = removeDesignAreaFocused;

  window.addEventListener("beforeunload", flushAutoSave);
});

// Clean up event listeners when the component unmounts
onUnmounted(() => {
  flushAutoSave();
  window.removeEventListener("beforeunload", flushAutoSave);

  // Remove the keyboard event listener
  const keydownListener = (window as any).pdfDesignerKeydownListener;
  if (keydownListener) {
    document.removeEventListener("keydown", keydownListener);
  }

  // Remove the mouse wheel event listener
  const wheelListener = (window as any).pdfDesignerWheelListener;
  if (wheelListener) {
    document.removeEventListener("wheel", wheelListener);
  }
});

// Watch for changes to key data, auto-saving and updating JRXML
watch(
  [
    reportProperties,
    bands,
    reportFields,
    reportParameters,
    subDatasets,
    reportVariables,
    reportGroups,
    tableStyles,
  ],
  () => {
    // Only update while not dragging/resizing, not already in JRXML update, and not loading a file
    if (!isDraggingOrResizing.value && !isUpdatingJRXML.value && !isLoadingFile.value) {
      updateJRXML();
      // Update the out-of-bounds elements
      updateOutOfBoundsElements();
      scheduleAutoSave(false);
    }
  },
  { deep: true },
);

// Watch for drag-state changes, updating out-of-bounds elements and auto-saving once dragging ends
watch(isDraggingOrResizing, (newValue, oldValue) => {
  if (oldValue === true && newValue === false && !isLoadingFile.value) {
    updateJRXML();
    updateOutOfBoundsElements();
    scheduleAutoSave(true);
  }
});

// Copy the JRXML content to the clipboard
const copyJRXML = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(jrxmlContent.value);
    notification.success(t("notifications.jrxmlCopiedSuccess"));
  } catch (err: unknown) {
    console.error("Copy failed:", err);
    notification.error(t("notifications.jrxmlCopyFailed"));
  }
};

// Regenerate the JRXML content
const regenerateJRXML = (): void => {
  updateJRXML();
  // Show a notification message
  notification.info(t("editor.jrxmlRegenerated"));
};

// Open the PDF preview (charts drawn with their numbers first)
const openPdfPreview = async (): Promise<void> => {
  flushAutoSave();
  try {
    await ensureChartData(bands.value);
    updateJRXML();
    if (!jrxmlContent.value) {
      // Generate the JRXML content directly, without downloading it
      const content = generateJRXMLContent(
        {
          ...reportProperties.value,
          pageCount: totalPages.value,
        },
        bands.value,
        reportFields.value,
        reportParameters.value,
        subDatasets.value,
        tableStyles.value,
        reportVariables.value,
        [],
        reportGroups.value,
        totalPages.value,
      );
      jrxmlContent.value = content;
    }
    showPdfPreview.value = false;
    nextTick(() => {
      showPdfPreview.value = true;
    });
  } catch (error) {
    console.error("Failed to preview PDF:", error);
    alert(t("editor.previewFailed"));
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
      orientation:
        parsedData.properties?.orientation === "landscape"
          ? "landscape"
          : "portrait",
      defaultFont: reportProperties.value?.defaultFont || {
        name: FONT_CONSTANTS.DEFAULT_FONT_FAMILY,
        size: REPORT_CONSTANTS.DEFAULT_FONT_SIZE,
        isBold: false,
        isItalic: false,
        isUnderline: false,
      },
      bandLimits:
        reportProperties.value?.bandLimits || getEffectiveDefaultBandLimits(),
    };

    if (parsedData.properties?.pageCount) {
      pageCount.value = parsedData.properties.pageCount;
    } else {
      const detailBand = parsedData.bands.find(
        (b) => b.type === BAND_TYPE_CONSTANTS.DETAIL,
      );
      const maxIdx = detailBand?.elements
        ? Math.max(0, ...detailBand.elements.map((e: any) => e.pageIndex || 0))
        : 0;
      pageCount.value = maxIdx + 1;
    }

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

    // Saved table styles (report styles themselves are rebuilt from the tables)
    tableStyles.value = parsedData.tableStyles;

    // Update the sub-datasets
    if (parsedData.datasets) {
      subDatasets.value = parsedData.datasets.map((dataset) => ({
        uuid: crypto.randomUUID(),
        name: dataset.name,
        fields: dataset.fields,
        query: dataset.query,
      })) as any;
    }

    // Update the bands
    bands.value = parsedData.bands;
    // Repair copies that share IDs with their original (pasted before copies got their own)
    ensureUniqueUuids(bands.value);
    ensureUniqueTableDatasets(bands.value);
    resetBoxPhotos(bands.value);

    // Update the selected band types
    selectedBandTypes.value = parsedData.bands.map((band) => band.type);

    // Update pageCount based on loaded elements
    const detailBand = parsedData.bands.find(
      (b: Band) => b.type === BAND_TYPE_CONSTANTS.DETAIL,
    );
    if (detailBand && detailBand.elements) {
      const maxPage = Math.max(
        0,
        ...detailBand.elements.map((e: any) => e.pageIndex || 0),
      );
      pageCount.value = Math.max(1, maxPage + 1);
    } else {
      pageCount.value = 1;
    }

    // Add a default border to rectangle elements to ensure they render correctly
    bands.value.forEach((band) => {
      band.elements.forEach((element) => {
        // Ensure the element's width is reasonable (but don't force a minimum height, to preserve the JRXML's original settings)
        if (element.width < ELEMENT_CONSTANTS.MIN_WIDTH)
          element.width = ELEMENT_CONSTANTS.MIN_WIDTH; // Enforce the minimum width

        // For box elements, ensure the parsed border properties are applied correctly
        if (element.box) {
          // Convert the border style within a pen element
          const processPen = (pen: any): string => {
            if (!pen) return "";

            // If lineWidth is 0 or undefined, return an empty string to indicate no border
            if (pen.lineWidth === 0 || pen.lineWidth === undefined) {
              return "";
            }

            let width = `${pen.lineWidth}px`;
            let style = "solid";
            let color = "#000000";

            if (pen.lineStyle) {
              switch (pen.lineStyle) {
                case "Dashed":
                  style = "dashed";
                  break;
                case "Dotted":
                  style = "dotted";
                  break;
                case "Double":
                  style = "double";
                  break;
                default:
                  style = "solid";
              }
            }

            if (pen.lineColor) {
              color = pen.lineColor;
            }

            return `${width} ${style} ${color}`;
          };

          // Convert a border style string into the border style name used by the UI
          const convertBorderStyleToName = (borderStyle: string): string => {
            if (!borderStyle || borderStyle === "") return "";

            // If it's already a style name, return it as-is
            if (
              [
                "Thin",
                "Medium",
                "Thick",
                "Dashed",
                "Dotted",
                "Double",
                "1Point",
                "2Point",
                "4Point",
              ].includes(borderStyle)
            ) {
              return borderStyle;
            }

            // Parse a border style string, e.g. "1px solid #000000"
            const parts = borderStyle.split(" ");
            if (parts.length >= 2) {
              const width = parts[0];
              const style = parts[1];

              // If the width is 0, return an empty string to indicate no border
              if (width === "0px") {
                return "";
              }

              // Determine the style name based on the width
              if (width === "1px") {
                if (style === "solid") return "Thin";
                if (style === "dashed") return "Dashed";
                if (style === "dotted") return "Dotted";
              } else if (width === "2px") {
                if (style === "solid") return "Medium";
              } else if (width === "3px" && style === "double") {
                return "Double";
              } else if (width === "4px") {
                if (style === "solid") return "Thick";
              }
            }

            // Default to an empty string rather than Thin, to avoid unexpectedly displaying a border
            return "";
          };

          // Extract the color from a border style string
          const extractBorderColor = (borderStyle: string): string => {
            if (!borderStyle || borderStyle === "") return "#000000";

            // If it's already a style name, return the default color
            if (
              [
                "Thin",
                "Medium",
                "Thick",
                "Dashed",
                "Dotted",
                "Double",
                "1Point",
                "2Point",
                "4Point",
              ].includes(borderStyle)
            ) {
              return "#000000";
            }

            // Parse a border style string, e.g. "1px solid #000000"
            const parts = borderStyle.split(" ");
            if (parts.length >= 3 && parts[2]) {
              return parts[2];
            }

            return "#000000";
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
            Thin: "1px",
            "1Point": "1px",
            "2Point": "2px",
            "4Point": "4px",
            Dotted: "1px dotted",
            Dashed: "1px dashed",
            Double: "3px double",
          };

          // Apply the border properties
          const applyBorder = (
            borderAttr: string,
            colorAttr: string,
          ): string => {
            if (!borderAttr) return "";

            let borderValue = borderMap[borderAttr] || "1px";
            // Use a type assertion to work around the indexing issue
            let borderColor = (element.box as any)?.[colorAttr] || "#000000";

            // If borderAttr is a style name (not a pixel value), build the full border style string
            if (
              borderAttr !== "Thin" &&
              borderAttr !== "1Point" &&
              borderAttr !== "2Point" &&
              borderAttr !== "4Point"
            ) {
              if (borderValue.includes(" ")) {
                return borderValue + " " + borderColor;
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
          if (
            element.box.border &&
            (!element.box.topBorder ||
              !element.box.leftBorder ||
              !element.box.bottomBorder ||
              !element.box.rightBorder)
          ) {
            const globalBorder = applyBorder(element.box.border, "borderColor");
            if (!element.box.topBorder) element.box.topBorder = globalBorder;
            if (!element.box.leftBorder) element.box.leftBorder = globalBorder;
            if (!element.box.bottomBorder)
              element.box.bottomBorder = globalBorder;
            if (!element.box.rightBorder)
              element.box.rightBorder = globalBorder;
          }

          // Convert a border style string into the border style name used by the UI
          if (
            element.box.border &&
            typeof element.box.border === "string" &&
            element.box.border.includes(" ")
          ) {
            element.box.border = convertBorderStyleToName(element.box.border);
          }
          if (
            element.box.topBorder &&
            typeof element.box.topBorder === "string" &&
            element.box.topBorder.includes(" ")
          ) {
            element.box.topBorderColor = extractBorderColor(
              element.box.topBorder,
            );
            element.box.topBorder = convertBorderStyleToName(
              element.box.topBorder,
            );
          }
          if (
            element.box.leftBorder &&
            typeof element.box.leftBorder === "string" &&
            element.box.leftBorder.includes(" ")
          ) {
            element.box.leftBorderColor = extractBorderColor(
              element.box.leftBorder,
            );
            element.box.leftBorder = convertBorderStyleToName(
              element.box.leftBorder,
            );
          }
          if (
            element.box.bottomBorder &&
            typeof element.box.bottomBorder === "string" &&
            element.box.bottomBorder.includes(" ")
          ) {
            element.box.bottomBorderColor = extractBorderColor(
              element.box.bottomBorder,
            );
            element.box.bottomBorder = convertBorderStyleToName(
              element.box.bottomBorder,
            );
          }
          if (
            element.box.rightBorder &&
            typeof element.box.rightBorder === "string" &&
            element.box.rightBorder.includes(" ")
          ) {
            element.box.rightBorderColor = extractBorderColor(
              element.box.rightBorder,
            );
            element.box.rightBorder = convertBorderStyleToName(
              element.box.rightBorder,
            );
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
    notification.success(t("notifications.jrxmlEditSaved"));
  } catch (error: unknown) {
    console.error("Failed to save JRXML:", error);
    notification.error(
      t("notifications.jrxmlEditSaveFailed", {
        error: error instanceof Error ? error.message : t("common.unknownError"),
      }),
    );
  }
};

// Watch for border-setting changes, updating the border style in real time
watch(
  () => currentElement.value?.box?.border,
  (newBorderStyle) => {
    if (!currentElement.value || !currentElement.value.box) return;
    // The field was removed (border presets and Style Settings write pens and
    // drop these legacy fields); there is nothing to sync, and syncing would
    // wipe the pen they just wrote
    if (!("border" in currentElement.value.box)) return;

    const box = currentElement.value.box;

    // If the border style is an empty string, clear all borders
    if (!newBorderStyle || newBorderStyle === "") {
      box.topBorder = "";
      box.leftBorder = "";
      box.bottomBorder = "";
      box.rightBorder = "";
      // Update JRXML
      updateJRXML();
      return;
    }

    const borderColor = box.borderColor || "#000000";

    // Border style mapping
    const borderMap: Record<string, string> = {
      Thin: "1px",
      "1Point": "1px",
      "2Point": "2px",
      "4Point": "4px",
      Dotted: "1px dotted",
      Dashed: "1px dashed",
      Double: "3px double",
    };

    // Build the border style string
    const borderValue = borderMap[newBorderStyle] || "1px";
    const fullBorderStyle = `${borderValue} solid ${borderColor}`;

    // Apply it to all sides immediately
    box.topBorder = fullBorderStyle;
    box.leftBorder = fullBorderStyle;
    box.bottomBorder = fullBorderStyle;
    box.rightBorder = fullBorderStyle;

    // Update JRXML
    updateJRXML();
  },
);

// Watch for border-width changes, ensuring the pen object includes a lineWidth property
watch(
  () => currentElement.value?.box?.borderWidth,
  (newBorderWidth) => {
    if (!currentElement.value || !currentElement.value.box) return;
    // The field was removed (border presets and Style Settings write pens and
    // drop these legacy fields); there is nothing to sync, and syncing would
    // wipe the pen they just wrote
    if (!("borderWidth" in currentElement.value.box)) return;

    const box = currentElement.value.box;

    // If the border width is 0, automatically set the border style to "None"
    if (
      newBorderWidth === 0 ||
      newBorderWidth === undefined ||
      newBorderWidth === null
    ) {
      box.borderStyle = "";

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
        box.pen.lineStyle = box.borderStyle || "Solid";
      }

      // If no border color is set, use the default color
      if (!box.pen.lineColor) {
        box.pen.lineColor = box.borderColor || "#000000";
      }
    }

    // Update JRXML
    updateJRXML();
  },
);

// Watch for border-style changes, ensuring the pen object includes a lineStyle property
watch(
  () => currentElement.value?.box?.borderStyle,
  (newBorderStyle, oldBorderStyle) => {
    if (!currentElement.value || !currentElement.value.box) return;
    // The field was removed (border presets and Style Settings write pens and
    // drop these legacy fields); there is nothing to sync, and syncing would
    // wipe the pen they just wrote
    if (!("borderStyle" in currentElement.value.box)) return;

    const box = currentElement.value.box;

    // If the border style is set to "None" (an empty string), automatically set the width to 0
    if (
      newBorderStyle === undefined ||
      newBorderStyle === null ||
      newBorderStyle === ""
    ) {
      box.borderWidth = 0;

      // Remove the pen object
      delete box.pen;
    } else {
      // When the border style switches from "None" to another option, automatically default the width to 1 if it's currently 0
      if (
        (oldBorderStyle === "" ||
          oldBorderStyle === undefined ||
          oldBorderStyle === null) &&
        box.borderWidth === 0
      ) {
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
        box.pen.lineColor = box.borderColor || "#000000";
      }
    }

    // Update JRXML
    updateJRXML();
  },
);

// Watch for border-color changes, updating the border style in real time
watch(
  () => currentElement.value?.box?.borderColor,
  (newBorderColor) => {
    if (!currentElement.value || !currentElement.value.box) return;
    // The field was removed (border presets and Style Settings write pens and
    // drop these legacy fields); there is nothing to sync, and syncing would
    // wipe the pen they just wrote
    if (!("borderColor" in currentElement.value.box)) return;

    const box = currentElement.value.box;

    // If a border style is set, update the color on each side
    if (box.border && box.border !== "") {
      const borderMap: Record<string, string> = {
        Thin: "1px",
        "1Point": "1px",
        "2Point": "2px",
        "4Point": "4px",
        Dotted: "1px dotted",
        Dashed: "1px dashed",
        Double: "3px double",
      };

      const borderValue = borderMap[box.border] || "1px";
      const fullBorderStyle = `${borderValue} solid ${newBorderColor || "#000000"}`;

      // Apply it to all sides immediately
      box.topBorder = fullBorderStyle;
      box.leftBorder = fullBorderStyle;
      box.bottomBorder = fullBorderStyle;
      box.rightBorder = fullBorderStyle;

      // Update JRXML
      updateJRXML();
    }
  },
);

// Watch for top-border changes
watch(
  () => currentElement.value?.box?.topBorder,
  (newTopBorder) => {
    if (!currentElement.value || !currentElement.value.box) return;

    // If the border style is an empty string, clear the top border
    if (!newTopBorder || newTopBorder === "") {
      // Border cleared; update JRXML
      updateJRXML();
      return;
    }

    // If the border is a style name (e.g. "Thin"), convert it to a full border style string
    if (
      [
        "Thin",
        "Medium",
        "Thick",
        "Dashed",
        "Dotted",
        "Double",
        "1Point",
        "2Point",
        "4Point",
      ].includes(newTopBorder)
    ) {
      const box = currentElement.value.box;
      const borderColor = box.topBorderColor || "#000000";

      const borderMap: Record<string, string> = {
        Thin: "1px",
        "1Point": "1px",
        "2Point": "2px",
        "4Point": "4px",
        Dotted: "1px dotted",
        Dashed: "1px dashed",
        Double: "3px double",
      };

      const borderValue = borderMap[newTopBorder] || "1px";
      box.topBorder = `${borderValue} solid ${borderColor}`;
      // Update JRXML
      updateJRXML();
    }
  },
);

// Watch for left-border changes
watch(
  () => currentElement.value?.box?.leftBorder,
  (newLeftBorder) => {
    if (!currentElement.value || !currentElement.value.box) return;

    // If the border style is an empty string, clear the left border
    if (!newLeftBorder || newLeftBorder === "") {
      // Border cleared; update JRXML
      updateJRXML();
      return;
    }

    // If the border is a style name (e.g. "Thin"), convert it to a full border style string
    if (
      [
        "Thin",
        "Medium",
        "Thick",
        "Dashed",
        "Dotted",
        "Double",
        "1Point",
        "2Point",
        "4Point",
      ].includes(newLeftBorder)
    ) {
      const box = currentElement.value.box;
      const borderColor = box.leftBorderColor || "#000000";

      const borderMap: Record<string, string> = {
        Thin: "1px",
        "1Point": "1px",
        "2Point": "2px",
        "4Point": "4px",
        Dotted: "1px dotted",
        Dashed: "1px dashed",
        Double: "3px double",
      };

      const borderValue = borderMap[newLeftBorder] || "1px";
      box.leftBorder = `${borderValue} solid ${borderColor}`;
      // Update JRXML
      updateJRXML();
    }
  },
);

// Watch for bottom-border changes
watch(
  () => currentElement.value?.box?.bottomBorder,
  (newBottomBorder) => {
    if (!currentElement.value || !currentElement.value.box) return;

    // If the border style is an empty string, clear the bottom border
    if (!newBottomBorder || newBottomBorder === "") {
      // Border cleared; update JRXML
      updateJRXML();
      return;
    }

    // If the border is a style name (e.g. "Thin"), convert it to a full border style string
    if (
      [
        "Thin",
        "Medium",
        "Thick",
        "Dashed",
        "Dotted",
        "Double",
        "1Point",
        "2Point",
        "4Point",
      ].includes(newBottomBorder)
    ) {
      const box = currentElement.value.box;
      const borderColor = box.bottomBorderColor || "#000000";

      const borderMap: Record<string, string> = {
        Thin: "1px",
        "1Point": "1px",
        "2Point": "2px",
        "4Point": "4px",
        Dotted: "1px dotted",
        Dashed: "1px dashed",
        Double: "3px double",
      };

      const borderValue = borderMap[newBottomBorder] || "1px";
      box.bottomBorder = `${borderValue} solid ${borderColor}`;
      // Update JRXML
      updateJRXML();
    }
  },
);

// Watch for right-border changes
watch(
  () => currentElement.value?.box?.rightBorder,
  (newRightBorder) => {
    if (!currentElement.value || !currentElement.value.box) return;

    // If the border style is an empty string, clear the right border
    if (!newRightBorder || newRightBorder === "") {
      // Border cleared; update JRXML
      updateJRXML();
      return;
    }

    // If the border is a style name (e.g. "Thin"), convert it to a full border style string
    if (
      [
        "Thin",
        "Medium",
        "Thick",
        "Dashed",
        "Dotted",
        "Double",
        "1Point",
        "2Point",
        "4Point",
      ].includes(newRightBorder)
    ) {
      const box = currentElement.value.box;
      const borderColor = box.rightBorderColor || "#000000";

      const borderMap: Record<string, string> = {
        Thin: "1px",
        "1Point": "1px",
        "2Point": "2px",
        "4Point": "4px",
        Dotted: "1px dotted",
        Dashed: "1px dashed",
        Double: "3px double",
      };

      const borderValue = borderMap[newRightBorder] || "1px";
      box.rightBorder = `${borderValue} solid ${borderColor}`;
      // Update JRXML
      updateJRXML();
    }
  },
);

// Start resizing a band's height
const startResizingBand = (event: MouseEvent, bandIndex: number): void => {
  event.preventDefault();

  // Automatically hide the bottom panel
  showBottomPanel.value = false;

  const startY = event.clientY;
  if (!bands.value || !bands.value[bandIndex]) return;

  const currentZoom = zoomLevel.value;
  const targetBand = bands.value[bandIndex];
  const currentBandType = targetBand.type;

  // Detail band does not have its own resize handle; it occupies whatever space remains
  const detailIndex = bands.value.findIndex(
    (b) => b.type === BAND_TYPE_CONSTANTS.DETAIL,
  );
  if (bandIndex === detailIndex) return;

  // Retrieve configurable min and max constraints (default 20px min, 70px max)
  const bandLimitsConfig = reportProperties.value?.bandLimits?.[
    currentBandType
  ] ||
    getEffectiveDefaultBandLimits()[currentBandType] || { min: 20, max: 70 };
  const minHeight =
    typeof bandLimitsConfig.min === "number" ? bandLimitsConfig.min : 20;
  const maxHeight =
    typeof bandLimitsConfig.max === "number" ? bandLimitsConfig.max : 70;

  // Bottom bands (Column Footer, Summary, Page Footer, Last Page Footer) have handle at TOP edge:
  // Dragging UP (deltaY < 0) increases height; dragging DOWN (deltaY > 0) decreases height.
  // Top bands (Page Header, Column Header) have handle at BOTTOM edge:
  // Dragging DOWN (deltaY > 0) increases height; dragging UP (deltaY < 0) decreases height.
  const isBottomBand =
    currentBandType === BAND_TYPE_CONSTANTS.COLUMN_FOOTER ||
    currentBandType === BAND_TYPE_CONSTANTS.PAGE_FOOTER;

  // Available height in the A4 printable area
  const topMargin = reportProperties.value?.topMargin || 0;
  const bottomMargin = reportProperties.value?.bottomMargin || 0;
  const availableHeight = paperHeight.value - topMargin - bottomMargin;

  // Snapshot starting heights of all bands
  const startHeights: number[] = bands.value.map((b) => b.height || 0);
  const startTargetHeight: number = startHeights[bandIndex] ?? minHeight;

  // Total height of all other fixed bands (excluding target band, Detail and the Background underlay)
  let otherBandsHeight = 0;
  bands.value.forEach((b, i) => {
    if (
      i !== bandIndex &&
      i !== detailIndex &&
      b.type !== BAND_TYPE_CONSTANTS.BACKGROUND
    ) {
      otherBandsHeight += startHeights[i] || 0;
    }
  });

  // Detail band minimum height
  const detailMinHeight = BAND_CONSTANTS.MIN_HEIGHT || 20;
  // Detail-constrained upper limit for this band
  const maxPossibleHeight = Math.max(
    minHeight,
    availableHeight - otherBandsHeight - detailMinHeight,
  );
  const effectiveMax = Math.min(maxHeight, maxPossibleHeight);

  // Show the band height adjustment tooltip
  const bandDisplayName = getBandDisplayName(currentBandType);
  resizingBandInfo.visible = true;
  resizingBandInfo.bandName = bandDisplayName;
  resizingBandInfo.height = startTargetHeight;

  // Toast notification throttling state
  let lastToastType: "min" | "max" | null = null;
  let lastToastTime = 0;

  const showLimitToast = (
    type: "min" | "max",
    reason?: "page_full" | "template_limit",
  ) => {
    const now = Date.now();
    if (lastToastType === type && now - lastToastTime < 2000) {
      return;
    }
    lastToastType = type;
    lastToastTime = now;

    if (type === "max") {
      if (reason === "page_full") {
        notification.info(
          t("editor.bandLimits.noSpace", { band: bandDisplayName, height: detailMinHeight }),
        );
      } else {
        notification.info(t("editor.bandLimits.maxReached", { band: bandDisplayName }));
      }
    } else {
      notification.info(t("editor.bandLimits.minReached", { band: bandDisplayName }));
    }
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!bands.value || !bands.value[bandIndex]) return;
    const deltaY = (e.clientY - startY) / currentZoom;

    // For bottom bands (handle at top edge): dragging UP (-deltaY) expands
    // For top bands (handle at bottom edge): dragging DOWN (+deltaY) expands
    const effectiveDelta = isBottomBand ? -deltaY : deltaY;
    const requestedHeight = Math.round(startTargetHeight + effectiveDelta);

    if (requestedHeight > effectiveMax) {
      const reason =
        effectiveMax === maxPossibleHeight && maxPossibleHeight < maxHeight
          ? "page_full"
          : "template_limit";
      showLimitToast("max", reason);
    } else if (requestedHeight < minHeight) {
      showLimitToast("min");
    } else {
      lastToastType = null;
    }

    const newTargetHeight = Math.max(
      minHeight,
      Math.min(effectiveMax, requestedHeight),
    );

    const newDetailHeight = Math.max(
      detailMinHeight,
      availableHeight - otherBandsHeight - newTargetHeight,
    );

    bands.value = bands.value.map((b, i) => {
      if (i === bandIndex) return { ...b, height: newTargetHeight };
      if (i === detailIndex) return { ...b, height: newDetailHeight };
      return b;
    });

    resizingBandInfo.height = newTargetHeight;
    resizingBandInfo.bandName = bandDisplayName;

    // Position the band-height display element so it follows the mouse
    const bandHeightElement = document.querySelector(
      ".band-height-display",
    ) as HTMLElement;
    if (bandHeightElement) {
      bandHeightElement.style.left = e.clientX + 10 + "px";
      bandHeightElement.style.top = e.clientY - 30 + "px";
    }

    // Adjust elements within resized band so they don't exceed the band's bounds
    const currentResizedBand = bands.value[bandIndex];
    if (currentResizedBand && currentResizedBand.elements) {
      currentResizedBand.elements.forEach((element) => {
        if (element.y + element.height > newTargetHeight) {
          element.y = Math.max(0, newTargetHeight - element.height);
        }
      });
    }
  };

  const handleMouseUp = (): void => {
    // Hide the band height adjustment tooltip
    resizingBandInfo.visible = false;
    resizingBandInfo.bandName = "";
    resizingBandInfo.height = 0;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    ensureBandsFitPage();
    updateOutOfBoundsElements();
    saveStateToHistory();
    updateJRXML();
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

// Get the given Band's Y offset
const getBandOffsetY = (bandIndex: number): number => {
  let offset = 0;
  for (let i = 0; i < bandIndex; i++) {
    offset += bands.value[i]?.height || 0;
  }
  return offset;
};

// Handle element rotation
const handleElementRotate = (
  _bandIndex: number,
  _elementIndex: number,
  _parentFrameIndex?: number,
): void => {
  // The undo snapshot was already taken via save-state, before the element rotated
  updateJRXML();
};

// Start resizing an element
const startResizingElement = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  direction: string,
  parentFrameIndex?: number,
): void => {
  event.preventDefault();

  // Automatically hide the bottom panel
  showBottomPanel.value = false;

  const band = bands.value[bandIndex];
  let element;

  if (parentFrameIndex !== undefined) {
    const frame = band?.elements[parentFrameIndex];
    if (frame && frame.type === "frame" && frame.elements) {
      element = frame.elements[elementIndex];
    }
  } else {
    element = band?.elements[elementIndex];
  }

  if (element) {
    // Get the current zoom scale
    const currentZoom = zoomLevel.value;

    // Get the page sheet element's position info, for more accurate coordinate calculations
    const targetSheet =
      ((event.target as HTMLElement)?.closest(".page-sheet") as HTMLElement) ||
      (document.querySelector(".page-sheet") as HTMLElement) ||
      (document.querySelector(".paper") as HTMLElement);
    let paperOffsetX = 0;
    let paperOffsetY = 0;

    if (targetSheet) {
      const paperRect = targetSheet.getBoundingClientRect();
      // Offset accounting for the zoom scale
      paperOffsetX = paperRect.left;
      paperOffsetY = paperRect.top;
    }

    resizingInfo.value = {
      bandIndex,
      elementIndex,
      direction: direction || "se",
      startX: (event.clientX - paperOffsetX) / currentZoom,
      startY: (event.clientY - paperOffsetY) / currentZoom,
      startElementX: element.x,
      startElementY: element.y,
      startWidth: element.width,
      startHeight: element.height,
      parentFrameIndex,
      targetSheet,
      startLineDirection: (element as any).lineDirection || "TopDown",
    };

    // A frame's children are re-laid out from these start positions while resizing
    const frameChildrenStart =
      element.type === "frame"
        ? ((element as FrameElement).elements ?? []).map(
            ({ x, y, width, height }) => ({ x, y, width, height }),
          )
        : null;
    const frameStartSize = { width: element.width, height: element.height };

    // What the moving edges can snap to; the other elements stay put
    const snapContext = buildSnapContext(
      bandIndex,
      getEventPageIndex(event, element),
      parentFrameIndex,
      element,
    );

    isDraggingOrResizing.value = true;

    // Undo snapshot of the size before the resize, taken on the first move so a
    // click on a handle without dragging adds no undo step
    let historySaved = false;

    // A ready-made box's own part is resized only up to the box's edges
    const parentBox =
      parentFrameIndex !== undefined
        ? (band?.elements[parentFrameIndex] as FrameElement | undefined)
        : undefined;
    const keepInParentBox = (item: DesignElement) => {
      if (!parentBox || !isBoxPart(item)) return;
      Object.assign(item, clampRectInBox(item, parentBox));
    };

    const applyResizeMove = (e: MouseEvent) => {
      if (!resizingInfo.value) return;

      const currentBand = bands.value[resizingInfo.value.bandIndex];
      if (!currentBand) return;

      if (!historySaved) {
        saveStateToHistory();
        historySaved = true;
      }

      let element: DesignElement | undefined;
      let containerWidth =
        paperWidth.value -
        (reportProperties.value?.leftMargin || 0) -
        (reportProperties.value?.rightMargin || 0);
      let containerHeight = currentBand.height;

      if (resizingInfo.value.parentFrameIndex !== undefined) {
        const frame = currentBand.elements[resizingInfo.value.parentFrameIndex];
        if (frame && frame.type === "frame" && frame.elements) {
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
      const paperEl =
        resizingInfo.value.targetSheet ||
        (document.querySelector(".page-sheet") as HTMLElement) ||
        (document.querySelector(".paper") as HTMLElement);
      let currentPaperOffsetX = 0;
      let currentPaperOffsetY = 0;

      if (paperEl) {
        const paperRect = paperEl.getBoundingClientRect();
        // Offset accounting for the zoom scale
        currentPaperOffsetX = paperRect.left;
        currentPaperOffsetY = paperRect.top;
      }

      // Calculate the new width, height, and position, accounting for zoom scale and 8-way direction
      const dir = resizingInfo.value.direction || "se";
      const startElementX = resizingInfo.value.startElementX ?? element.x;
      const startElementY = resizingInfo.value.startElementY ?? element.y;
      const startWidth = resizingInfo.value.startWidth;
      const startHeight = resizingInfo.value.startHeight;

      const currentMouseX = (e.clientX - currentPaperOffsetX) / currentZoom;
      const currentMouseY = (e.clientY - currentPaperOffsetY) / currentZoom;
      const deltaX = currentMouseX - resizingInfo.value.startX;
      const deltaY = currentMouseY - resizingInfo.value.startY;

      // Moving edges snap to other elements, else the grid. Aspect-locked
      // resizes (Shift, Alt) follow the mouse instead.
      const snapOptions = getSnapOptions(e, snapContext.offset);
      const snapGuides: SnapGuides = { x: [], y: [] };
      const snapResizeEdge = (value: number, axis: "x" | "y") => {
        if (e.shiftKey || e.altKey) return value;
        const result = snapEdge(value, snapContext.targets[axis], snapOptions, axis);
        snapGuides[axis].push(...result.lines);
        return result.value;
      };

      // 2-point endpoint resizing for line elements
      if (dir === "line-start" || dir === "line-end") {
        const startLineDir = (resizingInfo.value as any).startLineDirection || "TopDown";
        let p1x = startElementX;
        let p1y = startElementY;
        let p2x = startElementX + startWidth;
        let p2y = startElementY + startHeight;

        if (startLineDir === "BottomUp") {
          p1x = startElementX;
          p1y = startElementY + startHeight;
          p2x = startElementX + startWidth;
          p2y = startElementY;
        }

        const fixedX = dir === "line-start" ? p2x : p1x;
        const fixedY = dir === "line-start" ? p2y : p1y;
        // The dragged end follows the mouse from where it started (band
        // coordinates, like the fixed end), snapped like an edge
        const endX = snapEdge(
          (dir === "line-start" ? p1x : p2x) + deltaX,
          snapContext.targets.x,
          snapOptions,
          "x",
        );
        const endY = snapEdge(
          (dir === "line-start" ? p1y : p2y) + deltaY,
          snapContext.targets.y,
          snapOptions,
          "y",
        );
        let movingX = Math.max(0, Math.min(containerWidth, endX.value));
        let movingY = Math.max(0, Math.min(containerHeight, endY.value));

        let dx = movingX - fixedX;
        let dy = movingY - fixedY;

        if (e.shiftKey) {
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          if (absDy < absDx * 0.4) {
            dy = 0;
            movingY = fixedY;
          } else if (absDx < absDy * 0.4) {
            dx = 0;
            movingX = fixedX;
          } else {
            const dist = Math.max(absDx, absDy);
            dx = Math.sign(dx) * dist;
            dy = Math.sign(dy) * dist;
            movingX = fixedX + dx;
            movingY = fixedY + dy;
          }
        } else {
          if (Math.abs(dy) <= 8) {
            dy = 0;
            movingY = fixedY;
          } else if (Math.abs(dx) <= 8) {
            dx = 0;
            movingX = fixedX;
          }
        }

        const newCalculatedX = Math.round(Math.min(fixedX, movingX));
        const newCalculatedY = Math.round(Math.min(fixedY, movingY));
        const newCalculatedWidth = Math.max(1, Math.round(Math.abs(dx)));
        const newCalculatedHeight = Math.max(1, Math.round(Math.abs(dy)));
        const computedDir = dx * dy >= 0 ? "TopDown" : "BottomUp";

        element.x = newCalculatedX;
        element.y = newCalculatedY;
        element.width = newCalculatedWidth;
        element.height = newCalculatedHeight;
        (element as any).lineDirection = computedDir;
        keepInParentBox(element);

        showSnapGuides(
          snapContext,
          {
            x: movingX === endX.value ? endX.lines : [],
            y: movingY === endY.value ? endY.lines : [],
          },
          snapOptions,
        );
        return;
      }

      const minSize = element.type === "line" ? 1 : 5;

      let newX = startElementX;
      let newY = startElementY;
      let newWidth = startWidth;
      let newHeight = startHeight;

      // Horizontal resize
      if (dir.includes("e")) {
        // Dragging right edge: left edge (newX) is fixed at startElementX
        const maxRight = containerWidth;
        const candidateRight = snapResizeEdge(startElementX + startWidth + deltaX, "x");
        const clampedRight = Math.min(maxRight, Math.max(startElementX + minSize, candidateRight));
        newWidth = clampedRight - startElementX;
        newX = startElementX;
      } else if (dir.includes("w")) {
        // Dragging left edge: right edge is fixed at (startElementX + startWidth)
        const rightEdge = startElementX + startWidth;
        const candidateLeft = snapResizeEdge(startElementX + deltaX, "x");
        const clampedLeft = Math.max(0, Math.min(rightEdge - minSize, candidateLeft));
        newX = clampedLeft;
        newWidth = rightEdge - clampedLeft;
      }

      // Vertical resize
      if (dir.includes("s")) {
        // Dragging bottom edge: top edge (newY) is fixed at startElementY
        const maxBottom = containerHeight;
        const candidateBottom = snapResizeEdge(startElementY + startHeight + deltaY, "y");
        const clampedBottom = Math.min(maxBottom, Math.max(startElementY + minSize, candidateBottom));
        newHeight = clampedBottom - startElementY;
        newY = startElementY;
      } else if (dir.includes("n")) {
        // Dragging top edge: bottom edge is fixed at (startElementY + startHeight)
        const bottomEdge = startElementY + startHeight;
        const candidateTop = snapResizeEdge(startElementY + deltaY, "y");
        const clampedTop = Math.max(0, Math.min(bottomEdge - minSize, candidateTop));
        newY = clampedTop;
        newHeight = bottomEdge - clampedTop;
      }

      // If the SHIFT key is held, preserve the original aspect ratio
      if (e.shiftKey) {
        const aspectRatio = startWidth / startHeight;
        const heightBasedOnWidth = newWidth / aspectRatio;
        const widthBasedOnHeight = newHeight * aspectRatio;

        if (
          Math.abs(newHeight - heightBasedOnWidth) <
          Math.abs(newWidth - widthBasedOnHeight)
        ) {
          newHeight = Math.max(minSize, heightBasedOnWidth);
          if (dir.includes("n")) {
            newY = startElementY + startHeight - newHeight;
            if (newY < 0) {
              newY = 0;
              newHeight = startElementY + startHeight;
              newWidth = newHeight * aspectRatio;
              if (dir.includes("w")) {
                newX = startElementX + startWidth - newWidth;
              }
            }
          }
        } else {
          newWidth = Math.max(minSize, widthBasedOnHeight);
          if (dir.includes("w")) {
            newX = startElementX + startWidth - newWidth;
            if (newX < 0) {
              newX = 0;
              newWidth = startElementX + startWidth;
              newHeight = newWidth / aspectRatio;
              if (dir.includes("n")) {
                newY = startElementY + startHeight - newHeight;
              }
            }
          }
        }
      } else if (e.altKey) {
        // If ALT key is held, lock aspect ratio to 1:1
        const widthChange = Math.abs(newWidth - startWidth);
        const heightChange = Math.abs(newHeight - startHeight);

        if (widthChange >= heightChange) {
          newHeight = newWidth;
          if (dir.includes("n")) {
            newY = startElementY + startHeight - newHeight;
            if (newY < 0) {
              newY = 0;
              newHeight = startElementY + startHeight;
              newWidth = newHeight;
              if (dir.includes("w")) {
                newX = startElementX + startWidth - newWidth;
              }
            }
          }
        } else {
          newWidth = newHeight;
          if (dir.includes("w")) {
            newX = startElementX + startWidth - newWidth;
            if (newX < 0) {
              newX = 0;
              newWidth = startElementX + startWidth;
              newHeight = newWidth;
              if (dir.includes("n")) {
                newY = startElementY + startHeight - newHeight;
              }
            }
          }
        }
      }

      // First, store the temporary size and position
      const tempWidth = Math.round(newWidth);
      const tempHeight = Math.round(newHeight);
      const tempX = Math.round(newX);
      const tempY = Math.round(newY);

      // A table keeps its columns' shares of the width (each at least the
      // minimum column width) and its height in whole rows
      if (element.type === "table") {
        const table = element as TableElement;
        const minWidth = (table.binding?.columns.length ?? PLACEHOLDER_COLUMN_COUNT) * MIN_TABLE_COLUMN_WIDTH;
        const width = Math.max(tempWidth, minWidth);
        const height = snapTableHeight(table, tempHeight);
        if (table.binding) table.binding.columns = scaleColumnWidths(table.binding.columns, width);
        element.width = width;
        element.x = dir.includes("w") ? startElementX + startWidth - width : tempX;
        element.y = dir.includes("n") ? startElementY + startHeight - height : tempY;
        element.height = height;
      } else {
        element.width = tempWidth;
        element.x = tempX;
        element.y = tempY;
        element.height = tempHeight;
      }
      keepInParentBox(element);

      // Keep a frame's content in step with the frame (stretch wide items, pin edge items)
      if (frameChildrenStart && element.type === "frame") {
        const fitted = fitChildrenToFrame(frameChildrenStart, frameStartSize, {
          width: element.width,
          height: element.height,
        });
        (element as FrameElement).elements?.forEach((child, i) => {
          const rect = fitted[i];
          if (rect) Object.assign(child, rect);
        });
      }

      showSnapGuides(snapContext, snapGuides, snapOptions);
    };
    const handleMouseMove = throttleToAnimationFrame(applyResizeMove);

    const handleMouseUp = () => {
      // Apply the last mouse move, then clear the alignment lines
      handleMouseMove.flush();
      clearAlignmentLines();

      resizingInfo.value = null;
      isDraggingOrResizing.value = false;
      isJustDraggedOrResized.value = true;
      setTimeout(() => {
        isJustDraggedOrResized.value = false;
      }, 150);

      // Update JRXML
      updateJRXML();

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }
};

// "Fit to text" (the Fit badge, double-clicking the bottom handle, and the
// Properties button): static one-line text gets the width of its text, keeping
// its alignment edge and staying within its band or box; everything gets the
// height its text needs. The band grows to fit, up to its maximum.
const autoFitElementHeight = (
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  const band = bands.value[bandIndex];
  if (!band) return;

  const box =
    parentFrameIndex !== undefined
      ? (band.elements[parentFrameIndex] as FrameElement | undefined)
      : undefined;
  const element =
    parentFrameIndex !== undefined
      ? box?.elements?.[elementIndex]
      : band.elements[elementIndex];
  if (!element || element.type !== "textField") return;

  const font = reportProperties.value?.defaultFont;
  const { x, width } = planTextFit(
    element as TextFitElement,
    // 1px spare so rounding in the browser never wraps the last word
    measureTextElementWidth(element as any, font) + 1,
    box ? box.width : printableWidth.value,
  );
  const height = calculateTextElementHeight({ ...(element as any), width }, font);
  if (x === element.x && width === element.width && height === element.height) return;

  saveStateToHistory();
  element.x = x;
  element.width = width;
  element.height = height;

  // A band grows to fit the text, up to its maximum; past that, warn
  if (!box && element.y + height > band.height) {
    const maxBandHeight = getBandMaxHeight(bandIndex);
    band.height = Math.max(band.height, Math.min(maxBandHeight, element.y + height));
    if (element.y + height > maxBandHeight) {
      notification.warning(
        t("editor.bandLimits.textOverflow", {
          band: getBandDisplayName(band.type),
          height: maxBandHeight,
        }),
      );
    }
  }
  updateJRXML();
  ensureBandsFitPage();
  updateOutOfBoundsElements();
};

// Clean up event listeners when the component unmounts
onUnmounted(() => {
  if ((window as any).pdfDesignerKeydownListener) {
    document.removeEventListener(
      "keydown",
      (window as any).pdfDesignerKeydownListener,
    );
    delete (window as any).pdfDesignerKeydownListener;
  }
});

// Help-related state
const showHelp = ref(false);

// PDF preview related state
const showPdfPreview = ref(false);

// Field management related state
const showFieldModal = ref(false);
const editingField = ref<ReportField | undefined>(undefined);
const editingParameter = ref<ReportParameter | undefined>(undefined);

// Variable management related state
const showVariableModal = ref(false);
const editingVariable = ref<ReportVariable | undefined>(undefined);

// Handle updating element value from report elements list
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
  if (confirm(t("editor.confirmDelete.field", { name: fieldName }))) {
    const fieldIndex = reportFields.value.findIndex(
      (field) => field.name === fieldName,
    );
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
  if (
    confirm(t("editor.confirmDelete.parameter", { name: parameterName }))
  ) {
    const parameterIndex = reportParameters.value.findIndex(
      (param) => param.name === parameterName,
    );
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
  if (confirm(t("editor.confirmDelete.variable", { name: variableName }))) {
    const variableIndex = reportVariables.value.findIndex(
      (v) => v.name === variableName,
    );
    if (variableIndex !== -1) {
      reportVariables.value.splice(variableIndex, 1);
      saveStateToHistory();
      updateJRXML();
    }
  }
};

// Handle saving a variable
const handleVariableSave = (variable: ReportVariable): void => {
  const existingIndex = reportVariables.value.findIndex(
    (v) => v.name === variable.name,
  );
  if (existingIndex !== -1 && editingVariable.value?.name !== variable.name) {
    alert(t("editor.duplicateName.variable"));
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

// ── Table styles ──
// Every table carries its own look; a saved style is a named look other
// tables can use. Each action below is one undo step.

const copyLook = (look: TableLook): TableLook => ({ ...look });

// Tables currently using a saved style unchanged
const tablesUsingStyle = (id: string) =>
  collectBoundTables(bands.value).filter((t) => t.binding.theme === id && !t.binding.customized);

const selectedTable = () => {
  const sel = selectedElement.value;
  return sel ? tableAt({ bandIndex: sel.bandIndex, elementIndex: sel.elementIndex, parentFrameIndex: sel.parentFrameIndex }) : null;
};

// The selected table's look becomes a new saved style, used by that table
const saveTableStyle = (name: string): void => {
  const binding = selectedTable()?.binding;
  if (!binding) return;
  saveStateToHistory();
  const style: SavedTableStyle = {
    id: createTableStyleId(tableStyles.value),
    name,
    look: copyLook(resolveLook(binding)),
  };
  tableStyles.value = [...tableStyles.value, style];
  binding.theme = style.id;
  binding.look = copyLook(style.look);
  binding.customized = undefined;
  notification.success(t("dataTable.style.saved", { name }));
  updateJRXML();
};

// A saved style takes the selected table's look; every table using it follows
const updateTableStyle = (id: string): void => {
  const binding = selectedTable()?.binding;
  const style = tableStyles.value.find((s) => s.id === id);
  if (!binding || !style) return;
  saveStateToHistory();
  const look = copyLook(resolveLook(binding));
  tableStyles.value = tableStyles.value.map((s) => (s.id === id ? { ...s, look } : s));
  for (const table of tablesUsingStyle(id)) table.binding.look = copyLook(look);
  binding.theme = id;
  binding.look = copyLook(look);
  binding.customized = undefined;
  notification.success(t("dataTable.style.updated", { name: style.name }));
  updateJRXML();
};

const renameTableStyle = (id: string, name: string): void => {
  saveStateToHistory();
  tableStyles.value = tableStyles.value.map((s) => (s.id === id ? { ...s, name } : s));
  updateJRXML();
};

// Tables using a deleted style keep their look, as changes of their own
const deleteTableStyle = (id: string): void => {
  saveStateToHistory();
  for (const table of tablesUsingStyle(id)) table.binding.customized = true;
  tableStyles.value = tableStyles.value.filter((s) => s.id !== id);
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
    if (
      selectedElement.value &&
      selectedElement.value.bandIndex === bandIndex &&
      selectedElement.value.elementIndex === elementIndex
    ) {
      selectedElement.value = null;
      selectedElements.value = [];
    }
  }
};

// Handle saving a field
const handleFieldSave = (fieldOrParam: ReportField | ReportParameter): void => {
  if (isEditingParameter.value) {
    // Handle saving a parameter
    const existingParamIndex = reportParameters.value.findIndex(
      (p) => p.name === fieldOrParam.name,
    );

    if (
      existingParamIndex !== -1 &&
      editingParameter.value?.name !== fieldOrParam.name
    ) {
      // If editing and a parameter with this name already exists, show an error
      alert(t("editor.duplicateName.parameter"));
      return;
    }

    if (existingParamIndex !== -1) {
      // Update the existing parameter
      reportParameters.value[existingParamIndex] =
        fieldOrParam as ReportParameter;
    } else {
      // Add the new parameter
      reportParameters.value.push(fieldOrParam as ReportParameter);
    }
  } else {
    // Handle saving a field
    const existingFieldIndex = reportFields.value.findIndex(
      (f) => f.name === fieldOrParam.name,
    );

    if (
      existingFieldIndex !== -1 &&
      editingField.value?.name !== fieldOrParam.name
    ) {
      // If editing and a field with this name already exists, show an error
      alert(t("editor.duplicateName.field"));
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

  fields.forEach((fieldName) => {
    // Check whether the field already exists
    const existingFieldIndex = reportFields.value.findIndex(
      (f) => f.name === fieldName,
    );

    if (existingFieldIndex === -1) {
      // The field doesn't exist yet; add it automatically
      reportFields.value.push({
        name: fieldName,
        class: "java.lang.String",
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

// Handle the element context menu
const handleElementContextMenu = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
): void => {
  event.preventDefault();
  event.stopPropagation();
  selectElement(bandIndex, elementIndex, false, parentFrameIndex);
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: "element",
  };
};

// Handle the canvas context menu
const handleCanvasContextMenu = (event: MouseEvent): void => {
  event.preventDefault();
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: "canvas",
  };
};

// Handle a context menu action
const handleContextMenuAction = (action: string) => {
  contextMenu.value.visible = false;
  switch (action) {
    case "copy":
      copyElement();
      break;
    case "paste":
      pasteElement({ clientX: contextMenu.value.x, clientY: contextMenu.value.y });
      break;
    case "delete":
      deleteElement();
      break;
    case "bringToFront":
      moveElementZOrder("front");
      break;
    case "sendToBack":
      moveElementZOrder("back");
      break;
    case "moveOutOfBox":
      moveElementOutOfBox();
      break;
    case "addToBox":
      addElementToBox();
      break;
  }
};

// The selected item when it sits inside a box or frame, with whether it is one
// of the box's parts (kept inside) or an item that was dropped in (moves freely)
const selectedBoxItem = computed(() => {
  const selection = selectedElement.value;
  if (!selection || selection.parentFrameIndex === undefined) return null;
  const box = bands.value[selection.bandIndex]?.elements[selection.parentFrameIndex] as
    | FrameElement
    | undefined;
  const item = box?.elements?.[selection.elementIndex];
  if (!box || !item) return null;
  return { box, item, isPart: isBoxPart(item) };
});

// Make an item that was dropped into a box one of its parts: it stays inside
// the box and moves with it as one piece
const addElementToBox = () => {
  const target = selectedBoxItem.value;
  if (!target || target.isPart) return;
  const { box, item } = target;
  saveStateToHistory();
  markBoxPart(item);
  Object.assign(item, clampPositionInBox(item, box));
  Object.assign(item, clampRectInBox(item, box));
  updateJRXML();
};

// Take the selected item out of its box and put it in the band at the same spot
const moveElementOutOfBox = () => {
  const selection = selectedElement.value;
  if (!selection || selection.parentFrameIndex === undefined) return;
  const band = bands.value[selection.bandIndex];
  const box = band?.elements[selection.parentFrameIndex] as FrameElement | undefined;
  const item = box?.elements?.[selection.elementIndex];
  if (!band || !box || !item) return;

  saveStateToHistory();
  box.elements!.splice(selection.elementIndex, 1);
  releaseBoxPart(item);
  item.x = box.x + item.x;
  item.y = box.y + item.y;
  // Detail content is split into pages; the item stays on the box's page
  if ((box as any).pageIndex !== undefined) (item as any).pageIndex = (box as any).pageIndex;
  band.elements.push(item);
  selectElement(selection.bandIndex, band.elements.length - 1);
  updateJRXML();
};

// Move an element's Z-order
const moveElementZOrder = (direction: "front" | "back") => {
  if (!selectedElement.value) return;
  saveStateToHistory();
  const { bandIndex, elementIndex, parentFrameIndex } = selectedElement.value;
  const band = bands.value[bandIndex];
  if (!band) return;
  const elements =
    parentFrameIndex !== undefined
      ? (band.elements[parentFrameIndex] as any).elements
      : band.elements;
  if (!elements) return;
  const [element] = elements.splice(elementIndex, 1);
  if (direction === "front") elements.push(element);
  else elements.unshift(element);
  const newIndex = direction === "front" ? elements.length - 1 : 0;
  selectElement(bandIndex, newIndex, false, parentFrameIndex);
  updateJRXML();
};

// Handle Band selection changes
const handleBandSelectionChange = (): void => {
  // Get the currently selected band types
  const currentSelectedTypes = [...selectedBandTypes.value] as BandType[];

  // Get the types currently present in bands
  const currentBandTypes = bands.value.map((band) => band.type);

  // Determine which bands need to be added (present in selectedBandTypes but not in currentBandTypes)
  const bandsToAdd = currentSelectedTypes.filter(
    (type) => !currentBandTypes.includes(type),
  );

  // Determine which bands need to be removed (present in currentBandTypes but not in selectedBandTypes)
  // Detail band is the fundamental report canvas and must never be removed
  const bandsToRemove = currentBandTypes.filter(
    (type) =>
      !currentSelectedTypes.includes(type) &&
      type !== BAND_TYPE_CONSTANTS.DETAIL,
  );

  // Remove the bands that are no longer needed
  if (bandsToRemove.length > 0) {
    bands.value = bands.value.filter(
      (band) => !bandsToRemove.includes(band.type),
    );
  }

  // Add the new bands
  if (bandsToAdd.length > 0) {
    const defaultBandConfig = getEffectiveDefaultBandConfig();
    const newBands = bandsToAdd.map((type) => {
      const bandTypeConfig = allBandTypes.find((bt) => bt.type === type);
      const defaultHeight =
        defaultBandConfig[type]?.defaultHeight ??
        (bandTypeConfig ? bandTypeConfig.defaultHeight : 50);
      return {
        type: type as BandType,
        height: defaultHeight,
        elements: [],
      };
    });

    // Insert the new bands in the order defined by allBandTypes
    allBandTypes.forEach((bandType) => {
      if (bandsToAdd.includes(bandType.type as BandType)) {
        const newBand = newBands.find((b) => b.type === bandType.type);
        if (newBand) {
          // Ensure the height property isn't undefined
          if (newBand.height === undefined) {
            newBand.height = BAND_HEIGHT_CONSTANTS[bandType.type] || 50;
          }
          // Find the appropriate insertion position
          let insertIndex = bands.value.length;
          for (let i = 0; i < bands.value.length; i++) {
            const currentBandTypeIndex = allBandTypes.findIndex(
              (bt) => bt.type === bands.value[i]?.type,
            );
            const newBandTypeIndex = allBandTypes.findIndex(
              (bt) => bt.type === bandType.type,
            );
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

  // Ensure bands fit within the A4 page height
  ensureBandsFitPage();

  // Save state to history
  saveStateToHistory();

  // Update JRXML
  updateJRXML();
};
</script>

<style scoped>
.brand-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 6px;
  flex-shrink: 0;
}

.brand-img img {
  width: 32px;
  height: 32px;
  filter: drop-shadow(0 2px 8px rgba(124, 92, 247, 0.2));
  border-radius: 4px;
}
.brand-name {
  display: flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1;
  min-width: 0;
}
.brand-text {
  color: #1c1b26;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.02em;
  white-space: nowrap;
}
.brand-badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 1.5px 5px;
  border: 1px solid rgba(124, 92, 247, 0.28);
  border-radius: 4px;
  color: #6440f4;
  background: rgba(124, 92, 247, 0.14);
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.08em;
  white-space: nowrap;
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
/* Properties / AI Assistant: a segmented switch whose white highlight slides
   to the open tab, then the settings (AI only) and collapse buttons */
.right-panel-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 8px 10px;
  border-bottom: 1px solid #eceef2;
  background: #fff;
}

.right-panel-seg {
  position: relative;
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border-radius: 9px;
  background: #eef0f4;
}

.right-panel-indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / 2);
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
  transform: translateX(calc(100% * var(--tab-index)));
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.right-panel-tab {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 7px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  transition: color 0.2s ease;
}

/* The tab being opened fades and rises in */
.right-panel-fade-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.right-panel-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

@media (prefers-reduced-motion: reduce) {
  .right-panel-indicator,
  .right-panel-fade-enter-active {
    transition: none;
  }
}

.right-panel-tab:hover {
  color: #111827;
}

.right-panel-tab.active {
  color: var(--primary-color);
  font-weight: 600;
}

.right-panel-tab:focus-visible,
.right-panel-settings-btn:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.right-panel-settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 30px;
  height: 30px;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 7px;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.right-panel-settings-btn:hover {
  border-color: #93c5fd;
  background: #eff6ff;
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
  padding: 0 14px;
  background-color: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  height: 56px;
  flex-shrink: 0;
  gap: 12px;
  position: relative;
  z-index: 1000;
}

.designer-header h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.header-left.header-workflow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 1 auto;
  min-width: 0;
}

/* Google Docs style editable document title */
.document-title-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.document-title-input {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  outline: none;
  min-width: 120px;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.15s ease;
  font-family: inherit;
  border-color: #d1d5db;
  background-color: #f9fafb;
}

.document-title-input:focus {
  border-color: #2563eb;
  background-color: #ffffff;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
}

.auto-save-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  font-size: 11px;
  user-select: none;
}

.save-status-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  font-size: 11px;
  line-height: 1;
  transition: all 0.2s ease;
}

.save-status-text.saved {
  color: #16a34a;
  background-color: rgba(22, 163, 74, 0.1);
}

.save-status-text.saving {
  color: #d97706;
  background-color: rgba(217, 119, 6, 0.1);
}

.save-status-text.error {
  color: #dc2626;
  background-color: rgba(220, 38, 38, 0.1);
}

.saved-icon {
  flex-shrink: 0;
}

.save-spinner {
  width: 9px;
  height: 9px;
  border: 1.5px solid rgba(217, 119, 6, 0.3);
  border-top-color: #d97706;
  border-radius: 50%;
  animation: save-spin 0.8s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

@keyframes save-spin {
  to {
    transform: rotate(360deg);
  }
}

.header-undo-redo {
  display: flex;
  gap: 2px;
  align-items: center;
  flex-shrink: 0;
}

.bottom-panel-btn {
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex: 1 1 auto;
  justify-content: flex-end;
}

.snap-controls-header {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 0 4px;
  flex-shrink: 0;
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
    box-shadow: 0 0 0 v-bind('UI_CONSTANTS.BORDER_THICK + "px"')
      rgba(24, 144, 255, 0.5);
  }
  100% {
    box-shadow: 0 0 0 v-bind('UI_CONSTANTS.BORDER_MEDIUM + "px"') #1890ff;
  }
}

/* Coordinate display styles */
.coordinates-display,
.band-height-display {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: v-bind('UI_CONSTANTS.SMALL_MARGIN + "px"')
    v-bind('UI_CONSTANTS.MEDIUM_MARGIN + "px"');
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
  box-shadow: var(
    --prop-shadow-md,
    0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 6px 16px 0 rgba(0, 0, 0, 0.08)
  );
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
  flex-shrink: 0;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 2px;
  flex-shrink: 0;
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
  color: #4b5563;
  transition: all 0.15s ease;
}

.toolbar-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.toolbar-btn.add-page-btn {
  width: auto;
  padding: 0 8px;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}
</style>
