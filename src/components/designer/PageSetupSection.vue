<template>
  <!-- One page-setup card (paper, margins, font or band selection), shared by
       Template Settings (this report, right panel) and Default Settings (new
       reports, bottom panel). It only reports changes ("change" with what
       changed); the caller applies them to the report or to the defaults. -->
  <div class="setup-card">
    <div class="setup-head">
      <h5>
        {{ title }}
        <SettingHelpButton v-if="helpId" :id="helpId" />
      </h5>
      <slot name="actions" />
    </div>
    <SettingHelpText v-if="helpId" :id="helpId" />

    <!-- Paper: size, orientation, exact width and height -->
    <template v-if="section === 'paper'">
      <label class="setup-field">
        <span class="setup-label">{{ t("bottomPanel.paperSize") }}</span>
        <select :value="paper.paper" @change="choosePaper(($event.target as HTMLSelectElement).value)">
          <option v-for="size in PAPER_SIZES" :key="size.name" :value="size.name" :disabled="size.name === 'Custom'">
            {{ size.name === "Custom" ? t("bottomPanel.customPaperSize") : size.name }}
          </option>
        </select>
      </label>
      <span class="setup-label">{{ t("bottomPanel.paperOrientation") }}</span>
      <div class="setup-seg" role="radiogroup" :aria-label="t('bottomPanel.paperOrientation')">
        <button
          v-for="choice in ORIENTATIONS"
          :key="choice.value"
          type="button"
          role="radio"
          class="setup-seg-btn"
          :class="{ active: paper.orientation === choice.value }"
          :aria-checked="paper.orientation === choice.value"
          @click="chooseOrientation(choice.value)"
        >
          <component :is="choice.icon" :size="14" :stroke-width="2" aria-hidden="true" />
          {{ t(choice.label) }}
        </button>
      </div>
      <div class="setup-grid">
        <label class="setup-field">
          <span class="setup-label">{{ t("bottomPanel.pageWidth") }}</span>
          <span class="setup-unit">
            <input v-live-change="{ atLeast: 100 }" type="number" min="1" :value="value.pageWidth" @change="commitNumber('pageWidth', $event, 1)" />
            <span>px</span>
          </span>
        </label>
        <label class="setup-field">
          <span class="setup-label">{{ t("bottomPanel.pageHeight") }}</span>
          <span class="setup-unit">
            <input v-live-change="{ atLeast: 100 }" type="number" min="1" :value="value.pageHeight" @change="commitNumber('pageHeight', $event, 1)" />
            <span>px</span>
          </span>
        </label>
      </div>
    </template>

    <!-- Margins: the empty space around each page -->
    <div v-else-if="section === 'margins'" class="setup-grid">
      <label v-for="side in MARGINS" :key="side.key" class="setup-field">
        <span class="setup-label">{{ t(side.label) }}</span>
        <span class="setup-unit">
          <input v-live-change type="number" min="0" :value="value[side.key]" @change="commitNumber(side.key, $event, 0)" />
          <span>px</span>
        </span>
      </label>
    </div>

    <!-- Font new text starts with -->
    <template v-else-if="section === 'font'">
      <div class="setup-grid">
        <label class="setup-field">
          <span class="setup-label">{{ t("properties.fontName") }}</span>
          <select
            :value="resolveReportFont(value.font.name)"
            :disabled="fonts.length <= 1"
            @change="emit('change', { font: { ...value.font, name: ($event.target as HTMLSelectElement).value } })"
          >
            <option v-for="font in fonts" :key="font" :value="font">{{ font }}</option>
          </select>
        </label>
        <label class="setup-field">
          <span class="setup-label">{{ t("properties.fontSize") }}</span>
          <span class="setup-unit">
            <input v-live-change type="number" min="1" :value="value.font.size" @change="commitFontSize($event)" />
            <span>pt</span>
          </span>
        </label>
      </div>
      <div class="setup-seg is-toggles">
        <button
          v-for="style in FONT_STYLES"
          :key="style.key"
          type="button"
          class="setup-seg-btn"
          :class="{ active: value.font[style.key] }"
          :aria-pressed="value.font[style.key]"
          :title="t(style.label)"
          @click="emit('change', { font: { ...value.font, [style.key]: !value.font[style.key] } })"
        >
          <component :is="style.icon" :size="14" :stroke-width="2.25" aria-hidden="true" />
          {{ t(style.label) }}
        </button>
      </div>
      <p v-if="fonts.length <= 1" class="setup-note">
        <Info :size="13" :stroke-width="2" aria-hidden="true" />
        {{ t("properties.fontLimitedInfo", { font: DEFAULT_REPORT_FONT }) }}
      </p>
    </template>

    <!-- Band selection: the parts every page has (Detail always) -->
    <template v-else-if="section === 'bands'">
      <div class="setup-bands">
        <label
          v-for="band in ALL_CONFIGURABLE_BANDS"
          :key="band.type"
          class="setup-band"
          :class="{ 'is-disabled': band.type === BAND_TYPE_CONSTANTS.DETAIL }"
        >
          <input
            type="checkbox"
            :checked="value.bandTypes.includes(band.type as BandType)"
            :disabled="band.type === BAND_TYPE_CONSTANTS.DETAIL"
            @change="toggleBand(band.type as BandType, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ t(`bandNames.${band.type}`) }}</span>
          <small v-if="band.type === BAND_TYPE_CONSTANTS.DETAIL" class="setup-required" :title="t('bottomPanel.detailBandAlwaysRequired')">
            {{ t("common.required") }}
          </small>
        </label>
      </div>
      <p class="setup-note">{{ bandsHint }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Bold, Info, Italic, RectangleHorizontal, RectangleVertical, Underline } from "@lucide/vue";
