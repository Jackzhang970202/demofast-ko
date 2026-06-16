/**
 * Claudeck 服务适配器
 * 封装 Claudeck 的 WebSocket 和 REST API 调用
 * 支持集成模式和（Claudeck 在 AI Factory 内部启动）
 */

import { ClaudeckWebSocket, DEFAULT_CLAUDECK_CONFIG } from '@/lib/claudeck-ws';
import type {
  ClaudeckConfig,
  ClaudeckMessage,
  ClaudeckMessageCallback,
  ClaudeckChatRequest,
  ClaudeckAgentRequest,
  ClaudeckWorkflowRequest,
  ClaudeckSession,
  ClaudeckAgent,
  ClaudeckWorkflow,
  ClaudeckResponse,
  ClaudeckStats,
} from '@/types/claudeck';

/**
 * Claudeck 服务
 */
export const ClaudeckService = {
  /** WebSocket 客户端实例 */
  ws: null as ClaudeckWebSocket | null,

  /** 配置 */
  config: DEFAULT_CLAUDECK_CONFIG,

  /** 是否已初始化 */
  initialized: false,

  /** 会话映射：projectId -> sessionId */
  sessionMap: new Map<string, string>(),

  /**
   * 初始化服务
   * 自动检测并连接 Claudeck 服务
   */
  async init(config?: Partial<ClaudeckConfig>): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.config = { ...DEFAULT_CLAUDECK_CONFIG, ...config };

    try {
      const { claudeckIntegrated } = await import('./claudeck-integrated.service');
      const integratedConfig = claudeckIntegrated.getConfig();
      this.config = { ...this.config, ...integratedConfig };

      const ready = await claudeckIntegrated.ensureReady();
      if (!ready) {
        throw new Error('Claudeck 服务未就绪');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Claudeck 服务未就绪')) {
        throw err;
      }
    }

    this.ws = new ClaudeckWebSocket(this.config);

    try {
      await this.ws.connect();
      this.initialized = true;
      console.log('[ClaudeckService] 初始化成功');
    } catch (err) {
      console.error('[ClaudeckService] 连接失败:', err);
      throw err;
    }
  },

  /**
   * 确保 WebSocket 连接就绪
   */
  async ensureConnection(): Promise<void> {
    if (!this.ws) {
      await this.init();
    } else if (this.ws.connectionState !== 'connected') {
      await this.ws.waitForConnection();
    }
  },

  /**
   * Chat 模式：流式对话
   */
  async chat(
    message: string,
    cwd: string,
    options?: {
      sessionId?: string;
      projectId?: string;
      permissionMode?: ClaudeckChatRequest['permissionMode'];
      timeout?: number;  // 自定义超时时间（毫秒）
      onMessage?: ClaudeckMessageCallback;
    }
  ): Promise<{ sessionId: string; messages: ClaudeckMessage[] }> {
    await this.ensureConnection();

    const timeoutMs = options?.timeout || this.config.timeout;

    return new Promise((resolve, reject) => {
      const messages: ClaudeckMessage[] = [];
      let sessionId = options?.sessionId;

      // 订阅消息
      const unsubscribe = this.ws!.onMessage((msg) => {
        // 收集消息
        messages.push(msg);

        // 回调
        options?.onMessage?.(msg);

        // 处理会话ID
        if (msg.type === 'session' && msg.sessionId) {
          sessionId = msg.sessionId;
          if (options?.projectId) {
            this.sessionMap.set(options.projectId, msg.sessionId);
          }
        }

        // 完成或错误
        if (msg.type === 'done') {
          unsubscribe();
          resolve({
            sessionId: sessionId || '',
            messages,
          });
        } else if (msg.type === 'error') {
          unsubscribe();
          reject(new Error(msg.error || 'Unknown error'));
        }
      });

      // 发送请求
      const request: ClaudeckChatRequest = {
        type: 'chat',
        message,
        cwd,
        sessionId: options?.sessionId,
        permissionMode: options?.permissionMode || 'bypass',
      };

      this.ws!.send(request);

      // 超时处理（使用自定义或默认超时）
      setTimeout(() => {
        unsubscribe();
        reject(new Error(`Chat timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  },

  /**
   * Agent 模式：运行 Agent
   */
  async runAgent(
    agentId: string,
    cwd: string,
    message: string,
    options?: {
      sessionId?: string;
      projectId?: string;
      permissionMode?: ClaudeckAgentRequest['permissionMode'];
      timeout?: number;
      onMessage?: ClaudeckMessageCallback;
    }
  ): Promise<{ sessionId: string; messages: ClaudeckMessage[] }> {
    await this.ensureConnection();

    // 先通过 REST API 获取 agent 定义
    let agentDef: any = null;
    try {
      const res = await fetch(`${this.config.apiUrl}/api/agents/${agentId}`);
      const data = await res.json();
      if (data.id) {
        agentDef = data;
      }
    } catch (err) {
      console.error('[ClaudeckService] 获取 Agent 定义失败:', err);
    }

    if (!agentDef) {
      throw new Error(`Agent "${agentId}" not found`);
    }

    return new Promise((resolve, reject) => {
      const messages: ClaudeckMessage[] = [];
      let sessionId = options?.sessionId;

      const unsubscribe = this.ws!.onMessage((msg) => {
        messages.push(msg);
        options?.onMessage?.(msg);

        if (msg.type === 'session' && msg.sessionId) {
          sessionId = msg.sessionId;
          if (options?.projectId) {
            this.sessionMap.set(options.projectId, msg.sessionId);
          }
        }

        if (msg.type === 'done') {
          unsubscribe();
          resolve({ sessionId: sessionId || '', messages });
        } else if (msg.type === 'error') {
          unsubscribe();
          reject(new Error(msg.error || 'Unknown error'));
        }
      });

      // 发送完整的 agent 定义
      const request = {
        type: 'agent',
        agentDef,
        cwd,
        userContext: message,
        sessionId: options?.sessionId,
        permissionMode: options?.permissionMode || 'bypass',
      };

      this.ws!.send(request);

      const timeout = options?.timeout || this.config.timeout;
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Agent timeout'));
      }, timeout);
    });
  },

  /**
   * Workflow 模式：运行工作流
   */
  async runWorkflow(
    workflowId: string,
    cwd: string,
    options?: {
      sessionId?: string;
      projectId?: string;
      inputs?: Record<string, any>;
      onMessage?: ClaudeckMessageCallback;
      onStep?: (step: number, label: string) => void;
    }
  ): Promise<{ sessionId: string; messages: ClaudeckMessage[] }> {
    await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const messages: ClaudeckMessage[] = [];
      let sessionId = options?.sessionId;
      let currentStep = 0;

      const unsubscribe = this.ws!.onMessage((msg) => {
        messages.push(msg);
        options?.onMessage?.(msg);

        if (msg.type === 'session' && msg.sessionId) {
          sessionId = msg.sessionId;
          if (options?.projectId) {
            this.sessionMap.set(options.projectId, msg.sessionId);
          }
        }

        // 步骤进度
        if (msg.type === 'text' && msg.text?.includes('[Step')) {
          currentStep++;
          // 尝试解析步骤标签
          const match = msg.text.match(/\[Step \d+\] (.+)/);
          if (match) {
            options?.onStep?.(currentStep, match[1]);
          }
        }

        if (msg.type === 'done') {
          unsubscribe();
          resolve({ sessionId: sessionId || '', messages });
        } else if (msg.type === 'error') {
          unsubscribe();
          reject(new Error(msg.error || 'Unknown error'));
        }
      });

      const request: ClaudeckWorkflowRequest = {
        type: 'workflow',
        workflowId,
        cwd,
        sessionId: options?.sessionId,
        inputs: options?.inputs,
      };

      this.ws!.send(request);

      setTimeout(() => {
        unsubscribe();
        reject(new Error('Workflow timeout'));
      }, this.config.timeout * 3); // Workflow 可能更长时间
    });
  },

  /**
   * 中止当前操作
   */
  abort(sessionId: string): void {
    if (this.ws) {
      this.ws.send({ type: 'abort', sessionId });
    }
  },

  /**
   * 获取项目的会话ID
   */
  getSessionId(projectId: string): string | undefined {
    return this.sessionMap.get(projectId);
  },

  /**
   * 设置项目的会话ID
   */
  setSessionId(projectId: string, sessionId: string): void {
    this.sessionMap.set(projectId, sessionId);
  },

  // ==================== REST API 方法 ====================

  /**
   * 获取项目列表
   */
  async getProjects(): Promise<ClaudeckResponse<ClaudeckSession[]>> {
    const response = await fetch(`${this.config.apiUrl}/api/projects`);
    return response.json();
  },

  /**
   * 获取会话列表
   */
  async getSessions(cwd?: string): Promise<ClaudeckResponse<ClaudeckSession[]>> {
    const url = cwd
      ? `${this.config.apiUrl}/api/sessions?cwd=${encodeURIComponent(cwd)}`
      : `${this.config.apiUrl}/api/sessions`;
    const response = await fetch(url);
    return response.json();
  },

  /**
   * 获取会话消息
   */
  async getSessionMessages(sessionId: string): Promise<ClaudeckResponse<ClaudeckMessage[]>> {
    const response = await fetch(`${this.config.apiUrl}/api/sessions/${sessionId}/messages`);
    return response.json();
  },

  /**
   * 获取 Agent 列表
   */
  async getAgents(): Promise<ClaudeckResponse<ClaudeckAgent[]>> {
    const response = await fetch(`${this.config.apiUrl}/api/agents`);
    return response.json();
  },

  /**
   * 获取 Workflow 列表
   */
  async getWorkflows(): Promise<ClaudeckResponse<ClaudeckWorkflow[]>> {
    const response = await fetch(`${this.config.apiUrl}/api/workflows`);
    return response.json();
  },

  /**
   * 获取统计信息
   */
  async getStats(): Promise<ClaudeckResponse<ClaudeckStats>> {
    const response = await fetch(`${this.config.apiUrl}/api/stats/account`);
    return response.json();
  },

  /**
   * 检查服务健康状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * 订阅消息
   */
  onMessage(callback: ClaudeckMessageCallback): () => void {
    if (!this.ws) {
      return () => {};
    }
    return this.ws.onMessage(callback);
  },

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
      this.initialized = false;
    }
  },
};

/**
 * 获取项目目录路径
 */
export function getProjectCwd(projectId: string): string {
  return `${process.cwd()}/data/projects/${projectId}/generated`;
}

/**
 * 获取项目 Clarification 目录路径
 */
export function getProjectClarificationDir(projectId: string): string {
  return `${process.cwd()}/data/projects/${projectId}`;
}