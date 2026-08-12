<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAIChat } from '@/composables/useAIChat';
import { useAIConfigManager, type AIConfiguration } from '@/composables/useAIConfigManager';
import { checkWebMCPSupport, type BrowserSupportResult } from '@/utils/browserCompatibility';
import type { MCPContext } from '@/mcp';
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';

const { t } = useI18n();

// Props
const props = withDefaults(defineProps<{
  visible?: boolean;
  initialHeight?: number;
  mcpContext?: MCPContext;
  onUpdate?: () => void;
  embedded?: boolean; // Whether in embedded mode (hides the header)
  showSettings?: boolean; // Externally controls whether the settings panel is shown
}>(), {
  visible: false,
  initialHeight: 300,
  mcpContext: undefined,
  onUpdate: undefined,
  embedded: false,
  showSettings: false
});

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:showSettings', value: boolean): void;
}>();

// AI conversation
const {
  messages,
  isLoading,
  sendMessage,
  clearHistory
} = useAIChat(() => props.mcpContext, props.onUpdate);

// AI configuration management
const {
  config,
  updateConfig,
  resetConfig,
  getConfigFromStorage
} = useAIConfigManager();

// State
const panelHeight = ref(props.initialHeight);
const isExpanded = ref(true);
const messagesContainer = ref<HTMLDivElement | null>(null);

// Configuration form (requestTimeout is shown in seconds in the UI, converted to milliseconds on save)
const configForm = ref<AIConfiguration & { requestTimeoutSeconds: number }>({
  ...config,
  requestTimeoutSeconds: Math.round(config.requestTimeout / 1000)
} as AIConfiguration & { requestTimeoutSeconds: number });

// Computed properties
const panelStyle = computed(() => ({
  height: props.embedded ? '100%' : (isExpanded.value ? `${panelHeight.value}px` : '40px')
}));

// Compute showSettings (supports external control)
const showSettings = computed({
  get: () => props.showSettings,
  set: (value: boolean) => emit('update:showSettings', value)
});

// Toggle expand/collapse
function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}

// Close the panel
function close() {
  emit('update:visible', false);
}

// Toggle the settings panel
function toggleSettings() {
  showSettings.value = !showSettings.value;
  if (showSettings.value) {
    configForm.value = {
      ...config,
      requestTimeoutSeconds: Math.round(config.requestTimeout / 1000)
    };
  }
}

// Save configuration
function saveConfig() {
  // Convert seconds to milliseconds
  const configToSave = {
    ...configForm.value,
    requestTimeout: (configForm.value as any).requestTimeoutSeconds * 1000
  };
  updateConfig(configToSave);
  showSettings.value = false;
}

// Reset configuration
function handleResetConfig() {
  resetConfig();
  const freshConfig = getConfigFromStorage();
  configForm.value = {
    ...freshConfig,
    requestTimeoutSeconds: Math.round(freshConfig.requestTimeout / 1000)
  } as AIConfiguration & { requestTimeoutSeconds: number };
  showSettings.value = false;
}

// Send message
async function handleSendMessage(content: string) {
  await sendMessage(content);
}

// Scroll to bottom
async function scrollToBottom() {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

// Watch for message changes and auto-scroll
watch(
  () => messages.length,
  () => {
    scrollToBottom();
  }
);

// Initialization
onMounted(() => {
  configForm.value = {
    ...config,
    requestTimeoutSeconds: Math.round(config.requestTimeout / 1000)
  } as AIConfiguration & { requestTimeoutSeconds: number };
  browserSupport.value = checkWebMCPSupport();

  // Add a keyboard shortcut listener
  document.addEventListener('keydown', handleKeyDown);
});

// Keyboard shortcut handling
function handleKeyDown(event: KeyboardEvent) {
  // Ctrl+K or Cmd+K (Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault();
    clearHistory();
  }
}

