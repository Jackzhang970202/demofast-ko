import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { TemplateConfigService } from './template-config.service';
import { TemplateProvisionService } from './template-provision.service';

const execFileAsync = promisify(execFile);

export interface PreflightCheckResult {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; detail: string }>;
}

export const EnvironmentPreflightService = {
  async runChecks(): Promise<PreflightCheckResult> {
    const config = TemplateConfigService.getRuoyiConfig();
    const checks: PreflightCheckResult['checks'] = [];

    checks.push(await this.checkCommand('java', process.platform === 'win32' ? 'java.exe' : 'java', ['-version']));
    checks.push(await this.checkCommand('maven', process.platform === 'win32' ? 'mvn.cmd' : 'mvn', ['-v']));
    checks.push(await this.checkCommand('node', process.platform === 'win32' ? 'node.exe' : 'node', ['-v']));
    checks.push(await this.checkCommand('npm', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['-v']));
    checks.push({ name: 'ruoyi-zip', ok: fs.existsSync(config.zipPath), detail: config.zipPath });
    checks.push({ name: 'ruoyi-extracted', ok: fs.existsSync(config.extractedTemplateDir), detail: config.extractedTemplateDir });
    checks.push({ name: 'managed-template', ok: fs.existsSync(config.managedTemplateDir), detail: config.managedTemplateDir });
    checks.push({ name: 'postgres-config', ok: true, detail: `${config.database.host}:${config.database.port}/${config.database.database}` });

    return { ok: checks.every(item => item.ok), checks };
  },

  async warmupTemplateEnvironment(): Promise<{ sourceTemplateDir: string; managedTemplateDir: string; warmed: string[] }> {
    const config = TemplateConfigService.getRuoyiConfig();
    await TemplateProvisionService.ensureManagedTemplate();

    const warmed: string[] = [];

    await execFileAsync(process.platform === 'win32' ? 'npm.cmd' : 'npm', config.frontendInstallArgs, {
      cwd: config.sourceFrontendDir,
      timeout: 600000,
      shell: process.platform === 'win32',
    });
    fs.writeFileSync(path.join(config.sourceFrontendDir, '.warmup-dev-mode'), 'vite dev ready', 'utf-8');
    fs.writeFileSync(config.frontendCacheMarker, new Date().toISOString(), 'utf-8');
    warmed.push('frontend-dependencies');

    await execFileAsync(process.platform === 'win32' ? 'mvn.cmd' : 'mvn', config.mavenWarmupArgs, {
      cwd: config.sourceBackendDir,
      timeout: 600000,
      shell: process.platform === 'win32',
    });
    fs.writeFileSync(path.join(config.sourceBackendDir, '.warmup-dev-mode'), 'spring-boot:run ready', 'utf-8');
    fs.writeFileSync(config.mavenCacheMarker, new Date().toISOString(), 'utf-8');
    warmed.push('maven-dependencies');

    if (fs.existsSync(config.managedTemplateDir)) {
      fs.rmSync(config.managedTemplateDir, { recursive: true, force: true });
    }
    fs.cpSync(config.sourceTemplateDir, config.managedTemplateDir, { recursive: true });
    warmed.push('managed-template-refresh');

    return {
      sourceTemplateDir: config.sourceTemplateDir,
      managedTemplateDir: config.managedTemplateDir,
      warmed,
    };
  },

  async warmupDependencies(projectDir: string): Promise<void> {
    const config = TemplateConfigService.getRuoyiConfig();
    const frontendDir = path.join(projectDir, config.frontendDirName);
    const backendDir = path.join(projectDir, config.backendDirName);

    await execFileAsync(process.platform === 'win32' ? 'npm.cmd' : 'npm', config.frontendInstallArgs, {
      cwd: frontendDir,
      timeout: 600000,
      shell: process.platform === 'win32',
    });

    await execFileAsync(process.platform === 'win32' ? 'mvn.cmd' : 'mvn', config.mavenWarmupArgs, {
      cwd: backendDir,
      timeout: 600000,
      shell: process.platform === 'win32',
    });
  },

  async checkCommand(name: string, command: string, args: string[]) {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, {
        timeout: 30000,
        shell: process.platform === 'win32',
      });
      const detail = [stdout, stderr].filter(Boolean).join('\n').trim().split('\n')[0] || 'ok';
      return { name, ok: true, detail };
    } catch (error: any) {
      return { name, ok: false, detail: error.message };
    }
  },
};
