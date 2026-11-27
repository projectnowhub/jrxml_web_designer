<template>
  <!-- Page number settings in three plain steps, with the pages always in view.
       Written for people who don't work with reports every day: everyday
       words, real examples, every choice next to what it changes. -->
  <div class="pagination-properties">
    <!-- 1. How it looks: each card shows the real text -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">1</span>{{ t("pagination.panel.lookTitle") }}<SettingHelpButton id="pnLook" /></h5>
      <SettingHelpText id="pnLook" />
      <div class="look-grid" role="radiogroup" :aria-label="t('pagination.panel.lookTitle')">
        <button
          v-for="format in PAGINATION_FORMATS"
          :key="format.id"
          type="button"
          role="radio"
          class="look-card"
          :class="{ active: settings.format === format.id }"
          :aria-checked="settings.format === format.id"
          :title="t(`pagination.formats.${format.id}`)"
          @click="update({ format: format.id })"
        >
          {{ lookSample(format.id) }}
        </button>
      </div>
      <p v-if="settings.format === 'pageXofY' || settings.format === 'slash'" class="hint">
        {{ t("pagination.panel.totalHint", { total: designPages }) }}
      </p>

      <!-- How the numbers are written -->
      <span class="field-label">{{ t("pagination.panel.numbersTitle") }}</span>
      <div class="look-grid is-row" role="radiogroup" :aria-label="t('pagination.panel.numbersTitle')">
        <button
          v-for="style in NUMBER_STYLES"
          :key="style"
          type="button"
          role="radio"
          class="look-card"
          :class="{ active: (settings.numberStyle ?? 'arabic') === style }"
          :aria-checked="(settings.numberStyle ?? 'arabic') === style"
          :title="t(`pagination.style.${style}`)"
          @click="update({ numberStyle: style })"
        >
          {{ styleSample(style) }}
        </button>
      </div>
    </section>

    <!-- 2. Which pages get a number -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">2</span>{{ t("pagination.panel.pagesTitle") }}<SettingHelpButton id="pnPages" /></h5>
      <SettingHelpText id="pnPages" />
      <!-- With a cover / contents pages: do they count? (they never show a number) -->
      <div v-if="report.special.count" class="count-special">
        <label class="count-special-row">
          <input
            type="checkbox"
            :checked="report.special.countPages"
            @change="setCountSpecialPages(($event.target as HTMLInputElement).checked)"
          />
          {{ t("specialPages.countPages") }}
        </label>
        <p class="hint">
          {{
            t(report.special.countPages ? "specialPages.countPagesYes" : "specialPages.countPagesNo", {
              n: report.special.count + 1,
            })
          }}
        </p>
      </div>
      <select
        class="pages-select"
        :aria-label="t('pagination.panel.pagesTitle')"
        :value="settings.range"
        @change="setRange(($event.target as HTMLSelectElement).value as PaginationRange)"
      >
        <option v-for="choice in PAGE_CHOICES" :key="choice" :value="choice">{{ t(`pagination.panel.choices.${choice}`) }}</option>
      </select>
      <p class="hint">{{ t(`pagination.panel.choiceHints.${settings.range}`) }}</p>

      <!-- Only some pages: parts, and pages left out -->
      <div v-if="settings.range === 'custom'" class="some-pages">
        <div v-for="(part, i) in partRows" :key="i" class="part">
          <div v-if="partRows.length > 1" class="part-head">
            <strong>{{ t("pagination.panel.part", { part: i + 1 }) }}</strong>
            <button type="button" class="icon-btn" :title="t('pagination.panel.removePart')" :aria-label="t('pagination.panel.removePart')" @click="removePart(i)">
              <X :size="14" aria-hidden="true" />
            </button>
          </div>
          <div class="pages-row">
            <span class="pages-word">{{ t("pagination.panel.pages") }}</span>
            <input v-live-change
              type="number"
              min="1"
              step="1"
              :aria-label="t('pagination.panel.firstPage', { part: i + 1 })"
              :value="part.from"
              @change="updatePart(i, 'from', $event)"
            />
            <span class="pages-word">{{ t("pagination.panel.to") }}</span>
            <input v-live-change
              type="number"
              min="1"
              step="1"
              :aria-label="t('pagination.panel.lastPage', { part: i + 1 })"
              :value="part.to ?? ''"
              :placeholder="i < partRows.length - 1 ? t('pagination.panel.toNextPart') : t('pagination.panel.toEnd')"
              @change="updatePart(i, 'to', $event)"
            />
          </div>
          <!-- With several parts each one can look different -->
          <div v-if="partRows.length > 1" class="part-look">
            <label>
              <span>{{ t("pagination.panel.partLook") }}</span>
              <select :value="part.format ?? ''" @change="setPartLook(i, 'format', ($event.target as HTMLSelectElement).value)">
                <option value="">{{ t("pagination.panel.sameAsAbove") }}</option>
                <option v-for="format in PAGINATION_FORMATS" :key="format.id" :value="format.id">{{ lookSample(format.id, part.numberStyle) }}</option>
              </select>
            </label>
            <label>
              <span>{{ t("pagination.panel.partNumbers") }}</span>
              <select :value="part.numberStyle ?? ''" @change="setPartLook(i, 'numberStyle', ($event.target as HTMLSelectElement).value)">
                <option value="">{{ t("pagination.panel.sameAsAbove") }}</option>
                <option v-for="style in NUMBER_STYLES" :key="style" :value="style">{{ styleSample(style) }}</option>
              </select>
            </label>
          </div>
        </div>

        <p v-if="partError" class="note is-warning" role="alert">{{ partError }}</p>
        <p v-else-if="rangeIsEmpty" class="note is-warning" role="alert">{{ t("pagination.panel.errors.empty") }}</p>

        <!-- Only with several parts -->
        <template v-if="partRows.length > 1">
          <span class="field-label">{{ t("pagination.panel.partsCounting") }}</span>
          <div class="choice-list" role="radiogroup" :aria-label="t('pagination.panel.partsCounting')">
            <button
              v-for="mode in (['restart', 'continue'] as const)"
              :key="mode"
              type="button"
              role="radio"
              class="choice"
              :class="{ active: (settings.groupNumbering ?? 'restart') === mode }"
              :aria-checked="(settings.groupNumbering ?? 'restart') === mode"
              @click="update({ groupNumbering: mode })"
            >
              <span class="choice-dot" aria-hidden="true" />
              <span class="choice-text">
                <span class="choice-title">{{ t(`pagination.panel.partsModes.${mode}`) }}</span>
                <span v-if="partsExample" class="choice-hint">
                  {{ t("pagination.panel.example", { page: partsExample.page, label: partsExample[mode] }) }}
                </span>
              </span>
            </button>
          </div>
        </template>

        <button type="button" class="outline-btn" @click="addPart">
          <Plus :size="15" aria-hidden="true" />{{ t("pagination.panel.addPart") }}
        </button>
        <p class="hint">{{ t("pagination.panel.addPartHint") }}</p>

        <!-- Pages inside the parts that get no number -->
        <label class="field-label" :for="`leave-out-${element.uuid}`">{{ t("pagination.panel.leaveOut") }}</label>
        <div class="leave-row">
          <input
            :id="`leave-out-${element.uuid}`"
            v-model="leaveOutDraft"
            type="text"
            inputmode="numeric"
            :placeholder="t('pagination.panel.leaveOutPlaceholder')"
            @keydown.enter.prevent="addLeftOut"
            @blur="addLeftOut"
          />
          <button type="button" class="outline-btn" :disabled="!leaveOutDraft.trim()" @click="addLeftOut">
            {{ t("pagination.panel.leaveOutAdd") }}
          </button>
        </div>
        <p v-if="unreadable.length" class="note is-warning">{{ t("pagination.panel.unreadable", { text: unreadable.join(", ") }) }}</p>
        <p v-else-if="outside.length" class="note is-warning">
          {{ t("pagination.panel.outside", { pages: formatPageList(outside), range: numberedPagesText }) }}
        </p>
        <p v-else class="hint">{{ t("pagination.panel.leaveOutHint") }}</p>
        <div v-if="leftOutRuns.length" class="chips">
          <span v-for="run in leftOutRuns" :key="run[0]" class="chip">
            {{ run[0] === run[1] ? t("pagination.panel.chipPage", { page: run[0] }) : t("pagination.panel.chipPages", { from: run[0], to: run[1] }) }}
            <button type="button" :title="t('pagination.panel.chipRemove')" :aria-label="t('pagination.panel.chipRemove')" @click="removeRun(run)">
              <X :size="12" aria-hidden="true" />
            </button>
          </span>
          <button type="button" class="link-btn" @click="update({ hidden: [] })">{{ t("pagination.panel.clearAll") }}</button>
        </div>

        <!-- Only when pages are left out -->
        <template v-if="leftOutRuns.length">
          <span class="field-label">{{ t("pagination.panel.afterLeftOut") }}</span>
          <div class="choice-list" role="radiogroup" :aria-label="t('pagination.panel.afterLeftOut')">
            <button
              v-for="mode in (['keep', 'skip'] as const)"
              :key="mode"
              type="button"
              role="radio"
              class="choice"
              :class="{ active: (settings.hiddenNumbering ?? 'keep') === mode }"
              :aria-checked="(settings.hiddenNumbering ?? 'keep') === mode"
              @click="update({ hiddenNumbering: mode })"
            >
              <span class="choice-dot" aria-hidden="true" />
              <span class="choice-text">
                <span class="choice-title">{{ t(`pagination.panel.leftOutModes.${mode}`) }}</span>
                <span v-if="leftOutExample" class="choice-hint">
                  {{ t("pagination.panel.example", { page: leftOutExample.page, label: leftOutExample[mode] }) }}
                </span>
              </span>
            </button>
          </div>
        </template>
      </div>
    </section>

    <!-- 3. The pages, with what each one prints -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">3</span>{{ t("pagination.panel.yourPages", { n: designPages }, designPages) }}<SettingHelpButton id="pnYourPages" /></h5>
      <SettingHelpText id="pnYourPages" />
      <div v-if="designWarnings.length" class="note is-warning box" role="status">
        <TriangleAlert :size="15" aria-hidden="true" />
        <div>
          <p v-for="(warning, i) in designWarnings" :key="i">{{ warning }}</p>
          <p>{{ t("pagination.panel.design.whatToDo") }}</p>
        </div>
      </div>
      <div class="page-strip">
        <div
          v-for="item in previewPages"
          :key="item.page"
          class="page-tile"
          :class="{ 'is-off': !item.label, 'is-special': item.special }"
          :title="item.label ? `${item.name}: ${item.label}` : `${item.name}: ${t('pagination.panel.noNumber')}`"
        >
          <span class="tile-sheet"><span class="tile-label">{{ item.label ?? "–" }}</span></span>
          <span class="tile-page">{{ item.name }}</span>
        </div>
      </div>
      <p v-if="previewPages.length < report.totalPages" class="hint">
        {{ t("pagination.panel.morePages", { n: report.totalPages - previewPages.length }) }}
      </p>
      <p class="hint">{{ t(hasTables ? "pagination.panel.tablesNote" : "pagination.panel.longerNote") }}</p>
    </section>
  </div>
