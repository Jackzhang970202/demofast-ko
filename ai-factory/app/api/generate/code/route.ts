import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, insert } from '@/lib/db';
import { spawnClaudeNonInteractive } from '@/lib/spawn';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

interface ProjectFile {
  path: string;
  name: string;
  language: string;
  content: string;
}

// 语言检测
function detectLanguage(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.css': 'css',
    '.scss': 'scss',
    '.html': 'html',
    '.md': 'markdown',
    '.sql': 'sql',
    '.prisma': 'prisma',
  };
  return langMap[ext] || 'plaintext';
}

// 生成完整的Next.js项目模板
function generateFullProject(requirement: string, answers: Record<string, any>, design: any): ProjectFile[] {
  const title = design?.title || 'AI Generated App';
  const projectName = title.toLowerCase().replace(/\s+/g, '-');
  const modules = design?.modules || [];
  const features = design?.features || [];

  const files: ProjectFile[] = [];

  // 1. package.json
  files.push({
    path: 'package.json',
    name: 'package.json',
    language: 'json',
    content: JSON.stringify({
      name: projectName,
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'next dev -p 3456',
        build: 'next build',
        start: 'next start -p 3456',
        lint: 'next lint',
      },
      dependencies: {
        next: '^14.2.0',
        react: '^18.3.0',
        'react-dom': '^18.3.0',
        lowdb: '^1.0.0',
        uuid: '^9.0.0',
      },
      devDependencies: {
        '@types/node': '^20',
        '@types/react': '^18',
        '@types/react-dom': '^18',
        '@types/uuid': '^9.0.0',
        typescript: '^5',
        tailwindcss: '^3.4.0',
        postcss: '^8',
        autoprefixer: '^10',
      },
    }, null, 2),
  });

  // 2. tsconfig.json
  files.push({
    path: 'tsconfig.json',
    name: 'tsconfig.json',
    language: 'json',
    content: JSON.stringify({
      compilerOptions: {
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    }, null, 2),
  });

  // 3. next.config.js
  files.push({
    path: 'next.config.js',
    name: 'next.config.js',
    language: 'javascript',
    content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;`,
  });

  // 4. tailwind.config.js
  files.push({
    path: 'tailwind.config.js',
    name: 'tailwind.config.js',
    language: 'javascript',
    content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};`,
  });

  // 5. postcss.config.js
  files.push({
    path: 'postcss.config.js',
    name: 'postcss.config.js',
    language: 'javascript',
    content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};`,
  });

  // 6. app/globals.css - 精美现代风格
  files.push({
    path: 'app/globals.css',
    name: 'globals.css',
    language: 'css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #8B5CF6;
  --primary-dark: #6D28D9;
  --accent: #3B82F6;
  --bg-dark: #0F172A;
  --bg-card: rgba(30, 41, 59, 0.5);
}

* {
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%);
  min-height: 100vh;
  color: #F8FAFC;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.5);
}

::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.5);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 92, 246, 0.8);
}

/* 渐变按钮 */
.btn-primary {
  @apply px-6 py-2.5 rounded-xl font-medium transition-all duration-300;
  background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

/* 玻璃卡片 */
.card {
  @apply rounded-2xl p-6 transition-all duration-300;
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.card:hover {
  border-color: rgba(139, 92, 246, 0.4);
  box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15);
}

/* 输入框 */
.input-field {
  @apply w-full px-4 py-3 rounded-xl transition-all duration-300;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #F8FAFC;
}

.input-field:focus {
  outline: none;
  border-color: #8B5CF6;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.input-field::placeholder {
  color: #64748B;
}

/* 表格样式 */
.table-container {
  @apply rounded-xl overflow-hidden;
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.table-row {
  @apply transition-colors duration-200;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.table-row:hover {
  background: rgba(139, 92, 246, 0.1);
}

/* 标签/徽章 */
.badge {
  @apply px-3 py-1 rounded-full text-xs font-medium;
  background: rgba(139, 92, 246, 0.2);
  color: #C4B5FD;
}

.badge-success {
  background: rgba(34, 197, 94, 0.2);
  color: #86EFAC;
}

.badge-warning {
  background: rgba(234, 179, 8, 0.2);
  color: #FDE047;
}

/* 动画 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
  50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.5); }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

.animate-pulse-glow {
  animation: pulse-glow 2s infinite;
}`,
  });

  // 7. app/layout.tsx - 精美布局
  files.push({
    path: 'app/layout.tsx',
    name: 'layout.tsx',
    language: 'typescript',
    content: `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '${title}',
  description: '${requirement.substring(0, 160)}',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 text-white">
        {/* 背景装饰 */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        {/* 导航栏 */}
        <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/50 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
                ⚡
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                ${title}
              </h1>
            </div>
            <div className="flex items-center gap-6">
              ${modules.map((m: any) => `<a key="${m.id}" href="/${m.id}" className="text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2">
                  <span>${m.icon}</span>
                  <span>${m.name}</span>
                </a>`).join('\n              ')}
            </div>
          </div>
        </nav>

        {/* 主内容 */}
        <main className="relative z-10">
          {children}
        </main>

        {/* 页脚 */}
        <footer className="relative z-10 py-8 text-center text-gray-500 text-sm border-t border-white/5">
          <p>© ${new Date().getFullYear()} ${title}. Powered by AI.</p>
        </footer>
      </body>
    </html>
  );
}`,
  });

  // 8. app/page.tsx - 精美主页
  files.push({
    path: 'app/page.tsx',
    name: 'page.tsx',
    language: 'typescript',
    content: `'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const modules = ${JSON.stringify(modules)};
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      {/* 欢迎区域 */}
      <div className="text-center mb-16 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 text-purple-300 text-sm mb-6">
          <span className="animate-pulse">✨</span>
          <span>AI 智能生成</span>
        </div>
        <h1 className="text-5xl font-bold mb-6">
          <span className="bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
            欢迎使用 ${title}
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          这是一个由 AI 自动生成的完整系统，提供现代化的用户界面和强大的功能支持
        </p>
      </div>

      {/* 功能模块卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {modules.map((module: any, index: number) => (
          <Link
            key={module.id}
            href={\`/\${module.id}\`}
            className="group relative animate-fade-in"
            style={{ animationDelay: \`\${index * 100}ms\` }}
            onMouseEnter={() => setHoveredModule(module.id)}
            onMouseLeave={() => setHoveredModule(null)}
          >
            <div className={\`card h-full \${hoveredModule === module.id ? 'scale-105' : ''} transition-transform duration-300\`}>
              {/* 图标 */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {module.icon}
              </div>
              {/* 标题 */}
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                {module.name}
              </h3>
              {/* 描述 */}
              <p className="text-gray-400 text-sm">
                点击进入管理
              </p>
              {/* 箭头 */}
              <div className="absolute top-6 right-6 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all duration-300">
                →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 系统功能列表 */}
      <div className="card animate-fade-in" style={{ animationDelay: '300ms' }}>
        <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          系统功能
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${features.map((f: string, i: number) => `<div
              key="${f}"
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200"
            >
              <span className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center text-sm">
                ✓
              </span>
              <span className="text-gray-300">${f}</span>
            </div>`).join('\n          ')}
        </div>
      </div>

      {/* 技术栈信息 */}
      <div className="mt-12 text-center">
        <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
          <span className="text-gray-400 text-sm">技术栈</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-300 text-sm">Next.js 14</span>
          <span className="text-gray-300 text-sm">TypeScript</span>
          <span className="text-gray-300 text-sm">Tailwind CSS</span>
          <span className="text-gray-300 text-sm">SQLite</span>
        </div>
      </div>
    </main>
  );
}`,
  });

  // 9. lib/db.ts - 数据库 (使用 lowdb)
  files.push({
    path: 'lib/db.ts',
    name: 'db.ts',
    language: 'typescript',
    content: `import { Low, JSONFile } from 'lowdb';
import path from 'path';
import fs from 'fs';

// 数据结构定义
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

interface Item {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Data {
  users: User[];
  items: Item[];
}

const defaultData: Data = {
  users: [],
  items: [],
};

let db: Low<Data> | null = null;

export async function getDatabase(): Promise<Low<Data>> {
  if (db) return db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'db.json');
  const adapter = new JSONFile<Data>(dbPath);

  db = new Low<Data>(adapter, defaultData);
  await db.read();

  // 初始化默认数据
  db.data ||= defaultData;

  // 添加示例用户
  if (db.data.users.length === 0) {
    db.data.users.push({
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
    });
    db.data.users.push({
      id: '2',
      username: 'user1',
      email: 'user1@example.com',
      role: 'user',
      createdAt: new Date().toISOString(),
    });
    await db.write();
  }

  return db;
}

export async function saveDatabase(): Promise<void> {
  if (db) {
    await db.write();
  }
}

export function closeDatabase() {
  db = null;
}`,
  });

  // 10. API路由 - 数据CRUD
  files.push({
    path: 'app/api/items/route.ts',
    name: 'route.ts',
    language: 'typescript',
    content: `import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const db = await getDatabase();
    const items = db.data.items.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ code: 200, data: items });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;
    const db = await getDatabase();

    const newItem = {
      id: uuidv4(),
      name,
      description: description || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.items.push(newItem);
    await db.write();

    return NextResponse.json({ code: 200, data: newItem });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message }, { status: 500 });
  }
}`,
  });

  // 11. API路由 - 用户
  files.push({
    path: 'app/api/users/route.ts',
    name: 'route.ts',
    language: 'typescript',
    content: `import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const db = await getDatabase();
    const users = db.data.users.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return NextResponse.json({ code: 200, data: users });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, role = 'user' } = body;
    const db = await getDatabase();

    const newUser = {
      id: uuidv4(),
      username,
      email,
      role,
      createdAt: new Date().toISOString(),
    };

    db.data.users.push(newUser);
    await db.write();

    return NextResponse.json({ code: 200, data: newUser });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message }, { status: 500 });
  }
}`,
  });

  // 12. 根据模块生成页面
  for (const moduleItem of modules) {
    // 模块页面
    files.push({
      path: `app/${moduleItem.id}/page.tsx`,
      name: 'page.tsx',
      language: 'typescript',
      content: generateModulePage(moduleItem, title),
    });
  }

  // 13. 添加规格文档 - 需求文档
  files.push({
    path: 'spec/README.md',
    name: 'README.md',
    language: 'markdown',
    content: `# 项目规格文档

此目录包含 AI 开发工厂生成的项目规格文档。

## 文档说明

- **需求文档**: 记录用户的原始需求和功能需求分解
- **设计文档**: 记录系统架构、数据模型、API设计等
`,
  });

  // 14. 需求文档
  files.push({
    path: 'spec/requirement.md',
    name: 'requirement.md',
    language: 'markdown',
    content: generateRequirementDoc(requirement, answers, design),
  });

  // 15. 设计文档
  files.push({
    path: 'spec/design.md',
    name: 'design.md',
    language: 'markdown',
    content: generateDesignDoc(requirement, answers, design),
  });

  // 16. API文档
  files.push({
    path: 'spec/api.md',
    name: 'api.md',
    language: 'markdown',
    content: generateApiDoc(modules),
  });

  return files;
}

