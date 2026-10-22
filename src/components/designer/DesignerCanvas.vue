<template>
  <div ref="designerCanvasRef" class="designer-canvas" @click="setDesignAreaFocused">
    <!-- Drag feedback layer -->
    <DragFeedbackLayer :feedback="dragFeedback" />

    <!-- Top ruler container -->
    <div class="top-ruler-container">
      <!-- Top-left corner blank area -->
      <div class="corner-space">
        <div class="unit-label">px</div>
      </div>
      <!-- Horizontal ruler -->
      <div class="horizontal-ruler" ref="horizontalRulerRef">
        <div
          class="ruler-content"
          :style="{ width: paperWidth * zoomLevel + RULER_SCROLL_SLACK + 'px' }"
        >
          <!-- Shaded margins; the numbers count from the left margin, like element X -->
          <div
            class="ruler-margin"
            :style="{ left: 0, width: marginLeft * zoomLevel + 'px' }"
          ></div>
          <div
            class="ruler-margin"
            :style="{
              left: (paperWidth - marginRight) * zoomLevel + 'px',
              width: marginRight * zoomLevel + 'px',
            }"
          ></div>
          <div
            v-for="tick in horizontalRulerTicks"
            :key="tick.position"
            class="tick"
            :class="{ major: tick.major, minor: !tick.major }"
            :style="{ left: tick.position * zoomLevel + 'px' }"
          ></div>
          <div
            v-for="label in horizontalRulerLabels"
            :key="label.position"
            class="label"
            :class="rulerLabelAlign(label.position, paperWidth)"
            :style="{ left: label.position * zoomLevel + 'px' }"
          >
            {{ label.value }}
          </div>
        </div>
      </div>
    </div>

    <!-- Left ruler and paper container -->
    <div class="main-content">
      <!-- Vertical ruler -->
      <div class="vertical-ruler-container">
        <div class="vertical-ruler" ref="verticalRulerRef">
          <div
            class="ruler-content"
            :style="{
              height: (totalRulerHeight + 32) * zoomLevel + RULER_SCROLL_SLACK + 'px',
            }"
          >
            <!-- Shaded top/bottom margins of each page; numbers count from the top margin -->
            <template v-for="pIndex in totalPages" :key="'ruler-margin-' + pIndex">
              <div
                class="ruler-margin"
                :style="{
                  top: pageRulerOffset(pIndex) * zoomLevel + 'px',
                  height: marginTop * zoomLevel + 'px',
                }"
              ></div>
              <div
                class="ruler-margin"
                :style="{
                  top:
                    (pageRulerOffset(pIndex) + paperHeight - marginBottom) *
                      zoomLevel +
                    'px',
                  height: marginBottom * zoomLevel + 'px',
                }"
              ></div>
            </template>
            <div
              v-for="tick in verticalRulerTicks"
              :key="tick.position"
              class="tick"
              :class="{ major: tick.major, minor: !tick.major }"
              :style="{ top: tick.position * zoomLevel + 'px' }"
            ></div>
            <div
              v-for="label in verticalRulerLabels"
              :key="label.position"
              class="label"
              :class="rulerLabelAlign(label.position % (paperHeight + 32), paperHeight)"
              :style="{ top: label.position * zoomLevel + 'px' }"
            >
              {{ label.value }}
            </div>
          </div>
        </div>
      </div>

      <!-- Paper container -->
      <div
        class="paper-container"
        ref="paperContainerRef"
        @contextmenu="handleCanvasContextMenu"
      >
        <div class="pages-wrapper">
          <!-- Multi-page sheets -->
          <div
            v-for="pIndex in totalPages"
            :key="'page-sheet-wrapper-' + pIndex"
            class="page-sheet-wrapper"
            :style="{
              width: paperWidth * zoomLevel + 'px',
              height: paperHeight * zoomLevel + 'px',
              marginBottom: 32 * zoomLevel + 'px',
              position: 'relative',
            }"
          >
            <div
              class="paper page-sheet"
              :data-page-index="pIndex - 1"
              :style="{
                width: paperWidth + 'px',
                height: paperHeight + 'px',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left',
              }"
              :class="{ focused: isDesignAreaFocused, [`is-${kindOf(pIndex - 1)}-page`]: isSpecial(pIndex - 1) }"
              @drop="handleDrop($event, pIndex - 1)"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @mousedown="notePageClicked"
            >
              <!-- Floating Page Sheet Header / Badge in margin -->
              <div
                class="page-sheet-header"
                :class="{ 'is-compact': compactPageToolbar }"
                :style="{ transform: `scale(${pageToolbarScale})` }"
              >
                <span class="page-sheet-badge" :class="{ 'is-special': isSpecial(pIndex - 1) }">{{
                  pageBadge(pIndex - 1)
                }}</span>
                <!-- Cover / contents page: change its design (all of it stays editable) -->
                <button
                  v-if="isSpecial(pIndex - 1)"
                  class="add-page-after-btn"
                  data-help="change-design"
                  :title="t('specialPages.changeDesignHint')"
                  @click.stop="emit('page-action', 'chooseDesign', pIndex - 1)"
                >
                  <LayoutTemplate :size="13" aria-hidden="true" />
                  <span class="btn-label">{{ t("specialPages.changeDesign") }}</span>
                </button>
                <button
                  v-if="kindOf(pIndex - 1) === 'normal'"
                  class="add-page-after-btn"
                  @click.stop="emit('add-page', pIndex)"
                  :title="t('canvas.addPageAfter')"
                >
                  <Plus :size="13" :stroke-width="2.2" aria-hidden="true" />
                  <span class="btn-label">{{ t("canvas.addPageAfter") }}</span>
                </button>
                <button
                  v-else-if="pIndex - 1 === special.count - 1 && kindOf(pIndex - 1) === 'contents'"
                  class="add-page-after-btn"
                  @click.stop="emit('page-action', 'addContents', pIndex - 1)"
                  :title="t('specialPages.addAnotherContentsHint')"
                >
                  <Plus :size="13" :stroke-width="2.2" aria-hidden="true" />
                  <span class="btn-label">{{ t("specialPages.addAnotherContents") }}</span>
                </button>
                <button
                  v-if="canDeletePage(pIndex - 1)"
                  class="delete-page-btn"
                  @click.stop="emit('delete-page', pIndex - 1)"
                  :title="t('canvas.deletePage')"
                >
                  <Trash2 :size="13" aria-hidden="true" />
                  <span class="btn-label">{{ t("canvas.deletePage") }}</span>
                </button>
                <!-- Cover / contents choices for this page -->
                <div v-if="pageMenuItems(pIndex - 1).length" class="page-menu-wrap">
                  <button
                    type="button"
                    class="page-menu-btn"
                    :class="{ 'is-open': openPageMenu === pIndex - 1 }"
                    :title="t('specialPages.pageOptions')"
                    :aria-label="t('specialPages.pageOptions')"
                    aria-haspopup="menu"
                    :aria-expanded="openPageMenu === pIndex - 1"
                    @mousedown.stop
                    @click.stop="togglePageMenu(pIndex - 1)"
                  >
                    <EllipsisVertical :size="14" aria-hidden="true" />
                  </button>
                  <div v-if="openPageMenu === pIndex - 1" class="page-menu" role="menu" @mousedown.stop>
                    <button
                      v-for="item in pageMenuItems(pIndex - 1)"
                      :key="item.action"
                      type="button"
                      role="menuitem"
                      class="page-menu-item"
                      :class="{ 'is-danger': item.danger }"
                      @click.stop="runPageAction(item.action, pIndex - 1)"
                    >
                      <component :is="item.icon" :size="14" aria-hidden="true" />
                      <span>{{ t(item.labelKey) }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Report margin container -->
              <div
                class="pager"
                :style="{
                  padding: isSheetPage(pIndex - 1)
                    ? '0'
                    : (reportProperties.topMargin || 0) +
                      'px ' +
                      (reportProperties.rightMargin || 0) +
                      'px ' +
                      (reportProperties.bottomMargin || 0) +
                      'px ' +
                      (reportProperties.leftMargin || 0) +
                      'px',
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  position: 'relative',
                }"
              >
                <!-- A contents page without a Table of Contents: offer to add one
                     (designer only; never printed) -->
                <div v-if="contentsPageWithoutToc(pIndex - 1)" class="no-toc-prompt">
                  <div class="no-toc-card" @mousedown.stop>
                    <TableOfContents :size="20" aria-hidden="true" />
                    <span class="no-toc-title">{{ t("specialPages.noToc") }}</span>
                    <div class="no-toc-actions">
                      <button type="button" class="no-toc-btn is-primary" data-help="add-toc" @click.stop="emit('page-action', 'addToc', pIndex - 1)">
                        <Plus :size="13" aria-hidden="true" />
                        {{ t("specialPages.addToc") }}
                      </button>
                      <button type="button" class="no-toc-btn" @click.stop="emit('page-action', 'chooseDesign', pIndex - 1)">
                        <LayoutTemplate :size="13" aria-hidden="true" />
                        {{ t("specialPages.chooseDesign") }}
                      </button>
                    </div>
                  </div>
                </div>
                <!-- Dynamic Bands for this Page -->
                <div
                  v-for="bItem in getBandsForPage(pIndex)"
                  :key="`page-${pIndex}-band-${bItem.band.type}-${bItem.bandIndex}`"
                  class="band"
                  :class="[
                    `${bItem.band.type}-band`,
                    bItem.band.type === 'columnFooter' ? 'column-footer-band' : '',
                    bItem.band.type === 'pageFooter' ? 'page-footer-band' : '',
                    bItem.band.type === 'pageHeader' ? 'page-header-band' : '',
                    bItem.band.type === 'columnHeader' ? 'column-header-band' : '',
                    {
                      'drop-target': highlightedBandIndex === bItem.bandIndex,
                      'drop-blocked':
                        highlightedBandIndex === bItem.bandIndex && dropTargetBlocked,
                    },
                  ]"
                  :data-band-index="bItem.bandIndex"
                  :data-band-name="bItem.band.type"
                  :style="{ height: bItem.effectiveHeight + 'px' }"
                  @click.stop="selectBand(bItem.bandIndex)"
                >
                  <!-- Grid from the band's top-left, the origin of element X/Y and of
                       snap-to-grid; lines stay one screen pixel wide at any zoom -->
                  <svg
                    v-if="showGrid && bItem.effectiveHeight > 0"
                    class="band-grid"
                    :width="isSheetPage(pIndex - 1) ? paperWidth : printableWidth"
                    :height="bItem.effectiveHeight"
                    aria-hidden="true"
                  >
                    <path
                      :d="gridPath(isSheetPage(pIndex - 1) ? paperWidth : printableWidth, bItem.effectiveHeight)"
                      :stroke-width="1 / zoomLevel"
                    />
                  </svg>
                  <!-- Horizontal alignment guides, in the band they belong to (Y is per band) -->
                  <template
                    v-if="
                      alignmentLines &&
                      alignmentLines.bandIndex === bItem.bandIndex &&
                      alignmentLines.pageIndex === pIndex - 1
                    "
                  >
                    <div
                      v-for="line in alignmentLines.y"
                      :key="'guide-y-' + line"
                      class="alignment-line horizontal"
                      :style="{
                        top: line + 'px',
                        left: -(isSheetPage(pIndex - 1) ? 0 : marginLeft) + 'px',
                        width: paperWidth + 'px',
                        height: 1 / zoomLevel + 'px',
                      }"
                    ></div>
                  </template>
                  <div class="band-background-label-container">
                    <span class="band-background-label">{{
                      bItem.displayLabel
                    }}</span>
                  </div>

                  <div class="band-content">
                    <!-- Detail Band Elements (partitioned by page) -->
                    <template v-if="bItem.isDetail">
                      <ElementFactory
                        v-for="{
                          element: item,
                          originalIndex,
                        } in getDetailElementsForPage(pIndex - 1)"
                        :key="`page-${pIndex}-detail-${item.uuid || originalIndex}`"
                        :element="item"
                        :band-index="bItem.bandIndex"
                        :element-index="originalIndex"
                        :selected-element="selectedElement"
                        :selected-elements="selectedElements"
                        :editing-element="editingElement"
                        :is-dragging="isDraggingOrResizing"
                        :report-font-family="reportProperties.defaultFont?.name"
                        :report-font-size="reportProperties.defaultFont?.size"
                        :report-is-bold="reportProperties.defaultFont?.isBold"
                        :report-is-italic="reportProperties.defaultFont?.isItalic"
                        :report-is-underline="
                          reportProperties.defaultFont?.isUnderline
                        "
                        :is-out-of-bounds="
                          isElementOutOfBounds(bItem.bandIndex, originalIndex)
                        "
                        :zoom-level="zoomLevel"
                        :page-number="pIndex"
                        :total-pages="totalPages"
                        @select="selectElement"
                        @drag-start="startDragging"
                        @resize-start="startResizingElement"
                        @auto-fit-height="handleAutoFitHeight"
                        @contextmenu="handleElementContextMenu"
                        @start-editing="startEditing"
                        @finish-editing="finishEditing"
                        @cancel-editing="cancelEditing"
                        @check-fields="checkFields"
                        @rotate="(b, e, p) => emit('rotate', b, e, p)"
                      />
                      <div
                        v-if="
                          getDetailElementsForPage(pIndex - 1).length === 0
                        "
                        class="canvas-empty-state"
                      >
                        <div class="empty-state-text">
                          <span class="empty-state-icon" aria-hidden="true">
                            <MousePointerClick :size="18" />
                          </span>
                          <!-- What to do on an empty page (Help) -->
                          <strong class="empty-state-title">{{
                            kindOf(pIndex - 1) === "cover"
                              ? t("specialPages.emptyCover")
                              : kindOf(pIndex - 1) === "contents"
                                ? t("specialPages.emptyContents")
                                : t("canvas.emptyPage", { page: pIndex })
                          }}</strong>
                          <span>{{
                            kindOf(pIndex - 1) === "cover"
                              ? t("specialPages.emptyCoverHint")
                              : kindOf(pIndex - 1) === "contents"
                                ? t("specialPages.emptyContentsHint")
                                : t("canvas.emptyPageHint")
                          }}</span>
                        </div>
                      </div>
                    </template>

                    <!-- Standard Band Elements -->
                    <template v-else>
                      <ElementFactory
                        v-for="(item, index) in bItem.band.elements"
                        :key="`page-${pIndex}-${bItem.band.type}-${item.uuid || index}`"
                        :element="item"
                        :band-index="bItem.bandIndex"
                        :element-index="index"
                        :selected-element="selectedElement"
                        :selected-elements="selectedElements"
                        :editing-element="editingElement"
                        :is-dragging="isDraggingOrResizing"
                        :report-font-family="reportProperties.defaultFont?.name"
                        :report-font-size="reportProperties.defaultFont?.size"
                        :report-is-bold="reportProperties.defaultFont?.isBold"
                        :report-is-italic="reportProperties.defaultFont?.isItalic"
                        :report-is-underline="
                          reportProperties.defaultFont?.isUnderline
                        "
                        :is-out-of-bounds="
                          isElementOutOfBounds(bItem.bandIndex, index)
                        "
                        :zoom-level="zoomLevel"
                        :page-number="pIndex"
                        :total-pages="totalPages"
                        @select="selectElement"
                        @drag-start="startDragging"
                        @resize-start="startResizingElement"
                        @auto-fit-height="handleAutoFitHeight"
                        @contextmenu="handleElementContextMenu"
                        @start-editing="startEditing"
                        @finish-editing="finishEditing"
                        @cancel-editing="cancelEditing"
                        @check-fields="checkFields"
                        @rotate="(b, e, p) => emit('rotate', b, e, p)"
                      />
                    </template>
                    <!-- The selected item's outline and handles, drawn above
                         everything: the item keeps its place in the stacking
                         order, so something on top could cover its own -->
                    <div
                      v-if="topHandles && topHandles.bandIndex === bItem.bandIndex && topHandles.pageIndex === (bItem.isDetail ? pIndex - 1 : topHandles.pageIndex)"
                      class="top-handles"
                      :style="{
                        left: topHandles.x + 'px',
                        top: topHandles.y + 'px',
                        width: topHandles.width + 'px',
                        height: topHandles.height + 'px',
                      }"
                    >
                      <div
                        v-for="dir in HANDLE_DIRS"
                        :key="dir"
                        class="top-handle"
                        :class="`is-${dir}`"
                        @mousedown.stop="
                          $event.button === 0 &&
                            startResizingElement(
                              $event,
                              topHandles.bandIndex,
                              topHandles.elementIndex,
                              topHandles.parentFrameIndex,
                              dir,
                            )
                        "
                      ></div>
                    </div>
                  </div>

                  <!-- Band resize handle for non-detail bands -->
                  <div
                    v-if="bItem.showResizeHandle"
                    class="band-resize-handle"
                    @mousedown.stop="
                      startResizingBand($event, bItem.bandIndex)
                    "
                  ></div>
                </div>

                <!-- Background band (page borders, watermarks), printed behind every page.
                     Drawn over the bands with a multiply blend so the bands keep their white
                     background while lines still show. Not interactive on the canvas; select
                     its elements from Report Elements. -->
                <div
                  v-if="backgroundElements.length > 0 && !isSheetPage(pIndex - 1)"
                  class="background-band-layer"
                  :style="{
                    top: (reportProperties.topMargin || 0) + 'px',
                    left: (reportProperties.leftMargin || 0) + 'px',
                    right: (reportProperties.rightMargin || 0) + 'px',
                    height: (bands[backgroundBandIndex]?.height || 0) + 'px',
                  }"
                >
                  <ElementFactory
                    v-for="(item, index) in backgroundElements"
                    :key="`page-${pIndex}-background-${item.uuid || index}`"
                    :element="item"
                    :band-index="backgroundBandIndex"
                    :element-index="index"
                    :selected-element="selectedElement"
                    :selected-elements="selectedElements"
                    :editing-element="null"
                    :is-dragging="false"
                    :report-font-family="reportProperties.defaultFont?.name"
                    :report-font-size="reportProperties.defaultFont?.size"
                    :report-is-bold="reportProperties.defaultFont?.isBold"
                    :report-is-italic="reportProperties.defaultFont?.isItalic"
                    :report-is-underline="reportProperties.defaultFont?.isUnderline"
                    :is-out-of-bounds="false"
                    :zoom-level="zoomLevel"
                    :page-number="pIndex"
                    :total-pages="totalPages"
                  />
                  <!-- Thin clickable strips along each edge, so a page border can be
                       selected on the canvas while its inside stays click-through -->
                  <template
                    v-for="(item, index) in backgroundElements"
                    :key="`page-${pIndex}-background-hit-${item.uuid || index}`"
                  >
                    <div
                      v-for="side in EDGE_SIDES"
                      :key="side"
                      class="background-edge-hit"
                      :class="`edge-${side}`"
                      :style="edgeHitStyle(item, side)"
                      :title="t('canvas.selectPageBorder')"
                      @mousedown.stop
                      @click.stop="selectElement(backgroundBandIndex, index, $event.ctrlKey || $event.metaKey || $event.shiftKey)"
                    ></div>
                  </template>
                </div>

                <!-- While the Page Border tile is dragged: the Background band (the whole
                     printable area, behind every page) is the drop target, not a band -->
                <div
                  v-if="backgroundDropTarget && !isSheetPage(pIndex - 1)"
                  class="background-drop-target"
                  :style="{
                    top: (reportProperties.topMargin || 0) + 'px',
                    left: (reportProperties.leftMargin || 0) + 'px',
                    right: (reportProperties.rightMargin || 0) + 'px',
                    bottom: (reportProperties.bottomMargin || 0) + 'px',
                  }"
                >
                  <span class="background-drop-label">{{
                    getBandDisplayName("background")
                  }}</span>
                </div>

                <!-- Vertical alignment guides, across the whole page (X is shared by all bands) -->
                <template v-if="alignmentLines && alignmentLines.pageIndex === pIndex - 1">
                  <div
                    v-for="line in alignmentLines.x"
                    :key="'guide-x-' + line"
                    class="alignment-line vertical"
                    :style="{
                      left: (isSheetPage(pIndex - 1) ? 0 : marginLeft) + line + 'px',
                      width: 1 / zoomLevel + 'px',
                    }"
                  ></div>
                </template>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useEditorStore } from "@/stores/editor";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import {
  BookImage,
  EllipsisVertical,
  Expand,
  FileText,
  LayoutTemplate,
  MousePointerClick,
  Shrink,
  Plus,
  TableOfContents,
  Trash2,
} from "@lucide/vue";
import { pageKind, specialPageArea } from "@/utils/specialPages";
import { onMounted, onBeforeUnmount, ref, computed } from "vue";
import ElementFactory from "../elements/ElementFactory.vue";
import DragFeedbackLayer from "./DragFeedbackLayer.vue";
import { BAND_CONSTANTS } from "@/constants/constants";
import { getBandDisplayName } from "@/utils/bandUtils";
import { buildGridPath } from "@/utils/rulerUtils";
import type { Band } from "@/types";
import type { DragFeedback } from "@/composables/useDragFeedback";
import type { AlignmentGuideLines } from "@/composables/useSnapAlignment";
import { useI18n } from "vue-i18n";
import { NCheckbox, NSpace } from "naive-ui";
import { isLocationPart } from "@/utils/location/locationElement";

