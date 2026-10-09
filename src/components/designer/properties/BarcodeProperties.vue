<template>
  <div class="barcode-properties">
    <!-- Type: sample cards like the image shape presets -->
    <div class="section">
      <div class="section-head">
        <h5>{{ t("barcode.type") }}</h5>
        <span class="type-badge">{{ t(`barcode.types.${element.barcodeType}`) }}</span>
      </div>
      <div v-for="group in BARCODE_GROUPS" :key="group" class="type-group">
        <span class="field-label">{{ t(`barcode.groups.${group}`) }}</span>
        <div class="type-grid" role="radiogroup" :aria-label="t(`barcode.groups.${group}`)">
          <button
            v-for="code in barcodeTypesInGroup(group)"
            :key="code.type"
            type="button"
            role="radio"
            class="type-swatch"
            :class="{ active: element.barcodeType === code.type }"
            :aria-checked="element.barcodeType === code.type"
            :title="`${t(`barcode.types.${code.type}`)}: ${t(`barcode.uses.${code.type}`)}`"
            @click="setType(code.type)"
          >
            <span class="sample-wrap" aria-hidden="true">
              <span class="sample-label" :class="`is-${code.kind}`">
                <img v-if="samples[code.type]" :src="samples[code.type]!.uri" alt="" draggable="false" />
                <Barcode v-else :size="18" :stroke-width="1.5" />
              </span>
            </span>
            <span class="type-name">{{ t(`barcode.types.${code.type}`) }}</span>
          </button>
        </div>
      </div>
      <small class="hint">
        <strong>{{ t(`barcode.types.${element.barcodeType}`) }}</strong>
        · {{ t(`barcode.uses.${element.barcodeType}`) }}
      </small>
    </div>

    <!-- Value: a form for QR codes and GS1-128, plain text otherwise -->
    <div class="section" @focusin="onFocusIn">
      <h5>{{ t("barcode.value") }}</h5>
      <QrContentEditor
        v-if="editor === 'qr'"
        :key="`qr-${element.uuid}`"
        :value="value.text"
        @change="setValue"
      />
      <Gs1Editor
        v-else-if="editor === 'gs1'"
        :key="`gs1-${element.uuid}`"
        :value="value.text"
        @change="setValue"
      />
      <template v-else>
        <input
          class="value-input"
          :class="{ 'has-problem': problem }"
          type="text"
          :inputmode="isNumeric ? 'numeric' : undefined"
          :value="value.text"
          :placeholder="t('barcode.valuePlaceholder')"
          :aria-label="t('barcode.value')"
          :aria-invalid="!!problem"
          :aria-describedby="`barcode-value-note-${element.uuid}`"
          @input="setValue(($event.target as HTMLInputElement).value)"
        />
        <p v-if="element.barcodeType === 'EAN128' && value.text && !value.isExpression" class="hint is-note">
          {{ t("barcode.gs1.unknownCodes") }}
        </p>
      </template>
      <div :id="`barcode-value-note-${element.uuid}`">
        <p v-if="value.isExpression" class="hint">{{ t("barcode.fromData") }}</p>
        <p v-else-if="problem && !(editor === 'gs1' && value.text)" class="hint is-error">
          <TriangleAlert :size="12" aria-hidden="true" />
          {{ t(`barcode.problems.${problem.key}`, problem.params ?? {}) }}
        </p>
        <p v-else-if="checkDigit" class="hint is-ok">
          <component :is="checkDigit.typed ? CircleCheck : Calculator" :size="12" aria-hidden="true" />
          {{ t(checkDigit.typed ? "barcode.checkDigitRight" : "barcode.checkDigitAdded", { digit: checkDigit.digit }) }}
        </p>
        <p class="hint">{{ t(`barcode.formats.${element.barcodeType}`) }}</p>
        <p v-if="tooThin" class="hint is-note">
          <TriangleAlert :size="12" aria-hidden="true" />
          {{ t("barcode.tooThin") }}
        </p>
      </div>

      <!-- Examples: click one to use it -->
      <span class="field-label examples-label">{{ t("barcode.examplesTitle") }}</span>
      <div class="examples">
        <button
          v-for="example in BARCODE_EXAMPLES[element.barcodeType]"
          :key="example.value"
          type="button"
          class="example"
          :class="{ active: value.text === example.value }"
          :title="t('barcode.useExample')"
          @click="setValue(example.value, true)"
        >
          <code>{{ shown(example.value) }}</code>
          <span>{{ t(`barcode.examples.${example.note}`) }}</span>
        </button>
      </div>
      <p class="hint tip">
        <Lightbulb :size="12" aria-hidden="true" />
        {{ t("barcode.dropTip") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useReportStore } from "@/stores/report";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Barcode, Calculator, CircleCheck, Lightbulb, TriangleAlert } from "@lucide/vue";
