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
  >
    <div class="image-container">
      <img 
        v-if="imageUrl" 
        :src="imageUrl" 
        class="preview-image" 
        :style="imageStyle"
        alt="Preview" 
        @error="handleImageError"
        @dragstart.prevent="" 
      />
      <div v-else class="image-placeholder">
        <svg class="image-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      </div>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseElement from './BaseElement.vue';
import type { ImageElement, SelectedElementInfo } from '../../types';

// Props
const props = defineProps<{
  element: ImageElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
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
}>();

// Flag for image load error
const imageError = ref(false);

// Image style - based on the scaleType property
const imageStyle = computed(() => {
  const scaleType = props.element.scaleType || 'FillFrame';
  const hAlign = props.element.hAlign || 'Center';
  const vAlign = props.element.vAlign || 'Middle';
  
  let objectFit: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
  let objectPosition: string;
  
  switch (scaleType) {
    case 'RealSize':
      objectFit = 'none';
      break;
    case 'RealHeight':
      objectFit = 'contain';
      break;
    case 'Clip':
      objectFit = 'cover';
      break;
    case 'FillFrame':
    default:
      objectFit = 'fill';
      break;
  }
  
  // Handle alignment
  const hAlignMap: Record<string, string> = {
    'Left': 'left',
    'Center': 'center',
    'Right': 'right'
  };
  const vAlignMap: Record<string, string> = {
    'Top': 'top',
    'Middle': 'center',
    'Bottom': 'bottom'
  };
  
  objectPosition = `${hAlignMap[hAlign] || 'center'} ${vAlignMap[vAlign] || 'center'}`;
  
  return {
    objectFit,
    objectPosition
  };
});

// Parse the image expression and extract the URL
const imageUrl = computed(() => {
  if (!props.element.imageExpression || imageError.value) return null;

  const expr = props.element.imageExpression.trim();
  // Check whether it's a string wrapped in double quotes
  if (expr.startsWith('"') && expr.endsWith('"')) {
    // Remove the double quotes
    const url = expr.slice(1, -1).trim();
    // Check whether it's a valid URL format
    try {
      new URL(url);
      return url;
    } catch {
      return null;
    }
  }
  return null;
});

// Handle image load error
const handleImageError = () => {
  imageError.value = true;
};

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
</script>

<style scoped>
.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 2px;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #666;
}
</style>