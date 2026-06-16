import type {
  DemoClarificationSummary,
  DemoTemplateAiSelectionInput,
  DemoTemplateAiSelectionOutput,
  DemoTemplateBuildMeta,
  DemoTemplateCapabilities,
  DemoTemplateManifestRecord,
  DemoTemplateRecommendation,
  DemoTemplateResolvedMeta,
  DemoTemplateResolvedSelection,
  DemoTemplateVisualDescriptor,
} from '@/types/workflow';
import type { ProjectType } from '@/types/project';
import { spawnClaudeNonInteractive } from '@/lib/spawn';
import { DEMO_TEMPLATE_MANIFESTS, DEMO_VISUAL_TEMPLATES } from '@/server/demo-templates/manifest';


async function callClaudeWithUsage(prompt: string, timeoutMs = 180000): Promise<string> {
  return callClaude(prompt, timeoutMs);
}

const VISUAL_TEMPLATES: DemoTemplateVisualDescriptor[] = DEMO_VISUAL_TEMPLATES;
const TEMPLATE_MANIFESTS: DemoTemplateManifestRecord[] = DEMO_TEMPLATE_MANIFESTS;

// 旧模板 id 与旧视觉 id 兼容映射，保证旧项目恢复正常
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

// 旧大类名兼容映射
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

function findTemplate(id?: string | null): DemoTemplateManifestRecord | null {
  if (!id) return null;
  return TEMPLATE_MANIFESTS.find(item => item.id === normalizeTemplateId(id)) || null;
}

function findVisual(id?: string | null): DemoTemplateVisualDescriptor | null {
  if (!id) return null;
  return VISUAL_TEMPLATES.find(item => item.id === normalizeVisualId(id)) || null;
}

function fallbackTemplate(category?: string | null): DemoTemplateManifestRecord {
  const cat = normalizeCategory(category) || 'admin-console';
  return TEMPLATE_MANIFESTS.find(item => item.productCategory === cat) || TEMPLATE_MANIFESTS[0];
}

function fallbackVisual(): DemoTemplateVisualDescriptor {
  return VISUAL_TEMPLATES[0];
}

function resolveTemplate(id?: string | null, category?: string | null): DemoTemplateManifestRecord {
  return findTemplate(id) || fallbackTemplate(category);
}

function resolveVisual(id?: string | null, secondary?: string | null): DemoTemplateVisualDescriptor {
  return findVisual(id) || findVisual(secondary) || fallbackVisual();
}

function toCapabilities(template: DemoTemplateManifestRecord): DemoTemplateCapabilities {
  return {
    productCategory: template.productCategory,
    appShell: template.appShell,
    pageBlueprints: template.pageBlueprints,
    navigationStrategy: template.navigationStrategy,
    interactionPatterns: template.interactionPatterns,
    dataStrategy: template.dataStrategy,
    seedDataStrategy: template.seedDataStrategy,
    developerPromptHints: template.developerPromptHints,
  };
}

function ensureAdjustments(items: string[] | undefined, template: DemoTemplateManifestRecord, visual: DemoTemplateVisualDescriptor): string[] {
  const list = (items || []).map(item => item.trim()).filter(Boolean);
  if (list.length >= 3) return list;
  const fallbacks = [
    `首页围绕"${template.name}"的核心页面蓝图组织，突出主要业务场景。`,
    `整体视觉采用"${visual.name}"风格，保持商务、克制、不浮夸。`,
    `模块文案、字段与示例数据要贴合"${template.description}"的业务语境。`,
  ];
  for (const item of fallbacks) {
    if (list.length >= 3) break;
    if (!list.includes(item)) list.push(item);
  }
  return list;
}

function ensureReason(reason: string | undefined, template: DemoTemplateManifestRecord): string {
  return reason?.trim() || `该需求与"${template.name}"的业务语境最匹配。`;
}

function buildRecommendation(
  template: DemoTemplateManifestRecord,
  visual: DemoTemplateVisualDescriptor,
  reason: string | undefined,
  adjustments: string[] | undefined,
): DemoTemplateRecommendation {
  return {
    primary: template.id,
    secondary: visual.id,
    reason: ensureReason(reason, template),
    categoryTemplateId: template.productCategory,
    visualTemplateId: visual.id,
    templateAdjustments: ensureAdjustments(adjustments, template, visual),
  };
}