const { t } = useI18n();

// Props
interface Props {
  highlightedBandIndex: number | null;
  isDraggingOrResizing: boolean;
  // The highlighted band can't take the element being dragged (too tall)
  dropTargetBlocked?: boolean;
  // The Page Border tile is being dragged over the page: highlight the Background band
  backgroundDropTarget?: boolean;
  horizontalRulerTicks: any[];
  horizontalRulerLabels: any[];
  verticalRulerTicks: any[];
  verticalRulerLabels: any[];
  uiConstants: any;
  outOfBoundsElements: Array<{
    bandIndex: number;
    elementIndex: number;
    element: any;
  }>;
  dragFeedback?: DragFeedback; // New: drag feedback
}

const props = withDefaults(defineProps<Props>(), {
  highlightedBandIndex: null,
  isDraggingOrResizing: false,
  horizontalRulerTicks: () => [],
  horizontalRulerLabels: () => [],
  verticalRulerTicks: () => [],
  verticalRulerLabels: () => [],
  uiConstants: () => ({}),
  outOfBoundsElements: () => [],
  dragFeedback: () => ({
    previewElement: null,
    previewPosition: null,
    previewSize: null,
    droppableZones: [],
    snapPoints: [],
    snapLines: [],
    isDragging: false,
    draggedElementInfo: null,
  }), // New: default value for drag feedback
});

