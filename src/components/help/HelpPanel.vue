<template>
  <!-- The designer's Help window (Help menu, "Learn more"): a popup the user
       drags anywhere by its title bar, the Properties panel staying open.
       This item = the help page of what is selected; Show me how = the
       guides; All elements = every help page. Minimized, it becomes the Help
       tab at the right side (HelpDockTab). -->
  <Teleport to="body">
    <section
      v-if="help.panelOpen && !help.panelMinimized"
      ref="panelRef"
      class="help-panel"
      :class="{ 'is-dragging': dragging }"
      :style="{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      }"
      :aria-label="t('helpDocs.panel.title')"
    >
      <!-- Resized from any edge or corner -->
      <div
        v-for="edge in EDGES"
        :key="edge"
        class="help-resize"
        :class="`is-${edge}`"
        aria-hidden="true"
        @pointerdown="startResize($event, edge)"
      />
      <header class="help-head" :title="t('helpDocs.panel.dragHint')" @pointerdown="startDrag">
        <GripHorizontal class="help-grip" :size="16" :stroke-width="2.25" aria-hidden="true" />
        <h3 class="help-title">{{ t("helpDocs.panel.title") }}</h3>
        <button
          type="button"
          class="help-icon-btn"
          :title="t('helpDocs.panel.minimize')"
          :aria-label="t('helpDocs.panel.minimize')"
          @click="help.panelMinimized = true"
        >
          <Minus :size="16" :stroke-width="2.25" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="help-icon-btn"
          :title="t('help.guides.close')"
          :aria-label="t('help.guides.close')"
          @click="help.closePanel()"
        >
          <X :size="16" :stroke-width="2.25" aria-hidden="true" />
        </button>
      </header>

      <div class="help-tabs" role="tablist">
        <button
          v-for="tab in TABS"
          :key="tab"
          type="button"
          role="tab"
          class="help-tab"
          :class="{ active: help.panelTab === tab }"
          :aria-selected="help.panelTab === tab"
          @click="help.panelTab = tab"
        >
          {{ t(`helpDocs.panel.tabs.${tab}`) }}
        </button>
      </div>

      <div ref="bodyRef" class="help-body">
        <!-- This item: the selected element's page -->
        <template v-if="help.panelTab === 'item'">
          <!-- Nothing selected: the right panel shows Template Settings, so does this -->
          <DocPageView :id="selectedPage ?? 'templateSettings'" />
        </template>

        <GuidesView v-else-if="help.panelTab === 'guides'" @ask-ai="emit('ask-ai')" />

        <!-- All elements: the list, or one page -->
        <template v-else>
          <template v-if="help.docPage">
            <button type="button" class="help-back" @click="help.docPage = null">
              <ArrowLeft :size="14" :stroke-width="2.25" aria-hidden="true" />
              {{ t("helpDocs.panel.allPages") }}
            </button>
            <DocPageView :id="help.docPage" />
          </template>
          <div v-else class="help-index">
            <label class="help-search">
              <Search :size="15" :stroke-width="2.25" aria-hidden="true" />
              <input v-model="query" type="search" :placeholder="t('helpDocs.panel.search')" :aria-label="t('helpDocs.panel.search')" />
            </label>
            <template v-if="query.trim()">
              <p v-if="!results.length" class="help-no-results">{{ t("helpDocs.panel.noResults") }}</p>
              <button
                v-for="result in results"
                :key="result.key"
                type="button"
                class="help-result"
                @click="openResult(result.page)"
              >
                <strong>{{ result.title }}</strong>
                <span>{{ result.snippet }}</span>
                <small>{{ t(`helpDocs.pages.${result.page}.title`) }}</small>
              </button>
            </template>
            <section v-for="group in query.trim() ? [] : GROUPS" :key="group" class="help-group">
              <h4>{{ t(`helpDocs.groups.${group}`) }}</h4>
              <button
                v-for="page in pagesIn(group)"
                :key="page.id"
                type="button"
                class="help-index-item"
                @click="help.docPage = page.id"
              >
                <span class="help-index-icon">
                  <component :is="iconOf(page)" :size="16" :stroke-width="2.25" aria-hidden="true" />
                </span>
                <span>{{ t(`helpDocs.pages.${page.id}.title`) }}</span>
                <ChevronRight class="help-index-go" :size="14" aria-hidden="true" />
              </button>
            </section>
          </div>
        </template>
      </div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowLeft,
  ChevronRight,
  CircleHelp,
  GripHorizontal,
  LayoutPanelTop,
  Minus,
  Search,
  Settings2,
  SlidersHorizontal,
  X,
} from "@lucide/vue";
import DocPageView from "./DocPageView.vue";
import GuidesView from "./GuidesView.vue";
import { useHelpStore, type HelpPanelTab } from "@/stores/help";
import { useReportStore } from "@/stores/report";
import { useSelectionStore } from "@/stores/selection";
import { getElementIconComponent } from "@/utils/elementUtils";
import { DOC_PAGES, docPageFor, type DocGroup, type DocPage, type DocPageId } from "@/utils/helpDocs";

