<template>
  <!-- Templates as a table (My Templates' list view): a row click opens the
       template; the Name / Last edited / Created headings sort; Actions =
       Open, Rename, Duplicate, Delete as icon buttons (TemplateMenu runs them) -->
  <div class="template-table-wrap">
    <table class="template-table">
      <thead>
        <tr>
          <th v-for="column in COLUMNS" :key="column" :class="['col-' + column]" :aria-sort="ariaSort(column)">
            <button type="button" class="sort-head" :class="{ active: sort === column }" @click="emit('sort', column)">
              {{ t(`myTemplates.columns.${column}`) }}
              <component
                :is="sort === column ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown"
                :size="13"
                :stroke-width="2.25"
                aria-hidden="true"
              />
            </button>
          </th>
          <th class="col-owner">{{ t("myTemplates.columns.owner") }}</th>
          <th class="col-actions">{{ t("myTemplates.columns.actions") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(template, index) in templates"
          :key="template.id"
          class="template-row"
          tabindex="0"
          @click="openTemplate(template)"
          @keydown.enter.self="openTemplate(template)"
        >
          <td class="col-name">
            <span class="name-cell">
              <span class="file-icon"><FileText :size="16" :stroke-width="2.25" aria-hidden="true" /></span>
              <strong>{{ template.name }}</strong>
            </span>
          </td>
          <td class="col-lastModified">{{ dateText(template.lastModified) }}</td>
          <td class="col-createdAt">{{ dateText(template.createdAt) }}</td>
          <td class="col-owner">
            <span class="owner-cell"><i>{{ owner.charAt(0) }}</i>{{ owner }}</span>
          </td>
          <td class="col-actions">
            <div class="row-actions" :data-help="index === 0 ? 'template-actions' : undefined">
              <button
                v-for="action in ACTIONS"
                :key="action.key"
                type="button"
                class="action-button"
                :class="'is-' + action.key"
                :title="t(`home.menu.${action.key}`)"
                :aria-label="`${t(`home.menu.${action.key}`)}: ${template.name}`"
                @click.stop="menuRef?.run(action.key, template)"
                @keydown.enter.stop
              >
                <component :is="action.icon" :size="16" :stroke-width="2.25" aria-hidden="true" />
              </button>
            </div>
          </td>
        </tr>
        <tr v-for="n in skeletons" :key="'skeleton-' + n" class="skeleton-row" aria-hidden="true">
          <td class="col-name"><i class="skeleton-line wide" /></td>
          <td class="col-lastModified"><i class="skeleton-line" /></td>
          <td class="col-createdAt"><i class="skeleton-line" /></td>
          <td class="col-owner"><i class="skeleton-line" /></td>
          <td class="col-actions" />
        </tr>
      </tbody>
    </table>
    <TemplateMenu ref="menuRef" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowDown, ArrowUp, ArrowUpDown, Copy, ExternalLink, FileText, Pencil, Trash2 } from "@lucide/vue";
import { useTemplates } from "@/composables/useTemplates";
import type { SortDirection, TemplateSort, TemplateSummary } from "@/services/templateService";
import TemplateMenu from "./TemplateMenu.vue";

const props = withDefaults(
  defineProps<{
    templates: TemplateSummary[];
    owner: string;
    sort: TemplateSort;
    dir: SortDirection;
    skeletons?: number;
  }>(),
  { skeletons: 0 },
);
const emit = defineEmits<{ (e: "sort", column: TemplateSort): void }>();

const { t } = useI18n();
const { dateText, openTemplate } = useTemplates();

const COLUMNS: TemplateSort[] = ["name", "lastModified", "createdAt"];
const ACTIONS = [
  { key: "open", icon: ExternalLink },
  { key: "rename", icon: Pencil },
  { key: "duplicate", icon: Copy },
  { key: "delete", icon: Trash2 },
] as const;
const menuRef = ref<InstanceType<typeof TemplateMenu> | null>(null);

const ariaSort = (column: TemplateSort) =>
  props.sort !== column ? "none" : props.dir === "asc" ? "ascending" : "descending";
</script>

<style scoped>
.template-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(28, 27, 38, 0.09);
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(23, 20, 44, 0.05);
}
.template-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: 12.5px;
}
th,
td {
  padding: 0 14px;
  text-align: left;
  white-space: nowrap;
}
th {
  height: 42px;
  border-bottom: 1px solid #e6e5ee;
  background: #fafafc;
  color: #6e6a80;
  font-size: 11.5px;
  font-weight: 600;
}
td {
  height: 52px;
  border-bottom: 1px solid #f0eff5;
  color: #6e6a80;
}
tbody tr:last-child td {
  border-bottom: 0;
}
.col-name {
  width: 44%;
}
.col-actions {
  width: 1%;
  text-align: right;
}
.sort-head {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  margin-left: -6px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.sort-head:hover {
  background: rgba(124, 92, 247, 0.08);
  color: #6440f4;
}
.sort-head.active {
  color: #1c1b26;
}
.template-row {
  cursor: pointer;
  transition: background 0.14s ease;
}
.template-row:hover,
.template-row:focus-visible {
  background: rgba(124, 92, 247, 0.05);
  outline: none;
}
.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.name-cell strong {
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1c1b26;
  font-weight: 600;
}
.file-icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
}
.owner-cell {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.owner-cell i {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(124, 92, 247, 0.12);
  color: #6440f4;
  font-size: 9.5px;
  font-style: normal;
  font-weight: 600;
}
.row-actions {
  display: inline-flex;
  gap: 2px;
}
/* Each action its colour (the same in the cards' menu): Open purple, Rename
   blue, Duplicate green, Delete red; a light tint of it on hover */
.action-button {
  --action: #6440f4;
  --action-tint: rgba(100, 64, 244, 0.1);
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--action);
  cursor: pointer;
  transition: background 0.14s ease;
}
.action-button.is-rename {
  --action: #2f6fdf;
  --action-tint: rgba(47, 111, 223, 0.1);
}
.action-button.is-duplicate {
  --action: #16936a;
  --action-tint: rgba(22, 147, 106, 0.1);
}
.action-button.is-delete {
  --action: #e5484d;
  --action-tint: rgba(229, 72, 77, 0.1);
}
.action-button:hover,
.action-button:focus-visible {
  background: var(--action-tint);
  outline: none;
}
.skeleton-line {
  display: block;
  width: 60%;
  height: 9px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f1f0f6 25%, #f8f7fc 50%, #f1f0f6 75%);
  background-size: 200% 100%;
  animation: skeleton-shine 1.2s ease-in-out infinite;
}
.skeleton-line.wide {
  width: 45%;
}
@keyframes skeleton-shine {
  to {
    background-position: -200% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-line {
    animation: none;
  }
}
</style>
