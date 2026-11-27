/**
 * AI Service - calls the configured model (Anthropic Claude Messages API or
 * an OpenAI-compatible API) with the tools, keeping a conversation in which
 * the model's tool calls and their results go back to it, so it can read what
 * it made and carry on (useAIChat runs the rounds).
 */

import type { MCPToolCall } from "./handlers";
import { currentClaudeModel, DEFAULT_MAX_TOKENS } from "@/config/aiConfig";
import { describeAttachment, type ChatAttachment } from "./attachments";
import type { AIConfiguration } from "@/composables/useAIConfigManager";

// ============================================
// Type definitions
// ============================================

// One conversation entry, whichever API is used
export interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  // user: pictures, PDFs and text files given with the message
  attachments?: ChatAttachment[];
  // assistant: the tools it called (with their ids)
  toolCalls?: MCPToolCall[];
  // assistant: the calls were written in the text (models without tool use)
  toolCallsInText?: boolean;
  // tool: the call this is the result of
  toolCallId?: string;
  isError?: boolean;
}

export interface AIResponse {
  content: string;
  toolCalls: MCPToolCall[];
  toolCallsInText?: boolean;
  // The answer hit the output limit: its unfinished tool calls were dropped
  cutOff?: boolean;
  success: boolean;
  error?: string;
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

type ToolSchemaLike = { name: string; description: string; inputSchema: any };

let callCounter = 0;
const newCallId = () => `call_${Date.now().toString(36)}_${(callCounter++).toString(36)}`;

// ============================================
// OpenAI-compatible API
// ============================================

// The user's words with the attachments listed (by id, so the model can name them)
const userText = (m: Message) =>
  m.attachments?.length ? `${m.content}\n\n[Attached: ${m.attachments.map(describeAttachment).join("; ")}]` : m.content;

// Only the latest message with attachments carries them in full; earlier ones
// are named (the model saw them then), so each request doesn't send them again
const latestWithAttachments = (messages: Message[]) => {
  for (let i = messages.length - 1; i >= 0; i--) if (messages[i]!.role === "user" && messages[i]!.attachments?.length) return i;
  return -1;
};

const fileText = (a: ChatAttachment) => `[File ${a.id}: ${a.name}]\n${a.data}`;

function toOpenAIMessages(system: string, messages: Message[]): any[] {
  const out: any[] = [{ role: "system", content: system }];
  const full = latestWithAttachments(messages);
  messages.forEach((m, index) => {
    if (m.role === "user" && m.attachments?.length && index === full) {
      out.push({
        role: "user",
        content: [
          ...m.attachments.map((a) =>
            a.kind === "image"
              ? { type: "image_url", image_url: { url: `data:${a.mediaType};base64,${a.data}` } }
              : a.kind === "pdf"
                ? { type: "file", file: { filename: a.name, file_data: `data:application/pdf;base64,${a.data}` } }
                : { type: "text", text: fileText(a) },
          ),
          { type: "text", text: userText(m) },
        ],
      });
      return;
    }
    toOpenAI(m, out);
  });
  return out;
}

// One message in the OpenAI form (attachments of the latest message: above)
function toOpenAI(m: Message, out: any[]): void {
  if (m.role === "user") {
    out.push({ role: "user", content: userText(m) });
  } else if (m.role === "assistant") {
    if (m.toolCalls?.length && !m.toolCallsInText) {
      out.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({
          id: c.id,
          type: "function",
          function: { name: c.name, arguments: JSON.stringify(c.params ?? {}) },
        })),
      });
    } else {
      out.push({ role: "assistant", content: m.content || " " });
    }
  } else if (m.toolCallId?.startsWith("text_")) {
    // Results of calls written in the text go back as text
    out.push({ role: "user", content: `[Tool result]\n${m.content}` });
  } else {
    out.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
  }
}

/**
 * Call an OpenAI-compatible API
 */
