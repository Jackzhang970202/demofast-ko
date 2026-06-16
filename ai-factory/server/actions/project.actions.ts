/**
 * 项目管理 Server Actions
 * 供 Client Components 调用
 */

'use server';

import { revalidatePath } from 'next/cache';
import { ProjectService } from '@/server/services/project.service';
import type { Project } from '@/types';

/**
 * 创建项目
 */
export async function createProjectAction(data: {
  name: string;
  description?: string;
  requirement?: string;
}): Promise<Project> {
  const project = await ProjectService.create({
    ...data,
    status: 'pending',
  });
  revalidatePath('/projects');
  return project;
}

/**
 * 删除项目
 */
export async function deleteProjectAction(id: string): Promise<{ success: boolean }> {
  await ProjectService.delete(id);
  revalidatePath('/projects');
  return { success: true };
}

/**
 * 更新项目状态
 */
export async function updateProjectStatusAction(
  id: string,
  status: Project['status']
): Promise<{ success: boolean }> {
  await ProjectService.updateStatus(id, status);
  revalidatePath('/projects');
  revalidatePath(`/projects/${id}`);
  return { success: true };
}