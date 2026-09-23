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
    @start-editing="handleStartEditing"
    @auto-fit-height="handleAutoFit"
  >
    <div
      class="text-element-inner"
      :style="{ justifyContent: verticalFlexJustify }"
      @mousedown="isEditing ? $event.stopPropagation() : undefined"
    >
      <!-- Rich contenteditable inline editor -->
      <div
        v-if="isEditing"
        ref="editInput"
        class="inline-edit-contenteditable"
        :style="typographyStyle"
        contenteditable="true"
        spellcheck="false"
        placeholder="Enter text..."
        @mousedown.stop="handleEditorMouseDown"
        @mouseup="handleEditorMouseUp"
        @dblclick.stop
        @dragstart.stop
        @keydown="handleKeyDown"
        @keyup="handleSelectionUpdate"
        @input="handleInput"
        @blur="handleBlur"
      ></div>

      <!-- Canvas display (supports HTML markup & plain text) -->
      <div
        v-else
        ref="contentContainer"
        class="text-content-display"
        :class="{ 'is-placeholder': !hasContent }"
        :style="typographyStyle"
        @click="handleContentClick"
      >
        <span v-if="hasRichMarkup" class="rich-html-span" v-html="renderedHtmlContent"></span>
        <template v-else>
          {{ hasContent ? displayText : (t('properties.defaultTextFieldExpression') || 'Text') }}
        </template>
      </div>
    </div>

    <!-- Overflow Warning Badge (Option A) -->
    <div
      v-if="showOverflowBadge"
      class="text-overflow-badge"
      title="Text exceeds element height. Click to auto-fit height"
      @click.stop="handleAutoFit"
      @mousedown.stop
    >
      <span class="overflow-badge-icon">⚠</span>
      <span class="overflow-badge-text">Fit</span>
    </div>

    <!-- Floating Rich-Text & Hyperlink Toolbar -->
    <TextFormatToolbar
      ref="formatToolbarRef"
      :visible="toolbarVisible && isEditing"
      :position="toolbarPosition"
      :active-formats="activeFormats"
      :current-link="currentLink"
      :selected-text="currentSelectionText"
      @format="handleFormat"
      @apply-link="handleApplyLink"
      @remove-link="handleRemoveLink"
      @close="toolbarVisible = false"
    />

    <!-- Google Docs Style Link Hover Card / Preview Chip -->
    <Teleport to="body">
      <div
        v-if="activeLinkPreview"
        class="link-preview-chip"
        :style="linkPreviewStyle"
        @mousedown.stop
      >
        <span class="preview-type-icon">
          <Globe v-if="activeLinkPreview.type === 'url'" :size="13" />
          <Mail v-else-if="activeLinkPreview.type === 'email'" :size="13" />
          <Phone v-else :size="13" />
        </span>
        <a
          :href="activeLinkPreview.url"
          target="_blank"
          rel="noopener noreferrer"
          class="preview-url-link"
          :title="activeLinkPreview.url"
          @click.stop
        >
          {{ activeLinkPreview.label }}
        </a>
        <button
          type="button"
          class="chip-action-btn"
          title="Open Link"
          @click.stop="openPreviewLink(activeLinkPreview.url)"
        >
          <ExternalLink :size="12" />
        </button>
        <button
          type="button"
          class="chip-action-btn"
          :title="copiedFeedback ? 'Copied!' : 'Copy Link'"
          @click.stop="copyPreviewLink(activeLinkPreview.url)"
        >
          <Check v-if="copiedFeedback" :size="12" class="copy-success-icon" />
          <Copy v-else :size="12" />
        </button>
        <button
          type="button"
          class="chip-action-btn"
          title="Edit Link"
          @click.stop="editPreviewLink"
        >
          <Pencil :size="12" />
        </button>
        <button
          type="button"
          class="chip-action-btn chip-unlink-btn"
          title="Remove Link"
          @click.stop="unlinkPreviewLink"
        >
          <Unlink :size="12" />
        </button>
        <button
          type="button"
          class="chip-close-btn"
          title="Close"
          @click.stop="activeLinkPreview = null"
        >
          <X :size="11" />
        </button>
      </div>
    </Teleport>
  </BaseElement>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Globe,
  Mail,
  Phone,
  ExternalLink,
  Link as LinkIcon,
  Unlink,
  X,
  Copy,
  Check,
  Pencil,
} from '@lucide/vue';
import BaseElement from './BaseElement.vue';
import TextFormatToolbar from './TextFormatToolbar.vue';
import type { TextFieldElement, SelectedElementInfo, EditingElementInfo } from '../../types';

const { t } = useI18n();

