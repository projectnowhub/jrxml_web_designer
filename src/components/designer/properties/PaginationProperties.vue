<template>
  <div class="pagination-properties">
    <!-- Format: each option shows what the report prints -->
    <div class="card">
      <h5>{{ t("pagination.title") }}</h5>
      <span class="field-label">{{ t("pagination.format") }}</span>
      <div class="format-grid" role="radiogroup">
        <button
          v-for="format in PAGINATION_FORMATS"
          :key="format.id"
          type="button"
          role="radio"
          class="format-option"
          :class="{ active: settings.format === format.id }"
          :aria-checked="settings.format === format.id"
          :title="t(`pagination.formats.${format.id}`)"
          @click="update({ format: format.id })"
        >
          {{ format.sample(1, t("pagination.totalSymbol")) }}
        </button>
      </div>
      <span class="form-hint">{{ t("pagination.totalHint", { n: t("pagination.totalSymbol") }) }}</span>
    </div>

    <!-- Pages the number is printed on -->
    <div class="card">
      <h5>{{ t("pagination.showOn") }}</h5>
      <select
        :aria-label="t('pagination.showOn')"
        :value="settings.range"
        @change="setRange(($event.target as HTMLSelectElement).value as PaginationRange)"
      >
        <option v-for="range in PAGINATION_RANGES" :key="range" :value="range">
          {{ t(`pagination.ranges.${range}`) }}
        </option>
      </select>
      <span v-if="settings.range !== 'all' && settings.range !== 'custom'" class="form-hint">
        {{ t(`pagination.rangeHints.${settings.range}`) }}
      </span>

      <template v-if="settings.range === 'custom'">
      <!-- Groups of numbered pages: each one counts from 1 -->
      <div v-for="(group, i) in groupRows" :key="i" class="group-block">
        <div v-if="groupRows.length > 1" class="group-head">
          <span>{{ t("pagination.groups.label", { n: i + 1 }) }}</span>
          <button type="button" class="group-remove" :title="t('pagination.groups.remove')" :aria-label="t('pagination.groups.remove')" @click="removeGroup(i)">
            <X :size="12" aria-hidden="true" />
          </button>
        </div>
        <div class="range-row">
          <label class="range-field">
            <span>{{ t("pagination.fromPage") }}</span>
            <input
              type="number"
              min="1"
              step="1"
              :value="i === 0 ? (settings.from ?? '') : group.from"
              :placeholder="'1'"
              @change="updateGroup(i, 'from', $event)"
            />
          </label>
          <label class="range-field">
            <span>{{ t("pagination.toPage") }}</span>
            <input
              type="number"
              min="1"
              step="1"
              :value="group.to ?? ''"
              :placeholder="i < groupRows.length - 1 ? t('pagination.groups.untilNext') : t('pagination.lastPage')"
              @change="updateGroup(i, 'to', $event)"
            />
          </label>
        </div>
      </div>
      <button type="button" class="add-group" @click="addGroup">
        <Plus :size="13" aria-hidden="true" />{{ t("pagination.groups.add") }}
      </button>

      <span v-if="groupError" class="form-hint is-warning">{{ groupError }}</span>
      <span v-else-if="rangeIsEmpty" class="form-hint is-warning">{{ t("pagination.rangeEmpty") }}</span>
      <template v-else>
        <span class="form-hint">
          {{ groupRows.length > 1 ? t("pagination.groups.hint") : t("pagination.rangeHints.custom") }}
        </span>
        <span class="form-hint">{{ t("pagination.toPageHint") }}</span>
      </template>

      <!-- Pages inside From–To that get no number -->
      <label class="field-label except-label" :for="`hide-pages-${element.uuid}`">{{ t("pagination.hide.label") }}</label>
      <div class="hide-row">
        <input
          :id="`hide-pages-${element.uuid}`"
          v-model="hideDraft"
          type="text"
          inputmode="numeric"
          :placeholder="t('pagination.hide.placeholder')"
          @keydown.enter.prevent="addHidden"
          @blur="addHidden"
        />
        <button type="button" class="add-btn" :disabled="!hideDraft.trim()" @click="addHidden">
          <Plus :size="13" aria-hidden="true" />{{ t("pagination.hide.add") }}
        </button>
      </div>
      <span v-if="unreadable.length" class="form-hint is-warning">
        {{ t("pagination.hide.unreadable", { text: unreadable.join(", ") }) }}
      </span>
      <span v-else-if="outside.length" class="form-hint is-warning">
        {{ t("pagination.hide.outside", { pages: formatPageList(outside), range: rangeText }) }}
      </span>
      <span v-else class="form-hint">{{ t("pagination.hide.hint") }}</span>

      <div v-if="hiddenRuns.length" class="hidden-chips">
        <span v-for="run in hiddenRuns" :key="run[0]" class="hidden-chip">
          {{ run[0] === run[1] ? t("pagination.hide.page", { page: run[0] }) : t("pagination.hide.pages", { from: run[0], to: run[1] }) }}
          <button
            type="button"
            :title="t('pagination.hide.remove')"
            :aria-label="t('pagination.hide.remove')"
            @click="removeRun(run)"
          >
            <X :size="11" aria-hidden="true" />
          </button>
        </span>
        <button type="button" class="clear-btn" @click="update({ hidden: [] })">{{ t("pagination.hide.clear") }}</button>
      </div>

      <!-- Do hidden pages still count? Each choice shows what it means here -->
      <template v-if="hiddenRuns.length">
        <span class="field-label numbering-label">{{ t("pagination.hide.numbering") }}</span>
        <div class="numbering-options" role="radiogroup" :aria-label="t('pagination.hide.numbering')">
          <button
            v-for="mode in (['keep', 'skip'] as const)"
            :key="mode"
            type="button"
            role="radio"
            class="numbering-option"
            :class="{ active: (settings.hiddenNumbering ?? 'keep') === mode }"
            :aria-checked="(settings.hiddenNumbering ?? 'keep') === mode"
            @click="update({ hiddenNumbering: mode })"
          >
            <span class="numbering-title">{{ t(`pagination.hide.modes.${mode}`) }}</span>
            <span v-if="example" class="numbering-example">
              {{ t("pagination.hide.example", { page: example.page, label: example[mode] }) }}
            </span>
          </button>
        </div>
      </template>
      </template>
    </div>

    <!-- What the first pages print, at a glance -->
    <div class="card">
      <h5>{{ t("pagination.preview.title", { n: designPages }, designPages) }}</h5>

      <!-- Settings that point at pages this design doesn't have -->
      <div v-if="designWarnings.length" class="design-warning" role="status">
        <TriangleAlert :size="13" aria-hidden="true" />
        <div>
          <p v-for="(warning, i) in designWarnings" :key="i">{{ warning }}</p>
          <p class="design-note">{{ t("pagination.design.pdfNote") }}</p>
        </div>
      </div>

      <div class="page-strip">
        <div
          v-for="item in previewPages"
          :key="item.page"
          class="page-tile"
          :class="{ 'is-off': !item.label }"
          :title="item.label ? `${t('pagination.preview.page', { page: item.page })}: ${item.label}` : t('pagination.preview.none')"
        >
          <span class="tile-sheet">
            <span class="tile-label">{{ item.label ?? "–" }}</span>
          </span>
          <span class="tile-page">{{ t("pagination.preview.page", { page: item.page }) }}</span>
        </div>
      </div>
      <span v-if="previewPages.length < designPages" class="form-hint">
        {{ t("pagination.preview.more", { n: designPages - previewPages.length }) }}
      </span>
      <span class="form-hint">{{ t("pagination.preview.hint") }}</span>
    </div>

    <!-- The generated expression, read-only. Hidden for now: to be shown to
         developers only once roles exist.
    <div class="form-group">
      <label>{{ t("pagination.expression") }}</label>
      <textarea class="locked-expression" :value="element.expression" rows="2" readonly></textarea>
      <span class="form-hint">{{ t("pagination.expressionHint") }}</span>
    </div>
    -->
  </div>
