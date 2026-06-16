/**
 * 生成相关 Server Actions
 * 供 Client Components 调用
 */

'use server';

import { GenerateService } from '@/server/services/generate.service';
import { AgentService } from '@/server/services/agent.service';
import type { Question, Answers, DesignData } from '@/types';

/**
 * 生成问题
 */
export async function generateQuestionsAction(requirement: string): Promise<Question[]> {
  return GenerateService.generateQuestions(requirement);
}

/**
 * 生成设计方案
 */
export async function generateDesignAction(
  requirement: string,
  answers: Answers
): Promise<DesignData> {
  return GenerateService.generateDesign(requirement, answers);
}

/**
 * 执行智能体流程
 */
export async function runAgentsAction(input: {
  requirement: string;
  answers: Answers;
  design?: DesignData;
  projectId: string;
}): Promise<{
  success: boolean;
  results?: any[];
  error?: string;
}> {
  try {
    const results = await AgentService.runAllAgents(input);
    return { success: true, results };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 生成代码
 */
export async function generateCodeAction(options: {
  requirement: string;
  answers: Answers;
  design?: DesignData;
  projectId: string;
}): Promise<{
  success: boolean;
  projectId: string;
  files?: any[];
  error?: string;
}> {
  const result = await GenerateService.generateCode(options);
  return result;
}