// 生成需求文档
function generateRequirementDoc(requirement: string, answers: Record<string, any>, design: any): string {
  return `# 需求规格说明书

## 文档信息
- 生成时间: ${new Date().toLocaleString('zh-CN')}
- 项目名称: ${design?.title || 'AI Generated App'}

---

## 1. 项目背景

### 1.1 原始需求
${requirement}

### 1.2 用户补充信息
${Object.entries(answers || {}).map(([k, v]) => `- **${k}**: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') || '（无补充信息）'}

---

## 2. 功能需求

### 2.1 功能模块
| 模块 | 描述 |
|------|------|
${(design?.modules || []).map((m: any) => `| ${m.icon} ${m.name} | ${m.name}相关功能 |`).join('\n')}

### 2.2 功能列表
${(design?.features || []).map((f: string, i: number) => `${i + 1}. ${f}`).join('\n')}

---

## 3. 非功能需求

### 3.1 性能要求
- 页面加载时间 < 2秒
- API响应时间 < 500ms

### 3.2 安全要求
- 用户认证
- 数据验证
- SQL注入防护

### 3.3 可用性要求
- 响应式设计
- 浏览器兼容性

---

## 4. 用户角色

| 角色 | 描述 | 权限 |
|------|------|------|
| 管理员 | 系统管理 | 全部权限 |
| 普通用户 | 日常使用 | 基本操作 |

---

## 5. 数据需求

### 5.1 数据实体
- 用户 (User)
- 数据项 (Item)
- 日志 (Log)

---

*本文档由 AI 开发工厂自动生成*
`;
}

// 生成设计文档
function generateDesignDoc(requirement: string, answers: Record<string, any>, design: any): string {
  return `# 系统设计文档

## 文档信息
- 生成时间: ${new Date().toLocaleString('zh-CN')}
- 项目名称: ${design?.title || 'AI Generated App'}

---

## 1. 系统架构

### 1.1 技术栈
| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14 (App Router) |
| 编程语言 | TypeScript 5 |
| 样式方案 | Tailwind CSS 3 |
| 数据库 | lowdb (JSON) |
| 状态管理 | React useState |

### 1.2 架构图
\`\`\`
┌─────────────────────────────────────────┐
│              Next.js 应用                 │
├─────────────────────────────────────────┤
│  页面层 (app/)                           │
│  ├── 首页、功能模块页面                   │
│  └── API路由 (app/api/)                  │
├─────────────────────────────────────────┤
│  组件层 (components/)                    │
│  └── 可复用UI组件                        │
├─────────────────────────────────────────┤
│  数据层 (lib/)                           │
│  ├── db.ts - 数据库封装                  │
│  └── utils.ts - 工具函数                 │
├─────────────────────────────────────────┤
│  存储层                                  │
│  └── SQLite 数据库文件                   │
└─────────────────────────────────────────┘
\`\`\`

---

## 2. 目录结构

\`\`\`
app/
├── layout.tsx          # 根布局
├── page.tsx            # 首页
├── globals.css         # 全局样式
├── api/                # API路由
│   ├── items/route.ts  # 数据CRUD
│   └── users/route.ts  # 用户管理
├── [module]/           # 功能模块页面
│   └── page.tsx
components/             # 可复用组件
└── lib/
    ├── db.ts           # 数据库封装
    └── utils.ts        # 工具函数
\`\`\`

---

## 3. 数据模型

### 3.1 用户表 (users)
\`\`\`typescript
interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}
\`\`\`

### 3.2 数据项表 (items)
\`\`\`typescript
interface Item {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
\`\`\`

---

## 4. 页面设计

### 4.1 页面列表
| 页面 | 路径 | 描述 |
|------|------|------|
| 首页 | / | 系统入口，展示功能模块 |
${(design?.modules || []).map((m: any) => `| ${m.name} | /${m.id} | ${m.name}管理页面 |`).join('\n')}

### 4.2 设计风格
${design?.designStyle || '现代简约风格'}

---

## 5. 安全设计

### 5.1 认证方式
- 用户名密码登录

### 5.2 权限控制
- 基于角色的访问控制 (RBAC)

---

*本文档由 AI 开发工厂自动生成*
`;
}

