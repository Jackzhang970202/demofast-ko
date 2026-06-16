'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ChevronDown, Loader2, LogOut, Plus, Send, Settings2, Sparkles, Trash2, Users, Wand2 } from 'lucide-react';
import { getAuthHeaders, getJsonAuthHeaders } from '@/lib/auth-client';
import type { UserSkill } from '@/types/skill';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

interface Project {
  id: string;
  name: string;
  description: string;
  phase: string;
  phaseLabel: string;
  updatedAt?: string;
  createdAt?: string;
}

const EXAMPLE_PROMPTS = [
  '做一个客户管理系统，包含客户列表、跟进记录、统计看板、客户详情与新增编辑。要求浅色商务风、左侧菜单栏、能真实增删改查。',
  '做一个医院预约挂号系统，包含科室管理、医生排班、预约管理、患者档案和统计分析。要求页面简洁专业。',
  '做一个企业 CRM 系统，包含线索管理、商机跟踪、合同管理、回款记录和团队业绩看板。',
  '做一个仓库管理系统，包含入库管理、出库管理、库存盘点、库位管理和报表统计。',
];


function buildProjectName(requirement: string) {
  return (requirement || '').trim().slice(0, 40) || 'DemoFast 原型';
}

function buildFinalPrompt(requirement: string, selectedSkillIds: string[], skills: UserSkill[]) {
  const base = (requirement || '').trim();
  const selectedSkills = skills.filter((item) => selectedSkillIds.includes(item.id));
  if (!selectedSkills.length) return base;
  return `${base}\n\n【附加要求】\n${selectedSkills.map((item) => `- ${item.prompt}`).join('\n')}`;
}

function formatDate(value?: string) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('zh-CN');
}

function DemoWorkspaceContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [requirement, setRequirement] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [balancePoints, setBalancePoints] = useState<number | null>(null);
  const [canStartDemo, setCanStartDemo] = useState(true);
  const [billingMessage, setBillingMessage] = useState('');
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const skillMenuRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = user?.role === 'admin';
  const showBalance = !!user && !isAdmin;

  const currentProjectName = useMemo(
    () => buildProjectName(requirement),
    [requirement]
  );
  const currentPrompt = useMemo(
    () => buildFinalPrompt(requirement, selectedSkillIds, skills),
    [requirement, selectedSkillIds, skills]
  );

  const fetchProjects = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/projects?projectType=frontend-demo', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200) setProjects(data.data || []);
    } catch (err) {
      console.error('获取项目失败:', err);
    }
  };

  const fetchBilling = async () => {
    if (!showBalance) return;
    try {
      const res = await fetch('/api/billing/account', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200) {
        setBalancePoints(data.data?.balancePoints ?? 0);
        setCanStartDemo(Boolean(data.data?.canStartDemo));
        setBillingMessage(data.data?.balancePoints > 0 ? '' : '当前点数不足，请联系管理员充值');
      }
    } catch (err) {
      console.error('获取点数余额失败:', err);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/demo/skills', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200) {
        setSkills(data.data || []);
      }
    } catch (err) {
      console.error('获取技能失败:', err);
    }
  };

  const refreshWorkspaceData = async () => {
    await fetchProjects();
    await fetchBilling();
    await fetchSkills();
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/landing');
      return;
    }
    setUser(JSON.parse(userStr));
  }, [router]);

  useEffect(() => {
    if (!user) return;
    void refreshWorkspaceData();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skillMenuRef.current && !skillMenuRef.current.contains(event.target as Node)) {
        setSkillMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllSkills = () => {
    setSelectedSkillIds(skills.map((item) => item.id));
  };

  const clearSkills = () => {
    setSelectedSkillIds([]);
  };

  const toggleSkillMenu = () => {
    setSkillMenuOpen((prev) => !prev);
  };

  const selectedSkillLabels = skills.filter((item) => selectedSkillIds.includes(item.id)).map((item) => item.label);

  const handleStart = async () => {
    if (!(requirement || '').trim() || !user) return;
    if (!isAdmin && !canStartDemo) {
      alert(billingMessage || '当前点数不足，无法发起新的 demo 生成任务');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/demo/project/control', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          name: currentProjectName,
          description: currentPrompt,
          requirement: currentPrompt,
          taskPackage: {
            prompt: requirement,
            skillPresetIds: selectedSkillIds,
          },
        }),
      });
      const data = await res.json();
      if (data.code === 200 && data.data?.id) {
        const projectId = data.data.id;
        sessionStorage.setItem('requirement', currentPrompt);
        sessionStorage.setItem('projectId', projectId);
        router.push(`/demo/requirement?projectId=${projectId}`);
      } else {
        const message = data.message || '创建原型失败';
        setBillingMessage(message);
        alert(message);
      }
    } catch (err: any) {
      const message = err?.message || '创建原型失败';
      setBillingMessage(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (projectId: string) => {
    const res = await fetch(`/api/demo/project/resume?projectId=${projectId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (data.code === 200) router.push(data.data.redirect);
  };

  const handleDelete = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects?projectId=${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        await fetchBilling();
      }
    } catch (err) {
      console.error('删除失败:', err);
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/landing');
  };

  const startDisabled = loading || !(requirement || '').trim() || (!isAdmin && !canStartDemo);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <div className="flex items-start">
        <aside className="sticky top-0 h-screen w-80 shrink-0 border-r border-slate-200 bg-white">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-6 py-5">
              <Link href="/workspace" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">DemoFast</div>
                  <div className="text-xs text-slate-500">历史项目</div>
                </div>
              </Link>
            </div>

            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">历史项目</div>
                <div className="mt-1 text-xs text-slate-500">仅保留项目恢复入口</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRequirement('');
                  setSelectedSkillIds([]);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                title="新建"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
              {projects.map((project) => (
                <div key={project.id} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                  <button onClick={() => handleResume(project.id)} className="w-full text-left">
                    <div className="pr-10 text-sm font-semibold text-slate-900 line-clamp-2">{project.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{project.id}</div>
                    <div className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{project.phaseLabel}</div>
                    <div className="mt-3 text-xs text-slate-500">更新于 {formatDate(project.updatedAt || project.createdAt)}</div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingProjectId(project.id);
                    }}
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-rose-500"
                    title="删除项目"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {deletingProjectId === project.id && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/95 p-4 text-center">
                      <p className="text-sm text-slate-700">确定删除此项目？</p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleDelete(project.id)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700">确认删除</button>
                        <button onClick={() => setDeletingProjectId(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">取消</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {projects.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  暂无历史项目
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{user?.name || '未登录'}</div>
                  <div className="mt-1 text-xs text-slate-500">{user?.role === 'admin' ? '管理员' : '普通用户'}</div>
                </div>
                {showBalance && balancePoints !== null && (
                  <div className={`rounded-full px-3 py-1 text-xs ${canStartDemo ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {balancePoints.toFixed(2)} 点
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-3">
                {user?.role === 'admin' && (
                  <Link href="/users" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900">
                    <Users className="h-4 w-4" />账号管理
                  </Link>
                )}
                <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900">
                  <LogOut className="h-4 w-4" />退出登录
                </button>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-h-screen flex-1 px-8 py-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
                  单对话框工作台
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">输入一句需求，直接开始生成原型</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">不再显示模板预览和快速起手，固定提示词改成对话框左下角技能注入。</p>
              </div>
              <Link href="/demo/skills" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900">
                <Settings2 className="h-4 w-4" />
                技能页面
              </Link>
            </div>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <textarea
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="请输入内容..."
                  className="h-72 w-full resize-none rounded-[20px] border-0 bg-transparent px-2 py-2 text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-400"
                />

                <div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-200 pt-4">
                  <div className="relative" ref={skillMenuRef}>
                    <button
                      type="button"
                      onClick={toggleSkillMenu}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <Wand2 className="h-4 w-4" />
                      <span>{selectedSkillLabels.length ? `技能 ${selectedSkillLabels.length}` : '技能'}</span>
                      <ChevronDown className={`h-4 w-4 transition ${skillMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {skillMenuOpen && (
                      <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">技能选择</div>
                            <div className="mt-1 text-xs text-slate-500">提示词注入，可多选</div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <button type="button" onClick={selectAllSkills} className="text-slate-500 hover:text-slate-900">全选</button>
                            <button type="button" onClick={clearSkills} className="text-slate-500 hover:text-slate-900">清空</button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          {skills.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                              暂无技能，请进入技能页面创建。
                            </div>
                          )}
                          {skills.map((item) => {
                            const active = selectedSkillIds.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => toggleSkill(item.id)}
                                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                              >
                                <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border ${active ? 'border-blue-200 bg-blue-600 text-white' : 'border-slate-200 bg-white text-transparent'}`}>
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                                <span>
                                  <span className="block text-sm font-medium text-slate-900">{item.label}</span>
                                  <span className="mt-1 block text-xs leading-5 text-slate-500">{item.prompt}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleStart}
                    disabled={startDisabled}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    title="发送"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 px-1">
                <div className="text-xs text-slate-400">{billingMessage || `${requirement.length} 字`}</div>
                <div className="text-xs text-slate-400">{selectedSkillLabels.length ? `已选：${selectedSkillLabels.join('、')}` : '未选择技能'}</div>
              </div>
            </section>

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <button
                type="button"
                onClick={() => setExamplesOpen((prev) => !prev)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">示例模板</div>
                  <div className="mt-1 text-xs text-slate-500">默认收起，点击展开</div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition ${examplesOpen ? 'rotate-180' : ''}`} />
              </button>

              {examplesOpen && (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {EXAMPLE_PROMPTS.map((example, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setRequirement(example)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm leading-6 text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DemoWorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-slate-500" /></div>}>
      <DemoWorkspaceContent />
    </Suspense>
  );
}
