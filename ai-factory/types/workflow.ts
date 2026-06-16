/**
 * 工作流类型定义
 */

import type { ProjectType, RuntimeKind } from './project';
import type { ProjectExecutionState } from '@/server/services/execution-state.service';

/**
 * 工作流阶段
 */
export type WorkflowPhase =
  | 'IDLE'           // 初始状态：等待用户输入需求
  | 'CLARIFYING'     // 需求澄清中
  | 'SPEC_GENERATING'// Spec 生成中
  | 'CODE_GENERATING'// 代码生成中
  | 'COMPLETED';     // 已完成

/**
 * 阶段前置条件映射
 */
export const PHASE_PREREQUISITES: Record<WorkflowPhase, string[]> = {
  IDLE: [],
  CLARIFYING: ['requirement'],
  SPEC_GENERATING: ['clarificationSession'],
  CODE_GENERATING: ['specs'],
  COMPLETED: ['generatedFiles'],
};

/**
 * 阶段对应路由
 */
export const PHASE_ROUTES: Record<ProjectType, Record<WorkflowPhase, string>> = {
  'ruoyi-vue-pg': {
    IDLE: '/workspace',
    CLARIFYING: '/requirement',
    SPEC_GENERATING: '/generate',
    CODE_GENERATING: '/generate',
    COMPLETED: '/ide',
  },
  'frontend-demo': {
    IDLE: '/demo/workspace',
    CLARIFYING: '/demo/requirement',
    SPEC_GENERATING: '/demo/generate',
    CODE_GENERATING: '/demo/generate',
    COMPLETED: '/demo/ide',
  },
};

export function getPhaseRoute(projectType: ProjectType, phase: WorkflowPhase): string {
  return PHASE_ROUTES[projectType][phase];
}

export function getProjectTypeLabel(projectType: ProjectType): string {
  return projectType === 'frontend-demo' ? 'Demo 快速生成' : '标准工厂';
}

export function getRuntimeKindByProjectType(projectType: ProjectType): RuntimeKind {
  return projectType === 'frontend-demo' ? 'frontend-demo' : 'ruoyi-vue-pg';
}

export function getEffectiveWorkflowPhase(
  workflowPhase: WorkflowPhase,
  executionState?: Pick<ProjectExecutionState, 'status' | 'currentStage'> | null,
  projectType?: ProjectType,
): WorkflowPhase {
  if (projectType && projectType !== 'frontend-demo') {
    return workflowPhase;
  }

  if (executionState?.status === 'completed' || executionState?.currentStage === 'finished') {
    return 'COMPLETED';
  }

  if (
    executionState?.currentStage === 'demo-developer'
    && workflowPhase === 'SPEC_GENERATING'
  ) {
    return 'CODE_GENERATING';
  }

  return workflowPhase;
}

export function getWorkflowNextAction(projectId: string, phase: WorkflowPhase, projectType: ProjectType) {
  if (projectType === 'frontend-demo') {
    if (phase === 'IDLE') return { route: `/demo/requirement?projectId=${projectId}`, label: '开始澄清需求' };
    if (phase === 'CLARIFYING') return { route: `/demo/requirement?projectId=${projectId}`, label: '继续需求澄清' };
    if (phase === 'SPEC_GENERATING') return { route: `/demo/generate?projectId=${projectId}`, label: '继续编写 Spec' };
    if (phase === 'CODE_GENERATING') return { route: `/demo/generate?projectId=${projectId}`, label: '继续代码编写' };
    return { route: `/demo/ide?project=${projectId}`, label: '进入 Demo 项目' };
  }

  if (phase === 'IDLE') return { route: `/requirement?projectId=${projectId}`, label: '开始需求澄清' };
  if (phase === 'CLARIFYING') return { route: `/requirement?projectId=${projectId}`, label: '继续需求澄清' };
  if (phase === 'SPEC_GENERATING') return { route: `/generate?projectId=${projectId}`, label: '继续编写 Spec' };
  if (phase === 'CODE_GENERATING') return { route: `/generate?projectId=${projectId}`, label: '继续代码编写' };
  return { route: `/ide?project=${projectId}`, label: '进入项目' };
}

