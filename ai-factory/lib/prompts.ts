/**
 * 提示词模板
 */

import * as fs from 'fs';
import * as path from 'path';

// 加载模板提示词
function loadTemplatePrompt(type: 'system' | 'dashboard'): string {
  try {
    const templatePath = path.join(process.cwd(), 'lib', 'templates', type, `${type === 'system' ? 'sidebar' : 'dashboard'}-prompt.md`);
    return fs.readFileSync(templatePath, 'utf-8');
  } catch {
    return '';
  }
}

export interface PromptContext {
  requirement: string;
  answers: Record<string, any>;
  design: {
    title?: string;
    techStack?: {
      frontend?: string[];
      backend?: string[];
      ui?: string[];
    };
    modules?: Array<{ id: string; name: string; icon: string }>;
    features?: string[];
    designStyle?: string;
  };
}

/**
 * UI 设计规范 - 用于代码生成
 */
export const UI_DESIGN_GUIDELINES = `
## UI 设计规范（必须遵循）

### 颜色系统
- 主色 Primary: #8B5CF6 (紫色) - 用于按钮、链接、高亮
- 主色深 Primary Dark: #7C3AED - 用于 hover 状态
- 辅助色 Secondary: #3B82F6 (蓝色) - 用于渐变搭配
- 强调色 Accent: #22C55E (绿色) - 用于成功、运行、CTA
- 错误色 Error: #EF4444 (红色)
- 警告色 Warning: #F59E0B (黄色)
- 背景色 Background: #0A0A1A (深色)
- 卡片背景 Surface: #12121A
- 悬浮背景 Elevated: #1A1A2E
- 主要文字: #F8FAFC (白色)
- 次要文字: #94A3B8 (灰色)
- 辅助文字: #64748B (浅灰)

### 渐变定义
- 主按钮渐变: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)
- Hero 标题渐变: linear-gradient(90deg, #A855F7, #EC4899, #3B82F6)

### 字体
- 标题字体: Space Grotesk (Google Font)
- 正文字体: DM Sans (Google Font)
- 代码字体: JetBrains Mono (Google Font)

### 组件样式

#### 按钮
\`\`\`tsx
// Primary Button
<button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg shadow-purple-500/20 cursor-pointer">
  开始创造
</button>

// Secondary Button
<button className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all cursor-pointer">
  取消
</button>

// Ghost Button (icon only)
<button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer">
  <Icon className="w-5 h-5" />
</button>
\`\`\`

#### 卡片
\`\`\`tsx
// Standard Card
<div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-purple-500/30 transition-all cursor-pointer backdrop-blur-sm">
  <h3 className="text-lg font-semibold text-white mb-2">标题</h3>
  <p className="text-gray-400 text-sm">描述内容</p>
</div>

// Feature Card
<div className="p-5 rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group">
  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
    <Icon className="w-6 h-6 text-purple-400" />
  </div>
  <h3 className="text-lg font-semibold text-white mb-1">功能标题</h3>
  <p className="text-gray-400 text-sm">功能描述</p>
</div>
\`\`\`

#### 输入框
\`\`\`tsx
<input
  type="text"
  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
  placeholder="输入内容..."
/>
\`\`\`

#### 导航栏
\`\`\`tsx
<nav className="fixed top-4 left-4 right-4 z-50 backdrop-blur-xl bg-black/50 border border-white/10 rounded-2xl px-6 py-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="font-bold text-white">品牌名称</span>
    </div>
    <div className="flex items-center gap-4">
      <a href="#" className="text-gray-400 hover:text-white transition-colors cursor-pointer">功能</a>
      <button className="btn-primary">登录</button>
    </div>
  </div>
</nav>
\`\`\`

#### 模态框
\`\`\`tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
  <div className="w-full max-w-md p-6 rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0f0f2f] border border-white/10 shadow-2xl">
    {/* content */}
  </div>
</div>
\`\`\`

### 图标规范（重要）
- 使用 Lucide React 图标库
- 禁止使用 emoji 作为 UI 图标
- 安装: \`pnpm add lucide-react\`
- 使用示例:
\`\`\`tsx
import { Rocket, Plus, Settings, User, Home } from 'lucide-react';

// 正确用法
<Rocket className="w-5 h-5" />
<button className="flex items-center gap-2">
  <Plus className="w-4 h-4" />
  <span>新建</span>
</button>
\`\`\`

### 动画规范
- 所有过渡时间: 150ms - 300ms
- 使用 Tailwind 的 transition-all 或 transition-colors
- hover 状态不要使用 scale 导致布局跳动
- 示例: \`transition-all duration-200 ease-in-out\`

### 无障碍规范
- 所有可点击元素必须有 cursor-pointer
- 所有表单输入必须有 label 关联
- 图片必须有 alt 属性
- 保持文字对比度 >= 4.5:1

### 响应式断点
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px
`;

