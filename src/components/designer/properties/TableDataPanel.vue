<template>
  <!-- Basic: data, which style, row sizes -->
  <template v-if="part === 'basic'">
  <!-- Data: what the table shows (edited in the Configure popup) -->
  <div v-if="!isTyped" class="tdp-section">
    <h5>{{ t("dataTable.panel.data") }}<SettingHelpButton id="tableData" /></h5>
    <SettingHelpText id="tableData" />

    <template v-if="binding">
      <label class="tdp-field">
        <span class="tdp-label">{{ t("dataTable.panel.tableName") }}</span>
        <input v-live-change
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
    <h5>{{ t("dataTable.panel.look") }}<SettingHelpButton id="tableLook" /></h5>
    <SettingHelpText id="tableLook" />
    <span class="tdp-label">{{ t("dataTable.style.label") }}</span>
    <div class="tdp-themes" role="radiogroup" :aria-label="t('dataTable.style.label')">
      <button
        v-for="option in builtinOptions"
        :key="option.id"
        type="button"
        role="radio"
        class="tdp-theme"
        :class="{ active: isActiveStyle(option.id) }"
        :aria-checked="isActiveStyle(option.id)"
        :disabled="!holder"
        :title="option.name"
        @click="applyStyle(option.id)"
      >
        <span class="tdp-swatch" aria-hidden="true">
          <span :style="{ background: lookSwatch(option.look).header }"></span>
          <span :style="{ background: lookSwatch(option.look).row }"></span>
          <span :style="{ background: lookSwatch(option.look).stripe }"></span>
        </span>
        <span class="tdp-theme-name">{{ option.name }}</span>
        <Lock :size="10" class="tdp-lock" :aria-label="t('dataTable.style.preset')" />
      </button>
    </div>

    <!-- Styles saved in this template: rename or delete each on its own tile -->
    <template v-if="savedOptions.length">
      <span class="tdp-label tdp-label-gap">{{ t("dataTable.style.myStyles") }}</span>
      <div class="tdp-themes" role="radiogroup" :aria-label="t('dataTable.style.myStyles')">
        <div
          v-for="option in savedOptions"
          :key="option.id"
          class="tdp-theme-wrap"
          :class="{ active: isActiveStyle(option.id) && tileMode(option.id) === 'view' }"
        >
          <!-- Renaming: the name is typed in the tile -->
          <div v-if="tileMode(option.id) === 'rename'" class="tdp-theme is-editing">
            <input
              ref="renameInput"
              v-model="renameValue"
              class="tdp-input tdp-tile-input"
              :aria-label="t('dataTable.style.name')"
              @keydown.enter.prevent="finishRename"
              @keydown.esc.prevent="cancelTile"
              @blur="finishRename"
            />
          </div>
          <!-- Deleting: asked in the tile -->
          <div v-else-if="tileMode(option.id) === 'confirm'" class="tdp-theme is-editing">
            <span class="tdp-tile-question">{{ t("dataTable.style.deleteConfirm", { name: option.name }) }}</span>
            <span class="tdp-tile-answers">
              <button type="button" class="tdp-link is-danger" @click="deleteSavedStyle">{{ t("common.delete") }}</button>
              <button type="button" class="tdp-link is-muted" @click="cancelTile">{{ t("common.cancel") }}</button>
            </span>
          </div>
          <template v-else>
            <button
              type="button"
              role="radio"
              class="tdp-theme"
              :class="{ active: isActiveStyle(option.id) }"
              :aria-checked="isActiveStyle(option.id)"
              :disabled="!holder"
              :title="option.name"
              @click="applyStyle(option.id)"
            >
              <span class="tdp-swatch" aria-hidden="true">
                <span :style="{ background: lookSwatch(option.look).header }"></span>
                <span :style="{ background: lookSwatch(option.look).row }"></span>
                <span :style="{ background: lookSwatch(option.look).stripe }"></span>
              </span>
              <span class="tdp-theme-name">{{ option.name }}</span>
            </button>
            <span class="tdp-tile-actions">
              <button
                type="button"
                class="tdp-tile-btn"
                :title="t('dataTable.style.renameStyle', { name: option.name })"
                :aria-label="t('dataTable.style.renameStyle', { name: option.name })"
                @click="startRename(option.id)"
              >
                <Pencil :size="10" />
              </button>
              <button
                type="button"
                class="tdp-tile-btn is-danger"
                :title="t('dataTable.style.deleteStyle', { name: option.name })"
                :aria-label="t('dataTable.style.deleteStyle', { name: option.name })"
                @click="askDelete(option.id)"
              >
                <Trash2 :size="10" />
              </button>
            </span>
          </template>
        </div>
      </div>
    </template>

    <!-- This table's own changes -->
    <div v-if="holder && holder.customized" class="tdp-custom-note">
      <Paintbrush :size="13" aria-hidden="true" />
      <span>{{ t("dataTable.style.customizedFrom", { name: baseStyleName }) }}</span>
      <button type="button" class="tdp-link" @click="applyStyle(holder.theme)">
        {{ t("dataTable.style.reset") }}
      </button>
    </div>

    <button type="button" class="tdp-toggle" :disabled="!holder" @click="emit('open-style-settings')">
      <Paintbrush :size="13" aria-hidden="true" />
      <span>{{ t("dataTable.style.customize") }}</span>
      <ChevronRight :size="13" aria-hidden="true" />
    </button>
    <div v-if="binding && dataTable" class="tdp-highlight-summary-bar">
      <span class="tdp-highlight-summary-text">{{ highlightSummaryText }}</span>
      <span class="tdp-bullet" aria-hidden="true">·</span>
      <button type="button" class="tdp-link" @click="emit('configure')">
        {{ t("dataTable.highlight.editInSetup") }}
      </button>
    </div>
  </div>

  <!-- Row sizes -->
  <div v-if="!isTyped" class="tdp-section">
    <h5>{{ t("dataTable.panel.rowSizes") }}<SettingHelpButton id="tableRowSizes" /></h5>
    <SettingHelpText id="tableRowSizes" />
    <div class="tdp-grid is-first">
      <label class="tdp-field">
        <span class="tdp-label">{{ t("dataTable.panel.headerHeight") }}</span>
        <span class="tdp-unit">
          <input v-live-change
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
          <input v-live-change
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
  <!-- The Cells card for project-data tables -->
  <TableDataCells v-if="binding && dataTable" :element="dataTable" :binding="binding" />

  <div class="tdp-section">
    <h5>{{ t("dataTable.style.customize") }}<SettingHelpButton id="tableCustomize" /></h5>
    <SettingHelpText id="tableCustomize" />
    <p v-if="!holder" class="tdp-hint">{{ t("dataTable.style.needData") }}</p>
    <template v-else>
      <p class="tdp-hint">{{ t("dataTable.style.customizeHint") }}</p>
      <!-- Some cells / one column get their own look in the card above it -->
      <p v-if="!cellsChosen" class="tdp-hint tdp-cells-hint">
        <MousePointerClick :size="13" aria-hidden="true" />
        <span>{{ t(isTyped ? "dataTable.style.cellsHintTyped" : "dataTable.style.cellsHintData") }}</span>
      </p>
      <div class="tdp-based-on" :class="{ 'is-custom': holder.customized }">
        <span class="tdp-swatch" aria-hidden="true">
          <span :style="{ background: lookSwatch(look).header }"></span>
          <span :style="{ background: lookSwatch(look).row }"></span>
          <span :style="{ background: lookSwatch(look).stripe }"></span>
        </span>
        <span class="tdp-based-text">
          {{ holder.customized ? t("dataTable.style.customizedFrom", { name: baseStyleName }) : t("dataTable.style.usingStyle", { name: baseStyleName }) }}
        </span>
        <button v-if="holder.customized" type="button" class="tdp-link" @click="applyStyle(holder.theme)">
          {{ t("dataTable.style.reset") }}
        </button>
      </div>
    <div class="tdp-editor">

      <div v-for="group in LOOK_GROUPS" :key="group.part" class="tdp-editor-group">
        <span class="tdp-editor-title">{{ t(`dataTable.style.parts.${group.part}`) }}</span>
        <div class="tdp-editor-row">
          <label
            v-for="field in group.colors"
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
        <!-- Body rows take these colours in turn (1 to 4) -->
        <div v-if="group.part === 'rows'" class="tdp-row-colors">
          <span class="tdp-label">{{ t("dataTable.style.rowColors") }}</span>
          <div class="tdp-editor-row">
            <div v-for="(rowColor, i) in look.rowColors" :key="i" class="tdp-row-color">
              <label class="tdp-color">
                <ColorSwatchPicker
                  :model-value="rowColor"
                  @update:model-value="setRowColor(i, $event)"
                  @change="endEdit"
                />
                <span>{{ t("dataTable.style.rowN", { n: i + 1 }) }}</span>
              </label>
              <button
                v-if="look.rowColors.length > 1"
                type="button"
                class="tdp-icon-btn is-danger"
                :title="t('dataTable.style.removeRowColor', { n: i + 1 })"
                :aria-label="t('dataTable.style.removeRowColor', { n: i + 1 })"
                @click="removeRowColor(i)"
              >
                <Trash2 :size="12" />
              </button>
            </div>
            <button
              v-if="look.rowColors.length < MAX_ROW_COLORS"
              type="button"
              class="tdp-add-btn"
              :title="t('dataTable.style.addRowColorHint')"
              @click="addRowColor"
            >
              <Plus :size="13" aria-hidden="true" />
              {{ t("dataTable.style.addRowColor") }}
            </button>
          </div>
          <span class="tdp-row-preview" aria-hidden="true">
            <span v-for="n in 8" :key="n" :style="{ background: look.rowColors[(n - 1) % look.rowColors.length] }"></span>
          </span>
          <small class="tdp-hint">{{ t("dataTable.style.rowColorsHint") }}</small>
        </div>
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
          <input v-live-change
            type="number"
            min="6"
            max="24"
            :value="look.fontSize"
            @change="setFontSize(($event.target as HTMLInputElement).value)"
          />
          <span>pt</span>
        </span>
      </label>

      <!-- Typed tables: the space between a cell's text and its lines -->
      <label v-if="typedTable" class="tdp-field">
        <span class="tdp-label">{{ t("customTable.padding") }}</span>
        <span class="tdp-unit">
          <input v-live-change
            type="number"
            min="0"
            max="40"
            :value="typedTable.padding"
            @change="setPadding(($event.target as HTMLInputElement).value)"
          />
          <span>px</span>
        </span>
      </label>

      <!-- Keep the changes for this table only, or save them as a style -->
      <div v-if="holder.customized" class="tdp-save">
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
import TableDataCells from "./TableDataCells.vue";
import SettingHelpButton from "../../help/SettingHelpButton.vue";
import SettingHelpText from "../../help/SettingHelpText.vue";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import { storeToRefs } from "pinia";
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowDownUp,
  BookmarkPlus,
  ChevronRight,
  Database,
  DatabaseZap,
  Funnel,
  Lock,
  MousePointerClick,
  Paintbrush,
  Pencil,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
} from "@lucide/vue";
import ColorSwatchPicker from "@/components/common/ColorSwatchPicker.vue";
import type { CustomTableElement, TableElement } from "@/types";
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
  MAX_ROW_COLORS,
  TABLE_THEMES,
  isBuiltinTheme,
  lookSwatch,
  resolveLook,
} from "@/utils/table/tableThemes";
import { activeFilters, describeFilter, describeSorts } from "@/utils/table/summary";

