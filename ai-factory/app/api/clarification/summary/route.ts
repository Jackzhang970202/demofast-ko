/**
 * 获取需求摘要 API
 * GET: 获取当前需求摘要
 */

import { NextRequest, NextResponse } from 'next/server';
import { ClarificationService } from '@/server/services/clarification.service';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

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

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        summary: session.summary,
        agentHandoff: session.agentHandoff,
        progress,
        session: {
          projectId: session.projectId,
          currentRound: session.currentRound,
          status: session.status,
          startTime: session.startTime,
          endTime: session.endTime,
        },
      },
    });
  } catch (error: any) {
    console.error('获取需求摘要错误:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}