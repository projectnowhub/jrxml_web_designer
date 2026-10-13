<template>
  <!-- A text that shows the date the report is made, or ordinary text -->
  <div class="box-section compact">
    <h5>{{ t("autoDate.title") }}</h5>
    <label class="field">
      <select :value="style ?? ''" :aria-label="t('autoDate.title')" @change="setStyle(($event.target as HTMLSelectElement).value)">
        <option value="">{{ t("autoDate.off") }}</option>
        <option v-for="s in AUTO_DATE_STYLES" :key="s" :value="s">{{ autoDateSample(s) }}</option>
      </select>
    </label>
    <p class="form-hint">{{ t(style ? "autoDate.onHint" : "autoDate.offHint") }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useReportStore } from "@/stores/report";
import { AUTO_DATE_STYLES, autoDateOf, autoDateSample, setAutoDate, type AutoDateStyle } from "@/utils/autoDate";
import type { DesignElement } from "@/types";

const props = defineProps<{ element: DesignElement }>();
const { t } = useI18n();
const report = useReportStore();

const style = computed(() => autoDateOf(props.element));

// One undo step
function setStyle(value: string) {
  const next = (AUTO_DATE_STYLES as readonly string[]).includes(value) ? (value as AutoDateStyle) : null;
  if (next === style.value) return;
  report.saveStateToHistory();
  setAutoDate(props.element, next);
  report.updateJrxml();
}
</script>

<style scoped>
.field select {
  width: 100%;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  box-sizing: border-box;
}

.form-hint {
  margin: 6px 0 0;
  font-size: var(--prop-font-size-xs);
  line-height: 1.4;
  color: var(--prop-text-tertiary);
}
</style>
