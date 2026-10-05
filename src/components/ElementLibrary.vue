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
              'is-open': element.type === PAGE_NUMBER_TYPE && pageNumberMenu !== null,
            }"
            :title="tileHint(element.type)"
            :draggable="!isUnavailable(element.type)"
            :aria-haspopup="element.type === PAGE_NUMBER_TYPE ? 'dialog' : undefined"
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

    <!-- Report elements section -->
    <div class="report-elements-section">
      <h4>{{ t("elementLibrary.reportElements") }}</h4>
      <div class="filter-input-container">
        <input
          v-model="elementFilterText"
          type="text"
          :placeholder="t('elementLibrary.filterElements')"
          class="filter-input"
        />
        <n-button
          v-if="elementFilterText"
          @click="elementFilterText = ''"
          type="default"
          quaternary
          circle
          size="small"
          :title="t('elementLibrary.filterElements')"
        >
          <X :size="14" />
        </n-button>
      </div>
      <div class="report-elements-list">
        <div
          v-for="(elements, bandName) in groupedReportElements"
          :key="bandName"
          class="band-group"
        >
          <div class="band-group-header">{{ bandName }}</div>
          <div
            v-for="element in elements"
            :key="getElementKey(element)"
            class="report-element-item"
            :class="{ selected: isElementSelected(element, selectedElement) }"
            :style="{ paddingLeft: 6 + (element.level || 0) * 12 + 'px' }"
          >
            <div
              class="element-info-container"
              @click="selectElementFromList(element, selectElement)"
              @dblclick.stop="handleReportElementDblClick(element)"
            >
              <span class="element-icon">
                <component
                  :is="getElementIconComponent(element.element.type)"
                  v-if="getElementIconComponent(element.element.type)"
                />
                <template v-else>{{ getElementIcon(element.element.type) }}</template>
              </span>
              <input
                v-if="editingElementKey === getElementKey(element)"
                :ref="setInlineEditInputRef"
                v-model="editingValue"
                class="report-element-inline-input"
                @click.stop
                @dblclick.stop
                @input="handleInlineInput(element)"
                @keydown.enter.prevent="finishInlineEdit(element)"
                @keydown.esc.prevent="cancelInlineEdit(element)"
                @blur="finishInlineEdit(element)"
              />
              <span
                v-else
                class="element-info"
                :title="
                  getElementDisplayInfoWithoutBand(element.element) ||
                  t(getElementTypeName(element.element.type))
                "
              >
                {{
                  getElementDisplayInfoWithoutBand(element.element) ||
                  t(getElementTypeName(element.element.type))
                }}
              </span>
            </div>
            <n-button
              class="action-button delete-button"
              @click.stop="handleDeleteElement(element)"
              type="error"
              quaternary
              circle
              size="small"
              :title="t('properties.deleteElement')"
            >
              <Trash2 :size="14" />
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Data: backend sources to drag onto tables -->
    <div class="data-fields-section">
      <TableDataList :bands="bands as Band[]" />
    </div>

    <!-- Report styles section -->
    <div class="data-fields-section">
      <div class="section-header">
        <h4>{{ t("elementLibrary.reportStyles") }}</h4>
        <n-button
          class="add-button"
          @click="handleAddStyle"
          type="default"
          quaternary
          circle
          size="small"
          :title="t('elementLibrary.addReportStyle')"
          ><Plus :size="14" /></n-button
        >
      </div>
      <div class="parameters-mini-view">
        <div
          v-for="(style, index) in reportStyles"
          :key="index"
          class="field-mini-item"
        >
          <div class="field-info">
            <span class="field-name">{{ style.name }}</span>
            <span v-if="style.parentStyle" class="field-type"
              >({{ style.parentStyle }})</span
            >
          </div>
          <div class="field-actions">
            <n-button
              class="action-button edit-button"
              @click.stop="handleEditStyle(style)"
              type="default"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.editStyle')"
            >
              <SquarePen :size="14" />
            </n-button>
            <n-button
              class="action-button delete-button"
              @click.stop="handleDeleteStyle(style.name)"
              type="error"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.deleteStyle')"
            >
              <Trash2 :size="14" />
            </n-button>
          </div>
        </div>
        <div v-if="reportStyles.length === 0" class="empty-state">
          <p>{{ t("elementLibrary.noReportStyles") }}</p>
          <p class="empty-hint">{{ t("elementLibrary.clickToAddStyle") }}</p>
        </div>
      </div>
    </div>
    <!-- Page Number tile: where on the page to put it -->
    <Teleport to="body">
      <div
        v-if="pageNumberMenu"
        ref="pageNumberMenuRef"
        class="page-number-menu"
        role="dialog"
        :aria-label="t('pagination.choosePosition')"
        :style="{ left: pageNumberMenu.x + 'px', top: pageNumberMenu.y + 'px' }"
      >
        <div class="page-number-menu-title">{{ t("pagination.choosePosition") }}</div>
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
        <div class="page-number-menu-hint">{{ t("pagination.dragHint") }}</div>
      </div>
    </Teleport>

    <!-- Confirmation dialog -->
    <ConfirmModal
      v-model:visible="showConfirmModal"
      :title="t('elementLibrary.deleteConfirm')"
      :message="t('elementLibrary.deleteElementConfirm')"
      @confirm="handleConfirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  SquarePen,
  Trash2,
  X,
} from "@lucide/vue";
import ConfirmModal from "./modals/ConfirmModal.vue";
import TableDataList from "./designer/TableDataList.vue";
import { ElementRegistry } from "./elements/ElementRegistry";
import { findPageBorder, isFrameTemplateType, PAGE_BORDER_TYPE } from "../utils/framePresets";
import {
  isPagination,
  PAGE_NUMBER_TYPE,
  PAGINATION_POSITIONS,
  type PaginationPosition,
} from "../utils/paginationPresets";
import notification from "../utils/notification";
import type {
  Band,
  DesignElement,
  TextFieldElement,
  ReportField,
  ReportParameter,
  ReportVariable,
  ReportStyle,
} from "../types";
import {
  getElementDisplayInfoWithoutBand,
  getElementIcon,
  getElementIconComponent,
  getElementKey,
  getElementTypeName,
  isElementSelected,
  quoteExpressionValue,
  selectElementFromList,
  stripExpressionQuotes,
} from "../utils/elementUtils";

