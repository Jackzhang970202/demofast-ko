import fs from 'fs';
import path from 'path';
import type { DemoClarificationSummary, DemoTemplateResolvedSelection } from '@/types/workflow';

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

function safeKey(value: string, fallback: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9一-龥]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function createModulePlans(summary: DemoClarificationSummary) {
  if (summary.moduleSchemas?.length > 0) {
    return summary.moduleSchemas.map((moduleSchema, index) => ({
      id: moduleSchema.id,
      name: moduleSchema.name,
      entity: summary.entities[index % Math.max(summary.entities.length, 1)] || { name: moduleSchema.entityName, fields: ['名称', '负责人', '状态'] },
      pages: moduleSchema.pageTypes,
      description: moduleSchema.description,
      primaryActions: moduleSchema.primaryActions,
    }));
  }

  const moduleNames = summary.coreModules.length > 0 ? summary.coreModules : ['业务中心', '数据中心', '协同中心'];
  const pages = summary.pageBlueprints.length > 0 ? summary.pageBlueprints : ['首页看板', '业务列表', '业务详情', '新增编辑'];

  return moduleNames.slice(0, 5).map((name, index) => ({
    id: safeKey(name, `module-${index + 1}`),
    name,
    entity: summary.entities[index % Math.max(summary.entities.length, 1)] || { name: '业务对象', fields: ['名称', '负责人', '状态'] },
    pages: pages.slice(index, index + 2).length > 0 ? pages.slice(index, index + 2) : pages.slice(0, 2),
    description: `${name}模块`,
    primaryActions: ['新增', '编辑', '删除', '查看详情'],
  }));
}

function createSeedData(summary: DemoClarificationSummary, modulePlans: ReturnType<typeof createModulePlans>, category: string) {
  const seedNamesByCategory: Record<string, string[]> = {
    'ai-chat': ['账户登录失败咨询', '退款进度查询', '发票开具说明', '工单升级申请'],
    'knowledge-hub': ['入职制度手册', '费用报销规范', '客服话术模板', '数据口径说明'],
    'data-workbench': ['本周销售概览', '客户转化趋势', '异常工单分布', '区域服务质量'],
    'automation-workflow': ['采购审批流程', '退款审核流', '客户升级工单流', '巡检派单流'],
    'portal-showcase': ['集团门户公告', '年度活动专题', '重点业务入口', '企业新闻速递'],
    'learning-exam': ['新员工入职课程', '季度合规考试', '岗位学习任务', '成绩结果回顾'],
    'commerce-transaction': ['热销商品清单', '本周订货订单', '供应商采购单', '待发货商品'],
    'service-scheduling': ['门店预约登记', '技师排班安排', '服务时段配置', '待确认预约单'],
    'project-delivery': ['一期交付项目', '里程碑验收计划', '实施问题清单', '上线准备任务'],
    'admin-console': ['客户档案', '运营任务', '项目计划', '内容配置'],
  };

  return modulePlans.reduce<Record<string, any[]>>((acc, modulePlan, moduleIndex) => {
    const storageSchema = summary.storageSchemas?.find((item) => item.moduleId === modulePlan.id);
    const fieldSource = storageSchema?.fields || modulePlan.entity.fields;
    const seedNames = seedNamesByCategory[category] || seedNamesByCategory['admin-console'];

    acc[modulePlan.id] = Array.from({ length: 4 }).map((_, itemIndex) => {
      const baseTitle = seedNames[itemIndex % seedNames.length];
      const baseRecord: Record<string, any> = {
        id: moduleIndex * 100 + itemIndex + 1,
        name: `${baseTitle}${moduleIndex > 0 ? ` ${moduleIndex + 1}` : ''}`,
        title: `${baseTitle}${moduleIndex > 0 ? ` ${moduleIndex + 1}` : ''}`,
        status: ['草稿', '进行中', '已完成', '待处理'][itemIndex % 4],
        owner: ['张三', '李四', '王五', '赵六'][itemIndex % 4],
        description: `${modulePlan.entity.name}的演示数据 ${itemIndex + 1}`,
        updatedAt: `2026-04-${String(itemIndex + 11).padStart(2, '0')}`,
      };

      if (category === 'ai-chat') {
        baseRecord.lastMessage = ['已为您匹配退款进度说明。', '请先确认账户权限状态。', '建议补充工单编号后继续咨询。', '我已为您推荐相关 FAQ。'][itemIndex % 4];
        baseRecord.messageCount = 6 + itemIndex;
        baseRecord.customer = ['华东客户组', '旗舰门店', '企业会员', '售后支持'][itemIndex % 4];
        baseRecord.ticketId = `TK-${moduleIndex + 1}${itemIndex + 1}0${itemIndex + 7}`;
        baseRecord.priority = ['高', '中', '低', '中'][itemIndex % 4];
        baseRecord.relatedQuestions = '退款流程、工单升级、发票申请';
      }

      if (category === 'knowledge-hub') {
        baseRecord.category = ['制度规范', '客服知识', '操作手册', '数据说明'][itemIndex % 4];
        baseRecord.excerpt = ['适用于新员工入职学习。', '覆盖常见客服问题与处理口径。', '说明标准操作步骤与权限范围。', '用于统一核心指标解释。'][itemIndex % 4];
        baseRecord.author = ['运营管理部', '客服中心', '流程管理组', '数据分析组'][itemIndex % 4];
        baseRecord.relatedDocs = '相关制度、FAQ、流程说明';
      }

      if (category === 'data-workbench') {
        baseRecord.metricName = baseTitle;
        baseRecord.currentValue = ['82%', '1240', '17.6%', '96.2%'][itemIndex % 4];
        baseRecord.trend = ['较上周提升 6%', '较昨日增加 128', '较上月提升 2.4%', '较目标高 1.2%'][itemIndex % 4];
        baseRecord.alertLevel = ['关注', '正常', '预警', '正常'][itemIndex % 4];
        baseRecord.dimension = ['区域', '渠道', '时段', '团队'][itemIndex % 4];
      }

      if (category === 'automation-workflow') {
        baseRecord.flowName = baseTitle;
        baseRecord.nodeName = ['提交申请', '主管审批', '财务复核', '完成归档'][itemIndex % 4];
        baseRecord.runStatus = ['执行中', '待审批', '已完成', '异常'][itemIndex % 4];
        baseRecord.pendingOwner = ['张三', '李四', '王五', '赵六'][itemIndex % 4];
        baseRecord.ruleSummary = ['按金额分级审批', '超时自动提醒', '异常自动升级', '完成后自动归档'][itemIndex % 4];
      }

      fieldSource.forEach((field, fieldIndex) => {
        const key = safeKey(field, `field-${fieldIndex + 1}`);
        if (baseRecord[key] == null) baseRecord[key] = `${field}示例${itemIndex + 1}`;
      });
      return baseRecord;
    });
    return acc;
  }, {});
}

function buildModuleConfig(summary: DemoClarificationSummary) {
  const modulePlans = createModulePlans(summary);
  return modulePlans.map((modulePlan) => ({
    id: modulePlan.id,
    name: modulePlan.name,
    navLabel: modulePlan.name,
    entityName: modulePlan.entity.name,
    fields: modulePlan.entity.fields,
    pages: modulePlan.pages,
    description: modulePlan.description,
    primaryActions: modulePlan.primaryActions,
    listSchema: summary.listSchemas?.find((item) => item.moduleId === modulePlan.id) || null,
    formSchema: summary.formSchemas?.find((item) => item.moduleId === modulePlan.id) || null,
    detailSchema: summary.detailSchemas?.find((item) => item.moduleId === modulePlan.id) || null,
    storageSchema: summary.storageSchemas?.find((item) => item.moduleId === modulePlan.id) || null,
  }));
}

function getTheme(visualTemplateId: string) {
  if (visualTemplateId === 'elegant-dark') {
    return {
      background: '#0f172a',
      panel: '#111827',
      surface: '#172033',
      softBlue: '#1d4ed8',
      tableHead: '#172033',
      border: 'rgba(148,163,184,0.16)',
      text: '#f8fafc',
      muted: '#94a3b8',
      brand: '#38bdf8',
      brandStrong: '#0ea5e9',
      success: '#10b981',
      alert: '#fb923c',
      alertSoft: 'rgba(251,146,60,0.18)',
      shadow: '0 12px 36px rgba(2,6,23,0.35)',
    };
  }

  if (visualTemplateId === 'elegant') {
    return {
      background: '#f8fafc',
      panel: '#ffffff',
      surface: '#f8fbff',
      softBlue: '#dbeafe',
      tableHead: '#f6f9fc',
      border: '#dbe5f0',
      text: '#10233f',
      muted: '#5c6f89',
      brand: '#1d4ed8',
      brandStrong: '#1e40af',
      success: '#0f9f6e',
      alert: '#c2410c',
      alertSoft: '#ffedd5',
      shadow: '0 10px 30px rgba(15, 35, 63, 0.06)',
    };
  }

  return {
    background: '#f3f7fb',
    panel: '#ffffff',
    surface: '#f8fbff',
    softBlue: '#eaf3ff',
    tableHead: '#f6f9fc',
    border: '#dbe5f0',
    text: '#10233f',
    muted: '#5c6f89',
    brand: '#2563eb',
    brandStrong: '#1d4ed8',
    success: '#0f9f6e',
    alert: '#c2410c',
    alertSoft: '#ffedd5',
    shadow: '0 10px 30px rgba(15, 35, 63, 0.06)',
  };
}

function getCategoryLabel(category: string) {
  if (category === 'ai-chat') return '智能对话';
  if (category === 'knowledge-hub') return '知识中心';
  if (category === 'data-workbench') return '数据工作台';
  if (category === 'automation-workflow') return '流程自动化';
  if (category === 'portal-showcase') return '门户展示';
  if (category === 'learning-exam') return '学习考试';
  if (category === 'commerce-transaction') return '交易商城';
  if (category === 'service-scheduling') return '预约调度';
  if (category === 'project-delivery') return '项目交付';
  return '管理系统';
}

function buildAppContent(summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
  const category = selection.meta.categoryTemplateId;
  if (category === 'ai-chat') return buildChatAppContent(summary, selection);
  if (category === 'knowledge-hub') return buildKnowledgeAppContent(summary, selection);
  if (category === 'data-workbench') return buildAnalyticsAppContent(summary, selection);
  if (category === 'automation-workflow') return buildWorkflowAppContent(summary, selection);
  if (category === 'portal-showcase') return buildPortalAppContent(summary, selection);
  if (category === 'learning-exam') return buildLearningAppContent(summary, selection);
  if (category === 'commerce-transaction') return buildCommerceAppContent(summary, selection);
  if (category === 'service-scheduling') return buildSchedulingAppContent(summary, selection);
  if (category === 'project-delivery') return buildDeliveryAppContent(summary, selection);
  return buildAdminAppContent(summary, selection);
}

function buildDashboardContent(category: string) {
  if (category === 'ai-chat') return buildChatDashboardPageContent();
  if (category === 'knowledge-hub') return buildKnowledgeDashboardPageContent();
  if (category === 'data-workbench') return buildAnalyticsDashboardPageContent();
  if (category === 'automation-workflow') return buildWorkflowDashboardPageContent();
  if (category === 'portal-showcase') return buildPortalDashboardPageContent();
  if (category === 'learning-exam') return buildLearningDashboardPageContent();
  if (category === 'commerce-transaction') return buildCommerceDashboardPageContent();
  if (category === 'service-scheduling') return buildSchedulingDashboardPageContent();
  if (category === 'project-delivery') return buildDeliveryDashboardPageContent();
  return buildAdminDashboardPageContent();
}

function buildListContent(category: string) {
  if (category === 'ai-chat') return buildChatWorkspacePageContent();
  if (category === 'knowledge-hub') return buildKnowledgeWorkspacePageContent();
  if (category === 'data-workbench') return buildAnalyticsWorkspacePageContent();
  if (category === 'automation-workflow') return buildWorkflowWorkspacePageContent();
  if (category === 'portal-showcase') return buildPortalWorkspacePageContent();
  if (category === 'learning-exam') return buildLearningWorkspacePageContent();
  if (category === 'commerce-transaction') return buildCommerceWorkspacePageContent();
  if (category === 'service-scheduling') return buildSchedulingWorkspacePageContent();
  if (category === 'project-delivery') return buildDeliveryWorkspacePageContent();
  return buildAdminModuleListPageContent();
}

function buildDetailContent(category: string) {
  if (category === 'ai-chat') return buildChatDetailPageContent();
  if (category === 'knowledge-hub') return buildKnowledgeDetailPageContent();
  if (category === 'data-workbench') return buildAnalyticsDetailPageContent();
  if (category === 'automation-workflow') return buildWorkflowDetailPageContent();
  if (category === 'portal-showcase') return buildPortalDetailPageContent();
  if (category === 'learning-exam') return buildLearningDetailPageContent();
  if (category === 'commerce-transaction') return buildCommerceDetailPageContent();
  if (category === 'service-scheduling') return buildSchedulingDetailPageContent();
  if (category === 'project-delivery') return buildDeliveryDetailPageContent();
  return buildAdminModuleDetailPageContent();
}

function buildFormContent(category: string) {
  if (category === 'ai-chat') return buildChatFormPageContent();
  if (category === 'knowledge-hub') return buildKnowledgeFormPageContent();
  if (category === 'data-workbench') return buildAnalyticsFormPageContent();
  if (category === 'automation-workflow') return buildWorkflowFormPageContent();
  if (category === 'portal-showcase') return buildPortalFormPageContent();
  if (category === 'learning-exam') return buildLearningFormPageContent();
  if (category === 'commerce-transaction') return buildCommerceFormPageContent();
  if (category === 'service-scheduling') return buildSchedulingFormPageContent();
  if (category === 'project-delivery') return buildDeliveryFormPageContent();
  return buildAdminModuleFormPageContent();
}

