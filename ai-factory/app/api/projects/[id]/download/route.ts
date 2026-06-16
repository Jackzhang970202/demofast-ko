import { NextResponse, NextRequest } from 'next/server';
import { initDatabase, queryAll } from '@/lib/db';
import archiver from 'archiver';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

// 下载项目为 ZIP
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

    // 获取项目文件
    const files = queryAll('projectFiles').filter((f: any) => f.projectId === params.id) as { path: string; content: string }[];

    // 创建 ZIP 文件
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk) => chunks.push(chunk));

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });

    // 添加文件到 ZIP
    for (const file of files) {
      archive.append(file.content, { name: file.path });
    }

    archive.finalize();

    const zipBuffer = await archivePromise;

    // 使用 RFC 5987 编码处理中文文件名，避免 ByteString 转换失败
    const encodedName = project.name
      ? encodeURIComponent(project.name)
      : params.id;
    const filenameAscii = `project_${params.id}.zip`;
    const filenameStar = `UTF-8''${encodedName}.zip`;

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filenameAscii}"; filename*=${filenameStar}`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Download project error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}