const { t } = useI18n();


// Define component props
interface Props {
  elements: Array<{ type: string; name: string }>;
  reportFields?: ReportField[];
  reportParameters?: ReportParameter[];
  reportVariables?: ReportVariable[];
  reportStyles: ReportStyle[];
  bands: Array<{ type: string; name?: string; elements: DesignElement[] }>;
  selectedElement: any;
}

// Define component events
interface Emits {
  (e: "drag-start", event: DragEvent, element: any): void;
  (e: "element-double-click", element: any): void;
  (e: "insert-page-number", position: PaginationPosition): void;
  (
    e: "select-element",
    bandIndex: number,
    elementIndex: number,
    isMultiSelect?: boolean,
    parentFrameIndex?: number,
  ): void;
  (e: "add-style"): void;
  (e: "edit-style", style: ReportStyle): void;
  (e: "delete-style", styleName: string): void;
  (
    e: "delete-element",
    bandIndex: number,
    elementIndex: number,
    parentFrameIndex?: number,
  ): void;
  (
    e: "update-element-value",
    element: any,
    newValue: string,
    oldValue: string,
  ): void;
}

// Use default values
const props = withDefaults(defineProps<Props>(), {
  elements: () => [],
  reportFields: () => [],
  reportParameters: () => [],
  reportVariables: () => [],
  reportStyles: () => [],
  bands: () => [],
  selectedElement: null,
});

