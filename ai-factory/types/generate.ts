/**
 * 生成相关类型定义
 */

// 问题类型
export type QuestionType = 'radio' | 'checkbox' | 'textarea' | 'select';

// 问题分类
export type QuestionCategory = 'interface' | 'function' | 'design';

// 问题
export interface Question {
  id: string;
  category: QuestionCategory;
  type: QuestionType;
  question: string;
  options?: string[];
  required: boolean;
}

// 问答回答
export type Answers = Record<string, string | string[]>;

// 设计方案
export interface DesignData {
  title: string;
  techStack: {
    frontend: string[];
    backend: string[];
    ui: string[];
  };
  modules: Array<{ id: string; name: string; icon: string }>;
  features: string[];
  designStyle: string;
}

// 生成选项
export interface GenerateOptions {
  requirement: string;
  answers: Answers;
  design?: DesignData;
  projectId: string;
}

// 生成结果
export interface GenerateResult {
  success: boolean;
  projectId: string;
  files?: GeneratedFile[];
  output?: string;
  error?: string;
}

// 生成的文件
export interface GeneratedFile {
  path: string;
  name: string;
  language: string;
  content: string;
}