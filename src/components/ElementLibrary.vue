<template>
  <div class="element-library">
    <!-- Basic element library -->
    <div class="element-list-container">
      <div class="library-header">
        <h3>{{ t("elementLibrary.title") }}</h3>
        <!-- e.g. the panel's collapse button -->
        <slot name="header-actions"></slot>
      </div>
      <div
        v-for="(categoryElements, categoryKey) in groupedElements"
        :key="categoryKey"
        v-show="categoryElements.length > 0"
        class="element-category"
      >
        <div class="category-header" @click="toggleCategory(categoryKey)">
          <component
            :is="expandedCategories[categoryKey] ? ChevronDown : ChevronRight"
            class="category-arrow"
            :size="12"
          />
          <span>{{ categoryLabels[categoryKey] || categoryKey }}</span>
        </div>
        <div v-if="expandedCategories[categoryKey]" class="element-list">
          <div
            v-for="element in categoryElements"
            :key="element.type"
            class="element-item"
            :class="{
              'is-disabled': isUnavailable(element.type),
              'is-open': tileMenu?.type === element.type,
            }"
            :title="tileHint(element.type)"
            :draggable="!isUnavailable(element.type)"
            :aria-haspopup="hasTileMenu(element.type) ? 'dialog' : undefined"
            @dragstart="handleDragStart($event, element)"
            @click="handleTileClick($event, element)"
            @dblclick="handleElementDoubleClick($event, element)"
          >
            <span class="element-icon">
              <component
                :is="getElementIconComponent(element.type)"
                v-if="getElementIconComponent(element.type)"
              />
              <template v-else>{{ getElementIcon(element.type) }}</template>
            </span>
            <span class="element-name">{{ t(element.name) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Data: the report's projects, their details and tables -->
    <div class="data-fields-section">
      <ReportDataPanel
        :bands="bands as Band[]"
        :projects="projects ?? []"
        @update-projects="emit('update-projects', $event)"
      />
    </div>

    <!-- Page Number tile: where on the page to put it; Chart tile: which chart -->
    <Teleport to="body">
      <div
        v-if="tileMenu"
        ref="tileMenuRef"
        class="tile-menu"
        :class="{ 'is-chart': tileMenu.type === 'chart' }"
        role="dialog"
        :aria-label="tileMenu.type === 'chart' ? t('chart.chooseType') : t('pagination.choosePosition')"
        :style="{ left: tileMenu.x + 'px', top: tileMenu.y + 'px' }"
      >
        <template v-if="tileMenu.type === PAGE_NUMBER_TYPE">
          <div class="tile-menu-title">{{ t("pagination.choosePosition") }}</div>
          <div class="page-number-menu-options">
            <button
              v-for="position in PAGINATION_POSITIONS"
              :key="position.id"
              type="button"
              class="page-number-option"
              @click="choosePageNumberPosition(position.id)"
            >
              <span class="page-thumb" aria-hidden="true">
                <span class="page-thumb-lines" />
                <span
                  class="page-thumb-number"
                  :class="[
                    position.edge === 'top' ? 'is-top' : 'is-bottom',
                    position.align === 'Center' ? 'is-center' : 'is-right',
                  ]"
                />
              </span>
              <span>{{ t(`pagination.positions.${position.id}`) }}</span>
            </button>
          </div>
          <div class="tile-menu-hint">{{ t("pagination.dragHint") }}</div>
        </template>
        <template v-else>
          <div class="tile-menu-title">{{ t("chart.chooseType") }}</div>
          <div v-for="group in CHART_GROUPS" :key="group" class="chart-menu-group">
            <div class="chart-menu-group-title">{{ t(`chart.groups.${group}`) }}</div>
            <div class="chart-menu-options">
              <button
                v-for="chart in chartTypesInGroup(group)"
                :key="chart.type"
                type="button"
                class="chart-option"
                @click="chooseChartType(chart.type)"
              >
                <component :is="CHART_TYPE_ICONS[chart.type]" :size="16" :stroke-width="1.75" aria-hidden="true" />
                <span>{{ t(`chart.types.${chart.type}`) }}</span>
              </button>
            </div>
          </div>
          <div class="tile-menu-hint">{{ t("chart.dragHint") }}</div>
        </template>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import {
  ChevronDown,
  ChevronRight,
} from "@lucide/vue";
import ReportDataPanel from "./designer/ReportDataPanel.vue";
import { ElementRegistry } from "./elements/ElementRegistry";
import { findPageBorder, isFrameTemplateType, PAGE_BORDER_TYPE } from "../utils/framePresets";
import {
  PAGE_NUMBER_TYPE,
  PAGINATION_POSITIONS,
  type PaginationPosition,
} from "../utils/paginationPresets";
import type {
  Band,
  DesignElement,
  ReportField,
  ReportParameter,
  ReportVariable,
} from "../types";
import type { ChartType, ReportProject } from "../types/dataSource";
import { CHART_GROUPS, chartTypesInGroup } from "../utils/chart/chartTypes";
import { CHART_TYPE_ICONS } from "./elements/chartIcons";
import { getElementIcon, getElementIconComponent } from "../utils/elementUtils";

const { t } = useI18n();


// Define component props
interface Props {
  elements: Array<{ type: string; name: string }>;
  reportFields?: ReportField[];
  reportParameters?: ReportParameter[];
  reportVariables?: ReportVariable[];
  bands: Array<{ type: string; name?: string; elements: DesignElement[] }>;
  // Projects chosen for the report
  projects?: ReportProject[];
}

// Define component events
interface Emits {
  (e: "drag-start", event: DragEvent, element: any): void;
  (e: "element-double-click", element: any): void;
  (e: "insert-page-number", position: PaginationPosition): void;
  (e: "insert-chart", chartType: ChartType): void;
  (e: "update-projects", projects: ReportProject[]): void;
}

// Use default values
const props = withDefaults(defineProps<Props>(), {
  elements: () => [],
  reportFields: () => [],
  reportParameters: () => [],
  reportVariables: () => [],
  bands: () => [],
});

const emit = defineEmits<Emits>();

// Element group expanded state
const expandedCategories = ref<Record<string, boolean>>({
  basic: true,
  frames: true,
  composite: true,
});
const toggleCategory = (key: string) => {
  expandedCategories.value[key] = !expandedCategories.value[key];
};

const categoryLabels = computed<Record<string, string>>(() => ({
  basic: t("elementLibrary.basicElements"),
  frames: t("elementLibrary.frameElements"),
  composite: t("elementLibrary.compositeElements"),
}));

const groupedElements = computed(() => {
  const registry = ElementRegistry.getInstance();
  const categories: Record<string, any[]> = { basic: [], composite: [], frames: [] };
  for (const element of props.elements) {
    const config = registry.getElementConfig(element.type);
    const category = config?.category || "basic";
    if (!categories[category]) categories[category] = [];
    categories[category].push(element);
  }
  return categories;
});

// List of allowed field types
const allowedFieldTypes = computed(() => [
  { label: t("fieldManagement.fieldTypes.string"), value: "java.lang.String" },
  {
    label: t("fieldManagement.fieldTypes.integer"),
    value: "java.lang.Integer",
  },
  { label: t("fieldManagement.fieldTypes.long"), value: "java.lang.Long" },
  { label: t("fieldManagement.fieldTypes.float"), value: "java.lang.Float" },
  { label: t("fieldManagement.fieldTypes.double"), value: "java.lang.Double" },
  {
    label: t("fieldManagement.fieldTypes.boolean"),
    value: "java.lang.Boolean",
  },
  { label: t("fieldManagement.fieldTypes.date"), value: "java.util.Date" },
  {
    label: t("fieldManagement.fieldTypes.timestamp"),
    value: "java.sql.Timestamp",
  },
  { label: t("fieldManagement.fieldTypes.byteArray"), value: "byte[]" },
]);

// Get the localized field type name
function getFieldTypeName(className: string): string {
  const fieldType = allowedFieldTypes.value.find((type) => type.value === className);
  return fieldType ? fieldType.label : className;
}

// Handle drag start
// Only one page border per report; the tile stays clickable so the designer can
// explain why and select the existing border
const hasPageBorder = computed(() => findPageBorder(props.bands) !== null);
const isUnavailable = (type: string) => type === PAGE_BORDER_TYPE && hasPageBorder.value;

// Hover text: why a tile is disabled, or what a ready-made box is for
const tileHint = (type: string): string | undefined => {
  if (isUnavailable(type)) return t("framePresets.pageBorderExists");
  if (isFrameTemplateType(type)) return t(`framePresets.templateDescription.${type}`);
  if (type === PAGE_NUMBER_TYPE) return t("pagination.tileHint");
  if (type === "chart") return t("chart.tileHint");
  return undefined;
};

function handleDragStart(event: DragEvent, element: any): void {
  closeTileMenu();
  if (isUnavailable(element.type)) {
    event.preventDefault();
    emit("element-double-click", element);
    return;
  }
  emit("drag-start", event, element);
}

// The Page Number and Chart tiles ask a question first (where / which chart)
// when clicked; dragging them drops a default one
type TileMenuType = typeof PAGE_NUMBER_TYPE | "chart";
const hasTileMenu = (type: string): type is TileMenuType =>
  type === PAGE_NUMBER_TYPE || type === "chart";

// Handle element double-click (tiles with a question open it instead)
function handleElementDoubleClick(event: MouseEvent, element: any): void {
  if (hasTileMenu(element.type)) {
    openTileMenu(element.type, event.currentTarget as HTMLElement);
    return;
  }
  emit("element-double-click", element);
}

function handleTileClick(event: MouseEvent, element: any): void {
  if (hasTileMenu(element.type)) openTileMenu(element.type, event.currentTarget as HTMLElement);
}

// The question popover: beside the tile, kept inside the window
const tileMenu = ref<{ type: TileMenuType; x: number; y: number } | null>(null);
const tileMenuRef = ref<HTMLElement | null>(null);
let menuTile: HTMLElement | null = null;
const MENU_GAP = 8;
const WINDOW_MARGIN = 8;

function openTileMenu(type: TileMenuType, tile: HTMLElement): void {
  if (tileMenu.value && menuTile === tile) return;
  closeTileMenu();
  menuTile = tile;
  const rect = tile.getBoundingClientRect();
  tileMenu.value = { type, x: rect.right + MENU_GAP, y: rect.top };
  document.addEventListener("mousedown", handleOutsideMenuPress, true);
  document.addEventListener("keydown", handleMenuKeydown, true);
  window.addEventListener("resize", closeTileMenu);
  window.addEventListener("scroll", closeTileMenu, true);
  nextTick(() => {
    const menu = tileMenuRef.value;
    if (!menu || !tileMenu.value) return;
    const { width, height } = menu.getBoundingClientRect();
    let { x, y } = tileMenu.value;
    // No room on the right: open below the tile instead
    if (x + width > window.innerWidth - WINDOW_MARGIN) {
      x = rect.left;
      y = rect.bottom + MENU_GAP;
    }
    x = Math.max(WINDOW_MARGIN, Math.min(x, window.innerWidth - width - WINDOW_MARGIN));
    y = Math.max(WINDOW_MARGIN, Math.min(y, window.innerHeight - height - WINDOW_MARGIN));
    tileMenu.value = { type, x, y };
    menu.querySelector<HTMLButtonElement>("button")?.focus();
  });
}

function closeTileMenu(): void {
  if (!tileMenu.value) return;
  tileMenu.value = null;
  document.removeEventListener("mousedown", handleOutsideMenuPress, true);
  document.removeEventListener("keydown", handleMenuKeydown, true);
  window.removeEventListener("resize", closeTileMenu);
  window.removeEventListener("scroll", closeTileMenu, true);
  menuTile?.focus?.();
  menuTile = null;
}

function handleOutsideMenuPress(event: MouseEvent): void {
  const target = event.target as Node;
  if (tileMenuRef.value?.contains(target) || menuTile?.contains(target)) return;
  closeTileMenu();
}

function handleMenuKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.stopPropagation();
    closeTileMenu();
  }
}