</template>

<script setup lang="ts">
import { useReportStore } from "@/stores/report";
import { computed, ref, watch } from 'vue';
import { Plus, TriangleAlert, X } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import type { TextFieldElement } from '../../../types';
import {
  applyPaginationSettings,
  formatPageNumber,
  getNumberedPages,
  getPaginationSettings,
  pageGroups,
  formatPageList,
  pageRuns,
  pagesOutsideRange,
  parsePageList,
  PAGINATION_FORMATS,
  PAGINATION_RANGES,
  type PageGroup,
  type PaginationRange,
  type PaginationSettings,
} from '../../../utils/paginationPresets';

const props = defineProps<{
  element: TextFieldElement;
}>();

// Changes: an undo step before, the JRXML rewritten after
const report = useReportStore();


const { t } = useI18n();

const settings = computed(() => getPaginationSettings(props.element));

// From after To: the number would not print on any page
const rangeIsEmpty = computed(
  () => !settings.value.groups && !!settings.value.from && !!settings.value.to && settings.value.from > settings.value.to,
);

// ── Groups of numbered pages (Custom pages) ──

// As saved: an empty "To" stays empty here
const groupRows = computed<PageGroup[]>(() =>
  settings.value.groups ?? [{ from: settings.value.from ?? 1, to: settings.value.to }],
);

