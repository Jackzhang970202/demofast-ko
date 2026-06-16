import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, queryAll, insert, update, remove } from '@/lib/db';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import { getExecutionState } from '@/server/services/execution-state.service';
import { PHASE_STEPS, WorkflowPhase, getEffectiveWorkflowPhase } from '@/types/workflow';
import type { ProjectType } from '@/types/project';
import fs from 'fs';
import path from 'path';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

// 获取项目列表（包含 phase 信息）
export async function GET(request: NextRequest) {
  try {
    await initDatabase();

    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json(
        { code: 401, message: '未登录或登录状态无效' },
        { status: 401 }
      );
    }

    let projects = queryAll('projects');
    const projectType = request.nextUrl.searchParams.get('projectType') as ProjectType | null;

    if (projectType) {
      projects = projects.filter((p: any) => (p.projectType || 'ruoyi-vue-pg') === projectType);
    }

    if (currentUser.role !== 'admin') {
      projects = projects.filter((p: any) => ProjectService.canAccessProject(p, currentUser));
    }

    // 为每个项目附加 phase 信息
    const projectsWithPhase = await Promise.all(
      projects.map(async (project: any) => {
        try {
          const state = await WorkflowStateService.getState(project.id);
          const executionState = getExecutionState(project.id);
          const phase = getEffectiveWorkflowPhase(
            state?.phase || 'IDLE',
            executionState,
            state?.projectType || project.projectType,
          );
          const phaseInfo = PHASE_STEPS[phase as WorkflowPhase];
          return {
            ...project,
            phase,
            phaseLabel: phaseInfo?.label || '未知',
            phaseStep: phaseInfo?.step || 0,
            phaseTotal: phaseInfo?.total || 4,
          };
        } catch {
          return {
            ...project,
            phase: 'IDLE',
            phaseLabel: '等待开始',
            phaseStep: 0,
            phaseTotal: 4,
          };
        }
      })
    );

    // 按更新时间倒序排列
    projectsWithPhase.sort((a, b) =>
      new Date(b.updatedAt || b.created_at).getTime() -
      new Date(a.updatedAt || a.created_at).getTime()
    );

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: projectsWithPhase,
    });
  } catch (error: any) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

// 创建新项目
export async function POST(request: Request) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json(
        { code: 401, message: '未登录或登录状态无效' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      requirement,
      files,
      projectType = 'ruoyi-vue-pg',
      templateId,
      runtimeKind,
    } = body;

    // 动态导入避免循环依赖
    const { insert } = await import('@/lib/db');

    const project = await insert('projects', {
      name: name || 'Generated Project',
      description: description || requirement?.substring(0, 500),
      requirement,
      status: 'clarifying',
      userId: currentUser.id,
      projectType,
      templateId: templateId || null,
      runtimeKind: runtimeKind || (projectType === 'frontend-demo' ? 'frontend-demo' : 'ruoyi-vue-pg'),
    });

    await WorkflowStateService.createProject(requirement || '', undefined, project.id, projectType);

    // 插入文件记录
    if (files && Array.isArray(files)) {
      for (const file of files) {
        await insert('projectFiles', {
          projectId: project.id,
          path: file.path,
          name: file.name,
          language: file.language || 'plaintext',
          content: file.content,
        });
      }
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { id: project.id },
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

// 修改项目（改名）
export async function PATCH(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json(
        { code: 401, message: '未登录或登录状态无效' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, name } = body;

    if (!projectId) {
      return NextResponse.json(
        { code: 400, message: 'projectId 参数必填' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { code: 400, message: '项目名称不能为空' },
        { status: 400 }
      );
    }

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project) {
      return NextResponse.json(
        { code: 403, message: '无权访问该项目' },
        { status: 403 }
      );
    }

    const success = await update('projects', (p: any) => p.id === projectId, { name: name.trim() });

    if (!success) {
      return NextResponse.json(
        { code: 404, message: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { projectId, name: name.trim() },
    });
  } catch (error: any) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除项目（包括数据库记录和项目文件夹）
export async function DELETE(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json(
        { code: 401, message: '未登录或登录状态无效' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { code: 400, message: 'projectId 参数必填' },
        { status: 400 }
      );
    }

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project) {
      return NextResponse.json(
        { code: 403, message: '无权操作该项目' },
        { status: 403 }
      );
    }

    // 1. 删除数据库中的项目记录
    const deletedCount = await remove('projects', (p: any) => p.id === projectId);

    // 2. 删除项目相关的文件记录
    await remove('projectFiles', (f: any) => f.projectId === projectId);

    // 3. 删除工作流状态
    try {
      await WorkflowStateService.deleteState(projectId);
    } catch (e) {
      console.warn('删除工作流状态失败:', e);
    }

    // 4. 删除项目文件夹
    const projectDir = path.join(process.cwd(), 'data', 'projects', projectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
      console.log(`[Projects] 已删除项目文件夹: ${projectDir}`);
    }

    if (deletedCount === 0) {
      return NextResponse.json(
        { code: 404, message: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { projectId, deleted: true },
    });
  } catch (error: any) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}