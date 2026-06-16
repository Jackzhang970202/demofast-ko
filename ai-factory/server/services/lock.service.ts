/**
 * 项目锁服务
 * 防止同一项目被并发操作，确保操作互斥
 */

import fs from 'fs';
import path from 'path';

interface LockInfo {
  projectId: string;
  operation: string;      // 操作类型：generate, preview, delete 等
  lockedAt: number;       // 锁定时间戳
  expiresAt: number;      // 过期时间戳（防止死锁）
  processId?: string;     // 操作进程标识
}

// 锁文件目录
const LOCK_DIR = 'data/locks';
const LOCK_EXPIRE_MS = 30 * 60 * 1000; // 锁默认 30 分钟过期

export const LockService = {
  /**
   * 尝试获取项目锁
   * @param projectId 项目ID
   * @param operation 操作类型
   * @param expireMs 锁过期时间（毫秒）
   * @param force 如果是相同操作的锁已存在，仍返回成功（用于 dev 模式严格模式双重渲染）
   * @returns 是否成功获取锁
   */
  acquire(projectId: string, operation: string, expireMs: number = LOCK_EXPIRE_MS, force: boolean = false): boolean {
    this.ensureLockDir();
    this.cleanupExpiredLocks();

    const lockFile = this.getLockFilePath(projectId);
    const now = Date.now();

    // 检查是否已有锁
    if (fs.existsSync(lockFile)) {
      try {
        const lockInfo: LockInfo = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));

        // 检查锁是否过期
        if (lockInfo.expiresAt > now) {
          // 如果是相同操作且 force=true，返回成功（不覆盖锁文件）
          if (force && lockInfo.operation === operation) {
            console.log(`[Lock] 项目 ${projectId} 已有相同操作的锁，继续执行`);
            return true;
          }
          console.log(`[Lock] 项目 ${projectId} 已被锁定，操作: ${lockInfo.operation}`);
          return false;
        }

        // 锁已过期，清理
        console.log(`[Lock] 项目 ${projectId} 的锁已过期，清理中...`);
        fs.unlinkSync(lockFile);
      } catch {
        // 锁文件损坏，删除
        fs.unlinkSync(lockFile);
      }
    }

    // 创建新锁
    const lockInfo: LockInfo = {
      projectId,
      operation,
      lockedAt: now,
      expiresAt: now + expireMs,
      processId: process.pid.toString(),
    };

    fs.writeFileSync(lockFile, JSON.stringify(lockInfo, null, 2));
    console.log(`[Lock] 项目 ${projectId} 已锁定，操作: ${operation}`);
    return true;
  },

  /**
   * 释放项目锁
   * @param projectId 项目ID
   */
  release(projectId: string): void {
    const lockFile = this.getLockFilePath(projectId);
    if (fs.existsSync(lockFile)) {
      try {
        fs.unlinkSync(lockFile);
        console.log(`[Lock] 项目 ${projectId} 的锁已释放`);
      } catch (err) {
        console.warn(`[Lock] 释放锁失败:`, err);
      }
    }
  },

  /**
   * 检查项目是否被锁定
   * @param projectId 项目ID
   * @returns 锁信息，如果未锁定返回 null
   */
  isLocked(projectId: string): LockInfo | null {
    const lockFile = this.getLockFilePath(projectId);

    if (!fs.existsSync(lockFile)) {
      return null;
    }

    try {
      const lockInfo: LockInfo = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));

      // 检查是否过期
      if (lockInfo.expiresAt <= Date.now()) {
        // 过期，删除并返回 null
        fs.unlinkSync(lockFile);
        return null;
      }

      return lockInfo;
    } catch {
      fs.unlinkSync(lockFile);
      return null;
    }
  },

  /**
   * 获取所有活动锁
   */
  getAllActiveLocks(): LockInfo[] {
    this.ensureLockDir();
    this.cleanupExpiredLocks();

    const locks: LockInfo[] = [];
    const files = fs.readdirSync(this.getLockDir());

    for (const file of files) {
      if (!file.endsWith('.lock')) continue;

      try {
        const content = fs.readFileSync(path.join(this.getLockDir(), file), 'utf-8');
        const lockInfo: LockInfo = JSON.parse(content);
        if (lockInfo.expiresAt > Date.now()) {
          locks.push(lockInfo);
        }
      } catch {
        // 忽略损坏的锁文件
      }
    }

    return locks;
  },

  /**
   * 清理过期锁
   */
  cleanupExpiredLocks(): void {
    this.ensureLockDir();

    const files = fs.readdirSync(this.getLockDir());
    const now = Date.now();
    let cleaned = 0;

    for (const file of files) {
      if (!file.endsWith('.lock')) continue;

      try {
        const filePath = path.join(this.getLockDir(), file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lockInfo: LockInfo = JSON.parse(content);

        if (lockInfo.expiresAt <= now) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch {
        // 损坏的锁文件，删除
        try {
          fs.unlinkSync(path.join(this.getLockDir(), file));
          cleaned++;
        } catch {}
      }
    }

    if (cleaned > 0) {
      console.log(`[Lock] 清理了 ${cleaned} 个过期锁`);
    }
  },

  // ==================== 私有方法 ====================

  getLockDir(): string {
    return path.join(process.cwd(), LOCK_DIR);
  },

  getLockFilePath(projectId: string): string {
    return path.join(this.getLockDir(), `${projectId}.lock`);
  },

  ensureLockDir(): void {
    const lockDir = this.getLockDir();
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, { recursive: true });
    }
  },
};