/**
 * 项目查询 Server Queries
 * 供 Server Components 调用
 */

'use server';

import { ProjectService } from '@/server/services/project.service';
import type { ProjectListOptions } from '@/types';

/**
 * 获取项目列表
 */
export async function getProjectsQuery(options?: ProjectListOptions) {
  return ProjectService.list(options);
}

/**
 * 获取项目详情
 */
export async function getProjectQuery(id: string) {
  return ProjectService.getById(id);
}

/**
 * 获取项目文件
 */
export async function getProjectFilesQuery(projectId: string) {
  return ProjectService.getFiles(projectId);
}