// Browser compatibility check
const browserSupport = ref<BrowserSupportResult | null>(null);
const isSupported = computed(() => browserSupport.value?.isSupported ?? false);
</script>

<template>
  <div class="ai-chat-panel" :class="{ 'ai-chat-panel--embedded': embedded }" :style="panelStyle" v-show="visible">
    <!-- Header (shown when not in embedded mode) -->
    <div v-if="!embedded" class="panel-header" @click="toggleExpand">
      <div class="header-left">
        <span class="panel-icon">🤖</span>
        <span class="panel-title">AI Assistant</span>
        <span class="config-status" :title="`API: ${config.apiEndpoint}`">
          ⚙️
        </span>
      </div>

      <div class="header-actions">
        <button class="action-btn" @click.stop="toggleSettings" title="Configure AI service">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <button class="action-btn" @click.stop="clearHistory" title="Clear history">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
        <button class="action-btn close-btn" @click.stop="close" title="Close">
          ✕
        </button>
      </div>
    </div>

    <!-- Settings panel -->
    <div v-if="showSettings" class="settings-panel">
      <div class="settings-header">
        <h4>AI Service Configuration</h4>
        <button class="close-settings-btn" @click="showSettings = false">✕</button>
      </div>

      <div class="settings-form">
        <!-- API endpoint address -->
        <div class="form-group">
          <label for="apiEndpoint">API Endpoint Address</label>
          <input
            id="apiEndpoint"
            v-model="configForm.apiEndpoint"
            type="url"
            placeholder="http://127.0.0.1:1234/v1"
            class="form-input"
          />
          <span class="form-hint">LMStudio default: http://127.0.0.1:1234/v1</span>
        </div>

        <!-- API key -->
        <div class="form-group">
          <label for="apiKey">API Key</label>
          <input
            id="apiKey"
            v-model="configForm.apiKey"
            type="password"
            placeholder="lm-studio"
            class="form-input"
          />
          <span class="form-hint">Local models can use the default value: lm-studio</span>
        </div>

        <!-- Model name -->
        <div class="form-group">
          <label for="modelName">Model Name</label>
          <input
            id="modelName"
            v-model="configForm.modelName"
            type="text"
            placeholder="local-model"
            class="form-input"
          />
          <span class="form-hint">LMStudio detects the model automatically</span>
        </div>

        <!-- Token limit -->
        <div class="form-group">
          <label for="maxTokens">Max Tokens</label>
          <input
            id="maxTokens"
            v-model.number="configForm.maxTokens"
            type="number"
            min="100"
            max="100000"
            class="form-input"
          />
          <span class="form-hint">Default: 4096</span>
        </div>

        <!-- Temperature parameter -->
        <div class="form-group">
          <label for="temperature">Temperature</label>
          <input
            id="temperature"
            v-model.number="configForm.temperature"
            type="number"
            min="0"
            max="2"
            step="0.1"
            class="form-input"
          />
          <span class="form-hint">0.0-1.0, higher is more random (default: 0.7)</span>
        </div>

        <!-- Request timeout -->
        <div class="form-group">
          <label for="requestTimeout">Request Timeout (seconds)</label>
          <input
            id="requestTimeout"
            v-model.number="(configForm as any).requestTimeoutSeconds"
            type="number"
            min="30"
            max="600"
            step="30"
            class="form-input"
          />
          <span class="form-hint">Unit: seconds, default: 300 seconds (5 minutes)</span>
        </div>

        <!-- Action buttons -->
        <div class="form-actions">
          <button class="btn btn-secondary" @click="handleResetConfig">
            Reset to Default
          </button>
          <button class="btn btn-primary" @click="saveConfig">
            Save Configuration
          </button>
        </div>
      </div>
    </div>

    <!-- Message list -->
    <div class="messages-container" ref="messagesContainer">
      <ChatMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
      />

      <!-- Empty state hint -->
      <div v-if="messages.length === 0 && isSupported" class="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-text">Start a conversation with the AI assistant</div>
        <div class="empty-hint">e.g.: create a title in the detail band</div>
        <div class="empty-hint">Current API: {{ config.apiEndpoint }}</div>
      </div>

      <!-- Browser unsupported notice -->
      <div v-if="!isSupported" class="unsupported-warning">
        <div class="warning-icon">⚠️</div>
        <div class="warning-title">Browser Does Not Support AI Assistant</div>
        <div class="warning-message">{{ browserSupport?.message }}</div>
        <div class="warning-requirements">
          <div class="requirement-title">The following browser features are required:</div>
          <ul class="requirement-list">
            <li :class="{ supported: browserSupport?.features.webassembly }">
              {{ browserSupport?.features.webassembly ? '✓' : '✗' }} WebAssembly
            </li>
            <li :class="{ supported: browserSupport?.features.webWorkers }">
              {{ browserSupport?.features.webWorkers ? '✓' : '✗' }} Web Workers
            </li>
            <li :class="{ supported: browserSupport?.features.fetch }">
              {{ browserSupport?.features.fetch ? '✓' : '✗' }} Fetch API
            </li>
            <li :class="{ supported: browserSupport?.features.bigUint64Array }">
              {{ browserSupport?.features.bigUint64Array ? '✓' : '✗' }} BigUint64Array
            </li>
          </ul>
        </div>
        <div class="suggestion">
          We recommend using the latest version of Chrome, Firefox, or Safari
        </div>
      </div>
    </div>

    <!-- Input box -->
    <ChatInput
      :disabled="isLoading || !isSupported"
      :placeholder="isSupported ? 'Enter a command, e.g.: create a text field in the detail band to display the customer name' : 'Browser not supported, please upgrade your browser'"
      @submit="handleSendMessage"
    />
  </div>
