<template>
  <!-- Elements drawn by the canvas's own components and scaled to fit (nothing
       on it can be clicked): the help pages' pictures and the preset tiles -->
  <div
    ref="hostRef"
    class="element-preview"
    :style="fitHeight ? undefined : { height: `${box.height * scale + 2 * pad}px` }"
    aria-hidden="true"
  >
    <div
      class="element-preview-stage"
      :style="{
        width: `${box.width}px`,
        height: `${box.height}px`,
        transform: `scale(${scale})`,
      }"
    >
      <ElementFactory
        v-for="(element, index) in placed"
        :key="element.uuid ?? index"
        :element="element"
        :band-index="-1"
        :element-index="index"
        :selected-element="null"
        :selected-elements="[]"
        :editing-element="null"
        :page-number="1"
        :total-pages="12"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import ElementFactory from "../elements/ElementFactory.vue";
import type { DesignElement } from "@/types";

const props = withDefaults(
  defineProps<{
    elements: DesignElement[];
    // Prefix for the drawn copies' ids (never the same as the page's elements)
    idPrefix: string;
    // Room around the elements, and the largest they are drawn
    pad?: number;
    maxScale?: number;
    // true: fit inside the size the parent gives it; false: as wide as the
    // parent, as tall as the scaled elements need
    fitHeight?: boolean;
  }>(),
  { pad: 12, maxScale: 1, fitHeight: false },
);

const hostRef = ref<HTMLElement | null>(null);
const size = ref({ width: 300, height: 200 });
let observer: ResizeObserver | null = null;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) size.value = { width: entry.contentRect.width, height: entry.contentRect.height };
  });
  if (hostRef.value) observer.observe(hostRef.value);
});
onBeforeUnmount(() => observer?.disconnect());

// Placed at the top left, with their own ids
const placed = computed<DesignElement[]>(() =>
  props.elements.map((element) => ({
    ...element,
    uuid: `${props.idPrefix}-${element.uuid ?? crypto.randomUUID()}`,
    x: 0,
    y: 0,
    pageIndex: undefined,
  })),
);

const box = computed(() => ({
  width: Math.max(1, ...placed.value.map((el) => el.x + el.width)),
  height: Math.max(1, ...placed.value.map((el) => el.y + Math.max(el.height, 1))),
}));

const scale = computed(() => {
  const across = (size.value.width - 2 * props.pad) / box.value.width;
  const down = props.fitHeight ? (size.value.height - 2 * props.pad) / box.value.height : Infinity;
  return Math.max(0.01, Math.min(props.maxScale, across, down));
});
</script>

<style scoped>
.element-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.element-preview-stage {
  position: relative;
  flex-shrink: 0;
  transform-origin: center;
  pointer-events: none;
}
</style>
