<template>
  <!-- Help panel → Guides: a list of common jobs, then the chosen one as a
       checklist that ticks itself off as the user works -->
      <!-- The list of guides -->
      <div v-if="!guide" class="guide-body">
        <p class="guide-intro">{{ t("help.guides.intro") }}</p>
        <!-- The jobs, then one guide per element under the library's headings -->
        <section v-for="section in guideSections" :key="section.id" class="guide-section">
          <h4>{{ sectionTitle(section.id) }}</h4>
          <button
            v-for="item in section.items"
            :key="item.id"
            type="button"
            class="guide-card"
            @click="help.guideId = item.id"
          >
            <span class="guide-card-icon">
              <component :is="guideIcon(item.id)" :size="18" :stroke-width="2.25" aria-hidden="true" />
            </span>
            <span class="guide-card-text">
              <strong>{{ t(`help.guides.${item.id}.title`) }}</strong>
              <small>{{ t(`help.guides.${item.id}.intro`) }}</small>
              <small v-if="item.done > 0" class="guide-card-progress">
                {{ t("help.guides.progress", { done: item.done, total: item.total }) }}
              </small>
            </span>
            <ChevronRight class="guide-card-go" :size="16" aria-hidden="true" />
          </button>
        </section>
      </div>

      <!-- One guide: its steps -->
      <div v-else class="guide-body">
        <button type="button" class="help-back" @click="help.guideId = null">
          <ArrowLeft :size="14" :stroke-width="2.25" aria-hidden="true" />
          {{ t("help.guides.allGuides") }}
        </button>
        <h4 class="guide-name">{{ t(`help.guides.${guide.id}.title`) }}</h4>
        <div class="guide-progress" role="progressbar" :aria-valuenow="doneCount" :aria-valuemax="guide.steps.length">
          <span :style="{ width: `${(doneCount / guide.steps.length) * 100}%` }" />
        </div>
        <p class="guide-progress-text">
          {{ t("help.guides.progress", { done: doneCount, total: guide.steps.length }) }}
        </p>

        <div v-if="allDone" class="guide-done">
          <PartyPopper :size="22" :stroke-width="2" aria-hidden="true" />
          <strong>{{ t("help.guides.allDoneTitle") }}</strong>
          <span>{{ t("help.guides.allDoneText") }}</span>
          <button type="button" class="guide-btn" @click="help.guideId = null">
            {{ t("help.guides.another") }}
          </button>
        </div>

        <ol class="guide-steps">
          <li
            v-for="(step, index) in guide.steps"
            :key="step.key"
            class="guide-step"
            :class="{ 'is-done': stepDone[index], 'is-now': index === currentIndex }"
          >
            <component
              :is="stepDone[index] ? CircleCheck : Circle"
              class="guide-step-mark"
              :size="18"
              :stroke-width="2.25"
              aria-hidden="true"
            />
            <div class="guide-step-text">
              <strong>
                <span class="sr-only">{{ stepDone[index] ? t("help.guides.stepDone") : "" }}</span>
                {{ t(`help.guides.${guide.id}.steps.${step.key}Title`) }}
              </strong>
              <span v-if="index === currentIndex">{{ t(`help.guides.${guide.id}.steps.${step.key}Text`) }}</span>
              <button
                v-if="index === currentIndex && step.target"
                type="button"
                class="guide-show-me"
                @click="showMe(step)"
              >
                <Crosshair :size="14" :stroke-width="2.25" aria-hidden="true" />
                {{ t("help.guides.showMe") }}
              </button>
            </div>
          </li>
        </ol>

        <button type="button" class="guide-ai" @click="askAI">
          <Sparkles :size="15" :stroke-width="2.25" aria-hidden="true" />
          {{ t("help.guides.askAi") }}
        </button>
      </div>

  <!-- "Show me": a ring that pulses around the part to use -->
  <Teleport to="body">
    <div v-if="ring" class="guide-ring" :style="ring" aria-hidden="true" />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type Component } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowLeft,
  BookImage,
  ChevronRight,
  Circle,
  CircleHelp,
  CircleCheck,
  Crosshair,
  PartyPopper,
  Sheet,
  Sparkles,
  FileText,
  TableOfContents,
} from "@lucide/vue";
import { useHelpStore } from "@/stores/help";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import notification from "@/utils/notification";
import {
  findGuideTarget,
  guideById,
  GUIDE_SECTIONS,
  type GuideContext,
  type GuideId,
  type GuideSectionId,
  type GuideStep,
} from "@/utils/helpGuides";
import { getElementIconComponent } from "@/utils/elementUtils";
import type { DesignElement } from "@/types";

