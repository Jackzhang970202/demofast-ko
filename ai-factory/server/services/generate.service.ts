/**
 * 生成服务层
 * 封装问题生成、方案生成、代码生成逻辑
 */

import { spawnClaudeNonInteractive } from '@/lib/spawn';
import { logSystemInfo, logCCCommand, logCCResponse } from '@/lib/logger';
import { ProjectService } from './project.service';
import type { Question, Answers, DesignData, GenerateOptions, GenerateResult, GeneratedFile } from '@/types';
import path from 'path';
import fs from 'fs';

export const GenerateService = {
  /**
   * 生成反问问题
   */
  async generateQuestions(requirement: string): Promise<Question[]> {
    // 预定义问题模板
    const questions: Question[] = [
      {
        id: 'q1',
        category: 'interface',
        type: 'radio',
        question: '您希望采用什么样的界面风格？',
        options: ['现代简约', '科技未来', '商务专业', '其他'],
        required: false,
      },
      {
        id: 'q2',
        category: 'interface',
        type: 'radio',
        question: '是否需要深色/浅色主题切换？',
        options: ['需要', '不需要'],
        required: false,
      },
      {
        id: 'q3',
        category: 'function',
        type: 'checkbox',
        question: '需要哪些核心功能？',
        options: ['用户管理', '权限控制', '数据统计', '文件上传', '消息通知'],
        required: true,
      },
      {
        id: 'q4',
        category: 'function',
        type: 'radio',
        question: '数据存储方式？',
        options: ['JSON文件', 'SQLite数据库', '内存存储'],
        required: true,
      },
      {
        id: 'q5',
        category: 'design',
        type: 'textarea',
        question: '是否有特殊的设计要求或参考系统？',
        required: false,
      },
    ];

    return questions;
  },

  /**
   * 生成设计方案
   */
  async generateDesign(requirement: string, answers: Answers): Promise<DesignData> {
    // 从问答中提取信息
    const style = answers['q1'] || '现代简约';
    const features = answers['q3'] || [];
    const storage = answers['q4'] || 'JSON文件';

    const design: DesignData = {
      title: this.extractProjectName(requirement),
      techStack: {
        frontend: ['Vue 3', 'Vite', 'Element Plus'],
        backend: ['Spring Boot', 'MyBatis Plus', 'PostgreSQL'],
        ui: ['若依现有组件', 'Element Plus'],
      },
      modules: this.generateModules(features as string[]),
      features: features as string[],
      designStyle: `${style}风格${answers['q2'] === '需要' ? '，支持深色/浅色主题' : ''}`,
    };

    return design;
  },

  /**
   * 生成代码
   */
  async generateCode(options: GenerateOptions): Promise<GenerateResult> {
    const { requirement, answers, design, projectId } = options;
    const projectDir = path.join(process.cwd(), 'data', 'projects', projectId);

    // 确保项目目录存在
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    logSystemInfo(projectId, '开始生成代码', { requirement: requirement.substring(0, 200) });

    const prompt = this.buildPrompt(requirement, answers, design);
    logCCCommand(projectId, prompt, { cwd: projectDir });

    const startTime = Date.now();

    try {
      const claudeProcess = spawnClaudeNonInteractive(prompt, {
        cwd: projectDir,
        timeout: 600000,
      });

      let output = '';
      let error = '';

      await new Promise<void>((resolve) => {
        claudeProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        claudeProcess.stderr.on('data', (data) => {
          error += data.toString();
        });

        claudeProcess.on('close', (code) => {
          const duration = Date.now() - startTime;
          logCCResponse(projectId, {
            success: code === 0,
            output,
            error: error || undefined,
            duration,
          });
          resolve();
        });

        claudeProcess.on('error', (err) => {
          error = err.message;
          resolve();
        });
      });

      // 收集生成的文件
      const files = this.collectFiles(projectDir);

      // 更新项目状态
      if (files.length > 0) {
        await ProjectService.updateStatus(projectId, 'completed');
      } else {
        await ProjectService.updateStatus(projectId, 'failed');
      }

      return {
        success: files.length > 0,
        projectId,
        files,
        output,
        error: files.length === 0 ? error || '未生成任何文件' : undefined,
      };
    } catch (err: any) {
      logSystemInfo(projectId, '代码生成错误', { error: err.message });
      await ProjectService.updateStatus(projectId, 'failed');
      return {
        success: false,
        projectId,
        error: err.message,
      };
    }
  },

  /**
   * 构建提示词
   */
  buildPrompt(requirement: string, answers: Answers, design?: DesignData): string {
    return `你是一个专业的全栈开发工程师。请根据以下需求在若依衍生模板上增量开发一个完整可运行的项目。

## 用户需求
${requirement}

## 用户补充信息
${Object.entries(answers || {}).map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')}

## 设计方案
- 项目名称: ${design?.title || 'AI Generated App'}
- 技术栈: Spring Boot, Vue 3, Vite, Element Plus, PostgreSQL
- 功能模块: ${(design?.modules || []).map((m) => m.name).join(', ')}

## 重要规则
1. 禁止使用外部图片URL和CDN
2. 使用系统默认字体
3. 生成完整可运行的项目
4. 使用 Write 工具逐个创建文件

请开始生成代码。`;
  },

  /**
   * 提取项目名称
   */
  extractProjectName(requirement: string): string {
    const keywords = requirement.match(/开发|构建|创建|实现|做一个/);
    if (keywords) {
      const parts = requirement.split(keywords[0]);
      if (parts[1]) {
        return parts[1].trim().substring(0, 20) || 'AI Generated App';
      }
    }
    return 'AI Generated App';
  },

  /**
   * 生成模块列表
   */
  generateModules(features: string[]): Array<{ id: string; name: string; icon: string }> {
    const iconMap: Record<string, string> = {
      '用户管理': '👤',
      '权限控制': '🔐',
      '数据统计': '📊',
      '文件上传': '📁',
      '消息通知': '🔔',
    };

    return features.map((f, i) => ({
      id: `module_${i}`,
      name: f,
      icon: iconMap[f] || '📦',
    }));
  },

  /**
   * 收集生成的文件
   */
  collectFiles(dir: string, baseDir: string = dir): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.collectFiles(fullPath, baseDir));
      } else if (entry.isFile()) {
        const relativePath = path.relative(baseDir, fullPath);
        files.push({
          path: relativePath.replace(/\\/g, '/'),
          name: entry.name,
          language: this.detectLanguage(entry.name),
          content: fs.readFileSync(fullPath, 'utf-8'),
        });
      }
    }
    return files;
  },

  /**
   * 检测文件语言
   */
  detectLanguage(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.json': 'json',
      '.css': 'css',
      '.html': 'html',
      '.md': 'markdown',
    };
    return langMap[ext] || 'plaintext';
  },
};