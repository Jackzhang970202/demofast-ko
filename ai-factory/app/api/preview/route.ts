import { NextRequest, NextResponse } from 'next/server';
import type { ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import { PortAllocatorService } from '@/server/services/port-allocator.service';
import { RuntimeService } from '@/server/services/runtime.service';
import { DemoRuntimeService } from '@/server/services/demo-runtime.service';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

const PREVIEW_CONFIG = {
  maxWaitTime: 300000,
  checkInterval: 3000,
};

interface PreviewProcessInfo {
  frontendProcess: ChildProcess | null;
  backendProcess: ChildProcess | null;
  frontendPort: number;
  backendPort: number;
  url: string;
  backendUrl: string;
  startTime: number;
  lastHeartbeat: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
}

async function resolveAvailableFrontendPort(projectId: string, preferredPort: number): Promise<number> {
  let candidate = preferredPort;
  while (!(await PortAllocatorService.isPortAvailable(candidate))) {
    await PortAllocatorService.releasePort(`${projectId}:frontend`);
    candidate = await PortAllocatorService.allocatePort(`${projectId}:frontend`);
  }
  return candidate;
}

const previewProcesses = new Map<string, PreviewProcessInfo>();

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, action } = body;

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project) {
      return NextResponse.json({ code: 404, message: '项目不存在' }, { status: 404 });
    }

    if (!projectId) {
      return NextResponse.json({ code: 400, message: 'projectId is required' }, { status: 400 });
    }

    const projectDir = path.join(process.cwd(), 'data', 'projects', projectId, 'generated');

    if (!fs.existsSync(projectDir)) {
      return NextResponse.json({ code: 404, message: 'Project not found' }, { status: 404 });
    }

    if (action === 'start') return await startPreview(projectId, projectDir);
    if (action === 'stop') return await stopPreview(projectId);
    if (action === 'status') return await getPreviewStatus(projectId);

    return NextResponse.json({ code: 400, message: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message }, { status: 500 });
  }
}

async function startPreview(projectId: string, projectDir: string) {
  const existing = previewProcesses.get(projectId);
  if (existing) {
    killProcess(existing.frontendProcess);
    killProcess(existing.backendProcess);
    previewProcesses.delete(projectId);
    await PortAllocatorService.releasePort(`${projectId}:frontend`);
    await PortAllocatorService.releasePort(`${projectId}:backend`);
  }

  const workflowState = await WorkflowStateService.getState(projectId);
  const runtimeKind = workflowState?.runtimeKind || workflowState?.phaseData?.runtimeType || 'ruoyi-vue-pg';
  let frontendPort = workflowState?.phaseData?.assignedPort;
  let backendPort = workflowState?.phaseData?.backendPort || 0;

  if (!frontendPort) frontendPort = await PortAllocatorService.allocatePort(`${projectId}:frontend`);
  frontendPort = await resolveAvailableFrontendPort(projectId, frontendPort);
  if (runtimeKind !== 'frontend-demo' && !backendPort) {
    backendPort = await PortAllocatorService.allocatePort(`${projectId}:backend`);
  }

  if (runtimeKind === 'frontend-demo') {
    await DemoRuntimeService.ensureProjectDependencies(projectDir);
  } else {
    await RuntimeService.ensureProjectDependencies(projectDir);
  }

  const previewRecord: PreviewProcessInfo = {
    frontendProcess: null,
    backendProcess: null,
    frontendPort,
    backendPort,
    url: `http://localhost:${frontendPort}`,
    backendUrl: `http://localhost:${backendPort}`,
    startTime: Date.now(),
    lastHeartbeat: Date.now(),
    status: 'starting',
  };
  previewProcesses.set(projectId, previewRecord);

  try {
    const runtime = runtimeKind === 'frontend-demo'
      ? await DemoRuntimeService.start(projectDir, frontendPort)
      : await RuntimeService.startRuoyi(projectDir, frontendPort, backendPort);
    frontendPort = runtime.frontendPort;
    previewRecord.frontendPort = frontendPort;
    previewRecord.url = `http://localhost:${frontendPort}`;
    previewRecord.frontendProcess = runtime.frontend || null;
    previewRecord.backendProcess = 'backend' in runtime ? runtime.backend || null : null;

    if (!('bindLogs' in runtime) || !runtime.bindLogs) {
      bindLogs(runtime.frontend);
    }
    if ('backend' in runtime) {
      bindLogs(runtime.backend);
    }

    const startTime = Date.now();
    let frontendReady = false;
    let backendReady = runtimeKind === 'frontend-demo';

    while (Date.now() - startTime < PREVIEW_CONFIG.maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, PREVIEW_CONFIG.checkInterval));

      frontendReady = await isHttpReady(`http://localhost:${frontendPort}`);
      if (runtimeKind !== 'frontend-demo') {
        backendReady = await isBackendReady(`http://localhost:${backendPort}`);
      }

      if (previewRecord.frontendProcess?.exitCode !== null || (runtimeKind !== 'frontend-demo' && previewRecord.backendProcess?.exitCode !== null)) {
        throw new Error(runtimeKind === 'frontend-demo' ? 'Demo 前端进程提前退出' : '若依前后端进程提前退出');
      }

      if (frontendReady && backendReady) break;
    }

    if (!frontendReady || !backendReady) {
      throw new Error(runtimeKind === 'frontend-demo' ? 'Demo 前端启动超时' : '若依前后端启动超时');
    }

    previewRecord.status = 'running';
    previewRecord.lastHeartbeat = Date.now();

    await WorkflowStateService.savePhaseData(projectId, {
      assignedPort: frontendPort,
      backendPort,
      runtimeType: runtimeKind,
    });

    return NextResponse.json({
      code: 200,
      message: 'Preview started',
      data: {
        port: frontendPort,
        backendPort,
        url: previewRecord.url,
        backendUrl: previewRecord.backendUrl,
        frontendPid: runtime.frontend?.pid,
        backendPid: runtime.backend?.pid,
      },
    });
  } catch (error: any) {
    console.error(`[Preview ${projectId}] 启动失败:`, error);
    killProcess(previewRecord.frontendProcess);
    killProcess(previewRecord.backendProcess);
    previewProcesses.delete(projectId);
    await PortAllocatorService.releasePort(`${projectId}:frontend`);
    await PortAllocatorService.releasePort(`${projectId}:backend`);
    await WorkflowStateService.savePhaseData(projectId, {
      assignedPort: undefined,
      backendPort: undefined,
      runtimeType: workflowState?.runtimeKind || workflowState?.phaseData?.runtimeType,
    }).catch(() => undefined);
    return NextResponse.json({ code: 500, message: `启动失败: ${error.message}` }, { status: 500 });
  }
}

