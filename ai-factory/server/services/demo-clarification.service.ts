import fs from 'fs';
import path from 'path';
import { spawnClaudeNonInteractive } from '@/lib/spawn';
import { DemoTemplateService } from './demo-template.service';
import { DEMO_TEMPLATE_MANIFESTS, DEMO_VISUAL_TEMPLATES } from '@/server/demo-templates/manifest';
import type { DemoTemplateCategory, DemoTemplateRecommendation } from '@/types/workflow';

const VISUAL_TEMPLATES = DEMO_VISUAL_TEMPLATES;
const TEMPLATE_MANIFESTS = DEMO_TEMPLATE_MANIFESTS;

const LEGACY_TEMPLATE_ALIASES: Record<string, string> = {
  admin: 'ops-center',
  'admin-console': 'ops-center',
  'chat-app': 'copilot-assistant',
  'knowledge-base': 'policy-library',
};

const LEGACY_VISUAL_ALIASES: Record<string, string> = {
  dark: 'elegant-dark',
  glass: 'modern',
  brutalist: 'modern',
};

const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  'chat-app': 'ai-chat',
  'knowledge-base': 'knowledge-hub',
};

function normalizeTemplateId(id?: string | null): string {
  if (!id) return '';
  return LEGACY_TEMPLATE_ALIASES[id] || id;
}

function normalizeVisualId(id?: string | null): string {
  if (!id) return '';
  return LEGACY_VISUAL_ALIASES[id] || id;
}

function normalizeCategory(category?: string | null): string {
  if (!category) return '';
  return LEGACY_CATEGORY_ALIASES[category] || category;
}

function findTemplate(id?: string | null) {
  if (!id) return null;
  return TEMPLATE_MANIFESTS.find(item => item.id === normalizeTemplateId(id)) || null;
}

function findVisual(id?: string | null) {
  if (!id) return null;
  return VISUAL_TEMPLATES.find(item => item.id === normalizeVisualId(id)) || null;
}

function fallbackTemplate(category?: string | null) {
  const cat = normalizeCategory(category) || 'admin-console';
  return TEMPLATE_MANIFESTS.find(item => item.productCategory === cat) || TEMPLATE_MANIFESTS[0];
}

function fallbackVisual() {
  return VISUAL_TEMPLATES[0];
}

function ensureTemplateAdjustments(items: string[] | undefined, templateName: string, templateDescription: string, visualName: string): string[] {
  const list = (items || []).map(item => item.trim()).filter(Boolean);
  if (list.length >= 3) return list;
  const fallbacks = [
    `首页围绕“${templateName}”的核心页面蓝图组织，突出主要业务场景。`,
    `整体视觉采用“${visualName}”风格，保持商务、克制、不浮夸。`,
    `模块文案、字段与示例数据要贴合“${templateDescription}”的业务语境。`,
  ];
  for (const item of fallbacks) {
    if (list.length >= 3) break;
    if (!list.includes(item)) list.push(item);
  }
  return list;
}

function ensureTemplateReason(reason: string | undefined, templateName: string): string {
  return reason?.trim() || `该需求与“${templateName}”的业务语境最匹配。`;
}

function buildTemplateRecommendation(summary: any): DemoTemplateRecommendation {
  const template = findTemplate(summary.selectedTemplateId) || fallbackTemplate(summary.selectedTemplateCategory);
  const visual = findVisual(summary.selectedVisualTemplateId) || fallbackVisual();
  return {
    primary: template.id,
    secondary: visual.id,
    reason: ensureTemplateReason(summary.templateReason, template.name),
    categoryTemplateId: template.productCategory,
    visualTemplateId: visual.id,
    templateAdjustments: ensureTemplateAdjustments(summary.templateAdjustments, template.name, template.description, visual.name),
  };
}

function buildTemplateCatalogForPrompt() {
  const grouped = TEMPLATE_MANIFESTS.reduce<Record<string, typeof TEMPLATE_MANIFESTS>>((acc, item) => {
    if (!acc[item.productCategory]) acc[item.productCategory] = [];
    acc[item.productCategory].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).map(([category, templates]) => ({
    category,
    templates: templates.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      productCategory: item.productCategory,
    })),
  }));
}

