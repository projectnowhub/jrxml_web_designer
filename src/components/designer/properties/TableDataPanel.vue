<template>
  <!-- Basic: data, which style, row sizes -->
  <template v-if="part === 'basic'">
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
        <span class="tdp-source-name">{{
          t("reportData.projectSource", { project: binding.projectName, source: binding.sourceName })
        }}</span>
        <span class="tdp-muted">{{ t("dataTable.panel.columnCount", binding.columns.length) }}</span>
      </div>

      <div class="tdp-chips">
        <span v-for="col in binding.columns" :key="col.key" class="tdp-chip">{{ col.label }}</span>
      </div>

      <div v-if="filters.length" class="tdp-row">
        <Funnel :size="13" class="tdp-row-icon" aria-hidden="true" />
        <div class="tdp-chips">
          <span v-for="(f, i) in filters" :key="i" class="tdp-chip is-applied">
            {{ describeFilter(binding, f, t, locale) }}
          </span>
        </div>
      </div>

      <div v-if="sorts.length" class="tdp-row">
        <ArrowDownUp :size="13" class="tdp-row-icon" aria-hidden="true" />
        <div class="tdp-chips">
          <span v-for="(s, i) in sorts" :key="i" class="tdp-chip is-applied">{{ s }}</span>
        </div>
      </div>

      <div v-if="binding.rowLimit" class="tdp-row">
        <ListOrdered :size="13" class="tdp-row-icon" aria-hidden="true" />
        <div class="tdp-chips">
          <span class="tdp-chip is-applied">{{ t("dataTable.panel.firstRows", binding.rowLimit) }}</span>
        </div>
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

  <!-- Look: a table style (built-in or saved), changes for this table, row sizes -->
  <div class="tdp-section">
    <h5>{{ t("dataTable.panel.look") }}</h5>
    <span class="tdp-label">{{ t("dataTable.style.label") }}</span>
    <div class="tdp-themes" role="radiogroup" :aria-label="t('dataTable.style.label')">
      <button
        v-for="option in styleOptions"
        :key="option.id"
        type="button"
        role="radio"
        class="tdp-theme"
        :class="{ active: isActiveStyle(option.id) }"
        :aria-checked="isActiveStyle(option.id)"
        :disabled="!binding"
        :title="option.name"
        @click="applyStyle(option.id)"
      >
        <span class="tdp-swatch" aria-hidden="true">
          <span :style="{ background: lookSwatch(option.look).header }"></span>
          <span :style="{ background: lookSwatch(option.look).row }"></span>
          <span :style="{ background: lookSwatch(option.look).stripe }"></span>
        </span>
        <span class="tdp-theme-name">{{ option.name }}</span>
        <Lock v-if="option.builtin" :size="10" class="tdp-lock" :aria-label="t('dataTable.style.preset')" />
      </button>
    </div>

    <!-- The saved style this table uses: rename or delete it here -->
    <div v-if="baseSavedStyle" class="tdp-saved-bar">
      <template v-if="savedMode === 'confirm'">
        <span class="tdp-saved-text is-danger">{{ t("dataTable.style.deleteConfirm", { name: baseSavedStyle.name }) }}</span>
        <button type="button" class="tdp-link is-danger" @click="deleteSavedStyle">{{ t("common.delete") }}</button>
        <button type="button" class="tdp-link is-muted" @click="savedMode = 'view'">{{ t("common.cancel") }}</button>
      </template>
      <template v-else-if="savedMode === 'rename'">
        <input
          ref="renameInput"
          v-model="renameValue"
          class="tdp-input"
          :aria-label="t('dataTable.style.name')"
          @keydown.enter.prevent="finishRename"
          @keydown.esc.prevent="savedMode = 'view'"
          @blur="finishRename"
        />
      </template>
      <template v-else>
        <Bookmark :size="13" aria-hidden="true" />
        <span class="tdp-saved-text">{{ t("dataTable.style.savedStyle", { name: baseSavedStyle.name }) }}</span>
        <button type="button" class="tdp-icon-btn" :title="t('dataTable.style.rename')" :aria-label="t('dataTable.style.rename')" @click="startRename">
          <Pencil :size="12" />
        </button>
        <button type="button" class="tdp-icon-btn is-danger" :title="t('dataTable.style.delete')" :aria-label="t('dataTable.style.delete')" @click="savedMode = 'confirm'">
          <Trash2 :size="12" />
        </button>
      </template>
    </div>

    <!-- This table's own changes -->
    <div v-if="binding && binding.customized" class="tdp-custom-note">
      <Paintbrush :size="13" aria-hidden="true" />
      <span>{{ t("dataTable.style.customizedFrom", { name: baseStyleName }) }}</span>
      <button type="button" class="tdp-link" @click="applyStyle(binding.theme)">
        {{ t("dataTable.style.reset") }}
      </button>
    </div>

    <button type="button" class="tdp-toggle" :disabled="!binding" @click="emit('open-style-settings')">
      <Paintbrush :size="13" aria-hidden="true" />
      <span>{{ t("dataTable.style.customize") }}</span>
      <ChevronRight :size="13" aria-hidden="true" />
    </button>
  </div>

  <!-- Row sizes -->
  <div class="tdp-section">
    <h5>{{ t("dataTable.panel.rowSizes") }}</h5>
    <div class="tdp-grid is-first">
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

  <!-- Style settings: change the look of this table -->
  <template v-else>
  <div class="tdp-section">
    <h5>{{ t("dataTable.style.customize") }}</h5>
    <p v-if="!binding" class="tdp-hint">{{ t("dataTable.style.needData") }}</p>
    <template v-else>
      <p class="tdp-hint">{{ t("dataTable.style.customizeHint") }}</p>
      <div class="tdp-based-on" :class="{ 'is-custom': binding.customized }">
        <span class="tdp-swatch" aria-hidden="true">
          <span :style="{ background: lookSwatch(look).header }"></span>
          <span :style="{ background: lookSwatch(look).row }"></span>
          <span :style="{ background: lookSwatch(look).stripe }"></span>
        </span>
        <span class="tdp-based-text">
          {{ binding.customized ? t("dataTable.style.customizedFrom", { name: baseStyleName }) : t("dataTable.style.usingStyle", { name: baseStyleName }) }}
        </span>
        <button v-if="binding.customized" type="button" class="tdp-link" @click="applyStyle(binding.theme)">
          {{ t("dataTable.style.reset") }}
        </button>
      </div>
    <div class="tdp-editor">

      <div v-for="group in LOOK_GROUPS" :key="group.part" class="tdp-editor-group">
        <span class="tdp-editor-title">{{ t(`dataTable.style.parts.${group.part}`) }}</span>
        <div class="tdp-editor-row">
          <label
            v-for="field in group.colors.filter((f) => f !== 'stripe' || look.stripe !== null)"
            :key="field"
            class="tdp-color"
          >
            <ColorSwatchPicker
              :model-value="look[field] ?? undefined"
              @update:model-value="setLook(field, $event.toUpperCase())"
              @change="endEdit"
            />
            <span>{{ t(`dataTable.style.fields.${field}`) }}</span>
          </label>
          <label v-if="group.bold" class="tdp-check">
            <input
              type="checkbox"
              :checked="look[group.bold]"
              @change="setLook(group.bold, ($event.target as HTMLInputElement).checked, true)"
            />
            {{ t("dataTable.style.bold") }}
          </label>
        </div>
        <label v-if="group.part === 'rows'" class="tdp-check">
          <input type="checkbox" :checked="look.stripe !== null" @change="toggleStripes(($event.target as HTMLInputElement).checked)" />
          {{ t("dataTable.style.stripes") }}
        </label>
      </div>

      <div class="tdp-editor-group">
        <span class="tdp-editor-title">{{ t("dataTable.style.parts.lines") }}</span>
        <div class="tdp-segment" role="radiogroup" :aria-label="t('dataTable.style.parts.lines')">
          <button
            v-for="option in (['grid', 'rows', 'none'] as const)"
            :key="option"
            type="button"
            role="radio"
            :aria-checked="look.lines === option"
            :class="{ active: look.lines === option }"
            @click="setLook('lines', option, true)"
          >
            {{ t(`dataTable.style.lines.${option}`) }}
          </button>
        </div>
        <div v-if="look.lines !== 'none'" class="tdp-editor-row">
          <label v-for="field in (['lineColor', 'ruleColor'] as const)" :key="field" class="tdp-color">
            <ColorSwatchPicker
              :model-value="look[field]"
              @update:model-value="setLook(field, $event.toUpperCase())"
              @change="endEdit"
            />
            <span>{{ t(`dataTable.style.fields.${field}`) }}</span>
          </label>
        </div>
      </div>

      <label class="tdp-field">
        <span class="tdp-label">{{ t("dataTable.style.fontSize") }}</span>
        <span class="tdp-unit">
          <input
            type="number"
            min="6"
            max="24"
            :value="look.fontSize"
            @change="setFontSize(($event.target as HTMLInputElement).value)"
          />
          <span>pt</span>
        </span>
      </label>

      <!-- Keep the changes for this table only, or save them as a style -->
      <div v-if="binding.customized" class="tdp-save">
        <template v-if="naming">
          <input
            ref="nameInput"
            v-model="newStyleName"
            class="tdp-input"
            :placeholder="t('dataTable.style.namePlaceholder')"
            :aria-label="t('dataTable.style.name')"
            @keydown.enter.prevent="saveAsStyle"
            @keydown.esc.prevent="naming = false"
          />
          <div class="tdp-save-actions">
            <button type="button" class="tdp-link" @click="naming = false">{{ t("common.cancel") }}</button>
            <button type="button" class="tdp-btn is-small" :disabled="!newStyleName.trim()" @click="saveAsStyle">
              {{ t("dataTable.style.save") }}
            </button>
          </div>
        </template>
        <template v-else>
          <p class="tdp-hint">{{ t("dataTable.style.onlyThisTable") }}</p>
          <button v-if="baseSavedStyle" type="button" class="tdp-btn is-outline" @click="emit('update-table-style', baseSavedStyle.id)">
            <RefreshCw :size="13" aria-hidden="true" />
            {{ t("dataTable.style.update", { name: baseSavedStyle.name }) }}
          </button>
          <button type="button" class="tdp-btn is-outline" @click="startNaming">
            <BookmarkPlus :size="13" aria-hidden="true" />
            {{ t("dataTable.style.saveAs") }}
          </button>
        </template>
      </div>
    </div>

    </template>
  </div>
  </template>
