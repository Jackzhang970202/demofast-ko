/**
 * Claudeck 服务类型定义
 * 定义与 Claudeck 服务交互的所有类型
 */

/**
 * Claudeck 配置
 */
export interface ClaudeckConfig {
  /** WebSocket 服务地址 */
  wsUrl: string;
  /** REST API 地址 */
  apiUrl: string;
  /** 认证 Token（可选） */
  authToken?: string;
  /** 连接超时（毫秒） */
  timeout: number;
  /** 重连间隔（毫秒） */
  reconnectInterval: number;
  /** 最大重连次数 */
  maxReconnectAttempts: number;
}

/**
 * Claudeck 会话
 */
export interface ClaudeckSession {
  id: string;
  projectId?: string;
  cwd: string;
  title?: string;
  status: 'active' | 'idle' | 'closed';
  createdAt: string;
  updatedAt: string;
}

/**
 * Claudeck 消息类型
 */
export type ClaudeckMessageType =
  | 'session'        // 会话初始化
  | 'text'           // 文本消息
  | 'tool'           // 工具调用
  | 'tool_result'    // 工具结果
  | 'result'         // 执行结果统计
  | 'permission_request' // 权限请求
  | 'done'           // 完成
  | 'error'          // 错误
  | 'chat'           // 发送消息
  | 'agent'          // 运行 Agent
  | 'workflow'       // 运行 Workflow
  | 'abort';         // 中止

/**
 * Claudeck 消息
 */
export interface ClaudeckMessage {
  type: ClaudeckMessageType;
  sessionId?: string;
  [key: string]: any;
}

/**
 * 发送消息请求
 */
export interface ClaudeckChatRequest {
  type: 'chat';
  message: string;
  cwd: string;
  sessionId?: string;
  permissionMode?: 'bypass' | 'confirmDangerous' | 'confirmAll' | 'plan';
}

/**
 * Agent 运行请求
 */
export interface ClaudeckAgentRequest {
  type: 'agent';
  agentId: string;
  cwd: string;
  message: string;
  sessionId?: string;
  permissionMode?: 'bypass' | 'confirmDangerous' | 'confirmAll' | 'plan';
  timeout?: number;
}

/**
 * Workflow 运行请求
 */
export interface ClaudeckWorkflowRequest {
  type: 'workflow';
  workflowId: string;
  cwd: string;
  sessionId?: string;
  inputs?: Record<string, any>;
}

/**
 * 文本消息
 */
export interface ClaudeckTextMessage extends ClaudeckMessage {
  type: 'text';
  text: string;
}

/**
 * 工具调用消息
 */
export interface ClaudeckToolMessage extends ClaudeckMessage {
  type: 'tool';
  name: string;
  input: Record<string, any>;
}

/**
 * 工具结果消息
 */
export interface ClaudeckToolResultMessage extends ClaudeckMessage {
  type: 'tool_result';
  name: string;
  output: string;
  success: boolean;
}

/**
 * 执行结果消息
 */
export interface ClaudeckResultMessage extends ClaudeckMessage {
  type: 'result';
  duration_ms: number;
  cost_usd: number;
  tokens_input: number;
  tokens_output: number;
}

/**
 * 权限请求消息
 */
export interface ClaudeckPermissionRequestMessage extends ClaudeckMessage {
  type: 'permission_request';
  id: string;
  tool: string;
  input: Record<string, any>;
  message: string;
}

/**
 * 错误消息
 */
export interface ClaudeckErrorMessage extends ClaudeckMessage {
  type: 'error';
  error: string;
  code?: string;
}

/**
 * Agent 定义
 */
export interface ClaudeckAgent {
  id: string;
  title: string;
  description: string;
  icon?: string;
  goal: string;
  constraints?: {
    maxTurns?: number;
    timeoutMs?: number;
  };
}

/**
 * Workflow 步骤
 */
export interface ClaudeckWorkflowStep {
  label: string;
  prompt: string;
  agent?: string;
}

/**
 * Workflow 定义
 */
export interface ClaudeckWorkflow {
  id: string;
  title: string;
  description?: string;
  steps: ClaudeckWorkflowStep[];
}

/**
 * 消息回调
 */
export type ClaudeckMessageCallback = (message: ClaudeckMessage) => void;

/**
 * 连接状态
 */
export type ClaudeckConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * 连接状态回调
 */
export type ClaudeckConnectionCallback = (state: ClaudeckConnectionState) => void;

/**
 * Claudeck 服务响应
 */
export interface ClaudeckResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 项目信息
 */
export interface ClaudeckProject {
  path: string;
  name: string;
  sessionCount: number;
  lastAccessed: string;
}

/**
 * 会话消息列表
 */
export interface ClaudeckSessionMessages {
  sessionId: string;
  messages: ClaudeckMessage[];
  total: number;
}

/**
 * 统计信息
 */
export interface ClaudeckStats {
  totalSessions: number;
  totalMessages: number;
  totalCost: number;
  totalTokens: {
    input: number;
    output: number;
  };
}