// Why the last change to a group wasn't made
const groupError = ref("");

function applyGroups(groups: PageGroup[]) {
  groupError.value = "";
  if (groups.length === 1) update({ from: groups[0]!.from, to: groups[0]!.to, groups: undefined });
  else update({ from: groups[0]!.from, to: groups[0]!.to, groups });
}

// A page typed into a group: refused (with the reason) when it would run into
// the group before or after it
function updateGroup(index: number, side: "from" | "to", event: Event) {
  const input = event.target as HTMLInputElement;
  const value = parseInt(input.value, 10);
  const page = Number.isInteger(value) && value >= 1 ? value : undefined;
  const groups = groupRows.value.map((g) => ({ ...g }));
  const group = groups[index]!;
  if (side === "from") group.from = page ?? 1;
  else group.to = page;
  const prev = groups[index - 1];
  const next = groups[index + 1];
  const prevEnd = prev ? (prev.to ?? prev.from) : 0;
  let error = "";
  if (groups.length > 1 && group.to !== undefined && group.to < group.from) {
    error = t("pagination.groups.toBeforeFrom", { n: index + 1 });
  } else if (prev && group.from <= prevEnd) {
    error = t("pagination.groups.startAfter", { n: index + 1, page: prevEnd, prev: index });
  } else if (next && group.to !== undefined && group.to >= next.from) {
    error = t("pagination.groups.endBefore", { n: index + 1, page: next.from, next: index + 2 });
  }
  if (error) {
    groupError.value = error;
    // Back to what it was
    input.value = String((side === "from" ? groupRows.value[index]!.from : groupRows.value[index]!.to) ?? "");
    return;
  }
  input.value = page ? String(page) : "";
  applyGroups(groups);
}

// A new group a page after the last one ends (the last one keeps running up to it)
function addGroup() {
  const groups = groupRows.value.map((g) => ({ ...g }));
  const last = groups[groups.length - 1]!;
  groups.push({ from: (last.to ?? Math.max(last.from, report.totalPages)) + 2 });
  applyGroups(groups);
}

function removeGroup(index: number) {
  applyGroups(groupRows.value.filter((_, i) => i !== index));
}

// One undo step per change
const update = (patch: Partial<PaginationSettings>) => {
  const next = { ...settings.value, ...patch };
  if (JSON.stringify(next) === JSON.stringify(settings.value)) return;
  report.saveStateToHistory();
  applyPaginationSettings(props.element, next);
  report.updateJrxml();
};

// ── Hidden pages ──

// What is being typed ("3, 5, 8-10"); added on Enter, "Add" or leaving the field
const hideDraft = ref("");
const unreadable = ref<string[]>([]);
watch(
  () => props.element.uuid,
  () => {
    hideDraft.value = "";
    unreadable.value = [];
    outside.value = [];
    groupError.value = "";
  },
);

const hiddenRuns = computed(() => pageRuns(settings.value.hidden));

// Pages typed that are outside From–To (they have no number anyway)
const outside = ref<number[]>([]);

// "1–10" or "2 to the last page"
const rangeText = computed(() =>
  t("pagination.hide.rangeText", {
    pages: pageGroups(settings.value)
      .map((g) => (g.to ? `${g.from}–${g.to}` : t("pagination.hide.rangeToEnd", { from: g.from })))
      .join(", "),
  }),
);