// Props
const props = defineProps<{
  element: TextFieldElement;
  bandIndex: number;
  elementIndex: number;
  selectedElement: SelectedElementInfo | null;
  selectedElements?: { bandIndex: number; elementIndex: number; parentFrameIndex?: number; uuid?: string }[];
  editingElement: EditingElementInfo | null;
  isDragging?: boolean;
  isOutOfBounds?: boolean;
  reportFontFamily?: string;
  reportFontSize?: number;
  reportIsBold?: boolean;
  reportIsItalic?: boolean;
  reportIsUnderline?: boolean;
  parentFrameIndex?: number;
  pageNumber?: number;
  totalPages?: number;
}>();

// Emits
const emit = defineEmits<{
  select: [bandIndex: number, elementIndex: number, isMultiSelect?: boolean, parentFrameIndex?: number];
  dragStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  resizeStart: [event: MouseEvent, bandIndex: number, elementIndex: number, parentFrameIndex?: number, direction?: string];
  updateElement: [];
  'update-jrxml': [];
  checkFields: [fields: string[]];
  startEditing: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
  finishEditing: [];
  cancelEditing: [];
  autoFitHeight: [bandIndex: number, elementIndex: number, parentFrameIndex?: number];
}>();

// Helper to check if string contains rich HTML formatting tags
const hasHtmlTags = (str: string): boolean => {
  return /<\/?(b|strong|i|em|u|s|strike|del|font|a|span|p|div|br)\b[^>]*>/i.test(str);
};

// HTML sanitizer: allows safe formatting tags & attributes
const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '')
    .replace(/javascript:/gi, '');
};

// Rendered HTML content for canvas view
const renderedHtmlContent = computed(() => {
  let expr = props.element.expression || '';
  const trimmed = expr.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    expr = trimmed.slice(1, -1);
  }
  expr = expr.replace(/\\"/g, '"').replace(/\\n/g, '<br>');
  return sanitizeHtml(expr);
});