const emit = defineEmits<{ (e: "ask-ai"): void }>();

const { t, te, tm, rt } = useI18n();
const help = useHelpStore();
const report = useReportStore();
const selection = useSelectionStore();

const TABS: HelpPanelTab[] = ["item", "guides", "elements"];
// In the Element Library's order
const GROUPS: DocGroup[] = ["start", "basic", "composite", "presets"];
const START_ICONS: Partial<Record<DocPageId, Component>> = {
  toolbar: LayoutPanelTop,
  templateSettings: Settings2,
  pageSettings: SlidersHorizontal,
};

const pagesIn = (group: DocGroup) => DOC_PAGES.filter((page) => page.group === group);
const iconOf = (page: DocPage): Component =>
  START_ICONS[page.id] ?? (page.tile ? getElementIconComponent(page.tile) : undefined) ?? CircleHelp;

// The selected element's page (an item in a box: the item's own page)
const selectedPage = computed<DocPageId | null>(() => {
  const sel = selection.selectedElement;
  if (!sel) return null;
  const band = report.bands[sel.bandIndex];
  const top = band?.elements[sel.parentFrameIndex ?? sel.elementIndex];
  const element = sel.parentFrameIndex !== undefined ? (top as any)?.elements?.[sel.elementIndex] : top;
  return element ? docPageFor(element, band?.type, sel.parentFrameIndex !== undefined) : null;
});

// Search (All elements): every page's texts and every setting's explanation;
// a setting opens the first page that lists it
const query = ref("");
interface SearchResult {
  key: string;
  page: DocPageId;
  title: string;
  snippet: string;
}
const lines = (key: string): string[] => {
  const value = tm(key);
  return Array.isArray(value) ? value.map((line) => rt(line as Parameters<typeof rt>[0])) : [];
};
const searchable = computed<{ result: SearchResult; text: string }[]>(() => {
  const items: { result: SearchResult; text: string }[] = [];
  const seenSettings = new Set<string>();
  for (const page of DOC_PAGES) {
    const base = `helpDocs.pages.${page.id}`;
    const parts = ["what", "when", "add"].filter((part) => te(`${base}.${part}`)).map((part) => t(`${base}.${part}`));
    const all = [...parts, ...lines(`${base}.work`), ...lines(`${base}.good`)];
    items.push({
      result: { key: page.id, page: page.id, title: t(`${base}.title`), snippet: t(`${base}.what`) },
      text: [t(`${base}.title`), ...all].join(" "),
    });
    for (const setting of page.settings) {
      if (seenSettings.has(setting)) continue;
      seenSettings.add(setting);
      const title = t(`helpDocs.settings.${setting}.title`);
      const text = t(`helpDocs.settings.${setting}.text`);
      items.push({ result: { key: `setting-${setting}`, page: page.id, title, snippet: text }, text: `${title} ${text}` });
    }
  }
  return items;
});
// Every word typed must appear, whatever its ending ("rounded" finds
// "rounds"); titles that match come first
const stem = (word: string) => (word.length > 5 ? word.slice(0, -2) : word);
const results = computed<SearchResult[]>(() => {
  const words = query.value.toLowerCase().split(/\s+/).filter(Boolean).map(stem);
  if (!words.length) return [];
  return searchable.value
    .filter((item) => words.every((word) => item.text.toLowerCase().includes(word)))
    .sort((a, b) => Number(words.every((w) => b.result.title.toLowerCase().includes(w))) - Number(words.every((w) => a.result.title.toLowerCase().includes(w))))
    .slice(0, 12)
    .map((item) => item.result);
});
function openResult(page: DocPageId) {
  query.value = "";
  help.docPage = page;
}

