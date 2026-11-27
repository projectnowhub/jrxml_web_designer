<template>
  <!-- Default Settings: what new templates start with (paper, margins, font,
       page sections, Section Heights), saved in this browser and with the
       user's account (utils/reportDefaults.ts, stores/userSettings.ts). Each card
       has Original (back to the developer defaults); the open template's own
       settings are Template Settings, in the designer. -->
  <div class="default-settings-editor">
    <div class="defaults-intro">
      <Info :size="15" :stroke-width="2" aria-hidden="true" />
      <span>{{ t("defaultSettings.intro") }}</span>
      <button type="button" class="defaults-reset" @click="resetAllToOriginal">
        <RotateCcw :size="12" :stroke-width="2.2" aria-hidden="true" />
        {{ t("defaultSettings.resetAll") }}
      </button>
    </div>
    <div class="settings-grid">
      <PageSetupSection
        v-for="card in DEFAULT_CARDS"
        :key="card.section"
        :section="card.section"
        :title="t(card.title)"
        :value="defaults"
        :bands-hint="t('defaultSettings.bandsHint')"
        @change="changeDefaults"
      >
        <template #actions>
          <button type="button" class="defaults-reset" @click="useOriginal(card.section)">
            <RotateCcw :size="11" :stroke-width="2.2" aria-hidden="true" />
            {{ t("defaultSettings.original") }}
          </button>
        </template>
      </PageSetupSection>

      <!-- Section Heights: each header / footer section's height and limits -->
      <div class="settings-section band-limits-section">
        <div class="band-limits-header">
          <div class="band-limits-title-area">
            <h5>{{ t("bottomPanel.defaultBandSettings") }}</h5>
          </div>
          <button type="button" class="defaults-reset" @click="resetBandLimitsToDefault">
            <RotateCcw :size="11" :stroke-width="2.2" aria-hidden="true" />
            {{ t("defaultSettings.original") }}
          </button>
        </div>
        <div class="band-limits-grid">
          <div
            v-for="type in RESIZABLE_BANDS"
            :key="type"
            class="band-limit-card"
            :style="{ order: pageOrder(type) }"
          >
            <div class="band-limit-title">{{ t(`bandNames.${type}`) }}</div>
            <div class="band-limit-inputs">
              <div class="band-limit-input-group">
                <label :title="t('bottomPanel.defaultHeight')">{{ t("bottomPanel.defaultShort") }}</label>
                <div class="input-unit-wrapper">
                  <input v-live-change
                    v-model.number="bandConfig(type).defaultHeight"
                    type="number"
                    min="10"
                    step="1"
                    @change="onDefaultHeightChange(type)"
                    @blur="onDefaultHeightChange(type)"
                  />
                  <span class="unit">px</span>
                </div>
              </div>
              <div class="band-limit-input-group">
                <label :title="t('bottomPanel.minHeight')">{{ t("bottomPanel.minShort") }}</label>
                <div class="input-unit-wrapper">
                  <input v-live-change
                    v-model.number="bandConfig(type).min"
                    type="number"
                    min="10"
                    step="1"
                    @change="onMinChange(type)"
                    @blur="onMinChange(type)"
                  />
                  <span class="unit">px</span>
                </div>
              </div>
              <div class="band-limit-input-group">
                <label :title="t('bottomPanel.maxHeight')">{{ t("bottomPanel.maxShort") }}</label>
                <div class="input-unit-wrapper">
                  <input v-live-change
                    v-model.number="bandConfig(type).max"
                    type="number"
                    :min="bandConfig(type).min || 10"
                    :max="maxAllowed(type)"
                    step="1"
                    @change="onMaxChange(type)"
                    @blur="onMaxChange(type)"
                  />
                  <span class="unit">px</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Detail takes the rest of the default page -->
          <div class="band-limit-card band-limit-card-detail" :style="{ order: pageOrder('detail') }">
            <div class="band-limit-title">
              <span>{{ t("bandNames.detail") }}</span>
              <span class="band-badge-auto">{{ t("properties.detailAutoCalculated") }}</span>
            </div>
            <div class="band-limit-inputs">
              <div class="band-limit-input-group">
                <label :title="t('bottomPanel.defaultHeight')">{{ t("bottomPanel.defaultShort") }}</label>
                <div class="input-unit-wrapper is-disabled" :title="t('properties.detailAutoCalculatedHint')">
                  <input :value="detailHeight" type="number" disabled />
                  <span class="unit">px</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Info, RotateCcw } from "@lucide/vue";