export function getPhaseUrl(projectId: string, projectType: ProjectType, phase: WorkflowPhase): string {
  const route = getPhaseRoute(projectType, phase);
  return phase === 'COMPLETED' ? `${route}?project=${projectId}` : `${route}?projectId=${projectId}`;
}

export function getGenerateStage(
  phase: WorkflowPhase,
  executionState?: Pick<ProjectExecutionState, 'status' | 'currentStage'> | null,
): 'matching' | 'spec' | 'delivering' | 'completed' {
  if (phase === 'COMPLETED' || executionState?.status === 'completed') {
    return 'completed';
  }
  if (phase === 'CODE_GENERATING' || executionState?.currentStage === 'demo-developer' || executionState?.currentStage === 'developer') {
    return 'delivering';
  }
  if (phase === 'SPEC_GENERATING' || executionState?.currentStage === 'spec') {
    return 'spec';
  }
  return 'matching';
}

export function getGenerateStageMessage(
  phase: WorkflowPhase,
  checkpointMessage?: string,
  executionState?: Pick<ProjectExecutionState, 'status' | 'currentStage'> | null,
): string {
  const stage = getGenerateStage(phase, executionState);
  if (stage === 'completed') return 'Spec 与代码已生成完成';
  if (stage === 'delivering') return checkpointMessage || '正在调用 AI 编写代码...';
  if (stage === 'spec') return checkpointMessage || '正在生成结构化 spec...';
  return checkpointMessage || '正在匹配业务模板...';
}

export function getGenerateProgress(stage: 'matching' | 'spec' | 'delivering' | 'completed'): number {
  if (stage === 'matching') return 50;
  if (stage === 'spec') return 75;
  if (stage === 'delivering') return 90;
  return 100;
}

export function getGenerateStageLabel(stage: 'matching' | 'spec' | 'delivering' | 'completed'): string {
  if (stage === 'matching') return '模板匹配';
  if (stage === 'spec') return 'Spec 编写';
  if (stage === 'delivering') return '代码编写';
  return '已完成';
}

export function getGenerateSubStepTitle(stage: 'matching' | 'spec' | 'delivering' | 'completed'): string {
  if (stage === 'matching') return '当前处于第 3 个大阶段：模板匹配';
  if (stage === 'spec') return '当前处于第 3 个大阶段：Spec 编写';
  if (stage === 'delivering') return '当前处于第 4 个大阶段：代码编写';
  return '当前处于完成阶段';
}

export function getGenerateStageWidthClass(stage: 'matching' | 'spec' | 'delivering' | 'completed'): string {
  if (stage === 'matching') return 'w-1/2';
  if (stage === 'spec') return 'w-3/4';
  if (stage === 'delivering') return 'w-[90%]';
  return 'w-full';
}

export function getGenerateStepStatus(
  step: 'spec' | 'code',
  stage: 'matching' | 'spec' | 'delivering' | 'completed',
): 'active' | 'done' | 'waiting' {
  if (step === 'spec') {
    if (stage === 'spec') return 'active';
    if (stage === 'matching') return 'waiting';
    return 'done';
  }

  if (stage === 'delivering') return 'active';
  if (stage === 'completed') return 'done';
  return 'waiting';
}

export function getDemoVisiblePhase(
  workflowPhase: WorkflowPhase,
  executionState?: Pick<ProjectExecutionState, 'status' | 'currentStage'> | null,
): WorkflowPhase {
  return getEffectiveWorkflowPhase(workflowPhase, executionState, 'frontend-demo');
}

/**
 * 阶段到步骤的映射（用于进度显示）
 */
export const PHASE_STEPS: Record<WorkflowPhase, { step: number; total: number; label: string }> = {
  IDLE: { step: 0, total: 4, label: '等待开始' },
  CLARIFYING: { step: 1, total: 4, label: '需求澄清中' },
  SPEC_GENERATING: { step: 2, total: 4, label: '规格生成中' },
  CODE_GENERATING: { step: 3, total: 4, label: '代码生成中' },
  COMPLETED: { step: 4, total: 4, label: '已完成' },
};

/**
 * 阶段错误
 */
