/**
 * 项目相关类型定义
 */

// 项目状态
export type ProjectStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'clarifying';

export type ProjectType = 'ruoyi-vue-pg' | 'frontend-demo';
export type RuntimeKind = 'ruoyi-vue-pg' | 'frontend-demo';

// 项目
export interface Project {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  requirement?: string;
  status: ProjectStatus;
  projectType?: ProjectType;
  templateId?: string;
  runtimeKind?: RuntimeKind;
  createdAt: string;
  updatedAt: string;
}

// 项目文件
export interface ProjectFile {
  id: number;
  projectId: string;
  path: string;
  name: string;
  language: string;
  content: string;
  createdAt: string;
}

// 项目列表查询参数
export interface ProjectListOptions {
  page?: number;
  pageSize?: number;
  status?: ProjectStatus;
  userId?: string;
  projectType?: ProjectType;
}

// 项目列表结果
export interface ProjectListResult {
  list: Project[];
  total: number;
  page: number;
  pageSize: number;
}