function choosePageNumberPosition(position: PaginationPosition): void {
  closeTileMenu();
  emit("insert-page-number", position);
}

function chooseChartType(chartType: ChartType): void {
  closeTileMenu();
  emit("insert-chart", chartType);
}

onBeforeUnmount(closeTileMenu);

</script>

<style scoped>
.element-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 6px;
  gap: 10px;
}

.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.element-list-container h3,
.data-parameters-section h4,
.data-fields-section h4 {
  margin-top: 0;
  margin-bottom: 0;
  color: #333;
  font-size: 13px;
  font-weight: 600;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.add-button {
  width: 20px;
  height: 20px;
  border: none;
  background-color: #4a90e2;
  color: white;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.add-button:hover {
  background-color: #3a80d2;
  transform: scale(1.1);
}

.element-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  /* margin-bottom: 16px; */
}

.element-item.is-disabled,
.element-item.is-disabled:hover {
  opacity: 0.45;
  cursor: not-allowed;
}

.element-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.2s ease;
  min-height: 60px;
}

.element-item:hover {
  background-color: #e0e0e0;
  border-color: #999;
  transform: translateY(-1px);
}

.element-item:active {
  cursor: grabbing;
}

.element-item.is-open {
  border-color: #1890ff;
  background-color: #e6f4ff;
}

