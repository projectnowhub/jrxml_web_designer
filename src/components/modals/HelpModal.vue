<template>
  <!-- Quick guide (Help menu): making a report step by step, from the home
       page to the PDF, and the keyboard shortcuts -->
  <BaseModal
    :visible="help.guideOpen"
    :title="t('help.guide.title')"
    :showFooter="false"
    contentClass="help-modal-content"
    @cancel="help.closeGuide()"
  >
    <div class="help-tabs" role="tablist">
      <button
        v-for="tab in TABS"
        :key="tab"
        type="button"
        role="tab"
        class="help-tab"
        :class="{ active: help.guideTab === tab }"
        :aria-selected="help.guideTab === tab"
        @click="help.guideTab = tab"
      >
        {{ t(`help.guide.tabs.${tab}`) }}
      </button>
    </div>

    <div v-if="help.guideTab === 'guide'" class="help-scroll">
      <p class="help-intro">{{ t("help.guide.intro") }}</p>

      <h4 class="help-heading">{{ t("help.guide.stepsTitle") }}</h4>
      <ol class="help-steps">
        <li v-for="(step, index) in STEPS" :key="step.id" class="help-step">
          <span class="help-step-icon">
            <component :is="step.icon" :size="18" :stroke-width="2.25" aria-hidden="true" />
          </span>
          <span class="help-step-text">
            <strong>{{ index + 1 }}. {{ t(`help.guide.steps.${step.id}Title`) }}</strong>
            <span>{{ t(`help.guide.steps.${step.id}Text`) }}</span>
          </span>
        </li>
      </ol>

      <h4 class="help-heading">{{ t("help.guide.tipsTitle") }}</h4>
      <ul class="help-tips">
        <li v-for="tip in TIPS" :key="tip.id">
          <component :is="tip.icon" :size="16" :stroke-width="2.25" aria-hidden="true" />
          <span>{{ t(`help.guide.tips.${tip.id}`) }}</span>
        </li>
      </ul>

      <div class="help-tour-cta">
        <span>{{ t("help.guide.tourHint") }}</span>
        <n-button type="primary" @click="help.startTour(help.guideTour)">
          <template #icon><Compass :size="16" :stroke-width="2.25" /></template>
          {{ t("help.guide.takeTour") }}
        </n-button>
      </div>

      <!-- In the designer: the step-by-step guides (Help window → Guides) -->
      <div v-if="help.guideTour === 'designer'" class="help-tour-cta">
        <span>{{ t("help.guide.guidesHint") }}</span>
        <n-button @click="openGuides">
          <template #icon><ListChecks :size="16" :stroke-width="2.25" /></template>
          {{ t("help.guide.guidesButton") }}
        </n-button>
      </div>
    </div>

    <!-- Keyboard and mouse: every shortcut of the designer (utils/helpShortcuts.ts),
         listed under headings; keys drawn as key caps, mouse actions as tags -->
    <div v-else class="help-scroll">
      <p class="help-intro">{{ t("help.shortcutsIntro") }}</p>
      <section v-for="group in SHORTCUT_GROUPS" :key="group.id" class="shortcut-group">
        <h4 class="shortcut-heading">{{ t(`help.shortcutGroups.${group.id}`) }}</h4>
        <div v-for="row in group.rows" :key="row.id" class="shortcut-row">
          <span class="shortcut-what">{{ t(`help.shortcuts.${row.id}`) }}</span>
          <span class="shortcut-keys">
            <template v-for="(combo, ci) in row.combos" :key="ci">
              <span v-if="ci > 0" class="shortcut-or">{{ t("help.shortcutOr") }}</span>
              <template v-for="(token, ki) in combo" :key="ki">
                <span v-if="ki > 0" class="shortcut-plus">+</span>
                <span v-if="isMouseAction(token)" class="mouse-tag">
                  <MousePointer2 :size="12" :stroke-width="2.25" aria-hidden="true" />
                  {{ t(`help.mouse.${mouseAction(token)}`) }}
                </span>
                <kbd v-else class="keycap">{{ keyLabel(token) }}</kbd>
              </template>
            </template>
          </span>
        </div>
      </section>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { NButton } from "naive-ui";
