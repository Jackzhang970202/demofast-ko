import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { DemoTemplateAssetService } from '@/server/services/demo-template-asset.service';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }
    const detail = DemoTemplateAssetService.getById(params.id);
    if (!detail) {
      return NextResponse.json({ code: 404, message: '模板不存在' }, { status: 404 });
    }
    return NextResponse.json({ code: 200, message: 'success', data: detail });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}
