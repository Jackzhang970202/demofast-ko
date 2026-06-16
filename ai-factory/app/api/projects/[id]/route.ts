import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { initDatabase, queryAll, remove } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

// 获取项目详情
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

    const project = await ProjectService.getAccessibleProjectById(params.id, currentUser);

    if (!project) {
      return NextResponse.json(
        { code: 404, message: '项目不存在' },
        { status: 404 }
      );
    }

    const projectDir = path.join(process.cwd(), 'data', 'projects', params.id, 'generated');
    const specDir = path.join(process.cwd(), 'data', 'projects', params.id, 'spec');
    const filesFromDisk: any[] = [];

    const walk = (baseDir: string, prefix = '') => {
      if (!fs.existsSync(baseDir)) return;
      for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const fullPath = path.join(baseDir, entry.name);
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(fullPath, relativePath);
          continue;
        }
        filesFromDisk.push({
          projectId: params.id,
          path: relativePath.replace(/\\/g, '/'),
          name: entry.name,
          language: path.extname(entry.name).slice(1) || 'plaintext',
          content: fs.readFileSync(fullPath, 'utf-8'),
        });
      }
    };

    walk(specDir, 'spec');
    walk(projectDir, 'generated');

    const files = filesFromDisk.length > 0
      ? filesFromDisk
      : queryAll('projectFiles').filter((f: any) => f.projectId === params.id);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        ...project,
        files,
      },
    });
  } catch (error: any) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除项目
export async function DELETE(
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

    const project = await ProjectService.getAccessibleProjectById(params.id, currentUser);
    if (!project) {
      return NextResponse.json(
        { code: 403, message: '无权操作该项目' },
        { status: 403 }
      );
    }

    // 删除项目文件
    await remove('projectFiles', (f: any) => f.projectId === params.id);

    // 删除项目
    const count = await remove('projects', (p: any) => p.id === params.id);

    if (count === 0) {
      return NextResponse.json(
        { code: 404, message: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
    });
  } catch (error: any) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}