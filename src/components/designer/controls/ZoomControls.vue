<template>
  <div class="zoom-controls">
    <n-button @click="zoomOut" type="default" quaternary circle size="small" :title="t('zoom.zoomOut')">-</n-button>
    <select v-model="localZoomLevel" @change="applyZoom" class="zoom-select">
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
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const OPTIMAL_ZOOM_MARGIN = 0.9;

// Local zoom level
const localZoomLevel = ref(props.zoomLevel);

// Watch for prop changes
watch(() => props.zoomLevel, (newLevel) => {
  localZoomLevel.value = newLevel;
});

// Zoom in
function zoomIn() {
  const currentIndex = ZOOM_LEVELS.findIndex(level => level === localZoomLevel.value);
  if (currentIndex !== -1 && currentIndex < ZOOM_LEVELS.length - 1) {
    const nextLevel = ZOOM_LEVELS[currentIndex + 1];
    if (nextLevel !== undefined) {
      updateZoomLevel(nextLevel);
    }
  } else {
    const nextLevel = ZOOM_LEVELS.find(level => level > localZoomLevel.value);
    if (nextLevel) {
      updateZoomLevel(nextLevel);
    }
  }
}

// Zoom out
function zoomOut() {
  const currentIndex = ZOOM_LEVELS.findIndex(level => level === localZoomLevel.value);
  if (currentIndex !== -1 && currentIndex > 0) {
    const prevLevel = ZOOM_LEVELS[currentIndex - 1];
    if (prevLevel !== undefined) {
      updateZoomLevel(prevLevel);
    }
  } else {
    const lowerLevels = ZOOM_LEVELS.filter(level => level < localZoomLevel.value);
    if (lowerLevels.length > 0) {
      const lastLevel = lowerLevels[lowerLevels.length - 1];
      if (lastLevel !== undefined) {
        updateZoomLevel(lastLevel);
      }
    }
  }
}

// Reset zoom
function resetZoom() {
  updateZoomLevel(DEFAULT_ZOOM);
}

// Apply zoom
function applyZoom() {
  updateZoomLevel(localZoomLevel.value);
}

// Update the zoom level
function updateZoomLevel(level: number) {
  const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
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