/**
 * 构建完整的代码生成提示词
 */
export function buildCodePrompt(context: PromptContext): string {
  const { requirement, answers, design } = context;

  // 加载模板内容
  const systemTemplate = loadTemplatePrompt('system');
  const dashboardTemplate = loadTemplatePrompt('dashboard');

  const prefix = `你是一个专业的全栈开发工程师，项目已基于若依衍生模板创建，必须在既有代码树上增量开发。

## 项目结构

项目实例已创建以下标准结构：

\`\`\`
backend/
├── inspur-admin/      # 启动模块
├── inspur-framework/  # 框架能力
├── inspur-system/     # 系统模块
└── sql/               # PostgreSQL 脚本
frontend/
├── src/views/         # 页面
├── src/api/           # 接口封装
├── src/store/         # Pinia 状态
├── src/router/        # 路由
└── src/components/    # 公共组件
AGENTS.md              # AI 编码指南（已存在）
\`\`\`

## 用户需求
${requirement}

## 用户补充信息
${formatAnswers(answers)}

## 设计方案
- 项目名称: ${design?.title || 'AI Generated App'}
- 技术栈: Spring Boot, Vue 3, Vite, Element Plus, PostgreSQL
- 功能模块: ${(design?.modules || []).map((m) => m.name).join(', ')}
- 设计风格: ${design?.designStyle || '现代简约风格'}

## 可选 UI 风格模板

系统为你准备了以下 UI 风格模板，请根据用户需求**自行判断**使用哪套（可组合使用）：

### 模板A：左侧菜单管理系统（适合：各类管理系统、业务平台、后台系统、CRM、ERP等）

${systemTemplate}

---

### 模板B：全屏数据大屏（适合：数据可视化大屏、监控大屏、数据分析看板、指挥驾驶舱等）

${dashboardTemplate}

---

### 模板C：现代暗色主题（适合：个人网站、作品集、工具类应用、非管理类应用等）

深色主题，渐变色背景，毛玻璃效果（backdrop-blur），渐变按钮，发光边框，类似 Vercel、Linear 的现代 UI 风格。

## UI 风格选择（你必须做出判断）

根据用户需求，判断应该使用哪种 UI 风格：
1. 如果用户需求是管理系统、业务平台、后台等 → 使用模板A
2. 如果用户需求是数据大屏、监控大屏、数据可视化看板等 → 使用模板B
3. 如果用户需求是个人网站、工具应用等 → 使用模板C
4. 如果用户需求同时包含系统和大屏 → 组合使用模板A+B（左侧菜单导航 + 首页数据大屏）

### 通用模块要求

当选择模板A（左侧菜单管理系统）时，**必须**在导航栏"通用模块"区域包含以下6个模块：
1. **用户管理** - 用户名、姓名、邮箱、手机号、角色、部门、状态
2. **角色管理** - 角色名称、描述、权限数、成员数、状态
3. **系统设置** - 配置项名称、配置值、说明、分类、状态
4. **操作日志** - 时间、操作人、操作类型、操作对象、IP、结果
5. **文件管理** - 文件名、大小、类型、上传者、上传时间、状态
6. **数据报表** - 报表名称、周期、生成时间、操作人、状态

**注意**：用户的具体需求优先于模板。如果用户指定了某种风格、配色或布局要求，以用户需求为准。

${UI_DESIGN_GUIDELINES}

## 技术要求
1. **禁止重建项目**：必须在现有 backend/frontend 目录增量开发
2. **后端遵循若依结构**：Controller、Service、Mapper、Domain、XML 分层清晰
3. **前端遵循若依 Vue 结构**：views、api、store、router 内增量实现
4. **接口返回遵循若依风格**：AjaxResult、TableDataInfo
5. **数据库使用 PostgreSQL**：统一连接 172.22.4.4:5432/AI_fec_test，项目独立 schema
6. **参考 AGENTS.md**：遵循项目中 AGENTS.md 的编码指南
7. **优先复用现有能力**：权限、分页、字典、日志、导入导出等
8. 禁止使用 emoji 作为图标

## 输出格式要求
每个文件使用以下格式标注：
### 文件路径: 相对路径

\`\`\`语言
代码内容
\`\`\`

`;
  const suffix = `

## 代码质量要求
1. 变量和函数使用驼峰命名
2. 组件使用 PascalCase 命名
3. 添加必要的类型注释
4. 关键逻辑添加注释
5. 错误处理完善
6. 安全性考虑（防XSS、SQL注入等）

## 开发顺序
1. **识别可复用模块**：优先复用既有若依能力
2. **实现后端**：domain、mapper、service、controller、SQL
3. **实现前端**：api、views、router、store
4. **补齐权限与菜单**：角色、按钮、路由与菜单联动
5. **联调验证**：前后端联通、分页、表单、列表、权限验证

请开始在若依模板基础上开发业务代码...`;

  return prefix + suffix;
}