function buildMeta(template: DemoTemplateManifestRecord, visual: DemoTemplateVisualDescriptor): DemoTemplateResolvedMeta {
  return {
    templateId: template.id,
    templateName: template.name,
    visualTemplateId: visual.id,
    categoryTemplateId: template.productCategory,
    capabilities: toCapabilities(template),
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

function buildSelectionPrompt(input: DemoTemplateAiSelectionInput): string {
  return `你是 demo 工厂的模板选择器。你必须只基于用户需求、澄清摘要和已注册模板，从中选择一个最合适的业务模板和一个视觉模板。

## 用户需求
${input.requirement}

## 澄清摘要
${JSON.stringify(input.summary || {}, null, 2)}

## 可选业务模板（按大类分组，每类有多个选项，请选择最合适的一个）
${JSON.stringify(buildTemplateCatalogForPrompt(), null, 2)}

## 可选视觉模板（商务风，只能从以下三种中选择）
${JSON.stringify(VISUAL_TEMPLATES, null, 2)}

要求：
1. 只能从给定模板中选择，不允许发明新模板。
2. 先判断产品形态属于哪一大类（category），再在同类多个模板中选择最贴近用户实际业务场景的一个。
3. 视觉模板只能从 modern、elegant、elegant-dark 中选择，整体必须保持商务、克制、不浮夸。
4. 选择必须基于产品形态，不允许简单按行业词。
5. 如果需求出现“专题页、活动页、活动专题、着陆页、峰会、发布会、报名入口、主视觉、嘉宾阵容、议程安排”等信号，应优先判断为“portal-showcase”，而不是“ai-chat”。
6. 如果需求出现 FAQ / 常见问题，但整体目标是活动展示、内容营销、报名转化，不得误判为聊天或服务台模板。
7. 只输出一个 JSON 对象，不要输出任何解释文字。
8. 字段必须包含：selectedTemplateId, selectedVisualTemplateId, reason, templateAdjustments。
9. templateAdjustments 至少 3 条。
10. reason 和 templateAdjustments 内如果需要引用词语，请使用中文引号（例如：'演示'、'示例系统'），不要使用未转义半角双引号。

输出示例：
{
  "selectedTemplateId": "policy-library",
  "selectedVisualTemplateId": "modern",
  "reason": "这是制度文档与资料门户型需求。",
  "templateAdjustments": [
    "首页突出搜索与资料分类。",
    "主界面突出目录树、文档详情与关联资料。",
    "整体风格保持商务克制，减少装饰性效果。"
  ]
}`;
}

async function callClaude(prompt: string, timeoutMs = 180000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`Claude 调用超时 (${timeoutMs}ms)`)), timeoutMs);
    try {
      const proc = spawnClaudeNonInteractive(prompt, { timeout: timeoutMs });
      let output = '';
      let error = '';
      proc.stdout?.on('data', (data) => { output += data.toString(); });
      proc.stderr?.on('data', (data) => { error += data.toString(); });
      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) { resolve(output); return; }
        reject(new Error(error || `Claude 退出码 ${code}`));
      });
      proc.on('error', (err) => { clearTimeout(timeoutId); reject(err); });
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

function extractBalancedObject(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1].trim() : text;
  const start = source.indexOf('{');
  if (start === -1) throw new Error('模板选择未返回 JSON');

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escaped) { escaped = false; }
      else if (ch === '\\') { escaped = true; }
      else if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error('模板选择 JSON 不完整');
}

function sanitizeJsonStringValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

function sanitizeTemplateDecisionJson(text: string): string {
  const json = extractBalancedObject(text);
  const templateIdMatch = json.match(/"selectedTemplateId"\s*:\s*"([^"]+)"/);
  const visualIdMatch = json.match(/"selectedVisualTemplateId"\s*:\s*"([^"]+)"/);
  const reasonMatch = json.match(/"reason"\s*:\s*"([\s\S]*?)"\s*,\s*"templateAdjustments"/);
  const adjustmentsMatch = json.match(/"templateAdjustments"\s*:\s*\[([\s\S]*?)\]\s*}/);

  if (!templateIdMatch || !visualIdMatch || !reasonMatch || !adjustmentsMatch) {
    throw new Error('模板选择 JSON 结构不完整');
  }

  const reason = sanitizeJsonStringValue(reasonMatch[1]);
  const rawItems = adjustmentsMatch[1]
    .split(/\n\s*"/)
    .map(item => item.trim()).filter(Boolean)
    .map(item => item.replace(/^"/, '').replace(/",?$/, '').trim()).filter(Boolean);
  const adjustments = rawItems.map(item => `"${sanitizeJsonStringValue(item)}"`).join(',');

  return `{
  "selectedTemplateId": "${sanitizeJsonStringValue(templateIdMatch[1].trim())}",
  "selectedVisualTemplateId": "${sanitizeJsonStringValue(visualIdMatch[1].trim())}",
  "reason": "${reason}",
  "templateAdjustments": [${adjustments}]
}`;
}

