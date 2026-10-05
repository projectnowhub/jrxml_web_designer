<template>
  <div class="color-picker-with-opacity">
    <ColorSwatchPicker
      :model-value="localColor"
      @update:model-value="localColor = $event; updateColor()"
      class="color-input"
      :aria-label="t('properties.color')"
    />
    <label class="opacity-field">
      <span class="opacity-label">{{ t('properties.opacity') }}</span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        v-model.number="localOpacity"
        @input="updateColor"
        class="opacity-slider"
      />
      <span class="opacity-value">{{ Math.round(localOpacity * 100) }}%</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import ColorSwatchPicker from '../../common/ColorSwatchPicker.vue';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

interface Props {
  modelValue: string | undefined;
  mode: 'Opaque' | 'Transparent' | undefined;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: string | undefined];
  'update:mode': [value: 'Opaque' | 'Transparent'];
}>();

// Local state
const localColor = ref('#ffffff');
const localOpacity = ref(1);

// Update the color
const updateColor = () => {
  let backcolor: string | undefined;
  let mode: 'Opaque' | 'Transparent';

  // Always keep the color value, only adjust the format based on opacity
  if (localOpacity.value >= 1) {
    // Fully opaque, use hex
    backcolor = localColor.value;
    mode = 'Opaque';
  } else {
    // Semi-transparent, use rgba
    // Convert hex to RGB
    let hex = localColor.value;
    if (hex.startsWith('#')) hex = hex.slice(1);

    // Handle shorthand hex (e.g. #fff)
    if (hex.length === 3) {
      hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    // Keep 4 decimal places
    const alpha = Math.round(localOpacity.value * 10000) / 10000;
    backcolor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    mode = alpha === 0 ? 'Transparent' : 'Opaque';
  }

  emit('update:modelValue', backcolor);
  emit('update:mode', mode);
};

// Watch for external value changes
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    localColor.value = '#ffffff';
    localOpacity.value = 0;
    return;
  }

  if (newVal.startsWith('#')) {
    localColor.value = newVal;
    // When switching background color, default to transparent for white, opaque for other colors
    localOpacity.value = newVal.toLowerCase() === '#ffffff' ? 0 : 1;
  } else if (newVal.startsWith('rgba')) {
    // Parse rgba(r, g, b, a)
    const match = newVal.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      const r = parseInt(match[1]!);
      const g = parseInt(match[2]!);
      const b = parseInt(match[3]!);
      const a = match[4] ? parseFloat(match[4]) : 1;

      // Convert RGB to hex
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      localColor.value = hex;
      localOpacity.value = a;
    }
  } else if (newVal.startsWith('rgb')) {
    // Parse rgb(r, g, b)
    const match = newVal.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]!);
      const g = parseInt(match[2]!);
      const b = parseInt(match[3]!);

      // Convert RGB to hex
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      localColor.value = hex;
      localOpacity.value = 1;
    }
  }
}, { immediate: true });

// Watch for local color changes to auto-adjust opacity when the color changes
watch(localColor, (newColor) => {
  // When switching background color, default to transparent for white, opaque for other colors
  localOpacity.value = newColor.toLowerCase() === '#ffffff' ? 0 : 1;
  // Update the color
  updateColor();
});
</script>

<style scoped>
.color-picker-with-opacity {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.color-input {
  flex: 0 0 44px;
  height: 30px;
  padding: 0;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  cursor: pointer;
}

.opacity-field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.opacity-label {
  font-size: 11px;
  color: var(--prop-text-secondary, #6b7280);
  white-space: nowrap;
}

.opacity-slider {
  flex: 1;
  min-width: 0;
  height: 4px;
  padding: 0;
  margin: 0;
  accent-color: var(--prop-border-focus, #1890ff);
}

.opacity-value {
  flex: 0 0 34px;
  text-align: right;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--prop-text-secondary, #6b7280);
}
</style>
