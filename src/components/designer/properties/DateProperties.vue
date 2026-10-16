<template>
  <!-- Date settings in plain steps: which date, how it looks, words before it.
       Every choice shows the real text it gives. -->
  <div class="date-properties">
    <!-- 1. Which date -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">1</span>{{ t("dateElement.panel.whichTitle") }}</h5>
      <div class="when-list" role="radiogroup" :aria-label="t('dateElement.panel.whichTitle')">
        <button
          v-for="when in DATE_WHENS"
          :key="when"
          type="button"
          role="radio"
          class="when-card"
          :class="{ active: setup.when === when }"
          :aria-checked="setup.when === when"
          @click="setWhen(when)"
        >
          <span class="when-name">{{ t(`dateElement.when.${when}`) }}</span>
          <span class="when-example">{{ whenSample(when) }}</span>
        </button>
      </div>
      <!-- A chosen date, and a time with it if they want one -->
      <div v-if="setup.when === 'fixed'" class="fixed-row">
        <label class="fixed-field">
          <span class="field-label">{{ t("dateElement.panel.chooseDate") }}</span>
          <input
            type="date"
            :value="setup.date"
            :aria-label="t('dateElement.panel.chooseDate')"
            @change="setFixedDate(($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="fixed-field">
          <span class="field-label">{{ t("dateElement.panel.chooseTime") }}</span>
          <span class="time-wrap">
            <input
              type="time"
              :value="setup.clock ?? ''"
              :aria-label="t('dateElement.panel.chooseTime')"
              @change="setClock(($event.target as HTMLInputElement).value)"
            />
            <button
              v-if="setup.clock"
              type="button"
              class="clear-btn"
              :title="t('dateElement.panel.removeTime')"
              :aria-label="t('dateElement.panel.removeTime')"
              @click="setClock('')"
            >
              <X :size="14" aria-hidden="true" />
            </button>
          </span>
        </label>
      </div>
      <p v-if="setup.when === 'fixed'" class="chosen">
        <span class="preview-label">{{ t("dateElement.panel.shows") }}</span>
        <strong>{{ dateText(setup) }}</strong>
      </p>
      <p class="hint">{{ t(`dateElement.whenHints.${setup.when}`) }}</p>
      <p v-if="setup.when !== 'fixed' && setup.zone" class="hint">
        {{ t("dateElement.panel.zone", { zone: setup.zone }) }}
      </p>
    </section>

    <!-- 2. How it looks -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">2</span>{{ t("dateElement.panel.lookTitle") }}</h5>
      <div class="look-grid" role="radiogroup" :aria-label="t('dateElement.panel.lookTitle')">
        <button
          v-for="look in formatsFor(setup.when)"
          :key="look.id"
          type="button"
          role="radio"
          class="look-card"
          :class="{ active: setup.format === look.id }"
          :aria-checked="setup.format === look.id"
          @click="update({ format: look.id })"
        >
          {{ formatSample({ ...setup, time: 'none' }, look.id) }}
        </button>
      </div>

      <!-- The time: for the day the report is printed, or a chosen date with a time -->
      <template v-if="setup.when === 'printed' || setup.clock">
        <span class="field-label">{{ t("dateElement.panel.timeTitle") }}</span>
        <div class="look-grid is-row" role="radiogroup" :aria-label="t('dateElement.panel.timeTitle')">
          <button
            v-for="time in DATE_TIME_STYLES"
            :key="time"
            type="button"
            role="radio"
            class="look-card"
            :class="{ active: setup.time === time }"
            :aria-checked="setup.time === time"
            @click="setTimeStyle(time)"
          >
            {{ time === "none" ? t("dateElement.panel.noTime") : timeSample(time) }}
          </button>
        </div>
      </template>
    </section>

    <!-- 3. Words before the date -->
    <section class="card">
      <h5 class="step"><span class="step-no" aria-hidden="true">3</span>{{ t("dateElement.panel.beforeTitle") }}</h5>
      <input
        class="before-input"
        type="text"
        maxlength="80"
        :value="setup.before"
        :placeholder="t('dateElement.panel.beforePlaceholder')"
        :aria-label="t('dateElement.panel.beforeTitle')"
        @focus="beforeRecorded = false"
        @input="typeBefore(($event.target as HTMLInputElement).value)"
      />
      <div class="pick-row">
        <button
          v-for="pick in BEFORE_PICKS"
          :key="pick"
          type="button"
          class="chip-btn"
          :class="{ active: setup.before === beforePick(pick) }"
          @click="update({ before: beforePick(pick) })"
        >
          {{ beforePick(pick) }}
        </button>
        <button
          v-if="setup.before"
          type="button"
          class="chip-btn"
          @click="update({ before: '' })"
        >
          {{ t("dateElement.panel.noWords") }}
        </button>
      </div>
      <p class="preview">
        <span class="preview-label">{{ t("dateElement.panel.shows") }}</span>
        <strong>{{ dateText(setup) }}</strong>
      </p>
    </section>

    <!-- Back to plain text, keeping what it shows now -->
    <section class="card">
      <button type="button" class="outline-btn" @click="makePlainText">
        <Type :size="14" aria-hidden="true" />
        {{ t("dateElement.panel.toText") }}
      </button>
      <p class="hint">{{ t("dateElement.panel.toTextHint") }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Type, X } from "@lucide/vue";
import { useReportStore } from "@/stores/report";
import type { TextFieldElement } from "../../../types";
import {
  applyDateSetup,
  BEFORE_PICKS,
  DATE_TIME_STYLES,
  DATE_WHENS,
  dateText,
  dateToPlainText,
  formatSample,
  formatsFor,
  getDateSetup,
  normalizeDateSetup,
  todayIso,
  type DateSetup,
  type DateTimeStyle,
  type DateWhen,
} from "../../../utils/dateElement";

