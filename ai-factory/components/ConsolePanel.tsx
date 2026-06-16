'use client';

import { useState, useEffect, useRef } from 'react';

interface LogEntry {
  type: 'info' | 'error' | 'warn' | 'success';
  message: string;
  timestamp: Date;
}

interface ConsolePanelProps {
  logs: LogEntry[];
  onClear?: () => void;
}

export default function ConsolePanel({ logs, onClear }: ConsolePanelProps) {
  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  const getTypeColor = (type: LogEntry['type']): string => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-gray-300';
    }
  };

  const getTypeIcon = (type: LogEntry['type']): string => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">控制台</span>
          <select
            className="bg-[#3c3c3c] text-gray-300 text-xs px-2 py-1 rounded border-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">全部</option>
            <option value="info">信息</option>
            <option value="error">错误</option>
            <option value="warn">警告</option>
            <option value="success">成功</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-gray-400 text-xs">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            自动滚动
          </label>
          {onClear && (
            <button
              onClick={onClear}
              className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 hover:bg-[#3c3c3c] rounded"
            >
              清空
            </button>
          )}
        </div>
      </div>

      {/* 日志内容 */}
      <div ref={containerRef} className="flex-1 overflow-auto p-2 font-mono text-sm">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-4">暂无日志</div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 py-1 ${getTypeColor(log.type)}`}
            >
              <span className="flex-shrink-0">{getTypeIcon(log.type)}</span>
              <span className="flex-1 whitespace-pre-wrap break-all">{log.message}</span>
              <span className="flex-shrink-0 text-gray-500 text-xs">
                {log.timestamp.toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}