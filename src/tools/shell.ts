/**
 * Shell 工具实现
 */

import { spawn } from 'child_process';
import type { Tool, ToolResult, ToolContext } from './types.js';

/**
 * 执行 Shell 命令工具
 */
export const shellExecTool: Tool = {
  name: 'shell_exec',
  description: '执行 Shell 命令。注意：危险操作需要用户确认。',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: '要执行的命令',
      },
      timeout: {
        type: 'number',
        description: '超时时间（秒），默认 60 秒',
      },
    },
    required: ['command'],
  },
  needsConfirmation: true,

  async execute(params, context: ToolContext): Promise<ToolResult> {
    const command = params.command as string;
    const timeout = ((params.timeout as number) ?? 60) * 1000;

    // 检查危险命令
    const dangerousCommands = ['rm -rf', 'rm -r', 'rm -rf /', 'mkfs', 'dd if=', ':(){:|:&};:', 'chmod -R 777'];
    const isDangerous = dangerousCommands.some((dc) => command.includes(dc));

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const proc = spawn('sh', ['-c', command], {
        cwd: context.workingDirectory,
        signal: context.abortSignal,
      });

      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        resolve({
          success: false,
          output: '',
          error: `命令执行超时 (${timeout / 1000}秒)`,
        });
      }, timeout);

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        if (context.onProgress) {
          context.onProgress(data.toString());
        }
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          success: code === 0,
          output: stdout || '(无输出)',
          error: stderr || undefined,
          data: { exitCode: code, isDangerous },
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          output: '',
          error: err.message,
        });
      });
    });
  },
};

/**
 * 搜索文件内容工具
 */
export const grepTool: Tool = {
  name: 'grep',
  description: '在文件中搜索匹配正则表达式的内容。',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: '正则表达式模式',
      },
      path: {
        type: 'string',
        description: '搜索路径（文件或目录）',
      },
      case_sensitive: {
        type: 'boolean',
        description: '是否区分大小写，默认 false',
      },
    },
    required: ['pattern', 'path'],
  },

  async execute(params, context: ToolContext): Promise<ToolResult> {
    const pattern = params.pattern as string;
    const searchPath = params.path as string;
    const caseSensitive = (params.case_sensitive as boolean) ?? false;

    try {
      const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
      const fs = await import('fs');
      const path = await import('path');

      const results: string[] = [];

      const searchFile = (filePath: string) => {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const lines = content.split('\n');

          lines.forEach((line, idx) => {
            if (regex.test(line)) {
              results.push(`${filePath}:${idx + 1}: ${line.trim()}`);
            }
          });
        } catch {
          // 忽略无法读取的文件
        }
      };

      const searchDir = (dirPath: string) => {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            // 跳过 node_modules 和隐藏目录
            if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
              searchDir(fullPath);
            }
          } else if (entry.isFile()) {
            searchFile(fullPath);
          }
        }
      };

      if (fs.statSync(searchPath).isDirectory()) {
        searchDir(searchPath);
      } else {
        searchFile(searchPath);
      }

      return {
        success: true,
        output: results.slice(0, 100).join('\n') || '(未找到匹配)',
        data: { matches: results.length },
      };
    } catch (error) {
      return { success: false, output: '', error: (error as Error).message };
    }
  },
};
