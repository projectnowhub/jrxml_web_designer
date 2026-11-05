<template>
  <!-- A watermark drawn as an element: the help pages' pictures. On the page
       it has its own layer behind the content (designer/WatermarkLayer.vue). -->
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :selected-elements="selectedElements"
    :is-dragging="isDragging"
    :is-out-of-bounds="isOutOfBounds"
    :parent-frame-index="parentFrameIndex"
  >
    <WatermarkLayer :element="element" :top="0" :left="0" :zoom="zoomLevel ?? 1" :selected="false" />
  </BaseElement>
</template>

<script setup lang="ts">
import BaseElement from "./BaseElement.vue";
import WatermarkLayer from "../designer/WatermarkLayer.vue";
import type { ImageElement, SelectedElementInfo } from "../../types";

defineProps<{
  element: ImageElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements?: { bandIndex: number; elementIndex: number; parentFrameIndex?: number }[];
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  parentFrameIndex?: number;
  zoomLevel?: number;
}>();
</script>
