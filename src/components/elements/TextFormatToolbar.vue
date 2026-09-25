<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="toolbarRef"
      class="text-format-floating-toolbar"
      :class="{ 'is-below': isNearTop }"
      :style="toolbarStyle"
      @mousedown="handleToolbarMouseDown"
    >
      <!-- Pointer arrow -->
      <div class="toolbar-arrow" :class="{ 'is-below': isNearTop }"></div>

      <!-- Main formatting strip -->
      <div v-if="!showLinkPopover && !showColorPicker && !showHighlightPicker" class="toolbar-button-group">
        <!-- Bold -->
        <button
          type="button"
          class="format-btn"
          :class="{ 'is-active': activeFormats.bold }"
          title="Bold (Ctrl+B)"
          @click="emitFormat('bold')"
        >
          <Bold :size="14" :stroke-width="2.5" />
        </button>

        <!-- Italic -->
        <button
          type="button"
          class="format-btn"
          :class="{ 'is-active': activeFormats.italic }"
          title="Italic (Ctrl+I)"
          @click="emitFormat('italic')"
        >
          <Italic :size="14" :stroke-width="2.5" />
        </button>

        <!-- Underline -->
        <button
          type="button"
          class="format-btn"
          :class="{ 'is-active': activeFormats.underline }"
          title="Underline (Ctrl+U)"
          @click="emitFormat('underline')"
        >
          <Underline :size="14" :stroke-width="2.5" />
        </button>

        <!-- Strikethrough -->
        <button
          type="button"
          class="format-btn"
          :class="{ 'is-active': activeFormats.strike }"
          title="Strikethrough"
          @click="emitFormat('strikeThrough')"
        >
          <Strikethrough :size="14" :stroke-width="2.5" />
        </button>

        <span class="btn-separator"></span>

        <!-- Text Color picker trigger -->
        <button
          type="button"
          class="format-btn color-trigger-btn"
          :class="{ 'is-active': showColorPicker || !!activeFormats.color }"
          title="Text Color"
          @click="openColorPicker"
        >
          <Palette :size="14" :stroke-width="2" />
          <span
            class="current-color-indicator"
            :style="{
              backgroundColor: activeFormats.color || 'transparent',
              opacity: activeFormats.color ? 1 : 0
            }"
          ></span>
        </button>

        <!-- Highlight Color trigger (Marker / Background Color) -->
        <button
          type="button"
          class="format-btn color-trigger-btn"
          :class="{ 'is-active': showHighlightPicker || !!activeFormats.highlight }"
          title="Highlight Color (Background)"
          @click="openHighlightPicker"
        >
          <Highlighter :size="14" :stroke-width="2" />
          <span
            class="current-color-indicator"
            :style="{
              backgroundColor: activeFormats.highlight || 'transparent',
              opacity: activeFormats.highlight ? 1 : 0
            }"
          ></span>
        </button>

        <span class="btn-separator"></span>

        <!-- Hyperlink trigger -->
        <button
          type="button"
          class="format-btn link-btn"
          :class="{ 'is-active': activeFormats.link || showLinkPopover }"
          title="Insert or Edit Link (Ctrl+K)"
          @click="openLinkPopover()"
        >
          <Link :size="14" :stroke-width="2.5" />
        </button>

        <!-- Clear formatting -->
        <button
          type="button"
          class="format-btn"
          title="Clear Formatting"
          @click="emitFormat('removeFormat')"
        >
          <RemoveFormatting :size="14" :stroke-width="2" />
        </button>
      </div>

      <!-- Text Color picker popover (White Theme) -->
      <div v-else-if="showColorPicker" class="color-picker-popover" @mousedown.stop>
        <div class="popover-header">
          <span class="popover-title">Text Color</span>
          <button
            type="button"
            class="close-popover-btn"
            title="Back"
            @click="showColorPicker = false"
          >
            <X :size="13" />
          </button>
        </div>

        <!-- Automatic / Reset Text Color Button -->
        <button
          type="button"
          class="clear-highlight-btn"
          :class="{ 'is-active-none': !activeFormats.color }"
          title="Automatic (Default color)"
          @click="applyColor('inherit')"
        >
          <span class="no-color-icon">⊘</span>
          <span>Automatic</span>
        </button>

        <div class="color-swatches-grid">
          <button
            v-for="color in presetColors"
            :key="color"
            type="button"
            class="color-swatch-btn"
            :class="{ 'is-selected': !!activeFormats.color && activeFormats.color.toLowerCase() === color.toLowerCase() }"
            :style="{ backgroundColor: color }"
            :title="color"
            @click="applyColor(color)"
          ></button>
        </div>

        <div class="custom-color-section">
          <div class="custom-color-label">Custom Color</div>
          <div class="custom-color-controls">
            <input
              v-model="customColorInput"
              type="color"
              class="native-color-picker"
              @change="applyColor(customColorInput)"
            />
            <input
              v-model="customColorInput"
              type="text"
              class="custom-color-text"
              placeholder="#000000"
              @keydown.enter.prevent="applyColor(customColorInput)"
              @mousedown.stop
            />
            <button
              type="button"
              class="action-btn-primary custom-apply-btn"
              @click="applyColor(customColorInput)"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <!-- Highlight Color popover (Background Highlighting - White Theme) -->
      <div v-else-if="showHighlightPicker" class="color-picker-popover highlight-popover" @mousedown.stop>
        <div class="popover-header">
          <span class="popover-title">Highlight Color</span>
          <button
            type="button"
            class="close-popover-btn"
            title="Back"
            @click="showHighlightPicker = false"
          >
            <X :size="13" />
          </button>
        </div>

        <!-- None / Clear Highlight Button -->
        <button
          type="button"
          class="clear-highlight-btn"
          :class="{ 'is-active-none': !activeFormats.highlight }"
          title="Remove highlight"
          @click="applyHighlight('transparent')"
        >
          <span class="no-color-icon">⊘</span>
          <span>No color</span>
        </button>

        <div class="color-swatches-grid highlight-swatches-grid">
          <button
            v-for="color in highlightColors"
            :key="color.value"
            type="button"
            class="color-swatch-btn"
            :class="{ 'is-selected': !!activeFormats.highlight && color.value.toLowerCase() === activeFormats.highlight.toLowerCase() }"
            :style="{ backgroundColor: color.value }"
            :title="color.name"
            @click="applyHighlight(color.value)"
          ></button>
        </div>

        <div class="custom-color-section">
          <div class="custom-color-label">Custom Color</div>
          <div class="custom-color-controls">
            <input
              v-model="customHighlightInput"
              type="color"
              class="native-color-picker"
              @change="applyHighlight(customHighlightInput)"
            />
            <input
              v-model="customHighlightInput"
              type="text"
              class="custom-color-text"
              placeholder="#fff566"
              @keydown.enter.prevent="applyHighlight(customHighlightInput)"
              @mousedown.stop
            />
            <button
              type="button"
              class="action-btn-primary custom-apply-btn"
              @click="applyHighlight(customHighlightInput)"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <!-- Hyperlink Popover (Web URL, Email, Phone + Label Editing - White Theme) -->
      <div v-else-if="showLinkPopover" class="link-popover" @mousedown.stop>
        <div class="popover-header">
          <div class="link-type-tabs">
            <button
              type="button"
              class="link-tab"
              :class="{ 'is-active': linkType === 'url' }"
              @click="switchLinkType('url')"
            >
              <Globe :size="12" /> Web
            </button>
            <button
              type="button"
              class="link-tab"
              :class="{ 'is-active': linkType === 'email' }"
              @click="switchLinkType('email')"
            >
              <Mail :size="12" /> Email
            </button>
            <button
              type="button"
              class="link-tab"
              :class="{ 'is-active': linkType === 'phone' }"
              @click="switchLinkType('phone')"
            >
              <Phone :size="12" /> Phone
            </button>
          </div>
          <button
            type="button"
            class="close-popover-btn"
            title="Back"
            @click="closeLinkPopover"
          >
            <X :size="13" />
          </button>
        </div>

        <div class="link-inputs-body">
          <!-- Text / Label Field (Google Docs style) -->
          <div class="link-input-group">
            <label class="field-label">Text</label>
            <input
              v-model="linkTextValue"
              type="text"
              class="link-text-input"
              placeholder="Display label (optional)"
              @keydown.enter.prevent="applyLink"
              @keydown.esc.prevent="closeLinkPopover"
              @mousedown.stop
            />
          </div>

          <!-- Link / Destination Field -->
          <div class="link-input-group">
            <label class="field-label">Link</label>
            <div class="input-row">
              <span class="input-prefix-label">{{ linkPrefixLabel }}</span>
              <input
                v-if="linkType === 'url'"
                ref="urlInputRef"
                v-model="linkInputs.url"
                type="text"
                class="link-text-input inline-input"
                placeholder="https://example.com"
                @keydown.enter.prevent="applyLink"
                @keydown.esc.prevent="closeLinkPopover"
                @mousedown.stop
              />
              <input
                v-else-if="linkType === 'email'"
                ref="emailInputRef"
                v-model="linkInputs.email"
                type="text"
                class="link-text-input inline-input"
                placeholder="user@example.com"
                @keydown.enter.prevent="applyLink"
                @keydown.esc.prevent="closeLinkPopover"
                @mousedown.stop
              />
              <input
                v-else
                ref="phoneInputRef"
                v-model="linkInputs.phone"
                type="text"
                class="link-text-input inline-input"
                placeholder="+1 234 567 8900"
                @keydown.enter.prevent="applyLink"
                @keydown.esc.prevent="closeLinkPopover"
                @mousedown.stop
              />
            </div>
          </div>

          <div class="link-actions-row">
            <button
              v-if="activeFormats.link"
              type="button"
              class="action-btn-danger"
              title="Remove Hyperlink"
              @click="removeLink"
            >
              <Unlink :size="13" /> Remove
            </button>
            <div class="spacer"></div>
            <button
              type="button"
              class="action-btn-secondary"
              @click="closeLinkPopover"
            >
              Cancel
            </button>
            <button
              type="button"
              class="action-btn-primary"
              :disabled="!currentTargetValue.trim() && !linkTextValue.trim()"
              @click="applyLink"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Palette,
  Highlighter,
  Link,
  Unlink,
  RemoveFormatting,
  X,
  Globe,
  Mail,
  Phone,
} from "@lucide/vue";

