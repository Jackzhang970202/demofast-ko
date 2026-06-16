/**
 * Claudeck 集成服务
 * 在 AI Factory 内部启动 Claudeck 功能
 * 无需单独启动 Claudeck 服务
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { ClaudeckWebSocket } from '@/lib/claudeck-ws';
import type { ClaudeckConfig } from '@/types/claudeck';

// Claudeck 服务配置
const CLAUDECK_CONFIG: ClaudeckConfig = {
  wsUrl: 'ws://127.0.0.1:9009',
  apiUrl: 'http://127.0.0.1:9009',
  timeout: 1200000, // 20分钟默认超时
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
};

class ClaudeckIntegratedService {
  private process: ChildProcess | null = null;
  private isRunning = false;
  private port = 9009;
  private claudeckPath: string;
  private dataPath: string;

  constructor() {
    // Claudeck 项目路径
    this.claudeckPath = path.join(process.cwd(), '..', 'claudeck-main');
    // Claudeck 数据存储路径（放在项目文件夹内）
    this.dataPath = path.join(process.cwd(), 'data', 'claudeck');
  }

  /**
   * 启动 Claudeck 服务
   */
  async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('[Claudeck] 服务已在运行');
      return true;
    }

    // 检查端口是否已被占用
    const portInUse = await this.checkPort(this.port);
    if (portInUse) {
      console.log('[Claudeck] 端口已被占用，尝试连接现有服务');
      this.isRunning = true;
      return true;
    }

    // 确保数据目录存在
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
      console.log(`[Claudeck] 创建数据目录: ${this.dataPath}`);
    }

    console.log('[Claudeck] 正在启动服务...');
    console.log(`[Claudeck] 路径: ${this.claudeckPath}`);
    console.log(`[Claudeck] 数据目录: ${this.dataPath}`);

    return new Promise((resolve) => {
      try {
        // 启动 Claudeck 进程
        this.process = spawn('node', ['server.js'], {
          cwd: this.claudeckPath,
          stdio: 'pipe',
          env: {
            ...process.env,
            PORT: String(this.port),
            CLAUDECK_HOME: this.dataPath, // 数据存储在项目文件夹内
          },
        });

        this.process.stdout?.on('data', (data) => {
          const output = data.toString();
          if (output.includes('Server started') || output.includes('listening')) {
            this.isRunning = true;
            console.log('[Claudeck] ✅ 服务已启动');
            resolve(true);
          }
          console.log(`[Claudeck] ${output.trim()}`);
        });

        this.process.stderr?.on('data', (data) => {
          console.error(`[Claudeck Error] ${data.toString().trim()}`);
        });

        this.process.on('error', (err) => {
          console.error('[Claudeck] 进程错误:', err);
          this.isRunning = false;
          resolve(false);
        });

        this.process.on('close', (code) => {
          console.log(`[Claudeck] 进程退出，代码: ${code}`);
          this.isRunning = false;
          this.process = null;
        });

        // 超时处理
        setTimeout(() => {
          if (!this.isRunning) {
            console.log('[Claudeck] 启动超时，尝试连接...');
            this.isRunning = true;
            resolve(true);
          }
        }, 10000);

      } catch (err) {
        console.error('[Claudeck] 启动失败:', err);
        resolve(false);
      }
    });
  }

  /**
   * 停止 Claudeck 服务
   */
  async stop(): Promise<void> {
    if (this.process) {
      console.log('[Claudeck] 正在停止服务...');
      this.process.kill('SIGTERM');
      this.process = null;
      this.isRunning = false;
    }
  }

  /**
   * 检查服务状态
   */
  async healthCheck(): Promise<boolean> {
    const probes = [
      `http://127.0.0.1:${this.port}/api/health`,
      `http://127.0.0.1:${this.port}/`,
    ];

    for (const url of probes) {
      const ok = await new Promise<boolean>((resolve) => {
        const req = http.get(url, (res) => {
          resolve((res.statusCode || 500) < 500);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => {
          req.destroy();
          resolve(false);
        });
      });

      if (ok) {
        this.isRunning = true;
        return true;
      }
    }

    this.isRunning = false;
    return false;
  }

  async ensureReady(): Promise<boolean> {
    if (await this.healthCheck()) {
      return true;
    }

    const started = await this.start();
    if (!started) {
      return false;
    }

    return this.healthCheck();
  }


  /**
   * 检查端口是否被占用
   */
  private async checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = require('net').createServer();
      server.once('error', () => resolve(true));
      server.once('listening', () => {
        server.close();
        resolve(false);
      });
      server.listen(port);
    });
  }

  /**
   * 获取配置
   */
  getConfig(): ClaudeckConfig {
    return CLAUDECK_CONFIG;
  }

  /**
   * 获取服务状态
   */
  getStatus(): { running: boolean; port: number } {
    return {
      running: this.isRunning,
      port: this.port,
    };
  }
}

// 单例导出
export const claudeckIntegrated = new ClaudeckIntegratedService();

// 自动启动（在服务启动时）
let autoStarted = false;

export async function ensureClaudeckRunning(): Promise<boolean> {
  if (autoStarted) {
    return claudeckIntegrated.getStatus().running;
  }
  autoStarted = true;
  return claudeckIntegrated.start();
}