import notification from "@/utils/notification";
import PageSetupSection, { type PageSetupValue } from "@/components/designer/PageSetupSection.vue";
import { useUserSettingsStore } from "@/stores/userSettings";
import {
  BAND_TYPE_CONSTANTS,
  DEVELOPER_DEFAULT_BAND_CONFIG,
  GLOBAL_BAND_LIMITS_STORAGE_KEY,
  getEffectiveDefaultBandConfig,
} from "@/constants/constants";
import {
  DEFAULT_BAND_CHOICES,
  builtInReportDefaults,
  loadReportDefaults,
  resetReportDefaults,
  saveReportDefaults,
  type ReportDefaults,
} from "@/utils/reportDefaults";

type BandConfig = { defaultHeight: number; min: number; max: number };

const DEFAULT_CARDS = [
  { section: "paper", title: "templateSettings.paper" },
  { section: "margins", title: "bottomPanel.pageMargins" },
  { section: "font", title: "templateSettings.font" },
  { section: "bands", title: "bottomPanel.bandSelection" },
] as const;
// The header / footer sections whose heights are set here (Detail takes the rest)
const RESIZABLE_BANDS = [
  BAND_TYPE_CONSTANTS.PAGE_HEADER,
  BAND_TYPE_CONSTANTS.COLUMN_HEADER,
  BAND_TYPE_CONSTANTS.COLUMN_FOOTER,
  BAND_TYPE_CONSTANTS.PAGE_FOOTER,
] as string[];
const PAGE_ORDER = ["pageHeader", "columnHeader", "detail", "columnFooter", "pageFooter"];
const MIN_SECTION_HEIGHT = 10;

const { t } = useI18n();
const userSettings = useUserSettingsStore();

const defaults = ref<ReportDefaults>(loadReportDefaults());
const bands = ref<Record<string, BandConfig>>(getEffectiveDefaultBandConfig());


const pageOrder = (type: string) => {
  const index = PAGE_ORDER.indexOf(type);
  return index === -1 ? PAGE_ORDER.length : index;
};

function bandConfig(type: string): BandConfig {
  if (!bands.value[type]) {
    bands.value[type] = { ...(DEVELOPER_DEFAULT_BAND_CONFIG[type] ?? { defaultHeight: 50, min: 20, max: 70 }) };
  }
  return bands.value[type]!;
}

// The default page's printable height
const printableHeight = computed(
  () => defaults.value.pageHeight - defaults.value.topMargin - defaults.value.bottomMargin,
);

// Detail takes what the other sections leave on the default page
const detailHeight = computed(() => {
  const others = RESIZABLE_BANDS.reduce((sum, type) => sum + (bandConfig(type).defaultHeight || 0), 0);
  return Math.max(20, printableHeight.value - others);
});

// The largest a section's maximum may be, leaving the others their minimum and Detail some room
function maxAllowed(type: string): number {
  const othersMin = RESIZABLE_BANDS.filter((other) => other !== type).reduce(
    (sum, other) => sum + Math.max(MIN_SECTION_HEIGHT, bandConfig(other).min || MIN_SECTION_HEIGHT),
    0,
  );
  return Math.max(MIN_SECTION_HEIGHT, printableHeight.value - othersMin - MIN_SECTION_HEIGHT);
}

function saveBands(): void {
  try {
    localStorage.setItem(GLOBAL_BAND_LIMITS_STORAGE_KEY, JSON.stringify(bands.value));
  } catch (error) {
    console.error("Failed to save the default section heights:", error);
  }
  userSettings.noteChange();
}