function buildAdminAppContent(summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
  const theme = getTheme(selection.meta.visualTemplateId);
  const categoryLabel = getCategoryLabel(selection.meta.categoryTemplateId);
  const projectName = (summary.projectName || 'Demo 商务系统').replace(/[\n\r]/g, ' ').slice(0, 32);
  return `import React, { useMemo, useState } from 'react';
import modules from '../data/modules.json';
import seed from '../data/seed.json';
import { DashboardPage } from './dashboard/DashboardPage';
import { ModuleListPage } from './modules/ModuleListPage';
import { ModuleDetailPage } from './modules/ModuleDetailPage';
import { ModuleFormPage } from './modules/ModuleFormPage';
import { loadModuleRecords, loadSelectedModule, loadSelectedRecord, saveModuleRecords, saveSelectedModule, saveSelectedRecord } from '../store/local-store';

type ModuleConfig = (typeof modules)[number];
type RecordMap = typeof seed;
type RecordItem = Record<string, any>;
type View = 'dashboard' | 'list' | 'detail' | 'form';

const moduleConfigs = modules as ModuleConfig[];
const initialSeed = seed as RecordMap;
const theme = ${JSON.stringify(theme, null, 2)};

export function App() {
  const defaultModuleId = moduleConfigs[0]?.id || 'dashboard';
  const initialModuleId = loadSelectedModule(defaultModuleId);
  const [activeModuleId, setActiveModuleId] = useState(initialModuleId);
  const [view, setView] = useState<View>('dashboard');
  const [recordsByModule, setRecordsByModule] = useState<Record<string, RecordItem[]>>(() => {
    const next: Record<string, RecordItem[]> = {};
    moduleConfigs.forEach((module) => {
      next[module.id] = loadModuleRecords(module.id, initialSeed[module.id] || []);
    });
    return next;
  });
  const [selectedId, setSelectedId] = useState<number | null>(() => loadSelectedRecord(initialModuleId));
  const [keyword, setKeyword] = useState('');

  const activeModule = moduleConfigs.find((item) => item.id === activeModuleId) || moduleConfigs[0];
  const records = activeModule ? recordsByModule[activeModule.id] || [] : [];

  const filteredRecords = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return records;
    return records.filter((item) => Object.values(item).some((value) => String(value ?? '').toLowerCase().includes(text)));
  }, [records, keyword]);

  const selectedRecord = useMemo(() => {
    if (!activeModule) return null;
    const activeRecords = recordsByModule[activeModule.id] || [];
    return activeRecords.find((item) => item.id === selectedId) || activeRecords[0] || null;
  }, [activeModule, recordsByModule, selectedId]);

  const totals = useMemo(() => ({
    modules: moduleConfigs.length,
    records: Object.values(recordsByModule).reduce((count, items) => count + items.length, 0),
    charts: ${JSON.stringify(summary.charts || [])}.length,
    interactions: ${JSON.stringify(summary.keyInteractions || [])}.length,
  }), [recordsByModule]);

  const persistModuleRecords = (moduleId: string, nextRecords: RecordItem[]) => {
    saveModuleRecords(moduleId, nextRecords);
    setRecordsByModule((prev) => ({ ...prev, [moduleId]: nextRecords }));
  };

  const persistSelected = (moduleId: string, recordId: number | null) => {
    setSelectedId(recordId);
    saveSelectedRecord(moduleId, recordId);
  };

  const switchModule = (moduleId: string, nextView: View = 'list') => {
    setActiveModuleId(moduleId);
    saveSelectedModule(moduleId);
    setView(nextView);
    setKeyword('');
    const nextRecords = recordsByModule[moduleId] || [];
    persistSelected(moduleId, nextRecords[0]?.id ?? null);
  };

  const saveRecord = (draft: Record<string, any>) => {
    if (!activeModule) return;
    const nextRecords = [...(recordsByModule[activeModule.id] || [])];
    if (draft.id) {
      const index = nextRecords.findIndex((item) => item.id === draft.id);
      if (index >= 0) nextRecords[index] = { ...nextRecords[index], ...draft, updatedAt: createTimestamp() };
    } else {
      nextRecords.unshift({ ...draft, id: Date.now(), updatedAt: createTimestamp() });
    }
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
    setView('detail');
  };

  const removeRecord = (id: number) => {
    if (!activeModule) return;
    const nextRecords = (recordsByModule[activeModule.id] || []).filter((item) => item.id !== id);
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
    setView(nextRecords.length ? 'detail' : 'list');
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.background, color: theme.text, fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', minHeight: '100vh' }}>
        <aside style={{ padding: 24, background: '#0f172a', color: '#e2e8f0', display: 'grid', gap: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: '#93c5fd', fontWeight: 700 }}>${categoryLabel.toUpperCase()}</div>
            <div style={{ marginTop: 12, fontSize: 26, lineHeight: 1.35, fontWeight: 700 }}>${projectName}</div>
            <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>${(summary.businessGoal || '').replace(/[\n\r]/g, ' ').slice(0, 72)}</div>
          </div>

          <nav style={{ display: 'grid', gap: 10 }}>
            <button onClick={() => setView('dashboard')} style={navButton(view === 'dashboard')}>
              <div style={{ fontWeight: 700 }}>工作台</div>
              <div style={{ marginTop: 6, fontSize: 12, color: view === 'dashboard' ? '#dbeafe' : '#94a3b8' }}>查看看板、模块与关键交互</div>
            </button>
            {moduleConfigs.map((module) => {
              const active = module.id === activeModuleId && view !== 'dashboard';
              return (
                <button key={module.id} onClick={() => switchModule(module.id)} style={navButton(active)}>
                  <div style={{ fontWeight: 700 }}>{module.navLabel || module.name}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: active ? '#dbeafe' : '#94a3b8' }}>{module.description}</div>
                </button>
              );
            })}
          </nav>
        </aside>

        <main style={{ padding: 28, overflowX: 'hidden' }}>
          <div style={{ display: 'grid', gap: 24 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 700, color: theme.text }}>{view === 'dashboard' ? '业务总览' : activeModule?.name || '模块视图'}</div>
                <div style={{ marginTop: 8, color: theme.muted, fontSize: 14 }}>{view === 'dashboard' ? ${JSON.stringify(summary.demoScope || '完整 CRUD + 筛选分页')} : activeModule?.description}</div>
              </div>
              {view !== 'dashboard' && activeModule && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => setView('list')} style={secondaryButton()}>列表</button>
                  {selectedRecord && <button onClick={() => setView('detail')} style={secondaryButton()}>详情</button>}
                  <button onClick={() => setView('form')} style={primaryButton()}>{activeModule.primaryActions?.[0] || '新增' + activeModule.entityName}</button>
                </div>
              )}
            </header>

            {view === 'dashboard' && (
              <DashboardPage
                totals={totals}
                modules={moduleConfigs}
                charts={${JSON.stringify(summary.charts || [])}}
                interactions={${JSON.stringify(summary.keyInteractions || [])}}
                downgradeNotes={${JSON.stringify(summary.downgradeNotes || [])}}
                theme={theme}
              />
            )}

            {view === 'list' && activeModule && (
              <ModuleListPage
                module={activeModule}
                items={filteredRecords}
                keyword={keyword}
                onKeywordChange={setKeyword}
                onOpen={(id) => {
                  persistSelected(activeModule.id, id);
                  setView('detail');
                }}
                onDelete={removeRecord}
                onCreate={() => setView('form')}
                theme={theme}
              />
            )}

            {view === 'detail' && activeModule && selectedRecord && (
              <ModuleDetailPage
                module={activeModule}
                item={selectedRecord}
                interactions={${JSON.stringify(summary.keyInteractions || [])}}
                onEdit={() => setView('form')}
                theme={theme}
              />
            )}

            {view === 'detail' && activeModule && !selectedRecord && (
              <div style={{ padding: 24, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, color: theme.muted }}>当前模块暂无数据，请先新增记录。</div>
            )}

            {view === 'form' && activeModule && (
              <ModuleFormPage
                module={activeModule}
                item={selectedRecord}
                onSave={saveRecord}
                onCancel={() => setView(selectedRecord ? 'detail' : 'list')}
                theme={theme}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );

  function navButton(active: boolean) {
    return {
      width: '100%',
      padding: '14px 16px',
      borderRadius: 16,
      border: active ? '1px solid rgba(147,197,253,0.4)' : '1px solid rgba(148,163,184,0.14)',
      background: active ? 'rgba(37,99,235,0.28)' : 'rgba(15,23,42,0.35)',
      color: '#f8fafc',
      textAlign: 'left' as const,
      cursor: 'pointer',
    } as const;
  }

  function primaryButton() {
    return {
      padding: '10px 16px',
      border: '1px solid ' + theme.brand,
      borderRadius: 12,
      background: theme.brand,
      color: '#fff',
      cursor: 'pointer',
      fontWeight: 600,
    } as const;
  }

  function secondaryButton() {
    return {
      padding: '10px 16px',
      border: '1px solid ' + theme.border,
      borderRadius: 12,
      background: theme.panel,
      color: theme.text,
      cursor: 'pointer',
      fontWeight: 600,
    } as const;
  }
}

function createTimestamp() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
}
`;
}

function buildChatAppContent(summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
  const theme = getTheme(selection.meta.visualTemplateId);
  const projectName = (summary.projectName || '智能客服问答系统').replace(/[\n\r]/g, ' ').slice(0, 28);
  return `import React, { useMemo, useState } from 'react';
import modules from '../data/modules.json';
import seed from '../data/seed.json';
import { DashboardPage } from './dashboard/DashboardPage';
import { ModuleListPage } from './modules/ModuleListPage';
import { ModuleDetailPage } from './modules/ModuleDetailPage';
import { ModuleFormPage } from './modules/ModuleFormPage';
import { loadModuleRecords, loadSelectedModule, loadSelectedRecord, saveModuleRecords, saveSelectedModule, saveSelectedRecord } from '../store/local-store';

type ModuleConfig = (typeof modules)[number];
type RecordMap = typeof seed;
type RecordItem = Record<string, any>;
type View = 'dashboard' | 'detail' | 'form';

const moduleConfigs = modules as ModuleConfig[];
const initialSeed = seed as RecordMap;
const theme = ${JSON.stringify(theme, null, 2)};
const recommendedQuestions = ${JSON.stringify(summary.requirementHighlights?.slice(0, 4).map(item => item.replace(/^\d+\.?\s*/, '')).filter(Boolean) || ['退款流程怎么查？', '如何开具发票？', '工单如何升级？', '密码忘记怎么办？'])};
const workspaceMetrics = ${JSON.stringify(summary.charts || ['今日接待量', '平均响应时长', '满意度评分', '常见问题 TOP5'])};

export function App() {
  const defaultModuleId = moduleConfigs[1]?.id || moduleConfigs[0]?.id || 'sessions';
  const initialModuleId = loadSelectedModule(defaultModuleId);
  const [activeModuleId, setActiveModuleId] = useState(initialModuleId);
  const [view, setView] = useState<View>('detail');
  const [recordsByModule, setRecordsByModule] = useState<Record<string, RecordItem[]>>(() => {
    const next: Record<string, RecordItem[]> = {};
    moduleConfigs.forEach((module) => {
      next[module.id] = loadModuleRecords(module.id, initialSeed[module.id] || []);
    });
    return next;
  });
  const [selectedId, setSelectedId] = useState<number | null>(() => loadSelectedRecord(initialModuleId));
  const [draftMessage, setDraftMessage] = useState('');

  const activeModule = moduleConfigs.find((item) => item.id === activeModuleId) || moduleConfigs[0];
  const records = activeModule ? recordsByModule[activeModule.id] || [] : [];
  const selectedRecord = records.find((item) => item.id === selectedId) || records[0] || null;

  const persistModuleRecords = (moduleId: string, nextRecords: RecordItem[]) => {
    saveModuleRecords(moduleId, nextRecords);
    setRecordsByModule((prev) => ({ ...prev, [moduleId]: nextRecords }));
  };

  const persistSelected = (moduleId: string, recordId: number | null) => {
    setSelectedId(recordId);
    saveSelectedRecord(moduleId, recordId);
  };

  const switchModule = (moduleId: string) => {
    setActiveModuleId(moduleId);
    saveSelectedModule(moduleId);
    const nextRecords = recordsByModule[moduleId] || [];
    persistSelected(moduleId, nextRecords[0]?.id ?? null);
    setView(moduleId === moduleConfigs[0]?.id ? 'dashboard' : 'detail');
  };

  const createConversation = () => {
    if (!activeModule) return;
    const nextRecords = [{
      id: Date.now(),
      name: '新建会话',
      title: '新建会话',
      customer: '待关联客户',
      ticketId: 'TK-' + String(Date.now()).slice(-6),
      priority: '中',
      status: '进行中',
      lastMessage: '请在下方输入咨询问题。',
      updatedAt: createTimestamp(),
      messageCount: 1,
      relatedQuestions: '退款流程、发票申请、工单升级',
    }, ...(recordsByModule[activeModule.id] || [])];
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
    setView('detail');
  };

  const sendMessage = () => {
    if (!activeModule || !selectedRecord || !draftMessage.trim()) return;
    const nextRecords = (recordsByModule[activeModule.id] || []).map((item) => item.id === selectedRecord.id ? {
      ...item,
      lastMessage: draftMessage.trim(),
      updatedAt: createTimestamp(),
      messageCount: Number(item.messageCount || 0) + 2,
      description: draftMessage.trim(),
    } : item);
    persistModuleRecords(activeModule.id, nextRecords);
    setDraftMessage('');
  };

  const saveRecord = (draft: Record<string, any>) => {
    if (!activeModule) return;
    const nextRecords = [...(recordsByModule[activeModule.id] || [])];
    if (draft.id) {
      const index = nextRecords.findIndex((item) => item.id === draft.id);
      if (index >= 0) nextRecords[index] = { ...nextRecords[index], ...draft, updatedAt: createTimestamp() };
    } else {
      nextRecords.unshift({ ...draft, id: Date.now(), updatedAt: createTimestamp() });
    }
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
    setView('detail');
  };

  const removeRecord = (id: number) => {
    if (!activeModule) return;
    const nextRecords = (recordsByModule[activeModule.id] || []).filter((item) => item.id !== id);
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.background, color: theme.text, fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', minHeight: '100vh' }}>
        <aside style={{ padding: 24, background: '#0f172a', color: '#e2e8f0', display: 'grid', gap: 18 }}>
          <div>
            <div style={{ fontSize: 13, color: '#93c5fd', fontWeight: 700 }}>SERVICE DESK CHAT</div>
            <div style={{ marginTop: 12, fontSize: 26, lineHeight: 1.35, fontWeight: 700 }}>${projectName}</div>
            <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>${(summary.demoScope || '问答 + FAQ + 工单协同前端演示').replace(/[\n\r]/g, ' ')}</div>
          </div>

          <button onClick={() => setView('dashboard')} style={navButton(view === 'dashboard')}>
            <div style={{ fontWeight: 700 }}>工作台</div>
            <div style={{ marginTop: 6, fontSize: 12, color: view === 'dashboard' ? '#dbeafe' : '#94a3b8' }}>查看接待量、满意度与常见问题</div>
          </button>

          <div style={{ display: 'grid', gap: 10 }}>
            {moduleConfigs.map((module) => {
              const active = module.id === activeModuleId && view !== 'dashboard';
              return (
                <button key={module.id} onClick={() => switchModule(module.id)} style={navButton(active)}>
                  <div style={{ fontWeight: 700 }}>{module.navLabel || module.name}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: active ? '#dbeafe' : '#94a3b8' }}>{module.description}</div>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
            <button onClick={createConversation} style={{ padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(96,165,250,0.35)', background: 'rgba(37,99,235,0.35)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>新建会话</button>
            <div style={{ padding: 16, borderRadius: 18, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(147,197,253,0.18)' }}>
              <div style={{ fontSize: 13, color: '#bfdbfe', fontWeight: 700 }}>工作台指标</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {workspaceMetrics.map((item) => <div key={item} style={{ color: '#e2e8f0', fontSize: 13 }}>• {item}</div>)}
              </div>
            </div>
          </div>
        </aside>

        <main style={{ padding: 28, overflow: 'hidden' }}>
          {view === 'dashboard' && <DashboardPage theme={theme} metrics={workspaceMetrics} modules={moduleConfigs} interactions={${JSON.stringify(summary.keyInteractions || [])}} />}
          {view === 'detail' && activeModule && <ModuleDetailPage module={activeModule} item={selectedRecord} items={records} draftMessage={draftMessage} onDraftChange={setDraftMessage} onSend={sendMessage} onCreate={createConversation} onDelete={removeRecord} onSelect={(id) => persistSelected(activeModule.id, id)} theme={theme} recommendedQuestions={recommendedQuestions} interactions={${JSON.stringify(summary.keyInteractions || [])}} />}
          {view === 'form' && activeModule && <ModuleFormPage module={activeModule} item={selectedRecord} onSave={saveRecord} onCancel={() => setView('detail')} theme={theme} />}
        </main>
      </div>
    </div>
  );

  function navButton(active: boolean) {
    return {
      width: '100%',
      padding: '14px 16px',
      borderRadius: 16,
      border: active ? '1px solid rgba(147,197,253,0.4)' : '1px solid rgba(148,163,184,0.14)',
      background: active ? 'rgba(37,99,235,0.28)' : 'rgba(15,23,42,0.35)',
      color: '#f8fafc',
      textAlign: 'left' as const,
      cursor: 'pointer',
    } as const;
  }
}

function createTimestamp() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
}
`;
}

