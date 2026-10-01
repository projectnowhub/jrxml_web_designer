<template>
  <div class="pagination-properties">
    <h4>{{ t("pagination.title") }}</h4>

    <!-- Format: each option shows what the report prints -->
    <div class="form-group">
      <label>{{ t("pagination.format") }}</label>
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
    <div class="form-group">
      <label>{{ t("pagination.showOn") }}</label>
      <select
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
    </div>

    <div v-if="settings.range === 'custom'" class="form-group">
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

const emit = defineEmits<{
  'save-state': [];
  'update-jrxml': [];
}>();

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
  emit('save-state');
  applyPaginationSettings(props.element, next);
  emit('update-jrxml');
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
.pagination-properties {
  padding: var(--prop-spacing-sm) 0;
}

.pagination-properties h4 {
  margin: 0 0 var(--prop-spacing-lg) 0;
  padding: 0 0 var(--prop-spacing-sm) 0;
  font-size: var(--prop-font-size-md);
  color: var(--prop-text-primary);
  font-weight: var(--prop-font-weight-semibold);
  border-bottom: 1px solid var(--prop-divider-color);
}

.form-group {
  margin-bottom: var(--prop-spacing-lg);
}

.form-group > label,
.range-field > span {
  display: block;
  margin-bottom: var(--prop-spacing-xs);
  font-size: var(--prop-font-size-sm);
  color: var(--prop-text-secondary);
  font-weight: var(--prop-font-weight-medium);
}

.form-group select,
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  font-size: var(--prop-font-size-sm);
  box-sizing: border-box;
}

.form-group select:focus,
.form-group input:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.format-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--prop-spacing-sm);
}

.format-option {
  padding: 6px 4px;
  background: transparent;
  border: 1px solid var(--prop-border-color);
  border-radius: var(--prop-border-radius-md);
  font-size: var(--prop-font-size-sm);
  color: var(--prop-text-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color var(--prop-transition-fast), box-shadow var(--prop-transition-fast);
}

.format-option:hover {
  border-color: var(--prop-border-hover);
}

.format-option.active,
.format-option:focus-visible {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.format-option.active {
  background-color: rgba(24, 144, 255, 0.06);
  font-weight: var(--prop-font-weight-semibold);
}

.range-row {
  display: flex;
  gap: var(--prop-spacing-sm);
}

.range-field {
  flex: 1;
  min-width: 0;
}

.locked-expression {
  font-family: monospace;
  resize: none;
  color: var(--prop-text-secondary);
  background: var(--prop-bg-disabled);
  cursor: not-allowed;
}

.form-hint {
  display: block;
  margin-top: var(--prop-spacing-xs);
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.form-hint.is-warning {
  color: #d48806;
}
</style>