</template>

<script setup lang="ts">
import { useReportStore } from "@/stores/report";
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowDownUp,
  Bookmark,
  BookmarkPlus,
  ChevronRight,
  Database,
  DatabaseZap,
  Funnel,
  ListOrdered,
  Lock,
  Paintbrush,
  Pencil,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "@lucide/vue";
import ColorSwatchPicker from "@/components/common/ColorSwatchPicker.vue";
import type { TableElement } from "@/types";
import type { SavedTableStyle, TableLook } from "@/types/dataSource";
import {
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  hasTotalsRow,
  rowSlots,
} from "@/utils/table/dataTable";
import { nextTableName } from "@/utils/table/dataBinding";
import {
  BUILTIN_LOOKS,
  TABLE_THEMES,
  isBuiltinTheme,
  lookSwatch,
  resolveLook,
} from "@/utils/table/tableThemes";
import { activeFilters, describeFilter, describeSorts } from "@/utils/table/summary";

const props = defineProps<{
  element: TableElement;
  // Which tab shows the panel: Basic Properties or Style Settings
  part: "basic" | "style";
  // Table styles saved in this report
  tableStyles: SavedTableStyle[];
}>();

// Changes: an undo step before, the JRXML rewritten after
const report = useReportStore();

const emit = defineEmits<{
  configure: [];
  // "Customize" in the Basic tab opens Style Settings
  "open-style-settings": [];
  // Save this table's look as a new reusable style
  "save-table-style": [name: string];
  // Overwrite a saved style with this table's look (all its tables follow)
  "update-table-style": [id: string];
  "rename-table-style": [id: string, name: string];
  "delete-table-style": [id: string];
}>();

