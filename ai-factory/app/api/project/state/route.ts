/**
 * 项目状态 API
 * GET: 获取项目当前状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import { getPhaseRoute } from '@/types/workflow';
import fs from 'fs';
import path from 'path';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

// 检查目录是否有 .md 文件
function hasMarkdownFiles(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  const files = fs.readdirSync(dir);
  return files.some(f => f.endsWith('.md'));
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

    const state = await WorkflowStateService.getState(projectId);

    if (!state) {
      return NextResponse.json(
        { code: 404, message: '项目不存在' },
        { status: 404 }
      );
    }

    // 优先从 agentProgress 获取状态（可靠）
    const agentProgress = state.agentProgress || {};
    const docStatus = {
      pm: agentProgress.pm?.completed || false,
      uiue: agentProgress.uiue?.completed || false,
      architect: agentProgress.architect?.completed || false,
      developer: agentProgress.developer?.completed || false,
    };

    // 如果 agentProgress 为空，尝试从文件系统推断（兼容旧数据）
    if (!agentProgress.pm && !agentProgress.uiue && !agentProgress.architect) {
      const projectDir = path.join(process.cwd(), 'data', 'projects', projectId);

      // PM: 检查 specs/requirement 目录是否有 .md 文件
      const reqDir = path.join(projectDir, 'specs', 'requirement');
      docStatus.pm = hasMarkdownFiles(reqDir);

      // UIUE: 检查 specs/design 目录是否有 UI 相关文件
      const designDir = path.join(projectDir, 'specs', 'design');
      const designFiles = fs.existsSync(designDir) ? fs.readdirSync(designDir) : [];
      docStatus.uiue = designFiles.some(f => f.includes('ui') || f.includes('03'));

      // Architect: 检查 specs/design 目录是否有架构相关文件
      docStatus.architect = designFiles.some(f => f.includes('architecture') || f.includes('01') || f.includes('data-model'));
    }

    // 根据文档状态计算起始步骤
    // agentOrder: ['pm', 'uiue', 'architect', 'developer']
    const agentOrder = ['pm', 'uiue', 'architect', 'developer'] as const;
    let startFromIndex = 0;
    for (let i = 0; i < agentOrder.length; i++) {
      const agentId = agentOrder[i];
      if (docStatus[agentId]) {
        startFromIndex = i + 1;
      } else {
        break; // 一旦遇到未完成的就停止
      }
    }

    // 如果 startFromIndex 为 4，表示全部完成
    if (startFromIndex === 4) {
      startFromIndex = 3; // developer 已完成
    }

    // 计算是否可以继续
    const phases = ['IDLE', 'CLARIFYING', 'SPEC_GENERATING', 'CODE_GENERATING', 'COMPLETED'];
    const currentIndex = phases.indexOf(state.phase);
    const canProceed = currentIndex < phases.length - 1;

    // 下一步操作
    let nextAction = undefined;
    if (canProceed) {
      const nextPhase = phases[currentIndex + 1] as typeof phases[number];
      nextAction = {
        route: getPhaseRoute(state.projectType, nextPhase) + '?projectId=' + projectId,
        label: getNextActionLabel(state.phase, state.projectType),
      };
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        projectId: state.projectId,
        phase: state.phase,
        requirement: state.phaseData.requirement,
        phaseData: state.phaseData,
        agentProgress: docStatus,
        canProceed,
        nextAction,
        docStatus,
        startFromIndex,
      },
    });
  } catch (error: any) {
    console.error('获取项目状态错误:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

function getNextActionLabel(phase: string, projectType: string): string {
  const standardLabels: Record<string, string> = {
    IDLE: '开始澄清需求',
    CLARIFYING: '生成需求文档',
    SPEC_GENERATING: '生成代码',
    CODE_GENERATING: '进入项目',
  };
  const demoLabels: Record<string, string> = {
    IDLE: '开始澄清需求',
    CLARIFYING: '生成前端规格',
    SPEC_GENERATING: '生成演示系统',
    CODE_GENERATING: '进入 Demo 项目',
  };
  const labels = projectType === 'frontend-demo' ? demoLabels : standardLabels;
  return labels[phase] || '继续';
}