// 生成API文档
function generateApiDoc(modules: any[]): string {
  return `# API 接口文档

## 文档信息
- 生成时间: ${new Date().toLocaleString('zh-CN')}

---

## 1. 通用说明

### 1.1 基础URL
\`\`\`
http://localhost:3456/api
\`\`\`

### 1.2 响应格式
\`\`\`json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
\`\`\`

---

## 2. 数据接口

### 2.1 获取数据列表
- **URL**: \`GET /api/items\`
- **描述**: 获取所有数据项
- **响应**:
\`\`\`json
{
  "code": 200,
  "data": [
    { "id": 1, "name": "Item 1", "description": "..." }
  ]
}
\`\`\`

### 2.2 创建数据项
- **URL**: \`POST /api/items\`
- **请求体**:
\`\`\`json
{ "name": "New Item", "description": "..." }
\`\`\`
- **响应**:
\`\`\`json
{ "code": 200, "data": { "id": 1 } }
\`\`\`

---

## 3. 用户接口

### 3.1 获取用户列表
- **URL**: \`GET /api/users\`
- **响应**:
\`\`\`json
{
  "code": 200,
  "data": [
    { "id": 1, "username": "admin", "email": "...", "role": "admin" }
  ]
}
\`\`\`

### 3.2 创建用户
- **URL**: \`POST /api/users\`
- **请求体**:
\`\`\`json
{ "username": "user1", "email": "user@example.com", "role": "user" }
\`\`\`

---

*本文档由 AI 开发工厂自动生成*
`;
}

