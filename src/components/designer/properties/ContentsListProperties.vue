<template>
  <div class="contents-list-properties">
    <!-- Basic Properties: fill it from the headings, or type the rows -->
    <template v-if="part === 'basic'">
      <div class="card">
        <h5>{{ t("contentsList.fillTitle") }}</h5>
        <button type="button" class="wide-btn is-primary" @click="emit('fill')">
          <ListRestart :size="14" aria-hidden="true" />
          {{ t("contentsList.fill") }}
        </button>
        <p class="form-hint">{{ t("contentsList.fillHint") }}</p>
        <p v-if="list.continues" class="form-hint is-note">{{ t("contentsList.continuesNote") }}</p>
      </div>

      <!-- Numbers: counted automatically (sections, then sub-sections), or typed -->
      <div class="card">
        <h5>{{ t("contentsList.numbers") }}</h5>
        <label class="toggle-row is-first">
          <input type="checkbox" :checked="!!list.autoNumber" @change="setAuto(($event.target as HTMLInputElement).checked)" />
          {{ t("contentsList.autoNumber") }}
        </label>
        <template v-if="list.autoNumber">
          <label class="field">
            <span class="field-label">{{ t("contentsList.sectionStyle") }}</span>
            <select :value="list.sectionStyle ?? '1.'" @change="setStyle('sectionStyle', ($event.target as HTMLSelectElement).value)">
              <option v-for="style in SECTION_STYLES" :key="style" :value="style">{{ sectionSample(style) }}</option>
            </select>
          </label>
          <label v-if="list.sectionStyle === 'word'" class="field">
            <span class="field-label">{{ t("contentsList.sectionWord") }}</span>
            <input
              class="text-input"
              :value="list.sectionWord ?? DEFAULT_SECTION_WORD"
              @change="setWord(($event.target as HTMLInputElement).value)"
            />
          </label>
          <label class="field">
            <span class="field-label">{{ t("contentsList.subStyle") }}</span>
            <select :value="list.subStyle ?? 'roman'" @change="setStyle('subStyle', ($event.target as HTMLSelectElement).value)">
              <option v-for="style in SUB_STYLES" :key="style" :value="style">{{ subSample(style) }}</option>
            </select>
          </label>
          <p class="form-hint">{{ t("contentsList.autoNumberHint") }}</p>
        </template>
      </div>

      <div class="card">
        <h5>{{ t("contentsList.rows", { n: list.entries.length }, list.entries.length) }}</h5>
        <div v-if="list.entries.length" class="row-head" aria-hidden="true">
          <span v-if="list.numberWidth > 0" class="col-number" :style="{ width: numberColumnWidth }">{{ t("contentsList.number") }}</span>
          <span class="col-title">{{ t("contentsList.titleColumn") }}</span>
          <span class="col-page">{{ t("contentsList.page") }}</span>
        </div>
        <div v-for="(entry, i) in list.entries" :key="i" class="entry-row" :class="{ 'is-sub': entry.level === 1 }">
          <input
            v-if="list.numberWidth > 0"
            class="col-number"
            :style="{ width: numberColumnWidth }"
            :value="list.autoNumber ? numbers[i] : entry.number"
            :readonly="list.autoNumber"
            :title="list.autoNumber ? t('contentsList.countedHint') : undefined"
            :aria-label="t('contentsList.number')"
            @change="setEntry(i, 'number', ($event.target as HTMLInputElement).value)"
          />
          <input
            class="col-title"
            :value="entry.title"
            :aria-label="t('contentsList.titleColumn')"
            @change="setEntry(i, 'title', ($event.target as HTMLInputElement).value)"
          />
          <input
            class="col-page"
            :value="entry.page"
            :aria-label="t('contentsList.page')"
            @change="setEntry(i, 'page', ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="icon-btn"
            :title="t(entry.level === 1 ? 'contentsList.makeSection' : 'contentsList.makeSub')"
            :aria-label="t(entry.level === 1 ? 'contentsList.makeSection' : 'contentsList.makeSub')"
            @click="change(() => (entry.level = entry.level === 1 ? 0 : 1))"
          >
            <component :is="entry.level === 1 ? IndentDecrease : IndentIncrease" :size="13" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="icon-btn is-danger"
            :title="t('contentsList.removeRow')"
            :aria-label="t('contentsList.removeRow')"
            @click="change(() => list.entries.splice(i, 1))"
          >
            <Trash2 :size="13" aria-hidden="true" />
          </button>
        </div>
        <button type="button" class="wide-btn" @click="addRow">
          <Plus :size="13" aria-hidden="true" />
          {{ t("contentsList.addRow") }}
        </button>
      </div>
    </template>

    <!-- Style Settings: text, rows, columns, dots, colours -->
    <template v-else>
      <div class="card">
        <h5>{{ t("contentsList.look") }}</h5>
        <div class="grid-2">
          <label class="field">
            <span class="field-label">{{ t("contentsList.textSize") }}</span>
            <span class="unit-input">
              <input type="number" min="6" max="36" :value="list.fontSize" @change="setNumber('fontSize', $event, 6, 36)" />
              <span>pt</span>
            </span>
          </label>
          <label class="field">
            <span class="field-label">{{ t("contentsList.rowHeight") }}</span>
            <span class="unit-input">
              <input type="number" min="12" max="80" :value="list.rowHeight" @change="setNumber('rowHeight', $event, 12, 80)" />
              <span>px</span>
            </span>
          </label>
          <label class="field">
            <span class="field-label">{{ t("contentsList.numberWidth") }}</span>
            <span class="unit-input">
              <input type="number" min="0" max="300" :value="list.numberWidth" @change="setNumber('numberWidth', $event, 0, 300)" />
              <span>px</span>
            </span>
          </label>
          <label class="field">
            <span class="field-label">{{ t("contentsList.pageWidth") }}</span>
            <span class="unit-input">
              <input type="number" min="20" max="120" :value="list.pageWidth" @change="setNumber('pageWidth', $event, 20, 120)" />
              <span>px</span>
            </span>
          </label>
        </div>
        <p class="form-hint">{{ t("contentsList.numberWidthHint") }}</p>
        <label class="toggle-row">
          <input type="checkbox" :checked="list.leader" @change="change(() => (list.leader = !list.leader))" />
          {{ t("contentsList.leader") }}
        </label>
        <label class="toggle-row">
          <input type="checkbox" :checked="list.boldSections" @change="change(() => (list.boldSections = !list.boldSections))" />
          {{ t("contentsList.boldSections") }}
        </label>
      </div>

      <div class="card">
        <h5>{{ t("contentsList.colours") }}</h5>
        <div class="grid-2">
          <div class="field">
            <span class="field-label">{{ t("contentsList.textColour") }}</span>
            <ColorSwatchPicker
              :model-value="list.color"
              @update:model-value="$event && setColor('color', $event)"
            />
          </div>
          <div class="field">
            <span class="field-label">{{ t("contentsList.numberBox") }}</span>
            <div class="color-with-clear">
              <ColorSwatchPicker
                :model-value="list.numberFill ?? null"
                @update:model-value="$event && setColor('numberFill', $event)"
              />
              <button
                type="button"
                class="icon-btn"
                :class="{ active: !list.numberFill }"
                :title="t('contentsList.noNumberBox')"
                :aria-label="t('contentsList.noNumberBox')"
                @click="change(() => delete list.numberFill)"
              >
                <Ban :size="13" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Ban, IndentDecrease, IndentIncrease, ListRestart, Plus, Trash2 } from "@lucide/vue";
