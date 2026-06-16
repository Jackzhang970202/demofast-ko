import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { logSystemInfo, logSystemError } from '@/lib/logger';
import { ClaudeckService } from '@/server/services/claudeck.service';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import type { ClaudeckMessage } from '@/types/claudeck';

// 架构师 - 生成系统架构设计文档（使用 Claudeck）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirement, session, projectId } = body;

    const logProjectId = projectId || '_architect_temp';

    console.log('\n🏗️ 架构师 - 开始生成架构设计 (Claudeck)...\n');
    logSystemInfo(logProjectId, '架构师开始生成架构设计', {});

    // 确保 specs 目录存在
    const projectDir = path.join(process.cwd(), 'data', 'projects', logProjectId);
    const specsDir = path.join(projectDir, 'specs', 'design');
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }

    const prompt = `你是一位资深系统架构师。请根据以下需求生成详细的系统架构设计文档。

${requirement}

---

请使用 Write 工具生成以下文档：

1. 架构设计文档：${path.join(specsDir, '01-architecture.md')}
2. 数据模型文档：${path.join(specsDir, '02-data-model.md')}

## 架构设计文档内容 (01-architecture.md)

\`\`\`markdown
# 01 - 系统架构设计

## 文档信息
- **版本**: v1.0
- **创建日期**: ${new Date().toISOString().split('T')[0]}

## 1. 架构概述

### 1.1 系统定位
[描述系统的定位和目标]

### 1.2 设计原则
- 模块化：功能模块独立，便于维护
- 可扩展：支持功能扩展
- 安全性：数据安全，权限控制

## 2. 技术架构

### 2.1 技术选型

| 层次 | 技术方案 | 版本 | 选型理由 |
|-----|---------|-----|---------|
| 前端框架 | Vue 3 + Vite | 现行版 | 若依前端基座 |
| 开发语言 | TypeScript / Java | 当前项目版本 | 前后端分层开发 |
| UI方案 | Element Plus | 当前项目版本 | 复用若依组件体系 |
| 后端框架 | Spring Boot + MyBatis Plus | 当前项目版本 | 若依后端基座 |
| 数据库 | PostgreSQL | 当前实例 | 单库多 schema |

## 3. 目录结构

\`\`\`
project/
├── app/                        # Next.js App Router
├── components/                # 公共组件
├── lib/                       # 工具库
├── types/                     # 类型定义
├── data/                      # 数据目录
└── package.json
\`\`\`

## 4. 核心模块设计

[根据需求设计核心模块]

## 5. 数据流设计

\`\`\`
用户操作 → 页面组件 → API调用 → 数据库操作 → 返回结果
\`\`\`

## 6. 安全设计

### 6.1 认证方案
- 使用 session 或 JWT
- 密码加密存储

### 6.2 权限控制
- 基于角色的权限控制 (RBAC)
\`\`\`

## 数据模型文档内容 (02-data-model.md)

\`\`\`markdown
# 02 - 数据模型设计

## 文档信息
- **版本**: v1.0
- **创建日期**: ${new Date().toISOString().split('T')[0]}

## 1. 数据概述

### 1.1 数据特点
- 数据量小，适合 JSON 文件存储
- 需要持久化存储
- 支持基本的 CRUD 操作

## 2. 实体关系图

[根据需求设计实体关系]

## 3. 数据表设计

### 3.1 用户表 (users)

| 字段名 | 类型 | 必填 | 说明 |
|-------|-----|-----|------|
| id | string | Y | 主键，UUID |
| email | string | Y | 邮箱，唯一 |
| password | string | Y | 密码哈希 |
| name | string | Y | 用户名 |
| role | string | Y | 角色：admin/user |
| createdAt | string | Y | 创建时间 |
| updatedAt | string | Y | 更新时间 |

## 4. TypeScript 类型定义

\`\`\`typescript
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}
\`\`\`
\`\`\`

**重要规则**：
1. 必须使用 Write 工具创建两个文件
2. 内容必须非常详细
3. 完成后输出：✅ 已生成架构设计文档和数据模型文档`;

    const startTime = Date.now();
    let output: string[] = [];

    try {
      // 初始化 Claudeck 服务
      await ClaudeckService.init();

      // 使用 Chat 模式（更灵活，不依赖预定义的 agent）
      const result = await ClaudeckService.chat(
        prompt,
        projectDir,
        {
          projectId: logProjectId,
          permissionMode: 'bypass',
          onMessage: (msg: ClaudeckMessage) => {
            if (msg.type === 'text') {
              const text = (msg as any).text || '';
              console.log(`[Architect] ${text}`);
              output.push(text);
            } else if (msg.type === 'tool') {
              const toolName = (msg as any).name || '';
              console.log(`[Architect] Tool: ${toolName}`);
              output.push(`[Tool] ${toolName}`);
            }
          },
        }
      );

      const duration = Date.now() - startTime;
      console.log('\n✅ 架构设计文档生成完成\n');
      logSystemInfo(logProjectId, '架构设计文档生成完成 (Claudeck)', { duration });

      // 保存 Agent 完成状态和完整的 specs
      if (projectId) {
        try {
          await WorkflowStateService.recordAgentComplete(projectId, 'architect', {
            files: ['specs/design/01-architecture.md', 'specs/design/02-data-model.md'],
          });

          // 构建完整的 specs 对象
          const currentState = await WorkflowStateService.getState(projectId);
          const existingSpecs = currentState?.phaseData?.specs || {
            requirement: '',
            design: [],
            task: '',
            checklist: '',
          };

          // 完整的 specs
          const completeSpecs = {
            requirement: existingSpecs.requirement || `data/projects/${projectId}/specs/requirement/REQ-主模块.md`,
            design: [
              `data/projects/${projectId}/specs/design/01-architecture.md`,
              `data/projects/${projectId}/specs/design/02-data-model.md`,
              ...existingSpecs.design.filter(f => !f.includes('01-architecture') && !f.includes('02-data-model')),
            ].filter(Boolean),
            task: `data/projects/${projectId}/specs/task/TASK-主模块.md`,
            checklist: `data/projects/${projectId}/specs/checklist/CHK-主模块.md`,
          };

          await WorkflowStateService.savePhaseData(projectId, { specs: completeSpecs });

          // 推进到 CODE_GENERATING 阶段
          const advanceResult = await WorkflowStateService.advancePhase(projectId);
          console.log(`✅ Architect Agent 状态已保存，阶段推进: ${advanceResult.newPhase}`);

        } catch (stateError) {
          console.warn('保存 Architect Agent 状态失败:', stateError);
        }
      }

    } catch (claudeckError: any) {
      console.error('Claudeck 调用失败:', claudeckError);
      logSystemError(logProjectId, 'Claudeck 调用失败', claudeckError);

      return NextResponse.json(
        {
          code: 500,
          message: 'Claudeck 服务不可用，请确保 Claudeck 服务正在运行',
          error: claudeckError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        content: output.join('\n'),
        files: ['specs/design/01-architecture.md', 'specs/design/02-data-model.md'],
      },
    });
  } catch (error: any) {
    console.error('Architect error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}