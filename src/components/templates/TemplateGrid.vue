<template>
  <!-- Template cards (home page, My Templates grid): a click opens the
       template in the designer; ⋯ opens its menu (TemplateMenu) -->
  <div class="template-grid">
    <article
      v-if="showNew"
      class="template-card new-card"
      data-help="create-report"
      role="button"
      tabindex="0"
      @click="newTemplate"
      @keydown.enter="newTemplate"
    >
      <div class="new-icon"><Plus :size="22" /></div>
      <strong>{{ t("home.createNewTemplate") }}</strong
      ><span>{{ t("home.createNewTemplateHint") }}</span>
    </article>
    <article
      v-for="(template, index) in templates"
      :key="template.id"
      class="template-card"
      role="button"
      tabindex="0"
      @click="openTemplate(template)"
      @keydown.enter.self="openTemplate(template)"
    >
      <div class="template-preview" :class="TONES[index % TONES.length]">
        <div class="preview-lines"><i /><i /><i /><i /></div>
        <div class="preview-chart"><b /><b /><b /><b /><b /></div>
      </div>
      <div class="template-info">
        <div class="template-title">
          <strong>{{ template.name }}</strong>
          <button
            type="button"
            class="more-button"
            data-template-menu
            :data-help="index === 0 ? 'template-actions' : undefined"
            :class="{ open: menuRef?.openId === template.id }"
            :aria-label="t('home.moreOptions')"
            aria-haspopup="menu"
            @click.stop="menuRef?.toggle($event, template)"
            @keydown.enter.stop
          >
            <MoreHorizontal :size="17" :stroke-width="2.25" />
          </button>
        </div>
        <span>{{ editedText(template) }}</span>
        <div class="owner-row">
          <i>{{ owner.charAt(0) }}</i>
          {{ t("home.createdBy", { name: owner }) }}
        </div>
      </div>
    </article>

    <!-- Cards while the next page loads -->
    <div v-for="n in skeletons" :key="'skeleton-' + n" class="template-card skeleton-card" aria-hidden="true">
      <div class="template-preview skeleton-preview" />
      <div class="template-info">
        <i class="skeleton-line wide" />
        <i class="skeleton-line" />
      </div>
    </div>

    <TemplateMenu ref="menuRef" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { MoreHorizontal, Plus } from "@lucide/vue";
import { useTemplates } from "@/composables/useTemplates";
import type { TemplateSummary } from "@/services/templateService";
import TemplateMenu from "./TemplateMenu.vue";

withDefaults(
  defineProps<{ templates: TemplateSummary[]; showNew?: boolean; owner: string; skeletons?: number }>(),
  { skeletons: 0 },
);

const { t } = useI18n();
const { editedText, openTemplate, newTemplate } = useTemplates();

const TONES = ["violet", "blue", "green"];
const menuRef = ref<InstanceType<typeof TemplateMenu> | null>(null);
</script>

<style scoped>
/* As many columns as fit, so a wide window uses its whole width */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 16px;
}
.template-card {
  overflow: hidden;
  border: 1px solid rgba(28, 27, 38, 0.09);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.05);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.template-card:hover,
.template-card:focus-visible {
  transform: translateY(-3px);
  border-color: rgba(124, 92, 247, 0.45);
  box-shadow: 0 10px 24px rgba(124, 92, 247, 0.12);
  outline: none;
}
.new-card {
  min-height: 238px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-style: dashed;
  background: rgba(124, 92, 247, 0.04);
  color: #45425a;
}
.new-card span,
.template-info > span {
  color: #8a84a3;
  font-size: 11px;
}
.new-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  margin-bottom: 3px;
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
}
.template-preview {
  height: 130px;
  padding: 19px;
  border-bottom: 1px solid rgba(28, 27, 38, 0.06);
  background: linear-gradient(135deg, #ede9fe, #f6f4ff);
}
.template-preview.blue {
  background: linear-gradient(135deg, #dbeafe, #f0f5fc);
}
.template-preview.green {
  background: linear-gradient(135deg, #d6f0e8, #eff8f4);
}
.preview-lines {
  display: grid;
  gap: 7px;
  width: 60%;
}
.preview-lines i {
  display: block;
  height: 4px;
  border-radius: 2px;
  background: rgba(92, 76, 166, 0.35);
}
.preview-lines i:not(:first-child) {
  width: 70%;
  background: rgba(92, 76, 166, 0.16);
}
.preview-chart {
  display: flex;
  align-items: end;
  gap: 4px;
  height: 35px;
  margin-top: 15px;
}
.preview-chart b {
  width: 11px;
  height: 40%;
  border-radius: 2px 2px 0 0;
  background: #9d8cff;
  opacity: 0.75;
}
.preview-chart b:nth-child(2) {
  height: 75%;
}
.preview-chart b:nth-child(3) {
  height: 52%;
}
.preview-chart b:nth-child(4) {
  height: 90%;
}
.preview-chart b:nth-child(5) {
  height: 65%;
}
.template-info {
  padding: 14px;
}
.template-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.template-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12.5px;
  font-weight: 600;
}
.more-button {
  display: grid;
  place-items: center;
  padding: 4px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: #8a84a3;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}
.more-button:hover,
.more-button.open {
  color: #6440f4;
  background: rgba(124, 92, 247, 0.08);
}
.template-info > span {
  display: block;
  margin-top: 5px;
}
.owner-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  color: #77718a;
  font-size: 10px;
}
.owner-row i {
  display: inline-grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: rgba(124, 92, 247, 0.12);
  color: #6440f4;
  font-size: 9px;
  font-style: normal;
}
.skeleton-card {
  cursor: default;
  pointer-events: none;
}
.skeleton-preview,
.skeleton-line {
  background: linear-gradient(90deg, #f1f0f6 25%, #f8f7fc 50%, #f1f0f6 75%);
  background-size: 200% 100%;
  animation: skeleton-shine 1.2s ease-in-out infinite;
}
.skeleton-line {
  display: block;
  width: 45%;
  height: 9px;
  margin-top: 9px;
  border-radius: 4px;
}
.skeleton-line.wide {
  width: 75%;
  margin-top: 0;
}
@keyframes skeleton-shine {
  to {
    background-position: -200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-preview,
  .skeleton-line {
    animation: none;
  }
}
@media (max-width: 620px) {
  .new-card {
    min-height: 180px;
  }
}
</style>