import ColorSwatchPicker from "../../common/ColorSwatchPicker.vue";
import { useReportStore } from "@/stores/report";
import {
  DEFAULT_SECTION_WORD,
  listNumbers,
  numberStarts,
  SECTION_STYLES,
  sectionNumber,
  SUB_STYLES,
  subNumber,
  syncContentsListSize,
} from "@/utils/contentsList";
import type {
  ContentsEntry,
  ContentsListData,
  ContentsListElement,
  ContentsSectionStyle,
  ContentsSubStyle,
} from "@/types";

const props = defineProps<{
  element: ContentsListElement;
  part: "basic" | "style";
}>();
const emit = defineEmits<{ fill: [] }>();

const { t } = useI18n();
const report = useReportStore();
const list = computed(() => props.element.list);

// One undo step per change; a colour being dragged is one step too
let lastEdit = { key: "", time: 0 };
function record(key?: string) {
  const now = Date.now();
  if (!key || key !== lastEdit.key || now - lastEdit.time > 1000) report.saveStateToHistory();
  lastEdit = { key: key ?? "", time: now };
}

function change(mutate: () => void, key?: string) {
  record(key);
  mutate();
  syncContentsListSize(props.element);
  report.updateJrxml();
}

function setEntry(index: number, key: keyof Omit<ContentsEntry, "level">, value: string) {
  const entry = list.value.entries[index];
  if (!entry || entry[key] === value) return;
  change(() => (entry[key] = value));
}

function addRow() {
  const last = list.value.entries[list.value.entries.length - 1];
  change(() =>
    list.value.entries.push({ number: "", title: t("contentsList.newRow"), page: last?.page ?? "", level: last?.level ?? 0 }),
  );
}

// Counted numbers (from where the lists before this one in its chain stopped)
const numbers = computed(() => {
  const detail = report.bands.find((b) => b.type === "detail");
  const start = props.element.uuid ? numberStarts(detail?.elements ?? []).get(props.element.uuid) : undefined;
  return listNumbers(list.value, start);
});

