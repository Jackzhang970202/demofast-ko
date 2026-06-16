'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GuidePanel from '@/components/GuidePanel';
import QuestionCard from '@/components/clarification/QuestionCard';
import ProgressIndicator from '@/components/clarification/ProgressIndicator';
import SummaryPreview from '@/components/clarification/SummaryPreview';
import { getAuthHeaders, getJsonAuthHeaders } from '@/lib/auth-client';
import type {
  ClarificationSession,
  ClarificationQuestion,
  ClarificationProgress,
  RequirementSummary,
  OriginalRequirementSummary,
} from '@/types';

function RequirementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 获取 projectId（优先级最高）
  const urlProjectId = searchParams.get('projectId');

  // 使用 ref 防止 React StrictMode 导致的重复初始化
  const initializedRef = useRef(false);

  // 状态
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false); // 分析中状态
  const [advancingRound, setAdvancingRound] = useState(false); // 推进轮次中状态
  const [analysisResult, setAnalysisResult] = useState<OriginalRequirementSummary | null>(null); // 分析结果
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<ClarificationSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ClarificationQuestion | null>(null);
  const [progress, setProgress] = useState<ClarificationProgress | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>([]);
  const [requirement, setRequirement] = useState<string>('');
  const [advanceError, setAdvanceError] = useState<string | null>(null); // 推进错误提示
  const [projectId, setProjectId] = useState<string | null>(urlProjectId); // 项目 ID
  const [showGuide, setShowGuide] = useState(false);
  const [guideMessage, setGuideMessage] = useState('');
  const [nextRoute, setNextRoute] = useState('');

  // 初始化 - 只执行一次
  useEffect(() => {
    // 防止 StrictMode 重复执行
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    // 使用 async IIFE 处理异步逻辑
    (async () => {
      // 优先使用 URL 中的 projectId
      if (urlProjectId) {
        setProjectId(urlProjectId);
        // 检查工作流状态
        try {
          const stateRes = await fetch(`/api/project/state?projectId=${urlProjectId}`, {
            headers: getAuthHeaders(),
          });
          const stateData = await stateRes.json();

          if (stateData.code === 200) {
            // 检查是否在正确的阶段
            if (stateData.data.phase !== 'CLARIFYING' && stateData.data.phase !== 'IDLE') {
              // 显示引导界面
              setShowGuide(true);
              setGuideMessage(`当前项目状态为 ${stateData.data.phase}，请点击继续`);
              setNextRoute(stateData.data.nextAction?.route || `/ide?projectId=${urlProjectId}`);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('检查状态失败:', err);
        }
        initSession(urlProjectId);
        return;
      }

      // URL 没有 projectId，尝试从 sessionStorage 恢复
      const storedProjectId = sessionStorage.getItem('projectId');
      if (storedProjectId) {
        setProjectId(storedProjectId);
        // 更新 URL（不刷新页面）
        window.history.replaceState(null, '', `/requirement?projectId=${storedProjectId}`);
        initSession(storedProjectId);
        return;
      }

      // 都没有，显示引导界面
      setShowGuide(true);
      setGuideMessage('项目 ID 缺失，请先创建项目');
      setNextRoute('/workspace');
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 初始化会话 - 根据 projectId 加载或创建
  const initSession = async (pid: string) => {
    try {
      // 尝试加载已有会话
      console.log('[Requirement] 加载会话:', pid);
      const loadRes = await fetch(`/api/clarification?projectId=${pid}`, {
        headers: getAuthHeaders(),
      });
      const loadData = await loadRes.json();

      if (loadData.code === 200 && loadData.data.session) {
        const sessionData = loadData.data.session;

        // 如果会话已完成，跳转到生成页面
        if (sessionData.status === 'completed') {
          router.push(`/generate?projectId=${pid}`);
          return;
        }

        // 如果会话正在进行中，恢复状态
        if (sessionData.status === 'in_progress' && sessionData.questions?.length > 0) {
          // 检查是否有已回答的问题
          const hasAnswers = sessionData.answers?.length > 0;

          if (hasAnswers) {
            // 直接恢复到问题界面
            setSession(sessionData);
            setCurrentQuestion(loadData.data.currentQuestion);
            setProgress(loadData.data.progress);
            setLoading(false);
            return;
          }

          // 没有回答过，显示分析结果确认界面
          setSession(sessionData);
          setProgress(loadData.data.progress);
          setAnalyzing(true);
          setLoading(false);
          return;
        }
      }

      // 会话不存在，需要创建新会话
      console.log('[Requirement] 会话不存在，创建新会话');
      const req = sessionStorage.getItem('requirement') || '';
      if (!req) {
        alert('需求信息缺失，请重新创建项目');
        router.push('/workspace');
        return;
      }
      setRequirement(req);

      // 创建新会话
      setAnalyzing(true);
      setLoading(false);

      const res = await fetch('/api/clarification', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ requirement: req, projectId: pid }),
      });
      const data = await res.json();

      if (data.code === 200) {
        setSession(data.data.session);
        setProgress(data.data.progress);
        console.log('[Requirement] 会话已创建:', pid);
      } else {
        console.error('创建会话失败:', data.message);
        alert('初始化失败，请重试');
        router.push('/workspace');
      }
    } catch (err) {
      console.error('初始化会话错误:', err);
      alert('初始化失败，请重试');
      router.push('/workspace');
      setLoading(false);
    }
  };

  // 用户确认分析结果后，开始澄清
  const startClarification = async () => {
    setAnalyzing(false);
    // 获取第一个问题
    if (session) {
      const currentQ = session.questions.find(q => q.round === 1);
      setCurrentQuestion(currentQ || null);
    }
  };

  // 提交回答
  const handleSubmit = async (finalAnswer?: string | string[]) => {
    if (!session || !currentQuestion) return;

    // 优先使用传入的 finalAnswer，否则使用 currentAnswer 状态
    const actualAnswer = finalAnswer !== undefined ? finalAnswer : currentAnswer;

    setSubmitting(true);
    setAdvanceError(null); // 清除之前的错误
    try {
      const res = await fetch('/api/clarification/submit', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          projectId: session.projectId,
          questionId: currentQuestion.id,
          answer: actualAnswer,
        }),
      });
      const data = await res.json();

      if (data.code === 200) {
        setSession(data.data.session);
        setProgress(data.data.progress);
        setCurrentAnswer([]);

        // 检查是否正在推进轮次（currentQuestion 为 null 但会话未完成）
        if (!data.data.currentQuestion && !data.data.sessionComplete) {
          // 正在推进轮次，显示加载状态
          setAdvancingRound(true);
          setCurrentQuestion(null);
        } else {
          setAdvancingRound(false);
          setCurrentQuestion(data.data.currentQuestion);
        }

        // 如果有推进错误，显示提示但继续
        if (data.data.advanceError) {
          setAdvancingRound(false);
          setAdvanceError(data.data.advanceError);
          console.warn('推进轮次警告:', data.data.advanceError);
          // 5秒后自动清除错误提示
          setTimeout(() => setAdvanceError(null), 5000);
        }

        // 如果澄清完成，跳转到生成流程
        if (data.data.sessionComplete) {
          setAdvancingRound(false);
          // 保存澄清结果
          sessionStorage.setItem('clarificationComplete', 'true');
          sessionStorage.setItem('summary', JSON.stringify(data.data.session.summary));
          sessionStorage.setItem('agentHandoff', JSON.stringify(data.data.session.agentHandoff));

          // 开始生成
          startGeneration(data.data.session);
        }
      } else {
        console.error('提交回答失败:', data.message);
        setAdvanceError(`提交失败: ${data.message}`);
      }
    } catch (err) {
      console.error('提交回答错误:', err);
      setAdvanceError('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 跳过问题
  const handleSkip = async () => {
    // 跳过时提交空回答
    setCurrentAnswer('');
    await handleSubmit('');
  };

  // 开始生成流程
  const startGeneration = async (completedSession: ClarificationSession) => {
    // 保存答案供后续使用
    const answersMap = completedSession.answers.reduce((acc, a) => {
      acc[a.questionId] = a.answer;
      return acc;
    }, {} as Record<string, any>);
    sessionStorage.setItem('answers', JSON.stringify(answersMap));

    // 保存完整的 session 供后续使用
    sessionStorage.setItem('session', JSON.stringify(completedSession));

    // 跳转到生成页面，URL 携带 projectId
    router.push(`/generate?projectId=${completedSession.projectId}`);
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🤖</div>
          <div className="text-white text-lg">AI 正在分析您的需求...</div>
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

  // ========== 思考/分析步骤 ==========
  if (analyzing && session?.originalSummary) {
    const summary = session.originalSummary;
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] p-6">
        <div className="max-w-3xl mx-auto">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">🧠 AI 需求分析</h1>
            <p className="text-gray-400">AI 已经理解了您的需求，请确认理解是否正确</p>
          </div>

          {/* 分析结果卡片 */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">💭</span>
              AI 的理解
            </h2>

            {/* 核心目标 */}
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">核心目标</div>
              <div className="text-white bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                {summary.coreGoal}
              </div>
            </div>

            {/* 目标用户 */}
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">目标用户</div>
              <div className="text-white">{summary.targetUser}</div>
            </div>

            {/* 功能诉求 */}
            {summary.features.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">提到的功能</div>
                <div className="flex flex-wrap gap-2">
                  {summary.features.map((feature, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 模糊点 */}
            {summary.ambiguousPoints.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-yellow-400 mb-1">⚠️ 需要澄清的点</div>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {summary.ambiguousPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 遗漏点 */}
            {summary.missingPoints.length > 0 && (
              <div className="mb-4">
                <div className="text-sm text-orange-400 mb-1">❓ 可能遗漏的关键信息</div>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {summary.missingPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => router.push('/workspace')}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              ← 返回修改
            </button>
            <button
              onClick={startClarification}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium"
            >
              理解正确，继续 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== 分析中状态 ==========
  if (analyzing && !session?.originalSummary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-4">🧠</div>
          <div className="text-white text-xl mb-2">AI 正在思考...</div>
          <div className="text-gray-400 mb-6">分析您的需求，理解核心目标</div>
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // ========== 推进轮次中状态 ==========
  if (advancingRound && !advanceError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-4">🔄</div>
          <div className="text-white text-xl mb-2">正在分析您的回答...</div>
          <div className="text-gray-400 mb-6">AI 正在判断是否需要追问</div>
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // 澄清完成状态
  if (session?.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <div className="text-white text-xl mb-4">需求澄清完成</div>
          <div className="text-gray-400 mb-6">正在启动智能体协同...</div>
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto" />
        </div>
      </div>
    );
  }

  // 主界面
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] p-6">
      <div className="max-w-3xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">📋 需求澄清</h1>
          <p className="text-gray-400">AI 正在帮助您澄清需求，请回答以下问题</p>
        </div>

        {/* 进度 */}
        {progress && (
          <div className="mb-6">
            <ProgressIndicator progress={progress} />
          </div>
        )}

        {/* 错误提示 */}
        {advanceError && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="text-red-400 text-sm">
              ⚠️ {advanceError}
            </div>
            <div className="text-gray-400 text-xs mt-1">
              您的回答已保存，请点击“重试”继续
            </div>
            <button
              onClick={() => {
                setAdvanceError(null);
                // 重新加载会话状态
                if (session) {
                  fetch(`/api/clarification?projectId=${session.projectId}`, {
                    headers: getAuthHeaders(),
                  })
                    .then(res => res.json())
                    .then(data => {
                      if (data.code === 200) {
                        setSession(data.data.session);
                        setCurrentQuestion(data.data.currentQuestion);
                        setProgress(data.data.progress);
                      }
                    });
                }
              }}
              className="mt-2 px-4 py-1 bg-red-500/30 hover:bg-red-500/50 text-red-300 rounded text-sm transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 问题卡片 */}
        {currentQuestion && (
          <div className="mb-6">
            <QuestionCard
              question={currentQuestion}
              answer={currentAnswer}
              onAnswerChange={setCurrentAnswer}
              onSkip={!currentQuestion.required ? handleSkip : undefined}
              onSubmit={handleSubmit}
              loading={submitting}
            />
          </div>
        )}

        {/* 需求摘要预览 */}
        {session?.summary && (
          <div className="mb-6">
            <SummaryPreview summary={session.summary} collapsed={true} />
          </div>
        )}

        {/* 返回按钮 */}
        <div className="flex justify-start">
          <button
            onClick={() => router.push('/workspace')}
            className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
          >
            ← 返回修改
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RequirementPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center">
          <div className="animate-spin text-4xl">⏳</div>
        </div>
      }
    >
      <RequirementContent />
    </Suspense>
  );
}