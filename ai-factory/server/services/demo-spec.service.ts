import fs from 'fs';
import path from 'path';
import type { DemoClarificationSession } from './demo-clarification.service';
import { DemoTemplateService } from './demo-template.service';
import { spawnClaudeNonInteractive } from '@/lib/spawn';

interface ClaudeCliUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
}

function estimateUsageFromSpecContent(content: string): ClaudeCliUsage {
  const contentLength = Buffer.byteLength(content, 'utf-8');
  const outputTokens = Math.max(1, Math.ceil(contentLength / 4));
  return {
    inputTokens: 0,
    outputTokens,
    totalTokens: outputTokens,
    model: 'spec-file-estimate',
  };
}

async function callClaude(prompt: string, cwd: string, specFile: string, timeoutMs = 600000): Promise<ClaudeCliUsage> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`Claude 调用超时 (${timeoutMs}ms)`)), timeoutMs);
    try {
      const proc = spawnClaudeNonInteractive(prompt, { timeout: timeoutMs, cwd });
      let error = '';
      proc.stderr?.on('data', (data) => {
        error += data.toString();
      });
      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code !== 0) {
          reject(new Error(error || `Claude 退出码 ${code}`));
          return;
        }
        if (!fs.existsSync(specFile)) {
          reject(new Error('spec 文件未生成'));
          return;
        }
        const content = fs.readFileSync(specFile, 'utf-8');
        resolve(estimateUsageFromSpecContent(content));
      });
      proc.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

export const DemoSpecService = {
  async generate(projectId: string, session: DemoClarificationSession) {
    const recommendation = session.templateRecommendation;
    if (!recommendation) {
      throw new Error('缺少模板选择结果，无法生成 spec');
    }

    const selection = DemoTemplateService.resolveStoredRecommendation(recommendation);
    const template = DemoTemplateService.getById(selection.meta.templateId);
    const visual = DemoTemplateService.getVisualById(selection.meta.visualTemplateId);
    if (!template || !visual) {
      throw new Error('模板元数据解析失败，无法生成 spec');
    }
    const summary = session.summary;
    const specDir = path.join(process.cwd(), 'data', 'projects', projectId, 'spec');
    const specFile = path.join(specDir, 'requirement.md');
    fs.mkdirSync(specDir, { recursive: true });

    const answerHighlights = (summary?.answerHighlights || []).map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`).join('\n\n');
    const absoluteSpecPath = specFile;

    const prompt = `你是 demo 工厂中的 Spec 编写专家。你必须基于用户需求、澄清问答、已选模板，编写一份**详细且可执行**的前端 demo 规格文档。

## 项目ID
${projectId}

## 用户原始需求
${session.requirement}

## 澄清问答（10题）
${answerHighlights || '无'}

## 澄清摘要（结构化）
${JSON.stringify(summary || {}, null, 2)}

## 已选业务模板
${JSON.stringify(template, null, 2)}

## 已选视觉模板
${JSON.stringify(visual, null, 2)}

## 模板调整建议
${(recommendation.templateAdjustments || []).join('\n')}

---

## 任务

你必须编写一份**详尽的**前端 demo 规格文档，并**使用 Write 工具写入以下路径**：

${absoluteSpecPath}

## 文档要求

1. **必须输出完整的 markdown 文档**，不要只输出大纲或摘要
2. **每个章节都必须有实质性内容**，不能只有标题
3. **页面蓝图章节必须详细到每个页面的布局、字段名、按钮文案、交互行为**
4. **数据模拟章节必须给出每个实体的 TypeScript 接口定义，包含具体字段**
5. **规格必须围绕已选模板类别来组织，不允许退化成统一后台式模板**
6. **不同模块的字段名、列名、按钮文案必须体现业务差异**
7. **必须包含模板调整建议中提到的具体调整点**

## 必须覆盖的章节

### 1. 项目概述
- 产品定位（结合用户需求）
- 目标用户
- 技术栈（React + Vite + TypeScript）
- 设计原则

### 2. 模板选择结果
- 已选业务模板 ID 及选择理由
- 已选视觉模板 ID 及选择理由
- 模板调整要点

### 3. 需求澄清问答
- 10 个澄清问题及其答案（来自上面的问答）

### 4. 页面蓝图（最重要，必须详细）
- 列出每个页面（工作台、列表页、详情页、表单页等）
- 每个页面必须写明：
  - 页面用途
  - 页面布局结构（区域划分）
  - 核心字段/列名（具体到业务名称，不是"字段1""字段2"）
  - 操作按钮文案
  - 交互说明

### 5. 导航与信息架构
- 完整路由表
- 页面跳转关系

### 6. 核心交互
- 关键业务流程描述
- 数据流转说明

### 7. 数据与前端模拟
- 每个业务实体的 TypeScript 接口定义（包含具体字段）
- Mock 策略（本地持久化、增删改查模拟）
- 模拟行为说明

### 8. 模板调整说明
- 具体调整点列表

### 9. 开发约束
- 技术约束
- 样式约束
- 演示完整性约束

注意：这不是高层概述文档，而是**可以直接指导代码生成**的详细规格。每个页面、每个字段、每个交互都必须具体化，不能留空泛描述。

请现在使用 Write 工具将完整文档写入上述路径。
`;

    const usage = await callClaude(prompt, path.dirname(specFile), specFile);

    const content = fs.readFileSync(specFile, 'utf-8');
    return {
      filePath: specFile,
      relativePath: 'spec/requirement.md',
      content,
      usage,
    };
  },
};