async function stopPreview(projectId: string) {
  const preview = previewProcesses.get(projectId);
  if (!preview) {
    await PortAllocatorService.releasePort(`${projectId}:frontend`);
    await PortAllocatorService.releasePort(`${projectId}:backend`);
    await WorkflowStateService.savePhaseData(projectId, {
      assignedPort: undefined,
      backendPort: undefined,
      runtimeType: 'frontend-demo',
    }).catch(() => undefined);
    return NextResponse.json({ code: 200, message: 'Not running' });
  }

  preview.status = 'stopping';
  killProcess(preview.frontendProcess);
  killProcess(preview.backendProcess);
  previewProcesses.delete(projectId);
  await PortAllocatorService.releasePort(`${projectId}:frontend`);
  await PortAllocatorService.releasePort(`${projectId}:backend`);
  await WorkflowStateService.savePhaseData(projectId, {
    assignedPort: undefined,
    backendPort: undefined,
    runtimeType: 'frontend-demo',
  }).catch(() => undefined);

  return NextResponse.json({ code: 200, message: 'Preview stopped' });
}

async function getPreviewStatus(projectId: string) {
  const preview = previewProcesses.get(projectId);
  if (!preview) {
    return NextResponse.json({ code: 200, data: { running: false } });
  }

  preview.lastHeartbeat = Date.now();
  PortAllocatorService.heartbeat(`${projectId}:frontend`);
  PortAllocatorService.heartbeat(`${projectId}:backend`);

  const workflowState = await WorkflowStateService.getState(projectId);
  const runtimeKind = workflowState?.runtimeKind || workflowState?.phaseData?.runtimeType || 'ruoyi-vue-pg';
  const frontendAlive = await isHttpReady(preview.url);
  const backendAlive = runtimeKind === 'frontend-demo' ? true : await isBackendReady(preview.backendUrl);

  if (!frontendAlive || !backendAlive) {
    previewProcesses.delete(projectId);
    return NextResponse.json({
      code: 200,
      data: {
        running: false,
        message: '进程已终止',
      },
    });
  }

  return NextResponse.json({
    code: 200,
    data: {
      running: true,
      status: preview.status,
      port: preview.frontendPort,
      backendPort: preview.backendPort,
      url: preview.url,
      backendUrl: preview.backendUrl,
      uptime: Date.now() - preview.startTime,
      frontendPid: preview.frontendProcess?.pid,
      backendPid: preview.backendProcess?.pid,
    },
  });
}

async function isHttpReady(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function isBackendReady(url: string): Promise<boolean> {
  const healthUrls = [`${url}/captchaImage`, `${url}/dev-api/captchaImage`, url];
  for (const healthUrl of healthUrls) {
    try {
      const response = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
      if (response.ok || response.status < 500) {
        return true;
      }
    } catch {
    }
  }
  return false;
}

function bindLogs(proc: ChildProcess | undefined) {
  proc?.stdout?.on('data', (data: Buffer) => {
    process.stdout.write(data.toString());
  });
  proc?.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(data.toString());
  });
}

function killProcess(proc: ChildProcess | null) {
  if (!proc) return;
  try {
    if (process.platform === 'win32') {
      // Windows 上 taskkill /T 会杀死整个进程树
      require('child_process').execSync(`taskkill /F /T /PID ${proc.pid} 2>nul`);
    } else {
      proc.kill();
    }
  } catch {
    try {
      proc.kill();
    } catch {}
  }
}
