<template>
  <div class="zoom-controls">
    <n-button
      @click="zoomOut"
      type="default"
      quaternary
      circle
      size="small"
      :title="t('zoom.zoomOut')"
    >
      <Minus :size="14" />
    </n-button>

    <!-- Interactive editable zoom box + preset dropdown -->
    <div class="zoom-dropdown-container" ref="dropdownRef">
      <div
        class="zoom-display-wrapper"
        :class="{ focused: isEditing || isDropdownOpen }"
      >
        <input
          ref="inputRef"
          v-model="inputDisplayValue"
          type="text"
          class="zoom-input"
          :title="t('zoom.zoomLevel')"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @keydown.enter="onInputEnter"
          @keydown.esc="onInputEsc"
        />
        <button
          type="button"
          class="zoom-arrow-btn"
          :aria-expanded="isDropdownOpen"
          :title="t('zoom.zoomOptions')"
          @click.stop="toggleDropdown"
        >
          <ChevronDown :size="12" />
        </button>
      </div>

      <!-- Dropdown Popover Menu -->
      <transition name="zoom-menu-fade">
        <div v-if="isDropdownOpen" class="zoom-menu-popover" role="menu">
          <!-- Fit Content based on device and panels -->
          <button
            type="button"
            class="zoom-menu-item zoom-action-item"
            @click="selectFitContent"
          >
            <Maximize :size="13" class="zoom-item-icon" />
            <span class="zoom-item-label">{{ t('zoom.fitContent') }}</span>
            <span class="zoom-item-badge">{{ fitContentPercent }}%</span>
          </button>

          <!-- Reset 100% -->
          <button
            type="button"
            class="zoom-menu-item zoom-action-item"
            @click="selectPreset(1)"
          >
            <RotateCcw :size="13" class="zoom-item-icon" />
            <span class="zoom-item-label">100%</span>
            <span class="zoom-item-badge">Actual</span>
          </button>

          <div class="zoom-menu-divider"></div>

          <!-- Preset 25% Ladder Options -->
          <div class="zoom-presets-list">
            <button
              v-for="level in ZOOM_LEVELS"
              :key="level"
              type="button"
              class="zoom-menu-item"
              :class="{ active: Math.round(localZoomLevel * 100) === Math.round(level * 100) }"
              @click="selectPreset(level)"
            >
              <Check
                v-if="Math.round(localZoomLevel * 100) === Math.round(level * 100)"
                :size="13"
                class="zoom-check-icon"
              />
              <span v-else class="zoom-check-placeholder"></span>
              <span class="zoom-item-label">{{ Math.round(level * 100) }}%</span>
            </button>
          </div>
        </div>
      </transition>
    </div>

    <n-button
      @click="zoomIn"
      type="default"
      quaternary
      circle
      size="small"
      :title="t('zoom.zoomIn')"
    >
      <Plus :size="14" />
    </n-button>

    <n-button
      @click="resetZoom"
      type="default"
      quaternary
      size="small"
      :title="t('zoom.resetZoom')"
    >
      {{ Math.round(DEFAULT_ZOOM * 100) }}%
    </n-button>

    <n-button
      @click="calculateOptimalZoom"
      type="default"
      quaternary
      circle
      size="small"
      :title="t('zoom.fitContent')"
    >
      <Maximize :size="14" />
    </n-button>
  </div>
</template>

<script setup lang="ts">
import { Check, ChevronDown, Maximize, Minus, Plus, RotateCcw } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { NButton } from 'naive-ui';
import { ZOOM_CONSTANTS } from '@/constants/constants';

const { t } = useI18n();

interface Props {
  zoomLevel: number;
  paperWidth: number;
  paperHeight?: number;
}

