// What the model is told when it wants to finish with problems left
const verificationNote = (issues: string[]) =>
  `[Automatic check of the result, not written by the user] The work is not done: ${issues.length} problem(s) remain.\n${issues
    .slice(0, 25)
    .map((i) => `- ${i}`)
    .join('\n')}\nFix them now with the smallest changes (fill_page for missing content, move / resize / stack_elements / put_in_box for layout, delete what is duplicated or typed by hand). Don't re-create what already exists. Then answer the user, naming anything you could not fix.`;

/**
 * useAIChat - AI conversation composable
 *
 * Sends the user's message to the configured model with the tools and the
 * current design, runs the tools it calls, gives it their results and asks
 * again, until it answers without a tool call (or MAX_TOOL_ROUNDS is reached).
 * Everything the model changes for one message is one undo step.
 */

import { ref, computed, type Ref } from 'vue';
import i18n from '@/i18n';
import { ALL_MCP_TOOL_SCHEMAS, executeMCPTool, type MCPContext } from '@/mcp';
import {
  createAssistantMessage,
  createToolResultMessage,
  createUserMessage,
  requestAI,
  type Message
} from '@/mcp/aiService';
import { buildSystemPrompt } from '@/config/aiConfig';
import { designStateText } from '@/mcp/design';
import { useSelectionStore } from '@/stores/selection';
import { findingKey, reportChecks, verificationIssues } from '@/mcp/reportChecks';
import type { ChatAttachment } from '@/mcp/attachments';
import { useAIConfigManager } from '@/composables/useAIConfigManager';
import type { MCPToolCall, MCPToolResult } from '@/mcp';

// ============================================
// Type definitions
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'error' | 'system';
  content: string;
  timestamp: Date;
  toolCall?: MCPToolCall;
  toolResult?: MCPToolResult;
  isLoading?: boolean;
  // user: the pictures and files given with the message
  attachments?: ChatAttachment[];
}

export interface UseAIChatReturn {
  // State
  messages: ChatMessage[];
  isLoading: Ref<boolean>;

  // Actions
  sendMessage: (content: string, attachments?: ChatAttachment[]) => Promise<void>;
  clearHistory: () => void;

  // Computed properties
  messageCount: Ref<number>;
  lastMessage: Ref<ChatMessage | null>;
}

// Model calls for one message (each may run several tools): a whole report is
// planned, then built page by page, checked and repaired
const MAX_TOOL_ROUNDS = 40;

// Times the result is checked and handed back before the AI may finish
const MAX_VERIFY_ROUNDS = 2;

// Answers cut off by the output limit before giving up (Max Tokens is too low)
const MAX_CUT_OFFS = 2;
const CUT_OFF_NOTE =
  '[Your last reply hit the output limit, so its tool calls were dropped and nothing was made from it. Carry on in smaller steps: at most about 15 elements per create_design call, several calls if needed.]';

// ============================================
// Implementation
// ============================================