const emit = defineEmits<Emits>();

// Element filter text
const elementFilterText = ref("");

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

// Computed property: report elements grouped by band
const groupedReportElements = computed(() => {
  const grouped: Record<string, any[]> = {};

  props.bands.forEach((band, bandIndex) => {
    if (band.elements && band.elements.length > 0) {
      const bandName = band.name || getBandDisplayName(band.type);
      if (!grouped[bandName]) {
        grouped[bandName] = [];
      }

      const processElement = (
        element: DesignElement,
        elementIndex: number,
        parentFrameIndex?: number,
        level: number = 0,
      ) => {
        // Filter logic
        if (
          !elementFilterText.value ||
          element.type
            .toLowerCase()
            .includes(elementFilterText.value.toLowerCase()) ||
          (element.type === "textField" &&
            ((element as TextFieldElement).expression || "")
              .toLowerCase()
              .includes(elementFilterText.value.toLowerCase()))
        ) {
          grouped[bandName]?.push({
            element,
            bandIndex,
            elementIndex,
            parentFrameIndex,
            level,
          });
        }

        // Recursively process Frame child elements
        // Regardless of whether the parent element matches the filter, its children are checked too
        // (alternatively you could decide to only show children when the parent matches, but a search
        // is generally expected to find elements at any nesting level).
        // Simplified logic here: for a Frame, keep recursing, and let processElement itself decide
        // whether to add the element.
        if (element.type === "frame" && (element as any).elements) {
          (element as any).elements.forEach(
            (childElement: DesignElement, childIndex: number) => {
              // For child elements, parentFrameIndex should be the current Frame's elementIndex
              // (if the Frame is a direct child of the Band).
              // But elementIndex is relative to its parent container.
              // The issue here: parentFrameIndex refers to the index within Band.elements.
              // If a Frame is nested inside another Frame, parentFrameIndex needs to point to the
              // immediate parent Frame.
              // However, the current data structure (SelectedElementInfo) only supports a single
              // level of parentFrameIndex (a number).
              // Supporting multiple nesting levels would require SelectedElementInfo to hold a path
              // or a recursive structure instead.
              // Assuming for now that only one level of Frame nesting is supported (a limitation of
              // the current data structure), we need to confirm the definition of SelectedElementInfo.
              // Recall types/index.ts: parentFrameIndex?: number; // If inside a Frame, this is the
              // Frame's index within the Band

              // If this is the first-level Frame (level === 0), parentFrameIndex is undefined, and
              // elementIndex is passed down to the child element.
              // If this is a nested Frame (level > 0), should parentFrameIndex point to the outermost
              // Frame, or to the immediate parent Frame?
              // Based on the existing logic:
              // const frame = band.elements[parentFrameIndex];
              // currentElement = frame.elements[elementIndex];
              // This means the current implementation only supports one level of Frame nesting.
              // If a Frame contains another Frame, the current selectedElement structure
              // (parentFrameIndex: number) cannot pinpoint it precisely.
              // For now, assume only one level of nesting is supported, or only render one level of
              // child elements.

              if (level === 0) {
                processElement(
                  childElement,
                  childIndex,
                  elementIndex,
                  level + 1,
                );
              } else {
                // If we're already at a nested level, and multi-level lookup isn't supported,
                // selection may not work correctly.
                // For display purposes we can keep recursing, but clicking to select may have issues.
                // For now, only one level of nested display/selection is supported.
                processElement(childElement, childIndex, undefined, level + 1); // undefined here is a placeholder since a multi-level parent can't be passed correctly
              }
            },
          );
        }
      };

      band.elements.forEach((element, elementIndex) => {
        processElement(element, elementIndex, undefined, 0);
      });
    }
  });

  return grouped;
});

// Get the band's display name
function getBandDisplayName(bandType: string): string {
  return t(`bandNames.${bandType}`);
}

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
  return undefined;
};

