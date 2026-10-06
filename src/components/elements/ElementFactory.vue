<template>
  <component
    :is="getElementComponent"
    v-bind="commonProps"
    v-on="commonEvents"
    :key="props.element.uuid || `${props.bandIndex}-${props.elementIndex}`"
  />
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { elementRegistry } from './ElementRegistry';
import TextFieldElement from './TextFieldElement.vue';
import ImageElement from './ImageElement.vue';
import LineElement from './LineElement.vue';
import RectangleElement from './RectangleElement.vue';
import EllipseElement from './EllipseElement.vue';
import FrameElement from './FrameElement.vue';
import TableElement from './TableElement.vue';
import ChartElement from './ChartElement.vue';
import BarcodeElement from './BarcodeElement.vue';
import type { 
  DesignElement,
  SelectedElementInfo,
  EditingElementInfo
} from '../../types';

// Component cache - use a plain object instead of a ref to avoid components being converted into reactive objects
const componentCache: Record<string, any> = {
  textField: TextFieldElement,
  image: ImageElement,
  line: LineElement,
  rectangle: RectangleElement,
  ellipse: EllipseElement,
  frame: FrameElement,
  table: TableElement,
  chart: ChartElement,
  barcode: BarcodeElement
};

// Preload components
onMounted(() => {
  // Register default components into the cache
  elementRegistry.getAllElements().forEach(config => {
    if (!componentCache[config.type]) {
      loadComponent(config.type);
    }
  });
});

// Dynamically load a component
async function loadComponent(type: string) {
  try {
    const component = await elementRegistry.loadElementComponent(type);
    if (component) {
      componentCache[type] = component;
    }
  } catch (error) {
    console.error(`Failed to load component for element type ${type}:`, error);
  }
}

// Props
const props = defineProps<{
  element: DesignElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements: {bandIndex: number, elementIndex: number, parentFrameIndex?: number}[]; // Add multi-select support
  editingElement: EditingElementInfo | null;
  isDragging?: boolean;
  reportFontFamily?: string;
  reportFontSize?: number;
  reportIsBold?: boolean;
  reportIsItalic?: boolean;
  reportIsUnderline?: boolean;
  isOutOfBounds?: boolean;
  parentFrameIndex?: number;
  zoomLevel?: number;
  pageNumber?: number;
  totalPages?: number;
}>();

// Emits
const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  finishEditing: [];
  cancelEditing: [];
  checkFields: [fields: string[]];
  'update-jrxml': [];
  'save-state': [];
  autoFitHeight: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  rotate: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Get the corresponding component based on the element type
const getElementComponent = computed(() => {
  const type = props.element.type;

  // Get the component from the cache
  if (componentCache[type]) {
    return componentCache[type];
  }

  // Dynamically load the component
  loadComponent(type);

  // Default component
  return TextFieldElement;
});

// Common props - add a type assertion to ensure compatibility with what the component expects
const commonProps = computed(() => ({
  element: props.element as any, // Use an any assertion to temporarily work around type compatibility issues
  bandIndex: props.bandIndex,
  elementIndex: props.elementIndex,
  selectedElement: props.selectedElement,
  selectedElements: props.selectedElements, // Add multi-select support
  editingElement: props.editingElement,
  isDragging: props.isDragging,
  reportFontFamily: props.reportFontFamily,
  reportFontSize: props.reportFontSize,
  reportIsBold: props.reportIsBold,
  reportIsItalic: props.reportIsItalic,
  reportIsUnderline: props.reportIsUnderline,
  isOutOfBounds: props.isOutOfBounds,
  parentFrameIndex: props.parentFrameIndex,
  zoomLevel: props.zoomLevel,
  pageNumber: props.pageNumber,
  totalPages: props.totalPages
}));



// Common events
const commonEvents = {
  select: (bandIndex: number, elementIndex: number, isMultiSelect = false, parentFrameIndex?: number) => {
    emit('select', bandIndex, elementIndex, isMultiSelect, parentFrameIndex);
  },
  dragStart: (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
    emit('dragStart', event, bandIndex, elementIndex, parentFrameIndex);
  },
  resizeStart: (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string) => {
    emit('resizeStart', event, bandIndex, elementIndex, parentFrameIndex, direction);
  },
  autoFitHeight: (bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
    emit('autoFitHeight', bandIndex, elementIndex, parentFrameIndex);
  },
  rotate: (bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
    emit('rotate', bandIndex, elementIndex, parentFrameIndex);
  },
  contextmenu: (event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
    emit('contextmenu', event, bandIndex, elementIndex, parentFrameIndex);
  },
  startEditing: (bandIndex: number, elementIndex: number, parentFrameIndex?: number) => {
    emit('startEditing', bandIndex, elementIndex, parentFrameIndex);
  },
  finishEditing: () => {
    emit('finishEditing');
  },
  cancelEditing: () => {
    emit('cancelEditing');
  },
  checkFields: (fields: string[]) => {
    emit('checkFields', fields);
  },
  'update-jrxml': () => {
    emit('update-jrxml');
  },
  // Snapshot for undo, sent by an element right before it changes the model itself
  'save-state': () => {
    emit('save-state');
  }
};
</script>