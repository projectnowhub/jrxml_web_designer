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
        v-model="editValue" 
        type="text" 
        class="inline-edit-input"
        @blur="handleFinishEditing"
        @keyup.enter="handleFinishEditing"
        @keyup.esc="handleCancelEditing"
        ref="editInput"
        placeholder="Enter text"
      />
    </template>
    <template v-else>
      <span>{{ displayText }}</span>
    </template>
  </BaseElement>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseElement from './BaseElement.vue';
import type { TextFieldElement, SelectedElementInfo, EditingElementInfo } from '../../types';

const { t } = useI18n();

// Props
const props = defineProps<{
  element: TextFieldElement;
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
  pageNumber?: number;
  totalPages?: number;
}>();

// Emits
const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  updateElement: [];
  checkFields: [fields: string[]];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  finishEditing: [];
  cancelEditing: [];
}>();

// Refs
const editInput = ref<HTMLInputElement | null>(null);
const editValue = ref('');

// Whether currently editing
const isEditing = computed(() => {
  return props.editingElement &&
         props.editingElement.bandIndex === props.bandIndex &&
         props.editingElement.elementIndex === props.elementIndex &&
         props.editingElement.parentFrameIndex === props.parentFrameIndex;
});

// Focus the input and sync value when entering edit mode
watch(() => isEditing.value, (newVal) => {
  if (newVal) {
    const raw = props.element.expression || '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      editValue.value = trimmed.slice(1, -1);
    } else {
      editValue.value = raw;
    }
    if (editInput.value) {
      setTimeout(() => {
        editInput.value?.focus();
        editInput.value?.select();
      }, 10);
    }
  }
});

// Display text
const displayText = computed(() => {
  if (props.element.expression) {
    const expr = props.element.expression;
    if (props.pageNumber !== undefined && expr.includes('$V{PAGE_NUMBER}')) {
      const pNum = String(props.pageNumber);
      const totalP = String(props.totalPages || props.pageNumber);

      if (expr.trim() === '$V{PAGE_NUMBER}') {
        return pNum;
      }

      let evaluated = expr;
      if (evaluated.includes('" of "') || evaluated.includes('" / "') || evaluated.includes('"/"')) {
        let count = 0;
        evaluated = evaluated.replace(/\$V\{PAGE_NUMBER\}/g, () => {
          count++;
          return count === 1 ? pNum : totalP;
        });
      } else {
        evaluated = evaluated.replace(/\$V\{PAGE_NUMBER\}/g, pNum);
      }

      evaluated = evaluated
        .replace(/"\s*\+\s*/g, '')
        .replace(/\s*\+\s*"/g, '')
        .replace(/\s*\+\s*/g, ' ')
        .replace(/^"|"$/g, '');
      return evaluated;
    }

    // Strip surrounding quotes for plain literal strings so user sees clean text
    const trimmed = expr.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      return trimmed.slice(1, -1);
    }

    return expr;
  }
  return t('properties.defaultTextFieldExpression') || 'Text';
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

// Start editing the expression
const handleStartEditing = () => {
  emit('startEditing', props.bandIndex, props.elementIndex, props.parentFrameIndex);
};

// Finish editing
const handleFinishEditing = () => {
  const val = editValue.value.trim();
  if (!val) {
    props.element.expression = '""';
  } else if (val.startsWith('$') || (val.startsWith('"') && val.endsWith('"')) || val.includes('+')) {
    props.element.expression = val;
  } else {
    props.element.expression = `"${val}"`;
  }

  // Extract all field references $F{fieldName} from the expression
  const currentExpression = props.element.expression || '';
  const fieldReferences: string[] = [];
  const fieldRegex = /\$F\{([^}]+)\}/g;
  let match;
  while ((match = fieldRegex.exec(currentExpression)) !== null) {
    if (match[1]) {
      fieldReferences.push(match[1]);
    }
  }

  // Send field references to the parent component for checking
  if (fieldReferences.length > 0) {
    emit('checkFields', fieldReferences);
  }

  // Trigger the parent component to update the JRXML
  emit('updateElement');
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
