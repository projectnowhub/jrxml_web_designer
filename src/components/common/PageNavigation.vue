<template>
  <!-- Pages of a list: "1–25 of 512", First / Previous / 1 … 4 5 6 … 21 / Next /
       Last, and optionally how many rows a page shows (My Templates' list,
       the table setup popup's grid) -->
  <nav class="page-navigation" :class="{ 'is-compact': compact }" :aria-label="t('pageNavigation.pages')">
    <span class="page-range">
      {{ total > 0 ? t("pageNavigation.range", { from: firstShown, to: lastShown, total }) : t("pageNavigation.noRows") }}
    </span>
    <div class="page-buttons">
      <button
        type="button"
        class="page-step"
        :disabled="page <= 1"
        :title="t('pageNavigation.first')"
        :aria-label="t('pageNavigation.first')"
        @click="goTo(1)"
      >
        <ChevronsLeft :size="iconSize" :stroke-width="2.25" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="page-step"
        :disabled="page <= 1"
        :title="compact ? t('pageNavigation.previous') : undefined"
        :aria-label="t('pageNavigation.previous')"
        @click="goTo(page - 1)"
      >
        <ChevronLeft :size="iconSize" :stroke-width="2.25" aria-hidden="true" />
        <template v-if="!compact">{{ t("pageNavigation.previous") }}</template>
      </button>
      <template v-for="(number, index) in pageNumbers" :key="index">
        <span v-if="number === 0" class="page-gap">…</span>
        <button
          v-else
          type="button"
          class="page-number"
          :class="{ active: number === page }"
          :aria-current="number === page ? 'page' : undefined"
          @click="goTo(number)"
        >
          {{ number }}
        </button>
      </template>
      <button
        type="button"
        class="page-step"
        :disabled="page >= pageCount"
        :title="compact ? t('pageNavigation.next') : undefined"
        :aria-label="t('pageNavigation.next')"
        @click="goTo(page + 1)"
      >
        <template v-if="!compact">{{ t("pageNavigation.next") }}</template>
        <ChevronRight :size="iconSize" :stroke-width="2.25" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="page-step"
        :disabled="page >= pageCount"
        :title="t('pageNavigation.last')"
        :aria-label="t('pageNavigation.last')"
        @click="goTo(pageCount)"
      >
        <ChevronsRight :size="iconSize" :stroke-width="2.25" aria-hidden="true" />
      </button>
    </div>
    <label v-if="pageSizes?.length" class="page-size-choice">
      <span>{{ t("pageNavigation.perPage") }}</span>
      <select :value="pageSize" @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))">
        <option v-for="size in pageSizes" :key="size" :value="size">{{ size }}</option>
      </select>
      <ChevronDown :size="13" :stroke-width="2.25" aria-hidden="true" />
    </label>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "@lucide/vue";

const props = defineProps<{
  // The page shown, from 1
  page: number;
  pageSize: number;
  // Rows in the whole list
  total: number;
  // Offer these page sizes next to the pages (none: the caller has its own)
  pageSizes?: readonly number[];
  // Smaller buttons, icons only (inside a popup)
  compact?: boolean;
}>();

const emit = defineEmits<{
  "update:page": [page: number];
  "update:pageSize": [size: number];
}>();

const { t } = useI18n();

const iconSize = computed(() => (props.compact ? 13 : 15));
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
const firstShown = computed(() => (props.page - 1) * props.pageSize + 1);
const lastShown = computed(() => Math.min(props.page * props.pageSize, props.total));

// 1 … 4 5 6 … 12 (0 = the gap)
const pageNumbers = computed(() => {
  const last = pageCount.value;
  const current = props.page;
  const shown = new Set([1, last, current - 1, current, current + 1].filter((n) => n >= 1 && n <= last));
  const sorted = [...shown].sort((a, b) => a - b);
  const result: number[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - (sorted[i - 1] ?? n) > 1) result.push(0);
    result.push(n);
  });
  return result;
});

function goTo(page: number) {
  const next = Math.min(Math.max(1, page), pageCount.value);
  if (next !== props.page) emit("update:page", next);
}
</script>

<style scoped>
.page-navigation {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-range {
  color: #6f6a7e;
  font-size: 11.5px;
}

.page-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-step,
.page-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 32px;
  height: 32px;
  padding: 0 9px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #45425a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.is-compact .page-step,
.is-compact .page-number {
  min-width: 26px;
  height: 26px;
  padding: 0 6px;
  font-size: 11.5px;
}

.page-step:hover:not(:disabled),
.page-number:hover {
  border-color: #6440f4;
  color: #6440f4;
}

.page-step:disabled {
  opacity: 0.45;
  cursor: default;
}

.page-number.active {
  border-color: #6440f4;
  background: #6440f4;
  color: #ffffff;
}

.page-gap {
  padding: 0 4px;
  color: #8a84a3;
}

.page-size-choice {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6f6a7e;
  font-size: 11.5px;
}

.page-size-choice select {
  height: 26px;
  padding: 0 24px 0 8px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 12px;
  appearance: none;
  cursor: pointer;
}

.page-size-choice svg {
  position: absolute;
  right: 7px;
  pointer-events: none;
  color: #6f6a7e;
}

@media (max-width: 620px) {
  .page-number:not(.active) {
    display: none;
  }
}
</style>
