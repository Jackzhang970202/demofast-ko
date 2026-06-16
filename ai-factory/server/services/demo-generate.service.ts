import fs from 'fs';
import path from 'path';
import { initDatabase, insert, queryAll, update } from '@/lib/db';
import { DemoTemplateService } from './demo-template.service';
import { DemoSpecService } from './demo-spec.service';
import { DemoScaffoldService } from './demo-scaffold.service';
import type { DemoClarificationSession } from './demo-clarification.service';
import { WorkflowStateService } from './workflow-state.service';
import { ClaudeckService } from './claudeck.service';
import type { ClaudeckMessage } from '@/types/claudeck';
import { saveExecutionState, addCheckpoint, getExecutionState, updateStage, resetExecutionState } from './execution-state.service';
import { logSystemError, logSystemInfo } from '@/lib/logger';
import { BillingService } from './billing.service';
import { DemoEventBusService } from './demo-event-bus.service';
import { DemoArtifactService } from './demo-artifact.service';
import { DemoQualityPackService } from './demo-quality-pack.service';

async function upsertProjectFile(projectId: string, filePath: string, content: string) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const allFiles = queryAll('projectFiles') as any[];
  const exists = allFiles.find(item => item.projectId === projectId && item.path === normalizedPath);
  if (exists) {
    await update('projectFiles', (item: any) => item.projectId === projectId && item.path === normalizedPath, { content });
    return;
  }

  await insert('projectFiles', {
    projectId,
    path: normalizedPath,
    name: path.basename(normalizedPath),
    language: path.extname(normalizedPath).slice(1) || 'plaintext',
    content,
  });
}

async function collectGeneratedFiles(projectId: string, projectDir: string) {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const relativePath = path.relative(projectDir, fullPath).replace(/\\/g, '/');
        files.push(relativePath);
      }
    }
  };
  walk(projectDir);
  return files;
}

function buildFallbackSelection(templateId: string) {
  return DemoTemplateService.resolveStoredRecommendation({
    primary: templateId,
    categoryTemplateId: 'admin-console',
    visualTemplateId: 'modern',
    templateAdjustments: ['保持原有生成产物。', '沿用既有模块结构。', '不改动已完成项目代码。'],
  });
}

function buildDemoDeveloperPrompt(projectId: string, session: DemoClarificationSession, specContent: string, scaffoldFiles: string[], categoryTemplateId: 'admin-console' | 'data-workbench' | 'knowledge-hub' | 'ai-chat' | 'automation-workflow' | 'portal-showcase' | 'learning-exam' | 'commerce-transaction' | 'service-scheduling' | 'project-delivery', qualityPackIds: string[] = []) {
  const summary = session.summary;
  const answerBlock = (summary?.answerHighlights || []).map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer}`).join('\n\n');
  const fileBlock = scaffoldFiles.map((file) => `- ${file}`).join('\n');
  const layoutRules = `## 布局与样式铁律（违反即为失败）
