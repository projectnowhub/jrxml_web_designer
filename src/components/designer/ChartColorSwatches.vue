<template>
  <!-- "Customize colors": the CDP app's ColorSwatchPanel. One swatch per
       value (or one for the number), then "Reset to default colors" -->
  <div class="ccs">
    <div v-for="row in rows" :key="row.key" class="ccs-row">
      <ColorSwatchPicker :model-value="row.color" @update:model-value="emit('set', row.key, $event)" />
      <span>{{ row.label }}</span>
    </div>
    <button type="button" class="ccs-reset" @click="emit('reset')">{{ t("chart.panel.resetColors") }}</button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import ColorSwatchPicker from "../common/ColorSwatchPicker.vue";

defineProps<{
  rows: { key: string; label: string; color: string }[];
}>();

const emit = defineEmits<{
  set: [key: string, color: string];
  reset: [];
}>();

const { t } = useI18n();
</script>

<style scoped>
.ccs-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 2px;
  color: #1c1b26;
  font-size: 12.5px;
}

.ccs-reset {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  color: #6f6a7e;
  font-size: 11.5px;
  cursor: pointer;
}

.ccs-reset:hover {
  color: #1c1b26;
}
</style>