// The No. boxes are as wide as the longest number ("SECTION 12."), within reason
const numberColumnWidth = computed(() => {
  const longest = Math.max(2, ...list.value.entries.map((e, i) => (list.value.autoNumber ? numbers.value[i] : e.number)?.length ?? 0));
  return `${Math.min(110, Math.max(44, longest * 7 + 16))}px`;
});

const sampleList = (patch: Partial<ContentsListData>) => ({ ...list.value, ...patch });
const sectionSample = (style: ContentsSectionStyle) =>
  [1, 2, 3].map((n) => sectionNumber(sampleList({ sectionStyle: style }), n)).join("  ");
const subSample = (style: ContentsSubStyle) =>
  style === "none"
    ? t("contentsList.noSubNumbers")
    : [1, 2, 3].map((n) => subNumber(sampleList({ subStyle: style }), 1, n)).join("  ");

// The rows of one undo step's change all follow the same list
function setAuto(on: boolean) {
  change(() => {
    if (on) {
      list.value.autoNumber = true;
      list.value.sectionStyle ??= "1.";
      list.value.subStyle ??= "roman";
    } else {
      // The counted numbers become the typed ones, so nothing changes on the page
      const shown = numbers.value;
      list.value.entries.forEach((e, i) => (e.number = shown[i] ?? ""));
      delete list.value.autoNumber;
    }
  });
}

function setStyle(key: "sectionStyle" | "subStyle", value: string) {
  if (list.value[key] === value) return;
  change(() => ((list.value as any)[key] = value));
}

function setWord(value: string) {
  const word = value.trim().slice(0, 30);
  if ((list.value.sectionWord ?? DEFAULT_SECTION_WORD) === word) return;
  change(() => (list.value.sectionWord = word));
}

function setNumber(key: "fontSize" | "rowHeight" | "numberWidth" | "pageWidth", event: Event, min: number, max: number) {
  const value = Math.round(Number((event.target as HTMLInputElement).value));
  if (!Number.isFinite(value)) return;
  const next = Math.min(max, Math.max(min, value));
  if (list.value[key] === next) return;
  change(() => (list.value[key] = next));
}

function setColor(key: keyof Pick<ContentsListData, "color" | "numberFill">, value: string) {
  if (list.value[key] === value) return;
  change(() => (list.value[key] = value), key);
}
</script>

<style scoped>
.card {
  /* Same card as the other property sections */
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.card h5 {
  margin: 0 0 8px;
  font-size: var(--prop-font-size-sm);
  font-weight: 600;
  color: var(--prop-text-primary);
}

.field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary);
}

.field {
  display: block;
  min-width: 0;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.form-hint {
  margin: 6px 0 0;
  font-size: var(--prop-font-size-xs);
  line-height: 1.4;
  color: var(--prop-text-tertiary);
}

.form-hint.is-note {
  color: #7c3aed;
}

.wide-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 30px;
  margin-top: 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.wide-btn.is-primary {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
  font-weight: 600;
}

.wide-btn:hover {
  border-color: var(--prop-border-focus);
}

.row-head,
.entry-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.row-head {
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--prop-text-secondary);
}

.row-head .col-title {
  flex: 1;
}

.row-head .col-page {
  width: 36px;
  margin-right: 56px;
}

.entry-row {
  margin-bottom: 4px;
}

.entry-row.is-sub .col-title {
  margin-left: 12px;
}

.entry-row input {
  height: 26px;
  min-width: 0;
  padding: 0 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 5px;
  background: #fff;
  font-size: 12px;
  box-sizing: border-box;
}

.col-number {
  width: 64px;
  flex-shrink: 0;
}

.entry-row .col-title {
  flex: 1;
}

.col-page {
  width: 36px;
  flex-shrink: 0;
  text-align: right;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--prop-border-color);
  border-radius: 5px;
  background: #fff;
  color: var(--prop-text-secondary);
  cursor: pointer;
}

.icon-btn.is-danger:hover {
  border-color: #fca5a5;
  color: #dc2626;
}

.icon-btn.active {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
}

.unit-input {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 11px;
  color: var(--prop-text-secondary);
  box-sizing: border-box;
}

.unit-input input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: var(--prop-text-primary);
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.toggle-row.is-first {
  margin: 0 0 8px;
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

.entry-row input[readonly] {
  background: var(--prop-bg-secondary);
  color: var(--prop-text-secondary);
}

.toggle-row input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--prop-primary-color, #6440f4);
}

.color-with-clear {
  display: flex;
  gap: 4px;
}

.color-with-clear > :first-child {
  flex: 1;
  min-width: 0;
}
</style>