function buildKnowledgeAppContent(summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
  const theme = getTheme(selection.meta.visualTemplateId);
  const projectName = (summary.projectName || '知识中心').replace(/[\n\r]/g, ' ').slice(0, 28);
  return `import React, { useMemo, useState } from 'react';
import modules from '../data/modules.json';
import seed from '../data/seed.json';
import { DashboardPage } from './dashboard/DashboardPage';
import { ModuleListPage } from './modules/ModuleListPage';
import { ModuleDetailPage } from './modules/ModuleDetailPage';
import { ModuleFormPage } from './modules/ModuleFormPage';
import { loadModuleRecords, loadSelectedModule, loadSelectedRecord, saveModuleRecords, saveSelectedModule, saveSelectedRecord } from '../store/local-store';

type ModuleConfig = (typeof modules)[number];
type RecordMap = typeof seed;
type RecordItem = Record<string, any>;
type View = 'dashboard' | 'list' | 'detail' | 'form';

const moduleConfigs = modules as ModuleConfig[];
const initialSeed = seed as RecordMap;
const theme = ${JSON.stringify(theme, null, 2)};
const searchHints = ${JSON.stringify(summary.pageBlueprints || ['文档搜索', '目录树', '文档详情', '关联资料'])};

export function App() {
  const defaultModuleId = moduleConfigs[0]?.id || 'docs';
  const initialModuleId = loadSelectedModule(defaultModuleId);
  const [activeModuleId, setActiveModuleId] = useState(initialModuleId);
  const [view, setView] = useState<View>('list');
  const [recordsByModule, setRecordsByModule] = useState<Record<string, RecordItem[]>>(() => {
    const next: Record<string, RecordItem[]> = {};
    moduleConfigs.forEach((module) => {
      next[module.id] = loadModuleRecords(module.id, initialSeed[module.id] || []);
    });
    return next;
  });
  const [selectedId, setSelectedId] = useState<number | null>(() => loadSelectedRecord(initialModuleId));
  const [keyword, setKeyword] = useState('');

  const activeModule = moduleConfigs.find((item) => item.id === activeModuleId) || moduleConfigs[0];
  const records = activeModule ? recordsByModule[activeModule.id] || [] : [];
  const filteredRecords = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return records;
    return records.filter((item) => Object.values(item).some((value) => String(value ?? '').toLowerCase().includes(text)));
  }, [records, keyword]);
  const selectedRecord = filteredRecords.find((item) => item.id === selectedId) || filteredRecords[0] || records[0] || null;

  const persistModuleRecords = (moduleId: string, nextRecords: RecordItem[]) => {
    saveModuleRecords(moduleId, nextRecords);
    setRecordsByModule((prev) => ({ ...prev, [moduleId]: nextRecords }));
  };

  const persistSelected = (moduleId: string, recordId: number | null) => {
    setSelectedId(recordId);
    saveSelectedRecord(moduleId, recordId);
  };

  const switchModule = (moduleId: string) => {
    setActiveModuleId(moduleId);
    saveSelectedModule(moduleId);
    setView('list');
    const nextRecords = recordsByModule[moduleId] || [];
    persistSelected(moduleId, nextRecords[0]?.id ?? null);
  };

  const saveRecord = (draft: Record<string, any>) => {
    if (!activeModule) return;
    const nextRecords = [...(recordsByModule[activeModule.id] || [])];
    if (draft.id) {
      const index = nextRecords.findIndex((item) => item.id === draft.id);
      if (index >= 0) nextRecords[index] = { ...nextRecords[index], ...draft, updatedAt: createTimestamp() };
    } else {
      nextRecords.unshift({ ...draft, id: Date.now(), updatedAt: createTimestamp() });
    }
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
    setView('detail');
  };

  const removeRecord = (id: number) => {
    if (!activeModule) return;
    const nextRecords = (recordsByModule[activeModule.id] || []).filter((item) => item.id !== id);
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
    setView('list');
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.background, color: theme.text, fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', minHeight: '100vh' }}>
        <aside style={{ padding: 24, background: theme.panel, borderRight: '1px solid ' + theme.border, display: 'grid', gap: 18 }}>
          <div>
            <div style={{ fontSize: 13, color: theme.brand, fontWeight: 700 }}>KNOWLEDGE HUB</div>
            <div style={{ marginTop: 12, fontSize: 26, lineHeight: 1.35, fontWeight: 700 }}>${projectName}</div>
            <div style={{ marginTop: 10, color: theme.muted, fontSize: 13, lineHeight: 1.7 }}>搜索、分类、内容详情与关联资料统一浏览。</div>
          </div>
          <button onClick={() => setView('dashboard')} style={navButton(view === 'dashboard')}>
            <div style={{ fontWeight: 700 }}>知识首页</div>
            <div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>查看热门资料与最近更新</div>
          </button>
          {moduleConfigs.map((module) => (
            <button key={module.id} onClick={() => switchModule(module.id)} style={navButton(module.id === activeModuleId && view !== 'dashboard')}>
              <div style={{ fontWeight: 700 }}>{module.navLabel || module.name}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>{module.description}</div>
            </button>
          ))}
          <div style={{ marginTop: 'auto', padding: 16, borderRadius: 18, background: theme.surface, border: '1px solid ' + theme.border }}>
            <div style={{ fontSize: 13, color: theme.brand, fontWeight: 700 }}>检索提示</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {searchHints.map((item) => <div key={item} style={{ color: theme.muted, fontSize: 13 }}>• {item}</div>)}
            </div>
          </div>
        </aside>
        <main style={{ padding: 28, overflow: 'hidden' }}>
          {view === 'dashboard' && <DashboardPage theme={theme} charts={${JSON.stringify(summary.charts || [])}} interactions={${JSON.stringify(summary.keyInteractions || [])}} />}
          {view !== 'dashboard' && activeModule && (
            <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索资料标题、分类或摘要" style={{ flex: 1, padding: '12px 14px', borderRadius: 14, border: '1px solid ' + theme.border, background: theme.panel, color: theme.text, outline: 'none' }} />
              <button onClick={() => setView('form')} style={{ padding: '10px 16px', borderRadius: 12, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>新增资料</button>
            </div>
          )}
          {view === 'list' && activeModule && <ModuleListPage module={activeModule} items={filteredRecords} onOpen={(id) => { persistSelected(activeModule.id, id); setView('detail'); }} onDelete={removeRecord} onCreate={() => setView('form')} theme={theme} />}
          {view === 'detail' && activeModule && selectedRecord && <ModuleDetailPage module={activeModule} item={selectedRecord} interactions={${JSON.stringify(summary.keyInteractions || [])}} onEdit={() => setView('form')} theme={theme} />}
          {view === 'form' && activeModule && <ModuleFormPage module={activeModule} item={selectedRecord} onSave={saveRecord} onCancel={() => setView(selectedRecord ? 'detail' : 'list')} theme={theme} />}
        </main>
      </div>
    </div>
  );

  function navButton(active: boolean) {
    return {
      width: '100%',
      padding: '14px 16px',
      borderRadius: 16,
      border: '1px solid ' + (active ? theme.brand : theme.border),
      background: active ? theme.softBlue : theme.panel,
      color: theme.text,
      textAlign: 'left' as const,
      cursor: 'pointer',
    } as const;
  }
}

function createTimestamp() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
}
`;
}

function buildAnalyticsAppContent(summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
  const theme = getTheme(selection.meta.visualTemplateId);
  const projectName = (summary.projectName || '数据工作台').replace(/[\n\r]/g, ' ').slice(0, 28);
  return `import React, { useMemo, useState } from 'react';
import modules from '../data/modules.json';
import seed from '../data/seed.json';
import { DashboardPage } from './dashboard/DashboardPage';
import { ModuleListPage } from './modules/ModuleListPage';
import { ModuleDetailPage } from './modules/ModuleDetailPage';
import { ModuleFormPage } from './modules/ModuleFormPage';
import { loadModuleRecords, loadSelectedModule, loadSelectedRecord, saveModuleRecords, saveSelectedModule, saveSelectedRecord } from '../store/local-store';

type ModuleConfig = (typeof modules)[number];
type RecordMap = typeof seed;
type RecordItem = Record<string, any>;
type View = 'dashboard' | 'list' | 'detail' | 'form';

const moduleConfigs = modules as ModuleConfig[];
const initialSeed = seed as RecordMap;
const theme = ${JSON.stringify(theme, null, 2)};
const chartTopics = ${JSON.stringify(summary.charts || ['经营总览', '趋势分析', '结构分布', '告警提醒'])};

export function App() {
  const defaultModuleId = moduleConfigs[0]?.id || 'metrics';
  const initialModuleId = loadSelectedModule(defaultModuleId);
  const [activeModuleId, setActiveModuleId] = useState(initialModuleId);
  const [view, setView] = useState<View>('dashboard');
  const [recordsByModule, setRecordsByModule] = useState<Record<string, RecordItem[]>>(() => {
    const next: Record<string, RecordItem[]> = {};
    moduleConfigs.forEach((module) => {
      next[module.id] = loadModuleRecords(module.id, initialSeed[module.id] || []);
    });
    return next;
  });
  const [selectedId, setSelectedId] = useState<number | null>(() => loadSelectedRecord(initialModuleId));

  const activeModule = moduleConfigs.find((item) => item.id === activeModuleId) || moduleConfigs[0];
  const records = activeModule ? recordsByModule[activeModule.id] || [] : [];
  const selectedRecord = records.find((item) => item.id === selectedId) || records[0] || null;
  const metricCards = useMemo(() => records.slice(0, 4), [records]);

  const persistModuleRecords = (moduleId: string, nextRecords: RecordItem[]) => {
    saveModuleRecords(moduleId, nextRecords);
    setRecordsByModule((prev) => ({ ...prev, [moduleId]: nextRecords }));
  };

  const persistSelected = (moduleId: string, recordId: number | null) => {
    setSelectedId(recordId);
    saveSelectedRecord(moduleId, recordId);
  };

  const switchModule = (moduleId: string, nextView: View = 'detail') => {
    setActiveModuleId(moduleId);
    saveSelectedModule(moduleId);
    setView(nextView);
    const nextRecords = recordsByModule[moduleId] || [];
    persistSelected(moduleId, nextRecords[0]?.id ?? null);
  };

  const saveRecord = (draft: Record<string, any>) => {
    if (!activeModule) return;
    const nextRecords = [...(recordsByModule[activeModule.id] || [])];
    if (draft.id) {
      const index = nextRecords.findIndex((item) => item.id === draft.id);
      if (index >= 0) nextRecords[index] = { ...nextRecords[index], ...draft, updatedAt: createTimestamp() };
    } else {
      nextRecords.unshift({ ...draft, id: Date.now(), updatedAt: createTimestamp() });
    }
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
    setView('detail');
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.background, color: theme.text, fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', minHeight: '100vh' }}>
        <aside style={{ padding: 24, background: '#0f172a', color: '#e2e8f0', display: 'grid', gap: 18 }}>
          <div>
            <div style={{ fontSize: 13, color: '#93c5fd', fontWeight: 700 }}>ANALYTICS BOARD</div>
            <div style={{ marginTop: 12, fontSize: 26, lineHeight: 1.35, fontWeight: 700 }}>${projectName}</div>
            <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>突出指标总览、趋势分析、分布洞察与异常提醒。</div>
          </div>
          <button onClick={() => setView('dashboard')} style={navButton(view === 'dashboard')}>总览看板</button>
          {moduleConfigs.map((module) => <button key={module.id} onClick={() => switchModule(module.id)} style={navButton(module.id === activeModuleId && view !== 'dashboard')}>{module.name}</button>)}
          <div style={{ marginTop: 'auto', padding: 16, borderRadius: 18, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(147,197,253,0.18)' }}>
            <div style={{ fontSize: 13, color: '#bfdbfe', fontWeight: 700 }}>分析主题</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {chartTopics.map((item) => <div key={item} style={{ color: '#e2e8f0', fontSize: 13 }}>• {item}</div>)}
            </div>
          </div>
        </aside>
        <main style={{ padding: 28, overflow: 'hidden' }}>
          {view === 'dashboard' && <DashboardPage theme={theme} metrics={metricCards} charts={chartTopics} interactions={${JSON.stringify(summary.keyInteractions || [])}} />}
          {view === 'detail' && activeModule && selectedRecord && <ModuleDetailPage module={activeModule} item={selectedRecord} interactions={${JSON.stringify(summary.keyInteractions || [])}} onEdit={() => setView('form')} theme={theme} />}
          {view === 'list' && activeModule && <ModuleListPage module={activeModule} items={records} onOpen={(id) => persistSelected(activeModule.id, id)} onDelete={() => undefined} onCreate={() => setView('form')} theme={theme} />}
          {view === 'form' && activeModule && <ModuleFormPage module={activeModule} item={selectedRecord} onSave={saveRecord} onCancel={() => setView('detail')} theme={theme} />}
        </main>
      </div>
    </div>
  );

  function navButton(active: boolean) {
    return {
      width: '100%',
      padding: '14px 16px',
      borderRadius: 16,
      border: active ? '1px solid rgba(147,197,253,0.4)' : '1px solid rgba(148,163,184,0.14)',
      background: active ? 'rgba(37,99,235,0.28)' : 'rgba(15,23,42,0.35)',
      color: '#f8fafc',
      textAlign: 'left' as const,
      cursor: 'pointer',
      fontWeight: 700,
    } as const;
  }
}

function createTimestamp() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
}
`;
}

