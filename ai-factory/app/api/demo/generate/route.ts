import { NextRequest, NextResponse } from 'next/server';
import { DemoClarificationService } from '@/server/services/demo-clarification.service';
import { DemoGenerateService } from '@/server/services/demo-generate.service';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';
import { BillingService } from '@/server/services/billing.service';

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ code: 400, message: 'projectId 参数必填' }, { status: 400 });
    }

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project || project.projectType !== 'frontend-demo') {
      return NextResponse.json({ code: 404, message: 'Demo 项目不存在' }, { status: 404 });
    }

    const session = await DemoClarificationService.loadSession(projectId);
    console.log('[Demo Generate API] request', { projectId, hasSession: !!session, sessionStatus: session?.status });
    if (!session) {
      return NextResponse.json({ code: 404, message: '澄清会话不存在' }, { status: 404 });
    }

    if (session.status !== 'completed') {
      return NextResponse.json({ code: 400, message: '澄清尚未完成' }, { status: 400 });
    }

    await BillingService.assertCanStartDemo(currentUser.id);
    const billingSession = await BillingService.createSession(currentUser.id, projectId);
    const result = await DemoGenerateService.generate(projectId, session, billingSession.id);
    const billing = await BillingService.finishSession(billingSession.id, 'completed');
    console.log('[Demo Generate API] success', { projectId, specFile: result?.specFile, files: result?.files?.length, resumed: result?.resumed, phase: result?.phase, billing });
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        ...result,
        billing,
      },
    });
  } catch (error: any) {
    console.error('[Demo Generate API] error', { message: error.message, stack: error.stack });
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}
