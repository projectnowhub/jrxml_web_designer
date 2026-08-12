<template>
  <div class="element-library">
    <!-- Basic element library -->
    <div class="element-list-container">
      <h3>{{ t("elementLibrary.title") }}</h3>
      <div
        v-for="(categoryElements, categoryKey) in groupedElements"
        :key="categoryKey"
        class="element-category"
      >
        <div class="category-header" @click="toggleCategory(categoryKey)">
          <span class="category-arrow">{{
            expandedCategories[categoryKey] ? "▼" : "▶"
          }}</span>
          <span>{{ categoryLabels[categoryKey] || categoryKey }}</span>
        </div>
        <div v-if="expandedCategories[categoryKey]" class="element-list">
          <div
            v-for="element in categoryElements"
            :key="element.type"
            class="element-item"
            draggable="true"
            @dragstart="handleDragStart($event, element)"
            @dblclick="handleElementDoubleClick(element)"
          >
            <span
              class="element-icon"
              v-html="
                getElementIconSvg(element.type) || getElementIcon(element.type)
              "
            ></span>
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
          ✕
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
            >
              <span
                class="element-icon"
                v-html="
                  getElementIconSvg(element.element.type) ||
                  getElementIcon(element.element.type)
                "
              ></span>
              <span class="element-info">{{
                getElementDisplayInfoWithoutBand(element.element)
              }}</span>
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Report parameters section -->
    <div class="data-parameters-section">
      <div class="section-header">
        <h4>{{ t("elementLibrary.reportParameters") }}</h4>
        <n-button
          class="add-button"
          @click="handleAddParameter"
          type="default"
          quaternary
          circle
          size="small"
          :title="t('elementLibrary.addReportParameter')"
          >+</n-button
        >
      </div>
      <div class="parameters-mini-view">
        <div
          v-for="(param, index) in reportParameters"
          :key="index"
          class="field-mini-item"
          @click="selectElementsByParameterWrapper(param.name)"
        >
          <div class="field-info">
            <span class="field-name">$P{ {{ param.name }} }</span>
            <span class="field-type"
              >({{ getFieldTypeName(param.class) }})</span
            >
          </div>
          <div class="field-actions">
            <n-button
              class="action-button edit-button"
              @click.stop="handleEditParameter(param)"
              type="default"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.editParameter')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            </n-button>
            <n-button
              class="action-button delete-button"
              @click.stop="handleDeleteParameter(param.name)"
              type="error"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.deleteParameter')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </n-button>
          </div>
        </div>
        <div v-if="reportParameters.length === 0" class="empty-state">
          <p>{{ t("elementLibrary.noReportParameters") }}</p>
          <p class="empty-hint">
            {{ t("elementLibrary.clickToAddParameter") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Report variables section -->
    <div class="data-fields-section">
      <div class="section-header">
        <h4>{{ t("elementLibrary.reportVariables") }}</h4>
        <n-button
          class="add-button"
          @click="handleAddVariable"
          type="default"
          quaternary
          circle
          size="small"
          :title="t('elementLibrary.addReportVariable')"
          >+</n-button
        >
      </div>
      <div class="parameters-mini-view">
        <div
          v-for="(variable, index) in reportVariables"
          :key="index"
          class="field-mini-item"
        >
          <div class="field-info">
            <span class="field-name">$V{ {{ variable.name }} }</span>
            <span class="field-type"
              >({{ getFieldTypeName(variable.class) }})</span
            >
          </div>
          <div class="field-actions">
            <n-button
              class="action-button edit-button"
              @click.stop="handleEditVariable(variable)"
              type="default"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.editVariable')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            </n-button>
            <n-button
              class="action-button delete-button"
              @click.stop="handleDeleteVariable(variable.name)"
              type="error"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.deleteVariable')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </n-button>
          </div>
        </div>
        <div v-if="reportVariables.length === 0" class="empty-state">
          <p>{{ t("elementLibrary.noReportVariables") }}</p>
          <p class="empty-hint">{{ t("elementLibrary.clickToAddVariable") }}</p>
        </div>
      </div>
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
          >+</n-button
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
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
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </n-button>
          </div>
        </div>
        <div v-if="reportStyles.length === 0" class="empty-state">
          <p>{{ t("elementLibrary.noReportStyles") }}</p>
          <p class="empty-hint">{{ t("elementLibrary.clickToAddStyle") }}</p>
        </div>
      </div>
    </div>

    <!-- Sub-datasets section -->
    <div class="data-fields-section">
      <div class="section-header">
        <h4>{{ t("elementLibrary.subDatasets") }}</h4>
        <n-button
          class="add-button"
          @click="handleAddSubDataset"
          type="default"
          quaternary
          circle
          size="small"
          :title="t('elementLibrary.addSubDataset')"
          >+</n-button
        >
      </div>
      <div class="fields-mini-view">
        <div
          v-for="(dataset, index) in subDatasets"
          :key="index"
          class="field-mini-item"
        >
          <div class="field-info">
            <span class="field-name">{{ dataset.name }}</span>
          </div>
          <div class="field-actions">
            <n-button
              class="action-button edit-button"
              @click.stop="handleEditSubDataset(dataset, index)"
              type="default"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.editSubDataset')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            </n-button>
            <n-button
              class="action-button delete-button"
              @click.stop="handleDeleteSubDataset(index)"
              type="error"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.deleteSubDataset')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </n-button>
          </div>
        </div>
        <div v-if="subDatasets.length === 0" class="empty-state">
          <p>{{ t("elementLibrary.noSubDatasets") }}</p>
          <p class="empty-hint">
            {{ t("elementLibrary.clickToAddSubDataset") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Data fields section -->
    <div class="data-fields-section">
      <div class="section-header">
        <h4>{{ t("elementLibrary.dataFields") }}</h4>
        <n-button
          class="add-button"
          @click="handleAddField"
          type="default"
          quaternary
          circle
          size="small"
          :title="t('elementLibrary.addDataField')"
          >+</n-button
        >
      </div>
      <div class="fields-mini-view">
        <div
          v-for="field in reportFields"
          :key="field.name"
          class="field-mini-item"
        >
          <div
            class="field-info"
            @click="selectElementsByFieldWrapper(field.name)"
          >
            <span class="field-name">$F{ {{ field.name }} }</span>
            <span class="field-type"
              >({{ getFieldTypeName(field.class) }})</span
            >
          </div>
          <div class="field-actions">
            <n-button
              class="action-button edit-button"
              @click.stop="handleEditField(field)"
              type="default"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.editField')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                />
                <path
                  d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                />
              </svg>
            </n-button>
            <n-button
              class="action-button delete-button"
              @click.stop="handleDeleteField(field.name)"
              type="error"
              quaternary
              circle
              size="small"
              :title="t('elementLibrary.deleteField')"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path
                  d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </n-button>
          </div>
        </div>
        <div v-if="reportFields.length === 0" class="empty-state">
          <p>{{ t("elementLibrary.noDataFields") }}</p>
          <p class="empty-hint">{{ t("elementLibrary.clickToAddField") }}</p>
        </div>
      </div>
    </div>

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
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import ConfirmModal from "./modals/ConfirmModal.vue";
import { ElementRegistry } from "./elements/ElementRegistry";
import type {
  DesignElement,
  StaticTextElement,
  TextFieldElement,
  ReportField,
  ReportParameter,
  ReportVariable,
  ReportStyle,
} from "../types";
import {
  getElementDisplayInfoWithoutBand,
  getElementIcon,
  getElementIconSvg,
  getElementKey,
  isElementSelected,
  selectElementFromList,
  selectElementsByField,
  selectElementsByParameter,
} from "../utils/elementUtils";

const { t } = useI18n();

// Define the sub-dataset type
interface SubDataset {
  name: string;
  uuid: string;
}

// Define component props
interface Props {
  elements: Array<{ type: string; name: string }>;
  reportFields: ReportField[];
  reportParameters: ReportParameter[];
  reportVariables: ReportVariable[];
  reportStyles: ReportStyle[];
  bands: Array<{ type: string; name?: string; elements: DesignElement[] }>;
  selectedElement: any;
  subDatasets?: SubDataset[];
}

// Define component events
interface Emits {
  (e: "drag-start", event: DragEvent, element: any): void;
  (e: "element-double-click", element: any): void;
  (
    e: "select-element",
    bandIndex: number,
    elementIndex: number,
    isMultiSelect?: boolean,
    parentFrameIndex?: number,
  ): void;
  (e: "add-field"): void;
  (e: "edit-field", field: ReportField): void;
  (e: "delete-field", fieldName: string): void;
  (e: "add-parameter"): void;
  (e: "edit-parameter", parameter: ReportParameter): void;
  (e: "delete-parameter", parameterName: string): void;
  (e: "add-variable"): void;
  (e: "edit-variable", variable: ReportVariable): void;
  (e: "delete-variable", variableName: string): void;
  (e: "add-style"): void;
  (e: "edit-style", style: ReportStyle): void;
  (e: "delete-style", styleName: string): void;
  (e: "add-sub-dataset"): void;
  (e: "edit-sub-dataset", dataset: SubDataset, index: number): void;
  (e: "delete-sub-dataset", index: number): void;
  (
    e: "delete-element",
    bandIndex: number,
    elementIndex: number,
    parentFrameIndex?: number,
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
  subDatasets: () => [],
});

const emit = defineEmits<Emits>();

// Element filter text
const elementFilterText = ref("");

// Element group expanded state
const expandedCategories = ref<Record<string, boolean>>({
  basic: true,
  composite: true,
});
const toggleCategory = (key: string) => {
  expandedCategories.value[key] = !expandedCategories.value[key];
};

const categoryLabels = computed<Record<string, string>>(() => ({
  basic: t("elementLibrary.basicElements"),
  composite: t("elementLibrary.compositeElements"),
}));

const groupedElements = computed(() => {
  const registry = ElementRegistry.getInstance();
  const categories: Record<string, any[]> = { basic: [], composite: [] };
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
          (element.type === "staticText" &&
            (element as StaticTextElement).text &&
            ((element as StaticTextElement).text || "")
              .toLowerCase()
              .includes(elementFilterText.value.toLowerCase())) ||
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
  const bandNameKey =
    bandType as keyof (typeof import("../locales/zh.json"))["bandNames"];
  // We can't directly access the JSON type safely here without more complex TS setup,
  // but we can assume the key exists if it's a valid BandType.
  // Using t() is the correct way.
  return t(`bandNames.${bandType}`);
}

// List of allowed field types
const allowedFieldTypes = [
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
];

// Get the localized field type name
function getFieldTypeName(className: string): string {
  const fieldType = allowedFieldTypes.find((type) => type.value === className);
  return fieldType ? fieldType.label : className;
}

// Handle drag start
function handleDragStart(event: DragEvent, element: any): void {
  emit("drag-start", event, element);
}

// Handle element double-click
function handleElementDoubleClick(element: any): void {
  emit("element-double-click", element);
}

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

// Select elements by parameter (wrapper function)
function selectElementsByParameterWrapper(paramName: string): void {
  selectElementsByParameter(props.bands, paramName, selectElement);
}

// Select elements by field (wrapper function)
function selectElementsByFieldWrapper(fieldName: string): void {
  selectElementsByField(props.bands, fieldName, selectElement);
}

// Handle adding a field
function handleAddField(): void {
  emit("add-field");
}

// Handle editing a field
function handleEditField(field: ReportField): void {
  emit("edit-field", field);
}

// Handle deleting a field
function handleDeleteField(fieldName: string): void {
  emit("delete-field", fieldName);
}

// Handle adding a parameter
function handleAddParameter(): void {
  emit("add-parameter");
}

// Handle editing a parameter
function handleEditParameter(parameter: ReportParameter): void {
  emit("edit-parameter", parameter);
}

// Handle deleting a parameter
function handleDeleteParameter(parameterName: string): void {
  emit("delete-parameter", parameterName);
}

// Handle adding a variable
function handleAddVariable(): void {
  emit("add-variable");
}

// Handle editing a variable
function handleEditVariable(variable: ReportVariable): void {
  emit("edit-variable", variable);
}

// Handle deleting a variable
function handleDeleteVariable(variableName: string): void {
  emit("delete-variable", variableName);
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

// Handle adding a sub-dataset
function handleAddSubDataset(): void {
  emit("add-sub-dataset");
}

// Handle editing a sub-dataset
function handleEditSubDataset(dataset: any, index: number): void {
  emit("edit-sub-dataset", dataset, index);
}

// Handle deleting a sub-dataset
function handleDeleteSubDataset(index: number): void {
  emit("delete-sub-dataset", index);
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
  font-size: 10px;
  width: 12px;
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
.data-parameters-section,
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

.parameters-mini-view,
.fields-mini-view {
  max-height: 150px;
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
.parameters-mini-view::-webkit-scrollbar,
.fields-mini-view::-webkit-scrollbar {
  width: 6px;
}

.report-elements-list::-webkit-scrollbar-track,
.parameters-mini-view::-webkit-scrollbar-track,
.fields-mini-view::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.report-elements-list::-webkit-scrollbar-thumb,
.parameters-mini-view::-webkit-scrollbar-thumb,
.fields-mini-view::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.report-elements-list::-webkit-scrollbar-thumb:hover,
.parameters-mini-view::-webkit-scrollbar-thumb:hover,
.fields-mini-view::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