// Emits
// Report, selection and editor state come from the stores
const editorStore = useEditorStore();
const { zoomLevel, alignmentLines, enableSnapToGrid, enableSnapToAlignment, showGrid, isDesignAreaFocused } = storeToRefs(editorStore);
const reportStore = useReportStore();
const { reportProperties, bands, paperWidth, paperHeight, totalPages: pageTotal, special } =
  storeToRefs(reportStore);
const selectionStore = useSelectionStore();
const { selectedBandIndex, selectedElement, selectedElements, editingElement } = storeToRefs(selectionStore);

const emit = defineEmits([
  "set-design-area-focused",
  "handle-drop",
  "handle-drag-over",
  "handle-drag-leave",
  "select-band",
  "select-element",
  "start-dragging",
  "start-resizing-element",
  "start-editing",
  "finish-editing",
  "cancel-editing",
  "start-resizing-band",
  "zoom-change",
  "check-fields", // Added field-check event
  "contextmenu", // Added context menu event
  "update:enableSnapToGrid", // Added snap-to-grid toggle event
  "update:enableSnapToAlignment", // Added snap-to-alignment toggle event
  "update:showGrid", // Added show/hide grid event
  "reset-zoom", // Added reset zoom event
  "canvas-contextmenu", // Added canvas context menu event
  "add-page",
  "delete-page",
  // Cover / contents page actions: (action, pageIndex)
  "page-action",
  "auto-fit-height",
  "rotate",
]);

