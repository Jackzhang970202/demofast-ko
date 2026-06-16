/**
 * 智能体服务层
 * 封装四个智能体的调用逻辑
 */

import { getClaudeCode } from '@/lib/claude';
import { logSystemInfo } from '@/lib/logger';
import type { AgentType, AgentResult, AgentInput } from '@/types';

export const AgentService = {
  /**
   * 执行单个智能体
   */
  async runAgent(type: AgentType, input: AgentInput): Promise<AgentResult> {
    const { requirement, answers, design, projectId } = input;

    logSystemInfo(projectId, `${type} 智能体开始执行`);

    const prompts: Record<AgentType, () => string> = {
      pm: () => this.buildPMPrompt(requirement, answers),
      uiue: () => this.buildUIUEPrompt(requirement, design),
      architect: () => this.buildArchitectPrompt(requirement, design),
      developer: () => this.buildDeveloperPrompt(requirement, answers, design),
    };

    const prompt = prompts[type]();

    try {
      const claude = getClaudeCode();
      const result = await claude.generate(prompt, {
        outputDir: `data/projects/${projectId}`,
        timeout: 120000,
      });

      logSystemInfo(projectId, `${type} 智能体执行完成`, { success: result.success });

      return {
        type,
        success: result.success,
        content: result.output || result.error || '',
      };
    } catch (err: any) {
      logSystemInfo(projectId, `${type} 智能体执行失败`, { error: err.message });
      return {
        type,
        success: false,
        content: err.message,
      };
    }
  },

  /**
   * 执行所有智能体
   */
  async runAllAgents(input: AgentInput): Promise<AgentResult[]> {
    const types: AgentType[] = ['pm', 'uiue', 'architect', 'developer'];
    const results: AgentResult[] = [];

    for (const type of types) {
      const result = await this.runAgent(type, input);
      results.push(result);
    }

    return results;
  },

  /**
   * PM 智能体提示词
   */
  buildPMPrompt(requirement: string, answers?: Record<string, any>): string {
    return `作为产品经理，请分析以下需求并生成需求规格说明：

## 用户需求
${requirement}

## 用户补充信息
${answers ? Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n') : '无'}

请输出：
1. 需求概述
2. 用户故事
3. 功能清单
4. 优先级排序`;
  },

  /**
   * UIUE 智能体提示词
   */
  buildUIUEPrompt(requirement: string, design?: any): string {
    return `作为UI/UE设计师，请设计以下系统的界面方案：

## 需求
${requirement}

## 设计约束
${design?.designStyle || '现代简约风格'}

请输出：
1. 整体风格定位
2. 色彩方案
3. 字体规范
4. 组件规范
5. 页面布局建议`;
  },

  /**
   * 架构师智能体提示词
   */
  buildArchitectPrompt(requirement: string, design?: any): string {
    return `作为架构师，请设计以下系统的技术架构：

## 需求
${requirement}

## 技术栈
${design?.techStack ? JSON.stringify(design.techStack, null, 2) : 'Spring Boot, Vue 3, Vite, Element Plus, PostgreSQL'}

请输出：
1. 系统架构图
2. 目录结构
3. 数据模型设计
4. API 设计
5. 安全方案`;
  },

  /**
   * 开发工程师智能体提示词
   */
  buildDeveloperPrompt(requirement: string, answers?: Record<string, any>, design?: any): string {
    return `作为开发工程师，请实现以下系统：

## 需求
${requirement}

## 用户补充信息
${answers ? Object.entries(answers).map(([k, v]) => `- ${k}: ${v}`).join('\n') : '无'}

## 设计方案
${design ? JSON.stringify(design, null, 2) : '无'}

## 技术要求
- 基于现有若依衍生模板增量开发
- 后端: Spring Boot + MyBatis Plus + PostgreSQL
- 前端: Vue 3 + Vite + Element Plus + Pinia
- 必须复用现有 backend/frontend 目录与若依返回结构

## 开发约束
- 禁止重建新项目
- 禁止将功能实现为独立 demo
- 优先复用现有 Controller/Service/Mapper/Vue 页面模式

请使用 Write 工具逐个创建或修改文件，生成完整可运行的项目。`;
  },
};