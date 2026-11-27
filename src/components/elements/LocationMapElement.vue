<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :selected-elements="selectedElements"
    :is-dragging="isDragging"
    :is-out-of-bounds="isOutOfBounds"
    :parent-frame-index="parentFrameIndex"
    @select="(b, e, m, p) => emit('select', b, e, m, p)"
    @drag-start="(ev, b, e, p) => emit('dragStart', ev, b, e, p)"
    @resize-start="(ev, b, e, p, d) => emit('resizeStart', ev, b, e, p, d)"
    @contextmenu="(ev, b, e, p) => emit('contextmenu', ev, b, e, p)"
    @start-editing="(b, e) => emit('startEditing', b, e, parentFrameIndex)"
  >
    <!-- The map part of a Location: the picture that prints, or what to do -->
    <div class="location-map" :style="cornerRadiusStyle">
      <img v-if="picture" :src="picture" class="location-map-picture" alt="" draggable="false" />
      <!-- Its picture is being drawn (or couldn't be): the same area, live -->
      <div v-else-if="view" class="location-map-live">
        <template v-for="tile in tiles" :key="`${tile.url}|${tile.left}|${tile.top}`">
          <img
            v-if="tile.url"
            :src="tile.url"
            class="location-map-tile"
            :style="{ left: `${tile.left}px`, top: `${tile.top}px` }"
            alt=""
            draggable="false"
          />
        </template>
        <MapPin class="location-map-pin" :size="Math.min(28, element.height / 3)" :stroke-width="1.5" aria-hidden="true" />
        <span class="location-map-credit">{{ MAP_CREDIT }}</span>
      </div>
      <div v-else class="location-map-empty">
        <MapPin :size="Math.min(22, element.height / 3)" aria-hidden="true" />
        <span v-if="element.height >= 60">{{ t("location.canvasEmpty") }}</span>
      </div>
      <span v-if="state" class="location-map-badge" :class="`is-${state}`" :title="t(`location.states.${state}Hint`)">
        {{ t(`location.states.${state}`) }}
      </span>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { MapPin } from '@lucide/vue';
import BaseElement from './BaseElement.vue';
import { useReportStore } from '@/stores/report';
import { imageCornerRadiusCss } from '../../utils/elementUtils';
import { mapStates } from '../../utils/location/locationMaps';
import { MAP_CREDIT, tilesFor } from '../../utils/location/locationMap';
import { formatCoordinate, pictureKeyOf } from '../../utils/location/locationElement';
import type { ImageElement, SelectedElementInfo } from '../../types';

const { t } = useI18n();

const props = defineProps<{
  element: ImageElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements?: { bandIndex: number; elementIndex: number; parentFrameIndex?: number }[];
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  parentFrameIndex?: number;
}>();

const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

const report = useReportStore();

// The place the map shows (worked out from the Location's setup)
const view = computed(() => props.element.locationView ?? null);

// The picture (a data URI in the image expression), when it was drawn for
// this place and size
const picture = computed(() => {
  const v = view.value;
  if (!v) return null;
  const wanted = [formatCoordinate(v.latitude), formatCoordinate(v.longitude), v.zoom, Math.round(props.element.width), Math.round(props.element.height)].join(',');
  if (pictureKeyOf(props.element) !== wanted) return null;
  const source = (props.element.imageExpression ?? '').trim().replace(/^"|"$/g, '');
  return source.startsWith('data:image/') ? source : null;
});

const tiles = computed(() => (view.value ? tilesFor(view.value, props.element.width, props.element.height) : []));

// Being drawn, or couldn't be drawn (kept per Location, i.e. per box)
const state = computed(() => {
  if (props.parentFrameIndex === undefined) return null;
  const box = report.bands[props.bandIndex]?.elements[props.parentFrameIndex];
  return box?.uuid ? (mapStates[box.uuid] ?? null) : null;
});

const cornerRadiusStyle = computed(() => {
  const radius = imageCornerRadiusCss(props.element);
  return radius ? { borderRadius: radius } : {};
});
</script>

<style scoped>
.location-map {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.location-map-picture {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.location-map-live {
  position: absolute;
  inset: 0;
  background: #aad3df;
}

.location-map-tile {
  position: absolute;
  width: 256px;
  height: 256px;
  pointer-events: none;
}

.location-map-pin {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -100%);
  color: #ffffff;
  fill: #e5383b;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
}

.location-map-credit {
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 0 3px;
  background: rgba(255, 255, 255, 0.8);
  font: 7px/1.4 Arial, sans-serif;
  color: #333333;
  white-space: nowrap;
}

.location-map-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  padding: 6px;
  box-sizing: border-box;
  background:
    repeating-linear-gradient(45deg, rgba(100, 64, 244, 0.05) 0 8px, transparent 8px 16px),
    #f4f3fa;
  color: #6f6a7e;
  font-size: 10px;
  line-height: 1.3;
  text-align: center;
}

.location-map-empty :deep(svg) {
  color: #6440f4;
}

.location-map-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #6440f4;
  font-size: 9px;
  font-weight: 600;
  pointer-events: auto;
}

.location-map-badge.is-error {
  color: #dc2626;
}
</style>
