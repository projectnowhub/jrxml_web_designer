<template>
  <!-- A table cell's value as a barcode, drawn like the printed table -->
  <img
    v-if="picture"
    class="barcode-cell"
    :src="picture.uri"
    :style="{ objectPosition: picture.centered ? 'center' : 'left center' }"
    alt=""
    draggable="false"
  />
  <span v-else-if="text" class="barcode-cell-text">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { tableBarcodeText, type TableBarcodeType } from "@/utils/barcode/barcodeTypes";
import { barcodeCellPicture } from "@/utils/barcode/barcodeImage";

const props = defineProps<{
  type: TableBarcodeType;
  value: unknown;
  // Row height in report points
  height: number;
}>();

// Empty values print nothing; while the drawing library loads, the text shows
const text = computed(() => tableBarcodeText(props.type, props.value));
const picture = computed(() => (text.value ? barcodeCellPicture(props.type, text.value, props.height) : null));
</script>

<style scoped>
.barcode-cell {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.barcode-cell-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
