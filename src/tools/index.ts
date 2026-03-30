/**
 * 工具系统导出
 */

export * from './types.js';
export * from './file.js';
export * from './shell.js';

import { getToolRegistry } from './types.js';
import { readFileTool, writeFileTool, editFileTool, listDirectoryTool } from './file.js';
import { shellExecTool, grepTool } from './shell.js';

/**
 * 注册所有内置工具
 */
export function registerBuiltinTools(): void {
  const registry = getToolRegistry();

  // 文件工具
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(editFileTool);
  registry.register(listDirectoryTool);

  // Shell 工具
  registry.register(shellExecTool);
  registry.register(grepTool);
}

// 自动注册内置工具
registerBuiltinTools();