1. **禁止重叠**：所有卡片、表格、表单、按钮必须使用明确的布局方式（flex / grid），不得使用 absolute / fixed 定位制造重叠元素。
2. **间距统一**：卡片之间至少 20px 间距，表格单元格至少 12px 内边距，按钮之间至少 8px 间距。
3. **表格规范**：表格必须有明确的 thead / tbody 分隔，列宽合理分配。表格容器必须包裹 overflow-x: auto 防止列过多时撑破页面。
4. **按钮去重**：同一功能按钮（如"新增""编辑""删除"）在同一页面视图内只出现一次。顶部工具栏已有"新增"，行操作就只保留"编辑/查看/删除"；顶部工具栏已有"返回列表"，详情区就不需要再放返回按钮。
5. **卡片容器独立**：每个独立区块（列表、详情、表单、统计卡片）必须有独立的容器，容器之间不得嵌套重复、不得互相覆盖、不得使用 margin 负值重叠。
6. **溢出保护**：任何横向内容（表格、长文本）必须加 overflow-x: auto，禁止页面出现水平滚动条以外的溢出。
7. **自检清单**：每次修改后必须检查——页面无重叠元素、无重复功能按钮、表格列不溢出、卡片间距均匀。
8. **组件职责清晰**：列表页、详情页、表单页是三个独立组件，各自在 src/pages/modules/ 下，不要把所有逻辑塞进 App.tsx。
9. **样式隔离**：每个页面组件的样式使用内联 style 或局部 CSS，不得注入全局 style 污染其他页面。
10. **状态管理独立**：每个模块的数据独立存储在 recordsByModule 中，切换模块时数据不串。`;
  const categoryRules = categoryTemplateId === 'ai-chat'
    ? `\n- 当前模板类别是 ai-chat\n- 必须突出会话列表、消息流、输入区、推荐问题、上下文区\n- 禁止退化成后台列表/表单管理壳\n`
    : categoryTemplateId === 'knowledge-hub'
      ? `\n- 当前模板类别是 knowledge-hub\n- 必须突出搜索区、分类导航、知识内容、文档详情、资料关联\n- 禁止退化成后台 CRUD 壳\n`
      : categoryTemplateId === 'data-workbench'
        ? `\n- 当前模板类别是 data-workbench\n- 必须突出指标总览、趋势图、分布区、告警或明细区\n- 禁止退化成后台列表表单壳\n`
        : categoryTemplateId === 'automation-workflow'
          ? `\n- 当前模板类别是 automation-workflow\n- 必须突出流程列表、节点区、执行状态、规则说明\n- 禁止退化成普通看板或表格页\n`
          : categoryTemplateId === 'portal-showcase'
            ? `\n- 当前模板类别是 portal-showcase\n- 必须突出首屏视觉区、内容分区、重点入口与转化按钮\n- 禁止退化成后台列表表单壳\n`
            : categoryTemplateId === 'learning-exam'
              ? `\n- 当前模板类别是 learning-exam\n- 必须突出课程/考试状态、学习任务、进度反馈与结果展示\n- 禁止退化成知识库或普通后台壳\n`
              : categoryTemplateId === 'commerce-transaction'
                ? `\n- 当前模板类别是 commerce-transaction\n- 必须突出商品、订单、交易动作与状态追踪\n- 禁止退化成普通台账后台\n`
                : categoryTemplateId === 'service-scheduling'
                  ? `\n- 当前模板类别是 service-scheduling\n- 必须突出预约时间、排班资源、状态提醒与调度信息\n- 禁止退化成审批或简单表格页\n`
                  : categoryTemplateId === 'project-delivery'
                    ? `\n- 当前模板类别是 project-delivery\n- 必须突出项目、里程碑、任务协同、交付状态与验收信息\n- 禁止退化成通用运营后台\n`
                    : `\n- 当前模板类别是 admin-console\n- 必须突出模块导航、列表、详情、表单、统计看板\n`;

  const basePrompt = `你是一个顶级前端工程师与产品型 UI 设计师，负责在纯 React demo 工厂中继续完善现有工程。

## 基本定位
- 这是纯前端 React + Vite demo
- 禁止生成后端、数据库、接口服务
- 禁止把原始需求长文直接显示到 UI
- 必须按模块做差异化页面，而不是所有模块共用一套通用壳
- 必须让页面更像真实业务 demo，字段、列表、详情、按钮、假数据都要像业务系统
- 当前 demo 工厂的有效规格文档是 generated 工程同级目录中的 ../spec/requirement.md
- 不要按上层 SDD 的 specs/requirement、specs/task、specs/checklist 目录阻塞执行
- 本阶段只需要基于现有 generated 工程和 ../spec/requirement.md 继续改前端代码

## 工具使用限制
- **禁止使用 mcp__chrome-devtools 工具**（或任何 chrome-devtools 相关工具）
- **禁止使用 mcp__pencil 相关工具**（或任何 pencil 设计工具）
- 不得使用浏览器自动化工具来测试或验证页面效果
- 不得使用设计编辑工具来修改 UI 设计文件
- 仅使用文件操作、代码编辑、shell 命令等基础工具

${layoutRules}
${categoryRules}

## 项目信息
- 项目ID: ${projectId}
- 项目名称: ${summary?.projectName || 'Demo 商务系统'}
- 模板: ${session.templateRecommendation?.primary || 'admin'}

## 用户原始需求
${session.requirement}

## 澄清问答
${answerBlock}

## 结构化规格
${specContent}

## 当前已生成文件
${fileBlock || '无'}

