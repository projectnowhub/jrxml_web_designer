<template>
  <!-- Preview a report (Reports page): what it asks for (its run parameters
       and, when it has several, which of its templates), then Run. A PDF is
       shown here; any other file (a spreadsheet…) is downloaded. -->
  <BaseModal
    :visible="visible"
    :title="t('reportCatalog.run.title', { name: report?.name || report?.code || '' })"
    :show-footer="true"
    :content-style="{ width: result?.isPdf ? 'min(1100px, 96vw)' : 'min(560px, 94vw)', overflow: 'visible' }"
    :body-style="{ overflow: result?.isPdf ? 'hidden' : 'visible' }"
    @update:visible="close"
  >
    <iframe v-if="result?.isPdf" class="pdf-frame" :src="result.url" :title="result.fileName" />

    <div v-else-if="detail.isPending.value" class="loading" aria-hidden="true">
      <SkeletonBlock v-for="n in 3" :key="n" class="skeleton" />
    </div>

    <div v-else-if="detail.isError.value" class="load-failed" role="alert">
      <span>{{ t("reportCatalog.run.loadFailed") }}</span>
      <button type="button" @click="detail.refetch()">{{ t("myTemplates.tryAgain") }}</button>
    </div>

    <form v-else class="run-form" @submit.prevent="run">
      <label v-if="templates.length > 1" class="field">
        <span class="label">{{ t("reportCatalog.run.template") }}</span>
        <select v-model="templateCode">
          <option v-for="template in templates" :key="template.code" :value="template.code">
            {{ template.code }}{{ template.outputType ? ` (${template.outputType})` : "" }}
          </option>
        </select>
      </label>

      <p v-if="!parameters.length" class="none">{{ t("reportCatalog.run.noParameters") }}</p>

      <div v-for="parameter in parameters" :key="parameter.alias" class="field">
        <span class="label">
          {{ parameter.name || parameter.alias }} <em v-if="parameter.required">*</em>
        </span>
        <HeaderProjectPicker
          v-if="isProjectParameter(parameter)"
          class="project-picker"
          :projects="projectValues[parameter.alias] ?? []"
          @update-projects="projectValues[parameter.alias] = $event"
        />
        <label v-else-if="parameter.type === 'BOOLEAN'" class="check">
          <input
            type="checkbox"
            :checked="values[parameter.alias] === 'true'"
            @change="values[parameter.alias] = String(($event.target as HTMLInputElement).checked)"
          />
          {{ values[parameter.alias] === "true" ? t("reportCatalog.run.yes") : t("reportCatalog.run.no") }}
        </label>
        <input
          v-else
          v-model="values[parameter.alias]"
          :type="inputType(parameter)"
          :placeholder="placeholder(parameter)"
          spellcheck="false"
        />
      </div>

      <p v-if="result && !result.isPdf" class="downloaded">
        <Download :size="15" aria-hidden="true" />
        {{ t("reportCatalog.run.downloadedHere", { name: result.fileName }) }}
        <a :href="result.url" :download="result.fileName">{{ t("reportCatalog.run.downloadAgain") }}</a>
      </p>

      <button type="submit" hidden />
    </form>

    <template #footer>
      <template v-if="result?.isPdf">
        <button type="button" class="secondary" @click="clearResult">
          <ArrowLeft :size="15" aria-hidden="true" />
          {{ t("reportCatalog.run.change") }}
        </button>
        <a class="secondary" :href="result.url" :download="result.fileName">
          <Download :size="15" aria-hidden="true" />
          {{ t("reportCatalog.run.download") }}
        </a>
      </template>
      <template v-else>
        <button type="button" class="secondary" @click="close">{{ t("common.cancel") }}</button>
        <button type="button" class="primary" :disabled="running || !detail.isSuccess.value" @click="run">
          <Loader2 v-if="running" class="spin" :size="15" aria-hidden="true" />
          <Play v-else :size="15" aria-hidden="true" />
          {{ running ? t("reportCatalog.run.running") : t("reportCatalog.run.run") }}
        </button>
      </template>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";
import { ArrowLeft, Download, Loader2, Play } from "@lucide/vue";
import BaseModal from "@/components/modals/BaseModal.vue";
import HeaderProjectPicker from "@/components/designer/HeaderProjectPicker.vue";
import SkeletonBlock from "@/components/common/SkeletonBlock.vue";
import { reportDetailQuery } from "@/queries/reportCatalogQueries";
import { postRunReport } from "@/services/reportCatalogService";
import { reportServerErrorText } from "@/services/helpers/reportCatalogMappers";
import { DEFAULT_REPORT_TEMPLATE_CODE } from "@/constants/reportCatalogConstants";
import { Entity } from "@/enums/entityName";
import { lastProject } from "@/utils/lastProject";
import notification from "@/utils/notification";
import type { ReportProject } from "@/types/dataSource";
import type { JmixReportInfo, JmixReportParameterInfo, JmixReportRunParameter } from "@/types/reportCatalog";

const props = defineProps<{ visible: boolean; report: JmixReportInfo | null }>();
const emit = defineEmits<{ "update:visible": [visible: boolean] }>();

const { t } = useI18n();

const detail = useQuery(computed(() => reportDetailQuery(props.report?.id ?? "", props.visible)));
const templates = computed(() => (detail.data.value?.templates ?? []).filter((template) => !!template.code));
const parameters = computed(() => (detail.data.value?.inputParameters ?? []).filter((parameter) => !parameter.hidden));

const templateCode = ref("");
const values = reactive<Record<string, string>>({});
const projectValues = reactive<Record<string, ReportProject[]>>({});
const running = ref(false);
const result = ref<{ url: string; fileName: string; isPdf: boolean } | null>(null);

