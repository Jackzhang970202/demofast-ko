/**
 * 日志服务层
 */

import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: any;
}

export const LogService = {
  /**
   * 获取日志列表
   */
  async getLogs(options?: {
    projectId?: string;
    type?: string;
    date?: string;
  }): Promise<{
    list: string[];
    total: number;
  }> {
    const { projectId } = options || {};
    const logsDir = projectId
      ? path.join(process.cwd(), 'data', 'logs', projectId)
      : path.join(process.cwd(), 'data', 'logs');

    if (!fs.existsSync(logsDir)) {
      return { list: [], total: 0 };
    }

    const files = fs.readdirSync(logsDir)
      .filter((f) => f.endsWith('.log') || f.endsWith('.txt'))
      .sort((a, b) => b.localeCompare(a));

    return { list: files, total: files.length };
  },

  /**
   * 获取日志内容
   */
  async getLogContent(projectId: string, filename: string): Promise<string | null> {
    const logPath = path.join(process.cwd(), 'data', 'logs', projectId, filename);

    if (!fs.existsSync(logPath)) {
      return null;
    }

    return fs.readFileSync(logPath, 'utf-8');
  },

  /**
   * 获取最近的日志
   */
  async getRecentLogs(projectId: string, limit: number = 100): Promise<string[]> {
    const logsDir = path.join(process.cwd(), 'data', 'logs', projectId);

    if (!fs.existsSync(logsDir)) {
      return [];
    }

    const files = fs.readdirSync(logsDir)
      .filter((f) => f.endsWith('.log') || f.endsWith('.txt'))
      .sort((a, b) => b.localeCompare(a));

    const logs: string[] = [];
    for (const file of files.slice(0, 5)) {
      const content = fs.readFileSync(path.join(logsDir, file), 'utf-8');
      const lines = content.split('\n').slice(0, limit);
      logs.push(...lines);
      if (logs.length >= limit) break;
    }

    return logs.slice(0, limit);
  },
};