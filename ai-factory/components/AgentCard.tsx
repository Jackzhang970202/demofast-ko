'use client';

interface Agent {
  id: string;
  name: string;
  color: string;
  description: string;
  displayType: 'text' | 'code' | 'progress';
  status: 'inactive' | 'active' | 'completed';
  progress: number;
}

interface AgentCardProps {
  agent: Agent;
  content?: string;
}

export default function AgentCard({ agent, content }: AgentCardProps) {
  const statusIcon = {
    inactive: '⏳',
    active: '🔄',
    completed: '✅',
  };

  return (
    <div
      className={`agent-card ${agent.status}`}
      style={{ borderColor: agent.status === 'active' ? agent.color : undefined }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
          >
            {statusIcon[agent.status]}
          </div>
          <span className="font-medium text-white text-sm">{agent.name}</span>
        </div>
      </div>

      {/* 描述 */}
      <p className="text-gray-400 text-xs mb-3">{agent.description}</p>

      {/* 进度条 */}
      {agent.displayType === 'progress' && agent.status === 'active' && (
        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{
              width: `${agent.progress}%`,
              background: `linear-gradient(90deg, ${agent.color}, ${agent.color}aa)`
            }}
          />
        </div>
      )}

      {/* 内容显示 */}
      {agent.status === 'active' && content && (
        <div className="mt-3 p-2 bg-gray-900/50 rounded text-xs text-gray-300 max-h-32 overflow-hidden">
          {agent.displayType === 'code' ? (
            <pre className="font-mono whitespace-pre-wrap">{content}</pre>
          ) : (
            <p className="line-clamp-4">{content}</p>
          )}
        </div>
      )}
    </div>
  );
}