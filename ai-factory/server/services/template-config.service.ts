import path from 'path';

export const TEMPLATE_TYPE = 'ruoyi-vue-pg' as const;
export const TEMPLATE_VERSION = 'inspur-base-main' as const;

export interface RuntimeCommandConfig {
  cwd: string;
  command: string;
  args: string[];
  shell?: boolean;
}

export interface RuoyiTemplateConfig {
  type: typeof TEMPLATE_TYPE;
  version: typeof TEMPLATE_VERSION;
  zipPath: string;
  extractedRootName: string;
  extractedTemplateDir: string;
  templateDir: string;
  sourceTemplateDir: string;
  managedTemplateDir: string;
  warmedTemplateMarker: string;
  frontendCacheMarker: string;
  mavenCacheMarker: string;
  sourceApplicationDevYml: string;
  sourceSqlDir: string;
  sourceFrontendDir: string;
  sourceBackendDir: string;
  backendDirName: string;
  frontendDirName: string;
  backendModuleName: string;
  frontendPackageManager: 'npm';
  frontendInstallArgs: string[];
  mavenWarmupArgs: string[];
  backendStartArgsPrefix: string[];
  frontendStartArgsPrefix: string[];
  generatedProjectRootName: string;
  backendStartPortRange: { start: number; end: number };
  frontendStartPortRange: { start: number; end: number };
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    defaultSchemaPrefix: string;
    redisHost: string;
    redisDatabase: number;
    jdbcBaseUrl: string;
  };
}

const zipPath = path.join(process.cwd(), '..', 'inspur-base-main.zip');
const extractedTemplateDir = path.join(process.cwd(), '..', TEMPLATE_VERSION);
const templateDir = path.join(process.cwd(), 'data', 'templates');
const managedTemplateDir = path.join(templateDir, TEMPLATE_VERSION);
const warmedTemplateMarker = path.join(templateDir, `${TEMPLATE_VERSION}.warmed`);
const sourceTemplateDir = path.join(templateDir, `${TEMPLATE_VERSION}-source`);
const frontendCacheMarker = path.join(templateDir, `${TEMPLATE_VERSION}.frontend-cache`);
const mavenCacheMarker = path.join(templateDir, `${TEMPLATE_VERSION}.maven-cache`);
const sourceApplicationDevYml = path.join(extractedTemplateDir, 'backend', 'inspur-admin', 'src', 'main', 'resources', 'application-dev.yml');
const sourceFrontendDir = path.join(extractedTemplateDir, 'frontend');
const sourceBackendDir = path.join(extractedTemplateDir, 'backend');
const postgresJdbcBaseUrl = 'jdbc:postgresql://172.22.4.4:8341/postgres?useUnicode=true&characterEncoding=utf8&zeroDateTimeBehavior=convertToNull&useSSL=false&sslmode=disable&connectTimeout=5000&socketTimeout=30000&serverTimezone=Asia/Shanghai';
const redisHost = '172.22.4.31';
const redisDatabase = 5;
const postgresUsername = 'postgres';
const postgresPassword = 'postgres';
const frontendPackageManager = 'npm';
const frontendInstallArgs = ['install'];
const mavenWarmupArgs = ['-q', '-DskipTests', 'dependency:go-offline'];
const backendRunArgsPrefix = ['-pl', 'inspur-admin', '-am', 'spring-boot:run'];
const frontendRunArgsPrefix = ['run', 'dev', '--', '--host', '0.0.0.0'];
const sourceSqlDir = path.join(extractedTemplateDir, 'backend', 'sql');
const sourceFrontendPackageJson = path.join(sourceFrontendDir, 'package.json');
const sourceBackendPom = path.join(sourceBackendDir, 'pom.xml');
const generatedProjectRootName = 'generated';
const backendDirName = 'backend';
const frontendDirName = 'frontend';
const backendModuleName = 'inspur-admin';
const backendPortRange = { start: 10000, end: 10999 };
const frontendPortRange = { start: 3001, end: 3999 };
const defaultSchemaPrefix = 'proj_';
const defaultDatabaseName = 'postgres';
const defaultHost = '172.22.4.4';
const defaultPort = 8341;
const extractedRootName = TEMPLATE_VERSION;
const templateSourceDir = extractedTemplateDir;
const templatePreparedDir = managedTemplateDir;
const warmupWorkingDir = sourceTemplateDir;
const templateSourceBackendDir = sourceBackendDir;
const templateSourceFrontendDir = sourceFrontendDir;
const templateSourceYmlPath = sourceApplicationDevYml;
const templateSourceSqlDir = sourceSqlDir;
const frontendWarmupArgs = frontendInstallArgs;
const mavenWarmupGoalArgs = mavenWarmupArgs;
const backendStartArgsPrefix = backendRunArgsPrefix;
const frontendStartArgsPrefix = frontendRunArgsPrefix;
const templateVersion = TEMPLATE_VERSION;
const templateType = TEMPLATE_TYPE;
const templateZipPath = zipPath;
const templateExtractedDir = extractedTemplateDir;
const templateManagedDir = managedTemplateDir;
const templateWarmMarker = warmedTemplateMarker;
const templateFrontendCacheMarker = frontendCacheMarker;
const templateMavenCacheMarker = mavenCacheMarker;
const templateSourceCopyDir = sourceTemplateDir;
const databaseHost = defaultHost;
const databasePort = defaultPort;
const databaseName = defaultDatabaseName;
const databaseUser = postgresUsername;
const databasePass = postgresPassword;
const baseJdbcUrl = postgresJdbcBaseUrl;
const baseRedisHost = redisHost;
const baseRedisDatabase = redisDatabase;
const outputProjectRootName = generatedProjectRootName;
const sourceRootName = extractedRootName;
const managedRootName = templateVersion;
const backendName = backendDirName;
const frontendName = frontendDirName;
const backendModule = backendModuleName;
const backendStartPortRange = backendPortRange;
const frontendStartPortRange = frontendPortRange;
const schemaPrefix = defaultSchemaPrefix;
const currentSourceTemplateDir = templateSourceDir;
const currentManagedTemplateDir = templateManagedDir;
const currentWarmMarker = templateWarmMarker;
const currentFrontendCacheMarker = templateFrontendCacheMarker;
const currentMavenCacheMarker = templateMavenCacheMarker;
const currentBaseJdbcUrl = baseJdbcUrl;
const currentSourceYmlPath = templateSourceYmlPath;
const currentSourceSqlDir = templateSourceSqlDir;
const currentSourceFrontendPackageJson = sourceFrontendPackageJson;
const currentSourceBackendPom = sourceBackendPom;
const currentTemplateZipPath = templateZipPath;