// Props
const props = defineProps<{
  visible: boolean;
  position: { x: number; y: number };
  activeFormats: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    link?: boolean;
    color?: string;
    highlight?: string;
  };
  currentLink?: {
    url: string;
    type?: "url" | "email" | "phone";
    label?: string;
  };
  selectedText?: string;
}>();

// Emits
const emit = defineEmits<{
  format: [command: string, value?: string];
  applyLink: [target: string, type: "url" | "email" | "phone", label?: string];
  removeLink: [];
  close: [];
}>();

const toolbarRef = ref<HTMLElement | null>(null);
const urlInputRef = ref<HTMLInputElement | null>(null);
const emailInputRef = ref<HTMLInputElement | null>(null);
const phoneInputRef = ref<HTMLInputElement | null>(null);
const showColorPicker = ref(false);
const showHighlightPicker = ref(false);
const showLinkPopover = ref(false);

const linkType = ref<"url" | "email" | "phone">("url");
const linkInputs = ref({
  url: "",
  email: "",
  phone: "",
});
const linkTextValue = ref("");

const currentTargetValue = computed(() => {
  return linkInputs.value[linkType.value] || "";
});
const customColorInput = ref(props.activeFormats.color || "#1890ff");
const customHighlightInput = ref(props.activeFormats.highlight || "#fff566");