function buildWorkflowAppContent(summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
  const theme = getTheme(selection.meta.visualTemplateId);
  const projectName = (summary.projectName || '流程自动化').replace(/[\n\r]/g, ' ').slice(0, 28);
  return `import React, { useState } from 'react';
import modules from '../data/modules.json';
import seed from '../data/seed.json';
import { DashboardPage } from './dashboard/DashboardPage';
import { ModuleListPage } from './modules/ModuleListPage';
import { ModuleDetailPage } from './modules/ModuleDetailPage';
import { ModuleFormPage } from './modules/ModuleFormPage';
import { loadModuleRecords, loadSelectedModule, loadSelectedRecord, saveModuleRecords, saveSelectedModule, saveSelectedRecord } from '../store/local-store';

type ModuleConfig = (typeof modules)[number];
type RecordMap = typeof seed;
type RecordItem = Record<string, any>;
type View = 'dashboard' | 'list' | 'detail' | 'form';

const moduleConfigs = modules as ModuleConfig[];
const initialSeed = seed as RecordMap;
const theme = ${JSON.stringify(theme, null, 2)};
const flowHighlights = ${JSON.stringify(summary.keyInteractions || ['流程切换', '节点追踪', '执行状态', '规则说明'])};

export function App() {
  const defaultModuleId = moduleConfigs[0]?.id || 'flow';
  const initialModuleId = loadSelectedModule(defaultModuleId);
  const [activeModuleId, setActiveModuleId] = useState(initialModuleId);
  const [view, setView] = useState<View>('detail');
  const [recordsByModule, setRecordsByModule] = useState<Record<string, RecordItem[]>>(() => {
    const next: Record<string, RecordItem[]> = {};
    moduleConfigs.forEach((module) => {
      next[module.id] = loadModuleRecords(module.id, initialSeed[module.id] || []);
    });
    return next;
  });
  const [selectedId, setSelectedId] = useState<number | null>(() => loadSelectedRecord(initialModuleId));

  const activeModule = moduleConfigs.find((item) => item.id === activeModuleId) || moduleConfigs[0];
  const records = activeModule ? recordsByModule[activeModule.id] || [] : [];
  const selectedRecord = records.find((item) => item.id === selectedId) || records[0] || null;

  const persistModuleRecords = (moduleId: string, nextRecords: RecordItem[]) => {
    saveModuleRecords(moduleId, nextRecords);
    setRecordsByModule((prev) => ({ ...prev, [moduleId]: nextRecords }));
  };

  const persistSelected = (moduleId: string, recordId: number | null) => {
    setSelectedId(recordId);
    saveSelectedRecord(moduleId, recordId);
  };

  const switchModule = (moduleId: string) => {
    setActiveModuleId(moduleId);
    saveSelectedModule(moduleId);
    const nextRecords = recordsByModule[moduleId] || [];
    persistSelected(moduleId, nextRecords[0]?.id ?? null);
    setView('detail');
  };

  const saveRecord = (draft: Record<string, any>) => {
    if (!activeModule) return;
    const nextRecords = [...(recordsByModule[activeModule.id] || [])];
    if (draft.id) {
      const index = nextRecords.findIndex((item) => item.id === draft.id);
      if (index >= 0) nextRecords[index] = { ...nextRecords[index], ...draft, updatedAt: createTimestamp() };
    } else {
      nextRecords.unshift({ ...draft, id: Date.now(), updatedAt: createTimestamp() });
    }
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
    setView('detail');
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.background, color: theme.text, fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', minHeight: '100vh' }}>
        <aside style={{ padding: 24, background: '#0f172a', color: '#e2e8f0', display: 'grid', gap: 18 }}>
          <div>
            <div style={{ fontSize: 13, color: '#93c5fd', fontWeight: 700 }}>WORKFLOW BOARD</div>
            <div style={{ marginTop: 12, fontSize: 26, lineHeight: 1.35, fontWeight: 700 }}>${projectName}</div>
            <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>突出流程列表、节点状态、执行轨迹与规则说明。</div>
          </div>
          <button onClick={() => setView('dashboard')} style={navButton(view === 'dashboard')}>流程总览</button>
          {moduleConfigs.map((module) => <button key={module.id} onClick={() => switchModule(module.id)} style={navButton(module.id === activeModuleId && view !== 'dashboard')}>{module.name}</button>)}
          <div style={{ marginTop: 'auto', padding: 16, borderRadius: 18, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(147,197,253,0.18)' }}>
            <div style={{ fontSize: 13, color: '#bfdbfe', fontWeight: 700 }}>流程关键点</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {flowHighlights.map((item) => <div key={item} style={{ color: '#e2e8f0', fontSize: 13 }}>• {item}</div>)}
            </div>
          </div>
        </aside>
        <main style={{ padding: 28, overflow: 'hidden' }}>
          {view === 'dashboard' && <DashboardPage theme={theme} interactions={flowHighlights} charts={${JSON.stringify(summary.charts || [])}} />}
          {view === 'detail' && activeModule && selectedRecord && <ModuleDetailPage module={activeModule} item={selectedRecord} interactions={flowHighlights} onEdit={() => setView('form')} theme={theme} />}
          {view === 'list' && activeModule && <ModuleListPage module={activeModule} items={records} onOpen={(id) => persistSelected(activeModule.id, id)} onDelete={() => undefined} onCreate={() => setView('form')} theme={theme} />}
          {view === 'form' && activeModule && <ModuleFormPage module={activeModule} item={selectedRecord} onSave={saveRecord} onCancel={() => setView('detail')} theme={theme} />}
        </main>
      </div>
    </div>
  );

  function navButton(active: boolean) {
    return {
      width: '100%',
      padding: '14px 16px',
      borderRadius: 16,
      border: active ? '1px solid rgba(147,197,253,0.4)' : '1px solid rgba(148,163,184,0.14)',
      background: active ? 'rgba(37,99,235,0.28)' : 'rgba(15,23,42,0.35)',
      color: '#f8fafc',
      textAlign: 'left' as const,
      cursor: 'pointer',
      fontWeight: 700,
    } as const;
  }
}

function createTimestamp() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
}
`;
}

function buildAdminDashboardPageContent() {
  return `import React from 'react';

type DashboardPageProps = {
  totals: { modules: number; records: number; charts: number; interactions: number };
  modules: Array<{ id: string; name: string; pages: string[]; description: string }>;
  charts: string[];
  interactions: string[];
  downgradeNotes: string[];
  theme: Record<string, string>;
};

export function DashboardPage({ totals, modules, charts, interactions, downgradeNotes, theme }: DashboardPageProps) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <MetricCard title="业务模块" value={String(totals.modules)} theme={theme} />
        <MetricCard title="演示记录" value={String(totals.records)} theme={theme} />
        <MetricCard title="图表主题" value={String(totals.charts)} theme={theme} />
        <MetricCard title="关键交互" value={String(totals.interactions)} theme={theme} />
      </section>

      <section style={{ padding: 20, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border }}>
        <div style={{ marginBottom: 16, fontSize: 18, fontWeight: 700, color: theme.text }}>业务总览</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
          <div>
            {modules.map((module) => (
              <div key={module.id} style={{ padding: '14px 16px', borderRadius: 16, background: theme.surface, marginBottom: 12 }}>
                <div style={{ color: theme.text, fontWeight: 600 }}>{module.name}</div>
                <div style={{ marginTop: 6, color: theme.muted, fontSize: 13 }}>{module.description}</div>
                <div style={{ marginTop: 8, color: theme.brand, fontSize: 12 }}>{module.pages.length} 个页面蓝图</div>
              </div>
            ))}
          </div>
          <div>
            {(charts.length ? charts : ['趋势总览', '结构分布', '关键指标']).map((item) => (
              <div key={item} style={{ padding: '14px 16px', borderRadius: 16, background: theme.surface, marginBottom: 12 }}>
                <div style={{ color: theme.text, fontWeight: 600 }}>{item}</div>
                <div style={{ marginTop: 6, color: theme.muted, fontSize: 13 }}>通过本地种子数据模拟展示趋势和分布信息。</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Panel title="关键交互" theme={theme}>
          {interactions.map((item, index) => <div key={item + index} style={{ marginBottom: 10, color: theme.text }}>• {item}</div>)}
        </Panel>
        <Panel title="降级说明" theme={theme}>
          {(downgradeNotes.length > 0 ? downgradeNotes : ['复杂后端流程统一以本地 mock 与规则模拟近似表达。']).map((item, index) => <div key={item + index} style={{ marginBottom: 10, color: theme.text }}>• {item}</div>)}
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({ title, value, theme }: { title: string; value: string; theme: Record<string, string> }) {
  return <div style={{ padding: 18, borderRadius: 18, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ color: theme.muted, fontSize: 13 }}>{title}</div><div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: theme.text }}>{value}</div></div>;
}

function Panel({ title, children, theme }: { title: string; children: React.ReactNode; theme: Record<string, string> }) {
  return <div style={{ padding: 20, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: theme.text }}>{title}</div>{children}</div>;
}
`;
}

function buildChatDashboardPageContent() {
  return `import React from 'react';

type DashboardPageProps = {
  theme: Record<string, string>;
  metrics: string[];
  modules: Array<{ id: string; name: string; description: string }>;
  interactions: string[];
};

export function DashboardPage({ theme, metrics, modules, interactions }: DashboardPageProps) {
  const metricCards = ['今日接待量', '平均响应时长', '满意度评分', '常见问题 TOP5'];
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        {metricCards.map((item, index) => <MetricCard key={item} title={item} value={['182', '2分18秒', '96.4%', '24次'][index]} theme={theme} />)}
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <Panel title="会话工作台" theme={theme}>
          {modules.map((module) => <div key={module.id} style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, marginBottom: 10 }}><div style={{ fontWeight: 700, color: theme.text }}>{module.name}</div><div style={{ marginTop: 6, color: theme.muted, fontSize: 13 }}>{module.description}</div></div>)}
        </Panel>
        <Panel title="重点关注" theme={theme}>
          {metrics.map((item) => <div key={item} style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, marginBottom: 10, color: theme.text }}>{item}</div>)}
        </Panel>
      </section>
      <Panel title="关键动作" theme={theme}>
        {interactions.map((item) => <div key={item} style={{ marginBottom: 10, color: theme.text }}>• {item}</div>)}
      </Panel>
    </div>
  );
}

function MetricCard({ title, value, theme }: { title: string; value: string; theme: Record<string, string> }) {
  return <div style={{ padding: 18, borderRadius: 18, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ color: theme.muted, fontSize: 13 }}>{title}</div><div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: theme.text }}>{value}</div></div>;
}

function Panel({ title, children, theme }: { title: string; children: React.ReactNode; theme: Record<string, string> }) {
  return <div style={{ padding: 20, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: theme.text }}>{title}</div>{children}</div>;
}
`;
}

function buildKnowledgeDashboardPageContent() {
  return `import React from 'react';

type DashboardPageProps = {
  theme: Record<string, string>;
  charts: string[];
  interactions: string[];
};

export function DashboardPage({ theme, charts, interactions }: DashboardPageProps) {
  const cards = ['热门制度', '最近更新', '高频检索', '关联资料'];
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        {cards.map((item, index) => <MetricCard key={item} title={item} value={['12份', '8份', '236次', '18条'][index]} theme={theme} />)}
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Panel title="推荐内容" theme={theme}>
          {(charts.length ? charts : ['制度文档', 'FAQ 内容', '操作手册']).map((item) => <div key={item} style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, marginBottom: 10, color: theme.text }}>{item}</div>)}
        </Panel>
        <Panel title="浏览路径" theme={theme}>
          {interactions.map((item) => <div key={item} style={{ marginBottom: 10, color: theme.text }}>• {item}</div>)}
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({ title, value, theme }: { title: string; value: string; theme: Record<string, string> }) {
  return <div style={{ padding: 18, borderRadius: 18, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ color: theme.muted, fontSize: 13 }}>{title}</div><div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: theme.text }}>{value}</div></div>;
}

function Panel({ title, children, theme }: { title: string; children: React.ReactNode; theme: Record<string, string> }) {
  return <div style={{ padding: 20, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: theme.text }}>{title}</div>{children}</div>;
}
`;
}

function buildAnalyticsDashboardPageContent() {
  return `import React from 'react';

type DashboardPageProps = {
  theme: Record<string, string>;
  metrics: Array<Record<string, any>>;
  charts: string[];
  interactions: string[];
};

export function DashboardPage({ theme, metrics, charts, interactions }: DashboardPageProps) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        {(metrics.length ? metrics : [{ metricName: '销售额', currentValue: '1260万' }, { metricName: '转化率', currentValue: '18.6%' }, { metricName: '满意度', currentValue: '96.2%' }, { metricName: '异常工单', currentValue: '12' }]).slice(0, 4).map((item, index) => <MetricCard key={String(item.metricName || index)} title={String(item.metricName || item.name || '指标')} value={String(item.currentValue || item.value || '--')} theme={theme} />)}
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <Panel title="趋势与分布" theme={theme}>
          {(charts.length ? charts : ['趋势分析', '分布分析', '异常提醒']).map((item) => <ChartBlock key={item} title={item} theme={theme} />)}
        </Panel>
        <Panel title="分析动作" theme={theme}>
          {interactions.map((item) => <div key={item} style={{ marginBottom: 10, color: theme.text }}>• {item}</div>)}
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({ title, value, theme }: { title: string; value: string; theme: Record<string, string> }) {
  return <div style={{ padding: 18, borderRadius: 18, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ color: theme.muted, fontSize: 13 }}>{title}</div><div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: theme.text }}>{value}</div></div>;
}

function Panel({ title, children, theme }: { title: string; children: React.ReactNode; theme: Record<string, string> }) {
  return <div style={{ padding: 20, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: theme.text }}>{title}</div>{children}</div>;
}

function ChartBlock({ title, theme }: { title: string; theme: Record<string, string> }) {
  return <div style={{ padding: '16px 18px', borderRadius: 18, background: theme.surface, marginBottom: 14 }}><div style={{ fontWeight: 700, color: theme.text }}>{title}</div><div style={{ marginTop: 10, height: 84, borderRadius: 14, background: 'linear-gradient(180deg, rgba(37,99,235,0.18), rgba(37,99,235,0.04))' }} /></div>;
}
`;
}

function buildWorkflowDashboardPageContent() {
  return `import React from 'react';

type DashboardPageProps = {
  theme: Record<string, string>;
  interactions: string[];
  charts: string[];
};

export function DashboardPage({ theme, interactions, charts }: DashboardPageProps) {
  const cards = ['执行中流程', '待处理节点', '超时提醒', '规则数量'];
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        {cards.map((item, index) => <MetricCard key={item} title={item} value={['18', '7', '2', '36'][index]} theme={theme} />)}
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <Panel title="流程节点区" theme={theme}>
          {['提交申请', '节点审批', '结果执行', '自动归档'].map((item, index) => <Step key={item} index={index + 1} title={item} theme={theme} />)}
        </Panel>
        <Panel title="规则与告警" theme={theme}>
          {(charts.length ? charts : ['规则说明', '异常波动', '执行记录']).map((item) => <div key={item} style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, marginBottom: 10, color: theme.text }}>{item}</div>)}
        </Panel>
      </section>
      <Panel title="关键交互" theme={theme}>
        {interactions.map((item) => <div key={item} style={{ marginBottom: 10, color: theme.text }}>• {item}</div>)}
      </Panel>
    </div>
  );
}

function MetricCard({ title, value, theme }: { title: string; value: string; theme: Record<string, string> }) {
  return <div style={{ padding: 18, borderRadius: 18, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ color: theme.muted, fontSize: 13 }}>{title}</div><div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: theme.text }}>{value}</div></div>;
}

function Panel({ title, children, theme }: { title: string; children: React.ReactNode; theme: Record<string, string> }) {
  return <div style={{ padding: 20, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ marginBottom: 16, fontSize: 16, fontWeight: 700, color: theme.text }}>{title}</div>{children}</div>;
}

function Step({ index, title, theme }: { index: number; title: string; theme: Record<string, string> }) {
  return <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0' }}><div style={{ width: 30, height: 30, borderRadius: 999, background: theme.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{index}</div><div style={{ color: theme.text, fontWeight: 600 }}>{title}</div></div>;
}
`;
}

