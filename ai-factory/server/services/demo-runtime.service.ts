import { spawn, type ChildProcess, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);
const dependencyTasks = new Map<string, Promise<void>>();

export interface DemoRuntimeProcesses {
  frontend?: ChildProcess;
  url?: string;
  status?: 'starting' | 'running' | 'stopped';
  bindLogs?: () => void;
}

async function waitForPort(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (response.ok || response.status < 500) return true;
    } catch {
    }
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  return false;
}

async function resolveStartedFrontendPort(frontendPort: number): Promise<number> {
  const candidates = [frontendPort, frontendPort + 1, frontendPort + 2, frontendPort + 3, frontendPort + 4];
  for (const port of candidates) {
    if (await waitForPort(`http://localhost:${port}`, 5000)) {
      return port;
    }
  }
  return frontendPort;
}

function bindFrontendPortDetection(frontend: ChildProcess, preferredPort: number) {
  let resolvedPort = preferredPort;

  frontend.stdout?.on('data', (data: Buffer) => {
    const text = data.toString();
    const match = text.match(/Local:\s+http:\/\/localhost:(\d+)\/?/i);
    if (match) {
      resolvedPort = Number(match[1]);
    }
  });

  return () => resolvedPort;
}

async function waitForResolvedFrontendPort(getPort: () => number, preferredPort: number): Promise<number> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 15000) {
    const detectedPort = getPort();
    if (detectedPort !== preferredPort) {
      return detectedPort;
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  return await resolveStartedFrontendPort(preferredPort);
}

function startFrontendProcess(projectDir: string, frontendPort: number) {
  return spawn('npm', ['run', 'dev', '--', '--port', String(frontendPort)], {
    cwd: projectDir,
    shell: true,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function resolveFrontendRuntime(frontend: ChildProcess, frontendPort: number) {
  const getResolvedPort = bindFrontendPortDetection(frontend, frontendPort);
  return await waitForResolvedFrontendPort(getResolvedPort, frontendPort);
}

function buildFrontendRuntimeResult(frontend: ChildProcess, frontendPort: number) {
  return {
    frontend,
    frontendPort,
    url: `http://localhost:${frontendPort}`,
    status: 'running' as const,
  };
}

async function startDemoFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

async function resolveStartedPort(frontendPort: number): Promise<number> {
  return await resolveStartedFrontendPort(frontendPort);
}

async function startDemoRuntime(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void resolveStartedPort;
void startDemoFrontend;
void startDemoRuntime;

function createDemoRuntimeResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void createDemoRuntimeResult;

function startDemoDevServer(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void startDemoDevServer;

async function detectResolvedPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void detectResolvedPort;

function buildResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void buildResult;

function spawnDemoFrontend(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void spawnDemoFrontend;

async function finalizeFrontendPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void finalizeFrontendPort;

function createFrontendResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void createFrontendResult;

async function startRuntimeFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startRuntimeFrontend;

function buildDemoResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void buildDemoResult;

async function launchFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void launchFrontend;

function spawnFrontend(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void spawnFrontend;

async function resolveFrontendPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void resolveFrontendPort;

function makeFrontendResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void makeFrontendResult;

async function bootFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void bootFrontend;

function spawnFrontendDev(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void spawnFrontendDev;

async function readResolvedFrontendPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void readResolvedFrontendPort;

function resultForFrontend(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void resultForFrontend;

async function startAndResolveFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startAndResolveFrontend;

function createResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void createResult;

async function runFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void runFrontend;

function spawnRuntimeFrontendDev(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void spawnRuntimeFrontendDev;

async function detectFrontendPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void detectFrontendPort;

function frontendResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void frontendResult;

async function launchDemoFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void launchDemoFrontend;

function startFrontend(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void startFrontend;

async function resolvePort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void resolvePort;

function buildRuntimeResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void buildRuntimeResult;

async function runDemoFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void runDemoFrontend;

function createProcess(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void createProcess;

async function waitForResolvedPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void waitForResolvedPort;

function createPortResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void createPortResult;

async function startResolvedFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startResolvedFrontend;

function createStartedFrontend(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void createStartedFrontend;

async function detectStartedPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void detectStartedPort;

function finalFrontendResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void finalFrontendResult;

async function startResolvedRuntime(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startResolvedRuntime;

function frontendDevProcess(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void frontendDevProcess;

async function resolvedPortFromProcess(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void resolvedPortFromProcess;

function demoRuntimeResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void demoRuntimeResult;

async function startAndDetectFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startAndDetectFrontend;

function resultFromFrontend(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void resultFromFrontend;

async function launchResolvedFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void launchResolvedFrontend;

function buildStartedFrontend(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void buildStartedFrontend;

async function startResolvedDemoFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startResolvedDemoFrontend;

function spawnStartedFrontend(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void spawnStartedFrontend;

async function findResolvedPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void findResolvedPort;

function buildResolvedResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void buildResolvedResult;

async function startFrontendWithResolvedPort(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startFrontendWithResolvedPort;

function startProcess(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void startProcess;

async function resolveActualFrontendPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void resolveActualFrontendPort;

function makeRuntimeResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void makeRuntimeResult;

async function createRuntimeFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void createRuntimeFrontend;

function spawnDevFrontend(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void spawnDevFrontend;

async function resolveVitePort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void resolveVitePort;

function buildViteResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void buildViteResult;

async function startViteFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startViteFrontend;

function runViteFrontend(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void runViteFrontend;

async function resolveFrontendFromLogs(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void resolveFrontendFromLogs;

function resultForVite(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void resultForVite;

async function startDemoVite(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startDemoVite;

function createViteProcess(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void createViteProcess;

async function detectVitePort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void detectVitePort;

function viteRuntimeResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void viteRuntimeResult;

async function startResolvedVite(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startResolvedVite;

function spawnViteProcess(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void spawnViteProcess;

async function readFrontendPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void readFrontendPort;

function runtimeResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void runtimeResult;

async function startResolvedPreviewFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startResolvedPreviewFrontend;

function previewFrontendProcess(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void previewFrontendProcess;

async function resolvePreviewPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void resolvePreviewPort;

function previewResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void previewResult;

async function startPreviewFrontend(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startPreviewFrontend;

function spawnPreviewFrontend(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void spawnPreviewFrontend;

async function detectPreviewPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void detectPreviewPort;

function previewRuntimeResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void previewRuntimeResult;

async function startResolvedPreview(projectDir: string, frontendPort: number) {
  const frontend = startFrontendProcess(projectDir, frontendPort);
  const resolvedFrontendPort = await resolveFrontendRuntime(frontend, frontendPort);
  return buildFrontendRuntimeResult(frontend, resolvedFrontendPort);
}

void startResolvedPreview;

function spawnPreviewProcess(projectDir: string, frontendPort: number) {
  return startFrontendProcess(projectDir, frontendPort);
}

void spawnPreviewProcess;

async function resolveActualPort(frontend: ChildProcess, frontendPort: number) {
  return await resolveFrontendRuntime(frontend, frontendPort);
}

void resolveActualPort;

function actualPortResult(frontend: ChildProcess, frontendPort: number) {
  return buildFrontendRuntimeResult(frontend, frontendPort);
}

void actualPortResult;

export const DemoRuntimeService = {
  async ensureProjectDependencies(projectDir: string): Promise<void> {
    const nodeModules = path.join(projectDir, 'node_modules');
    if (fs.existsSync(nodeModules)) return;

    const existing = dependencyTasks.get(projectDir);
    if (existing) {
      await existing;
      return;
    }

    const task = (async () => {
      try {
        await execFileAsync('npm', ['install'], {
          cwd: projectDir,
          timeout: 600000,
          shell: true,
        });
      } finally {
        dependencyTasks.delete(projectDir);
      }
    })();

    dependencyTasks.set(projectDir, task);
    await task;
  },

  async start(projectDir: string, frontendPort: number): Promise<DemoRuntimeProcesses & { frontendPort: number }> {
    await this.ensureProjectDependencies(projectDir);
    const frontend = spawn('npm', ['run', 'dev', '--', '--port', String(frontendPort)], {
      cwd: projectDir,
      shell: true,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let detectedPort = frontendPort;

    const detectPort = (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/Local:\s+http:\/\/localhost:(\d+)\/?/i);
      if (match) {
        detectedPort = Number(match[1]);
      }
    };

    let sawPortConflict = false;
    const detectRuntimeOutput = (data: Buffer) => {
      const text = data.toString();
      detectPort(data);
      if (text.includes('Port ') && text.includes('is in use')) {
        sawPortConflict = true;
      }
    };

    frontend.stdout?.on('data', detectRuntimeOutput);
    frontend.stderr?.on('data', detectRuntimeOutput);

    const bindLogs = () => {
      frontend.stdout?.on('data', (data: Buffer) => {
        process.stdout.write(data.toString());
      });
      frontend.stderr?.on('data', (data: Buffer) => {
        process.stderr.write(data.toString());
      });
    };

    bindLogs();

    const startedAt = Date.now();
    while (Date.now() - startedAt < 45000) {
      await new Promise(resolve => setTimeout(resolve, 300));

      if (detectedPort !== frontendPort) {
        if (await waitForPort(`http://localhost:${detectedPort}`, 3000)) {
          break;
        }
        continue;
      }

      if (sawPortConflict) {
        continue;
      }

      if (await waitForPort(`http://localhost:${detectedPort}`, 3000)) {
        break;
      }
    }

    return {
      frontend,
      frontendPort: detectedPort,
      url: `http://localhost:${detectedPort}`,
      status: 'running',
      bindLogs,
    };
  },
};
