<template>
  <!-- The number a chart (or one of its lines / bars) shows: the CDP app's
       MeasurePicker. "Number of records" or a number field, and for a field
       its Calculation (Sum / Avg / Min / Max) -->
  <div class="cmp">
    <label class="cmp-label">{{ label }}</label>
    <div class="cmp-select-wrap">
      <select class="cmp-select" :value="measure.column ?? RECORD_COUNT" :aria-label="label" @change="pickField(($event.target as HTMLSelectElement).value)">
        <option :value="RECORD_COUNT">{{ t("chart.panel.numberOfRecords") }}</option>
        <option v-for="c in columns" :key="c.key" :value="c.key">{{ c.label }}</option>
      </select>
      <ChevronDown class="cmp-chevron" :size="14" aria-hidden="true" />
    </div>
    <template v-if="measure.column">
      <span class="cmp-sub">{{ t("chart.config.calculation") }}</span>
      <ChartSegmented
        :options="FIELD_AGGREGATIONS.map((a) => ({ value: a, label: t(`chart.aggregations.${a}`) }))"
        :model-value="measure.aggregation"
        @update:model-value="pickAggregation($event as ChartAggregation)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ChevronDown } from "@lucide/vue";
import ChartSegmented from "./ChartSegmented.vue";
import type { ChartAggregation, ChartMeasure, DataColumn } from "@/types/dataSource";

const props = defineProps<{
  label: string;
  measure: ChartMeasure;
  // The number fields that can be added up
  columns: DataColumn[];
}>();

const emit = defineEmits<{
  change: [measure: ChartMeasure];
}>();

const { t } = useI18n();

const RECORD_COUNT = "__RECORD_COUNT__";
const FIELD_AGGREGATIONS: ChartAggregation[] = ["sum", "avg", "min", "max"];

// A field after "Number of records" starts as Sum (as the CDP app)
function pickField(key: string) {
  const column = props.columns.find((c) => c.key === key);
  if (!column) return emit("change", { aggregation: "count" });
  const aggregation = props.measure.aggregation === "count" ? "sum" : props.measure.aggregation;
  emit("change", { aggregation, column: column.key, columnLabel: column.label });
}

function pickAggregation(aggregation: ChartAggregation) {
  emit("change", { ...props.measure, aggregation });
}
</script>

<style scoped>
.cmp {
  margin-bottom: 16px;
}

.cmp-label {
  display: block;
  margin-bottom: 8px;
  color: #6f6a7e;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.cmp-sub {
  display: block;
  margin: 10px 0 4px;
  color: #6f6a7e;
  font-size: 11.5px;
}

.cmp-select-wrap {
  position: relative;
}

.cmp-select {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 10px;
  border: 1px solid #e6e5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 13px;
  appearance: none;
  cursor: pointer;
}

.cmp-select:focus {
  outline: none;
  border-color: #6440f4;
  box-shadow: 0 0 0 1px #6440f4;
}

.cmp-chevron {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  color: #8a84a3;
  pointer-events: none;
}
</style>