const presetColors = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#d9d9d9",
  "#ffffff",
  "#f5222d",
  "#fa541c",
  "#fa8c16",
  "#faad14",
  "#52c41a",
  "#13c2c2",
  "#1890ff",
  "#2f54eb",
  "#722ed1",
  "#eb2f96",
];

// Google Docs inspired highlight pastel colors
const highlightColors = [
  { name: "Yellow", value: "#fff566" },
  { name: "Lime", value: "#b7eb8f" },
  { name: "Cyan", value: "#91caff" },
  { name: "Orange", value: "#ffd591" },
  { name: "Pink", value: "#ffadd2" },
  { name: "Purple", value: "#d3adf7" },
  { name: "Soft Red", value: "#ffa39e" },
  { name: "Light Gray", value: "#e8e8e8" },
  { name: "Deep Yellow", value: "#faad14" },
  { name: "Green", value: "#52c41a" },
  { name: "Blue", value: "#1890ff" },
  { name: "Violet", value: "#722ed1" },
];

const isNearTop = computed(() => {
  if (showLinkPopover.value) {
    return props.position.y < 200;
  }
  return props.position.y < 85;
});

const toolbarStyle = computed(() => {
  // Clamping X coordinate within screen boundaries
  const clampedX = Math.max(160, Math.min(window.innerWidth - 160, props.position.x));

  if (isNearTop.value) {
    // Show below the selection if near top edge of viewport
    return {
      top: `${props.position.y + 24}px`,
      left: `${clampedX}px`,
      transform: "translate(-50%, 0)",
    };
  }

  // Default: position directly above selection
  return {
    top: `${props.position.y - 10}px`,
    left: `${clampedX}px`,
    transform: "translate(-50%, -100%)",
  };
});

