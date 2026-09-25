<template>
  <div class="zoom-controls">
    <n-button @click="zoomOut" type="default" quaternary circle size="small" :title="t('zoom.zoomOut')">-</n-button>
    <select v-model.number="localZoomLevel" @change="applyZoom" class="zoom-select">
      <option v-for="level in ZOOM_LEVELS" :key="level" :value="level">{{ Math.round(level * 100) }}%</option>
    </select>
    <n-button @click="zoomIn" type="default" quaternary circle size="small" :title="t('zoom.zoomIn')">+</n-button>
    <n-button @click="resetZoom" type="default" quaternary size="small" :title="t('zoom.resetZoom')">{{ Math.round(DEFAULT_ZOOM * 100) }}%</n-button>
    <n-button @click="calculateOptimalZoom" type="default" quaternary circle size="small" :title="t('zoom.fitWindow')">⊡</n-button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton } from 'naive-ui';
import { ZOOM_CONSTANTS } from '@/constants/constants';

const { t } = useI18n();

interface Props {
  zoomLevel: number;
  paperWidth: number;
}

interface Emits {
  (e: 'update:zoomLevel', level: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Zoom constants
const { ZOOM_LEVELS, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM, OPTIMAL_ZOOM_MARGIN } = ZOOM_CONSTANTS;

// Local zoom level
const localZoomLevel = ref(Number(props.zoomLevel));

// Watch for prop changes
watch(() => props.zoomLevel, (newLevel) => {
  localZoomLevel.value = Number(newLevel);
});

// Zoom in
function zoomIn() {
  const current = Number(localZoomLevel.value);
  const levels = [...ZOOM_LEVELS].sort((a, b) => a - b);
  const nextLevel = levels.find(level => level > current + 0.01);
  if (nextLevel !== undefined) {
    updateZoomLevel(nextLevel);
  } else {
    updateZoomLevel(MAX_ZOOM);
  }
}

// Zoom out
function zoomOut() {
  const current = Number(localZoomLevel.value);
  const levels = [...ZOOM_LEVELS].sort((a, b) => a - b);
  const prevLevel = [...levels].reverse().find(level => level < current - 0.01);
  if (prevLevel !== undefined) {
    updateZoomLevel(prevLevel);
  } else {
    updateZoomLevel(MIN_ZOOM);
  }
}

// Reset zoom
function resetZoom() {
  updateZoomLevel(DEFAULT_ZOOM);
}

// Apply zoom
function applyZoom() {
  updateZoomLevel(Number(localZoomLevel.value));
}

// Update the zoom level
function updateZoomLevel(level: number) {
  const numLevel = Number(level);
  const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, numLevel));
  localZoomLevel.value = clampedLevel;
  emit('update:zoomLevel', clampedLevel);
}

// Automatically calculate the optimal zoom ratio based on the report size
function calculateOptimalZoom() {
  // Get the available size of the design area
  const designerContainer = document.querySelector('.designer-canvas') || document.querySelector('.pdf-designer');
  if (!designerContainer) return;

  // Get the actual available width of the design area
  const availableWidth = designerContainer.clientWidth - 20; // Subtract the margin

  // Compute the width scale ratio
  const widthRatio = availableWidth / props.paperWidth;

  // Use the width scale ratio to ensure the report width fits the design area
  const optimalZoom = widthRatio * OPTIMAL_ZOOM_MARGIN;

  // Pick the closest value from the preset zoom levels
  let closestZoom = ZOOM_LEVELS[0] || DEFAULT_ZOOM;
  let minDiff = Math.abs((ZOOM_LEVELS[0] || DEFAULT_ZOOM) - optimalZoom);

  for (let i = 1; i < ZOOM_LEVELS.length; i++) {
    const level = ZOOM_LEVELS[i];
    if (level !== undefined) {
      const diff = Math.abs(level - optimalZoom);
      if (diff < minDiff) {
        minDiff = diff;
        closestZoom = level;
      }
    }
  }

  // Apply the computed optimal zoom ratio
  updateZoomLevel(closestZoom);
}
</script>

<style scoped>
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}



.zoom-select {
  width: 80px;
  height: 28px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  background-color: white;
  cursor: pointer;
  text-align: center;
}

.zoom-select:hover {
  border-color: #999;
}

.zoom-select:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}
</style>
