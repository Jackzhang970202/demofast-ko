import { NextResponse, NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

/**
 * 获取项目的绝对路径
 * 用于 Claudeck iframe 设置 cwd 参数
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json(
        { code: 401, message: '未登录或登录状态无效' },
        { status: 401 }
      );
    }

    const projectId = params.id;
    const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
    if (!project) {
      return NextResponse.json(
        { code: 404, message: '项目不存在' },
        { status: 404 }
      );
    }

    // 项目代码生成的目录
    const projectDir = path.join(process.cwd(), 'data', 'projects', projectId, 'generated');

    // 检查目录是否存在
    if (!fs.existsSync(projectDir)) {
      // 如果 generated 目录不存在，尝试返回项目根目录
      const rootDir = path.join(process.cwd(), 'data', 'projects', projectId);
      if (!fs.existsSync(rootDir)) {
        return NextResponse.json(
          { code: 404, message: '项目目录不存在' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        code: 200,
        message: 'success',
        data: { path: rootDir },
      });
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { path: projectDir },
    });
  } catch (error: any) {
    console.error('Get project path error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}