/**
 * 项目管理服务层
 * 封装项目 CRUD 操作
 */

import { queryAll, queryOne, insert, update, remove } from '@/lib/db';
import type { Project, ProjectFile, ProjectListOptions, ProjectListResult, UserRole } from '@/types';

interface AccessUser {
  id: string;
  role: UserRole;
}

export const ProjectService = {
  /**
   * 获取项目列表
   */
  async list(options?: ProjectListOptions): Promise<ProjectListResult> {
    const { page = 1, pageSize = 10, status, userId } = options || {};
    let projects = queryAll('projects') as Project[];

    // 筛选
    if (status) {
      projects = projects.filter((p) => p.status === status);
    }
    if (userId) {
      projects = projects.filter((p) => p.userId === userId);
    }

    // 排序（最新在前）
    projects.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = projects.length;
    const start = (page - 1) * pageSize;
    const list = projects.slice(start, start + pageSize);

    return { list, total, page, pageSize };
  },

  canAccessProject(project: Project, user: AccessUser): boolean {
    if (user.role === 'admin') {
      return true;
    }

    if (project.userId) {
      return project.userId === user.id;
    }

    return false;
  },

  async getAccessibleProjectById(id: string, user: AccessUser): Promise<Project | null> {
    const project = queryOne('projects', (p: Project) => p.id === id) as Project | undefined;
    if (!project) {
      return null;
    }

    return this.canAccessProject(project, user) ? project : null;
  },

  /**
   * 获取项目详情
   */
  async getById(id: string): Promise<(Project & { files: ProjectFile[] }) | null> {
    const project = queryOne('projects', (p: Project) => p.id === id) as Project | undefined;
    if (!project) return null;

    const files = queryAll('projectFiles').filter(
      (f: ProjectFile) => f.projectId === id
    );

    return { ...project, files };
  },

  async getByIdForUser(id: string, user: AccessUser): Promise<(Project & { files: ProjectFile[] }) | null> {
    const project = await this.getAccessibleProjectById(id, user);
    if (!project) {
      return null;
    }

    const files = queryAll('projectFiles').filter(
      (f: ProjectFile) => f.projectId === id
    );

    return { ...project, files };
  },

  /**
   * 创建项目
   */
  async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    return insert('projects', data);
  },

  /**
   * 更新项目状态
   */
  async updateStatus(id: string, status: Project['status']): Promise<boolean> {
    return update('projects', (p: Project) => p.id === id, { status });
  },

  /**
   * 更新项目
   */
  async update(id: string, data: Partial<Project>): Promise<boolean> {
    return update('projects', (p: Project) => p.id === id, data);
  },

  async listForUser(user: AccessUser, options?: ProjectListOptions): Promise<ProjectListResult> {
    const { page = 1, pageSize = 10, status } = options || {};
    let projects = queryAll('projects') as Project[];

    if (status) {
      projects = projects.filter((p) => p.status === status);
    }

    if (user.role !== 'admin') {
      projects = projects.filter((p) => this.canAccessProject(p, user));
    }

    projects.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = projects.length;
    const start = (page - 1) * pageSize;
    const list = projects.slice(start, start + pageSize);

    return { list, total, page, pageSize };
  },

  /**
   * 删除项目
   */
  async delete(id: string): Promise<boolean> {
    await remove('projects', (p: Project) => p.id === id);
    await remove('projectFiles', (f: ProjectFile) => f.projectId === id);
    return true;
  },

  async deleteForUser(id: string, user: AccessUser): Promise<boolean> {
    const project = await this.getAccessibleProjectById(id, user);
    if (!project) {
      return false;
    }

    await remove('projects', (p: Project) => p.id === id);
    await remove('projectFiles', (f: ProjectFile) => f.projectId === id);
    return true;
  },

  /**
   * 添加项目文件
   */
  async addFile(file: Omit<ProjectFile, 'id' | 'createdAt'>): Promise<ProjectFile> {
    return insert('projectFiles', file);
  },

  /**
   * 获取项目文件列表
   */
  async getFiles(projectId: string): Promise<ProjectFile[]> {
    return queryAll('projectFiles').filter(
      (f: ProjectFile) => f.projectId === projectId
    );
  },
};