/**
 * 格式化用户回答
 */
function formatAnswers(answers: Record<string, any>): string {
  if (!answers || Object.keys(answers).length === 0) {
    return '（无补充信息）';
  }

  return Object.entries(answers)
    .map(([key, value]) => {
      const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
      return `- ${key}: ${formattedValue}`;
    })
    .join('\n');
}

/**
 * 构建需求分析提示词
 */
export function buildAnalysisPrompt(requirement: string): string {
  return `分析以下用户需求，提取关键信息：

用户需求：
${requirement}

请从以下维度分析：
1. 核心功能需求
2. 涉及的用户角色
3. 数据实体
4. 技术复杂度评估
5. 潜在风险点

以 JSON 格式返回分析结果。`;
}

/**
 * 构建问题生成提示词（产品经理视角）
 */
export function buildQuestionsPrompt(requirement: string): string {
  return `你是一位顶级产品经理，正在帮助客户梳理他们真正需要的产品。

客户说：
${requirement}

---

## 你的任务

生成两类问题，共10个选择题 + 1个补充问题：

### 🔧 技术问题（5个）
简洁直接的技术选型问题，让用户快速选择。
如果用户不懂技术，提供"你帮我选"选项。
涵盖：前端、后端、数据库、部署方式、其他技术偏好。

### 📋 产品问题（5个）
站在用户角度，问他们真正关心的问题。
聚焦：谁用、痛点在哪、能力水平、期望效果、优先级。

### 📝 补充问题（1个）
给用户一个补充其他需求的机会，非必填。

记住：用户不关心"功能"，用户关心的是"我能完成什么"。

## 输出格式

返回 JSON 数组，共 11 个问题，必须包含 \`category\` 字段区分类型：

\`\`\`json
[
  // ===== 🔧 技术问题（category: "tech"）=====
  {
    "id": "t1",
    "category": "tech",
    "type": "radio",
    "question": "前端用哪个框架？",
    "options": ["React", "Vue", "Next.js", "你帮我选"],
    "required": false
  },
  {
    "id": "t2",
    "category": "tech",
    "type": "radio",
    "question": "后端用什么语言？",
    "options": ["Node.js", "Python", "Go", "Java", "你帮我选"],
    "required": false
  },
  {
    "id": "t3",
    "category": "tech",
    "type": "radio",
    "question": "数据库用哪种？",
    "options": ["MySQL", "PostgreSQL", "MongoDB", "SQLite（轻量）", "你帮我选"],
    "required": false
  },
  {
    "id": "t4",
    "category": "tech",
    "type": "radio",
    "question": "怎么部署？",
    "options": ["云端服务器", "本地部署", "容器化部署", "你帮我选"],
    "required": false
  },
  {
    "id": "t5",
    "category": "tech",
    "type": "radio",
    "question": "需要支持移动端吗？",
    "options": ["只做网页版", "需要手机端适配", "需要原生APP", "你帮我选"],
    "required": false
  },

  // ===== 📋 产品问题（category: "product"）=====
  {
    "id": "p1",
    "category": "product",
    "type": "radio",
    "question": "这个系统主要是您自己用，还是团队一起用？",
    "options": ["就我自己用", "小团队（5人以内）", "中型团队（5-20人）", "大团队（20人以上）"],
    "required": true
  },
  {
    "id": "p2",
    "category": "product",
    "type": "radio",
    "question": "您现在做这件事最麻烦的是什么？",
    "options": ["操作太繁琐", "数据容易出错", "协作不方便", "缺少数据统计", "其他"],
    "required": true
  },
  {
    "id": "p3",
    "category": "product",
    "type": "radio",
    "question": "用这个系统的人，电脑熟练吗？",
    "options": ["都很熟练", "一般水平", "不太熟练，要简单易用"],
    "required": true
  },
  {
    "id": "p4",
    "category": "product",
    "type": "radio",
    "question": "您对系统界面有什么偏好？",
    "options": ["简洁现代", "功能丰富", "数据可视化强", "没有特别要求"],
    "required": false
  },
  {
    "id": "p5",
    "category": "product",
    "type": "radio",
    "question": "如果只能先做一个核心功能，您选哪个？",
    "options": ["数据管理", "用户权限", "报表统计", "工作流程", "其他"],
    "required": true
  },

  // ===== 📝 补充问题（category: "extra"）=====
  {
    "id": "e1",
    "category": "extra",
    "type": "textarea",
    "question": "还有什么想补充的吗？（非必填）",
    "required": false
  }
]
\`\`\`

现在请根据用户需求生成问题，确保：
1. 技术问题5个，category 为 "tech"，type 为 "radio"
2. 产品问题5个，category 为 "product"，type 为 "radio"
3. 补充问题1个，category 为 "extra"，type 为 "textarea"
4. 产品问题要让用户感觉到你理解他的处境，在帮他思考。`;
}