function buildAdminModuleListPageContent() {
  return `import React from 'react';

type ModuleListPageProps = {
  module: { id: string; name: string; entityName: string; description?: string; listSchema?: { title?: string; columns: string[]; rowActions?: string[] } | null };
  items: Array<Record<string, any>>;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  theme: Record<string, string>;
};

const columnKeyMap: Record<string, string> = {
  '会话主题': 'title',
  '客户': 'customer',
  '客户名称': 'customer',
  '关联工单': 'ticketId',
  '最新摘要': 'lastMessage',
  '更新时间': 'updatedAt',
  '状态': 'status',
  '问题标题': 'question',
  '关键词': 'keywords',
  '标准回答': 'answer',
  '推荐问题': 'relatedQuestions',
  '工单编号': 'ticketNo',
  '问题摘要': 'summary',
  '优先级': 'priority',
  '处理人': 'owner',
  '最近进展': 'lastProgress',
};

export function ModuleListPage({ module, items, keyword, onKeywordChange, onOpen, onDelete, onCreate, theme }: ModuleListPageProps) {
  const columns = module.listSchema?.columns?.length ? module.listSchema.columns : [];
  const actionLabel = module.listSchema?.title?.replace('列表', '') || module.name;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ padding: 20, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>{module.listSchema?.title || module.name}</div>
            <div style={{ marginTop: 8, color: theme.muted, fontSize: 13 }}>{module.description}</div>
          </div>
          <button onClick={onCreate} style={primaryButton(theme)}>{module.primaryActions?.[0] || '新增' + actionLabel}</button>
        </div>
      </div>

      <div style={{ padding: 20, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) auto', gap: 12, alignItems: 'center' }}>
          <input value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder={'搜索' + module.name + '记录'} style={inputStyle(theme)} />
          <div style={{ color: theme.muted, fontSize: 13 }}>共 {items.length} 条</div>
        </div>
      </div>

      <div style={{ padding: 8, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 980 }}>
            <thead>
              <tr>
                {columns.map((column) => <th key={column} style={headerCellStyle(theme)}>{column}</th>)}
                <th style={headerCellStyle(theme)}>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {columns.map((column) => <td key={column} style={bodyCellStyle(theme)}><div style={{ color: theme.text, lineHeight: 1.6 }}>{formatValue(item, column)}</div></td>)}
                  <td style={bodyCellStyle(theme)}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button onClick={() => onOpen(item.id)} style={secondaryButton(theme)}>查看</button><button onClick={() => onDelete(item.id)} style={dangerButton(theme)}>删除</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && <div style={{ padding: '32px 20px', textAlign: 'center', color: theme.muted }}>未找到匹配记录，请调整搜索条件或新增数据。</div>}
      </div>
    </div>
  );
}

function formatValue(item: Record<string, any>, column: string) {
  const key = columnKeyMap[column] || column;
  const value = item[key];
  if (value == null || value === '') return '-';
  const text = String(value).replace(/\n+/g, ' / ');
  return text.length > 42 ? text.slice(0, 42) + '...' : text;
}

function headerCellStyle(theme: Record<string, string>) {
  return { textAlign: 'left' as const, padding: '14px 16px', color: theme.muted, fontSize: 13, fontWeight: 700, borderBottom: '1px solid ' + theme.border, background: theme.tableHead, whiteSpace: 'nowrap' as const };
}

function bodyCellStyle(theme: Record<string, string>) {
  return { padding: '16px', borderBottom: '1px solid ' + theme.border, verticalAlign: 'top' as const, minWidth: 120 };
}

function inputStyle(theme: Record<string, string>) {
  return { width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text, outline: 'none' } as const;
}

function primaryButton(theme: Record<string, string>) {
  return { padding: '10px 16px', borderRadius: 12, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;
}

function secondaryButton(theme: Record<string, string>) {
  return { padding: '8px 12px', borderRadius: 10, border: '1px solid ' + theme.border, background: theme.panel, color: theme.text, cursor: 'pointer' } as const;
}

function dangerButton(theme: Record<string, string>) {
  return { padding: '8px 12px', borderRadius: 10, border: '1px solid ' + theme.alertSoft, background: theme.alertSoft, color: theme.alert, cursor: 'pointer' } as const;
}
`;
}

function buildChatWorkspacePageContent() {
  return `import React from 'react';

type ModuleListPageProps = {
  module: { name: string };
  items: Array<Record<string, any>>;
  draftMessage: string;
  onDraftChange: (value: string) => void;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  onSend: () => void;
  theme: Record<string, string>;
  recommendedQuestions: string[];
  interactions: string[];
};

export function ModuleListPage({ module, items, draftMessage, onDraftChange, onOpen, onDelete, onCreate, onSend, theme, recommendedQuestions, interactions }: ModuleListPageProps) {
  const active = items[0] || null;
  const assistantAnswer = active?.lastMessage || '您好，我已根据当前问题为您匹配相关 FAQ，并整理出推荐处理路径。';
  const question = active?.description || active?.title || '请问如何处理当前客户咨询？';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr) 320px', gap: 20, minHeight: 'calc(100vh - 56px)' }}>
      <section style={panel(theme)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>会话列表</div>
          <button onClick={onCreate} style={primaryButton(theme)}>新建会话</button>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <div key={item.id} style={{ padding: 14, borderRadius: 16, border: '1px solid ' + theme.border, background: theme.surface }}>
              <button onClick={() => onOpen(item.id)} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}>
                <div style={{ fontWeight: 700, color: theme.text }}>{item.title || item.name}</div>
                <div style={{ marginTop: 6, fontSize: 13, color: theme.muted }}>{item.lastMessage || '暂无消息摘要'}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: theme.brand }}>{item.updatedAt || '刚刚更新'}</div>
              </button>
              <button onClick={() => onDelete(item.id)} style={{ marginTop: 10, padding: '6px 10px', borderRadius: 10, border: '1px solid ' + theme.alertSoft, background: theme.alertSoft, color: theme.alert, cursor: 'pointer' }}>删除</button>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...panel(theme), display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>{active?.title || module.name}</div>
            <div style={{ marginTop: 6, fontSize: 13, color: theme.muted }}>{active?.customer || '默认客户上下文'} · {active?.ticketId || 'TK-000001'}</div>
          </div>
          <div style={{ padding: '8px 12px', borderRadius: 999, background: theme.softBlue, color: theme.brand, fontWeight: 700, fontSize: 12 }}>{active?.status || '进行中'}</div>
        </div>

        <div style={{ overflowY: 'auto', display: 'grid', gap: 16, paddingRight: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ maxWidth: '72%', padding: '14px 16px', borderRadius: '18px 18px 4px 18px', background: theme.brand, color: '#fff', lineHeight: 1.7 }}>{question}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ maxWidth: '78%', padding: '16px 18px', borderRadius: '18px 18px 18px 4px', background: theme.surface, border: '1px solid ' + theme.border }}>
              <details style={{ marginBottom: 12 }}>
                <summary style={{ cursor: 'pointer', color: theme.brand, fontWeight: 700 }}>查看思考过程</summary>
                <div style={{ marginTop: 10, display: 'grid', gap: 8, color: theme.muted, fontSize: 13 }}>
                  {interactions.slice(0, 3).map((item, index) => <div key={item + index}>{index + 1}. {item}</div>)}
                </div>
              </details>
              <div style={{ color: theme.text, lineHeight: 1.8 }}>{assistantAnswer}</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, borderTop: '1px solid ' + theme.border, paddingTop: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            {recommendedQuestions.map((item) => <button key={item} onClick={() => onDraftChange(item)} style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text, cursor: 'pointer' }}>{item}</button>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <textarea value={draftMessage} onChange={(event) => onDraftChange(event.target.value)} placeholder="输入客户咨询问题，按 Enter 发送" rows={4} style={{ width: '100%', padding: '14px 16px', borderRadius: 16, border: '1px solid ' + theme.border, background: theme.panel, color: theme.text, resize: 'none', outline: 'none' }} />
            <button onClick={onSend} style={primaryButton(theme)}>发送</button>
          </div>
        </div>
      </section>

      <section style={panel(theme)}>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 14 }}>推荐问题与工单上下文</div>
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 16, background: theme.surface }}>
            <div style={{ fontWeight: 700, color: theme.text, marginBottom: 10 }}>推荐问题</div>
            {recommendedQuestions.map((item) => <div key={item} style={{ marginBottom: 8, color: theme.text }}>• {item}</div>)}
          </div>
          <div style={{ padding: 14, borderRadius: 16, background: theme.surface }}>
            <div style={{ fontWeight: 700, color: theme.text, marginBottom: 10 }}>工单上下文</div>
            <div style={{ display: 'grid', gap: 8, color: theme.text }}>
              <div>工单编号：{active?.ticketId || 'TK-000001'}</div>
              <div>客户：{active?.customer || '默认客户'}</div>
              <div>优先级：{active?.priority || '中'}</div>
              <div>最近进展：{active?.lastMessage || '等待用户继续追问。'}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function panel(theme: Record<string, string>) {
  return { padding: 20, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow } as const;
}

function primaryButton(theme: Record<string, string>) {
  return { padding: '10px 16px', borderRadius: 12, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', cursor: 'pointer', fontWeight: 600, height: 44 } as const;
}
`;
}

function buildKnowledgeWorkspacePageContent() {
  return `import React from 'react';

type ModuleListPageProps = {
  module: { name: string; description?: string };
  items: Array<Record<string, any>>;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  theme: Record<string, string>;
};

export function ModuleListPage({ module, items, onOpen, onDelete, onCreate, theme }: ModuleListPageProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr) 260px', gap: 20 }}>
      <section style={panel(theme)}>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 14 }}>分类目录</div>
        {items.map((item) => <button key={item.id} onClick={() => onOpen(item.id)} style={{ display: 'block', width: '100%', padding: '12px 14px', marginBottom: 10, borderRadius: 14, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text, textAlign: 'left', cursor: 'pointer' }}>{item.category || item.name}</button>)}
      </section>
      <section style={panel(theme)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>{module.name}</div>
            <div style={{ marginTop: 6, color: theme.muted, fontSize: 13 }}>{module.description}</div>
          </div>
          <button onClick={onCreate} style={primaryButton(theme)}>新增资料</button>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((item) => (
            <div key={item.id} style={{ padding: 16, borderRadius: 16, background: theme.surface, border: '1px solid ' + theme.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, color: theme.text }}>{item.title || item.name}</div>
                  <div style={{ marginTop: 8, color: theme.muted, lineHeight: 1.7 }}>{item.excerpt || item.description || '这里展示文档摘要和阅读引导。'}</div>
                </div>
                <div style={{ color: theme.brand, fontSize: 12 }}>{item.updatedAt || '今日更新'}</div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => onOpen(item.id)} style={secondaryButton(theme)}>查看内容</button>
                <button onClick={() => onDelete(item.id)} style={dangerButton(theme)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section style={panel(theme)}>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 14 }}>关联资料</div>
        {items.slice(0, 4).map((item) => <div key={item.id} style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, marginBottom: 10, color: theme.text }}>{item.relatedDocs || '制度规范、FAQ、操作手册'}</div>)}
      </section>
    </div>
  );
}

function panel(theme: Record<string, string>) {
  return { padding: 20, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow } as const;
}
function primaryButton(theme: Record<string, string>) {
  return { padding: '10px 16px', borderRadius: 12, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;
}
function secondaryButton(theme: Record<string, string>) {
  return { padding: '8px 12px', borderRadius: 10, border: '1px solid ' + theme.border, background: theme.panel, color: theme.text, cursor: 'pointer' } as const;
}
function dangerButton(theme: Record<string, string>) {
  return { padding: '8px 12px', borderRadius: 10, border: '1px solid ' + theme.alertSoft, background: theme.alertSoft, color: theme.alert, cursor: 'pointer' } as const;
}
`;
}

function buildAnalyticsWorkspacePageContent() {
  return `import React from 'react';

type ModuleListPageProps = {
  module: { name: string; description?: string };
  items: Array<Record<string, any>>;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  theme: Record<string, string>;
};

export function ModuleListPage({ module, items, onOpen, onCreate, theme }: ModuleListPageProps) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        {items.slice(0, 4).map((item) => <MetricCard key={item.id} title={item.metricName || item.name} value={item.currentValue || item.value || '--'} trend={item.trend || '较昨日持平'} theme={theme} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <section style={panel(theme)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: theme.text }}>{module.name}</div>
              <div style={{ marginTop: 6, color: theme.muted, fontSize: 13 }}>{module.description}</div>
            </div>
            <button onClick={onCreate} style={primaryButton(theme)}>新增指标</button>
          </div>
          {['趋势分析', '结构分布', '异常提醒'].map((item) => <ChartBlock key={item} title={item} theme={theme} />)}
        </section>
        <section style={panel(theme)}>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 14 }}>明细透视</div>
          {items.map((item) => <button key={item.id} onClick={() => onOpen(item.id)} style={{ display: 'block', width: '100%', padding: '12px 14px', marginBottom: 10, borderRadius: 14, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text, textAlign: 'left', cursor: 'pointer' }}>{item.metricName || item.name} · {item.currentValue || item.value || '--'}</button>)}
        </section>
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, theme }: { title: string; value: string; trend: string; theme: Record<string, string> }) {
  return <div style={{ padding: 18, borderRadius: 18, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ color: theme.muted, fontSize: 13 }}>{title}</div><div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, color: theme.text }}>{value}</div><div style={{ marginTop: 8, color: theme.brand, fontSize: 12 }}>{trend}</div></div>;
}
function panel(theme: Record<string, string>) {
  return { padding: 20, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow } as const;
}
function primaryButton(theme: Record<string, string>) {
  return { padding: '10px 16px', borderRadius: 12, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;
}
function ChartBlock({ title, theme }: { title: string; theme: Record<string, string> }) {
  return <div style={{ padding: '16px 18px', borderRadius: 18, background: theme.surface, marginBottom: 14 }}><div style={{ fontWeight: 700, color: theme.text }}>{title}</div><div style={{ marginTop: 10, height: 96, borderRadius: 14, background: 'linear-gradient(180deg, rgba(37,99,235,0.18), rgba(37,99,235,0.04))' }} /></div>;
}
`;
}

function buildWorkflowWorkspacePageContent() {
  return `import React from 'react';

type ModuleListPageProps = {
  module: { name: string; description?: string };
  items: Array<Record<string, any>>;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
  theme: Record<string, string>;
};

export function ModuleListPage({ module, items, onOpen, onCreate, theme }: ModuleListPageProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr) 280px', gap: 20 }}>
      <section style={panel(theme)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>流程列表</div>
          <button onClick={onCreate} style={primaryButton(theme)}>新建流程</button>
        </div>
        {items.map((item) => <button key={item.id} onClick={() => onOpen(item.id)} style={{ display: 'block', width: '100%', padding: '12px 14px', marginBottom: 10, borderRadius: 14, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text, textAlign: 'left', cursor: 'pointer' }}>{item.flowName || item.name}<div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>{item.runStatus || item.status}</div></button>)}
      </section>
      <section style={panel(theme)}>
        <div style={{ fontSize: 22, fontWeight: 700, color: theme.text, marginBottom: 16 }}>{module.name}</div>
        {['提交申请', '节点审批', '规则校验', '执行完成'].map((item, index) => <Step key={item} index={index + 1} title={item} theme={theme} />)}
      </section>
      <section style={panel(theme)}>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 14 }}>执行状态</div>
        {items.slice(0, 4).map((item) => <div key={item.id} style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, marginBottom: 10, color: theme.text }}>{item.runStatus || item.status} · {item.pendingOwner || item.owner || '-'}</div>)}
      </section>
    </div>
  );
}

function panel(theme: Record<string, string>) {
  return { padding: 20, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow } as const;
}
function primaryButton(theme: Record<string, string>) {
  return { padding: '10px 16px', borderRadius: 12, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;
}
function Step({ index, title, theme }: { index: number; title: string; theme: Record<string, string> }) {
  return <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid ' + theme.border }}><div style={{ width: 30, height: 30, borderRadius: 999, background: theme.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{index}</div><div style={{ color: theme.text, fontWeight: 600 }}>{title}</div></div>;
}
`;
}

function buildAdminModuleDetailPageContent() {
  return `import React from 'react';

type ModuleDetailPageProps = {
  module: { entityName: string; detailSchema?: { sections: string[]; timeline?: string[]; relatedBlocks?: string[] } | null };
  item: Record<string, any>;
  interactions: string[];
  onEdit: () => void;
  theme: Record<string, string>;
};

export function ModuleDetailPage({ module, item, interactions, onEdit, theme }: ModuleDetailPageProps) {
  const sections = module.detailSchema?.sections || ['基础信息', '状态信息'];
  const title = item.name || module.entityName;
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ padding: 22, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: theme.text }}>{title}</div>
          <button onClick={onEdit} style={buttonStyle(theme, true)}>编辑</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          {Object.entries(item).filter(([key]) => key !== 'id').slice(0, 8).map(([key, value]) => <div key={key} style={{ padding: 18, borderRadius: 18, background: theme.surface }}><div style={{ color: theme.muted, fontSize: 13 }}>{key}</div><div style={{ marginTop: 10, color: theme.text, fontSize: 18, fontWeight: 700 }}>{String(value)}</div></div>)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Panel title="页面区块" items={sections} theme={theme} />
        <Panel title="关键交互" items={interactions} theme={theme} />
      </div>
    </div>
  );
}

function Panel({ title, items, theme }: { title: string; items: string[]; theme: Record<string, string> }) {
  return <div style={{ padding: 20, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}><div style={{ marginBottom: 16, color: theme.text, fontWeight: 700 }}>{title}</div>{items.map((item, index) => <div key={item + index} style={{ marginBottom: 12, color: theme.text }}>• {item}</div>)}</div>;
}

function buttonStyle(theme: Record<string, string>, primary: boolean) {
  return { padding: '10px 14px', borderRadius: 12, border: primary ? '1px solid ' + theme.brand : '1px solid ' + theme.border, background: primary ? theme.brand : theme.panel, color: primary ? '#fff' : theme.text, cursor: 'pointer' } as const;
}
`;
}

