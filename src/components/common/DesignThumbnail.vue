<template>
  <!-- A real preview of a page design: every part drawn at its real size and
       place (texts, colours, lines, number boxes, dotted lines, photo spots),
       then the whole page shrunk to the card -->
  <div class="design-thumb" :style="{ width: `${width}px`, height: `${height}px` }">
    <div
      class="thumb-page"
      :style="{ width: `${pageWidth}px`, height: `${pageHeight}px`, transform: `scale(${scale})`, fontFamily: font }"
    >
      <DesignThumbnailPart v-for="(el, i) in elements" :key="el.uuid ?? i" :element="el" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import DesignThumbnailPart from "./DesignThumbnailPart.vue";
import { resolveReportFont } from "@/config/fonts.config";
import type { DesignElement } from "@/types";

const props = defineProps<{
  elements: DesignElement[];
  // The page's area the elements are placed in
  pageWidth: number;
  pageHeight: number;
  width: number;
}>();

const font = resolveReportFont(undefined);
const scale = computed(() => props.width / props.pageWidth);
const height = computed(() => Math.round(props.pageHeight * scale.value));
</script>

<style scoped>
.design-thumb {
  position: relative;
  overflow: hidden;
  background: #ffffff;
}

.thumb-page {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  pointer-events: none;
  /* Not the card's centring: each part aligns as on the page */
  text-align: left;
}
</style>