</template>

<style scoped>
.ai-chat-panel {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-top: 2px solid #e0e0e0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: height 0.3s ease;
  height: 100%;
}

.ai-chat-panel--embedded {
  border-top: none;
  box-shadow: none;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 1.2em;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
}

.config-status {
  font-size: 0.85em;
  color: #666;
  cursor: help;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.close-btn:hover {
  background-color: #ffcdd2;
}

/* Settings panel styles */
.settings-panel {
  background-color: #f9f9f9;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px;
  max-height: 40%;
  overflow-y: auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.settings-header h4 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.close-settings-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #666;
}

.close-settings-btn:hover {
  color: #333;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}

.form-input {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.form-input:focus {
  outline: none;
  border-color: #2196f3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.form-hint {
  font-size: 11px;
  color: #999;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary {
  background-color: #2196f3;
  color: white;
}

.btn-primary:hover {
  background-color: #1976d2;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background-color: #d0d0d0;
}

/* Message container */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 1.1em;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 0.9em;
  font-style: italic;
  margin-bottom: 4px;
}

/* Browser unsupported notice styles */
.unsupported-warning {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: #fff3e0;
  border: 1px solid #ffcc02;
  border-radius: 8px;
  margin: 12px;
  text-align: center;
}

.warning-icon {
  font-size: 3em;
  margin-bottom: 12px;
}

.warning-title {
  font-size: 1.2em;
  font-weight: 600;
  color: #f57c00;
  margin-bottom: 8px;
}

.warning-message {
  font-size: 0.95em;
  color: #666;
  margin-bottom: 16px;
}

.warning-requirements {
  background-color: rgba(255, 255, 255, 0.7);
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  width: 100%;
  max-width: 400px;
}

.requirement-title {
  font-size: 0.9em;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.requirement-list {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.requirement-list li {
  font-size: 0.85em;
  color: #666;
  padding: 4px 0;
}

.requirement-list li.supported {
  color: #4caf50;
}

.requirement-list li:not(.supported) {
  color: #f44336;
}

.suggestion {
  font-size: 0.85em;
  color: #666;
  font-style: italic;
}
</style>
