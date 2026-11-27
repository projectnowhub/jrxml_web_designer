<template>
  <div
    :class="['chat-input-container', { 'is-focused': isFocused, 'is-disabled': disabled, 'is-dragging': dragging, 'is-enlarged': enlarged }]"
    @dragover="handleDragOver"
    @dragleave="dragging = false"
    @drop.prevent="handleDrop"
  >
    <!-- Attached pictures and files -->
    <div v-if="attachments.length || reading" class="attachments">
      <div v-for="a in attachments" :key="a.id" class="attachment" :title="a.name">
        <img v-if="a.previewUrl" :src="a.previewUrl" :alt="a.name" class="attachment-thumb" />
        <component :is="a.kind === 'pdf' ? FileIcon : FileText" v-else class="attachment-icon" :size="18" />
        <span class="attachment-name">{{ a.name }}</span>
        <span class="attachment-size">{{ sizeText(a.size) }}</span>
        <button type="button" class="attachment-remove" :title="t('ai.attach.remove')" @click="removeAttachment(a.id)">
          <X :size="12" />
        </button>
      </div>
      <span v-if="reading" class="attachment-reading">{{ t('ai.attach.reading') }}</span>
    </div>

    <div class="input-row">
      <textarea
        ref="textarea"
        :value="inputValue"
        :disabled="disabled"
        :placeholder="placeholder || t('ai.input.placeholder')"
        class="chat-input"
        @input="handleInput"
        @keydown="handleKeydown"
        @paste="handlePaste"
        @focus="isFocused = true"
        @blur="isFocused = false"
        rows="2"
      ></textarea>

      <div class="input-actions">
        <button
          type="button"
          class="icon-btn"
          :title="enlarged ? t('ai.input.shrink') : t('ai.input.enlarge')"
          @click="toggleEnlarged"
        >
          <component :is="enlarged ? Minimize2 : Maximize2" :size="16" />
        </button>
        <button
          type="button"
          class="icon-btn"
          :disabled="disabled"
          :title="t('ai.attach.add')"
          @click="fileInput?.click()"
        >
          <Paperclip :size="16" />
        </button>
        <button
          class="submit-btn"
          :disabled="!canSubmit"
          @click="handleSubmit"
          :title="t('ai.input.send')"
        >
          <SendHorizontal :size="16" />
        </button>
      </div>
    </div>

    <div v-if="characterCount || dragging" class="input-hint">
      <span v-if="dragging">{{ t('ai.attach.drop') }}</span>
      <span v-else>{{ t('ai.input.characters', { count: characterCount }) }}</span>
    </div>

    <input
      ref="fileInput"
      type="file"
      multiple
      :accept="ATTACHMENT_ACCEPT"
      class="file-input"
      @change="handleFileChoice"
    />
  </div>
</template>

<script setup lang="ts">
import { File as FileIcon, FileText, Maximize2, Minimize2, Paperclip, SendHorizontal, X } from '@lucide/vue';
import { ref, computed, nextTick, onBeforeUnmount, watch } from 'vue';
import { useHelpStore } from '@/stores/help';
import { useI18n } from 'vue-i18n';
import notification from '@/utils/notification';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_LIMITS,
  AttachmentError,
  readAttachment,
  type ChatAttachment,
} from '@/mcp/attachments';

// Props
const props = withDefaults(defineProps<{
  disabled?: boolean;
  placeholder?: string;
}>(), {
  disabled: false,
  placeholder: ''
});

const { t, locale } = useI18n();

// Emits
const emit = defineEmits<{
  (e: 'submit', value: { text: string; attachments: ChatAttachment[] }): void;
}>();

// The box grows with what is typed or pasted up to this height, then scrolls;
// enlarged, it takes most of the panel
const MAX_HEIGHT = 220;
const MAX_HEIGHT_ENLARGED = '60vh';

// State
const inputValue = ref('');
const isFocused = ref(false);
const enlarged = ref(false);
const dragging = ref(false);
const reading = ref(0);
const attachments = ref<ChatAttachment[]>([]);
const textarea = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
// Ids for attachments, unique while the panel is open ("img-1", "file-2")
let attachmentCount = 0;

// A request handed over from Help ("let the AI assistant do it"): put in the
// box, ready to change and send
const help = useHelpStore();
watch(
  () => help.aiDraft,
  (draft) => {
    if (!draft) return;
    inputValue.value = draft;
    help.aiDraft = '';
    nextTick(() => {
      fitHeight();
      textarea.value?.focus();
    });
  },
  { immediate: true },
);

// Computed properties
const canSubmit = computed(() =>
  (inputValue.value.trim().length > 0 || attachments.value.length > 0) && !props.disabled && reading.value === 0
);
const characterCount = computed(() =>
  inputValue.value.length > 1000 ? inputValue.value.length.toLocaleString(locale.value) : ''
);