// Clean display text for plain expressions (preserves linebreaks, strips literal quotes)
const displayText = computed(() => {
  if (props.element.expression) {
    const expr = props.element.expression;
    if (props.pageNumber !== undefined && expr.includes('$V{PAGE_NUMBER}')) {
      const pNum = String(props.pageNumber);
      const totalP = String(props.totalPages || props.pageNumber);

      if (expr.trim() === '$V{PAGE_NUMBER}') {
        return pNum;
      }

      let evaluated = expr;
      if (evaluated.includes('" of "') || evaluated.includes('" / "') || evaluated.includes('"/"')) {
        let count = 0;
        evaluated = evaluated.replace(/\$V\{PAGE_NUMBER\}/g, () => {
          count++;
          return count === 1 ? pNum : totalP;
        });
      } else {
        evaluated = evaluated.replace(/\$V\{PAGE_NUMBER\}/g, pNum);
      }

      evaluated = evaluated
        .replace(/"\s*\+\s*/g, '')
        .replace(/\s*\+\s*"/g, '')
        .replace(/\s*\+\s*/g, ' ')
        .replace(/^"|"$/g, '');
      return evaluated.replace(/\\n/g, '\n');
    }

    // Strip surrounding quotes for plain literal strings so user sees clean text
    const trimmed = expr.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      return trimmed.slice(1, -1).replace(/\\n/g, '\n');
    }

    return expr.replace(/\\n/g, '\n');
  }
  return '';
});

const hasRichMarkup = computed(() => {
  return props.element.markup === 'html' || hasHtmlTags(props.element.expression || '');
});

const hasContent = computed(() => {
  if (hasRichMarkup.value) {
    return renderedHtmlContent.value.trim().length > 0;
  }
  return displayText.value.trim().length > 0;
});

// Refs
const editInput = ref<HTMLDivElement | null>(null);
const contentContainer = ref<HTMLElement | null>(null);
const formatToolbarRef = ref<InstanceType<typeof TextFormatToolbar> | null>(null);

const originalValue = ref('');
const isOverflowing = ref(false);

// Floating toolbar state
const toolbarVisible = ref(false);
const toolbarPosition = ref({ x: 0, y: 0 });
const currentSelectionText = ref('');
const copiedFeedback = ref(false);
const savedSelectionRange = ref<Range | null>(null);
const activeFormats = ref({
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  link: false,
  color: '',
  highlight: '',
});
const currentLink = ref<{ url: string; label?: string; type?: 'url' | 'email' | 'phone' } | undefined>(undefined);

// Link preview chip in view mode
const activeLinkPreview = ref<{
  url: string;
  label: string;
  type: 'url' | 'email' | 'phone';
  position: { x: number; y: number };
  linkTop?: number;
  linkCenter?: number;
} | null>(null);

const pendingEditLink = ref<{ url: string; label: string; center?: number; top?: number } | null>(null);
const pendingUnlink = ref<{ url: string; label: string } | null>(null);

const linkPreviewStyle = computed(() => {
  if (!activeLinkPreview.value) return {};
  return {
    top: `${activeLinkPreview.value.position.y}px`,
    left: `${activeLinkPreview.value.position.x}px`,
  };
});

// Whether currently editing
const isEditing = computed(() => {
  return (
    props.editingElement !== null &&
    props.editingElement.bandIndex === props.bandIndex &&
    props.editingElement.elementIndex === props.elementIndex &&
    props.editingElement.parentFrameIndex === props.parentFrameIndex
  );
});

// Whether currently selected
const isSelected = computed(() => {
  if (props.element.uuid) {
    if (props.selectedElements && props.selectedElements.length > 0) {
      return props.selectedElements.some((el) => el.uuid === props.element.uuid);
    }
    if (props.selectedElement && props.selectedElement.uuid) {
      return props.selectedElement.uuid === props.element.uuid;
    }
  }

  const getPFI = (pfi: number | undefined) => (pfi === undefined ? -1 : pfi);
  const currentPFI = getPFI(props.parentFrameIndex);

  if (props.selectedElements && props.selectedElements.length > 0) {
    return props.selectedElements.some(
      (el) =>
        el.bandIndex === props.bandIndex &&
        el.elementIndex === props.elementIndex &&
        getPFI(el.parentFrameIndex) === currentPFI,
    );
  }

  return (
    props.selectedElement &&
    props.selectedElement.bandIndex === props.bandIndex &&
    props.selectedElement.elementIndex === props.elementIndex &&
    getPFI(props.selectedElement.parentFrameIndex) === currentPFI
  );
});

// Show overflow badge only when element is selected and content is clipped
const showOverflowBadge = computed(() => {
  return isSelected.value && isOverflowing.value && !isEditing.value;
});

// Check if content overflows current element height
const checkOverflow = () => {
  if (contentContainer.value && !isEditing.value) {
    isOverflowing.value = contentContainer.value.scrollHeight > props.element.height + 2;
  } else {
    isOverflowing.value = false;
  }
};

watch(
  [
    () => props.element.expression,
    () => props.element.width,
    () => props.element.height,
    () => props.element.fontSize,
  ],
  () => {
    nextTick(checkOverflow);
  },
  { flush: 'post' },
);

// Helper: place caret at the end of contenteditable container
const placeCaretAtEnd = (el: HTMLElement) => {
  el.focus();
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
};

// Find closest <a> link tag in ancestor hierarchy
const getAncestorLink = (node: Node | null): HTMLAnchorElement | null => {
  let curr: Node | null = node;
  while (curr && curr !== editInput.value) {
    if (curr.nodeType === Node.ELEMENT_NODE) {
      if ((curr as HTMLElement).tagName === 'A') {
        return curr as HTMLAnchorElement;
      }
      const childA = (curr as HTMLElement).querySelector('a');
      if (childA && curr.textContent === childA.textContent) {
        return childA;
      }
    }
    curr = curr.parentNode;
  }
  return null;
};

// Editor mouse drag selection tracking
const isMouseDownInEditor = ref(false);

const handleEditorMouseDown = () => {
  isMouseDownInEditor.value = true;
  const onWindowMouseUp = () => {
    isMouseDownInEditor.value = false;
    window.removeEventListener('mouseup', onWindowMouseUp);
    nextTick(() => {
      handleSelectionUpdate();
    });
  };
  window.addEventListener('mouseup', onWindowMouseUp);
};

const handleEditorMouseUp = () => {
  isMouseDownInEditor.value = false;
  handleSelectionUpdate();
};

// Track selections to position the floating toolbar
const handleSelectionUpdate = () => {
  if (!isEditing.value || !editInput.value) {
    toolbarVisible.value = false;
    return;
  }

  // If focus is currently inside the floating toolbar (e.g. typing in color text box or link text box),
  // DO NOT hide or reposition the toolbar!
  const activeEl = document.activeElement;
  if (activeEl && activeEl.closest('.text-format-floating-toolbar')) {
    return;
  }

  // If the user is currently holding down the mouse button and dragging to select text,
  // do not show/reposition the floating toolbar yet so it doesn't pop up directly under the user's cursor
  if (isMouseDownInEditor.value) {
    return;
  }

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    toolbarVisible.value = false;
    return;
  }

  const range = sel.getRangeAt(0);
  if (!editInput.value.contains(range.commonAncestorContainer)) {
    toolbarVisible.value = false;
    return;
  }

  // Save the valid selection range for later restoration
  savedSelectionRange.value = range.cloneRange();

  if (sel.isCollapsed) {
    toolbarVisible.value = false;
    currentSelectionText.value = '';

    // Check if cursor is inside an existing link
    const linkEl = getAncestorLink(sel.anchorNode);
    if (linkEl) {
      const href = linkEl.getAttribute('href') || '';
      const rect = linkEl.getBoundingClientRect();
      const clampedX = Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2));
      activeLinkPreview.value = {
        url: href,
        label: linkEl.textContent || href.replace(/^(https?:\/\/|mailto:|tel:)/, ''),
        type: href.startsWith('mailto:') ? 'email' : href.startsWith('tel:') ? 'phone' : 'url',
        position: {
          x: clampedX,
          y: rect.bottom + 6,
        },
        linkTop: rect.top,
        linkCenter: clampedX,
      };
    } else {
      activeLinkPreview.value = null;
    }
    return;
  }

  // Text is actively selected: close link chip so they don't collide
  activeLinkPreview.value = null;

  const selectedText = sel.toString().trim();
  currentSelectionText.value = selectedText;
  if (!selectedText) {
    toolbarVisible.value = false;
    return;
  }

  const rect = range.getBoundingClientRect();
  toolbarPosition.value = {
    x: rect.left + rect.width / 2,
    y: rect.top,
  };
  toolbarVisible.value = true;

  const linkEl = getAncestorLink(sel.anchorNode);
  if (linkEl) {
    const href = linkEl.getAttribute('href') || '';
    currentLink.value = {
      url: href,
      label: linkEl.textContent || '',
      type: href.startsWith('mailto:') ? 'email' : href.startsWith('tel:') ? 'phone' : 'url',
    };
  } else {
    currentLink.value = undefined;
  }

  // Detect highlight / background color
  let highlightVal = '';
  try {
    highlightVal = document.queryCommandValue('hiliteColor') || document.queryCommandValue('backColor') || '';
  } catch (e) {
    highlightVal = '';
  }
  if (!highlightVal || highlightVal === 'rgba(0, 0, 0, 0)' || highlightVal === 'transparent') {
    let pNode: Node | null = sel.anchorNode;
    while (pNode && pNode !== editInput.value) {
      if (pNode.nodeType === Node.ELEMENT_NODE) {
        const bg = (pNode as HTMLElement).style?.backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          highlightVal = bg;
          break;
        }
      }
      pNode = pNode.parentNode;
    }
  }

  activeFormats.value = {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strike: document.queryCommandState('strikeThrough'),
    color: document.queryCommandValue('foreColor') || '',
    highlight: highlightVal,
    link: !!linkEl,
  };
};