function handleDragStart(event: DragEvent, element: any): void {
  closePageNumberMenu();
  if (isUnavailable(element.type)) {
    event.preventDefault();
    emit("element-double-click", element);
    return;
  }
  emit("drag-start", event, element);
}

// Handle element double-click (the Page Number tile asks for a position instead)
function handleElementDoubleClick(event: MouseEvent, element: any): void {
  if (element.type === PAGE_NUMBER_TYPE) {
    openPageNumberMenu(event.currentTarget as HTMLElement);
    return;
  }
  emit("element-double-click", element);
}

function handleTileClick(event: MouseEvent, element: any): void {
  if (element.type === PAGE_NUMBER_TYPE) openPageNumberMenu(event.currentTarget as HTMLElement);
}

// Page Number position popover: beside the tile, kept inside the window
const pageNumberMenu = ref<{ x: number; y: number } | null>(null);
const pageNumberMenuRef = ref<HTMLElement | null>(null);
let pageNumberTile: HTMLElement | null = null;
const MENU_GAP = 8;
const WINDOW_MARGIN = 8;

function openPageNumberMenu(tile: HTMLElement): void {
  if (pageNumberMenu.value && pageNumberTile === tile) return;
  pageNumberTile = tile;
  const rect = tile.getBoundingClientRect();
  pageNumberMenu.value = { x: rect.right + MENU_GAP, y: rect.top };
  document.addEventListener("mousedown", handleOutsideMenuPress, true);
  document.addEventListener("keydown", handleMenuKeydown, true);
  window.addEventListener("resize", closePageNumberMenu);
  window.addEventListener("scroll", closePageNumberMenu, true);
  nextTick(() => {
    const menu = pageNumberMenuRef.value;
    if (!menu || !pageNumberMenu.value) return;
    const { width, height } = menu.getBoundingClientRect();
    let { x, y } = pageNumberMenu.value;
    // No room on the right: open below the tile instead
    if (x + width > window.innerWidth - WINDOW_MARGIN) {
      x = rect.left;
      y = rect.bottom + MENU_GAP;
    }
    x = Math.max(WINDOW_MARGIN, Math.min(x, window.innerWidth - width - WINDOW_MARGIN));
    y = Math.max(WINDOW_MARGIN, Math.min(y, window.innerHeight - height - WINDOW_MARGIN));
    pageNumberMenu.value = { x, y };
    menu.querySelector<HTMLButtonElement>("button")?.focus();
  });
}

function closePageNumberMenu(): void {
  if (!pageNumberMenu.value) return;
  pageNumberMenu.value = null;
  document.removeEventListener("mousedown", handleOutsideMenuPress, true);
  document.removeEventListener("keydown", handleMenuKeydown, true);
  window.removeEventListener("resize", closePageNumberMenu);
  window.removeEventListener("scroll", closePageNumberMenu, true);
  pageNumberTile?.focus?.();
  pageNumberTile = null;
}

function handleOutsideMenuPress(event: MouseEvent): void {
  const target = event.target as Node;
  if (pageNumberMenuRef.value?.contains(target) || pageNumberTile?.contains(target)) return;
  closePageNumberMenu();
}

function handleMenuKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.stopPropagation();
    closePageNumberMenu();
  }
}

function choosePageNumberPosition(position: PaginationPosition): void {
  closePageNumberMenu();
  emit("insert-page-number", position);
}

onBeforeUnmount(closePageNumberMenu);

// Select an element
function selectElement(
  bandIndex: number,
  elementIndex: number,
  isMultiSelect?: boolean,
  parentFrameIndex?: number,
): void {
  emit(
    "select-element",
    bandIndex,
    elementIndex,
    isMultiSelect,
    parentFrameIndex,
  );
}

// Handle adding a style
function handleAddStyle(): void {
  emit("add-style");
}

// Handle editing a style
function handleEditStyle(style: ReportStyle): void {
  emit("edit-style", style);
}