// Computed detail band index
const detailBandIndex = computed(() =>
  bands.value.findIndex((b) => b.type === "detail"),
);

const totalPages = computed(() => Math.max(1, pageTotal.value || 1));

// Background band is drawn as an underlay on every page, not in the stacked band flow
const backgroundBandIndex = computed(() =>
  bands.value.findIndex((b) => b.type === "background"),
);
const backgroundElements = computed(
  () => bands.value[backgroundBandIndex.value]?.elements ?? [],
);

// Click targets for background elements: a strip centred on each edge
const EDGE_SIDES = ["top", "right", "bottom", "left"] as const;
const EDGE_HIT_SIZE = 6;
const edgeHitStyle = (
  el: { x: number; y: number; width: number; height: number },
  side: (typeof EDGE_SIDES)[number],
) => {
  const half = EDGE_HIT_SIZE / 2;
  const horizontal = side === "top" || side === "bottom";
  return {
    left: `${(side === "right" ? el.x + el.width : el.x) - half}px`,
    top: `${(side === "bottom" ? el.y + el.height : el.y) - half}px`,
    width: `${horizontal ? el.width + EDGE_HIT_SIZE : EDGE_HIT_SIZE}px`,
    height: `${horizontal ? EDGE_HIT_SIZE : el.height + EDGE_HIT_SIZE}px`,
  };
};

const totalRulerHeight = computed(() => {
  const pages = totalPages.value;
  const pageGap = 32;
  return paperHeight.value * pages + Math.max(0, (pages - 1) * pageGap);
});

// Extra ruler length past the last page, so the rulers can scroll as far as the
// canvas (which also holds the add-page button and its scrollbar)
const RULER_SCROLL_SLACK = 120;

const marginLeft = computed(() => reportProperties.value.leftMargin || 0);
const marginRight = computed(() => reportProperties.value.rightMargin || 0);
const marginTop = computed(() => reportProperties.value.topMargin || 0);
const marginBottom = computed(() => reportProperties.value.bottomMargin || 0);
const printableWidth = computed(() =>
  Math.max(0, paperWidth.value - marginLeft.value - marginRight.value),
);

// Top of page sheet n (1-based) on the vertical ruler
const pageRulerOffset = (pIndex: number) => (pIndex - 1) * (paperHeight.value + 32);

// Ruler numbers are centred on their tick, except at the paper edges where
// centring would cut them in half
const rulerLabelAlign = (position: number, pageLength: number) => {
  const edge = 10 / zoomLevel.value;
  if (position < edge) return "label-start";
  if (position > pageLength - edge) return "label-end";
  return "";
};

const gridPathCache = new Map<string, string>();
const gridPath = (width: number, height: number) => {
  const key = `${width}x${height}@${zoomLevel.value}`;
  let path = gridPathCache.get(key);
  if (path === undefined) {
    if (gridPathCache.size > 200) gridPathCache.clear();
    path = buildGridPath(width, height, 1 / zoomLevel.value);
    gridPathCache.set(key, path);
  }
  return path;
};

// ---- Cover and contents pages (utils/specialPages.ts) ----

const kindOf = (pageIdx: number) => pageKind(reportProperties.value, pageIdx);
const isSpecial = (pageIdx: number) => kindOf(pageIdx) !== "normal";
// A whole-sheet cover: drawn edge to edge, no margins
const isSheetPage = (pageIdx: number) => !!specialPageArea(reportProperties.value, pageIdx)?.sheet;

function pageBadge(pageIdx: number): string {
  const kind = kindOf(pageIdx);
  if (kind === "cover") return t("specialPages.cover");
  if (kind === "contents") {
    const n = pageIdx - (special.value.cover ? 1 : 0) + 1;
    return special.value.contents > 1 ? t("specialPages.contentsN", { n }) : t("specialPages.contents");
  }
  return t("canvas.pageOf", { page: pageIdx + 1, total: totalPages.value });
}

