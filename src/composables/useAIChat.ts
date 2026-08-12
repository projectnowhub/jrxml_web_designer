/**
 * useAIChat - AI conversation composable
 *
 * Interacts with the AI using the configured AI service, and executes tool calls
 */

import { ref, computed } from 'vue';
import { ALL_MCP_TOOL_SCHEMAS, executeMCPTool, type MCPContext } from '@/mcp';
import { processUserInput, type Message } from '@/mcp/aiService';
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
}

export interface UseAIChatReturn {
  // State
  messages: ChatMessage[];
  isLoading: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearHistory: () => void;

  // Computed properties
  messageCount: number;
  lastMessage: ChatMessage | null;
}

// ============================================
// Implementation
// ============================================

export function useAIChat(getMcpContext?: () => MCPContext | undefined, onUpdate?: () => void): UseAIChatReturn {
  // State
  const messages = ref<ChatMessage[]>([]);
  const isLoading = ref(false);

  // Conversation history
  const conversationHistory: Message[] = [];

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
   * Update a message
   */
  function updateMessage(id: string, updates: Partial<ChatMessage>) {
    const messageIndex = messages.value.findIndex(m => m.id === id);
    if (messageIndex !== -1 && messages.value[messageIndex]) {
      messages.value[messageIndex] = {
        ...messages.value[messageIndex],
        ...updates
      } as ChatMessage;
    }
  }

  /**
   * Execute an MCP tool
   */
  async function executeTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    const mcpContext = getMcpContext?.();
    if (!mcpContext) {
      return {
        success: false,
        error: 'MCP context not provided'
      };
    }

    try {
      return await executeMCPTool(toolCall, mcpContext);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed'
      };
    }
  }

  /**
   * Get the full info of the selected element
   */
  function getSelectedElementInfo(context: MCPContext): any {
    if (!context.selectedElement) {
      return undefined;
    }

    const { bandIndex, elementIndex } = context.selectedElement;

    // Ensure the indices are valid
    if (bandIndex === undefined || elementIndex === undefined) {
      return undefined;
    }

    // Get the band
    const band = context.bands[bandIndex];
    if (!band || !band.elements) {
      return undefined;
    }

    // Get the element
    const element = band.elements[elementIndex];
    if (!element) {
      return undefined;
    }

    // Return the full element info
    return {
      uuid: element.uuid,
      type: element.type,
      bandType: band.type,
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      text: (element as any).text,
      expression: (element as any).expression,
      forecolor: element.forecolor,
      backcolor: element.backcolor,
      fontSize: element.fontSize,
      fontFamily: element.fontFamily,
      isBold: element.isBold,
      isItalic: element.isItalic
    };
  }

  /**
   * Send a message
   */
  async function sendMessage(content: string) {
    if (isLoading.value || !content.trim()) {
      return;
    }

    isLoading.value = true;

    try {
      // Add the user message
      addMessage({
        role: 'user',
        content
      });

      // Add a loading indicator
      const loadingMessage = addMessage({
        role: 'system',
        content: 'AI is processing...',
        isLoading: true
      });

      // Call the AI service (using configured parameters)
      const mcpContext = getMcpContext?.();
      const response = await processUserInput(
        content,
        conversationHistory,
        ALL_MCP_TOOL_SCHEMAS,
        config,  // Pass the configuration
        mcpContext ? {
          bands: mcpContext.bands,
          fields: mcpContext.fields,
          parameters: mcpContext.parameters,
          selectedElement: mcpContext.selectedElement ? getSelectedElementInfo(mcpContext) : undefined,
          selectedElements: mcpContext.selectedElements
        } : undefined  // Pass the design state
      );

      // Remove the loading indicator
      updateMessage(loadingMessage.id, { isLoading: false });

      // If there are tool calls, execute them
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          // Show that a tool is executing
          addMessage({
            role: 'system',
            content: `Executing tool: ${toolCall.name}`
          });

          // Actually execute the tool
          const toolResult = await executeTool(toolCall);

          // Trigger a UI update
          if (onUpdate && toolResult.success) {
            onUpdate();
          }

          // Show the tool execution result
          addMessage({
            role: 'tool',
            content: toolResult.success
              ? `✅ Tool ${toolCall.name} executed successfully`
              : `❌ Tool ${toolCall.name} failed: ${toolResult.error}`,
            toolCall,
            toolResult
          });
        }
      }

      // Add the AI response
      if (response.content) {
        addMessage({
          role: 'assistant',
          content: response.content
        });
      }

      // If there is an error
      if (response.error) {
        addMessage({
          role: 'error',
          content: response.error
        });
      }

    } catch (error) {
      addMessage({
        role: 'error',
        content: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Clear history
   */
  function clearHistory() {
    // Clear the array contents directly, rather than replacing the whole array
    messages.value.splice(0, messages.value.length);
    conversationHistory.length = 0;
  }

  // Computed properties
  const messageCount = computed(() => messages.value.length);
  const lastMessage = computed(() => messages.value[messages.value.length - 1] || null);

  return {
    // State
    messages: messages.value,
    isLoading: isLoading.value,

    // Actions
    sendMessage,
    clearHistory,

    // Computed properties
    messageCount: messageCount.value,
    lastMessage: lastMessage.value
  } as UseAIChatReturn;
}