const { t, locale } = useI18n();

const binding = computed(() => props.element.binding);
const filters = computed(() => (binding.value ? activeFilters(binding.value) : []));
const sorts = computed(() => (binding.value ? describeSorts(binding.value, t) : []));
const headerHeight = computed(() => props.element.headerHeight ?? TABLE_HEADER_HEIGHT);
const rowHeight = computed(() => props.element.rowHeight ?? TABLE_ROW_HEIGHT);
const look = computed(() => resolveLook(binding.value));

function renameTable(value: string) {
  const name = value.trim();
  if (!binding.value || !name || name === binding.value.tableName) return;
  report.saveStateToHistory();
  binding.value.tableName = name;
  report.updateJrxml();
}

// ── Choosing a style ──
interface StyleOption {
  id: string;
  name: string;
  look: TableLook;
  builtin: boolean;
}

const styleOptions = computed<StyleOption[]>(() => [
  ...TABLE_THEMES.map((id) => ({ id, name: t(`dataTable.theme.${id}`), look: BUILTIN_LOOKS[id], builtin: true })),
  ...props.tableStyles.map((s) => ({ id: s.id, name: s.name, look: s.look, builtin: false })),
]);

const baseSavedStyle = computed(() => props.tableStyles.find((s) => s.id === binding.value?.theme));
const baseStyleName = computed(
  () => styleOptions.value.find((o) => o.id === binding.value?.theme)?.name ?? t("dataTable.theme.corporateBlue"),
);

