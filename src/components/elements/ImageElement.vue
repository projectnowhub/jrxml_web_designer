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
    @rotate="(b, e, p) => emit('rotate', b, e, p)"
    @save-state="emit('save-state')"
  >
    <div
      class="image-container"
      :style="[rotationStyle, cornerRadiusStyle]"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- Stored image (fileRef) that can't be displayed yet: show its name instead of an empty dropzone -->
      <div
        v-if="!imageUrl && storedFileRef"
        class="image-upload-zone is-stored"
        @click.stop="triggerFileInput"
        @dragover.prevent.stop="handleDragOver"
        @dragenter.prevent.stop="handleDragOver"
        @dragleave.prevent.stop="handleDragLeave"
        @drop.prevent.stop="handleDrop"
        :title="getImageName(element) || storedFileRef"
      >
        <span class="upload-text">{{ getImageName(element) || t("properties.storedImage") }}</span>
        <span class="upload-hint">{{
          isResolvingStoredImage ? t("properties.loadingImage") : t("properties.storedImagePreviewUnavailable")
        }}</span>
      </div>

      <!-- Upload Dropzone when no image is loaded -->
      <div
        v-else-if="!imageUrl"
        class="image-upload-zone"
        :class="{ 'is-drag-over': isDraggingOver, 'is-uploading': isUploading }"
        @click.stop="triggerFileInput"
        @dragover.prevent.stop="handleDragOver"
        @dragenter.prevent.stop="handleDragOver"
        @dragleave.prevent.stop="handleDragLeave"
        @drop.prevent.stop="handleDrop"
        :title="
          t('properties.dropOrClickToUpload')
        "
      >
        <Upload class="upload-icon" :stroke-width="1.75" />
        <span class="upload-text">{{
          t("properties.dropOrClickToUpload")
        }}</span>
        <span class="upload-hint">{{
          isUploading ? t("properties.uploadingImage") : t("properties.imageUploadHint")
        }}</span>
      </div>

      <!-- Preview Image when image is loaded -->
      <div
        v-else
        class="image-preview-wrapper"
        :title="t('properties.doubleClickToCrop')"
        @dragover.prevent.stop="handleDragOver"
        @dragenter.prevent.stop="handleDragOver"
        @dragleave.prevent.stop="handleDragLeave"
        @drop.prevent.stop="handleDrop"
        @dblclick.stop="startCropping"
      >
        <img
          :src="imageUrl"
          class="preview-image"
          :class="{ 'is-cropped': !!croppedImageStyle }"
          :style="croppedImageStyle || imageStyle"
          :alt="t('properties.imagePreview')"
          @error="handleImageError"
          @dragstart.prevent=""
        />
        <!-- Change Image button when hovered or selected -->
        <div v-if="(isSelected || isHovered) && !cropSession" class="image-overlay" @click.stop>
          <button
            type="button"
            class="change-image-btn"
            :class="{ 'icon-only': !showChangeImageText }"
            @click.stop="triggerFileInput"
            :title="t('properties.changeImage')"
          >
            <Upload :size="12" />
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

    <!-- Crop mode (Google Docs style): the whole original image is shown faded around the
         element, the kept area stays bright, and black handles adjust it -->
    <div
      v-if="cropSession && imageUrl"
      ref="cropLayerRef"
      class="image-crop-layer"
      @mousedown.stop
      @click.stop
      @dblclick.stop="applyCrop"
      @contextmenu.stop.prevent
    >
      <!-- Rotated exactly like the image, so cropping works in the picture's own orientation -->
      <div class="crop-frame" :style="cropFrameStyle">
        <img
          :src="imageUrl"
          class="crop-full-image"
          :style="rectStyle(cropSession.full)"
          alt=""
          @dragstart.prevent=""
        />
        <div
          class="crop-window"
          :style="rectStyle(cropSession.rect)"
          @mousedown.stop.prevent="startCropDrag('move', $event)"
        >
          <img
            :src="imageUrl"
            class="crop-window-image"
            :style="cropWindowImageStyle"
            alt=""
            @dragstart.prevent=""
          />
          <span
            v-for="handle in CROP_HANDLES"
            :key="handle"
            class="crop-handle"
            :class="`crop-handle-${handle}`"
            @mousedown.stop.prevent="startCropDrag(handle, $event)"
          ></span>
        </div>
      </div>
      <div class="crop-toolbar" :style="cropToolbarStyle">
        <button
          type="button"
          class="crop-btn crop-btn-primary"
          :title="t('properties.cropDone')"
          :aria-label="t('properties.cropDone')"
          @click.stop="applyCrop"
        >
          <Check :stroke-width="2.5" />
        </button>
        <button
          type="button"
          class="crop-btn"
          :title="t('properties.cropReset')"
          :aria-label="t('properties.cropReset')"
          @click.stop="resetCrop"
        >
          <RotateCcw :stroke-width="2.2" />
        </button>
        <button
          type="button"
          class="crop-btn"
          :title="t('properties.cropCancel')"
          :aria-label="t('properties.cropCancel')"
          @click.stop="cancelCrop"
        >
          <X :stroke-width="2.5" />
        </button>
      </div>
    </div>
  </BaseElement>
