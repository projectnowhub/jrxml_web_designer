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
    @start-editing="(b, e) => emit('startEditing', b, e, parentFrameIndex)"
  >
    <!-- Drawn like the PDF: the title line is cut, so the dots fill the rest -->
    <div class="contents-list" :style="{ fontFamily: font, color: list.color, fontSize: `${list.fontSize}px` }">
      <div
        v-for="(entry, i) in list.entries"
        :key="i"
        class="cl-row"
        :style="{ height: `${list.rowHeight}px` }"
      >
        <span
          v-if="list.numberWidth > 0"
          class="cl-number"
          :class="{ 'is-boxed': boxed(entry, i) }"
          :style="numberStyle(entry, i)"
        >{{ numbers[i] }}</span>
        <span class="cl-title" :style="titleStyle(entry)">{{ entry.title }}{{ list.leader ? LEADER_DOTS : "" }}</span>
        <span class="cl-page" :style="{ width: `${list.pageWidth}px`, fontWeight: weight(entry) }">{{ entry.page }}</span>
      </div>
      <div v-if="!list.entries.length" class="cl-empty" :style="{ height: `${list.rowHeight}px` }">
        {{ t(list.continues ? "contentsList.continuesHint" : "contentsList.emptyHint") }}
      </div>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import BaseElement from "./BaseElement.vue";
import { resolveReportFont } from "../../config/fonts.config";
import { LEADER_DOTS, listNumbers, numberStarts, SUB_INDENT, titleLineHeight } from "../../utils/contentsList";
import { useReportStore } from "@/stores/report";
import type { ContentsEntry, ContentsListElement, EditingElementInfo, SelectedElementInfo } from "../../types";

const { t } = useI18n();

const props = defineProps<{
  element: ContentsListElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements: { bandIndex: number; elementIndex: number; parentFrameIndex?: number }[];
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
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

const list = computed(() => props.element.list);
const font = resolveReportFont(undefined);
const lineHeight = computed(() => Math.min(list.value.rowHeight, titleLineHeight(list.value.fontSize)));

const weight = (entry: ContentsEntry) => (entry.level === 0 && list.value.boldSections ? 700 : 400);
const indent = (entry: ContentsEntry) => (entry.level === 1 ? SUB_INDENT : 0);
const boxed = (entry: ContentsEntry, i: number) => !!list.value.numberFill && entry.level === 0 && !!numbers.value[i];

// The numbers shown: counted (carrying on the lists before this one) or typed
const report = useReportStore();
const numbers = computed(() => {
  const detail = report.bands.find((b) => b.type === "detail");
  const start = props.element.uuid ? numberStarts(detail?.elements ?? []).get(props.element.uuid) : undefined;
  return listNumbers(list.value, start);
});

function numberStyle(entry: ContentsEntry, i: number) {
  const width = list.value.numberWidth;
  if (boxed(entry, i)) {
    return {
      width: `${Math.min(width - 6, list.value.rowHeight * 1.6)}px`,
      height: `${list.value.rowHeight - 2}px`,
      marginLeft: `${indent(entry)}px`,
      marginRight: `${width - Math.min(width - 6, list.value.rowHeight * 1.6)}px`,
      background: list.value.numberFill,
      color: list.value.numberColor ?? "#FFFFFF",
      fontWeight: weight(entry),
    };
  }
  return { width: `${width}px`, paddingLeft: `${indent(entry)}px`, fontWeight: weight(entry) };
}

function titleStyle(entry: ContentsEntry) {
  return {
    height: `${lineHeight.value}px`,
    lineHeight: `${lineHeight.value}px`,
    marginLeft: `${indent(entry)}px`,
    fontWeight: weight(entry),
  };
}
</script>

<style scoped>
.contents-list {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cl-row {
  display: flex;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
}

.cl-number {
  flex-shrink: 0;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
}

.cl-number.is-boxed {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cl-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.cl-page {
  flex-shrink: 0;
  text-align: right;
  white-space: nowrap;
}

.cl-empty {
  display: flex;
  align-items: center;
  padding: 0 8px;
  border: 1px dashed #c4b5fd;
  border-radius: 4px;
  color: #7c3aed;
  font-size: 11px;
  font-family: inherit;
  box-sizing: border-box;
}
</style>
