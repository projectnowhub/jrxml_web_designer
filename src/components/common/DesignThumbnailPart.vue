<template>
  <!-- One part of a design preview, at its real size (the page is scaled) -->
  <div class="part" :style="boxStyle">
    <template v-if="element.type === 'frame'">
      <DesignThumbnailPart v-for="(child, i) in children" :key="child.uuid ?? i" :element="child" />
    </template>

    <div v-else-if="element.type === 'image'" class="part-photo">
      <ImageIcon :size="Math.max(12, Math.min(element.width, element.height) * 0.3)" :stroke-width="1.5" aria-hidden="true" />
    </div>

    <div v-else-if="element.type === 'textField'" class="part-text" :style="textStyle">
      <span>{{ textValue }}</span>
    </div>

    <div v-else-if="element.type === 'contentsList'" class="part-list" :style="{ color: list!.color, fontSize: `${list!.fontSize}px` }">
      <div v-for="(entry, i) in list!.entries" :key="i" class="list-row" :style="{ height: `${list!.rowHeight}px` }">
        <span
          v-if="list!.numberWidth > 0"
          class="list-number"
          :class="{ 'is-boxed': !!list!.numberFill && entry.level === 0 }"
          :style="numberStyle(entry.level)"
        >{{ numbers[i] }}</span>
        <span class="list-title" :style="{ fontWeight: weight(entry.level), marginLeft: entry.level === 1 ? '18px' : '0' }">
          {{ entry.title }}{{ list!.leader ? LEADER_DOTS : "" }}
        </span>
        <span class="list-page" :style="{ width: `${list!.pageWidth}px`, fontWeight: weight(entry.level) }">{{ entry.page }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Image as ImageIcon } from "@lucide/vue";
import { LEADER_DOTS, listNumbers, SIDE_PAD } from "@/utils/contentsList";
import { resolveLegacyDateSample } from "@/utils/autoDate";
import { dateText, getDateSetup, isDateElement } from "@/utils/dateElement";
import type { ContentsListElement, DesignElement, FrameElement } from "@/types";

defineOptions({ name: "DesignThumbnailPart" });

const props = defineProps<{ element: DesignElement }>();
const el = computed(() => props.element as any);
const children = computed(() => (props.element as FrameElement).elements ?? []);
const list = computed(() => (props.element.type === "contentsList" ? (props.element as ContentsListElement).list : null));
const numbers = computed(() => (list.value ? listNumbers(list.value) : []));

const boxStyle = computed(() => {
  const e = el.value;
  const style: Record<string, string> = {
    left: `${e.x}px`,
    top: `${e.y}px`,
    width: `${e.width}px`,
    height: `${e.height}px`,
  };
  const filled = e.mode === "Opaque" && e.backcolor;
  if (e.type === "rectangle" || e.type === "ellipse" || e.type === "frame") {
    if (filled) style.background = e.backcolor;
    const pen = e.pen ?? e.box?.pen;
    if (pen?.lineWidth) style.border = `${pen.lineWidth}px solid ${pen.lineColor ?? "#000"}`;
    if (e.type === "ellipse") style.borderRadius = "50%";
    else if (e.radius) style.borderRadius = `${e.radius}px`;
  } else if (e.type === "line") {
    style.borderTop = `${e.pen?.lineWidth ?? 1}px solid ${e.pen?.lineColor ?? e.forecolor ?? "#9CA3AF"}`;
    style.height = "0";
  } else if (e.type === "textField" && filled) {
    style.background = e.backcolor;
  }
  return style;
});

// What a text shows
const textValue = computed(() => {
  const e = el.value;
  if (isDateElement(e)) return dateText(getDateSetup(e));
  const expr = String(e.expression ?? "").trim();
  if (expr.includes("SimpleDateFormat") && expr.includes("java.util.Date")) {
    return resolveLegacyDateSample(expr);
  }
  const literal = expr.startsWith('"') && expr.endsWith('"') ? expr.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"') : expr;
  return e.markup === "html" ? literal.replace(/<[^>]+>/g, "") : literal;
});

const textStyle = computed(() => {
  const e = el.value;
  return {
    fontSize: `${e.fontSize ?? 10}px`,
    fontWeight: e.isBold ? "700" : "400",
    fontStyle: e.isItalic ? "italic" : "normal",
    textDecoration: e.isUnderline ? "underline" : "none",
    color: e.forecolor ?? "#1F2937",
    textAlign: (e.textAlignment ?? "Left").toLowerCase().replace("justified", "justify"),
    justifyContent: e.verticalAlignment === "Middle" ? "center" : e.verticalAlignment === "Bottom" ? "flex-end" : "flex-start",
  };
});

const weight = (level: number) => (level === 0 && list.value?.boldSections ? 700 : 400);

function numberStyle(level: number) {
  const l = list.value!;
  if (l.numberFill && level === 0) {
    const w = Math.min(l.numberWidth - 6, l.rowHeight * 1.6);
    return { width: `${w}px`, height: `${l.rowHeight - 2}px`, marginRight: `${l.numberWidth - w}px`, background: l.numberFill, color: l.numberColor ?? "#FFFFFF", fontWeight: weight(level) };
  }
  return { width: `${l.numberWidth}px`, marginLeft: level === 1 ? "18px" : "0", fontWeight: weight(level) };
}

const pad = `${SIDE_PAD}px`;
</script>

<style scoped>
.part {
  position: absolute;
  box-sizing: border-box;
}

.part-photo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(160deg, #dbe3ee 0%, #b4c1d3 100%);
  color: #7d8ba1;
}

.part-text {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  line-height: 1.3;
  white-space: pre-wrap;
  word-break: break-word;
}

.part-list {
  width: 100%;
}

.list-row {
  display: flex;
  align-items: center;
  padding: 0 v-bind(pad);
  overflow: hidden;
  white-space: nowrap;
}

.list-number {
  flex-shrink: 0;
}

.list-number.is-boxed {
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.list-page {
  flex-shrink: 0;
  text-align: right;
}
</style>
