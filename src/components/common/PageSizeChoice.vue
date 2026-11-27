<template>
  <!-- How many rows a page shows: above a paged list, with its label (My
       Templates' list, the table setup popup's grid) -->
  <label class="page-size-choice">
    <span>{{ t("pageNavigation.perPage") }}</span>
    <select :value="modelValue" @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))">
      <option v-for="size in sizes" :key="size" :value="size">{{ size }}</option>
    </select>
    <ChevronDown :size="13" :stroke-width="2.25" aria-hidden="true" />
  </label>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ChevronDown } from "@lucide/vue";

defineProps<{ modelValue: number; sizes: readonly number[] }>();
const emit = defineEmits<{ "update:modelValue": [size: number] }>();

const { t } = useI18n();
</script>

<style scoped>
.page-size-choice {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6f6a7e;
  font-size: 11.5px;
}

.page-size-choice select {
  height: 28px;
  padding: 0 26px 0 10px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 12px;
  font-weight: 600;
  appearance: none;
  cursor: pointer;
}

.page-size-choice select:focus-visible {
  border-color: #6440f4;
  outline: none;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.12);
}

.page-size-choice svg {
  position: absolute;
  right: 8px;
  pointer-events: none;
  color: #6f6a7e;
}
</style>
