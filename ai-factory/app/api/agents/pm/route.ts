import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { logSystemInfo, logSystemError } from '@/lib/logger';
import { ClaudeckService } from '@/server/services/claudeck.service';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import type { ClaudeckMessage } from '@/types/claudeck';

// 产品经理 - 生成需求规格文档（使用 Claudeck）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirement, answers, projectId, session } = body;

    const logProjectId = projectId || '_pm_temp';

    console.log('\n📋 产品经理 - 开始生成需求规格文档 (Claudeck)...\n');
    logSystemInfo(logProjectId, '产品经理开始生成需求规格', {});

    // 确保 specs 目录存在
    const projectDir = path.join(process.cwd(), 'data', 'projects', logProjectId);
    const specsDir = path.join(projectDir, 'specs', 'requirement');
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }

    const prompt = `你是一位资深产品经理。请根据以下需求生成详细的需求规格文档。

${requirement}

---

请使用 Write 工具生成需求规格文档，文件路径：${path.join(specsDir, 'REQ-主模块.md')}

文档必须包含以下内容：

\`\`\`markdown
# REQ-主模块 - 功能需求文档

## 文档信息
- **版本**: v1.0
- **状态**: 已完成
- **创建日期**: ${new Date().toISOString().split('T')[0]}
- **模块路径**: 主模块

## 1. 概述

### 1.1 项目背景
[根据需求详细描述项目背景]

### 1.2 目标用户
[详细描述目标用户群体]

### 1.3 核心价值
[描述系统要解决的核心问题]

## 2. 功能需求

### 2.1 第一期功能（P0）

#### 2.1.1 {功能名称}
- **功能描述**: [详细描述]
- **用户故事**: 作为[角色]，我想要[行为]，以便于[目的]
- **验收标准**:
  - [ ] 标准1
  - [ ] 标准2
- **优先级**: P0

[为每个功能重复上述结构]

## 3. 非功能需求

### 3.1 性能要求
- 页面加载时间 < 3秒
- API 响应时间 < 500ms

### 3.2 安全要求
- 用户密码加密存储
- 敏感操作需要认证

### 3.3 可用性要求
- 支持主流浏览器
- 响应式设计

## 4. 数据需求

### 4.1 数据实体
| 实体名称 | 主要字段 | 数据来源 |
|---------|---------|---------|
| 用户 | id, name, email, password | 用户注册 |
| [其他实体] | [字段列表] | [来源] |

### 4.2 数据权限
[描述数据权限要求]

## 5. 界面需求

### 5.1 页面清单
| 页面名称 | 路由 | 功能描述 |
|---------|-----|---------|
| 首页 | / | 系统首页 |
| 登录 | /login | 用户登录 |
| [其他页面] | [路由] | [描述] |

## 6. 接口需求

### 6.1 API 列表
| 接口 | 方法 | 描述 |
|-----|-----|------|
| /api/auth/login | POST | 用户登录 |
| /api/auth/register | POST | 用户注册 |
| [其他接口] | [方法] | [描述] |

## 7. 约束条件

### 7.1 技术约束
- 前端: Vue 3 + Vite + Element Plus
- 后端: Spring Boot + MyBatis Plus
- 数据库: PostgreSQL (172.22.4.4:5432/AI_fec_test)

### 7.2 时间约束
[根据需求填写]

## 8. 验收标准

### 8.1 功能验收
[列出功能验收标准]

### 8.2 性能验收
[列出性能验收标准]

## 9. 风险与依赖

### 9.1 技术风险
[列出潜在风险]

### 9.2 外部依赖
[列出外部依赖]
\`\`\`

**重要规则**：
1. 必须使用 Write 工具创建文件
2. 内容必须非常详细，不能只是摘要
3. 所有内容都要基于用户提供的需求
4. 完成后输出：✅ 已生成需求规格文档`;

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
              console.log(`[PM] ${text}`);
              output.push(text);
            } else if (msg.type === 'tool') {
              const toolName = (msg as any).name || '';
              console.log(`[PM] Tool: ${toolName}`);
              output.push(`[Tool] ${toolName}`);
            }
          },
        }
      );

      const duration = Date.now() - startTime;
      console.log('\n✅ 需求规格文档生成完成\n');
      logSystemInfo(logProjectId, '需求规格文档生成完成 (Claudeck)', { duration });

      // 保存 Agent 完成状态
      if (projectId) {
        try {
          await WorkflowStateService.recordAgentComplete(projectId, 'pm', {
            file: 'specs/requirement/REQ-主模块.md',
          });

          // 更新 phaseData 的 specs.requirement
          await WorkflowStateService.savePhaseData(projectId, {
            specs: {
              requirement: `data/projects/${projectId}/specs/requirement/REQ-主模块.md`,
              design: [],
              task: '',
              checklist: '',
            },
          });
          console.log(`✅ PM Agent 状态已保存: ${projectId}`);
        } catch (stateError) {
          console.warn('保存 PM Agent 状态失败:', stateError);
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
        file: 'specs/requirement/REQ-主模块.md',
      },
    });
  } catch (error: any) {
    console.error('PM analysis error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}