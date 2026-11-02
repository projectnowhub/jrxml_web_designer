<template>
  <!-- File → Open: a template saved here (the same list as the home page), or
       a .jrxml file from the computer, which is added to that list -->
  <BaseModal
    :visible="visible"
    :title="t('openTemplate.title')"
    :show-footer="false"
    :content-style="{ width: 'min(560px, calc(100vw - 32px))' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="open-tabs" role="tablist">
      <button
        v-for="item in TABS"
        :key="item"
        type="button"
        role="tab"
        class="open-tab"
        :class="{ active: tab === item }"
        :aria-selected="tab === item"
        @click="tab = item"
      >
        <component :is="item === 'mine' ? LayoutTemplate : HardDrive" :size="15" aria-hidden="true" />
        {{ t(`openTemplate.tabs.${item}`) }}
      </button>
    </div>

    <div v-if="tab === 'mine'" class="tab-body">
      <label class="open-search">
        <Search :size="15" :stroke-width="2.25" aria-hidden="true" />
        <input ref="searchRef" v-model="query" type="search" :placeholder="t('layout.searchTemplates')" />
      </label>
      <ul v-if="shown.length" class="template-rows">
        <li v-for="file in shown" :key="file.id">
          <button
            type="button"
            class="template-row"
            :class="{ current: file.id === currentFileId }"
            :disabled="file.id === currentFileId"
            @click="choose(file)"
          >
            <FileText :size="18" class="row-icon" aria-hidden="true" />
            <span class="row-text">
              <strong>{{ file.name }}</strong>
              <small>{{ editedText(file) }}</small>
            </span>
            <span v-if="file.id === currentFileId" class="row-tag">{{ t("openTemplate.openNow") }}</span>
          </button>
        </li>
      </ul>
      <p v-else class="empty">
        {{ query.trim() ? t("myTemplates.noMatch", { query: query.trim() }) : t("openTemplate.none") }}
      </p>
      <button type="button" class="see-all" @click="openFullPage">
        <Maximize2 :size="14" :stroke-width="2.25" aria-hidden="true" />
        {{ t("openTemplate.seeAll") }}
      </button>
    </div>

    <div v-else class="tab-body">
      <div
        class="drop-zone"
        :class="{ over: dragOver }"
        role="button"
        tabindex="0"
        @click="pickFile"
        @keydown.enter="pickFile"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <Upload :size="26" :stroke-width="2" aria-hidden="true" />
        <strong>{{ t("openTemplate.dropTitle") }}</strong>
        <span>{{ t("openTemplate.dropHint") }}</span>
      </div>
      <p class="note">{{ t("openTemplate.addedNote") }}</p>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { FileText, HardDrive, LayoutTemplate, Maximize2, Search, Upload } from "@lucide/vue";
import { useRouter } from "vue-router";
import BaseModal from "./BaseModal.vue";
import notification from "@/utils/notification";
import { useTemplates } from "@/composables/useTemplates";
import { useFilesStore } from "@/stores/files";
import type { DesignerFile } from "@/types/designerFile";
import { useQuery } from "@tanstack/vue-query";
import type { TemplateSummary } from "@/types/template";
import { fetchTemplate, templateListQuery } from "@/queries/templateQueries";

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "load-file", file: DesignerFile): void;
  (e: "open-jrxml", file: { name: string; content: string }): void;
}>();

const { t } = useI18n();
const { editedText } = useTemplates();
const { currentFileId } = storeToRefs(useFilesStore());

const TABS = ["mine", "computer"] as const;
const tab = ref<(typeof TABS)[number]>("mine");
const query = ref("");
const dragOver = ref(false);
const searchRef = ref<HTMLInputElement | null>(null);
// The first 25 that match, last edited first; See all shows the rest
const shownQuery = useQuery(
  computed(() => ({ ...templateListQuery({ q: query.value, size: 25 }), enabled: props.visible })),
);
const shown = computed<TemplateSummary[]>(() => shownQuery.data.value?.items ?? []);

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    query.value = "";
    dragOver.value = false;
    tab.value = "mine";
    nextTick(() => searchRef.value?.focus());
  },
);

const close = () => emit("update:visible", false);

// The whole list as a page (My Templates); the designer saves on leaving
const router = useRouter();
function openFullPage() {
  close();
  const q = query.value.trim();
  router.push({ name: "mytemplates", query: q ? { q } : {} });
}

async function choose(file: TemplateSummary) {
  const whole = await fetchTemplate(file.id);
  close();
  if (whole) emit("load-file", whole);
  else notification.error(t("openTemplate.notFound"));
}

// Only JRXML templates (what Download saves)
function readFile(file: File | undefined) {
  if (!file) return;
  if (!/\.jrxml$/i.test(file.name)) {
    notification.error(t("fileManager.onlyJrxml"));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    close();
    emit("open-jrxml", { name: file.name, content: String(reader.result ?? "") });
  };
  reader.readAsText(file);
}

function pickFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".jrxml";
  input.onchange = () => readFile(input.files?.[0]);
  input.click();
}

function onDrop(event: DragEvent) {
  dragOver.value = false;
  readFile(event.dataTransfer?.files?.[0]);
}
</script>

<style scoped>
.open-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 14px;
  border-radius: 10px;
  background: #f4f3f8;
}
.open-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: #6e6a80;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.open-tab.active {
  background: #ffffff;
  color: #6440f4;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.1);
}
.tab-body {
  min-height: 300px;
}
.open-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  margin-bottom: 10px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  color: #8a84a3;
}
.open-search:focus-within {
  border-color: #6440f4;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.12);
}
.open-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: none;
  background: none;
  color: #1c1b26;
  font-size: 13px;
}
.template-rows {
  max-height: 300px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.template-row {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  text-align: left;
  cursor: pointer;
}
.template-row:hover:not(:disabled),
.template-row:focus-visible {
  background: rgba(124, 92, 247, 0.08);
  outline: none;
}
.template-row.current {
  cursor: default;
}
.row-icon {
  flex-shrink: 0;
  color: #6440f4;
}
.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.row-text strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 600;
}
.row-text small {
  color: #8a84a3;
  font-size: 11px;
}
.row-tag {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(100, 64, 244, 0.1);
  color: #6440f4;
  font-size: 10.5px;
  font-weight: 600;
}
.see-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  margin-top: 10px;
  padding: 9px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #6440f4;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.see-all:hover {
  border-color: #6440f4;
  background: rgba(124, 92, 247, 0.06);
}
.empty {
  padding: 40px 0;
  color: #8a84a3;
  font-size: 12.5px;
  text-align: center;
}
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 220px;
  padding: 20px;
  border: 1.5px dashed #cfc8f5;
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.04);
  color: #6440f4;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.drop-zone:hover,
.drop-zone.over,
.drop-zone:focus-visible {
  border-color: #6440f4;
  background: rgba(124, 92, 247, 0.09);
  outline: none;
}
.drop-zone strong {
  color: #1c1b26;
  font-size: 13px;
}
.drop-zone span,
.note {
  color: #8a84a3;
  font-size: 11.5px;
}
.note {
  margin: 12px 0 0;
}
</style>