const emit = defineEmits<{ (e: "ask-ai"): void }>();

const { t } = useI18n();
const help = useHelpStore();
const report = useReportStore();
const selection = useSelectionStore();

// The jobs' icons; an element's guide shows its library tile's icon
const JOB_ICONS: Partial<Record<GuideId, Component>> = {
  monthlyReport: FileText,
  coverPage: BookImage,
  tableOfContents: TableOfContents,
  dataTable: Sheet,
};
const GUIDE_TILES: Partial<Record<GuideId, string>> = {
  text: "textField",
  sectionHeading: "partSectionHeading",
  subHeading: "partSubHeading",
  image: "image",
  line: "line",
  rectangle: "rectangle",
  ellipse: "ellipse",
  box: "frame",
  typedTable: "table",
  chart: "chart",
  barcode: "barcode",
  pageBorder: "framePageBorder",
  pageNumbers: "pageNumber",
  date: "dateTime",
  presetBoxes: "frameKpiCard",
  presetHeaderFooter: "partReportHeader",
  presetStatus: "partStatusDot",
  presetSignOff: "partSignOff",
  presetTables: "tableKeyValue",
};
const guideIcon = (id: GuideId): Component => {
  const tileType = GUIDE_TILES[id];
  return JOB_ICONS[id] ?? (tileType ? getElementIconComponent(tileType) : undefined) ?? CircleHelp;
};

// "Common jobs", then the library's own headings
const sectionTitle = (id: GuideSectionId) =>
  id === "jobs" ? t("help.guides.sections.jobs") : t(`helpDocs.groups.${id}`);

// What the steps read: the report, what was done, what is selected
const context = computed<GuideContext>(() => {
  const sel = selection.selectedElement;
  const band = sel ? report.bands[sel.bandIndex] : undefined;
  const top = sel ? band?.elements[sel.parentFrameIndex ?? sel.elementIndex] : undefined;
  const selected: DesignElement | null =
    sel && sel.parentFrameIndex !== undefined
      ? ((top as any)?.elements?.[sel.elementIndex] ?? null)
      : (top ?? null);
  // The element being typed in (an item in a box: inside its box)
  const ed = selection.editingElement;
  const edBand = ed ? report.bands[ed.bandIndex] : undefined;
  const edTop = ed ? edBand?.elements[ed.parentFrameIndex ?? ed.elementIndex] : undefined;
  const editing: DesignElement | null =
    ed && ed.parentFrameIndex !== undefined
      ? ((edTop as any)?.elements?.[ed.elementIndex] ?? null)
      : (edTop ?? null);
  return {
    bands: report.bands,
    properties: report.reportProperties,
    actions: help.guideActions,
    selected,
    selectedPage: band?.type === "detail" && top ? (top.pageIndex ?? 0) : null,
    selectedBand: (band ?? edBand)?.type ?? null,
    editing,
  };
});

const isDone = (guide: GuideId, step: GuideStep) =>
  help.stickySteps.includes(`${guide}.${step.key}`) || step.done(context.value);

const guide = computed(() => (help.guideId ? guideById(help.guideId) : null));
const stepDone = computed(() => guide.value?.steps.map((step) => isDone(guide.value!.id, step)) ?? []);
const doneCount = computed(() => stepDone.value.filter(Boolean).length);
const currentIndex = computed(() => stepDone.value.indexOf(false));
const allDone = computed(() => !!guide.value && currentIndex.value === -1);

const guideSections = computed(() =>
  GUIDE_SECTIONS.map((section) => ({
    id: section.id,
    items: section.guides.map((id) => {
      const item = guideById(id);
      return {
        id,
        total: item.steps.length,
        done: item.steps.filter((step) => isDone(id, step)).length,
      };
    }),
  })),
);

// Steps only seen (e.g. a page number opened) stay ticked once seen
watch(
  context,
  (ctx) => {
    const open = guide.value;
    if (!open) return;
    for (const step of open.steps) {
      if (step.sticky && step.done(ctx)) help.tickSticky(`${open.id}.${step.key}`);
    }
  },
  { immediate: true },
);

// "Show me": scroll the part into view and ring it for a few seconds
const RING_MS = 3200;
const ring = ref<Record<string, string> | null>(null);
let ringTimer: ReturnType<typeof setTimeout> | undefined;