function buildSummaryAndTemplatePrompt(session: DemoClarificationSession) {
  return `你是一位资深产品经理，同时也是 demo 工厂的模板选择器。你要一次性完成“需求摘要整理 + 模板选择”两件事。

用户原始需求：
"""
${session.requirement}
"""

完整问答：
${buildQA(session)}

可选业务模板（按大类分组，每类有多个选项，请选择最合适的一个）：
${JSON.stringify(buildTemplateCatalogForPrompt(), null, 2)}

可选视觉模板（商务风，只能从以下三种中选择）：
${JSON.stringify(VISUAL_TEMPLATES, null, 2)}

请输出一个 JSON，对需求进行结构化整理并完成模板选择，字段必须包含：
- projectName: 项目名称
- businessGoal: 核心业务目标
- targetUsers: 字符串数组
- roles: 字符串数组
- coreModules: 字符串数组
- pageBlueprints: 字符串数组
- navigation: 字符串数组
- entities: [{ name, fields: string[] }]
- keyInteractions: 字符串数组
- visualStyle: 字符串
- dataStrategy: 字符串
- charts: 字符串数组
- simulationStrategy: 字符串数组
- downgradeNotes: 字符串数组
- demoScope: 字符串
- requirementHighlights: 字符串数组
- answerHighlights: [{ question: string, answer: string }]
- selectedTemplateId: 从给定业务模板里选一个
- selectedVisualTemplateId: 只能从 modern、elegant、elegant-dark 中选一个
- templateReason: 模板选择理由
- templateAdjustments: 字符串数组，至少 3 条

要求：
1. 这是纯前端演示系统，不能假装真的有后端。
2. 对复杂能力，要输出清晰的前端模拟策略和降级说明。
3. pageBlueprints 要覆盖首页、列表、详情、表单、统计/流程等实际页面。
4. entities 要尽量推导业务对象和字段。
5. 模板选择必须只从给定模板中选，不允许发明新模板。
6. 先判断产品形态属于哪一大类，再在同类多个模板中选择最贴近实际业务场景的一个。
7. 模板选择必须基于产品形态，不允许简单按行业词。
8. 只输出 JSON，不要输出任何解释文字。`;
}

function extractBalancedObject(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1].trim() : text;
  const start = source.indexOf('{');
  if (start === -1) throw new Error('摘要结果未返回 JSON');

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('摘要结果 JSON 不完整');
}