function buildChatDetailPageContent() {
  return `export { ModuleListPage as ModuleDetailPage } from './ModuleListPage';
`;
}

function buildKnowledgeDetailPageContent() {
  return `import React from 'react';

type ModuleDetailPageProps = {
  module: { name: string; detailSchema?: { sections?: string[]; relatedBlocks?: string[] } | null };
  item: Record<string, any> | null;
  interactions: string[];
  onEdit: () => void;
  theme: Record<string, string>;
};

export function ModuleDetailPage({ module, item, interactions, onEdit, theme }: ModuleDetailPageProps) {
  if (!item) return <div style={{ padding: 24, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, color: theme.muted }}>暂无可查看内容。</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20 }}>
      <section style={panel(theme)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: theme.text }}>{item.title || item.name || module.name}</div>
            <div style={{ marginTop: 8, color: theme.muted, fontSize: 13 }}>{item.author || '知识中心'} · {item.updatedAt || '今日更新'}</div>
          </div>
          <button onClick={onEdit} style={primaryButton(theme)}>编辑资料</button>
        </div>
        <div style={{ color: theme.text, lineHeight: 1.9 }}>{item.excerpt || item.description || '这里展示正文摘要、制度说明或知识详情内容。'}</div>
      </section>
      <section style={panel(theme)}>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 14 }}>关联资料与阅读路径</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, color: theme.text }}>{item.relatedDocs || '制度规范、FAQ、操作手册'}</div>
          {interactions.map((entry) => <div key={entry} style={{ color: theme.muted }}>• {entry}</div>)}
        </div>
      </section>
    </div>
  );
}

function panel(theme: Record<string, string>) {
  return { padding: 20, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow } as const;
}
function primaryButton(theme: Record<string, string>) {
  return { padding: '10px 16px', borderRadius: 12, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;
}
`;
}

function buildAnalyticsDetailPageContent() {
  return `import React from 'react';

type ModuleDetailPageProps = {
  module: { name: string };
  item: Record<string, any> | null;
  interactions: string[];
  onEdit: () => void;
  theme: Record<string, string>;
};

export function ModuleDetailPage({ module, item, interactions, onEdit, theme }: ModuleDetailPageProps) {
  if (!item) return <div style={{ padding: 24, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, color: theme.muted }}>暂无指标明细。</div>;
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section style={panel(theme)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: theme.text }}>{item.metricName || item.name || module.name}</div>
            <div style={{ marginTop: 8, color: theme.muted, fontSize: 13 }}>{item.dimension || '核心维度'} · {item.updatedAt || '今日更新'}</div>
          </div>
          <button onClick={onEdit} style={primaryButton(theme)}>编辑指标</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
          <Metric title="当前值" value={String(item.currentValue || '--')} theme={theme} />
          <Metric title="趋势" value={String(item.trend || '--')} theme={theme} />
          <Metric title="预警级别" value={String(item.alertLevel || item.status || '--')} theme={theme} />
        </div>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
        <div style={panel(theme)}><div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 14 }}>趋势图</div><div style={{ height: 180, borderRadius: 16, background: 'linear-gradient(180deg, rgba(37,99,235,0.18), rgba(37,99,235,0.04))' }} /></div>
        <div style={panel(theme)}><div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 14 }}>分析动作</div>{interactions.map((entry) => <div key={entry} style={{ marginBottom: 10, color: theme.text }}>• {entry}</div>)}</div>
      </section>
    </div>
  );
}

function panel(theme: Record<string, string>) {
  return { padding: 20, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow } as const;
}
function primaryButton(theme: Record<string, string>) {
  return { padding: '10px 16px', borderRadius: 12, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;
}
function Metric({ title, value, theme }: { title: string; value: string; theme: Record<string, string> }) {
  return <div style={{ padding: 16, borderRadius: 16, background: theme.surface }}><div style={{ color: theme.muted, fontSize: 13 }}>{title}</div><div style={{ marginTop: 10, color: theme.text, fontSize: 24, fontWeight: 700 }}>{value}</div></div>;
}
`;
}

function buildWorkflowDetailPageContent() {
  return `import React from 'react';

type ModuleDetailPageProps = {
  module: { name: string };
  item: Record<string, any> | null;
  interactions: string[];
  onEdit: () => void;
  theme: Record<string, string>;
};

export function ModuleDetailPage({ module, item, interactions, onEdit, theme }: ModuleDetailPageProps) {
  if (!item) return <div style={{ padding: 24, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, color: theme.muted }}>暂无流程明细。</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
      <section style={panel(theme)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: theme.text }}>{item.flowName || item.name || module.name}</div>
            <div style={{ marginTop: 8, color: theme.muted, fontSize: 13 }}>{item.runStatus || item.status || '执行中'} · {item.updatedAt || '今日更新'}</div>
          </div>
          <button onClick={onEdit} style={primaryButton(theme)}>编辑流程</button>
        </div>
        {['提交申请', '节点审批', '规则校验', '执行完成'].map((step, index) => <Step key={step} index={index + 1} title={step} detail={item.ruleSummary || '按规则自动推进'} theme={theme} />)}
      </section>
      <section style={panel(theme)}>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 14 }}>执行状态与规则</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, color: theme.text }}>当前节点：{item.nodeName || '节点审批'}</div>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, color: theme.text }}>待处理人：{item.pendingOwner || item.owner || '-'}</div>
          <div style={{ padding: '12px 14px', borderRadius: 14, background: theme.surface, color: theme.text }}>规则说明：{item.ruleSummary || '按金额分级审批'}</div>
          {interactions.map((entry) => <div key={entry} style={{ color: theme.muted }}>• {entry}</div>)}
        </div>
      </section>
    </div>
  );
}

function panel(theme: Record<string, string>) {
  return { padding: 20, borderRadius: 22, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow } as const;
}
function primaryButton(theme: Record<string, string>) {
  return { padding: '10px 16px', borderRadius: 12, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', cursor: 'pointer', fontWeight: 600 } as const;
}
function Step({ index, title, detail, theme }: { index: number; title: string; detail: string; theme: Record<string, string> }) {
  return <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid ' + theme.border }}><div style={{ width: 30, height: 30, borderRadius: 999, background: theme.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{index}</div><div><div style={{ color: theme.text, fontWeight: 700 }}>{title}</div><div style={{ marginTop: 6, color: theme.muted, fontSize: 13 }}>{detail}</div></div></div>;
}
`;
}

function buildPortalAppContent(summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
  const theme = getTheme(selection.meta.visualTemplateId);
  const projectTitle = (summary.projectName || '活动专题页').replace(/[^\S\r\n]+/g, ' ').trim().slice(0, 32);
  const pageSummary = (summary.businessGoal || '围绕品牌展示与报名转化打造专题页。').replace(/[\n\r]/g, ' ').slice(0, 120);
  return `import React, { useMemo, useState } from 'react';
import modules from '../data/modules.json';
import seed from '../data/seed.json';
import { DashboardPage } from './dashboard/DashboardPage';
import { ModuleListPage } from './modules/ModuleListPage';
import { ModuleDetailPage } from './modules/ModuleDetailPage';
import { ModuleFormPage } from './modules/ModuleFormPage';
import { loadModuleRecords, loadSelectedModule, loadSelectedRecord, saveModuleRecords, saveSelectedModule, saveSelectedRecord } from '../store/local-store';

type ModuleConfig = (typeof modules)[number];
type RecordMap = typeof seed;
type RecordItem = Record<string, any>;
type View = 'dashboard' | 'list' | 'detail' | 'form';

const moduleConfigs = modules as ModuleConfig[];
const initialSeed = seed as RecordMap;
const theme = ${JSON.stringify(theme, null, 2)};
const projectTitle = ${JSON.stringify(projectTitle)};
const pageSummary = ${JSON.stringify(pageSummary)};

export function App() {
  const defaultModuleId = moduleConfigs[0]?.id || '活动主视觉';
  const initialModuleId = loadSelectedModule(defaultModuleId);
  const [activeModuleId, setActiveModuleId] = useState(initialModuleId);
  const [view, setView] = useState<View>('dashboard');
  const [recordsByModule, setRecordsByModule] = useState<Record<string, RecordItem[]>>(() => {
    const next: Record<string, RecordItem[]> = {};
    moduleConfigs.forEach((module) => {
      next[module.id] = loadModuleRecords(module.id, initialSeed[module.id] || []);
    });
    return next;
  });
  const [selectedId, setSelectedId] = useState<number | null>(() => loadSelectedRecord(initialModuleId));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [keyword, setKeyword] = useState('');

  const activeModule = moduleConfigs.find((item) => item.id === activeModuleId) || moduleConfigs[0];
  const records = activeModule ? recordsByModule[activeModule.id] || [] : [];
  const filteredRecords = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return records;
    return records.filter((item) => Object.values(item).some((value) => String(value ?? '').toLowerCase().includes(text)));
  }, [records, keyword]);
  const selectedRecord = records.find((item) => item.id === selectedId) || filteredRecords[0] || records[0] || null;

  const heroRecord = recordsByModule['活动主视觉']?.[0] || null;
  const highlightRecords = recordsByModule['大会亮点'] || [];
  const agendaRecords = recordsByModule['议程安排'] || [];
  const speakerRecords = recordsByModule['嘉宾阵容'] || [];
  const registrationRecord = recordsByModule['报名入口']?.[0] || null;

  const persistModuleRecords = (moduleId: string, nextRecords: RecordItem[]) => {
    saveModuleRecords(moduleId, nextRecords);
    setRecordsByModule((prev) => ({ ...prev, [moduleId]: nextRecords }));
  };

  const persistSelected = (moduleId: string, recordId: number | null) => {
    setSelectedId(recordId);
    saveSelectedRecord(moduleId, recordId);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setView('form');
  };

  const openEditForm = (recordId: number | null) => {
    setEditingId(recordId);
    setView('form');
  };

  const switchModule = (moduleId: string, nextView: View = 'list') => {
    setActiveModuleId(moduleId);
    saveSelectedModule(moduleId);
    setView(nextView);
    const nextRecords = recordsByModule[moduleId] || [];
    persistSelected(moduleId, nextRecords[0]?.id ?? null);
    setKeyword('');
    setEditingId(null);
  };

  const saveRecord = (draft: Record<string, any>) => {
    if (!activeModule) return;
    const nextRecords = [...(recordsByModule[activeModule.id] || [])];
    if (draft.id) {
      const index = nextRecords.findIndex((item) => item.id === draft.id);
      if (index >= 0) nextRecords[index] = { ...nextRecords[index], ...draft, updatedAt: createTimestamp() };
    } else {
      const nextId = Date.now();
      nextRecords.unshift({ ...draft, id: nextId, updatedAt: createTimestamp() });
    }
    persistModuleRecords(activeModule.id, nextRecords);
    const savedId = draft.id || nextRecords[0]?.id || null;
    persistSelected(activeModule.id, savedId);
    setEditingId(null);
    setView('detail');
  };

  const removeRecord = (id: number) => {
    if (!activeModule) return;
    const nextRecords = (recordsByModule[activeModule.id] || []).filter((item) => item.id !== id);
    persistModuleRecords(activeModule.id, nextRecords);
    persistSelected(activeModule.id, nextRecords[0]?.id ?? null);
    setEditingId(null);
    setView('list');
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.background, color: theme.text, fontFamily: 'Inter, Arial, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid ' + theme.border }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: theme.brandStrong, fontWeight: 800, letterSpacing: '0.08em' }}>CAMPAIGN LANDING</div>
            <div style={{ marginTop: 6, fontSize: 24, lineHeight: 1.3, fontWeight: 800 }}>{projectTitle}</div>
          </div>
          <nav style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {moduleConfigs.map((module) => {
              const active = module.id === activeModuleId && view !== 'dashboard';
              return <button key={module.id} onClick={() => switchModule(module.id)} style={topNavButton(active)}>{module.navLabel || module.name}</button>;
            })}
            <button onClick={() => setView('dashboard')} style={heroPrimaryButton()}>返回首页概览</button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 28 }}>
        {view === 'dashboard' && (
          <DashboardPage
            theme={theme}
            hero={heroRecord}
            highlights={highlightRecords}
            agenda={agendaRecords}
            speakers={speakerRecords}
            registrationConfig={registrationRecord}
            onOpenModule={(moduleId) => switchModule(moduleId)}
          />
        )}

        {view !== 'dashboard' && activeModule && (
          <div style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: theme.text }}>{activeModule.name}</div>
              <div style={{ marginTop: 8, color: theme.muted, fontSize: 14, lineHeight: 1.8 }}>{activeModule.description || pageSummary}</div>
            </div>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={
                activeModule.id === '议程安排' ? '搜索场次、嘉宾、时间或会场' :
                activeModule.id === '嘉宾阵容' ? '搜索嘉宾、机构或主题' :
                activeModule.id === '报名入口' ? '搜索表单状态或权益说明' :
                '搜索标题、摘要或标签'
              }
              style={{ minWidth: 260, padding: '13px 15px', borderRadius: 14, border: '1px solid ' + theme.border, background: theme.panel, color: theme.text, outline: 'none' }}
            />
            <button onClick={openCreateForm} style={heroPrimaryButton()}>{activeModule.primaryActionText || ('新增' + activeModule.entityName)}</button>
          </div>
        )}

        {view === 'list' && activeModule && <ModuleListPage module={activeModule} items={filteredRecords} onOpen={(id) => { persistSelected(activeModule.id, id); setView('detail'); }} onDelete={removeRecord} onCreate={openCreateForm} theme={theme} />}
        {view === 'detail' && activeModule && selectedRecord && <ModuleDetailPage module={activeModule} item={selectedRecord} onEdit={() => openEditForm(selectedRecord.id)} theme={theme} />}
        {view === 'form' && activeModule && <ModuleFormPage module={activeModule} item={editingId ? records.find((record) => record.id === editingId) || null : null} onSave={saveRecord} onCancel={() => { setEditingId(null); setView(selectedRecord ? 'detail' : 'list'); }} theme={theme} />}
      </main>
    </div>
  );

  function topNavButton(active: boolean) {
    return {
      padding: '8px 0',
      border: 'none',
      background: 'transparent',
      color: active ? theme.brandStrong : theme.text,
      borderBottom: '2px solid ' + (active ? theme.brand : 'transparent'),
      cursor: 'pointer',
      fontWeight: active ? 800 : 600,
    } as const;
  }

  function heroPrimaryButton() {
    return {
      padding: '12px 18px',
      borderRadius: 999,
      border: '1px solid ' + theme.brand,
      background: theme.brand,
      color: '#fff',
      cursor: 'pointer',
      fontWeight: 700,
    } as const;
  }
}

function createTimestamp() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + mi;
}
`;
}

