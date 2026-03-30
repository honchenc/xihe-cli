/**
 * 工具系统接口定义
 */

import type { ToolDefinition } from '../core/message.js';

/**
 * 工具执行结果
 */
export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  data?: unknown;
}

/**
 * 工具执行上下文
 */
export interface ToolContext {
  workingDirectory: string;
  abortSignal?: AbortSignal;
  onProgress?: (message: string) => void;
}

/**
 * 工具接口
 */
export interface Tool {
  /** 工具名称 */
  name: string;

  /** 工具描述 */
  description: string;

  /** 参数定义 */
  parameters: ToolDefinition['parameters'];

  /** 是否需要用户确认 */
  needsConfirmation?: boolean;

  /** 执行工具 */
  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
}

/**
 * 工具注册表
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取工具定义（用于 LLM function calling）
   */
  getDefinitions(): ToolDefinition[] {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
}

// 全局工具注册表
let globalRegistry: ToolRegistry | null = null;

/**
 * 获取全局工具注册表
 */
export function getToolRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry();
  }
  return globalRegistry;
}
