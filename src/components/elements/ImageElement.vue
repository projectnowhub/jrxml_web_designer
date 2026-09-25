<template>
  <BaseElement
    :element="element"
    :band-index="bandIndex"
    :element-index="elementIndex"
    :selected-element="selectedElement"
    :selected-elements="selectedElements"
    :is-dragging="isDragging"
    :is-out-of-bounds="isOutOfBounds"
    :report-font-family="reportFontFamily"
    :report-font-size="reportFontSize"
    :report-is-bold="reportIsBold"
    :report-is-italic="reportIsItalic"
    :report-is-underline="reportIsUnderline"
    :parent-frame-index="parentFrameIndex"
    @select="handleSelect"
    @drag-start="handleDragStart"
    @resize-start="handleResizeStart"
    @contextmenu="handleContextMenu"
  >
    <div
      class="image-container"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- Upload Dropzone when no image is loaded -->
      <div
        v-if="!imageUrl"
        class="image-upload-zone"
        :class="{ 'is-drag-over': isDraggingOver }"
        @click.stop="triggerFileInput"
        @dragover.prevent.stop="handleDragOver"
        @dragenter.prevent.stop="handleDragOver"
        @dragleave.prevent.stop="handleDragLeave"
        @drop.prevent.stop="handleDrop"
        :title="
          t('properties.dropOrClickToUpload') || 'Drop image or click to upload'
        "
      >
        <svg
          class="upload-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span class="upload-text">{{
          t("properties.dropOrClickToUpload") || "Drop image or click to upload"
        }}</span>
        <span class="upload-hint">PNG, JPG, JPEG</span>
      </div>

      <!-- Preview Image when image is loaded -->
      <div
        v-else
        class="image-preview-wrapper"
        @dragover.prevent.stop="handleDragOver"
        @dragenter.prevent.stop="handleDragOver"
        @dragleave.prevent.stop="handleDragLeave"
        @drop.prevent.stop="handleDrop"
      >
        <img
          :src="imageUrl"
          class="preview-image"
          :style="imageStyle"
          alt="Preview"
          @error="handleImageError"
          @dragstart.prevent=""
        />
        <!-- Change Image button when hovered or selected -->
        <div v-if="isSelected || isHovered" class="image-overlay" @click.stop>
          <button
            type="button"
            class="change-image-btn"
            :class="{ 'icon-only': !showChangeImageText }"
            @click.stop="triggerFileInput"
            :title="t('properties.changeImage') || 'Change Image'"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="12"
              height="12"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span v-if="showChangeImageText">{{ t("properties.changeImage") }}</span>
          </button>
        </div>
      </div>

      <!-- Hidden file input for uploading images -->
      <input
        ref="fileInputRef"
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        style="display: none"
        @change="handleFileInputChange"
      />
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { createDiscreteApi } from "naive-ui";
import BaseElement from "./BaseElement.vue";
import type { ImageElement, SelectedElementInfo } from "../../types";

const { t } = useI18n();

// Props
const props = defineProps<{
  element: ImageElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements?: { bandIndex: number; elementIndex: number; parentFrameIndex?: number }[];
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  reportFontFamily?: string;
  reportFontSize?: number;
  reportIsBold?: boolean;
  reportIsItalic?: boolean;
  reportIsUnderline?: boolean;
  parentFrameIndex?: number;
}>();

// Emits
const emit = defineEmits<{
  select: [
    bandIndex: number,
    elementIndex: number,
    isMultiSelect?: boolean,
    parentFrameIndex?: number,
  ];
  dragStart: [
    event: MouseEvent,
    bandIndex: number,
    elementIndex: number,
    parentFrameIndex?: number,
  ];
  resizeStart: [
    event: MouseEvent,
    bandIndex: number,
    elementIndex: number,
    parentFrameIndex?: number,
    direction?: string,
  ];
  contextmenu: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  "update-jrxml": [];
}>();

// UI state
const isHovered = ref(false);
const isDraggingOver = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const imageError = ref(false);

// Whether this element is selected
const isSelected = computed(() => {
  if (
    props.element.uuid &&
    props.selectedElement &&
    (props.selectedElement as any).uuid
  ) {
    return props.element.uuid === (props.selectedElement as any).uuid;
  }
  return (
    props.selectedElement &&
    props.selectedElement.bandIndex === props.bandIndex &&
    props.selectedElement.elementIndex === props.elementIndex &&
    props.selectedElement.parentFrameIndex === props.parentFrameIndex
  );
});

// Show change image text only if width >= 90px and height >= 70px
const showChangeImageText = computed(() => {
  const width = Number(props.element.width) || 0;
  const height = Number(props.element.height) || 0;
  return width >= 90 && height >= 70;
});