</template>


<script setup lang="ts">
import SettingHelpButton from "../../help/SettingHelpButton.vue";
import SettingHelpText from "../../help/SettingHelpText.vue";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Plus, TriangleAlert, X } from "@lucide/vue";
import { useReportStore } from "@/stores/report";
import { pageKind } from "@/utils/specialPages";
import { collectTables } from "@/utils/table/tableDocument";
import type { TextFieldElement } from "../../../types";
import {
  applyPaginationSettings,
  formatPageList,
  formatPageNumber,
  getNumberedPages,
  getPaginationSettings,
  NUMBER_STYLES,
  pageGroups,
  pageRuns,
  pagesOutsideRange,
  PAGINATION_FORMATS,
  parsePageList,
  styleNumber,
  type NumberStyle,
  type PageGroup,
  type PaginationFormat,
  type PaginationRange,
  type PaginationSettings,
} from "../../../utils/paginationPresets";

const props = defineProps<{
  element: TextFieldElement;
}>();

// Changes: an undo step before, the JRXML rewritten after
const report = useReportStore();
const { t } = useI18n();

const settings = computed(() => getPaginationSettings(props.element));

// One undo step per change
const update = (patch: Partial<PaginationSettings>) => {
  const next = { ...settings.value, ...patch };
  if (JSON.stringify(next) === JSON.stringify(settings.value)) return;
  report.saveStateToHistory();
  applyPaginationSettings(props.element, next);
  report.updateJrxml();
};

