<template>
  <div class="pagination-properties">
    <!-- Format: each option shows what the report prints -->
    <div class="card">
      <h5>{{ t("pagination.title") }}</h5>
      <span class="field-label">{{ t("pagination.format") }}</span>
      <div class="format-grid" role="radiogroup">
        <button
          v-for="format in PAGINATION_FORMATS"
          :key="format.id"
          type="button"
          role="radio"
          class="format-option"
          :class="{ active: settings.format === format.id }"
          :aria-checked="settings.format === format.id"
          :title="t(`pagination.formats.${format.id}`)"
          @click="update({ format: format.id })"
        >
          {{ format.sample(1, t("pagination.totalSymbol")) }}
        </button>
      </div>
      <span class="form-hint">{{ t("pagination.totalHint", { n: t("pagination.totalSymbol") }) }}</span>
    </div>

    <!-- Pages the number is printed on -->
    <div class="card">
      <h5>{{ t("pagination.showOn") }}</h5>
      <select
        :aria-label="t('pagination.showOn')"
        :value="settings.range"
        @change="update({ range: ($event.target as HTMLSelectElement).value as PaginationRange })"
      >
        <option v-for="range in PAGINATION_RANGES" :key="range" :value="range">
          {{ t(`pagination.ranges.${range}`) }}
        </option>
      </select>
      <span v-if="settings.range !== 'all' && settings.range !== 'custom'" class="form-hint">
        {{ t(`pagination.rangeHints.${settings.range}`) }}
      </span>

      <template v-if="settings.range === 'custom'">
      <div class="range-row">
        <label class="range-field">
          <span>{{ t("pagination.fromPage") }}</span>
          <input
            type="number"
            min="1"
            step="1"
            :value="settings.from ?? ''"
            :placeholder="'1'"
            @change="updatePage('from', $event)"
          />
        </label>
        <label class="range-field">
          <span>{{ t("pagination.toPage") }}</span>
          <input
            type="number"
            min="1"
            step="1"
            :value="settings.to ?? ''"
            :placeholder="t('pagination.lastPage')"
            @change="updatePage('to', $event)"
          />
        </label>
      </div>
      <span v-if="rangeIsEmpty" class="form-hint is-warning">{{ t("pagination.rangeEmpty") }}</span>
      <template v-else>
        <span class="form-hint">{{ t("pagination.rangeHints.custom") }}</span>
        <span class="form-hint">{{ t("pagination.toPageHint") }}</span>
      </template>
      </template>
    </div>

    <!-- The generated expression, read-only. Hidden for now: to be shown to
         developers only once roles exist.
    <div class="form-group">
      <label>{{ t("pagination.expression") }}</label>
      <textarea class="locked-expression" :value="element.expression" rows="2" readonly></textarea>
      <span class="form-hint">{{ t("pagination.expressionHint") }}</span>
    </div>
    -->
  </div>
</template>

<script setup lang="ts">
import { useReportStore } from "@/stores/report";
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { TextFieldElement } from '../../../types';
import {
  applyPaginationSettings,
  getPaginationSettings,
  PAGINATION_FORMATS,
  PAGINATION_RANGES,
  type PaginationRange,
  type PaginationSettings,
} from '../../../utils/paginationPresets';

const props = defineProps<{
  element: TextFieldElement;
}>();

// Changes: an undo step before, the JRXML rewritten after
const report = useReportStore();


const { t } = useI18n();

const settings = computed(() => getPaginationSettings(props.element));

// From after To: the number would not print on any page
const rangeIsEmpty = computed(
  () => !!settings.value.from && !!settings.value.to && settings.value.from > settings.value.to,
);

// One undo step per change
const update = (patch: Partial<PaginationSettings>) => {
  const next = { ...settings.value, ...patch };
  if (JSON.stringify(next) === JSON.stringify(settings.value)) return;
  report.saveStateToHistory();
  applyPaginationSettings(props.element, next);
  report.updateJrxml();
};

// Empty or invalid = no limit on that side
const updatePage = (side: 'from' | 'to', event: Event) => {
  const input = event.target as HTMLInputElement;
  const value = parseInt(input.value, 10);
  const page = Number.isInteger(value) && value >= 1 ? value : undefined;
  input.value = page ? String(page) : '';
  update({ [side]: page });
};
</script>

<style scoped>
/* Cards, matching the rest of the property panel */
.card {
  margin-bottom: var(--prop-spacing-md);
  padding: var(--prop-spacing-sm) 10px 10px;
  border-radius: var(--prop-border-radius-md);
  background: var(--prop-bg-secondary);
}

.card h5 {
  margin: 0 0 8px;
  font-size: var(--prop-font-size-sm);
  font-weight: 600;
  color: var(--prop-text-primary);
}

.field-label,
.range-field > span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary);
}

.card select,
.card input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  box-sizing: border-box;
}

.card select:focus,
.card input:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

/* Formats as a segmented 2×2 picker */
.format-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--prop-bg-tertiary, #eef0f4);
}

.format-option {
  height: 30px;
  padding: 0 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--prop-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.format-option:hover {
  color: var(--prop-text-primary);
}

.format-option.active {
  background: #fff;
  color: var(--prop-primary-color, #1890ff);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
}

.format-option:focus-visible {
  outline: 2px solid var(--prop-border-focus);
  outline-offset: 1px;
}

.range-row {
  display: flex;
  gap: var(--prop-spacing-sm);
  margin-top: 10px;
}

.range-field {
  flex: 1;
  min-width: 0;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.form-hint.is-warning {
  color: #d48806;
}
</style>