function onDefaultHeightChange(type: string): void {
  const conf = bandConfig(type);
  if (typeof conf.defaultHeight === "number") {
    conf.defaultHeight = Math.max(MIN_SECTION_HEIGHT, conf.defaultHeight);
    if (conf.defaultHeight > conf.max) conf.max = conf.defaultHeight;
    if (conf.defaultHeight < conf.min) conf.min = conf.defaultHeight;
  }
  saveBands();
}

function onMinChange(type: string): void {
  const conf = bandConfig(type);
  if (typeof conf.min === "number") {
    conf.min = Math.max(MIN_SECTION_HEIGHT, conf.min);
    if (conf.min > conf.max) conf.max = conf.min;
    if (conf.defaultHeight < conf.min) conf.defaultHeight = conf.min;
  }
  saveBands();
}

function onMaxChange(type: string): void {
  const conf = bandConfig(type);
  if (typeof conf.max === "number") {
    conf.max = Math.min(maxAllowed(type), Math.max(MIN_SECTION_HEIGHT, conf.max));
    if (conf.max < conf.min) conf.min = conf.max;
    if (conf.defaultHeight > conf.max) conf.defaultHeight = conf.max;
  }
  saveBands();
}

function resetBandLimitsToDefault(notify: boolean | Event = true): void {
  bands.value = JSON.parse(JSON.stringify(DEVELOPER_DEFAULT_BAND_CONFIG)) as Record<string, BandConfig>;
  try {
    localStorage.removeItem(GLOBAL_BAND_LIMITS_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to remove the default section heights:", error);
  }
  userSettings.noteChange();
  if (notify !== false) notification.success(t("defaultSettings.originalDone"));
}

function changeDefaults(patch: Partial<PageSetupValue>): void {
  const bandTypes = patch.bandTypes
    ? DEFAULT_BAND_CHOICES.filter((type) => patch.bandTypes!.includes(type) || type === BAND_TYPE_CONSTANTS.DETAIL)
    : defaults.value.bandTypes;
  defaults.value = { ...defaults.value, ...patch, bandTypes };
  saveReportDefaults(defaults.value);
}

// One card back to the app's original settings
function useOriginal(section: (typeof DEFAULT_CARDS)[number]["section"]): void {
  const original = builtInReportDefaults();
  if (section === "paper") changeDefaults({ pageWidth: original.pageWidth, pageHeight: original.pageHeight });
  else if (section === "margins") {
    const { leftMargin, rightMargin, topMargin, bottomMargin } = original;
    changeDefaults({ leftMargin, rightMargin, topMargin, bottomMargin });
  } else if (section === "font") changeDefaults({ font: { ...original.font } });
  else changeDefaults({ bandTypes: original.bandTypes });
  notification.success(t("defaultSettings.originalDone"));
}

// Every card and the section heights back to the original settings
function resetAllToOriginal(): void {
  defaults.value = resetReportDefaults();
  resetBandLimitsToDefault(false);
  notification.success(t("defaultSettings.resetDone"));
}
</script>

<style scoped>
.defaults-intro {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 14px;
  border: 1px solid rgba(124, 92, 247, 0.22);
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.07);
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.45;
}
.defaults-intro > :first-child {
  flex-shrink: 0;
  color: #6440f4;
}
.defaults-intro > span {
  flex: 1;
}
.defaults-actions {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}
.defaults-reset,
.defaults-apply {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid #e6e5ee;
  border-radius: 999px;
  background: #ffffff;
  color: #45425a;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.defaults-apply {
  border-color: rgba(124, 92, 247, 0.35);
  color: #6440f4;
}
.defaults-reset:hover,
.defaults-apply:hover {
  border-color: rgba(124, 92, 247, 0.55);
  background: rgba(124, 92, 247, 0.06);
}

