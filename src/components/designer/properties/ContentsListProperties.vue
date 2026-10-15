<template>
  <div class="contents-list-properties">
    <!-- Basic Properties: fill it from the headings, or type the rows -->
    <template v-if="part === 'basic'">
      <!-- Design: a ready-made look for the list (on contents pages, for all of them) -->
      <div class="card">
        <h5>{{ t("contentsList.design") }}</h5>
        <div class="look-grid" role="radiogroup" :aria-label="t('contentsList.design')">
          <button
            v-for="look in LIST_LOOKS"
            :key="look"
            type="button"
            role="radio"
            class="look-card"
            :class="{ active: activeLook === look }"
            :aria-checked="activeLook === look"
            @click="setLook(look)"
          >
            <span class="look-sample" :class="`is-${look}`" aria-hidden="true">
              <span v-for="n in 3" :key="n" class="look-row">
                <span v-if="look !== 'plain'" class="look-num">{{ lookNumber(look, n) }}</span>
                <span class="look-title" />
                <span v-if="look === 'dotted'" class="look-dots" />
                <span class="look-page">{{ n + 2 }}</span>
              </span>
            </span>
            <span class="look-name">{{ t(`contentsList.looks.${look}`) }}</span>
          </button>
        </div>
        <p class="form-hint">{{ t(chain.length > 1 || onContentsPage ? "contentsList.designAllPagesHint" : "contentsList.designHint") }}</p>
      </div>

      <div class="card">
        <h5>{{ t("contentsList.fillTitle") }}</h5>
        <label class="toggle-row is-first">
          <input type="checkbox" :checked="!!list.follow" @change="setFollow(($event.target as HTMLInputElement).checked)" />
          {{ t("contentsList.follow") }}
        </label>
        <!-- Following: the rows come from the headings, live -->
        <template v-if="list.follow">
          <p class="form-hint">{{ t("contentsList.followHint") }}</p>
          <p v-if="!headingCount" class="form-hint is-note">{{ t("contentsList.followNone") }}</p>
          <div v-if="overflow" class="overflow-note" role="status">
            <TriangleAlert :size="14" aria-hidden="true" />
            <span>{{ t(onContentsPage ? "contentsList.overflow" : "contentsList.overflowNotContents", { n: overflow }, overflow) }}</span>
          </div>
          <button v-if="overflow && onContentsPage" type="button" class="wide-btn is-primary" @click="emit('fill')">
            <FilePlus :size="14" aria-hidden="true" />
            {{ t("contentsList.addContentsPage") }}
          </button>
          <p class="form-hint">{{ t("contentsList.pageCheckHint") }}</p>
        </template>
        <!-- Not following: filled once on request, then typed -->
        <template v-else>
          <button type="button" class="wide-btn is-primary" @click="emit('fill')">
            <ListRestart :size="14" aria-hidden="true" />
            {{ t("contentsList.fill") }}
          </button>
          <p class="form-hint">{{ t("contentsList.fillHint") }}</p>
        </template>
        <p v-if="list.continues" class="form-hint is-note">{{ t("contentsList.continuesNote") }}</p>
      </div>

      <!-- Numbers: counted automatically (sections, then sub-sections), or typed -->
      <div class="card">
        <h5>{{ t("contentsList.numbers") }}</h5>
        <template v-if="list.follow">
          <p class="form-hint is-first">{{ t("contentsList.followNumbers") }}</p>
          <label class="field">
            <span class="field-label">{{ t("contentsList.subStyle") }}</span>
            <select :value="list.subStyle ?? 'roman'" @change="setStyle('subStyle', ($event.target as HTMLSelectElement).value)">
              <option v-for="style in SUB_STYLES" :key="style" :value="style">{{ subSample(style) }}</option>
            </select>
          </label>
        </template>
        <template v-else>
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
        </template>
      </div>

      <div class="card">
        <h5>{{ t("contentsList.rows", { n: rows.length }, rows.length) }}</h5>
        <p v-if="chain.length > 1" class="form-hint is-first">{{ t("contentsList.onePerReport", { n: chain.length }, chain.length) }}</p>
        <p v-if="list.follow && rows.length" class="form-hint is-first">{{ t("contentsList.followRowsHint") }}</p>
        <div v-if="rows.length" class="row-head" aria-hidden="true">
          <span v-if="list.numberWidth > 0" class="col-number" :style="{ width: numberColumnWidth }">{{ t("contentsList.number") }}</span>
          <span class="col-title">{{ t("contentsList.titleColumn") }}</span>
          <span class="col-page">{{ t("contentsList.page") }}</span>
        </div>
        <template v-for="(row, i) in rows" :key="i">
        <!-- Where the next page (or column) of the Table of Contents starts -->
        <div v-if="row.divider" class="part-divider">{{ row.divider }}</div>
        <div class="entry-row" :class="{ 'is-sub': row.entry.level === 1 }">
          <input
            v-if="list.numberWidth > 0"
            class="col-number"
            :style="{ width: numberColumnWidth }"
            :value="list.autoNumber ? numbers[i] : row.entry.number"
            :readonly="list.autoNumber || list.follow"
            :title="list.autoNumber ? t('contentsList.countedHint') : undefined"
            :aria-label="t('contentsList.number')"
            @change="setEntry(row, 'number', ($event.target as HTMLInputElement).value)"
          />
          <input
            class="col-title"
            :value="row.entry.title"
            :readonly="list.follow"
            :aria-label="t('contentsList.titleColumn')"
            @change="setEntry(row, 'title', ($event.target as HTMLInputElement).value)"
          />
          <input
            class="col-page"
            :value="row.entry.page"
            :readonly="list.follow"
            :aria-label="t('contentsList.page')"
            @change="setEntry(row, 'page', ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="icon-btn"
            :disabled="!headings[i]"
            :title="t(headings[i] ? 'contentsList.goTo' : 'contentsList.noHeadingForRow')"
            :aria-label="t('contentsList.goTo')"
            @click="headings[i] && (selection.revealUuid = headings[i]!.element.uuid ?? null)"
          >
            <LocateFixed :size="13" aria-hidden="true" />
          </button>
          <button
            v-if="!list.follow"
            type="button"
            class="icon-btn"
            :title="t(row.entry.level === 1 ? 'contentsList.makeSection' : 'contentsList.makeSub')"
            :aria-label="t(row.entry.level === 1 ? 'contentsList.makeSection' : 'contentsList.makeSub')"
            @click="change(() => (row.entry.level = row.entry.level === 1 ? 0 : 1))"
          >
            <component :is="row.entry.level === 1 ? IndentDecrease : IndentIncrease" :size="13" aria-hidden="true" />
          </button>
          <button
            v-if="!list.follow"
            type="button"
            class="icon-btn is-danger"
            :title="t('contentsList.removeRow')"
            :aria-label="t('contentsList.removeRow')"
            @click="change(() => row.part.list.entries.splice(row.index, 1))"
          >
            <Trash2 :size="13" aria-hidden="true" />
          </button>
        </div>
        </template>
        <p v-if="rows.length" class="form-hint">{{ t("contentsList.linksHint") }}</p>
        <button v-if="!list.follow" type="button" class="wide-btn" @click="addRow">
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
import { Ban, FilePlus, LocateFixed, IndentDecrease, IndentIncrease, ListRestart, Plus, Trash2, TriangleAlert } from "@lucide/vue";
import ColorSwatchPicker from "../../common/ColorSwatchPicker.vue";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import {
  applyListLook,
  currentListLook,
  LIST_LOOKS,
  type ListLook,
  collectHeadings,
  DEFAULT_SECTION_WORD,
  headingItems,
  matchHeadings,
  listNumbers,
  numberStarts,
  SECTION_STYLES,
  sectionNumber,
  SUB_STYLES,
  subNumber,
  syncContentsListSize,
} from "@/utils/contentsList";
import { followOverflow, listChain } from "@/utils/headingSync";
import { contentsPageNumber, pageKind } from "@/utils/specialPages";
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
// One Table of Contents, however many pages it takes: its parts in order
// (this one, the lists carrying it on, the one it carries on). Its look and
// numbering live on the first part (the others share them); its rows are all
// shown here, each kept by the part that shows it
// (Only on contents pages: a list on a normal page shows and keeps its own
// rows and look, as before.)
const fullChain = computed(() => {
  const detail = report.bands.find((b) => b.type === "detail");
  return detail ? listChain(detail.elements, props.element) : [props.element];
});
const chain = computed(() =>
  pageKind(report.reportProperties, props.element.pageIndex) === "contents" ? fullChain.value : [props.element],
);
const head = computed(() => chain.value[0] ?? props.element);
const list = computed(() => head.value.list);

