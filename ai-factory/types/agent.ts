/**
 * 智能体相关类型定义
 */

// 智能体类型
export type AgentType = 'pm' | 'uiue' | 'architect' | 'developer';

// 智能体状态
export type AgentStatus = 'inactive' | 'active' | 'completed';

// 智能体结果
export interface AgentResult {
  type: AgentType;
  success: boolean;
  content: string;
}

// 智能体输入
export interface AgentInput {
  requirement: string;
  answers?: Record<string, any>;
  design?: any;
  projectId: string;
}

// 智能体信息
export interface Agent {
  id: AgentType;
  name: string;
  color: string;
  description: string;
  status: AgentStatus;
  progress: number;
}