interface Emits {
  (e: 'update:zoomLevel', level: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Zoom constants
const { ZOOM_LEVELS, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } = ZOOM_CONSTANTS;

// Local zoom level
const localZoomLevel = ref(Number(props.zoomLevel));
const inputDisplayValue = ref(`${Math.round(localZoomLevel.value * 100)}%`);
const isEditing = ref(false);
const isDropdownOpen = ref(false);

const dropdownRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

// Watch for prop changes
watch(
  () => props.zoomLevel,
  (newLevel) => {
    localZoomLevel.value = Number(newLevel);
    if (!isEditing.value) {
      inputDisplayValue.value = `${Math.round(localZoomLevel.value * 100)}%`;
    }
  }
);

// Toggle dropdown
function toggleDropdown() {
  if (!isDropdownOpen.value) {
    refreshFitZoom();
  }
  isDropdownOpen.value = !isDropdownOpen.value;
}

// Select a preset zoom level
function selectPreset(level: number) {
  updateZoomLevel(level);
  isDropdownOpen.value = false;
}

// Select fit content
function selectFitContent() {
  calculateOptimalZoom();
  isDropdownOpen.value = false;
}

// Input focus: select all text for quick typing
function onInputFocus() {
  isEditing.value = true;
  nextTick(() => {
    inputRef.value?.select();
  });
}

// Input blur: commit current value
function onInputBlur() {
  commitInput();
}

// Input enter: commit current value and blur
function onInputEnter() {
  commitInput();
  inputRef.value?.blur();
}

// Input escape: revert and blur
function onInputEsc() {
  isEditing.value = false;
  inputDisplayValue.value = `${Math.round(localZoomLevel.value * 100)}%`;
  inputRef.value?.blur();
}

// Parse and commit user typed percentage
function commitInput() {
  isEditing.value = false;
  const raw = inputDisplayValue.value.replace(/%/g, '').trim();
  const parsed = parseFloat(raw);

  if (!isNaN(parsed) && parsed > 0) {
    const fraction = parsed / 100;
    updateZoomLevel(fraction);
  } else {
    inputDisplayValue.value = `${Math.round(localZoomLevel.value * 100)}%`;
  }
}

// Zoom in stepping through the preset ladder: 25 -> 50 -> 75 -> 100 -> 125 -> 150 -> 175 -> 200 -> 225 -> 250 -> 275 -> 300 -> 400 -> 500
function zoomIn() {
  const current = Number(localZoomLevel.value);
  const nextLevel = ZOOM_LEVELS.find((level) => level > current + 0.005);
  if (nextLevel !== undefined) {
    updateZoomLevel(nextLevel);
  } else {
    updateZoomLevel(MAX_ZOOM);
  }
}

// Zoom out stepping backwards through the preset ladder
function zoomOut() {
  const current = Number(localZoomLevel.value);
  const prevLevel = [...ZOOM_LEVELS].reverse().find((level) => level < current - 0.005);
  if (prevLevel !== undefined) {
    updateZoomLevel(prevLevel);
  } else {
    updateZoomLevel(ZOOM_LEVELS[0] ?? MIN_ZOOM);
  }
}

// Reset zoom
function resetZoom() {
  updateZoomLevel(DEFAULT_ZOOM);
}

// Update the zoom level and emit
function updateZoomLevel(level: number) {
  const numLevel = Number(level);
  const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(numLevel * 100) / 100));
  localZoomLevel.value = clampedLevel;
  inputDisplayValue.value = `${Math.round(clampedLevel * 100)}%`;
  emit('update:zoomLevel', clampedLevel);
}

// Compute optimal zoom ratio to fit the page width cleanly inside the editor between panels
function computeOptimalZoom(): number {
  const container =
    (document.querySelector('.paper-container') as HTMLElement) ||
    (document.querySelector('.designer-canvas') as HTMLElement) ||
    (document.querySelector('.design-area-wrapper') as HTMLElement);

  let availableWidth: number;
  if (container) {
    const isPaperContainer = container.classList.contains('paper-container');
    // Fit 100% flush to available width (reserve 1px to prevent subpixel rounding scrollbar)
    availableWidth = isPaperContainer ? container.clientWidth - 1 : container.clientWidth - 31;
  } else {
    availableWidth = 800;
  }

  const pWidth = props.paperWidth || 595;
  const optimalZoom = Math.max(100, availableWidth) / pWidth;
  const exactZoom = Math.round(optimalZoom * 100) / 100;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, exactZoom));
}

