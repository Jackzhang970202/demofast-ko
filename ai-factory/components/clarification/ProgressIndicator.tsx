'use client';

import type { ClarificationProgress } from '@/types';

interface ProgressIndicatorProps {
  progress: ClarificationProgress;
}

export default function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  const { questionIndex, totalQuestions, percentage } = progress;

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      {/* 进度显示 */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-400 text-sm">问题进度</span>
        <span className="text-gray-400 text-sm">
          {questionIndex + 1}/{totalQuestions}
        </span>
      </div>

      {/* 进度条 */}
      <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}