'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, CheckCircle2, Code2, FileText, Layers3, Loader2 } from 'lucide-react';
import { getGenerateProgress, getGenerateStage, getGenerateStageLabel, getGenerateStageMessage, getGenerateStageWidthClass, getGenerateStepStatus, getGenerateSubStepTitle } from '@/types/workflow';
import { getAuthHeaders, getJsonAuthHeaders } from '@/lib/auth-client';

interface DemoGenerateResult {
  projectId: string;
  templateId?: string;
  specFile?: string;
  files?: string[];
  output?: string;
}

interface DemoProjectStateResponse {
  code: number;
  data?: {
    projectId: string;
    phase: string;
    phaseData?: {
      templateId?: string;
      specFile?: string;
      generatedFiles?: string[];
    };
    executionState?: {
      status?: string;
      currentStage?: string;
      error?: string;
    };
    executionSummary?: {
      lastCheckpoint?: string;
    };
  };
}

function buildResultFromState(data?: DemoProjectStateResponse['data']): DemoGenerateResult | null {
  if (!data?.projectId) return null;
  return {
    projectId: data.projectId,
    templateId: data.phaseData?.templateId,
    specFile: data.phaseData?.specFile || 'spec/requirement.md',
    files: data.phaseData?.generatedFiles || [],
  };
}

function mergeResult(prev: DemoGenerateResult | null, next: DemoGenerateResult | null): DemoGenerateResult | null {
  if (!prev) return next;
  if (!next) return prev;
  return {
    ...prev,
    ...next,
    files: next.files?.length ? next.files : prev.files,
    output: next.output ?? prev.output,
  };
}

function hasRenderableResult(result: DemoGenerateResult | null) {
  return !!result?.projectId;
}

function normalizeStateResponse(raw: any): DemoProjectStateResponse {
  return raw || { code: 500 };
}

function applyStateSnapshot(
  data: DemoProjectStateResponse['data'],
  setCheckpointMessage: (value: string) => void,
  setStage: (value: 'matching' | 'spec' | 'delivering' | 'completed') => void,
  setStageMessage: (value: string) => void,
  setResult: React.Dispatch<React.SetStateAction<DemoGenerateResult | null>>,
) {
  const executionState = data?.executionState;
  const lastCheckpoint = data?.executionSummary?.lastCheckpoint || '';
  const phase = data?.phase as any;
  const nextStage = getGenerateStage(phase, executionState);
  setCheckpointMessage(lastCheckpoint);
  setStage(nextStage);
  setStageMessage(getGenerateStageMessage(phase, lastCheckpoint, executionState));
  setResult(prev => mergeResult(prev, buildResultFromState(data)));
  return { executionState, phase };
}

function shouldShowCompletedView(loading: boolean, error: string | null, stage: 'matching' | 'spec' | 'delivering' | 'completed', result: DemoGenerateResult | null) {
  return !loading && !error && (stage === 'completed' || hasRenderableResult(result));
}

function shouldKeepLoading(phase: string | undefined, executionStatus: string | undefined) {
  return phase !== 'COMPLETED' && executionStatus !== 'error' && executionStatus !== 'completed';
}

function shouldStopForError(executionStatus: string | undefined) {
  return executionStatus === 'error';
}

function shouldStopForCompleted(phase: string | undefined, executionStatus: string | undefined) {
  return phase === 'COMPLETED' || executionStatus === 'completed';
}

function buildCompletionMessage() {
  return 'Spec 与代码已生成完成';
}

function buildGenerateError(err: any) {
  return err?.message || '生成失败';
}

function getResultTemplateLabel(result: DemoGenerateResult | null) {
  return result?.templateId || 'admin';
}

function getResultSpecLabel(result: DemoGenerateResult | null) {
  return result?.specFile || 'spec/requirement.md';
}

function getResultFileCount(result: DemoGenerateResult | null) {
  return result?.files?.length || 0;
}

function getResultOutput(result: DemoGenerateResult | null) {
  return result?.output ? String(result.output).slice(0, 2000) : '';
}

function hasResultOutput(result: DemoGenerateResult | null) {
  return !!result?.output;
}