// A page can go while one normal page is left
const canDeletePage = (pageIdx: number) =>
  isSpecial(pageIdx) || totalPages.value - special.value.count > 1;

type PageAction =
  | "addCover"
  | "addContents"
  | "makeCover"
  | "makeContents"
  | "coverToNormal"
  | "contentsToNormal"
  | "chooseDesign"
  | "addToc"
  | "wholeSheet"
  | "keepMargins"
  | "delete";
// Each page's toolbar keeps its size when zoomed in, shrinks with the page
// when zoomed out (to 75% at most), and shows icons only on a narrow page
const pageToolbarScale = computed(() => Math.max(0.75, Math.min(1, zoomLevel.value)) / zoomLevel.value);
const compactPageToolbar = computed(() => paperWidth.value * zoomLevel.value < 620);

function pageMenuItems(pageIdx: number) {
  const kind = kindOf(pageIdx);
  const { cover, contents, count } = special.value;
  const items: { action: PageAction; labelKey: string; icon: unknown; danger?: boolean }[] = [];
  // Adding the pages at the front (also in the header's Page menu)
  if (pageIdx === 0 && !cover) items.push({ action: "addCover", labelKey: "specialPages.addCover", icon: BookImage });
  if (!contents && (kind === "cover" || pageIdx === count)) {
    items.push({ action: "addContents", labelKey: "specialPages.addContents", icon: TableOfContents });
  }
  if (kind === "normal") {
    if (pageIdx === 0 && !cover && !contents) {
      items.push({ action: "makeCover", labelKey: "specialPages.makeCover", icon: BookImage });
    }
    if (pageIdx === count) {
      items.push({ action: "makeContents", labelKey: "specialPages.makeContents", icon: TableOfContents });
    }
  } else if (kind === "cover") {
    items.push(
      special.value.fullPageCover
        ? { action: "keepMargins", labelKey: "specialPages.keepMargins", icon: Shrink }
        : { action: "wholeSheet", labelKey: "specialPages.wholeSheet", icon: Expand },
    );
    if (!contents) items.push({ action: "coverToNormal", labelKey: "specialPages.toNormal", icon: FileText });
    items.push({ action: "delete", labelKey: "specialPages.deleteCover", icon: Trash2, danger: true });
  } else {
    if (pageIdx === count - 1) items.push({ action: "contentsToNormal", labelKey: "specialPages.toNormal", icon: FileText });
    items.push({ action: "delete", labelKey: "specialPages.deleteContents", icon: Trash2, danger: true });
  }
  return items;
}

const openPageMenu = ref<number | null>(null);
const closePageMenu = () => {
  openPageMenu.value = null;
  document.removeEventListener("mousedown", closePageMenu);
};
function togglePageMenu(pageIdx: number) {
  if (openPageMenu.value === pageIdx) {
    closePageMenu();
    return;
  }
  openPageMenu.value = pageIdx;
  document.addEventListener("mousedown", closePageMenu);
}
function runPageAction(action: PageAction, pageIdx: number) {
  closePageMenu();
  if (action === "delete") emit("delete-page", pageIdx);
  else emit("page-action", action, pageIdx);
}
onBeforeUnmount(closePageMenu);

// Determine if a band is visible on the given page
function isBandVisibleOnPage(
  band: Band,
  pIndex: number,
  _total: number,
): boolean {
  // Background is an underlay layer, excluded from stacked vertical flow
  if (band.type === "background") return false;
  // A cover or contents page has only its own area: no shared sections
  if (isSpecial(pIndex - 1)) return band.type === "detail";

  // Non-detail bands with <= 0 height and no elements are hidden
  if (
    band.type !== "detail" &&
    band.height <= 0 &&
    (!band.elements || band.elements.length === 0)
  ) {
    return false;
  }

  return true;
}

// Generate contextual display label for each band
function getBandDisplayLabel(bandType: string, pIndex: number): string {
  const name = getBandDisplayName(bandType);
  if (bandType === "detail") {
    if (isSpecial(pIndex - 1)) return pageBadge(pIndex - 1);
    return `${name} (Page ${pIndex})`;
  }

  return name;
}

// The selected element's outline and handles drawn on top (see the template):
// a selected element keeps its place in the stacking order. Not for one being
// typed in (it is raised), nor when several are selected
const HANDLE_DIRS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
const topHandles = computed(() => {
  const sel = selectedElement.value;
  if (!sel || (selectedElements.value?.length ?? 0) > 1) return null;
  const band = bands.value[sel.bandIndex];
  if (!band || band.type === "background") return null;
  const box = sel.parentFrameIndex !== undefined ? (band.elements[sel.parentFrameIndex] as any) : null;
  const el = box ? box.elements?.[sel.elementIndex] : band.elements[sel.elementIndex];
  // A Location's map or address has no handles of its own (its layout places it)
  if (!el || isLocationPart(el)) return null;
  const editing = editingElement.value;
  if (
    editing &&
    editing.bandIndex === sel.bandIndex &&
    editing.elementIndex === sel.elementIndex &&
    editing.parentFrameIndex === sel.parentFrameIndex
  )
    return null;
  return {
    bandIndex: sel.bandIndex,
    elementIndex: sel.elementIndex,
    parentFrameIndex: sel.parentFrameIndex,
    pageIndex: (box ?? el).pageIndex ?? 0,
    x: (box?.x ?? 0) + el.x,
    y: (box?.y ?? 0) + el.y,
    width: el.width,
    height: el.height,
  };
});

// The first contents page with nothing of a Table of Contents on any contents
// page (one Table of Contents carries on over them by itself)
const contentsPageWithoutToc = (pageIdx: number) =>
  kindOf(pageIdx) === "contents" &&
  pageIdx === (special.value.cover ? 1 : 0) &&
  !(bands.value[detailBandIndex.value]?.elements ?? []).some(
    (el) => el.type === "contentsList" && kindOf(el.pageIndex ?? 0) === "contents",
  );

const getDetailElementsForPage = (pageIdx: number) => {
  if (detailBandIndex.value === -1) return [];
  const detailBand = bands.value[detailBandIndex.value];
  if (!detailBand || !detailBand.elements) return [];
  const result: Array<{ element: any; originalIndex: number }> = [];
  detailBand.elements.forEach((el, index) => {
    const elPage = el.pageIndex ?? 0;
    if (elPage === pageIdx) {
      result.push({ element: el, originalIndex: index });
    }
  });
  return result;
};

// Calculate remaining height for detail band dynamically based on all visible non-detail bands on page
const getPageDetailHeight = (pageIdx: number) => {
  if (detailBandIndex.value === -1) return 100;
  const detailBand = bands.value[detailBandIndex.value];
  if (!detailBand) return 100;

  const pIndex = pageIdx + 1;
  // A cover or contents page: the whole printable page (or sheet)
  const area = specialPageArea(reportProperties.value, pageIdx);
  if (area) return Math.max(20, area.height);
  const topMargin = reportProperties.value?.topMargin || 0;
  const bottomMargin = reportProperties.value?.bottomMargin || 0;
  const availableHeight = paperHeight.value - topMargin - bottomMargin;

  let otherBandsHeight = 0;
  bands.value.forEach((b) => {
    if (
      b.type !== "detail" &&
      isBandVisibleOnPage(b, pIndex, totalPages.value)
    ) {
      otherBandsHeight += b.height || 0;
    }
  });

  return Math.max(20, availableHeight - otherBandsHeight);
};

