import fs from 'fs';
import path from 'path';

// 日志类型
export type LogType = 'system' | 'cc-command' | 'cc-response' | 'error' | 'info';

// 日志条目
export interface LogEntry {
  timestamp: string;
  type: LogType;
  message: string;
  data?: any;
}

// 日志配置
const LOG_DIR = path.join(process.cwd(), 'data', 'logs');

// 确保日志目录存在
function ensureLogDir(projectId?: string): string {
  const dir = projectId
    ? path.join(LOG_DIR, projectId)
    : LOG_DIR;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 获取日志文件路径
function getLogFilePath(projectId: string, type: 'system' | 'cc'): string {
  const dir = ensureLogDir(projectId);
  const date = new Date().toISOString().split('T')[0];
  return path.join(dir, `${type}-${date}.log`);
}

// 格式化日志条目
function formatLogEntry(entry: LogEntry): string {
  const dataStr = entry.data ? `\n  DATA: ${JSON.stringify(entry.data, null, 2)}` : '';
  return `[${entry.timestamp}] [${entry.type.toUpperCase()}] ${entry.message}${dataStr}\n`;
}

// 写入日志
function writeLog(projectId: string, type: 'system' | 'cc', entry: LogEntry): void {
  try {
    const filePath = getLogFilePath(projectId, type);
    const logStr = formatLogEntry(entry);
    fs.appendFileSync(filePath, logStr, 'utf-8');
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

// ========== 系统日志 ==========

/**
 * 记录系统信息日志
 */
export function logSystemInfo(projectId: string, message: string, data?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'info',
    message,
    data,
  };
  writeLog(projectId, 'system', entry);
  console.log(`[System][${projectId}] ${message}`, data || '');
}

/**
 * 记录系统错误日志
 */
export function logSystemError(projectId: string, message: string, error?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'error',
    message,
    data: error,
  };
  writeLog(projectId, 'system', entry);
  console.error(`[System Error][${projectId}] ${message}`, error || '');
}

// ========== CC 日志 ==========

/**
 * 记录发送给 CC 的命令
 */
export function logCCCommand(projectId: string, prompt: string, options?: {
  cwd?: string;
  timeout?: number;
  tools?: string[];
  args?: string[];
}): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'cc-command',
    message: '发送命令给 Claude Code',
    data: {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 500) + (prompt.length > 500 ? '...(truncated)' : ''),
      fullPrompt: prompt,
      options,
    },
  };
  writeLog(projectId, 'cc', entry);
  console.log(`[CC Command][${projectId}] 发送命令，长度: ${prompt.length}`);
}

/**
 * 记录 CC 的响应
 */
export function logCCResponse(projectId: string, response: {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'cc-response',
    message: response.success ? 'CC 执行成功' : 'CC 执行失败',
    data: {
      success: response.success,
      duration: response.duration ? `${response.duration}ms` : 'unknown',
      outputLength: response.output?.length || 0,
      outputPreview: response.output?.substring(0, 1000) || '',
      fullOutput: response.output,
      error: response.error,
    },
  };
  writeLog(projectId, 'cc', entry);
  console.log(`[CC Response][${projectId}] ${response.success ? '成功' : '失败'}，耗时: ${response.duration || 'unknown'}ms`);
}

/**
 * 记录 CC 实时输出（流式）
 */
export function logCCStream(projectId: string, chunk: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'cc-response',
    message: 'CC 实时输出',
    data: {
      chunk,
    },
  };
  writeLog(projectId, 'cc', entry);
}

/**
 * 记录 CC 工具调用
 */
export function logCCToolUse(projectId: string, toolName: string, toolInput?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'cc-command',
    message: `CC 调用工具: ${toolName}`,
    data: {
      toolName,
      toolInput,
    },
  };
  writeLog(projectId, 'cc', entry);
  console.log(`[CC Tool][${projectId}] 调用工具: ${toolName}`);
}

/**
 * 记录 CC 文件操作
 */
export function logCCFileOperation(projectId: string, operation: string, filePath: string, content?: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'cc-response',
    message: `CC 文件操作: ${operation}`,
    data: {
      operation,
      filePath,
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 500),
    },
  };
  writeLog(projectId, 'cc', entry);
  console.log(`[CC File][${projectId}] ${operation}: ${filePath}`);
}

/**
 * 记录 CC 进程状态
 */
export function logCCProcess(projectId: string, status: string, details?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'info',
    message: `CC 进程: ${status}`,
    data: details,
  };
  writeLog(projectId, 'cc', entry);
  console.log(`[CC Process][${projectId}] ${status}`, details || '');
}

// ========== 读取日志 ==========

/**
 * 读取项目日志
 */
export function readProjectLogs(projectId: string, type?: 'system' | 'cc'): {
  system: string[];
  cc: string[];
} {
  const result = {
    system: [] as string[],
    cc: [] as string[],
  };

  const projectDir = path.join(LOG_DIR, projectId);
  if (!fs.existsSync(projectDir)) {
    return result;
  }

  const types = type ? [type] : ['system', 'cc'] as const;

  for (const t of types) {
    const files = fs.readdirSync(projectDir)
      .filter(f => f.startsWith(t) && f.endsWith('.log'))
      .sort()
      .reverse();

    for (const file of files) {
      const filePath = path.join(projectDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      result[t].push(`\n=== ${file} ===\n${content}`);
    }
  }

  return result;
}

/**
 * 获取所有项目日志目录
 */
export function listProjectLogs(): string[] {
  if (!fs.existsSync(LOG_DIR)) {
    return [];
  }
  return fs.readdirSync(LOG_DIR).filter(f => {
    const stat = fs.statSync(path.join(LOG_DIR, f));
    return stat.isDirectory();
  });
}

// ========== 全局日志（无项目ID时使用）==========

const GLOBAL_PROJECT_ID = '_global';

/**
 * 记录全局系统日志
 */
export function logGlobal(message: string, data?: any): void {
  logSystemInfo(GLOBAL_PROJECT_ID, message, data);
}

/**
 * 记录全局错误日志
 */
export function logGlobalError(message: string, error?: any): void {
  logSystemError(GLOBAL_PROJECT_ID, message, error);
}