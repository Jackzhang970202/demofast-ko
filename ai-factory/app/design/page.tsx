'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AgentCard from '@/components/AgentCard';
import { getJsonAuthHeaders } from '@/lib/auth-client';

interface Agent {
  id: string;
  name: string;
  color: string;
  description: string;
  displayType: 'text' | 'code' | 'progress';
  status: 'inactive' | 'active' | 'completed';
  progress: number;
  duration: number;
  activeMsg: string;
}

interface DesignData {
  title: string;
  techStack: {
    frontend: string[];
    backend: string[];
    ui: string[];
  };
  modules: Array<{ id: string; name: string; icon: string }>;
  features: string[];
  designStyle: string;
}

const defaultAgents: Agent[] = [
  { id: 'pm', name: '产品经理', color: '#3b82f6', description: '需求分析·规格文档', displayType: 'text', status: 'inactive', progress: 0, duration: 8000, activeMsg: '正在分析需求...' },
  { id: 'uiue', name: 'UI/UE设计', color: '#a855f7', description: '界面设计·风格主题', displayType: 'progress', status: 'inactive', progress: 0, duration: 6000, activeMsg: '正在设计界面...' },
  { id: 'architect', name: '架构师', color: '#14b8a6', description: '系统架构设计', displayType: 'text', status: 'inactive', progress: 0, duration: 7000, activeMsg: '正在规划架构...' },
  { id: 'developer', name: '开发工程师', color: '#22c55e', description: '代码自动生成', displayType: 'code', status: 'inactive', progress: 0, duration: 12000, activeMsg: '正在生成代码...' },
];

