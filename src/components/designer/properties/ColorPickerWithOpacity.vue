<template>
  <div class="color-picker-with-opacity">
    <div class="color-picker-row">
      <input
        v-model="localColor"
        type="color"
        @input="updateColor"
        class="color-input"
      />
    </div>
    <div class="color-opacity-row">
        <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        v-model.number="localOpacity"
        @input="updateColor"
        class="opacity-slider"
      />
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

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
  width: 100%;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.color-input {
  width: 100%;
  padding: 0;
  border: 1px solid #ddd;
  cursor: pointer;
  height: 18px;
  flex-shrink: 0;
}

.opacity-slider {
  width: 100%;
  height: 6px;
  padding: 0;
  margin: 0;
}
</style>
