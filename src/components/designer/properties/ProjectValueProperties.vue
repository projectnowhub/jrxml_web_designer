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
        <strong v-if="link?.value">{{ link.value }}</strong>
        <em v-else class="empty">{{ t("projectValue.panel.noValue") }}</em>
      </p>
      <p class="hint">{{ t("projectValue.panel.follows") }}</p>
    </section>

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
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Link2, Type } from "@lucide/vue";
import { useReportStore } from "@/stores/report";
import type { TextFieldElement } from "../../../types";
import { getProjectValueLink, unlinkProjectValue } from "../../../utils/projectValue";

const props = defineProps<{
  element: TextFieldElement;
}>();

const { t } = useI18n();
const report = useReportStore();

const link = computed(() => getProjectValueLink(props.element));
const projectName = computed(() => report.reportProperties?.projects?.[0]?.name ?? "");

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