interface PageBandInfo {
  band: Band;
  bandIndex: number;
  isDetail: boolean;
  effectiveHeight: number;
  displayLabel: string;
  showResizeHandle: boolean;
}

// Get the dynamic list of bands for a given page
const getBandsForPage = (pIndex: number): PageBandInfo[] => {
  const result: PageBandInfo[] = [];
  bands.value.forEach((band, bandIndex) => {
    if (!isBandVisibleOnPage(band, pIndex, totalPages.value)) {
      return;
    }
    const isDetail = band.type === "detail";
    result.push({
      band,
      bandIndex,
      isDetail,
      effectiveHeight: isDetail
        ? getPageDetailHeight(pIndex - 1)
        : band.height || 0,
      displayLabel: getBandDisplayLabel(band.type, pIndex),
      showResizeHandle: !isDetail,
    });
  });
  return result;
};


const designerCanvasRef = ref<HTMLElement | null>(null);
const horizontalRulerRef = ref<HTMLElement | null>(null);
const verticalRulerRef = ref<HTMLElement | null>(null);
const paperContainerRef = ref<HTMLElement | null>(null);

// Methods
const setDesignAreaFocused = () => {
  emit("set-design-area-focused");
};

const handleDrop = (event: DragEvent, pageIndex: number = 0) => {
  emit("handle-drop", event, pageIndex);
};

const handleDragOver = (event: DragEvent) => {
  emit("handle-drag-over", event);
};

const handleDragLeave = (event: DragEvent) => {
  emit("handle-drag-leave", event);
};

const selectBand = (bandIndex: number) => {
  emit("select-band", bandIndex);
};

const selectElement = (
  bandIndex: number,
  elementIndex: number,
  isMultiSelect = false,
  parentFrameIndex?: number,
) => {
  emit(
    "select-element",
    bandIndex,
    elementIndex,
    isMultiSelect,
    parentFrameIndex,
  );
};

const startDragging = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  emit("start-dragging", event, bandIndex, elementIndex, parentFrameIndex);
};

const startResizingElement = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
  direction?: string,
) => {
  emit(
    "start-resizing-element",
    event,
    bandIndex,
    elementIndex,
    direction || "se",
    parentFrameIndex,
  );
};

const handleAutoFitHeight = (
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  emit("auto-fit-height", bandIndex, elementIndex, parentFrameIndex);
};

const startEditing = (
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  emit("start-editing", bandIndex, elementIndex, parentFrameIndex);
};

const finishEditing = () => {
  // Since ElementFactory's finishEditing event doesn't pass parameters, we need to get the info from editingElement
  if (editingElement.value) {
    emit("finish-editing");
  }
};

const cancelEditing = () => {
  // Since ElementFactory's cancelEditing event doesn't pass parameters, we need to get the info from editingElement
  if (editingElement.value) {
    emit("cancel-editing");
  }
};

const checkFields = (fields: string[]) => {
  emit("check-fields", fields);
};

// Handle element context menu
const handleElementContextMenu = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
) => {
  emit("contextmenu", event, bandIndex, elementIndex, parentFrameIndex);
};

// Handle canvas context menu
const handleCanvasContextMenu = (event: MouseEvent) => {
  emit("canvas-contextmenu", event);
};

const startResizingBand = (event: MouseEvent, bandIndex: number) => {
  emit("start-resizing-band", event, bandIndex);
};

// Check whether the element is out of bounds. Not for the element being moved
// or resized: while it moves, the orange band shows where it will land, and the
// check runs again once it is dropped.
const isElementOutOfBounds = (bandIndex: number, elementIndex: number) => {
  if (
    props.isDraggingOrResizing &&
    selectedElement.value?.bandIndex === bandIndex &&
    selectedElement.value?.elementIndex === elementIndex &&
    selectedElement.value?.parentFrameIndex === undefined
  ) {
    return false;
  }
  return props.outOfBoundsElements.some(
    (item) =>
      item.bandIndex === bandIndex && item.elementIndex === elementIndex,
  );
};

// Keyboard event handling
const handleKeyDown = (event: KeyboardEvent) => {
  // CTRL+0 resets zoom
  if (event.ctrlKey && event.key === "0") {
    event.preventDefault();
    emit("reset-zoom");
  }
};

// Scroll event handling
const handleWheel = (event: WheelEvent) => {
  // If the Ctrl or Meta key is held, zoom
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY < 0 ? 1 : -1;
    emit("zoom-change", delta);
  }
};

// Library tiles clicked next add their element to this page
const notePageClicked = (event: MouseEvent) => {
  const sheetPage = (event.currentTarget as HTMLElement | null)?.dataset?.pageIndex;
  if (sheetPage !== undefined) selectionStore.lastClickedPageIndex = parseInt(sheetPage, 10);
};

// Lifecycle hooks
onMounted(() => {
  // Add mouse wheel event listener
  const designerCanvas = designerCanvasRef.value || document.querySelector(".designer-canvas");
  if (designerCanvas) {
    designerCanvas.addEventListener("wheel", handleWheel as EventListener, {
      passive: false,
    });
    (window as any).designerCanvasWheelListener = handleWheel;

    // Add keyboard event listener
    document.addEventListener("keydown", handleKeyDown as EventListener);
    (window as any).designerCanvasKeyDownListener = handleKeyDown;
  }

  // Add scroll event listener
  if (paperContainerRef.value) {
    const handleScroll = () => {
      if (
        horizontalRulerRef.value &&
        verticalRulerRef.value &&
        paperContainerRef.value
      ) {
        horizontalRulerRef.value.scrollLeft =
          paperContainerRef.value.scrollLeft;
        verticalRulerRef.value.scrollTop = paperContainerRef.value.scrollTop;
      }
    };

    paperContainerRef.value.addEventListener("scroll", handleScroll);
    (window as any).paperContainerScrollListener = handleScroll;
  }
});

onBeforeUnmount(() => {
  // Remove scroll event listener
  const scrollListener = (window as any).paperContainerScrollListener;
  if (scrollListener && paperContainerRef.value) {
    paperContainerRef.value.removeEventListener("scroll", scrollListener);
  }

  // Remove mouse wheel event listener
  const wheelListener = (window as any).designerCanvasWheelListener;
  const designerCanvas = designerCanvasRef.value || document.querySelector(".designer-canvas");
  if (wheelListener && designerCanvas) {
    designerCanvas.removeEventListener("wheel", wheelListener as EventListener);
  }

  // Remove keyboard event listener
  const keyDownListener = (window as any).designerCanvasKeyDownListener;
  if (keyDownListener) {
    document.removeEventListener("keydown", keyDownListener as EventListener);
  }

  // Clean up global references
  delete (window as any).paperContainerScrollListener;
  delete (window as any).designerCanvasWheelListener;
  delete (window as any).designerCanvasKeyDownListener;
});
</script>

