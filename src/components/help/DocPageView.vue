<template>
  <!-- One help page (Help panel → This item / All elements): what the element
       is, when and how to use it, its settings, what to know, and the guides
       that use it -->
  <article class="doc">
    <h4 class="doc-title">{{ t(`${base}.title`) }}</h4>
    <ElementSample v-if="page.sample" :page="page.id" />
    <p class="doc-what">{{ t(`${base}.what`) }}</p>

    <template v-for="part in TEXT_PARTS" :key="part">
      <section v-if="te(`${base}.${part}`)" class="doc-part">
        <h5>{{ t(`helpDocs.parts.${part}`) }}</h5>
        <p>{{ t(`${base}.${part}`) }}</p>
      </section>
    </template>

    <section v-if="work.length" class="doc-part">
      <h5>{{ t("helpDocs.parts.work") }}</h5>
      <ul class="doc-list">
        <li v-for="(line, index) in work" :key="index">{{ line }}</li>
      </ul>
    </section>

    <!-- The toolbar page: every tool at the top, with its keys -->
    <section v-if="page.id === 'toolbar'" class="doc-part">
      <ul class="doc-tools">
        <li v-for="tool in TOOLS" :key="tool.id">
          <span class="doc-tool-icon"><component :is="TOOL_ICONS[tool.id]" :size="16" :stroke-width="2.25" /></span>
          <span class="doc-tool-text">
            <strong>{{ t(`helpDocs.tools.${tool.id}.title`) }}</strong>
            <span>{{ t(`helpDocs.tools.${tool.id}.text`) }}</span>
            <!-- Switches explained one by one (Snap & grid) -->
            <div v-if="tool.parts" class="doc-tool-parts">
              <div v-for="part in tool.parts" :key="part" class="doc-tool-part">
                <component :is="PART_ICONS[part] ?? Info" class="doc-tool-part-icon" :size="14" :stroke-width="2.25" />
                <div>
                  <strong>{{ t(`helpDocs.tools.${tool.id}.parts.${part}.title`) }}</strong>
                  <span>{{ t(`helpDocs.tools.${tool.id}.parts.${part}.text`) }}</span>
                </div>
              </div>
            </div>
            <span v-if="tool.keys" class="doc-keys">
              <template v-for="(combo, ci) in tool.keys" :key="ci">
                <span v-if="ci > 0" class="doc-keys-or">/</span>
                <kbd v-for="key in combo" :key="key">{{ keyLabel(key) }}</kbd>
              </template>
            </span>
          </span>
        </li>
      </ul>
    </section>

    <section v-if="page.settings.length" class="doc-part">
      <h5>{{ t("helpDocs.parts.settings") }}</h5>
      <dl class="doc-settings">
        <template v-for="setting in page.settings" :key="setting">
          <dt>{{ t(`helpDocs.settings.${setting}.title`) }}</dt>
          <dd>{{ t(`helpDocs.settings.${setting}.text`) }}</dd>
        </template>
      </dl>
    </section>

    <section v-if="good.length" class="doc-part">
      <h5>{{ t("helpDocs.parts.good") }}</h5>
      <ul class="doc-list is-good">
        <li v-for="(line, index) in good" :key="index">{{ line }}</li>
      </ul>
    </section>

    <section v-if="page.guides?.length" class="doc-part">
      <h5>{{ t("helpDocs.parts.guides") }}</h5>
      <button
        v-for="guide in page.guides"
        :key="guide"
        type="button"
        class="doc-guide"
        @click="help.openPanel('guides', { guide })"
      >
        <ListChecks :size="15" :stroke-width="2.25" aria-hidden="true" />
        {{ t(`help.guides.${guide}.title`) }}
      </button>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import { useI18n } from "vue-i18n";
