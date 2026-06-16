import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { spawnClaude } from '@/lib/spawn';

// SSE 流式代码生成
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { requirement, answers, design } = body;

  // 创建流式响应
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // 异步处理生成过程
  (async () => {
    try {
      // 发送初始状态
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: '正在初始化...' })}\n\n`));

      const outputDir = path.join(process.cwd(), 'data', 'projects', uuidv4());
      fs.mkdirSync(outputDir, { recursive: true });

      // 构建提示词
      const prompt = buildPrompt(requirement, answers, design);

      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: '正在调用 Claude Code...' })}\n\n`));

      // 调用 Claude Code CLI
      const claudeProcess = spawnClaude(['--print', prompt], {
        cwd: outputDir,
      });

      let outputBuffer = '';

      claudeProcess.stdout.on('data', async (data) => {
        const text = data.toString();
        outputBuffer += text;

        // 发送实时输出
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'output',
          content: text,
        })}\n\n`));
      });

      claudeProcess.stderr.on('data', async (data) => {
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          content: data.toString(),
        })}\n\n`));
      });

      await new Promise((resolve, reject) => {
        claudeProcess.on('close', (code) => {
          if (code === 0) {
            resolve(void 0);
          } else {
            reject(new Error(`Claude Code exited with code ${code}`));
          }
        });
        claudeProcess.on('error', reject);
      });

      // 收集生成的文件
      const files = collectFiles(outputDir);

      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'complete',
        files,
        projectId: `proj_${uuidv4().substring(0, 8)}`,
      })}\n\n`));

    } catch (error: any) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({
        type: 'error',
        message: error.message,
      })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function buildPrompt(requirement: string, answers: Record<string, any>, design: any): string {
  return `你是一个专业的全栈开发工程师，使用 Next.js 14 (App Router) + TypeScript + Tailwind CSS 技术栈。

用户需求：
${requirement}

用户补充信息：
${Object.entries(answers || {}).map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n')}

设计方案：
- 项目名称: ${design?.title || 'AI Generated App'}
- 技术栈: Next.js 14, TypeScript, Tailwind CSS, SQLite
- 功能模块: ${(design?.modules || []).map((m: any) => m.name).join(', ')}

请生成一个完整的、可运行的 Next.js 项目代码。

输出要求：
1. 生成完整的项目结构
2. 每个文件独立标注路径，格式为 ### 文件路径: 相对路径
3. 包含 package.json 依赖配置

请开始生成代码...`;
}

function collectFiles(dir: string, baseDir: string = dir): any[] {
  const files: any[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, fullPath);
      files.push({
        path: relativePath.replace(/\\/g, '/'),
        name: entry.name,
        language: detectLanguage(entry.name),
        content: fs.readFileSync(fullPath, 'utf-8'),
      });
    }
  }
  return files;
}

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
  };
  return langMap[ext] || 'plaintext';
}