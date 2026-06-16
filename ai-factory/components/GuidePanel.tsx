'use client';

import { useRouter } from 'next/navigation';

interface GuidePanelProps {
  message: string;
  nextRoute?: string;
  nextLabel?: string;
  onBack?: () => void;
}

export default function GuidePanel({ message, nextRoute, nextLabel, onBack }: GuidePanelProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          {/* 图标 */}
          <div className="text-5xl mb-4">⚠️</div>

          {/* 消息 */}
          <p className="text-gray-300 mb-6">{message}</p>

          {/* 按钮组 */}
          <div className="flex gap-3 justify-center">
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                ← 返回
              </button>
            )}
            {nextRoute && (
              <button
                onClick={() => router.push(nextRoute)}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                {nextLabel || '继续'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}