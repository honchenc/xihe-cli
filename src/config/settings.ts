/**
 * 配置管理模块
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ProviderCredential } from '../core/provider.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'xihe');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json');

export interface Settings {
  ui?: {
    language?: string;
    theme?: string;
  };
  provider?: {
    default?: string;
  };
  agent?: {
    defaultModel?: string;
  };
}

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 加载设置
 */
export function loadSettings(): Settings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return {};
}

/**
 * 保存设置
 */
export function saveSettings(settings: Settings): void {
  ensureConfigDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

/**
 * 加载凭据
 */
export function loadCredentials(): Record<string, ProviderCredential> {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const content = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to load credentials:', error);
  }
  return {};
}

/**
 * 保存凭据
 */
export function saveCredentials(credentials: Record<string, ProviderCredential>): void {
  ensureConfigDir();
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
}

/**
 * 获取指定服务商的凭据
 */
export function getCredential(providerId: string): ProviderCredential | null {
  const credentials = loadCredentials();
  return credentials[providerId] || null;
}

/**
 * 保存服务商凭据
 */
export function saveCredential(providerId: string, credential: ProviderCredential): void {
  const credentials = loadCredentials();
  credentials[providerId] = credential;
  saveCredentials(credentials);
}

/**
 * 删除服务商凭据
 */
export function deleteCredential(providerId: string): void {
  const credentials = loadCredentials();
  delete credentials[providerId];
  saveCredentials(credentials);
}