function sanitizeSummaryJson(text: string): string {
  return extractBalancedObject(text)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function parseSummaryJson(text: string, fallback: any) {
  try {
    return JSON.parse(sanitizeSummaryJson(text));
  } catch {
    return fallback;
  }
}

const FIXED_QUESTION_COUNT = 10;
const SESSION_FILE = 'demo-clarification-session.json';

export interface DemoClarificationQuestion {
  id: string;
  round: number;
  type: 'radio' | 'checkbox' | 'textarea';
  question: string;
  options?: string[];
  required?: boolean;
  followUpReason?: string;
}

export interface DemoClarificationAnswer {
  questionId: string;
  answer: string | string[];
  timestamp?: string;
}

export interface DemoClarificationSummary {
  projectName: string;
  businessGoal: string;
  targetUsers: string[];
  roles: string[];
  coreModules: string[];
  pageBlueprints: string[];
  navigation: string[];
  entities: Array<{
    name: string;
    fields: string[];
  }>;
  keyInteractions: string[];
  visualStyle: string;
  dataStrategy: string;
  charts: string[];
  simulationStrategy: string[];
  downgradeNotes: string[];
  demoScope: string;
  requirementHighlights: string[];
  answerHighlights: Array<{
    question: string;
    answer: string;
  }>;
  moduleSchemas: Array<{
    id: string;
    name: string;
    menuLabel: string;
    description: string;
    entityName: string;
    pageTypes: string[];
    primaryActions: string[];
  }>;
  formSchemas: Array<{
    moduleId: string;
    title: string;
    fields: Array<{
      key: string;
      label: string;
      type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'status';
      required: boolean;
      options?: string[];
      placeholder?: string;
      group?: string;
    }>;
  }>;
  listSchemas: Array<{
    moduleId: string;
    title: string;
    columns: string[];
    filters: string[];
    batchActions: string[];
    rowActions: string[];
  }>;
  detailSchemas: Array<{
    moduleId: string;
    title: string;
    sections: string[];
    timeline?: string[];
    relatedBlocks?: string[];
  }>;
  storageSchemas: Array<{
    moduleId: string;
    storageKey: string;
    entityName: string;
    fields: string[];
  }>;
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoClarificationSession {
  projectId: string;
  requirement: string;
  status: 'pending' | 'completed';
  currentRound: number;
  currentQuestionIndex: number;
  questions: DemoClarificationQuestion[];
  answers: DemoClarificationAnswer[];
  summary?: DemoClarificationSummary;
  templateRecommendation?: DemoTemplateRecommendation;
  createdAt: string;
  updatedAt: string;
  endTime?: string;
}

function getSessionPath(projectId: string) {
  return path.join(process.cwd(), 'data', 'projects', projectId, SESSION_FILE);
}

function saveSession(session: DemoClarificationSession) {
  const filePath = getSessionPath(session.projectId);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
}

function deriveProjectName(requirement: string) {
  return requirement.replace(/[，。,！!？?；;：:]/g, ' ').trim().slice(0, 24) || 'Demo 商务系统';
}

function splitToList(value: string | string[] | undefined, fallback: string[]): string[] {
  if (Array.isArray(value)) return value.map(item => item.trim()).filter(Boolean);
  if (!value || !String(value).trim()) return fallback;
  return String(value).split(/[、,，;；\n]/).map(item => item.trim()).filter(Boolean);
}

function normalizeAnswerValue(question: DemoClarificationQuestion, answer: string | string[]) {
  const options = question.options || [];
  const normalized = Array.isArray(answer) ? answer.map(item => item.trim()).filter(Boolean) : String(answer || '').trim();

  if (Array.isArray(normalized)) {
    if (normalized.includes('以上都是')) {
      return options.filter(option => option !== '以上都是' && option !== '你帮我定');
    }
    return normalized.filter(option => option !== '你帮我定');
  }

  if (normalized === '以上都是') {
    return options.filter(option => option !== '以上都是' && option !== '你帮我定').join('、');
  }

  return normalized;
}

function formatAnswerText(question: DemoClarificationQuestion, answer: string | string[] | undefined) {
  if (!answer) return '未回答';
  const normalized = normalizeAnswerValue(question, answer);
  return Array.isArray(normalized) ? normalized.join('、') : normalized;
}

function buildAnswerHighlights(session: DemoClarificationSession) {
  return session.questions.map((question) => {
    const answer = session.answers.find(item => item.questionId === question.id);
    return {
      question: question.question,
      answer: formatAnswerText(question, answer?.answer),
    };
  });
}

function buildAnswerDetails(session: DemoClarificationSession) {
  return session.questions.map((question) => {
    const answer = session.answers.find(item => item.questionId === question.id);
    return {
      question: question.question,
      answer: formatAnswerText(question, answer?.answer),
      resolvedAnswers: Array.isArray(normalizeAnswerValue(question, answer?.answer || ''))
        ? normalizeAnswerValue(question, answer?.answer || '') as string[]
        : [String(normalizeAnswerValue(question, answer?.answer || '') || '未回答')],
    };
  });
}

function getAnswerHighlightsForPrompt(session: DemoClarificationSession) {
  return buildAnswerDetails(session).map((item) => `Q: ${item.question}\nA: ${item.answer}\n展开: ${item.resolvedAnswers.join('；')}`);
}

function dedupeList(values: string[]) {
  return Array.from(new Set(values.map(item => item.trim()).filter(Boolean)));
}

function expandUniversalAnswer(session: DemoClarificationSession, questionText: string, fallback: string[]) {
  const detail = buildAnswerDetails(session).find(item => item.question === questionText);
  if (!detail) return fallback;
  return dedupeList(detail.resolvedAnswers.filter(item => item !== '未回答'));
}

function deriveSummaryFromAnswers(session: DemoClarificationSession, fallback: any) {
  const targetUsers = expandUniversalAnswer(session, '这次医院健康管理系统演示，最希望优先打动哪一类决策者？', fallback.targetUsers);
  const coreValue = expandUniversalAnswer(session, '如果首页只能传达一个核心价值，最应该让用户第一眼感受到什么？', []);
  const objectLine = expandUniversalAnswer(session, '这套系统的主线业务对象，演示时最应该围绕什么来组织模块？', []);
  const navigation = expandUniversalAnswer(session, '主导航的第一层结构，哪种最符合你希望的业务表达方式？', fallback.navigation);
  const listFocus = expandUniversalAnswer(session, '列表页最需要重点体现哪些业务筛选与追踪能力？', []);
  const detailFocus = expandUniversalAnswer(session, '患者详情页最应该重点展示哪种阅读体验？', []);
  const formFocus = expandUniversalAnswer(session, '表单页在演示中最该突出哪类高频业务操作体验？', []);
  const complexFlow = expandUniversalAnswer(session, '对于危急值预警、病历质控、感染控制这类复杂能力，页面主要应该展示什么效果？', []);
  const charts = expandUniversalAnswer(session, '管理层看板最值得重点呈现哪些指标视角？', fallback.charts);
  const scope = expandUniversalAnswer(session, '作为纯前端演示系统，这次最适合把演示边界收敛到哪一层？', [fallback.demoScope]);

  return {
    ...fallback,
    targetUsers: targetUsers.length ? targetUsers : fallback.targetUsers,
    roles: targetUsers.length ? targetUsers : fallback.roles,
    navigation: navigation.length ? navigation : fallback.navigation,
    keyInteractions: dedupeList([...fallback.keyInteractions, ...listFocus, ...formFocus, ...complexFlow]),
    pageBlueprints: dedupeList([...fallback.pageBlueprints, ...detailFocus]),
    charts: charts.length ? charts : fallback.charts,
    demoScope: scope[0] || fallback.demoScope,
    requirementHighlights: dedupeList([...fallback.requirementHighlights, ...coreValue, ...objectLine, ...detailFocus, ...formFocus, ...complexFlow]),
    answerHighlights: buildAnswerHighlights(session),
  };
}

function parseEntities(requirement: string, modules: string[]): Array<{ name: string; fields: string[] }> {
  const lower = requirement.toLowerCase();
  const seed: Array<{ keywords: string[]; name: string; fields: string[] }> = [
    { keywords: ['客户', 'crm', '销售'], name: '客户', fields: ['名称', '等级', '负责人', '联系方式', '状态'] },
    { keywords: ['项目', '任务', '协同'], name: '任务', fields: ['标题', '负责人', '优先级', '截止时间', '状态'] },
    { keywords: ['审批', '流程', '报销', '请假'], name: '申请单', fields: ['单号', '申请人', '类型', '金额/时长', '状态'] },
    { keywords: ['文章', '内容', 'cms'], name: '内容', fields: ['标题', '栏目', '作者', '发布时间', '状态'] },
    { keywords: ['工单', '客服', 'ticket'], name: '工单', fields: ['编号', '客户', '优先级', '处理人', '状态'] },
    { keywords: ['设备', '资产', '巡检'], name: '设备', fields: ['名称', '编码', '所属部门', '责任人', '状态'] },
    { keywords: ['课程', '考试', '培训'], name: '课程', fields: ['名称', '讲师', '分类', '开始时间', '状态'] },
    { keywords: ['数据', '指标', '报表'], name: '指标', fields: ['名称', '口径', '周期', '当前值', '趋势'] },
    { keywords: ['医院', '医疗', '门诊', '住院'], name: '医院数据', fields: ['名称', '地区', '负责人', '统计周期', '状态'] },
  ];

  const matched = seed.filter(item => item.keywords.some(keyword => lower.includes(keyword)));
  if (matched.length > 0) return matched.slice(0, 6).map(item => ({ name: item.name, fields: item.fields }));

  const derived = modules.slice(0, 6).map((moduleName, index) => ({
    name: moduleName.replace(/管理|中心|概览|看板/g, '') || `实体${index + 1}`,
    fields: ['名称', '编码', '负责人', '创建时间', '状态'],
  }));

  return derived.length > 0 ? derived : [{ name: '业务对象', fields: ['名称', '负责人', '描述', '创建时间', '状态'] }];
}

function safeSchemaKey(value: string, fallback: string) {
  return value.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function buildFieldSchema(entityName: string, fields: string[]) {
  return fields.map((field, index) => ({
    key: safeSchemaKey(field, `${entityName}-${index + 1}`),
    label: field,
    type: /时间|日期/.test(field) ? 'date' as const : /状态/.test(field) ? 'status' as const : /类型|等级|分类/.test(field) ? 'select' as const : /金额|数量|比例|率|值/.test(field) ? 'number' as const : /描述|说明|原因/.test(field) ? 'textarea' as const : 'text' as const,
    required: index < Math.min(3, fields.length),
    options: /状态/.test(field) ? ['草稿', '启用', '停用', '完成'] : /类型|等级|分类/.test(field) ? ['标准', '重点', '高级', '你帮我定'] : undefined,
    placeholder: `请输入${field}`,
    group: index < 3 ? '基础信息' : '扩展信息',
  }));
}

function buildModuleSchemas(modules: string[], entities: Array<{ name: string; fields: string[] }>, projectName: string) {
  return modules.map((moduleName, index) => {
    const entity = entities[index % Math.max(entities.length, 1)] || { name: '业务对象', fields: ['名称', '负责人', '状态'] };
    const moduleId = safeSchemaKey(moduleName, `module-${index + 1}`);
    return {
      id: moduleId,
      name: moduleName,
      menuLabel: moduleName,
      description: `${projectName}中的${moduleName}模块`,
      entityName: entity.name,
      pageTypes: ['dashboard', 'list', 'detail', 'form'],
      primaryActions: ['新增', '编辑', '删除', '查看详情'],
    };
  });
}

function buildListSchemas(moduleSchemas: Array<{ id: string; name: string; entityName: string }>, entities: Array<{ name: string; fields: string[] }>) {
  return moduleSchemas.map((moduleSchema, index) => {
    const entity = entities[index % Math.max(entities.length, 1)] || { name: '业务对象', fields: ['名称', '负责人', '状态'] };
    return {
      moduleId: moduleSchema.id,
      title: `${moduleSchema.name}列表`,
      columns: entity.fields.slice(0, 5),
      filters: entity.fields.slice(0, 3),
      batchActions: ['批量删除', '批量导出'],
      rowActions: ['查看', '编辑', '删除'],
    };
  });
}

function buildDetailSchemas(moduleSchemas: Array<{ id: string; name: string; entityName: string }>, entities: Array<{ name: string; fields: string[] }>) {
  return moduleSchemas.map((moduleSchema, index) => {
    const entity = entities[index % Math.max(entities.length, 1)] || { name: '业务对象', fields: ['名称', '负责人', '状态'] };
    return {
      moduleId: moduleSchema.id,
      title: `${moduleSchema.entityName}详情`,
      sections: ['基础信息', '状态信息', '关联信息'],
      timeline: entity.fields.filter(field => /时间|日期|状态/.test(field)).slice(0, 3),
      relatedBlocks: ['统计摘要', '关联记录'],
    };
  });
}

function buildStorageSchemas(projectId: string, moduleSchemas: Array<{ id: string; entityName: string }>, entities: Array<{ name: string; fields: string[] }>) {
  return moduleSchemas.map((moduleSchema, index) => ({
    moduleId: moduleSchema.id,
    storageKey: `demo-factory:${projectId}:${moduleSchema.id}`,
    entityName: moduleSchema.entityName,
    fields: (entities[index % Math.max(entities.length, 1)] || { fields: ['名称', '负责人', '状态'] }).fields,
  }));
}

function extractJsonObject<T>(text: string, fallback: T): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
}

function extractJsonArray<T>(text: string, fallback: T[]): T[] {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1].trim() : text;
  const start = source.indexOf('[');
  if (start === -1) return fallback;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, i + 1)) as T[];
        } catch {
          return fallback;
        }
      }
    }
  }
  return fallback;
}