// 生成模块页面 - 精美现代化设计
function generateModulePage(module: { id: string; name: string; icon: string }, title: string): string {
  return `'use client';

import { useState, useEffect } from 'react';

interface Item {
  id: number;
  name: string;
  description?: string;
  status?: string;
  created_at?: string;
}

export default function ${module.id.charAt(0).toUpperCase() + module.id.slice(1)}Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      if (data.code === 200) {
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      setFormData({ name: '', description: '' });
      setShowForm(false);
      fetchItems();
    } catch (error) {
      console.error('Failed to create item:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await fetch(\`/api/items/\${id}\`, { method: 'DELETE' });
      fetchItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-4xl">${module.icon}</span>
            ${module.name}
          </h1>
          <p className="text-gray-400 mt-2">管理您的${module.name}数据</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <span>{showForm ? '✕' : '+'}</span>
          <span>{showForm ? '取消' : '新增记录'}</span>
        </button>
      </div>

      {/* 新增表单 */}
      {showForm && (
        <div className="card mb-8 animate-fade-in">
          <h3 className="text-lg font-semibold text-white mb-4">新增记录</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">名称</label>
              <input
                type="text"
                className="input-field"
                placeholder="请输入名称..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">描述</label>
              <textarea
                className="input-field min-h-[100px]"
                placeholder="请输入描述..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-xl border border-white/20 text-gray-300 hover:bg-white/5 transition-colors"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 数据列表 */}
      <div className="card">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl opacity-50">📭</span>
            </div>
            <p className="text-gray-400 mb-2">暂无数据</p>
            <p className="text-gray-500 text-sm">点击上方「新增记录」按钮添加数据</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">ID</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">名称</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">描述</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">状态</th>
                  <th className="text-left py-4 px-4 text-gray-400 font-medium text-sm">创建时间</th>
                  <th className="text-right py-4 px-4 text-gray-400 font-medium text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr
                    key={item.id}
                    className="table-row animate-fade-in"
                    style={{ animationDelay: \`\${index * 50}ms\` }}
                  >
                    <td className="py-4 px-4 text-gray-500">#{item.id}</td>
                    <td className="py-4 px-4 text-white font-medium">{item.name}</td>
                    <td className="py-4 px-4 text-gray-400 max-w-xs truncate">
                      {item.description || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={\`badge \${item.status === 'active' ? 'badge-success' : ''}\`}>
                        {item.status || 'active'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-500 text-sm">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-400 hover:text-red-300 text-sm hover:underline transition-colors"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}`;
}