<style scoped>
/* The desk the pages lie on: the home page's soft lavender grey */
.designer-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f1f0f7;
  position: relative;
  min-height: 0;
}

.top-ruler-container {
  display: flex;
  height: 30px;
  background-color: #f7f6fb;
  border-bottom: 1px solid rgba(28, 27, 38, 0.08);
  position: sticky;
  top: 0;
  z-index: 10;
}

.corner-space {
  width: 30px;
  height: 30px;
  background-color: #f1f0f6;
  border-right: 1px solid rgba(28, 27, 38, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.unit-label {
  font-size: 9.5px;
  font-weight: 600;
  color: #8a84a3;
}

.horizontal-ruler {
  position: relative;
  flex: 1;
  width: 0;
  height: 30px;
  background-color: #f7f6fb;
  border-bottom: 1px solid rgba(28, 27, 38, 0.08);
  overflow-x: auto;
  overflow-y: hidden;
  /* Hide scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  flex-shrink: 0;
}

.horizontal-ruler::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.ruler-content {
  position: relative;
  width: 100%;
  height: 100%;
}

.main-content {
  display: flex;
  flex: 1;
  min-height: 0;
}

.vertical-ruler-container {
  width: 30px;
  background-color: #f7f6fb;
  border-right: 1px solid rgba(28, 27, 38, 0.08);
  position: sticky;
  left: 0;
  z-index: 5;
}

.vertical-ruler {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #f7f6fb;
  overflow-x: hidden;
  overflow-y: auto;
  /* Hide scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  flex-shrink: 0;
}

.vertical-ruler::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.paper-container {
  flex: 1;
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  overflow: auto;
  min-width: 0;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #cfd5e1 transparent;
}

.paper-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.paper-container::-webkit-scrollbar-track {
  background: transparent;
}

.paper-container::-webkit-scrollbar-thumb {
  background: #cfd5e1;
  border-radius: 4px;
}

.paper-container::-webkit-scrollbar-thumb:hover {
  background: #b0b8c9;
}

.paper-container::-webkit-scrollbar-corner {
  background: transparent;
}

.pages-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0 0 60px 0;
  min-width: 100%;
}

.page-sheet-wrapper {
  flex-shrink: 0;
  box-sizing: border-box;
}

.paper {
  background-color: white;
  box-shadow:
    0 4px 20px rgba(23, 20, 44, 0.08),
    0 1px 3px rgba(23, 20, 44, 0.05);
  position: relative;
  transition: box-shadow 0.2s ease;
  flex-shrink: 0;
  border-radius: 3px;
  box-sizing: border-box;
  overflow: hidden;
}

.paper.focused {
  box-shadow:
    0 8px 26px rgba(23, 20, 44, 0.14),
    0 2px 6px rgba(23, 20, 44, 0.08);
}

/* Page tools: a small pill above the page's top-right corner, the same size
   at any zoom (the sheet is scaled, so it is scaled back) */
.page-sheet-header {
  position: absolute;
  top: 6px;
  right: 8px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(23, 20, 44, 0.06);
  transform-origin: top right;
  user-select: none;
  backdrop-filter: blur(4px);
}





.page-sheet-badge.is-special {
  color: #6366f1;
}

.page-sheet.is-cover-page,
.page-sheet.is-contents-page {
  box-shadow: 0 0 0 2px rgba(124, 92, 247, 0.22), 0 4px 16px rgba(23, 20, 44, 0.1);
}

.page-menu-wrap {
  position: relative;
}

.page-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #6f6a7e;
  cursor: pointer;
}

.page-menu-btn:hover,
.page-menu-btn.is-open {
  background: rgba(124, 92, 247, 0.08);
  color: #1c1b26;
}

.page-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  min-width: 210px;
  padding: 6px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 10px;
  background: #ffffff;
  box-shadow:
    0 16px 36px rgba(23, 20, 44, 0.14),
    0 2px 6px rgba(23, 20, 44, 0.06);
}

.page-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #45425a;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.page-menu-item:hover {
  background: rgba(124, 92, 247, 0.08);
  color: #1c1b26;
}

.page-menu-item.is-danger {
  color: #dc2626;
}

.page-menu-item.is-danger:hover {
  background: #fef2f2;
}

/* Narrow page on screen: icons only (the names are in the tooltips) */
.page-sheet-header.is-compact .btn-label {
  display: none;
}

.page-sheet-header.is-compact .add-page-after-btn,
.page-sheet-header.is-compact .delete-page-btn {
  padding: 0 7px;
}

.page-sheet-badge {
  padding: 0 10px 0 8px;
  font-size: 11px;
  font-weight: 600;
  color: #6f6a7e;
  letter-spacing: 0.02em;
  white-space: nowrap;
  border-right: 1px solid rgba(28, 27, 38, 0.08);
  margin-right: 2px;
}

.add-page-after-btn,
.delete-page-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  background: transparent;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.add-page-after-btn {
  color: #6366f1;
}

.add-page-after-btn:hover {
  background: rgba(124, 92, 247, 0.08);
  color: #5b3ee0;
}

.delete-page-btn {
  color: #6f6a7e;
}

.delete-page-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

.add-page-after-btn:focus-visible,
.delete-page-btn:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 1px;
}

.pager {
  position: relative;
  box-sizing: border-box;
}

.band-grid {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  pointer-events: none;
  shape-rendering: crispEdges;
}

.band-grid path {
  fill: none;
  stroke: #ececec;
}

/* Sits above the bands; multiply keeps white areas white and lets the content
   underneath show through fills, like ink printed on the page */
.background-band-layer {
  position: absolute;
  pointer-events: none;
  mix-blend-mode: multiply;
}

/* Nothing inside is clickable, including widgets that opt back in with pointer-events: auto */
.background-band-layer :deep(*) {
  pointer-events: none !important;
}

/* Page borders are sized from the page, not by dragging: no resize/rotate handles */
.background-band-layer :deep(.resize-handle),
.background-band-layer :deep(.element-rotate-widget) {
  display: none;
}

/* Edge strips are the one clickable part of the layer */
.background-band-layer .background-edge-hit {
  position: absolute;
  pointer-events: auto !important;
  cursor: pointer;
}

.background-band-layer .background-edge-hit:hover {
  background-color: rgba(100, 64, 244, 0.35);
}

/* The outline is an inset shadow, not a border: a border would push the band's
   contents 1px in, away from the margin where X/Y, the ruler and the grid start */