async function callClaude(prompt: string, timeoutMs = 180000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`Claude 调用超时 (${timeoutMs}ms)`)), timeoutMs);
    try {
      const proc = spawnClaudeNonInteractive(prompt, { timeout: timeoutMs });
      let output = '';
      let error = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      proc.stderr.on('data', (data) => {
        error += data.toString();
      });
      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve(output);
          return;
        }
        reject(new Error(error || `Claude 退出码 ${code}`));
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

async function generateQuestions(requirement: string, previousQA: string): Promise<DemoClarificationQuestion[]> {
  const prompt = `你现在只做一件事：返回一个 JSON 数组，里面有 10 个需求澄清问题。

用户原始需求：
${requirement}

已有问答：
${previousQA || '无'}

硬性要求：
1. 必须返回合法 JSON 数组，禁止 markdown，禁止解释，禁止代码块围栏。
2. 数组长度必须正好 10。
3. 每个元素字段固定为：id, round, type, question, options, required。
4. id 必须依次是 q1 到 q10。
5. round 固定为 1。
6. type 只能是 checkbox（所有问题都是多选）。
7. required 固定为 false。
8. 所有问题都必须是业务问题，不允许问技术栈、数据库、部署、接口。
9. 所有问题都必须是选择题，禁止 textarea，禁止开放题。
10. 每题 options 必须是 4 到 5 个字符串。
11. 问题顺序要覆盖：业务目标、目标用户、角色、页面结构、核心模块、关键流程、表单动作、结果反馈、看板/数据、演示边界。

返回格式示例：
[
  {
    “id”: “q1”,
    “round”: 1,
    “type”: “checkbox”,
    “question”: “这个系统最想解决的核心业务目标是什么？”,
    “options”: [“提升业务处理效率”, “加强过程管理与透明度”, “突出数据分析与经营看板”, “满足合规审计要求”],
    “required”: false
  }
]
`;

  const MAX_RETRIES = 3;
  let parsed: DemoClarificationQuestion[] = [];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      parsed = extractJsonArray<DemoClarificationQuestion>(await callClaude(prompt), [])
        .filter(item => item.question && item.type)
        .slice(0, FIXED_QUESTION_COUNT)
        .map((item, index) => ({
          id: item.id || `q${index + 1}`,
          round: 1,
          type: 'checkbox' as const,
          question: item.question,
          options: item.options,
          required: false,
          followUpReason: item.followUpReason,
        }));

      if (parsed.length === FIXED_QUESTION_COUNT) {
        return parsed;
      }
      console.log(`[generateQuestions] attempt ${attempt}: got ${parsed.length}/${FIXED_QUESTION_COUNT}, retrying...`);
    } catch (err) {
      console.log(`[generateQuestions] attempt ${attempt}: parse error, retrying...`);
    }
  }

  // 重试后仍不足，使用默认问题补齐
  console.log(`[generateQuestions] all retries done, still ${parsed.length}/${FIXED_QUESTION_COUNT}, filling with defaults`);
  while (parsed.length < FIXED_QUESTION_COUNT) {
    const idx = parsed.length + 1;
    parsed.push({
      id: `q${idx}`,
      round: 1,
      type: 'checkbox',
      question: `关于${deriveProjectName(requirement)}的第 ${idx} 个业务问题`,
      options: ['标准方案', '定制方案', '精简方案', '你帮我定'],
      required: false,
    });
  }
  return parsed;
}

