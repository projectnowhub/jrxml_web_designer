<template>
  <!-- The chosen column of a project-data table (clicked on the page): its
       header, data and total cells, each on its own tab. The whole table's
       look is in Customize below. -->
  <div v-if="chosenColumn" class="card">
    <h5>{{ t("dataTable.cells.columnTitle", { name: chosenColumn.label }) }}<SettingHelpButton id="tableCells" /></h5>
    <SettingHelpText id="tableCells" />

    <div class="tcc-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        role="tab"
        class="tcc-tab"
        :class="{ active: currentPart === tab }"
        :aria-selected="currentPart === tab"
        @click="currentPart = tab"
      >
        {{ t(PART_LABELS[tab]) }}
      </button>
    </div>

    <!-- Fill and Text Colour -->
    <div class="color-row">
      <div class="field">
        <span class="field-label">{{ t("customTable.fill") }}</span>
        <div class="color-with-clear">
          <ColorSwatchPicker
            :model-value="shownFill"
            class="swatch-fill"
            @update:model-value="setFill"
            @change="endEdit"
          />
          <button
            type="button"
            class="icon-btn"
            :class="{ active: !hasOwnColors }"
            :title="t('customTable.styleColors')"
            :aria-label="t('customTable.styleColors')"
            @click="clearColors"
          >
            <RotateCcw :size="13" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div class="field">
        <span class="field-label">{{ t("customTable.textColor") }}</span>
        <ColorSwatchPicker
          :model-value="shownColor"
          class="swatch-fill"
          @update:model-value="setColor"
          @change="endEdit"
        />
      </div>
    </div>

    <!-- Text Style: Bold, Italic, Underline + Font size -->
    <span class="field-label">{{ t("customTable.textStyle") }}</span>
    <div class="seg">
      <button
        v-for="toggle in FONT_TOGGLES"
        :key="toggle.key"
        type="button"
        class="seg-btn"
        :class="{ active: shownToggle(toggle.key) }"
        :aria-pressed="shownToggle(toggle.key)"
        :title="t(toggle.labelKey)"
        :aria-label="t(toggle.labelKey)"
        @click="setToggle(toggle.key)"
      >
        <component :is="toggle.icon" :size="14" aria-hidden="true" />
      </button>
      <label class="size-input" :title="t('customTable.textSize')">
        <input
          v-live-change
          type="number"
          min="4"
          max="72"
          step="1"
          :value="shownFontSize"
          :aria-label="t('customTable.textSize')"
          @change="setFontSize(($event.target as HTMLInputElement).value)"
        />
        <span>pt</span>
      </label>
    </div>

    <!-- Alignment -->
    <span class="field-label">{{ t("customTable.alignment") }}</span>
    <div class="seg">
      <button
        v-for="align in H_ALIGNS"
        :key="align.value"
        type="button"
        class="seg-btn"
        :class="{ active: shownAlign === align.value }"
        :title="t(align.labelKey)"
        :aria-label="t(align.labelKey)"
        @click="setAlign(align.value)"
      >
        <component :is="align.icon" :size="14" aria-hidden="true" />
      </button>
    </div>

    <!-- Back to the table style: this part of the column -->
    <button v-if="hasPartLook(ownLook)" type="button" class="tcc-reset-link" @click="resetPart">
      {{ t("dataTable.cells.reset") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import SettingHelpButton from "../../help/SettingHelpButton.vue";
import SettingHelpText from "../../help/SettingHelpText.vue";
import ColorSwatchPicker from "../../common/ColorSwatchPicker.vue";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import {
  Bold,
  Italic,
  RotateCcw,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Underline,
} from "@lucide/vue";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import { hasTotalsRow, lookAlignFor } from "@/utils/table/dataTable";
import { hasPartLook } from "@/utils/table/columnLook";
import { resolveLook } from "@/utils/table/tableThemes";
import type { TableElement } from "@/types";
import type { TableColumnBinding, TableColumnPartLook, TableDataBinding } from "@/types/dataSource";

const props = defineProps<{
  element: TableElement;
  binding: TableDataBinding;
}>();

const { t } = useI18n();
const report = useReportStore();
const { tableColumn } = storeToRefs(useSelectionStore());

type Align = "Left" | "Center" | "Right";
type ColumnPart = "header" | "data" | "total";

const H_ALIGNS = [
  { value: "Left", icon: TextAlignStart, labelKey: "properties.left" },
  { value: "Center", icon: TextAlignCenter, labelKey: "properties.center" },
  { value: "Right", icon: TextAlignEnd, labelKey: "properties.right" },
] as const;

const FONT_TOGGLES = [
  { key: "bold", icon: Bold, labelKey: "properties.bold" },
  { key: "italic", icon: Italic, labelKey: "properties.italic" },
  { key: "underline", icon: Underline, labelKey: "properties.underline" },
] as const;
type ToggleKey = (typeof FONT_TOGGLES)[number]["key"];

const PART_LABELS: Record<ColumnPart, string> = {
  header: "dataTable.cells.partHeader",
  data: "dataTable.cells.partData",
  total: "dataTable.cells.partTotal",
};

const hasTotals = computed(() => hasTotalsRow(props.binding));
const tabs = computed<ColumnPart[]>(() => (hasTotals.value ? ["header", "data", "total"] : ["header", "data"]));
const currentPart = ref<ColumnPart>("data");

// The column chosen on the page (a click on the selected table)
const chosenColumn = computed<TableColumnBinding | null>(() => {
  const chosen = tableColumn.value;
  if (!chosen || chosen.uuid !== props.element.uuid) return null;
  return props.binding.columns.find((c) => c.key === chosen.key) ?? null;
});

// A click on a column's header / data / total cell opens that tab
watch(
  () => tableColumn.value?.part,
  (part) => {
    if (part) currentPart.value = part;
  },
  { immediate: true },
);
watch(hasTotals, (has) => {
  if (!has && currentPart.value === "total") currentPart.value = "data";
});

const look = computed(() => resolveLook(props.binding));

// This part's own look (data cells: the column's look itself)
const ownLook = computed<TableColumnPartLook>(() => {
  const col = chosenColumn.value;
  if (!col?.look) return {};
  if (currentPart.value === "header") return col.look.header ?? {};
  if (currentPart.value === "total") return col.look.total ?? {};
  return col.look;
});

// What this part shows from the table style alone
const style = computed(() => {
  const lk = look.value;
  const col = chosenColumn.value;
  if (currentPart.value === "header")
    return { fill: lk.headerBackground, color: lk.headerText, bold: lk.headerBold, align: col ? lookAlignFor(lk, "header", col) : (lk.headerAlign ?? "Left") };
  if (currentPart.value === "total")
    return { fill: lk.totalsBackground, color: lk.totalsText, bold: lk.totalsBold, align: col ? lookAlignFor(lk, "totals", col) : (lk.totalsAlign ?? "Left") };
  return { fill: lk.rowColors[0]!, color: lk.rowText, bold: !!lk.rowBold, align: col ? lookAlignFor(lk, "row", col) : (lk.rowAlign ?? "Left") };
});

const shownFill = computed(() => ownLook.value.fill ?? style.value.fill);
const shownColor = computed(() => ownLook.value.color ?? style.value.color);
const shownAlign = computed(() => ownLook.value.align ?? style.value.align);
const shownFontSize = computed(() => ownLook.value.fontSize ?? look.value.fontSize);
const shownToggle = (key: ToggleKey) => ownLook.value[key] ?? (key === "bold" ? style.value.bold : false);
const hasOwnColors = computed(() => !!(ownLook.value.fill || ownLook.value.color));

// ── Changing ──

// One undo step per change: a colour dragged in the picker is one change
let editing: string | null = null;
function record(key: string, single = false) {
  if (editing === key) return;
  report.saveStateToHistory();
  editing = single ? null : key;
}
function endEdit() {
  editing = null;
}

// Sets (or, with undefined, removes) settings on this part of the column;
// a value the table style already gives is not kept
function patch(values: Partial<TableColumnPartLook>, key: string, single = true) {
  const col = chosenColumn.value;
  if (!col) return;
  record(key, single);
  const part = currentPart.value;
  const own: TableColumnPartLook = part === "data" ? (col.look ??= {}) : { ...(part === "header" ? col.look?.header : col.look?.total) };
  for (const [k, v] of Object.entries(values) as [keyof TableColumnPartLook, never][]) {
    if (v === undefined) delete own[k];
    else own[k] = v;
  }
  if (part !== "data") {
    col.look ??= {};
    const slot = part === "header" ? "header" : "total";
    if (hasPartLook(own)) col.look[slot] = own;
    else delete col.look[slot];
  }
  if (col.look && !hasPartLook(col.look) && !col.look.header && !col.look.total) delete col.look;
  report.updateJrxml();
}

function setFill(color: string | null) {
  if (!color || color === shownFill.value) return;
  patch({ fill: color }, "fill", false);
}

function setColor(color: string | null) {
  if (!color || color === shownColor.value) return;
  patch({ color }, "color", false);
}

function clearColors() {
  if (hasOwnColors.value) patch({ fill: undefined, color: undefined }, "clearColors");
}

function setToggle(key: ToggleKey) {
  const value = !shownToggle(key);
  const inherited = key === "bold" ? style.value.bold : false;
  patch({ [key]: value === inherited ? undefined : value }, key);
}

function setFontSize(raw: string) {
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 4 || n > 72 || n === shownFontSize.value) return;
  patch({ fontSize: n === look.value.fontSize ? undefined : n }, "fontSize");
}

function setAlign(align: Align) {
  if (align === shownAlign.value) return;
  patch({ align: align === style.value.align ? undefined : align }, "align");
}

function resetPart() {
  patch(
    { fill: undefined, color: undefined, bold: undefined, italic: undefined, underline: undefined, align: undefined, fontSize: undefined },
    "reset",
  );
}
</script>

<style scoped>
.card {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.card h5 {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--prop-text-primary, #1f2937);
}

.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary, #6b7280);
}

.field {
  display: block;
  min-width: 0;
}

.tcc-tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: #f4f3fa;
  border-radius: 6px;
  margin-bottom: 10px;
}

