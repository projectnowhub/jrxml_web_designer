<template>
  <!-- The place on a Leaflet map, as the CDP app's location picker: click the
       map (or drag the pin) to set it, drag the map to look around, the wheel
       or + / − to zoom. The printed map uses this zoom, centred on the pin. -->
  <div class="map-picker">
    <div class="map-frame" :style="{ height: `${height}px` }">
      <div ref="mapRef" class="map-view" role="application" :aria-label="t('location.panel.mapLabel')" @wheel="onWheel"></div>
      <div v-if="!point" class="map-hint">{{ t("location.panel.clickToPlace") }}</div>
      <div class="map-zoom">
        <button
          type="button"
          :disabled="zoom >= MAX_MAP_ZOOM"
          :title="t('location.panel.zoomIn')"
          :aria-label="t('location.panel.zoomIn')"
          @click="zoomBy(1)"
        >
          <Plus :size="14" aria-hidden="true" />
        </button>
        <button
          type="button"
          :disabled="zoom <= MIN_MAP_ZOOM"
          :title="t('location.panel.zoomOut')"
          :aria-label="t('location.panel.zoomOut')"
          @click="zoomBy(-1)"
        >
          <Minus :size="14" aria-hidden="true" />
        </button>
        <button
          v-if="point"
          type="button"
          :title="t('location.panel.backToPin')"
          :aria-label="t('location.panel.backToPin')"
          @click="showPin"
        >
          <LocateFixed :size="14" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, ref, render, watch } from "vue";
import { useI18n } from "vue-i18n";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, MapPin, Minus, Plus } from "@lucide/vue";
import { MAP_CREDIT, MAX_MAP_ZOOM, MIN_MAP_ZOOM, PIN_COLOR, TILE_URL } from "../../../utils/location/locationMap";

const props = defineProps<{
  // The place, or null when it has no coordinates yet
  point: { latitude: number; longitude: number } | null;
  zoom: number;
  // The map part's proportions (height / width), so the view has its shape
  ratio: number;
}>();

const emit = defineEmits<{
  // A new place for the pin (one undo step each); with the zoom looked at
  // when the place is set for the first time, so the map stays as seen
  move: [point: { latitude: number; longitude: number }, zoom?: number];
  // The printed map's zoom (one undo step per turn of the wheel or click)
  zoom: [zoom: number];
}>();

const { t } = useI18n();

// Without a place yet: Kuala Lumpur, as the CDP app's picker
const DEFAULT_VIEW = { latitude: 3.139, longitude: 101.6869, zoom: 6 };

const mapRef = ref<HTMLElement | null>(null);
const width = ref(280);
const height = computed(() => Math.round(Math.max(140, Math.min(280, width.value * props.ratio))));
// The zoom shown (follows the map)
const zoom = ref(props.point ? props.zoom : DEFAULT_VIEW.zoom);

let map: L.Map | null = null;
let marker: L.Marker | null = null;
let observer: ResizeObserver | null = null;

// The pin: Lucide's map pin, filled in the printed pin's colour, its tip on the place
function pinIcon(): L.DivIcon {
  const el = document.createElement("div");
  el.className = "map-pin";
  render(h(MapPin, { size: 32, strokeWidth: 1.5, color: "#ffffff", fill: PIN_COLOR }), el);
  return L.divIcon({ className: "map-pin-icon", html: el, iconSize: [32, 32], iconAnchor: [16, 32] });
}

function placeMarker(point: { latitude: number; longitude: number } | null) {
  if (!map) return;
  if (!point) {
    marker?.remove();
    marker = null;
    return;
  }
  const at = L.latLng(point.latitude, point.longitude);
  if (marker) {
    marker.setLatLng(at);
    return;
  }
  marker = L.marker(at, { icon: pinIcon(), draggable: true, keyboard: false, autoPan: true }).addTo(map);
  marker.on("dragend", () => {
    const p = marker!.getLatLng();
    emit("move", { latitude: p.lat, longitude: p.lng });
  });
}

// The place changed elsewhere (typed, copied, undone): the pin moves there
watch(
  () => props.point && `${props.point.latitude},${props.point.longitude}`,
  () => {
    placeMarker(props.point);
    if (map && props.point) map.panTo([props.point.latitude, props.point.longitude], { animate: false });
  },
);

// Zoom changes are saved once they stop, as one undo step (a turn of the
// wheel is many notches); nothing to save before there is a place
let pendingZoom: number | null = null;
let zoomTimer: ReturnType<typeof setTimeout> | null = null;
function zoomChanged(z: number) {
  zoom.value = z;
  if (!props.point) return;
  pendingZoom = z;
  if (zoomTimer) clearTimeout(zoomTimer);
  zoomTimer = setTimeout(() => {
    zoomTimer = null;
    const next = pendingZoom;
    pendingZoom = null;
    if (next !== null && next !== props.zoom) emit("zoom", next);
  }, 350);
}