function buildQA(session: DemoClarificationSession) {
  return getAnswerHighlightsForPrompt(session).join('\n\n');
}

async function buildSummary(session: DemoClarificationSession): Promise<DemoClarificationSummary> {
  const requirement = session.requirement;
  const isPortalShowcaseDemo = /专题页|专题站|活动页|活动专题|着陆页|landing|峰会|大会|发布会|招商|报名入口|主视觉|嘉宾阵容|议程安排/i.test(requirement);
  const isLearningExamDemo = /培训|学习中心|课程|考试|题库|成绩|学习任务/i.test(requirement);
  const isCommerceDemo = /商城|订货|采购商城|商品详情|下单|订单状态|购物|供应商比价/i.test(requirement);
  const isSchedulingDemo = /预约|排班|调度|时段|班次|值班|预约单/i.test(requirement);
  const isDeliveryDemo = /项目交付|交付平台|里程碑|验收|实施协同|上线准备|交付任务/i.test(requirement);
  const isAiChatDemo = !isPortalShowcaseDemo && !isLearningExamDemo && !isCommerceDemo && !isSchedulingDemo && !isDeliveryDemo && /服务台|问答助手|聊天助手|会话|消息区|输入区|工单上下文|客服会话|在线咨询|智能助理/i.test(requirement);
  const fallbackModules = isPortalShowcaseDemo
    ? ['活动主视觉', '大会亮点', '议程安排', '嘉宾阵容', '报名入口']
    : isLearningExamDemo
      ? ['学习首页', '课程列表', '考试安排', '成绩结果', '学习任务']
      : isCommerceDemo
        ? ['商城首页', '商品列表', '商品详情', '订单状态', '下单入口']
        : isSchedulingDemo
          ? ['预约首页', '服务时段', '预约详情', '排班状态', '确认提醒']
          : isDeliveryDemo
            ? ['项目总览', '里程碑', '交付任务', '风险状态', '验收记录']
            : isAiChatDemo
              ? ['服务台概览', '会话历史', '消息问答区', '常见问题推荐', '工单上下文']
              : ['首页看板', '列表管理', '详情页', '表单录入'];
  const fallbackEntities = parseEntities(session.requirement, fallbackModules);
  const fallbackModuleSchemas = buildModuleSchemas(fallbackModules, fallbackEntities, deriveProjectName(session.requirement));
  const fallbackSelection = DemoTemplateService.resolveStoredRecommendation(buildTemplateRecommendation({
    selectedTemplateId: isPortalShowcaseDemo
      ? 'campaign-landing'
      : isLearningExamDemo
        ? 'training-center'
        : isCommerceDemo
          ? 'ordering-mall'
          : isSchedulingDemo
            ? 'appointment-center'
            : isDeliveryDemo
              ? 'delivery-hub'
              : isAiChatDemo
                ? 'service-desk-chat'
                : 'ops-center',
    selectedVisualTemplateId: 'modern',
    templateReason: undefined,
    templateAdjustments: undefined,
  }));
  const fallback = {
    projectName: deriveProjectName(session.requirement),
    businessGoal: session.requirement,
    targetUsers: isPortalShowcaseDemo ? ['决策者', '参会者', '合作伙伴'] : isAiChatDemo ? ['员工', '客服人员', '管理者'] : ['业务人员', '管理员'],
    roles: isPortalShowcaseDemo ? ['运营人员', '市场人员', '访客'] : isAiChatDemo ? ['员工', '客服人员', '管理者'] : ['业务人员', '管理员'],
    coreModules: fallbackModules,
    pageBlueprints: isPortalShowcaseDemo ? ['活动主视觉', '大会亮点', '议程安排', '嘉宾阵容', '报名入口', '常见问题'] : isLearningExamDemo ? ['学习首页', '课程列表', '考试安排', '成绩结果', '学习任务'] : isCommerceDemo ? ['商城首页', '商品列表', '商品详情', '订单状态', '下单入口'] : isSchedulingDemo ? ['预约首页', '服务时段', '预约详情', '排班状态', '确认提醒'] : isDeliveryDemo ? ['项目总览', '里程碑', '交付任务', '风险状态', '验收记录'] : isAiChatDemo ? ['服务台概览首页', '会话历史列表', '消息问答区', '常见问题推荐', '工单上下文面板'] : ['首页看板', '业务列表', '业务详情', '新增/编辑'],
    navigation: fallbackModules,
    entities: fallbackEntities,
    keyInteractions: isPortalShowcaseDemo ? ['分区浏览', '锚点导航', '报名转化', '议程展开', 'FAQ 查看'] : isLearningExamDemo ? ['课程筛选', '学习进度查看', '考试切换', '成绩反馈', '任务查看'] : isCommerceDemo ? ['商品筛选', '下单操作', '订单查看', '状态跟踪', '推荐商品'] : isSchedulingDemo ? ['服务选择', '时间预约', '排班查看', '状态确认', '提醒反馈'] : isDeliveryDemo ? ['项目切换', '里程碑跟踪', '任务处理', '风险查看', '验收反馈'] : isAiChatDemo ? ['问题提问与回复', '候选答案选择', 'FAQ 推荐', '工单上下文查看', '转人工/转工单'] : ['列表查询与筛选', '新增、编辑、删除', '详情查看与状态变更'],
    visualStyle: '商务专业',
    dataStrategy: '本地 JSON + 浏览器存储',
    charts: isPortalShowcaseDemo ? ['活动亮点', '议程安排', '报名转化', '嘉宾阵容'] : isLearningExamDemo ? ['课程进度', '考试安排'] : isCommerceDemo ? ['热销商品', '订单趋势'] : isSchedulingDemo ? ['预约量', '排班状态'] : isDeliveryDemo ? ['里程碑进度', '交付风险'] : isAiChatDemo ? ['咨询量与解决率概览', '响应时长统计'] : ['汇总统计卡片'],
    simulationStrategy: ['用本地 mock API 封装数据读写', '用浏览器存储模拟持久化'],
    downgradeNotes: ['涉及真实后端、第三方系统、复杂算法的能力统一以前端模拟近似表达。'],
    demoScope: isPortalShowcaseDemo ? '专题内容展示 + 报名转化路径前端演示' : isLearningExamDemo ? '学习与考试前端演示' : isCommerceDemo ? '商品浏览 + 下单 + 订单状态前端演示' : isSchedulingDemo ? '预约 + 排班前端演示' : isDeliveryDemo ? '项目交付 + 里程碑前端演示' : isAiChatDemo ? '问答 + FAQ + 工单协同前端演示' : '完整 CRUD + 筛选分页',
    requirementHighlights: splitToList(session.requirement, [session.requirement]),
    answerHighlights: buildAnswerHighlights(session),
    moduleSchemas: fallbackModuleSchemas,
    formSchemas: fallbackModuleSchemas.map((moduleSchema, index) => ({
      moduleId: moduleSchema.id,
      title: `${moduleSchema.entityName}表单`,
      fields: buildFieldSchema(moduleSchema.entityName, fallbackEntities[index % Math.max(fallbackEntities.length, 1)].fields),
    })),
    listSchemas: buildListSchemas(fallbackModuleSchemas, fallbackEntities),
    detailSchemas: buildDetailSchemas(fallbackModuleSchemas, fallbackEntities),
    storageSchemas: buildStorageSchemas(session.projectId, fallbackModuleSchemas, fallbackEntities),
    selectedTemplateId: fallbackSelection.meta.templateId,
    selectedTemplateCategory: fallbackSelection.meta.categoryTemplateId,
    selectedVisualTemplateId: fallbackSelection.meta.visualTemplateId,
    templateReason: fallbackSelection.recommendation.reason,
    templateAdjustments: fallbackSelection.recommendation.templateAdjustments,
  };

  try {
    const parsed = parseSummaryJson(await callClaude(buildSummaryAndTemplatePrompt(session)), fallback);
    const modules = splitToList(parsed.coreModules, fallbackModules);
    const resolvedEntities = Array.isArray(parsed.entities) && parsed.entities.length > 0
      ? parsed.entities.map((item: any) => ({ name: item.name || '业务对象', fields: splitToList(item.fields, ['名称', '负责人', '状态']) }))
      : parseEntities(session.requirement, modules);
    const moduleSchemas = Array.isArray(parsed.moduleSchemas) && parsed.moduleSchemas.length > 0
      ? parsed.moduleSchemas
      : buildModuleSchemas(modules, resolvedEntities, parsed.projectName || deriveProjectName(session.requirement));
    const selection = DemoTemplateService.resolveStoredRecommendation(buildTemplateRecommendation(parsed));

    return deriveSummaryFromAnswers(session, {
      projectName: parsed.projectName || deriveProjectName(session.requirement),
      businessGoal: parsed.businessGoal || session.requirement,
      targetUsers: splitToList(parsed.targetUsers, isAiChatDemo ? ['员工', '客服人员', '管理者'] : ['业务人员', '管理员']),
      roles: splitToList(parsed.roles, isAiChatDemo ? ['员工', '客服人员', '管理者'] : ['业务人员', '管理员']),
      coreModules: modules,
      pageBlueprints: splitToList(parsed.pageBlueprints, isAiChatDemo ? ['服务台概览首页', '会话历史列表', '消息问答区', '常见问题推荐', '工单上下文面板'] : ['首页看板', '业务列表', '业务详情', '新增/编辑']),
      navigation: splitToList(parsed.navigation, modules),
      entities: resolvedEntities,
      keyInteractions: splitToList(parsed.keyInteractions, isAiChatDemo ? ['问题提问与回复', '候选答案选择', 'FAQ 推荐', '工单上下文查看', '转人工/转工单'] : ['列表查询与筛选', '新增、编辑、删除', '详情查看与状态变更']),
      visualStyle: parsed.visualStyle || '商务专业',
      dataStrategy: parsed.dataStrategy || '本地 JSON + 浏览器存储',
      charts: splitToList(parsed.charts, isAiChatDemo ? ['咨询量与解决率概览', '响应时长统计'] : ['汇总统计卡片']),
      simulationStrategy: splitToList(parsed.simulationStrategy, ['用本地 mock API 封装数据读写', '用浏览器存储模拟持久化']),
      downgradeNotes: splitToList(parsed.downgradeNotes, ['涉及真实后端、第三方系统、复杂算法的能力统一以前端模拟近似表达。']),
      demoScope: parsed.demoScope || (isAiChatDemo ? '问答 + FAQ + 工单协同前端演示' : '完整 CRUD + 筛选分页'),
      requirementHighlights: splitToList(parsed.requirementHighlights, [session.requirement]),
      answerHighlights: Array.isArray(parsed.answerHighlights) && parsed.answerHighlights.length > 0
        ? parsed.answerHighlights.map((item: any) => ({ question: String(item.question || ''), answer: String(item.answer || '') })).filter((item: { question: string; answer: string }) => item.question)
        : fallback.answerHighlights,
      moduleSchemas,
      formSchemas: Array.isArray(parsed.formSchemas) && parsed.formSchemas.length > 0
        ? parsed.formSchemas
        : moduleSchemas.map((moduleSchema: any, index: number) => ({ moduleId: moduleSchema.id, title: `${moduleSchema.entityName}表单`, fields: buildFieldSchema(moduleSchema.entityName, resolvedEntities[index % Math.max(resolvedEntities.length, 1)].fields) })),
      listSchemas: Array.isArray(parsed.listSchemas) && parsed.listSchemas.length > 0
        ? parsed.listSchemas
        : buildListSchemas(moduleSchemas, resolvedEntities),
      detailSchemas: Array.isArray(parsed.detailSchemas) && parsed.detailSchemas.length > 0
        ? parsed.detailSchemas
        : buildDetailSchemas(moduleSchemas, resolvedEntities),
      storageSchemas: Array.isArray(parsed.storageSchemas) && parsed.storageSchemas.length > 0
        ? parsed.storageSchemas
        : buildStorageSchemas(session.projectId, moduleSchemas, resolvedEntities),
      selectedTemplateId: selection.meta.templateId,
      selectedTemplateCategory: selection.meta.categoryTemplateId,
      selectedVisualTemplateId: selection.meta.visualTemplateId,
      templateReason: selection.recommendation.reason,
      templateAdjustments: selection.recommendation.templateAdjustments,
    });
  } catch {
    return fallback;
  }
}


