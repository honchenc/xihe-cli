/**
 * 消息类型定义
 */

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: 'url' | 'base64';
  data: string;
  mimeType?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallContent {
  type: 'tool_call';
  toolCall: ToolCall;
}

export interface ToolResultContent {
  type: 'tool_result';
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

export type ContentPart = TextContent | ImageContent | ToolCallContent | ToolResultContent;

export interface Message {
  role: MessageRole;
  content: ContentPart[];
  name?: string;
  toolCallId?: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopSequences?: string[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'required' | 'none' | { name: string };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResponse {
  id: string;
  message: Message;
  usage: TokenUsage;
  model: string;
  finishReason: 'stop' | 'tool_call' | 'length' | 'content_filter' | 'error';
}

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'usage' | 'error' | 'done';
  delta?: string;
  toolCall?: Partial<ToolCall>;
  usage?: Partial<TokenUsage>;
  error?: string;
}

/**
 * 创建文本消息的辅助函数
 */
export function textMessage(role: MessageRole, text: string): Message {
  return {
    role,
    content: [{ type: 'text', text }],
  };
}

/**
 * 创建系统消息
 */
export function systemMessage(text: string): Message {
  return textMessage('system', text);
}

/**
 * 创建用户消息
 */
export function userMessage(text: string): Message {
  return textMessage('user', text);
}

/**
 * 创建助手消息
 */
export function assistantMessage(text: string): Message {
  return textMessage('assistant', text);
}
