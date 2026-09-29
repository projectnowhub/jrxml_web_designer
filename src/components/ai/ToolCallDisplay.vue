<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MCPToolCall, MCPToolResult } from '@/mcp';

// Props
const props = defineProps<{
  toolCall: MCPToolCall;
  toolResult?: MCPToolResult;
}>();

const { t, te } = useI18n();

// Tools with a translated display name (ai.tools.<tool name>); others show the raw tool name
const displayName = computed(() => {
  const key = `ai.tools.${props.toolCall.name}`;
  return te(key) ? t(key) : props.toolCall.name;
});

// Format parameters
const formattedParams = computed(() => {
  const params = props.toolCall.params;
  if (!params || Object.keys(params).length === 0) {
    return t('ai.tool.noParameters');
  }
  return JSON.stringify(params, null, 2);
});

// Tool status
const toolStatus = computed(() => {
  if (!props.toolResult) return 'pending';
  return props.toolResult.success ? 'success' : 'failed';
});

// Status style class
const statusClass = computed(() => ({
  'tool-call-display': true,
  'status-pending': toolStatus.value === 'pending',
  'status-success': toolStatus.value === 'success',
  'status-failed': toolStatus.value === 'failed'
}));
</script>

<template>
  <div :class="statusClass">
    <!-- Tool name -->
    <div class="tool-header">
      <span class="tool-icon">🔧</span>
      <span class="tool-name">{{ displayName }}</span>
      <span v-if="toolResult" class="tool-status" :class="toolStatus">
        {{ toolStatus === 'success' ? `✓ ${t('ai.tool.success')}` : `✗ ${t('ai.tool.failed')}` }}
      </span>
    </div>

    <!-- Tool parameters -->
    <div class="tool-params">
      <div class="params-label">{{ t("ai.tool.parameters") }}</div>
      <pre class="params-code">{{ formattedParams }}</pre>
    </div>

    <!-- Tool result -->
    <div v-if="toolResult" class="tool-result">
      <div class="result-label">{{ t("ai.tool.result") }}</div>
      <div v-if="toolResult.success" class="result-success">
        {{ toolResult.data?.message || t('ai.tool.executed') }}
      </div>
      <div v-else class="result-error">
        {{ toolResult.error || t('ai.tool.executionFailed') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-call-display {
  margin-top: 8px;
  padding: 10px;
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.05);
  border: 1px solid #e0e0e0;
  font-size: 0.9em;
}

.status-pending {
  border-color: #ff9800;
  background-color: #fff3e0;
}

.status-success {
  border-color: #4caf50;
  background-color: #f1f8e9;
}

.status-failed {
  border-color: #f44336;
  background-color: #ffebee;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
}

.tool-icon {
  font-size: 1.1em;
}

.tool-name {
  flex: 1;
}

.tool-status {
  font-size: 0.85em;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-success {
  color: #2e7d32;
  background-color: #c8e6c9;
}

.status-failed {
  color: #c62828;
  background-color: #ffcdd2;
}

.tool-params,
.tool-result {
  margin-top: 8px;
}

.params-label,
.result-label {
  font-size: 0.85em;
  color: #666;
  margin-bottom: 4px;
}

.params-code {
  margin: 0;
  padding: 8px;
  background-color: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.85em;
  overflow-x: auto;
  white-space: pre-wrap;
}

.result-success {
  color: #2e7d32;
  font-weight: 500;
}

.result-error {
  color: #c62828;
  font-weight: 500;
}
</style>
