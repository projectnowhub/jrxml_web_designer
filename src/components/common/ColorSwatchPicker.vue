<template>
  <!-- Colour swatch whose picker opens in a popover that stays inside the
       window (the browser's native picker can open partly off-screen): below
       and to the right of the swatch, flipping left or up when there is no room -->
  <NColorPicker
    class="color-swatch-picker"
    :value="pickerValue"
    :modes="['hex']"
    :show-alpha="false"
    :disabled="disabled"
    :render-label="renderLabel"
    placement="bottom-start"
    size="small"
    @update:value="onUpdate"
    @complete="onComplete"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NColorPicker } from 'naive-ui';

const props = defineProps<{
  modelValue?: string | null;
  disabled?: boolean;
}>();

// update:modelValue fires while the colour is being dragged (like a native
// "input" event); change fires once the pick is finished
const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
}>();

const pickerValue = computed(() =>
  props.modelValue && /^#[0-9a-f]{3,8}$/i.test(props.modelValue) ? props.modelValue : '#000000',
);

// Only the swatch, no hex text, so it fits compact rows
const renderLabel = () => '';

// Lowercase #rrggbb, the same format the native colour input produced
const normalize = (value: string | null) => (value ?? '#000000').slice(0, 7).toLowerCase();

const onUpdate = (value: string | null) => emit('update:modelValue', normalize(value));
const onComplete = (value: string | null) => emit('change', normalize(value));
</script>

<style scoped>
.color-swatch-picker {
  width: 36px;
  flex: none;
}
</style>