import {
  Compass,
  Eye,
  FilePlus,
  Files,
  FolderOpen,
  FolderKanban,
  Keyboard,
  ListChecks,
  MousePointer2,
  MousePointerClick,
  Move,
  Scaling,
  SlidersHorizontal,
  Sparkles,
  TextCursorInput,
  Undo2,
  Save,
} from "@lucide/vue";
import BaseModal from "./BaseModal.vue";
import { useHelpStore, type GuideTab } from "@/stores/help";
import { keyLabel } from "@/utils/helpDocs";
import { isMouseAction, mouseAction, SHORTCUT_GROUPS } from "@/utils/helpShortcuts";

const { t } = useI18n();
const help = useHelpStore();

const TABS: GuideTab[] = ["guide", "shortcuts"];

function openGuides() {
  help.closeGuide();
  help.openPanel("guides");
}

// From the home page to the PDF, in the order a report is made
const STEPS = [
  { id: "start", icon: FilePlus },
  { id: "project", icon: FolderKanban },
  { id: "add", icon: MousePointerClick },
  { id: "change", icon: SlidersHorizontal },
  { id: "pages", icon: Files },
  { id: "ai", icon: Sparkles },
  { id: "preview", icon: Eye },
];

const TIPS = [
  { id: "type", icon: TextCursorInput },
  { id: "rightClick", icon: MousePointerClick },
  { id: "resize", icon: Scaling },
  { id: "nudge", icon: Move },
  { id: "undo", icon: Undo2 },
  { id: "saved", icon: Save },
  { id: "open", icon: FolderOpen },
  { id: "keys", icon: Keyboard },
];

</script>

<style scoped>
:deep(.modal-content.help-modal-content) {
  width: min(720px, calc(100vw - 32px));
  max-height: 84vh;
}

:deep(.help-modal-content .modal-body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 20px 20px;
  overflow: hidden;
}

.help-tabs {
  display: flex;
  gap: 4px;
  margin: 4px 0 14px;
  border-bottom: 1px solid #e6e5ee;
}
.help-tab {
  padding: 10px 12px;
  margin-bottom: -1px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #6f6a7e;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.help-tab:hover {
  color: #1c1b26;
}
.help-tab.active {
  border-bottom-color: #6440f4;
  color: #6440f4;
}

.help-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}
.help-intro {
  margin: 0 0 16px;
  color: #45425a;
  font-size: 14px;
  line-height: 1.6;
}
.help-heading {
  margin: 18px 0 10px;
  color: #1c1b26;
  font-size: 14px;
  font-weight: 700;
}

.help-steps {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.help-step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(23, 20, 44, 0.04);
}
.help-step-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
}
.help-step-text {
  display: grid;
  gap: 3px;
  font-size: 13.5px;
  line-height: 1.55;
  color: #45425a;
}
.help-step-text strong {
  color: #1c1b26;
  font-size: 14px;
}

.help-tips {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.help-tips li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #45425a;
  font-size: 13.5px;
  line-height: 1.5;
}
.help-tips li > :first-child {
  flex-shrink: 0;
  margin-top: 2px;
  color: #6440f4;
}

.help-tour-cta + .help-tour-cta {
  margin-top: 8px;
}
.help-tour-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(124, 92, 247, 0.07);
  color: #45425a;
  font-size: 13.5px;
}

.shortcut-group {
  margin-bottom: 18px;
}
.shortcut-heading {
  margin: 0 0 4px;
  padding-bottom: 6px;
  border-bottom: 2px solid rgba(124, 92, 247, 0.18);
  color: #6440f4;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 7px 4px;
  border-bottom: 1px solid #f0eff5;
}
.shortcut-row:hover {
  background: #faf9fd;
}
.shortcut-what {
  color: #1c1b26;
  font-size: 13.5px;
  line-height: 1.45;
}
.shortcut-keys {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  max-width: 60%;
}
.shortcut-plus,
.shortcut-or {
  color: #9a94ab;
  font-size: 12px;
}
.shortcut-or {
  margin: 0 3px;
}
/* A key cap: raised, with a darker bottom edge */
.keycap {
  display: inline-grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 8px;
  border: 1px solid #d9d7e3;
  border-bottom-width: 3px;
  border-radius: 6px;
  background: linear-gradient(#ffffff, #f7f7fa);
  color: #1c1b26;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  box-sizing: border-box;
}
/* A mouse action: a soft purple tag with a pointer */
.mouse-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(124, 92, 247, 0.1);
  color: #5b3ee0;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