import type { BarcodeElement } from "../../../types";
import QrContentEditor from "./QrContentEditor.vue";
import Gs1Editor from "./Gs1Editor.vue";
import { parseGs1 } from "../../../utils/barcode/gs1";
import {
  BARCODE_EXAMPLES,
  BARCODE_GROUPS,
  BARCODE_SIZES,
  BARCODE_TYPES,
  barcodeTypeInfo,
  barcodeTypesInGroup,
  checkBarcodeValue,
  printedBarcodeText,
  readBarcodeValue,
  retailCheckDigit,
  switchBarcodeType,
  toBarcodeExpression,
  type BarcodeType,
} from "../../../utils/barcode/barcodeTypes";
import { barcodeSamplePicture, barcodeSizing, type BarcodePicture } from "../../../utils/barcode/barcodeImage";

const props = defineProps<{
  element: BarcodeElement;
}>();

// Changes: an undo step before, the JRXML rewritten after
const report = useReportStore();


const { t } = useI18n();

const samples = computed(() => {
  const out = {} as Record<BarcodeType, BarcodePicture | null>;
  for (const code of BARCODE_TYPES) out[code.type] = barcodeSamplePicture(code.type);
  return out;
});

const value = computed(() => readBarcodeValue(props.element.codeExpression));
const problem = computed(() =>
  value.value.isExpression ? null : checkBarcodeValue(props.element.barcodeType, value.value.text),
);

// QR codes and GS1-128 get a form (GS1-128 only for codes the builder knows)
const editor = computed<"qr" | "gs1" | "text">(() => {
  if (value.value.isExpression) return "text";
  if (props.element.barcodeType === "QRCode") return "qr";
  if (props.element.barcodeType === "EAN128" && parseGs1(value.value.text) !== null) return "gs1";
  return "text";
});

const isNumeric = computed(() =>
  ["EAN13", "EAN8", "UPCA", "UPCE", "Interleaved2Of5", "POSTNET", "USPSIntelligentMail"].includes(props.element.barcodeType),
);

// EAN/UPC: the check digit, added when printed or checked when typed
const checkDigit = computed(() =>
  value.value.isExpression ? null : retailCheckDigit(props.element.barcodeType, value.value.text),
);

// Examples shown as typed; line breaks and the GS1 separator made visible
const shown = (text: string) => text.replace(/\u00f1/g, "|");

const isSideways = computed(() => props.element.rotation === "Right" || props.element.rotation === "Left");

// Narrowest bar thinner than scanners read reliably: 80% of the retail size
// (0.264 mm) for shop codes, 0.19 mm for the others
const tooThin = computed(() => {
  const el = props.element;
  const sizing = barcodeSizing(
    el.barcodeType,
    printedBarcodeText(el.barcodeType, el.codeExpression),
    isSideways.value ? el.height : el.width,
    isSideways.value ? el.width : el.height,
  );
  const minimum = barcodeTypeInfo(el.barcodeType).group === "products" ? 0.75 : 0.54;
  return sizing?.moduleWidth != null && sizing.moduleWidth < minimum;
});

// Typing is one undo step from focus until the field is left
const typing = ref(false);
watch(
  () => props.element.uuid,
  () => {
    typing.value = false;
  },
);

// One undo step per type change. Each type keeps its own value: the new type
// shows the value typed for it before, or its sample. Another kind of
// barcode (bars, square, postal…) gets that kind's box.
function setType(type: BarcodeType) {
  const el = props.element;
  if (el.barcodeType === type) return;
  report.saveStateToHistory();
  const kindChanged = barcodeTypeInfo(el.barcodeType).kind !== barcodeTypeInfo(type).kind;
  switchBarcodeType(el, type);
  // QR codes aren't turned (JasperReports has no orientation for them)
  if (type === "QRCode" && el.rotation && el.rotation !== "None") el.rotation = "None";
  if (kindChanged) {
    const size = BARCODE_SIZES[barcodeTypeInfo(type).kind];
    el.width = isSideways.value ? size.height : size.width;
    el.height = isSideways.value ? size.width : size.height;
  }
  report.updateJrxml();
}

