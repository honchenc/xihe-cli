import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { Composer } from './Composer.js';
import type { LLMProvider } from '../core/provider.js';
import type { Message } from '../core/message.js';
import { userMessage, assistantMessage } from '../core/message.js';
import { loginWithIFlow, setApiKey } from '../core/provider-manager.js';

interface AppProps {
  initialPrompt?: string;
  initialModel?: string;
  initialProvider?: string;
  provider?: LLMProvider | null;
}

type AppState = 'loading' | 'login' | 'ready' | 'thinking' | 'error';

export function App({ initialPrompt, initialModel, initialProvider, provider: initialProviderInstance }: AppProps) {
  const [state, setState] = useState<AppState>(initialProviderInstance ? 'ready' : 'login');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [provider, setProvider] = useState<LLMProvider | null>(initialProviderInstance || null);
  const [error, setError] = useState<string>('');
  const [inputBuffer, setInputBuffer] = useState('');

  // 处理登录
  const handleLogin = useCallback(async (type: 'oauth' | 'apikey', apiKey?: string) => {
    setState('loading');
    setError('');

    try {
      if (type === 'oauth') {
        const p = await loginWithIFlow();
        setProvider(p);
      } else if (apiKey) {
        const p = setApiKey('iflow', apiKey);
        setProvider(p);
      }
      setState('ready');
    } catch (err) {
      setError((err as Error).message);
      setState('error');
    }
  }, []);

  // 发送消息
  const handleSubmit = useCallback(async (input: string) => {
    if (!input.trim() || !provider) return;

    // 添加用户消息
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setState('thinking');

    try {
      // 构建消息历史
      const chatMessages: Message[] = [
        ...messages.map((m) => (m.role === 'user' ? userMessage(m.content) : assistantMessage(m.content))),
        userMessage(input),
      ];

      // 调用 API
      const response = await provider.chat(chatMessages);

      // 提取文本响应
      const textContent = response.message.content
        .filter((c) => c.type === 'text')
        .map((c) => (c as { text: string }).text)
        .join('\n');

      setMessages((prev) => [...prev, { role: 'assistant', content: textContent }]);
      setState('ready');
    } catch (err) {
      setError((err as Error).message);
      setState('error');
    }
  }, [provider, messages]);

  // 处理输入
  const handleInput = useCallback((char: string, key: { return?: boolean; backspace?: boolean; delete?: boolean; ctrl?: boolean; meta?: boolean }) => {
    if (key.ctrl && char === 'c') {
      process.exit(0);
      return;
    }

    if (state === 'login') {
      if (key.return) {
        if (inputBuffer === 'oauth' || inputBuffer === 'o') {
          handleLogin('oauth');
        } else if (inputBuffer.startsWith('key:')) {
          handleLogin('apikey', inputBuffer.slice(4).trim());
        }
        setInputBuffer('');
      } else if (key.backspace || key.delete) {
        setInputBuffer((prev) => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && char) {
        setInputBuffer((prev) => prev + char);
      }
    } else if (state === 'ready' || state === 'error') {
      if (key.return && inputBuffer.trim()) {
        handleSubmit(inputBuffer.trim());
        setInputBuffer('');
      } else if (key.backspace || key.delete) {
        setInputBuffer((prev) => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && char) {
        setInputBuffer((prev) => prev + char);
      }
    }
  }, [state, inputBuffer, handleLogin, handleSubmit]);

  // 渲染登录界面
  if (state === 'login') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="yellow">
          羲和 CLI v0.1.0
        </Text>
        <Text dimColor> - 羲和御日，温暖相伴</Text>
        <Box marginTop={1}>
          <Text>请选择登录方式：</Text>
        </Box>
        <Box>
          <Text>  1. 输入 </Text>
          <Text color="cyan">oauth</Text>
          <Text> 或 </Text>
          <Text color="cyan">o</Text>
          <Text> - OAuth 登录（推荐）</Text>
        </Box>
        <Box>
          <Text>  2. 输入 </Text>
          <Text color="cyan">key:你的API密钥</Text>
          <Text> - 使用 API Key</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="cyan">&gt; </Text>
          <Text>{inputBuffer}</Text>
          <Text dimColor>█</Text>
        </Box>
      </Box>
    );
  }

  // 渲染加载状态
  if (state === 'loading') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">加载中...</Text>
      </Box>
    );
  }

  // 渲染主界面
  return (
    <Box flexDirection="column" padding={1}>
      {/* 标题 */}
      <Box marginBottom={1}>
        <Text bold color="yellow">
          羲和 CLI v0.1.0
        </Text>
        <Text dimColor> - 模型: {provider?.getCurrentModel() || '未知'}</Text>
      </Box>

      {/* 错误提示 */}
      {state === 'error' && (
        <Box marginBottom={1}>
          <Text color="red">错误: {error}</Text>
        </Box>
      )}

      {/* 消息列表 */}
      {messages.map((msg, idx) => (
        <Box key={idx} marginBottom={1} flexDirection="column">
          <Text bold color={msg.role === 'user' ? 'cyan' : 'green'}>
            {msg.role === 'user' ? '你' : '羲和'}:
          </Text>
          <Text>  {msg.content}</Text>
        </Box>
      ))}

      {/* 思考中 */}
      {state === 'thinking' && (
        <Box marginBottom={1}>
          <Text color="yellow">思考中...</Text>
        </Box>
      )}

      {/* 输入框 */}
      {state !== 'thinking' && (
        <Box>
          <Text bold color="cyan">
            {'> '}
          </Text>
          <Text>{inputBuffer}</Text>
          <Text dimColor>█</Text>
        </Box>
      )}

      {/* 底部提示 */}
      <Box marginTop={1}>
        <Text dimColor>
          Ctrl+C 退出 | /help 帮助
        </Text>
      </Box>
    </Box>
  );
}