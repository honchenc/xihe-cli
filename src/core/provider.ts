/**
 * LLM Provider 抽象接口
 */

import type {
  Message,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  TokenUsage,
} from './message.js';

/**
 * 模型定义
 */
export interface ModelDefinition {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens?: number;
  supports?: {
    vision?: boolean;
    tools?: boolean;
    streaming?: boolean;
  };
  pricing?: {
    inputPer1k: number;
    outputPer1k: number;
  };
}

/**
 * Provider 凭据
 */
export interface ProviderCredential {
  providerId: string;
  apiKey?: string;
  baseUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  customHeaders?: Record<string, string>;
}

/**
 * LLM Provider 接口
 */
export interface LLMProvider {
  /** 服务商标识 */
  readonly id: string;

  /** 显示名称 */
  readonly name: string;

  /** 支持的模型列表 */
  readonly models: ModelDefinition[];

  /**
   * 发送聊天请求
   */
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * 发送流式聊天请求
   */
  chatStream(
    messages: Message[],
    options: ChatOptions,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<ChatResponse>;

  /**
   * 计算 Token 数量
   */
  countTokens(messages: Message[]): Promise<number>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<boolean>;

  /**
   * 获取当前使用的模型
   */
  getCurrentModel(): string;

  /**
   * 设置使用的模型
   */
  setModel(modelId: string): void;
}

/**
 * Provider 配置
 */
export interface ProviderConfig {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  defaultModel: string;
  models: ModelDefinition[];
}

/**
 * Provider 工厂函数类型
 */
export type ProviderFactory = (credential: ProviderCredential, config: ProviderConfig) => LLMProvider;
