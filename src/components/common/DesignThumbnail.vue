<template>
  <!-- A small drawing of a page design: shapes in their colours, photos as grey
       blocks, text as bars (plain CSS) -->
  <div class="design-thumb" :style="{ width: `${width}px`, height: `${height}px` }">
    <div
      v-for="(shape, i) in shapes"
      :key="i"
      class="thumb-shape"
      :class="`is-${shape.kind}`"
      :style="shape.style"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DesignElement, FrameElement } from "@/types";

const props = defineProps<{
  elements: DesignElement[];
  // The page's printable area the elements are placed in
  pageWidth: number;
  pageHeight: number;
  width: number;
}>();

const scale = computed(() => props.width / props.pageWidth);
const height = computed(() => Math.round(props.pageHeight * scale.value));

interface Shape {
  kind: "block" | "photo" | "text" | "line";
  style: Record<string, string>;
}

const px = (n: number) => `${Math.round(n * 100) / 100}px`;

function collect(elements: DesignElement[], ox: number, oy: number, out: Shape[]) {
  const s = scale.value;
  for (const el of elements) {
    const x = (ox + el.x) * s;
    const y = (oy + el.y) * s;
    const w = el.width * s;
    const h = el.height * s;
    const box = { left: px(x), top: px(y), width: px(w), height: px(h) };
    switch (el.type) {
      case "frame": {
        if (el.mode === "Opaque" && el.backcolor) out.push({ kind: "block", style: { ...box, background: el.backcolor } });
        collect((el as FrameElement).elements ?? [], ox + el.x, oy + el.y, out);
        break;
      }
      case "rectangle":
      case "ellipse": {
        const pen = (el as any).pen;
        out.push({
          kind: "block",
          style: {
            ...box,
            background: el.mode === "Opaque" && el.backcolor ? el.backcolor : "transparent",
            border: pen?.lineWidth ? `1px solid ${pen.lineColor ?? "#000"}` : "none",
            borderRadius: el.type === "ellipse" ? "50%" : px(((el as any).radius ?? 0) * s),
          },
        });
        break;
      }
      case "image":
        out.push({ kind: "photo", style: box });
        break;
      case "line":
        out.push({ kind: "line", style: { ...box, height: "1px", background: (el as any).lineColor ?? "#9CA3AF" } });
        break;
      case "textField": {
        const size = (el.fontSize ?? 10) * s;
        const barHeight = Math.max(1.5, size * 0.75);
        const barWidth = Math.min(w, Math.max(size * 3, size * 6 + w * 0.15));
        const align = el.textAlignment ?? "Left";
        const left = align === "Center" ? x + (w - barWidth) / 2 : align === "Right" ? x + w - barWidth : x;
        out.push({
          kind: "text",
          style: {
            left: px(left),
            top: px(y + Math.max(0, (Math.min(h, size * 1.45) - barHeight) / 2)),
            width: px(barWidth),
            height: px(barHeight),
            background: el.forecolor ?? "#1F2937",
          },
        });
        break;
      }
      case "contentsList": {
        const list = (el as any).list;
        const rows = Math.max(3, list.entries.length);
        const rh = list.rowHeight * s;
        for (let i = 0; i < Math.min(rows, 8); i++) {
          const top = y + i * rh + rh * 0.35;
          const bar = Math.max(1.5, list.fontSize * s * 0.6);
          if (list.numberFill) {
            out.push({ kind: "block", style: { left: px(x), top: px(y + i * rh + 1), width: px(rh * 1.2), height: px(rh - 2), background: list.numberFill } });
          }
          const start = x + (list.numberWidth > 0 ? list.numberWidth * s : 0);
          out.push({ kind: "text", style: { left: px(start), top: px(top), width: px((w - (start - x)) * 0.45), height: px(bar), background: list.color } });
          out.push({ kind: "text", style: { left: px(x + w - bar * 2), top: px(top), width: px(bar * 2), height: px(bar), background: list.color } });
        }
        break;
      }
      default:
        out.push({ kind: "block", style: { ...box, background: "#E5E7EB" } });
    }
  }
}

const shapes = computed(() => {
  const out: Shape[] = [];
  collect(props.elements, 0, 0, out);
  return out;
});
</script>

<style scoped>
.design-thumb {
  position: relative;
  overflow: hidden;
  background: #ffffff;
}

.thumb-shape {
  position: absolute;
  box-sizing: border-box;
}

.thumb-shape.is-photo {
  background: linear-gradient(160deg, #cbd5e1 0%, #94a3b8 100%);
}

.thumb-shape.is-text {
  border-radius: 1px;
  opacity: 0.8;
}
</style>
