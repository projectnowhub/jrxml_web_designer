<template>
  <template v-if="asListed">
    <option v-for="c in columns" :key="c.key" :value="c.key" :disabled="c.key === disabledKey">{{ c.label }}</option>
  </template>
  <template v-else>
  <option v-for="c in groups.good" :key="c.key" :value="c.key" :disabled="c.key === disabledKey">{{ c.label }}</option>
  <optgroup v-if="groups.free.length" :label="t('chart.config.otherColumns')">
    <option v-for="c in groups.free" :key="c.key" :value="c.key" :disabled="c.key === disabledKey">{{ c.label }}</option>
  </optgroup>
  <option v-for="c in groups.linked" :key="c.key" :value="c.key" disabled>{{ t("chart.config.cantGroup", { name: c.label }) }}</option>
  </template>
</template>

<script setup lang="ts">
// The columns a chart can group by, as the options of a <select>: choice
// fields, yes / no fields and dates first (they group well, like the CDP
// app's groupable fields), free text after them under "Other columns" (often
// a different value on every row), and links to other records last, greyed
// out (the backend would group them by the record's hidden id). asListed: the
// columns as given (a CDP dashboard's field list, in its order)
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { groupingColumns } from "@/utils/chart/chartTypes";
import type { DataColumn } from "@/types/dataSource";

const props = defineProps<{
  columns: DataColumn[];
  // A column chosen in another slot (the categories), not offered again
  disabledKey?: string;
  asListed?: boolean;
}>();

const { t } = useI18n();

const groups = computed(() => groupingColumns(props.columns));
</script>
