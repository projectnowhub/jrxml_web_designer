<template>
  <!-- Hover cards for the toolbar: any element with data-hint="<tool>" shows,
       after a short pause, the tool's name, what it does and its keys
       (helpDocs.tools.<tool>). Its own tooltips are held back meanwhile.
       Part of Tutorial mode: off, the tools keep their plain tooltips. -->
  <Teleport to="body">
    <div v-if="hint" ref="cardRef" class="hint-card" role="tooltip" :style="{ left: `${hint.x}px`, top: `${hint.y}px` }">
      <strong>{{ t(`helpDocs.tools.${hint.id}.title`) }}</strong>
      <span>{{ t(`helpDocs.tools.${hint.id}.text`) }}</span>
      <span v-for="part in tool?.parts ?? []" :key="part" class="hint-part">
        <strong>{{ t(`helpDocs.tools.${hint.id}.parts.${part}.title`) }}</strong>
        <span>{{ t(`helpDocs.tools.${hint.id}.parts.${part}.text`) }}</span>
      </span>
      <span v-if="keys" class="hint-keys">
        <template v-for="(combo, ci) in keys" :key="ci">
          <span v-if="ci > 0" class="hint-keys-or">/</span>
          <kbd v-for="key in combo" :key="key">{{ keyLabel(key) }}</kbd>
        </template>
      </span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { keyLabel, TOOLS, type ToolId } from "@/utils/helpDocs";
import { useHelpStore } from "@/stores/help";

const { t, te } = useI18n();
const help = useHelpStore();

const DELAY = 450;
const GAP = 8;
const EDGE = 8;

const hint = ref<{ id: ToolId; x: number; y: number } | null>(null);
const cardRef = ref<HTMLElement | null>(null);
const tool = computed(() => TOOLS.find((item) => item.id === hint.value?.id));
const keys = computed(() => tool.value?.keys);

let current: HTMLElement | null = null;
// After a click on a tool, its card stays away until the pointer leaves it
let quiet: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
// Tooltips (title) held back while the card shows, put back after
const heldTitles = new Map<Element, string>();

function holdTitles(root: HTMLElement) {
  for (const el of [root, ...root.querySelectorAll("[title]")]) {
    const title = el.getAttribute("title");
    if (title === null) continue;
    heldTitles.set(el, title);
    el.removeAttribute("title");
  }
}

function restoreTitles() {
  for (const [el, title] of heldTitles) el.setAttribute("title", title);
  heldTitles.clear();
}

// The tool's menu is open (File, Page, Snap & grid): its items are being
// chosen, so no card over them
const menuOpen = (root: HTMLElement) =>
  root.getAttribute("aria-expanded") === "true" || !!root.querySelector('[aria-expanded="true"]');

function show(root: HTMLElement) {
  if (menuOpen(root)) return;
  const id = root.dataset.hint as ToolId;
  if (!te(`helpDocs.tools.${id}.title`)) return;
  holdTitles(root);
  const rect = root.getBoundingClientRect();
  hint.value = { id, x: rect.left, y: rect.bottom + GAP };
  nextTick(() => {
    const card = cardRef.value;
    if (!card || !hint.value) return;
    const { width, height } = card.getBoundingClientRect();
    let x = rect.left + rect.width / 2 - width / 2;
    let y = rect.bottom + GAP;
    if (y + height > window.innerHeight - EDGE) y = rect.top - GAP - height;
    x = Math.max(EDGE, Math.min(x, window.innerWidth - width - EDGE));
    hint.value = { ...hint.value, x, y };
  });
}

function hide() {
  clearTimeout(timer);
  hint.value = null;
  restoreTitles();
}

function onOver(event: MouseEvent) {
  const root = (event.target as Element | null)?.closest?.<HTMLElement>("[data-hint]") ?? null;
  if (root === current) return;
  hide();
  current = root;
  if (!root || root === quiet || !help.tutorialMode || menuOpen(root)) return;
  timer = setTimeout(() => show(root), DELAY);
}

function onOut(event: MouseEvent) {
  const to = event.relatedTarget as Node | null;
  if (current && to && current.contains(to)) return;
  if (current === quiet) quiet = null;
  current = null;
  hide();
}

// A click opens the tool's own menu: the card gets out of the way
function onPress() {
  if (!current) return;
  quiet = current;
  hide();
}

onMounted(() => {
  document.addEventListener("mouseover", onOver);
  document.addEventListener("mouseout", onOut);
  document.addEventListener("mousedown", onPress, true);
  document.addEventListener("keydown", hide, true);
  window.addEventListener("scroll", hide, true);
});

onBeforeUnmount(() => {
  hide();
  document.removeEventListener("mouseover", onOver);
  document.removeEventListener("mouseout", onOut);
  document.removeEventListener("mousedown", onPress, true);
  document.removeEventListener("keydown", hide, true);
  window.removeEventListener("scroll", hide, true);
});
</script>

<style scoped>
.hint-card {
  position: fixed;
  z-index: 2600;
  display: grid;
  gap: 3px;
  width: max-content;
  max-width: 300px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #ffffff;
  color: #45425a;
  font-size: 12.5px;
  line-height: 1.45;
  box-shadow:
    0 0 0 1px rgba(28, 27, 38, 0.08),
    0 12px 28px rgba(23, 20, 44, 0.14),
    0 2px 6px rgba(23, 20, 44, 0.06);
  pointer-events: none;
  animation: hint-in 0.14s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes hint-in {
  from {
    opacity: 0;
    transform: translateY(-2px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.hint-card strong {
  color: #1c1b26;
  font-size: 13px;
  font-weight: 700;
}
.hint-part {
  display: grid;
  gap: 1px;
  margin-top: 6px;
  padding-left: 8px;
  border-left: 2px solid #c9bcff;
  color: #45425a;
}
.hint-part strong {
  color: #1c1b26;
  font-size: 12.5px;
}
.hint-keys {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  margin-top: 4px;
}
.hint-keys kbd {
  padding: 1px 6px;
  border: 1px solid #e6e5ee;
  border-bottom-width: 2px;
  border-radius: 5px;
  background: #f7f6fb;
  color: #3b2a99;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
}
.hint-keys-or {
  margin: 0 3px;
  color: #9a98a8;
}
@media (prefers-reduced-motion: reduce) {
  .hint-card {
    animation: none;
  }
}
</style>
