import { spawn, SpawnOptions } from 'child_process';

/**
 * Windows 兼容的 spawn 调用
 * 在 Windows 上使用 cmd.exe 执行 claude 命令
 *
 * 重要：设置 CLAUDECODE="" 以允许在 Claude Code 会话内部嵌套调用
 */
export function spawnClaude(args: string[], options: SpawnOptions = {}): ReturnType<typeof spawn> {
  const isWindows = process.platform === 'win32';

  // 设置环境变量以允许嵌套调用
  const env = {
    ...process.env,
    ...options.env,
    CLAUDECODE: '', // 允许在 Claude Code 会话内部调用
  };

  if (isWindows) {
    // Windows 上使用 cmd.exe 执行
    return spawn('cmd.exe', ['/c', 'claude', ...args], {
      ...options,
      env,
    });
  } else {
    return spawn('claude', args, {
      ...options,
      env,
    });
  }
}

/**
 * 检查 Claude CLI 是否可用
 */
export async function checkClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawnClaude(['--version'], { timeout: 5000 });
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

/**
 * 执行 Claude Code CLI 命令（非交互模式）
 * @param prompt - 要发送给 Claude 的提示词
 * @param options - spawn 选项
 * @param extraArgs - 额外的命令行参数
 * @returns Claude 进程
 */
export function spawnClaudeNonInteractive(
  prompt: string,
  options: SpawnOptions = {},
  extraArgs: string[] = []
): ReturnType<typeof spawn> {
  // 非交互模式参数
  const args = [
    '--print',
    '--dangerously-skip-permissions',
    '--allowedTools', 'Write,Edit,Bash,Read,Glob,Grep',
    ...extraArgs
  ];

  const proc = spawnClaude(args, options);

  // 通过 stdin 发送 prompt
  proc.stdin?.write(prompt);
  proc.stdin?.end();

  return proc;
}