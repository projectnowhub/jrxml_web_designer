<template>
  <div 
    class="resizable-panel" 
    :class="[
      `resizable-panel--${position}`,
      { 'resizable-panel--collapsed': isCollapsed, 'is-resizing': isResizing, 'is-animating': isAnimating }
    ]"
    :style="panelStyle"
  >
    <!-- Collapsed: a slim rail with the expand button and the panel's name.
         Expanded, the panel shows its own toggle in its header (slot prop
         "toggleCollapse"), so nothing floats over its content. -->
    <div v-if="collapsible && isCollapsed" class="collapsed-rail rail-fade">
      <PanelToggleButton
        :side="position === 'right' ? 'right' : 'left'"
        :collapsed="true"
        @toggle="toggleCollapse"
      />
      <span v-if="title" class="collapsed-rail-label">{{ title }}</span>
    </div>

    <!-- Resize handle -->
    <div 
      v-if="resizable && !isCollapsed"
      class="panel-resize-handle"
      :class="`panel-resize-handle--${position}`"
      @pointerdown.stop="startResizing"
      @dblclick.stop="emit('handle-dblclick')"
    ></div>
    
    <!-- Panel content -->
    <Transition
      v-if="position === 'bottom'"
      name="fade-swap"
    >
      <div v-if="!isCollapsed" class="panel-content">
        <slot :toggle-collapse="toggleCollapse"></slot>
      </div>
    </Transition>
    <Transition
      v-else
      :css="false"
      @enter="revealContent"
      @leave="hideContent"
    >
      <div v-if="!isCollapsed" class="panel-content">
        <slot :toggle-collapse="toggleCollapse"></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import PanelToggleButton from './PanelToggleButton.vue';
import { PANEL_MOTION, prefersReducedMotion } from '@/constants/constants';

// Define component props
interface Props {
  // Panel position: left, right, bottom
  position: 'left' | 'right' | 'bottom';
  // Initial size (width or height, depending on position)
  initialSize: number;
  // Minimum size
  minSize?: number;
  // Maximum size
  maxSize?: number;
  // Whether the panel is resizable
  resizable?: boolean;
  // Whether the panel is collapsible
  collapsible?: boolean;
  // Size when collapsed
  collapsedSize?: number;
  // Whether to use auto width (fill the remaining space)
  autoWidth?: boolean;
  // Panel name, shown on the rail while collapsed
  title?: string;
  // Shares of maxSize the size snaps to while dragging (e.g. [1/3, 1/2, 1])
  snapFractions?: number[];
  // Side panels: never wider than this share of the window (e.g. 0.3)
  maxWindowShare?: number;
}

// Define component events
interface Emits {
  (e: 'size-change', size: number): void;
  (e: 'collapse-change', isCollapsed: boolean): void;
  // The resize handle was double-clicked
  (e: 'handle-dblclick'): void;
}

// Use default values
const props = withDefaults(defineProps<Props>(), {
  minSize: 200,
  maxSize: 600,
  resizable: true,
  collapsible: false,
  collapsedSize: 40,
  autoWidth: false
});

const emit = defineEmits<Emits>();

// Reactive data
const currentSize = ref(props.initialSize);
const isCollapsed = ref(false);
const isResizing = ref(false);

watch(
  () => props.initialSize,
  (newSize) => {
    if (typeof newSize === 'number') {
      currentSize.value = newSize;
    }
  }
);

// The window's width, for side panels' share of it
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920);
const onWindowResize = () => (windowWidth.value = window.innerWidth);
onMounted(() => window.addEventListener('resize', onWindowResize));

// The largest size now: the set maximum, or less on a narrow window
const effectiveMax = computed(() => {
  const share = props.maxWindowShare;
  if (!share || props.position === 'bottom') return props.maxSize;
  return Math.max(props.minSize, Math.min(props.maxSize, Math.round(windowWidth.value * share)));
});

// Compute panel style
const panelStyle = computed(() => {
  const size = isCollapsed.value
    ? props.collapsedSize
    : Math.min(currentSize.value, effectiveMax.value);

  if (props.position === 'left' || props.position === 'right') {
    // If autoWidth is enabled and not collapsed, use 100% width
    if (props.autoWidth && !isCollapsed.value) {
      return {
        width: '100%',
        maxWidth: `${props.maxSize}px`,
        minWidth: `${props.minSize}px`
      };
    }
    return {
      width: `${size}px`
    };
  } else {
    return {
      height: `${size}px`
    };
  }
});

// Side panels: the content is clipped to the rail's width and revealed (or
// clipped back) from the panel's edge. Clipping and the canvas's glide
// (PDFDesigner) are transforms only, so nothing is laid out again per frame.
const isAnimating = ref(false);
let running = 0;

