/**
 * 日志查询 Server Queries
 * 供 Server Components 调用
 */

'use server';

import { LogService } from '@/server/services/log.service';

/**
 * 获取日志列表
 */
export async function getLogsQuery(options?: {
  projectId?: string;
  type?: string;
  date?: string;
}) {
  return LogService.getLogs(options);
}

/**
 * 获取日志内容
 */
export async function getLogContentQuery(projectId: string, filename: string) {
  return LogService.getLogContent(projectId, filename);
}

/**
 * 获取最近的日志
 */
export async function getRecentLogsQuery(projectId: string, limit?: number) {
  return LogService.getRecentLogs(projectId, limit);
}