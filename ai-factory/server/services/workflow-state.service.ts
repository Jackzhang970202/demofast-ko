/**
 * 工作流状态管理服务
 * 管理项目从创建到完成的整个生命周期
 */

import fs from 'fs';
import path from 'path';
import type {
  WorkflowPhase,
  ProjectWorkflowState,
  AdvancePhaseResult,
  CanEnterPhaseResult,
} from '@/types/workflow';
import type { ProjectType } from '@/types/project';

import {
  PHASE_PREREQUISITES as PREREQS,
  getPhaseRoute,
  getRuntimeKindByProjectType,
} from '@/types/workflow';

const STATE_DIR = 'data/projects';
const STATE_FILE = 'workflow-state.json';

export const WorkflowStateService = {
  /**
   * 创建新项目（进入 IDLE 阶段）
   * @param requirement 需求描述
   * @param userId 用户ID（可选）
   * @param existingProjectId 使用现有项目ID（可选，用于同步数据库项目）
   */
  async createProject(
    requirement: string,
    userId?: string,
    existingProjectId?: string,
    projectType: ProjectType = 'ruoyi-vue-pg'
  ): Promise<ProjectWorkflowState> {
    const projectId = existingProjectId || `proj_${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const runtimeKind = getRuntimeKindByProjectType(projectType);

    const state: ProjectWorkflowState = {
      projectId,
      projectType,
      templateType: projectType,
      templateVersion: projectType === 'frontend-demo' ? 'demo-business-v1' : 'inspur-base-main',
      runtimeKind,
      phase: 'IDLE',
      agentProgress: {},
      phaseData: {
        requirement,
        runtimeType: runtimeKind,
      },
      createdAt: now,
      updatedAt: now,
    };

    await this.saveState(state);
    return state;
  },

  /**
   * 获取项目状态
   */
  async getState(projectId: string): Promise<ProjectWorkflowState | null> {
    const filePath = this.getStatePath(projectId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  },

  /**
   * 推进到下一阶段
   */
  async advancePhase(projectId: string): Promise<AdvancePhaseResult> {
    const state = await this.getState(projectId);
    if (!state) {
      throw new Error('项目不存在');
    }

    const nextPhase = this.getNextPhase(state.phase);
    const check = this.checkPrerequisites(state, nextPhase);

    if (!check.canAdvance) {
      return {
        success: false,
        newPhase: state.phase,
        missingPrerequisites: check.missing,
      };
    }

    state.phase = nextPhase;
    state.updatedAt = new Date().toISOString();
    await this.saveState(state);

    return { success: true, newPhase: nextPhase };
  },

  /**
   * 检查是否可以进入指定阶段
   */
  async canEnterPhase(projectId: string, targetPhase: WorkflowPhase): Promise<CanEnterPhaseResult> {
    const state = await this.getState(projectId);
    if (!state) {
      return {
        canEnter: false,
        missingPrerequisites: ['项目不存在'],
        suggestedRoute: '/workspace',
      };
    }

    const check = this.checkPrerequisites(state, targetPhase);
    return {
      canEnter: check.canAdvance,
      missingPrerequisites: check.missing,
      suggestedRoute: check.canAdvance
        ? getPhaseRoute(state.projectType, targetPhase)
        : getPhaseRoute(state.projectType, state.phase),
    };
  },

  /**
   * 保存阶段数据
   */
  async savePhaseData(
    projectId: string,
    data: Partial<ProjectWorkflowState['phaseData']>
  ): Promise<void> {
    const state = await this.getState(projectId);
    if (!state) {
      throw new Error('项目不存在');
    }

    state.phaseData = { ...state.phaseData, ...data };
    state.updatedAt = new Date().toISOString();
    await this.saveState(state);
  },

  /**
   * 记录错误
   */
  async recordError(projectId: string, error: Error): Promise<void> {
    const state = await this.getState(projectId);
    if (!state) return;

    state.phaseData.error = {
      phase: state.phase,
      message: error.message,
      timestamp: new Date().toISOString(),
    };
    state.updatedAt = new Date().toISOString();
    await this.saveState(state);
  },

  /**
   * 记录 Agent 完成状态
   * @param projectId 项目ID
   * @param agentId Agent ID: pm | uiue | architect | developer
   * @param data Agent 完成数据
   */
  async recordAgentComplete(
    projectId: string,
    agentId: 'pm' | 'uiue' | 'architect' | 'developer',
    data: { file?: string; files?: string[] }
  ): Promise<void> {
    const state = await this.getState(projectId);
    if (!state) {
      throw new Error('项目不存在');
    }

    // 初始化 agentProgress
    if (!state.agentProgress) {
      state.agentProgress = {};
    }

    state.agentProgress[agentId] = {
      completed: true,
      timestamp: new Date().toISOString(),
      ...data,
    };
    state.updatedAt = new Date().toISOString();

    await this.saveState(state);
  },

  /**
   * 检查 Agent 执行进度，返回应从哪个 Agent 开始
   * @param projectId 项目ID
   * @returns agentIndex: 0-3 表示从 pm/uiue/architect/developer 开始
   */
  getAgentStartIndex(state: ProjectWorkflowState): number {
    const agents = ['pm', 'uiue', 'architect', 'developer'] as const;

    // 如果没有 agentProgress，从头开始
    if (!state.agentProgress) {
      return 0;
    }

    // 找到第一个未完成的 Agent
    for (let i = 0; i < agents.length; i++) {
      const agentId = agents[i];
      if (!state.agentProgress[agentId]?.completed) {
        return i;
      }
    }

    // 全部完成
    return 4;
  },

  /**
   * 删除项目状态
   */
  async deleteState(projectId: string): Promise<boolean> {
    const filePath = this.getStatePath(projectId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  },

  /**
   * 获取下一个阶段
   */
  getNextPhase(current: WorkflowPhase): WorkflowPhase {
    const phases: WorkflowPhase[] = [
      'IDLE',
      'CLARIFYING',
      'SPEC_GENERATING',
      'CODE_GENERATING',
      'COMPLETED',
    ];
    const index = phases.indexOf(current);
    return phases[Math.min(index + 1, phases.length - 1)];
  },

  // ==================== 私有方法 ====================

  getStatePath(projectId: string): string {
    return path.join(process.cwd(), STATE_DIR, projectId, STATE_FILE);
  },

  async saveState(state: ProjectWorkflowState): Promise<void> {
    const filePath = this.getStatePath(state.projectId);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf-8');
  },

  checkPrerequisites(
    state: ProjectWorkflowState,
    targetPhase: WorkflowPhase
  ): { canAdvance: boolean; missing: string[] } {
    const required = PREREQS[targetPhase];
    const missing: string[] = [];

    for (const prereq of required) {
      if (!state.phaseData[prereq as keyof typeof state.phaseData]) {
        missing.push(prereq);
      }
    }

    return {
      canAdvance: missing.length === 0,
      missing,
    };
  },
};