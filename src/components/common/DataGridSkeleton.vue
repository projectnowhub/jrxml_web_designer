<template>
  <!-- A table being loaded: a heading bar and rows that fade out, as the CDP
       app's DataTableSkeleton -->
  <div class="grid-skeleton" role="status" :aria-label="t('dataTable.loading')">
    <div class="grid-skeleton-row is-head">
      <SkeletonBlock v-for="(w, j) in WIDTHS" :key="j" :width="`${w}px`" height="10px" radius="4px" />
    </div>
    <div v-for="i in rows" :key="i" class="grid-skeleton-row" :style="{ opacity: Math.max(0.25, 1 - (i - 1) * 0.1) }">
      <SkeletonBlock v-for="(w, j) in WIDTHS" :key="j" :width="`${w}px`" height="10px" radius="4px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import SkeletonBlock from "./SkeletonBlock.vue";

withDefaults(defineProps<{ rows?: number }>(), { rows: 8 });

const { t } = useI18n();

// The CDP DataTableSkeleton's column widths
const WIDTHS = [40, 160, 120, 100, 80, 60];
</script>

<style scoped>
.grid-skeleton {
  width: 100%;
  overflow: hidden;
}

.grid-skeleton-row {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1px solid #eef0f4;
}

.grid-skeleton-row.is-head {
  background: #f8f7fc;
}
</style>