export const DemoClarificationService = {
  async createSession(projectId: string, requirement: string): Promise<DemoClarificationSession> {
    console.log('[Demo Clarification Service] createSession:start', { projectId });
    const now = new Date().toISOString();
    const session: DemoClarificationSession = {
      projectId,
      requirement,
      status: 'pending',
      currentRound: 1,
      currentQuestionIndex: 0,
      questions: await generateQuestions(requirement, ''),
      answers: [],
      createdAt: now,
      updatedAt: now,
    };
    saveSession(session);
    console.log('[Demo Clarification Service] createSession:done', { projectId, questionCount: session.questions.length });
    return session;
  },

  async loadSession(projectId: string): Promise<DemoClarificationSession | null> {
    const filePath = getSessionPath(projectId);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  },

  async submitAnswer(session: DemoClarificationSession, questionId: string, answer: string | string[]) {
    console.log('[Demo Clarification Service] submitAnswer:start', { projectId: session.projectId, questionId });
    const nextAnswers = session.answers.filter(item => item.questionId !== questionId);
    nextAnswers.push({ questionId, answer, timestamp: new Date().toISOString() });

    const roundQuestions = session.questions.filter(item => item.round === session.currentRound);
    const currentQuestionIndex = roundQuestions.filter(question =>
      nextAnswers.some(item => item.questionId === question.id && item.answer && (Array.isArray(item.answer) ? item.answer.length > 0 : String(item.answer).trim()))
    ).length;

    const updated: DemoClarificationSession = {
      ...session,
      answers: nextAnswers,
      currentQuestionIndex,
      updatedAt: new Date().toISOString(),
    };
    saveSession(updated);
    return updated;
  },

  async checkAndAdvance(session: DemoClarificationSession) {
    console.log('[Demo Clarification Service] checkAndAdvance:start', { projectId: session.projectId });
    const allQuestions = session.questions;
    const completedAllQuestions = allQuestions.every(question =>
      session.answers.some(item => item.questionId === question.id && item.answer && (Array.isArray(item.answer) ? item.answer.length > 0 : String(item.answer).trim()))
    );

    if (!completedAllQuestions) {
      console.log('[Demo Clarification Service] checkAndAdvance:pending', { projectId: session.projectId });
      return session;
    }

    console.log('[Demo Clarification Service] checkAndAdvance:build-summary', { projectId: session.projectId });
    const summary = await buildSummary(session);
    console.log('[Demo Clarification Service] checkAndAdvance:summary-done', {
      projectId: session.projectId,
      selectedTemplateId: summary.selectedTemplateId,
      selectedTemplateCategory: summary.selectedTemplateCategory,
      selectedVisualTemplateId: summary.selectedVisualTemplateId,
    });
    const templateRecommendation = buildTemplateRecommendation(summary);

    summary.selectedTemplateId = templateRecommendation.primary;
    summary.selectedTemplateCategory = templateRecommendation.categoryTemplateId;
    summary.selectedVisualTemplateId = templateRecommendation.visualTemplateId;
    summary.templateReason = templateRecommendation.reason;
    summary.templateAdjustments = templateRecommendation.templateAdjustments;

    const updated: DemoClarificationSession = {
      ...session,
      status: 'completed',
      currentQuestionIndex: allQuestions.length,
      summary,
      templateRecommendation,
      updatedAt: new Date().toISOString(),
      endTime: new Date().toISOString(),
    };
    saveSession(updated);
    return updated;
  },

  getProgress(session: DemoClarificationSession) {
    const roundQuestions = session.questions.filter(item => item.round === session.currentRound);
    const completed = roundQuestions.filter(question =>
      session.answers.some(item => item.questionId === question.id && item.answer && (Array.isArray(item.answer) ? item.answer.length > 0 : String(item.answer).trim()))
    ).length;

    return {
      round: session.currentRound,
      total: roundQuestions.length,
      completed,
      current: Math.min(completed + 1, roundQuestions.length || 1),
      percent: roundQuestions.length === 0 ? 0 : Math.round((completed / roundQuestions.length) * 100),
    };
  },

  getCurrentQuestion(session: DemoClarificationSession) {
    if (session.status === 'completed') return null;
    const roundQuestions = session.questions.filter(item => item.round === session.currentRound);
    return roundQuestions.find(question =>
      !session.answers.some(item => item.questionId === question.id && item.answer && (Array.isArray(item.answer) ? item.answer.length > 0 : String(item.answer).trim()))
    ) || null;
  },
};