interface Row {
  entry: ContentsEntry;
  part: ContentsListElement;
  index: number;
  // Where a later part starts: "Contents page 2" / "Next column"
  divider?: string;
}
const rows = computed<Row[]>(() =>
  chain.value.flatMap((part, p) =>
    part.list.entries.map((entry, index) => {
      let divider: string | undefined;
      if (index === 0 && p > 0) {
        const before = chain.value[p - 1]!;
        divider =
          (before.pageIndex ?? 0) === (part.pageIndex ?? 0)
            ? t("contentsList.nextColumn")
            : t("contentsList.onPage", { n: contentsPageNumber(report.reportProperties, part.pageIndex ?? 0) });
      }
      return { entry, part, index, divider };
    }),
  ),
);

// One undo step per change; a colour being dragged is one step too
let lastEdit = { key: "", time: 0 };
function record(key?: string) {
  const now = Date.now();
  if (!key || key !== lastEdit.key || now - lastEdit.time > 1000) report.saveStateToHistory();
  lastEdit = { key: key ?? "", time: now };
}

// After a change the rows flow over the parts again (report store sync)
function change(mutate: () => void, key?: string) {
  record(key);
  mutate();
  for (const part of chain.value) syncContentsListSize(part);
  report.updateJrxml();
}

function setEntry(row: Row, key: keyof Omit<ContentsEntry, "level">, value: string) {
  if (row.entry[key] === value) return;
  change(() => (row.entry[key] = value));
}

