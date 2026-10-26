<template>
  <!-- Every `title` in the app as a tooltip in the app's light look (the
       browser draws its own in black and can't be styled): the title is held
       back while the pointer is on the element and put back after. -->
  <Teleport to="body">
    <div
      v-if="tip"
      ref="tipRef"
      class="app-tooltip"
      :class="[`is-${tip.side}`, { 'is-placed': tip.placed }]"
      role="tooltip"
      :style="{ left: `${tip.x}px`, top: `${tip.y}px`, '--arrow-x': `${tip.arrowX}px` }"
    >
      {{ tip.text }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useHelpStore } from "@/stores/help";

const { te } = useI18n();
const help = useHelpStore();

// A pause before the first tooltip; moving straight on to the next element
// shows its tooltip at once
const DELAY = 380;
const WARM = 400;
const GAP = 8;
const EDGE = 8;

const tip = ref<{ text: string; x: number; y: number; side: "top" | "bottom"; arrowX: number; placed: boolean } | null>(null);
const tipRef = ref<HTMLElement | null>(null);

let current: HTMLElement | null = null;
let held: { el: HTMLElement; title: string } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastHidden = 0;

// The help hover card (HintLayer) shows for this element instead
function hintCardFor(el: HTMLElement): boolean {
  if (!help.tutorialMode) return false;
  const root = el.closest<HTMLElement>("[data-hint]");
  if (!root || !te(`helpDocs.tools.${root.dataset.hint}.title`)) return false;
  const menuOpen = root.getAttribute("aria-expanded") === "true" || !!root.querySelector('[aria-expanded="true"]');
  return !menuOpen;
}

function release() {
  if (held) {
    // Put the title back unless the page has given it a new one meanwhile
    if (!held.el.hasAttribute("title")) held.el.setAttribute("title", held.title);
    held = null;
  }
}

function hide() {
  clearTimeout(timer);
  if (tip.value) lastHidden = Date.now();
  tip.value = null;
  release();
}

function show(el: HTMLElement, text: string) {
  if (!el.isConnected) return;
  const rect = el.getBoundingClientRect();
  tip.value = { text, x: -9999, y: -9999, side: "top", arrowX: 0, placed: false };
  nextTick(() => {
    const card = tipRef.value;
    if (!card || !tip.value) return;
    const { width, height } = card.getBoundingClientRect();
    const centre = rect.left + rect.width / 2;
    let side: "top" | "bottom" = "top";
    let y = rect.top - GAP - height;
    if (y < EDGE) {
      side = "bottom";
      y = rect.bottom + GAP;
    }
    const x = Math.max(EDGE, Math.min(centre - width / 2, window.innerWidth - width - EDGE));
    const arrowX = Math.max(10, Math.min(centre - x, width - 10));
    tip.value = { text, x, y, side, arrowX, placed: true };
  });
}

function onOver(event: MouseEvent) {
  const el = (event.target as Element | null)?.closest?.<HTMLElement>("[title]") ?? null;
  if (el === current) return;
  hide();
  current = el;
  if (!el) return;
  const text = el.getAttribute("title")?.trim() ?? "";
  if (!text) return;
  // The browser's own tooltip never appears
  held = { el, title: el.getAttribute("title")! };
  el.removeAttribute("title");
  if (hintCardFor(el)) return;
  const wait = Date.now() - lastHidden < WARM ? 0 : DELAY;
  timer = setTimeout(() => show(el, text), wait);
}

function onOut(event: MouseEvent) {
  const to = event.relatedTarget as Node | null;
  if (current && to && current.contains(to)) return;
  current = null;
  hide();
}

// Clicking, typing or scrolling: the tooltip gets out of the way
function dismiss() {
  if (!tip.value && !timer) return;
  clearTimeout(timer);
  tip.value = null;
}

onMounted(() => {
  document.addEventListener("mouseover", onOver);
  document.addEventListener("mouseout", onOut);
  document.addEventListener("mousedown", dismiss, true);
  document.addEventListener("keydown", dismiss, true);
  window.addEventListener("scroll", dismiss, true);
  window.addEventListener("blur", hide);
});

onBeforeUnmount(() => {
  hide();
  document.removeEventListener("mouseover", onOver);
  document.removeEventListener("mouseout", onOut);
  document.removeEventListener("mousedown", dismiss, true);
  document.removeEventListener("keydown", dismiss, true);
  window.removeEventListener("scroll", dismiss, true);
  window.removeEventListener("blur", hide);
});
</script>

<style scoped>
.app-tooltip {
  position: fixed;
  z-index: 2700;
  width: max-content;
  max-width: 260px;
  padding: 6px 10px;
  border-radius: 8px;
  background: #ffffff;
  color: #1c1b26;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
  white-space: pre-line;
  overflow-wrap: anywhere;
  box-shadow:
    0 0 0 1px rgba(28, 27, 38, 0.08),
    0 8px 24px rgba(23, 20, 44, 0.14),
    0 2px 6px rgba(23, 20, 44, 0.06);
  pointer-events: none;
  visibility: hidden;
}

.app-tooltip.is-placed {
  visibility: visible;
  animation: tooltip-in 0.14s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.app-tooltip.is-top {
  transform-origin: var(--arrow-x) 100%;
}

.app-tooltip.is-bottom {
  transform-origin: var(--arrow-x) 0;
}

/* The arrow: a small turned square pointing at the element */
.app-tooltip::after {
  content: "";
  position: absolute;
  left: var(--arrow-x);
  width: 8px;
  height: 8px;
  margin-left: -4px;
  background: #ffffff;
  transform: rotate(45deg);
}

.app-tooltip.is-top::after {
  bottom: -4px;
  box-shadow: 1px 1px 0 0 rgba(28, 27, 38, 0.08);
}

.app-tooltip.is-bottom::after {
  top: -4px;
  box-shadow: -1px -1px 0 0 rgba(28, 27, 38, 0.08);
}

@keyframes tooltip-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-tooltip.is-placed {
    animation: none;
  }
}
</style>
