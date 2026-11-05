<template>
  <!-- The watermark of one page, drawn live behind the page's content as the
       PDF prints it (the same drawing as its printed picture). Not clickable:
       it is selected with the "Watermark" button above the page or its tile. -->
  <div
    class="watermark-layer"
    :class="{ 'is-selected': selected, 'is-raised': raised }"
    :style="{ top: `${top}px`, left: `${left}px`, width: `${element.width}px`, height: `${element.height}px` }"
    data-watermark
    aria-hidden="true"
  >
    <canvas ref="canvasEl" class="watermark-canvas"></canvas>
    <span v-if="hint" class="watermark-hint">
      <Stamp :size="14" aria-hidden="true" />
      {{ hint }}
    </span>
    <span v-if="selected" class="watermark-tag">
      <Stamp :size="11" aria-hidden="true" />
      {{ t("watermark.canvasTag") }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Stamp } from "@lucide/vue";
import type { ImageElement } from "@/types";
import { getWatermarkSetup, hasWatermarkContent } from "@/utils/watermark/watermarkElement";
import { drawWatermark, watermarkPictureFor } from "@/utils/watermark/watermarkDraw";
import { watermarkStates } from "@/utils/watermark/watermarkPictures";

// The canvas never needs more pixels than this on its longest side
const MAX_CANVAS_SIDE = 2400;

const props = defineProps<{
  element: ImageElement;
  top: number;
  left: number;
  zoom: number;
  selected: boolean;
  // Drawn over the page's content (while it is being edited)
  raised?: boolean;
}>();

const { t } = useI18n();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const setup = computed(() => getWatermarkSetup(props.element));
const picture = ref<HTMLImageElement | HTMLCanvasElement | null>(null);
const pictureFailed = ref(false);

// What to say on the canvas instead of a watermark (never printed)
const hint = computed(() => {
  const s = setup.value;
  if (s.kind === "picture" && !s.picture) return t("watermark.canvasNoPicture");
  if (s.kind === "picture" && pictureFailed.value) return t("watermark.canvasPictureFailed");
  if (s.kind === "text" && !s.text.trim()) return t("watermark.canvasNoText");
  if (props.element.uuid && watermarkStates[props.element.uuid] === "error") return t("watermark.canvasPictureFailed");
  return "";
});

function draw() {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const { width, height } = props.element;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const scale = Math.max(0.1, Math.min(props.zoom * dpr, MAX_CANVAS_SIDE / Math.max(width, height, 1)));
  const pixelW = Math.max(1, Math.round(width * scale));
  const pixelH = Math.max(1, Math.round(height * scale));
  if (canvas.width !== pixelW) canvas.width = pixelW;
  if (canvas.height !== pixelH) canvas.height = pixelH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, pixelW, pixelH);
  if (!hasWatermarkContent(setup.value)) return;
  ctx.scale(pixelW / width, pixelH / height);
  drawWatermark(ctx, setup.value, width, height, picture.value);
}

// The picture of a picture watermark (grey when asked), loaded once per source
watch(
  () => [setup.value.kind, setup.value.picture, setup.value.grey] as const,
  async ([kind, source, grey]) => {
    pictureFailed.value = false;
    if (kind !== "picture" || !source) {
      picture.value = null;
      draw();
      return;
    }
    try {
      const loaded = await watermarkPictureFor(setup.value);
      if (setup.value.picture === source && setup.value.grey === grey) picture.value = loaded;
    } catch {
      if (setup.value.picture === source) {
        picture.value = null;
        pictureFailed.value = true;
      }
    }
    draw();
  },
  { immediate: true },
);

watch(
  () => [setup.value, props.element.width, props.element.height, props.zoom] as const,
  () => draw(),
  { flush: "post" },
);

// A font that loads later changes how the words measure
const redrawOnFonts = () => draw();
onMounted(() => {
  draw();
  document.fonts?.addEventListener?.("loadingdone", redrawOnFonts);
});
onBeforeUnmount(() => document.fonts?.removeEventListener?.("loadingdone", redrawOnFonts));
</script>

<style scoped>
/* Under the page's sections (they come after it), so what covers it in the
   PDF (filled boxes, table rows) covers it here too */
.watermark-layer {
  position: absolute;
  pointer-events: none;
}

/* Being edited: over the (faded) content, so it can be seen clearly; under
   the page toolbar (z-index 20) */
.watermark-layer.is-raised {
  z-index: 15;
}

.watermark-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.watermark-layer.is-selected {
  outline: 1.5px dashed #6440f4;
  outline-offset: -1px;
}

.watermark-hint {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 80%;
  padding: 6px 12px;
  border: 1px dashed #b5b0c7;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.85);
  color: #6f6a7e;
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
}

/* Bottom corner: the page toolbar sits over the top one */
.watermark-tag {
  position: absolute;
  bottom: 4px;
  right: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #6440f4;
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
}
</style>
