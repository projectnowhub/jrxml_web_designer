<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :selected-elements="selectedElements"
    :editing-element="editingElement"
    :is-dragging="isDragging"
    :is-out-of-bounds="isOutOfBounds"
    :parent-frame-index="parentFrameIndex"
    :zoom-level="zoomLevel"
    @select="(b, e, m, p) => emit('select', b, e, m, p)"
    @drag-start="(ev, b, e, p) => emit('dragStart', ev, b, e, p)"
    @resize-start="(ev, b, e, p, d) => emit('resizeStart', ev, b, e, p, d)"
    @contextmenu="(ev, b, e, p) => emit('contextmenu', ev, b, e, p)"
    @rotate="(b, e, p) => emit('rotate', b, e, p)"
    @save-state="emit('save-state')"
  >
    <div class="barcode-element">
      <div class="barcode-content" :style="rotationStyle">
        <component
          :is="element.barcodeType === 'QRCode' || element.barcodeType === 'DataMatrix' ? QrCode : Barcode"
          class="barcode-icon"
          :stroke-width="1.5"
        />
        <span class="barcode-label">{{ element.barcodeType }}</span>
      </div>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Barcode, QrCode } from '@lucide/vue';
import BaseElement from './BaseElement.vue';
import type { BarcodeElement, SelectedElementInfo, EditingElementInfo } from '../../types';

const props = defineProps<{
  element: BarcodeElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements: {bandIndex: number, elementIndex: number, parentFrameIndex?: number}[];
  editingElement: EditingElementInfo | null;
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  parentFrameIndex?: number;
  zoomLevel?: number;
}>();

const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  rotate: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  'save-state': [];
}>();

// Visual 90-degree step rotation style
const rotationStyle = computed(() => {
  const rot = props.element.rotation;
  if (!rot || rot === 'None') return {};

  const w = props.element.width;
  const h = props.element.height;

  if (rot === 'Right') {
    return {
      position: 'absolute' as const,
      width: `${h}px`,
      height: `${w}px`,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%) rotate(90deg)',
      transformOrigin: 'center center',
    };
  }
  if (rot === 'Left') {
    return {
      position: 'absolute' as const,
      width: `${h}px`,
      height: `${w}px`,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%) rotate(-90deg)',
      transformOrigin: 'center center',
    };
  }
  if (rot === 'UpsideDown') {
    return {
      width: '100%',
      height: '100%',
      transform: 'rotate(180deg)',
      transformOrigin: 'center center',
    };
  }
  return {};
});
</script>

<style scoped>
.barcode-element {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f0ff;
  border: 1px dashed #d3adf7;
  border-radius: 2px;
}

.barcode-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #722ed1;
}

.barcode-icon {
  width: 24px;
  height: 24px;
}

.barcode-label {
  font-size: 10px;
  font-weight: 500;
}
</style>