export interface PhaseError {
  phase: WorkflowPhase;
  message: string;
  timestamp: string;
}

/**
 * 项目工作流状态
 */
export interface DemoFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'status';
  required: boolean;
  options?: string[];
  placeholder?: string;
  group?: string;
}

export interface DemoListSchema {
  moduleId: string;
  title: string;
  columns: string[];
  filters: string[];
  batchActions: string[];
  rowActions: string[];
}

export interface DemoDetailSchema {
  moduleId: string;
  title: string;
  sections: string[];
  timeline?: string[];
  relatedBlocks?: string[];
}

export interface DemoModuleSchema {
  id: string;
  name: string;
  menuLabel: string;
  description: string;
  entityName: string;
  pageTypes: string[];
  primaryActions: string[];
}

export interface DemoStorageSchema {
  moduleId: string;
  storageKey: string;
  entityName: string;
  fields: string[];
}

export type DemoTemplateCategory = 'admin-console' | 'data-workbench' | 'knowledge-hub' | 'ai-chat' | 'automation-workflow' | 'portal-showcase' | 'learning-exam' | 'commerce-transaction' | 'service-scheduling' | 'project-delivery';

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
  moduleSchemas: DemoModuleSchema[];
  formSchemas: Array<{ moduleId: string; title: string; fields: DemoFieldSchema[] }>;
  listSchemas: DemoListSchema[];
  detailSchemas: DemoDetailSchema[];
  storageSchemas: DemoStorageSchema[];
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateRecommendation {
  primary: string;
  secondary?: string;
  reason?: string;
  categoryTemplateId: DemoTemplateCategory;
  visualTemplateId: string;
  templateAdjustments: string[];
}

export interface DemoTemplateCapabilities {
  productCategory: DemoTemplateCategory;
  appShell: string;
  pageBlueprints: string[];
  navigationStrategy: string;
  interactionPatterns: string[];
  dataStrategy: string;
  seedDataStrategy: string;
  developerPromptHints: string[];
}

