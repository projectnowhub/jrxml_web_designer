<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :selected-elements="selectedElements"
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
    @auto-fit-height="handleAutoFit"
  >
    <div
      class="text-element-inner"
      :style="{ justifyContent: verticalFlexJustify }"
    >
      <textarea
        v-if="isEditing"
        ref="editInput"
        v-model="editValue"
        class="inline-edit-textarea"
        :style="typographyStyle"
        placeholder="Enter text..."
        @keydown="handleKeyDown"
        @blur="handleFinishEditing"
      ></textarea>
      <div
        v-else
        ref="contentContainer"
        class="text-content-display"
        :class="{ 'is-placeholder': !hasContent }"
        :style="typographyStyle"
      >
        {{ hasContent ? displayText : (t('properties.defaultTextFieldExpression') || 'Text') }}
      </div>
    </div>

    <!-- Overflow Warning Badge (Option A) -->
    <div
      v-if="showOverflowBadge"
      class="text-overflow-badge"
      title="Text exceeds element height. Click to auto-fit height"
      @click.stop="handleAutoFit"
      @mousedown.stop
    >
      <span class="overflow-badge-icon">⚠</span>
      <span class="overflow-badge-text">Fit</span>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue';
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
  selectedElements?: {bandIndex: number, elementIndex: number, parentFrameIndex?: number, uuid?: string}[];
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
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  updateElement: [];
  'update-jrxml': [];
  checkFields: [fields: string[]];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  finishEditing: [];
  cancelEditing: [];
  autoFitHeight: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Refs
const editInput = ref<HTMLTextAreaElement | null>(null);
const contentContainer = ref<HTMLElement | null>(null);
const editValue = ref('');
const originalValue = ref('');
const isOverflowing = ref(false);

// Clean display text (preserves linebreaks, strips literal quotes)
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
      return evaluated.replace(/\\n/g, '\n');
    }

    // Strip surrounding quotes for plain literal strings so user sees clean text
    const trimmed = expr.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      return trimmed.slice(1, -1).replace(/\\n/g, '\n');
    }

    return expr.replace(/\\n/g, '\n');
  }
  return '';
});

const hasContent = computed(() => {
  return displayText.value.trim().length > 0;
});

// Whether currently editing
const isEditing = computed(() => {
  return (
    props.editingElement !== null &&
    props.editingElement.bandIndex === props.bandIndex &&
    props.editingElement.elementIndex === props.elementIndex &&
    props.editingElement.parentFrameIndex === props.parentFrameIndex
  );
});

// Whether currently selected
const isSelected = computed(() => {
  if (props.element.uuid) {
    if (props.selectedElements && props.selectedElements.length > 0) {
      return props.selectedElements.some((el) => el.uuid === props.element.uuid);
    }
    if (props.selectedElement && props.selectedElement.uuid) {
      return props.selectedElement.uuid === props.element.uuid;
    }
  }

  const getPFI = (pfi: number | undefined) => (pfi === undefined ? -1 : pfi);
  const currentPFI = getPFI(props.parentFrameIndex);

  if (props.selectedElements && props.selectedElements.length > 0) {
    return props.selectedElements.some(
      (el) =>
        el.bandIndex === props.bandIndex &&
        el.elementIndex === props.elementIndex &&
        getPFI(el.parentFrameIndex) === currentPFI,
    );
  }

  return (
    props.selectedElement &&
    props.selectedElement.bandIndex === props.bandIndex &&
    props.selectedElement.elementIndex === props.elementIndex &&
    getPFI(props.selectedElement.parentFrameIndex) === currentPFI
  );
});

// Show overflow badge only when element is selected and content is clipped
const showOverflowBadge = computed(() => {
  return isSelected.value && isOverflowing.value && !isEditing.value;
});

// Check if content overflows current element height
const checkOverflow = () => {
  if (contentContainer.value && !isEditing.value) {
    isOverflowing.value = contentContainer.value.scrollHeight > props.element.height + 2;
  } else {
    isOverflowing.value = false;
  }
};

watch(
  [
    () => displayText.value,
    () => props.element.width,
    () => props.element.height,
    () => props.element.fontSize,
  ],
  () => {
    nextTick(checkOverflow);
  },
  { flush: 'post' },
);

onMounted(() => {
  nextTick(checkOverflow);
});

// Vertical alignment flex mapping
const verticalFlexJustify = computed(() => {
  if (props.element.verticalAlignment === 'Middle') return 'center';
  if (props.element.verticalAlignment === 'Bottom') return 'flex-end';
  return 'flex-start';
});