.settings-grid {
  display: grid;
  /* Four cards fill the row (auto-fit left an empty fifth column next to them,
     because the full-width Default Band Settings keeps every track) */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1280px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .settings-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.settings-grid::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.settings-grid::-webkit-scrollbar-track {
  background: transparent;
}

.settings-grid::-webkit-scrollbar-thumb {
  background: #cfd5e1;
  border-radius: 4px;
}

.settings-grid::-webkit-scrollbar-thumb:hover {
  background: #b0b8c9;
}

.settings-section {
  background-color: #ffffff;
  border-radius: 12px;
  padding: 16px 18px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.settings-section:hover {
  border-color: rgba(124, 92, 247, 0.22);
  box-shadow: 0 4px 12px rgba(23, 20, 44, 0.05);
}

.settings-section h4 {
  margin-top: 0;
  margin-bottom: 14px;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 650;
  letter-spacing: -0.01em;
  border-bottom: 1px solid rgba(28, 27, 38, 0.06);
  padding-bottom: 8px;
}

/* Form row layout */
.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.form-row:last-child {
  margin-bottom: 0;
}

.flex-1 {
  flex: 1;
}

/* Compact font settings style */
.font-settings-compact {
  grid-column: span 1;
}

.font-settings-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.font-info {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.4;
  color: #6b7280;
}

.font-info svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: #6366f1;
}

.font-setting-item {
  flex: 1;
}

.font-style-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.font-style-options label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
  font-weight: 500;
  font-size: 12px;
  color: #45425a;
  cursor: pointer;
  user-select: none;
}

.font-style-options label input[type="checkbox"],
.band-selection-item label input[type="checkbox"] {
  accent-color: #6366f1;
  cursor: pointer;
}

.checkbox-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0;
  font-weight: 500;
  font-size: 12px;
  color: #45425a;
}

.band-selection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.band-selection-item {
  margin: 0;
}

.band-selection-item label {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  background: #fbfbfe;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #1c1b26;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
}

.band-selection-item label:hover:not(.is-disabled) {
  background: rgba(99, 102, 241, 0.05);
  border-color: rgba(99, 102, 241, 0.25);
  color: #5b3ee0;
}

.band-selection-item label.is-disabled {
  cursor: not-allowed;
  opacity: 0.7;
  background: #f6f6fa;
  color: #8a84a3;
}

.band-required-tag {
  font-size: 10px;
  font-weight: 650;
  color: #059669;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 1px 5px;
  border-radius: 4px;
  line-height: 1.2;
  margin-left: auto;
}

.band-selection-note {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed rgba(28, 27, 38, 0.08);
  color: #8a84a3;
  font-size: 11px;
}

/* Section Heights: the same card look as Paper, Margins… across the row */
.band-limits-section {
  grid-column: 1 / -1;
  padding: 12px;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.band-limits-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.band-limits-title-area h5 {
  margin: 0;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}

.band-limits-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.band-limits-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
  gap: 12px;
}

.band-limit-card {
  background-color: #fbfbfe;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.band-limit-card:hover {
  border-color: rgba(99, 102, 241, 0.25);
  background-color: #ffffff;
  box-shadow: 0 2px 6px rgba(23, 20, 44, 0.04);
}

.band-limit-title {
  font-weight: 650;
  font-size: 12px;
  color: #1c1b26;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(28, 27, 38, 0.05);
  padding-bottom: 6px;
}

/* The same green pill as Template Settings */
.band-badge-auto {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  font-size: 10px;
  font-weight: 650;
  color: #059669;
}

.band-limit-inputs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.band-limit-card-detail .band-limit-inputs {
  grid-template-columns: minmax(0, 1fr);
}

.band-limit-input-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.band-limit-input-group label {
  font-size: 11px;
  font-weight: 600;
  color: #6f6a7e;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.input-unit-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid rgba(28, 27, 38, 0.1);
  border-radius: 6px;
  padding: 4px 6px;
  background-color: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.input-unit-wrapper:hover {
  border-color: #c4b5fd;
}

.input-unit-wrapper:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(124, 92, 247, 0.14);
}

.input-unit-wrapper.is-disabled {
  opacity: 0.65;
  background-color: #f6f6fa;
  cursor: not-allowed;
  border-color: rgba(28, 27, 38, 0.06);
}

.input-unit-wrapper.is-disabled input {
  cursor: not-allowed;
  color: #8a84a3;
}

.input-unit-wrapper input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 12px;
  outline: none;
  padding: 0;
  color: #1c1b26;
}

.input-unit-wrapper .unit {
  font-size: 10px;
  color: #8a84a3;
  margin-left: 2px;
  font-weight: 500;
}

</style>
