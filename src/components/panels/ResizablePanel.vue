<template>
  <div 
    class="resizable-panel" 
    :class="[
      `resizable-panel--${position}`,
      { 'resizable-panel--collapsed': isCollapsed }
    ]"
    :style="panelStyle"
  >
    <!-- Collapsed: a slim rail with the expand button and the panel's name.
         Expanded, the panel shows its own toggle in its header (slot prop
         "toggleCollapse"), so nothing floats over its content. -->
    <div v-if="collapsible && isCollapsed" class="collapsed-rail">
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
      @mousedown.stop="startResizing"
    ></div>
    
    <!-- Panel content -->
    <div v-if="!isCollapsed" class="panel-content">
      <slot :toggle-collapse="toggleCollapse"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import PanelToggleButton from './PanelToggleButton.vue';

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
}

// Define component events
interface Emits {
  (e: 'size-change', size: number): void;
  (e: 'collapse-change', isCollapsed: boolean): void;
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

// Compute panel style
const panelStyle = computed(() => {
  const size = isCollapsed.value ? props.collapsedSize : currentSize.value;

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

// Toggle collapse state
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  emit('collapse-change', isCollapsed.value);
};

// Start resizing
const startResizing = (event: MouseEvent) => {
  if (!props.resizable || isCollapsed.value) return;

  event.preventDefault();
  isResizing.value = true;

  const startPos = props.position === 'left' || props.position === 'right'
    ? event.clientX
    : event.clientY;
  const startSize = currentSize.value;

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return;

    let delta: number;

    if (props.position === 'left') {
      // Left panel: dragging right increases width
      delta = e.clientX - startPos;
    } else if (props.position === 'right') {
      // Right panel: dragging left increases width
      delta = startPos - e.clientX;
    } else {
      // Bottom panel: dragging up increases height
      delta = startPos - e.clientY;
    }

    // Compute the new size and clamp it between min/max
    const newSize = Math.max(props.minSize!, Math.min(props.maxSize!, startSize + delta));
    currentSize.value = newSize;
    emit('size-change', newSize);
  };

  const handleMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// Clean up event listeners
onUnmounted(() => {
  // Ensure all event listeners are removed when the component is unmounted
  document.removeEventListener('mousemove', () => {});
  document.removeEventListener('mouseup', () => {});
});
</script>

<style scoped>
.resizable-panel {
  position: relative;
  overflow: hidden;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  height: 100%;
}

/* Left panel */
.resizable-panel--left {
  border-right: 1px solid #ddd;
}

/* Right panel */
.resizable-panel--right {
  border-left: 1px solid #ddd;
}

/* Bottom panel */
.resizable-panel--bottom {
  border-top: 1px solid #ddd;
}

/* Collapsed state */
.resizable-panel--collapsed {
  min-width: auto !important;
  min-height: auto !important;
}

/* Collapsed: a slim rail with the expand button and the panel's name */
.collapsed-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  height: 100%;
  padding-top: 10px;
  background: #fff;
}

.collapsed-rail-label {
  writing-mode: vertical-rl;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #6b7280;
  white-space: nowrap;
  user-select: none;
}

.resizable-panel--left .collapsed-rail-label {
  transform: rotate(180deg);
}

/* Resize handle */
.panel-resize-handle {
  position: absolute;
  background-color: transparent;
  z-index: 5;
}

.panel-resize-handle:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

/* Left panel resize handle */
.panel-resize-handle--left {
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
}

/* Right panel resize handle */
.panel-resize-handle--right {
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
}

/* Bottom panel resize handle */
.panel-resize-handle--bottom {
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  cursor: ns-resize;
}

/* Panel content */
.panel-content {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
}
</style>