// Methods
function fitHeight() {
  const el = textarea.value;
  if (!el || enlarged.value) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight + 2, MAX_HEIGHT)}px`;
}

function handleInput(event: Event) {
  inputValue.value = (event.target as HTMLTextAreaElement).value;
  fitHeight();
}

function toggleEnlarged() {
  enlarged.value = !enlarged.value;
  nextTick(() => {
    if (textarea.value) textarea.value.style.height = enlarged.value ? MAX_HEIGHT_ENLARGED : '';
    fitHeight();
    textarea.value?.focus();
  });
}

const sizeText = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// Files picked, pasted or dropped: read for the AI (refused ones say why)
async function addFiles(files: File[]) {
  for (const file of files) {
    if (attachments.value.length + reading.value >= ATTACHMENT_LIMITS.count) {
      notification.warning(t('ai.attach.errors.count', { max: ATTACHMENT_LIMITS.count }));
      return;
    }
    reading.value++;
    try {
      const isImage = file.type.startsWith('image/');
      attachments.value.push(await readAttachment(file, `${isImage ? 'img' : 'file'}-${++attachmentCount}`));
    } catch (error) {
      const code = error instanceof AttachmentError ? error.code : 'unreadable';
      notification.warning(t(`ai.attach.errors.${code}`, { name: file.name }));
    } finally {
      reading.value--;
    }
  }
}

function removeAttachment(id: string) {
  const index = attachments.value.findIndex((a) => a.id === id);
  if (index === -1) return;
  const [removed] = attachments.value.splice(index, 1);
  if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
}

function handleFileChoice(event: Event) {
  const input = event.target as HTMLInputElement;
  addFiles(Array.from(input.files ?? []));
  input.value = '';
}

// Pasted pictures / files are attached; pasted text goes in the box as usual
function handlePaste(event: ClipboardEvent) {
  const files = Array.from(event.clipboardData?.files ?? []);
  if (!files.length) return;
  event.preventDefault();
  addFiles(files);
}

function handleDrop(event: DragEvent) {
  dragging.value = false;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length) addFiles(files);
}

function handleDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  dragging.value = true;
}

function handleSubmit() {
  if (!canSubmit.value) return;
  // The thumbnails now belong to the sent message
  emit('submit', { text: inputValue.value.trim(), attachments: attachments.value.splice(0) });
  inputValue.value = '';
  nextTick(fitHeight);
}

function handleKeydown(event: KeyboardEvent) {
  // Enter sends; Shift+Enter is a new line. Not while an input method is
  // still composing a word (Enter then picks the word)
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    handleSubmit();
  }
}

onBeforeUnmount(() => {
  for (const a of attachments.value) if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
});
</script>

<style scoped>
.chat-input-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: var(--prop-bg-primary, #fff);
  border-top: 1px solid var(--prop-border-color, #e6e5ee);
}

.chat-input-container.is-dragging {
  background-color: var(--prop-bg-hover, #f5f3ff);
  box-shadow: inset 0 0 0 2px var(--prop-primary-color, #6440f4);
}

.chat-input-container.is-disabled {
  background-color: var(--prop-bg-disabled, #f5f5f5);
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  min-height: 56px;
  max-height: 60vh;
  padding: 10px 12px;
  border: 1px solid var(--prop-border-color, #e6e5ee);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  overflow-y: auto;
  font-family: inherit;
  color: var(--prop-text-primary, #1c1b26);
}

.is-enlarged .chat-input {
  height: 60vh;
}

.chat-input:focus {
  outline: none;
  border-color: var(--prop-primary-color, #6440f4);
  box-shadow: var(--prop-focus-ring, 0 0 0 3px rgba(100, 64, 244, 0.15));
}

.chat-input:disabled {
  background-color: var(--prop-bg-disabled, #f5f5f5);
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--prop-border-color, #e6e5ee);
  border-radius: 8px;
  background: var(--prop-bg-primary, #fff);
  color: var(--prop-text-secondary, #5b5a6b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover:not(:disabled) {
  border-color: var(--prop-primary-color, #6440f4);
  color: var(--prop-primary-color, #6440f4);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background-color: var(--prop-primary-color, #6440f4);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background-color: var(--prop-primary-hover, #5532e0);
}

.submit-btn:disabled {
  background-color: var(--prop-border-color, #ccc);
  cursor: not-allowed;
}

.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 140px;
  overflow-y: auto;
}

.attachment {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 6px 4px 4px;
  border: 1px solid var(--prop-border-color, #e6e5ee);
  border-radius: 8px;
  background: var(--prop-bg-secondary, #fafafa);
  font-size: 12px;
}

.attachment-thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 6px;
}

.attachment-icon {
  margin: 0 4px;
  color: var(--prop-primary-color, #6440f4);
}

.attachment-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-size,
.attachment-reading,
.input-hint {
  color: var(--prop-text-tertiary, #8a8999);
  font-size: 11px;
}

.attachment-reading {
  align-self: center;
}

.attachment-remove {
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--prop-text-secondary, #5b5a6b);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.attachment-remove:hover {
  background: var(--prop-bg-hover, #eee);
}

.file-input {
  display: none;
}
</style>