const handleDocumentSelectionChange = () => {
  if (isEditing.value) {
    handleSelectionUpdate();
  }
};

const handleOutsideMouseDown = (e: MouseEvent) => {
  if (activeLinkPreview.value) {
    const target = e.target as HTMLElement;
    if (!target.closest('.link-preview-chip') && !target.closest('a')) {
      activeLinkPreview.value = null;
    }
  }
};

watch(
  () => isSelected.value,
  (selected) => {
    if (!selected) {
      activeLinkPreview.value = null;
      toolbarVisible.value = false;
    }
  }
);

onMounted(() => {
  nextTick(checkOverflow);
  document.addEventListener('selectionchange', handleDocumentSelectionChange);
  document.addEventListener('mousedown', handleOutsideMouseDown, true);
  document.addEventListener('click', handleOutsideMouseDown, true);
});

onUnmounted(() => {
  document.removeEventListener('selectionchange', handleDocumentSelectionChange);
  document.removeEventListener('mousedown', handleOutsideMouseDown, true);
  document.removeEventListener('click', handleOutsideMouseDown, true);
});

// Vertical alignment flex mapping
const verticalFlexJustify = computed(() => {
  if (props.element.verticalAlignment === 'Middle') return 'center';
  if (props.element.verticalAlignment === 'Bottom') return 'flex-end';
  return 'flex-start';
});

// Full typography styling matching BaseElement
const typographyStyle = computed(() => {
  const textAlign =
    props.element.textAlignment === 'Justified'
      ? 'justify'
      : props.element.textAlignment?.toLowerCase() || 'left';

  return {
    fontFamily: props.element.fontFamily || props.reportFontFamily || 'SansSerif',
    fontSize: props.element.fontSize
      ? `${props.element.fontSize}px`
      : props.reportFontSize
        ? `${props.reportFontSize}px`
        : '10px',
    fontWeight:
      props.element.isBold === true ||
      (props.element.isBold === undefined && props.reportIsBold)
        ? 'bold'
        : 'normal',
    fontStyle:
      props.element.isItalic === true ||
      (props.element.isItalic === undefined && props.reportIsItalic)
        ? 'italic'
        : 'normal',
    textDecoration:
      props.element.isUnderline === true ||
      (props.element.isUnderline === undefined && props.reportIsUnderline)
        ? 'underline'
        : 'none',
    color: props.element.forecolor || 'inherit',
    textAlign: textAlign as any,
    lineHeight: '1.3',
  };
});

