/**
 * 对话同步服务
 * 监听 Claudeck 对话修改，同步到项目目录
 */

import fs from 'fs';
import path from 'path';
import type { ClaudeckMessage, ClaudeckToolMessage } from '@/types/claudeck';

export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  timestamp: string;
}

export interface ChatSyncOptions {
  projectId: string;
  onFileChange?: (change: FileChange) => void;
}

export const ChatSyncService = {
  /** 文件变更记录 */
  fileChanges: new Map<string, FileChange[]>(),

  /**
   * 处理 Claudeck 消息，提取文件变更
   */
  processMessage(projectId: string, message: ClaudeckMessage): FileChange | null {
    // 只处理工具调用消息
    if (message.type !== 'tool') {
      return null;
    }

    const toolMsg = message as ClaudeckToolMessage;
    const toolName = toolMsg.name;

    // 文件写入工具
    if (toolName === 'Write' || toolName === 'Edit') {
      const filePath = toolMsg.input?.file_path || toolMsg.input?.path;
      if (filePath) {
        const change: FileChange = {
          path: filePath,
          action: toolName === 'Write' ? 'create' : 'modify',
          timestamp: new Date().toISOString(),
        };
        this.recordChange(projectId, change);
        return change;
      }
    }

    // 文件删除工具
    if (toolName === 'Bash') {
      const command = toolMsg.input?.command || '';
      // 检测 rm 命令
      if (command.includes('rm ') || command.includes('Remove-Item')) {
        const match = command.match(/rm\s+['"]?([^'"\s]+)['"]?/);
        if (match) {
          const change: FileChange = {
            path: match[1],
            action: 'delete',
            timestamp: new Date().toISOString(),
          };
          this.recordChange(projectId, change);
          return change;
        }
      }
    }

    return null;
  },

  /**
   * 记录文件变更
   */
  recordChange(projectId: string, change: FileChange): void {
    if (!this.fileChanges.has(projectId)) {
      this.fileChanges.set(projectId, []);
    }
    this.fileChanges.get(projectId)!.push(change);
  },

  /**
   * 获取项目的文件变更历史
   */
  getChanges(projectId: string): FileChange[] {
    return this.fileChanges.get(projectId) || [];
  },

  /**
   * 清除项目的文件变更历史
   */
  clearChanges(projectId: string): void {
    this.fileChanges.delete(projectId);
  },

  /**
   * 获取项目目录路径
   */
  getProjectDir(projectId: string): string {
    return path.join(process.cwd(), 'data', 'projects', projectId, 'generated');
  },

  /**
   * 检查文件是否存在
   */
  fileExists(projectId: string, relativePath: string): boolean {
    const fullPath = path.join(this.getProjectDir(projectId), relativePath);
    return fs.existsSync(fullPath);
  },

  /**
   * 读取文件内容
   */
  readFile(projectId: string, relativePath: string): string | null {
    const fullPath = path.join(this.getProjectDir(projectId), relativePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return fs.readFileSync(fullPath, 'utf-8');
  },

  /**
   * 扫描项目目录，获取所有文件
   */
  scanProject(projectId: string): string[] {
    const projectDir = this.getProjectDir(projectId);
    if (!fs.existsSync(projectDir)) {
      return [];
    }

    const files: string[] = [];
    const scan = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            scan(fullPath);
          }
        } else if (entry.isFile()) {
          files.push(path.relative(projectDir, fullPath));
        }
      }
    };

    scan(projectDir);
    return files;
  },

  /**
   * 同步文件树状态
   */
  async syncFileTree(projectId: string): Promise<string[]> {
    const files = this.scanProject(projectId);
    // 可以在这里触发其他操作，如通知前端更新
    return files;
  },
};