export interface DemoTemplateSelectionResult {
  selectedTemplateId: string;
  selectedTemplateCategory: DemoTemplateCategory;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateManifestRecord {
  id: string;
  name: string;
  description: string;
  productCategory: DemoTemplateCategory;
  appShell: string;
  pageBlueprints: string[];
  navigationStrategy: string;
  interactionPatterns: string[];
  dataStrategy: string;
  seedDataStrategy: string;
  developerPromptHints: string[];
}

export interface DemoVisualTemplateManifest {
  id: string;
  name: string;
  description: string;
}

export interface DemoTemplateManifestBundle {
  templates: DemoTemplateManifestRecord[];
  visuals: DemoVisualTemplateManifest[];
}

export interface DemoTemplateManifestEnvelope {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateResolvedMeta {
  templateId: string;
  templateName: string;
  visualTemplateId: string;
  categoryTemplateId: DemoTemplateCategory;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateManifestSummary {
  templates: Array<Pick<DemoTemplateManifestRecord, 'id' | 'name' | 'description' | 'productCategory'>>;
  visuals: DemoVisualTemplateManifest[];
}

export interface DemoTemplatePromptPayload {
  requirement: string;
  summary: Partial<DemoClarificationSummary> | undefined;
  templates: DemoTemplateManifestSummary;
}

export interface DemoTemplateAiDecision {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateResolvedSelection {
  recommendation: DemoTemplateRecommendation;
  meta: DemoTemplateResolvedMeta;
}

export interface DemoTemplateBuildMeta {
  projectType: ProjectType;
  templateId: string;
  runtimeKind: 'frontend-demo';
  templateName: string;
  categoryTemplateId: DemoTemplateCategory;
  visualTemplateId: string;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateSpecPayload {
  requirement: string;
  summary: DemoClarificationSummary | undefined;
  recommendation: DemoTemplateRecommendation | undefined;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateDeveloperPayload {
  requirement: string;
  summary: DemoClarificationSummary | undefined;
  recommendation: DemoTemplateRecommendation | undefined;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateScaffoldPayload {
  summary: DemoClarificationSummary;
  recommendation: DemoTemplateRecommendation;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateSpecEnvelope {
  projectName: string;
  selectedTemplateId: string;
  selectedTemplateCategory: DemoTemplateCategory;
  selectedVisualTemplateId: string;
  templateReason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateScaffoldResult {
  shell: string;
  pageBlueprints: string[];
}

export interface DemoTemplateDeveloperHints {
  promptHints: string[];
}

export interface DemoTemplateSelectionContext {
  requirement: string;
  summary?: Partial<DemoClarificationSummary>;
}

export interface DemoTemplateSelectionLog {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  categoryTemplateId: DemoTemplateCategory;
  reason: string;
}

export interface DemoTemplateSpecContext {
  projectId: string;
  templateMeta: DemoTemplateResolvedMeta;
}

export interface DemoTemplateDeveloperContext {
  projectId: string;
  templateMeta: DemoTemplateResolvedMeta;
}

export interface DemoTemplateScaffoldContext {
  projectId: string;
  templateMeta: DemoTemplateResolvedMeta;
}

export interface DemoTemplateTemplateChoice {
  id: string;
  visualTemplateId: string;
}

export interface DemoTemplateSelectionInput {
  requirement: string;
  summary?: DemoClarificationSummary;
}

export interface DemoTemplateSelectionOutput {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateGenerationContext {
  recommendation: DemoTemplateRecommendation;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateSpecGenerationContext extends DemoTemplateGenerationContext {
  summary?: DemoClarificationSummary;
}

export interface DemoTemplateScaffoldGenerationContext extends DemoTemplateGenerationContext {
  summary: DemoClarificationSummary;
}

export interface DemoTemplateDeveloperGenerationContext extends DemoTemplateGenerationContext {
  summary?: DemoClarificationSummary;
}

export interface DemoTemplateDescriptor {
  id: string;
  name: string;
  description: string;
  productCategory: DemoTemplateCategory;
}

export interface DemoTemplateVisualDescriptor {
  id: string;
  name: string;
  description: string;
}

export interface DemoTemplateSelectionSummary {
  templates: DemoTemplateDescriptor[];
  visuals: DemoTemplateVisualDescriptor[];
}

export interface DemoTemplatePromptDecision {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateSelectionState {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  categoryTemplateId: DemoTemplateCategory;
}

export interface DemoTemplateRecommendationState {
  primary: string;
  secondary?: string;
  reason?: string;
  categoryTemplateId: DemoTemplateCategory;
  visualTemplateId: string;
  templateAdjustments: string[];
}

export interface DemoTemplatePromptHints {
  developerPromptHints: string[];
}

export interface DemoTemplateSummaryProjection {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateManifestLite {
  id: string;
  name: string;
  description: string;
  productCategory: DemoTemplateCategory;
}

export interface DemoTemplateVisualLite {
  id: string;
  name: string;
  description: string;
}

export interface DemoTemplateSelectionPromptInput {
  requirement: string;
  summary?: Partial<DemoClarificationSummary>;
  templates: DemoTemplateManifestLite[];
  visuals: DemoTemplateVisualLite[];
}

export interface DemoTemplateSelectionPromptOutput {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateSpecPromptInput {
  requirement: string;
  summary?: DemoClarificationSummary;
  recommendation: DemoTemplateRecommendation;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateDeveloperPromptInput {
  requirement: string;
  summary?: DemoClarificationSummary;
  recommendation: DemoTemplateRecommendation;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateScaffoldPromptInput {
  summary: DemoClarificationSummary;
  recommendation: DemoTemplateRecommendation;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateProjectMeta {
  projectType: ProjectType;
  templateId: string;
  runtimeKind: 'frontend-demo';
  templateName: string;
  categoryTemplateId: DemoTemplateCategory;
  visualTemplateId: string;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateSelectionRecord {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  categoryTemplateId: DemoTemplateCategory;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateSummaryResult extends DemoClarificationSummary {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSelectionEnvelope {
  recommendation: DemoTemplateRecommendation;
  meta: DemoTemplateResolvedMeta;
}

export interface DemoTemplateSelectionManifest {
  templates: DemoTemplateDescriptor[];
  visuals: DemoTemplateVisualDescriptor[];
}

export interface DemoTemplateSpecShape {
  sections: string[];
}

export interface DemoTemplateScaffoldShape {
  shell: string;
}

export interface DemoTemplateDeveloperShape {
  hints: string[];
}

export interface DemoTemplateDecisionPayload {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateSelectionResultRecord {
  selectedTemplateId: string;
  categoryTemplateId: DemoTemplateCategory;
  selectedVisualTemplateId: string;
}

export interface DemoTemplatePromptContract {
  requirement: string;
  summary?: Partial<DemoClarificationSummary>;
  templates: DemoTemplateDescriptor[];
  visuals: DemoTemplateVisualDescriptor[];
}

export interface DemoTemplatePromptContractResult {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateResolvedContext {
  recommendation: DemoTemplateRecommendation;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateOutputMeta {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  selectedTemplateCategory: DemoTemplateCategory;
}

export interface DemoTemplateSelectionMeta {
  recommendation: DemoTemplateRecommendation;
  projectMeta: DemoTemplateProjectMeta;
}

export interface DemoTemplateSummaryMeta {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateDecisionState {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateSelectionKind {
  categoryTemplateId: DemoTemplateCategory;
}

export interface DemoTemplateManifestProjection {
  templates: DemoTemplateDescriptor[];
  visuals: DemoTemplateVisualDescriptor[];
}

export interface DemoTemplateResolvedProjectMeta {
  templateId: string;
  templateName: string;
  categoryTemplateId: DemoTemplateCategory;
  visualTemplateId: string;
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateGenerationMeta {
  recommendation: DemoTemplateRecommendation;
  meta: DemoTemplateResolvedProjectMeta;
}

export interface DemoTemplateSpecDecision {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  templateAdjustments: string[];
}

export interface DemoTemplateRecommendationView {
  primary: string;
  secondary?: string;
  reason?: string;
  categoryTemplateId: DemoTemplateCategory;
  visualTemplateId: string;
  templateAdjustments: string[];
}

export interface DemoTemplateWorkflowMeta {
  categoryTemplateId?: DemoTemplateCategory;
  visualTemplateId?: string;
}

export interface DemoTemplateSummaryFields {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateCategoryOnly {
  categoryTemplateId: DemoTemplateCategory;
}

export interface DemoTemplateDecisionOnly {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
}

export interface DemoTemplateMetaOnly {
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateVisualOnly {
  visualTemplateId: string;
}

export interface DemoTemplateReasonOnly {
  reason: string;
}

export interface DemoTemplateAdjustmentsOnly {
  templateAdjustments: string[];
}

export interface DemoTemplateSelectionEnvelopeLite {
  recommendation: DemoTemplateRecommendation;
  meta: DemoTemplateResolvedMeta;
}

export interface DemoTemplatePromptEnvelope {
  requirement: string;
  summary?: Partial<DemoClarificationSummary>;
  templates: DemoTemplateDescriptor[];
  visuals: DemoTemplateVisualDescriptor[];
}

export interface DemoTemplatePromptEnvelopeResult {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateProjectMetaLite {
  projectType: ProjectType;
  templateId: string;
  runtimeKind: 'frontend-demo';
  templateName: string;
  categoryTemplateId: DemoTemplateCategory;
  visualTemplateId: string;
}

export interface DemoTemplateSummaryDecorations {
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateRecommendationDecorations {
  categoryTemplateId: DemoTemplateCategory;
  visualTemplateId: string;
  templateAdjustments: string[];
}

export interface DemoTemplateDecisionDecorations {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
}

export interface DemoTemplateSpecMeta {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryContract {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateCategoryDescriptor {
  id: DemoTemplateCategory;
  name: string;
}

export interface DemoTemplateCategorySelection {
  categoryTemplateId: DemoTemplateCategory;
}

export interface DemoTemplateSummaryTemplateInfo {
  selectedTemplateId?: string;
  selectedVisualTemplateId?: string;
}

export interface DemoTemplateSelectionBundle {
  recommendation: DemoTemplateRecommendation;
  meta: DemoTemplateResolvedMeta;
}

export interface DemoTemplateAiSelectionInput {
  requirement: string;
  summary?: Partial<DemoClarificationSummary>;
  templates: DemoTemplateDescriptor[];
  visuals: DemoTemplateVisualDescriptor[];
}

export interface DemoTemplateAiSelectionOutput {
  selectedTemplateId: string;
  selectedVisualTemplateId: string;
  reason: string;
  templateAdjustments: string[];
}

export interface DemoTemplateSummaryTemplateMeta {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateMetadata {
  capabilities: DemoTemplateCapabilities;
}

export interface DemoTemplateSelectionResolved {
  recommendation: DemoTemplateRecommendation;
  projectMeta: DemoTemplateProjectMeta;
}

export interface DemoTemplateSummaryEnhancement {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryPatch {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryOverlay {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryCarrier {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryModel {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryOutput {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryInfo {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryAttrs {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryExt {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryAddon {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryExtra {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryFlags {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummarySelected {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryChoice {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummarySelection {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryState {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryDescriptor {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryEnvelope {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryMetaView {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryProjectionView {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolved {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummarySelectionView {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedView {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelection {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedMeta {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedInfo {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedAttrs {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedState {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedOutput {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedExtra {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedFlags {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedChoice {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelectionView {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelectionMeta {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelectionInfo {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelectionOutput {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelectionExtra {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelectionFlags {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelectionChoice {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelectionState {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface DemoTemplateSummaryResolvedSelectionDescriptor {
  selectedTemplateId?: string;
  selectedTemplateCategory?: DemoTemplateCategory;
  selectedVisualTemplateId?: string;
  templateReason?: string;
  templateAdjustments?: string[];
}

export interface ProjectWorkflowState {
  projectId: string;
  projectType: ProjectType;
  templateType?: ProjectType;
  templateId?: string;
  templateVersion?: string;
  runtimeKind?: RuntimeKind;
  specFile?: string;

  // 当前阶段
  phase: WorkflowPhase;

  // Agent 执行进度（用于精确追踪四步流程）
  agentProgress: {
    pm?: { completed: boolean; timestamp?: string; file?: string };
    uiue?: { completed: boolean; timestamp?: string; file?: string };
    architect?: { completed: boolean; timestamp?: string; files?: string[] };
    developer?: { completed: boolean; timestamp?: string; files?: string[] };
  };

  // 各阶段数据
  phaseData: {
    // IDLE 阶段
    requirement?: string;

    // CLARIFYING 阶段
    clarificationSession?: any;
    summary?: DemoClarificationSummary;

    // SPEC_GENERATING 阶段
    specs?: {
      requirement: string;
      design: string[];
      task: string;
      checklist: string;
      // 依赖清单
      dependencies?: {
        dependencies: string[];      // 运行时依赖
        devDependencies: string[];   // 开发依赖
      };
    };

    // CODE_GENERATING 阶段
    generatedFiles?: string[];

    // 模板与运行时相关
    assignedPort?: number;            // 前端预览端口
    backendPort?: number;             // 后端端口
    scaffoldCreated?: boolean;        // 项目实例是否已创建
    dependenciesInstalled?: string[]; // 已安装的额外依赖
    schemaName?: string;              // 项目数据库 schema
    runtimeType?: RuntimeKind;
    managedTemplateDir?: string;
    environmentReady?: boolean;
    templateId?: string;
    templateRecommendation?: DemoTemplateRecommendation;
    specFile?: string;
    taskPackage?: {
      templateId?: string | null;
      qualityPackIds?: string[];
      skillPresetIds?: string[];
      prompt?: string;
    };

    // 错误信息
    error?: PhaseError;
  };

  // 时间戳
  createdAt: string;
  updatedAt: string;
}

/**
 * 阶段推进结果
 */
export interface AdvancePhaseResult {
  success: boolean;
  newPhase: WorkflowPhase;
  missingPrerequisites?: string[];
}

/**
 * 阶段进入检查结果
 */
export interface CanEnterPhaseResult {
  canEnter: boolean;
  missingPrerequisites: string[];
  suggestedRoute: string;
}