// A new row goes at the end (on the last part)
function addRow() {
  const lastPart = chain.value[chain.value.length - 1]!;
  const last = rows.value[rows.value.length - 1]?.entry;
  change(() =>
    lastPart.list.entries.push({ number: "", title: t("contentsList.newRow"), page: last?.page ?? "", level: last?.level ?? 0 }),
  );
}

// The heading each row stands for (the "go to" buttons)
const selection = useSelectionStore();
const headings = computed(() =>
  matchHeadings(
    rows.value.map((r) => r.entry),
    headingItems(report.bands, report.reportProperties),
  ),
);

// Ready-made looks (the first part's look is the whole Table of Contents' on
// contents pages; the other parts copy it when the report is written again)
const activeLook = computed(() => currentListLook(list.value));
const lookNumber = (look: ListLook, n: number) => (look === "numbered" ? `0${n}` : look === "classic" ? `SEC. ${n}` : `${n}.`);
function setLook(look: ListLook) {
  if (activeLook.value === look) return;
  change(() => applyListLook(list.value, look));
}

// Following the headings: how many there are, and the rows that don't fit
const headingCount = computed(() => collectHeadings(report.bands, report.reportProperties).length);
const overflow = computed(() => followOverflow(report.bands, report.reportProperties, props.element));
const onContentsPage = computed(() => pageKind(report.reportProperties, props.element.pageIndex) === "contents");

// On or off for the list and the lists carrying it on. Off: the rows stay as
// they are, numbers included, to be edited by hand
function setFollow(on: boolean) {
  if (on === !!list.value.follow) return;
  change(() => {
    for (const l of fullChain.value) {
      if (on) {
        l.list.follow = true;
      } else {
        delete l.list.follow;
        delete l.list.autoNumber;
      }
    }
  });
}

// Counted numbers of every row, straight through the parts
const numbers = computed(() => {
  const detail = report.bands.find((b) => b.type === "detail");
  const starts = numberStarts(detail?.elements ?? []);
  return chain.value.flatMap((part) => listNumbers(part.list, part.uuid ? starts.get(part.uuid) : undefined));
});

// The No. boxes are as wide as the longest number ("SECTION 12."), within reason
const numberColumnWidth = computed(() => {
  const longest = Math.max(2, ...rows.value.map((r, i) => (list.value.autoNumber ? numbers.value[i] : r.entry.number)?.length ?? 0));
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

.part-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--prop-primary-color, #6440f4);
}

.part-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(100, 64, 244, 0.2);
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

.icon-btn:disabled {
  opacity: 0.4;
  cursor: default;
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

.look-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.look-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
}

.look-card:hover {
  border-color: var(--prop-border-focus);
}

.look-card.active {
  border-color: var(--prop-primary-color, #6440f4);
  box-shadow: 0 0 0 2px rgba(100, 64, 244, 0.15);
}

.look-sample {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 5px 6px;
  border-radius: 5px;
  background: #fafafc;
}

.look-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 9px;
  font-size: 7px;
  font-weight: 700;
  color: #1f2937;
}

.look-title {
  width: 40%;
  height: 3px;
  border-radius: 2px;
  background: #9ca3af;
}

.look-dots {
  flex: 1;
  border-bottom: 1.5px dotted #9ca3af;
}

.look-page {
  margin-left: auto;
  font-weight: 600;
}

.is-dotted .look-page,
.is-plain .look-page {
  margin-left: 0;
}

.is-numbered .look-row {
  height: 11px;
}

.is-numbered .look-num {
  padding: 0 2px;
  border-radius: 2px;
  background: #14284b;
  color: #fff;
}

.look-name {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.toggle-row.is-first {
  margin: 0 0 8px;
}

.form-hint.is-first {
  margin: 0 0 8px;
}

.overflow-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
  padding: 7px 9px;
  border-radius: 6px;
  background: #fff7ed;
  font-size: 11.5px;
  line-height: 1.4;
  color: #9a3412;
}

.overflow-note svg {
  flex-shrink: 0;
  margin-top: 1px;
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
