<template>
  <div :class="messageClass">
    <!-- Loading indicator -->
    <div v-if="message.isLoading" class="loading-indicator">
      <div class="spinner"></div>
      <span>{{ message.content }}</span>
    </div>

    <!-- Message content -->
    <div v-else class="message-content">
      <!-- Header -->
      <div class="message-header">
        <component :is="roleIcon" class="role-icon" :size="16" />
        <span class="role-name">{{ message.role === 'user' ? t('ai.message.you') : t('ai.title') }}</span>
        <span class="timestamp">{{ formattedTime }}</span>
        <button
          v-if="isLong"
          class="copy-btn"
          @click="reader = { kind: 'text' }"
          :title="t('ai.message.openLarge')"
        >
          <Maximize2 :size="14" />
        </button>
        <button
          v-if="(message.role === 'assistant' || message.role === 'user') && message.content"
          class="copy-btn"
          @click="copyMessage"
          :title="copied ? t('ai.message.copied') : t('ai.message.copy')"
        >
          <Copy v-if="!copied" :size="14" />
          <Check v-else :size="14" />
        </button>
      </div>

      <!-- Attached pictures and files -->
      <div v-if="message.attachments?.length" class="message-attachments">
        <button
          v-for="a in pictures"
          :key="a.id"
          type="button"
          class="message-picture"
          :title="t('ai.message.openPicture', { name: a.name })"
          @click="reader = { kind: 'image', attachment: a }"
        >
          <img :src="a.previewUrl" :alt="a.name" />
        </button>
        <span v-for="a in files" :key="a.id" class="message-file" :title="a.name">
          <component :is="a.kind === 'pdf' ? FileIcon : FileText" :size="14" />
          {{ a.name }}
        </span>
      </div>

      <!-- Message body: a long one scrolls in place until "Show all" -->
      <div v-if="message.content" :class="['message-body', { 'is-long': isLong && !showAll }]">{{ message.content }}</div>
      <button v-if="isLong" type="button" class="show-all" @click="showAll = !showAll">
        {{ showAll ? t('ai.message.showLess') : t('ai.message.showAll') }}
      </button>

      <!-- Tool call display -->
      <ToolCallDisplay
        v-if="message.toolCall"
        :tool-call="message.toolCall"
        :tool-result="message.toolResult"
      />
    </div>

    <!-- The large reader -->
    <BaseModal
      :visible="!!reader"
      :title="reader?.kind === 'image' ? reader.attachment.name : t('ai.message.readerTitle')"
      :show-footer="false"
      :content-style="{ width: 'min(960px, 94vw)', maxWidth: '94vw' }"
      :body-style="{ maxHeight: '78vh', overflow: 'auto' }"
      @update:visible="(open: boolean) => { if (!open) reader = null; }"
    >
      <img v-if="reader?.kind === 'image'" :src="reader.attachment.previewUrl" :alt="reader.attachment.name" class="reader-picture" />
      <div v-else class="reader-text">{{ message.content }}</div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import {
  Bot,
  Check,
  CircleX,
  Copy,
  File as FileIcon,
  FileText,
  Info,
  Maximize2,
  MessageSquare,
  User,
  Wrench,
} from '@lucide/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { LOCALE_TAGS, type AppLocale } from '@/i18n';
import type { ChatMessage } from '@/composables/useAIChat';
import type { ChatAttachment } from '@/mcp/attachments';
import BaseModal from '@/components/modals/BaseModal.vue';
import ToolCallDisplay from './ToolCallDisplay.vue';

// Props
const props = defineProps<{
  message: ChatMessage;
}>();

// State
const copied = ref(false);
// A long message shows its start in a scrolling box until "Show all"
const showAll = ref(false);
// The large reader: the whole text, or one attached picture
const reader = ref<{ kind: 'text' } | { kind: 'image'; attachment: ChatAttachment } | null>(null);

// Long enough to scroll in place (and to offer the large reader)
const isLong = computed(() => props.message.content.length > 600 || props.message.content.split('\n').length > 12);
const pictures = computed(() => (props.message.attachments ?? []).filter((a) => a.previewUrl));
const files = computed(() => (props.message.attachments ?? []).filter((a) => !a.previewUrl));

// Style computation
const messageClass = computed(() => ({
  'chat-message': true,
  'user-message': props.message.role === 'user',
  'assistant-message': props.message.role === 'assistant',
  'tool-message': props.message.role === 'tool',
  'error-message': props.message.role === 'error',
  'system-message': props.message.role === 'system',
  'is-loading': props.message.isLoading
}));

// Icon mapping
const roleIcon = computed(() => {
  switch (props.message.role) {
    case 'user': return User;
    case 'assistant': return Bot;
    case 'tool': return Wrench;
    case 'error': return CircleX;
    case 'system': return Info;
    default: return MessageSquare;
  }
});

const { locale, t } = useI18n();

// Format time
const formattedTime = computed(() => {
  return props.message.timestamp.toLocaleTimeString(LOCALE_TAGS[locale.value as AppLocale] ?? 'en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Copy message content
async function copyMessage() {
  try {
    await navigator.clipboard.writeText(props.message.content);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy message:', error);
  }
}
</script>

<style scoped>
.chat-message {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  background-color: #f5f5f5;
}

.user-message {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
}

.assistant-message {
  background-color: #f1f8e9;
  border-left: 3px solid #4caf50;
}

.tool-message {
  background-color: #fff3e0;
  border-left: 3px solid #ff9800;
  font-size: 0.9em;
}

.error-message {
  background-color: #ffebee;
  border-left: 3px solid #f44336;
}

.system-message {
  background-color: #f5f5f5;
  border-left: 3px solid #9e9e9e;
  font-style: italic;
  font-size: 0.9em;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ddd;
  border-top-color: #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85em;
  color: #666;
}

.role-icon {
  font-size: 1.1em;
}

.role-name {
  font-weight: 600;
}

.timestamp {
  margin-left: auto;
  font-size: 0.85em;
  color: #999;
}

.copy-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  opacity: 0.6;
}

.copy-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  opacity: 1;
}

.message-body {
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  user-select: text;
  cursor: text;
}

/* A long message scrolls in its own box (Show all lets it grow) */
.message-body.is-long {
  max-height: 260px;
  overflow-y: auto;
  padding-right: 4px;
}

.show-all {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  color: var(--prop-primary-color, #6440f4);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.message-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.message-picture {
  padding: 0;
  border: 1px solid var(--prop-border-color, #e6e5ee);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  cursor: zoom-in;
}

.message-picture img {
  display: block;
  height: 72px;
  max-width: 160px;
  object-fit: cover;
}

.message-file {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid var(--prop-border-color, #e6e5ee);
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
}

.reader-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
  font-size: 14px;
  user-select: text;
}

.reader-picture {
  display: block;
  max-width: 100%;
  margin: 0 auto;
}
</style>
