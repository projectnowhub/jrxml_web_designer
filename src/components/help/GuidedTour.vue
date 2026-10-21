<template>
  <!-- The guided tour: the screen dimmed except the part a step is about,
       and a card next to it with one plain sentence. Nothing else can be
       clicked or typed while it runs (Esc closes it). -->
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="step" class="tour-layer">
        <div v-if="hole" class="tour-hole" :style="holeStyle" aria-hidden="true" />
        <div v-else class="tour-dim" aria-hidden="true" />

        <div
          ref="cardRef"
          class="tour-card"
          :class="{ 'is-centred': !hole, 'is-placing': hole && !cardPos }"
          :style="cardStyle"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="textId"
        >
          <div class="tour-card-top">
            <span class="tour-count">
              {{ t("help.tour.stepOf", { n: help.stepIndex + 1, total: help.steps.length }) }}
            </span>
            <button
              type="button"
              class="tour-close"
              :title="t('help.tour.close')"
              :aria-label="t('help.tour.close')"
              @click="help.endTour()"
            >
              <X :size="16" :stroke-width="2.25" aria-hidden="true" />
            </button>
          </div>

          <h3 :id="titleId" class="tour-title">{{ t(`${textBase}Title`) }}</h3>
          <p :id="textId" class="tour-text">{{ t(`${textBase}Text`) }}</p>

          <div class="tour-dots" aria-hidden="true">
            <i
              v-for="(_, index) in help.steps"
              :key="index"
              :class="{ 'is-done': index < help.stepIndex, 'is-now': index === help.stepIndex }"
            />
          </div>

          <div class="tour-actions">
            <button v-if="!isLast" type="button" class="tour-skip" @click="help.endTour()">
              {{ isWelcome ? t("help.tour.notNow") : t("help.tour.skip") }}
            </button>
            <span class="tour-spacer" />
            <button
              v-if="help.stepIndex > 0"
              type="button"
              class="tour-btn tour-back"
              @click="help.previousStep()"
            >
              <ArrowLeft :size="15" :stroke-width="2.25" aria-hidden="true" />
              {{ t("help.tour.back") }}
            </button>
            <button ref="nextRef" type="button" class="tour-btn tour-next" @click="help.nextStep()">
              <template v-if="isLast">
                <Check :size="15" :stroke-width="2.5" aria-hidden="true" />
                {{ t("help.tour.done") }}
              </template>
              <template v-else>
                {{ isWelcome ? t("help.tour.start") : t("help.tour.next") }}
                <ArrowRight :size="15" :stroke-width="2.25" aria-hidden="true" />
              </template>
            </button>
          </div>
          <!-- First card only: experienced users switch the tutorial off here -->
          <button v-if="isWelcome" type="button" class="tour-off" @click="turnTutorialOff">
            {{ t("help.tour.turnOff") }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowLeft, ArrowRight, Check, X } from "@lucide/vue";
import { useHelpStore } from "@/stores/help";
import { findTourTarget, type TourSide } from "@/utils/helpTours";
import notification from "@/utils/notification";

const { t } = useI18n();
const help = useHelpStore();

const titleId = "tour-title";
const textId = "tour-text";
// Room kept around the highlighted part, between it and the card, and from the window's edge
const HOLE_PAD = 6;
const CARD_GAP = 14;
const EDGE = 16;

const cardRef = ref<HTMLElement | null>(null);
const nextRef = ref<HTMLButtonElement | null>(null);
const hole = ref<{ top: number; left: number; width: number; height: number } | null>(null);
const cardPos = ref<{ top: number; left: number } | null>(null);

const step = computed(() => (help.tourId ? help.steps[help.stepIndex] ?? null : null));
const textBase = computed(() => `help.tours.${help.tourId}.${step.value?.key}`);
const isWelcome = computed(() => help.stepIndex === 0 && !step.value?.target);
const isLast = computed(() => help.stepIndex === help.steps.length - 1);

const holeStyle = computed(() =>
  hole.value
    ? {
        top: `${hole.value.top}px`,
        left: `${hole.value.left}px`,
        width: `${hole.value.width}px`,
        height: `${hole.value.height}px`,
      }
    : {},
);
const cardStyle = computed(() =>
  hole.value && cardPos.value
    ? { top: `${cardPos.value.top}px`, left: `${cardPos.value.left}px` }
    : {},
);

