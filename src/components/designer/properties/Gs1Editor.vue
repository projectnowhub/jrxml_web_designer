<template>
  <!-- GS1-128 as fields: what each value is, then the value -->
  <div class="gs1-editor">
    <div v-for="(row, i) in rows" :key="i" class="gs1-row">
      <div class="gs1-line">
        <select
          class="gs1-ai"
          :value="row.ai"
          :aria-label="t('barcode.gs1.what')"
          @change="setAi(i, ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="def in choicesFor(row.ai)" :key="def.ai" :value="def.ai">
            {{ t(`barcode.gs1.fields.${def.key}`) }} ({{ def.ai }})
          </option>
        </select>
        <input
          v-if="aiOf(row).input === 'date'"
          class="gs1-value"
          type="date"
          :value="gs1DateToIso(row.value)"
          :aria-label="t(`barcode.gs1.fields.${aiOf(row).key}`)"
          @input="setValue(i, isoToGs1Date(($event.target as HTMLInputElement).value))"
        />
        <span v-else-if="aiOf(row).input === 'weight'" class="gs1-unit">
          <input
            class="gs1-value"
            type="number"
            min="0"
            step="0.001"
            :value="gs1WeightToKg(row.value)"
            :aria-label="t(`barcode.gs1.fields.${aiOf(row).key}`)"
            @input="setValue(i, kgToGs1Weight(($event.target as HTMLInputElement).value))"
          />
          <span aria-hidden="true">kg</span>
        </span>
        <input
          v-else
          class="gs1-value"
          type="text"
          :inputmode="aiOf(row).input === 'digits' ? 'numeric' : undefined"
          :value="row.value"
          :placeholder="t(`barcode.gs1.placeholders.${aiOf(row).key}`)"
          :aria-label="t(`barcode.gs1.fields.${aiOf(row).key}`)"
          @input="setValue(i, ($event.target as HTMLInputElement).value)"
        />
        <button type="button" class="gs1-remove" :title="t('barcode.gs1.remove')" @click="remove(i)">
          <X :size="13" aria-hidden="true" />
        </button>
      </div>
      <p v-if="problemOf(row)" class="row-note is-error">
        {{ t(`barcode.problems.${problemOf(row)!.key}`, problemOf(row)!.params ?? {}) }}
      </p>
      <p v-else-if="addedCheckDigit(row)" class="row-note">
        {{ t("barcode.checkDigitAdded", { digit: addedCheckDigit(row) }) }}
      </p>
    </div>

    <div v-if="unused.length" class="gs1-add">
      <Plus :size="13" aria-hidden="true" />
      <select :aria-label="t('barcode.gs1.add')" value="" @change="add(($event.target as HTMLSelectElement))">
        <option value="" disabled hidden>{{ t(rows.length ? "barcode.gs1.addMore" : "barcode.gs1.add") }}</option>
        <option v-for="def in unused" :key="def.ai" :value="def.ai">
          {{ t(`barcode.gs1.fields.${def.key}`) }} ({{ def.ai }})
        </option>
      </select>
    </div>

    <p v-if="value" class="printed">
      <span>{{ t("barcode.gs1.printed") }}</span>
      <code>{{ gs1Readable(value) }}</code>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Plus, X } from "@lucide/vue";
import {
  GS1_AIS,
  checkGs1Field,
  composeGs1,
  gs1Ai,
  gs1CheckDigit,
  gs1DateToIso,
  gs1Readable,
  gs1WeightToKg,
  isoToGs1Date,
  kgToGs1Weight,
  parseGs1,
  type Gs1Field,
} from "@/utils/barcode/gs1";

const props = defineProps<{
  value: string;
}>();

// discrete: adding, removing or changing a field (one undo step each)
const emit = defineEmits<{
  change: [value: string, discrete: boolean];
}>();

const { t } = useI18n();

// Rows being edited (an empty one stays until it's removed); they follow the
// value unless the value is what they wrote
const rows = ref<Gs1Field[]>([]);
let written: string | null = null;

watch(
  () => props.value,
  (value) => {
    if (value === written) return;
    rows.value = parseGs1(value) ?? [];
  },
  { immediate: true },
);

const aiOf = (row: Gs1Field) => gs1Ai(row.ai) ?? GS1_AIS[0]!;
const unused = computed(() => GS1_AIS.filter((def) => !rows.value.some((r) => r.ai === def.ai)));
// A row's own field plus those not used yet
const choicesFor = (ai: string) => GS1_AIS.filter((def) => def.ai === ai || !rows.value.some((r) => r.ai === def.ai));

const problemOf = (row: Gs1Field) => (row.value.trim() ? checkGs1Field(row) : null);

// Item numbers typed without their check digit get it
function addedCheckDigit(row: Gs1Field): string | null {
  const def = aiOf(row);
  const v = row.value.trim();
  return def.check && def.length && /^\d+$/.test(v) && v.length === def.length - 1 ? gs1CheckDigit(v) : null;
}

function write(discrete: boolean) {
  written = composeGs1(rows.value);
  emit("change", written, discrete);
}

function setValue(i: number, value: string) {
  rows.value = rows.value.map((r, j) => (j === i ? { ...r, value } : r));
  write(false);
}

function setAi(i: number, ai: string) {
  rows.value = rows.value.map((r, j) => (j === i ? { ai, value: "" } : r));
  write(true);
}

function remove(i: number) {
  rows.value = rows.value.filter((_, j) => j !== i);
  write(true);
}

function add(select: HTMLSelectElement) {
  const ai = select.value;
  select.value = "";
  if (!gs1Ai(ai)) return;
  rows.value = [...rows.value, { ai, value: "" }];
  // Nothing to write until it has a value
}
</script>

<style scoped>
.gs1-row + .gs1-row {
  margin-top: 6px;
}

.gs1-line {
  display: flex;
  gap: 4px;
  align-items: center;
}

.gs1-ai,
.gs1-value,
.gs1-add select {
  height: 30px;
  padding: 0 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  font-size: 12px;
  font-family: inherit;
  background: #fff;
  box-sizing: border-box;
  min-width: 0;
}

.gs1-ai {
  flex: 0 0 44%;
}

.gs1-value {
  flex: 1;
  width: 100%;
}

.gs1-unit {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 11px;
  color: var(--prop-text-tertiary);
}

.gs1-ai:focus,
.gs1-value:focus,
.gs1-add select:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

.gs1-remove {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--prop-text-tertiary);
  cursor: pointer;
}

.gs1-remove:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.row-note {
  margin: 3px 0 0;
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.row-note.is-error {
  color: #b91c1c;
}

.gs1-add {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--prop-text-tertiary);
}

.gs1-add select {
  flex: 1;
  color: var(--prop-text-secondary);
}

.printed {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 8px 0 0;
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.printed code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: var(--prop-text-secondary);
  word-break: break-all;
}
</style>
