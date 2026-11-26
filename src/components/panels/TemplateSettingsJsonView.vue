<template>
  <div class="ts">
    <div class="ts-header">
      <div class="ts-id" :title="t('templateSettingsJson.templateIdHint')">
        <span>{{ t("templateSettingsJson.templateId") }}</span>
        <code class="ts-id-value">{{ templateId || "—" }}</code>
      </div>
      <span class="ts-note">{{ t("templateSettingsJson.hint") }}</span>
      <n-button type="default" size="small" @click="copyJson">
        <template #icon><Copy :size="13" /></template>
        {{ t("bottomPanel.copy") }}
      </n-button>
    </div>
    <pre class="ts-json">{{ shownJson }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import { Copy } from "@lucide/vue";
import { useReportStore } from "@/stores/report";
import { useFilesStore } from "@/stores/files";
import notification from "@/utils/notification";
import { buildTemplateSettingsValue } from "@/utils/templateSettingsValue";

const props = defineProps<{ active: boolean }>();
const { t } = useI18n();
const route = useRoute();
const reportStore = useReportStore();
const filesStore = useFilesStore();

// The template's id (read only): a server template opened from the Templates
// page uses its own id (the rptadn_TenantReport row's, the same id Duplicate
// and Delete send), else the open template's id
const templateId = computed(() => {
  const serverId = route.params.id;
  return (typeof serverId === "string" && serverId) || filesStore.currentFileId || "";
});

// Built only while the tab is shown
const value = computed(() =>
  props.active
    ? buildTemplateSettingsValue(
        reportStore.reportProperties,
        reportStore.bands,
        templateId.value,
        filesStore.currentFileName,
      )
    : null,
);
const shownJson = computed(() => (value.value ? JSON.stringify(value.value, null, 2) : ""));

async function copyJson() {
  try {
    await navigator.clipboard.writeText(shownJson.value);
    notification.success(t("templateSettingsJson.copied"));
  } catch {
    notification.error(t("bottomPanel.copyFailed"));
  }
}
</script>

<style scoped>
.ts {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-size: 12px;
  color: #1c1b26;
}

.ts-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid #e6e5ee;
}

.ts-id {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #5b5a6b;
  white-space: nowrap;
}

.ts-id-value {
  padding: 3px 8px;
  border-radius: 6px;
  background: #f6f5fb;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: #1c1b26;
  user-select: all;
}

.ts-note {
  flex: 1;
  min-width: 160px;
  color: #5b5a6b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.ts-json {
  flex: 1;
  margin: 0;
  padding: 12px;
  overflow: auto;
  line-height: 1.5;
}
</style>