function parseDecision(text: string): DemoTemplateAiSelectionOutput {
  const sanitized = sanitizeTemplateDecisionJson(text);
  const parsed = JSON.parse(sanitized) as DemoTemplateAiSelectionOutput;
  return {
    selectedTemplateId: normalizeTemplateId(String(parsed.selectedTemplateId || '').trim()),
    selectedVisualTemplateId: normalizeVisualId(String(parsed.selectedVisualTemplateId || '').trim()),
    reason: String(parsed.reason || '').trim(),
    templateAdjustments: Array.isArray(parsed.templateAdjustments)
      ? parsed.templateAdjustments.map(item => String(item).trim()).filter(Boolean)
      : [],
  };
}

export function buildSelectionInput(requirement: string, summary?: Partial<DemoClarificationSummary>): DemoTemplateAiSelectionInput {
  return {
    requirement,
    summary,
    templates: TEMPLATE_MANIFESTS.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      productCategory: item.productCategory,
    })),
    visuals: VISUAL_TEMPLATES,
  };
}

function decisionToSelection(decision: DemoTemplateAiSelectionOutput): DemoTemplateResolvedSelection {
  const template = findTemplate(decision.selectedTemplateId);
  if (!template) throw new Error(`AI 选择了不存在的业务模板: ${decision.selectedTemplateId}`);
  const visual = findVisual(decision.selectedVisualTemplateId);
  if (!visual) throw new Error(`AI 选择了不存在的视觉模板: ${decision.selectedVisualTemplateId}`);
  if (!decision.reason?.trim()) throw new Error('AI 没有给出模板选择理由');
  if (!Array.isArray(decision.templateAdjustments) || decision.templateAdjustments.length < 3) {
    throw new Error('AI 没有给出足够的模板调整建议');
  }
  return {
    recommendation: buildRecommendation(template, visual, decision.reason, decision.templateAdjustments),
    meta: buildMeta(template, visual),
  };
}

export const DemoTemplateService = {
  getAll(): DemoTemplateManifestRecord[] {
    return TEMPLATE_MANIFESTS;
  },

  getAllVisuals(): DemoTemplateVisualDescriptor[] {
    return VISUAL_TEMPLATES;
  },

  getById(templateId?: string | null): DemoTemplateManifestRecord | null {
    return findTemplate(templateId);
  },

  getVisualById(templateId?: string | null): DemoTemplateVisualDescriptor | null {
    return findVisual(templateId);
  },

  async recommend(requirement: string, summary?: Partial<DemoClarificationSummary>, billingSessionId?: string, preferredTemplateId?: string | null): Promise<DemoTemplateResolvedSelection> {
    if (preferredTemplateId) {
      throw new Error('demo 工厂模板必须由 AI 判定，不能手工指定');
    }
    const prompt = buildSelectionPrompt(buildSelectionInput(requirement, summary));
    const raw = await callClaudeWithUsage(prompt, 180000);
    console.log('[Demo Template] raw AI decision', raw);
    const decision = parseDecision(raw);
    console.log('[Demo Template] parsed AI decision', decision);
    return decisionToSelection(decision);
  },

  buildProjectMeta(selection: DemoTemplateResolvedSelection, projectType: ProjectType = 'frontend-demo'): DemoTemplateBuildMeta {
    return {
      projectType,
      templateId: selection.meta.templateId,
      runtimeKind: 'frontend-demo',
      templateName: selection.meta.templateName,
      categoryTemplateId: selection.meta.categoryTemplateId,
      visualTemplateId: selection.meta.visualTemplateId,
      capabilities: selection.meta.capabilities,
    };
  },

  // 兼容旧项目：primary 可能是旧类别 id（admin-console/chat-app/knowledge-base），视觉 id 也可能是旧 id
  resolveStoredRecommendation(recommendation: DemoTemplateRecommendation): DemoTemplateResolvedSelection {
    const template = resolveTemplate(recommendation.primary, recommendation.categoryTemplateId);
    const visual = resolveVisual(recommendation.visualTemplateId, recommendation.secondary);
    return {
      recommendation: buildRecommendation(template, visual, recommendation.reason, recommendation.templateAdjustments),
      meta: buildMeta(template, visual),
    };
  },
};