// Initialize contenteditable when entering edit mode
watch(
  () => isEditing.value,
  (newVal) => {
    if (newVal) {
      activeLinkPreview.value = null;
      const raw = props.element.expression || '';
      let initialHtml = '';
      const trimmed = raw.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
        const inner = trimmed.slice(1, -1);
        initialHtml = inner.replace(/\\"/g, '"').replace(/\\n/g, '<br>');
      } else {
        initialHtml = raw.replace(/\\n/g, '<br>');
      }
      originalValue.value = raw;
      nextTick(() => {
        if (editInput.value) {
          editInput.value.innerHTML = initialHtml;

          if (pendingEditLink.value) {
            const { url: pUrl, label: pLabel, center: pCenter, top: pTop } = pendingEditLink.value;
            pendingEditLink.value = null;

            const anchors = Array.from(editInput.value.querySelectorAll('a'));
            const targetAnchor =
              anchors.find((a) => a.getAttribute('href') === pUrl || a.textContent === pLabel) ||
              anchors[0] ||
              null;

            if (targetAnchor) {
              const range = document.createRange();
              range.selectNodeContents(targetAnchor);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
              savedSelectionRange.value = range.cloneRange();
              currentSelectionText.value = targetAnchor.textContent || pLabel;

              const rect = targetAnchor.getBoundingClientRect();
              toolbarPosition.value = {
                x: rect.left + rect.width / 2,
                y: rect.top,
              };
            } else {
              currentSelectionText.value = pLabel;
              toolbarPosition.value = {
                x: pCenter ?? 160,
                y: pTop ?? 80,
              };
            }

            currentLink.value = {
              url: pUrl,
              label: pLabel,
              type: pUrl.startsWith('mailto:') ? 'email' : pUrl.startsWith('tel:') ? 'phone' : 'url',
            };

            toolbarVisible.value = true;
            nextTick(() => {
              formatToolbarRef.value?.openLinkPopover(pUrl, pLabel);
            });
          } else if (pendingUnlink.value) {
            const { url: pUrl, label: pLabel } = pendingUnlink.value;
            pendingUnlink.value = null;

            const anchors = Array.from(editInput.value.querySelectorAll('a'));
            const targetAnchor =
              anchors.find((a) => a.getAttribute('href') === pUrl || a.textContent === pLabel) ||
              anchors[0] ||
              null;

            if (targetAnchor) {
              const range = document.createRange();
              range.selectNode(targetAnchor);
              const sel = window.getSelection();
              sel?.removeAllRanges();
              sel?.addRange(range);
              savedSelectionRange.value = range.cloneRange();
              handleRemoveLink();
            }
          } else {
            placeCaretAtEnd(editInput.value);
          }
        }
      });
    } else {
      toolbarVisible.value = false;
      isMouseDownInEditor.value = false;
      pendingEditLink.value = null;
      pendingUnlink.value = null;
    }
  },
);

const handleInput = () => {
  checkOverflow();
};

// Helper to convert rgb(r, g, b) colors to #hex for JasperReports compatibility
const rgbToHex = (str: string): string => {
  return str.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/gi, (_, r, g, b) => {
    const toH = (n: string) => {
      const h = parseInt(n, 10).toString(16);
      return h.length === 1 ? '0' + h : h;
    };
    return `#${toH(r)}${toH(g)}${toH(b)}`;
  });
};

// Format commands from toolbar
const handleFormat = (command: string, value?: string) => {
  if (savedSelectionRange.value) {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRange.value);
    }
  }
  if (command === 'foreColor' && value) {
    document.execCommand('foreColor', false, value);
  } else if (command === 'hiliteColor') {
    if (!value || value === 'transparent') {
      document.execCommand('hiliteColor', false, 'transparent');
      document.execCommand('backColor', false, 'transparent');
    } else {
      const ok = document.execCommand('hiliteColor', false, value);
      if (!ok) {
        document.execCommand('backColor', false, value);
      }
    }
  } else {
    document.execCommand(command, false, value);
  }
  handleInput();
  handleSelectionUpdate();
};

