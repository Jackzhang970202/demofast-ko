'use client';

import { CheckCircle2, Loader2, Sparkles, Code2, CheckCircle } from 'lucide-react';
import type { DemoStreamEvent } from '@/types/demo-events';
import { cn } from '@/lib/utils';

interface GenerationStageCardProps {
  events: DemoStreamEvent[];
}

type StageStatus = 'pending' | 'running' | 'done';

interface StageInfo {
  key: string;
  label: string;
  desc: string;
  icon: typeof Sparkles;
  status: StageStatus;
}

function deriveStages(events: DemoStreamEvent[]): [StageInfo[], string, string, { done: number; total: number } | null] {
  const stages: StageInfo[] = [
    { key: 'understand', label: '理解需求', desc: '分析需求与模板匹配', icon: Sparkles, status: 'pending' },
    { key: 'generate', label: '生成代码', desc: '编写 React 前端工程', icon: Code2, status: 'pending' },
    { key: 'complete', label: '整理输出', desc: '确定主产物与预览', icon: CheckCircle, status: 'pending' },
  ];

  let currentAction = '';
  let thinkingSnippet = '';
  let fileCount = 0;
  const writtenFiles = new Set<string>();
  const done = events.some((e) => e.kind === 'done');

  for (const event of events) {
    if (event.kind === 'status') {
      const label = event.data.label || '';
      if (['matching', 'spec', 'spec-generating'].includes(label)) {
        stages[0].status = 'running';
      }
      if (['demo-developer', 'code-generating'].includes(label)) {
        stages[0].status = 'done';
        stages[1].status = 'running';
      }
      if (label === 'completed') {
        stages[1].status = 'done';
        stages[2].status = 'done';
      }
    }

    if (event.kind === 'tool_use') {
      const name = event.data.name || '';
      const input = event.data.input || {};
      if (['Write', 'Edit', 'WriteText', 'Bash'].includes(name)) {
        stages[0].status = 'done';
        stages[1].status = 'running';
        if (input.path) {
          writtenFiles.add(input.path);
          currentAction = `正在写 ${input.path.split('/').pop() || input.path}`;
        }
        fileCount = writtenFiles.size;
      }
    }

    if (event.kind === 'text' || event.kind === 'thinking') {
      const text = event.data.text || '';
      if (text.trim() && !thinkingSnippet) {
        thinkingSnippet = text.slice(0, 120);
      }
    }

    if (event.kind === 'artifact_ready') {
      stages[2].status = 'running';
    }
  }

  if (done) {
    stages.forEach((s) => (s.status = 'done'));
  }

  // If nothing happened yet, first stage is running
  if (stages.every((s) => s.status === 'pending')) {
    stages[0].status = 'running';
  }

  const progress = done ? null : fileCount > 0 ? { done: fileCount, total: fileCount + 3 } : null;

  return [stages, currentAction, thinkingSnippet, progress];
}

export function GenerationStageCard({ events }: GenerationStageCardProps) {
  const [stages, currentAction, thinkingSnippet, progress] = deriveStages(events);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-gray-300">生成进度</div>
        {events.length > 0 && (
          <div className="text-xs text-gray-500">
            {events.length} 个事件
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const isRunning = stage.status === 'running';
          const isDone = stage.status === 'done';
          return (
            <div
              key={stage.key}
              className={cn(
                'rounded-xl border p-4 transition-all',
                isRunning
                  ? 'border-sky-400/40 bg-sky-500/10 shadow-[0_0_20px_rgba(14,165,233,0.1)]'
                  : isDone
                    ? 'border-emerald-400/30 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5'
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    isRunning
                      ? 'bg-sky-500/20 text-sky-300'
                      : isDone
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-white/10 text-gray-500'
                  )}
                >
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px]',
                    isRunning ? 'text-sky-300' : isDone ? 'text-emerald-300' : 'text-gray-500'
                  )}
                >
                  {isDone ? '完成' : isRunning ? '进行中' : '等待中'}
                </span>
              </div>
              <div className="text-sm font-medium">{stage.label}</div>
              <div className="text-xs text-gray-400 mt-1">{stage.desc}</div>
            </div>
          );
        })}
      </div>

      {progress && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>已生成文件</span>
            <span>{progress.done} / ~{progress.total}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (progress.done / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {currentAction && (
        <div className="text-xs text-sky-300 mb-2 flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          {currentAction}
        </div>
      )}

      {thinkingSnippet && !currentAction && (
        <div className="text-xs text-gray-500 italic truncate">{thinkingSnippet}</div>
      )}
    </div>
  );
}
