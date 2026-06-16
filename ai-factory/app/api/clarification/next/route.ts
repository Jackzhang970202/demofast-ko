/**
 * 获取下一个问题 API
 * GET: 获取下一个待回答的问题
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
    const currentQuestion = ClarificationService.getCurrentQuestion(session);

    // 检查是否还有问题
    const hasNext = currentQuestion !== null;

    // 检查当前轮次是否完成
    const currentRoundQuestions = session.questions.filter(q => q.round === session.currentRound);
    const roundComplete = session.currentQuestionIndex >= currentRoundQuestions.length;

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        hasNext,
        question: currentQuestion,
        progress,
        roundComplete,
        sessionComplete: session.status === 'completed',
      },
    });
  } catch (error: any) {
    console.error('获取下一个问题错误:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}