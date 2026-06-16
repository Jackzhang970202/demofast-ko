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
    const { requirement, projectId } = body;
    console.log('[Demo Clarification] create:start', { projectId, requirementLength: requirement?.length || 0 });

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project || project.projectType !== 'frontend-demo') {
      return NextResponse.json({ code: 404, message: 'Demo 项目不存在' }, { status: 404 });
    }

    const session = await DemoClarificationService.createSession(projectId, requirement || '');
    console.log('[Demo Clarification] create:session-created', { projectId, questionCount: session.questions.length });
    await WorkflowStateService.savePhaseData(projectId, { clarificationSession: session });
    await WorkflowStateService.advancePhase(projectId);
    console.log('[Demo Clarification] create:done', { projectId, nextPhase: 'CLARIFYING' });
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        session,
        progress: DemoClarificationService.getProgress(session),
        currentQuestion: DemoClarificationService.getCurrentQuestion(session),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ code: 400, message: 'projectId 参数必填' }, { status: 400 });
    }

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project || project.projectType !== 'frontend-demo') {
      return NextResponse.json({ code: 404, message: 'Demo 项目不存在' }, { status: 404 });
    }

    const session = await DemoClarificationService.loadSession(projectId);
    if (!session) {
      return NextResponse.json({ code: 404, message: '澄清会话不存在' }, { status: 404 });
    }
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        session,
        progress: DemoClarificationService.getProgress(session),
        currentQuestion: DemoClarificationService.getCurrentQuestion(session),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}
