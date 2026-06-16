/**
 * 端口分配服务
 * 管理生成项目的预览端口分配（3001-3999）
 */

import fs from 'fs';
import path from 'path';
import net from 'net';
import { TemplateConfigService } from './template-config.service';

interface PortRange {
  start: number;
  end: number;
}

function getPortRange(projectId: string): PortRange {
  const config = TemplateConfigService.getRuoyiConfig();
  if (projectId.endsWith(':backend')) {
    return config.backendStartPortRange;
  }
  return config.frontendStartPortRange;
}

function isPortInRange(port: number, range: PortRange): boolean {
  return port >= range.start && port <= range.end;
}

function getProjectIdBase(projectId: string): string {
  return projectId.split(':')[0];
}

function isSameChannel(projectId: string, allocationProjectId: string): boolean {
  return projectId.endsWith(':backend') === allocationProjectId.endsWith(':backend');
}

function getReservedPorts(): number[] {
  return [3000, 9009];
}

function getUsedPortsByChannel(projectId: string, allocations: PortAllocation[]): Set<number> {
  return new Set(
    allocations
      .filter(allocation => isSameChannel(projectId, allocation.projectId))
      .map(allocation => allocation.port)
  );
}

function shouldDropExistingAllocation(projectId: string, allocation: PortAllocation): boolean {
  const range = getPortRange(projectId);
  return !isPortInRange(allocation.port, range);
}

const DATA_DIR = 'data';
const ALLOCATIONS_FILE = 'port-allocations.json';

// 端口分配过期时间（项目关闭后 1 小时自动回收）
const ALLOCATION_EXPIRE_MS = 60 * 60 * 1000;

interface PortAllocation {
  projectId: string;
  port: number;
  assignedAt: string;
  lastUsedAt?: string;
}

interface PortAllocationsData {
  allocations: PortAllocation[];
  lastCleanup?: string;
}

export const PortAllocatorService = {
  // 保留端口（不分配）
  RESERVED_PORTS: getReservedPorts(), // 主程序: 3000, Claudeck: 9009

  /**
   * 分配端口
   * @param projectId 项目ID
   * @returns 分配的端口号
   */
  async allocatePort(projectId: string): Promise<number> {
    this.cleanupExpiredAllocations();

    const data = this.loadData();
    const range = getPortRange(projectId);

    const existing = data.allocations.find(a => a.projectId === projectId);
    if (existing) {
      if (shouldDropExistingAllocation(projectId, existing)) {
        console.log(`[PortAllocator] 项目 ${projectId} 的旧端口 ${existing.port} 不在正确范围内，释放并重新分配`);
        data.allocations = data.allocations.filter(a => a.projectId !== projectId);
      } else {
        const available = await this.isPortAvailable(existing.port);
        if (available) {
          existing.lastUsedAt = new Date().toISOString();
          this.saveData(data);
          return existing.port;
        }
        console.log(`[PortAllocator] 项目 ${projectId} 的旧端口 ${existing.port} 已被占用，释放并重新分配`);
        data.allocations = data.allocations.filter(a => a.projectId !== projectId);
      }
    }

    const usedPorts = getUsedPortsByChannel(projectId, data.allocations);
    let port = range.start;

    while (port <= range.end) {
      if (this.RESERVED_PORTS.includes(port)) {
        port++;
        continue;
      }
      if (usedPorts.has(port)) {
        port++;
        continue;
      }

      const available = await this.isPortAvailable(port);
      if (available) {
        data.allocations.push({
          projectId,
          port,
          assignedAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
        });
        this.saveData(data);
        console.log(`[PortAllocator] 为项目 ${projectId} 分配端口 ${port}`);
        return port;
      }

      port++;
    }

    throw new Error(`没有可用的端口（${range.start}-${range.end} 全部被占用）`);
  },

  /**
   * 获取项目的端口
   * @param projectId 项目ID
   * @returns 端口号，如果未分配或端口不可用则返回 null
   */
  async getPort(projectId: string): Promise<number | null> {
    const data = this.loadData();
    const allocation = data.allocations.find(a => a.projectId === projectId);
    if (!allocation) return null;
    if (shouldDropExistingAllocation(projectId, allocation)) {
      console.log(`[PortAllocator] 项目 ${projectId} 的端口 ${allocation.port} 不在正确范围内，清理旧分配`);
      data.allocations = data.allocations.filter(a => a.projectId !== projectId);
      this.saveData(data);
      return null;
    }
    const available = await this.isPortAvailable(allocation.port);
    if (available) return allocation.port;
    console.log(`[PortAllocator] 项目 ${projectId} 的端口 ${allocation.port} 已被占用，清理旧分配`);
    data.allocations = data.allocations.filter(a => a.projectId !== projectId);
    this.saveData(data);
    return null;
  },

  /**
   * 释放端口
   * @param projectId 项目ID
   */
  async releasePort(projectId: string): Promise<void> {
    const data = this.loadData();
    const index = data.allocations.findIndex(a => a.projectId === projectId);
    if (index >= 0) {
      const port = data.allocations[index].port;
      data.allocations.splice(index, 1);
      this.saveData(data);
      console.log(`[PortAllocator] 释放项目 ${projectId} 的端口 ${port}`);
    }
  },

  /**
   * 更新端口最后使用时间（心跳）
   */
  heartbeat(projectId: string): void {
    const data = this.loadData();
    const allocation = data.allocations.find(a => a.projectId === projectId);
    if (allocation) {
      allocation.lastUsedAt = new Date().toISOString();
      this.saveData(data);
    }
  },

  /**
   * 清理过期的端口分配
   */
  cleanupExpiredAllocations(): void {
    const data = this.loadData();
    const now = Date.now();
    let cleaned = 0;

    data.allocations = data.allocations.filter(a => {
      const lastUsed = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : new Date(a.assignedAt).getTime();
      if (now - lastUsed > ALLOCATION_EXPIRE_MS) {
        console.log(`[PortAllocator] 回收过期端口分配: ${a.projectId} -> ${a.port}`);
        cleaned++;
        return false;
      }
      return true;
    });

    if (cleaned > 0) {
      data.lastCleanup = new Date().toISOString();
      this.saveData(data);
    }
  },

  /**
   * 获取所有分配的端口
   */
  getAllAllocations(): PortAllocation[] {
    return this.loadData().allocations;
  },

  /**
   * 检测端口是否可用
   * @param port 端口号
   * @returns 是否可用
   */
  async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => {
        resolve(false);
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  },

  /**
   * 检查端口是否被实际占用（有进程在监听）
   */
  async isPortInUse(port: number): Promise<boolean> {
    return !(await this.isPortAvailable(port));
  },

  // ==================== 私有方法 ====================

  /**
   * 获取数据文件路径
   */
  getDataPath(): string {
    return path.join(process.cwd(), DATA_DIR, ALLOCATIONS_FILE);
  },

  /**
   * 加载端口分配数据
   */
  loadData(): PortAllocationsData {
    const filePath = this.getDataPath();
    if (!fs.existsSync(filePath)) {
      // 确保目录存在
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return { allocations: [] };
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { allocations: [] };
    }
  },

  /**
   * 保存端口分配数据
   */
  saveData(data: PortAllocationsData): void {
    const filePath = this.getDataPath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  },
};