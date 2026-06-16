'use client';

import type { DemoStreamEvent } from '@/types/demo-events';
import { cn } from '@/lib/utils';

interface StreamLogProps {
  events: DemoStreamEvent[];
}

function getFileActionText(event: DemoStreamEvent): string | null {
  if (event.kind === 'file_op') {
    const path = event.data.path || '';
    const action = event.data.action || '';
    const fileName = path.split('/').pop() || path;
    if (action === 'write') return `写入 ${fileName}`;
    if (action === 'edit') return `修改 ${fileName}`;
    return `${action} ${fileName}`;
  }
  if (event.kind === 'tool_use') {
    const name = event.data.name || '';
    const input = event.data.input || {};
    if (['Write', 'Edit', 'WriteText'].includes(name) && input.path) {
      const fileName = input.path.split('/').pop() || input.path;
      return name === 'Write' ? `写入 ${fileName}` : `修改 ${fileName}`;
    }
    if (name === 'Bash' && input.command) {
      const cmd = String(input.command).slice(0, 60);
      return `执行: ${cmd}`;
    }
    return `调用 ${name}`;
  }
  return null;
}

function getEventColor(event: DemoStreamEvent): string {
  if (event.kind === 'error') return 'text-red-400';
  if (event.kind === 'file_op' && event.data.action === 'write') return 'text-emerald-400';
  if (event.kind === 'tool_use') {
    const name = event.data.name || '';
    if (['Write', 'WriteText'].includes(name)) return 'text-emerald-400';
    if (['Edit'].includes(name)) return 'text-blue-400';
    return 'text-gray-300';
  }
  if (event.kind === 'status') return 'text-sky-300';
  if (event.kind === 'artifact_ready') return 'text-amber-400';
  return 'text-gray-400';
}

function getEventIcon(event: DemoStreamEvent): string {
  if (event.kind === 'status') return '⚡';
  if (event.kind === 'file_op' || (event.kind === 'tool_use' && ['Write', 'Edit', 'WriteText'].includes(event.data.name))) return '📝';
  if (event.kind === 'tool_use') return '🔧';
  if (event.kind === 'artifact_ready') return '🎨';
  if (event.kind === 'done') return '✅';
  if (event.kind === 'error') return '❌';
  return '·';
}

export function StreamLog({ events }: StreamLogProps) {
  const displayEvents = events.filter((e) => {
    // Filter out pure text events (too noisy) and result events
    return ['status', 'tool_use', 'file_op', 'artifact_ready', 'error', 'done'].includes(e.kind);
  });

  if (displayEvents.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 max-h-64 overflow-y-auto">
      <div className="text-xs font-medium text-gray-400 mb-3">生成日志</div>
      <div className="space-y-1 font-mono text-xs">
        {displayEvents.map((event) => (
          <div
            key={event.id}
            className={cn(
              'flex items-start gap-2 py-1',
              getEventColor(event)
            )}
          >
            <span className="shrink-0 opacity-60">{getEventIcon(event)}</span>
            <span className="opacity-40 w-16 shrink-0">
              {new Date(event.ts).toLocaleTimeString()}
            </span>
            <span className="truncate">
              {getFileActionText(event) || event.kind}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
