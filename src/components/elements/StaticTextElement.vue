<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :is-dragging="isDragging"
    :is-out-of-bounds="isOutOfBounds"
    :report-font-family="reportFontFamily"
    :report-font-size="reportFontSize"
    :report-is-bold="reportIsBold"
    :report-is-italic="reportIsItalic"
    :report-is-underline="reportIsUnderline"
    :parent-frame-index="parentFrameIndex"
    @select="handleSelect"
    @drag-start="handleDragStart"
    @resize-start="handleResizeStart"
    @start-editing="handleStartEditing"
  >
    <template v-if="isEditing">
      <input 
        v-model="element.text" 
        type="text" 
        class="inline-edit-input"
        @blur="handleFinishEditing"
        @keyup.enter="handleFinishEditing"
        @keyup.esc="handleCancelEditing"
        ref="editInput"
      />
    </template>
    <template v-else>
      <span>{{ element.text || t('properties.defaultStaticText') }}</span>
    </template>
  </BaseElement>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseElement from './BaseElement.vue';
import type { StaticTextElement, SelectedElementInfo, EditingElementInfo } from '../../types';

const { t } = useI18n();

// Props
const props = defineProps<{
  element: StaticTextElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  editingElement: EditingElementInfo | null;
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  reportFontFamily?: string;
  reportFontSize?: number;
  reportIsBold?: boolean;
  reportIsItalic?: boolean;
  reportIsUnderline?: boolean;
  parentFrameIndex?: number;
}>();

// Emits
const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  finishEditing: [];
  cancelEditing: [];
}>();

// Refs
const editInput = ref<HTMLInputElement | null>(null);

// Whether currently editing
const isEditing = computed(() => {
  return props.editingElement &&
         props.editingElement.bandIndex === props.bandIndex &&
         props.editingElement.elementIndex === props.elementIndex &&
         props.editingElement.parentFrameIndex === props.parentFrameIndex;
});

// Focus the input when entering edit mode
watch(() => isEditing.value, (newVal) => {
  if (newVal && editInput.value) {
    setTimeout(() => {
      editInput.value?.focus();
      editInput.value?.select();
    }, 10);
  }
});

// Handle selection
const handleSelect = (bandIndex: number, elementIndex: number, isMultiSelect?: boolean) => {
  emit('select', bandIndex, elementIndex, isMultiSelect, props.parentFrameIndex);
};

// Handle drag start
const handleDragStart = (event: MouseEvent, bandIndex: number, elementIndex: number) => {
  emit('dragStart', event, bandIndex, elementIndex, props.parentFrameIndex);
};

// Handle resize start
const handleResizeStart = (event: MouseEvent, bandIndex: number, elementIndex: number) => {
  emit('resizeStart', event, bandIndex, elementIndex, props.parentFrameIndex);
};

// Start editing
const handleStartEditing = () => {
  // Emit the start-editing event; the parent component controls entering edit mode
  emit('startEditing', props.bandIndex, props.elementIndex, props.parentFrameIndex);
};

// Finish editing
const handleFinishEditing = () => {
  // Only trigger an update when the text has actually changed (extra validation logic can be added here if needed)
  emit('finishEditing');
};

// Cancel editing
const handleCancelEditing = () => {
  emit('cancelEditing');
};
</script>

<style scoped>
.inline-edit-input {
  width: 100%;
  padding: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  font-weight: inherit;
  font-style: inherit;
  text-decoration: inherit;
}
</style>