</template>

<script setup lang="ts">
import { Check, RotateCcw, Upload, X } from "@lucide/vue";
import { computed, inject, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { createDiscreteApi } from "naive-ui";
import BaseElement from "./BaseElement.vue";
import type { ImageElement, SelectedElementInfo } from "../../types";
import {
  imageCornerRadiusCss,
  getImageCrop,
  getImageName,
  setImageCrop,
  setImageName,
} from "../../utils/elementUtils";
import {
  ImageUploadError,
  isFileRef,
  resolveFileRefDisplayUrl,
  resolveImageSource,
  toImageExpression,
} from "../../services/imageService";

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


// Rounded corners (Style Settings → Corner radius); the container clips the picture
const cornerRadiusStyle = computed(() => {
  const radius = imageCornerRadiusCss(props.element);
  return radius ? { borderRadius: radius } : {};
});

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
  "save-state": [];
  rotate: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Visual 90-degree step rotation style
const rotationStyle = computed(() => {
  const rot = props.element.rotation;
  if (!rot || rot === 'None') return {};

  const w = props.element.width;
  const h = props.element.height;

  if (rot === 'Right') {
    return {
      position: 'absolute' as const,
      width: `${h}px`,
      height: `${w}px`,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%) rotate(90deg)',
      transformOrigin: 'center center',
    };
  }
  if (rot === 'Left') {
    return {
      position: 'absolute' as const,
      width: `${h}px`,
      height: `${w}px`,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%) rotate(-90deg)',
      transformOrigin: 'center center',
    };
  }
  if (rot === 'UpsideDown') {
    return {
      width: '100%',
      height: '100%',
      transform: 'rotate(180deg)',
      transformOrigin: 'center center',
    };
  }
  return {};
});

