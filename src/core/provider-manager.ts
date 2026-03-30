/**
 * Provider 管理模块
 */

import type { LLMProvider, ProviderCredential, ProviderConfig } from '../core/provider.js';
import { IFlowProvider } from '../core/iflow.js';
import { getCredential, saveCredential, loadSettings } from '../config/settings.js';
import { startIFlowOAuthLogin } from '../core/oauth.js';

/**
 * 内置服务商配置
 */
const BUILTIN_PROVIDERS: Record<string, ProviderConfig> = {
  iflow: {
    id: 'iflow',
    name: '心流 (iFlow)',
    type: 'openai-compatible',
    baseUrl: 'https://apis.iflow.cn/v1',
    defaultModel: 'glm-5',
    models: [
      { id: 'glm-5', name: 'GLM-5', contextWindow: 128000, maxOutputTokens: 16384 },
      { id: 'glm-5-flash', name: 'GLM-5 Flash', contextWindow: 64000, maxOutputTokens: 8192 },
      { id: 'deepseek-v3.2-chat', name: 'DeepSeek V3.2', contextWindow: 64000, maxOutputTokens: 8192 },
    ],
  },
};

/**
 * 当前 Provider 实例
 */
let currentProvider: LLMProvider | null = null;

/**
 * 获取当前 Provider
 */
export function getCurrentProvider(): LLMProvider | null {
  return currentProvider;
}

/**
 * 创建 Provider 实例
 */
export function createProvider(providerId: string, credential: ProviderCredential): LLMProvider {
  const config = BUILTIN_PROVIDERS[providerId];
  if (!config) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  switch (providerId) {
    case 'iflow':
      return new IFlowProvider(credential, config);
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

/**
 * 初始化 Provider（使用已保存的凭据）
 */
export function initializeProvider(providerId?: string): LLMProvider | null {
  const settings = loadSettings();
  const targetProvider = providerId || settings.provider?.default || 'iflow';

  const credential = getCredential(targetProvider);
  if (!credential || !credential.apiKey) {
    return null;
  }

  currentProvider = createProvider(targetProvider, credential);
  return currentProvider;
}

/**
 * 执行 iFlow OAuth 登录
 */
export async function loginWithIFlow(): Promise<LLMProvider> {
  console.log('正在启动 iFlow OAuth 登录...');

  const result = await startIFlowOAuthLogin();

  if (!result.apiKey) {
    throw new Error('Login successful but no API key received');
  }

  // 保存凭据
  const credential: ProviderCredential = {
    providerId: 'iflow',
    apiKey: result.apiKey,
  };

  saveCredential('iflow', credential);

  // 创建 Provider 实例
  currentProvider = createProvider('iflow', credential);

  console.log('登录成功！');

  return currentProvider;
}

/**
 * 设置 API Key（直接输入方式）
 */
export function setApiKey(providerId: string, apiKey: string): LLMProvider {
  const credential: ProviderCredential = {
    providerId,
    apiKey,
  };

  saveCredential(providerId, credential);
  currentProvider = createProvider(providerId, credential);

  return currentProvider;
}

/**
 * 获取可用的服务商列表
 */
export function getAvailableProviders(): Array<{ id: string; name: string; hasCredential: boolean }> {
  return Object.entries(BUILTIN_PROVIDERS).map(([id, config]) => ({
    id,
    name: config.name,
    hasCredential: !!getCredential(id),
  }));
}

/**
 * 获取服务商配置
 */
export function getProviderConfig(providerId: string): ProviderConfig | null {
  return BUILTIN_PROVIDERS[providerId] || null;
}