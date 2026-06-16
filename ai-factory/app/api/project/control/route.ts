/**
 * 项目控制 API
 * POST: 创建新项目
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';

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

    const body = await request.json();
    const { requirement } = body;

    if (!requirement || typeof requirement !== 'string') {
      return NextResponse.json(
        { code: 400, message: '需求描述不能为空' },
        { status: 400 }
      );
    }

    if (requirement.length > 8000) {
      return NextResponse.json(
        { code: 400, message: '需求描述不能超过8000字符' },
        { status: 400 }
      );
    }

    const state = await WorkflowStateService.createProject(requirement, currentUser.id);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        projectId: state.projectId,
        phase: state.phase,
        requirement: state.phaseData.requirement,
        _state: {
          phase: state.phase,
          canProceed: true,
          nextRoute: '/requirement?projectId=' + state.projectId,
        },
      },
    });
  } catch (error: any) {
    console.error('创建项目错误:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}