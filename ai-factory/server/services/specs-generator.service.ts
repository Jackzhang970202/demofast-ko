/**
 * Specs 文档生成服务
 * 根据澄清结果生成完整的 SDD 规范文档
 */

import { spawnClaudeNonInteractive } from '@/lib/spawn';
import { logSystemInfo, logCCCommand, logCCResponse, logCCStream } from '@/lib/logger';
import path from 'path';
import fs from 'fs';
import type { ClarificationSession, RequirementSummary } from '@/types';

// Specs 目录结构
const SPECS_DIR = {
  requirement: 'specs/requirement',
  design: 'specs/design',
  task: 'specs/task',
  checklist: 'specs/checklist',
};

// 生成的 Specs 结果
export interface GeneratedSpecsResult {
  requirement: string;
  design: string[];
  task: string;
  checklist: string;
  dependencies: {
    dependencies: string[];
    devDependencies: string[];
  };
}

export const SpecsGeneratorService = {
  /**
   * 生成完整的 Specs 文档
   * 在澄清完成后调用
   */
  async generateAllSpecs(session: ClarificationSession): Promise<GeneratedSpecsResult> {
    const projectId = session.projectId;
    const projectDir = path.join(process.cwd(), 'data', 'projects', projectId);

    // 创建 specs 目录结构
    this.createSpecsDirectory(projectDir);

    logSystemInfo(projectId, '开始生成 Specs 文档', {
      round: session.currentRound,
      status: session.status,
    });

    // 1. 生成详细需求文档（核心）
    const requirementPath = await this.generateRequirementDoc(projectDir, session);

    // 2. 生成架构设计文档
    const designPaths = await this.generateDesignDocs(projectDir, session);

    // 3. 生成任务清单
    const taskPath = await this.generateTaskDoc(projectDir, session);

    // 4. 生成检查清单
    const checklistPath = await this.generateChecklistDoc(projectDir, session);

    // 5. 分析依赖需求
    const dependencies = await this.analyzeDependencies(session);

    logSystemInfo(projectId, 'Specs 文档生成完成', { dependencies });

    return {
      requirement: requirementPath,
      design: designPaths,
      task: taskPath,
      checklist: checklistPath,
      dependencies,
    };
  },

  /**
   * 创建 Specs 目录结构
   */
  createSpecsDirectory(projectDir: string): void {
    Object.values(SPECS_DIR).forEach(dir => {
      const fullPath = path.join(projectDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  },

  /**
   * 生成详细需求文档
   */
  async generateRequirementDoc(projectDir: string, session: ClarificationSession): Promise<void> {
    const summary = session.summary;
    if (!summary) return;

    // 构建问答内容
    const qaContent = this.buildQAContent(session);

    const prompt = `你是一位资深产品经理，需要根据澄清结果生成详细的需求规格文档。

## 用户原始需求
${session.originalSummary.rawInput}

## 澄清问答记录
${qaContent}

## 需求摘要
- 目标用户：${summary.targetUser}
- 核心问题：${summary.coreProblem}
- 第一期功能：${summary.features.phase1.map(f => f.name).join('、')}
- 第二期功能：${summary.features.phase2.map(f => f.name).join('、')}
- 成功标准：${summary.successCriteria.join('、')}
- 约束条件：时间-${summary.constraints.time}，技术-${summary.constraints.tech}
- 数据来源：${summary.dataAndPermission.dataSource}
- 权限模型：${summary.dataAndPermission.permissionModel}

---

请生成一份**非常详细**的需求规格文档，直接使用 Write 工具写入文件。

文件路径：${path.join(projectDir, SPECS_DIR.requirement, 'REQ-主模块.md')}

文档内容要求：

\`\`\`markdown
# REQ-主模块 - 功能需求文档

## 文档信息
- **版本**: v1.0
- **状态**: 已完成
- **创建日期**: ${new Date().toISOString().split('T')[0]}
- **模块路径**: 主模块

## 1. 概述

### 1.1 项目背景
[根据澄清结果详细描述]

### 1.2 目标用户
[详细描述用户画像]

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
- **预估工时**: [估算]

[为每个功能重复上述结构]

### 2.2 第二期功能（P1/P2）
[同上结构]

## 3. 非功能需求

### 3.1 性能要求
- 响应时间: [具体指标]
- 并发用户: [具体指标]

### 3.2 安全要求
- [具体要求]

### 3.3 可用性要求
- [具体要求]

## 4. 数据需求

### 4.1 数据实体
| 实体名称 | 主要字段 | 数据来源 |
|---------|---------|---------|
| [实体] | [字段列表] | [来源] |

### 4.2 数据权限
[描述数据权限要求]

## 5. 界面需求

### 5.1 页面清单
| 页面名称 | 路由 | 功能描述 |
|---------|-----|---------|
| [页面] | [路由] | [描述] |

## 6. 接口需求

### 6.1 外部接口
[如需对接其他系统]

## 7. 约束条件

### 7.1 时间约束
${summary.constraints.time}

### 7.2 技术约束
${summary.constraints.tech}

### 7.3 资源约束
${summary.constraints.resource}

## 8. 验收标准

### 8.1 功能验收
${summary.successCriteria.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### 8.2 性能验收
[具体指标]

## 9. 风险与依赖

### 9.1 技术风险
[列出潜在风险]

### 9.2 外部依赖
[列出外部依赖]
\`\`\`

**重要规则**：
1. 必须使用 Write 工具创建文件，不要只输出内容
2. 内容必须非常详细，不能只是摘要
3. 所有内容都要基于澄清结果，不可凭空编造
4. 完成后输出一行确认：✅ 已生成需求文档`;

    await this.callClaudeForDoc(session.projectId, '需求文档', prompt);
    return path.join(projectDir, SPECS_DIR.requirement, 'REQ-主模块.md');
  },

  /**
   * 生成所有设计文档
   */
  async generateDesignDocs(projectDir: string, session: ClarificationSession): Promise<string[]> {
    const paths: string[] = [];

    // 架构设计
    await this.generateArchitectureDoc(projectDir, session);
    paths.push(path.join(projectDir, SPECS_DIR.design, '01-architecture.md'));

    // 数据模型
    await this.generateDataModelDoc(projectDir, session);
    paths.push(path.join(projectDir, SPECS_DIR.design, '02-data-model.md'));

    // UI/UX 规范
    await this.generateUIUXDoc(projectDir, session);
    paths.push(path.join(projectDir, SPECS_DIR.design, '03-ui-ux.md'));

    return paths;
  },

  /**
   * 生成架构设计文档
   */
  async generateArchitectureDoc(projectDir: string, session: ClarificationSession): Promise<void> {
    const summary = session.summary;
    if (!summary) return;

    const modules = [...summary.features.phase1, ...summary.features.phase2].map(f => f.name);

    const prompt = `你是一位资深系统架构师，需要根据需求生成详细的架构设计文档。

## 需求概述
- 目标用户：${summary.targetUser}
- 核心问题：${summary.coreProblem}
- 功能模块：${modules.join('、')}

## 技术栈约束
- 前端: Vue 3 + Vite + Element Plus + Pinia
- 后端: Spring Boot + MyBatis Plus
- 数据库: PostgreSQL
- 基于既有若依衍生模板增量开发，不从0搭建新系统

---

请生成一份**非常详细**的架构设计文档，直接使用 Write 工具写入文件。

文件路径：${path.join(projectDir, SPECS_DIR.design, '01-architecture.md')}

文档内容要求：

\`\`\`markdown
# 01 - 系统架构设计

## 文档信息
- **版本**: v1.0
- **创建日期**: ${new Date().toISOString().split('T')[0]}

## 1. 架构概述

### 1.1 系统定位
[详细描述]

### 1.2 设计原则
- [原则1]
- [原则2]

## 2. 技术架构

### 2.1 技术选型

| 层次 | 技术方案 | 选型理由 |
|-----|---------|---------|
| 前端 | Vue 3 + Vite + Element Plus | [理由] |
| 后端 | Spring Boot + MyBatis Plus | [理由] |
| 数据库 | PostgreSQL | [理由] |

### 2.2 架构图
\`\`\`
[ASCII 架构图]
\`\`\`

## 3. 目录结构

\`\`\`
project/
├── backend/
│   ├── inspur-admin/      # 启动模块
│   ├── inspur-framework/  # 框架能力
│   ├── inspur-system/     # 系统模块
│   └── sql/               # PostgreSQL 初始化脚本
├── frontend/
│   ├── src/views/         # 页面
│   ├── src/api/           # 接口封装
│   ├── src/store/         # Pinia 状态
│   └── src/router/        # 路由
└── AGENTS.md              # AI 编码约束
\`\`\`

## 4. 核心模块设计

### 4.1 ${modules[0] || '核心模块'}
- **职责**: [描述]
- **依赖**: [依赖的其他模块]
- **接口**: [对外暴露的接口]

[为每个模块重复]

## 5. 数据流设计

### 5.1 数据流向图
\`\`\`
[ASCII 数据流图]
\`\`\`

## 6. 安全设计

### 6.1 认证方案
[详细描述]

### 6.2 权限控制
${summary.dataAndPermission.permissionModel}

## 7. 部署架构

### 7.1 部署方案
[描述]

## 8. 扩展性考虑

### 8.1 水平扩展
[描述]

### 8.2 功能扩展
[描述]
\`\`\`

**重要规则**：
1. 必须使用 Write 工具创建文件
2. 内容必须非常详细
3. 完成后输出一行确认：✅ 已生成架构文档`;

    await this.callClaudeForDoc(session.projectId, '架构文档', prompt);
  },

  /**
   * 生成数据模型文档
   */
  async generateDataModelDoc(projectDir: string, session: ClarificationSession): Promise<void> {
    const summary = session.summary;
    if (!summary) return;

    const prompt = `你是一位资深数据架构师，需要根据需求生成详细的数据模型文档。

## 需求概述
- 功能模块：${[...summary.features.phase1, ...summary.features.phase2].map(f => f.name).join('、')}
- 数据来源：${summary.dataAndPermission.dataSource}
- 权限模型：${summary.dataAndPermission.permissionModel}

---

请生成一份**非常详细**的数据模型文档，直接使用 Write 工具写入文件。

文件路径：${path.join(projectDir, SPECS_DIR.design, '02-data-model.md')}

文档内容要求：

\`\`\`markdown
# 02 - 数据模型设计

## 文档信息
- **版本**: v1.0
- **创建日期**: ${new Date().toISOString().split('T')[0]}

## 1. 数据概述

### 1.1 数据特点
[描述数据特点]

### 1.2 数据量预估
[预估数据量]

## 2. 实体关系图

\`\`\`
[ASCII ER 图]
\`\`\`

## 3. 数据表设计

### 3.1 用户表 (users)

| 字段名 | 类型 | 必填 | 说明 |
|-------|-----|-----|------|
| id | string | Y | 主键，UUID |
| name | string | Y | 用户名 |
| email | string | Y | 邮箱 |
| password | string | Y | 密码哈希 |
| role | string | Y | 角色 |
| createdAt | string | Y | 创建时间 |
| updatedAt | string | Y | 更新时间 |

[为每个实体重复上述结构]

## 4. 索引设计

| 表名 | 索引字段 | 类型 | 说明 |
|-----|---------|-----|------|
| users | email | UNIQUE | 邮箱唯一 |

## 5. 数据字典

### 5.1 枚举值定义

\`\`\`typescript
// 用户角色
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

[其他枚举]
\`\`\`

## 6. 数据迁移策略

### 6.1 初始化数据
[描述初始化数据]

## 7. 数据安全

### 7.1 敏感数据处理
[描述敏感数据处理方式]
\`\`\`

**重要规则**：
1. 必须使用 Write 工具创建文件
2. 内容必须非常详细
3. 完成后输出一行确认：✅ 已生成数据模型文档`;

    await this.callClaudeForDoc(session.projectId, '数据模型文档', prompt);
  },

  /**
   * 生成 UI/UX 规范文档
   */
  async generateUIUXDoc(projectDir: string, session: ClarificationSession): Promise<void> {
    const summary = session.summary;
    if (!summary) return;

    const prompt = `你是一位资深 UI/UX 设计师，需要根据需求生成详细的界面设计规范文档。

## 需求概述
- 目标用户：${summary.targetUser}
- 核心问题：${summary.coreProblem}
- 功能模块：${[...summary.features.phase1, ...summary.features.phase2].map(f => f.name).join('、')}

---

请生成一份**非常详细**的 UI/UX 规范文档，直接使用 Write 工具写入文件。

文件路径：${path.join(projectDir, SPECS_DIR.design, '03-ui-ux.md')}

文档内容要求：

\`\`\`markdown
# 03 - UI/UX 设计规范

## 文档信息
- **版本**: v1.0
- **创建日期**: ${new Date().toISOString().split('T')[0]}

## 1. 设计原则

### 1.1 核心原则
- 简洁易用
- 一致性
- 可访问性

## 2. 视觉规范

### 2.1 色彩系统

| 名称 | 色值 | 用途 |
|-----|------|-----|
| 主色 | #6366f1 | 主要按钮、链接 |
| 辅色 | #8b5cf6 | 次要元素 |
| 成功 | #22c55e | 成功状态 |
| 警告 | #f59e0b | 警告状态 |
| 错误 | #ef4444 | 错误状态 |
| 背景 | #0f0a20 | 页面背景 |

### 2.2 字体规范

| 类型 | 大小 | 字重 | 行高 |
|-----|-----|-----|-----|
| H1 | 32px | 700 | 1.2 |
| H2 | 24px | 600 | 1.3 |
| Body | 16px | 400 | 1.5 |

### 2.3 间距规范
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

## 3. 组件规范

### 3.1 按钮

#### 主按钮
\`\`\`tsx
<Button variant="primary">确定</Button>
\`\`\`
- 背景: 主色
- 文字: 白色
- 圆角: 8px
- 最小高度: 40px

[其他组件规范]

## 4. 页面布局

### 4.1 整体布局
- 导航栏高度: 64px
- 侧边栏宽度: 240px
- 内容区最大宽度: 1200px

### 4.2 响应式断点
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px

## 5. 页面设计

### 5.1 登录页
- 居中卡片布局
- 背景: 渐变色
- 表单字段: 邮箱、密码

[为每个页面描述设计]

## 6. 交互规范

### 6.1 加载状态
- 按钮: 显示 loading 动画
- 页面: 骨架屏

### 6.2 空状态
- 显示空状态插图
- 引导用户操作

## 7. 动效规范

### 7.1 过渡动画
- 时长: 200-300ms
- 缓动: ease-in-out
\`\`\`

**重要规则**：
1. 必须使用 Write 工具创建文件
2. 内容必须非常详细
3. 完成后输出一行确认：✅ 已生成 UI/UX 规范文档`;

    await this.callClaudeForDoc(session.projectId, 'UI/UX规范文档', prompt);
  },

  /**
   * 生成任务清单
   */
  async generateTaskDoc(projectDir: string, session: ClarificationSession): Promise<void> {
    const summary = session.summary;
    if (!summary) return;

    const phase1Features = summary.features.phase1;

    const prompt = `你是一位资深项目经理，需要根据需求生成详细的任务清单文档。

## 需求概述
- 第一期功能：${phase1Features.map(f => f.name).join('、')}
- 第二期功能：${summary.features.phase2.map(f => f.name).join('、')}
- 约束条件：${summary.constraints.time}，${summary.constraints.resource}

---

请生成一份**非常详细**的任务清单文档，直接使用 Write 工具写入文件。

文件路径：${path.join(projectDir, SPECS_DIR.task, 'TASK-主模块.md')}

文档内容要求：

\`\`\`markdown
# TASK-主模块 - 任务清单

## 文档信息
- **版本**: v1.0
- **创建日期**: ${new Date().toISOString().split('T')[0]}
- **模块路径**: 主模块

## 任务总览

| 任务ID | 任务名称 | 优先级 | 预估工时 | 状态 | 依赖 |
|--------|---------|-------|---------|------|-----|
${phase1Features.map((f, i) => `| TASK-主模块-${f.name}-${String(i + 1).padStart(3, '0')} | ${f.name}实现 | ${f.priority} | 2d | 未开始 | - |`).join('\n')}

## 详细任务

### TASK-主模块-${phase1Features[0]?.name || '功能'}-001: ${phase1Features[0]?.name || '功能'}实现

#### 任务描述
[详细描述任务内容]

#### 验收标准
- [ ] 标准1
- [ ] 标准2
- [ ] 标准3

#### 技术要点
- [要点1]
- [要点2]

#### 子任务
- [ ] 子任务1
- [ ] 子任务2

[为每个任务重复上述结构]

## 任务依赖关系

\`\`\`
[ASCII 依赖关系图]
\`\`\`

## 里程碑

| 里程碑 | 预计完成 | 包含任务 |
|-------|---------|---------|
| M1: 基础框架 | 第1周 | TASK-xxx |
| M2: 核心功能 | 第2周 | TASK-xxx |
| M3: 完善优化 | 第3周 | TASK-xxx |
\`\`\`

**重要规则**：
1. 必须使用 Write 工具创建文件
2. 每个任务都要有明确的验收标准
3. 完成后输出一行确认：✅ 已生成任务清单`;

    await this.callClaudeForDoc(session.projectId, '任务清单', prompt);
    return path.join(projectDir, SPECS_DIR.task, 'TASK-主模块.md');
  },

  /**
   * 生成检查清单
   */
  async generateChecklistDoc(projectDir: string, session: ClarificationSession): Promise<void> {
    const summary = session.summary;
    if (!summary) return;

    const prompt = `你是一位资深 QA 工程师，需要根据需求生成详细的检查清单文档。

## 需求概述
- 功能模块：${[...summary.features.phase1, ...summary.features.phase2].map(f => f.name).join('、')}
- 成功标准：${summary.successCriteria.join('、')}

---

请生成一份**非常详细**的检查清单文档，直接使用 Write 工具写入文件。

文件路径：${path.join(projectDir, SPECS_DIR.checklist, 'CHK-主模块.md')}

文档内容要求：

\`\`\`markdown
# CHK-主模块 - 验收检查清单

## 文档信息
- **版本**: v1.0
- **创建日期**: ${new Date().toISOString().split('T')[0]}
- **模块路径**: 主模块

## 检查项总览

| 检查项ID | 检查内容 | 类型 | 状态 |
|----------|---------|-----|------|
| CHK-主模块-功能-001 | 功能检查项1 | 功能 | 未开始 |

## 详细检查项

### 1. 功能检查

#### CHK-主模块-功能-001: [检查项名称]
- **检查内容**: [详细描述]
- **检查方法**: [如何验证]
- **预期结果**: [期望的结果]
- **实际结果**: [留空，测试时填写]
- **状态**: [ ] 未通过 / [✅] 已通过

[为每个功能检查项重复]

### 2. UI/UX 检查

#### CHK-主模块-UI-001: 页面布局正确性
- **检查内容**: 所有页面布局符合设计规范
- **检查方法**: 视觉检查
- **状态**: [ ] 未通过 / [✅] 已通过

### 3. 性能检查

#### CHK-主模块-性能-001: 页面加载时间
- **检查内容**: 首页加载时间 < 3s
- **检查方法**: Lighthouse 测试
- **状态**: [ ] 未通过 / [✅] 已通过

### 4. 安全检查

#### CHK-主模块-安全-001: 认证机制
- **检查内容**: 未登录用户无法访问受保护页面
- **检查方法**: 手动测试
- **状态**: [ ] 未通过 / [✅] 已通过

### 5. 兼容性检查

#### CHK-主模块-兼容-001: 浏览器兼容
- **检查内容**: Chrome、Firefox、Safari 正常运行
- **状态**: [ ] 未通过 / [✅] 已通过

## 验收结论

- 功能检查通过率: 0/0
- UI/UX 检查通过率: 0/0
- 性能检查通过率: 0/0
- 安全检查通过率: 0/0

**最终结论**: [ ] 通过 / [ ] 不通过

## 问题记录

| 序号 | 问题描述 | 严重程度 | 状态 |
|-----|---------|---------|------|
| | | | |
\`\`\`

**重要规则**：
1. 必须使用 Write 工具创建文件
2. 检查项要覆盖功能、UI、性能、安全等方面
3. 完成后输出一行确认：✅ 已生成检查清单`;

    await this.callClaudeForDoc(session.projectId, '检查清单', prompt);
    return path.join(projectDir, SPECS_DIR.checklist, 'CHK-主模块.md');
  },

  /**
   * 分析依赖需求
   * 根据澄清结果分析项目需要的额外依赖
   */
  async analyzeDependencies(session: ClarificationSession): Promise<{
    dependencies: string[];
    devDependencies: string[];
  }> {
    const summary = session.summary;
    if (!summary) {
      return { dependencies: [], devDependencies: [] };
    }

    // 基础依赖（脚手架已包含）
    // - next, react, react-dom
    // - typescript, @types/react, @types/node
    // - tailwindcss, postcss, autoprefixer
    // - eslint, eslint-config-next

    const dependencies: string[] = [];
    const devDependencies: string[] = [];

    // 根据 tech 约束和功能需求推断额外依赖
    const features = [...summary.features.phase1, ...summary.features.phase2];
    const featureNames = features.map(f => f.name.toLowerCase());
    const techConstraint = summary.constraints.tech.toLowerCase();

    // 1. 若依模板已自带核心依赖，这里只补充功能性前端依赖

    // 2. UUID 生成
    dependencies.push('uuid');

    // 3. 表单处理（如果有表单相关功能）
    if (featureNames.some(f => f.includes('表单') || f.includes('登录') || f.includes('注册'))) {
      dependencies.push('react-hook-form');
      dependencies.push('zod');
    }

    // 4. 状态管理（如果功能较复杂）
    if (features.length > 5) {
      dependencies.push('zustand');
    }

    // 5. 图表相关（如果有数据可视化）
    if (featureNames.some(f => f.includes('图表') || f.includes('统计') || f.includes('可视化'))) {
      dependencies.push('recharts');
    }

    // 6. 日期处理（如果有日期相关功能）
    if (featureNames.some(f => f.includes('日期') || f.includes('时间') || f.includes('日程'))) {
      dependencies.push('date-fns');
    }

    // 7. 动画相关（如果有动画需求）
    if (featureNames.some(f => f.includes('动画') || f.includes('过渡'))) {
      dependencies.push('framer-motion');
    }

    // 8. 测试相关（devDependencies）
    devDependencies.push('@testing-library/react');
    devDependencies.push('@testing-library/jest-dom');
    devDependencies.push('jest');
    devDependencies.push('jest-environment-jsdom');

    logSystemInfo(session.projectId, '依赖分析完成', {
      dependencies,
      devDependencies,
    });

    return { dependencies, devDependencies };
  },

  /**
   * 构建 QA 内容
   */
  buildQAContent(session: ClarificationSession): string {
    const lines: string[] = [];

    for (let round = 1; round <= session.currentRound; round++) {
      const roundQuestions = session.questions.filter(q => q.round === round);
      if (roundQuestions.length === 0) continue;

      lines.push(`### 第${round}轮问答`);
      roundQuestions.forEach((q, i) => {
        const ans = session.answers.find(a => a.questionId === q.id);
        const answerText = ans
          ? (Array.isArray(ans.answer) ? ans.answer.join('、') : ans.answer)
          : '未回答';
        lines.push(`**Q${i + 1}: ${q.question}**`);
        lines.push(`A: ${answerText}`);
        lines.push('');
      });
    }

    return lines.join('\n');
  },

  /**
   * 调用 Claude 生成文档
   */
  async callClaudeForDoc(projectId: string, docName: string, prompt: string): Promise<void> {
    logCCCommand(projectId, prompt, { doc: docName, timeout: 180000 });

    const startTime = Date.now();
    const claudeProcess = spawnClaudeNonInteractive(prompt, { timeout: 180000 });

    let output = '';
    let error = '';

    claudeProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      console.log(`[${docName}] ${text.trim()}`);
      logCCStream(projectId, `[${docName}] ${text}`);
    });

    claudeProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    await new Promise<void>((resolve, reject) => {
      claudeProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        logCCResponse(projectId, {
          success: code === 0,
          output,
          error: error || undefined,
          duration,
        });

        if (code === 0) {
          console.log(`✅ ${docName}生成完成`);
          logSystemInfo(projectId, `${docName}生成完成`, { duration });
          resolve();
        } else {
          console.error(`❌ ${docName}生成失败: code ${code}`);
          reject(new Error(`Claude exited with code ${code}`));
        }
      });

      claudeProcess.on('error', (err) => {
        reject(err);
      });
    });
  },
};