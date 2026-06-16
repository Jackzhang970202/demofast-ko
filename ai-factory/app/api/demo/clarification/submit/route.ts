import { NextRequest, NextResponse } from 'next/server';
import { DemoClarificationService } from '@/server/services/demo-clarification.service';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, questionId, answer } = body;
    console.log('[Demo Clarification] submit:start', { projectId, questionId, answer });

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project || project.projectType !== 'frontend-demo') {
      return NextResponse.json({ code: 404, message: 'Demo 项目不存在' }, { status: 404 });
    }

    const session = await DemoClarificationService.loadSession(projectId);
    if (!session) {
      return NextResponse.json({ code: 404, message: '澄清会话不存在' }, { status: 404 });
    }

    let updatedSession = await DemoClarificationService.submitAnswer(session, questionId, answer);
    console.log('[Demo Clarification] submit:answer-saved', { projectId, currentQuestionIndex: updatedSession.currentQuestionIndex });
    updatedSession = await DemoClarificationService.checkAndAdvance(updatedSession);
    console.log('[Demo Clarification] submit:check-advance-done', { projectId, status: updatedSession.status });

    const sessionComplete = updatedSession.status === 'completed';
    await WorkflowStateService.savePhaseData(projectId, {
      clarificationSession: updatedSession,
      summary: updatedSession.summary,
      templateId: updatedSession.templateRecommendation?.primary,
      templateRecommendation: updatedSession.templateRecommendation,
    });

    if (sessionComplete) {
      console.log('[Demo Clarification] submit:session-completed', { projectId });
      await WorkflowStateService.advancePhase(projectId);
      console.log('[Demo Clarification] submit:phase-advanced', { projectId, nextPhase: 'SPEC_GENERATING' });
    }

    console.log('[Demo Clarification] submit:done', { projectId, sessionComplete });
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        session: updatedSession,
        progress: DemoClarificationService.getProgress(updatedSession),
        currentQuestion: DemoClarificationService.getCurrentQuestion(updatedSession),
        sessionComplete,
        nextPhase: sessionComplete ? 'SPEC_GENERATING' : 'CLARIFYING',
      },
    });
  } catch (error: any) {
    console.error('[Demo Clarification Submit] error', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}
