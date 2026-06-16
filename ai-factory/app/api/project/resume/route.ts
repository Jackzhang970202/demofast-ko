/**
 * 项目恢复 API
 * POST: 恢复项目执行，返回跳转路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import { getPhaseRoute } from '@/types/workflow';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

export async function POST(request: NextRequest) {
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
        { code: 404, message: '项目不存在' },
        { status: 404 }
      );
    }

    const state = await WorkflowStateService.getState(projectId);

    if (!state) {
      return NextResponse.json(
        { code: 404, message: '项目不存在' },
        { status: 404 }
      );
    }

    const route = getPhaseRoute(state.projectType, state.phase);

    const redirect = state.phase === 'COMPLETED'
      ? `${route}?project=${projectId}`
      : `${route}?projectId=${projectId}`;

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        redirect,
        phase: state.phase,
        projectId: state.projectId,
      },
    });
  } catch (error: any) {
    console.error('恢复项目错误:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}