// Pages the numbers count: the design's pages, without the cover and contents
// pages when they aren't counted. Examples, totals and the pictures follow them.
const numberShift = computed(() => (report.special.countPages ? 0 : report.special.count));
const designPages = computed(() => Math.max(1, report.totalPages - numberShift.value));

function setCountSpecialPages(count: boolean) {
  if (count === report.special.countPages) return;
  report.saveStateToHistory();
  if (count) delete report.reportProperties.countSpecialPages;
  else report.reportProperties.countSpecialPages = false;
  report.updateJrxml();
}

// ── 1. How it looks ──

// "Page 1 of 12": the real text, with this page number's number style
const lookSample = (format: PaginationFormat, style?: NumberStyle) => {
  const spec = PAGINATION_FORMATS.find((f) => f.id === format)!;
  const s = style ?? settings.value.numberStyle;
  return spec.sample(styleNumber(1, s), styleNumber(designPages.value, s));
};
const styleSample = (style: NumberStyle) => [1, 2, 3].map((n) => styleNumber(n, style)).join(", ");

// ── 2. Which pages ──

// The choices in the "Which pages" list
const PAGE_CHOICES: PaginationRange[] = ["all", "skipFirst", "skipFirstTwo", "custom"];

// Left-out pages belong to "Only some pages": another choice clears them
function setRange(range: PaginationRange) {
  partError.value = "";
  outside.value = [];
  update({ range, hidden: range === "custom" ? settings.value.hidden : [] });
}