// Hyperlink application (supports target URL, protocol type, and display label)
const handleApplyLink = (target: string, type: 'url' | 'email' | 'phone', label?: string) => {
  if (!editInput.value) return;

  if (savedSelectionRange.value) {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRange.value);
    }
  }

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  let linkEl = getAncestorLink(sel.anchorNode) || getAncestorLink(sel.focusNode);
  if (!linkEl && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (r.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
      linkEl =
        (r.commonAncestorContainer as HTMLElement).closest('a') ||
        (r.commonAncestorContainer as HTMLElement).querySelector('a');
    }
  }
  if (linkEl) {
    linkEl.setAttribute('href', target);
    if (label !== undefined && label.trim()) {
      linkEl.textContent = label;
    }
    if (type === 'url') {
      linkEl.setAttribute('target', '_blank');
      linkEl.setAttribute('rel', 'noopener noreferrer');
    } else {
      linkEl.removeAttribute('target');
      linkEl.removeAttribute('rel');
    }
    linkEl.classList.add('text-hyperlink');
  } else {
    const range = sel.getRangeAt(0);
    const textToDisplay = label || range.toString() || target;

    const anchor = document.createElement('a');
    anchor.href = target;
    anchor.textContent = textToDisplay;
    anchor.className = 'text-hyperlink';
    if (type === 'url') {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }

    range.deleteContents();
    range.insertNode(anchor);

    // Place selection cursor after the new anchor
    const newRange = document.createRange();
    newRange.setStartAfter(anchor);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  handleInput();
  handleSelectionUpdate();
};

const handleRemoveLink = () => {
  if (savedSelectionRange.value) {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRange.value);
    }
  }
  const sel = window.getSelection();
  if (!sel) return;
  let linkEl = getAncestorLink(sel.anchorNode) || getAncestorLink(sel.focusNode);
  if (!linkEl && sel.rangeCount > 0) {
    const r = sel.getRangeAt(0);
    if (r.commonAncestorContainer.nodeType === Node.ELEMENT_NODE) {
      linkEl =
        (r.commonAncestorContainer as HTMLElement).closest('a') ||
        (r.commonAncestorContainer as HTMLElement).querySelector('a');
    }
  }
  if (linkEl) {
    const textNode = document.createTextNode(linkEl.textContent || '');
    linkEl.parentNode?.replaceChild(textNode, linkEl);
  } else {
    document.execCommand('unlink', false);
  }
  handleInput();
  handleSelectionUpdate();
};

// Content click in View Mode: detect hyperlink clicks
const handleContentClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const anchor = target.closest('a');
  if (anchor) {
    event.preventDefault();
    event.stopPropagation();

    // Select the element so active element state in designer is synchronized
    emit('select', props.bandIndex, props.elementIndex, false, props.parentFrameIndex);

    const href = anchor.getAttribute('href') || '';
    const rect = anchor.getBoundingClientRect();
    const clampedX = Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2));
    activeLinkPreview.value = {
      url: href,
      label: anchor.textContent || href.replace(/^(https?:\/\/|mailto:|tel:)/, ''),
      type: href.startsWith('mailto:') ? 'email' : href.startsWith('tel:') ? 'phone' : 'url',
      position: {
        x: clampedX,
        y: rect.bottom + 6,
      },
      linkTop: rect.top,
      linkCenter: clampedX,
    };
  } else {
    activeLinkPreview.value = null;
  }
};

const openPreviewLink = (url: string) => {
  if (!url) return;
  if (url.startsWith('mailto:') || url.startsWith('tel:')) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const copyPreviewLink = async (url: string) => {
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    copiedFeedback.value = true;
    setTimeout(() => {
      copiedFeedback.value = false;
    }, 1500);
  } catch (err) {
    console.error('Failed to copy link to clipboard:', err);
  }
};

const editPreviewLink = () => {
  if (!activeLinkPreview.value) return;
  const pUrl = activeLinkPreview.value.url;
  const pLabel = activeLinkPreview.value.label;
  const pCenter = activeLinkPreview.value.linkCenter ?? activeLinkPreview.value.position.x;
  const pTop = activeLinkPreview.value.linkTop ?? (activeLinkPreview.value.position.y - 20);

  // Close the preview chip immediately
  activeLinkPreview.value = null;

  if (isEditing.value && editInput.value) {
    // 1. Already in edit mode
    const anchors = Array.from(editInput.value.querySelectorAll('a'));
    const sel = window.getSelection();
    let targetAnchor: HTMLAnchorElement | null = null;
    if (sel && sel.anchorNode) {
      targetAnchor = getAncestorLink(sel.anchorNode) || getAncestorLink(sel.focusNode);
    }
    if (!targetAnchor) {
      targetAnchor =
        anchors.find((a) => a.getAttribute('href') === pUrl || a.textContent === pLabel) ||
        anchors[0] ||
        null;
    }

    if (targetAnchor) {
      const range = document.createRange();
      range.selectNodeContents(targetAnchor);
      sel?.removeAllRanges();
      sel?.addRange(range);
      savedSelectionRange.value = range.cloneRange();
      currentSelectionText.value = targetAnchor.textContent || pLabel;

      const rect = targetAnchor.getBoundingClientRect();
      toolbarPosition.value = {
        x: rect.left + rect.width / 2,
        y: rect.top,
      };
    } else {
      currentSelectionText.value = pLabel;
      toolbarPosition.value = {
        x: pCenter,
        y: pTop,
      };
    }

    currentLink.value = {
      url: pUrl,
      label: pLabel,
      type: pUrl.startsWith('mailto:') ? 'email' : pUrl.startsWith('tel:') ? 'phone' : 'url',
    };

    toolbarVisible.value = true;
    nextTick(() => {
      formatToolbarRef.value?.openLinkPopover(pUrl, pLabel);
    });
  } else {
    // 2. In view mode: queue pendingEditLink and enter editing mode
    pendingEditLink.value = { url: pUrl, label: pLabel, center: pCenter, top: pTop };
    handleStartEditing();
  }
};

