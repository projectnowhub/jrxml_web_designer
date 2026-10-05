<template>
  <!-- Data: what the table shows (edited in the Configure popup) -->
  <div class="tdp-section">
    <h5>{{ t("dataTable.panel.data") }}</h5>

    <template v-if="binding">
      <label class="tdp-field">
        <span class="tdp-label">{{ t("dataTable.panel.tableName") }}</span>
        <input
          class="tdp-input"
          :value="binding.tableName"
          @change="renameTable(($event.target as HTMLInputElement).value)"
        />
      </label>

      <div class="tdp-source">
        <Database :size="14" aria-hidden="true" />
        <span class="tdp-source-name">{{ binding.sourceName }}</span>
        <span class="tdp-muted">{{ t("dataTable.panel.columnCount", binding.columns.length) }}</span>
      </div>

      <div class="tdp-chips">
        <span v-for="col in binding.columns" :key="col.key" class="tdp-chip">{{ col.label }}</span>
      </div>

      <div v-if="filters.length" class="tdp-row">
        <Funnel :size="13" class="tdp-row-icon" aria-hidden="true" />
        <div class="tdp-chips">
          <span v-for="(f, i) in filters" :key="i" class="tdp-chip is-filter">
            {{ describeFilter(binding, f, t) }}
          </span>
          <span v-if="filters.length > 1" class="tdp-muted">
            {{ t(binding.filterMatch === "any" ? "dataTable.panel.matchAny" : "dataTable.panel.matchAll") }}
          </span>
        </div>
      </div>

      <div v-if="sorts.length" class="tdp-row">
        <ArrowDownUp :size="13" class="tdp-row-icon" aria-hidden="true" />
        <div class="tdp-chips">
          <span v-for="(s, i) in sorts" :key="i" class="tdp-chip">
            {{ s.label }}
            <component :is="s.direction === 'asc' ? ArrowUp : ArrowDown" :size="11" aria-hidden="true" />
          </span>
        </div>
      </div>

      <div v-if="binding.rowLimit" class="tdp-row">
        <ListOrdered :size="13" class="tdp-row-icon" aria-hidden="true" />
        <span class="tdp-muted">{{ t("dataTable.panel.firstRows", binding.rowLimit) }}</span>
      </div>

      <button type="button" class="tdp-btn" @click="emit('configure')">
        <SlidersHorizontal :size="14" aria-hidden="true" />
        {{ t("dataTable.panel.editData") }}
      </button>
    </template>

    <template v-else>
      <p class="tdp-hint">{{ t("dataTable.panel.emptyHint") }}</p>
      <button type="button" class="tdp-btn" @click="emit('configure')">
        <DatabaseZap :size="14" aria-hidden="true" />
        {{ t("dataTable.panel.chooseData") }}
      </button>
    </template>
  </div>

  <!-- Look: theme and row sizes -->
  <div class="tdp-section">
    <h5>{{ t("dataTable.panel.look") }}</h5>
    <span class="tdp-label">{{ t("dataTable.theme.label") }}</span>
    <div class="tdp-themes" role="radiogroup" :aria-label="t('dataTable.theme.label')">
      <button
        v-for="theme in TABLE_THEMES"
        :key="theme"
        type="button"
        role="radio"
        class="tdp-theme"
        :class="{ active: currentTheme === theme }"
        :aria-checked="currentTheme === theme"
        :disabled="!binding"
        @click="setTheme(theme)"
      >
        <span class="tdp-swatch" aria-hidden="true">
          <span :style="{ background: themeSwatch(theme).header }"></span>
          <span :style="{ background: '#fff' }"></span>
          <span :style="{ background: themeSwatch(theme).stripe }"></span>
        </span>
        <span>{{ t(`dataTable.theme.${theme}`) }}</span>
      </button>
    </div>

    <div class="tdp-grid">
      <label class="tdp-field">
        <span class="tdp-label">{{ t("dataTable.panel.headerHeight") }}</span>
        <span class="tdp-unit">
          <input
            type="number"
            min="12"
            max="80"
            :value="headerHeight"
            @change="setRowSize('headerHeight', $event)"
          />
          <span>pt</span>
        </span>
      </label>
      <label class="tdp-field">
        <span class="tdp-label">{{ t("dataTable.panel.rowHeight") }}</span>
        <span class="tdp-unit">
          <input
            type="number"
            min="12"
            max="80"
            :value="rowHeight"
            @change="setRowSize('rowHeight', $event)"
          />
          <span>pt</span>
        </span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Database,
  DatabaseZap,
  Funnel,
  ListOrdered,
  SlidersHorizontal,
} from "@lucide/vue";
import type { ReportStyle, TableElement } from "@/types";
import type { TableTheme } from "@/types/dataSource";
import {
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  hasTotalsRow,
  rowSlots,
} from "@/utils/table/dataTable";
import { TABLE_THEMES, ensureThemeStyles, themeSwatch } from "@/utils/table/tableThemes";
import { activeFilters, describeFilter, describeSorts } from "@/utils/table/summary";

