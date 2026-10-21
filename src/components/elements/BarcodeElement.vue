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
  >
    <div class="barcode-element" :class="{ 'is-placeholder': view.state !== 'ready' }">
      <!-- Drawn the way the report prints it: filling the box (a QR code centred in it) -->
      <div class="barcode-content" :style="rotationStyle">
        <img
          v-if="picture"
          class="barcode-picture"
          :src="picture.uri"
          :style="{ objectPosition: picture.centered ? 'center' : anchor }"
          alt=""
          draggable="false"
        />
        <Barcode v-else class="barcode-loading" :size="24" :stroke-width="1.5" aria-hidden="true" />
      </div>
      <span v-if="view.state !== 'ready'" class="barcode-badge" :class="`is-${view.state}`" :title="view.hint">
        {{ t(`barcode.states.${view.state}`) }}
      </span>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Barcode } from '@lucide/vue';
import BaseElement from './BaseElement.vue';
import type { BarcodeElement, SelectedElementInfo, EditingElementInfo } from '../../types';
import { barcodeTypeInfo, checkBarcodeValue, readBarcodeValue } from '../../utils/barcode/barcodeTypes';
import { barcodePicture } from '../../utils/barcode/barcodeImage';

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
}>();

const { t } = useI18n();

// The value it prints; a sample (faded, with a badge) when it comes from the
// data or doesn't fit the type, since the report would fail on it
const view = computed(() => {
  const type = props.element.barcodeType;
  const value = readBarcodeValue(props.element.codeExpression);
  const sample = barcodeTypeInfo(type).sample;
  if (value.isExpression) return { state: 'sample', text: sample, hint: t('barcode.states.sampleHint') };
  const problem = checkBarcodeValue(type, value.text);
  if (!problem) return { state: 'ready', text: value.text, hint: '' };
  return {
    state: problem.key === 'empty' ? 'empty' : 'invalid',
    text: sample,
    hint: t(`barcode.problems.${problem.key}`, problem.params ?? {}),
  };
});

// Turned a quarter, the barcode's height runs along the box width
// QR codes aren't turned (JasperReports has no orientation for them)
const rotation = computed(() => (props.element.barcodeType === 'QRCode' ? 'None' : props.element.rotation || 'None'));
const isSideways = computed(() => rotation.value === 'Right' || rotation.value === 'Left');

// Sized to fill the box, like the printed barcode
const picture = computed(() =>
  barcodePicture(
    props.element.barcodeType,
    view.value.text,
    isSideways.value ? props.element.height : props.element.width,
    isSideways.value ? props.element.width : props.element.height,
  ),
);

// The corner that ends up top left once the content is turned
const anchor = computed(() => {
  switch (rotation.value) {
    case 'Right':
      return 'left bottom';
    case 'Left':
      return 'right top';
    case 'UpsideDown':
      return 'right bottom';
    default:
      return 'left top';
  }
});

// Visual 90-degree step rotation style
const rotationStyle = computed(() => {
  const rot = rotation.value;
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
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.barcode-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Keeps its shape inside the box, like the printed image (RetainShape) */
.barcode-picture {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.barcode-loading {
  color: #c4c8cf;
}

/* A sample never prints: drawn faded */
.barcode-element.is-placeholder .barcode-picture {
  opacity: 0.4;
}

.barcode-badge {
  position: absolute;
  top: 3px;
  right: 3px;
  max-width: calc(100% - 6px);
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 1px 6px;
  font-size: 9px;
  line-height: 14px;
  color: #4b5563;
  background: rgba(255, 255, 255, 0.92);
  border: 1px dashed #c7cbd1;
  border-radius: 7px;
  white-space: nowrap;
}

.barcode-badge.is-invalid,
.barcode-badge.is-empty {
  color: #b91c1c;
  border-color: #fca5a5;
}
</style>
