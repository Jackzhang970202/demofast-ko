'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GuidePanel from '@/components/GuidePanel';
import { getAuthHeaders, getJsonAuthHeaders } from '@/lib/auth-client';

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = {
  pm: 10 * 60 * 1000,        // 10 分钟
  uiue: 10 * 60 * 1000,      // 10 分钟
  architect: 10 * 60 * 1000, // 10 分钟
  developer: 90 * 60 * 1000, // 90 分钟
};

// 带超时的 fetch
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface Agent {
  id: string;
  name: string;
  color: string;
  description: string;
  status: 'inactive' | 'active' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface ClarificationSession {
  projectId: string;
  status: string;
  summary: {
    targetUser: string;
    coreProblem: string;
    features: {
      phase1: Array<{ name: string; priority: string; reason: string }>;
      phase2: Array<{ name: string; priority: string; reason: string }>;
      excluded: Array<{ name: string; reason: string }>;
    };
    successCriteria: string[];
    constraints: {
      time: string;
      tech: string;
      resource: string;
    };
    dataAndPermission: {
      dataSource: string;
      permissionModel: string;
    };
  } | null;
}

const defaultAgents: Agent[] = [
  { id: 'pm', name: '产品经理', color: '#3b82f6', description: '生成需求规格', status: 'inactive', progress: 0 },
  { id: 'uiue', name: 'UI/UE设计', color: '#a855f7', description: '生成界面设计', status: 'inactive', progress: 0 },
  { id: 'architect', name: '架构师', color: '#14b8a6', description: '生成架构设计', status: 'inactive', progress: 0 },
  { id: 'developer', name: '开发工程师', color: '#22c55e', description: '生成代码', status: 'inactive', progress: 0 },
];

function GenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [requirement, setRequirement] = useState('');
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [agentContents, setAgentContents] = useState<Record<string, string>>({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ClarificationSession | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guideMessage, setGuideMessage] = useState('');
  const [nextRoute, setNextRoute] = useState('');

  // 新增：跟踪当前执行到的步骤和是否正在执行
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const executionStartedRef = useRef(false);

  // Agent 执行顺序
  const agentOrder = ['pm', 'uiue', 'architect', 'developer'] as const;

  // 执行单个 Agent
  const executeAgent = async (agentId: string, req: string, pid: string) => {
    const answersStr = sessionStorage.getItem('answers') || '{}';
    const answers = JSON.parse(answersStr);
    const savedSession = sessionStorage.getItem('session');
    const sessionData = savedSession ? JSON.parse(savedSession) : null;
    const detailedRequirement = buildDetailedRequirement(req, answers, sessionData);

    const agentIndex = agentOrder.indexOf(agentId as any);
    const progressPerAgent = 25;

    // 标记当前 agent 为 active
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'active' } : a));

    try {
      if (agentId === 'pm') {
        setAgentContents(prev => ({ ...prev, pm: '⏳ 正在生成需求规格文档...\n' }));
        const pmRes = await fetchWithTimeout('/api/agents/pm', {
          method: 'POST',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify({ requirement: detailedRequirement, answers, projectId: pid, session: sessionData }),
        }, REQUEST_TIMEOUT.pm);
        const pmData = await pmRes.json();
        if (pmData.code === 200) {
          setAgentContents(prev => ({ ...prev, pm: `✅ 需求规格文档已生成\n\n${pmData.data.content?.substring(0, 300) || ''}` }));
          setAgents(prev => prev.map(a => a.id === 'pm' ? { ...a, status: 'completed', progress: 100 } : a));
        } else {
          throw new Error(pmData.message || 'PM Agent 失败');
        }
      } else if (agentId === 'uiue') {
        setAgentContents(prev => ({ ...prev, uiue: '⏳ 正在生成 UI/UX 设计规范...\n' }));
        const uiueRes = await fetchWithTimeout('/api/agents/uiue', {
          method: 'POST',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify({ requirement: detailedRequirement, session: sessionData, projectId: pid }),
        }, REQUEST_TIMEOUT.uiue);
        const uiueData = await uiueRes.json();
        if (uiueData.code === 200) {
          setAgentContents(prev => ({ ...prev, uiue: `✅ UI/UX 设计规范已生成\n\n${uiueData.data.content?.substring(0, 300) || ''}` }));
          setAgents(prev => prev.map(a => a.id === 'uiue' ? { ...a, status: 'completed', progress: 100 } : a));
        } else {
          throw new Error(uiueData.message || 'UIUE Agent 失败');
        }
      } else if (agentId === 'architect') {
        setAgentContents(prev => ({ ...prev, architect: '⏳ 正在生成系统架构设计...\n' }));
        const archRes = await fetchWithTimeout('/api/agents/architect', {
          method: 'POST',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify({ requirement: detailedRequirement, session: sessionData, projectId: pid }),
        }, REQUEST_TIMEOUT.architect);
        const archData = await archRes.json();
        if (archData.code === 200) {
          setAgentContents(prev => ({ ...prev, architect: `✅ 系统架构设计已生成\n\n${archData.data.content?.substring(0, 300) || ''}` }));
          setAgents(prev => prev.map(a => a.id === 'architect' ? { ...a, status: 'completed', progress: 100 } : a));
        } else {
          throw new Error(archData.message || 'Architect Agent 失败');
        }
      } else if (agentId === 'developer') {
        setAgentContents(prev => ({ ...prev, developer: '⏳ 正在调用 Claude Code 生成代码...\n\n这可能需要几分钟，请耐心等待...\n' }));
        const devRes = await fetchWithTimeout('/api/agents/developer', {
          method: 'POST',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify({
            requirement: detailedRequirement,
            answers,
            session: sessionData,
            specs: sessionData?.specs,
            projectId: pid
          }),
        }, REQUEST_TIMEOUT.developer);
        const devData = await devRes.json();

        if (devData.code === 200) {
          const finalProjectId = devData.data.projectId;
          setProjectId(finalProjectId);
          setGeneratedFiles(devData.data.files);
          sessionStorage.setItem('projectId', finalProjectId);

          const fileList = devData.data.files.map((f: any, i: number) => `${i + 1}. ${f.path}`).join('\n');
          setAgentContents(prev => ({
            ...prev,
            developer: `✅ 代码生成完成！\n\n📄 生成的文件 (${devData.data.files.length} 个):\n${fileList}\n\n${devData.data.output?.substring(0, 500) || ''}`,
          }));
          setAgents(prev => prev.map(a => a.id === 'developer' ? { ...a, status: 'completed', progress: 100 } : a));
        } else {
          throw new Error(devData.message || 'Developer Agent 失败');
        }
      }

      // 更新进度
      setOverallProgress((agentIndex + 1) * progressPerAgent);
      setCurrentStepIndex(agentIndex + 1);

      return true;
    } catch (err: any) {
      // 标记失败
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: 'failed', error: err.message } : a));
      setAgentContents(prev => ({
        ...prev,
        [agentId]: `❌ 执行失败: ${err.message}\n\n请点击重试按钮重新执行此步骤。`,
      }));
      setIsExecuting(false);
      return false;
    }
  };

  // 顺序执行所有 Agent（从当前步骤开始）
  const startGeneration = async (req: string, pid: string, startFromIndex: number = 0) => {
    // 防止 dev 模式严格模式双重渲染导致重复执行
    if (executionStartedRef.current) {
      console.log(`[Lock] 执行已启动，跳过重复调用`);
      return;
    }
    executionStartedRef.current = true;

    // 尝试获取项目锁
    try {
      const lockRes = await fetch('/api/project/lock', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ projectId: pid, operation: 'generate' }),
      });
      const lockData = await lockRes.json();

      if (lockData.code !== 200) {
        setIsExecuting(false);
        executionStartedRef.current = false;
        setShowGuide(true);
        setGuideMessage(lockData.message || '项目正在执行中，请勿重复触发');
        setNextRoute(`/generate?projectId=${pid}`);
        setLoading(false);
        return;
      }

      console.log(`[Lock] 项目 ${pid} 已锁定`);
    } catch (lockErr) {
      console.warn('[Lock] 获取锁失败，停止执行:', lockErr);
      setIsExecuting(false);
      executionStartedRef.current = false;
      setShowGuide(true);
      setGuideMessage('无法确认项目锁状态，已停止自动执行，请稍后重试');
      setNextRoute(`/generate?projectId=${pid}`);
      setLoading(false);
      return;
    }

    setIsExecuting(true);
    setCurrentStepIndex(startFromIndex);

    for (let i = startFromIndex; i < agentOrder.length; i++) {
      const agentId = agentOrder[i];
      const success = await executeAgent(agentId, req, pid);
      if (!success) {
        // 失败时停止，保留当前步骤索引以便重试
        // 注意：失败时不释放锁，防止用户多次重试导致并发问题
        return;
      }
    }

    // 全部完成，释放锁
    try {
      await fetch(`/api/project/lock?projectId=${pid}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      console.log(`[Lock] 项目 ${pid} 已释放锁`);
    } catch (releaseErr) {
      console.warn('[Lock] 释放锁失败:', releaseErr);
    }

    setIsExecuting(false);
    setOverallProgress(100);
  };

  // 重试当前失败的步骤
  const handleRetry = async () => {
    if (!isExecuting && currentStepIndex < agentOrder.length) {
      // 防止重复执行
      if (executionStartedRef.current) {
        return;
      }
      executionStartedRef.current = true;
      const req = sessionStorage.getItem('requirement') || '';
      const pid = projectId || sessionStorage.getItem('projectId') || '';

      // 重试时不需要重新获取锁（锁已经被持有）
      setIsExecuting(true);
      setCurrentStepIndex(currentStepIndex);

      for (let i = currentStepIndex; i < agentOrder.length; i++) {
        const agentId = agentOrder[i];
        const success = await executeAgent(agentId, req, pid);
        if (!success) {
          return;
        }
      }

      // 全部完成，释放锁
      try {
        await fetch(`/api/project/lock?projectId=${pid}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        console.log(`[Lock] 项目 ${pid} 已释放锁`);
      } catch (releaseErr) {
        console.warn('[Lock] 释放锁失败:', releaseErr);
      }

      setIsExecuting(false);
      setOverallProgress(100);
    }
  };

  // 获取失败的 Agent
  const getFailedAgent = () => agents.find(a => a.status === 'failed');

  // 页面离开时释放锁
  useEffect(() => {
    return () => {
      // cleanup: 如果页面被关闭且项目正在执行，尝试释放锁
      if (projectId && isExecuting) {
        // 使用 sendBeacon 确保请求被发送（只支持 POST）
        const url = '/api/project/lock';
        const data = JSON.stringify({ projectId, action: 'release' });
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
        }
      }
      // 重置执行标记，允许下次重新进入
      executionStartedRef.current = false;
    };
  }, [projectId, isExecuting]);

  useEffect(() => {
    // 从 URL 获取 projectId
    const urlProjectId = searchParams.get('projectId');

    // 优先使用 URL 中的 projectId
    if (urlProjectId) {
      setProjectId(urlProjectId);
      initGeneration(urlProjectId);
      return;
    }

    // URL 没有 projectId，尝试从 sessionStorage 恢复
    const storedProjectId = sessionStorage.getItem('projectId');
    if (storedProjectId) {
      setProjectId(storedProjectId);
      // 更新 URL
      window.history.replaceState(null, '', `/generate?projectId=${storedProjectId}`);
      initGeneration(storedProjectId);
      return;
    }

    // 都没有，返回工作区
    alert('项目 ID 缺失，请重新创建项目');
    router.push('/workspace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 初始化生成流程
  const initGeneration = async (pid: string) => {
    // 检查工作流状态
    let calculatedStartIndex = 0;
    let stateData: any = null;

    try {
      const stateRes = await fetch(`/api/project/state?projectId=${pid}`, {
        headers: getAuthHeaders(),
      });
      stateData = await stateRes.json();

      if (stateData.code === 200) {
        const phase = stateData.data.phase;
        const docStatus = stateData.data.docStatus;
        const startFromIndex = stateData.data.startFromIndex || 0;
        calculatedStartIndex = startFromIndex;

        // 如果还在澄清阶段，返回澄清页面
        if (phase === 'CLARIFYING' || phase === 'IDLE') {
          setShowGuide(true);
          setGuideMessage('需求澄清尚未完成，请先完成澄清');
          setNextRoute(`/requirement?projectId=${pid}`);
          setLoading(false);
          return;
        }

        // 如果已完成，直接进入 IDE
        if (phase === 'COMPLETED') {
          router.push(`/ide?project=${pid}`);
          return;
        }

        // 根据文档状态更新 Agent 状态显示
        setAgents(prev => prev.map(a => {
          if (a.id === 'pm' && docStatus?.pm) return { ...a, status: 'completed', progress: 100 };
          if (a.id === 'uiue' && docStatus?.uiue) return { ...a, status: 'completed', progress: 100 };
          if (a.id === 'architect' && docStatus?.architect) return { ...a, status: 'completed', progress: 100 };
          return a;
        }));

        // 更新进度显示
        setOverallProgress(startFromIndex * 25);
        setCurrentStepIndex(startFromIndex);

        const executionRes = await fetch(`/api/project/execution?projectId=${pid}`, {
          headers: getAuthHeaders(),
        });
        const executionData = await executionRes.json();
        if (executionData.code === 200 && executionData.data?.status === 'running') {
          setLoading(false);
          setIsExecuting(true);
          return;
        }
      }
    } catch (err) {
      console.error('检查状态失败:', err);
    }

    let req = sessionStorage.getItem('requirement');
    if (!req) {
      req = stateData?.data?.requirement || '';
      if (req) {
        sessionStorage.setItem('requirement', req);
      }
    }
    if (!req) {
      alert('需求信息缺失，请重新创建项目');
      router.push('/workspace');
      return;
    }
    setRequirement(req);

    // 加载澄清会话
    const savedSession = sessionStorage.getItem('session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (e) {
        console.error('Failed to parse session:', e);
      }
    }

    setLoading(false);

    // 从正确的步骤开始生成流程（使用 API 返回的索引）
    startGeneration(req, pid, calculatedStartIndex);
  };

  const handleEnterProject = () => {
    if (projectId) {
      router.push(`/ide?project=${projectId}`);
    } else {
      router.push('/ide');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🤖</div>
          <div className="text-white text-lg">准备中...</div>
        </div>
      </div>
    );
  }

  // 显示引导界面
  if (showGuide) {
    return (
      <GuidePanel
        message={guideMessage}
        nextRoute={nextRoute}
        nextLabel="继续"
        onBack={() => router.push('/workspace')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] p-6">
      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">🏭 AI 开发工厂</h1>
        <p className="text-gray-400">
          {overallProgress < 100 ? '智能体协同工作中...' : '✅ 项目生成完成'}
        </p>
      </div>

      {/* 智能体卡片 */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`relative p-4 rounded-xl border transition-all duration-300 ${
              agent.status === 'active'
                ? 'border-opacity-100 animate-pulse'
                : agent.status === 'completed'
                ? 'border-green-500/50 bg-green-500/5'
                : agent.status === 'failed'
                ? 'border-red-500/50 bg-red-500/5'
                : 'border-white/10 bg-white/5'
            }`}
            style={{
              borderColor: agent.status === 'failed' ? '#ef4444' : agent.status !== 'inactive' ? agent.color : undefined,
              boxShadow: agent.status === 'active' ? `0 0 20px ${agent.color}40` : agent.status === 'failed' ? '0 0 20px rgba(239,68,68,0.4)' : undefined,
            }}
          >
            {/* 状态指示器 */}
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: agent.status === 'completed' ? '#22c55e' : agent.status === 'failed' ? '#ef4444' : agent.status === 'active' ? agent.color : '#4B5563',
                }}
              />
              <span className="text-xs text-gray-500">
                {agent.status === 'completed' ? '✅' : agent.status === 'failed' ? '❌' : agent.status === 'active' ? '⏳' : '等待'}
              </span>
            </div>

            {/* 名称和描述 */}
            <div className="mb-2">
              <h3 className="font-semibold text-white text-sm">{agent.name}</h3>
              <p className="text-xs text-gray-500">{agent.description}</p>
            </div>

            {/* 内容预览 */}
            {agentContents[agent.id] && (
              <div className={`mt-3 p-2 rounded text-xs max-h-32 overflow-y-auto font-mono whitespace-pre-wrap ${
                agent.status === 'failed' ? 'bg-red-900/30 text-red-400' : 'bg-black/30 text-gray-400'
              }`}>
                {agentContents[agent.id].substring(0, 300)}
                {agentContents[agent.id].length > 300 && '...'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 整体进度 */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">整体进度</span>
          <span className="text-gray-400 text-sm">{Math.round(overallProgress)}%</span>
        </div>
        <div className="h-3 bg-[#1e1e2e] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* 澄清结果摘要 */}
      {session?.summary && (
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-[#1a1a2e]/80 border border-purple-500/20 rounded-xl p-5">
            <h3 className="text-lg font-bold text-white mb-3">📋 需求摘要</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500">目标用户：</span>
                <span className="text-white">{session.summary.targetUser}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">核心问题：</span>
                <span className="text-white">{session.summary.coreProblem}</span>
              </div>
              <div>
                <span className="text-gray-500">第一期功能：</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {session.summary.features.phase1.map(f => (
                    <span key={f.name} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 完成后显示按钮 */}
      {overallProgress >= 100 && !getFailedAgent() && (
        <div className="text-center animate-fade-in">
          <button
            onClick={handleEnterProject}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg font-bold px-10 py-4 rounded-xl shadow-lg shadow-purple-500/30 transition-all hover:scale-105"
          >
            🚀 进入项目
          </button>
          <p className="text-gray-500 text-sm mt-3">
            已生成 {generatedFiles.length} 个文件，点击进入代码编辑器
          </p>
        </div>
      )}

      {/* 失败时显示重试按钮 */}
      {getFailedAgent() && !isExecuting && (
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg border border-red-500/50 mb-4">
            <span className="text-red-400">⚠️ {getFailedAgent()?.name} 执行失败</span>
          </div>
          <button
            onClick={handleRetry}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white text-lg font-bold px-10 py-4 rounded-xl shadow-lg shadow-orange-500/30 transition-all hover:scale-105"
          >
            🔄 重试当前步骤
          </button>
          <p className="text-gray-500 text-sm mt-3">
            点击重试按钮从失败的步骤继续执行
          </p>
        </div>
      )}

      {/* 生成中提示 */}
      {overallProgress < 100 && !getFailedAgent() && isExecuting && (
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#1a1a2e] rounded-lg border border-white/10">
            <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
            <span className="text-gray-300">
              {currentStepIndex === 0 ? '产品经理分析中...' :
               currentStepIndex === 1 ? 'UI/UE 设计中...' :
               currentStepIndex === 2 ? '架构师规划中...' : 'Claude Code 生成代码...'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-3">这可能需要几分钟，请耐心等待</p>
        </div>
      )}
    </div>
  );
}

// 构建详细需求
function buildDetailedRequirement(
  requirement: string,
  answers: Record<string, any>,
  session: any
): string {
  const lines: string[] = [];

  lines.push('## 用户原始需求');
  lines.push(requirement);
  lines.push('');

  if (answers && Object.keys(answers).length > 0) {
    lines.push('## 用户澄清回答');
    Object.entries(answers).forEach(([question, answer]) => {
      const answerText = Array.isArray(answer) ? answer.join('、') : answer;
      lines.push(`- ${question}: ${answerText}`);
    });
    lines.push('');
  }

  if (session?.summary) {
    const summary = session.summary;

    lines.push('## 详细需求分析');
    lines.push('');

    lines.push('### 目标用户');
    lines.push(summary.targetUser || '未明确');
    lines.push('');

    lines.push('### 核心问题');
    lines.push(summary.coreProblem || '未明确');
    lines.push('');

    lines.push('### 第一期功能（必须实现）');
    if (summary.features?.phase1?.length > 0) {
      summary.features.phase1.forEach((f: any) => {
        lines.push(`- **${f.name}** (${f.priority}) - ${f.reason || ''}`);
      });
    }
    lines.push('');

    lines.push('### 成功标准');
    if (summary.successCriteria?.length > 0) {
      summary.successCriteria.forEach((s: string) => {
        lines.push(`- ${s}`);
      });
    }
    lines.push('');

    lines.push('### 约束条件');
    lines.push(`- 时间: ${summary.constraints?.time || '未提及'}`);
    lines.push(`- 技术: ${summary.constraints?.tech || '未提及'}`);
    lines.push(`- 资源: ${summary.constraints?.resource || '未提及'}`);
    lines.push('');

    lines.push('### 数据与权限');
    lines.push(`- 数据来源: ${summary.dataAndPermission?.dataSource || '未提及'}`);
    lines.push(`- 权限模型: ${summary.dataAndPermission?.permissionModel || '未提及'}`);
  }

  return lines.join('\n');
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    }>
      <GenerateContent />
    </Suspense>
  );
}