function validateRuoyiConfig(config: RuoyiTemplateConfig): RuoyiTemplateConfig {
  const requiredStringFields: Array<keyof RuoyiTemplateConfig> = [
    'type',
    'version',
    'zipPath',
    'extractedRootName',
    'extractedTemplateDir',
    'templateDir',
    'sourceTemplateDir',
    'managedTemplateDir',
    'warmedTemplateMarker',
    'frontendCacheMarker',
    'mavenCacheMarker',
    'sourceApplicationDevYml',
    'sourceSqlDir',
    'sourceFrontendDir',
    'sourceBackendDir',
    'backendDirName',
    'frontendDirName',
    'backendModuleName',
    'frontendPackageManager',
    'generatedProjectRootName',
  ];

  for (const field of requiredStringFields) {
    const value = config[field];
    if (typeof value !== 'string' || !value) {
      throw new Error(`Ruoyi 模板配置缺失: ${String(field)}`);
    }
  }

  return config;
}

export const TemplateConfigService = {
  getRuoyiConfig(): RuoyiTemplateConfig {
    return validateRuoyiConfig({
      type: TEMPLATE_TYPE,
      version: TEMPLATE_VERSION,
      zipPath,
      extractedRootName: TEMPLATE_VERSION,
      extractedTemplateDir,
      templateDir,
      sourceTemplateDir,
      managedTemplateDir,
      warmedTemplateMarker,
      frontendCacheMarker,
      mavenCacheMarker,
      sourceApplicationDevYml,
      sourceSqlDir,
      sourceFrontendDir,
      sourceBackendDir,
      backendDirName: 'backend',
      frontendDirName: 'frontend',
      backendModuleName: 'inspur-admin',
      frontendPackageManager,
      frontendInstallArgs,
      mavenWarmupArgs,
      backendStartArgsPrefix,
      frontendStartArgsPrefix,
      generatedProjectRootName,
      backendStartPortRange: { start: 10000, end: 10999 },
      frontendStartPortRange: { start: 3001, end: 3999 },
      database: {
        host: defaultHost,
        port: defaultPort,
        database: defaultDatabaseName,
        username: postgresUsername,
        password: postgresPassword,
        defaultSchemaPrefix: defaultSchemaPrefix,
        redisHost,
        redisDatabase,
        jdbcBaseUrl: postgresJdbcBaseUrl,
      },
    });
  },

  getProjectRuntime(projectDir: string, backendPort: number, frontendPort: number) {
    const config = this.getRuoyiConfig();
    const backendDir = path.join(projectDir, config.backendDirName);
    const backendModuleDir = path.join(backendDir, config.backendModuleName);
    const frontendDir = path.join(projectDir, config.frontendDirName);

    const backend: RuntimeCommandConfig = {
      cwd: backendModuleDir,
      command: process.platform === 'win32' ? 'mvn.cmd' : 'mvn',
      args: ['spring-boot:run', `-Dspring-boot.run.jvmArguments=-Dserver.port=${backendPort}`],
      shell: process.platform === 'win32',
    };

    const frontend: RuntimeCommandConfig = {
      cwd: frontendDir,
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args: ['run', 'dev', '--', '--host', '0.0.0.0', '--port', String(frontendPort)],
      shell: process.platform === 'win32',
    };

    return { backend, frontend };
  },

  buildSchemaName(projectId: string): string {
    const prefix = this.getRuoyiConfig().database.defaultSchemaPrefix;
    return `${prefix}${projectId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
  },
};
