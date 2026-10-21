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
          <span class="category-title">{{ categoryLabels[categoryKey] || categoryKey }}</span>
          <ChevronDown
            class="category-arrow"
            :class="{ 'is-closed': !expandedCategories[categoryKey] }"
            :size="14"
          />
        </div>
        <Collapse>
        <div v-if="expandedCategories[categoryKey]" class="category-body">
        <template v-for="section in sectionsOf(categoryElements)" :key="section.group">
        <div v-if="section.group" class="element-group-title">
          {{ t(`elementLibrary.presetGroups.${section.group}`) }}
        </div>
        <div class="element-list">
          <div
            v-for="element in section.elements"
            :key="element.type"
            class="element-item"
            :data-tile="element.type"
            :class="{
              'is-disabled': isUnavailable(element.type),
              'is-open': tileMenu?.type === element.type,
            }"
            :draggable="!isUnavailable(element.type)"
            :aria-haspopup="hasTileMenu(element.type) ? 'dialog' : undefined"
            @dragstart="handleDragStart($event, element)"
            @click="handleTileClick($event, element)"
            @mouseenter="showTileCard($event, element)"
            @mouseleave="hideTileCard"
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
        </template>
        </div>
        </Collapse>
      </div>
    </div>

    <!-- Report Data: the report's projects, their details and tables -->
    <div class="data-fields-section">
      <ReportDataPanel
        :bands="bands as Band[]"
        :projects="projects ?? []"
      />
    </div>

    <!-- Hovering a tile: what it is and how to add it (Help) -->
    <Teleport to="body">
      <div
        v-if="tileCard && !tileMenu"
        ref="tileCardRef"
        class="tile-card"
        role="tooltip"
        :style="{ left: tileCard.x + 'px', top: tileCard.y + 'px' }"
      >
        <strong class="tile-card-name">{{ tileCard.name }}</strong>
        <span v-if="tileCard.text" class="tile-card-text">{{ tileCard.text }}</span>
        <span v-if="tileCard.how" class="tile-card-how">
          <MousePointerClick :size="13" :stroke-width="2.25" aria-hidden="true" />
          {{ tileCard.how }}
        </span>
      </div>
    </Teleport>

    <!-- Page Number tile: where on the page to put it; Chart / Barcode tile: which type -->
    <Teleport to="body">
      <div
        v-if="tileMenu"
        ref="tileMenuRef"
        class="tile-menu"
        :class="{ 'is-chart': tileMenu.type === 'chart', 'is-barcode': tileMenu.type === 'barcode' }"
        role="dialog"
        :aria-label="tileMenuLabel"
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
        <template v-else-if="tileMenu.type === 'table'">
          <div class="tile-menu-title">{{ t("customTable.chooseKind") }}</div>
          <div class="table-kind-options">
            <button
              v-for="kind in TABLE_KINDS"
              :key="kind.value"
              type="button"
              class="table-kind-option"
              @click="chooseTableKind(kind.value)"
            >
              <component :is="kind.icon" :size="18" :stroke-width="1.75" aria-hidden="true" />
              <span class="table-kind-text">
                <span class="table-kind-name">{{ t(kind.labelKey) }}</span>
                <span class="table-kind-desc">{{ t(kind.descKey) }}</span>
              </span>
            </button>
          </div>
          <div class="tile-menu-hint">{{ t("customTable.dragHint") }}</div>
        </template>
        <template v-else-if="tileMenu.type === 'barcode'">
          <div class="tile-menu-title">{{ t("barcode.chooseType") }}</div>
          <div v-for="group in BARCODE_GROUPS" :key="group" class="chart-menu-group">
            <div class="chart-menu-group-title">{{ t(`barcode.groups.${group}`) }}</div>
            <div class="barcode-menu-options">
              <button
                v-for="code in barcodeTypesInGroup(group)"
                :key="code.type"
                type="button"
                class="barcode-option"
                :title="t(`barcode.uses.${code.type}`)"
                @click="chooseBarcodeType(code.type)"
              >
                <span class="barcode-option-sample" :class="`is-${code.kind}`" aria-hidden="true">
                  <img v-if="barcodeSamples[code.type]" :src="barcodeSamples[code.type]!.uri" alt="" draggable="false" />
                </span>
                <span class="barcode-option-name">{{ t(`barcode.types.${code.type}`) }}</span>
              </button>
            </div>
          </div>
          <div class="tile-menu-hint">{{ t("barcode.dragHint") }}</div>
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
import Collapse from "./common/Collapse.vue";
import { storeToRefs } from "pinia";
import { useReportStore } from "@/stores/report";
import { useHelpStore } from "@/stores/help";
import { ref, computed, nextTick, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import {
  ChevronDown,
  Database,
  MousePointerClick,
  PencilLine,
} from "@lucide/vue";
import ReportDataPanel from "./designer/ReportDataPanel.vue";
import { ElementRegistry } from "./elements/ElementRegistry";
import { findPageBorder, isFrameTemplateType, PAGE_BORDER_TYPE } from "../utils/framePresets";
import { isReportPartType } from "../utils/reportParts";
import { isContentsDesignType, isCoverDesignType } from "../utils/pageDesigns";
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
import { BARCODE_GROUPS, BARCODE_TYPES, barcodeTypesInGroup, type BarcodeType } from "../utils/barcode/barcodeTypes";
import { barcodeSamplePicture, type BarcodePicture } from "../utils/barcode/barcodeImage";
import { CHART_TYPE_ICONS } from "./elements/chartIcons";
import { getElementIcon, getElementIconComponent } from "../utils/elementUtils";

const { t, te } = useI18n();


// Define component props
interface Props {
  elements: Array<{ type: string; name: string }>;
  // Projects chosen for the report
  projects?: ReportProject[];
}

// Define component events
interface Emits {
  (e: "drag-start", event: DragEvent, element: any): void;
  (e: "add-element", element: any): void;
  (e: "insert-page-number", position: PaginationPosition): void;
  (e: "insert-chart", chartType: ChartType): void;
  (e: "insert-barcode", barcodeType: BarcodeType): void;
  (e: "insert-table", kind: "typed" | "data"): void;
}

// Use default values
const props = withDefaults(defineProps<Props>(), {
  elements: () => [],
});

// Report, selection and editor state come from the stores
const reportStore = useReportStore();
const helpStore = useHelpStore();
const { reportFields, reportParameters, reportVariables, bands } = storeToRefs(reportStore);

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
    if (category === "hidden") continue;
    if (!categories[category]) categories[category] = [];
    categories[category].push(element);
  }
  return categories;
});

