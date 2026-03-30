import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Composer } from './Composer.js';

interface AppProps {
  initialPrompt?: string;
  initialModel?: string;
  initialProvider?: string;
}

export function App({ initialPrompt, initialModel, initialProvider }: AppProps) {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 检查是否支持 raw mode
    if (!process.stdin.isTTY) {
      console.error('错误: 请在终端中运行此命令');
      process.exit(1);
    }
    setIsReady(true);
  }, []);

  const handleSubmit = async (input: string) => {
    if (!input.trim()) return;

    // 添加用户消息
    setMessages((prev) => [...prev, { role: 'user', content: input }]);

    // TODO: 调用 LLM Provider
    // 临时响应
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: `收到: ${input}` },
    ]);
  };

  if (!isReady) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">加载中...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* 标题 */}
      <Box marginBottom={1}>
        <Text bold color="yellow">
          羲和 CLI v0.1.0
        </Text>
        <Text dimColor> - 羲和御日，温暖相伴</Text>
      </Box>

      {/* 消息列表 */}
      {messages.map((msg, idx) => (
        <Box key={idx} marginBottom={1}>
          <Text
            bold
            color={msg.role === 'user' ? 'cyan' : 'green'}
          >
            {msg.role === 'user' ? '你' : '羲和'}:{' '}
          </Text>
          <Text>{msg.content}</Text>
        </Box>
      ))}

      {/* 输入框 */}
      <Composer onSubmit={handleSubmit} />

      {/* 底部提示 */}
      <Box marginTop={1}>
        <Text dimColor>
          按 Ctrl+C 退出 | 输入 /help 查看帮助
        </Text>
      </Box>
    </Box>
  );
}
