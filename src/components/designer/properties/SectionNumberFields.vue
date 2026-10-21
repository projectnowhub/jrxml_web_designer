<template>
  <!-- How sections are numbered: a style, text before and after, and a preview -->
  <div class="section-number-fields">
    <label class="field">
      <span class="field-label">{{ t("sectionNumbers.style") }}</span>
      <select :value="value.style" @change="emitChange({ style: ($event.target as HTMLSelectElement).value as ContentsSectionStyle })">
        <option v-for="style in SECTION_STYLES" :key="style" :value="style">{{ sample(style) }}</option>
      </select>
    </label>
    <div class="affixes">
      <label class="field">
        <span class="field-label">{{ t("sectionNumbers.before") }}</span>
        <input
          class="text-input"
          :value="value.before"
          :maxlength="AFFIX_MAX"
          :placeholder="t('sectionNumbers.beforePlaceholder')"
          @change="emitChange({ before: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label class="field">
        <span class="field-label">{{ t("sectionNumbers.after") }}</span>
        <input
          class="text-input"
          :value="value.after"
          :maxlength="AFFIX_MAX"
          :placeholder="t('sectionNumbers.afterPlaceholder')"
          @change="emitChange({ after: ($event.target as HTMLInputElement).value })"
        />
      </label>
    </div>
    <div class="preview" aria-live="polite">
      <span class="preview-label">{{ t("sectionNumbers.preview") }}</span>
      <span class="preview-text">
        <strong>{{ format(1) }}</strong> {{ t("sectionNumbers.sampleTitle") }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { AFFIX_MAX, SECTION_STYLES, sectionNumber } from "@/utils/contentsList";
import type { ContentsSectionStyle } from "@/types";

export interface SectionNumberValue {
  style: ContentsSectionStyle;
  before: string;
  after: string;
}

const props = defineProps<{ value: SectionNumberValue }>();
const emit = defineEmits<{ change: [SectionNumberValue] }>();
const { t } = useI18n();

const numberOf = (v: SectionNumberValue, n: number) =>
  sectionNumber({ sectionStyle: v.style, sectionBefore: v.before, sectionAfter: v.after }, n);
const format = (n: number) => numberOf(props.value, n);
// The dropdown shows the bare styles; the text around them is in the boxes
const sample = (style: ContentsSectionStyle) =>
  [1, 2, 3].map((n) => numberOf({ style, before: "", after: "" }, n)).join("  ");

function emitChange(patch: Partial<SectionNumberValue>) {
  const next = { ...props.value, ...patch };
  next.before = next.before.slice(0, AFFIX_MAX);
  next.after = next.after.slice(0, AFFIX_MAX);
  if (next.style === props.value.style && next.before === props.value.before && next.after === props.value.after) return;
  emit("change", next);
}
</script>

<style scoped>
.field {
  display: block;
  min-width: 0;
}

.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary);
}

.field select,
.text-input {
  width: 100%;
  height: 28px;
  margin-bottom: 8px;
  padding: 0 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  box-sizing: border-box;
}

.affixes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.preview {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f7f5ff;
  font-size: 12px;
  color: var(--prop-text-primary);
}

.preview-label {
  flex-shrink: 0;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--prop-primary-color, #6440f4);
}

.preview-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