const linkPrefixLabel = computed(() => {
  switch (linkType.value) {
    case "email":
      return "mailto:";
    case "phone":
      return "tel:";
    default:
      return "URL:";
  }
});

const linkPlaceholder = computed(() => {
  switch (linkType.value) {
    case "email":
      return "user@example.com";
    case "phone":
      return "+1 234 567 8900";
    default:
      return "https://example.com";
  }
});

const parseAndSetLinkTarget = (url: string) => {
  if (url.startsWith("mailto:")) {
    linkType.value = "email";
    linkInputs.value.email = url.replace(/^mailto:/, "");
  } else if (url.startsWith("tel:")) {
    linkType.value = "phone";
    linkInputs.value.phone = url.replace(/^tel:/, "");
  } else {
    linkType.value = "url";
    linkInputs.value.url = url;
  }
};

// Handle toolbar mouse down: allow inputs to get focus naturally without stealing selection
const handleToolbarMouseDown = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
    e.stopPropagation();
    return;
  }
  // For buttons/swatches, prevent focus loss from contenteditable
  e.preventDefault();
};

// Watch current link updates
watch(
  () => props.currentLink,
  (val) => {
    if (val && val.url) {
      parseAndSetLinkTarget(val.url);
      if (val.label) {
        linkTextValue.value = val.label;
      }
    } else {
      linkInputs.value = {
        url: "",
        email: "",
        phone: "",
      };
    }
  },
  { immediate: true },
);

// Reset view states when visibility turns false
watch(
  () => props.visible,
  (val) => {
    if (!val) {
      showColorPicker.value = false;
      showHighlightPicker.value = false;
      showLinkPopover.value = false;
    }
  },
);

// Watch selectedText updates: reset sub-popovers so newly selected text ALWAYS shows the format buttons
watch(
  () => props.selectedText,
  () => {
    showColorPicker.value = false;
    showHighlightPicker.value = false;
    showLinkPopover.value = false;
  },
);

const emitFormat = (command: string, value?: string) => {
  emit("format", command, value);
};

const openColorPicker = () => {
  showColorPicker.value = true;
  showHighlightPicker.value = false;
  showLinkPopover.value = false;
  if (props.activeFormats.color) {
    customColorInput.value = props.activeFormats.color;
  }
};

const applyColor = (color: string) => {
  emit("format", "foreColor", color);
  showColorPicker.value = false;
};

const openHighlightPicker = () => {
  showHighlightPicker.value = true;
  showColorPicker.value = false;
  showLinkPopover.value = false;
};

const applyHighlight = (color: string) => {
  emit("format", "hiliteColor", color);
  showHighlightPicker.value = false;
};

const focusActiveInput = () => {
  nextTick(() => {
    if (linkType.value === "url") {
      urlInputRef.value?.focus();
      urlInputRef.value?.select();
    } else if (linkType.value === "email") {
      emailInputRef.value?.focus();
      emailInputRef.value?.select();
    } else if (linkType.value === "phone") {
      phoneInputRef.value?.focus();
      phoneInputRef.value?.select();
    }
  });
};

