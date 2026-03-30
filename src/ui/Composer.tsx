import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

interface ComposerProps {
  onSubmit: (input: string) => void;
}

export function Composer({ onSubmit }: ComposerProps) {
  const [input, setInput] = useState('');

  useInput(
    (char, key) => {
      if (key.return) {
        if (input.trim()) {
          onSubmit(input.trim());
          setInput('');
        }
      } else if (key.backspace || key.delete) {
        setInput((prev) => prev.slice(0, -1));
      } else if (!key.ctrl && !key.meta && char) {
        setInput((prev) => prev + char);
      }
    },
    { isActive: true }
  );

  return (
    <Box>
      <Text bold color="cyan">
        {'> '}
      </Text>
      <Text>{input}</Text>
      <Text dimColor>█</Text>
    </Box>
  );
}