// A category's tiles split by their sub-group (Element Presets: Boxes, Header &
// Footer...), in registration order; tiles without a group form one untitled list
const sectionsOf = (elements: any[]): { group: string; elements: any[] }[] => {
  const registry = ElementRegistry.getInstance();
  const sections: { group: string; elements: any[] }[] = [];
  for (const element of elements) {
    const group = registry.getElementConfig(element.type)?.group ?? "";
    let section = sections.find((s) => s.group === group);
    if (!section) sections.push((section = { group, elements: [] }));
    section.elements.push(element);
  }
  return sections;
};

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
const hasPageBorder = computed(() => findPageBorder(bands.value) !== null);
const isUnavailable = (type: string) => type === PAGE_BORDER_TYPE && hasPageBorder.value;

// Hover text: why a tile is disabled, or what the tile adds (its own line in
// elementLibrary.tileHints, else the preset's description)
const tileHint = (type: string): string | undefined => {
  if (isUnavailable(type)) return t("framePresets.pageBorderExists");
  if (te(`elementLibrary.tileHints.${type}`)) return t(`elementLibrary.tileHints.${type}`);
  if (isFrameTemplateType(type)) return t(`framePresets.templateDescription.${type}`);
  if (isCoverDesignType(type) || isContentsDesignType(type)) return t(`pageDesigns.designs.${type}.tileHint`);
  if (isReportPartType(type)) return t(`reportParts.description.${type}`);
  if (type === PAGE_NUMBER_TYPE) return t("pagination.tileHint");
  if (type === "dateTime") return t("dateElement.tileHint");
  if (type === "chart") return t("chart.tileHint");
  if (type === "barcode") return t("barcode.tileHint");
  return undefined;
};

