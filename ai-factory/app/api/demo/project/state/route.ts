import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import { getExecutionState, getProjectStatusSummary, hasRunningProcess } from '@/server/services/execution-state.service';
import { getDemoVisiblePhase, getPhaseUrl, getWorkflowNextAction } from '@/types/workflow';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

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

    const state = await WorkflowStateService.getState(projectId);
    if (!state || state.projectType !== 'frontend-demo') {
      return NextResponse.json({ code: 404, message: 'Demo 项目状态不存在' }, { status: 404 });
    }

    const executionState = getExecutionState(projectId);
    let effectivePhase = getDemoVisiblePhase(state.phase, executionState);

    if (state.phase === 'SPEC_GENERATING' && executionState?.currentStage === 'demo-developer') {
      effectivePhase = 'CODE_GENERATING';
    }
    const currentRoute = getPhaseUrl(projectId, state.projectType, effectivePhase);
    const nextAction = getWorkflowNextAction(projectId, effectivePhase, state.projectType);

    const executionSummary = getProjectStatusSummary(projectId);
    const running = hasRunningProcess(projectId);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        projectId: state.projectId,
        projectType: state.projectType,
        phase: effectivePhase,
        currentRoute,
        requirement: state.phaseData.requirement,
        phaseData: state.phaseData,
        agentProgress: state.agentProgress,
        canProceed: effectivePhase !== 'COMPLETED',
        nextAction,
        executionState,
        executionSummary,
        running,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}
