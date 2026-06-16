/**
 * 澄清服务层
 * 封装原始需求分析、问题生成、追问分析、摘要更新、文档保存逻辑
 */

import { spawnClaudeNonInteractive } from '@/lib/spawn';
import { logSystemInfo } from '@/lib/logger';
import path from 'path';
import fs from 'fs';
import type {
  ClarificationRound,
  ClarificationQuestion,
  ClarificationAnswer,
  OriginalRequirementSummary,
  RequirementSummary,
  ClarificationSession,
  FollowUpAnalysis,
  AgentHandoff,
  ClarificationProgress,
  FeatureItem,
} from '@/types';

const MAX_ROUNDS = 2;
const SESSION_DIR = 'clarification';

export const ClarificationService = {
  /**
   * 分析原始需求
   */
  async analyzeOriginalRequirement(requirement: string): Promise<OriginalRequirementSummary> {
    const prompt = `你是一位资深产品经理，正在分析用户的原始需求。

用户原始需求：
"""
${requirement}
"""

请分析这个需求，输出以下信息（JSON格式）：

1. coreGoal: 核心目标是什么？（一句话描述用户想做什么）
2. businessBackground: 业务背景是什么？（用户为什么需要这个系统，如果未提及则填"未提及"）
3. targetUser: 目标用户是谁？（给谁用的，如果未提及则填"未提及"）
4. features: 提到了哪些功能诉求？（数组，如果没有则填空数组[]）
5. constraints: 有什么约束条件？（时间/技术/资源限制，如果未提及则填"未提及"）
6. ambiguousPoints: 有哪些模糊的表达？（用户说的不够清楚的地方，数组）
7. missingPoints: 缺失了哪些关键信息？（做需求分析必须知道但用户没说的，数组）

输出格式示例：
\`\`\`json
{
  "coreGoal": "开发一个任务管理系统",
  "businessBackground": "现有流程效率低，需要优化",
  "targetUser": "未提及",
  "features": ["任务创建", "任务分配", "进度跟踪"],
  "constraints": "未提及",
  "ambiguousPoints": ["简单好用具体指什么", "性能好是什么标准"],
  "missingPoints": ["目标用户角色", "数据来源", "权限控制需求"]
}
\`\`\`

只输出JSON，不要输出其他内容。`;

    try {
      const output = await this.callClaude(prompt, 120000); // 2分钟超时
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          rawInput: requirement,
          coreGoal: parsed.coreGoal || '未明确',
          businessBackground: parsed.businessBackground || '未提及',
          targetUser: parsed.targetUser || '未提及',
          features: parsed.features || [],
          constraints: parsed.constraints || '未提及',
          ambiguousPoints: parsed.ambiguousPoints || [],
          missingPoints: parsed.missingPoints || [],
        };
      }
    } catch (error) {
      console.error('分析原始需求失败:', error);
      // 不抛出错误，使用降级处理
    }

    // 降级处理：返回基本信息
    return {
      rawInput: requirement,
      coreGoal: requirement.substring(0, 50),
      businessBackground: '未提及',
      targetUser: '未提及',
      features: [],
      constraints: '未提及',
      ambiguousPoints: ['需要进一步了解用户具体需求'],
      missingPoints: ['目标用户', '功能范围', '数据来源'],
    };
  },

  /**
   * 生成第一轮问题（10个）
   */
  async generateFirstRoundQuestions(summary: OriginalRequirementSummary): Promise<ClarificationQuestion[]> {
    const prompt = `你是一位资深产品经理，正在帮助用户澄清需求。

用户原始需求：
"""
${summary.rawInput}
"""

初步分析：
- 核心目标：${summary.coreGoal}
- 目标用户：${summary.targetUser}
- 功能诉求：${summary.features.join('、') || '未提及'}
- 模糊点：${summary.ambiguousPoints.join('、') || '无'}
- 遗漏点：${summary.missingPoints.join('、') || '无'}

---

请生成 10 个澄清问题，覆盖以下维度，并默认假设后续实现会基于既有若依系后台框架增量开发，不是从0新建系统：

1. 目标用户 - 明确用户群体、角色分工
2. 使用场景 - 明确使用时机、频率
3. 核心痛点 - 明确要解决什么问题
4. 功能优先级 - 明确什么最重要
5. 数据来源 - 明确数据从哪来
6. 协作关系 - 明确流程流转
7. 权限边界 - 明确谁能看什么、改什么
8. 系统关系 - 明确是否需要对接其他系统
9. 异常处理 - 明确出错了怎么办
10. 成功标准 - 明确怎么衡量效果

规则：
- 问题要针对用户的原始需求定制，不要用通用模板
- 对于已明确的内容，问题可以深化而非重复
- 对于未提及的内容，问题要帮助用户思考
- 使用通俗易懂的语言，避免技术术语
- 所有选择题统一使用多选（checkbox），不要使用 radio
- 每个选择题的选项最后都要加上"你帮我选"选项
- 第一个选项是推荐的，在选项文字后加"（推荐）"标记
- 所有问题都设为非必答（required: false），让用户可以跳过

输出 JSON 数组格式：
\`\`\`json
[
  {
    "id": "q1",
    "round": 1,
    "category": "target_user",
    "type": "checkbox",
    "question": "这个系统主要是给谁用的？",
    "options": ["内部员工（推荐）", "外部客户", "两者都有", "你帮我选"],
    "required": false
  },
  ...
]
\`\`\`

只输出JSON数组，不要输出其他内容。`;

    try {
      const output = await this.callClaude(prompt, 180000); // 3分钟超时
      const jsonMatch = output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        return this.validateAndFillQuestions(questions, 1);
      }
    } catch (error) {
      console.error('生成第一轮问题失败:', error);
      // 不抛出错误，使用降级问题
    }

    // 降级：返回默认问题
    return this.getDefaultQuestions(1);
  },

  /**
   * 分析回答，判断是否需要追问
   */
  async analyzeAnswersForFollowUp(
    session: ClarificationSession,
    timeoutMs: number = 120000
  ): Promise<FollowUpAnalysis> {
    const currentRound = session.currentRound;
    const questions = session.questions.filter(q => q.round === currentRound);
    const answers = session.answers.filter(a =>
      questions.find(q => q.id === a.questionId)
    );

    // 构建问答列表
    const qaList = questions.map(q => {
      const ans = answers.find(a => a.questionId === q.id);
      const answerText = Array.isArray(ans?.answer)
        ? (ans?.answer as string[]).join('、')
        : (ans?.answer || '未回答');
      return `Q: ${q.question}\nA: ${answerText}`;
    }).join('\n\n');

    const prompt = `你是一位资深产品经理，正在分析用户的回答。

用户原始需求：
"""
${session.originalSummary.rawInput}
"""

当前轮次：第${currentRound}轮

问题和回答：
${qaList}

当前需求理解：
- 目标用户：${session.summary?.targetUser || '待确认'}
- 核心问题：${session.summary?.coreProblem || '待确认'}
- 第一期功能：${session.summary?.features?.phase1?.map(f => f.name).join('、') || '待确认'}

---

请分析用户的回答，判断是否需要追问：

1. 哪些回答是模糊的？（包含"简单"、"好用"、"一般"、"差不多"等模糊词）
2. 哪些回答存在矛盾？（与其他回答或原始需求冲突）
3. 哪些必答题没有回答？
4. 用户提到了哪些新信息需要追问？
5. 还有其他需要澄清的点吗？

如果不需要追问，needFollowUp 设为 false。
如果需要追问，最多生成 ${5 - (currentRound - 1) * 2} 个追问问题。

输出 JSON 格式：
\`\`\`json
{
  "needFollowUp": true/false,
  "analysisReasons": ["原因1", "原因2"],
  "followUpQuestions": [
    {
      "id": "f1",
      "round": ${currentRound + 1},
      "category": "follow_up",
      "type": "radio",
      "question": "追问问题",
      "options": ["选项1", "选项2"],
      "required": true,
      "followUpReason": "追问原因"
    }
  ]
}
\`\`\`

只输出JSON，不要输出其他内容。`;

    try {
      const output = await this.callClaude(prompt, timeoutMs);
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          needFollowUp: parsed.needFollowUp || false,
          followUpQuestions: (parsed.followUpQuestions || []).map((q: any, i: number) => ({
            ...q,
            id: q.id || `f${i + 1}`,
            round: currentRound + 1,
            category: q.category || 'follow_up',
          })),
          analysisReasons: parsed.analysisReasons || [],
        };
      }
    } catch (error) {
      console.error('分析回答失败:', error);
      // 不抛出错误，返回不需要追问
    }

    // 默认不需要追问
    return {
      needFollowUp: false,
      followUpQuestions: [],
      analysisReasons: [],
    };
  },

  /**
   * 更新需求摘要
   */
  async updateSummary(
    session: ClarificationSession,
    timeoutMs: number = 120000
  ): Promise<RequirementSummary> {
    const allAnswers = session.answers;
    const allQuestions = session.questions;

    // 构建问答列表
    const qaList = allQuestions.map(q => {
      const ans = allAnswers.find(a => a.questionId === q.id);
      const answerText = Array.isArray(ans?.answer)
        ? (ans?.answer as string[]).join('、')
        : (ans?.answer || '未回答');
      return `${q.question}: ${answerText}`;
    }).join('\n');

    const prompt = `你是一位资深产品经理，正在整理需求摘要。

用户原始需求：
"""
${session.originalSummary.rawInput}
"""

所有问答：
${qaList}

---

请整理一份需求摘要，包含：

1. targetUser: 目标用户是谁？（一句话描述）
2. coreProblem: 核心问题是什么？（一句话描述要解决的痛点）
3. features: 功能范围
   - phase1: 第一期必须实现的功能（P0优先级）
   - phase2: 第二期可选功能（P1/P2优先级）
   - excluded: 明确不做的事情
4. successCriteria: 成功标准（怎么衡量做得好不好）
5. constraints: 约束条件
   - time: 时间约束
   - tech: 技术约束
   - resource: 资源约束
6. dataAndPermission: 数据与权限
   - dataSource: 数据来源
   - permissionModel: 权限模型

输出 JSON 格式：
\`\`\`json
{
  "targetUser": "内部员工",
  "coreProblem": "解决任务分配混乱、进度不可见的问题",
  "features": {
    "phase1": [
      {"name": "任务创建", "priority": "P0", "reason": "核心功能"},
      {"name": "任务分配", "priority": "P0", "reason": "核心功能"}
    ],
    "phase2": [
      {"name": "数据统计", "priority": "P1", "reason": "增强功能"}
    ],
    "excluded": [
      {"name": "移动端APP", "reason": "第一期不做"}
    ]
  },
  "successCriteria": ["任务完成率提升20%", "分配时间减少50%"],
  "constraints": {
    "time": "一个月内上线",
    "tech": "使用现有技术栈",
    "resource": "2人开发"
  },
  "dataAndPermission": {
    "dataSource": "手动录入",
    "permissionModel": "按部门隔离"
  }
}
\`\`\`

只输出JSON，不要输出其他内容。`;

    try {
      const output = await this.callClaude(prompt, timeoutMs);
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          targetUser: parsed.targetUser || '未明确',
          coreProblem: parsed.coreProblem || '未明确',
          features: parsed.features || { phase1: [], phase2: [], excluded: [] },
          successCriteria: parsed.successCriteria || [],
          constraints: parsed.constraints || { time: '未提及', tech: '未提及', resource: '未提及' },
          dataAndPermission: parsed.dataAndPermission || { dataSource: '未提及', permissionModel: '未提及' },
        };
      }
    } catch (error) {
      console.error('更新摘要失败:', error);
      // 不抛出错误，返回现有摘要或降级
    }

    // 降级：返回基本摘要
    return session.summary || {
      targetUser: session.originalSummary.targetUser,
      coreProblem: session.originalSummary.coreGoal,
      features: { phase1: [], phase2: [], excluded: [] },
      successCriteria: [],
      constraints: { time: '未提及', tech: '未提及', resource: '未提及' },
      dataAndPermission: { dataSource: '未提及', permissionModel: '未提及' },
    };
  },

  /**
   * 生成智能体传递信息
   */
  async generateAgentHandoff(summary: RequirementSummary): Promise<AgentHandoff> {
    return {
      uiue: {
        targetUsers: summary.targetUser,
        coreScenarios: summary.features.phase1.map(f => f.name).join('、'),
        interactionFocus: `需要简单易用，用户电脑水平一般。主要场景：${summary.coreProblem}`,
      },
      architect: {
        modules: [...summary.features.phase1.map(f => f.name), ...summary.features.phase2.map(f => f.name)],
        techConstraints: summary.constraints.tech,
        integrations: summary.dataAndPermission.dataSource,
      },
      developer: {
        priorities: summary.features.phase1.map(f => f.name),
        acceptanceCriteria: summary.successCriteria.join('、'),
        constraints: `时间：${summary.constraints.time}，资源：${summary.constraints.resource}`,
      },
    };
  },

  /**
   * 保存澄清过程文档
   */
  async saveClarificationProcess(session: ClarificationSession): Promise<void> {
    const dir = this.getClarificationDir(session.projectId);
    fs.mkdirSync(dir, { recursive: true });

    const content = this.generateProcessMarkdown(session);
    fs.writeFileSync(path.join(dir, '澄清过程.md'), content, 'utf-8');

    logSystemInfo(session.projectId, '澄清过程文档已保存', {
      round: session.currentRound,
      status: session.status
    });
  },

  /**
   * 保存最终摘要文档
   */
  async saveFinalSummary(projectId: string, session: ClarificationSession): Promise<void> {
    const dir = this.getClarificationDir(projectId);
    fs.mkdirSync(dir, { recursive: true });

    const content = this.generateSummaryMarkdown(session);
    fs.writeFileSync(path.join(dir, '最终摘要.md'), content, 'utf-8');

    logSystemInfo(projectId, '最终摘要文档已保存', {});
  },

  /**
   * 加载澄清会话
   */
  async loadSession(projectId: string): Promise<ClarificationSession | null> {
    const filePath = path.join(this.getClarificationDir(projectId), 'session.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
    return null;
  },

  /**
   * 保存澄清会话状态
   */
  async saveSession(session: ClarificationSession): Promise<void> {
    const dir = this.getClarificationDir(session.projectId);
    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, 'session.json');
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
  },

  /**
   * 创建新的澄清会话
   */
  async createSession(projectId: string, requirement: string): Promise<ClarificationSession> {
    // 分析原始需求
    const originalSummary = await this.analyzeOriginalRequirement(requirement);

    // 生成第一轮问题
    const questions = await this.generateFirstRoundQuestions(originalSummary);

    const session: ClarificationSession = {
      projectId,
      startTime: new Date().toISOString(),
      currentRound: 1,
      currentQuestionIndex: 0,
      originalSummary,
      questions,
      answers: [],
      summary: null,
      agentHandoff: null,
      status: 'in_progress',
    };

    // 保存会话
    await this.saveSession(session);

    // 保存初始澄清过程
    await this.saveClarificationProcess(session);

    return session;
  },

  /**
   * 提交回答
   */
  async submitAnswer(
    session: ClarificationSession,
    questionId: string,
    answer: string | string[]
  ): Promise<ClarificationSession> {
    // 添加回答
    const existingIndex = session.answers.findIndex(a => a.questionId === questionId);
    const newAnswer: ClarificationAnswer = {
      questionId,
      answer,
      timestamp: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      session.answers[existingIndex] = newAnswer;
    } else {
      session.answers.push(newAnswer);
    }

    // 计算当前轮次已回答的问题数量（用于记录，不影响问题获取）
    const roundQuestions = session.questions.filter(q => q.round === session.currentRound);
    session.currentQuestionIndex = roundQuestions.filter(q =>
      session.answers.some(a =>
        a.questionId === q.id && a.answer &&
        (Array.isArray(a.answer) ? a.answer.length > 0 : a.answer.toString().trim())
      )
    ).length;

    // 保存会话
    await this.saveSession(session);

    return session;
  },

  /**
   * 检查并推进到下一轮
   */
  async checkAndAdvanceRound(session: ClarificationSession): Promise<ClarificationSession> {
    const currentRoundQuestions = session.questions.filter(q => q.round === session.currentRound);
    const allAnswered = currentRoundQuestions.every(q =>
      session.answers.some(a => a.questionId === q.id && a.answer &&
        (Array.isArray(a.answer) ? a.answer.length > 0 : a.answer.toString().trim())
      )
    );

    if (!allAnswered) {
      return session;
    }

    // 更新摘要（使用更长超时）
    session.summary = await this.updateSummary(session, 180000);

    // 检查是否需要追问（使用更长超时）
    const followUpAnalysis = await this.analyzeAnswersForFollowUp(session, 180000);

    if (followUpAnalysis.needFollowUp && session.currentRound < MAX_ROUNDS) {
      // 添加追问问题
      session.questions.push(...followUpAnalysis.followUpQuestions);
      session.currentRound += 1;
      session.currentQuestionIndex = 0;

      // 保存会话
      await this.saveSession(session);
    } else {
      // 澄清完成
      session.status = 'completed';
      session.endTime = new Date().toISOString();
      session.agentHandoff = await this.generateAgentHandoff(session.summary!);

      // 保存最终文档
      await this.saveFinalSummary(session.projectId, session);

      // 保存会话
      await this.saveSession(session);
    }

    // 更新澄清过程
    await this.saveClarificationProcess(session);

    return session;
  },

  /**
   * 获取当前问题
   * 返回当前轮次中第一个未回答的问题
   */
  getCurrentQuestion(session: ClarificationSession): ClarificationQuestion | null {
    const roundQuestions = session.questions.filter(q => q.round === session.currentRound);

    // 找到第一个未回答的问题
    for (const question of roundQuestions) {
      const answered = session.answers.some(a =>
        a.questionId === question.id && a.answer &&
        (Array.isArray(a.answer) ? a.answer.length > 0 : a.answer.toString().trim())
      );
      if (!answered) {
        return question;
      }
    }

    // 当前轮所有问题都已回答
    return null;
  },

  /**
   * 获取进度
   */
  getProgress(session: ClarificationSession): ClarificationProgress {
    const roundQuestions = session.questions.filter(q => q.round === session.currentRound);
    const totalInRound = roundQuestions.length;

    // 计算已回答的问题数量
    const answeredCount = roundQuestions.filter(q =>
      session.answers.some(a =>
        a.questionId === q.id && a.answer &&
        (Array.isArray(a.answer) ? a.answer.length > 0 : a.answer.toString().trim())
      )
    ).length;

    const percentage = Math.round((answeredCount / totalInRound) * 100);

    return {
      round: session.currentRound,
      questionIndex: answeredCount,
      totalQuestions: totalInRound,
      maxRounds: MAX_ROUNDS,
      percentage,
    };
  },

  // ==================== 私有方法 ====================

  /**
   * 调用 Claude
   * 重要：使用 Promise 包装，设置真正的超时机制
   */
  async callClaude(prompt: string, timeoutMs: number = 120000): Promise<string> {
    return new Promise((resolve, reject) => {
      // 创建超时定时器
      const timeoutId = setTimeout(() => {
        reject(new Error(`Claude 调用超时 (${timeoutMs}ms)`));
      }, timeoutMs);

      try {
        const claudeProcess = spawnClaudeNonInteractive(prompt, { timeout: timeoutMs });
        let output = '';
        let error = '';

        claudeProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        claudeProcess.stderr.on('data', (data) => {
          error += data.toString();
        });

        claudeProcess.on('close', (code) => {
          clearTimeout(timeoutId);
          if (code === 0) {
            resolve(output);
          } else if (code === null) {
            // 进程被杀死（通常是超时）
            reject(new Error(`Claude 进程被终止，可能超时。已获取输出: ${output.substring(0, 200)}...`));
          } else {
            reject(new Error(`Claude 退出码 ${code}: ${error || '未知错误'}`));
          }
        });

        claudeProcess.on('error', (err) => {
          clearTimeout(timeoutId);
          reject(new Error(`Claude 进程错误: ${err.message}`));
        });
      } catch (err: any) {
        clearTimeout(timeoutId);
        reject(new Error(`启动 Claude 失败: ${err.message}`));
      }
    });
  },

  /**
   * 获取澄清目录
   */
  getClarificationDir(projectId: string): string {
    return path.join(process.cwd(), 'data', 'projects', projectId, SESSION_DIR);
  },

  /**
   * 验证并补充问题
   */
  validateAndFillQuestions(questions: any[], round: ClarificationRound): ClarificationQuestion[] {
    const result: ClarificationQuestion[] = [];
    const defaultQuestions = this.getDefaultQuestions(round);

    questions.forEach((q, i) => {
      if (q.question && q.type) {
        result.push({
          id: q.id || `q${i + 1}`,
          round: q.round || round,
          category: q.category || 'follow_up',
          type: 'checkbox',
          question: q.question,
          options: q.options,
          required: q.required ?? false,
          followUpReason: q.followUpReason,
        });
      }
    });

    // 补足问题
    while (result.length < 10 && result.length < defaultQuestions.length) {
      result.push(defaultQuestions[result.length]);
    }

    return result;
  },

  /**
   * 获取默认问题
   */
  getDefaultQuestions(round: ClarificationRound): ClarificationQuestion[] {
    if (round === 1) {
      return [
        {
          id: 'q1',
          round: 1,
          category: 'target_user',
          type: 'checkbox',
          question: '这个系统主要是给谁用的？',
          options: ['内部员工（推荐）', '外部客户', '两者都有', '你帮我选'],
          required: false,
        },
        {
          id: 'q2',
          round: 1,
          category: 'scenario',
          type: 'checkbox',
          question: '这个系统主要在什么场景下使用？',
          options: ['日常高频使用（推荐）', '偶尔使用', '各种场景都有', '你帮我选'],
          required: false,
        },
        {
          id: 'q3',
          round: 1,
          category: 'pain_point',
          type: 'checkbox',
          question: '用户现在做这件事最大的困扰是什么？',
          options: ['操作太繁琐（推荐）', '数据容易出错', '协作不方便', '缺少数据统计', '你帮我选'],
          required: false,
        },
        {
          id: 'q4',
          round: 1,
          category: 'priority',
          type: 'checkbox',
          question: '如果只能先做3个核心功能，您会选择哪些？',
          options: ['数据管理', '用户权限', '报表统计', '工作流程', '消息通知', '你帮我选'],
          required: false,
        },
        {
          id: 'q5',
          round: 1,
          category: 'data_source',
          type: 'checkbox',
          question: '系统数据从哪里来？',
          options: ['手动录入（推荐）', '现有系统导入', '自动采集', '你帮我选'],
          required: false,
        },
        {
          id: 'q6',
          round: 1,
          category: 'collaboration',
          type: 'checkbox',
          question: '是否需要多人协作？流程如何流转？',
          options: ['单人使用，无需协作', '需要协作，简单分工（推荐）', '需要审批流程', '你帮我选'],
          required: false,
        },
        {
          id: 'q7',
          round: 1,
          category: 'permission',
          type: 'checkbox',
          question: '不同用户看到的内容需要区分吗？',
          options: ['所有人看一样的', '按角色区分（推荐）', '按部门区分', '你帮我选'],
          required: false,
        },
        {
          id: 'q8',
          round: 1,
          category: 'integration',
          type: 'checkbox',
          question: '是否需要对接其他系统？',
          options: ['不需要（推荐）', '企业微信/钉钉', 'ERP系统', 'CRM系统', '你帮我选'],
          required: false,
        },
        {
          id: 'q9',
          round: 1,
          category: 'exception',
          type: 'checkbox',
          question: '如果系统出现问题，希望怎么处理？',
          options: ['系统自动处理（推荐）', '通知管理员处理', '用户可以撤销操作', '你帮我选'],
          required: false,
        },
        {
          id: 'q10',
          round: 1,
          category: 'success_criteria',
          type: 'checkbox',
          question: '上线后怎么判断系统做得好不好？有什么可以量化的指标吗？（非必填）',
          required: false,
        },
      ];
    }
    return [];
  },

  /**
   * 生成澄清过程 Markdown
   */
  generateProcessMarkdown(session: ClarificationSession): string {
    const lines: string[] = [
      '# 需求澄清过程',
      '',
      `**项目ID**: ${session.projectId}`,
      `**开始时间**: ${session.startTime}`,
      `**结束时间**: ${session.endTime || '进行中'}`,
      `**澄清轮次**: ${session.currentRound}`,
      '',
      '---',
      '',
      '## 一、原始需求',
      '',
      '### 用户原始描述',
      session.originalSummary.rawInput,
      '',
      '### PM初始理解',
      '| 维度 | 内容 |',
      '|------|------|',
      `| 核心目标 | ${session.originalSummary.coreGoal} |`,
      `| 目标用户 | ${session.originalSummary.targetUser} |`,
      `| 功能诉求 | ${session.originalSummary.features.join('、') || '未提及'} |`,
      `| 约束条件 | ${session.originalSummary.constraints} |`,
      '',
      `**模糊点**: ${session.originalSummary.ambiguousPoints.join('、') || '无'}`,
      `**遗漏点**: ${session.originalSummary.missingPoints.join('、') || '无'}`,
      '',
    ];

    // 各轮问答
    for (let round = 1; round <= session.currentRound; round++) {
      const roundQuestions = session.questions.filter(q => q.round === round);
      if (roundQuestions.length === 0) continue;

      lines.push('---', '');
      lines.push(`## ${['二', '三', '四'][round - 1]}、第${round}轮问答`, '');
      lines.push('| 序号 | 问题 | 用户回答 | 澄清结果 |');
      lines.push('|------|------|---------|---------|');

      roundQuestions.forEach((q, i) => {
        const ans = session.answers.find(a => a.questionId === q.id);
        const answerText = ans
          ? (Array.isArray(ans.answer) ? ans.answer.join('、') : ans.answer)
          : '未回答';
        lines.push(`| ${i + 1} | ${q.question} | ${answerText} | ${answerText !== '未回答' ? '已确认' : '待确认'} |`);
      });

      lines.push('');
    }

    // 需求演进记录
    if (session.summary) {
      lines.push('---', '');
      lines.push('## 需求演进记录', '');
      lines.push('| 阶段 | 需求理解变化 |');
      lines.push('|------|-------------|');
      lines.push(`| 原始 | ${session.originalSummary.coreGoal} |`);
      lines.push(`| 最终 | ${session.summary.coreProblem} |`);
      lines.push('');
    }

    return lines.join('\n');
  },

  /**
   * 生成最终摘要 Markdown
   */
  generateSummaryMarkdown(session: ClarificationSession): string {
    const summary = session.summary;
    if (!summary) return '# 需求澄清最终摘要\n\n澄清未完成。';

    const lines: string[] = [
      '# 需求澄清最终摘要',
      '',
      `**项目ID**: ${session.projectId}`,
      `**生成时间**: ${session.endTime || new Date().toISOString()}`,
      `**状态**: 已澄清`,
      '',
      '---',
      '',
      '## 目标用户',
      summary.targetUser,
      '',
      '## 核心问题',
      `一句话：${summary.coreProblem}`,
      '',
      '## 功能范围',
      '',
      '### 第一期（必须）',
      ...summary.features.phase1.map(f => `- ${f.name} - ${f.priority}`),
      '',
      '### 第二期（可选）',
      ...summary.features.phase2.map(f => `- ${f.name} - ${f.priority}`),
      '',
      '### 不做',
      ...summary.features.excluded.map(f => `- ${f.name} - ${f.reason}`),
      '',
      '## 成功标准',
      ...summary.successCriteria.map(s => `- ${s}`),
      '',
      '## 关键约束',
      `- 时间：${summary.constraints.time}`,
      `- 技术：${summary.constraints.tech}`,
      `- 资源：${summary.constraints.resource}`,
      '',
      '## 数据与权限',
      `- 数据来源：${summary.dataAndPermission.dataSource}`,
      `- 权限模型：${summary.dataAndPermission.permissionModel}`,
      '',
      '---',
      '',
      '## 传递给后续智能体',
      '',
      '### UIUE',
      `- 用户画像：${session.agentHandoff?.uiue.targetUsers || '未明确'}`,
      `- 核心场景：${session.agentHandoff?.uiue.coreScenarios || '未明确'}`,
      `- 交互重点：${session.agentHandoff?.uiue.interactionFocus || '未明确'}`,
      '',
      '### Architect',
      `- 模块清单：${session.agentHandoff?.architect.modules.join('、') || '未明确'}`,
      `- 技术约束：${session.agentHandoff?.architect.techConstraints || '未明确'}`,
      `- 对接系统：${session.agentHandoff?.architect.integrations || '未明确'}`,
      '',
      '### Developer',
      `- 优先级：${session.agentHandoff?.developer.priorities.join(' > ') || '未明确'}`,
      `- 验收标准：${session.agentHandoff?.developer.acceptanceCriteria || '未明确'}`,
      `- 约束：${session.agentHandoff?.developer.constraints || '未明确'}`,
      '',
    ];

    return lines.join('\n');
  },
};