#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { App } from './ui/App.js';

// 解析命令行参数
const args = process.argv.slice(2);
let initialPrompt = '';
let initialModel = '';
let initialProvider = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--prompt' && args[i + 1]) {
    initialPrompt = args[i + 1];
    i++;
  } else if (args[i] === '--model' && args[i + 1]) {
    initialModel = args[i + 1];
    i++;
  } else if (args[i] === '--provider' && args[i + 1]) {
    initialProvider = args[i + 1];
    i++;
  }
}

// 渲染 UI
render(
  <App
    initialPrompt={initialPrompt}
    initialModel={initialModel}
    initialProvider={initialProvider}
  />
);
