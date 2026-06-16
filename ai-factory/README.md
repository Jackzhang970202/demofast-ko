# AI 开发工厂

所说即所得的智能开发平台 - 基于 Next.js 14 + TypeScript + Tailwind CSS + SQLite

## 功能特性

- **AI 驱动的需求分析**: 自动生成澄清问题，精准理解用户需求
- **Claude Code 集成**: 利用 Claude Code CLI 进行真正的代码生成
- **实时预览**: Monaco Editor + 实时预览，所见即所得
- **一键导出**: 支持项目 ZIP 下载

## 技术栈

- **前端**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **代码编辑器**: Monaco Editor
- **数据存储**: SQLite (better-sqlite3)
- **AI 引擎**: Claude Code CLI

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 项目结构

```
ai-factory/
├── app/                    # Next.js App Router
│   ├── page.tsx           # 首页（需求输入）
│   ├── questions/         # 问答页面
│   ├── design/            # 设计展示页面
│   ├── ide/               # IDE 预览页面
│   └── api/               # API 路由
│       ├── generate/      # 生成相关 API
│       └── projects/      # 项目管理 API
├── components/            # React 组件
├── lib/                   # 工具库
│   ├── db.ts             # SQLite 数据库
│   ├── claude.ts         # Claude Code 封装
│   ├── prompts.ts        # 提示词模板
│   └── utils.ts          # 工具函数
└── data/                  # 数据存储目录

```

## 使用流程

1. **输入需求**: 在首页输入您的项目需求
2. **回答问题**: 系统会提出 5+ 个澄清问题
3. **查看设计**: 系统展示设计方案和技术栈
4. **代码生成**: Claude Code 生成完整项目代码
5. **预览导出**: 在 IDE 中预览代码并导出

## 许可证

MIT