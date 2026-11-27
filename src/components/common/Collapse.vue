<template>
  <Transition
    :css="false"
    @enter="enter"
    @leave="leave"
    @enter-cancelled="finish"
    @leave-cancelled="finish"
  >
    <slot />
  </Transition>
</template>

<script setup lang="ts">
// Folds its one child open and shut (v-if or v-show), animating its height
// (or width, for side panels) and fading it. Instant when the user asks the
// system for less motion.
const props = withDefaults(defineProps<{ axis?: "height" | "width"; duration?: number }>(), {
  axis: "height",
  duration: 220,
});

const saved = new WeakMap<Element, { size: string; overflow: string; opacity: string; transition: string }>();

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function finish(el: Element) {
  const s = (el as HTMLElement).style;
  const before = saved.get(el);
  if (!before) return;
  // Put back the element's own inline values (a panel keeps its width there)
  s[props.axis] = before.size;
  s.overflow = before.overflow;
  s.opacity = before.opacity;
  s.transition = before.transition;
  saved.delete(el);
}

function run(el: Element, from: string, to: string, opacityTo: string, done: () => void) {
  const s = (el as HTMLElement).style;
  s[props.axis] = from;
  s.overflow = "hidden";
  s.opacity = opacityTo === "1" ? "0" : "1";
  void (el as HTMLElement).offsetHeight; // start from the values above
  const ms = props.duration;
  s.transition = `${props.axis} ${ms}ms cubic-bezier(0.2, 0, 0, 1), opacity ${ms}ms ease`;
  s[props.axis] = to;
  s.opacity = opacityTo;
  let ended = false;
  const end = (e?: Event) => {
    if (ended || (e && e.target !== el)) return;
    ended = true;
    el.removeEventListener("transitionend", end);
    finish(el);
    done();
  };
  el.addEventListener("transitionend", end);
  setTimeout(end, ms + 60);
}

function remember(el: Element) {
  const s = (el as HTMLElement).style;
  finish(el);
  saved.set(el, { size: s[props.axis], overflow: s.overflow, opacity: s.opacity, transition: s.transition });
}

function measure(el: Element) {
  const h = el as HTMLElement;
  return props.axis === "height" ? h.scrollHeight : h.getBoundingClientRect().width;
}

function enter(el: Element, done: () => void) {
  if (reduced()) return done();
  remember(el);
  const size = measure(el);
  run(el, "0px", `${size}px`, "1", done);
}

function leave(el: Element, done: () => void) {
  if (reduced()) return done();
  remember(el);
  const size = props.axis === "height" ? (el as HTMLElement).offsetHeight : measure(el);
  run(el, `${size}px`, "0px", "0", done);
}
</script>
