import { spawn, ChildProcess, execFile } from 'child_process';
import { promisify } from 'util';
import { TemplateConfigService } from './template-config.service';
import { cleanupBackendProcesses, cleanupFrontendProcesses, initializeProjectSchema } from './template-provision.service';
import path from 'path';
import fs from 'fs';
import type { RuntimeCommandConfig } from './template-config.service';

const backendBuildTasks = new Map<string, Promise<void>>();
const backendRuntimeArgs = new Map<string, RuntimeCommandConfig>();
const frontendRuntimeArgs = new Map<string, RuntimeCommandConfig>();

export function getRuntimeCommand(projectDir: string, kind: 'backend' | 'frontend'): RuntimeCommandConfig | null {
  const store = kind === 'backend' ? backendRuntimeArgs : frontendRuntimeArgs;
  return store.get(projectDir) || null;
}

async function ensureBackendBuild(projectDir: string): Promise<void> {
  const existingTask = backendBuildTasks.get(projectDir);
  if (existingTask) {
    await existingTask;
    return;
  }

  const config = TemplateConfigService.getRuoyiConfig();
  const backendDir = path.join(projectDir, config.backendDirName);
  const backendJar = path.join(backendDir, config.backendModuleName, 'target');
  const buildTask = (async () => {
    try {
      await execFileAsync('mvn', ['-pl', config.backendModuleName, '-am', '-DskipTests', 'clean', 'package'], {
        cwd: backendDir,
        timeout: 1800000,
        shell: true,
      });
      if (!fs.existsSync(backendJar)) {
        throw new Error('后端构建产物目录不存在');
      }
    } catch (error: any) {
      throw new Error(`后端构建失败: ${error.message}`);
    } finally {
      backendBuildTasks.delete(projectDir);
    }
  })();

  backendBuildTasks.set(projectDir, buildTask);
  await buildTask;
}

function createRuntime(projectDir: string, frontendPort: number, backendPort: number) {
  const runtime = TemplateConfigService.getProjectRuntime(projectDir, backendPort, frontendPort);
  backendRuntimeArgs.set(projectDir, runtime.backend);
  frontendRuntimeArgs.set(projectDir, runtime.frontend);
  return runtime;
}

async function waitForPort(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (response.ok || response.status < 500) {
        return true;
      }
    } catch {
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  return false;
}

async function waitForFrontendPort(frontendPort: number): Promise<number> {
  const candidates = [frontendPort, frontendPort + 1, frontendPort + 2];
  for (const port of candidates) {
    const ready = await waitForPort(`http://localhost:${port}`, 5000);
    if (ready) {
      return port;
    }
  }
  return frontendPort;
}

function updateProjectProxy(projectDir: string, backendPort: number) {
  const viteConfigPath = path.join(projectDir, 'frontend', 'vite.config.js');
  if (!fs.existsSync(viteConfigPath)) {
    return;
  }

  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
  const nextViteConfig = viteConfig.replace(/const baseUrl = 'http:\/\/localhost:\d+'/g, `const baseUrl = 'http://localhost:${backendPort}'`);
  if (nextViteConfig !== viteConfig) {
    fs.writeFileSync(viteConfigPath, nextViteConfig, 'utf-8');
  }
}

function bindProcessLifecycle(frontend: ChildProcess, backend: ChildProcess) {
  backend.on('exit', () => {
    if (!frontend.killed) {
      frontend.kill();
    }
  });

  frontend.on('exit', () => {
    if (!backend.killed) {
      backend.kill();
    }
  });
}

function spawnRuntimeProcess(runtime: RuntimeCommandConfig, extraEnv: Record<string, string> = {}) {
  return spawn(runtime.command, runtime.args, {
    cwd: runtime.cwd,
    shell: runtime.shell,
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function prepareRuntime(projectDir: string, frontendPort: number, backendPort: number) {
  cleanupFrontendProcesses(projectDir);
  cleanupBackendProcesses(projectDir);
  await initializeProjectSchema(projectDir);
  await ensureBackendBuild(projectDir);
  updateProjectProxy(projectDir, backendPort);
  return createRuntime(projectDir, frontendPort, backendPort);
}

async function resolveStartedFrontendPort(frontendPort: number): Promise<number> {
  return await waitForFrontendPort(frontendPort);
}

async function startRuoyiRuntime(projectDir: string, frontendPort: number, backendPort: number): Promise<RuntimeProcesses & { frontendPort: number }> {
  const runtime = await prepareRuntime(projectDir, frontendPort, backendPort);
  const backend = spawnRuntimeProcess(runtime.backend);
  const frontend = spawnRuntimeProcess(runtime.frontend, {
    __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: '*',
  });

  bindProcessLifecycle(frontend, backend);
  const resolvedFrontendPort = await resolveStartedFrontendPort(frontendPort);

  return { frontend, backend, frontendPort: resolvedFrontendPort };
}

const execFileAsync = promisify(execFile);
const dependencyInstallTasks = new Map<string, Promise<void>>();

export interface RuntimeProcesses {
  frontend?: ChildProcess;
  backend?: ChildProcess;
}

export const RuntimeService = {
  async ensureProjectDependencies(projectDir: string): Promise<void> {
    const config = TemplateConfigService.getRuoyiConfig();
    const frontendDir = path.join(projectDir, config.frontendDirName);
    const frontendNodeModules = path.join(frontendDir, 'node_modules');

    if (fs.existsSync(frontendNodeModules)) {
      return;
    }

    const existingTask = dependencyInstallTasks.get(projectDir);
    if (existingTask) {
      await existingTask;
      return;
    }

    const installTask = (async () => {
      try {
        await execFileAsync('npm', config.frontendInstallArgs, {
          cwd: frontendDir,
          timeout: 600000,
          shell: true,
        });
      } catch (error: any) {
        throw new Error(`前端依赖自动安装失败: ${error.message}`);
      } finally {
        dependencyInstallTasks.delete(projectDir);
      }
    })();

    dependencyInstallTasks.set(projectDir, installTask);
    await installTask;
  },

  async startRuoyi(projectDir: string, frontendPort: number, backendPort: number): Promise<RuntimeProcesses & { frontendPort: number }> {
    await this.ensureProjectDependencies(projectDir);
    return await startRuoyiRuntime(projectDir, frontendPort, backendPort);
  },
};