## 你必须完成的事情
1. 优化现有页面视觉，去掉所有与业务无关的大段说明文案、占位文字、冗余提示。
2. 让导航、看板、列表、详情、表单真正基于模块 schema 体现差异，不同模块的字段名、列名、按钮文案必须不同。
3. 表单字段必须按 form schema 真实渲染，不允许只有名称/负责人/状态/描述四个通用字段。
4. 列表列、详情区块、模块标题、操作按钮、假数据都要更接近用户业务。
5. 保持本地持久化可用，新增/编辑/删除后刷新还在。
6. 只在现有纯前端工程内修改，不要改成若依，不要生成后端。
7. 检查并修复所有可能导致重叠、溢出、重复按钮的布局问题。

## 输出要求
- 直接修改现有 generated 工程文件
- 优先改 src/pages/App.tsx、src/pages/dashboard/*、src/pages/modules/*、src/data/*、src/store/*
- 让最终效果看起来像一个真实 demo，而不是代码生成器的占位壳
- 提交前自检：页面无重叠元素、无重复功能按钮、表格列不溢出、卡片间距均匀
`;

  // 注入质量规则
  if (qualityPackIds.length > 0) {
    const qualityPacks = DemoQualityPackService.getByIds(qualityPackIds);
    if (qualityPacks.length > 0) {
      const qualityBlock = qualityPacks.map((p) => `## ${p.title}\n${p.content}`).join('\n\n');
      return `${basePrompt}\n\n## 质量强化规则\n以下规则必须严格遵守，用于提升生成质量。\n\n${qualityBlock}`;
    }
  }

  return basePrompt;
}

async function runDemoDeveloper(projectId: string, projectDir: string, prompt: string) {
  await ClaudeckService.init();
  DemoEventBusService.createStream(projectId);
  saveExecutionState({ projectId, status: 'running', currentStage: 'demo-developer', startTime: Date.now(), checkpoints: [] });
  DemoEventBusService.push(projectId, 'status', { label: 'demo-developer', detail: '开始优化 demo 前端代码' });
  logSystemInfo(projectId, 'demo developer 开始生成代码', {});
  addCheckpoint(projectId, { stage: 'demo-developer', timestamp: Date.now(), summary: '开始优化 demo 前端代码', filesGenerated: 0, completed: false });
  const output: string[] = [];
  let usage: { inputTokens: number; outputTokens: number; model: string } | undefined;
  await ClaudeckService.chat(prompt, projectDir, {
    projectId,
    permissionMode: 'bypass',
    timeout: 1800000,
    onMessage: (msg: ClaudeckMessage) => {
      if (msg.type === 'text') {
        const text = (msg as any).text || '';
        output.push(text);
        DemoEventBusService.push(projectId, 'text', { text: text.slice(0, 500) });
        logSystemInfo(projectId, 'demo developer 文本输出', { text: text.slice(0, 500) });
      } else if (msg.type === 'tool') {
        const toolMsg = msg as any;
        const toolName = toolMsg.name || 'unknown';
        const toolInput = toolMsg.input || {};
        addCheckpoint(projectId, {
          stage: 'demo-developer',
          timestamp: Date.now(),
          summary: `调用工具: ${toolName}`,
          filesGenerated: 0,
          completed: false,
        });
        DemoEventBusService.push(projectId, 'tool_use', { name: toolName, input: toolInput });
        if (['Write', 'Edit', 'WriteText'].includes(toolName) && toolInput.path) {
          DemoEventBusService.push(projectId, 'file_op', { action: toolName === 'Edit' ? 'edit' : 'write', path: toolInput.path });
        }
        logSystemInfo(projectId, 'demo developer 工具调用', { name: toolMsg.name, input: toolMsg.input });
      } else if (msg.type === 'tool_result') {
        const resultMsg = msg as any;
        DemoEventBusService.push(projectId, 'tool_result', { name: resultMsg.name, success: resultMsg.success });
        logSystemInfo(projectId, 'demo developer 工具结果', { name: resultMsg.name, success: resultMsg.success, output: String(resultMsg.output || '').slice(0, 500) });
      } else if (msg.type === 'result') {
        const resultMsg = msg as any;
        usage = {
          inputTokens: Number(resultMsg.input_tokens || 0),
          outputTokens: Number(resultMsg.output_tokens || 0),
          model: String(resultMsg.model || 'claudeck-result'),
        };
        DemoEventBusService.push(projectId, 'usage', {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          model: usage.model,
        });
        logSystemInfo(projectId, 'demo developer 执行统计', resultMsg);
      } else if (msg.type === 'error') {
        DemoEventBusService.push(projectId, 'error', { message: (msg as any).error || 'unknown error' });
        logSystemError(projectId, 'demo developer 消息错误', msg);
      }
    },
  }).catch((error) => {
    const state = getExecutionState(projectId);
    if (state) {
      state.status = 'error';
      state.error = error.message;
      state.endTime = Date.now();
      saveExecutionState(state);
    }
    DemoEventBusService.push(projectId, 'error', { message: error.message });
    logSystemError(projectId, 'demo developer 失败', error);
    throw error;
  });

  // After successful completion, identify main artifact and emit events
  const mainArtifact = DemoArtifactService.selectMainArtifact(projectDir);
  if (mainArtifact) {
    DemoEventBusService.push(projectId, 'artifact_ready', { path: mainArtifact });
  }

  const state = getExecutionState(projectId);
  if (state) {
    state.status = 'completed';
    state.currentStage = 'finished';
    state.endTime = Date.now();
    state.checkpoints = state.checkpoints || [];
    saveExecutionState(state);
  }
  DemoEventBusService.push(projectId, 'done', {});
  return {
    output: output.join('\n'),
    usage,
  };
}

const generationTasks = new Map<string, Promise<any>>();

export const DemoGenerateService = {
  async generate(projectId: string, session: DemoClarificationSession, billingSessionId?: string) {
    const existingTask = generationTasks.get(projectId);
    if (existingTask) return existingTask;

    const task = (async () => {
      logSystemInfo(projectId, 'demo generate 进入主链路', { sessionStatus: session.status });
      await initDatabase();
      logSystemInfo(projectId, 'demo generate 数据库初始化完成', {});

      const state = await WorkflowStateService.getState(projectId);
      logSystemInfo(projectId, 'demo generate 读取工作流状态完成', { phase: state?.phase, templateId: state?.phaseData?.templateId });
      const projectDir = path.join(process.cwd(), 'data', 'projects', projectId, 'generated');
      const existingTemplateId = state?.phaseData.templateId || state?.templateId || 'ops-center';
      const generatedExists = fs.existsSync(projectDir);
      const specFilePath = path.join(process.cwd(), 'data', 'projects', projectId, 'spec', 'requirement.md');
      const specExists = fs.existsSync(specFilePath);
      const executionState = getExecutionState(projectId);

      // Create event stream for this project run
      DemoEventBusService.createStream(projectId);

      if (state?.phase === 'COMPLETED' && state.phaseData.specFile && state.phaseData.generatedFiles?.length) {
        // Project already completed - push artifact and done for SSE consumers
        const mainArtifact = DemoArtifactService.selectMainArtifact(projectDir);
        if (mainArtifact) {
          DemoEventBusService.push(projectId, 'artifact_ready', { path: mainArtifact });
        }
        DemoEventBusService.push(projectId, 'done', { resumed: true });
        return {
          projectId,
          templateId: existingTemplateId,
          templateMeta: DemoTemplateService.buildProjectMeta(buildFallbackSelection(existingTemplateId)),
          specFile: state.phaseData.specFile,
          files: state.phaseData.generatedFiles,
          projectDir,
          resumed: true,
        };
      }

      // 恢复路径1：执行出错但脚手架文件已存在，清除错误状态后继续执行代码优化
      if (executionState?.status === 'error' && generatedExists) {
        resetExecutionState(projectId);
        logSystemInfo(projectId, 'demo generate 检测到 error 状态且有脚手架文件，清除错误并重新执行优化', {});
        // 不 return，继续往下执行代码优化阶段
      }

      // 恢复路径2：执行出错但无脚手架文件，且无恢复意义，允许重新执行
      if (executionState?.status === 'error' && !generatedExists) {
        resetExecutionState(projectId);
        logSystemInfo(projectId, 'demo generate 清除 error 状态，允许重新执行', {});
      }

      // 代码生成阶段恢复（仅在 error 状态已清除且无脚手架时跳过）
      if (state?.phase === 'CODE_GENERATING' && generatedExists && executionState?.status === 'pending') {
        const resumedFiles = await collectGeneratedFiles(projectId, projectDir);
        return {
          projectId,
          templateId: existingTemplateId,
          templateMeta: DemoTemplateService.buildProjectMeta(buildFallbackSelection(existingTemplateId)),
          specFile: state?.phaseData.specFile || (specExists ? 'spec/requirement.md' : undefined),
          files: resumedFiles.map(file => `generated/${file}`),
          projectDir,
          resumed: true,
          phase: state?.phase,
          executionState,
        };
      }

      if (state?.phase === 'SPEC_GENERATING' && specExists && !generatedExists && executionState?.currentStage === 'spec') {
        return {
          projectId,
          templateId: existingTemplateId,
          templateMeta: DemoTemplateService.buildProjectMeta(buildFallbackSelection(existingTemplateId)),
          specFile: state?.phaseData.specFile || 'spec/requirement.md',
          files: [],
          projectDir,
          resumed: true,
          phase: state?.phase,
          executionState,
        };
      }

      const refreshedState = await WorkflowStateService.getState(projectId);
      const activeState = refreshedState || state;

      if (activeState?.phase === 'SPEC_GENERATING' && executionState?.currentStage === 'demo-developer') {
        await WorkflowStateService.advancePhase(projectId);
      }

      const latestState = await WorkflowStateService.getState(projectId);
      const currentState = latestState || activeState;

      // 代码阶段正常恢复（非错误重试场景）
      if (currentState?.phase === 'CODE_GENERATING' && generatedExists && executionState?.status !== 'error') {
        const resumedFiles = await collectGeneratedFiles(projectId, projectDir);
        return {
          projectId,
          templateId: existingTemplateId,
          templateMeta: DemoTemplateService.buildProjectMeta(buildFallbackSelection(existingTemplateId)),
          specFile: currentState?.phaseData.specFile || (specExists ? 'spec/requirement.md' : undefined),
          files: resumedFiles.map(file => `generated/${file}`),
          projectDir,
          resumed: true,
          phase: currentState?.phase,
          executionState,
        };
      }

      if (currentState?.phase === 'SPEC_GENERATING' && specExists && !generatedExists && !executionState) {
        return {
          projectId,
          templateId: existingTemplateId,
          templateMeta: DemoTemplateService.buildProjectMeta(buildFallbackSelection(existingTemplateId)),
          specFile: currentState?.phaseData.specFile || 'spec/requirement.md',
          files: [],
          projectDir,
          resumed: true,
          phase: currentState?.phase,
          executionState,
        };
      }

      // 恢复路径2：执行出错但无脚手架文件，且无恢复意义，允许重新执行
      if (executionState?.status === 'error' && !generatedExists) {
        resetExecutionState(projectId);
        logSystemInfo(projectId, 'demo generate 清除 error 状态，允许重新执行', {});
      }

      const runtimeState = currentState;

      await WorkflowStateService.savePhaseData(projectId, { error: undefined });

      let mergedRequirement = session.requirement;
      let mergedSummary = session.summary;
      const extraPath = path.join(process.cwd(), 'data', 'projects', projectId, 'demo-extra.txt');
      if (fs.existsSync(extraPath)) {
        const extra = fs.readFileSync(extraPath, 'utf-8').trim();
        if (extra) {
          mergedRequirement = `${session.requirement}\n\n【补充描述】\n${extra}`;
          if (mergedSummary) {
            mergedSummary = {
              ...mergedSummary,
              requirementHighlights: [...(mergedSummary.requirementHighlights || []), extra],
              answerHighlights: [...(mergedSummary.answerHighlights || []), { question: '补充描述', answer: extra }],
            };
          }
        }
      }

      const summary = mergedSummary;
      logSystemInfo(projectId, 'demo generate 进入模板选择阶段', { hasSummary: !!summary, hasStoredRecommendation: !!session.templateRecommendation });
      const hasNewTemplateFields = !!session.templateRecommendation?.primary && !!session.templateRecommendation?.visualTemplateId && !!session.templateRecommendation?.categoryTemplateId;
      const selection = hasNewTemplateFields
        ? DemoTemplateService.resolveStoredRecommendation(session.templateRecommendation!)
        : await DemoTemplateService.recommend(mergedRequirement, summary);
      logSystemInfo(projectId, 'demo generate 模板选择完成', {
        selectedTemplateId: selection.meta.templateId,
        selectedTemplateCategory: selection.meta.categoryTemplateId,
        selectedVisualTemplateId: selection.meta.visualTemplateId,
      });
      const recommendation = selection.recommendation;
      const templateMeta = DemoTemplateService.buildProjectMeta(selection);
      if (summary) {
        summary.selectedTemplateId = selection.meta.templateId;
        summary.selectedTemplateCategory = selection.meta.categoryTemplateId;
        summary.selectedVisualTemplateId = selection.meta.visualTemplateId;
        summary.templateReason = recommendation.reason;
        summary.templateAdjustments = recommendation.templateAdjustments;
      }

      const resolvedSummary = summary;
      const currentPhase = runtimeState?.phase;
      if (!resolvedSummary) {
        throw new Error('澄清摘要不存在，无法生成 demo 项目');
      }
      if (currentPhase !== 'CODE_GENERATING' && !specExists) {
        logSystemInfo(projectId, 'demo generate 进入 spec 阶段', { currentPhase });
        updateStage(projectId, 'spec');
      }

      await WorkflowStateService.savePhaseData(projectId, {
        clarificationSession: session,
        summary: resolvedSummary,
        templateId: recommendation.primary,
        templateRecommendation: recommendation,
        runtimeType: 'frontend-demo',
      });

      logSystemInfo(projectId, 'demo generate 开始生成 spec', { templateId: recommendation.primary, specExists });
      DemoEventBusService.push(projectId, 'status', { label: 'spec-generating', detail: '正在生成结构化规格文档' });
      let spec: { relativePath: string; content: string; usage?: { inputTokens: number; outputTokens: number; totalTokens: number; model: string } };
      if (specExists) {
        spec = {
          relativePath: state?.phaseData.specFile || 'spec/requirement.md',
          content: fs.readFileSync(specFilePath, 'utf-8'),
        };
        logSystemInfo(projectId, 'demo generate spec 已存在，跳过重新生成', { specFile: spec.relativePath });
      } else {
        spec = await DemoSpecService.generate(projectId, {
          ...session,
          requirement: mergedRequirement,
          summary: resolvedSummary,
          templateRecommendation: recommendation,
        });
        if (billingSessionId && spec.usage) {
          await BillingService.chargeStep(
            billingSessionId,
            'spec_generation',
            spec.usage.model,
            spec.usage.inputTokens,
            spec.usage.outputTokens,
          );
        }
        logSystemInfo(projectId, 'demo generate spec 生成完成', { specFile: spec.relativePath, usage: spec.usage });
        addCheckpoint(projectId, {
          stage: 'spec',
          timestamp: Date.now(),
          summary: `Spec 已生成: ${spec.relativePath}`,
          filesGenerated: 1,
          completed: true,
        });

        await WorkflowStateService.savePhaseData(projectId, {
          specFile: spec.relativePath,
          specs: {
            requirement: spec.relativePath,
            design: [],
            task: '',
            checklist: '',
          },
        });
        logSystemInfo(projectId, 'demo spec 已生成', { specFile: spec.relativePath });
      }

      const phaseAfterSpec = await WorkflowStateService.getState(projectId);
      if (phaseAfterSpec?.phase === 'SPEC_GENERATING') {
        const advanced = await WorkflowStateService.advancePhase(projectId);
        logSystemInfo(projectId, 'workflow 推进到下一阶段', advanced);
      }
      const codePhaseState = await WorkflowStateService.getState(projectId);
      logSystemInfo(projectId, 'spec 完成后的当前阶段', { phase: codePhaseState?.phase });

      logSystemInfo(projectId, 'demo generate 进入 scaffold 阶段', { categoryTemplateId: selection.meta.categoryTemplateId });
      updateStage(projectId, 'demo-developer');
      let scaffoldProjectDir: string;
      let scaffoldFiles: string[];
      if (generatedExists) {
        logSystemInfo(projectId, 'demo generate 脚手架已存在，跳过创建直接优化', { projectDir });
        scaffoldProjectDir = projectDir;
        scaffoldFiles = await collectGeneratedFiles(projectId, scaffoldProjectDir);
      } else {
        const scaffold = await DemoScaffoldService.create(projectId, resolvedSummary, selection);
        logSystemInfo(projectId, 'demo generate scaffold 阶段完成', { projectDir: scaffold.projectDir });
        scaffoldProjectDir = scaffold.projectDir;
        scaffoldFiles = await collectGeneratedFiles(projectId, scaffoldProjectDir);
      }
      addCheckpoint(projectId, {
        stage: 'demo-developer',
        timestamp: Date.now(),
        summary: `脚手架已生成: ${scaffoldFiles.length} 个文件`,
        filesGenerated: scaffoldFiles.length,
        completed: false,
      });
      logSystemInfo(projectId, 'demo scaffold 已生成', { fileCount: scaffoldFiles.length });
      const stateForQuality = await WorkflowStateService.getState(projectId);
      const qualityPackIds = stateForQuality?.phaseData?.taskPackage?.qualityPackIds || [];
      const prompt = buildDemoDeveloperPrompt(projectId, { ...session, requirement: mergedRequirement, summary: resolvedSummary, templateRecommendation: recommendation }, spec.content, scaffoldFiles, selection.meta.categoryTemplateId, qualityPackIds);
      logSystemInfo(projectId, 'demo generate 进入代码生成阶段', { projectDir: scaffoldProjectDir, promptLength: prompt.length, scaffoldFiles: scaffoldFiles.length });
      const developerResult = await runDemoDeveloper(projectId, scaffoldProjectDir, prompt);
      logSystemInfo(projectId, 'demo generate 代码生成阶段完成', { outputLength: developerResult.output.length });
      if (billingSessionId && developerResult.usage && developerResult.usage.inputTokens + developerResult.usage.outputTokens > 0) {
        await BillingService.chargeStep(
          billingSessionId,
          'code_generation',
          developerResult.usage.model,
          developerResult.usage.inputTokens,
          developerResult.usage.outputTokens,
        );
      }
      const generatedFiles = await collectGeneratedFiles(projectId, scaffoldProjectDir);
      addCheckpoint(projectId, {
        stage: 'demo-developer',
        timestamp: Date.now(),
        summary: `代码阶段完成，生成 ${generatedFiles.length} 个文件`,
        filesGenerated: generatedFiles.length,
        completed: true,
      });

      await upsertProjectFile(projectId, spec.relativePath, spec.content);
      for (const file of generatedFiles) {
        const content = fs.readFileSync(path.join(projectDir, file), 'utf-8');
        await upsertProjectFile(projectId, `generated/${file}`, content);
      }


      logSystemInfo(projectId, 'demo generate 开始写回最终产物', { generatedFiles: generatedFiles.length });
      const refreshed = await WorkflowStateService.getState(projectId);
      if (refreshed?.phase === 'CODE_GENERATING') {
        await WorkflowStateService.advancePhase(projectId);
      }
      await WorkflowStateService.savePhaseData(projectId, {
        clarificationSession: session,
        summary,
        templateId: recommendation.primary,
        templateRecommendation: recommendation,
        specFile: spec.relativePath,
        specs: {
          requirement: spec.relativePath,
          design: [],
          task: '',
          checklist: '',
        },
        runtimeType: 'frontend-demo',
        scaffoldCreated: true,
        generatedFiles: generatedFiles.map(file => `generated/${file}`),
      });
      await update('projects', (item: any) => item.id === projectId, {
        templateId: recommendation.primary,
        runtimeKind: 'frontend-demo',
        status: 'completed',
        description: summary.businessGoal || mergedRequirement,
      });
      updateStage(projectId, 'finished');
      addCheckpoint(projectId, {
        stage: 'finished',
        timestamp: Date.now(),
        summary: `代码已生成完成: ${generatedFiles.length} 个文件`,
        filesGenerated: generatedFiles.length,
        completed: true,
      });
      logSystemInfo(projectId, 'demo generate 最终写回完成', { generatedFiles: generatedFiles.length });
      logSystemInfo(projectId, 'demo generate 全部完成', { generatedFiles: generatedFiles.length });

      return {
        projectId,
        templateId: recommendation.primary,
        templateMeta,
        specFile: spec.relativePath,
        files: generatedFiles.map(file => `generated/${file}`),
        projectDir: scaffoldProjectDir,
        output: developerResult.output,
        stages: ['matching', 'spec', 'delivering', 'completed'],
      };
    })().finally(() => {
      generationTasks.delete(projectId);
      DemoEventBusService.close(projectId);
    });

    generationTasks.set(projectId, task);
    return task;
  },
};
