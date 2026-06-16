import { NextRequest, NextResponse } from 'next/server';
import { readProjectLogs, listProjectLogs } from '@/lib/logger';

// 获取日志
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const type = searchParams.get('type') as 'system' | 'cc' | null;

  try {
    // 如果没有指定 projectId，返回所有项目列表
    if (!projectId) {
      const projects = listProjectLogs();
      return NextResponse.json({
        code: 200,
        message: 'success',
        data: { projects },
      });
    }

    // 读取指定项目的日志
    const logs = readProjectLogs(projectId, type || undefined);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        projectId,
        systemLogs: logs.system,
        ccLogs: logs.cc,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 500, message: error.message || '读取日志失败' },
      { status: 500 }
    );
  }
}