import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { code: 403, message: '公开注册已关闭，请联系管理员分配账号' },
    { status: 403 }
  );
}