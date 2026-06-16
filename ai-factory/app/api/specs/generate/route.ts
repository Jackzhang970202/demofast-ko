/**
 * Specs 文档生成 API
 * POST: 根据澄清结果生成完整的 SDD 规范文档
 */

import { NextRequest, NextResponse } from 'next/server';
import { SpecsGeneratorService } from '@/server/services/specs-generator.service';
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
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { code: 400, message: 'projectId 必填' },
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

    // 加载澄清会话
    const session = await ClarificationService.loadSession(projectId);

    if (!session) {
      return NextResponse.json(
        { code: 404, message: '澄清会话不存在，请先完成需求澄清' },
        { status: 404 }
      );
    }

    if (session.status !== 'completed') {
      return NextResponse.json(
        { code: 400, message: '澄清尚未完成，请先完成需求澄清' },
        { status: 400 }
      );
    }

    console.log(`\n📚 开始生成 Specs 文档: ${projectId}\n`);

    // 生成所有 Specs 文档
    await SpecsGeneratorService.generateAllSpecs(session);

    // 保存 specs 路径
    const specs = {
      requirement: `data/projects/${projectId}/specs/requirement/REQ-主模块.md`,
      design: [
        `data/projects/${projectId}/specs/design/01-architecture.md`,
        `data/projects/${projectId}/specs/design/02-data-model.md`,
        `data/projects/${projectId}/specs/design/03-ui-ux.md`,
      ],
      task: `data/projects/${projectId}/specs/task/TASK-主模块.md`,
      checklist: `data/projects/${projectId}/specs/checklist/CHK-主模块.md`,
    };

    await WorkflowStateService.savePhaseData(projectId, { specs });

    // 推进到 CODE_GENERATING 阶段
    await WorkflowStateService.advancePhase(projectId);

    // 返回生成的文件列表
    const files = [
      'specs/requirement/REQ-主模块.md',
      'specs/design/01-architecture.md',
      'specs/design/02-data-model.md',
      'specs/design/03-ui-ux.md',
      'specs/task/TASK-主模块.md',
      'specs/checklist/CHK-主模块.md',
    ];

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        projectId,
        files,
        session: {
          targetUser: session.summary?.targetUser,
          coreProblem: session.summary?.coreProblem,
          phase1Features: session.summary?.features.phase1.map(f => f.name),
        },
      },
    });
  } catch (error: any) {
    console.error('Specs 生成错误:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}