const railClip = () => {
  const keep = `calc(100% - ${props.collapsedSize}px)`;
  return props.position === 'left' ? `inset(0 ${keep} 0 0)` : `inset(0 0 0 ${keep})`;
};

function animateClip(el: Element, from: string, to: string, done: () => void) {
  if (prefersReducedMotion() || typeof (el as HTMLElement).animate !== 'function') {
    if (running === 0) isAnimating.value = false;
    return done();
  }
  running++;
  isAnimating.value = true;
  const animation = (el as HTMLElement).animate(
    [{ clipPath: from }, { clipPath: to }],
    { duration: PANEL_MOTION.duration, easing: PANEL_MOTION.easing }
  );
  const end = () => {
    if (--running === 0) isAnimating.value = false;
    done();
  };
  animation.onfinish = end;
  animation.oncancel = end;
}

const revealContent = (el: Element, done: () => void) =>
  animateClip(el, railClip(), 'inset(0 0 0 0)', done);

// The panel is already rail-wide: the leaving content lies over the canvas at
// its full width while it is clipped back
function hideContent(el: Element, done: () => void) {
  const s = (el as HTMLElement).style;
  Object.assign(s, {
    position: 'absolute',
    top: '0',
    [props.position === 'left' ? 'left' : 'right']: '0',
    width: `${currentSize.value}px`,
    zIndex: '3',
  });
  animateClip(el, 'inset(0 0 0 0)', railClip(), done);
}

// Toggle collapse state
const toggleCollapse = () => {
  // See-through from the first frame (the hooks start the clip right after)
  if (props.position !== 'bottom' && !prefersReducedMotion()) isAnimating.value = true;
  isCollapsed.value = !isCollapsed.value;
  emit('collapse-change', isCollapsed.value);
};

// Start resizing
let stopResizing: (() => void) | null = null;