.band {
  box-shadow: inset 0 0 0 1px #ddd;
  box-sizing: border-box;
  margin-bottom: 0;
  position: relative;
  background-color: rgba(255, 255, 255, 0.8);
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

/* .band:hover {
  background-color: rgba(240, 240, 255, 0.8);
} */

/* While dragging: the band the element will land in (calm blue), or red when
   it is too tall for that band and the drop would be refused */
.band.drop-target {
  box-shadow: inset 0 0 0 1.5px #6440f4;
  background-color: rgba(100, 64, 244, 0.05);
}

.band.drop-target.drop-blocked {
  box-shadow: inset 0 0 0 1.5px #dc2626;
  background-color: rgba(220, 38, 38, 0.06);
}

/* Drop target for the Page Border tile: the whole printable area (Background band) */
.background-drop-target {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  box-shadow: inset 0 0 0 1.5px #6440f4;
  background-color: rgba(100, 64, 244, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.background-drop-label {
  font-size: 40px;
  font-weight: bold;
  color: rgba(100, 64, 244, 0.25);
  user-select: none;
  white-space: nowrap;
}

.band-background-label-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.band-background-label {
  font-size: 40px;
  font-weight: bold;
  color: rgba(0, 0, 0, 0.05);
  user-select: none;
  white-space: nowrap;
}

.band-content {
  position: relative;
  min-height: 0;
}

.band-resize-handle {
  position: absolute;
  bottom: -5px;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
  background-color: rgba(124, 92, 247, 0.35);
  opacity: 0;
  transition:
    opacity 0.2s ease,
    background-color 0.2s ease;
  z-index: 2;
}

.band:hover .band-resize-handle,
.band-resize-handle:hover {
  opacity: 1;
  background-color: rgba(124, 92, 247, 0.9);
  z-index: 4;
}

/* Bottom bands: handle is located at the TOP edge so dragging up expands the band */
.columnFooter-band .band-resize-handle,
.column-footer-band .band-resize-handle,
.pageFooter-band .band-resize-handle,
.page-footer-band .band-resize-handle {
  top: -5px;
  bottom: auto;
}

/* When hovering Detail, highlight the dragger between Detail and the following footer band */
.detail-band:hover + .columnFooter-band .band-resize-handle,
.detail-band:hover + .column-footer-band .band-resize-handle,
.detail-band:hover + .pageFooter-band .band-resize-handle,
.detail-band:hover + .page-footer-band .band-resize-handle {
  opacity: 0.7;
  background-color: rgba(124, 92, 247, 0.55);
}

/* When hovering Column Footer, also highlight the dragger between Column Footer and Page Footer */
.columnFooter-band:hover + .pageFooter-band .band-resize-handle,
.column-footer-band:hover + .page-footer-band .band-resize-handle {
  opacity: 0.7;
  background-color: rgba(124, 92, 247, 0.55);
}

/* Snap guides: one screen pixel wide at any zoom (set inline), above the content */
.alignment-line {
  position: absolute;
  background-color: #f0047f;
  pointer-events: none;
  z-index: 100;
}

.alignment-line.vertical {
  top: 0;
  bottom: 0;
}

.canvas-empty-state {
  display: flex;
  /* Near the top of the page, not lost in the middle */
  align-items: flex-start;
  justify-content: center;
  padding-top: 48px;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-height: 60px;
  pointer-events: none;
}

.empty-state-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  max-width: 300px;
  padding: 16px 20px;
  border: 1px dashed #d9d4ec;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 12.5px;
  line-height: 1.45;
  color: #8a84a3;
  text-align: center;
  pointer-events: none;
}

.empty-state-title {
  color: #45425a;
  font-size: 13.5px;
  font-weight: 700;
}

.empty-state-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #f1edff;
  color: #6440f4;
}

.tick {
  position: absolute;
  background-color: #b5b0c7;
}

.horizontal-ruler .tick {
  bottom: 0;
  width: 1px;
}

.horizontal-ruler .tick.major {
  height: 6px;
  background-color: #9e97b5;
}

.horizontal-ruler .tick.minor {
  height: 3px;
  background-color: #c9c5d8;
}

.vertical-ruler .tick {
  right: 0;
  height: 1px;
}

.vertical-ruler .tick.major {
  width: 5px;
  background-color: #9e97b5;
}

.vertical-ruler .tick.minor {
  width: 3px;
  background-color: #c9c5d8;
}

.label {
  position: absolute;
  font-size: 9.5px;
  font-weight: 500;
  color: #78728c;
  line-height: 1;
  user-select: none;
}

.horizontal-ruler .label {
  top: 4px;
  transform: translateX(-50%);
}

.vertical-ruler .label {
  right: 8px;
  text-align: right;
  transform: translateY(-50%);
}

.horizontal-ruler .label.label-start {
  transform: translateX(2px);
}

.horizontal-ruler .label.label-end {
  transform: translateX(calc(-100% - 2px));
}

.vertical-ruler .label.label-start {
  transform: translateY(2px);
}

.vertical-ruler .label.label-end {
  transform: translateY(calc(-100% - 2px));
}

/* Page margins on the rulers: outside the area X/Y count from */
.ruler-margin {
  position: absolute;
  background-color: rgba(28, 27, 38, 0.055);
}

.horizontal-ruler .ruler-margin {
  top: 0;
  height: 100%;
}

.vertical-ruler .ruler-margin {
  left: 0;
  width: 100%;
}

/* Right-side control panel container */
.right-side-controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: white;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Snap control styles */
.snap-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Zoom control component style reset */
:deep(.zoom-controls) {
  position: static !important;
  box-shadow: none !important;
  background-color: transparent !important;
  border: none !important;
  padding: 0 !important;
  gap: 4px !important;
}

.no-toc-prompt {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.no-toc-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border: 1px dashed rgba(100, 64, 244, 0.45);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 16px rgba(23, 20, 44, 0.08);
  color: #6440f4;
  pointer-events: auto;
}

.no-toc-title {
  font-size: 13px;
  font-weight: 600;
  color: #1c1b26;
}

.no-toc-actions {
  display: flex;
  gap: 8px;
}

.no-toc-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  font-weight: 500;
  color: #1c1b26;
  cursor: pointer;
}

.no-toc-btn:hover {
  border-color: #6440f4;
}

.no-toc-btn.is-primary {
  border-color: #6440f4;
  background: #6440f4;
  color: #fff;
}

.top-handles {
  position: absolute;
  z-index: 70;
  pointer-events: none;
  outline: 2px solid #6440f4;
  outline-offset: -1px;
}

.top-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  border: 1px solid #ffffff;
  border-radius: 1px;
  background: #6440f4;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
  pointer-events: auto;
}

.top-handle.is-nw { top: -4px; left: -4px; cursor: nw-resize; }
.top-handle.is-ne { top: -4px; right: -4px; cursor: ne-resize; }
.top-handle.is-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
.top-handle.is-se { bottom: -4px; right: -4px; cursor: se-resize; }
.top-handle.is-n { top: -3px; left: 50%; width: 14px; height: 6px; transform: translateX(-50%); cursor: n-resize; }
.top-handle.is-s { bottom: -3px; left: 50%; width: 14px; height: 6px; transform: translateX(-50%); cursor: s-resize; }
.top-handle.is-w { left: -3px; top: 50%; width: 6px; height: 14px; transform: translateY(-50%); cursor: w-resize; }
.top-handle.is-e { right: -3px; top: 50%; width: 6px; height: 14px; transform: translateY(-50%); cursor: e-resize; }
</style>