function buildPortalDashboardPageContent() {
  return `import React from 'react';

type HeroRecord = Record<string, any>;
type HighlightRecord = Record<string, any>[];
type AgendaRecord = Record<string, any>[];
type SpeakerRecord = Record<string, any>[];
type RegistrationRecord = Record<string, any>;

type DashboardPageProps = {
  theme: Record<string, string>;
  hero: HeroRecord | null;
  highlights: HighlightRecord;
  agenda: AgendaRecord;
  speakers: SpeakerRecord;
  registrationConfig: RegistrationRecord | null;
  onOpenModule: (moduleId: string) => void;
};

export function DashboardPage({ theme, hero, highlights, agenda, speakers, registrationConfig, onOpenModule }: DashboardPageProps) {
  const stats = [
    { label: '预计参会人数', value: '3,000+', note: '院长层与医院管理者为核心' },
    { label: '覆盖城市', value: '40+', note: '重点城市医院管理圈层覆盖' },
    { label: '核心嘉宾', value: '50+', note: '头部医院与产业领军人物同台' },
    { label: '合作机构', value: '120+', note: '赞助商、生态伙伴与研究机构参与' },
  ];

  const trend = [
    { year: '2023', value: 1680, growth: '+18%' },
    { year: '2024', value: 2140, growth: '+27%' },
    { year: '2025', value: 2450, growth: '+14%' },
    { year: '2026', value: 3000, growth: '+22%' },
  ];

  const topicShares = [
    { label: '智慧医院', value: 32 },
    { label: '医疗 AI', value: 26 },
    { label: '数据治理', value: 18 },
    { label: '运营管理', value: 14 },
    { label: '产业合作', value: 10 },
  ];

  const orgCoverage = [
    { label: '三甲医院', value: 38 },
    { label: '区域医疗集团', value: 24 },
    { label: '医疗科技企业', value: 31 },
    { label: '研究机构', value: 17 },
  ];

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section style={{ ...panel(theme), padding: 0, overflow: 'hidden', background: 'linear-gradient(135deg, #0b1f3a 0%, #123d7a 55%, #0e7490 100%)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 0 }}>
          <div style={{ padding: 36, color: '#fff' }}>
            <div style={eyebrow()}>2026 ANNUAL SUMMIT</div>
            <h1 style={{ margin: '18px 0 12px', fontSize: 42, lineHeight: 1.2 }}>2026 年度医疗科技峰会</h1>
            <p style={{ margin: 0, maxWidth: 760, fontSize: 18, lineHeight: 1.8, color: 'rgba(255,255,255,0.88)' }}>{hero?.['副标题'] || '聚焦智慧医院、AI 医疗与数字化管理升级的高规格行业盛会。'}</p>
            <p style={{ margin: '16px 0 0', maxWidth: 760, fontSize: 15, lineHeight: 1.9, color: 'rgba(255,255,255,0.72)' }}>{hero?.['权威说明'] || '面向医院管理者、院长层与行业决策者，汇聚顶级医院、医疗科技企业、政策研究机构与产业合作伙伴。'}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 22 }}>{['国家级行业论坛', '头部医院参与', '医疗科技前沿议题'].map((tag) => <span key={tag} style={tagStyle()}>{tag}</span>)}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}><button style={heroPrimaryButton()} onClick={() => onOpenModule('报名入口')}>{hero?.['主行动'] || '立即报名参会'}</button><button style={heroSecondaryButton()} onClick={() => onOpenModule('议程安排')}>{hero?.['次行动'] || '查看大会议程'}</button></div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 26, color: 'rgba(255,255,255,0.78)', fontSize: 14 }}><span>{hero?.['会议信息'] || '2026.09.18 · 上海国际会议中心'}</span><span>报名通道已开启</span></div>
          </div>
          <div style={{ padding: 28, background: 'rgba(5, 16, 32, 0.22)', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>{stats.map((item) => <div key={item.label} style={{ borderRadius: 22, padding: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)' }}><div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>{item.label}</div><div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: '#fff' }}>{item.value}</div><div style={{ marginTop: 10, lineHeight: 1.7, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{item.note}</div></div>)}</div>
          </div>
        </div>
      </section>

      <section style={{ ...panel(theme), padding: 28 }}>
        <SectionHeader eyebrowText='峰会亮点' title='六个核心卖点，直接服务报名转化' description='内容节奏聚焦价值说明、权威证明与高层决策价值，不做后台式信息堆砌。' actionText='管理亮点卡片' onAction={() => onOpenModule('大会亮点')} theme={theme} />
        <div style={responsiveGrid(3)}>{highlights.slice(0, 6).map((item) => <div key={item.id} style={{ ...surfaceCard(theme), minHeight: 208 }}><div style={{ fontSize: 13, color: theme.brand, fontWeight: 700 }}>{item['价值标签']}</div><div style={{ marginTop: 12, fontSize: 22, lineHeight: 1.4, fontWeight: 700, color: theme.text }}>{item['亮点标题']}</div><div style={{ marginTop: 12, color: theme.muted, lineHeight: 1.8 }}>{item['亮点说明']}</div><div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}><span style={chip(theme)}>{item['适配人群']}</span><span style={chip(theme)}>{item['图标关键词']}</span></div></div>)}</div>
      </section>

      <section style={{ ...panel(theme), padding: 28 }}>
        <SectionHeader eyebrowText='影响力数据' title='峰会影响力持续提升' description='用可视化样式呈现规模、热点方向与席位热度，强化峰会可信度。' actionText='管理报名配置' onAction={() => onOpenModule('报名入口')} theme={theme} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <div style={surfaceCard(theme)}><div style={cardTitle(theme)}>历届参会人数与增长趋势</div><div style={{ display: 'grid', gap: 14 }}>{trend.map((item) => <div key={item.year}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><span style={{ color: theme.text, fontWeight: 600 }}>{item.year}</span><span style={{ color: theme.brandStrong, fontWeight: 700 }}>{item.value.toLocaleString()} · {item.growth}</span></div><div style={{ height: 10, borderRadius: 999, background: '#e3edf8', overflow: 'hidden' }}><div style={{ width: String(Math.min(item.value / 32, 100)) + '%', height: '100%', background: 'linear-gradient(90deg, #2563eb, #0ea5e9)' }} /></div></div>)}</div></div>
          <div style={surfaceCard(theme)}><div style={cardTitle(theme)}>议程主题占比与热点方向</div><div style={{ display: 'grid', gap: 14 }}>{topicShares.map((item) => <div key={item.label}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><span style={{ color: theme.text, fontWeight: 600 }}>{item.label}</span><span style={{ color: theme.muted }}>{item.value}%</span></div><div style={{ height: 10, borderRadius: 999, background: '#e9f0f7', overflow: 'hidden' }}><div style={{ width: String(item.value) + '%', height: '100%', background: 'linear-gradient(90deg, #0f766e, #22c55e)' }} /></div></div>)}</div></div>
          <div style={surfaceCard(theme)}><div style={cardTitle(theme)}>嘉宾机构覆盖与行业分布</div><div style={{ display: 'grid', gap: 14 }}>{orgCoverage.map((item) => <div key={item.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(88px, 140px) minmax(0, 1fr) 52px', alignItems: 'center', gap: 12 }}><div style={{ color: theme.text, fontWeight: 600 }}>{item.label}</div><div style={{ height: 10, borderRadius: 999, background: '#eef4fb', overflow: 'hidden' }}><div style={{ width: String(item.value * 2.2) + '%', height: '100%', background: 'linear-gradient(90deg, #1d4ed8, #38bdf8)' }} /></div><div style={{ color: theme.muted, textAlign: 'right' }}>{item.value}</div></div>)}</div></div>
          <div style={surfaceCard(theme)}><div style={cardTitle(theme)}>报名热度与席位进度</div><div style={{ display: 'grid', gap: 18 }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}><MetricCard label='总席位' value='500' theme={theme} /><MetricCard label='已报名' value='314' theme={theme} /><MetricCard label='剩余席位' value='186' theme={theme} /></div><div><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}><span style={{ color: theme.text, fontWeight: 600 }}>席位进度</span><span style={{ color: '#c2410c', fontWeight: 700 }}>{registrationConfig?.['表单状态'] || '报名升温'}</span></div><div style={{ height: 12, borderRadius: 999, background: '#ffedd5', overflow: 'hidden' }}><div style={{ width: '62.8%', height: '100%', background: 'linear-gradient(90deg, #f97316, #f59e0b)' }} /></div></div></div></div>
        </div>
      </section>

      <section style={{ ...panel(theme), padding: 28 }}>
        <SectionHeader eyebrowText='全天总议程' title='从战略趋势到落地实践，一页看清峰会关键内容安排' description='按时间顺序展示关键环节，强化高价值议题与院长层关注点。' actionText='管理议程场次' onAction={() => onOpenModule('议程安排')} theme={theme} />
        <div style={{ display: 'grid', gap: 16 }}>{agenda.slice(0, 6).map((item) => <div key={item.id} style={{ ...surfaceCard(theme), padding: 20 }}><div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 160px) minmax(0, 1fr) minmax(160px, 180px)', gap: 16, alignItems: 'start' }}><div><div style={{ color: theme.brandStrong, fontSize: 15, fontWeight: 800 }}>{item['时间段']}</div><div style={{ marginTop: 10 }}><span style={chip(theme)}>{item['环节类型']}</span></div></div><div><div style={{ fontSize: 20, lineHeight: 1.45, fontWeight: 700, color: theme.text }}>{item['环节标题']}</div><div style={{ marginTop: 10, color: theme.muted, lineHeight: 1.8 }}>{item['内容摘要']}</div><div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}><span style={chip(theme)}>{item['主持嘉宾']}</span><span style={chip(theme)}>{item['适合人群']}</span></div></div><div style={{ display: 'grid', gap: 10 }}><div style={{ color: theme.text, fontWeight: 700 }}>{item['会场']}</div><div style={{ color: theme.muted }}>{item['关注标签']}</div><button style={ghostButton(theme)} onClick={() => onOpenModule('议程安排')}>查看议程详情</button></div></div></div>)}</div>
      </section>

      <section style={{ ...panel(theme), padding: 28 }}>
        <SectionHeader eyebrowText='核心嘉宾' title='头部嘉宾阵容，建立峰会权威感' description='控制展示数量，突出主讲主题、机构属性与专业标签。' actionText='管理嘉宾阵容' onAction={() => onOpenModule('嘉宾阵容')} theme={theme} />
        <div style={responsiveGrid(4)}>{speakers.slice(0, 4).map((item) => <div key={item.id} style={{ ...surfaceCard(theme), minHeight: 260 }}><div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', display: 'grid', placeItems: 'center', color: theme.brandStrong, fontWeight: 800, fontSize: 22 }}>{String(item['嘉宾姓名']).slice(0, 1)}</div><div style={{ marginTop: 16, fontSize: 22, fontWeight: 700, color: theme.text }}>{item['嘉宾姓名']}</div><div style={{ marginTop: 8, color: theme.text, fontWeight: 600 }}>{item['职务']}</div><div style={{ marginTop: 6, color: theme.muted }}>{item['所属机构']}</div><div style={{ marginTop: 14, color: theme.text, lineHeight: 1.7 }}>{item['主讲主题']}</div><div style={{ marginTop: 14 }}><span style={chip(theme)}>{item['专业标签']}</span></div></div>)}</div>
      </section>
    </div>
  );
}

function SectionHeader({ eyebrowText, title, description, actionText, onAction, theme }: { eyebrowText: string; title: string; description: string; actionText: string; onAction: () => void; theme: Record<string, string> }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', marginBottom: 24, flexWrap: 'wrap' }}><div style={{ maxWidth: 760 }}><div style={eyebrow(theme.brand)}>{eyebrowText}</div><div style={{ marginTop: 10, fontSize: 30, lineHeight: 1.3, fontWeight: 800, color: theme.text }}>{title}</div><div style={{ marginTop: 10, color: theme.muted, lineHeight: 1.8 }}>{description}</div></div><button style={ghostButton(theme)} onClick={onAction}>{actionText}</button></div>;
}
function panel(theme: Record<string, string>) { return { borderRadius: 24, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow } as const; }
function surfaceCard(theme: Record<string, string>) { return { padding: 20, borderRadius: 20, background: theme.surface, border: '1px solid ' + theme.border } as const; }
function MetricCard({ label, value, theme }: { label: string; value: string; theme: Record<string, string> }) { return <div style={{ padding: 18, borderRadius: 18, background: theme.panel, border: '1px solid ' + theme.border }}><div style={{ color: theme.muted, fontSize: 13 }}>{label}</div><div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: theme.text }}>{value}</div></div>; }
function cardTitle(theme: Record<string, string>) { return { marginBottom: 16, fontSize: 18, fontWeight: 800, color: theme.text } as const; }
function responsiveGrid(columns: number) { return { display: 'grid', gridTemplateColumns: \`repeat(\${columns}, minmax(0, 1fr))\`, gap: 20 } as const; }
function chip(theme: Record<string, string>) { return { display: 'inline-flex', padding: '7px 12px', borderRadius: 999, background: theme.softBlue, color: theme.brandStrong, fontWeight: 700, fontSize: 12 } as const; }
function heroPrimaryButton() { return { padding: '12px 18px', borderRadius: 999, border: 'none', background: '#fff', color: '#163f9d', fontWeight: 700, cursor: 'pointer' } as const; }
function heroSecondaryButton() { return { padding: '12px 18px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' } as const; }
function ghostButton(theme: Record<string, string>) { return { padding: '10px 16px', borderRadius: 999, border: '1px solid ' + theme.border, background: theme.panel, color: theme.text, fontWeight: 700, cursor: 'pointer' } as const; }
function tagStyle() { return { display: 'inline-flex', padding: '8px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)', color: '#fff', fontSize: 12, fontWeight: 700 } as const; }
function eyebrow(color = '#fff') { return { fontSize: 12, color, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' as const } as const; }
`;
}

