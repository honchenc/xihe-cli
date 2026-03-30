/**
 * iFlow Provider 实现
 */

import crypto from 'crypto';
import type {
  Message,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  TokenUsage,
  ToolCall,
} from './message.js';
import type {
  LLMProvider,
  ModelDefinition,
  ProviderCredential,
  ProviderConfig,
} from './provider.js';

/**
 * iFlow OAuth 配置
 */
export const IFLOW_OAUTH_CONFIG = {
  authorizationUrl: 'https://iflow.cn/oauth',
  tokenUrl: 'https://iflow.cn/oauth/token',
  userInfoUrl: 'https://iflow.cn/api/oauth/getUserInfo',
  successUrl: 'https://iflow.cn/oauth/success',
  errorUrl: 'https://iflow.cn/oauth/error',
  clientId: '10009311001',
  clientSecret: '4Z3YjXycVsQvyGF1etiNlIBB4RsqSDtW',
  callbackPath: '/oauth2callback',
};

/**
 * iFlow 默认模型列表
 */
const IFLOW_DEFAULT_MODELS: ModelDefinition[] = [
  {
    id: 'glm-5',
    name: 'GLM-5',
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supports: { vision: true, tools: true, streaming: true },
  },
  {
    id: 'glm-5-flash',
    name: 'GLM-5 Flash',
    contextWindow: 64000,
    maxOutputTokens: 8192,
    supports: { tools: true, streaming: true },
  },
  {
    id: 'deepseek-v3.2-chat',
    name: 'DeepSeek V3.2',
    contextWindow: 64000,
    maxOutputTokens: 8192,
    supports: { tools: true, streaming: true },
  },
];

/**
 * iFlow Provider 实现
 */
export class IFlowProvider implements LLMProvider {
  readonly id = 'iflow';
  readonly name = '心流 (iFlow)';
  readonly models: ModelDefinition[];

  private credential: ProviderCredential;
  private config: ProviderConfig;
  private currentModel: string;
  private sessionId: string;
  private baseUrl: string;

  constructor(credential: ProviderCredential, config: ProviderConfig) {
    this.credential = credential;
    this.config = config;
    this.models = config.models || IFLOW_DEFAULT_MODELS;
    this.currentModel = config.defaultModel || 'glm-5';
    this.sessionId = crypto.randomUUID();
    this.baseUrl = credential.baseUrl || config.baseUrl || 'https://apis.iflow.cn/v1';
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setModel(modelId: string): void {
    this.currentModel = modelId;
  }

  /**
   * 生成 iFlow HMAC-SHA256 签名
   */
  private generateSignature(timestamp: number): string | null {
    const apiKey = this.credential.apiKey;
    if (!apiKey) return null;

    const userAgent = 'iFlow-Cli';
    const content = `${userAgent}:${this.sessionId}:${timestamp}`;
    return crypto
      .createHmac('sha256', apiKey)
      .update(content, 'utf8')
      .digest('hex');
  }

  /**
   * 构建请求头
   */
  private buildHeaders(): Record<string, string> {
    const timestamp = Date.now();
    const userAgent = 'iFlow-Cli';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': userAgent,
    };

    // 使用 API Key 认证
    if (this.credential.apiKey) {
      headers['Authorization'] = `Bearer ${this.credential.apiKey}`;
    }

    // 添加 iFlow 特定签名
    const signature = this.generateSignature(timestamp);
    if (signature) {
      headers['x-iflow-signature'] = signature;
      headers['x-iflow-timestamp'] = timestamp.toString();
    }

    // 添加 session-id
    headers['session-id'] = this.sessionId;

    return headers;
  }

  /**
   * 转换消息格式为 OpenAI 兼容格式
   */
  private convertMessages(messages: Message[]): Array<{ role: string; content: string }> {
    return messages.map((msg) => {
      const textContent = msg.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as { text: string }).text)
        .join('\n');

      return {
        role: msg.role,
        content: textContent,
      };
    });
  }

  /**
   * 发送聊天请求
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const model = options?.model || this.currentModel;
    const headers = this.buildHeaders();
    const openaiMessages = this.convertMessages(messages);

    const body: Record<string, unknown> = {
      model,
      messages: openaiMessages,
      stream: false,
    };

    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }
    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`iFlow API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      id: string;
      choices: Array<{
        message: {
          role: string;
          content: string;
          tool_calls?: Array<{
            id: string;
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason: string;
      }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
      model: string;
    };

    const choice = data.choices[0];
    const content: Array<{ type: 'text'; text: string } | { type: 'tool_call'; toolCall: ToolCall }> = [];

    if (choice.message.content) {
      content.push({ type: 'text', text: choice.message.content });
    }

    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        content.push({
          type: 'tool_call',
          toolCall: {
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          },
        });
      }
    }

    return {
      id: data.id,
      message: {
        role: 'assistant',
        content,
      },
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      model: data.model,
      finishReason: choice.finish_reason as ChatResponse['finishReason'],
    };
  }

  /**
   * 发送流式聊天请求
   */
  async chatStream(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatResponse> {
    const model = options.model || this.currentModel;
    const headers = this.buildHeaders();
    const openaiMessages = this.convertMessages(messages);

    const body: Record<string, unknown> = {
      model,
      messages: openaiMessages,
      stream: true,
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`iFlow API error: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let usage: TokenUsage | undefined;
    let id = '';
    let finishReason = 'stop';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            onChunk({ type: 'done' });
            continue;
          }

          try {
            const parsed = JSON.parse(data) as {
              id: string;
              choices: Array<{
                delta: {
                  content?: string;
                  role?: string;
                };
                finish_reason: string | null;
              }>;
              usage?: {
                prompt_tokens: number;
                completion_tokens: number;
                total_tokens: number;
              };
            };

            id = parsed.id || id;
            const delta = parsed.choices[0]?.delta;
            finishReason = parsed.choices[0]?.finish_reason || finishReason;

            if (delta?.content) {
              fullContent += delta.content;
              onChunk({ type: 'content', delta: delta.content });
            }

            if (parsed.usage) {
              usage = {
                promptTokens: parsed.usage.prompt_tokens,
                completionTokens: parsed.usage.completion_tokens,
                totalTokens: parsed.usage.total_tokens,
              };
              onChunk({ type: 'usage', usage });
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      id,
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: fullContent }],
      },
      usage: usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model,
      finishReason: finishReason as ChatResponse['finishReason'],
    };
  }

  /**
   * 计算 Token 数量（估算）
   */
  async countTokens(messages: Message[]): Promise<number> {
    // 简单估算：平均每 4 个字符约 1 个 token
    let totalChars = 0;
    for (const msg of messages) {
      for (const part of msg.content) {
        if (part.type === 'text') {
          totalChars += part.text.length;
        }
      }
    }
    return Math.ceil(totalChars / 4);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.buildHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}