function showMe(step: GuideStep) {
  const target = findGuideTarget(step.target?.(context.value) ?? []);
  if (!target) {
    notification.info(t("help.guides.notOnScreen"));
    return;
  }
  target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  clearTimeout(ringTimer);
  ring.value = null;
  // After the scroll has settled
  setTimeout(() => {
    const rect = target.getBoundingClientRect();
    ring.value = {
      top: `${rect.top - 5}px`,
      left: `${rect.left - 5}px`,
      width: `${rect.width + 10}px`,
      height: `${rect.height + 10}px`,
    };
    ringTimer = setTimeout(() => (ring.value = null), RING_MS);
  }, 300);
}

function askAI() {
  if (!guide.value) return;
  help.aiDraft = t(`help.guides.${guide.value.id}.aiPrompt`);
  emit("ask-ai");
}

onBeforeUnmount(() => clearTimeout(ringTimer));
</script>

<style scoped>
.guide-body {
  display: grid;
  gap: 8px;
}
.guide-name {
  margin: 0;
  color: #1c1b26;
  font-size: 14px;
  font-weight: 700;
}
.guide-intro {
  margin: 0 0 2px;
  color: #45425a;
  font-size: 13px;
  line-height: 1.5;
}
.guide-section {
  display: grid;
  gap: 8px;
}
.guide-section + .guide-section {
  margin-top: 10px;
}
.guide-section h4 {
  margin: 0;
  color: #6f6a7e;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.guide-card {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px;
  border: 1px solid #e6e5ee;
  border-radius: 10px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.14s ease,
    background 0.14s ease;
}
.guide-card:hover {
  border-color: rgba(124, 92, 247, 0.4);
  background: rgba(124, 92, 247, 0.04);
}
.guide-card-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
}
.guide-card-text {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}
.guide-card-text strong {
  color: #1c1b26;
  font-size: 13px;
}
.guide-card-text small {
  color: #6f6a7e;
  font-size: 12px;
  line-height: 1.4;
}
.guide-card-text .guide-card-progress {
  color: #1e8e5a;
  font-weight: 600;
}
.guide-card-go {
  flex-shrink: 0;
  color: #9a94ab;
}

.guide-progress {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: #eeecf5;
}
.guide-progress span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #7c5cf7, #6440f4);
  transition: width 0.3s ease;
}
.guide-progress-text {
  margin: -2px 0 2px;
  color: #6f6a7e;
  font-size: 12px;
  font-weight: 600;
}

.guide-done {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(30, 142, 90, 0.08);
  color: #1e8e5a;
  text-align: center;
}
.guide-done strong {
  color: #1c1b26;
  font-size: 14px;
}
.guide-done span {
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.45;
}
.guide-btn {
  margin-top: 6px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #e6e5ee;
  border-radius: 8px;
  background: #ffffff;
  color: #45425a;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.guide-btn:hover {
  border-color: rgba(124, 92, 247, 0.4);
  color: #6440f4;
}

.guide-steps {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.guide-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 8px;
  border-radius: 9px;
}
.guide-step.is-now {
  background: rgba(124, 92, 247, 0.07);
}
.guide-step-mark {
  flex-shrink: 0;
  margin-top: 1px;
  color: #c4c0d3;
}
.guide-step.is-now .guide-step-mark {
  color: #6440f4;
}
.guide-step.is-done .guide-step-mark {
  color: #1e8e5a;
}
.guide-step-text {
  display: grid;
  gap: 4px;
  min-width: 0;
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.5;
}
.guide-step-text strong {
  color: #1c1b26;
  font-size: 13px;
}
.guide-step.is-done .guide-step-text strong {
  color: #6f6a7e;
  font-weight: 600;
  text-decoration: line-through;
  text-decoration-color: rgba(111, 106, 126, 0.5);
}
.guide-show-me {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 6px;
  height: 30px;
  margin-top: 2px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c5cf7, #6440f4);
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}
.guide-show-me:hover {
  filter: brightness(1.06);
}
.guide-ai {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
  padding: 8px;
  border: 1px dashed rgba(124, 92, 247, 0.4);
  border-radius: 9px;
  background: transparent;
  color: #6440f4;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.guide-ai:hover {
  background: rgba(124, 92, 247, 0.06);
}

.guide-card:focus-visible,
.guide-show-me:focus-visible,
.guide-ai:focus-visible,
.guide-btn:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 2px;
}

.guide-ring {
  position: fixed;
  z-index: 2500;
  border: 3px solid #7c5cf7;
  border-radius: 10px;
  pointer-events: none;
  animation: guide-ring 1s ease-out 3;
}
@keyframes guide-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(124, 92, 247, 0.55);
  }
  100% {
    box-shadow: 0 0 0 14px rgba(124, 92, 247, 0);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .guide-ring,
  .guide-progress span {
    animation: none;
    transition: none;
  }
}
</style>