// The hover card: after a short pause, beside the tile, kept inside the window
const TILE_CARD_DELAY = 450;
const tileCard = ref<{ name: string; text?: string; how?: string; x: number; y: number } | null>(null);
const tileCardRef = ref<HTMLElement | null>(null);
let tileCardTimer: ReturnType<typeof setTimeout> | undefined;

function showTileCard(event: MouseEvent, element: any): void {
  // Part of Tutorial mode (Help menu)
  if (!helpStore.tutorialMode) return;
  const tile = event.currentTarget as HTMLElement;
  clearTimeout(tileCardTimer);
  tileCardTimer = setTimeout(() => {
    if (tileMenu.value) return;
    const rect = tile.getBoundingClientRect();
    const unavailable = isUnavailable(element.type);
    tileCard.value = {
      name: t(element.name),
      text: tileHint(element.type),
      how: unavailable
        ? undefined
        : t(hasTileMenu(element.type) ? "elementLibrary.tileHowChoose" : "elementLibrary.tileHowAdd"),
      x: rect.right + MENU_GAP,
      y: rect.top,
    };
    nextTick(() => {
      const card = tileCardRef.value;
      if (!card || !tileCard.value) return;
      const { width, height } = card.getBoundingClientRect();
      let { x, y } = tileCard.value;
      if (x + width > window.innerWidth - WINDOW_MARGIN) {
        x = rect.left;
        y = rect.bottom + MENU_GAP;
      }
      x = Math.max(WINDOW_MARGIN, Math.min(x, window.innerWidth - width - WINDOW_MARGIN));
      y = Math.max(WINDOW_MARGIN, Math.min(y, window.innerHeight - height - WINDOW_MARGIN));
      tileCard.value = { ...tileCard.value, x, y };
    });
  }, TILE_CARD_DELAY);
}

function hideTileCard(): void {
  clearTimeout(tileCardTimer);
  tileCard.value = null;
}

function handleDragStart(event: DragEvent, element: any): void {
  hideTileCard();
  closeTileMenu();
  if (isUnavailable(element.type)) {
    event.preventDefault();
    emit("add-element", element);
    return;
  }
  emit("drag-start", event, element);
}

// The Page Number, Chart, Barcode and Table tiles ask a question first (where /
// which type / typed or project data) when clicked; dragging them drops a default one
type TileMenuType = typeof PAGE_NUMBER_TYPE | "chart" | "barcode" | "table";
const hasTileMenu = (type: string): type is TileMenuType =>
  type === PAGE_NUMBER_TYPE || type === "chart" || type === "barcode" || type === "table";

// Table tile: the same two choices as "Table content" in the table's properties
const TABLE_KINDS = [
  { value: "typed", labelKey: "customTable.typed", descKey: "customTable.typedDesc", icon: PencilLine },
  { value: "data", labelKey: "customTable.fromData", descKey: "customTable.fromDataDesc", icon: Database },
] as const;

// One click adds the tile's item (tiles with a question open it instead). A
// double-click out of habit adds one, not two: a second click on the same tile
// within the double-click time is ignored.
const DOUBLE_CLICK_MS = 500;
let lastAdded: { type: string; at: number } | null = null;