// Parts as saved (an empty "to" stays empty here)
const partRows = computed<PageGroup[]>(() => settings.value.groups ?? [{ from: settings.value.from ?? 1, to: settings.value.to }]);

// One part: first page after the last one
const rangeIsEmpty = computed(
  () => partRows.value.length === 1 && partRows.value[0]!.to !== undefined && partRows.value[0]!.from > partRows.value[0]!.to!,
);

// Why the last change to a part wasn't made
const partError = ref("");

function applyParts(parts: PageGroup[]) {
  partError.value = "";
  const [first] = parts;
  update({ from: first!.from, to: first!.to, groups: parts.length > 1 ? parts : undefined });
}

// A page typed into a part: refused, with the reason, when it would run into
// the part before or after it
function updatePart(index: number, side: "from" | "to", event: Event) {
  const input = event.target as HTMLInputElement;
  const value = parseInt(input.value, 10);
  const page = Number.isInteger(value) && value >= 1 ? value : undefined;
  const parts = partRows.value.map((p) => ({ ...p }));
  const part = parts[index]!;
  if (side === "from") part.from = page ?? 1;
  else part.to = page;
  const prev = parts[index - 1];
  const next = parts[index + 1];
  const prevEnd = prev ? (prev.to ?? prev.from) : 0;
  let error = "";
  if (parts.length > 1 && part.to !== undefined && part.to < part.from) {
    error = t("pagination.panel.errors.toBeforeFrom", { part: index + 1 });
  } else if (prev && part.from <= prevEnd) {
    error = t("pagination.panel.errors.startAfter", { part: index + 1, page: prevEnd, prev: index });
  } else if (next && part.to !== undefined && part.to >= next.from) {
    error = t("pagination.panel.errors.endBefore", { part: index + 1, page: next.from, next: index + 2 });
  }
  if (error) {
    partError.value = error;
    // Back to what it was on Enter or leaving the field; not after a pause
    // while typing (12 passes through 1: the typing isn't taken away)
    const saved = partRows.value[index]!;
    if (event.isTrusted) input.value = String((side === "from" ? saved.from : saved.to) ?? "");
    return;
  }
  if (event.isTrusted) input.value = page ? String(page) : "";
  applyParts(parts);
}

// A part's own look ("" = same as above)
function setPartLook(index: number, key: "format" | "numberStyle", value: string) {
  const parts = partRows.value.map((p, i) => (i === index ? { ...p, [key]: value || undefined } : { ...p }));
  applyParts(parts);
}

// A new part one page after the last one ends (that one keeps running up to it)
function addPart() {
  const parts = partRows.value.map((p) => ({ ...p }));
  const last = parts[parts.length - 1]!;
  parts.push({ from: (last.to ?? Math.max(last.from, designPages.value)) + 2 });
  applyParts(parts);
}

function removePart(index: number) {
  applyParts(partRows.value.filter((_, i) => i !== index));
}

// "1–10, 12 to the end"
const numberedPagesText = computed(() =>
  pageGroups(settings.value)
    .map((g) => (g.to ? `${g.from}–${g.to}` : t("pagination.panel.fromToEnd", { from: g.from })))
    .join(", "),
);

// Pages left out: typed as "3, 5, 8-10"; added on Enter, "Add" or leaving the field
const leaveOutDraft = ref("");
const unreadable = ref<string[]>([]);
// Pages typed that already have no number
const outside = ref<number[]>([]);
const leftOutRuns = computed(() => pageRuns(settings.value.hidden));

