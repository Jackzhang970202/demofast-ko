import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, insert, queryOne, update } from '@/lib/db';
import { logSystemInfo, logSystemError } from '@/lib/logger';
import {
  registerProcess,
  addCheckpoint,
  saveExecutionState,
  getExecutionState,
} from '@/server/services/execution-state.service';
import { WorkflowStateService } from '@/server/services/workflow-state.service';
import { ClaudeckService, getProjectCwd } from '@/server/services/claudeck.service';
import { PortAllocatorService } from '@/server/services/port-allocator.service';
import { ScaffoldService } from '@/server/services/scaffold.service';
import { TemplateConfigService } from '@/server/services/template-config.service';
import { EnvironmentPreflightService } from '@/server/services/environment-preflight.service';
import type { ClaudeckMessage } from '@/types/claudeck';

// 加载模板提示词
function loadTemplatePrompt(type: 'system' | 'dashboard'): string {
  try {
    const templatePath = path.join(process.cwd(), 'lib', 'templates', type, `${type === 'system' ? 'sidebar' : 'dashboard'}-prompt.md`);
    return fs.readFileSync(templatePath, 'utf-8');
  } catch {
    return '';
  }
}

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
    '.html': 'html',
    '.md': 'markdown',
  };
  return langMap[ext] || 'plaintext';
}

// 收集目录中的所有文件
function collectFiles(dir: string, baseDir: string = dir): ProjectFile[] {
  const files: ProjectFile[] = [];
  if (!fs.existsSync(dir)) {
    console.log(`[Developer] 目录不存在: ${dir}`);
    return files;
  }

  console.log(`[Developer] 扫描目录: ${dir}`);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  console.log(`[Developer] 找到 ${entries.length} 个条目`);

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      console.log(`[Developer] 跳过: ${entry.name}`);
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
      console.log(`[Developer] 收集文件: ${relativePath} (${content.length} chars)`);
    }
  }
  return files;
}

function countBusinessChanges(files: ProjectFile[]): number {
  return files.filter(file => {
    const normalizedPath = file.path.replace(/\\/g, '/');
    return !normalizedPath.startsWith('backend/sql/')
      && !normalizedPath.startsWith('backend/inspur-admin/src/main/resources/application-')
      && !normalizedPath.startsWith('frontend/node_modules/')
      && !normalizedPath.endsWith('package-lock.json')
      && !normalizedPath.endsWith('pnpm-lock.yaml')
      && !normalizedPath.endsWith('.warmup-dev-mode');
  }).length;
}

// 构建详细需求描述
function buildDetailedRequirement(
  requirement: string,
  answers: Record<string, any>,
  session: any
): string {
  const lines: string[] = [];

  // 1. 原始需求
  lines.push('## 用户原始需求');
  lines.push(requirement);
  lines.push('');

  // 2. 澄清回答
  if (answers && Object.keys(answers).length > 0) {
    lines.push('## 用户澄清回答');
    Object.entries(answers).forEach(([question, answer]) => {
      const answerText = Array.isArray(answer) ? answer.join('、') : answer;
      lines.push(`- ${question}: ${answerText}`);
    });
    lines.push('');
  }

  // 3. 如果有完整的 session 摘要
  if (session?.summary) {
    const summary = session.summary;

    lines.push('## 详细需求分析');
    lines.push('');

    lines.push('### 目标用户');
    lines.push(summary.targetUser || '未明确');
    lines.push('');

    lines.push('### 核心问题');
    lines.push(summary.coreProblem || '未明确');
    lines.push('');

    lines.push('### 第一期功能（必须实现）');
    if (summary.features?.phase1?.length > 0) {
      summary.features.phase1.forEach((f: any) => {
        lines.push(`- **${f.name}** (${f.priority}) - ${f.reason || ''}`);
      });
    }
    lines.push('');

    lines.push('### 第二期功能（可选）');
    if (summary.features?.phase2?.length > 0) {
      summary.features.phase2.forEach((f: any) => {
        lines.push(`- ${f.name} (${f.priority})`);
      });
    } else {
      lines.push('无');
    }
    lines.push('');

    lines.push('### 明确不做的事项');
    if (summary.features?.excluded?.length > 0) {
      summary.features.excluded.forEach((f: any) => {
        lines.push(`- ${f.name} - 原因: ${f.reason}`);
      });
    } else {
      lines.push('无');
    }
    lines.push('');

    lines.push('### 成功标准');
    if (summary.successCriteria?.length > 0) {
      summary.successCriteria.forEach((s: string) => {
        lines.push(`- ${s}`);
      });
    }
    lines.push('');

    lines.push('### 约束条件');
    lines.push(`- **时间约束**: ${summary.constraints?.time || '未提及'}`);
    lines.push(`- **技术约束**: ${summary.constraints?.tech || '未提及'}`);
    lines.push(`- **资源约束**: ${summary.constraints?.resource || '未提及'}`);
    lines.push('');

    lines.push('### 数据与权限');
    lines.push(`- **数据来源**: ${summary.dataAndPermission?.dataSource || '未提及'}`);
    lines.push(`- **权限模型**: ${summary.dataAndPermission?.permissionModel || '未提及'}`);
    lines.push('');
  }

  return lines.join('\n');
}