export async function callOpenAICompatibleAPI(
  system: string,
  messages: Message[],
  tools: ToolSchemaLike[],
  config: AIConfiguration,
): Promise<AIResponse> {
  try {
    let endpoint = config.apiEndpoint || "http://127.0.0.1:1234/v1";
    let modelName = config.modelName || "local-model";

    // Auto-detect OpenAI key (sk-proj- or standard sk- not starting with sk-ant-)
    const isOpenAI = Boolean(
      config.apiKey?.startsWith("sk-proj-") ||
      (config.apiKey?.startsWith("sk-") &&
        !config.apiKey?.startsWith("sk-ant-")),
    );

    if (isOpenAI) {
      if (
        !endpoint ||
        endpoint.includes("127.0.0.1") ||
        endpoint.includes("localhost") ||
        endpoint.includes("anthropic.com")
      ) {
        endpoint = "https://api.openai.com/v1";
      }
      if (
        !modelName ||
        modelName === "local-model" ||
        modelName.includes("claude")
      ) {
        modelName = "gpt-4o";
      }
    }

    const targetUrl = endpoint.endsWith("/chat/completions")
      ? endpoint
      : `${endpoint.replace(/\/+$/, "")}/chat/completions`;

    const requestBody: any = {
      model: modelName,
      messages: toOpenAIMessages(system, messages),
      max_tokens: outputLimit(modelName, config.maxTokens),
      temperature: config.temperature,
    };

    if (tools.length > 0) {
      requestBody.tools = convertToOpenAITools(tools);
      requestBody.tool_choice = "auto";
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(config.requestTimeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("No response from AI");
    }

    const assistantMessage = choice.message;
    // Cut off by the output limit: its tool calls are unfinished
    if (choice.finish_reason === "length") {
      return { content: assistantMessage.content || "", toolCalls: [], success: true, cutOff: true };
    }
    const toolCalls: MCPToolCall[] = [];
    for (const toolCall of assistantMessage.tool_calls ?? []) {
      let params: Record<string, any> = {};
      try {
        params = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        // Sent back as a failed call, so the model can try again
        params = { __unreadable: toolCall.function.arguments };
      }
      toolCalls.push({ id: toolCall.id || newCallId(), name: toolCall.function.name, params });
    }

    return { content: assistantMessage.content || "", toolCalls, success: true };
  } catch (error) {
    console.error("AI API call failed:", error);
    return {
      content: "",
      toolCalls: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// The answer length asked for, within what the model can write (GPT-4o:
// 16,384 tokens; asking for more fails the request)
function outputLimit(modelName: string, wanted: number | undefined): number {
  const tokens = wanted || DEFAULT_MAX_TOKENS;
  return /^gpt-4o/i.test(modelName) ? Math.min(tokens, 16384) : tokens;
}

/**
 * Extract tool calls from plain text (models without tool use)
 */
function extractToolCallsFromText(text: string): MCPToolCall[] {
  const toolCalls: MCPToolCall[] = [];
  const jsonBlockPattern = /```json\s*([\s\S]*?)```/g;
  let match;

  while ((match = jsonBlockPattern.exec(text)) !== null) {
    try {
      const jsonStr = match[1]?.trim() || "";
      if (!jsonStr) continue;
      const parsed = JSON.parse(jsonStr);
      const calls = parsed.tool_calls && Array.isArray(parsed.tool_calls) ? parsed.tool_calls : [parsed];
      for (const tc of calls) {
        if (tc?.tool_name && tc.parameters) {
          toolCalls.push({ id: `text_${newCallId()}`, name: tc.tool_name, params: tc.parameters });
        }
      }
    } catch (error) {
      console.error("Failed to parse JSON block:", error);
    }
  }

  return toolCalls;
}

// ============================================
// Generate OpenAI tool definitions from tool schemas
// ============================================

/**
 * Convert MCP tool schemas to OpenAI tool format
 */
export function convertToOpenAITools(mcpTools: ToolSchemaLike[]): OpenAITool[] {
  return mcpTools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

// ============================================
// Anthropic Claude Messages API
// ============================================

/**
 * Check if current configuration targets Anthropic Claude
 */
export function isClaudeConfig(config: AIConfiguration): boolean {
  const key = config.apiKey || "";
  const endpoint = config.apiEndpoint || "";
  const model = (config.modelName || "").toLowerCase();

  // OpenAI keys (sk-proj-... or sk-...) must NOT route to Anthropic Claude
  if (
    key.startsWith("sk-proj-") ||
    (key.startsWith("sk-") && !key.startsWith("sk-ant-"))
  ) {
    return false;
  }

  return (
    key.startsWith("sk-ant-") ||
    endpoint.includes("anthropic.com") ||
    model.includes("claude")
  );
}

type ClaudeBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string }; title?: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, any> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

// Claude wants user / assistant turns in alternation; tool results are user
// turns holding tool_result blocks right after the assistant's tool_use
function toClaudeMessages(messages: Message[]): Array<{ role: "user" | "assistant"; content: ClaudeBlock[] }> {
  const out: Array<{ role: "user" | "assistant"; content: ClaudeBlock[] }> = [];
  const push = (role: "user" | "assistant", blocks: ClaudeBlock[]) => {
    if (!blocks.length) return;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content.push(...blocks);
    else out.push({ role, content: blocks });
  };
  const full = latestWithAttachments(messages);
  for (const [index, m] of messages.entries()) {
    if (m.role === "user" && m.attachments?.length && index === full) {
      push("user", [
        ...m.attachments.map((a): ClaudeBlock =>
          a.kind === "image"
            ? { type: "image", source: { type: "base64", media_type: a.mediaType, data: a.data } }
            : a.kind === "pdf"
              ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: a.data }, title: a.name }
              : { type: "text", text: fileText(a) },
        ),
        { type: "text", text: userText(m) || " " },
      ]);
    } else if (m.role === "user") {
      push("user", [{ type: "text", text: userText(m) || " " }]);
    } else if (m.role === "assistant") {
      const blocks: ClaudeBlock[] = m.content ? [{ type: "text", text: m.content }] : [];
      if (!m.toolCallsInText) {
        for (const c of m.toolCalls ?? []) blocks.push({ type: "tool_use", id: c.id!, name: c.name, input: c.params ?? {} });
      }
      push("assistant", blocks.length ? blocks : [{ type: "text", text: " " }]);
    } else if (m.toolCallId?.startsWith("text_")) {
      push("user", [{ type: "text", text: `[Tool result]\n${m.content}` }]);
    } else {
      push("user", [{ type: "tool_result", tool_use_id: m.toolCallId!, content: m.content, ...(m.isError ? { is_error: true } : {}) }]);
    }
  }
  // The conversation starts with the user
  if (out[0]?.role !== "user") out.unshift({ role: "user", content: [{ type: "text", text: "Hello" }] });
  return out;
}

/**
 * Call native Anthropic Claude Messages API
 */
export async function callClaudeAPI(
  systemPrompt: string,
  messages: Message[],
  mcpTools: ToolSchemaLike[],
  config: AIConfiguration,
): Promise<AIResponse> {
  try {
    let endpoint =
      config.apiEndpoint || "https://api.anthropic.com/v1/messages";
    if (
      endpoint.includes("127.0.0.1") ||
      endpoint.includes("localhost") ||
      !endpoint.startsWith("http")
    ) {
      endpoint = "https://api.anthropic.com/v1/messages";
    } else if (
      endpoint.includes("anthropic.com") &&
      !endpoint.endsWith("/messages")
    ) {
      endpoint = `${endpoint.replace(/\/+$/, "")}/messages`;
    }

    const modelName = currentClaudeModel(config.modelName);

    const requestBody: any = {
      model: modelName,
      max_tokens: config.maxTokens || DEFAULT_MAX_TOKENS,
      temperature: config.temperature ?? 0.7,
      system: systemPrompt,
      messages: toClaudeMessages(messages),
    };

    if (mcpTools.length > 0) {
      requestBody.tools = mcpTools.map((tool, i) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema,
        // The tools are the same on every request (several per message): cached
        ...(i === mcpTools.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
      }));
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(config.requestTimeout || 300000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Claude API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();

    let contentText = "";
    const toolCalls: MCPToolCall[] = [];
    for (const block of Array.isArray(data.content) ? data.content : []) {
      if (block.type === "text") {
        contentText += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({ id: block.id, name: block.name, params: block.input || {} });
      }
    }
    // Cut off by the output limit: a tool call in it may be unfinished
    if (data.stop_reason === "max_tokens") {
      return { content: contentText, toolCalls: [], success: true, cutOff: true };
    }

    return { content: contentText, toolCalls, success: true };
  } catch (error) {
    console.error("Claude API call failed:", error);
    return {
      content: "",
      toolCalls: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// Main interface
// ============================================

/**
 * One request to the model: the system prompt (with the current design), the
 * conversation so far and the tools. Tool calls written as JSON in the text
 * (models without tool use) are read too.
 */
export async function requestAI(
  system: string,
  messages: Message[],
  tools: ToolSchemaLike[],
  config: AIConfiguration,
): Promise<AIResponse> {
  const response = isClaudeConfig(config)
    ? await callClaudeAPI(system, messages, tools, config)
    : await callOpenAICompatibleAPI(system, messages, tools, config);

  if (response.success && !response.cutOff && response.content && response.toolCalls.length === 0) {
    const textToolCalls = extractToolCallsFromText(response.content);
    if (textToolCalls.length > 0) {
      response.toolCalls = textToolCalls;
      response.toolCallsInText = true;
    }
  }
  return response;
}

export function createUserMessage(content: string, attachments?: ChatAttachment[]): Message {
  return { role: "user", content, ...(attachments?.length ? { attachments } : {}) };
}

export function createAssistantMessage(response: AIResponse): Message {
  return {
    role: "assistant",
    content: response.content,
    ...(response.toolCalls.length ? { toolCalls: response.toolCalls } : {}),
    ...(response.toolCallsInText ? { toolCallsInText: true } : {}),
  };
}

// A tool's result for the model (long results are cut)
const MAX_RESULT_LENGTH = 12000;

export function createToolResultMessage(call: MCPToolCall, result: { success: boolean; error?: string; data?: unknown }): Message {
  const body = result.success ? JSON.stringify(result.data ?? { ok: true }) : `Error: ${result.error ?? "failed"}`;
  return {
    role: "tool",
    toolCallId: call.id,
    content: body.length > MAX_RESULT_LENGTH ? `${body.slice(0, MAX_RESULT_LENGTH)}… (cut)` : body,
    ...(result.success ? {} : { isError: true }),
  };
}