const props = defineProps<{
  element: TextFieldElement;
}>();

const report = useReportStore();
const { t } = useI18n();

const setup = computed(() => getDateSetup(props.element));

// One undo step per change
const update = (patch: Partial<DateSetup>) => {
  const next = normalizeDateSetup({ ...setup.value, ...patch });
  if (JSON.stringify(next) === JSON.stringify(setup.value)) return;
  report.saveStateToHistory();
  applyDateSetup(props.element, next);
  report.updateJrxml();
};

// ── 1. Which date ──

// Another kind of date keeps the look when it has it, else takes the kind's first look
function setWhen(when: DateWhen) {
  update({
    when,
    format: formatsFor(when).some((f) => f.id === setup.value.format) ? setup.value.format : formatsFor(when)[0].id,
    date: when === "fixed" ? setup.value.date ?? todayIso(setup.value.zone) : undefined,
    // A time chosen with a date doesn't carry over to the printed day
    ...(setup.value.when === "fixed" && setup.value.clock ? { time: "none" as const } : {}),
  });
}

// What each kind of date would show now
const whenSample = (when: DateWhen) => {
  const s = normalizeDateSetup({ ...setup.value, when, time: "none", before: "" });
  return formatSample(s, formatsFor(when).some((f) => f.id === setup.value.format) ? setup.value.format : formatsFor(when)[0].id);
};

function setFixedDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) update({ date: value });
}

// A time with the chosen date (empty: no time)
function setClock(value: string) {
  update(value ? { clock: value } : { clock: undefined, time: "none" });
}

// "No time" on a chosen date also removes the time chosen with it
function setTimeStyle(time: DateTimeStyle) {
  if (setup.value.when === "fixed" && time === "none") setClock("");
  else update({ time });
}

// ── 2. How it looks ──

// "10:30" / "10:30 AM": the time part of the date written with it
const timeSample = (time: DateTimeStyle) => {
  const full = dateText({ ...setup.value, time, before: "" });
  const withoutTime = dateText({ ...setup.value, time: "none", before: "" });
  return full.slice(withoutTime.length + 2);
};

// ── 3. Words before ──

// Quick picks in English, like the month names (they are printed in the report)
const beforePick = (pick: (typeof BEFORE_PICKS)[number]) =>
  t(`dateElement.beforePicks.${pick}`, {}, { locale: "en" });

// Typing records one undo step per visit to the field, not one per key
const beforeRecorded = ref(false);
function typeBefore(value: string) {
  if (!beforeRecorded.value) {
    report.saveStateToHistory();
    beforeRecorded.value = true;
  }
  applyDateSetup(props.element, { ...setup.value, before: value });
  report.updateJrxml();
}

// ── Plain text ──

function makePlainText() {
  report.saveStateToHistory();
  dateToPlainText(props.element);
  report.updateJrxml();
}
</script>

<style scoped>
/* Sized for easy reading: 13px text, large click targets (as the page-number panel) */
.date-properties {
  font-size: 13px;
}

.card {
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

.hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--prop-text-secondary);
}

.when-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.when-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.when-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.when-example {
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  color: var(--prop-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.when-card:hover,
.look-card:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.when-card.active,
.look-card.active {
  border-color: var(--prop-primary-color, #6440f4);
  box-shadow: inset 0 0 0 1px var(--prop-primary-color, #6440f4);
  background: #f1edff;
}

.when-card.active .when-name,
.when-card.active .when-example {
  color: var(--prop-primary-color, #6440f4);
}

.look-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.look-grid.is-row {
  grid-template-columns: repeat(3, 1fr);
}

.look-card {
  min-width: 0;
  min-height: 32px;
  padding: 4px 6px;
  overflow: hidden;
  border: 1px solid var(--prop-border-color);
  border-radius: 6px;
  background: #fff;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--prop-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.look-card.active {
  color: var(--prop-primary-color, #6440f4);
  font-weight: 700;
}

.when-card:focus-visible,
.look-card:focus-visible,
.chip-btn:focus-visible,
.outline-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #6440f4);
  outline-offset: 2px;
}

input {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  box-sizing: border-box;
}

input:focus {
  border-color: var(--prop-border-focus, #6440f4);
  outline: none;
}

.fixed-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.fixed-field {
  display: block;
  min-width: 0;
}

.time-wrap {
  position: relative;
  display: block;
}

.time-wrap input {
  padding-right: 32px;
}

.clear-btn {
  position: absolute;
  top: 50%;
  right: 6px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--prop-text-secondary);
  transform: translateY(-50%);
  cursor: pointer;
}

.clear-btn:hover {
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
}

.chosen {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: #f5f3ff;
  font-size: 13px;
  color: var(--prop-text-primary);
  overflow-wrap: anywhere;
}

.pick-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.chip-btn {
  padding: 4px 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 999px;
  background: #fff;
  font-size: 12px;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.chip-btn:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.chip-btn.active {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
}

.preview {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 6px;
  background: #f5f3ff;
  font-size: 13px;
  color: var(--prop-text-primary);
  overflow-wrap: anywhere;
}

.preview-label {
  font-size: 12px;
  color: var(--prop-text-secondary);
}

.outline-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: var(--prop-text-primary);
  cursor: pointer;
}

.outline-btn:hover {
  border-color: var(--prop-primary-color, #6440f4);
  color: var(--prop-primary-color, #6440f4);
}
</style>