const openLinkPopover = (prefillTarget?: string, prefillLabel?: string) => {
  showLinkPopover.value = true;
  showColorPicker.value = false;
  showHighlightPicker.value = false;

  if (prefillLabel !== undefined) {
    linkTextValue.value = prefillLabel;
  } else if (props.currentLink?.label) {
    linkTextValue.value = props.currentLink.label;
  } else if (props.selectedText) {
    linkTextValue.value = props.selectedText;
  } else {
    linkTextValue.value = "";
  }

  // Clear all tab inputs initially
  linkInputs.value = {
    url: "",
    email: "",
    phone: "",
  };

  if (prefillTarget !== undefined) {
    parseAndSetLinkTarget(prefillTarget);
  } else if (props.currentLink?.url) {
    parseAndSetLinkTarget(props.currentLink.url);
  } else {
    linkType.value = "url";
  }

  focusActiveInput();
};

const closeLinkPopover = () => {
  showLinkPopover.value = false;
  if (!props.selectedText) {
    emit("close");
  }
};

const switchLinkType = (type: "url" | "email" | "phone") => {
  linkType.value = type;
  focusActiveInput();
};

const applyLink = () => {
  let target = (linkInputs.value[linkType.value] || "").trim();
  const label = linkTextValue.value.trim();

  if (!target && !label) return;

  // If label entered but target empty, assume label is URL
  if (!target && label) {
    target = label;
  }

  if (linkType.value === "url") {
    if (!/^https?:\/\//i.test(target) && !target.startsWith("/") && !target.startsWith("#")) {
      target = `https://${target}`;
    }
  } else if (linkType.value === "email") {
    if (!target.startsWith("mailto:")) {
      target = `mailto:${target}`;
    }
  } else if (linkType.value === "phone") {
    if (!target.startsWith("tel:")) {
      target = `tel:${target.replace(/\s+/g, "")}`;
    }
  }

  emit("applyLink", target, linkType.value, label || undefined);
  showLinkPopover.value = false;
  if (!props.selectedText) {
    emit("close");
  }
};

const removeLink = () => {
  emit("removeLink");
  showLinkPopover.value = false;
  if (!props.selectedText) {
    emit("close");
  }
};

// Handle outside clicks to close popovers immediately
const handleOutsideMouseDown = (e: MouseEvent) => {
  if (!props.visible) return;
  const target = e.target as HTMLElement;
  if (toolbarRef.value && !toolbarRef.value.contains(target)) {
    if (showLinkPopover.value || showColorPicker.value || showHighlightPicker.value) {
      showLinkPopover.value = false;
      showColorPicker.value = false;
      showHighlightPicker.value = false;
    }
    if (!target.closest('.inline-edit-contenteditable')) {
      emit("close");
    }
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleOutsideMouseDown, true);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleOutsideMouseDown, true);
});

// Expose methods for parent elements
defineExpose({
  openLinkPopover,
  openColorPicker,
  openHighlightPicker,
});
</script>

<style scoped>
/* Pristine White Theme Floating Toolbar */
.text-format-floating-toolbar {
  position: fixed;
  z-index: 10000;
  background: #ffffff;
  color: #1f2937;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
  padding: 4px;
  display: flex;
  align-items: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  user-select: none;
  animation: formatToolbarFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: auto;
}

/* Subtle Triangle Indicator */
.toolbar-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #e2e8f0;
  pointer-events: none;
}

.toolbar-arrow.is-below {
  bottom: auto;
  top: -6px;
  border-right: none;
  border-bottom: none;
  border-left: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
}

@keyframes formatToolbarFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -90%) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%) scale(1);
  }
}

.text-format-floating-toolbar.is-below {
  animation: formatToolbarBelowFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes formatToolbarBelowFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -10%) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
}

.toolbar-button-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.format-btn {
  background: transparent;
  border: none;
  outline: none;
  color: #4b5563;
  width: 28px;
  height: 28px;
  border-radius: 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.12s ease;
  position: relative;
  padding: 0;
}