// UI state
const isHovered = ref(false);
const isDraggingOver = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const imageError = ref(false);
const isUploading = ref(false);

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
  // Imported JRXML populates scaleImage; elements created in the designer use scaleType
  const scaleType = props.element.scaleType || props.element.scaleImage || "FillFrame";
  const hAlign = props.element.hAlign || "Center";
  const vAlign = props.element.vAlign || "Middle";

  let objectFit: "fill" | "contain" | "cover" | "none" | "scale-down";
  let objectPosition: string;

  // Mirrors how JasperReports draws the image inside its frame, so the canvas matches the PDF
  switch (scaleType) {
    case "RetainShape":
      objectFit = "contain";
      break;
    case "Clip":
      objectFit = "none";
      break;
    case "RealSize":
    case "RealHeight":
      objectFit = "scale-down";
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

// The image expression without the surrounding Java string quotes
const imageSource = computed(() => {
  let expr = (props.element.imageExpression || "").trim();
  // Check whether it's a string wrapped in double quotes
  if (expr.startsWith('"') && expr.endsWith('"') && expr.length >= 2) {
    expr = expr.slice(1, -1).trim();
  }
  return expr;
});

// Stored images (e.g. "hetzner-s3://...") can't be loaded by the browser directly,
// so they are resolved to an object URL through the image service
const storedFileRef = computed(() =>
  isFileRef(imageSource.value) ? imageSource.value : null,
);
const storedImageUrl = ref<string | null>(null);
const isResolvingStoredImage = ref(false);

watch(
  storedFileRef,
  async (fileRef) => {
    storedImageUrl.value = null;
    if (!fileRef) return;
    isResolvingStoredImage.value = true;
    try {
      const url = await resolveFileRefDisplayUrl(fileRef);
      if (storedFileRef.value === fileRef) {
        storedImageUrl.value = url;
        imageError.value = false;
      }
    } catch {
      // Falls back to the stored-image placeholder
    } finally {
      if (storedFileRef.value === fileRef) isResolvingStoredImage.value = false;
    }
  },
  { immediate: true },
);

// Parse the image expression and extract the URL
const imageUrl = computed(() => {
  if (!props.element.imageExpression || imageError.value) return null;

  const expr = imageSource.value;
  if (!expr) return null;
  if (storedFileRef.value) return storedImageUrl.value;

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

function showUploadError(message: string) {
  try {
    const { message: discreteMessage } = createDiscreteApi(["message"]);
    discreteMessage.error(message);
  } catch {
    // Discrete API fallback
  }
  alert(message);
}

async function processImageFile(file: File) {
  if (isUploading.value) return;
  isUploading.value = true;
  try {
    const source = await resolveImageSource(file);
    // Undo snapshot before the element changes
    emit("save-state");
    props.element.imageExpression = toImageExpression(source);
    // Remember the uploaded file name so the panels can show it
    setImageName(props.element, file.name || "");
    // A crop belongs to the previous picture
    setImageCrop(props.element, null);
    imageError.value = false;
    emit("update-jrxml");
  } catch (error) {
    console.error("Image upload failed:", error);
    showUploadError(
      error instanceof ImageUploadError
        ? t(error.messageKey, error.params)
        : t("imageUpload.uploadFailed"),
    );
  } finally {
    isUploading.value = false;
  }
}

function triggerFileInput() {
  if (isUploading.value) return;
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

// ---------------------------------------------------------------------------
// Non-destructive crop (Google Docs style). The original image is never changed:
// the element box shows only the cropped part, and the crop is stored as fractions of
// the original image (see IMAGE_CROP_PROPERTY), so double-clicking shows the full
// image again and the crop can be widened or reset at any time.
// ---------------------------------------------------------------------------

// A rectangle in unzoomed canvas pixels. During cropping, rectangles are in the image's own
// (unrotated) frame; localRectToElement() maps them onto the element box.
interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type CropDragMode = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const CROP_HANDLES: CropDragMode[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const MIN_CROP_SIZE = 10;

const imageCrop = computed(() => getImageCrop(props.element));

// Positions the full image so only the cropped part fills the element box
const croppedImageStyle = computed(() => {
  const crop = imageCrop.value;
  if (!crop) return null;
  const visibleW = 1 - crop.left - crop.right;
  const visibleH = 1 - crop.top - crop.bottom;
  return {
    width: `${100 / visibleW}%`,
    height: `${100 / visibleH}%`,
    left: `${(-crop.left / visibleW) * 100}%`,
    top: `${(-crop.top / visibleH) * 100}%`,
  };
});

// Clockwise degrees matching rotationStyle (Right = 90, Left = -90, UpsideDown = 180)
type QuarterAngle = 0 | 90 | -90 | 180;

interface CropSessionState {
  full: CropRect; // where the whole original image sits (image frame)
  rect: CropRect; // the part being kept (image frame)
  initial: CropRect;
  angle: QuarterAngle;
  boxW: number; // element box when cropping started
  boxH: number;
  localW: number; // the image frame: the element box before rotation
  localH: number;
}

const cropSession = ref<CropSessionState | null>(null);

const ROTATION_ANGLES: Record<string, QuarterAngle> = { Right: 90, Left: -90, UpsideDown: 180 };

// Rotates a vector clockwise by a multiple of 90° (CSS rotate(), y pointing down)
function rotateVector(x: number, y: number, angle: number): { x: number; y: number } {
  switch (angle) {
    case 90:
      return { x: -y, y: x };
    case -90:
      return { x: y, y: -x };
    case 180:
    case -180:
      return { x: -x, y: -y };
    default:
      return { x, y };
  }
}

// Maps a rectangle from the image frame onto the (unrotated) element box
function localRectToElement(rect: CropRect, session: CropSessionState): CropRect {
  const offset = rotateVector(
    rect.x + rect.w / 2 - session.localW / 2,
    rect.y + rect.h / 2 - session.localH / 2,
    session.angle,
  );
  const quarterTurn = Math.abs(session.angle) === 90;
  const w = quarterTurn ? rect.h : rect.w;
  const h = quarterTurn ? rect.w : rect.h;
  const centerX = session.boxW / 2 + offset.x;
  const centerY = session.boxH / 2 + offset.y;
  return { x: centerX - w / 2, y: centerY - h / 2, w, h };
}

// Same placement and rotation as the image container (see rotationStyle)
const cropFrameStyle = computed(() => {
  const session = cropSession.value;
  if (!session) return {};
  return {
    left: `${(session.boxW - session.localW) / 2}px`,
    top: `${(session.boxH - session.localH) / 2}px`,
    width: `${session.localW}px`,
    height: `${session.localH}px`,
    transform: session.angle ? `rotate(${session.angle}deg)` : undefined,
  };
});
const cropLayerRef = ref<HTMLElement | null>(null);

const rectStyle = (rect: CropRect) => ({
  left: `${rect.x}px`,
  top: `${rect.y}px`,
  width: `${rect.w}px`,
  height: `${rect.h}px`,
});

// Inside the bright crop window, the full image is offset so the same pixels line up
const cropWindowImageStyle = computed(() => {
  const session = cropSession.value;
  if (!session) return {};
  const { full, rect } = session;
  return rectStyle({ x: full.x - rect.x, y: full.y - rect.y, w: full.w, h: full.h });
});

// The toolbar is not rotated: it sits below the image, whatever the rotation
const cropToolbarStyle = computed(() => {
  const session = cropSession.value;
  if (!session) return {};
  const full = localRectToElement(session.full, session);
  const rect = localRectToElement(session.rect, session);
  return { left: `${rect.x}px`, top: `${Math.max(full.y + full.h, rect.y + rect.h) + 8}px` };
});

function startCropping() {
  if (cropSession.value || !imageUrl.value) return;

  const boxW = Number(props.element.width) || 0;
  const boxH = Number(props.element.height) || 0;
  if (boxW <= 0 || boxH <= 0) return;

  const angle = ROTATION_ANGLES[props.element.rotation || ""] ?? 0;
  // A quarter-turned image is drawn in a frame with width and height swapped
  const quarterTurn = Math.abs(angle) === 90;
  const localW = quarterTurn ? boxH : boxW;
  const localH = quarterTurn ? boxW : boxH;

  const crop = imageCrop.value ?? { left: 0, top: 0, right: 0, bottom: 0 };
  const fullW = localW / (1 - crop.left - crop.right);
  const fullH = localH / (1 - crop.top - crop.bottom);
  const full = { x: -crop.left * fullW, y: -crop.top * fullH, w: fullW, h: fullH };
  const rect = { x: 0, y: 0, w: localW, h: localH };
  cropSession.value = {
    full,
    rect: { ...rect },
    initial: rect,
    angle,
    boxW,
    boxH,
    localW,
    localH,
  };

  window.addEventListener("keydown", handleCropKeydown, true);
  document.addEventListener("mousedown", handleCropOutsideMouseDown, true);
}

function endCropping() {
  cropSession.value = null;
  window.removeEventListener("keydown", handleCropKeydown, true);
  document.removeEventListener("mousedown", handleCropOutsideMouseDown, true);
}

function applyCrop() {
  const session = cropSession.value;
  if (!session) return;
  const { full, rect, initial } = session;
  const kept = localRectToElement(rect, session);
  endCropping();

  const unchanged =
    Math.abs(rect.x - initial.x) < 0.5 &&
    Math.abs(rect.y - initial.y) < 0.5 &&
    Math.abs(rect.w - initial.w) < 0.5 &&
    Math.abs(rect.h - initial.h) < 0.5;
  if (unchanged) return;

  // Undo snapshot before the element changes
  emit("save-state");
  setImageCrop(props.element, {
    left: (rect.x - full.x) / full.w,
    top: (rect.y - full.y) / full.h,
    right: (full.x + full.w - (rect.x + rect.w)) / full.w,
    bottom: (full.y + full.h - (rect.y + rect.h)) / full.h,
  });
  // The element box becomes the kept area, so the picture doesn't move on the page
  props.element.x = Math.round((Number(props.element.x) || 0) + kept.x);
  props.element.y = Math.round((Number(props.element.y) || 0) + kept.y);
  props.element.width = Math.max(1, Math.round(kept.w));
  props.element.height = Math.max(1, Math.round(kept.h));
  emit("update-jrxml");
}

function cancelCrop() {
  endCropping();
}

// Shows the whole image again; applied with Done like any other crop change
function resetCrop() {
  const session = cropSession.value;
  if (session) session.rect = { ...session.full };
}

function handleCropKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();
    applyCrop();
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    cancelCrop();
  } else if (event.key === "Delete" || event.key === "Backspace") {
    // Don't delete the element while cropping
    event.stopPropagation();
  }
}

// Clicking anywhere outside the crop UI applies the crop, as in Google Docs
function handleCropOutsideMouseDown(event: MouseEvent) {
  const target = event.target as Node | null;
  if (target && cropLayerRef.value?.contains(target)) return;
  applyCrop();
}

function startCropDrag(mode: CropDragMode, event: MouseEvent) {
  const session = cropSession.value;
  if (!session || event.button !== 0) return;

  // Screen pixels -> canvas pixels (the canvas is zoomed)
  const elementBox = cropLayerRef.value?.parentElement?.getBoundingClientRect();
  const width = Number(props.element.width) || 1;
  const scale = elementBox && elementBox.width > 0 ? elementBox.width / width : 1;

  const startX = event.clientX;
  const startY = event.clientY;
  const start = { ...session.rect };
  const full = session.full;
  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const onMove = (moveEvent: MouseEvent) => {
    // Mouse movement on screen -> movement in the (possibly rotated) image frame
    const local = rotateVector(
      (moveEvent.clientX - startX) / scale,
      (moveEvent.clientY - startY) / scale,
      -session.angle,
    );
    const dx = local.x;
    const dy = local.y;
    const next = { ...start };

    if (mode === "move") {
      next.x = clamp(start.x + dx, full.x, full.x + full.w - start.w);
      next.y = clamp(start.y + dy, full.y, full.y + full.h - start.h);
    } else {
      if (mode.includes("w")) {
        next.x = clamp(start.x + dx, full.x, start.x + start.w - MIN_CROP_SIZE);
        next.w = start.x + start.w - next.x;
      }
      if (mode.includes("e")) {
        next.w = clamp(start.w + dx, MIN_CROP_SIZE, full.x + full.w - start.x);
      }
      if (mode.includes("n")) {
        next.y = clamp(start.y + dy, full.y, start.y + start.h - MIN_CROP_SIZE);
        next.h = start.y + start.h - next.y;
      }
      if (mode.includes("s")) {
        next.h = clamp(start.h + dy, MIN_CROP_SIZE, full.y + full.h - start.y);
      }
    }
    session.rect = next;
  };

  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

// Leave crop mode if the element is deselected some other way (e.g. keyboard)
watch(
  () => isSelected.value,
  (selected) => {
    if (!selected && cropSession.value) applyCrop();
  },
);

onBeforeUnmount(endCropping);

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

.image-upload-zone.is-stored {
  border-style: solid;
  border-color: #cbd5e1;
  background-color: #f8fafc;
}

.image-upload-zone.is-uploading {
  cursor: progress;
  opacity: 0.7;
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

/* Fills the element frame; object-fit (from scaleType) decides how the image sits inside it */
.preview-image {
  width: 100%;
  height: 100%;
  display: block;
}

/* Cropped: the full image is larger than the frame and offset; the wrapper clips it */
.preview-image.is-cropped {
  position: absolute;
  max-width: none;
  max-height: none;
  object-fit: fill;
}

/* Crop mode */
.image-crop-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  overflow: visible;
  z-index: 200;
  cursor: default;
}

.crop-frame {
  position: absolute;
  transform-origin: center center;
}

.crop-full-image {
  position: absolute;
  max-width: none;
  opacity: 0.35;
  pointer-events: none;
  user-select: none;
}

.crop-window {
  position: absolute;
  overflow: hidden;
  cursor: move;
  outline: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}

.crop-window-image {
  position: absolute;
  max-width: none;
  pointer-events: none;
  user-select: none;
}

.crop-handle {
  position: absolute;
  z-index: 1;
  border: 0 solid #202124;
}

/* Corners: black "L" marks */
.crop-handle-nw,
.crop-handle-ne,
.crop-handle-se,
.crop-handle-sw {
  width: 14px;
  height: 14px;
}
.crop-handle-nw { left: 0; top: 0; border-left-width: 4px; border-top-width: 4px; cursor: nwse-resize; }
.crop-handle-ne { right: 0; top: 0; border-right-width: 4px; border-top-width: 4px; cursor: nesw-resize; }
.crop-handle-se { right: 0; bottom: 0; border-right-width: 4px; border-bottom-width: 4px; cursor: nwse-resize; }
.crop-handle-sw { left: 0; bottom: 0; border-left-width: 4px; border-bottom-width: 4px; cursor: nesw-resize; }

/* Edges: short black bars in the middle of each side */
.crop-handle-n,
.crop-handle-s {
  left: 50%;
  width: 16px;
  height: 4px;
  margin-left: -8px;
  background: #202124;
  cursor: ns-resize;
}
.crop-handle-n { top: 0; }
.crop-handle-s { bottom: 0; }
.crop-handle-e,
.crop-handle-w {
  top: 50%;
  width: 4px;
  height: 16px;
  margin-top: -8px;
  background: #202124;
  cursor: ew-resize;
}
.crop-handle-e { right: 0; }
.crop-handle-w { left: 0; }

.crop-toolbar {
  position: absolute;
  display: flex;
  gap: 4px;
  white-space: nowrap;
  font-size: 11px;
}

.crop-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid #d0d7de;
  background: #ffffff;
  color: #24292f;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.crop-btn svg {
  width: 14px;
  height: 14px;
}

.crop-btn:hover {
  background: #f3f4f6;
}

.crop-btn-primary {
  background: #1a73e8;
  border-color: #1a73e8;
  color: #ffffff;
}

.crop-btn-primary:hover {
  background: #1765cc;
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
