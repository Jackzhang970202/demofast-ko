/**
 * 对话修改服务层
 */

import { spawnClaudeNonInteractive } from '@/lib/spawn';
import { logSystemInfo } from '@/lib/logger';
import { ProjectService } from './project.service';
import path from 'path';
import fs from 'fs';

export const ChatService = {
  /**
   * 发送修改消息
   */
  async sendMessage(projectId: string, message: string): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> {
    const projectDir = path.join(process.cwd(), 'data', 'projects', projectId);

    if (!fs.existsSync(projectDir)) {
      return { success: false, error: '项目不存在' };
    }

    logSystemInfo(projectId, '对话修改开始', { message });

    const prompt = `请根据用户的修改请求，对当前项目进行修改。

## 用户修改请求
${message}

## 要求
1. 只修改必要的文件
2. 保持代码风格一致
3. 修改完成后说明修改了什么

请开始修改。`;

    try {
      const claudeProcess = spawnClaudeNonInteractive(prompt, {
        cwd: projectDir,
        timeout: 120000,
      });

      let output = '';
      let error = '';

      await new Promise<void>((resolve) => {
        claudeProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        claudeProcess.stderr.on('data', (data) => {
          error += data.toString();
        });

        claudeProcess.on('close', () => resolve());
        claudeProcess.on('error', (err) => {
          error = err.message;
          resolve();
        });
      });

      // 刷新项目文件
      const files = this.collectFiles(projectDir);
      await this.updateProjectFiles(projectId, files);

      logSystemInfo(projectId, '对话修改完成', { success: !error });

      return {
        success: !error,
        output,
        error: error || undefined,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * 收集文件
   */
  collectFiles(dir: string, baseDir: string = dir): any[] {
    const files: any[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.collectFiles(fullPath, baseDir));
      } else if (entry.isFile()) {
        const relativePath = path.relative(baseDir, fullPath);
        files.push({
          path: relativePath.replace(/\\/g, '/'),
          name: entry.name,
          content: fs.readFileSync(fullPath, 'utf-8'),
        });
      }
    }
    return files;
  },

  /**
   * 更新项目文件记录
   */
  async updateProjectFiles(projectId: string, files: any[]): Promise<void> {
    // 这里可以更新数据库中的文件记录
    // 暂时不做具体实现
  },
};