import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { initDatabase, insert } from '@/lib/db';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
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
    const { name, description, requirement, templateId, taskPackage } = body;
    console.log('[Demo Project] create:start', { name, userId: currentUser.id, hasRequirement: !!requirement, requirementLength: requirement?.length || 0 });


    const project = await insert('projects', {
      name: name || 'Demo Project',
      description: description || requirement?.substring(0, 500),
      requirement,
      status: 'clarifying',
      userId: currentUser.id,
      projectType: 'frontend-demo',
      templateId: templateId || null,
      runtimeKind: 'frontend-demo',
    });

    await WorkflowStateService.createProject(requirement || '', undefined, project.id, 'frontend-demo');
    if (taskPackage) {
      await WorkflowStateService.savePhaseData(project.id, { taskPackage });
    }
    console.log('[Demo Project] create:done', { projectId: project.id });

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { id: project.id },
    });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, extraDescription } = body;
    if (!projectId || !extraDescription) {
      return NextResponse.json({ code: 400, message: '参数不完整' }, { status: 400 });
    }

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project || project.projectType !== 'frontend-demo') {
      return NextResponse.json({ code: 404, message: 'Demo 项目不存在' }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'data', 'projects', projectId, 'demo-extra.txt');
    fs.writeFileSync(filePath, extraDescription, 'utf-8');
    return NextResponse.json({ code: 200, message: 'success' });
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

    const filePath = path.join(process.cwd(), 'data', 'projects', projectId, 'demo-extra.txt');
    const extraDescription = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
    return NextResponse.json({ code: 200, message: 'success', data: { extraDescription } });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}