const unlinkPreviewLink = () => {
  if (!activeLinkPreview.value) return;
  const pUrl = activeLinkPreview.value.url;
  const pLabel = activeLinkPreview.value.label;
  activeLinkPreview.value = null;

  if (isEditing.value && editInput.value) {
    const anchors = Array.from(editInput.value.querySelectorAll('a'));
    const sel = window.getSelection();
    let targetAnchor: HTMLAnchorElement | null = null;
    if (sel && sel.anchorNode) {
      targetAnchor = getAncestorLink(sel.anchorNode) || getAncestorLink(sel.focusNode);
    }
    if (!targetAnchor) {
      targetAnchor =
        anchors.find((a) => a.getAttribute('href') === pUrl || a.textContent === pLabel) ||
        anchors[0] ||
        null;
    }
    if (targetAnchor) {
      const range = document.createRange();
      range.selectNode(targetAnchor);
      sel?.removeAllRanges();
      sel?.addRange(range);
      savedSelectionRange.value = range.cloneRange();
      handleRemoveLink();
    }
  } else {
    pendingUnlink.value = { url: pUrl, label: pLabel };
    handleStartEditing();
  }
};

// Finish editing
const handleFinishEditing = () => {
  if (!isEditing.value || !editInput.value) return;
  toolbarVisible.value = false;

  let html = editInput.value.innerHTML;
  const textContent = editInput.value.textContent || '';

  if (!textContent.trim() && !html.includes('<img') && !html.includes('<a')) {
    props.element.expression = '""';
    emit('updateElement');
    emit('update-jrxml');
    emit('finishEditing');
    nextTick(checkOverflow);
    return;
  }

  if (hasHtmlTags(html)) {
    props.element.markup = 'html';
    // Format HTML for JasperReports:
    // 1. Convert rgb colors to clean hex
    // 2. Standardize standalone color spans to <font color="...">
    // 3. Escape double quotes for Java string literal
    let safeHtml = rgbToHex(html);
    safeHtml = safeHtml
      .replace(/<span\s+style="color:\s*([^";]+);?">([\s\S]*?)<\/span>/gi, '<font color="$1">$2</font>')
      .replace(/\\"/g, '"')
      .replace(/"/g, '\\"');
    props.element.expression = `"${safeHtml}"`;
  } else {
    const plain = textContent.replace(/\r\n|\r|\n/g, '\\n');
    props.element.expression = `"${plain}"`;
  }

  // Extract all field references $F{fieldName}
  const currentExpression = props.element.expression || '';
  const fieldReferences: string[] = [];
  const fieldRegex = /\$F\{([^}]+)\}/g;
  let match;
  while ((match = fieldRegex.exec(currentExpression)) !== null) {
    if (match[1]) {
      fieldReferences.push(match[1]);
    }
  }

  if (fieldReferences.length > 0) {
    emit('checkFields', fieldReferences);
  }

  emit('updateElement');
  emit('update-jrxml');
  emit('finishEditing');
  nextTick(checkOverflow);
};

// Cancel editing
const handleCancelEditing = () => {
  toolbarVisible.value = false;
  props.element.expression = originalValue.value;
  emit('cancelEditing');
  nextTick(checkOverflow);
};

// Keyboard handling in edit mode (Google Docs style)
const handleKeyDown = (e: KeyboardEvent) => {
  e.stopPropagation();

  if (e.key === 'Escape') {
    e.preventDefault();
    handleCancelEditing();
    return;
  }

  // Keyboard shortcuts
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();
    if (key === 'b') {
      e.preventDefault();
      handleFormat('bold');
      return;
    }
    if (key === 'i') {
      e.preventDefault();
      handleFormat('italic');
      return;
    }
    if (key === 'u') {
      e.preventDefault();
      handleFormat('underline');
      return;
    }
    if (key === 'k') {
      e.preventDefault();
      formatToolbarRef.value?.openLinkPopover();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEditing();
      return;
    }
  }

  // Newlines: Enter or Shift+Enter inserts a clean line break
  if (e.key === 'Enter') {
    e.preventDefault();
    document.execCommand('insertLineBreak');
    handleInput();
  }
};