function addHidden() {
  const { pages, unreadable: bad } = parsePageList(hideDraft.value);
  unreadable.value = bad;
  outside.value = pagesOutsideRange(settings.value, pages);
  const inside = pages.filter((p) => !outside.value.includes(p));
  // The unreadable parts stay in the field to be fixed
  if (pages.length) hideDraft.value = bad.join(", ");
  if (!inside.length) return;
  update({ hidden: [...new Set([...(settings.value.hidden ?? []), ...inside])].sort((a, b) => a - b) });
}

// Except pages belong to Custom pages: another choice clears them
function setRange(range: PaginationRange) {
  outside.value = [];
  update({ range, hidden: range === "custom" ? settings.value.hidden : [] });
}

function removeRun([from, to]: [number, number]) {
  update({ hidden: (settings.value.hidden ?? []).filter((p) => p < from || p > to) });
}

// The first page after a hidden one, as each counting choice would number it
const example = computed(() => {
  const hidden = settings.value.hidden ?? [];
  const total = Math.max(report.totalPages, (hidden[hidden.length - 1] ?? 0) + 1);
  for (let page = getNumberedPages(settings.value).first; page <= total; page++) {
    if (!hidden.includes(page) || hidden.includes(page + 1)) continue;
    const next = page + 1;
    const keep = formatPageNumber({ ...settings.value, hiddenNumbering: "keep" }, next, total);
    const skip = formatPageNumber({ ...settings.value, hiddenNumbering: "skip" }, next, total);
    if (keep && skip) return { page: next, keep, skip };
  }
  return null;
});

// ── Preview strip: what the first pages print ──

// The design's own pages: the strip follows them when pages are added or deleted
const designPages = computed(() => Math.max(1, report.totalPages));
const PREVIEW_MAX = 60;
const previewPages = computed(() => {
  const s = settings.value;
  const count = Math.min(PREVIEW_MAX, designPages.value);
  return Array.from({ length: count }, (_, i) => ({ page: i + 1, label: formatPageNumber(s, i + 1, designPages.value) }));
});

// Settings that reach past the design's last page. Not errors: the PDF can
// have more pages (a long table), but the canvas can't show them.
const designWarnings = computed(() => {
  const s = settings.value;
  const total = designPages.value;
  const out: string[] = [];
  let numbered = false;
  for (let page = 1; page <= total && !numbered; page++) numbered = !!formatPageNumber(s, page, total);
  if (!numbered) out.push(t("pagination.design.nothingNumbered", { total }, total));
  const groups = pageGroups(s);
  groups.forEach((group, i) => {
    if (group.from <= total) return;
    out.push(
      groups.length > 1
        ? t("pagination.design.groupAfterEnd", { group: i + 1, from: group.from, total }, total)
        : t("pagination.design.startsAfterEnd", { from: group.from, total }, total),
    );
  });
  const lateExcept = (s.hidden ?? []).filter((p) => p > total);
  if (lateExcept.length) {
    out.push(t("pagination.design.exceptAfterEnd", { pages: formatPageList(lateExcept), total }, lateExcept.length));
  }
  return out;
});

</script>

<style scoped>
/* Cards, matching the rest of the property panel */
.card {
  margin-bottom: var(--prop-spacing-md);
  padding: var(--prop-spacing-sm) 10px 10px;
  border-radius: var(--prop-border-radius-md);
  background: var(--prop-bg-secondary);
}

.card h5 {
  margin: 0 0 8px;
  font-size: var(--prop-font-size-sm);
  font-weight: 600;
  color: var(--prop-text-primary);
}

.field-label,
.range-field > span {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: 500;
  color: var(--prop-text-secondary);
}

.card select,
.card input {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  font-size: 12px;
  background: #fff;
  box-sizing: border-box;
}

.card select:focus,
.card input:focus {
  outline: none;
  border-color: var(--prop-border-focus);
  box-shadow: var(--prop-focus-ring);
}

/* Formats as a segmented 2×2 picker */
.format-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  padding: 2px;
  border-radius: 8px;
  background: var(--prop-bg-tertiary, #eef0f4);
}