// The zoom changed elsewhere (undo, the AI): the map follows
watch(
  () => props.zoom,
  (z) => {
    if (!map || !props.point || pendingZoom !== null || map.getZoom() === z) return;
    askedZoom = null;
    map.setZoom(z, { animate: false });
  },
);

// One level in or out, counted from the level already asked for: while Leaflet
// animates a zoom it still reports the old one, so quick notches would be lost
let askedZoom: number | null = null;
function zoomBy(step: number, animate = true) {
  if (!map) return;
  const next = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, (askedZoom ?? map.getZoom()) + step));
  askedZoom = next;
  map.setZoom(next, { animate });
}
const showPin = () => props.point && map?.setView([props.point.latitude, props.point.longitude], map.getZoom());

// The mouse wheel: one level per notch. Ctrl / ⌘ + wheel (and a touchpad
// pinch, which browsers send as one) is left to the designer: it zooms the
// page. Leaflet's own wheel zoom is off for that reason.
let wheelDelta = 0;
function onWheel(event: WheelEvent) {
  if (event.ctrlKey || event.metaKey) return;
  event.preventDefault();
  wheelDelta += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
  if (Math.abs(wheelDelta) < 50) return;
  // Without the animation: notches come faster than it runs
  zoomBy(-Math.sign(wheelDelta), false);
  wheelDelta = 0;
}

onMounted(() => {
  const el = mapRef.value!;
  const view = props.point ? { ...props.point, zoom: props.zoom } : DEFAULT_VIEW;
  map = L.map(el, {
    center: [view.latitude, view.longitude],
    zoom: view.zoom,
    minZoom: MIN_MAP_ZOOM,
    maxZoom: MAX_MAP_ZOOM,
    zoomControl: false,
    scrollWheelZoom: false,
    // Arrow keys and Delete belong to the designer (they move / delete the Location)
    keyboard: false,
  });
  // The credit without links: a click on one would leave the designer
  map.attributionControl.setPrefix(false);
  L.tileLayer(TILE_URL, { attribution: MAP_CREDIT, maxZoom: MAX_MAP_ZOOM }).addTo(map);
  placeMarker(props.point);
  map.on("click", (e: L.LeafletMouseEvent) => {
    emit("move", { latitude: e.latlng.lat, longitude: e.latlng.lng }, props.point ? undefined : map!.getZoom());
  });
  map.on("zoomend", () => {
    if (askedZoom === map!.getZoom()) askedZoom = null;
    zoomChanged(map!.getZoom());
  });
  // The panel's width changes: the map fills it again
  observer = new ResizeObserver(([entry]) => {
    if (entry) width.value = Math.max(160, Math.round(entry.contentRect.width));
    map?.invalidateSize({ animate: false });
  });
  observer.observe(el.parentElement!);
});

onBeforeUnmount(() => {
  // A zoom not saved yet (the panel closed right after the wheel) is saved now
  if (zoomTimer) {
    clearTimeout(zoomTimer);
    if (pendingZoom !== null && pendingZoom !== props.zoom) emit("zoom", pendingZoom);
  }
  observer?.disconnect();
  map?.remove();
  map = null;
});
</script>

<style scoped>
/* position + z-index 0: Leaflet's own layers (z-index 200–1000) stay inside
   the map instead of covering menus and popups (as in the CDP app) */
.map-frame {
  position: relative;
  z-index: 0;
  overflow: hidden;
  border: 1px solid var(--prop-border-color, #e6e5ee);
  border-radius: 8px;
}

.map-view {
  width: 100%;
  height: 100%;
  background: #aad3df;
  font-family: inherit;
}

.map-view :deep(.leaflet-control-attribution) {
  font-size: 9px;
}

.map-view :deep(.map-pin-icon) {
  background: none;
  border: 0;
}

.map-view :deep(.map-pin) {
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.35));
  cursor: grab;
}

.map-hint {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1000;
  transform: translate(-50%, -50%);
  max-width: 80%;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  font-weight: 600;
  color: #1c1b26;
  text-align: center;
  pointer-events: none;
}

.map-zoom {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(28, 27, 38, 0.15);
  border-radius: 6px;
  background: #ffffff;
}

.map-zoom button {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  background: #ffffff;
  color: #1c1b26;
  cursor: pointer;
}

.map-zoom button + button {
  border-top: 1px solid rgba(28, 27, 38, 0.12);
}

.map-zoom button:hover:not(:disabled) {
  background: #f1edff;
  color: #6440f4;
}

.map-zoom button:disabled {
  color: #b8b5c4;
  cursor: default;
}
</style>
