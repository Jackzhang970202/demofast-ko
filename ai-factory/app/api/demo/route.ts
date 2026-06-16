import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    code: 410,
    message: '旧 demo 运行接口已废弃，请改用 /api/preview 与 /api/projects',
    data: [],
  }, { status: 410 });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    code: 410,
    message: '旧 demo 启动接口已废弃，请改用 /api/preview',
    data: { projectId: body?.projectId || null },
  }, { status: 410 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json({
    code: 410,
    message: '旧 demo 停止接口已废弃，请改用 /api/preview',
    data: { projectId: searchParams.get('projectId') },
  }, { status: 410 });
}
