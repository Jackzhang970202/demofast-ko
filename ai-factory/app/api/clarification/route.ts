/**
 * 澄清会话 API
 * POST: 创建新的澄清会话
 * GET: 获取当前澄清会话状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { ClarificationService } from '@/server/services/clarification.service';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
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

    const body = await request.json();
    const { requirement, projectId } = body;

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

    // 生成或使用现有 projectId
    const finalProjectId = projectId || `proj_${Date.now().toString(36)}`;

    if (projectId) {
      const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
      if (!project) {
        return NextResponse.json(
          { code: 404, message: '项目不存在' },
          { status: 404 }
        );
      }
    }

    // 创建澄清会话
    const session = await ClarificationService.createSession(finalProjectId, requirement);

    // 保存到工作流状态
    await WorkflowStateService.savePhaseData(finalProjectId, {
      clarificationSession: session,
    });

    // 推进到 CLARIFYING 阶段
    await WorkflowStateService.advancePhase(finalProjectId);

    const progress = ClarificationService.getProgress(session);
    const currentQuestion = ClarificationService.getCurrentQuestion(session);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        session,
        progress,
        currentQuestion,
      },
    });
  } catch (error: any) {
    console.error('创建澄清会话错误:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

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

    const session = await ClarificationService.loadSession(projectId);

    if (!session) {
      return NextResponse.json(
        { code: 404, message: '澄清会话不存在' },
        { status: 404 }
      );
    }

    const progress = ClarificationService.getProgress(session);
    const currentQuestion = ClarificationService.getCurrentQuestion(session);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        session,
        progress,
        currentQuestion,
      },
    });
  } catch (error: any) {
    console.error('获取澄清会话错误:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}