function addLeftOut() {
  const { pages, unreadable: bad } = parsePageList(leaveOutDraft.value);
  unreadable.value = bad;
  outside.value = pagesOutsideRange(settings.value, pages);
  const inside = pages.filter((p) => !outside.value.includes(p));
  // What couldn't be read stays in the field to be fixed
  if (pages.length) leaveOutDraft.value = bad.join(", ");
  if (!inside.length) return;
  update({ hidden: [...new Set([...(settings.value.hidden ?? []), ...inside])].sort((a, b) => a - b) });
}

function removeRun([from, to]: [number, number]) {
  update({ hidden: (settings.value.hidden ?? []).filter((p) => p < from || p > to) });
}

watch(
  () => props.element.uuid,
  () => {
    leaveOutDraft.value = "";
    unreadable.value = [];
    outside.value = [];
    partError.value = "";
  },
);

// ── 3. The pages ──

const PREVIEW_MAX = 60;
// Every design page: the cover and contents pages never print a number
const previewPages = computed(() =>
  Array.from({ length: Math.min(PREVIEW_MAX, report.totalPages) }, (_, i) => {
    const kind = pageKind(report.reportProperties, i);
    const special = kind !== "normal";
    return {
      page: i + 1,
      special,
      name:
        kind === "cover"
          ? t("specialPages.cover")
          : kind === "contents"
            ? t("specialPages.contents")
            : t("pagination.panel.pageLabel", { page: i + 1 }),
      label: special ? null : formatPageNumber(settings.value, i + 1 - numberShift.value, designPages.value),
    };
  }),
);

// Tables can make the PDF longer than the design
const hasTables = computed(() => collectTables(report.bands).length > 0);

// Settings that reach past the design's last page. Not errors: the PDF can
// have more pages (a long table), but they can't be seen here.
const designWarnings = computed(() => {
  const s = settings.value;
  const total = designPages.value;
  const out: string[] = [];
  if (!previewPages.value.some((p) => p.label)) out.push(t("pagination.panel.design.nothingNumbered", { total }, total));
  const parts = pageGroups(s);
  parts.forEach((part, i) => {
    if (part.from <= total) return;
    out.push(
      parts.length > 1
        ? t("pagination.panel.design.partAfterEnd", { part: i + 1, from: part.from, total }, total)
        : t("pagination.panel.design.startsAfterEnd", { from: part.from, total }, total),
    );
  });
  const late = (s.hidden ?? []).filter((p) => p > total);
  if (late.length) out.push(t("pagination.panel.design.leftOutAfterEnd", { pages: formatPageList(late), total }, late.length));
  return out;
});



// The page after the first left-out page, as each choice would number it
const leftOutExample = computed(() => {
  const hidden = settings.value.hidden ?? [];
  const total = Math.max(designPages.value, (hidden[hidden.length - 1] ?? 0) + 1);
  for (let page = getNumberedPages(settings.value).first; page <= total; page++) {
    if (!hidden.includes(page) || hidden.includes(page + 1)) continue;
    const keep = formatPageNumber({ ...settings.value, hiddenNumbering: "keep" }, page + 1, total);
    const skip = formatPageNumber({ ...settings.value, hiddenNumbering: "skip" }, page + 1, total);
    if (keep && skip) return { page: page + 1, keep, skip };
  }
  return null;
});

// The second part's first page, as each choice would number it
const partsExample = computed(() => {
  const parts = pageGroups(settings.value);
  const second = parts[1];
  if (!second) return null;
  const total = Math.max(designPages.value, ...parts.map((p) => p.to ?? p.from));
  const label = (mode: "restart" | "continue") => formatPageNumber({ ...settings.value, groupNumbering: mode }, second.from, total);
  const restart = label("restart");
  const carryOn = label("continue");
  return restart && carryOn ? { page: second.from, restart, continue: carryOn } : null;
});
</script>

<style scoped>
/* Sized for easy reading: 13px text, large click targets */
.pagination-properties {
  font-size: 13px;
}

.card {
  /* Same card as the other property sections */
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(28, 27, 38, 0.08);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.04);
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.step-no {
  display: inline-grid;
  flex-shrink: 0;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--prop-primary-color, #6440f4);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}

.field-label {
  display: block;
  margin: 14px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.count-special {
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 6px;
  background: #f5f3ff;
}

.count-special-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.count-special-row input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--prop-primary-color, #6440f4);
}

.count-special .hint {
  margin-top: 4px;
}

.page-tile.is-special .tile-page {
  color: #7c3aed;
}

.hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--prop-text-secondary);
}