import SettingHelpButton from "../help/SettingHelpButton.vue";
import SettingHelpText from "../help/SettingHelpText.vue";
import { ALL_CONFIGURABLE_BANDS, BAND_TYPE_CONSTANTS } from "@/constants/constants";
import { DEFAULT_REPORT_FONT, resolveReportFont } from "@/config/fonts.config";
import { getAvailableFonts } from "@/utils/fontUtils";
import { PAPER_SIZES, pageSizeOf, paperOf, type Orientation } from "@/utils/pageSetup";
import type { SettingId } from "@/utils/helpDocs";
import type { BandType } from "@/types";

export interface PageSetupValue {
  pageWidth: number;
  pageHeight: number;
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  font: { name: string; size: number; isBold: boolean; isItalic: boolean; isUnderline: boolean };
  bandTypes: BandType[];
}

const props = defineProps<{
  section: "paper" | "margins" | "font" | "bands";
  value: PageSetupValue;
  title: string;
  // The (i) explanation (Template Settings)
  helpId?: SettingId;
  bandsHint: string;
}>();

const emit = defineEmits<{ (e: "change", patch: Partial<PageSetupValue>): void }>();

const { t } = useI18n();

const ORIENTATIONS: { value: Orientation; label: string; icon: unknown }[] = [
  { value: "Portrait", label: "bottomPanel.portrait", icon: RectangleVertical },
  { value: "Landscape", label: "bottomPanel.landscape", icon: RectangleHorizontal },
];
const MARGINS = [
  { key: "topMargin", label: "properties.topSide" },
  { key: "bottomMargin", label: "properties.bottomSide" },
  { key: "leftMargin", label: "properties.leftSide" },
  { key: "rightMargin", label: "properties.rightSide" },
] as const;
const FONT_STYLES = [
  { key: "isBold", label: "properties.bold", icon: Bold },
  { key: "isItalic", label: "properties.italic", icon: Italic },
  { key: "isUnderline", label: "properties.underline", icon: Underline },
] as const;

const fonts = ref<string[]>([DEFAULT_REPORT_FONT]);
onMounted(async () => {
  fonts.value = await getAvailableFonts();
});

const paper = computed(() => paperOf(props.value.pageWidth, props.value.pageHeight));

function choosePaper(name: string) {
  const size = pageSizeOf(name, paper.value.orientation);
  if (size) emit("change", { pageWidth: size.width, pageHeight: size.height });
}

function chooseOrientation(orientation: Orientation) {
  if (orientation === paper.value.orientation) return;
  emit("change", { pageWidth: props.value.pageHeight, pageHeight: props.value.pageWidth });
}

// Numbers apply when the field is left or Enter is pressed, never while typing
// (typing "600" must not make a 6px page on the way); a wrong value goes back
type NumberKey = "pageWidth" | "pageHeight" | "leftMargin" | "rightMargin" | "topMargin" | "bottomMargin";
function commitNumber(key: NumberKey, event: Event, min: number) {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  if (input.value.trim() === "" || !Number.isFinite(value) || value < min) {
    input.value = String(props.value[key]);
    return;
  }
  if (value !== props.value[key]) emit("change", { [key]: Math.round(value) });
}

function commitFontSize(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  if (!Number.isFinite(value) || value < 1) {
    input.value = String(props.value.font.size);
    return;
  }
  if (value !== props.value.font.size) emit("change", { font: { ...props.value.font, size: value } });
}

function toggleBand(type: BandType, on: boolean) {
  const next = on ? [...props.value.bandTypes, type] : props.value.bandTypes.filter((b) => b !== type);
  emit("change", { bandTypes: next });
}
</script>

<style scoped>
.setup-card {
  display: grid;
  /* Stretched to the tallest card in its row: the content stays at the top */
  align-content: start;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}
.setup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.setup-head h5 {
  display: flex;
  align-items: center;
  margin: 0;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}
.setup-field {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.setup-label {
  color: #6f6a7e;
  font-size: 11.5px;
  font-weight: 500;
}
.setup-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 10px;
}
.setup-card select,
.setup-unit input {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #e6e5ee;
  border-radius: 7px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 12.5px;
  box-sizing: border-box;
}
.setup-card select:disabled {
  background: #f7f7fa;
  color: #6f6a7e;
}
.setup-card select:focus,
.setup-unit input:focus {
  outline: none;
  border-color: #6440f4;
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.14);
}
.setup-unit {
  position: relative;
  display: flex;
  align-items: center;
}
.setup-unit input {
  padding-right: 26px;
}
.setup-unit > span {
  position: absolute;
  right: 8px;
  color: #9a94ab;
  font-size: 11px;
  pointer-events: none;
}
.setup-seg {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: #f3f2f8;
}
.setup-seg-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 30px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #45425a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.setup-seg-btn.active {
  background: #ffffff;
  color: #6440f4;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.1);
}
.setup-seg-btn:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 1px;
}
.setup-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  color: #6f6a7e;
  font-size: 11.5px;
  line-height: 1.45;
}
.setup-note > :first-child {
  flex-shrink: 0;
  margin-top: 1px;
}
.setup-bands {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
}
.setup-band {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border: 1px solid #e6e5ee;
  border-radius: 7px;
  color: #1c1b26;
  font-size: 12.5px;
  cursor: pointer;
}
.setup-band input {
  accent-color: #6440f4;
}
.setup-band.is-disabled {
  color: #9a94ab;
  cursor: default;
}
.setup-required {
  margin-left: auto;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(30, 142, 90, 0.1);
  color: #1e8e5a;
  font-size: 10.5px;
  font-weight: 600;
}
</style>