// The window's place: where the user left it, else beside the Properties
// panel under the header; always kept on screen (its title bar reachable)
// First opening: this size, in the middle of the window
const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 620;
const MIN_WIDTH = 300;
const MIN_HEIGHT = 240;
const KEEP_VISIBLE = 48;
const EDGE_GAP = 8;
const panelRef = ref<HTMLElement | null>(null);
const viewport = ref({ width: window.innerWidth, height: window.innerHeight });

// Its size: what the user gave it, else its first size; kept within the window
const size = computed(() => {
  const wanted = help.panelSize ?? { width: PANEL_WIDTH, height: PANEL_HEIGHT };
  const maxWidth = viewport.value.width - 2 * EDGE_GAP;
  const maxHeight = viewport.value.height - 2 * EDGE_GAP;
  return {
    width: Math.round(Math.min(Math.max(wanted.width, MIN_WIDTH), maxWidth)),
    height: Math.round(Math.min(Math.max(wanted.height, MIN_HEIGHT), maxHeight)),
  };
});

const clampPos = (x: number, y: number) => ({
  x: Math.round(Math.min(Math.max(x, KEEP_VISIBLE - size.value.width), viewport.value.width - KEEP_VISIBLE)),
  y: Math.round(Math.min(Math.max(y, 0), viewport.value.height - KEEP_VISIBLE)),
});
const pos = computed(() => {
  const wanted = help.panelPos ?? {
    x: (viewport.value.width - size.value.width) / 2,
    y: (viewport.value.height - size.value.height) / 2,
  };
  return clampPos(wanted.x, wanted.y);
});

