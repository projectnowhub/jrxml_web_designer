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

      <!-- Where the rows come from: two clear modes -->
      <div class="card">
        <h5>{{ t("contentsList.rowsFrom") }}</h5>
        <div class="mode-cards" role="radiogroup" :aria-label="t('contentsList.rowsFrom')">
          <button
            type="button"
            role="radio"
            class="mode-card"
            :class="{ active: !!list.follow }"
            :aria-checked="!!list.follow"
            @click="setFollow(true)"
          >
            <span class="mode-icon"><WandSparkles :size="16" aria-hidden="true" /></span>
            <span class="mode-name">{{ t("contentsList.modeAuto") }}</span>
            <span class="mode-desc">{{ t("contentsList.modeAutoDesc") }}</span>
          </button>
          <button
            type="button"
            role="radio"
            class="mode-card"
            :class="{ active: !list.follow }"
            :aria-checked="!list.follow"
            @click="setFollow(false)"
          >
            <span class="mode-icon"><PencilLine :size="16" aria-hidden="true" /></span>
            <span class="mode-name">{{ t("contentsList.modeManual") }}</span>
            <span class="mode-desc">{{ t("contentsList.modeManualDesc") }}</span>
          </button>
        </div>
        <p class="form-hint">{{ t(list.follow ? "contentsList.autoHint" : "contentsList.manualHint") }}</p>
        <!-- Sections only, or sections and sub-sections -->
        <label class="field show-field">
          <span class="field-label">{{ t("contentsList.show") }}</span>
          <select :value="list.sectionsOnly ? 'sections' : 'all'" @change="setSectionsOnly(($event.target as HTMLSelectElement).value === 'sections')">
            <option value="all">{{ t("contentsList.showAll") }}</option>
            <option value="sections">{{ t("contentsList.showSections") }}</option>
          </select>
        </label>
        <p v-if="list.sectionsOnly" class="form-hint is-tight">
          {{ t(list.follow ? "contentsList.sectionsOnlyAuto" : "contentsList.sectionsOnlyManual") }}
        </p>
      </div>

      <!-- Numbers: in both modes; on for new lists -->
      <div class="card">
        <label class="switch-row">
          <span class="switch-text">
            <span class="switch-title">{{ t("contentsList.autoNumber") }}</span>
            <span class="switch-desc">{{ t(numbersOn ? (list.follow ? "contentsList.autoNumbersOn" : "contentsList.manualNumbersOn") : "contentsList.numbersOff") }}</span>
          </span>
          <input type="checkbox" class="switch" :checked="numbersOn" @change="setNumbering(($event.target as HTMLInputElement).checked)" />
        </label>
        <div v-if="numbersOn" class="number-styles">
          <!-- Automatic: the headings' own style, shared with every Section Heading -->
          <SectionNumberFields :value="sectionValue" @change="setSectionNumbering" />
          <p v-if="list.follow" class="form-hint is-tight">{{ t("contentsList.sharedStyleHint") }}</p>
          <label class="field">
            <span class="field-label">{{ t("contentsList.subStyle") }}</span>
            <select :value="list.subStyle ?? 'roman'" @change="setStyle('subStyle', ($event.target as HTMLSelectElement).value)">
              <option v-for="style in SUB_STYLES" :key="style" :value="style">{{ subSample(style) }}</option>
            </select>
          </label>
        </div>
      </div>

      <!-- The rows -->
      <div class="card">
        <div class="card-head">
          <h5>{{ t("contentsList.rows", { n: shownCount }, shownCount) }}</h5>
          <button v-if="!list.follow" type="button" class="add-btn" @click="addRow">
            <Plus :size="13" aria-hidden="true" />
            {{ t("contentsList.addRow") }}
          </button>
        </div>
        <button v-if="!list.follow" type="button" class="wide-btn fill-btn" @click="emit('fill')">
          <ListRestart :size="14" aria-hidden="true" />
          {{ t("contentsList.fill") }}
        </button>
        <p v-if="list.follow && !headingCount" class="empty-note">
          {{ t(list.entries.length ? "contentsList.sampleRows" : "contentsList.followNone", { n: list.entries.length }) }}
        </p>
        <div v-if="overflow" class="overflow-note" role="status">
          <TriangleAlert :size="14" aria-hidden="true" />
          <span>{{ t(onContentsPage ? "contentsList.overflow" : "contentsList.overflowNotContents", { n: overflow }, overflow) }}</span>
        </div>

        <!-- Automatic: one row per heading, read-only; hide or go to it -->
        <div v-if="list.follow" class="row-list">
          <template v-for="row in autoRows" :key="row.key">
            <div v-if="row.divider" class="part-divider">{{ row.divider }}</div>
            <div class="auto-row" :class="{ 'is-sub': row.level === 1, 'is-hidden': row.hidden || (list.sectionsOnly && row.level === 1) }">
              <input
                v-if="list.ownNumbers && list.numberWidth > 0"
                class="col-number"
                :value="row.number"
                :disabled="row.hidden"
                :aria-label="t('contentsList.number')"
                @change="setOwnNumber(row.key, ($event.target as HTMLInputElement).value)"
              />
              <span v-else-if="list.numberWidth > 0" class="auto-number">{{ row.hidden ? "" : row.number }}</span>
              <span class="auto-title" :title="row.title">{{ row.title }}</span>
              <span class="auto-page">{{ row.page }}</span>
              <span class="row-actions">
                <button
                  type="button"
                  class="icon-btn"
                  :title="t('contentsList.goTo')"
                  :aria-label="t('contentsList.goTo')"
                  @click="selection.revealUuid = row.key"
                >
                  <LocateFixed :size="12" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  :class="{ active: row.hidden }"
                  :title="t(row.hidden ? 'contentsList.showRow' : 'contentsList.hideRow')"
                  :aria-label="t(row.hidden ? 'contentsList.showRow' : 'contentsList.hideRow')"
                  @click="toggleHidden(row.key)"
                >
                  <component :is="row.hidden ? EyeOff : Eye" :size="12" aria-hidden="true" />
                </button>
              </span>
            </div>
          </template>
        </div>

        <!-- Manual: typed rows; drag the grip to move -->
        <div v-else ref="rowList" class="row-list">
          <template v-for="(row, i) in rows" :key="i">
            <div v-if="row.divider" class="part-divider">{{ row.divider }}</div>
            <div
              class="entry-row"
              :class="{
                'is-sub': row.entry.level === 1,
                'is-hidden-sub': list.sectionsOnly && row.entry.level === 1,
                'is-dragging': dragFrom === i,
                'drop-before': dropAt === i && dragFrom !== null,
                'drop-after': dropAt === i + 1 && i === rows.length - 1 && dragFrom !== null,
              }"
              @dragover="onDragOver($event, i)"
              @drop="onDrop($event)"
            >
              <span
                class="grip"
                draggable="true"
                :title="t('contentsList.dragToMove')"
                @dragstart="onDragStart($event, i)"
                @dragend="onDragEnd"
              >
                <GripVertical :size="13" aria-hidden="true" />
              </span>
              <input
                v-if="list.numberWidth > 0"
                class="col-number"
                :style="{ width: numberColumnWidth }"
                :value="list.autoNumber ? numbers[i] : row.entry.number"
                :readonly="list.autoNumber"
                :aria-label="t('contentsList.number')"
                @change="setEntry(row, 'number', ($event.target as HTMLInputElement).value)"
              />
              <input
                class="col-title"
                :value="row.entry.title"
                :aria-label="t('contentsList.titleColumn')"
                @change="setEntry(row, 'title', ($event.target as HTMLInputElement).value)"
              />
              <input
                class="col-page"
                :value="row.entry.page"
                :aria-label="t('contentsList.page')"
                @change="setEntry(row, 'page', ($event.target as HTMLInputElement).value)"
              />
              <span class="row-actions">
                <button
                  type="button"
                  class="icon-btn"
                  :title="t(row.entry.level === 1 ? 'contentsList.makeSection' : 'contentsList.makeSub')"
                  :aria-label="t(row.entry.level === 1 ? 'contentsList.makeSection' : 'contentsList.makeSub')"
                  @click="change(() => (row.entry.level = row.entry.level === 1 ? 0 : 1))"
                >
                  <component :is="row.entry.level === 1 ? IndentDecrease : IndentIncrease" :size="12" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="icon-btn is-danger"
                  :title="t('contentsList.removeRow')"
                  :aria-label="t('contentsList.removeRow')"
                  @click="change(() => row.part.list.entries.splice(row.index, 1))"
                >
                  <Trash2 :size="12" aria-hidden="true" />
                </button>
              </span>
            </div>
          </template>
          <p v-if="!rows.length" class="empty-note">{{ t("contentsList.manualEmpty") }}</p>
        </div>
        <p v-if="shownCount" class="form-hint">{{ t("contentsList.linksHintShort") }}</p>
      </div>
    </template>

    <!-- Style Settings: text, rows, columns, dots, colours -->
    <template v-else>
      <!-- Content alignment on the page (with a second column, as a pair);
           a list in a box is placed with its box -->
      <div v-if="!inBox" class="card">
        <h5>{{ t("contentsList.place.title") }}</h5>
        <div class="align-row">
          <div class="field">
            <span class="field-label">{{ t("contentsList.place.across") }}</span>
            <div class="seg">
              <button
                v-for="opt in ACROSS"
                :key="opt.value"
                type="button"
                class="seg-btn"
                :class="{ active: placement.across === opt.value }"
                :aria-pressed="placement.across === opt.value"
                :title="t(`contentsList.place.${opt.value}`)"
                :aria-label="t(`contentsList.place.${opt.value}`)"
                @click="placeOnPage(opt.value, undefined)"
              >
                <component :is="opt.icon" :size="16" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div class="field">
            <span class="field-label">{{ t("contentsList.place.upDown") }}</span>
            <div class="seg">
              <button
                v-for="opt in UP_DOWN"
                :key="opt.value"
                type="button"
                class="seg-btn"
                :class="{ active: placement.upDown === opt.value }"
                :aria-pressed="placement.upDown === opt.value"
                :title="t(`contentsList.place.${opt.value}`)"
                :aria-label="t(`contentsList.place.${opt.value}`)"
                @click="placeOnPage(undefined, opt.value)"
              >
                <component :is="opt.icon" :size="16" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <p class="form-hint">{{ t("contentsList.place.hint") }}</p>
      </div>

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
import { computed, nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Ban, Eye, EyeOff, GripVertical, LocateFixed, IndentDecrease, IndentIncrease, ListRestart, PencilLine, Plus, Trash2, TriangleAlert, WandSparkles } from "@lucide/vue";
import ColorSwatchPicker from "../../common/ColorSwatchPicker.vue";
import SectionNumberFields, { type SectionNumberValue } from "./SectionNumberFields.vue";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import {
  applyListLook,
  currentListLook,
  LIST_LOOKS,
  type ListLook,
  collectHeadings,
  headingItems,
  listNumbers,
  numberStarts,
  sectionAffixes,
  SUB_STYLES,
  subNumber,
  syncContentsListSize,
} from "@/utils/contentsList";
import { followOverflow, headingNumbering, listChain } from "@/utils/headingSync";
import { contentsPageNumber, pageKind, specialPageArea } from "@/utils/specialPages";
import type {
  ContentsAdjust,
  ContentsEntry,
  ContentsListData,
  ContentsListElement,
  ContentsSubStyle,
  HeadingNumbering,
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
// A list inside a box (normal pages only) stands alone: it never carries on
const inBox = computed(
  () => !(report.bands.find((b) => b.type === "detail")?.elements ?? []).includes(props.element),
);
const chain = computed(() =>
  !inBox.value && pageKind(report.reportProperties, props.element.pageIndex) === "contents"
    ? fullChain.value
    : [props.element],
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
// "Contents page 2" / "Next column": where part p of the chain starts
function partLabel(p: number): string {
  const part = chain.value[p]!;
  const before = chain.value[p - 1]!;
  return (before.pageIndex ?? 0) === (part.pageIndex ?? 0)
    ? t("contentsList.nextColumn")
    : t("contentsList.onPage", { n: contentsPageNumber(report.reportProperties, part.pageIndex ?? 0) });
}

const rows = computed<Row[]>(() =>
  chain.value.flatMap((part, p) =>
    part.list.entries.map((entry, index) => ({ entry, part, index, divider: index === 0 && p > 0 ? partLabel(p) : undefined })),
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

// ---------------------------------------------------------------------------
// Automatic mode: one row per heading on the pages (the sync writes the list's
// rows); the user can only hide a heading or type its number

const allHeadings = computed(() => headingItems(report.bands, report.reportProperties));
const adjust = (): ContentsAdjust => (list.value.adjust ??= {});

function tidyAdjust() {
  const a = list.value.adjust;
  if (!a) return;
  if (a.hidden && !a.hidden.length) delete a.hidden;
  if (a.numbers && !Object.keys(a.numbers).length) delete a.numbers;
  if (!Object.keys(a).length) delete list.value.adjust;
}

interface AutoRow {
  key: string;
  level: 0 | 1;
  title: string;
  page: string;
  number: string;
  hidden: boolean;
  divider?: string;
}
const autoRows = computed<AutoRow[]>(() => {
  const hidden = list.value.adjust?.hidden ?? [];
  // Numbers as the list shows them, and where each later part starts
  const shown = new Map<string, string>();
  const starts = new Map<string, string>();
  chain.value.forEach((part, p) => {
    part.list.entries.forEach((e, i) => {
      if (!e.key) return;
      shown.set(e.key, e.number);
      if (i === 0 && p > 0) starts.set(e.key, partLabel(p));
    });
  });
  return allHeadings.value
    .filter((h) => h.element.uuid)
    .map((h) => {
      const key = h.element.uuid!;
      return {
        key,
        level: h.entry.level,
        title: h.entry.title,
        page: h.entry.page,
        number: list.value.ownNumbers ? (list.value.adjust?.numbers?.[key] ?? "") : (shown.get(key) ?? ""),
        hidden: hidden.includes(key),
        divider: starts.get(key),
      };
    });
});
const shownCount = computed(() =>
  list.value.follow
    ? autoRows.value.filter((r) => !r.hidden && !(list.value.sectionsOnly && r.level === 1)).length
    : rows.value.filter((r) => !(list.value.sectionsOnly && r.entry.level === 1)).length,
);

function toggleHidden(key: string) {
  change(() => {
    const hidden = (adjust().hidden ??= []);
    const i = hidden.indexOf(key);
    if (i === -1) hidden.push(key);
    else hidden.splice(i, 1);
    tidyAdjust();
  });
}

function setOwnNumber(key: string, value: string) {
  const number = value.trim().slice(0, 40);
  if ((list.value.adjust?.numbers?.[key] ?? "") === number) return;
  change(() => {
    const numbers = (adjust().numbers ??= {});
    if (number) numbers[key] = number;
    else delete numbers[key];
    tidyAdjust();
  });
}

// ---------------------------------------------------------------------------
// Manual mode: typed rows, never linked to the headings

const rowList = ref<HTMLElement | null>(null);

function setEntry(row: Row, key: keyof Omit<ContentsEntry, "level" | "key">, value: string) {
  if (row.entry[key] === value) return;
  change(() => (row.entry[key] = value));
}

// Drag and drop on the grip
const dragFrom = ref<number | null>(null);
const dropAt = ref<number | null>(null);

function onDragStart(event: DragEvent, i: number) {
  dragFrom.value = i;
  event.dataTransfer?.setData("text/plain", String(i));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  const row = (event.target as HTMLElement).closest(".entry-row");
  if (row && event.dataTransfer) event.dataTransfer.setDragImage(row, 12, 14);
}

function onDragOver(event: DragEvent, i: number) {
  if (dragFrom.value === null) return;
  event.preventDefault();
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  dropAt.value = event.clientY > box.top + box.height / 2 ? i + 1 : i;
}

function onDragEnd() {
  dragFrom.value = null;
  dropAt.value = null;
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  const from = dragFrom.value;
  const to = dropAt.value;
  onDragEnd();
  if (from === null || to === null || to === from || to === from + 1) return;
  change(() => {
    const order = rows.value.map((r) => r.entry);
    const [entry] = order.splice(from, 1);
    order.splice(to > from ? to - 1 : to, 0, entry!);
    // The same number of rows on each part, in the new order
    let k = 0;
    for (const part of chain.value) part.list.entries = order.slice(k, (k += part.list.entries.length));
  });
}

// A new row goes at the end; the button is at the top, so the new row is
// scrolled to and ready for typing
async function addRow() {
  const last = rows.value[rows.value.length - 1]?.entry;
  const lastPart = chain.value[chain.value.length - 1]!;
  change(() =>
    lastPart.list.entries.push({ number: "", title: t("contentsList.newRow"), page: last?.page ?? "", level: last?.level ?? 0 }),
  );
  await nextTick();
  const inputs = rowList.value?.querySelectorAll<HTMLInputElement>("input.col-title");
  const input = inputs?.[inputs.length - 1];
  input?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  input?.focus();
  input?.select();
}

// ---------------------------------------------------------------------------
// Place on page. The list (with a second column on the same page, as a pair)
// is placed across the page, and up / down in the free space between what is
// above it (the heading, rules) and below it; page-wide frames and panels
// behind it don't count. Later contents pages follow the first one's place.

type Across = "left" | "center" | "right";
type UpDown = "top" | "middle" | "bottom";
const ACROSS = [
  { value: "left" as const, icon: AlignHorizontalJustifyStart },
  { value: "center" as const, icon: AlignHorizontalJustifyCenter },
  { value: "right" as const, icon: AlignHorizontalJustifyEnd },
];
const UP_DOWN = [
  { value: "top" as const, icon: AlignVerticalJustifyStart },
  { value: "middle" as const, icon: AlignVerticalJustifyCenter },
  { value: "bottom" as const, icon: AlignVerticalJustifyEnd },
];

const pageBox = computed(() => {
  const p = report.reportProperties;
  const area = specialPageArea(p, props.element.pageIndex);
  const width = area?.width ?? p.pageWidth - (p.leftMargin || 0) - (p.rightMargin || 0);
  const height = area?.height ?? report.bands.find((b) => b.type === "detail")?.height ?? 0;
  return { width, height, gutter: Math.round(width * 0.06) };
});

// The list and its columns on this page, the box around them, and the free space
const placeGroup = computed(() => {
  const pageIndex = props.element.pageIndex ?? 0;
  const parts = fullChain.value.filter((l) => (l.pageIndex ?? 0) === pageIndex);
  const x = Math.min(...parts.map((l) => l.x));
  const y = Math.min(...parts.map((l) => l.y));
  const right = Math.max(...parts.map((l) => l.x + l.width));
  const bottom = Math.max(...parts.map((l) => l.y + l.height));
  const ids = new Set(parts.map((l) => l.uuid));
  const others = (report.bands.find((b) => b.type === "detail")?.elements ?? []).filter(
    (e) => (e.pageIndex ?? 0) === pageIndex && !ids.has(e.uuid),
  );
  const { height, gutter } = pageBox.value;
  const above = others.filter((e) => e.y + e.height <= y + 1).map((e) => e.y + e.height);
  const below = others.filter((e) => e.y >= bottom - 1).map((e) => e.y);
  return {
    parts,
    x,
    y,
    w: right - x,
    h: bottom - y,
    top: above.length ? Math.max(...above) + 16 : gutter,
    end: below.length ? Math.min(...below) - 16 : height - gutter,
  };
});

function targetX(across: Across): number {
  const { width, gutter } = pageBox.value;
  const { w } = placeGroup.value;
  return across === "left" ? gutter : across === "right" ? width - w - gutter : (width - w) / 2;
}

function targetY(upDown: UpDown): number {
  const { h, top, end } = placeGroup.value;
  return upDown === "top" ? top : upDown === "bottom" ? end - h : top + (end - top - h) / 2;
}

// Which buttons look chosen (within 2 px)
const placement = computed(() => {
  const { x, y } = placeGroup.value;
  const near = (a: number, b: number) => Math.abs(a - b) <= 2;
  return {
    across: (["left", "center", "right"] as const).find((a) => near(x, Math.round(targetX(a)))),
    upDown: (["top", "middle", "bottom"] as const).find((v) => near(y, Math.round(targetY(v)))),
  };
});

function placeOnPage(across?: Across, upDown?: UpDown) {
  const g = placeGroup.value;
  const dx = across ? Math.round(targetX(across)) - g.x : 0;
  const dy = upDown ? Math.max(0, Math.round(targetY(upDown))) - g.y : 0;
  if (!dx && !dy) return;
  change(() => {
    for (const part of g.parts) {
      part.x += dx;
      part.y += dy;
    }
  });
}

// "Go to this heading" selects it on the page
const selection = useSelectionStore();

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
// (a list in a box makes its box grow, so nothing is left over)
const overflow = computed(() => (inBox.value ? 0 : followOverflow(report.bands, report.reportProperties, props.element)));
const onContentsPage = computed(
  () => !inBox.value && pageKind(report.reportProperties, props.element.pageIndex) === "contents",
);

// Automatic <-> Manual, for the list and the lists carrying it on.
// To Manual: the rows stay exactly as shown (a copy, no longer linked); numbers
// stay automatic in the headings' style when they were. To Automatic: the rows
// come from the headings again
function setFollow(on: boolean) {
  if (on === !!list.value.follow) return;
  const numbering = headingNumbering(report.reportProperties);
  const counted = !list.value.ownNumbers;
  const typed = !list.value.autoNumber;
  change(() => {
    for (const l of fullChain.value) {
      if (on) {
        l.list.follow = true;
        if (typed) l.list.ownNumbers = true;
        else delete l.list.ownNumbers;
      } else {
        delete l.list.follow;
        delete l.list.ownNumbers;
        l.list.entries = l.list.entries.map(({ key: _key, ...e }) => e);
        if (counted) {
          l.list.autoNumber = true;
          l.list.sectionStyle = numbering.style;
          if (numbering.word !== undefined) l.list.sectionWord = numbering.word;
          l.list.subStyle ??= "roman";
        } else {
          delete l.list.autoNumber;
        }
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
const subSample = (style: ContentsSubStyle) =>
  style === "none"
    ? t("contentsList.noSubNumbers")
    : [1, 2, 3].map((n) => subNumber(sampleList({ subStyle: style }), 1, n)).join("  ");

// Sections: in Automatic mode the report's heading numbering (the contents and
// every Section Heading change together), in Manual mode the list's own.
// An older "word" style shows as "1." with the word before it. One undo step
const sectionValue = computed<SectionNumberValue>(() => {
  if (list.value.follow) {
    const n = headingNumbering(report.reportProperties);
    return sectionAffixes(n.style, n.word, n.before, n.after);
  }
  const l = list.value;
  return sectionAffixes(l.sectionStyle, l.sectionWord, l.sectionBefore, l.sectionAfter);
});

function setSectionNumbering(next: SectionNumberValue) {
  const before = next.before.trim();
  const after = next.after;
  change(() => {
    if (list.value.follow) {
      const n: HeadingNumbering = { style: next.style };
      if (before) n.before = before;
      if (after) n.after = after;
      report.reportProperties.headingNumbers = n;
    } else {
      const l = list.value;
      l.sectionStyle = next.style;
      delete l.sectionWord;
      if (before) l.sectionBefore = before;
      else delete l.sectionBefore;
      if (after) l.sectionAfter = after;
      else delete l.sectionAfter;
    }
  });
}

// Sections only (for the list and the lists carrying it on); Manual hides the
// indented rows, never deletes them
function setSectionsOnly(on: boolean) {
  if (on === !!list.value.sectionsOnly) return;
  change(() => {
    for (const l of fullChain.value) {
      if (on) l.list.sectionsOnly = true;
      else delete l.list.sectionsOnly;
    }
  });
}

// "Number automatically", in both modes (on for new lists)
const numbersOn = computed(() => (list.value.follow ? !list.value.ownNumbers : !!list.value.autoNumber));

function setNumbering(on: boolean) {
  change(() => {
    if (list.value.follow) {
      if (on) {
        delete list.value.ownNumbers;
      } else {
        // The numbers shown become typed ones, so nothing changes on the page
        const numbers: Record<string, string> = {};
        for (const r of autoRows.value) if (r.number) numbers[r.key] = r.number;
        list.value.ownNumbers = true;
        adjust().numbers = numbers;
        tidyAdjust();
      }
    } else if (on) {
      list.value.autoNumber = true;
      list.value.sectionStyle ??= "1.";
      list.value.subStyle ??= "roman";
    } else {
      const shown = numbers.value;
      rows.value.forEach((r, i) => (r.entry.number = shown[i] ?? ""));
      delete list.value.autoNumber;
    }
  });
}

function setStyle(key: "sectionStyle" | "subStyle", value: string) {
  if (list.value[key] === value) return;
  change(() => ((list.value as any)[key] = value));
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
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.card-head h5 {
  margin: 0;
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--prop-primary-color, #6440f4);
  border-radius: 6px;
  background: var(--prop-primary-color, #6440f4);
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.add-btn:hover {
  filter: brightness(1.08);
}

.grip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 14px;
  height: 26px;
  color: var(--prop-text-tertiary);
  cursor: grab;
}

.grip:hover {
  color: var(--prop-primary-color, #6440f4);
}

.grip.is-fixed {
  cursor: default;
}

.entry-row {
  position: relative;
}

.entry-row.is-dragging {
  opacity: 0.4;
}

.entry-row.drop-before::before,
.entry-row.drop-after::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 1px;
  background: var(--prop-primary-color, #6440f4);
}

.entry-row.drop-before::before {
  top: -3px;
}

.entry-row.drop-after::after {
  bottom: -3px;
}

.row-list {
  margin-top: 10px;
}

.row-actions {
  display: inline-flex;
  gap: 2px;
  flex-shrink: 0;
}

.row-actions .icon-btn {
  width: 22px;
  height: 22px;
}
.align-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.seg {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 7px;
  background: var(--prop-bg-tertiary, #f3f4f6);
}

.seg-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--prop-text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.15s ease;
}

.seg-btn:hover {
  color: var(--prop-text-primary, #111827);
}

.seg-btn.active {
  background: #fff;
  color: var(--prop-border-focus, #6440f4);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
}

.mode-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mode-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.mode-card:hover {
  border-color: var(--prop-border-focus);
}

.mode-card.active {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f7f5ff;
  box-shadow: 0 0 0 2px rgba(100, 64, 244, 0.15);
}

.mode-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-bottom: 2px;
  border-radius: 8px;
  background: var(--prop-bg-secondary, #f4f3f8);
  color: var(--prop-text-secondary);
}

.mode-card.active .mode-icon {
  background: var(--prop-primary-color, #6440f4);
  color: #fff;
}

.mode-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.mode-desc {
  font-size: 11px;
  line-height: 1.35;
  color: var(--prop-text-tertiary);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
}

.switch-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.switch-title {
  font-size: var(--prop-font-size-sm);
  font-weight: 600;
  color: var(--prop-text-primary);
}

.switch-desc {
  font-size: var(--prop-font-size-xs);
  line-height: 1.4;
  color: var(--prop-text-tertiary);
}

.switch {
  appearance: none;
  position: relative;
  flex-shrink: 0;
  width: 34px;
  height: 20px;
  margin: 0;
  border-radius: 10px;
  background: #d4d2de;
  cursor: pointer;
  transition: background 0.15s;
}

.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: transform 0.15s;
}

.switch:checked {
  background: var(--prop-primary-color, #6440f4);
}

.switch:checked::after {
  transform: translateX(14px);
}

.switch:focus-visible {
  outline: 2px solid rgba(100, 64, 244, 0.4);
  outline-offset: 2px;
}

.form-hint.is-tight {
  margin: -2px 0 8px;
}

.show-field {
  margin-top: 10px;
}

.entry-row.is-hidden-sub input {
  opacity: 0.45;
  text-decoration: line-through;
}

.number-styles {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--prop-border-color);
}

.fill-btn {
  margin: 0 0 4px;
}

.empty-note {
  margin: 8px 0 0;
  padding: 10px;
  border: 1px dashed var(--prop-border-color);
  border-radius: 8px;
  font-size: 11.5px;
  line-height: 1.45;
  text-align: center;
  color: var(--prop-text-tertiary);
}

.auto-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 4px 0 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--prop-text-primary);
}

.auto-row:nth-child(odd) {
  background: #fafafc;
}

.auto-row:hover {
  background: #f3f0ff;
}

.auto-row.is-sub .auto-title {
  padding-left: 14px;
  font-weight: 400;
}

.auto-number {
  flex-shrink: 0;
  min-width: 26px;
  font-weight: 600;
  color: var(--prop-text-secondary);
}

.auto-row .col-number {
  width: 52px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 5px;
  font-size: 12px;
  box-sizing: border-box;
}

.auto-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.auto-page {
  flex-shrink: 0;
  min-width: 18px;
  text-align: right;
  color: var(--prop-text-secondary);
}

.auto-row.is-hidden .auto-title,
.auto-row.is-hidden .auto-page {
  color: var(--prop-text-tertiary);
  text-decoration: line-through;
}

</style>