.note {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.45;
}

.note.is-warning {
  color: #92400e;
}

.note.box {
  display: flex;
  gap: 8px;
  margin: 0 0 10px;
  padding: 10px 12px;
  border: 1px solid #fde68a;
  border-radius: 8px;
  background: #fffbeb;
}

.note.box svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.note.box p {
  margin: 0;
}

.note.box p + p {
  margin-top: 4px;
}

input,
select {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  box-sizing: border-box;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

/* Big cards showing the real text */
.look-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.look-grid.is-row {
  grid-template-columns: repeat(4, 1fr);
}

.look-card {
  min-height: 32px;
  padding: 4px 6px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12.5px;
  white-space: nowrap;
  font-weight: 500;
  color: var(--prop-text-primary);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.look-card:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.look-card.active {
  border-color: var(--prop-primary-color, #6440f4);
  box-shadow: inset 0 0 0 1px var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
  font-weight: 700;
}

/* Choices as large round-dot options */
.choice-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.choice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.choice:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.choice.active {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
}

.choice-dot {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  border: 2px solid var(--prop-border-hover, #9ca3af);
  border-radius: 50%;
  box-sizing: border-box;
  background: #fff;
}

.choice.active .choice-dot {
  border: 5px solid var(--prop-primary-color, #6440f4);
}

.choice-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.choice-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.choice-hint {
  font-size: 12px;
  color: var(--prop-text-secondary);
}

.look-card:focus-visible,
.choice:focus-visible,
.outline-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #6440f4);
  outline-offset: 2px;
}

/* Only some pages */
.some-pages {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--prop-border-color);
}

.part + .part {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--prop-border-color);
}

.part-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: var(--prop-text-primary);
}

.pages-select {
  width: 100%;
}

.pages-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pages-row input {
  width: 0;
  flex: 1;
  min-width: 0;
}

.pages-word {
  flex-shrink: 0;
  color: var(--prop-text-primary);
}

.part-look {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.part-look label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 12px;
  color: var(--prop-text-secondary);
}

.part-look select {
  width: 100%;
}

.outline-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  height: 36px;
  margin-top: 10px;
  padding: 0 12px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.outline-btn:hover:not(:disabled) {
  border-color: var(--prop-primary-color, #6440f4);
  color: var(--prop-primary-color, #6440f4);
}

.outline-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.icon-btn {
  display: inline-flex;
  padding: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--prop-text-secondary);
  cursor: pointer;
}

.icon-btn:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.leave-row {
  display: flex;
  gap: 8px;
}

.leave-row input {
  flex: 1;
  min-width: 0;
}

.leave-row .outline-btn {
  margin-top: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px 3px 10px;
  border: 1px solid #fde68a;
  border-radius: 999px;
  background: #fffbeb;
  font-size: 12.5px;
  color: #92400e;
}

.chip button {
  display: inline-flex;
  padding: 2px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.chip button:hover {
  background: #fde68a;
}

.link-btn {
  padding: 2px 6px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  color: var(--prop-text-secondary);
  text-decoration: underline;
  cursor: pointer;
}

/* The pages, with what each prints */
.page-strip {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(62px, 1fr));
  gap: 8px;
}

.page-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.tile-sheet {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  min-height: 58px;
  padding: 28px 3px 5px;
  box-sizing: border-box;
  border: 1px solid var(--prop-border-color);
  border-radius: 4px;
  background:
    linear-gradient(#e5e7eb, #e5e7eb) 50% 10px / 70% 2px no-repeat,
    linear-gradient(#e5e7eb, #e5e7eb) 50% 16px / 70% 2px no-repeat,
    linear-gradient(#e5e7eb, #e5e7eb) 50% 22px / 50% 2px no-repeat,
    #fff;
}

/* The whole text always shows: long labels ("Page III of IV") wrap onto a
   second line between words, never cut off */
.tile-label {
  max-width: 100%;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--prop-primary-color, #6440f4);
  text-align: center;
  overflow-wrap: break-word;
}

.page-tile.is-off .tile-sheet {
  border-style: dashed;
  background-color: var(--prop-bg-tertiary, #f3f4f6);
}

.page-tile.is-off .tile-label {
  color: var(--prop-text-tertiary);
}

.tile-page {
  font-size: 11px;
  color: var(--prop-text-secondary);
}

</style>