const isActiveStyle = (id: string) => !!binding.value && !binding.value.customized && binding.value.theme === id;

const copyLook = (value: TableLook): TableLook => ({ ...value });

// Use a style as it is (also "Reset" after changes)
function applyStyle(id: string) {
  const b = binding.value;
  if (!b || isActiveStyle(id)) return;
  report.saveStateToHistory();
  b.theme = id;
  b.customized = undefined;
  const saved = props.tableStyles.find((s) => s.id === id);
  b.look = saved ? copyLook(saved.look) : isBuiltinTheme(id) ? undefined : b.look;
  report.updateJrxml();
}

// ── Renaming or deleting the saved style the table uses ──
const savedMode = ref<"view" | "rename" | "confirm">("view");
const renameValue = ref("");
const renameInput = ref<HTMLInputElement | null>(null);

function startRename() {
  if (!baseSavedStyle.value) return;
  renameValue.value = baseSavedStyle.value.name;
  savedMode.value = "rename";
  nextTick(() => renameInput.value?.select());
}

function finishRename() {
  if (savedMode.value !== "rename") return;
  savedMode.value = "view";
  const style = baseSavedStyle.value;
  const name = renameValue.value.trim();
  if (style && name && name !== style.name) emit("rename-table-style", style.id, name);
}

// The table (and any other table using the style) keeps its look
function deleteSavedStyle() {
  savedMode.value = "view";
  if (baseSavedStyle.value) emit("delete-table-style", baseSavedStyle.value.id);
}

// ── Changing the look for this table only ──

type LookField = keyof TableLook;
const LOOK_GROUPS: {
  part: "header" | "rows" | "totals";
  colors: ("headerBackground" | "headerText" | "rowBackground" | "rowText" | "stripe" | "totalsBackground" | "totalsText")[];
  bold?: "headerBold" | "totalsBold";
}[] = [
  { part: "header", colors: ["headerBackground", "headerText"], bold: "headerBold" },
  { part: "rows", colors: ["rowBackground", "rowText", "stripe"] },
  { part: "totals", colors: ["totalsBackground", "totalsText"], bold: "totalsBold" },
];

// One undo step per change: a colour dragged in the picker is one change
let editing: LookField | null = null;
function endEdit() {
  editing = null;
}

function setLook<K extends LookField>(field: K, value: TableLook[K], single = false) {
  const b = binding.value;
  if (!b) return;
  if (look.value[field] === value) return;
  if (editing !== field) {
    report.saveStateToHistory();
    editing = single ? null : field;
  }
  // The first change makes the table's own copy of its style
  b.look = { ...look.value, [field]: value };
  b.customized = true;
  report.updateJrxml();
}

function toggleStripes(on: boolean) {
  setLook("stripe", on ? (BUILTIN_LOOKS.corporateBlue.stripe as string) : null, true);
}

function setFontSize(value: string) {
  const n = Math.round(Number(value));
  if (Number.isFinite(n) && n >= 6 && n <= 24) setLook("fontSize", n, true);
}