// Blur handler with tolerance for toolbar clicks
const handleBlur = (e: FocusEvent) => {
  const related = e.relatedTarget as HTMLElement | null;
  if (related && (related.closest('.text-format-floating-toolbar') || related.closest('.link-preview-chip'))) {
    return;
  }

  setTimeout(() => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.closest('.text-format-floating-toolbar') || activeEl.closest('.link-preview-chip'))) {
      return;
    }
    if (isEditing.value && editInput.value && !editInput.value.contains(document.activeElement)) {
      isMouseDownInEditor.value = false;
      handleFinishEditing();
    }
  }, 200);
};

// Auto-fit height to content
const handleAutoFit = () => {
  if (!contentContainer.value) return;
  const requiredHeight = Math.ceil(contentContainer.value.scrollHeight);
  if (requiredHeight > 0) {
    props.element.height = Math.max(requiredHeight, 15);
    nextTick(() => {
      checkOverflow();
      emit('updateElement');
      emit('update-jrxml');
    });
  }
};

// Element event forwards
const handleSelect = (bandIndex: number, elementIndex: number, isMultiSelect?: boolean) => {
  emit('select', bandIndex, elementIndex, isMultiSelect, props.parentFrameIndex);
};

const handleDragStart = (event: MouseEvent, bandIndex: number, elementIndex: number) => {
  emit('dragStart', event, bandIndex, elementIndex, props.parentFrameIndex);
};

const handleResizeStart = (
  event: MouseEvent,
  bandIndex: number,
  elementIndex: number,
  parentFrameIndex?: number,
  direction?: string,
) => {
  emit('resizeStart', event, bandIndex, elementIndex, parentFrameIndex, direction);
};

const handleStartEditing = () => {
  emit('startEditing', props.bandIndex, props.elementIndex, props.parentFrameIndex);
};
</script>

<style scoped>
.text-element-inner {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.text-content-display {
  width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
  user-select: none;
}

.text-content-display.is-placeholder {
  opacity: 0.5;
  font-style: italic;
}

.inline-edit-contenteditable {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 0;
  margin: 0;
  border: none;
  outline: none;
  background: transparent;
  overflow-y: auto;
  overflow-x: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  cursor: text;
  user-select: text;
}

.inline-edit-contenteditable:empty::before {
  content: attr(placeholder);
  color: #999;
  opacity: 0.6;
  font-style: italic;
  pointer-events: none;
}

/* Slim scrollbar for inline edit container */
.inline-edit-contenteditable::-webkit-scrollbar {
  width: 4px;
}
.inline-edit-contenteditable::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

/* Hyperlinks in canvas */
:deep(.text-hyperlink),
:deep(a) {
  color: #1890ff;
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.1s ease;
}

:deep(.text-hyperlink:hover),
:deep(a:hover) {
  color: #40a9ff;
}

/* Link Preview Chip */
.link-preview-chip {
  position: fixed;
  z-index: 10001;
  transform: translateX(-50%);
  background: #ffffff;
  border: 1px solid #d9d9d9;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #333333;
  animation: chipFadeIn 0.12s ease-out;
}

@keyframes chipFadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -4px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.preview-type-icon {
  display: flex;
  align-items: center;
  color: #1890ff;
}

.preview-url-link {
  color: #1890ff;
  text-decoration: none;
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-url-link:hover {
  text-decoration: underline;
}

.chip-action-btn {
  background: transparent;
  border: none;
  color: #555;
  cursor: pointer;
  padding: 3px;
  border-radius: 3px;
  display: flex;
  align-items: center;
}

.chip-action-btn:hover {
  color: #1890ff;
  background: #f0f0f0;
}

.copy-success-icon {
  color: #52c41a;
}

.chip-unlink-btn:hover {
  color: #ff4d4f;
  background: #fff1f0;
}

.chip-close-btn {
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 2px;
  margin-left: 2px;
  display: flex;
  align-items: center;
}

.chip-close-btn:hover {
  color: #333;
}

/* Overflow Warning Badge */
.text-overflow-badge {
  position: absolute;
  bottom: -22px;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  background: #ff4d4f;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 3px;
  cursor: pointer;
  z-index: 30;
  box-shadow: 0 2px 6px rgba(255, 77, 79, 0.45);
  user-select: none;
  transition:
    transform 0.15s ease,
    background-color 0.15s ease;
  line-height: 1.2;
}

.text-overflow-badge:hover {
  background: #ff7875;
  transform: scale(1.05);
}

.overflow-badge-icon {
  font-size: 11px;
}

.overflow-badge-text {
  font-size: 10px;
  letter-spacing: 0.5px;
}
</style>