.format-option {
  height: 30px;
  padding: 0 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: var(--prop-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.format-option:hover {
  color: var(--prop-text-primary);
}

.format-option.active {
  background: #fff;
  color: var(--prop-primary-color, #1890ff);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
}

.format-option:focus-visible {
  outline: 2px solid var(--prop-border-focus);
  outline-offset: 1px;
}

.range-row {
  display: flex;
  gap: var(--prop-spacing-sm);
  margin-top: 10px;
}

/* Groups of numbered pages */
.group-block + .group-block {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--prop-border-color);
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--prop-text-secondary);
}

.group-head + .range-row {
  margin-top: 4px;
}

.group-remove {
  display: inline-flex;
  padding: 3px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--prop-text-tertiary);
  cursor: pointer;
}

.group-remove:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.add-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 4px 8px;
  border: 1px dashed var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.add-group:hover {
  border-color: var(--prop-border-focus);
  color: var(--prop-primary-color, #1890ff);
}

.range-field {
  flex: 1;
  min-width: 0;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: var(--prop-font-size-xs);
  color: var(--prop-text-tertiary);
}

.form-hint.is-warning {
  color: #d48806;
}

/* Hidden pages */
.hide-row {
  display: flex;
  gap: 6px;
}

.hide-row input {
  flex: 1;
  min-width: 0;
}

.add-btn,
.clear-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.add-btn:hover:not(:disabled),
.clear-btn:hover {
  border-color: var(--prop-border-focus);
  color: var(--prop-primary-color, #1890ff);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.hidden-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.hidden-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 4px 2px 8px;
  border: 1px solid #fde68a;
  border-radius: 999px;
  background: #fffbeb;
  font-size: 11px;
  color: #92400e;
}

.hidden-chip button {
  display: inline-flex;
  padding: 1px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.hidden-chip button:hover {
  background: #fde68a;
}

.clear-btn {
  height: 22px;
  padding: 0 8px;
  border: none;
  background: transparent;
  font-size: 11px;
  color: var(--prop-text-tertiary);
}

.numbering-label,
.except-label {
  margin-top: 12px;
}

.numbering-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.numbering-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 6px 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.numbering-option:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.numbering-option.active {
  border-color: var(--prop-border-focus, #1890ff);
  background: #e6f4ff;
}

.numbering-option:focus-visible {
  outline: 2px solid var(--prop-border-focus);
  outline-offset: 1px;
}

.numbering-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--prop-text-primary);
}

.numbering-option.active .numbering-title {
  color: var(--prop-primary-color, #1890ff);
  font-weight: 600;
}

.numbering-example {
  font-size: 11px;
  color: var(--prop-text-tertiary);
}

/* Settings past the design's last page */
.design-warning {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  padding: 8px 10px;
  border: 1px solid #fde68a;
  border-radius: 6px;
  background: #fffbeb;
  font-size: 11.5px;
  line-height: 1.4;
  color: #92400e;
}

.design-warning svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.design-warning p {
  margin: 0;
}

.design-warning p + p {
  margin-top: 4px;
}

.design-warning .design-note {
  color: #a16207;
  opacity: 0.85;
}

/* Preview strip: small pages with the number each one prints */
.page-strip {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
  gap: 6px;
}

.page-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 0;
}

.tile-sheet {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  width: 100%;
  height: 52px;
  padding: 0 3px 5px;
  box-sizing: border-box;
  border: 1px solid var(--prop-border-color);
  border-radius: 3px;
  background:
    linear-gradient(#e5e7eb, #e5e7eb) 50% 10px / 70% 2px no-repeat,
    linear-gradient(#e5e7eb, #e5e7eb) 50% 16px / 70% 2px no-repeat,
    linear-gradient(#e5e7eb, #e5e7eb) 50% 22px / 50% 2px no-repeat,
    #fff;
}

.tile-label {
  overflow: hidden;
  max-width: 100%;
  font-size: 9px;
  font-weight: 600;
  color: var(--prop-primary-color, #1890ff);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-tile.is-off .tile-sheet {
  background-color: var(--prop-bg-tertiary, #f3f4f6);
  border-style: dashed;
}

.page-tile.is-off .tile-label {
  color: var(--prop-text-tertiary);
}

.tile-page {
  font-size: 10px;
  color: var(--prop-text-tertiary);
}
</style>