function handleTileClick(event: MouseEvent, element: any): void {
  hideTileCard();
  if (hasTileMenu(element.type)) {
    openTileMenu(element.type, event.currentTarget as HTMLElement);
    return;
  }
  const now = Date.now();
  if (lastAdded && lastAdded.type === element.type && now - lastAdded.at < DOUBLE_CLICK_MS) return;
  lastAdded = { type: element.type, at: now };
  emit("add-element", element);
}

// The question popover: beside the tile, kept inside the window
const tileMenu = ref<{ type: TileMenuType; x: number; y: number } | null>(null);
const tileMenuLabel = computed(() => {
  if (tileMenu.value?.type === "chart") return t("chart.chooseType");
  if (tileMenu.value?.type === "barcode") return t("barcode.chooseType");
  if (tileMenu.value?.type === "table") return t("customTable.chooseKind");
  return t("pagination.choosePosition");
});
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

function chooseTableKind(kind: "typed" | "data"): void {
  closeTileMenu();
  emit("insert-table", kind);
}

function chooseBarcodeType(barcodeType: BarcodeType): void {
  closeTileMenu();
  emit("insert-barcode", barcodeType);
}

// Barcode menu: each type's sample (drawn once the barcode library is in)
const barcodeSamples = computed(() => {
  const out = {} as Record<BarcodeType, BarcodePicture | null>;
  if (tileMenu.value?.type !== "barcode") return out;
  for (const code of BARCODE_TYPES) out[code.type] = barcodeSamplePicture(code.type);
  return out;
});

onBeforeUnmount(() => {
  closeTileMenu();
  hideTileCard();
});

</script>

<style scoped>
.element-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: 12px;
  gap: 12px;
  background: #fcfcfe;
  scrollbar-width: thin;
  scrollbar-color: #cfd5e1 transparent;
}

.element-library::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.element-library::-webkit-scrollbar-track {
  background: transparent;
}

.element-library::-webkit-scrollbar-thumb {
  background: #cfd5e1;
  border-radius: 4px;
}

.element-library::-webkit-scrollbar-thumb:hover {
  background: #b0b8c9;
}

.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 4px 8px;
}

.library-header h3 {
  font-size: 14px !important;
  font-weight: 750 !important;
  letter-spacing: -0.01em;
  color: #1c1b26 !important;
}

.element-list-container h3,
.data-parameters-section h4,
.data-fields-section h4 {
  margin-top: 0;
  margin-bottom: 0;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 650;
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
  background-color: #7c5cf7;
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
  background-color: #6440f4;
  transform: scale(1.1);
}

/* Sub-group title with a hairline after it */
.element-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 2px 6px;
  color: #8a84a3;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.element-group-title::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(28, 27, 38, 0.07);
}

.category-body > .element-group-title:first-child {
  margin-top: 2px;
}

/* As many columns as fit: the panel can be narrow or wide */
.element-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
  gap: 8px;
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
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
  min-height: 76px;
  padding: 10px 6px 8px;
  background: #ffffff;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  color: #1c1b26;
  cursor: grab;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  box-shadow: 0 1px 2px rgba(23, 20, 44, 0.03);
}

.element-item:hover {
  border-color: rgba(124, 92, 247, 0.38);
  box-shadow: 0 8px 20px rgba(124, 92, 247, 0.12);
  transform: translateY(-2px);
}

.element-item:active {
  cursor: grabbing;
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.06);
}

.element-item.is-open {
  border-color: #7c5cf7;
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.14);
}

.tile-card {
  position: fixed;
  z-index: 2000;
  display: grid;
  gap: 4px;
  width: max-content;
  max-width: 260px;
  padding: 10px 12px;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background: #ffffff;
  box-shadow:
    0 12px 28px rgba(23, 20, 44, 0.14),
    0 2px 6px rgba(23, 20, 44, 0.06);
  pointer-events: none;
  animation: tile-card-in 0.14s ease;
}
@keyframes tile-card-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .tile-card {
    animation: none;
  }
}
.tile-card-name {
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}
.tile-card-text {
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.45;
}
.tile-card-how {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  color: #6440f4;
  font-size: 12px;
  font-weight: 600;
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
  border-color: #6440f4;
  background-color: #f1edff;
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
  background: #6440f4;
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
  border-color: #6440f4;
  background-color: #f1edff;
  color: #1f2937;
}

