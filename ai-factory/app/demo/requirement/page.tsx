'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { CheckCircle2, ClipboardList, Layers3, MessageSquareQuote, Sparkles } from 'lucide-react';
import type { DemoClarificationSummary } from '@/types/workflow';
import { getAuthHeaders, getJsonAuthHeaders } from '@/lib/auth-client';
import ProgressIndicator from '@/components/clarification/ProgressIndicator';
import QuestionCard from '@/components/clarification/QuestionCard';
import SummaryPreview from '@/components/clarification/SummaryPreview';

function DemoRequirementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [answer, setAnswer] = useState<string | string[]>('');
  const [questionHistory, setQuestionHistory] = useState<any[]>([]);
  const [extraDescription, setExtraDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const loadStartedRef = useRef(false);
  const submitStartedRef = useRef(false);

  useEffect(() => {
    if (!projectId) {
      router.push('/demo/workspace');
      return;
    }

    if (loadStartedRef.current) return;
    loadStartedRef.current = true;

    const loadSession = async () => {
      try {
        const sessionRes = await fetch(`/api/demo/clarification?projectId=${projectId}`, {
          headers: getAuthHeaders(),
        });
        if (sessionRes.ok) {
          const data = await sessionRes.json();
          setSession(data.data.session);
          setCurrentQuestion(data.data.currentQuestion);
          setProgress(data.data.progress);
          setQuestionHistory((data.data.session?.questions || []).filter((item: any) => item.round === data.data.session?.currentRound));
          setError(null);
          // 如果会话已完成，直接显示完成状态
          if (data.data.session?.status === 'completed') {
            setSessionComplete(true);
          }
          return;
        }

        if (sessionRes.status !== 404) {
          const errorData = await sessionRes.json().catch(() => ({}));
          throw new Error(errorData.message || '加载澄清会话失败');
        }

        const stateRes = await fetch(`/api/demo/project/state?projectId=${projectId}`, {
          headers: getAuthHeaders(),
        });
        const stateData = await stateRes.json();
        if (stateData.code !== 200) {
          throw new Error(stateData.message || '加载项目状态失败');
        }

        const requirement = stateData.data?.requirement;
        if (!requirement) {
          throw new Error('项目需求不存在，无法创建澄清会话');
        }

        const createRes = await fetch('/api/demo/clarification', {
          method: 'POST',
          headers: getJsonAuthHeaders(),
          body: JSON.stringify({ projectId, requirement }),
        });
        const createData = await createRes.json();
        if (createData.code !== 200) {
          throw new Error(createData.message || '创建澄清会话失败');
        }

        setSession(createData.data.session);
        setCurrentQuestion(createData.data.currentQuestion);
        setProgress(createData.data.progress);
        setQuestionHistory((createData.data.session?.questions || []).filter((item: any) => item.round === createData.data.session?.currentRound));
        setError(null);
      } catch (err: any) {
        setError(err.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [projectId, router]);

  const handleSubmit = async (finalAnswer?: string | string[]) => {
    if (!projectId || !currentQuestion || submitStartedRef.current) return;
    submitStartedRef.current = true;
    setSubmitting(true);
    const res = await fetch('/api/demo/clarification/submit', {
      method: 'POST',
      headers: getJsonAuthHeaders(),
      body: JSON.stringify({ projectId, questionId: currentQuestion.id, answer: finalAnswer ?? answer }),
    });
    const data = await res.json();
    if (data.code !== 200) {
      submitStartedRef.current = false;
      setSubmitting(false);
      setError(data.message || '提交失败');
      return;
    }
    setSession(data.data.session);
    setCurrentQuestion(data.data.currentQuestion);
    setProgress(data.data.progress);
    setQuestionHistory((data.data.session?.questions || []).filter((item: any) => item.round === data.data.session?.currentRound));
    setAnswer('');
    submitStartedRef.current = false;
    setSubmitting(false);
    setError(null);
    if (data.data.sessionComplete) {
      setSession(data.data.session);
      setSessionComplete(true);
      return;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#172554] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 pt-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              Demo 原型 · 初始化中
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">正在准备需求澄清</h1>
            <p className="text-gray-400">系统正在根据你的业务需求生成选择题，请稍候。</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: ClipboardList, title: '用户输入', desc: '输入原始业务需求', done: true, active: false },
              { icon: MessageSquareQuote, title: '问题澄清', desc: '生成并回答 10 个业务问题', done: false, active: true },
              { icon: Layers3, title: 'Spec 编写', desc: '自动整理结构化规格', done: false, active: false },
              { icon: CheckCircle2, title: '代码编写', desc: '生成 React 工程并接入 IDE', done: false, active: false },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`rounded-2xl border p-5 ${item.active ? 'border-sky-400/40 bg-sky-500/10 shadow-[0_0_30px_rgba(14,165,233,0.12)]' : item.done ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.active ? 'bg-sky-500/20 text-sky-300' : item.done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-gray-400'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs ${item.active ? 'text-sky-300' : item.done ? 'text-emerald-300' : 'text-gray-500'}`}>{item.done ? '已完成' : item.active ? '进行中' : '等待中'}</span>
                  </div>
                  <div className="text-lg font-semibold text-white mb-1">{item.title}</div>
                  <div className="text-sm text-gray-400 leading-6">{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const handleBackQuestion = () => {
    if (!currentQuestion || !questionHistory.length) return;
    const currentIndex = questionHistory.findIndex((item: any) => item.id === currentQuestion.id);
    if (currentIndex <= 0) return;
    const prevQuestion = questionHistory[currentIndex - 1];
    const prevAnswer = session?.answers?.find((item: any) => item.questionId === prevQuestion.id)?.answer;
    setCurrentQuestion(prevQuestion);
    setAnswer(prevAnswer || (prevQuestion.type === 'checkbox' ? [] : ''));
  };

  if (sessionComplete) {
    const completeCards = [
      { icon: ClipboardList, title: '用户输入', desc: '原始需求已确认', done: true, active: false },
      { icon: MessageSquareQuote, title: '问题澄清', desc: '10 个业务问题已完成', done: true, active: false },
      { icon: Layers3, title: 'Spec 编写', desc: '接下来自动生成结构化规格', done: false, active: true },
      { icon: CheckCircle2, title: '代码编写', desc: '随后自动进入代码生成', done: false, active: false },
    ];
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#172554] p-6">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              Demo 原型 · 澄清完成
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">需求澄清已完成</h1>
            <p className="text-gray-400">你可以补充描述，也可以直接自动进入 Spec 编写与代码生成。</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {completeCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`rounded-2xl border p-5 ${item.active ? 'border-sky-400/40 bg-sky-500/10' : item.done ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.active ? 'bg-sky-500/20 text-sky-300' : item.done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-gray-400'}`}><Icon className="w-5 h-5" /></div>
                    <span className={`text-xs ${item.active ? 'text-sky-300' : item.done ? 'text-emerald-300' : 'text-gray-500'}`}>{item.done ? '已完成' : item.active ? '进行中' : '等待中'}</span>
                  </div>
                  <div className="text-lg font-semibold text-white mb-1">{item.title}</div>
                  <div className="text-sm text-gray-400 leading-6">{item.desc}</div>
                </div>
              );
            })}
          </div>
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-white font-medium mb-3">补充描述</div>
              <textarea value={extraDescription} onChange={(e) => setExtraDescription(e.target.value)} placeholder="还想补充的业务细节、页面偏好、字段要求，都可以继续输入。" className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-500 outline-none resize-none mb-4" />
              <div className="flex gap-4">
                <button onClick={() => setSessionComplete(false)} className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">返回检查答案</button>
                <button onClick={() => {
                  const extra = extraDescription.trim();
                  if (extra && session?.summary) {
                    const mergedSession = {
                      ...session,
                      requirement: `${session.requirement}\n\n【补充描述】\n${extra}`,
                      summary: {
                        ...session.summary,
                        requirementHighlights: [...(session.summary.requirementHighlights || []), extra],
                        answerHighlights: [...(session.summary.answerHighlights || []), { question: '补充描述', answer: extra }],
                      },
                    };
                    setSession(mergedSession);
                    try {
                      sessionStorage.setItem(`demo-extra:${projectId}`, extra);
                    } catch {}
                    fetch('/api/demo/project/control', {
                      method: 'PATCH',
                      headers: getJsonAuthHeaders(),
                      body: JSON.stringify({ projectId, extraDescription: extra }),
                    }).catch(() => undefined);
                  }
                  setTimeout(() => router.push(`/demo/generate?projectId=${projectId}`), 300);
                }} className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors">进入下一步</button>
              </div>
            </div>
            <div>
              {session?.summary && <SummaryPreview summary={session.summary as DemoClarificationSummary} collapsed={false} extraContent={extraDescription ? <div><span className="text-gray-500 text-sm block mb-2">补充描述：</span><div className="text-sm text-gray-300 whitespace-pre-wrap">{extraDescription}</div></div> : undefined} />}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stageCards = [
    { icon: ClipboardList, title: '用户输入', desc: '已接收原始业务需求', done: true, active: false },
    { icon: MessageSquareQuote, title: '问题澄清', desc: '通过 10 个选择题收敛方案', done: false, active: true },
    { icon: Layers3, title: 'Spec 编写', desc: '自动整理结构化规格', done: false, active: false },
    { icon: CheckCircle2, title: '代码编写', desc: '生成 React 工程并接入 IDE', done: false, active: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#172554] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            Demo 原型 · 业务澄清阶段
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">需求澄清</h1>
          <p className="text-gray-400">问题会根据你的业务需求动态生成，但统一收敛为纯前端 React Demo</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {stageCards.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`rounded-2xl border p-5 ${item.active ? 'border-sky-400/40 bg-sky-500/10 shadow-[0_0_30px_rgba(14,165,233,0.12)]' : item.done ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.active ? 'bg-sky-500/20 text-sky-300' : item.done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-gray-400'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs ${item.active ? 'text-sky-300' : item.done ? 'text-emerald-300' : 'text-gray-500'}`}>{item.done ? '已完成' : item.active ? '进行中' : '等待中'}</span>
                </div>
                <div className="text-lg font-semibold text-white mb-1">{item.title}</div>
                <div className="text-sm text-gray-400 leading-6">{item.desc}</div>
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
          <div>
            {error && <div className="mb-6 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            {progress && <div className="mb-6"><ProgressIndicator progress={{ questionIndex: Math.max((progress.current || 1) - 1, 0), totalQuestions: progress.total, percentage: progress.percent, round: progress.round, maxRounds: 1 }} /></div>}
            {currentQuestion && <QuestionCard question={currentQuestion} answer={answer} onAnswerChange={setAnswer} onSubmit={handleSubmit} onBack={handleBackQuestion} canGoBack={questionHistory.findIndex((item: any) => item.id === currentQuestion.id) > 0} onSkip={() => handleSubmit(currentQuestion.type === 'checkbox' ? [] : '')} loading={submitting} />}
            {!currentQuestion && !sessionComplete && session?.status === 'completed' && (
              <div className="text-center rounded-2xl border border-white/10 bg-white/5 p-8">
                <div className="text-xl text-white mb-4">所有问题已回答完成</div>
                <button onClick={() => router.push(`/demo/generate?projectId=${projectId}`)} className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors">进入下一步：生成原型</button>
              </div>
            )}
          </div>
          <div>
            {session?.summary && <SummaryPreview summary={session.summary as DemoClarificationSummary} collapsed={false} extraContent={extraDescription ? <div><span className="text-gray-500 text-sm block mb-2">补充描述：</span><div className="text-sm text-gray-300 whitespace-pre-wrap">{extraDescription}</div></div> : undefined} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DemoRequirementPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0b1220] flex items-center justify-center text-white">加载中...</div>}><DemoRequirementContent /></Suspense>;
}