function loadProjectSpecs(projectId: string): string {
  const specsBaseDir = path.join(process.cwd(), 'data', 'projects', projectId, 'specs');
  const specFiles = [
    path.join(specsBaseDir, 'requirement', 'REQ-主模块.md'),
    path.join(specsBaseDir, 'design', '01-architecture.md'),
    path.join(specsBaseDir, 'design', '02-data-model.md'),
    path.join(specsBaseDir, 'design', '03-ui-ux.md'),
  ];

  const sections = specFiles
    .filter(filePath => fs.existsSync(filePath))
    .map(filePath => {
      const relativePath = path.relative(path.join(process.cwd(), 'data', 'projects', projectId), filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath, 'utf-8');
      return `## ${relativePath}\n\n${content}`;
    });

  return sections.join('\n\n---\n\n');
}

// 构建开发工程师提示词（基于脚手架）
function buildDeveloperPrompt(projectId: string, detailedRequirement: string, projectSpecs: string, scaffoldFiles: string[] = []): string {
  const existingFiles = scaffoldFiles.length > 0
    ? scaffoldFiles.map(f => `- ${f}`).join('\n')
    : '（项目实例已创建，包含标准若依模板文件）';

  const projectStructure = `
backend/
├── inspur-admin/      # 启动模块
├── inspur-framework/  # 框架能力
├── inspur-system/     # 系统模块
└── sql/               # PostgreSQL 脚本
frontend/
├── src/views/         # 页面
├── src/api/           # 接口
├── src/store/         # Pinia
├── src/router/        # 路由
└── src/components/    # 公共组件
`;

  // 加载模板内容
  const systemTemplate = loadTemplatePrompt('system');
  const dashboardTemplate = loadTemplatePrompt('dashboard');

  return `你是一个专业的全栈开发工程师和 UI/UX 设计师，正在若依衍生模板中增量开发。

## 项目结构

项目已基于若依衍生模板创建，具有以下标准结构：

${projectStructure}

### 已存在的文件

以下文件已由脚手架创建，**不要重新创建**：
${existingFiles}

## 详细需求

${detailedRequirement}

## 已生成的 specs（项目固定目录）

以下内容来自项目内固定目录 data/projects/${projectId}/specs，你必须以这些文档为主进行实现，不能忽略，也不能声称找不到：

${projectSpecs || '（未读取到 specs 内容）'}

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

这些通用模块与用户的业务模块一起构成完整的系统。

**注意**：用户的具体需求优先于模板。如果用户指定了某种风格、配色或布局要求，以用户需求为准，可以覆盖或修改模板的任何样式。

## 你选择的 UI 风格

在开始写代码前，先声明你选择的风格（例如："我将使用模板A：左侧菜单管理系统"），然后根据选择的模板要求进行开发。

## ⭐⭐⭐ 重要规则（必须遵守）⭐⭐⭐

### 文档边界

1. specs 在项目固定目录中已经存在，禁止回答“缺少 specs / task / checklist”
2. 本次任务是代码开发，不是需求分析，不要输出 TodoWrite，不要规划新的待办
3. 如果 specs 中缺少 task/checklist，也必须基于现有 requirement/design 直接继续增量开发
4. 不允许只复制脚手架后结束，必须产出业务代码、菜单、接口、SQL、页面中的至少一部分真实改动

### 🚨 执行规则

**必须使用 Write 工具逐个创建/修改文件！**

执行方式：
1. 使用 Write 工具修改或创建第一个文件
2. 等待 Write 工具执行完成，确认文件已写入
3. 输出一行确认信息，如 "✅ 已创建: app/api/users/route.ts"
4. 然后处理下一个文件
5. 重复以上步骤

### 开发规则

1. **禁止重建项目**：必须在现有 backend/frontend 目录增量开发
2. **不要修改启动脚本语义**：端口由系统动态分配
3. **后端遵循若依结构**：Controller、Service、Mapper、Domain、XML 分层清晰
4. **前端遵循若依 Vue 结构**：views、api、store、router 内增量实现
5. **接口返回遵循若依风格**：AjaxResult、TableDataInfo
6. **参考 AGENTS.md**：遵循项目中 AGENTS.md 的编码指南
7. **数据库使用 PostgreSQL**：统一连接 172.22.4.4:5432/AI_fec_test
8. **优先复用现有能力**：权限、分页、字典、日志、导入导出等
9. **禁止操作 9009 端口**：9009 是系统服务端口，禁止使用 lsof、fuser 等命令操作该端口，也不要手动启动或测试服务

### 离线要求

1. **禁止使用任何外部图片 URL**（如 unsplash、picsum 等）
2. **禁止使用外部 CDN**（如 cdn.tailwindcss.com、fonts.googleapis.com 等）
3. **禁止使用需要编译的原生模块**（如 better-sqlite3、sharp、bcrypt 等）
4. 所有图片使用以下方案替代：
   - 使用 SVG 图标（内联）
   - 使用 CSS 渐变/形状
   - 使用 emoji
5. 字体使用系统默认字体，不引入外部字体

### 技术要求

1. 基于既有若依项目结构增量开发
2. 前后端模块拆分合理，避免单文件过大
3. 优先复用现有框架能力与类型定义
4. 数据落 PostgreSQL，遵循项目独立 schema

## 开发顺序

1. **识别可复用模块**：优先复用既有若依能力
2. **实现后端**：domain、mapper、service、controller、SQL
3. **实现前端**：api、views、router、store
4. **补齐权限与菜单**：角色、按钮、路由与菜单联动
5. **联调验证**：前后端联通、分页、表单、列表、权限验证

**请按照上述顺序，逐个处理文件。**`;
}