.format-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.format-btn.is-active {
  background: #e6f7ff;
  color: #1890ff;
  font-weight: 600;
}

.btn-separator {
  width: 1px;
  height: 16px;
  background: #e5e7eb;
  margin: 0 4px;
}

.color-trigger-btn {
  flex-direction: column;
  gap: 2px;
}

.current-color-indicator {
  width: 13px;
  height: 2.5px;
  border-radius: 1px;
  box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.2);
}

/* Color picker popover (White Theme) */
.color-picker-popover {
  padding: 10px 14px;
  width: 248px;
  box-sizing: border-box;
}

.highlight-popover {
  width: 248px;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid #f0f0f0;
}

.popover-title {
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.close-popover-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 3px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: all 0.12s ease;
}

.close-popover-btn:hover {
  color: #111827;
  background: #f3f4f6;
}

.clear-highlight-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  color: #4b5563;
  border-radius: 5px;
  padding: 4px 0;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 8px;
  transition: all 0.12s ease;
}

.clear-highlight-btn:hover {
  background: #f3f4f6;
  color: #111827;
  border-color: #9ca3af;
}

.clear-highlight-btn.is-active-none {
  background: #e6f7ff;
  border-color: #1890ff;
  color: #1890ff;
  font-weight: 600;
}

.no-color-icon {
  font-size: 13px;
  color: #ff4d4f;
  line-height: 1;
}

.color-swatches-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 5px;
  margin-bottom: 10px;
}

.highlight-swatches-grid {
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.color-swatch-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  cursor: pointer;
  padding: 0;
  box-sizing: border-box;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.color-swatch-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  z-index: 2;
}

.color-swatch-btn.is-selected {
  outline: 2px solid #1890ff;
  outline-offset: 1px;
}

.custom-color-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.custom-color-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  letter-spacing: 0.5px;
}

.custom-color-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.native-color-picker {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  flex-shrink: 0;
  box-sizing: border-box;
}

.custom-color-text {
  flex: 1;
  min-width: 0;
  height: 28px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  color: #111827;
  font-size: 12px;
  font-family: monospace;
  padding: 0 8px;
  border-radius: 4px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.12s ease;
}

.custom-color-text:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.15);
}

.custom-apply-btn {
  height: 28px;
  padding: 0 12px;
  flex-shrink: 0;
  box-sizing: border-box;
  font-size: 11px;
  font-weight: 600;
}

/* Link Popover (White Theme) */
.link-popover {
  padding: 8px 12px;
  width: 290px;
}

.link-type-tabs {
  display: flex;
  gap: 3px;
}

.link-tab {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s ease;
}

.link-tab:hover {
  color: #111827;
  background: #f3f4f6;
}

.link-tab.is-active {
  background: #1890ff;
  border-color: #1890ff;
  color: #ffffff;
  font-weight: 500;
}

.link-inputs-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-input-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.field-label {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.5px;
}

.input-row {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  padding: 2px 6px;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}

.input-row:focus-within {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.15);
}

.input-prefix-label {
  font-size: 11px;
  color: #6b7280;
  margin-right: 4px;
  font-family: monospace;
  font-weight: 500;
}

.link-text-input {
  flex: 1;
  background: #ffffff;
  border: 1px solid #d1d5db;
  color: #111827;
  font-size: 12px;
  outline: none;
  padding: 4px 6px;
  border-radius: 4px;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}

.link-text-input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.15);
}

.input-row .inline-input {
  background: transparent;
  border: none;
  padding: 3px 0;
  box-shadow: none !important;
}

.link-actions-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.spacer {
  flex: 1;
}

.action-btn-primary {
  background: #1890ff;
  color: #ffffff;
  border: none;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.action-btn-primary:hover:not(:disabled) {
  background: #40a9ff;
}

.action-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.action-btn-secondary {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #e5e7eb;
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.action-btn-secondary:hover {
  background: #e5e7eb;
  color: #111827;
}

.action-btn-danger {
  background: #fff1f0;
  color: #ff4d4f;
  border: 1px solid #ffa39e;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s ease;
}

.action-btn-danger:hover {
  background: #ffccc7;
}
</style>