import {
  AlignCenterHorizontal,
  CircleHelp,
  ClipboardPaste,
  Copy,
  Download,
  Eye,
  Grid3x3,
  Info,
  CopyPlus,
  FolderKanban,
  FolderOpen,
  ListChecks,
  Magnet,
  PanelBottom,
  PencilLine,
  Redo2,
  Trash2,
  Undo2,
  ZoomIn,
} from "@lucide/vue";
import ElementSample from "./ElementSample.vue";
import { useHelpStore } from "@/stores/help";
import { docPageById, keyLabel, TOOLS, type DocPageId, type ToolId } from "@/utils/helpDocs";

const props = defineProps<{ id: DocPageId }>();

const { t, te, tm, rt } = useI18n();
const help = useHelpStore();

// Single texts shown when the page has them, in this order
const TEXT_PARTS = ["when", "add"] as const;

const TOOL_ICONS: Record<ToolId, Component> = {
  projects: FolderKanban,
  reportName: PencilLine,
  file: FolderOpen,
  undo: Undo2,
  redo: Redo2,
  addPage: CopyPlus,
  delete: Trash2,
  copy: Copy,
  paste: ClipboardPaste,
  zoom: ZoomIn,
  bottomPanel: PanelBottom,
  snap: Magnet,
  help: CircleHelp,
  download: Download,
  preview: Eye,
};

const PART_ICONS: Record<string, Component> = {
  grid: Grid3x3,
  alignment: AlignCenterHorizontal,
  showGrid: Eye,
};

const page = computed(() => docPageById(props.id));
const base = computed(() => `helpDocs.pages.${props.id}`);

// A list text (work, good): its lines, none when the page has none (te()
// answers false for lists, so the value itself is checked)
const lines = (key: string): string[] => {
  const value = tm(key);
  return Array.isArray(value) ? value.map((line) => rt(line as Parameters<typeof rt>[0])) : [];
};
const work = computed(() => lines(`${base.value}.work`));
const good = computed(() => lines(`${base.value}.good`));
</script>

<style scoped>
.doc {
  display: grid;
  gap: 12px;
}
.doc-title {
  margin: 0;
  color: #1c1b26;
  font-size: 15px;
  font-weight: 700;
}
.doc-what {
  margin: 0;
  color: #1c1b26;
  font-size: 13.5px;
  line-height: 1.55;
}
.doc-part {
  display: grid;
  gap: 6px;
}
.doc-part h5 {
  margin: 0;
  color: #6440f4;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.doc-part p {
  margin: 0;
  color: #45425a;
  font-size: 13px;
  line-height: 1.55;
}
.doc-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 18px;
  color: #45425a;
  font-size: 13px;
  line-height: 1.5;
}
.doc-list li::marker {
  color: #7c5cf7;
}
.doc-settings {
  display: grid;
  gap: 2px;
  margin: 0;
}
.doc-settings dt {
  margin-top: 6px;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}
.doc-settings dd {
  margin: 0;
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.5;
}
.doc-tools {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.doc-tools > li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.doc-tool-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
}
.doc-tool-text {
  display: grid;
  gap: 2px;
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.5;
}
.doc-tool-text strong {
  color: #1c1b26;
  font-size: 13px;
}
.doc-tool-parts {
  display: grid;
  gap: 6px;
  margin-top: 6px;
}
.doc-tool-part {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f7f6fc;
}
.doc-tool-part-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: #6440f4;
}
.doc-tool-part > div {
  display: grid;
  gap: 1px;
}
.doc-tool-part strong {
  color: #1c1b26;
  font-size: 12.5px;
}
.doc-keys {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  margin-top: 2px;
}
.doc-keys kbd {
  padding: 1px 6px;
  border: 1px solid #d9d7e3;
  border-radius: 5px;
  background: #f7f7fa;
  color: #1c1b26;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
}
.doc-keys-or {
  margin: 0 3px;
  color: #9a94ab;
}
.doc-guide {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(124, 92, 247, 0.35);
  border-radius: 8px;
  background: #ffffff;
  color: #6440f4;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.doc-guide:hover {
  background: rgba(124, 92, 247, 0.06);
}
.doc-guide:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 2px;
}
</style>