// 开发工程师 - 代码生成（使用 Claudeck）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirement = '', answers = {}, design, projectId: inputProjectId, session, specs } = body;

    if (!requirement) {
      return NextResponse.json(
        { code: 400, message: '需求描述不能为空' },
        { status: 400 }
      );
    }

    // 使用前端传来的 projectId，或者生成新的
    const projectId = inputProjectId || `proj_${uuidv4().substring(0, 8)}`;
    const projectDir = path.join(process.cwd(), 'data', 'projects', projectId, 'generated');

    // 初始化执行状态
    const existingState = getExecutionState(projectId);
    if (!existingState) {
      saveExecutionState({
        projectId,
        status: 'running',
        currentStage: 'developer',
        startTime: Date.now(),
        checkpoints: [],
      });
    } else {
      existingState.status = 'running';
      existingState.currentStage = 'developer';
      saveExecutionState(existingState);
    }

    console.log('\n' + '👨‍💻'.repeat(40));
    console.log('👨‍💻 开发工程师 - 开始生成代码 (Claudeck)');
    console.log(`📁 项目ID: ${projectId}`);
    console.log('👨‍💻'.repeat(40) + '\n');

    // ==================== 脚手架创建流程 ====================

    const workflowState = await WorkflowStateService.getState(projectId);
    const effectiveSpecs = specs || workflowState?.phaseData?.specs;
    const projectSpecs = loadProjectSpecs(projectId);
    let assignedPort: number | undefined = workflowState?.phaseData?.assignedPort ?? undefined;
    let backendPort: number | undefined = workflowState?.phaseData?.backendPort ?? undefined;
    let scaffoldCreated = workflowState?.phaseData?.scaffoldCreated || false;
    let scaffoldFiles: string[] = [];

    const preflight = await EnvironmentPreflightService.runChecks();
    if (!preflight.ok) {
      return NextResponse.json(
        { code: 500, message: '若依运行环境未就绪', data: preflight },
        { status: 500 }
      );
    }

    // 1. 检查脚手架是否存在
    const scaffoldExists = await ScaffoldService.checkScaffolded(projectDir);

    if (!scaffoldExists) {
      console.log('[Developer] 脚手架不存在，开始创建...');

      // 2. 创建脚手架
      const scaffoldResult = await ScaffoldService.createScaffold({
        projectId,
        projectName: design?.title || `project-${projectId}`,
        targetDir: projectDir,
      });

      if (!scaffoldResult.success) {
        console.error('[Developer] 脚手架创建失败:', scaffoldResult.error);
        return NextResponse.json(
          { code: 500, message: `脚手架创建失败: ${scaffoldResult.error}` },
          { status: 500 }
        );
      }

      scaffoldCreated = true;
      console.log('[Developer] 脚手架创建成功');

      assignedPort = await PortAllocatorService.allocatePort(`${projectId}:frontend`);
      backendPort = await PortAllocatorService.allocatePort(`${projectId}:backend`);
      console.log(`[Developer] 分配前端端口: ${assignedPort}`);
      console.log(`[Developer] 分配后端端口: ${backendPort}`);

      // 4. 安装额外依赖
      const deps = effectiveSpecs?.dependencies || { dependencies: [], devDependencies: [] };
      if (deps.dependencies.length > 0 || deps.devDependencies.length > 0) {
        console.log('[Developer] 安装额外依赖...');
        const installResult = await ScaffoldService.installDependencies(
          projectDir,
          deps.dependencies,
          deps.devDependencies
        );
        console.log('[Developer] 依赖安装结果:', installResult);
      }

      // 5. 保存脚手架状态
      await WorkflowStateService.savePhaseData(projectId, {
        scaffoldCreated: true,
        assignedPort,
        backendPort,
        schemaName: scaffoldResult.schemaName,
        managedTemplateDir: scaffoldResult.managedTemplateDir,
        environmentReady: true,
        dependenciesInstalled: deps.dependencies,
      });
    } else {
      console.log('[Developer] 脚手架已存在，跳过创建');
      // 获取已分配的端口
      if (!assignedPort) {
        assignedPort = (await PortAllocatorService.getPort(`${projectId}:frontend`)) ?? undefined;
        if (!assignedPort) {
          assignedPort = await PortAllocatorService.allocatePort(`${projectId}:frontend`);
        }
        if (!backendPort) {
          backendPort = (await PortAllocatorService.getPort(`${projectId}:backend`)) ?? undefined;
          if (!backendPort) {
            backendPort = await PortAllocatorService.allocatePort(`${projectId}:backend`);
          }
        }
      }
    }

    // 获取脚手架文件列表
    scaffoldFiles = ScaffoldService.getScaffoldFiles(projectDir);
    console.log(`[Developer] 脚手架包含 ${scaffoldFiles.length} 个文件`);

    // ==================== 代码生成流程 ====================

    // 记录系统日志 - 开始生成
    logSystemInfo(projectId, '开发工程师开始生成代码 (Claudeck)', {
      requirement: requirement.substring(0, 200),
      scaffoldCreated,
      assignedPort,
    });

    // 构建详细的需求描述
    const detailedRequirement = buildDetailedRequirement(requirement, answers, session);
    const prompt = buildDeveloperPrompt(projectId, detailedRequirement, projectSpecs, scaffoldFiles);

    const startTime = Date.now();
    let output: string[] = [];

    try {
      // 初始化 Claudeck 服务
      await ClaudeckService.init();

      // 使用 Chat 模式运行代码生成（40分钟超时）
      const result = await ClaudeckService.chat(
        prompt,
        projectDir,
        {
          projectId,
          permissionMode: 'bypass',
          timeout: 5400000, // 90分钟超时
          onMessage: (msg: ClaudeckMessage) => {
            if (msg.type === 'text') {
              // 文本消息 - 显示完整内容
              const text = (msg as any).text || '';
              console.log(`[Developer] 📝 ${text}`);
            } else if (msg.type === 'tool') {
              // 工具调用 - 显示工具名 + 参数
              const toolMsg = msg as any;
              const toolName = toolMsg.name || '';
              const input = toolMsg.input || {};
              console.log(`[Developer] 🔧 Tool: ${toolName}`);
              if (Object.keys(input).length > 0) {
                console.log(`[Developer]    参数: ${JSON.stringify(input, null, 2)}`);
              }
            } else if (msg.type === 'tool_result') {
              // 工具结果 - 根据内容长度智能显示
              const resultMsg = msg as any;
              const result = resultMsg.output || resultMsg.result || '';
              const hasError = resultMsg.error || resultMsg.success === false;
              const icon = hasError ? '❌' : '✅';

              if (result.length > 500) {
                console.log(`[Developer] ${icon} Result (${result.length} chars):`);
                console.log(result.substring(0, 500));
                console.log(`[Developer]    ... (截断，共 ${result.length} 字符)`);
              } else if (result.length > 0) {
                console.log(`[Developer] ${icon} Result: ${result}`);
              } else {
                // 空结果也可能是成功的（如 Write 操作）
                console.log(`[Developer] ${icon} 操作完成（无输出）`);
              }
            } else if (msg.type === 'result') {
              // 执行结果统计
              const resultMsg = msg as any;
              console.log(`[Developer] 📊 执行统计:`);
              console.log(`[Developer]    耗时: ${resultMsg.duration_ms}ms`);
              console.log(`[Developer]    成本: $${resultMsg.cost_usd}`);
              console.log(`[Developer]    输入tokens: ${resultMsg.tokens_input}`);
              console.log(`[Developer]    输出tokens: ${resultMsg.tokens_output}`);
            } else if (msg.type === 'error') {
              console.error(`[Developer] ❌ Error: ${(msg as any).error}`);
            } else if (msg.type === 'done') {
              console.log(`[Developer] ✅ 执行完成`);
            } else {
              // 其他消息类型
              console.log(`[Developer] 📨 ${msg.type}: ${JSON.stringify(msg).substring(0, 200)}`);
            }
          },
        }
      );

      const duration = Date.now() - startTime;
      logSystemInfo(projectId, 'Claudeck 代码生成完成', { duration, outputLength: output.length });

      // 添加完成检查点
      addCheckpoint(projectId, {
        stage: 'developer',
        timestamp: Date.now(),
        summary: '代码生成完成 (Claudeck)',
        filesGenerated: 0, // 后面会更新
        completed: true,
      });

    } catch (claudeckError: any) {
      console.error('Claudeck 调用失败，尝试降级处理:', claudeckError);
      logSystemError(projectId, 'Claudeck 调用失败', claudeckError);

      // 降级处理：尝试使用旧的 spawnClaudeNonInteractive
      // 这里保留降级逻辑但暂时只记录错误
      return NextResponse.json(
        {
          code: 500,
          message: 'Claudeck 服务不可用，请确保 Claudeck 服务正在运行',
          error: claudeckError.message,
        },
        { status: 500 }
      );
    }

    // 清理 Windows 保留文件名（如 nul, con 等）
    ScaffoldService.cleanReservedFilenames(projectDir);

    // 收集生成的文件
    const files = collectFiles(projectDir);
    const businessChangeCount = countBusinessChanges(files) - scaffoldFiles.length;

    if (files.length > 0) {
      console.log(`📄 生成了 ${files.length} 个文件:`);
      files.forEach((f, i) => {
        console.log(`   ${i + 1}. ${f.path} (${f.content.length} chars)`);
      });

      logSystemInfo(projectId, '文件生成成功', {
        fileCount: files.length,
        businessChangeCount,
        files: files.map(f => ({ path: f.path, size: f.content.length }))
      });

      if (businessChangeCount <= 0) {
        return NextResponse.json(
          {
            code: 500,
            message: '代码生成失败：仅创建了若依脚手架，未生成业务代码',
            data: {
              projectId,
              scaffoldFileCount: scaffoldFiles.length,
              fileCount: files.length,
            }
          },
          { status: 500 }
        );
      }

      // 更新检查点中的文件数量
      const state = getExecutionState(projectId);
      if (state && state.checkpoints.length > 0) {
        state.checkpoints[state.checkpoints.length - 1].filesGenerated = files.length;
        state.status = 'completed';
        state.currentStage = 'finished';
        state.endTime = Date.now();
        saveExecutionState(state);
      }
    } else {
      console.log(`⚠️ 未生成任何文件`);
      logSystemError(projectId, '未生成任何文件', {
        outputPreview: output.join('\n').substring(0, 1000),
      });

      return NextResponse.json(
        {
          code: 500,
          message: '代码生成失败：AI 未创建任何文件',
          data: {
            projectId,
            output: output.join('\n').substring(0, 2000),
          }
        },
        { status: 500 }
      );
    }

    // 保存到数据库（使用 upsert：存在则更新，不存在则插入）
    try {
      await initDatabase();

      const existingProject = queryOne('projects', (p: any) => p.id === projectId);

      if (existingProject) {
        // 项目已存在，更新记录
        await update('projects', (p: any) => p.id === projectId, {
          name: design?.title || existingProject.name || 'Generated Project',
          description: requirement.substring(0, 500),
          requirement,
          status: 'completed',
        });
        console.log(`✅ 项目已更新: ${projectId}`);
      } else {
        // 项目不存在，插入新记录
        await insert('projects', {
          id: projectId,
          userId: undefined,
          name: design?.title || 'Generated Project',
          description: requirement.substring(0, 500),
          requirement,
          status: 'completed',
        });
        console.log(`✅ 项目已创建: ${projectId}`);
      }

      for (const file of files) {
        await insert('projectFiles', {
          projectId,
          path: file.path,
          name: file.name,
          language: file.language,
          content: file.content,
        });
      }

      console.log(`✅ 项目已保存到数据库: ${projectId}`);
    } catch (dbError) {
      console.warn('Database save failed:', dbError);
    }

    // 保存生成的文件列表到工作流状态
    try {
      await WorkflowStateService.recordAgentComplete(projectId, 'developer', {
        files: files.map((f) => f.path),
      });

      await WorkflowStateService.savePhaseData(projectId, {
        generatedFiles: files.map((f) => f.path),
      });

      await WorkflowStateService.advancePhase(projectId);
      console.log(`✅ 工作流状态已更新: ${projectId}`);
    } catch (workflowError) {
      console.warn('Workflow state update failed:', workflowError);
    }

    console.log('\n' + '🎉'.repeat(40));
    console.log(`🎉 项目 ${projectId} 生成完成!`);
    console.log(`🌐 前端预览地址: http://localhost:${assignedPort}`);
    console.log(`🔌 后端地址: http://localhost:${backendPort}`);
    console.log('🎉'.repeat(40) + '\n');

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        projectId,
        files,
        output: output.join('\n'),
        assignedPort,
        backendPort,
        previewUrl: `http://localhost:${assignedPort}`,
        backendUrl: `http://localhost:${backendPort}`,
      },
    });
  } catch (error: any) {
    console.error('Developer error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}