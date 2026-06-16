import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { logSystemInfo, logSystemError } from '@/lib/logger';
import { ClaudeckService } from '@/server/services/claudeck.service';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import type { ClaudeckMessage } from '@/types/claudeck';

// UI/UE 设计师 - 生成 UI/UX 设计规范文档（使用 Claudeck）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirement, session, projectId } = body;

    const logProjectId = projectId || '_uiue_temp';

    console.log('\n🎨 UI/UE 设计师 - 开始生成设计规范 (Claudeck)...\n');
    logSystemInfo(logProjectId, 'UI/UE设计师开始生成设计规范', {});

    // 确保 specs 目录存在
    const projectDir = path.join(process.cwd(), 'data', 'projects', logProjectId);
    const specsDir = path.join(projectDir, 'specs', 'design');
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
    }

    const prompt = `你是一位资深 UI/UX 设计师。请根据以下需求生成详细的 UI/UX 设计规范文档。

${requirement}

---

请使用 Write 工具生成 UI/UX 设计规范文档，文件路径：${path.join(specsDir, '03-ui-ux.md')}

文档必须包含以下内容：

\`\`\`markdown
# 03 - UI/UX 设计规范

## 文档信息
- **版本**: v1.0
- **创建日期**: ${new Date().toISOString().split('T')[0]}

## 1. 设计原则

### 1.1 核心原则
- 简洁易用：界面简洁，操作直观
- 一致性：全站风格统一
- 可访问性：支持不同能力的用户

## 2. 视觉规范

### 2.1 色彩系统

| 名称 | 色值 | 用途 |
|-----|------|-----|
| 主色 | #6366f1 | 主要按钮、链接、重点元素 |
| 辅色 | #8b5cf6 | 次要元素、装饰 |
| 成功 | #22c55e | 成功状态、确认操作 |
| 警告 | #f59e0b | 警告状态、注意事项 |
| 错误 | #ef4444 | 错误状态、删除操作 |
| 背景 | #0f0a20 | 页面背景 |
| 卡片背景 | #1a1a2e | 卡片、弹窗背景 |
| 文字 | #ffffff | 主要文字 |
| 次要文字 | #9ca3af | 次要说明文字 |

### 2.2 字体规范

| 类型 | 大小 | 字重 | 行高 | 用途 |
|-----|-----|-----|-----|-----|
| H1 | 32px | 700 | 1.2 | 页面主标题 |
| H2 | 24px | 600 | 1.3 | 区块标题 |
| H3 | 18px | 600 | 1.4 | 小节标题 |
| Body | 16px | 400 | 1.5 | 正文内容 |
| Small | 14px | 400 | 1.5 | 辅助说明 |

### 2.3 间距规范
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

## 3. 组件规范

### 3.1 按钮
- 主按钮: 渐变背景，圆角8px
- 次要按钮: 透明背景，边框
- 危险按钮: 红色背景

### 3.2 表单输入框
- 背景: rgba(255,255,255,0.05)
- 聚焦边框: #6366f1
- 圆角: 8px

### 3.3 卡片
- 背景: rgba(26,26,46,0.8)
- 边框: 1px solid rgba(139,92,246,0.2)
- 圆角: 12px

## 4. 页面布局
- 导航栏高度: 64px
- 侧边栏宽度: 240px
- 内容区最大宽度: 1200px

## 5. 交互规范
- 加载状态: 骨架屏/loading动画
- 空状态: 插图 + 引导操作
- 错误状态: 错误信息 + 重试按钮
\`\`\`

**重要规则**：
1. 必须使用 Write 工具创建文件
2. 内容必须非常详细
3. 完成后输出：✅ 已生成 UI/UX 设计规范文档`;

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
              console.log(`[UI/UE] ${text}`);
              output.push(text);
            } else if (msg.type === 'tool') {
              const toolName = (msg as any).name || '';
              console.log(`[UI/UE] Tool: ${toolName}`);
              output.push(`[Tool] ${toolName}`);
            }
          },
        }
      );

      const duration = Date.now() - startTime;
      console.log('\n✅ UI/UX 设计规范生成完成\n');
      logSystemInfo(logProjectId, 'UI/UX设计规范生成完成 (Claudeck)', { duration });

      // 保存 Agent 完成状态
      if (projectId) {
        try {
          await WorkflowStateService.recordAgentComplete(projectId, 'uiue', {
            file: 'specs/design/03-ui-ux.md',
          });

          // 更新 phaseData 的 specs.design
          const currentState = await WorkflowStateService.getState(projectId);
          const existingSpecs = currentState?.phaseData?.specs || {
            requirement: '',
            design: [],
            task: '',
            checklist: '',
          };
          existingSpecs.design = existingSpecs.design || [];

          // 确保 03-ui-ux.md 在 design 数组中
          const uiuxFile = `data/projects/${projectId}/specs/design/03-ui-ux.md`;
          if (!existingSpecs.design.includes(uiuxFile)) {
            existingSpecs.design.push(uiuxFile);
          }

          await WorkflowStateService.savePhaseData(projectId, { specs: existingSpecs });
          console.log(`✅ UI/UE Agent 状态已保存: ${projectId}`);
        } catch (stateError) {
          console.warn('保存 UI/UE Agent 状态失败:', stateError);
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
        file: 'specs/design/03-ui-ux.md',
      },
    });
  } catch (error: any) {
    console.error('UI design error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}