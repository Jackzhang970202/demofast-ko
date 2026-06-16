/**
 * 提交回答 API
 * POST: 提交当前问题的回答
 */

import { NextRequest, NextResponse } from 'next/server';
import { ClarificationService } from '@/server/services/clarification.service';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import { logSystemError } from '@/lib/logger';
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
    const { projectId, questionId, answer } = body;

    if (!projectId || !questionId) {
      return NextResponse.json(
        { code: 400, message: 'projectId 和 questionId 参数必填' },
        { status: 400 }
      );
    }

    if (answer === undefined || answer === null) {
      return NextResponse.json(
        { code: 400, message: '回答内容不能为空' },
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

    // 加载会话
    const session = await ClarificationService.loadSession(projectId);
    if (!session) {
      return NextResponse.json(
        { code: 404, message: '澄清会话不存在' },
        { status: 404 }
      );
    }

    // 提交回答（先保存，这是最重要的）
    let updatedSession = await ClarificationService.submitAnswer(session, questionId, answer);

    // 检查是否需要推进到下一轮
    const currentRoundQuestions = updatedSession.questions.filter(q => q.round === updatedSession.currentRound);
    const allAnswered = currentRoundQuestions.every(q =>
      updatedSession.answers.some(a =>
        a.questionId === q.id && a.answer &&
        (Array.isArray(a.answer) ? a.answer.length > 0 : a.answer.toString().trim())
      )
    );

    // 推进轮次的错误处理：回答已保存，即使推进失败也返回成功
    let advanceError: string | null = null;
    if (allAnswered) {
      try {
        updatedSession = await ClarificationService.checkAndAdvanceRound(updatedSession);
      } catch (err: any) {
        // 推进失败，但回答已保存
        logSystemError(projectId, '推进轮次失败', { error: err.message, round: updatedSession.currentRound });
        advanceError = `推进到下一轮时出错: ${err.message}`;
        // 保持当前状态，让用户可以重试
        await ClarificationService.saveSession(updatedSession);
      }
    } else {
      await ClarificationService.saveSession(updatedSession);
    }

    const progress = ClarificationService.getProgress(updatedSession);
    const currentQuestion = ClarificationService.getCurrentQuestion(updatedSession);
    const roundComplete = allAnswered && updatedSession.currentRound > session.currentRound;
    const sessionComplete = updatedSession.status === 'completed';

    // 如果会话完成，推进到 SPEC_GENERATING 阶段
    if (sessionComplete) {
      await WorkflowStateService.advancePhase(projectId);
    }

    // 返回成功，如果有推进错误则附带信息
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        saved: true,
        progress,
        currentQuestion,
        roundComplete,
        sessionComplete,
        session: updatedSession,
        advanceError, // 如果有推进错误，前端可以显示提示
      },
    });
  } catch (error: any) {
    console.error('提交回答错误:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}