// Full typography styling matching BaseElement
const typographyStyle = computed(() => {
  const textAlign =
    props.element.textAlignment === 'Justified'
      ? 'justify'
      : props.element.textAlignment?.toLowerCase() || 'left';

  return {
    fontFamily: props.element.fontFamily || props.reportFontFamily || 'SansSerif',
    fontSize: props.element.fontSize
      ? `${props.element.fontSize}px`
      : props.reportFontSize
        ? `${props.reportFontSize}px`
        : '10px',
    fontWeight:
      props.element.isBold === true ||
      (props.element.isBold === undefined && props.reportIsBold)
        ? 'bold'
        : 'normal',
    fontStyle:
      props.element.isItalic === true ||
      (props.element.isItalic === undefined && props.reportIsItalic)
        ? 'italic'
        : 'normal',
    textDecoration:
      props.element.isUnderline === true ||
      (props.element.isUnderline === undefined && props.reportIsUnderline)
        ? 'underline'
        : 'none',
    color: props.element.forecolor || 'inherit',
    textAlign: textAlign as any,
    lineHeight: '1.3',
  };
});

// Focus the textarea and sync value when entering edit mode
watch(
  () => isEditing.value,
  (newVal) => {
    if (newVal) {
      const raw = props.element.expression || '';
      const trimmed = raw.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
        editValue.value = trimmed.slice(1, -1).replace(/\\n/g, '\n');
      } else {
        editValue.value = raw.replace(/\\n/g, '\n');
      }
      originalValue.value = editValue.value;
      nextTick(() => {
        if (editInput.value) {
          editInput.value.focus();
          const len = editValue.value.length;
          editInput.value.setSelectionRange(len, len);
        }
      });
    }
  },
);

// Handle selection
const handleSelect = (bandIndex: number, elementIndex: number, isMultiSelect?: boolean) => {
  emit('select', bandIndex, elementIndex, isMultiSelect, props.parentFrameIndex);
};

// Handle drag start
const handleDragStart = (event: MouseEvent, bandIndex: number, elementIndex: number) => {
  emit('dragStart', event, bandIndex, elementIndex, props.parentFrameIndex);
};

// Handle resize start
const handleResizeStart = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
  direction?: string,
) => {
  emit('resizeStart', event, bandIndex, elementIndex, parentFrameIndex, direction);
};

// Start editing the expression
const handleStartEditing = () => {
  emit('startEditing', props.bandIndex, props.elementIndex, props.parentFrameIndex);
};

// Keyboard handling in edit mode (Google Docs style)
const handleKeyDown = (e: KeyboardEvent) => {
  // Stop propagation to prevent canvas global listeners (Delete element, undo, etc.)
  e.stopPropagation();

  if (e.key === 'Escape') {
    e.preventDefault();
    handleCancelEditing();
    return;
  }

  if (e.key === 'Enter') {
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+Enter or Cmd+Enter: commit changes
      e.preventDefault();
      handleFinishEditing();
    }
    // Normal Enter or Shift+Enter: naturally inserts a newline \n in textarea
  }
};

// Finish editing
const handleFinishEditing = () => {
  if (!isEditing.value) return;
  const val = editValue.value;
  const trimmed = val.trim();
  if (!trimmed) {
    props.element.expression = '""';
  } else if (
    trimmed.startsWith('$') ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    trimmed.includes('+')
  ) {
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

  // Trigger parent components to update JRXML and finish editing
  emit('updateElement');
  emit('update-jrxml');
  emit('finishEditing');
  nextTick(checkOverflow);
};

// Cancel editing
const handleCancelEditing = () => {
  editValue.value = originalValue.value;
  emit('cancelEditing');
  nextTick(checkOverflow);
};

// Auto-fit height to content
const handleAutoFit = () => {
  if (!contentContainer.value) return;
  const requiredHeight = Math.ceil(contentContainer.value.scrollHeight);
  if (requiredHeight > 0) {
    props.element.height = Math.max(requiredHeight, 15);
    nextTick(() => {
      checkOverflow();
      emit('updateElement');
      emit('update-jrxml');
    });
  }
};
</script>

<style scoped>
.text-element-inner {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.text-content-display {
  width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
  user-select: none;
}

.text-content-display.is-placeholder {
  opacity: 0.5;
  font-style: italic;
}

.inline-edit-textarea {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  border: none;
  outline: none;
  background: transparent;
  resize: none;
  overflow-y: auto;
  overflow-x: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  cursor: text;
}

/* Slim scrollbar for inline edit textarea */
.inline-edit-textarea::-webkit-scrollbar {
  width: 4px;
}
.inline-edit-textarea::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.text-overflow-badge {
  position: absolute;
  bottom: -22px;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ff4d4f;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 3px;
  cursor: pointer;
  z-index: 30;
  box-shadow: 0 2px 6px rgba(255, 77, 79, 0.45);
  user-select: none;
  transition:
    transform 0.15s ease,
    background-color 0.15s ease;
  line-height: 1.2;
}

.text-overflow-badge:hover {
  background: #ff7875;
  transform: scale(1.05);
}

.overflow-badge-icon {
  font-size: 11px;
}

.overflow-badge-text {
  font-size: 10px;
  letter-spacing: 0.5px;
}
</style>
