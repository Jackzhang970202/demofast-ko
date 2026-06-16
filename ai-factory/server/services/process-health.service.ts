/**
 * 进程健康检查服务
 * 定期检查运行中的进程状态，清理僵尸进程
 */

import { ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

interface ProcessHealthInfo {
  projectId: string;
  pid: number | undefined;
  status: 'alive' | 'dead' | 'unknown';
  lastCheck: number;
  uptimeMs: number;
}

interface HealthCheckConfig {
  checkIntervalMs: number;      // 检查间隔（默认 30 秒）
  maxProcessAgeMs: number;      // 最大进程存活时间（默认 90 分钟）
  cleanupIntervalMs: number;    // 清理间隔（默认 5 分钟）
}

const DEFAULT_CONFIG: HealthCheckConfig = {
  checkIntervalMs: 30 * 1000,           // 30 秒
  maxProcessAgeMs: 90 * 60 * 1000,      // 90 分钟
  cleanupIntervalMs: 5 * 60 * 1000,     // 5 分钟
};

// 进程注册表（外部传入）
let processRegistry: Map<string, ChildProcess> | null = null;

// 健康状态记录
const healthRecords: Map<string, ProcessHealthInfo> = new Map();

// 定时器
let checkTimer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

// 配置
let config = DEFAULT_CONFIG;

/**
 * 进程健康检查服务
 */
export const ProcessHealthService = {
  /**
   * 初始化服务
   * @param registry 进程注册表（来自 execution-state.service）
   * @param customConfig 自定义配置
   */
  init(registry: Map<string, ChildProcess>, customConfig?: Partial<HealthCheckConfig>): void {
    processRegistry = registry;
    config = { ...DEFAULT_CONFIG, ...customConfig };

    // 启动定期检查
    this.startPeriodicCheck();
    this.startPeriodicCleanup();

    console.log('[ProcessHealth] 服务已启动，检查间隔:', config.checkIntervalMs / 1000, '秒');
  },

  /**
   * 启动定期健康检查
   */
  startPeriodicCheck(): void {
    if (checkTimer) {
      clearInterval(checkTimer);
    }

    checkTimer = setInterval(() => {
      this.checkAllProcesses();
    }, config.checkIntervalMs);
  },

  /**
   * 启动定期清理
   */
  startPeriodicCleanup(): void {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
    }

    cleanupTimer = setInterval(() => {
      this.cleanupZombieProcesses();
    }, config.cleanupIntervalMs);
  },

  /**
   * 停止服务
   */
  stop(): void {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
    console.log('[ProcessHealth] 服务已停止');
  },

  /**
   * 检查所有进程的健康状态
   */
  checkAllProcesses(): void {
    if (!processRegistry) return;

    const projectIds = Array.from(processRegistry.keys());

    for (const projectId of projectIds) {
      const process = processRegistry.get(projectId);
      if (!process) continue;

      const healthInfo = this.checkProcessHealth(projectId, process);
      healthRecords.set(projectId, healthInfo);

      // 如果进程已死但还在注册表中，标记为需要清理
      if (healthInfo.status === 'dead') {
        console.warn(`[ProcessHealth] 发现僵尸进程: ${projectId} (PID: ${process.pid})`);
      }
    }
  },

  /**
 * 检查单个进程的健康状态
   */
  checkProcessHealth(projectId: string, process: ChildProcess): ProcessHealthInfo {
    const now = Date.now();
    const pid = process.pid;

    // 检查进程是否存活
    let status: 'alive' | 'dead' | 'unknown' = 'unknown';

    if (pid) {
      try {
        // 在 Windows 上，通过发送信号 0 检查进程是否存活
        // process.kill(pid, 0) 会抛出异常如果进程不存在
        // 注意：这里使用全局的 process.kill，不是 ChildProcess.kill
        global.process.kill(pid, 0);
        status = 'alive';
      } catch {
        // 进程不存在或无法访问
        status = 'dead';
      }
    }

    // 计算存活时间
    const startTime = this.getProcessStartTime(projectId);
    const uptimeMs = startTime ? now - startTime : 0;

    return {
      projectId,
      pid,
      status,
      lastCheck: now,
      uptimeMs,
    };
  },

  /**
   * 清理僵尸进程
   */
  cleanupZombieProcesses(): void {
    if (!processRegistry) return;

    const now = Date.now();
    const cleaned: string[] = [];

    // 1. 清理已死的进程
    const healthEntries = Array.from(healthRecords.entries());
    for (const [projectId, healthInfo] of healthEntries) {
      if (healthInfo.status === 'dead') {
        // 从注册表中移除
        processRegistry.delete(projectId);
        healthRecords.delete(projectId);

        // 更新状态文件
        this.markProcessTerminated(projectId);

        cleaned.push(projectId);
        console.log(`[ProcessHealth] 清理僵尸进程: ${projectId}`);
      }
    }

    // 2. 清理超时的进程
    const processEntries = Array.from(processRegistry.entries());
    for (const [projectId, process] of processEntries) {
      const startTime = this.getProcessStartTime(projectId);
      if (startTime && now - startTime > config.maxProcessAgeMs) {
        // 进程运行时间过长，强制终止
        try {
          process.kill('SIGTERM');
          console.warn(`[ProcessHealth] 强制终止超时进程: ${projectId} (运行 ${Math.round((now - startTime) / 60000)} 分钟)`);
        } catch (err) {
          console.warn(`[ProcessHealth] 终止进程失败: ${projectId}`, err);
        }

        processRegistry.delete(projectId);
        this.markProcessTerminated(projectId, 'timeout');
        cleaned.push(projectId);
      }
    }

    // 3. 清理过期状态文件
    this.cleanupExpiredStateFiles();

    if (cleaned.length > 0) {
      console.log(`[ProcessHealth] 本次清理了 ${cleaned.length} 个僵尸进程`);
    }
  },

  /**
   * 获取进程启动时间
   */
  getProcessStartTime(projectId: string): number | null {
    const stateFile = this.getStateFilePath(projectId);
    if (!fs.existsSync(stateFile)) return null;

    try {
      const content = fs.readFileSync(stateFile, 'utf-8');
      const state = JSON.parse(content);
      return state.startTime || null;
    } catch {
      return null;
    }
  },

  /**
   * 标记进程为已终止
   */
  markProcessTerminated(projectId: string, reason: string = 'dead'): void {
    const stateFile = this.getStateFilePath(projectId);
    if (!fs.existsSync(stateFile)) return;

    try {
      const content = fs.readFileSync(stateFile, 'utf-8');
      const state = JSON.parse(content);
      state.status = 'terminated';
      state.endTime = Date.now();
      state.pid = undefined;
      state.error = reason === 'timeout' ? '进程超时被强制终止' : '进程意外终止';
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    } catch (err) {
      console.warn(`[ProcessHealth] 更新状态文件失败: ${projectId}`, err);
    }
  },

  /**
   * 清理过期的状态文件
   */
  cleanupExpiredStateFiles(): void {
    const projectsDir = path.join(process.cwd(), 'data', 'projects');
    if (!fs.existsSync(projectsDir)) return;

    const now = Date.now();
    const expireMs = 7 * 24 * 60 * 60 * 1000; // 7 天过期

    const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true });

    for (const dir of projectDirs) {
      if (!dir.isDirectory()) continue;

      const stateFile = path.join(projectsDir, dir.name, 'execution-state.json');
      if (!fs.existsSync(stateFile)) continue;

      try {
        const content = fs.readFileSync(stateFile, 'utf-8');
        const state = JSON.parse(content);

        // 如果状态文件超过 7 天且进程已完成或终止，清理
        if (state.endTime && now - state.endTime > expireMs) {
          fs.unlinkSync(stateFile);
          console.log(`[ProcessHealth] 清理过期状态文件: ${dir.name}`);
        }
      } catch {
        // 状态文件损坏，删除
        try {
          fs.unlinkSync(stateFile);
          console.log(`[ProcessHealth] 清理损坏状态文件: ${dir.name}`);
        } catch {
          // 忽略
        }
      }
    }
  },

  /**
   * 获取健康报告
   */
  getHealthReport(): {
    totalProcesses: number;
    aliveProcesses: number;
    deadProcesses: number;
    unknownProcesses: number;
    details: ProcessHealthInfo[];
  } {
    const details = Array.from(healthRecords.values());

    return {
      totalProcesses: details.length,
      aliveProcesses: details.filter(d => d.status === 'alive').length,
      deadProcesses: details.filter(d => d.status === 'dead').length,
      unknownProcesses: details.filter(d => d.status === 'unknown').length,
      details,
    };
  },

  /**
   * 获取单个项目的健康状态
   */
  getProjectHealth(projectId: string): ProcessHealthInfo | null {
    return healthRecords.get(projectId) || null;
  },

  /**
   * 手动触发健康检查
   */
  triggerCheck(): void {
    this.checkAllProcesses();
  },

  /**
   * 手动触发清理
   */
  triggerCleanup(): void {
    this.cleanupZombieProcesses();
  },

  // 私有方法
  getStateFilePath(projectId: string): string {
    return path.join(process.cwd(), 'data', 'projects', projectId, 'execution-state.json');
  },
};