const props = defineProps<{
  element: TableElement;
  reportStyles: ReportStyle[];
}>();

const emit = defineEmits<{
  configure: [];
  "save-state": [];
  "update-jrxml": [];
  "update:report-styles": [styles: ReportStyle[]];
}>();

const { t } = useI18n();

const binding = computed(() => props.element.binding);
const filters = computed(() => (binding.value ? activeFilters(binding.value) : []));
const sorts = computed(() => (binding.value ? describeSorts(binding.value) : []));
const currentTheme = computed(() => binding.value?.theme ?? "corporateBlue");
const headerHeight = computed(() => props.element.headerHeight ?? TABLE_HEADER_HEIGHT);
const rowHeight = computed(() => props.element.rowHeight ?? TABLE_ROW_HEIGHT);

function renameTable(value: string) {
  const name = value.trim();
  if (!binding.value || !name || name === binding.value.tableName) return;
  emit("save-state");
  binding.value.tableName = name;
  emit("update-jrxml");
}

function setTheme(theme: TableTheme) {
  if (!binding.value || binding.value.theme === theme) return;
  emit("save-state");
  binding.value.theme = theme;
  // The theme's styles join the report (and Style Management) on first use
  const styles = ensureThemeStyles(props.reportStyles, theme);
  if (styles !== props.reportStyles) emit("update:report-styles", styles);
  emit("update-jrxml");
}

// Header / row height; the table keeps its number of sample rows
function setRowSize(key: "headerHeight" | "rowHeight", event: Event) {
  const value = Math.round(Number((event.target as HTMLInputElement).value));
  if (!Number.isFinite(value) || value < 12 || value === props.element[key]) return;
  const table = props.element;
  const slots = rowSlots(table);
  emit("save-state");
  table[key] = value;
  const header = table.headerHeight ?? TABLE_HEADER_HEIGHT;
  const row = table.rowHeight ?? TABLE_ROW_HEIGHT;
  table.height = header + slots * row + (hasTotalsRow(table.binding) ? row : 0);
  emit("update-jrxml");
}
</script>

<style scoped>
.tdp-section {
  padding: 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: var(--prop-bg-secondary, #f7f8fa);
}

.tdp-section h5 {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--prop-text-primary, #1f2937);
}

.tdp-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--prop-text-secondary, #6b7280);
}

.tdp-field {
  display: block;
  margin-bottom: 10px;
}

.tdp-input,
.tdp-unit input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  box-sizing: border-box;
}

.tdp-input:focus,
.tdp-unit input:focus {
  outline: none;
  border-color: var(--prop-border-focus, #1890ff);
  box-shadow: var(--prop-focus-ring);
}

.tdp-unit {
  position: relative;
  display: flex;
  align-items: center;
}

.tdp-unit input {
  padding-right: 24px;
  -moz-appearance: textfield;
}

.tdp-unit input::-webkit-outer-spin-button,
.tdp-unit input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.tdp-unit > span {
  position: absolute;
  right: 8px;
  font-size: 11px;
  color: var(--prop-text-tertiary, #9ca3af);
  pointer-events: none;
}

.tdp-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.tdp-grid .tdp-field {
  margin-bottom: 0;
}

.tdp-source {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--prop-text-primary, #1f2937);
}

.tdp-source-name {
  font-weight: 600;
}

.tdp-muted {
  font-size: 11px;
  color: var(--prop-text-tertiary, #9ca3af);
}

.tdp-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
}

.tdp-row-icon {
  flex-shrink: 0;
  margin-top: 4px;
  color: var(--prop-text-secondary, #6b7280);
}

.tdp-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.tdp-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  font-size: 11px;
  color: var(--prop-text-primary, #1f2937);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tdp-chip.is-filter {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.tdp-hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--prop-text-secondary, #6b7280);
}

.tdp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 32px;
  margin-top: 12px;
  border: 1px solid var(--prop-primary-color, #1890ff);
  border-radius: 6px;
  background: var(--prop-primary-color, #1890ff);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.tdp-btn:hover {
  filter: brightness(1.05);
}

.tdp-themes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.tdp-theme {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  background: #fff;
  font-size: 10.5px;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
}

.tdp-theme:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tdp-theme.active {
  border-color: var(--prop-primary-color, #1890ff);
  color: var(--prop-primary-color, #1890ff);
  font-weight: 600;
  box-shadow: 0 0 0 1px var(--prop-primary-color, #1890ff);
}

.tdp-swatch {
  display: flex;
  flex-direction: column;
  width: 36px;
  border: 1px solid #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.tdp-swatch span {
  height: 5px;
}
</style>