function resetGenerateView(
  setError: (value: string | null) => void,
  setResult: (value: DemoGenerateResult | null) => void,
  setStage: (value: 'matching' | 'spec' | 'delivering' | 'completed') => void,
  setStageMessage: (value: string) => void,
  setCheckpointMessage: (value: string) => void,
  setLoading: (value: boolean) => void,
) {
  setError(null);
  setResult(null);
  setStage('matching');
  setStageMessage('正在准备模板匹配...');
  setCheckpointMessage('');
  setLoading(true);
}

function retryGenerate(
  projectId: string,
  setError: (value: string | null) => void,
  setResult: (value: DemoGenerateResult | null) => void,
  setStage: (value: 'matching' | 'spec' | 'delivering' | 'completed') => void,
  setStageMessage: (value: string) => void,
  setCheckpointMessage: (value: string) => void,
  setLoading: (value: boolean) => void,
  requestStartedRef: React.MutableRefObject<boolean>,
  pollRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  router: any,
) {
  // 清理旧的轮询
  if (pollRef.current) {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }
  requestStartedRef.current = false;
  resetGenerateView(setError, setResult, setStage, setStageMessage, setCheckpointMessage, setLoading);

  // 直接调用生成 API
  fetch('/api/demo/generate', {
    method: 'POST',
    headers: getJsonAuthHeaders(),
    body: JSON.stringify({ projectId }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.code !== 200) {
        setError(data.message || '重试失败');
        setLoading(false);
        return;
      }
      setResult(prev => mergeResult(prev, data.data));
    })
    .catch((err: any) => {
      setError(err?.message || '重试失败');
      setLoading(false);
    });

  // 启动轮询同步状态
  pollRef.current = setInterval(async () => {
    try {
      const res = await fetch(`/api/demo/project/state?projectId=${projectId}`, {
        headers: getAuthHeaders(),
      });
      const raw = await res.json();
      const data = normalizeStateResponse(raw).data;
      const executionState = data?.executionState;
      const phase = data?.phase;

      if (executionState?.status === 'error') {
        setError(executionState?.error || '生成失败');
        setLoading(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return;
      }

      if (phase === 'COMPLETED' || executionState?.status === 'completed') {
        setStage('completed');
        setStageMessage(buildCompletionMessage());
        setLoading(false);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        return;
      }

      applyStateSnapshot(data, setCheckpointMessage, setStage, setStageMessage, setResult);
    } catch {}
  }, 5000);
}

function DemoGenerateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<DemoGenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'matching' | 'spec' | 'delivering' | 'completed'>('matching');
  const [stageMessage, setStageMessage] = useState('正在准备模板匹配...');
  const [checkpointMessage, setCheckpointMessage] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const requestStartedRef = useRef(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    requestStartedRef.current = false;
    runIdRef.current += 1;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      router.push('/demo/workspace');
      return;
    }

    const currentRunId = runIdRef.current;

    const isStale = () => currentRunId !== runIdRef.current;

    const syncState = async (finishWhenCompleted = false) => {
      const res = await fetch(`/api/demo/project/state?projectId=${projectId}`, {
        headers: getAuthHeaders(),
      });
      const raw = await res.json();
      const data = normalizeStateResponse(raw).data;
      const { executionState, phase } = applyStateSnapshot(data, setCheckpointMessage, setStage, setStageMessage, setResult);

      if (shouldStopForError(executionState?.status)) {
        if (!isStale()) {
          setError(executionState?.error || '生成失败');
          setLoading(false);
        }
        return true;
      }

      if (shouldStopForCompleted(phase, executionState?.status)) {
        if (!isStale()) {
          setStage('completed');
          setStageMessage(buildCompletionMessage());
          setLoading(false);
        }
        return finishWhenCompleted;
      }

      return false;
    };

    const startPolling = () => {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        try {
          const finished = await syncState(true);
          if (finished && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } catch {}
      }, 5000);
    };

    const requestGenerate = async () => {
      console.log('[Demo Generate Page] requestGenerate:start', { projectId });
      const res = await fetch('/api/demo/generate', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      console.log('[Demo Generate Page] requestGenerate:done', { projectId, code: data.code, message: data.message });
      if (data.code !== 200) {
        throw new Error(data.message || '生成失败');
      }
      if (!isStale()) {
        setResult(prev => mergeResult(prev, data.data));
      }
    };

    const run = async () => {
      try {
        const finished = await syncState(false);
        console.log('[Demo Generate Page] run:afterSync', { projectId, finished, isStale: isStale() });
        if (finished || isStale()) return;

        startPolling();

        const stateRes = await fetch(`/api/demo/project/state?projectId=${projectId}`, {
          headers: getAuthHeaders(),
        });
        const stateRaw = await stateRes.json();
        const stateData = normalizeStateResponse(stateRaw).data;
        const alreadyRunning = !!stateData?.executionState?.status;
        console.log('[Demo Generate Page] run:stateCheck', {
          projectId,
          phase: stateData?.phase,
          executionStatus: stateData?.executionState?.status,
          executionStage: stateData?.executionState?.currentStage,
          alreadyRunning,
        });

        if (alreadyRunning || requestStartedRef.current || isStale()) {
          return;
        }

        requestStartedRef.current = true;
        await requestGenerate();

        if (!isStale()) {
          await syncState(true);
        }
      } catch (err: any) {
        if (!isStale()) {
          setError(buildGenerateError(err));
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      runIdRef.current += 1;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [projectId, router]);

  if (loading) {
    const steps = [
      { icon: FileText, title: '用户输入', desc: '原始需求已确认', status: 'done' },
      { icon: CheckCircle2, title: '问题澄清', desc: '业务澄清已完成', status: 'done' },
      { icon: Layers3, title: 'Spec 编写', desc: '生成结构化规格', status: getGenerateStepStatus('spec', stage) },
      { icon: Code2, title: '代码编写', desc: '调用 AI 编写 React 前端工程', status: getGenerateStepStatus('code', stage) },
    ] as const;

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#172554] p-6 text-white">
        <div className="max-w-5xl mx-auto pt-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-sm mb-4">
              <Sparkles className="w-4 h-4" />
              Demo 原型生成中
            </div>
            <h1 className="text-3xl font-bold mb-3">正在构建你的纯前端 Demo</h1>
            <p className="text-gray-400">生成过程会自动完成模板匹配、规格整理、工程输出与 IDE 接入</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const active = step.status === 'active';
              const done = step.status === 'done';
              return (
                <div key={step.title} className={`rounded-2xl border p-5 ${active ? 'border-sky-400/40 bg-sky-500/10 shadow-[0_0_30px_rgba(14,165,233,0.15)]' : done ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-sky-500/20 text-sky-300' : done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-gray-400'}`}>
                      {active ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <span className={`text-xs ${active ? 'text-sky-300' : done ? 'text-emerald-300' : 'text-gray-500'}`}>{done ? '已完成' : active ? '进行中' : '等待中'}</span>
                  </div>
                  <div className="text-lg font-semibold mb-1">{index + 1}. {step.title}</div>
                  <div className="text-sm text-gray-400 leading-6">{step.desc}</div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
              <span>整体进度</span>
              <span>{getGenerateProgress(stage)}%</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-4">
              <div className={`h-full bg-gradient-to-r from-sky-500 to-blue-600 ${getGenerateStageWidthClass(stage)}`} />
            </div>
            <div className="text-sm text-gray-300 mb-3">{stageMessage}</div>
            <div className="text-xs text-sky-300 mb-2">当前后端阶段：{getGenerateStageLabel(stage)}</div>
            {checkpointMessage && <div className="text-xs text-gray-400 rounded-lg bg-black/20 border border-white/5 px-3 py-2 mb-3">{checkpointMessage}</div>}
            <div className="text-xs text-gray-500">后端会持续输出 Claudeck 的工具调用、读取、写入与阶段推进日志；一旦进入 demo-developer，前端会切到第 4 阶段。</div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 mt-3">
              <div className="text-xs text-gray-400 mb-3">{getGenerateSubStepTitle(stage)}</div>
              <div className="grid md:grid-cols-2 gap-3 text-xs text-gray-300">
                <div className={`rounded-lg border px-3 py-2 ${stage === 'matching' ? 'border-sky-400/30 bg-sky-500/10 text-sky-300' : stage === 'spec' || stage === 'delivering' || stage === 'completed' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-black/20'}`}>阶段 3-1：模板匹配</div>
                <div className={`rounded-lg border px-3 py-2 ${stage === 'spec' ? 'border-sky-400/30 bg-sky-500/10 text-sky-300' : stage === 'delivering' || stage === 'completed' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-white/10 bg-black/20'}`}>阶段 3-2：Spec 编写</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-6">
        <div className="text-center max-w-xl">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          {checkpointMessage && <div className="mb-4 text-sm text-gray-400">最后进度：{checkpointMessage}</div>}
          <div className="flex justify-center gap-4">
            <button onClick={() => retryGenerate(projectId!, setError, setResult, setStage, setStageMessage, setCheckpointMessage, setLoading, requestStartedRef, pollRef, router)} className="px-6 py-3 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors">重试当前步骤</button>
            <button onClick={() => router.push(`/demo/requirement?projectId=${projectId}`)} className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">返回上一阶段</button>
          </div>
        </div>
      </div>
    );
  }

  if (!shouldShowCompletedView(loading, error, stage, result)) {
    return null;
  }

  const steps = [
    { icon: FileText, title: '用户输入', desc: '原始需求已确认', status: 'done' },
    { icon: CheckCircle2, title: '问题澄清', desc: '业务澄清已完成', status: 'done' },
    { icon: Layers3, title: 'Spec 编写', desc: '结构化规格已完成', status: 'done' },
    { icon: Code2, title: '代码编写', desc: 'React 工程已生成完成', status: 'done' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#172554] p-6">
      <div className="max-w-5xl mx-auto text-white">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-sm mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Demo 原型 · 交付完成
          </div>
          <h1 className="text-3xl font-bold mb-3">Demo 已生成完成</h1>
          <p className="text-gray-400">第 3 个大阶段 Spec 编写与第 4 个大阶段代码编写都已完成，现在可以进入 IDE 继续修改。</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-2xl border p-5 border-emerald-400/30 bg-emerald-500/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-emerald-300">已完成</span>
                </div>
                <div className="text-lg font-semibold mb-1">{index + 1}. {step.title}</div>
                <div className="text-sm text-gray-300 leading-6">{step.desc}</div>
              </div>
            );
          })}
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-400">项目 ID：</span>{result?.projectId}</div>
            <div><span className="text-gray-400">模板：</span>{getResultTemplateLabel(result)}</div>
            <div><span className="text-gray-400">Spec：</span>{getResultSpecLabel(result)}</div>
            <div><span className="text-gray-400">文件数：</span>{getResultFileCount(result)}</div>
          </div>
          {checkpointMessage && <div className="mt-4 text-sm text-emerald-300">当前状态：{checkpointMessage}</div>}
          <div className="mt-4 grid md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-300">1. 用户输入</div>
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-300">2. 问题澄清</div>
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-300">3. Spec 编写（含模板匹配）</div>
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-emerald-300">4. 代码编写</div>
          </div>
          {hasResultOutput(result) && <div className="mt-4 rounded-xl bg-black/20 border border-white/5 p-4 text-xs text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">{getResultOutput(result)}</div>}
        </div>
        <div className="flex gap-4 justify-center">
          <button onClick={() => router.push(`/demo/ide?project=${projectId}`)} className="px-6 py-3 bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors">进入 Demo IDE</button>
          <button onClick={() => router.push('/demo/workspace')} className="px-6 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">返回工作区</button>
          <button onClick={() => { requestStartedRef.current = false; resetGenerateView(setError, setResult, setStage, setStageMessage, setCheckpointMessage, setLoading); router.refresh(); }} className="px-6 py-3 bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors">重新生成</button>
        </div>
      </div>
    </div>
  );
}

export default function DemoGeneratePage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0b1220] flex items-center justify-center text-white">加载中...</div>}><DemoGenerateContent /></Suspense>;
}