// The handle captures the pointer: every move goes to it whatever lies under
// the pointer (the canvas, outside the window), for a mouse, touchpad or pen
const startResizing = (event: PointerEvent) => {
  if (!props.resizable || isCollapsed.value || event.button !== 0) return;

  event.preventDefault();
  const handle = event.currentTarget as HTMLElement;
  handle.setPointerCapture?.(event.pointerId);
  isResizing.value = true;

  const horizontal = props.position === 'left' || props.position === 'right';
  const startPos = horizontal ? event.clientX : event.clientY;
  // From the width shown (a narrow window may show less than the stored size)
  const startSize = Math.min(currentSize.value, effectiveMax.value);
  // Keep the resize cursor (and no text selection) while the pointer is off the strip
  document.body.style.cursor = horizontal ? 'ew-resize' : 'ns-resize';
  document.body.style.userSelect = 'none';

  const onMove = (e: PointerEvent) => {
    // Left panel: right grows it; right panel: left grows it; bottom: up grows it
    const delta =
      props.position === 'left' ? e.clientX - startPos
      : props.position === 'right' ? startPos - e.clientX
      : startPos - e.clientY;

    // Compute the new size and clamp it between min/max
    let newSize = Math.round(Math.max(props.minSize!, Math.min(effectiveMax.value, startSize + delta)));
    // Snap to the given shares of the largest size (e.g. 1/3, 1/2, full)
    for (const f of props.snapFractions ?? []) {
      const point = Math.round(props.maxSize! * f);
      if (Math.abs(newSize - point) <= 14) newSize = point;
    }
    if (newSize === currentSize.value) return;
    currentSize.value = newSize;
    emit('size-change', newSize);
  };

  const onUp = () => stopResizing?.();
  stopResizing = () => {
    isResizing.value = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (handle.hasPointerCapture?.(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    handle.removeEventListener('pointermove', onMove);
    handle.removeEventListener('pointerup', onUp);
    handle.removeEventListener('pointercancel', onUp);
    handle.removeEventListener('lostpointercapture', onUp);
    stopResizing = null;
  };

  handle.addEventListener('pointermove', onMove);
  handle.addEventListener('pointerup', onUp);
  handle.addEventListener('pointercancel', onUp);
  handle.addEventListener('lostpointercapture', onUp);
};

onUnmounted(() => {
  stopResizing?.();
  window.removeEventListener('resize', onWindowResize);
});
</script>

<style scoped>
.resizable-panel {
  position: relative;
  overflow: hidden;
  background-color: #ffffff;
  height: 100%;
}

/* The bottom panel glides on maximize / restore (dragging is instant). Side
   panels change width in one step, so the canvas is laid out once, not on
   every frame; only their own content slides in. */
.resizable-panel--bottom {
  transition: height 0.22s cubic-bezier(0.2, 0, 0, 1);
}

.resizable-panel.is-resizing {
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .resizable-panel {
    transition: none;
  }

  .rail-fade {
    animation: none;
  }
}

/* Side panels keep the width they are given; the canvas takes the rest */
.resizable-panel--left,
.resizable-panel--right {
  flex-shrink: 0;
}

/* Left panel */
.resizable-panel--left {
  border-right: 1px solid rgba(28, 27, 38, 0.08);
}

/* Right panel */
.resizable-panel--right {
  border-left: 1px solid rgba(28, 27, 38, 0.08);
}

/* Bottom panel */
.resizable-panel--bottom {
  border-top: 1px solid rgba(28, 27, 38, 0.08);
  flex-shrink: 0;
}

/* Collapsed state */
.resizable-panel--collapsed {
  min-width: auto !important;
  min-height: auto !important;
}

/* While opening or closing, the panel box is see-through (the canvas glides
   beneath it) and its content, revealed from the edge, carries the white */
.resizable-panel.is-animating {
  z-index: 2;
  overflow: visible;
  background: transparent;
  border-color: transparent;
}

.is-animating > .panel-content {
  background: #ffffff;
  box-shadow: 1px 0 0 rgba(28, 27, 38, 0.08);
}

.resizable-panel--right.is-animating > .panel-content {
  box-shadow: -1px 0 0 rgba(28, 27, 38, 0.08);
}

@keyframes rail-fade-in {
  from {
    opacity: 0;
  }
}

.rail-fade {
  animation: rail-fade-in 0.24s ease;
}

/* Collapsed: a slim rail with the expand button and the panel's name */
.collapsed-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  height: 100%;
  padding-top: 10px;
  background: #ffffff;
}

.collapsed-rail-label {
  writing-mode: vertical-rl;
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.06em;
  color: #8a84a3;
  text-transform: uppercase;
  white-space: nowrap;
  user-select: none;
}

.resizable-panel--left .collapsed-rail-label {
  transform: rotate(180deg);
}

/* Resize handle */
.panel-resize-handle {
  position: absolute;
  touch-action: none;
  background-color: transparent;
  z-index: 5;
  transition: background-color 0.15s ease;
}

.panel-resize-handle:hover {
  background-color: rgba(124, 92, 247, 0.25);
}

/* Side panel resize handles: an 8px grab strip on the inner edge, showing a
   line and a grip when hovered or dragged */
.panel-resize-handle--left,
.panel-resize-handle--right {
  top: 0;
  width: 8px;
  height: 100%;
  z-index: 30;
  cursor: ew-resize;
}

.panel-resize-handle--left {
  right: 0;
}

.panel-resize-handle--right {
  left: 0;
}

.panel-resize-handle--left:hover,
.panel-resize-handle--right:hover {
  background-color: transparent;
}

.panel-resize-handle--left::before,
.panel-resize-handle--right::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: transparent;
  transition: background-color 0.15s ease;
}

.panel-resize-handle--left::before {
  right: 0;
}

.panel-resize-handle--right::before {
  left: 0;
}

.panel-resize-handle--left::after,
.panel-resize-handle--right::after {
  content: "";
  position: absolute;
  top: 50%;
  width: 4px;
  height: 40px;
  margin-top: -20px;
  border-radius: 999px;
  background: #d9d4ec;
  opacity: 0;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.panel-resize-handle--left::after {
  right: 2px;
}

.panel-resize-handle--right::after {
  left: 2px;
}

.panel-resize-handle--left:hover::before,
.panel-resize-handle--right:hover::before,
.is-resizing > .panel-resize-handle::before {
  background: rgba(100, 64, 244, 0.45);
}

.panel-resize-handle--left:hover::after,
.panel-resize-handle--right:hover::after,
.is-resizing > .panel-resize-handle::after {
  opacity: 1;
  background: #6440f4;
}

/* Bottom panel resize handle: an 8px strip on the top edge, above the
   panel's (sticky) tab row, with a grip in the middle */
.panel-resize-handle--bottom {
  top: 0;
  left: 0;
  width: 100%;
  height: 8px;
  z-index: 30;
  cursor: ns-resize;
}

.panel-resize-handle--bottom::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 50%;
  width: 40px;
  height: 4px;
  margin-left: -20px;
  border-radius: 999px;
  background: #d9d4ec;
  transition: background-color 0.15s ease;
}

.panel-resize-handle--bottom:hover::after {
  background: #6440f4;
}

/* Panel content */
.panel-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: #cfd5e1 transparent;
}

.panel-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #cfd5e1;
  border-radius: 4px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #b0b8c9;
}
</style>