import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { TemplateConfigService } from './template-config.service';

const execFileAsync = promisify(execFile);

interface ProvisionResult {
  projectDir: string;
  schemaName: string;
  managedTemplateDir: string;
}

function buildPsqlCommand(sqlFile: string, host: string, port: number, database: string, username: string) {
  return {
    command: process.platform === 'win32' ? 'psql.exe' : 'psql',
    args: ['-h', host, '-p', String(port), '-U', username, '-d', database, '-v', 'ON_ERROR_STOP=1', '-f', sqlFile],
  };
}

async function runSqlFile(sqlFile: string, host: string, port: number, database: string, username: string, password: string) {
  const psql = buildPsqlCommand(sqlFile, host, port, database, username);
  await execFileAsync(psql.command, psql.args, {
    timeout: 1800000,
    shell: false,
    env: {
      ...process.env,
      PGPASSWORD: password,
    },
  });
}

function createSearchPathWrapper(schemaName: string, sourceSql: string): string {
  const wrapperPath = path.join(os.tmpdir(), `ruoyi-${schemaName}-${Date.now()}-${path.basename(sourceSql)}`);
  const sourceContent = fs.readFileSync(sourceSql, 'utf-8');
  const wrapperContent = `create schema if not exists ${schemaName};\nset search_path to ${schemaName}, public;\n\n${sourceContent}`;
  fs.writeFileSync(wrapperPath, wrapperContent, 'utf-8');
  return wrapperPath;
}