// ── Saving the changes as a reusable style ──
const naming = ref(false);
const newStyleName = ref("");
const nameInput = ref<HTMLInputElement | null>(null);

function startNaming() {
  newStyleName.value = nextTableName(
    styleOptions.value.map((o) => o.name),
    t("dataTable.style.defaultName"),
  );
  naming.value = true;
  nextTick(() => nameInput.value?.select());
}

function saveAsStyle() {
  const name = newStyleName.value.trim();
  if (!name) return;
  naming.value = false;
  emit("save-table-style", name);
}

// Header / row height; the table keeps its number of sample rows
function setRowSize(key: "headerHeight" | "rowHeight", event: Event) {
  const value = Math.round(Number((event.target as HTMLInputElement).value));
  if (!Number.isFinite(value) || value < 12 || value === props.element[key]) return;
  const table = props.element;
  const slots = rowSlots(table);
  report.saveStateToHistory();
  table[key] = value;
  const header = table.headerHeight ?? TABLE_HEADER_HEIGHT;
  const row = table.rowHeight ?? TABLE_ROW_HEIGHT;
  table.height = header + slots * row + (hasTotalsRow(table.binding) ? row : 0);
  report.updateJrxml();
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

.tdp-chip.is-applied {
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

.tdp-theme {
  position: relative;
}

.tdp-theme-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tdp-lock {
  position: absolute;
  top: 4px;
  right: 4px;
  color: var(--prop-text-tertiary, #9ca3af);
}

.tdp-custom-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 11px;
}

.tdp-custom-note span {
  flex: 1;
  min-width: 0;
}

.tdp-link {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: none;
  color: var(--prop-primary-color, #1890ff);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.tdp-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  margin-top: 10px;
  padding: 7px 8px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  background: #fff;
  color: var(--prop-text-primary, #1f2937);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.tdp-toggle span {
  flex: 1;
  text-align: left;
}

.tdp-toggle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tdp-editor {
  margin-top: 8px;
  padding: 10px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 8px;
  background: #fff;
}

.tdp-editor-group {
  padding: 8px 0;
  border-bottom: 1px solid #f0f1f4;
}

.tdp-editor-group:first-of-type {
  padding-top: 0;
}

.tdp-editor-title {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--prop-text-primary, #1f2937);
}

.tdp-editor-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.tdp-color {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--prop-text-secondary, #6b7280);
}

.tdp-check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  font-size: 11px;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
}

.tdp-editor-row .tdp-check {
  margin-top: 0;
}

.tdp-segment {
  display: inline-flex;
  margin-bottom: 8px;
  padding: 2px;
  border-radius: 6px;
  background: #eef0f4;
}

.tdp-segment button {
  padding: 3px 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
}

.tdp-segment button.active {
  background: #fff;
  color: #111827;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.tdp-editor .tdp-field {
  margin: 10px 0 0;
}

.tdp-save {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f1f4;
}

.tdp-save .tdp-hint {
  margin-bottom: 0;
  font-size: 11px;
}

.tdp-save-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.tdp-btn.is-small {
  width: auto;
  height: 28px;
  margin-top: 0;
  padding: 0 12px;
}

.tdp-btn.is-outline {
  margin-top: 8px;
  background: #fff;
  color: var(--prop-primary-color, #1890ff);
}

.tdp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tdp-saved-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 8px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  color: var(--prop-text-secondary, #6b7280);
}

.tdp-saved-bar .tdp-input {
  height: 26px;
}

.tdp-saved-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tdp-saved-text.is-danger,
.tdp-link.is-danger {
  color: #dc2626;
}

.tdp-link.is-muted {
  color: var(--prop-text-secondary, #6b7280);
}

.tdp-icon-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
}

.tdp-icon-btn:hover {
  background: #f3f4f6;
}

.tdp-icon-btn.is-danger:hover {
  background: #fef2f2;
  color: #dc2626;
}

.tdp-grid.is-first {
  margin-top: 0;
}

.tdp-based-on {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding: 6px 8px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  color: var(--prop-text-secondary, #6b7280);
}

.tdp-based-on.is-custom {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #9a3412;
}

.tdp-based-text {
  flex: 1;
  min-width: 0;
}

.tdp-editor {
  margin-top: 0;
}
</style>
