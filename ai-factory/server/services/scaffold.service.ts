import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { TemplateProvisionService } from './template-provision.service';
import { TemplateConfigService } from './template-config.service';

const execFileAsync = promisify(execFile);
const NPM_MIRROR = 'https://registry.npmmirror.com';
const INSTALL_TIMEOUT = 600000;
const MAX_RETRIES = 2;

interface ScaffoldOptions {
  projectId: string;
  projectName: string;
  targetDir: string;
}

interface ScaffoldResult {
  success: boolean;
  path: string;
  error?: string;
  retries?: number;
  schemaName?: string;
  managedTemplateDir?: string;
}

interface InstallResult {
  success: boolean;
  installed: string[];
  failed: string[];
}

export const ScaffoldService = {
  async createScaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    const { projectId, targetDir } = options;

    try {
      const result = await TemplateProvisionService.provisionProject(targetDir, projectId);
      this.cleanReservedFilenames(targetDir);
      return {
        success: true,
        path: targetDir,
        retries: 0,
        schemaName: result.schemaName,
        managedTemplateDir: result.managedTemplateDir,
      };
    } catch (error: any) {
      return {
        success: false,
        path: targetDir,
        error: error.message,
        retries: 0,
      };
    }
  },

  async checkScaffolded(targetDir: string): Promise<boolean> {
    const config = TemplateConfigService.getRuoyiConfig();
    const backendPom = path.join(targetDir, config.backendDirName, 'pom.xml');
    const frontendPackage = path.join(targetDir, config.frontendDirName, 'package.json');
    return fs.existsSync(backendPom) && fs.existsSync(frontendPackage);
  },

  async installDependencies(
    targetDir: string,
    dependencies: string[] = [],
    devDependencies: string[] = []
  ): Promise<InstallResult> {
    const config = TemplateConfigService.getRuoyiConfig();
    const frontendDir = path.join(targetDir, config.frontendDirName);
    const result: InstallResult = {
      success: true,
      installed: [],
      failed: [],
    };

    try {
      await execFileAsync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--registry', NPM_MIRROR], {
        cwd: frontendDir,
        timeout: INSTALL_TIMEOUT,
        shell: process.platform === 'win32',
      });
      result.installed.push('frontend base dependencies');
    } catch (error: any) {
      result.success = false;
      result.failed.push(`frontend base dependencies: ${error.message}`);
    }

    const extra = [...dependencies, ...devDependencies];
    if (extra.length > 0) {
      const installResult = await this.installWithRetry(frontendDir, extra);
      if (installResult.success) {
        result.installed.push(...extra);
      } else {
        result.success = false;
        result.failed.push(...extra);
      }
    }

    return result;
  },

  async installWithRetry(targetDir: string, packages: string[]): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await execFileAsync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', ...packages, '--registry', NPM_MIRROR], {
          cwd: targetDir,
          timeout: INSTALL_TIMEOUT,
          shell: process.platform === 'win32',
        });
        return { success: true };
      } catch (error: any) {
        if (attempt === MAX_RETRIES) {
          return { success: false, error: error.message };
        }
      }
    }

    return { success: false, error: '未知错误' };
  },

  cleanReservedFilenames(targetDir: string): void {
    const reservedNames = ['nul', 'con', 'prn', 'aux', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];

    for (const name of reservedNames) {
      const filePath = path.join(targetDir, name);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
        }
      }
    }
  },

  getScaffoldStructure(): string {
    return `
backend/
├── inspur-admin/
├── inspur-framework/
├── inspur-system/
└── sql/
frontend/
├── src/views/
├── src/api/
├── src/store/
└── src/router/
AGENTS.md
    `;
  },

  getScaffoldFiles(targetDir: string): string[] {
    const files: string[] = [];

    const scan = (dir: string, base: string = targetDir) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === 'target' || entry.name.startsWith('.')) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scan(fullPath, base);
        } else {
          const relativePath = path.relative(base, fullPath).replace(/\\/g, '/');
          files.push(relativePath);
        }
      }
    };

    scan(targetDir);
    return files;
  },
};
