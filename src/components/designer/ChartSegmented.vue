<template>
  <!-- A row of choices, one chosen: the CDP app's SegmentedControl (chart
       setup: time granularity, calculation, layout, show as, gauge range) -->
  <div class="cseg" role="radiogroup">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="cseg-btn"
      :class="{ 'is-on': option.value === modelValue }"
      :aria-checked="option.value === modelValue"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  options: { value: string; label: string }[];
  modelValue: string | undefined;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<style scoped>
.cseg {
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
}

.cseg-btn {
  flex: 1;
  min-width: 0;
  padding: 6px 4px;
  border: none;
  border-radius: 6px;
  background: none;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.cseg-btn:hover {
  background: #f1eff7;
}

.cseg-btn.is-on {
  background: #6440f4;
  color: #ffffff;
}
</style>