function turnTutorialOff() {
  help.setTutorialMode(false);
  notification.info(t("help.menu.tutorialOffDone"));
}

// The highlighted part: the target's box, kept inside the window
function measureHole() {
  const target = step.value?.target ? findTourTarget(step.value.target) : null;
  if (!target) {
    hole.value = null;
    return;
  }
  const rect = target.getBoundingClientRect();
  const top = Math.max(4, rect.top - HOLE_PAD);
  const left = Math.max(4, rect.left - HOLE_PAD);
  const bottom = Math.min(window.innerHeight - 4, rect.bottom + HOLE_PAD);
  const right = Math.min(window.innerWidth - 4, rect.right + HOLE_PAD);
  hole.value = { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

// The card goes on the step's side when it fits there, else on another side,
// else inside the highlighted part (the page can fill the whole window)
function placeCard() {
  const card = cardRef.value;
  const box = hole.value;
  if (!card || !box) {
    cardPos.value = null;
    return;
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cw = card.offsetWidth;
  const ch = card.offsetHeight;
  const centreX = clamp(box.left + box.width / 2 - cw / 2, EDGE, vw - cw - EDGE);
  const centreY = clamp(box.top + box.height / 2 - ch / 2, EDGE, vh - ch - EDGE);
  const spots: Record<TourSide, { top: number; left: number; fits: boolean }> = {
    bottom: { top: box.top + box.height + CARD_GAP, left: centreX, fits: box.top + box.height + CARD_GAP + ch <= vh - EDGE },
    top: { top: box.top - CARD_GAP - ch, left: centreX, fits: box.top - CARD_GAP - ch >= EDGE },
    right: { top: centreY, left: box.left + box.width + CARD_GAP, fits: box.left + box.width + CARD_GAP + cw <= vw - EDGE },
    left: { top: centreY, left: box.left - CARD_GAP - cw, fits: box.left - CARD_GAP - cw >= EDGE },
  };
  const order: TourSide[] = [step.value?.side ?? "bottom", "bottom", "right", "left", "top"];
  const side = order.find((name) => spots[name].fits);
  cardPos.value = side
    ? { top: spots[side].top, left: spots[side].left }
    : {
        top: clamp(box.top + box.height - ch - 24, EDGE, vh - ch - EDGE),
        left: centreX,
      };
}

function layout() {
  measureHole();
  nextTick(placeCard);
}

let settleTimer: ReturnType<typeof setTimeout> | undefined;
let lastFocus: HTMLElement | null = null;

watch(
  step,
  async (now, before) => {
    if (now && !before) lastFocus = document.activeElement as HTMLElement | null;
    if (!now) {
      cardPos.value = null;
      if (before) lastFocus?.focus?.({ preventScroll: true });
      return;
    }
    const target = now.target ? findTourTarget(now.target) : null;
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
    await nextTick();
    layout();
    nextRef.value?.focus({ preventScroll: true });
    // Again once menus and panels have finished moving
    clearTimeout(settleTimer);
    settleTimer = setTimeout(layout, 350);
  },
  { flush: "post" },
);

// While the tour runs, keys belong to it: the designer's shortcuts (Delete,
// arrows…) must not act on the page behind it
function onKeydown(event: KeyboardEvent) {
  if (!step.value) return;
  event.stopPropagation();
  if (event.key === "Escape") {
    event.preventDefault();
    help.endTour();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    help.nextStep();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    help.previousStep();
  } else if (event.key === "Tab") {
    // Keep the keyboard on the card's buttons
    const buttons = [...(cardRef.value?.querySelectorAll<HTMLElement>("button") ?? [])];
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey ? index - 1 : index + 1;
    event.preventDefault();
    buttons[(next + buttons.length) % buttons.length]?.focus();
  }
}

const onWindowChange = () => {
  if (step.value) layout();
};

watch(
  () => !!step.value,
  (running) => {
    if (running) {
      window.addEventListener("keydown", onKeydown, true);
      window.addEventListener("resize", onWindowChange);
      window.addEventListener("scroll", onWindowChange, true);
    } else {
      window.removeEventListener("keydown", onKeydown, true);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
    }
  },
);

onBeforeUnmount(() => {
  clearTimeout(settleTimer);
  window.removeEventListener("keydown", onKeydown, true);
  window.removeEventListener("resize", onWindowChange);
  window.removeEventListener("scroll", onWindowChange, true);
});
</script>

<style scoped>
.tour-layer {
  position: fixed;
  inset: 0;
  z-index: 3000;
}
.tour-dim {
  position: absolute;
  inset: 0;
  background: rgba(23, 20, 44, 0.55);
}
/* The highlighted part: a clear window in the dimmed screen, ringed in purple */
.tour-hole {
  position: fixed;
  border-radius: 10px;
  box-shadow:
    0 0 0 2px #7c5cf7,
    0 0 0 6px rgba(124, 92, 247, 0.28),
    0 0 0 200vmax rgba(23, 20, 44, 0.55);
  pointer-events: none;
  transition:
    top 0.28s ease,
    left 0.28s ease,
    width 0.28s ease,
    height 0.28s ease;
}
.tour-card {
  position: fixed;
  width: min(340px, calc(100vw - 32px));
  padding: 16px 18px 14px;
  border: 1px solid #e6e5ee;
  border-radius: 12px;
  background: #ffffff;
  color: #1c1b26;
  box-shadow:
    0 24px 48px rgba(23, 20, 44, 0.24),
    0 2px 8px rgba(23, 20, 44, 0.1);
  box-sizing: border-box;
  transition:
    top 0.28s ease,
    left 0.28s ease;
  animation: tour-card-in 0.2s ease;
}
/* Measured before it is shown, so it never jumps in from the corner */
.tour-card.is-placing {
  visibility: hidden;
}
.tour-card.is-centred {
  top: 50%;
  left: 50%;
  width: min(400px, calc(100vw - 32px));
  transform: translate(-50%, -50%);
  transition: none;
}
@keyframes tour-card-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.tour-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.tour-count {
  color: #6440f4;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.tour-close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin: -4px -6px 0 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #6f6a7e;
  cursor: pointer;
}
.tour-close:hover {
  background: rgba(124, 92, 247, 0.08);
  color: #6440f4;
}
.tour-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
}
.tour-text {
  margin: 0;
  color: #45425a;
  font-size: 14px;
  line-height: 1.55;
}
.tour-dots {
  display: flex;
  gap: 5px;
  margin: 14px 0 12px;
}
.tour-dots i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #e6e5ee;
  transition:
    width 0.2s ease,
    background 0.2s ease;
}
.tour-dots i.is-done {
  background: #c9bdfb;
}
.tour-dots i.is-now {
  width: 18px;
  border-radius: 4px;
  background: #6440f4;
}
.tour-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tour-spacer {
  flex: 1;
}
.tour-skip {
  padding: 6px 4px;
  border: 0;
  background: transparent;
  color: #6f6a7e;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.tour-skip:hover {
  color: #1c1b26;
  text-decoration: underline;
}
.tour-off {
  display: block;
  margin: 10px auto 0;
  padding: 2px 4px;
  border: 0;
  background: transparent;
  color: #6f6a7e;
  font-size: 12px;
  cursor: pointer;
}
.tour-off:hover {
  color: #6440f4;
  text-decoration: underline;
}
.tour-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.tour-back {
  border: 1px solid #e6e5ee;
  background: #ffffff;
  color: #45425a;
}
.tour-back:hover {
  border-color: rgba(124, 92, 247, 0.4);
  color: #6440f4;
}
.tour-next {
  border: 0;
  background: linear-gradient(135deg, #7c5cf7, #6440f4);
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(100, 64, 244, 0.28);
}
.tour-next:hover {
  filter: brightness(1.06);
}
.tour-btn:focus-visible,
.tour-skip:focus-visible,
.tour-close:focus-visible {
  outline: 2px solid #7c5cf7;
  outline-offset: 2px;
}

.tour-fade-enter-active,
.tour-fade-leave-active {
  transition: opacity 0.2s ease;
}
.tour-fade-enter-from,
.tour-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .tour-hole,
  .tour-card,
  .tour-dots i,
  .tour-fade-enter-active,
  .tour-fade-leave-active {
    transition: none;
    animation: none;
  }
}
</style>
