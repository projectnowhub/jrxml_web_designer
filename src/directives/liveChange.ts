// v-live-change: a settings field applies its value once the user stops
// typing, as well as on Enter or leaving the field. After a short pause the
// field's own "change" handling runs (the same code as Enter), so each field
// keeps its rules: its checks, clamping and one undo step per change. Enter
// and leaving the field still run it as before (the handlers do nothing when
// the value is already applied, and put back a refused value then).
//
// It waits while a value can't be meant yet: an empty field (the user may be
// about to type again), and for number fields "-", "1." or a number below the
// field's `min` (typing 120 passes through 1 and 12). A field that should wait
// for more, such as a paper size (59 on the way to 595 would squeeze the
// page), gives its own lower bound: v-live-change="{ atLeast: 100 }".
// Such values are applied on Enter or leaving the field, as before.

import type { Directive } from "vue";

export const LIVE_CHANGE_PAUSE_MS = 700;

interface LiveChangeOptions {
  atLeast?: number;
}

type Field = HTMLInputElement | HTMLTextAreaElement;

interface State {
  applied: string;
  timer: ReturnType<typeof setTimeout> | null;
  composing: boolean;
  atLeast?: number;
  listeners: [string, EventListener, boolean][];
}

const states = new WeakMap<Field, State>();

// Whether the field holds a value the user can mean already
function ready(el: Field, atLeast?: number): boolean {
  const text = el.value.trim();
  if (!text) return false;
  if (!(el instanceof HTMLInputElement && el.type === "number")) return true;
  const n = Number(text);
  if (!Number.isFinite(n) || /[.\-]$/.test(text)) return false;
  const min = el.min !== "" ? Number(el.min) : undefined;
  if (min !== undefined && Number.isFinite(min) && n < min) return false;
  return atLeast === undefined || n >= atLeast;
}

function applyNow(el: Field, state: State) {
  state.timer = null;
  if (!el.isConnected || el.value === state.applied || !ready(el, state.atLeast)) return;
  state.applied = el.value;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

export const vLiveChange: Directive<Field, LiveChangeOptions | undefined> = {
  mounted(el, binding) {
    const state: State = { applied: el.value, timer: null, composing: false, atLeast: binding.value?.atLeast, listeners: [] };
    states.set(el, state);
    const on = (type: string, listener: EventListener, capture = false) => {
      el.addEventListener(type, listener, capture);
      state.listeners.push([type, listener, capture]);
    };
    const wait = () => {
      if (state.timer) clearTimeout(state.timer);
      state.timer = setTimeout(() => applyNow(el, state), LIVE_CHANGE_PAUSE_MS);
    };
    on("focus", () => {
      state.applied = el.value;
    });
    on("input", () => {
      if (state.composing) return;
      wait();
    });
    // An input method (Chinese, Japanese…) composing a word: wait for the word
    on("compositionstart", () => {
      state.composing = true;
      if (state.timer) clearTimeout(state.timer);
    });
    on("compositionend", () => {
      state.composing = false;
      wait();
    });
    // Enter or leaving the field: the field's handling runs now, so the pause
    // has nothing left to do (a capture listener on the field runs first)
    on(
      "change",
      (event) => {
        if (!event.isTrusted) return;
        if (state.timer) clearTimeout(state.timer);
        state.timer = null;
        state.applied = el.value;
      },
      true,
    );
  },
  updated(el, binding) {
    const state = states.get(el);
    if (state) state.atLeast = binding.value?.atLeast;
  },
  beforeUnmount(el) {
    const state = states.get(el);
    if (!state) return;
    // Typed just before the field goes away: applied, not lost
    if (state.timer) {
      clearTimeout(state.timer);
      applyNow(el, state);
    }
    for (const [type, listener, capture] of state.listeners) el.removeEventListener(type, listener, capture);
    states.delete(el);
  },
};
