<template>
  <!-- A Section Heading's number: counted for it, or typed; and the style
       every Section Heading uses -->
  <div class="box-section compact heading-number-card">
    <h5>{{ t("headingNumbers.title") }}</h5>
    <template v-if="numberPart">
      <label class="toggle-row">
        <input type="checkbox" :checked="auto" @change="setAuto(($event.target as HTMLInputElement).checked)" />
        {{ t("headingNumbers.auto") }}
      </label>
      <p class="form-hint">
        <template v-if="!auto">{{ t("headingNumbers.typedHint") }}</template>
        <template v-else-if="position > 0">{{ t("headingNumbers.autoHint", { n: position }) }}</template>
        <template v-else>{{ t("headingNumbers.notCounted") }}</template>
      </p>
    </template>
    <p v-else class="form-hint">{{ t("headingNumbers.noNumberPart") }}</p>

    <SectionNumberFields class="style-fields" :value="sectionValue" @change="setSectionNumbering" />
    <p class="form-hint">{{ t("headingNumbers.styleHint") }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useReportStore } from "@/stores/report";
import { sectionAffixes } from "@/utils/contentsList";
import SectionNumberFields, { type SectionNumberValue } from "./SectionNumberFields.vue";
import {
  headingNumberPart,
  headingNumbering,
  isAutoNumbered,
  sectionHeadings,
  setAutoNumbered,
} from "@/utils/headingSync";
import type { FrameElement, HeadingNumbering } from "@/types";

const props = defineProps<{ heading: FrameElement }>();

const { t } = useI18n();
const report = useReportStore();

const numberPart = computed(() => headingNumberPart(props.heading));
const auto = computed(() => isAutoNumbered(numberPart.value));
const numbering = computed(() => headingNumbering(report.reportProperties));
// Which section this is (0: not counted, e.g. on a contents page)
const position = computed(() => sectionHeadings(report.bands, report.reportProperties).indexOf(props.heading) + 1);

// One undo step each
function change(mutate: () => void) {
  report.saveStateToHistory();
  mutate();
  report.updateJrxml();
}

function setAuto(on: boolean) {
  const part = numberPart.value;
  if (!part || on === auto.value) return;
  change(() => setAutoNumbered(part, on));
}

// The style every Section Heading uses (an older "word" style shows as "1."
// with the word before it); one undo step
const sectionValue = computed<SectionNumberValue>(() => {
  const n = numbering.value;
  return sectionAffixes(n.style, n.word, n.before, n.after);
});

function setSectionNumbering(next: SectionNumberValue) {
  const n: HeadingNumbering = { style: next.style };
  const before = next.before.trim();
  if (before) n.before = before;
  if (next.after) n.after = next.after;
  change(() => (report.reportProperties.headingNumbers = n));
}
</script>

<style scoped>
.style-fields {
  margin-top: 10px;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.toggle-row input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--prop-primary-color, #6440f4);
}

.form-hint {
  margin: 6px 0 10px;
  font-size: var(--prop-font-size-xs);
  line-height: 1.4;
  color: var(--prop-text-tertiary);
}

.field {
  display: block;
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
</style>
