#!/usr/bin/env node

import { program } from 'commander';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VERSION = '0.1.0';

program
  .name('xihe')
  .description('羲和 CLI - 羲和御日，温暖相伴')
  .version(VERSION);

program
  .argument('[prompt]', '直接发送提示词')
  .option('-m, --model <model>', '指定模型')
  .option('-p, --provider <provider>', '指定服务商')
  .action((prompt, options) => {
    // 启动交互式 UI
    const interactivePath = join(__dirname, 'interactive.js');
    const args = [];
    
    if (prompt) {
      args.push('--prompt', prompt);
    }
    if (options.model) {
      args.push('--model', options.model);
    }
    if (options.provider) {
      args.push('--provider', options.provider);
    }
    
    const child = spawn('node', [interactivePath, ...args], {
      stdio: 'inherit',
      shell: false,
    });
    
    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  });

program.parse();
