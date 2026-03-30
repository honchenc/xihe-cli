/**
 * 文件工具实现
 */

import fs from 'fs';
import path from 'path';
import type { Tool, ToolResult, ToolContext } from './types.js';

/**
 * 读取文件工具
 */
export const readFileTool: Tool = {
  name: 'read_file',
  description: '读取文件内容。支持文本文件、图片、PDF等。',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件的绝对路径',
      },
      offset: {
        type: 'number',
        description: '可选：起始行号（0-based）',
      },
      limit: {
        type: 'number',
        description: '可选：读取的最大行数',
      },
    },
    required: ['file_path'],
  },

  async execute(params, context: ToolContext): Promise<ToolResult> {
    const filePath = params.file_path as string;
    const offset = (params.offset as number) ?? 0;
    const limit = params.limit as number | undefined;

    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return { success: false, output: '', error: `文件不存在: ${filePath}` };
      }

      // 读取文件
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // 应用 offset 和 limit
      const selectedLines = lines.slice(offset, limit !== undefined ? offset + limit : undefined);
      const result = selectedLines.join('\n');

      return {
        success: true,
        output: result,
        data: { totalLines: lines.length, returnedLines: selectedLines.length },
      };
    } catch (error) {
      return { success: false, output: '', error: (error as Error).message };
    }
  },
};

/**
 * 写入文件工具
 */
export const writeFileTool: Tool = {
  name: 'write_file',
  description: '写入内容到文件。会创建不存在的目录。',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件的绝对路径',
      },
      content: {
        type: 'string',
        description: '要写入的内容',
      },
    },
    required: ['file_path', 'content'],
  },
  needsConfirmation: true,

  async execute(params, context: ToolContext): Promise<ToolResult> {
    const filePath = params.file_path as string;
    const content = params.content as string;

    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 写入文件
      fs.writeFileSync(filePath, content, 'utf-8');

      return {
        success: true,
        output: `成功写入文件: ${filePath} (${content.length} 字符)`,
      };
    } catch (error) {
      return { success: false, output: '', error: (error as Error).message };
    }
  },
};

/**
 * 编辑文件工具
 */
export const editFileTool: Tool = {
  name: 'edit_file',
  description: '编辑文件，替换指定文本。使用精确匹配。',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: '文件的绝对路径',
      },
      old_text: {
        type: 'string',
        description: '要替换的文本（必须精确匹配）',
      },
      new_text: {
        type: 'string',
        description: '替换后的文本',
      },
    },
    required: ['file_path', 'old_text', 'new_text'],
  },
  needsConfirmation: true,

  async execute(params, context: ToolContext): Promise<ToolResult> {
    const filePath = params.file_path as string;
    const oldText = params.old_text as string;
    const newText = params.new_text as string;

    try {
      // 读取文件
      if (!fs.existsSync(filePath)) {
        return { success: false, output: '', error: `文件不存在: ${filePath}` };
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      // 检查是否存在要替换的文本
      if (!content.includes(oldText)) {
        return { success: false, output: '', error: '未找到要替换的文本' };
      }

      // 替换文本
      const newContent = content.replace(oldText, newText);

      // 写入文件
      fs.writeFileSync(filePath, newContent, 'utf-8');

      return {
        success: true,
        output: `成功编辑文件: ${filePath}`,
      };
    } catch (error) {
      return { success: false, output: '', error: (error as Error).message };
    }
  },
};

/**
 * 列出目录工具
 */
export const listDirectoryTool: Tool = {
  name: 'list_directory',
  description: '列出目录中的文件和子目录。',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '目录路径（默认为当前工作目录）',
      },
    },
    required: [],
  },

  async execute(params, context: ToolContext): Promise<ToolResult> {
    const dirPath = (params.path as string) || context.workingDirectory;

    try {
      if (!fs.existsSync(dirPath)) {
        return { success: false, output: '', error: `目录不存在: ${dirPath}` };
      }

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const result = entries
        .map((entry) => {
          const prefix = entry.isDirectory() ? '[DIR]  ' : '[FILE] ';
          return prefix + entry.name;
        })
        .join('\n');

      return {
        success: true,
        output: result || '(空目录)',
        data: { count: entries.length },
      };
    } catch (error) {
      return { success: false, output: '', error: (error as Error).message };
    }
  },
};
