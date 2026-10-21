<template>
  <!-- A help page's picture: the element built as the library builds it and
       drawn by the canvas's own components, scaled to fit (nothing on it can
       be clicked) -->
  <div v-if="elements.length" ref="hostRef" class="sample" :style="{ height: `${box.height * scale + 2 * PAD}px` }" aria-hidden="true">
    <div
      class="sample-stage"
      :style="{
        width: `${box.width}px`,
        height: `${box.height}px`,
        transform: `scale(${scale})`,
      }"
    >
      <ElementFactory
        v-for="(element, index) in elements"
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
import { useI18n } from "vue-i18n";
import ElementFactory from "../elements/ElementFactory.vue";
import { docPageById, SAMPLE_WIDTH, type DocPageId } from "@/utils/helpDocs";
import type { DesignElement } from "@/types";

const props = defineProps<{ page: DocPageId }>();

// Its width follows the Help window's (the user can resize it)
const hostRef = ref<HTMLElement | null>(null);
const width = ref(300);
let observer: ResizeObserver | null = null;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = entry.contentRect.width;
  });
  if (hostRef.value) observer.observe(hostRef.value);
});
onBeforeUnmount(() => observer?.disconnect());

const { t } = useI18n();

// Room around the sample, and the largest it is drawn
const PAD = 12;
const MAX_SCALE = 1;

// Built again when the page or the language changes; placed at the top left
const elements = computed<DesignElement[]>(() => {
  const build = docPageById(props.page).sample;
  if (!build) return [];
  return build({ availableWidth: SAMPLE_WIDTH, availableHeight: 500, t }).map((element) => ({
    ...element,
    uuid: `help-sample-${element.uuid ?? crypto.randomUUID()}`,
    x: 0,
    y: 0,
    pageIndex: undefined,
  }));
});

const box = computed(() => ({
  width: Math.max(1, ...elements.value.map((el) => el.x + el.width)),
  height: Math.max(1, ...elements.value.map((el) => el.y + Math.max(el.height, 1))),
}));

const scale = computed(() => Math.min(MAX_SCALE, (width.value - 2 * PAD) / box.value.width));
</script>

<style scoped>
.sample {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background:
    linear-gradient(#ffffff, #ffffff) padding-box,
    #ffffff;
  box-shadow: inset 0 0 0 4px #f7f7fa;
}
.sample-stage {
  position: relative;
  flex-shrink: 0;
  transform-origin: center;
  pointer-events: none;
}
</style>
