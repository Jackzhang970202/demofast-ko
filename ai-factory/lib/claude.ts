import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface ClaudeCodeOptions {
  outputDir: string;
  timeout?: number; // 毫秒
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface ClaudeCodeResult {
  success: boolean;
  exitCode: number | null;
  output: string;
  error: string;
  files: GeneratedFile[];
}

export interface GeneratedFile {
  path: string;
  name: string;
  language: string;
  content: string;
}

/**
 * Claude Code CLI 封装
 */
export class ClaudeCode {
  private process: ChildProcess | null = null;

  /**
   * 执行 Claude Code 生成代码
   */
  async generate(prompt: string, options: ClaudeCodeOptions): Promise<ClaudeCodeResult> {
    const { outputDir, timeout = 600000, onStdout, onStderr } = options;

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    return new Promise((resolve) => {
      let output = '';
      let error = '';

      // 调用 Claude Code CLI
      this.process = spawn('claude', ['--print', prompt], {
        cwd: outputDir,
        env: { ...process.env },
        timeout,
      });

      // 设置超时
      const timeoutId = setTimeout(() => {
        this.process?.kill();
        resolve({
          success: false,
          exitCode: null,
          output,
          error: '执行超时',
          files: [],
        });
      }, timeout);

      this.process.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        onStdout?.(text);
      });

      this.process.stderr?.on('data', (data) => {
        const text = data.toString();
        error += text;
        onStderr?.(text);
      });

      this.process.on('close', (code) => {
        clearTimeout(timeoutId);

        // 收集生成的文件
        const files = this.collectFiles(outputDir);

        resolve({
          success: code === 0,
          exitCode: code,
          output,
          error,
          files,
        });
      });

      this.process.on('error', (err) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          exitCode: null,
          output,
          error: err.message,
          files: [],
        });
      });
    });
  }

  /**
   * 终止当前进程
   */
  kill() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  /**
   * 收集目录中的所有文件
   */
  private collectFiles(dir: string, baseDir: string = dir): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      // 跳过 node_modules 和隐藏目录
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.collectFiles(fullPath, baseDir));
      } else if (entry.isFile()) {
        const relativePath = path.relative(baseDir, fullPath);
        files.push({
          path: relativePath.replace(/\\/g, '/'),
          name: entry.name,
          language: this.detectLanguage(entry.name),
          content: fs.readFileSync(fullPath, 'utf-8'),
        });
      }
    }

    return files;
  }

  /**
   * 检测文件语言
   */
  private detectLanguage(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const langMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.json': 'json',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'scss',
      '.less': 'less',
      '.html': 'html',
      '.md': 'markdown',
      '.mdx': 'mdx',
      '.sql': 'sql',
      '.prisma': 'prisma',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.svg': 'svg',
      '.env': 'dotenv',
      '.gitignore': 'gitignore',
      '.dockerignore': 'dockerignore',
    };
    return langMap[ext] || 'plaintext';
  }
}

// 单例实例
let claudeCodeInstance: ClaudeCode | null = null;

export function getClaudeCode(): ClaudeCode {
  if (!claudeCodeInstance) {
    claudeCodeInstance = new ClaudeCode();
  }
  return claudeCodeInstance;
}

/**
 * 检查 Claude Code CLI 是否可用
 */
export async function checkClaudeCodeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('claude', ['--version']);
    process.on('close', (code) => resolve(code === 0));
    process.on('error', () => resolve(false));
  });
}