<template>
  <BaseModal
    :visible="visible"
    :title="t(kind === 'cover' ? 'pageDesigns.chooseCover' : 'pageDesigns.chooseContents')"
    :show-footer="false"
    content-class="design-chooser"
    @update:visible="emit('update:visible', $event)"
  >
    <p class="chooser-hint">{{ t("pageDesigns.chooseHint") }}</p>
    <!-- Cover: edge to edge, or inside the report's margins -->
    <label v-if="kind === 'cover'" class="sheet-option">
      <input type="checkbox" :checked="sheet" @change="emit('update:sheet', ($event.target as HTMLInputElement).checked)" />
      <span>
        <strong>{{ t("pageDesigns.wholeSheet") }}</strong>
        <small>{{ t("pageDesigns.wholeSheetHint") }}</small>
      </span>
    </label>
    <div class="design-grid" role="list">
      <button type="button" class="design-card" role="listitem" @click="emit('choose', 'blank')">
        <span class="design-preview is-blank" :style="{ width: `${THUMB}px`, height: `${thumbHeight}px` }">
          <FilePlus :size="22" aria-hidden="true" />
        </span>
        <span class="design-name">{{ t("pageDesigns.blank") }}</span>
        <span class="design-desc">{{ t("pageDesigns.blankDesc") }}</span>
      </button>
      <button
        v-for="design in designs"
        :key="design.id"
        type="button"
        class="design-card"
        role="listitem"
        @click="emit('choose', design.id)"
      >
        <span class="design-preview">
          <DesignThumbnail :elements="design.elements" :page-width="pageWidth" :page-height="pageHeight" :width="THUMB" />
        </span>
        <span class="design-name">{{ t(`pageDesigns.designs.${design.id}.name`) }}</span>
        <span class="design-desc">{{ t(`pageDesigns.designs.${design.id}.desc`) }}</span>
      </button>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { FilePlus } from "@lucide/vue";
import BaseModal from "./BaseModal.vue";
import DesignThumbnail from "../common/DesignThumbnail.vue";
import type { DesignElement } from "@/types";

const props = defineProps<{
  visible: boolean;
  kind: "cover" | "contents";
  designs: { id: string; elements: DesignElement[] }[];
  // Cover: designs fill the whole sheet
  sheet?: boolean;
  // The printable area the designs are made for
  pageWidth: number;
  pageHeight: number;
}>();

const emit = defineEmits<{
  "update:visible": [value: boolean];
  "update:sheet": [value: boolean];
  choose: [id: string];
}>();

const { t } = useI18n();
const THUMB = 132;
const thumbHeight = computed(() => Math.round((props.pageHeight / props.pageWidth) * THUMB));
</script>

<style scoped>
.chooser-hint {
  margin: 0 0 14px;
  font-size: 13px;
  color: #4b5563;
}

.sheet-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: -4px 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f5f3ff;
  cursor: pointer;
}

.sheet-option input {
  width: 16px;
  height: 16px;
  margin: 2px 0 0;
  accent-color: #7c3aed;
}

.sheet-option span {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  color: #1f2937;
}

.sheet-option small {
  font-size: 12px;
  color: #6b7280;
}

.design-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
  gap: 14px;
}

.design-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.design-card:hover,
.design-card:focus-visible {
  outline: none;
  border-color: #6440f4;
  box-shadow: 0 0 0 3px rgba(100, 64, 244, 0.15);
}

.design-preview {
  display: block;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.design-preview.is-blank {
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: dashed;
  color: #9ca3af;
  box-shadow: none;
}

.design-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
}

.design-desc {
  font-size: 11px;
  line-height: 1.35;
  color: #6b7280;
}
</style>

<style>
.modal-content.design-chooser {
  width: min(820px, 94vw);
  max-height: 88vh;
}

.modal-content.design-chooser .modal-body {
  overflow-y: auto;
}
</style>
