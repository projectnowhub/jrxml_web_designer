<template>
  <!-- A project detail linked to the template's project: which detail, what it
       shows for the current project, and a way back to plain text -->
  <div class="project-value-properties">
    <section class="card">
      <h5 class="card-title">
        <Link2 :size="14" aria-hidden="true" />{{ t("projectValue.panel.title") }}<SettingHelpButton id="projectValue" />
      </h5>
      <SettingHelpText id="projectValue" />
      <p class="lead">{{ t("projectValue.panel.shows", { detail: link?.label ?? "" }) }}</p>
      <p class="preview">
        <span class="preview-label">{{ projectName ? t("projectValue.panel.forProject", { project: projectName }) : t("projectValue.panel.noProject") }}</span>
        <strong v-if="link && linkShownText(link)">{{ linkShownText(link) }}</strong>
        <em v-else class="empty">{{ t("projectValue.panel.noValue") }}</em>
      </p>
      <p class="hint">{{ t("projectValue.panel.follows") }}</p>
    </section>

    <!-- A start / finish date: how it looks and words before it, like the Date element -->
    <template v-if="link && isProjectDateKey(link.key)">
      <section class="card">
        <h5 class="card-title">{{ t("projectValue.panel.lookTitle") }}<SettingHelpButton id="projectDateLook" /></h5>
        <SettingHelpText id="projectDateLook" />
        <div class="look-grid" role="radiogroup" :aria-label="t('projectValue.panel.lookTitle')">
          <button
            v-for="look in DAY_FORMATS"
            :key="look.id"
            type="button"
            role="radio"
            class="look-card"
            :class="{ active: currentFormat === look.id }"
            :aria-checked="currentFormat === look.id"
            @click="setFormat(look.id)"
          >
            {{ formatIsoDay(sampleDay, look.id) }}
          </button>
        </div>
      </section>

      <section class="card">
        <h5 class="card-title">{{ t("projectValue.panel.beforeTitle") }}<SettingHelpButton id="projectDateBefore" /></h5>
        <SettingHelpText id="projectDateBefore" />
        <input
          class="before-input"
          type="text"
          maxlength="80"
          :value="link.before ?? ''"
          :placeholder="t('projectValue.panel.beforePlaceholder')"
          :aria-label="t('projectValue.panel.beforeTitle')"
          @focus="beforeRecorded = false"
          @input="typeBefore(($event.target as HTMLInputElement).value)"
        />
        <div class="pick-row">
          <button
            type="button"
            class="chip-btn"
            :class="{ active: link.before === labelPick }"
            @click="setBefore(labelPick)"
          >
            {{ labelPick }}
          </button>
          <button v-if="link.before" type="button" class="chip-btn" @click="setBefore('')">
            {{ t("projectValue.panel.noWords") }}
          </button>
        </div>
      </section>
    </template>

    <!-- Back to plain text, keeping what it shows now -->
    <section class="card">
      <button type="button" class="outline-btn" @click="makePlainText">
        <Type :size="14" aria-hidden="true" />
        {{ t("projectValue.panel.toText") }}
      </button>
      <p class="hint">{{ t("projectValue.panel.toTextHint") }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import SettingHelpButton from "../../help/SettingHelpButton.vue";
import SettingHelpText from "../../help/SettingHelpText.vue";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Link2, Type } from "@lucide/vue";
import { useReportStore } from "@/stores/report";
import type { TextFieldElement } from "../../../types";
import {
  getProjectValueLink,
  isProjectDateKey,
  linkShownText,
  PROJECT_DATE_FORMAT,
  projectValueOf,
  setProjectValueLink,
  unlinkProjectValue,
  type ProjectValueLink,
} from "../../../utils/projectValue";
import { DAY_FORMATS, formatIsoDay, todayIso } from "../../../utils/dateElement";
import { cachedProjectDetails } from "@/queries/projectQueries";

const props = defineProps<{
  element: TextFieldElement;
}>();

const { t } = useI18n();
const report = useReportStore();

const link = computed(() => getProjectValueLink(props.element));
const projectName = computed(() => report.reportProperties?.projects?.[0]?.name ?? "");

// ── A start / finish date ──

const projectDetails = computed(() => cachedProjectDetails(report.reportProperties?.projects?.[0]?.id));
const currentFormat = computed(() => link.value?.format ?? PROJECT_DATE_FORMAT);
// The looks are shown with the project's own date (today's when it has none)
const sampleDay = computed(() => (link.value && projectDetails.value?.dates?.[link.value.key]) || todayIso());
// A quick pick: the detail's name ("Start Date:")
const labelPick = computed(() => `${link.value?.label ?? ""}:`);

// The link changed, its value written in its look at once (one undo step by the caller)
function writeLink(next: ProjectValueLink) {
  const value = projectValueOf(projectDetails.value, next.key, next.format) ?? next.value;
  const { before, format, ...rest } = next;
  setProjectValueLink(props.element, {
    ...rest,
    value,
    ...(format && format !== PROJECT_DATE_FORMAT ? { format } : {}),
    ...(before?.trim() ? { before } : {}),
  });
}

function setFormat(format: string) {
  if (!link.value || format === currentFormat.value) return;
  report.saveStateToHistory();
  writeLink({ ...link.value, format });
  report.updateJrxml();
}

function setBefore(before: string) {
  if (!link.value || (link.value.before ?? "") === before) return;
  report.saveStateToHistory();
  writeLink({ ...link.value, before });
  report.updateJrxml();
}

// Typing records one undo step per visit to the field, not one per key
const beforeRecorded = ref(false);
function typeBefore(value: string) {
  if (!link.value) return;
  if (!beforeRecorded.value) {
    report.saveStateToHistory();
    beforeRecorded.value = true;
  }
  writeLink({ ...link.value, before: value });
  report.updateJrxml();
}

// "Type my own text instead": plain text with what it shows now (one undo step)
function makePlainText() {
  report.saveStateToHistory();
  unlinkProjectValue(props.element);
  report.updateJrxml();
}
</script>

<style scoped>
/* Sized for easy reading, as the date panel */
.project-value-properties {
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

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--prop-text-primary);
}

.lead {
  margin: 0;
  color: var(--prop-text-primary);
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
  white-space: pre-line;
}

.preview-label {
  font-size: 12px;
  color: var(--prop-text-secondary);
}

.empty {
  font-style: normal;
  color: var(--prop-text-secondary);
}

.hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--prop-text-secondary);
}

.look-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
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

.look-card:hover,
.chip-btn:hover {
  border-color: var(--prop-border-hover, #9ca3af);
}

.look-card.active {
  border-color: var(--prop-primary-color, #6440f4);
  box-shadow: inset 0 0 0 1px var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
  font-weight: 700;
}

.look-card:focus-visible,
.chip-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #6440f4);
  outline-offset: 2px;
}

.before-input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--prop-border-color);
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: var(--prop-text-primary);
  box-sizing: border-box;
}

.before-input:focus {
  outline: none;
  border-color: var(--prop-border-focus, #6440f4);
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

.chip-btn.active {
  border-color: var(--prop-primary-color, #6440f4);
  background: #f1edff;
  color: var(--prop-primary-color, #6440f4);
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

.outline-btn:focus-visible {
  outline: 2px solid var(--prop-border-focus, #6440f4);
  outline-offset: 2px;
}
</style>
