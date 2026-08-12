/**
 * MCP Server - Main entry point
 *
 * Unified export of all MCP-related tools, handlers, and interfaces
 */

// Schema definitions
export * from './schemas/toolSchemas';

// Tool handlers
export * from './handlers';

// AI service
export * from './aiService';

// Confirmation handler
export * from './confirmHandler';

// ============================================
// Unified API interface
// ============================================

import { MCPToolHandlers, executeMCPTool, type MCPContext, type MCPToolCall, type MCPToolResult } from './handlers';
import { processUserInput, type Message } from './aiService';
import { shouldConfirm, createConfirmDialogManager, type ConfirmResponse } from './confirmHandler';
import { ALL_MCP_TOOL_SCHEMAS, generateAIToolDefinitions } from './schemas/toolSchemas';
import { useAIConfigManager } from '@/composables/useAIConfigManager';

/**
 * MCP Server main interface
 */
export class MCPServer {
  private context: MCPContext;
  private confirmManager = createConfirmDialogManager();
  private conversationHistory: Message[] = [];

  constructor(context: MCPContext) {
    this.context = context;
  }

  /**
   * Update the context
   */
  updateContext(context: Partial<MCPContext>) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Process user input
   */
  async processUserInput(userInput: string): Promise<{
    response: string;
    toolResults: MCPToolResult[];
    error?: string;
  }> {
    try {
      // Get the AI configuration
      const { config } = useAIConfigManager();

      // Call the AI service
      const aiResponse = await processUserInput(
        userInput,
        this.conversationHistory,
        ALL_MCP_TOOL_SCHEMAS,
        config
      );

      if (!aiResponse.success) {
        return {
          response: '',
          toolResults: [],
          error: aiResponse.error
        };
      }

      // Execute tool calls
      const toolResults: MCPToolResult[] = [];

      for (const toolCall of aiResponse.toolCalls) {
        // Check whether confirmation is required
        if (shouldConfirm(toolCall)) {
          const confirmResponse = await this.confirmManager.requestConfirm(toolCall);

          if (!confirmResponse.confirmed) {
            toolResults.push({
              success: false,
              error: `Operation rejected by user: ${confirmResponse.reason || 'no reason specified'}`
            });
            continue;
          }
        }

        // Execute the tool
        const result = await executeMCPTool(toolCall, this.context);
        toolResults.push(result);
      }

      return {
        response: aiResponse.content,
        toolResults
      };

    } catch (error) {
      return {
        response: '',
        toolResults: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a tool directly (skipping AI parsing)
   */
  async executeToolDirectly(toolCall: MCPToolCall): Promise<MCPToolResult> {
    // Check whether confirmation is required
    if (shouldConfirm(toolCall)) {
      const confirmResponse = await this.confirmManager.requestConfirm(toolCall);

      if (!confirmResponse.confirmed) {
        return {
          success: false,
          error: `Operation rejected by user: ${confirmResponse.reason || 'no reason specified'}`
        };
      }
    }

    return executeMCPTool(toolCall, this.context);
  }

  /**
   * Get the list of tools
   */
  getAvailableTools() {
    return ALL_MCP_TOOL_SCHEMAS;
  }

  /**
   * Get tool definitions understandable by the AI model
   */
  getAIToolDefinitions() {
    return generateAIToolDefinitions();
  }

  /**
   * Clear the conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get the conversation history
   */
  getHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * Get the confirmation manager
   */
  getConfirmManager() {
    return this.confirmManager;
  }
}

// ============================================
// Factory functions
// ============================================

/**
 * Create an MCP Server instance
 */
export function createMCPServer(context: MCPContext): MCPServer {
  return new MCPServer(context);
}

/**
 * Create a standalone MCP context (for testing)
 */
export function createMockMCPContext(overrides: Partial<MCPContext> = {}): MCPContext {
  return {
    bands: [],
    reportProperties: {},
    fields: [],
    parameters: [],
    variables: [],
    saveStateToHistory: () => {},
    updateJRXML: () => {},
    selectElement: () => {},
    ...overrides
  };
}