const props = defineProps<{
  // A data table, or a typed table (style sections only)
  element: TableElement | CustomTableElement;
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

// A data table's binding; a typed table has no data (its setup holds the style)
const binding = computed(() => (props.element.type === "table" ? props.element.binding : undefined));
const isTyped = computed(() => props.element.type === "customTable");
// What carries the table's style: the data table's binding or the typed table's setup
const holder = computed(() =>
  props.element.type === "customTable" ? props.element.table : props.element.binding,
);
const filters = computed(() => (binding.value ? activeFilters(binding.value) : []));
const sorts = computed(() => (binding.value ? describeSorts(binding.value, t) : []));
const dataTable = computed(() => (props.element.type === "table" ? props.element : null));
const typedTable = computed(() => (props.element.type === "customTable" ? props.element.table : null));
// Whether the card above Customize is showing: a typed table's chosen cells
// (while it is open), or a project-data table's chosen column
const { tableCells, tableColumn, editingElement } = storeToRefs(useSelectionStore());
const cellsChosen = computed(() =>
  isTyped.value
    ? !!editingElement.value && tableCells.value?.uuid === props.element.uuid
    : !!binding.value && tableColumn.value?.uuid === props.element.uuid,
);
const highlightCount = computed(() => (binding.value?.highlights ?? []).length);
const highlightSummaryText = computed(() => {
  const n = highlightCount.value;
  return n === 0
    ? t("dataTable.highlight.noRules")
    : t("dataTable.highlight.rulesCount", n);
});
const headerHeight = computed(() => dataTable.value?.headerHeight ?? TABLE_HEADER_HEIGHT);
const rowHeight = computed(() => dataTable.value?.rowHeight ?? TABLE_ROW_HEIGHT);
const look = computed(() => resolveLook(holder.value));

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

const builtinOptions = computed(() => styleOptions.value.filter((o) => o.builtin));
const savedOptions = computed(() => styleOptions.value.filter((o) => !o.builtin));
const baseSavedStyle = computed(() => props.tableStyles.find((s) => s.id === holder.value?.theme));
const baseStyleName = computed(
  () => styleOptions.value.find((o) => o.id === holder.value?.theme)?.name ?? t("dataTable.theme.corporateBlue"),
);

const isActiveStyle = (id: string) => !!holder.value && !holder.value.customized && holder.value.theme === id;

const copyLook = (value: TableLook): TableLook => ({ ...value, rowColors: [...value.rowColors] });

// Use a style as it is (also "Reset" after changes)
function applyStyle(id: string) {
  const b = holder.value;
  if (!b || isActiveStyle(id)) return;
  report.saveStateToHistory();
  b.theme = id;
  b.customized = undefined;
  const saved = props.tableStyles.find((s) => s.id === id);
  b.look = saved ? copyLook(saved.look) : isBuiltinTheme(id) ? undefined : b.look;
  report.updateJrxml();
}

// ── Renaming or deleting a saved style (on its own tile) ──
const tileEdit = ref<{ id: string; mode: "rename" | "confirm" } | null>(null);
const tileMode = (id: string) => (tileEdit.value?.id === id ? tileEdit.value.mode : "view");
const renameValue = ref("");
const renameInput = ref<HTMLInputElement[] | HTMLInputElement | null>(null);

function startRename(id: string) {
  const style = props.tableStyles.find((s) => s.id === id);
  if (!style) return;
  renameValue.value = style.name;
  tileEdit.value = { id, mode: "rename" };
  nextTick(() => {
    const input = Array.isArray(renameInput.value) ? renameInput.value[0] : renameInput.value;
    input?.select();
  });
}

function finishRename() {
  const edit = tileEdit.value;
  if (edit?.mode !== "rename") return;
  tileEdit.value = null;
  const style = props.tableStyles.find((s) => s.id === edit.id);
  const name = renameValue.value.trim();
  if (style && name && name !== style.name) emit("rename-table-style", style.id, name);
}

function askDelete(id: string) {
  tileEdit.value = { id, mode: "confirm" };
}

function cancelTile() {
  tileEdit.value = null;
}

// Tables using the style keep its look as their own changes
function deleteSavedStyle() {
  const edit = tileEdit.value;
  tileEdit.value = null;
  if (edit) emit("delete-table-style", edit.id);
}

// ── Changing the look for this table only ──

type LookField = keyof TableLook;
const LOOK_GROUPS: {
  part: "header" | "rows" | "totals";
  colors: ("headerBackground" | "headerText" | "rowText" | "totalsBackground" | "totalsText")[];
  bold?: "headerBold" | "totalsBold";
}[] = [
  { part: "header", colors: ["headerBackground", "headerText"], bold: "headerBold" },
  { part: "rows", colors: ["rowText"] },
  { part: "totals", colors: ["totalsBackground", "totalsText"], bold: "totalsBold" },
];

// One undo step per change: a colour dragged in the picker is one change
let editing: LookField | null = null;
function endEdit() {
  editing = null;
}

function setLook<K extends LookField>(field: K, value: TableLook[K], single = false) {
  const b = holder.value;
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

// Row colours: one changed, one added (a soft colour not used yet), the last removed
const NEW_ROW_COLORS = ["#F1F5F9", "#E0E7FF", "#FEF3C7", "#DCFCE7", "#FCE7F3"];
function setRowColor(index: number, value: string | null) {
  if (!value) return;
  setLook("rowColors", look.value.rowColors.map((c, i) => (i === index ? value.toUpperCase() : c)));
}
function addRowColor() {
  const used = look.value.rowColors;
  if (used.length >= MAX_ROW_COLORS) return;
  const next = NEW_ROW_COLORS.find((c) => !used.includes(c)) ?? "#FFFFFF";
  setLook("rowColors", [...used, next], true);
}
function removeRowColor(index: number) {
  if (look.value.rowColors.length > 1) {
    setLook("rowColors", look.value.rowColors.filter((_, i) => i !== index), true);
  }
}

function setFontSize(value: string) {
  const n = Math.round(Number(value));
  if (Number.isFinite(n) && n >= 6 && n <= 24) setLook("fontSize", n, true);
}

function setPadding(value: string) {
  const table = typedTable.value;
  const n = Math.min(40, Math.max(0, Math.round(Number(value))));
  if (!table || !Number.isFinite(n) || n === table.padding) return;
  report.saveStateToHistory();
  table.padding = n;
  report.updateJrxml();
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
  const table = dataTable.value;
  if (!table) return;
  const value = Math.round(Number((event.target as HTMLInputElement).value));
  if (!Number.isFinite(value) || value < 12 || value === table[key]) return;
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
.tdp-row-colors {
  margin-top: 8px;
}

.tdp-row-color {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tdp-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px dashed var(--prop-border-color, #d1d5db);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-primary, #1f2937);
  cursor: pointer;
}

.tdp-add-btn:hover {
  border-color: var(--prop-primary-color, #6440f4);
  color: var(--prop-primary-color, #6440f4);
}

.tdp-row-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 6px;
  overflow: hidden;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 4px;
}

.tdp-row-preview span {
  height: 5px;
}

.tdp-cells-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.tdp-cells-hint svg {
  flex: none;
  margin-top: 2px;
  color: var(--prop-primary-color, #6440f4);
}

.tdp-highlight-summary-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: -4px 0 12px;
  padding: 4px 6px;
  font-size: 11.5px;
  color: var(--prop-text-secondary, #6b7280);
}

.tdp-highlight-summary-text {
  color: var(--prop-text-primary, #1f2937);
  font-weight: 500;
}

.tdp-bullet {
  color: var(--prop-text-secondary, #9ca3af);
}

.tdp-section {
  /* Same card as the other property sections */
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
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
  border-color: var(--prop-border-focus, #6440f4);
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
  background: #f4f1ff;
  border-color: #ddd6fe;
  color: #5b3ee0;
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
  border: 1px solid var(--prop-primary-color, #6440f4);
  border-radius: 6px;
  background: var(--prop-primary-color, #6440f4);
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
  border-color: var(--prop-primary-color, #6440f4);
  color: var(--prop-primary-color, #6440f4);
  font-weight: 600;
  box-shadow: 0 0 0 1px var(--prop-primary-color, #6440f4);
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

.tdp-label-gap {
  display: block;
  margin-top: 10px;
}

/* A saved style's tile: the style button, with rename / delete in its corner */
.tdp-theme-wrap {
  position: relative;
  display: flex;
  min-width: 0;
}

.tdp-theme-wrap > .tdp-theme {
  flex: 1;
  min-width: 0;
}

.tdp-theme.is-editing {
  justify-content: center;
  min-height: 46px;
  cursor: default;
  border-color: var(--prop-primary-color, #6440f4);
}

.tdp-tile-input {
  width: 100%;
  height: 24px;
  font-size: 11px;
}

.tdp-tile-question {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #dc2626;
}

.tdp-tile-answers {
  display: flex;
  gap: 8px;
}

.tdp-tile-actions {
  position: absolute;
  top: 3px;
  right: 3px;
  display: flex;
  gap: 2px;
}

.tdp-tile-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--prop-text-tertiary, #9ca3af);
  cursor: pointer;
}

.tdp-tile-btn:hover {
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
}

.tdp-tile-btn.is-danger:hover {
  background: #fef2f2;
  color: #dc2626;
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
  color: var(--prop-primary-color, #6440f4);
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
  color: var(--prop-primary-color, #6440f4);
}

.tdp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

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
