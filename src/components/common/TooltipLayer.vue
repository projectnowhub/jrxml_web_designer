<template>
  <!-- Every `title` in the app as a tooltip in the app's white look. The
       browser draws its own (black, can't be styled) for any `title` attribute,
       so every title is moved to data-app-title the moment it appears, and
       only this card is ever shown. -->
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

// Where a title is kept instead: the browser only draws its own (black)
// tooltip for a `title` attribute, so none is ever left in the page
const TEXT_ATTR = "data-app-title";
// Marks an aria-label this layer added (an icon-only element named by its title)
const NAMED_ATTR = "data-app-title-named";

const tip = ref<{ text: string; x: number; y: number; side: "top" | "bottom"; arrowX: number; placed: boolean } | null>(null);
const tipRef = ref<HTMLElement | null>(null);

let current: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastHidden = 0;
let observer: MutationObserver | null = null;

// ---- Titles out of the page --------------------------------------------------

// The title moves to data-app-title. An element with no other name (an icon
// button) keeps it for screen readers as its aria-label
function moveTitle(el: Element) {
  const title = el.getAttribute("title");
  if (title === null) return;
  el.removeAttribute("title");
  el.setAttribute(TEXT_ATTR, title);
  const named = el.hasAttribute(NAMED_ATTR);
  if (named || (!el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby") && !el.textContent?.trim())) {
    if (title.trim()) {
      el.setAttribute("aria-label", title);
      el.setAttribute(NAMED_ATTR, "");
    } else if (named) {
      el.removeAttribute("aria-label");
      el.removeAttribute(NAMED_ATTR);
    }
  }
  if (el === current) refreshTip();
}

// The page removed a title: its kept text (and the name added for it) go too
function dropTitle(el: Element) {
  el.removeAttribute(TEXT_ATTR);
  if (el.hasAttribute(NAMED_ATTR)) {
    el.removeAttribute("aria-label");
    el.removeAttribute(NAMED_ATTR);
  }
  if (el === current) refreshTip();
}

function moveTitlesIn(root: Element) {
  if (root.hasAttribute("title")) moveTitle(root);
  root.querySelectorAll("[title]").forEach(moveTitle);
}

function onMutations(records: MutationRecord[]) {
  // Each element once, by how it ends up (a title set twice in a row is one
  // change, not a removal): read every record first, then move or drop
  const changed = new Map<Element, boolean>();
  const added: Element[] = [];
  for (const record of records) {
    if (record.type === "attributes") {
      const el = record.target as Element;
      changed.set(el, (changed.get(el) ?? false) || record.oldValue !== null);
    } else {
      record.addedNodes.forEach((node) => node instanceof Element && added.push(node));
    }
  }
  changed.forEach((hadTitle, el) => {
    if (el.hasAttribute("title")) moveTitle(el);
    else if (hadTitle) dropTitle(el);
  });
  added.forEach(moveTitlesIn);
  // Our own changes are not the page's: their records are dropped
  observer?.takeRecords();
}

// ---- The tooltip ---------------------------------------------------------------

// The help hover card (HintLayer) shows for this element instead
function hintCardFor(el: HTMLElement): boolean {
  if (!help.tutorialMode) return false;
  const root = el.closest<HTMLElement>("[data-hint]");
  if (!root || !te(`helpDocs.tools.${root.dataset.hint}.title`)) return false;
  const menuOpen = root.getAttribute("aria-expanded") === "true" || !!root.querySelector('[aria-expanded="true"]');
  return !menuOpen;
}

const textOf = (el: HTMLElement) => el.getAttribute(TEXT_ATTR)?.trim() ?? "";

function hide() {
  clearTimeout(timer);
  timer = undefined;
  if (tip.value) lastHidden = Date.now();
  tip.value = null;
}

function show(el: HTMLElement) {
  const text = textOf(el);
  if (!el.isConnected || !text) return;
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

// The hovered element's text changed while its tooltip shows
function refreshTip() {
  if (!current || !tip.value) return;
  if (textOf(current)) show(current);
  else hide();
}

function onOver(event: PointerEvent) {
  if (event.pointerType === "touch") return;
  const el = (event.target as Element | null)?.closest?.<HTMLElement>(`[${TEXT_ATTR}]`) ?? null;
  if (el === current) return;
  hide();
  current = el;
  if (!el || !textOf(el) || hintCardFor(el)) return;
  const wait = Date.now() - lastHidden < WARM ? 0 : DELAY;
  timer = setTimeout(() => current === el && show(el), wait);
}

function onOut(event: PointerEvent) {
  const to = event.relatedTarget as Node | null;
  if (current && to && current.contains(to)) return;
  current = null;
  hide();
}

// Clicking, typing, scrolling or dragging: the tooltip gets out of the way
function dismiss() {
  if (!tip.value && !timer) return;
  clearTimeout(timer);
  timer = undefined;
  tip.value = null;
}

onMounted(() => {
  moveTitlesIn(document.body);
  observer = new MutationObserver(onMutations);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["title"],
    attributeOldValue: true,
  });
  // Capture: a component stopping the event can't keep its tooltip from showing
  document.addEventListener("pointerover", onOver, true);
  document.addEventListener("pointerout", onOut, true);
  document.addEventListener("mousedown", dismiss, true);
  document.addEventListener("dragstart", dismiss, true);
  document.addEventListener("keydown", dismiss, true);
  window.addEventListener("scroll", dismiss, true);
  window.addEventListener("blur", hide);
});

onBeforeUnmount(() => {
  hide();
  observer?.disconnect();
  observer = null;
  document.removeEventListener("pointerover", onOver, true);
  document.removeEventListener("pointerout", onOut, true);
  document.removeEventListener("mousedown", dismiss, true);
  document.removeEventListener("dragstart", dismiss, true);
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