// 构建 Claude Code 提示词 - 关键修改：让Claude直接写文件
function buildPrompt(requirement: string, answers: Record<string, any>, design: any): string {
  const isAiChatApp = requirement.includes('AI') || requirement.includes('问答') || requirement.includes('聊天') || requirement.includes('对话');

  const prompt = `你是一个专业的全栈开发工程师和 UI/UX 设计师。请根据以下需求生成一个完整的、可运行的 Next.js 项目。

## 用户需求
${requirement}

## 用户补充信息
${Object.entries(answers || {}).map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')}

## 设计方案
- 项目名称: ${design?.title || 'AI Generated App'}
- 技术栈: Next.js 14 (App Router), TypeScript, Tailwind CSS, lowdb (JSON文件数据库)
- 功能模块: ${(design?.modules || []).map((m: any) => m.name).join(', ')}

## ⭐⭐⭐ 重要规则（必须遵守）⭐⭐⭐

### 🚨 执行规则（最重要 - 逐文件执行）

**必须使用 Write 工具逐个创建文件！**

执行方式：
1. 使用 Write 工具创建第一个文件（如 package.json）
2. 等待 Write 工具执行完成，确认文件已写入磁盘
3. 输出一行确认信息，如 "✅ 已创建: package.json"
4. 然后使用 Write 工具创建下一个文件
5. 重复以上步骤

**禁止行为**：
- ❌ 禁止一次性规划所有文件内容后再批量创建
- ❌ 禁止在内存中准备所有文件后一次性输出
- ❌ 禁止跳过"创建一个文件 → 确认 → 创建下一个"的流程

文件创建顺序：
1. package.json
2. tsconfig.json
3. next.config.js
4. tailwind.config.js
5. postcss.config.js
6. app/globals.css
7. app/layout.tsx
8. app/page.tsx
9. lib/db.ts
10. 其他页面和API文件

### 离线要求（非常重要）
1. **禁止使用任何外部图片 URL**（如 unsplash、picsum、placeholder.com 等）
2. **禁止使用外部 CDN**（如 cdn.tailwindcss.com、fonts.googleapis.com 等）
3. 所有图片使用以下方案替代：
   - 使用 SVG 图标（内联）
   - 使用 CSS 渐变/形状
   - 使用 emoji
   - 使用纯色占位块
4. 字体使用系统默认字体，不引入外部字体
5. 项目必须可以完全离线运行

### 技术要求
1. 使用 App Router 路由系统 (app/ 目录)
2. 使用 TypeScript，类型定义完整
3. 使用 Tailwind CSS 样式
4. 使用 lowdb 进行数据存储（纯JS实现，无需编译）
   - 安装: npm install lowdb@1.0.0
   - 数据存储在 data/db.json 文件中
5. API 路由放在 app/api/ 目录下
6. 组件放在 components/ 目录下
7. 工具函数放在 lib/ 目录下
8. **禁止使用需要编译的原生模块**（如 better-sqlite3、sharp、bcrypt 等）

### UI 设计要求
- 深色主题，渐变色背景（如 from-slate-900 via-purple-900 to-slate-900）
- 毛玻璃效果（backdrop-blur）
- 渐变按钮，发光边框
- 类似 Vercel、Linear、Raycast 的现代 UI 风格
- 使用 Tailwind 的 rounded-xl、shadow-lg、transition-all 等工具类

${isAiChatApp ? `
## AI/问答类应用特殊要求
生成的项目必须包含以下页面结构：
1. **Landing Page** (app/landing/page.tsx 或 app/page.tsx 作为 landing)
   - 产品介绍和特性展示
   - 精美的渐变背景和动画效果
   - 登录/注册入口
2. **登录/注册系统** (app/api/auth/)
   - 用户认证 API
   - 简单的本地存储会话管理
3. **工作区/主应用页面** (app/workspace/ 或 app/chat/)
   - 登录后进入的主功能区
   - 左侧边栏显示历史记录
   - 右侧为对话/交互区域
4. 页面之间要有良好的导航和状态管理
` : ''}

## 必须包含的文件
1. package.json - 项目配置
2. tsconfig.json - TypeScript配置
3. next.config.js - Next.js配置
4. tailwind.config.js - Tailwind配置（确保启用 content 配置）
5. postcss.config.js - PostCSS配置
6. app/globals.css - 全局样式（包含动画 keyframes）
7. app/layout.tsx - 根布局
8. app/page.tsx - 首页（Landing 或主功能页）
9. lib/db.ts - lowdb数据库封装（纯JS实现）
10. 根据功能模块创建对应的页面和API

**请按照上述顺序，逐个创建文件。每创建完一个文件后，继续创建下一个。**`;

  // 打印提示词到控制台
  console.log('\n' + '='.repeat(80));
  console.log('🤖 CLAUDE CODE 提示词');
  console.log('='.repeat(80));
  console.log(prompt.substring(0, 2000) + '...\n[提示词过长，已截断显示]');
  console.log('='.repeat(80) + '\n');

  return prompt;
}

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json(
        { code: 401, message: '未登录或登录状态无效' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { requirement, answers, design, projectId } = body;

    if (!requirement) {
      return NextResponse.json(
        { code: 400, message: '需求描述不能为空' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { code: 400, message: 'projectId 参数必填' },
        { status: 400 }
      );
    }

    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project) {
      return NextResponse.json(
        { code: 404, message: '项目不存在' },
        { status: 404 }
      );
    }

    const projectDir = path.join(process.cwd(), 'data', 'projects', projectId);

    // 确保项目目录存在
    fs.mkdirSync(projectDir, { recursive: true });

    console.log('\n' + '🚀'.repeat(40));
    console.log('🏭 AI 开发工厂 - 开始生成项目');
    console.log(`📁 项目ID: ${projectId}`);
    console.log(`📂 项目目录: ${projectDir}`);
    console.log('🚀'.repeat(40) + '\n');

    let files: ProjectFile[];
    let usedCli = false;

    // 尝试使用 Claude Code CLI
    try {
      const prompt = buildPrompt(requirement, answers, design);

      console.log('⏳ 正在启动 Claude Code CLI...\n');

      // 使用非交互模式 - 通过 stdin 传入 prompt
      const claudeProcess = spawnClaudeNonInteractive(prompt, {
        cwd: projectDir,
        timeout: 600000,
      });

      let output = '';
      let error = '';
      let outputLines: string[] = [];

      // 实时打印 stdout
      claudeProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;

        // 按行打印输出
        const lines = text.split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            console.log(`[Claude Output] ${line}`);
            outputLines.push(line);
          }
        });
      });

      // 打印 stderr
      claudeProcess.stderr.on('data', (data) => {
        const text = data.toString();
        error += text;
        console.error(`[Claude Error] ${text}`);
      });

      await new Promise((resolve, reject) => {
        claudeProcess.on('close', (code) => {
          if (code === 0) {
            usedCli = true;
            console.log('\n✅ Claude Code CLI 执行完成\n');
            resolve(void 0);
          } else {
            console.error(`\n❌ Claude Code 退出码: ${code}\n`);
            reject(new Error(`Claude Code exited with code ${code}: ${error}`));
          }
        });
        claudeProcess.on('error', (err) => {
          console.error('\n❌ Claude Code 进程错误:', err, '\n');
          reject(err);
        });
      });

      // 打印生成的文件列表
      console.log('📄 Claude 生成的文件:');
      files = collectFiles(projectDir);
      files.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.path} (${f.content.length} chars)`);
      });

    } catch (cliError: any) {
      console.warn('\n⚠️ Claude Code CLI 失败，使用模板生成:', cliError.message);
      console.log('📝 使用内置模板生成项目...\n');

      // 使用模板生成完整项目
      files = generateFullProject(requirement, answers, design);

      // 写入文件到项目目录
      for (const file of files) {
        const filePath = path.join(projectDir, file.path);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content, 'utf-8');
        console.log(`   📝 创建文件: ${file.path}`);
      }
    }

    // 保存项目信息到数据库
    try {
      await initDatabase();

      // 保存文件记录
      for (const file of files) {
        await insert('projectFiles', {
          projectId,
          path: file.path,
          name: file.name,
          language: file.language,
          content: file.content,
        });
      }
    } catch (dbError) {
      console.warn('Database save failed:', dbError);
    }

    console.log('\n' + '🎉'.repeat(40));
    console.log(`✅ 项目生成完成! 共 ${files.length} 个文件`);
    console.log(`📁 项目ID: ${projectId}`);
    console.log(`🔧 使用Claude Code: ${usedCli ? '是' : '否(模板)'}`);
    console.log('🎉'.repeat(40) + '\n');

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        projectId,
        projectDir,
        fileCount: files.length,
        files,
        usedCli,
      },
    });
  } catch (error: any) {
    console.error('Generate code error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

// 收集目录中的所有文件
function collectFiles(dir: string, baseDir: string = dir): ProjectFile[] {
  const files: ProjectFile[] = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    // 跳过 node_modules 和隐藏目录
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      files.push({
        path: relativePath.replace(/\\/g, '/'),
        name: entry.name,
        language: detectLanguage(entry.name),
        content,
      });
    }
  }

  return files;
}