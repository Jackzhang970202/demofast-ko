import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { initDatabase, update } from '@/lib/db';
import { logSystemInfo, logSystemError, logCCCommand, logCCResponse, logCCStream } from '@/lib/logger';

// 处理自然语言修改请求
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, messages, currentFiles } = body;

  console.log('\n💬 AI 对话修改请求');
  console.log(`📁 项目ID: ${projectId}`);

  // 记录系统日志
  logSystemInfo(projectId || '_unknown', '收到对话修改请求');

  if (!projectId || !messages || !Array.isArray(messages)) {
    logSystemError(projectId || '_unknown', '参数错误', { projectId, hasMessages: !!messages });
    return NextResponse.json({ code: 400, message: '参数错误' }, { status: 400 });
  }

  // 获取最后的用户消息
  const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
  if (!lastUserMessage) {
    logSystemError(projectId, '没有用户消息', { messages });
    return NextResponse.json({ code: 400, message: '没有用户消息' }, { status: 400 });
  }

  console.log(`👤 用户请求: ${lastUserMessage.content}`);
  logSystemInfo(projectId, '用户修改请求', { content: lastUserMessage.content.substring(0, 200) });

  // 项目目录 - 这是关键：直接修改生成的项目文件
  const projectDir = path.join(process.cwd(), 'data', 'projects', projectId);
  if (!fs.existsSync(projectDir)) {
    return NextResponse.json({ code: 404, message: '项目不存在' }, { status: 404 });
  }

  // 收集当前文件列表
  const existingFiles = collectFiles(projectDir);
  const fileList = existingFiles.slice(0, 30).map((f: any) => f.path).join('\n');

  // 构建提示词
  const prompt = `你是一个专业的全栈开发工程师。用户想要修改当前项目。

## 项目目录
${projectDir}

## 当前项目文件结构
${fileList || '暂无文件'}

## 用户修改请求
${lastUserMessage.content}

## 重要规则

### 1. 文件操作规则
- 使用 Read 工具读取现有文件
- 使用 Edit 工具修改现有文件
- 使用 Write 工具创建新文件
- 所有文件路径都是相对于项目根目录的

### 2. PostgreSQL 使用规则（如果涉及数据库）
- 数据库地址统一使用 172.22.4.4:5432/AI_fec_test
- 每个项目使用独立 schema
- 优先复用若依现有 Mapper、Service、Domain、XML

### 3. 离线要求
- 禁止使用外部图片 URL
- 禁止使用外部 CDN
- 使用 SVG 图标或 emoji

## 任务
1. 理解用户的修改需求
2. 读取相关文件，了解现有代码结构
3. 使用 Edit 或 Write 工具修改文件
4. 确保修改后代码可以正常运行

请开始修改...`;

  // 执行 Claude Code
  const result = await executeClaudeCode(prompt, projectDir, projectId);

  if (result.success) {
    // 收集修改后的文件
    const modifiedFiles = collectFiles(projectDir);

    logSystemInfo(projectId, 'CC 修改完成', {
      fileCount: modifiedFiles.length,
      duration: result.duration,
    });

    // 更新数据库
    try {
      await initDatabase();
      await update('projects', (p: any) => p.id === projectId, {
        updatedAt: new Date().toISOString(),
      });
      for (const file of modifiedFiles) {
        await update('projectFiles', (f: any) => f.projectId === projectId && f.path === file.path, {
          content: file.content,
        });
      }
    } catch (e) {
      console.warn('DB update failed:', e);
    }

    console.log(`✅ 修改完成，${modifiedFiles.length} 个文件已更新\n`);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        response: result.output || '✅ 修改完成！',
        files: modifiedFiles,
      },
    });
  } else {
    return NextResponse.json({
      code: 500,
      message: result.error || '修改失败',
    }, { status: 500 });
  }
}

// 执行 Claude Code
async function executeClaudeCode(prompt: string, cwd: string, projectId: string): Promise<{ success: boolean; output: string; error: string; duration?: number }> {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const env = { ...process.env, CLAUDECODE: '' };

    const args = [
      '--print',
      '--dangerously-skip-permissions',
      '--allowedTools', 'Write,Edit,Bash,Read,Glob,Grep',
    ];

    console.log('⏳ 启动 Claude Code...');
    console.log(`📁 工作目录: ${cwd}`);

    // 记录 CC 命令日志
    logCCCommand(projectId, prompt, { cwd, args });

    const startTime = Date.now();

    let proc;
    if (isWindows) {
      proc = spawn('cmd.exe', ['/c', 'claude', ...args], { cwd, env });
    } else {
      proc = spawn('claude', args, { cwd, env });
    }

    let output = '';
    let error = '';

    proc.stdin?.write(prompt);
    proc.stdin?.end();

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(`[CC] ${text}`);
      logCCStream(projectId, text);
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
      console.error(`[CC Error] ${data}`);
    });

    // 延长超时时间到 300 秒（5分钟）
    const timeout = setTimeout(() => {
      console.log('⏰ 执行超时，终止进程');
      proc.kill();
      logSystemError(projectId, 'CC 执行超时', { output: output.substring(0, 500) });
      resolve({ success: false, output, error: '执行超时 (300s)', duration: Date.now() - startTime });
    }, 300000);

    proc.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      console.log(`✅ Claude Code 完成，耗时: ${duration}ms，退出码: ${code}`);

      // 记录 CC 响应日志
      logCCResponse(projectId, {
        success: code === 0,
        output,
        error: code !== 0 ? `退出码: ${code}` : undefined,
        duration,
      });

      resolve({
        success: code === 0,
        output,
        error: code !== 0 ? `退出码: ${code}` : '',
        duration,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ 进程错误:', err);
      logSystemError(projectId, 'CC 进程错误', err);
      resolve({ success: false, output, error: err.message, duration: Date.now() - startTime });
    });
  });
}

// 收集文件
function collectFiles(dir: string, baseDir: string = dir): any[] {
  const files: any[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir));
    } else {
      files.push({
        path: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
        name: entry.name,
        language: path.extname(entry.name).slice(1),
        content: fs.readFileSync(fullPath, 'utf-8'),
      });
    }
  }
  return files;
}