/**
 * 前缀提示词模板
 */
export const PREFIX_TEMPLATES = {
  // 企业级管理系统
  enterprise: `你正在开发一个企业级管理系统，需要特别关注：
- 权限控制和角色管理
- 数据安全和审计日志
- 高并发处理
- 数据报表和统计功能
`,
  // 移动端优先
  mobile: `你正在开发一个移动端优先的应用，需要特别关注：
- 响应式设计
- 触摸交互优化
- 性能优化（首屏加载）
- 离线功能支持
`,
  // 实时协作
  collaboration: `你正在开发一个实时协作应用，需要特别关注：
- WebSocket 实时通信
- 状态同步机制
- 冲突解决策略
- 在线状态显示
`,
};

/**
 * 后缀提示词模板
 */
export const SUFFIX_TEMPLATES = {
  // 强调安全性
  security: `

## 安全性要求
- 所有用户输入必须验证和清洗
- API 路由需要认证中间件
- 敏感数据加密存储
- 防止常见攻击（XSS, CSRF, SQL注入）
`,
  // 强调性能
  performance: `

## 性能要求
- 使用 React Query 进行数据缓存
- 图片和资源懒加载
- 代码分割和动态导入
- 优化首屏加载时间
`,
  // 强调用户体验
  ux: `

## 用户体验要求
- 加载状态和骨架屏
- 友好的错误提示
- 流畅的页面过渡动画
- 键盘导航支持
`,
};