// Handle deleting a style
function handleDeleteStyle(styleName: string): void {
  emit("delete-style", styleName);
}

// The element pending deletion
const pendingDeleteElement = ref<any>(null);
const showConfirmModal = ref(false);

// Handle deleting an element
function handleDeleteElement(element: any): void {
  // First select the element to be deleted
  selectElementFromList(element, selectElement);
  pendingDeleteElement.value = element;
  showConfirmModal.value = true;
}

// Confirm deletion
function handleConfirmDelete(): void {
  if (pendingDeleteElement.value) {
    const element = pendingDeleteElement.value;
    emit(
      "delete-element",
      element.bandIndex,
      element.elementIndex,
      element.parentFrameIndex,
    );
    pendingDeleteElement.value = null;
  }
}

// ==================== Report Element Inline Editing ====================
const editingElementKey = ref<string | null>(null);
const editingValue = ref<string>("");
const originalValue = ref<string>("");
const inlineEditInputRef = ref<HTMLInputElement | null>(null);

const setInlineEditInputRef = (el: any) => {
  if (el) {
    inlineEditInputRef.value = el as HTMLInputElement;
  }
};

// Check whether an element type supports text/expression inline editing.
// Image elements are read-only: their name is taken from the uploaded image file.
function isElementTextEditable(element: DesignElement): boolean {
  if (!element) return false;
  return ["textField", "barcode"].includes(element.type);
}

// Get the editable value from an element
function getElementEditableValue(element: DesignElement): string {
  if (!element) return "";
  if (element.type === "textField") {
    const tf = element as TextFieldElement;
    if (
      tf.expression !== undefined &&
      tf.expression !== null &&
      tf.expression !== ""
    ) {
      // Show static text without the quotes added automatically by the designer;
      // the user can type quotes manually when a literal string is needed.
      return stripExpressionQuotes(tf.expression);
    }
    if ((tf as any).fieldName) {
      return `$F{${(tf as any).fieldName}}`;
    }
    return "";
  }
  if (element.type === "barcode") {
    return (element as any).codeExpression || "";
  }
  return (element as any).expression || "";
}

// Set the editable value on an element
function setElementEditableValue(element: DesignElement, val: string): void {
  if (!element) return;
  if (element.type === "textField") {
    const tf = element as TextFieldElement;
    // Keep the stored JRXML expression valid: plain text is saved as a quoted literal,
    // while `$F{...}` expressions, concatenations and values the user quoted manually
    // (e.g. `"Hello"`) are stored exactly as typed.
    const expression = quoteExpressionValue(val);
    tf.expression = expression;
    // If the expression matches $F{field}, also sync fieldName
    const fieldMatch = expression.trim().match(/^\$F\{([^}]+)\}$/);
    if (fieldMatch && fieldMatch[1]) {
      (tf as any).fieldName = fieldMatch[1].trim();
    }
  } else if (element.type === "barcode") {
    (element as any).codeExpression = val;
  } else if ((element as any).text !== undefined) {
    (element as any).text = val;
  } else if ((element as any).expression !== undefined) {
    (element as any).expression = val;
  }
}

// Handle double-clicking a report element item
function handleReportElementDblClick(item: any): void {
  // Always select the element first so editor/properties sync selection
  selectElementFromList(item, selectElement);

  // Page numbers are generated by the report (format and range: property panel)
  if (isPagination(item.element)) {
    notification.warning(t("pagination.cannotEdit"));
    return;
  }
  if (!isElementTextEditable(item.element)) {
    return;
  }

  const key = getElementKey(item);
  editingElementKey.value = key;
  const val = getElementEditableValue(item.element);
  editingValue.value = val;
  originalValue.value = val;

  nextTick(() => {
    if (inlineEditInputRef.value) {
      inlineEditInputRef.value.focus();
      inlineEditInputRef.value.select();
    }
  });
}

