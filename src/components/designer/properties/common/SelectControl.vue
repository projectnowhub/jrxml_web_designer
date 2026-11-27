<template>
  <div class="select-control">
    <label v-if="label" class="select-label">{{ label }}</label>
    <span class="select-wrap">
      <select
        :value="modelValue"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        class="select-input"
      >
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <ChevronDown class="select-chevron" :size="14" aria-hidden="true" />
    </span>
    <span v-if="description" class="select-description">{{ description }}</span>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';

interface Option {
  value: string;
  label: string;
}

defineProps<{
  modelValue: string;
  options: Option[];
  label?: string;
  description?: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<style scoped>
.select-control {
  display: flex;
  flex-direction: column;
  gap: var(--prop-spacing-xs);
}

.select-label {
  display: block;
  margin-bottom: var(--prop-spacing-xs);
  font-size: var(--prop-font-size-sm);
  font-weight: var(--prop-font-weight-medium);
  color: var(--prop-text-secondary);
}

.select-input {
  width: 100%;
  padding: 6px 8px;
  font-size: var(--prop-font-size-sm);
  color: var(--prop-text-primary);
  background-color: var(--prop-bg-primary);
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  outline: none;
  cursor: pointer;
  transition: border-color var(--prop-transition-fast), box-shadow var(--prop-transition-fast);
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
  padding-right: 28px;
}

.select-wrap {
  position: relative;
  display: block;
}

.select-chevron {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  color: #666;
  pointer-events: none;
}

.select-input:hover {
  border-color: var(--prop-border-hover);
}

.select-input:focus {
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.select-description {
  font-size: var(--prop-font-size-sm);
  color: var(--prop-text-tertiary);
}
</style>
