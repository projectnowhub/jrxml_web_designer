<template>
  <!-- Create template (Templates page): project, template name, template
       code; the type is always CREATED_REPORT_TYPE (HTML). Create records the
       request and opens the new template in the designer with that name and
       project. With `source` it clones that default template instead: the
       same fields, the name starting as "<name> (copy)" -->
  <BaseModal
    :visible="visible"
    :title="source ? t('reportCatalog.clone.title') : t('reportCatalog.create.title')"
    :show-footer="true"
    :content-style="{ width: 'min(620px, 94vw)', overflow: 'visible' }"
    :body-style="{ overflow: 'visible' }"
    @update:visible="close"
  >
    <form class="create-form" @submit.prevent="submit">
      <p class="intro">
        {{ source ? t("reportCatalog.clone.intro", { name: source.name }) : t("reportCatalog.create.intro") }}
      </p>

      <div class="field">
        <span class="label">{{ t("reportCatalog.create.project") }} <em>*</em></span>
        <HeaderProjectPicker class="project-picker" :projects="projects" @update-projects="projects = $event" />
      </div>

      <label class="field">
        <span class="label">{{ t("reportCatalog.create.templateName") }} <em>*</em></span>
        <input v-model="name" type="text" maxlength="255" :placeholder="t('reportCatalog.create.templateNamePlaceholder')" />
      </label>

      <label class="field">
        <span class="label">{{ t("reportCatalog.create.templateCode") }} <em>*</em></span>
        <input v-model="code" type="text" maxlength="255" spellcheck="false" @input="codeTouched = true" />
        <small :class="{ bad: code && !codeIsValid }">{{ t("reportCatalog.create.templateCodeHint") }}</small>
      </label>

      <!-- Enter in a field sends the form -->
      <button type="submit" hidden />
    </form>

    <template #footer>
      <button type="button" class="secondary" @click="close">{{ t("common.cancel") }}</button>
      <button type="button" class="primary" :disabled="!canSubmit || creating" @click="submit">
        <Loader2 v-if="creating" class="spin" :size="15" aria-hidden="true" />
        <Copy v-else-if="source" :size="15" aria-hidden="true" />
        <template v-if="source">{{ creating ? t("reportCatalog.clone.cloning") : t("reportCatalog.clone.submit") }}</template>
        <template v-else>{{ creating ? t("reportCatalog.create.creating") : t("reportCatalog.create.submit") }}</template>
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useQueries } from "@tanstack/vue-query";
import { Copy, Loader2 } from "@lucide/vue";
import BaseModal from "@/components/modals/BaseModal.vue";
import HeaderProjectPicker from "@/components/designer/HeaderProjectPicker.vue";
import { projectQuery } from "@/queries/projectQueries";
import { postCreateTemplate } from "@/services/reportCatalogService";
import { reportServerErrorText } from "@/services/helpers/reportCatalogMappers";
import { CREATED_REPORT_TYPE } from "@/constants/reportCatalogConstants";
import { lastProject, rememberLastProject } from "@/utils/lastProject";
import notification from "@/utils/notification";
import type { ReportProject } from "@/types/dataSource";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    // A default template to clone (else a new, empty template is created)
    source?: { id: string; name: string } | null;
    // Clone: open the designer with the copy (Templates page), or only say
    // `cloned` (the designer, which already shows that default)
    navigate?: boolean;
  }>(),
  { source: null, navigate: true },
);
const emit = defineEmits<{
  "update:visible": [visible: boolean];
  cloned: [clone: { name: string; project: ReportProject }];
}>();

const { t } = useI18n();
const router = useRouter();

const projects = ref<ReportProject[]>([]);
const name = ref("");
const code = ref("");
const codeTouched = ref(false);
const creating = ref(false);

// The project's code (its Project ID), sent with it; read from the cached project list
const projectId = computed(() => projects.value[0]?.id ?? "");
const projectDetails = useQueries({ queries: computed(() => projects.value.map((p) => projectQuery(p.id))) });
const projectCode = computed(() => projectDetails.value[0]?.data?.projectId ?? "");

// The template code follows the name until it is typed in
const toCode = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
watch(name, (value) => {
  if (!codeTouched.value) code.value = toCode(value);
});

const codeIsValid = computed(() => /^[A-Za-z0-9_-]+$/.test(code.value));
const canSubmit = computed(
  () => !!projectId.value && !!name.value.trim() && codeIsValid.value,
);

// Each opening starts afresh, with the project chosen last
watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    const remembered = lastProject();
    projects.value = remembered ? [remembered] : [];
    name.value = props.source ? t("reportCatalog.clone.defaultName", { name: props.source.name }) : "";
    codeTouched.value = false;
    code.value = toCode(name.value);
    creating.value = false;
  },
  { immediate: true },
);

function close() {
  if (creating.value) return;
  emit("update:visible", false);
}

async function submit() {
  if (!canSubmit.value || creating.value) return;
  creating.value = true;
  try {
    const project = projects.value[0]!;
    await postCreateTemplate({
      name: name.value.trim(),
      code: code.value,
      // Not asked in the popup: every report is made as this type for now
      reportType: CREATED_REPORT_TYPE,
      projectId: projectId.value,
      projectName: projects.value[0]?.name ?? "",
      ...(projectCode.value ? { projectCode: projectCode.value } : {}),
    });
    // The new template starts with this project and name
    rememberLastProject(project);
    creating.value = false;
    emit("update:visible", false);
    const chosenName = name.value.trim();
    if (!props.source) router.push({ name: "designer", query: { name: chosenName } });
    else if (props.navigate) router.push({ name: "designer", query: { defaultTemplate: props.source.id, clone: chosenName } });
    else emit("cloned", { name: chosenName, project });
  } catch (error) {
    creating.value = false;
    const reason = await reportServerErrorText(error, t("reportCatalog.errors.server"));
    notification.error(t(props.source ? "reportCatalog.clone.failed" : "reportCatalog.create.failed", { reason }));
  }
}
</script>

<style scoped>
.create-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.intro {
  margin: 0;
  color: #6e6a80;
  font-size: 12.5px;
  line-height: 1.5;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
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
input {
  height: 34px;
  padding: 0 10px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #1c1b26;
  font: inherit;
  font-size: 13px;
}
input:focus-visible {
  border-color: #6440f4;
  outline: none;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.12);
}
small {
  color: #8a84a3;
  font-size: 11px;
}
small.bad {
  color: #e5484d;
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
.primary,
.secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
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