// Resizing: the edges dragged move, the opposite ones stay put
type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const EDGES: Edge[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
function startResize(event: PointerEvent, edge: Edge) {
  if (event.button !== 0 || !panelRef.value) return;
  const handle = event.currentTarget as HTMLElement;
  const box = panelRef.value.getBoundingClientRect();
  const from = { x: event.clientX, y: event.clientY };
  const maxWidth = viewport.value.width - 2 * EDGE_GAP;
  const maxHeight = viewport.value.height - 2 * EDGE_GAP;
  handle.setPointerCapture(event.pointerId);
  const onMove = (e: PointerEvent) => {
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    let { left, top, width, height } = box;
    if (edge.includes("e")) width = box.width + dx;
    if (edge.includes("s")) height = box.height + dy;
    if (edge.includes("w")) width = box.width - dx;
    if (edge.includes("n")) height = box.height - dy;
    width = Math.min(Math.max(width, MIN_WIDTH), maxWidth);
    height = Math.min(Math.max(height, MIN_HEIGHT), maxHeight);
    if (edge.includes("w")) left = box.right - width;
    if (edge.includes("n")) top = box.bottom - height;
    help.setPanelSize({ width: Math.round(width), height: Math.round(height) });
    help.setPanelPos(clampPos(left, top));
  };
  const onUp = () => {
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
  };
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
  event.preventDefault();
}

// Dragged by its title bar (not its buttons); the pointer is captured, so it
// keeps following over the canvas and panels
const dragging = ref(false);
function startDrag(event: PointerEvent) {
  if (event.button !== 0 || (event.target as Element).closest("button")) return;
  const header = event.currentTarget as HTMLElement;
  const from = { x: event.clientX, y: event.clientY };
  const origin = { ...pos.value };
  dragging.value = true;
  header.setPointerCapture(event.pointerId);
  const onMove = (e: PointerEvent) => {
    help.setPanelPos(clampPos(origin.x + e.clientX - from.x, origin.y + e.clientY - from.y));
  };
  const onUp = () => {
    dragging.value = false;
    header.removeEventListener("pointermove", onMove);
    header.removeEventListener("pointerup", onUp);
    header.removeEventListener("pointercancel", onUp);
  };
  header.addEventListener("pointermove", onMove);
  header.addEventListener("pointerup", onUp);
  header.addEventListener("pointercancel", onUp);
  event.preventDefault();
}

const onResize = () => (viewport.value = { width: window.innerWidth, height: window.innerHeight });

onMounted(() => {
  window.addEventListener("resize", onResize);
});
onBeforeUnmount(() => {
  window.removeEventListener("resize", onResize);
});

// A new page starts at its top
const bodyRef = ref<HTMLElement | null>(null);
watch([selectedPage, () => help.docPage, () => help.panelTab], () => {
  nextTick(() => bodyRef.value?.scrollTo({ top: 0 }));
});
</script>

<style scoped>
.help-panel {
  position: fixed;
  z-index: 950;
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  border: 1px solid #e6e5ee;
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 18px 38px rgba(23, 20, 44, 0.16),
    0 2px 6px rgba(23, 20, 44, 0.08);
  box-sizing: border-box;
  animation: help-in 0.18s ease;
}
@keyframes help-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.help-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 8px 6px 10px;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.help-resize {
  position: absolute;
  z-index: 2;
  touch-action: none;
}
.help-resize.is-n,
.help-resize.is-s {
  left: 12px;
  right: 12px;
  height: 8px;
  cursor: ns-resize;
}
.help-resize.is-n {
  top: -4px;
}
.help-resize.is-s {
  bottom: -4px;
}
.help-resize.is-e,
.help-resize.is-w {
  top: 12px;
  bottom: 12px;
  width: 8px;
  cursor: ew-resize;
}
.help-resize.is-e {
  right: -4px;
}
.help-resize.is-w {
  left: -4px;
}
.help-resize.is-ne,
.help-resize.is-nw,
.help-resize.is-se,
.help-resize.is-sw {
  width: 16px;
  height: 16px;
}
.help-resize.is-ne {
  top: -4px;
  right: -4px;
  cursor: nesw-resize;
}
.help-resize.is-sw {
  bottom: -4px;
  left: -4px;
  cursor: nesw-resize;
}
.help-resize.is-nw {
  top: -4px;
  left: -4px;
  cursor: nwse-resize;
}
.help-resize.is-se {
  right: -4px;
  bottom: -4px;
  cursor: nwse-resize;
}
.help-panel.is-dragging .help-head {
  cursor: grabbing;
}
.help-panel.is-dragging {
  box-shadow:
    0 26px 52px rgba(23, 20, 44, 0.24),
    0 2px 6px rgba(23, 20, 44, 0.1);
}
.help-grip {
  flex-shrink: 0;
  color: #b4afc6;
}
.help-title {
  flex: 1;
  margin: 0;
  color: #1c1b26;
  font-size: 14px;
  font-weight: 700;
}
.help-icon-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #6f6a7e;
  cursor: pointer;
}
.help-icon-btn:hover {
  background: rgba(124, 92, 247, 0.08);
  color: #6440f4;
}
.help-tabs {
  display: flex;
  gap: 2px;
  padding: 0 10px;
  border-bottom: 1px solid #e6e5ee;
}
.help-tab {
  flex: 1;
  padding: 8px 4px;
  margin-bottom: -1px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #6f6a7e;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}
.help-tab:hover {
  color: #1c1b26;
}
.help-tab.active {
  border-bottom-color: #6440f4;
  color: #6440f4;
}
.help-body {
  flex: 1;
  min-height: 0;
  padding: 12px 14px 14px;
  overflow-y: auto;
}
.help-index {
  display: grid;
  gap: 14px;
}
.help-search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e6e5ee;
  border-radius: 9px;
  background: #f7f7fa;
  color: #8a84a3;
}
.help-search:focus-within {
  border-color: rgba(124, 92, 247, 0.5);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(124, 92, 247, 0.14);
}
.help-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #1c1b26;
  font-size: 13px;
}
.help-no-results {
  margin: 0;
  color: #6f6a7e;
  font-size: 13px;
}
.help-result {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 9px 10px;
  border: 1px solid #e6e5ee;
  border-radius: 9px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
}
.help-result:hover {
  border-color: rgba(124, 92, 247, 0.4);
}
.help-result strong {
  color: #1c1b26;
  font-size: 13px;
}
.help-result span {
  display: -webkit-box;
  overflow: hidden;
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.45;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.help-result small {
  color: #6440f4;
  font-size: 11.5px;
  font-weight: 600;
}
.help-group {
  display: grid;
  gap: 4px;
}
.help-group h4 {
  margin: 0 0 2px;
  color: #6f6a7e;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.help-index-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #1c1b26;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}
.help-index-item:hover {
  background: rgba(124, 92, 247, 0.07);
}
.help-index-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(124, 92, 247, 0.1);
  color: #6440f4;
}
.help-index-go {
  margin-left: auto;
  color: #9a94ab;
}
.help-icon-btn:focus-visible,
.help-tab:focus-visible,
.help-index-item:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .help-panel {
    animation: none;
  }
}
</style>

<style>
/* Shared by the panel's views: the way back to a list */
.help-back {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 5px;
  margin-bottom: 8px;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: #6440f4;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.help-back:hover {
  text-decoration: underline;
}
</style>
