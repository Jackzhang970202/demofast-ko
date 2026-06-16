/**
 * 项目执行状态跟踪服务
 * 用于管理 CC 进程的生命周期、终止和恢复
 */

import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import { ProcessHealthService } from './process-health.service';

// 项目执行状态
export interface ProjectExecutionState {
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'terminated' | 'error';
  currentStage: 'clarification' | 'spec' | 'demo-developer' | 'pm' | 'uiue' | 'architect' | 'developer' | 'finished';
  startTime: number;
  endTime?: number;
  pid?: number;  // CC 进程 PID
  conversationId?: string;  // CC 会话ID（用于恢复）
  lastPrompt?: string;  // 最后发送的 prompt（用于恢复）
  error?: string;
  checkpoints: Checkpoint[];
}

export interface Checkpoint {
  stage: string;
  timestamp: number;
  summary: string;
  filesGenerated: number;
  completed: boolean;
}

// 运行中的进程管理
const runningProcesses: Map<string, ChildProcess> = new Map();

// 健康检查是否已初始化
let healthServiceInitialized = false;

// 状态文件路径
function getStateFilePath(projectId: string): string {
  return path.join(process.cwd(), 'data', 'projects', projectId, 'execution-state.json');
}

// 获取项目执行状态
export function getExecutionState(projectId: string): ProjectExecutionState | null {
  const filePath = getStateFilePath(projectId);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// 保存项目执行状态
export function saveExecutionState(state: ProjectExecutionState): void {
  const filePath = getStateFilePath(state.projectId);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const safeState = {
    ...state,
    checkpoints: (state.checkpoints || []).map((checkpoint) => ({
      filesGenerated: 0,
      ...checkpoint,
    })),
  };
  fs.writeFileSync(filePath, JSON.stringify(safeState, null, 2));
}

// 注册运行中的进程
export function registerProcess(projectId: string, process: ChildProcess): void {
  runningProcesses.set(projectId, process);

  // 初始化健康检查服务（只初始化一次）
  if (!healthServiceInitialized) {
    ProcessHealthService.init(runningProcesses);
    healthServiceInitialized = true;
  }

  // 更新状态
  const state = getExecutionState(projectId) || createInitialState(projectId);
  state.status = 'running';
  state.pid = process.pid;
  saveExecutionState(state);

  // 监听进程退出
  process.on('exit', (code) => {
    runningProcesses.delete(projectId);
    const currentState = getExecutionState(projectId);
    if (currentState) {
      currentState.status = code === 0 ? 'completed' : (code === null ? 'terminated' : 'error');
      currentState.endTime = Date.now();
      currentState.pid = undefined;
      if (code !== 0 && code !== null) {
        currentState.error = `Process exited with code ${code}`;
      }
      saveExecutionState(currentState);
    }
  });
}

// 终止项目执行
export function terminateProject(projectId: string): { success: boolean; message: string } {
  const process = runningProcesses.get(projectId);

  if (!process) {
    // 检查状态文件
    const state = getExecutionState(projectId);
    if (!state) {
      return { success: false, message: '项目不存在' };
    }
    if (state.status === 'completed') {
      return { success: false, message: '项目已完成，无法终止' };
    }
    if (state.status === 'terminated') {
      return { success: false, message: '项目已终止' };
    }
    return { success: false, message: '没有运行中的进程' };
  }

  try {
    // Windows 上需要强制终止
    process.kill('SIGTERM');

    // 更新状态
    const state = getExecutionState(projectId);
    if (state) {
      state.status = 'terminated';
      state.endTime = Date.now();
      state.pid = undefined;
      saveExecutionState(state);
    }

    runningProcesses.delete(projectId);
    return { success: true, message: '进程已终止' };
  } catch (err: any) {
    return { success: false, message: `终止失败: ${err.message}` };
  }
}

// 创建初始状态
function createInitialState(projectId: string): ProjectExecutionState {
  return {
    projectId,
    status: 'pending',
    currentStage: 'clarification',
    startTime: Date.now(),
    checkpoints: [],
  };
}

// 添加检查点
export function addCheckpoint(projectId: string, checkpoint: Checkpoint): void {
  const state = getExecutionState(projectId) || createInitialState(projectId);
  state.checkpoints.push(checkpoint);
  state.currentStage = checkpoint.stage as any;
  saveExecutionState(state);
}

// 更新阶段状态
export function updateStage(projectId: string, stage: ProjectExecutionState['currentStage']): void {
  const state = getExecutionState(projectId) || createInitialState(projectId);
  state.currentStage = stage;
  saveExecutionState(state);
}

// 获取所有运行中的项目
export function getRunningProjects(): string[] {
  return Array.from(runningProcesses.keys());
}

// 检查是否有运行中的进程
export function hasRunningProcess(projectId: string): boolean {
  return runningProcesses.has(projectId);
}

// 获取进程状态摘要（用于前端显示）
export function getProjectStatusSummary(projectId: string): {
  canResume: boolean;
  canTerminate: boolean;
  currentProgress: string;
  lastCheckpoint: string;
} {
  const state = getExecutionState(projectId);
  const isRunning = hasRunningProcess(projectId);

  if (!state) {
    return {
      canResume: false,
      canTerminate: false,
      currentProgress: '未开始',
      lastCheckpoint: '',
    };
  }

  const lastCheckpoint = state.checkpoints.length > 0
    ? state.checkpoints[state.checkpoints.length - 1].summary
    : '';

  return {
    canResume: !isRunning && state.status !== 'completed' && state.checkpoints.length > 0,
    canTerminate: isRunning,
    currentProgress: `${state.currentStage} (${state.status})`,
    lastCheckpoint,
  };
}

// 重置执行状态为待重试（用于超时后重新执行）
export function resetExecutionState(projectId: string): void {
  const state = getExecutionState(projectId);
  if (!state) return;
  // 保留 checkpoint 记录，但清除错误状态，允许重新执行
  state.status = 'pending';
  state.error = undefined;
  state.endTime = undefined;
  state.pid = undefined;
  state.conversationId = undefined;
  saveExecutionState(state);
}

// 获取健康报告
export function getHealthReport() {
  return ProcessHealthService.getHealthReport();
}

// 手动触发健康检查
export function triggerHealthCheck() {
  ProcessHealthService.triggerCheck();
}

// 手动触发僵尸进程清理
export function triggerCleanup() {
  ProcessHealthService.triggerCleanup();
}