.tile-menu.is-barcode {
  width: 340px;
}

.barcode-menu-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.barcode-option {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 0;
  padding: 5px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

/* The sample on a white label over a tinted tile, like the properties cards */
.barcode-option-sample {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 3px 10px;
  box-sizing: border-box;
  border-radius: 4px;
  background: #f3f4f6;
}

.barcode-option-sample img {
  display: block;
  width: 100%;
  height: 100%;
  padding: 2px;
  box-sizing: border-box;
  object-fit: contain;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
}

.barcode-option-sample.is-square img {
  width: 30px;
}

.barcode-option-sample.is-postal img {
  height: 16px;
}

.barcode-option-name {
  overflow: hidden;
  font-size: 11px;
  line-height: 1.2;
  color: #374151;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.barcode-option:hover,
.barcode-option:focus-visible {
  outline: none;
  border-color: #6440f4;
  background-color: #f1edff;
}

.table-kind-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.table-kind-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #555;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.table-kind-option svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.table-kind-option:hover,
.table-kind-option:focus-visible {
  outline: none;
  border-color: #6440f4;
  background-color: #f1edff;
  color: #1f2937;
}

.table-kind-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.table-kind-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
}

.table-kind-desc {
  font-size: 11px;
  line-height: 1.35;
  color: #6b7280;
}

.tile-menu-hint {
  margin-top: 10px;
  font-size: 11px;
  line-height: 1.4;
  color: #888;
}

/* Each category is a card */
.element-category {
  margin-bottom: 10px;
  padding: 6px 8px 10px;
  background: #ffffff;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.element-category:hover {
  border-color: rgba(124, 92, 247, 0.22);
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 -2px 6px;
  padding: 6px 8px;
  font-size: 12.5px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: #1c1b26;
  cursor: pointer;
  border-radius: 8px;
  background-color: transparent;
  transition: background-color 0.15s ease, color 0.15s ease;
  user-select: none;
}

.category-header:hover {
  background-color: rgba(99, 102, 241, 0.07);
  color: #5b3ee0;
}

.category-title {
  flex: 1;
}

.category-arrow {
  flex-shrink: 0;
  color: var(--prop-text-tertiary, #8a84a3);
  transition: color 0.15s ease, transform 0.15s ease;
}

.category-arrow.is-closed {
  transform: rotate(-90deg);
}

.category-header:hover .category-arrow {
  color: #6366f1;
}

/* Icon in a soft badge */
.element-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: rgba(99, 102, 241, 0.09);
  color: #6366f1;
  font-size: 18px;
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.element-icon :deep(svg) {
  width: 18px;
  height: 18px;
  color: currentColor;
}

.element-item:hover .element-icon {
  background: rgba(99, 102, 241, 0.17);
  color: #5b3ee0;
  transform: scale(1.05);
}

/* Two lines at most, words never split in the middle */
.element-name {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 100%;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.3;
  text-align: center;
  word-break: normal;
  overflow-wrap: normal;
  hyphens: auto;
}

.data-fields-section {
  padding: 10px;
  margin-bottom: 10px;
  background: #ffffff;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
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
.fields-mini-view {
  scrollbar-width: thin;
  scrollbar-color: #cfd5e1 transparent;
}

.fields-mini-view::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.fields-mini-view::-webkit-scrollbar-track {
  background: transparent;
}

.fields-mini-view::-webkit-scrollbar-thumb {
  background: #cfd5e1;
  border-radius: 4px;
}

.fields-mini-view::-webkit-scrollbar-thumb:hover {
  background: #b0b8c9;
}
</style>
