/**
 * 澄清流程相关类型定义
 * 用于多轮需求澄清问答
 */

/**
 * 澄清轮次
 */
export type ClarificationRound = 1 | 2 | 3;

/**
 * 问题类别
 */
export type QuestionCategory =
  | 'target_user'      // 目标用户
  | 'scenario'         // 使用场景
  | 'pain_point'       // 核心痛点
  | 'priority'         // 功能优先级
  | 'data_source'      // 数据来源
  | 'collaboration'    // 协作关系
  | 'permission'       // 权限边界
  | 'integration'      // 系统关系
  | 'exception'        // 异常处理
  | 'success_criteria' // 成功标准
  | 'follow_up';       // 追问（第二轮起）

/**
 * 澄清问题
 */
export interface ClarificationQuestion {
  id: string;
  round: ClarificationRound;
  category: QuestionCategory;
  type: 'radio' | 'checkbox' | 'textarea';
  question: string;
  options?: string[];
  required: boolean;
  followUpReason?: string; // 追问原因（第二轮起）
}

/**
 * 用户回答
 */
export interface ClarificationAnswer {
  questionId: string;
  answer: string | string[];
  timestamp: string;
}

/**
 * 原始需求摘要
 */
export interface OriginalRequirementSummary {
  rawInput: string;           // 用户原始输入
  coreGoal: string;           // 核心目标
  businessBackground: string; // 业务背景
  targetUser: string;         // 目标用户
  features: string[];         // 功能诉求
  constraints: string;        // 约束条件
  ambiguousPoints: string[];  // 模糊点
  missingPoints: string[];    // 遗漏点
}

/**
 * 功能项
 */
export interface FeatureItem {
  name: string;
  priority: 'P0' | 'P1' | 'P2';
  reason: string;
}

/**
 * 需求摘要
 */
export interface RequirementSummary {
  targetUser: string;
  coreProblem: string;
  features: {
    phase1: FeatureItem[];
    phase2: FeatureItem[];
    excluded: Array<{ name: string; reason: string }>;
  };
  successCriteria: string[];
  constraints: {
    time: string;
    tech: string;
    resource: string;
  };
  dataAndPermission: {
    dataSource: string;
    permissionModel: string;
  };
}

/**
 * 智能体传递信息
 */
export interface AgentHandoff {
  uiue: {
    targetUsers: string;
    coreScenarios: string;
    interactionFocus: string;
  };
  architect: {
    modules: string[];
    techConstraints: string;
    integrations: string;
  };
  developer: {
    priorities: string[];
    acceptanceCriteria: string;
    constraints: string;
  };
}

/**
 * 澄清会话状态
 */
export interface ClarificationSession {
  projectId: string;
  startTime: string;
  endTime?: string;
  currentRound: ClarificationRound;
  currentQuestionIndex: number;
  originalSummary: OriginalRequirementSummary;
  questions: ClarificationQuestion[];
  answers: ClarificationAnswer[];
  summary: RequirementSummary | null;
  agentHandoff: AgentHandoff | null;
  status: 'in_progress' | 'completed';
}

/**
 * 追问分析结果
 */
export interface FollowUpAnalysis {
  needFollowUp: boolean;
  followUpQuestions: ClarificationQuestion[];
  analysisReasons: string[];
}

/**
 * 澄清进度
 */
export interface ClarificationProgress {
  round: ClarificationRound;
  questionIndex: number;
  totalQuestions: number;
  maxRounds: number;
  percentage: number;
}

/**
 * API 响应类型
 */
export interface ClarificationSessionResponse {
  session: ClarificationSession;
  progress: ClarificationProgress;
}

export interface SubmitAnswerResponse {
  saved: boolean;
  progress: ClarificationProgress;
  hasNextQuestion: boolean;
  roundComplete: boolean;
}

export interface NextQuestionResponse {
  hasNext: boolean;
  question: ClarificationQuestion | null;
  progress: ClarificationProgress;
  roundComplete: boolean;
  sessionComplete: boolean;
}