const isProjectParameter = (parameter: JmixReportParameterInfo) =>
  parameter.type === "ENTITY" && parameter.entityMetaClass === Entity.PROJECT;
const inputType = (parameter: JmixReportParameterInfo) =>
  parameter.type === "DATE" ? "date" : parameter.type === "NUMERIC" ? "number" : "text";
const placeholder = (parameter: JmixReportParameterInfo) =>
  parameter.type === "ENTITY"
    ? t("reportCatalog.run.idPlaceholder")
    : parameter.type === "ENTITY_LIST"
      ? t("reportCatalog.run.listPlaceholder")
      : "";

// The form, filled from the report's defaults (a project parameter: the
// project chosen last)
function fillForm(report: JmixReportInfo) {
  const list = (report.templates ?? []).filter((template) => !!template.code);
  templateCode.value = (list.find((template) => template.isDefault) ?? list[0])?.code ?? DEFAULT_REPORT_TEMPLATE_CODE;
  for (const key of Object.keys(values)) delete values[key];
  for (const key of Object.keys(projectValues)) delete projectValues[key];
  for (const parameter of report.inputParameters ?? []) {
    if (isProjectParameter(parameter)) {
      const remembered = lastProject();
      projectValues[parameter.alias] = parameter.defaultValue
        ? [{ id: parameter.defaultValue, name: parameter.defaultValue }]
        : remembered
          ? [remembered]
          : [];
    } else {
      values[parameter.alias] = parameter.defaultValue ?? (parameter.type === "BOOLEAN" ? "false" : "");
    }
  }
}
watch(
  () => [props.visible, detail.data.value] as const,
  ([open, report]) => {
    if (open && report) fillForm(report);
  },
  { immediate: true },
);

function clearResult() {
  if (result.value) URL.revokeObjectURL(result.value.url);
  result.value = null;
}

function close() {
  if (running.value) return;
  clearResult();
  emit("update:visible", false);
}
onBeforeUnmount(clearResult);

// The run's parameters: every value given; a missing required one stops the run
function runParameters(): JmixReportRunParameter[] | null {
  const list: JmixReportRunParameter[] = [];
  for (const parameter of parameters.value) {
    const label = parameter.name || parameter.alias;
    if (isProjectParameter(parameter)) {
      const id = projectValues[parameter.alias]?.[0]?.id;
      if (id) list.push({ name: parameter.alias, value: id });
      else if (parameter.required) return missing(label);
      continue;
    }
    const value = (values[parameter.alias] ?? "").trim();
    if (!value) {
      if (parameter.required) return missing(label);
      continue;
    }
    if (parameter.type === "ENTITY_LIST") {
      list.push({ name: parameter.alias, values: value.split(",").map((id) => id.trim()).filter(Boolean) });
    } else {
      list.push({ name: parameter.alias, value });
    }
  }
  return list;
}
function missing(label: string): null {
  notification.warning(t("reportCatalog.run.requiredMissing", { name: label }));
  return null;
}

async function run() {
  const report = props.report;
  if (!report || running.value) return;
  const parameterList = runParameters();
  if (!parameterList) return;
  running.value = true;
  try {
    const output = await postRunReport(
      report.id,
      { template: templateCode.value || undefined, attachment: false, parameters: parameterList },
      `${report.name || report.code || "report"}`,
    );
    clearResult();
    const isPdf = output.contentType.includes("pdf");
    result.value = { url: URL.createObjectURL(output.file), fileName: output.fileName, isPdf };
    if (!isPdf) {
      // Anything but a PDF can't be shown here: it is downloaded
      const link = document.createElement("a");
      link.href = result.value.url;
      link.download = output.fileName;
      link.click();
      notification.success(t("reportCatalog.run.downloaded", { name: output.fileName }));
    }
  } catch (error) {
    const reason = await reportServerErrorText(error, t("reportCatalog.errors.server"));
    notification.error(t("reportCatalog.run.failed", { reason }));
  } finally {
    running.value = false;
  }
}
</script>

<style scoped>
.pdf-frame {
  display: block;
  width: 100%;
  height: min(74vh, 900px);
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #f4f3f8;
}
.loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton {
  height: 34px;
}
.load-failed {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(229, 72, 77, 0.3);
  border-radius: 10px;
  background: rgba(229, 72, 77, 0.06);
  color: #b4262b;
  font-size: 12.5px;
}
.load-failed button {
  padding: 6px 12px;
  border: 0;
  border-radius: 8px;
  background: #6440f4;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.run-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.none {
  margin: 0;
  color: #6e6a80;
  font-size: 12.5px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.label {
  color: #45425a;
  font-size: 12px;
  font-weight: 600;
}
.label em {
  color: #e5484d;
  font-style: normal;
}
input:not([type="checkbox"]),
select {
  height: 34px;
  padding: 0 10px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #1c1b26;
  font: inherit;
  font-size: 13px;
}
input:focus-visible,
select:focus-visible {
  border-color: #6440f4;
  outline: none;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.12);
}
.check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #1c1b26;
  font-size: 13px;
}
.project-picker {
  width: 100%;
  flex: none;
}
.project-picker :deep(.hpp-field) {
  min-height: 34px;
  border-color: #e6e5ee;
  border-radius: 8px;
}
.downloaded {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #16936a;
  font-size: 12.5px;
}
.downloaded a {
  color: #6440f4;
  font-weight: 600;
}
.primary,
.secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
}
.primary {
  border: 0;
  background: #6440f4;
  color: #ffffff;
}
.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.secondary {
  border: 1px solid #e6e5ee;
  background: #ffffff;
  color: #45425a;
}
.spin {
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spin {
    animation: none;
  }
}
</style>