// Image style - based on the scaleType property
const imageStyle = computed(() => {
  const scaleType = props.element.scaleType || "FillFrame";
  const hAlign = props.element.hAlign || "Center";
  const vAlign = props.element.vAlign || "Middle";

  let objectFit: "fill" | "contain" | "cover" | "none" | "scale-down";
  let objectPosition: string;

  switch (scaleType) {
    case "RealSize":
      objectFit = "none";
      break;
    case "RealHeight":
      objectFit = "contain";
      break;
    case "Clip":
      objectFit = "cover";
      break;
    case "FillFrame":
    default:
      objectFit = "fill";
      break;
  }

  // Handle alignment
  const hAlignMap: Record<string, string> = {
    Left: "left",
    Center: "center",
    Right: "right",
  };
  const vAlignMap: Record<string, string> = {
    Top: "top",
    Middle: "center",
    Bottom: "bottom",
  };

  objectPosition = `${hAlignMap[hAlign] || "center"} ${vAlignMap[vAlign] || "center"}`;

  return {
    objectFit,
    objectPosition,
  };
});

// Parse the image expression and extract the URL
const imageUrl = computed(() => {
  if (!props.element.imageExpression || imageError.value) return null;

  let expr = props.element.imageExpression.trim();
  // Check whether it's a string wrapped in double quotes
  if (expr.startsWith('"') && expr.endsWith('"') && expr.length >= 2) {
    expr = expr.slice(1, -1).trim();
  }
  if (!expr) return null;

  // Support base64 data URLs, http(s) URLs, relative/absolute paths, and blob URLs
  if (
    expr.startsWith("data:image/") ||
    expr.startsWith("http://") ||
    expr.startsWith("https://") ||
    expr.startsWith("/") ||
    expr.startsWith("./") ||
    expr.startsWith("blob:")
  ) {
    return expr;
  }

  try {
    new URL(expr);
    return expr;
  } catch {
    return null;
  }
});

// Allowed file types: only images - png, jpg, jpeg
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg"];
const FORMAT_ERROR_MESSAGE =
  "You cannot upload this file, image format does not support";

function validateImageFile(file: File): boolean {
  if (file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }
  const name = file.name ? file.name.toLowerCase() : "";
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function showFormatError() {
  try {
    const { message } = createDiscreteApi(["message"]);
    message.error(FORMAT_ERROR_MESSAGE);
  } catch {
    // Discrete API fallback
  }
  alert(FORMAT_ERROR_MESSAGE);
}

function processImageFile(file: File) {
  if (!validateImageFile(file)) {
    showFormatError();
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    if (dataUrl) {
      props.element.imageExpression = `"${dataUrl}"`;
      imageError.value = false;
      emit("update-jrxml");
    }
  };
  reader.onerror = () => {
    showFormatError();
  };
  reader.readAsDataURL(file);
}

function triggerFileInput() {
  if (fileInputRef.value) {
    fileInputRef.value.value = "";
    fileInputRef.value.click();
  }
}

function handleFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processImageFile(file);
  }
}

function handleDragOver(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "copy";
  }
  isDraggingOver.value = true;
}

function handleDragLeave() {
  isDraggingOver.value = false;
}

function handleDrop(event: DragEvent) {
  isDraggingOver.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    processImageFile(file);
  }
}

// Handle image load error
const handleImageError = () => {
  imageError.value = true;
};

// Handle selection
const handleSelect = (
  bandIndex: number,
  elementIndex: number,
  isMultiSelect?: boolean,
) => {
  emit(
    "select",
    bandIndex,
    elementIndex,
    isMultiSelect,
    props.parentFrameIndex,
  );
};

// Handle drag start
const handleDragStart = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
) => {
  emit("dragStart", event, bandIndex, elementIndex, props.parentFrameIndex);
};

// Handle resize start
const handleResizeStart = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  _parentFrameIndex?: number,
  direction?: string,
) => {
  emit("resizeStart", event, bandIndex, elementIndex, props.parentFrameIndex, direction);
};

// Handle context menu
const handleContextMenu = (event: MouseEvent, bandIndex: number, elementIndex: number) => {
  emit("contextmenu", event, bandIndex, elementIndex, props.parentFrameIndex);
};
</script>

<style scoped>
.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.image-upload-zone {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #93c5fd;
  border-radius: 4px;
  background-color: #f8faff;
  color: #4b5563;
  cursor: pointer;
  padding: 4px;
  text-align: center;
  transition: all 0.2s ease;
  user-select: none;
  overflow: hidden;
}

.image-upload-zone:hover,
.image-upload-zone.is-drag-over {
  border-color: #2563eb;
  background-color: #eff6ff;
  color: #1d4ed8;
}

.upload-icon {
  width: 22px;
  height: 22px;
  margin-bottom: 4px;
  stroke: currentColor;
  flex-shrink: 0;
}

.upload-text {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  margin-bottom: 2px;
  word-break: break-word;
}

.upload-hint {
  font-size: 10px;
  opacity: 0.75;
  font-weight: 600;
  color: #6b7280;
}

.image-preview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 2px;
}

.image-overlay {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 15;
}

.change-image-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
  border: none;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  cursor: pointer;
  backdrop-filter: blur(2px);
  transition: background 0.2s;
}

.change-image-btn.icon-only {
  padding: 3px 4px;
}

.change-image-btn:hover {
  background: rgba(0, 0, 0, 0.85);
}
</style>
