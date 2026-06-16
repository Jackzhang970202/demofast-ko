'use client';

import type { RequirementSummary } from '@/types';
import type { DemoClarificationSummary } from '@/types/workflow';

interface SummaryPreviewProps {
  summary: RequirementSummary | DemoClarificationSummary | null;
  collapsed?: boolean;
  extraContent?: React.ReactNode;
}

import { useState } from 'react';

function isDemoSummary(summary: RequirementSummary | DemoClarificationSummary): summary is DemoClarificationSummary {
  return 'businessGoal' in summary;
}

export default function SummaryPreview({ summary, collapsed = false, extraContent }: SummaryPreviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  if (!summary) {
    return (
      <div className="bg-white/5 rounded-xl border border-white/10 p-4">
        <div className="text-gray-400 text-sm">需求摘要将在回答问题后生成...</div>
      </div>
    );
  }

  // Demo 类型的摘要展示
  if (isDemoSummary(summary)) {
    return (
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
        >
          <h3 className="text-lg font-medium text-white">📋 需求摘要</h3>
          <span className="text-gray-400">{isCollapsed ? '展开' : '收起'}</span>
        </button>

        {!isCollapsed && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <span className="text-gray-500 text-sm">项目名称：</span>
              <span className="text-white">{summary.projectName}</span>
            </div>
            <div>
              <span className="text-gray-500 text-sm">业务目标：</span>
              <span className="text-white">{summary.businessGoal}</span>
            </div>
            {summary.targetUsers.length > 0 && (
              <div>
                <span className="text-gray-500 text-sm">目标用户：</span>
                <span className="text-gray-300 text-sm">{summary.targetUsers.join('、')}</span>
              </div>
            )}
            {summary.coreModules.length > 0 && (
              <div>
                <span className="text-gray-500 text-sm block mb-2">核心模块：</span>
                <div className="flex flex-wrap gap-1">
                  {summary.coreModules.map((m, i) => (
                    <span key={i} className="px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded text-xs">{m}</span>
                  ))}
                </div>
              </div>
            )}
            {summary.entities.length > 0 && (
              <div>
                <span className="text-gray-500 text-sm block mb-2">数据实体：</span>
                <div className="flex flex-wrap gap-1">
                  {summary.entities.map((e, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">{e.name}</span>
                  ))}
                </div>
              </div>
            )}
            {summary.visualStyle && (
              <div>
                <span className="text-gray-500 text-sm">视觉风格：</span>
                <span className="text-gray-300 text-sm">{summary.visualStyle}</span>
              </div>
            )}
            {extraContent}
          </div>
        )}
      </div>
    );
  }

  // 标准工厂类型的摘要展示
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      {/* 标题栏 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <h3 className="text-lg font-medium text-white">📋 需求摘要</h3>
        <span className="text-gray-400">{isCollapsed ? '展开' : '收起'}</span>
      </button>

      {/* 内容区 */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-4">
          {/* 目标用户 */}
          <div>
            <span className="text-gray-500 text-sm">目标用户：</span>
            <span className="text-white">{summary.targetUser}</span>
          </div>

          {/* 核心问题 */}
          <div>
            <span className="text-gray-500 text-sm">核心问题：</span>
            <span className="text-white">{summary.coreProblem}</span>
          </div>

          {/* 功能范围 */}
          <div>
            <span className="text-gray-500 text-sm block mb-2">功能范围：</span>
            <div className="space-y-1">
              {summary.features.phase1.length > 0 && (
                <div>
                  <span className="text-green-400 text-xs">第一期：</span>
                  <span className="text-gray-300 text-sm">
                    {summary.features.phase1.map(f => f.name).join('、')}
                  </span>
                </div>
              )}
              {summary.features.phase2.length > 0 && (
                <div>
                  <span className="text-yellow-400 text-xs">第二期：</span>
                  <span className="text-gray-300 text-sm">
                    {summary.features.phase2.map(f => f.name).join('、')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 成功标准 */}
          {summary.successCriteria.length > 0 && (
            <div>
              <span className="text-gray-500 text-sm block mb-2">成功标准：</span>
              <ul className="text-gray-300 text-sm space-y-1">
                {summary.successCriteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}