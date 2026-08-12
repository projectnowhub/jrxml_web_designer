/**
 * AI Service - OpenAI-compatible API calls
 *
 * Calls the AI service using configured parameters
 */

import { SYSTEM_PROMPT } from '@/config/aiConfig';
import type { MCPToolCall } from './handlers';
import type { AIConfiguration } from '@/composables/useAIConfigManager';

// ============================================
// Type definitions
// ============================================

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  };
  tool_call_id?: string;
}

export interface AIResponse {
  content: string;
  toolCalls: MCPToolCall[];
  success: boolean;
  error?: string;
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

// ============================================
// API call functions
// ============================================

/**
 * Call an OpenAI-compatible API
 */
export async function callOpenAICompatibleAPI(
  messages: Message[],
  tools: OpenAITool[],
  config: AIConfiguration
): Promise<AIResponse> {
  try {
    const requestBody: any = {
      model: config.modelName,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    };

    // If tool definitions were provided, add them to the request
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    console.log('Calling AI API:', config.apiEndpoint);
    console.log('Model:', config.modelName);

    // Send the request
    const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(config.requestTimeout), // Use the configured timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Parse the response
    const choice = data.choices[0];
    if (!choice) {
      throw new Error('No response from AI');
    }

    const assistantMessage = choice.message;
    const toolCalls: MCPToolCall[] = [];

    // Extract tool calls
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          toolCalls.push({
            name: toolCall.function.name,
            params: args
          });
        } catch (error) {
          console.error('Failed to parse tool call arguments:', error);
        }
      }
    }

    return {
      content: assistantMessage.content || '',
      toolCalls,
      success: true
    };

  } catch (error) {
    console.error('AI API call failed:', error);
    return {
      content: '',
      toolCalls: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extract tool calls from plain text (fallback approach)
 */
function extractToolCallsFromText(text: string): MCPToolCall[] {
  const toolCalls: MCPToolCall[] = [];

  // Match the ```json ... ``` format
  const jsonBlockPattern = /```json\s*([\s\S]*?)```/g;
  let match;

  while ((match = jsonBlockPattern.exec(text)) !== null) {
    try {
      const jsonStr = match[1]?.trim() || '';
      if (!jsonStr) continue;

      const parsed = JSON.parse(jsonStr);

      // Handle a single tool call
      if (parsed.tool_name && parsed.parameters) {
        toolCalls.push({
          name: parsed.tool_name,
          params: parsed.parameters
        });
      }

      // Handle multiple tool calls
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        for (const tc of parsed.tool_calls) {
          if (tc.tool_name && tc.parameters) {
            toolCalls.push({
              name: tc.tool_name,
              params: tc.parameters
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to parse JSON block:', error);
    }
  }

  return toolCalls;
}

/**
 * Prepare the conversation history
 */
export function prepareConversationHistory(
  messages: Message[]
): Message[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ];
}

/**
 * Create a user message
 */
export function createUserMessage(content: string): Message {
  return { role: 'user', content };
}

/**
 * Create an assistant message
 */
export function createAssistantMessage(content: string, toolCalls?: MCPToolCall[]): Message {
  const message: Message = { role: 'assistant', content };

  if (toolCalls && toolCalls.length > 0 && toolCalls[0]) {
    message.tool_call = {
      id: `call_${Date.now()}`,
      type: 'function',
      function: {
        name: toolCalls[0].name,
        arguments: JSON.stringify(toolCalls[0].params)
      }
    };
  }

  return message;
}

/**
 * Create a design-state message
 */
function createDesignStateMessage(designState: any): Message {
  const stateDescription = formatDesignState(designState);
  return {
    role: 'system',
    content: `[Current Design State]\n${stateDescription}\n[/Current Design State]`
  };
}

/**
 * Format the design state into a human-readable format
 */
function formatDesignState(designState: any): string {
  const lines: string[] = [];

  // Currently selected element
  if (designState.selectedElement) {
    const element = designState.selectedElement;
    lines.push('[Currently Selected Element]');
    lines.push(`- UUID: ${element.uuid}`);
    lines.push(`- Type: ${element.type}`);
    lines.push(`- Position: (${element.x}, ${element.y})`);
    lines.push(`- Size: ${element.width}x${element.height}`);

    if (element.type === 'staticText') {
      lines.push(`- Text: "${element.text || ''}"`);
    } else if (element.type === 'textField') {
      lines.push(`- Expression: "${element.expression || ''}"`);
    }

    if (element.forecolor) {
      lines.push(`- Color: ${element.forecolor}`);
    }
    lines.push('');
  }

  // Band information
  if (designState.bands && Array.isArray(designState.bands)) {
    lines.push('Report structure:');
    for (const band of designState.bands) {
      const elementsCount = band.elements?.length || 0;
      lines.push(`- ${band.type} band: height ${band.height}px, contains ${elementsCount} element(s)`);

      // List element details
      if (band.elements && band.elements.length > 0) {
        for (const element of band.elements) {
          const elementType = element.type;
          const uuid = element.uuid;
          let description = '';

          if (elementType === 'staticText') {
            description = `static text "${element.text || ''}"`;
          } else if (elementType === 'textField') {
            description = `dynamic text field "${element.expression || ''}"`;
          } else if (elementType === 'rectangle') {
            description = 'rectangle';
          } else if (elementType === 'frame') {
            description = 'Frame container';
          } else {
            description = elementType;
          }

          lines.push(`    - UUID: ${uuid} - ${description} (position: ${element.x},${element.y}, size: ${element.width}x${element.height})`);
        }
      }
    }
  }

  // Field information
  if (designState.fields && designState.fields.length > 0) {
    lines.push('\nAvailable fields:');
    for (const field of designState.fields) {
      lines.push(`- $F{${field.name}} (${field.class})`);
    }
  }

  // Parameter information
  if (designState.parameters && designState.parameters.length > 0) {
    lines.push('\nAvailable parameters:');
    for (const param of designState.parameters) {
      lines.push(`- $P{${param.name}}`);
    }
  }

  return lines.join('\n');
}

// ============================================
// Generate OpenAI tool definitions from tool schemas
// ============================================

/**
 * Convert MCP tool schemas to OpenAI tool format
 */
export function convertToOpenAITools(
  mcpTools: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>
): OpenAITool[] {
  return mcpTools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  }));
}

// ============================================
// Main interface
// ============================================

/**
 * Process user input and call the AI
 */
export async function processUserInput(
  userMessage: string,
  conversationHistory: Message[],
  availableTools: Array<{
    name: string;
    description: string;
    inputSchema: any;
  }>,
  config: AIConfiguration,
  designState?: any  // Added: current design state
): Promise<AIResponse> {
  // If a design state was provided, add it to the conversation history
  if (designState) {
    const stateMessage = createDesignStateMessage(designState);
    // Avoid adding the same state message twice
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    if (!lastMessage || lastMessage.content !== stateMessage.content) {
      conversationHistory.push(stateMessage);
    }
  }

  // Add the user message to the history
  conversationHistory.push(createUserMessage(userMessage));

  // Prepare messages (including the system prompt)
  const messages = prepareConversationHistory(conversationHistory);

  // Convert tool definitions to OpenAI format
  const openAITools = convertToOpenAITools(availableTools);

  // Call the API
  const response = await callOpenAICompatibleAPI(messages, openAITools, config);

  // If the API call failed, try extracting tool calls from plain text
  if (!response.success || response.toolCalls.length === 0) {
    if (response.content) {
      const textToolCalls = extractToolCallsFromText(response.content);
      if (textToolCalls.length > 0) {
        response.toolCalls = textToolCalls;
      }
    }
  }

  // Add the assistant response to the history
  conversationHistory.push(createAssistantMessage(
    response.content,
    response.toolCalls.length > 0 ? response.toolCalls : undefined
  ));

  return response;
}