const liveOptimalZoom = ref(1.0);

function refreshFitZoom() {
  liveOptimalZoom.value = computeOptimalZoom();
}

const fitContentPercent = computed(() => {
  return Math.round(liveOptimalZoom.value * 100);
});

// Automatically calculate and apply the optimal zoom ratio
function calculateOptimalZoom() {
  refreshFitZoom();
  updateZoomLevel(liveOptimalZoom.value);
}

// Click outside and keydown listeners
function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isDropdownOpen.value) {
    isDropdownOpen.value = false;
  }
}

let containerObserver: ResizeObserver | null = null;

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', refreshFitZoom);

  refreshFitZoom();

  nextTick(() => {
    refreshFitZoom();
    const container =
      document.querySelector('.paper-container') ||
      document.querySelector('.designer-canvas');
    if (container && typeof ResizeObserver !== 'undefined') {
      containerObserver = new ResizeObserver(() => {
        refreshFitZoom();
      });
      containerObserver.observe(container);
    }
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', refreshFitZoom);
  if (containerObserver) {
    containerObserver.disconnect();
    containerObserver = null;
  }
});

watch(
  () => [props.paperWidth, props.paperHeight],
  () => {
    refreshFitZoom();
  }
);
</script>

<style scoped>
.zoom-controls {
  display: flex;
  align-items: center;
  gap: 3px;
  background-color: #ffffff;
  padding: 2px 4px;
  border-radius: 8px;
  border: 1px solid rgba(28, 27, 38, 0.1);
  box-shadow: 0 1px 2px rgba(23, 20, 44, 0.03);
}

.zoom-dropdown-container {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.zoom-display-wrapper {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 4px 0 6px;
  border-radius: 6px;
  border: 1px solid transparent;
  background-color: transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.zoom-display-wrapper:hover {
  background-color: rgba(124, 92, 247, 0.06);
}

.zoom-display-wrapper.focused {
  background-color: #ffffff;
  border-color: #7c5cf7;
  box-shadow: 0 0 0 2px rgba(124, 92, 247, 0.15);
}

.zoom-input {
  width: 44px;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: #1c1b26;
  text-align: center;
  outline: none;
  cursor: text;
}

.zoom-arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 2px;
  color: #8a84a3;
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.15s ease;
}

.zoom-arrow-btn:hover {
  color: #6366f1;
}

/* Popover menu */
.zoom-menu-popover {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: 175px;
  max-height: 340px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid rgba(28, 27, 38, 0.09);
  border-radius: 9px;
  box-shadow: 0 10px 26px rgba(23, 20, 44, 0.12), 0 2px 6px rgba(23, 20, 44, 0.04);
  padding: 6px 4px;
  z-index: 2500;
}

.zoom-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  color: #45425a;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.zoom-menu-item:hover {
  background-color: rgba(124, 92, 247, 0.08);
  color: #5b3ee0;
}

.zoom-menu-item.active {
  background-color: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  font-weight: 600;
}

.zoom-item-icon {
  margin-right: 7px;
  color: #7c5cf7;
  flex-shrink: 0;
}

.zoom-item-label {
  flex: 1;
}

.zoom-item-badge {
  font-size: 10.5px;
  font-weight: 600;
  color: #8a84a3;
  background-color: rgba(28, 27, 38, 0.05);
  padding: 1px 6px;
  border-radius: 999px;
}

.zoom-menu-divider {
  height: 1px;
  background-color: rgba(28, 27, 38, 0.07);
  margin: 5px 4px;
}

.zoom-presets-list {
  display: flex;
  flex-direction: column;
}

.zoom-check-icon {
  margin-right: 6px;
  color: #6366f1;
  flex-shrink: 0;
}

.zoom-check-placeholder {
  width: 13px;
  margin-right: 6px;
  display: inline-block;
  flex-shrink: 0;
}

/* Transitions */
.zoom-menu-fade-enter-active,
.zoom-menu-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.zoom-menu-fade-enter-from,
.zoom-menu-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -4px);
}
</style>