export default function DesignPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [agentContents, setAgentContents] = useState<Record<string, string>>({});
  const [design, setDesign] = useState<DesignData | null>(null);
  const [showRunButton, setShowRunButton] = useState(false);
  const [requirement, setRequirement] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [overallProgress, setOverallProgress] = useState(0);
  const [codeGenerated, setCodeGenerated] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);

  // 加载数据
  useEffect(() => {
    const req = sessionStorage.getItem('requirement');
    const ans = sessionStorage.getItem('answers');

    if (!req) {
      router.push('/');
      return;
    }

    setRequirement(req);
    if (ans) setAnswers(JSON.parse(ans));

    // 生成设计
    generateDesign(req, ans ? JSON.parse(ans) : {});
  }, [router]);

  // 清理定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      intervalsRef.current.forEach(i => clearInterval(i));
    };
  }, []);

  // 生成设计
  const generateDesign = async (req: string, ans: Record<string, any>) => {
    try {
      const res = await fetch('/api/generate/design', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ requirement: req, answers: ans }),
      });

      const data = await res.json();
      if (data.code === 200 && data.data?.design) {
        setDesign(data.data.design);
        sessionStorage.setItem('design', JSON.stringify(data.data.design));
      } else {
        const defaultDesign: DesignData = {
          title: '智能管理系统',
          techStack: {
            frontend: ['Next.js 14', 'TypeScript', 'Tailwind CSS'],
            backend: ['Next.js API Routes', 'SQLite'],
            ui: ['响应式设计', '现代风格'],
          },
          modules: [
            { id: 'dashboard', name: '仪表盘', icon: '📊' },
            { id: 'users', name: '用户管理', icon: '👥' },
            { id: 'data', name: '数据管理', icon: '📁' },
            { id: 'settings', name: '系统设置', icon: '⚙️' },
          ],
          features: ['数据管理', '用户认证', '权限控制', '响应式布局'],
          designStyle: '现代简约风格',
        };
        setDesign(defaultDesign);
        sessionStorage.setItem('design', JSON.stringify(defaultDesign));
      }
    } catch (err) {
      console.error('Generate design error:', err);
    }

    // 开始智能体展示
    startAgentShowcase();
  };

  // 智能体展示
  const startAgentShowcase = () => {
    let delay = 500;
    let completedCount = 0;

    agents.forEach((agent, index) => {
      const timer = setTimeout(() => activateAgent(agent, index, () => {
        completedCount++;
        setOverallProgress((completedCount / agents.length) * 100);

        if (completedCount === agents.length) {
          // 所有智能体完成后，开始生成代码
          startCodeGeneration();
        }
      }), delay);
      timersRef.current.push(timer);
      delay += agent.duration + 1500;
    });
  };

  // 激活智能体
  const activateAgent = (agent: Agent, index: number, onComplete: () => void) => {
    setAgents(prev => prev.map((a, i) => i === index ? { ...a, status: 'active' } : a));

    const content = getAgentContent(agent);
    let charIndex = 0;
    const charsPerTick = Math.max(1, Math.ceil(content.length / (agent.duration / 40)));

    setAgentContents(prev => ({ ...prev, [agent.id]: '' }));

    const interval = setInterval(() => {
      if (charIndex < content.length) {
        charIndex = Math.min(charIndex + charsPerTick, content.length);
        setAgentContents(prev => ({ ...prev, [agent.id]: content.substring(0, charIndex) }));
        const progress = (charIndex / content.length) * 100;
        setAgents(prev => prev.map((a, i) => i === index ? { ...a, progress } : a));
      } else {
        clearInterval(interval);
        setAgents(prev => prev.map((a, i) => i === index ? { ...a, status: 'completed', progress: 100 } : a));
        onComplete();
      }
    }, 40);

    intervalsRef.current.push(interval);
  };

  // 开始生成代码
  const startCodeGeneration = async () => {
    setGeneratingCode(true);

    try {
      const res = await fetch('/api/generate/code', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          requirement,
          answers,
          design,
        }),
      });

      const data = await res.json();

      if (data.code === 200 && data.data) {
        // 保存projectId到sessionStorage
        sessionStorage.setItem('projectId', data.data.projectId);
        sessionStorage.setItem('generatedFiles', JSON.stringify(data.data.files));
        setCodeGenerated(true);

        // 更新developer智能体内容
        setAgentContents(prev => ({
          ...prev,
          developer: prev.developer + `\n\n✅ 代码生成完成！共 ${data.data.files?.length || 0} 个文件`,
        }));
      } else {
        throw new Error(data.message || '代码生成失败');
      }
    } catch (err: any) {
      console.error('Code generation error:', err);
      setAgentContents(prev => ({
        ...prev,
        developer: prev.developer + `\n\n⚠️ 代码生成遇到问题，将使用模板`,
      }));
    } finally {
      setGeneratingCode(false);
      // 显示进入按钮
      setTimeout(() => setShowRunButton(true), 500);
    }
  };

  // 获取智能体内容
  const getAgentContent = (agent: Agent): string => {
    switch (agent.id) {
      case 'pm':
        return `# 需求规格说明书

## 1. 项目概述
${requirement.substring(0, 200)}${requirement.length > 200 ? '...' : ''}

## 2. 功能需求分析
${design?.modules?.map((m, i) => `${i + 1}. ${m.icon} ${m.name}`).join('\n') || '分析中...'}

## 3. 非功能需求
- 性能要求: 页面加载时间 < 2秒
- 安全要求: 用户认证、数据加密
- 可用性: 响应式设计

## 4. 技术约束
- 前端框架: Next.js 14
- 数据库: SQLite
- 样式方案: Tailwind CSS`;

      case 'uiue':
        return `# UI/UX 设计方案

## 设计风格
${design?.designStyle || '现代简约风格'}

## 色彩方案
- 主色调: #3b82f6 (蓝色)
- 辅助色: #8b5cf6 (紫色)
- 背景色: #f9fafb (浅灰)

## 组件规范
- 按钮: 主按钮蓝/次按钮灰
- 表单: 圆角输入框
- 卡片: 白底圆角阴影

## 响应式断点
- sm: 640px / md: 768px
- lg: 1024px / xl: 1280px`;

      case 'architect':
        return `# 系统架构设计

## 技术栈
- Next.js 14 (App Router)
- TypeScript 5
- Tailwind CSS 3
- SQLite (better-sqlite3)

## 目录结构
\`\`\`
app/
├── layout.tsx    # 根布局
├── page.tsx      # 首页
├── api/          # API路由
components/       # 组件
lib/              # 工具函数
spec/             # 规格文档
\`\`\`

## API设计
- GET/POST /api/items
- GET/POST /api/users`;

      case 'developer':
        return `// 正在生成代码...
// 技术栈: Next.js 14 + TypeScript

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

export async function GET() {
  const db = getDatabase();
  const items = db.prepare('SELECT * FROM items').all();
  return NextResponse.json({ code: 200, data: items });
}

// ✅ 已准备生成完整项目
// 📁 package.json - 依赖配置
// 📁 tsconfig.json - TS配置
// 📁 app/ - 页面和API
// 📁 lib/db.ts - 数据库封装
// 📁 spec/ - 规格文档`;

      default:
        return agent.activeMsg;
    }
  };

  // 进入IDE
  const handleRun = () => {
    router.push('/ide');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] p-6">
      {/* 标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">🏭 AI 开发工厂</h1>
        <p className="text-gray-400">
          {generatingCode ? '正在生成项目代码...' : '智能体协同工作中...'}
        </p>
      </div>

      {/* 智能体卡片 */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} content={agentContents[agent.id]} />
        ))}
      </div>

      {/* 进度指示 */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">整体进度</span>
          <span className="text-gray-400 text-sm">{Math.round(overallProgress)}%</span>
        </div>
        <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* 设计方案展示 */}
      {design && (
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-[#1a1a2e]/80 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">📋 设计方案摘要</h3>

            <div className="space-y-4 text-gray-300">
              <div>
                <span className="text-gray-500">项目名称：</span>
                <span className="text-white font-medium">{design.title}</span>
              </div>

              <div>
                <span className="text-gray-500">技术栈：</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {design.techStack.frontend.map(t => (
                    <span key={t} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">{t}</span>
                  ))}
                  {design.techStack.backend.map(t => (
                    <span key={t} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">{t}</span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-gray-500">功能模块：</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {design.modules.map(m => (
                    <span key={m.id} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                      {m.icon} {m.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 进入IDE按钮 */}
      {showRunButton && (
        <div className="text-center">
          <button
            onClick={handleRun}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-lg shadow-purple-500/30 transition-all"
          >
            🚀 {codeGenerated ? '进入IDE预览' : '查看生成的项目'}
          </button>
          <p className="text-gray-500 text-sm mt-3">
            {codeGenerated ? '项目已生成，点击进入代码编辑器' : '点击查看项目文件'}
          </p>
        </div>
      )}

      {/* 生成中提示 */}
      {generatingCode && !showRunButton && (
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#1a1a2e] rounded-lg">
            <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
            <span className="text-gray-300">正在生成完整项目代码...</span>
          </div>
        </div>
      )}
    </div>
  );
}