// Live update while typing so canvas and properties panel update in real-time
function handleInlineInput(item: any): void {
  setElementEditableValue(item.element, editingValue.value);
}

// Finish editing on Enter or blur
function finishInlineEdit(item: any): void {
  if (
    !editingElementKey.value ||
    editingElementKey.value !== getElementKey(item)
  ) {
    return;
  }
  const newValue = editingValue.value;
  const oldValue = originalValue.value;
  setElementEditableValue(item.element, newValue);
  editingElementKey.value = null;

  if (newValue !== oldValue) {
    emit("update-element-value", item, newValue, oldValue);
  }
}

// Cancel editing on Escape
function cancelInlineEdit(item: any): void {
  if (
    !editingElementKey.value ||
    editingElementKey.value !== getElementKey(item)
  ) {
    return;
  }
  setElementEditableValue(item.element, originalValue.value);
  editingValue.value = originalValue.value;
  editingElementKey.value = null;
}

// Watch selectedElement: if selection moves to another element, close edit mode
watch(
  () => props.selectedElement,
  (newVal) => {
    if (editingElementKey.value && newVal) {
      const currentItemKey = editingElementKey.value;
      const expectedKeySuffix =
        newVal.parentFrameIndex !== undefined
          ? `-${newVal.bandIndex}-${newVal.parentFrameIndex}-${newVal.elementIndex}`
          : `-${newVal.bandIndex}-${newVal.elementIndex}`;
      if (!currentItemKey.endsWith(expectedKeySuffix)) {
        editingElementKey.value = null;
      }
    }
  },
);
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
.report-elements-section h4,
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

.page-number-menu {
  position: fixed;
  z-index: 2000;
  width: 264px;
  padding: 12px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.page-number-menu-title {
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

.page-number-menu-hint {
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

.report-elements-section,
.data-fields-section {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 10px;
}

.filter-input-container {
  position: relative;
  margin-bottom: 8px;
}

.filter-input {
  width: 100%;
  padding: 6px 30px 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  box-sizing: border-box;
}

.report-elements-list {
  max-height: 200px;
  overflow-y: auto;
}

.band-group {
  margin-bottom: 8px;
}

.band-group-header {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  padding-bottom: 3px;
  border-bottom: 1px solid #e0e0e0;
  color: #666;
}

.report-element-item {
  display: flex;
  align-items: center;
  padding: 6px;
  margin-bottom: 4px;
  background-color: #f0f0f0;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.2s ease;
}

.report-element-item:hover {
  background-color: #e0e0e0;
}

.report-element-item.selected {
  background-color: #d0e6ff;
  border-color: #4a90e2;
}

.element-info-container {
  flex: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
  min-width: 0;
}

.report-element-inline-input {
  flex: 1;
  min-width: 0;
  height: 22px;
  padding: 1px 6px;
  font-size: 12px;
  border: 1px solid #1890ff;
  border-radius: 3px;
  background-color: #ffffff;
  color: #333333;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  box-sizing: border-box;
}

.report-element-item .element-icon {
  font-size: 16px;
  margin-right: 8px;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.report-element-item .element-icon :deep(svg) {
  width: 16px;
  height: 16px;
  color: currentColor;
}

.report-element-item .element-info {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.report-element-item .action-button {
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
  margin-left: 4px;
}

.report-element-item .delete-button {
  background-color: #f0f0f0;
  color: #e74c3c;
}

.report-element-item .delete-button:hover {
  background-color: #ffe6e6;
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
.report-elements-list::-webkit-scrollbar,
.fields-mini-view::-webkit-scrollbar {
  width: 6px;
}

.report-elements-list::-webkit-scrollbar-track,
.fields-mini-view::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.report-elements-list::-webkit-scrollbar-thumb,
.fields-mini-view::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.report-elements-list::-webkit-scrollbar-thumb:hover,
.fields-mini-view::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