function getSchemaNameFromProject(projectDir: string): string | null {
  const agentsGuide = path.join(projectDir, 'AGENTS.md');
  if (!fs.existsSync(agentsGuide)) return null;
  const content = fs.readFileSync(agentsGuide, 'utf-8');
  const match = content.match(/当前项目 schema：`([^`]+)`/);
  return match ? match[1] : null;
}

export async function initializeProjectSchema(projectDir: string) {
  const config = TemplateConfigService.getRuoyiConfig();
  const schemaName = getSchemaNameFromProject(projectDir);
  if (!schemaName) return;

  const sqlDir = path.join(projectDir, config.backendDirName, 'sql');
  const baseSql = path.join(sqlDir, 'inspur_postgresql_20250624.sql');
  const quartzSql = path.join(sqlDir, 'inspur_postgresql_quartz_20250625.sql');
  const medicalSql = path.join(sqlDir, 'medical_postgresql_init.sql');
  if (fs.existsSync(baseSql)) {
    const wrapped = createSearchPathWrapper(schemaName, baseSql);
    await runSqlFile(wrapped, config.database.host, config.database.port, config.database.database, config.database.username, config.database.password);
  }
  if (fs.existsSync(quartzSql)) {
    const wrapped = createSearchPathWrapper(schemaName, quartzSql);
    await runSqlFile(wrapped, config.database.host, config.database.port, config.database.database, config.database.username, config.database.password);
  }
  if (fs.existsSync(medicalSql)) {
    const wrapped = createSearchPathWrapper(schemaName, medicalSql);
    await runSqlFile(wrapped, config.database.host, config.database.port, config.database.database, config.database.username, config.database.password);
  }
}

export function cleanupFrontendProcesses() {}

export function cleanupBackendProcesses() {}

export const TemplateProvisionService = {
  async ensureManagedTemplate(): Promise<string> {
    const config = TemplateConfigService.getRuoyiConfig();

    if (fs.existsSync(config.warmedTemplateMarker) && fs.existsSync(config.managedTemplateDir)) {
      return config.managedTemplateDir;
    }

    fs.mkdirSync(config.templateDir, { recursive: true });

    if (!fs.existsSync(config.extractedTemplateDir)) {
      await execFileAsync('python', ['-c', [
        'import zipfile',
        `z=zipfile.ZipFile(r"${config.zipPath.replace(/\\/g, '\\\\')}")`,
        `z.extractall(r"${path.dirname(config.extractedTemplateDir).replace(/\\/g, '\\\\')}")`,
      ].join(';')], {
        timeout: 600000,
      });
    }

    this.patchTemplateConfig(config.extractedTemplateDir, TemplateConfigService.buildSchemaName('template'));

    if (fs.existsSync(config.sourceTemplateDir)) {
      fs.rmSync(config.sourceTemplateDir, { recursive: true, force: true });
    }
    fs.cpSync(config.extractedTemplateDir, config.sourceTemplateDir, { recursive: true });

    if (fs.existsSync(config.managedTemplateDir)) {
      fs.rmSync(config.managedTemplateDir, { recursive: true, force: true });
    }
    fs.cpSync(config.sourceTemplateDir, config.managedTemplateDir, { recursive: true });

    this.patchTemplateConfig(config.managedTemplateDir, TemplateConfigService.buildSchemaName('template'));

    fs.writeFileSync(config.warmedTemplateMarker, new Date().toISOString(), 'utf-8');
    return config.managedTemplateDir;
  },

  async provisionProject(projectDir: string, projectId: string): Promise<ProvisionResult> {
    const managedTemplateDir = await this.ensureManagedTemplate();
    const schemaName = TemplateConfigService.buildSchemaName(projectId);

    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    fs.mkdirSync(path.dirname(projectDir), { recursive: true });
    fs.cpSync(managedTemplateDir, projectDir, { recursive: true });
    this.patchTemplateConfig(projectDir, schemaName);
    this.writeAgentsGuide(projectDir, schemaName);

    return { projectDir, schemaName, managedTemplateDir };
  },

  patchTemplateConfig(projectDir: string, schemaName: string): void {
    const config = TemplateConfigService.getRuoyiConfig();
    const ymlPath = path.join(projectDir, config.backendDirName, config.backendModuleName, 'src', 'main', 'resources', 'application-dev.yml');
    const content = fs.readFileSync(ymlPath, 'utf-8');
    const jdbcUrl = `${config.database.jdbcBaseUrl}&currentSchema=${schemaName}`;

    const lines = content.split(/\r?\n/);
    let inMaster = false;
    let inRedis = false;

    const next = lines.map((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('master:')) {
        inMaster = true;
        inRedis = false;
        return line;
      }
      if (trimmed.startsWith('redis:')) {
        inMaster = false;
        inRedis = true;
        return line;
      }
      if (/^[A-Za-z]/.test(trimmed) && !trimmed.startsWith('url:') && !trimmed.startsWith('username:') && !trimmed.startsWith('password:') && !trimmed.startsWith('host:') && !trimmed.startsWith('database:')) {
        inMaster = false;
        inRedis = false;
      }

      if (inMaster && trimmed.startsWith('url:')) {
        return line.replace(/url:\s*.*/, `url: ${jdbcUrl}`);
      }
      if (inMaster && trimmed.startsWith('username:')) {
        return line.replace(/username:\s*.*/, `username: ${config.database.username}`);
      }
      if (inMaster && trimmed.startsWith('password:')) {
        return line.replace(/password:\s*.*/, `password: ${config.database.password}`);
      }
      if (inRedis && trimmed.startsWith('host:')) {
        return line.replace(/host:\s*.*/, `host: ${config.database.redisHost}`);
      }
      if (inRedis && trimmed.startsWith('database:')) {
        return line.replace(/database:\s*.*/, `database: ${config.database.redisDatabase}`);
      }

      return line;
    }).join('\n');

    fs.writeFileSync(ymlPath, next, 'utf-8');
  },

  writeAgentsGuide(projectDir: string, schemaName: string): void {
    const config = TemplateConfigService.getRuoyiConfig();
    const content = `# AGENTS.md\n\n## 基座\n\n本项目基于若依衍生模板 \`${config.version}\`。\n\n## 开发约束\n\n1. 必须在现有 backend/frontend 结构中增量开发\n2. 优先复用现有 Controller/Service/Mapper/Vue 页面模式\n3. 数据库统一使用 PostgreSQL \`${config.database.database}\`\n4. 数据库地址固定为 \`${config.database.host}:${config.database.port}\`\n5. 当前项目 schema：\`${schemaName}\`\n6. 禁止将功能写成独立 demo 或重建新架构\n`;
    fs.writeFileSync(path.join(projectDir, 'AGENTS.md'), content, 'utf-8');
  },
};