function buildPortalWorkspacePageContent() {
  return `import React from 'react';

type ModuleConfig = { name: string; description?: string; emptyText?: string; primaryActionText?: string; listSchema?: { title?: string; columns?: string[]; rowActionText?: string; deleteActionText?: string } | null };
type ModuleListPageProps = { module: ModuleConfig; items: Array<Record<string, any>>; onOpen: (id: number) => void; onDelete: (id: number) => void; onCreate: () => void; theme: Record<string, string> };

export function ModuleListPage({ module, items, onOpen, onDelete, onCreate, theme }: ModuleListPageProps) {
  const columns = module.listSchema?.columns || [];
  const previewColumns = columns.slice(0, 3);
  return <div style={{ display: 'grid', gap: 20 }}><section style={{ ...panel(theme), padding: 24 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'end', flexWrap: 'wrap', marginBottom: 20 }}><div><div style={{ fontSize: 12, color: theme.brandStrong, fontWeight: 800, letterSpacing: '0.08em' }}>{module.name}</div><div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: theme.text }}>{module.listSchema?.title || (module.name + '列表')}</div><div style={{ marginTop: 8, color: theme.muted, lineHeight: 1.8 }}>{module.description}</div></div><button onClick={onCreate} style={primaryButton(theme)}>{module.primaryActionText || '新增记录'}</button></div>{items.length > 0 ? <><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>{items.slice(0, Math.min(3, items.length)).map((item) => <div key={item.id} style={{ ...surfaceCard(theme), minHeight: 186 }}><div style={{ color: theme.brand, fontSize: 12, fontWeight: 800 }}>{columns[0] || '业务字段'}</div><div style={{ marginTop: 10, color: theme.text, fontSize: 22, lineHeight: 1.4, fontWeight: 800 }}>{String(item[columns[0]] || item.title || item.name || '未命名')}</div><div style={{ marginTop: 14, display: 'grid', gap: 10 }}>{previewColumns.slice(1).map((column) => <div key={column} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: theme.muted }}>{column}</span><span style={{ color: theme.text, fontWeight: 600, textAlign: 'right' }}>{formatValue(item[column])}</span></div>)}</div></div>)}</div><div style={{ overflowX: 'auto', borderRadius: 20, border: '1px solid ' + theme.border }}><table style={{ width: '100%', minWidth: Math.max(columns.length * 180, 760), borderCollapse: 'collapse', background: theme.panel }}><thead><tr style={{ background: theme.tableHead }}>{columns.map((column) => <th key={column} style={thStyle(theme)}>{column}</th>)}<th style={thStyle(theme)}>操作</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id} style={{ borderTop: index === 0 ? 'none' : '1px solid ' + theme.border }}>{columns.map((column) => <td key={column} style={tdStyle(theme)}>{formatValue(item[column])}</td>)}<td style={tdStyle(theme)}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button onClick={() => onOpen(item.id)} style={secondaryButton(theme)}>{module.listSchema?.rowActionText || '查看详情'}</button><button onClick={() => onDelete(item.id)} style={dangerButton(theme)}>{module.listSchema?.deleteActionText || '删除'}</button></div></td></tr>)}</tbody></table></div></> : <div style={{ ...surfaceCard(theme), textAlign: 'center', color: theme.muted, lineHeight: 1.8 }}><div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 8 }}>暂无内容</div><div>{module.emptyText || '当前模块还没有数据。'}</div></div>}</section></div>;
}
function panel(theme: Record<string, string>) { return { borderRadius: 24, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow } as const; }
function surfaceCard(theme: Record<string, string>) { return { padding: 20, borderRadius: 20, background: theme.surface, border: '1px solid ' + theme.border } as const; }
function thStyle(theme: Record<string, string>) { return { padding: '14px 16px', textAlign: 'left' as const, color: theme.text, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' as const } as const; }
function tdStyle(theme: Record<string, string>) { return { padding: '14px 16px', color: theme.text, verticalAlign: 'top' as const, lineHeight: 1.7, minWidth: 120 } as const; }
function primaryButton(theme: Record<string, string>) { return { padding: '11px 16px', borderRadius: 999, border: '1px solid ' + theme.brand, background: theme.brand, color: '#fff', fontWeight: 700, cursor: 'pointer' } as const; }
function secondaryButton(theme: Record<string, string>) { return { padding: '8px 12px', borderRadius: 999, border: '1px solid ' + theme.border, background: theme.panel, color: theme.text, cursor: 'pointer', fontWeight: 600 } as const; }
function dangerButton(theme: Record<string, string>) { return { padding: '8px 12px', borderRadius: 999, border: '1px solid ' + theme.alertSoft, background: theme.alertSoft, color: theme.alert, cursor: 'pointer', fontWeight: 600 } as const; }
function formatValue(value: unknown) { if (value === null || value === undefined || value === '') return '—'; return String(value); }
`;
}

function buildPortalDetailPageContent() {
  return buildKnowledgeDetailPageContent().replace('关联资料与阅读路径', '专题补充与转化路径').replace('编辑资料', '编辑区块');
}

function buildPortalFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存专题区块', createLabelPrefix: '新增', editLabelPrefix: '编辑' });
}

function buildSchedulingAppContent(summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
  return buildWorkflowAppContent(summary, selection).replace('WORKFLOW BOARD', 'SCHEDULING BOARD').replace('突出流程列表、节点状态、执行轨迹与规则说明。', '突出预约时间、资源排班、调度状态与提醒。').replace('流程总览', '排班总览').replace('新建流程', '新建预约');
}

function buildDeliveryAppContent(summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
  return buildAdminAppContent(summary, selection).replace('查看看板、模块与关键交互', '查看项目、里程碑、交付任务与协同状态').replace('业务总览', '交付总览');
}

function buildLearningDashboardPageContent() {
  return buildKnowledgeDashboardPageContent().replace('推荐内容', '课程与考试').replace('热门制度', '学习课程').replace('最近更新', '待考场次').replace('高频检索', '学习进度').replace('关联资料', '成绩反馈');
}

function buildCommerceDashboardPageContent() {
  return buildAdminDashboardPageContent().replace('业务总览', '商品与订单总览').replace('图表主题', '交易主题').replace('关键交互', '交易动作');
}

function buildSchedulingDashboardPageContent() {
  return buildWorkflowDashboardPageContent().replace('流程节点区', '预约与排班').replace('规则与告警', '时间状态与提醒').replace('执行中流程', '今日预约').replace('待处理节点', '待确认排班');
}

function buildDeliveryDashboardPageContent() {
  return buildAdminDashboardPageContent().replace('业务总览', '项目交付总览').replace('关键交互', '交付动作').replace('图表主题', '里程碑主题');
}

function buildLearningWorkspacePageContent() {
  return buildKnowledgeWorkspacePageContent().replace('分类目录', '学习目录').replace('新增资料', '新增课程').replace('关联资料', '学习结果');
}

function buildCommerceWorkspacePageContent() {
  return buildAdminModuleListPageContent().replace('未找到匹配记录，请调整搜索条件或新增数据。', '未找到匹配商品或订单，请调整筛选条件。');
}

function buildSchedulingWorkspacePageContent() {
  return buildWorkflowWorkspacePageContent().replace('流程列表', '预约/班次列表').replace('新建流程', '新建预约').replace('执行状态', '时间状态');
}

function buildDeliveryWorkspacePageContent() {
  return buildAdminModuleListPageContent().replace('搜索', '搜索项目/里程碑/任务').replace('未找到匹配记录，请调整搜索条件或新增数据。', '未找到匹配项目或交付任务，请调整搜索条件。');
}

function buildLearningDetailPageContent() {
  return buildKnowledgeDetailPageContent().replace('关联资料与阅读路径', '学习路径与结果反馈').replace('编辑资料', '编辑课程');
}

function buildCommerceDetailPageContent() {
  return buildAdminModuleDetailPageContent();
}

function buildSchedulingDetailPageContent() {
  return buildWorkflowDetailPageContent().replace('执行状态与规则', '预约状态与提醒').replace('编辑流程', '编辑排班');
}

function buildDeliveryDetailPageContent() {
  return buildAdminModuleDetailPageContent();
}

function buildLearningFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存课程/考试', createLabelPrefix: '新增', editLabelPrefix: '编辑' });
}
function buildCommerceFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存商品/订单', createLabelPrefix: '新增', editLabelPrefix: '编辑' });
}
function buildSchedulingFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存预约/排班', createLabelPrefix: '新增', editLabelPrefix: '编辑' });
}
function buildDeliveryFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存交付任务', createLabelPrefix: '新增', editLabelPrefix: '编辑' });
}

function buildAdminModuleFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存并返回', createLabelPrefix: '新增', editLabelPrefix: '编辑' });
}
function buildChatFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存会话配置', createLabelPrefix: '新建', editLabelPrefix: '编辑' });
}
function buildKnowledgeFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存资料', createLabelPrefix: '新增', editLabelPrefix: '编辑' });
}
function buildAnalyticsFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存指标', createLabelPrefix: '新增', editLabelPrefix: '编辑' });
}
function buildWorkflowFormPageContent() {
  return buildBaseFormContent({ saveLabel: '保存流程', createLabelPrefix: '新建', editLabelPrefix: '编辑' });
}

function buildBaseFormContent(options: { saveLabel: string; createLabelPrefix: string; editLabelPrefix: string }) {
  return `import React, { useMemo, useState } from 'react';

type FieldSchema = { key: string; label: string; type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'status'; required: boolean; options?: string[]; placeholder?: string; group?: string };
type ModuleFormPageProps = {
  module: { entityName: string; formSchema?: { fields: FieldSchema[] } | null };
  item: Record<string, any> | null;
  onSave: (draft: Record<string, any>) => void;
  onCancel: () => void;
  theme: Record<string, string>;
};

export function ModuleFormPage({ module, item, onSave, onCancel, theme }: ModuleFormPageProps) {
  const fields = module.formSchema?.fields || [];
  const initialState = useMemo(() => {
    const next: Record<string, any> = { id: item?.id };
    fields.forEach((field) => {
      next[field.key] = item?.[field.key] ?? (field.type === 'select' || field.type === 'status' ? (field.options?.[0] || '') : '');
    });
    return next;
  }, [item, fields]);

  const [form, setForm] = useState(initialState);

  return (
    <div style={{ padding: 22, borderRadius: 20, background: theme.panel, border: '1px solid ' + theme.border, boxShadow: theme.shadow }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: theme.text, marginBottom: 8 }}>{item ? ${JSON.stringify(options.editLabelPrefix)} + module.entityName : ${JSON.stringify(options.createLabelPrefix)} + module.entityName}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        {fields.map((field) => <FieldRenderer key={field.key} field={field} value={form[field.key]} onChange={(value) => setForm({ ...form, [field.key]: value })} theme={theme} />)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
        <button onClick={onCancel} style={buttonStyle(theme, false)}>取消</button>
        <button onClick={() => onSave(form)} style={buttonStyle(theme, true)}>${JSON.stringify(options.saveLabel)}</button>
      </div>
    </div>
  );
}

function FieldRenderer({ field, value, onChange, theme }: { field: FieldSchema; value: any; onChange: (value: any) => void; theme: Record<string, string> }) {
  if (field.type === 'textarea') return <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle(theme)}>{field.label}</label><textarea value={value || ''} onChange={(event) => onChange(event.target.value)} rows={4} placeholder={field.placeholder || ''} style={textareaStyle(theme)} /></div>;
  if (field.type === 'select' || field.type === 'status') return <div><label style={labelStyle(theme)}>{field.label}</label><select value={value || ''} onChange={(event) => onChange(event.target.value)} style={inputStyle(theme)}>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
  return <div><label style={labelStyle(theme)}>{field.label}</label><input value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || ''} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} style={inputStyle(theme)} /></div>;
}

function labelStyle(theme: Record<string, string>) {
  return { display: 'block', marginBottom: 8, color: theme.muted, fontSize: 13 } as const;
}
function inputStyle(theme: Record<string, string>) {
  return { width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text } as const;
}
function textareaStyle(theme: Record<string, string>) {
  return { width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid ' + theme.border, background: theme.surface, color: theme.text, resize: 'vertical' as const };
}
function buttonStyle(theme: Record<string, string>, primary: boolean) {
  return { padding: '10px 16px', borderRadius: 12, border: primary ? '1px solid ' + theme.brand : '1px solid ' + theme.border, background: primary ? theme.brand : theme.panel, color: primary ? '#fff' : theme.text, cursor: 'pointer', fontWeight: 600 } as const;
}
`;
}
function buildStoreContent() {
  return `export function saveModuleRecords(moduleId, payload) {
  localStorage.setItem('demo-factory:' + moduleId, JSON.stringify(payload));
}

export function loadModuleRecords(moduleId, fallback) {
  const raw = localStorage.getItem('demo-factory:' + moduleId);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function saveSelectedModule(moduleId) {
  localStorage.setItem('demo-factory:selected-module', moduleId);
}

export function loadSelectedModule(fallback) {
  return localStorage.getItem('demo-factory:selected-module') || fallback;
}

export function saveSelectedRecord(moduleId, recordId) {
  localStorage.setItem('demo-factory:selected-record:' + moduleId, String(recordId ?? ''));
}

export function loadSelectedRecord(moduleId) {
  const raw = localStorage.getItem('demo-factory:selected-record:' + moduleId);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
`;
}

function buildMockContent() {
  return `export async function simulateList(items) {
  await delay(180);
  return items;
}

export async function simulateSave(items, nextItem) {
  await delay(180);
  return [nextItem, ...items];
}

export async function simulateDelete(items, id) {
  await delay(140);
  return items.filter((item) => item.id !== id);
}

function delay(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}
`;
}

export const DemoScaffoldService = {
  async create(projectId: string, summary: DemoClarificationSummary, selection: DemoTemplateResolvedSelection) {
    const projectDir = path.join(process.cwd(), 'data', 'projects', projectId, 'generated');
    const srcDir = path.join(projectDir, 'src');
    const modulePlans = createModulePlans(summary);
    const moduleConfig = buildModuleConfig(summary);
    const category = selection.meta.categoryTemplateId;
    const seedData = createSeedData(summary, modulePlans, category);

    try {
      fs.rmSync(projectDir, { recursive: true, force: true });
    } catch {
    }

    fs.mkdirSync(path.join(srcDir, 'pages', 'dashboard'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'pages', 'modules'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'modules'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'mock'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'store'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'components'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'data'), { recursive: true });

    fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
      name: `demo-${projectId}`,
      private: true,
      version: '1.0.0',
      scripts: { dev: 'vite --host 0.0.0.0', build: 'vite build', preview: 'vite preview --host 0.0.0.0' },
      dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
      devDependencies: { vite: '^5.4.0', typescript: '^5.6.0', '@types/react': '^18.2.0', '@types/react-dom': '^18.2.0', '@vitejs/plugin-react': '^4.3.1' }
    }, null, 2), 'utf-8');

    fs.writeFileSync(path.join(projectDir, 'index.html'), '<!doctype html><html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Demo Factory</title><script type="module" src="/src/main.tsx"></script></head><body><div id="root"></div></body></html>', 'utf-8');
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2020', lib: ['ES2020', 'DOM'], jsx: 'react-jsx', module: 'ESNext', moduleResolution: 'Bundler', strict: false, resolveJsonModule: true, allowSyntheticDefaultImports: true }, include: ['src'] }, null, 2), 'utf-8');
    fs.writeFileSync(path.join(projectDir, 'vite.config.ts'), "import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n", 'utf-8');

    fs.writeFileSync(path.join(srcDir, 'main.tsx'), "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport { App } from './pages/App';\nReactDOM.createRoot(document.getElementById('root')!).render(<App />);\n", 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'pages', 'App.tsx'), buildAppContent(summary, selection), 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'pages', 'dashboard', 'DashboardPage.tsx'), buildDashboardContent(category), 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'pages', 'modules', 'ModuleListPage.tsx'), buildListContent(category), 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'pages', 'modules', 'ModuleDetailPage.tsx'), buildDetailContent(category), 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'pages', 'modules', 'ModuleFormPage.tsx'), buildFormContent(category), 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'store', 'local-store.ts'), buildStoreContent(), 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'mock', 'api.ts'), buildMockContent(), 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'lib', 'format.ts'), "export function formatText(value: string) { return value || '-'; }\n", 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'components', 'README.ts'), "export const demoComponentHint = 'demo business components';\n", 'utf-8');
    fs.writeFileSync(path.join(srcDir, 'modules', 'README.ts'), "export const demoModulesHint = 'dynamic module containers';\n", 'utf-8');

    writeJson(path.join(srcDir, 'data', 'modules.json'), moduleConfig);
    writeJson(path.join(srcDir, 'data', 'seed.json'), seedData);
    writeJson(path.join(srcDir, 'data', 'summary.json'), summary);
    moduleConfig.forEach((module) => {
      writeJson(path.join(srcDir, 'modules', `${module.id}.json`), { module, records: seedData[module.id] || [] });
    });

    return {
      projectDir,
      files: [
        'package.json', 'index.html', 'tsconfig.json', 'vite.config.ts', 'src/main.tsx', 'src/pages/App.tsx',
        'src/pages/dashboard/DashboardPage.tsx', 'src/pages/modules/ModuleListPage.tsx', 'src/pages/modules/ModuleDetailPage.tsx', 'src/pages/modules/ModuleFormPage.tsx',
        ...moduleConfig.map((module) => `src/modules/${module.id}.json`),
        'src/store/local-store.ts', 'src/mock/api.ts', 'src/lib/format.ts', 'src/components/README.ts', 'src/modules/README.ts', 'src/data/modules.json', 'src/data/seed.json', 'src/data/summary.json',
      ],
    };
  },
};