// Typing is one undo step per field until focus moves; a choice (an example,
// a QR kind, a GS1 field added or removed) is a step of its own
function onFocusIn() {
  typing.value = false;
}

function setValue(text: string, discrete = false) {
  const next = toBarcodeExpression(text);
  if (next === props.element.codeExpression) return;
  if (discrete || !typing.value) {
    report.saveStateToHistory();
    typing.value = !discrete;
  }
  props.element.codeExpression = next;
  report.updateJrxml();
}
</script>

<style scoped>
/* Sections, matching the rest of the property panel */
.section {
  margin-bottom: var(--prop-spacing-md);
  padding: var(--prop-spacing-sm);
  border-radius: var(--prop-border-radius-md);
  background: var(--prop-bg-secondary);
}

.section h5 {
  margin: 0 0 var(--prop-spacing-sm);
  font-size: var(--prop-font-size-sm);
  font-weight: var(--prop-font-weight-semibold);
  color: var(--prop-text-secondary);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.section-head h5 {
  margin: 0;
}

.type-badge {
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.1);
  font-size: 10px;
  font-weight: 600;
  color: var(--prop-border-focus, #1890ff);
}

.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary, #6b7280);
}

.type-group + .type-group {
  margin-top: 12px;
}

/* Cards like the image shape presets */
.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 8px;
}

.type-swatch {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-width: 0;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.type-swatch:hover {
  border-color: var(--prop-border-hover, #9ca3af);
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.type-swatch.active {
  border-color: var(--prop-border-focus, #1890ff);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.type-swatch:focus-visible {
  outline: none;
  border-color: var(--prop-border-focus, #1890ff);
  box-shadow: var(--prop-focus-ring);
}

/* Tinted tile with the sample on a small white label */
.sample-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  border-radius: 5px;
  background: var(--prop-bg-tertiary, #f3f4f6);
}

.type-swatch.active .sample-wrap {
  background: rgba(24, 144, 255, 0.08);
}

.sample-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 78%;
  height: 32px;
  padding: 2px 3px;
  box-sizing: border-box;
  border-radius: 3px;
  background: #fff;
  color: #c4c8cf;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
}

.sample-label.is-square {
  width: 32px;
}

.sample-label.is-postal {
  height: 18px;
}

.sample-label img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

/* Long names ("Interleaved 2 of 5") wrap onto a second line */
.type-name {
  display: -webkit-box;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.2;
  color: var(--prop-text-secondary, #6b7280);
  text-align: center;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.type-swatch.active .type-name {
  font-weight: 600;
  color: var(--prop-border-focus, #1890ff);
}

.value-input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  box-sizing: border-box;
}

.value-input:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.value-input.has-problem {
  border-color: #f87171;
}

.hint {
  display: block;
  margin: 6px 0 0;
  font-size: var(--prop-font-size-xs);
  line-height: 1.4;
  color: var(--prop-text-tertiary);
}

.hint strong {
  font-weight: 600;
  color: var(--prop-text-secondary);
}

.hint.is-error,
.hint.is-note {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.hint.is-error {
  color: #b91c1c;
}

.hint.is-note {
  color: #92400e;
}

.hint svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.hint.is-ok {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  color: #047857;
}

.examples-label {
  margin-top: 12px;
}

.examples {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.example {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid var(--prop-border-color, #e5e7eb);
  border-radius: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.example code {
  max-width: 100%;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  color: var(--prop-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.example span {
  font-size: 10.5px;
  color: var(--prop-text-tertiary);
}

.example:hover,
.example:focus-visible {
  outline: none;
  border-color: var(--prop-border-focus, #1890ff);
  background: #f5faff;
}

.example.active {
  border-color: var(--prop-border-focus, #1890ff);
  background: #e6f4ff;
}

.hint.tip {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 10px;
}
</style>
