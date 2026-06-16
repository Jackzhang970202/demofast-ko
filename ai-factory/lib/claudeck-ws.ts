/**
 * Claudeck WebSocket 客户端
 * 管理 WebSocket 连接、自动重连、消息收发
 */

import type {
  ClaudeckConfig,
  ClaudeckMessage,
  ClaudeckMessageCallback,
  ClaudeckConnectionCallback,
  ClaudeckConnectionState,
} from '@/types/claudeck';

export class ClaudeckWebSocket {
  private ws: WebSocket | null = null;
  private config: ClaudeckConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageQueue: ClaudeckMessage[] = [];
  private messageCallbacks: Set<ClaudeckMessageCallback> = new Set();
  private connectionCallbacks: Set<ClaudeckConnectionCallback> = new Set();
  private _connectionState: ClaudeckConnectionState = 'disconnected';

  constructor(config: ClaudeckConfig) {
    this.config = config;
  }

  /**
   * 获取连接状态
   */
  get connectionState(): ClaudeckConnectionState {
    return this._connectionState;
  }

  /**
   * 连接到 Claudeck 服务
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.updateConnectionState('connecting');

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.authToken
          ? `${this.config.wsUrl}/ws?token=${this.config.authToken}`
          : `${this.config.wsUrl}/ws`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[ClaudeckWS] Connected');
          this.reconnectAttempts = 0;
          this.updateConnectionState('connected');
          this.startPing();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = event.data;

            // 检查是否为 JSON 格式
            if (typeof data === 'string' && data.trim().startsWith('{')) {
              const message = JSON.parse(data) as ClaudeckMessage;
              this.handleMessage(message);
            } else {
              // 非 JSON 消息（如启动信息、日志等），仅记录
              console.log('[ClaudeckWS] Non-JSON message:', data.substring(0, 100));
            }
          } catch (err) {
            console.error('[ClaudeckWS] Failed to parse message:', err, 'Data:', event.data?.substring?.(0, 100));
          }
        };

        this.ws.onerror = (error) => {
          console.error('[ClaudeckWS] WebSocket error:', error);
          this.updateConnectionState('disconnected');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[ClaudeckWS] Disconnected');
          this.stopPing();
          this.updateConnectionState('disconnected');
          this.scheduleReconnect();
        };
      } catch (err) {
        this.updateConnectionState('disconnected');
        reject(err);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopReconnect();
    this.stopPing();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateConnectionState('disconnected');
  }

  /**
   * 发送消息
   */
  send(message: ClaudeckMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // 连接未就绪，加入队列
      this.messageQueue.push(message);
      // 尝试连接
      if (this._connectionState === 'disconnected') {
        this.connect().catch(console.error);
      }
    }
  }

  /**
   * 添加消息回调
   */
  onMessage(callback: ClaudeckMessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * 添加连接状态回调
   */
  onConnectionChange(callback: ClaudeckConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * 等待连接就绪
   */
  async waitForConnection(timeoutMs: number = 10000): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeoutMs);

      const unsubscribe = this.onConnectionChange((state) => {
        if (state === 'connected') {
          clearTimeout(timeout);
          unsubscribe();
          resolve();
        }
      });

      // 触发连接
      this.connect().catch(reject);
    });
  }

  // ==================== 私有方法 ====================

  private handleMessage(message: ClaudeckMessage): void {
    for (const callback of this.messageCallbacks) {
      try {
        callback(message);
      } catch (err) {
        console.error('[ClaudeckWS] Callback error:', err);
      }
    }
  }

  private updateConnectionState(state: ClaudeckConnectionState): void {
    this._connectionState = state;
    for (const callback of this.connectionCallbacks) {
      try {
        callback(state);
      } catch (err) {
        console.error('[ClaudeckWS] Connection callback error:', err);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[ClaudeckWS] Max reconnect attempts reached');
      return;
    }

    this.stopReconnect();
    this.updateConnectionState('reconnecting');

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000
    );

    console.log(`[ClaudeckWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(console.error);
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }
}

// 默认配置
export const DEFAULT_CLAUDECK_CONFIG: ClaudeckConfig = {
  wsUrl: 'ws://127.0.0.1:9009',
  apiUrl: 'http://127.0.0.1:9009',
  timeout: 1200000, // 20分钟默认超时
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
};