.tile-menu {
  position: fixed;
  z-index: 2000;
  width: 264px;
  padding: 12px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.tile-menu.is-chart {
  width: 300px;
}

.tile-menu-title {
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.page-number-menu-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.page-number-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 4px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.2;
  color: #555;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.page-number-option:hover,
.page-number-option:focus-visible {
  outline: none;
  border-color: #1890ff;
  background-color: #e6f4ff;
  color: #1f2937;
}

/* Mini page: where the page number goes */
.page-thumb {
  position: relative;
  width: 38px;
  height: 50px;
  box-sizing: border-box;
  border: 1.5px solid #9ca3af;
  border-radius: 2px;
  background: #fff;
}

.page-thumb-lines {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 16px;
  height: 17px;
  /* Four text lines, the last one shorter */
  background:
    linear-gradient(#d1d5db, #d1d5db) 0 0 / 100% 2px no-repeat,
    linear-gradient(#d1d5db, #d1d5db) 0 5px / 100% 2px no-repeat,
    linear-gradient(#d1d5db, #d1d5db) 0 10px / 100% 2px no-repeat,
    linear-gradient(#d1d5db, #d1d5db) 0 15px / 70% 2px no-repeat;
}

.page-thumb-number {
  position: absolute;
  width: 10px;
  height: 4px;
  border-radius: 1px;
  background: #1890ff;
}

.page-thumb-number.is-top {
  top: 4px;
}

.page-thumb-number.is-bottom {
  bottom: 4px;
}

.page-thumb-number.is-center {
  left: 50%;
  transform: translateX(-50%);
}

.page-thumb-number.is-right {
  right: 4px;
}

.chart-menu-group + .chart-menu-group {
  margin-top: 10px;
}

.chart-menu-group-title {
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #888;
}

.chart-menu-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.chart-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.2;
  color: #374151;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.chart-option svg {
  flex-shrink: 0;
  color: #6b7280;
}

.chart-option:hover,
.chart-option:focus-visible {
  outline: none;
  border-color: #1890ff;
  background-color: #e6f4ff;
  color: #1f2937;
}

.tile-menu-hint {
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.4;
  color: #888;
}

.element-category {
  margin-bottom: 8px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--prop-text-secondary, #666);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.1s;
  user-select: none;
}

.category-header:hover {
  background-color: var(--prop-bg-hover, #f0f0f0);
}

.category-arrow {
  flex-shrink: 0;
  color: var(--prop-text-tertiary, #999);
}

.element-icon {
  font-size: 20px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.element-icon :deep(svg) {
  width: 20px;
  height: 20px;
  color: currentColor;
}

.element-name {
  font-size: 12px;
  text-align: center;
  word-break: break-word;
}

.data-fields-section {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 10px;
}

.fields-mini-view {
  max-height: 160px;
  overflow-y: auto;
}

.field-mini-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px;
  margin-bottom: 4px;
  background-color: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.2s ease;
}

.field-mini-item:hover {
  background-color: #e0e0e0;
}

.field-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.field-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.field-type {
  font-size: 10px;
  color: #666;
  white-space: nowrap;
}

.field-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.action-button {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s;
}

.edit-button {
  background-color: #f0f0f0;
  color: #333;
}

.edit-button:hover {
  background-color: #e0e0e0;
}

.delete-button {
  background-color: #f0f0f0;
  color: #e74c3c;
}

.delete-button:hover {
  background-color: #ffe6e6;
}

.empty-state {
  padding: 20px 10px;
  text-align: center;
  color: #999;
  font-size: 12px;
}

.empty-hint {
  font-size: 10px;
  margin-top: 4px;
  color: #ccc;
}

/* Scrollbar style */
.fields-mini-view::-webkit-scrollbar {
  width: 6px;
}

.fields-mini-view::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.fields-mini-view::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.fields-mini-view::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