.tcc-tab {
  flex: 1;
  padding: 5px 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #6f6a7e;
  font: 600 11.5px/1 sans-serif;
  cursor: pointer;
  text-align: center;
  transition: all 0.12s ease;
}

.tcc-tab:hover {
  color: #1f2937;
}

.tcc-tab.active {
  background: #ffffff;
  color: #6440f4;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.color-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 8px;
}

.color-with-clear {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--prop-border-color, rgba(28, 27, 38, 0.15));
  border-radius: 6px;
  background: #fff;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
  flex-shrink: 0;
}

.icon-btn.active {
  color: var(--prop-primary-color, #6440f4);
}

.seg {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.seg-btn {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--prop-border-color, rgba(28, 27, 38, 0.15));
  border-radius: 6px;
  background: #fff;
  color: var(--prop-text-primary, #1f2937);
  cursor: pointer;
}

.seg-btn:hover {
  border-color: #a99cf0;
}

.seg-btn.active {
  border-color: #6440f4;
  background: #6440f4;
  color: #fff;
}

.size-input {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  margin-left: 4px;
  padding: 0 6px;
  border: 1px solid var(--prop-border-color, rgba(28, 27, 38, 0.15));
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  color: var(--prop-text-secondary, #6b7280);
}

.size-input input {
  width: 32px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  color: var(--prop-text-primary, #1f2937);
  text-align: right;
  outline: none;
}

.tcc-reset-link {
  display: inline-block;
  margin-top: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 11px;
  color: #6440f4;
  cursor: pointer;
  text-decoration: underline;
}

.tcc-reset-link:hover {
  color: #512ed8;
}
</style>