export function useAIChat(getMcpContext?: () => MCPContext | undefined, onUpdate?: () => void): UseAIChatReturn {
  // State
  const messages = ref<ChatMessage[]>([]);
  const isLoading = ref(false);

  // Conversation sent to the model (tool calls and their results included)
  const conversationHistory: Message[] = [];
  // Everything attached in this conversation, by id: a picture can still be
  // put into the report a few messages later
  const attachments = new Map<string, ChatAttachment>();

  // Configuration manager
  const { config } = useAIConfigManager();

  /**
   * Generate a unique message ID
   */
  function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a message
   */
  function addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const newMessage: ChatMessage = {
      id: generateMessageId(),
      timestamp: new Date(),
      ...message
    };
    messages.value.push(newMessage);
    return newMessage;
  }

  /**
   * Remove a message
   */
  function removeMessage(id: string) {
    const index = messages.value.findIndex(m => m.id === id);
    if (index !== -1) messages.value.splice(index, 1);
  }

  /**
   * Execute an MCP tool
   */
  async function executeTool(toolCall: MCPToolCall, context: MCPContext): Promise<MCPToolResult> {
    if (toolCall.params?.__unreadable !== undefined) {
      return { success: false, error: 'The tool arguments were not valid JSON' };
    }
    try {
      return await executeMCPTool(toolCall, context);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed'
      };
    }
  }

  // The design as it is now, for the model
  function systemPrompt(): string {
    const selected = useSelectionStore().selectedElement?.uuid;
    return buildSystemPrompt(designStateText(selected ?? undefined));
  }

  /**
   * Send a message
   */
  async function sendMessage(content: string, files: ChatAttachment[] = []) {
    if (isLoading.value || (!content.trim() && !files.length)) {
      return;
    }
    for (const a of files) attachments.set(a.id, a);

    isLoading.value = true;
    const baseContext = getMcpContext?.();
    // One undo step for everything done for this message
    const context: MCPContext = { ...(baseContext ?? {}), turn: { recorded: false }, attachments };
    // Problems already there: only what this message leaves wrong is handed back
    const baseline = new Set(reportChecks().filter((c) => c.level === 'fix').map(findingKey));
    let verifyRounds = 0;

    try {
      addMessage({ role: 'user', content, ...(files.length ? { attachments: files } : {}) });
      conversationHistory.push(createUserMessage(content || '(see the attachments)', files));

      let finished = false;
      let cutOffs = 0;
      for (let round = 0; round < MAX_TOOL_ROUNDS && !finished; round++) {
        const loading = addMessage({
          role: 'system',
          content: i18n.global.t('ai.chat.processing'),
          isLoading: true
        });
        const response = await requestAI(systemPrompt(), conversationHistory, ALL_MCP_TOOL_SCHEMAS, config);
        removeMessage(loading.id);

        if (!response.success) {
          addMessage({ role: 'error', content: response.error ?? i18n.global.t('common.unknownError') });
          // The unanswered message stays out of the conversation
          if (conversationHistory[conversationHistory.length - 1]?.role === 'user') conversationHistory.pop();
          break;
        }

        conversationHistory.push(createAssistantMessage(response));
        if (response.content && !response.toolCallsInText && !response.cutOff) {
          addMessage({ role: 'assistant', content: response.content });
        }
        // Too long for the output limit: the model carries on in smaller steps
        if (response.cutOff) {
          if (++cutOffs > MAX_CUT_OFFS) {
            addMessage({ role: 'error', content: i18n.global.t('ai.chat.tooLong') });
            break;
          }
          addMessage({ role: 'system', content: i18n.global.t('ai.chat.cutOff') });
          conversationHistory.push(createUserMessage(CUT_OFF_NOTE));
          continue;
        }
        if (!response.toolCalls.length) {
          // Done only when the result checks out: problems go back to the model
          if (context.turn?.recorded) {
            const issues = verificationIssues(context.turn.plan, baseline);
            if (issues.length && verifyRounds < MAX_VERIFY_ROUNDS) {
              verifyRounds++;
              addMessage({ role: 'system', content: i18n.global.t('ai.chat.verifying', { count: issues.length }, issues.length) });
              conversationHistory.push(createUserMessage(verificationNote(issues)));
              continue;
            }
            if (issues.length) addMessage({ role: 'system', content: i18n.global.t('ai.chat.problemsLeft', { count: issues.length }, issues.length) });
          }
          finished = true;
          break;
        }

        // Every call gets a result, so the model can read what happened
        for (const toolCall of response.toolCalls) {
          const toolResult = await executeTool(toolCall, context);
          if (onUpdate && toolResult.success) onUpdate();
          addMessage({
            role: 'tool',
            content: toolResult.success
              ? i18n.global.t('ai.chat.toolSucceeded', { tool: toolName(toolCall.name) })
              : i18n.global.t('ai.chat.toolFailed', { tool: toolName(toolCall.name), error: toolResult.error ?? '' }),
            toolCall,
            toolResult
          });
          conversationHistory.push(createToolResultMessage(toolCall, toolResult));
        }
      }

      if (!finished && conversationHistory[conversationHistory.length - 1]?.role === 'tool') {
        addMessage({ role: 'system', content: i18n.global.t('ai.chat.stoppedAfterSteps', { count: MAX_TOOL_ROUNDS }) });
      }
    } catch (error) {
      addMessage({
        role: 'error',
        content: error instanceof Error ? error.message : i18n.global.t('common.unknownError')
      });
    } finally {
      // In place: the panel holds this array
      for (const m of messages.value.filter(m => m.isLoading)) removeMessage(m.id);
      isLoading.value = false;
    }
  }

  // The tool's name in the user's language
  function toolName(name: string): string {
    const key = `ai.tools.${name}`;
    return i18n.global.te(key) ? i18n.global.t(key) : name;
  }

  /**
   * Clear history
   */
  function clearHistory() {
    messages.value.splice(0, messages.value.length);
    conversationHistory.length = 0;
    for (const a of attachments.values()) if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
    attachments.clear();
  }

  // Computed properties
  const messageCount = computed(() => messages.value.length);
  const lastMessage = computed(() => messages.value[messages.value.length - 1] || null);

  return {
    // State (the array itself is reactive)
    messages: messages.value,
    isLoading,

    // Actions
    sendMessage,
    clearHistory,

    // Computed properties
    messageCount,
    lastMessage
  };
}
