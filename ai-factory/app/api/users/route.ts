import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, queryOne, update, insert } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import type { User } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '仅管理员可查看账号列表' }, { status: 403 });
    }

    const users = await AuthService.getAllUsers();
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: users,
    });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '仅管理员可创建账号' }, { status: 403 });
    }

    const body = await request.json();
    const { name, password } = body;

    if (!name || !password) {
      return NextResponse.json({ code: 400, message: '用户名和密码不能为空' }, { status: 400 });
    }

    const result = await AuthService.createUser({
      name: String(name).trim(),
      password: String(password),
      role: 'user',
    });

    if (!result.success) {
      return NextResponse.json({ code: 400, message: result.message || '创建失败' }, { status: 400 });
    }

    return NextResponse.json({
      code: 200,
      message: '创建成功',
      data: result.user,
    });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ code: 403, message: '仅管理员可修改点数' }, { status: 403 });
    }

    const body = await request.json();
    const userId = String(body.userId || '').trim();
    const balancePoints = Number(body.balancePoints);
    if (!userId || !Number.isFinite(balancePoints) || balancePoints < 0) {
      return NextResponse.json({ code: 400, message: 'userId、balancePoints 必填，且余额不能小于 0' }, { status: 400 });
    }

    const user = queryOne('users', (u: User) => u.id === userId) as User | undefined;
    if (!user) {
      return NextResponse.json({ code: 404, message: '用户不存在' }, { status: 404 });
    }

    const balanceBefore = Number(user.balancePoints ?? 0);
    const balanceAfter = Number(balancePoints.toFixed(2));
    const deltaPoints = Number((balanceAfter - balanceBefore).toFixed(2));

    await update('users', (u: User) => u.id === userId, { balancePoints: balanceAfter });
    await insert('pointLedger' as any, {
      accountId: userId,
      changeType: 'manual_adjust',
      deltaPoints,
      balanceBefore,
      balanceAfter,
      remark: `admin set balance ${balanceBefore} -> ${balanceAfter}`,
      createdAt: new Date().toISOString(),
    });
    const updatedUser = await AuthService.getUserById(userId);

    return NextResponse.json({
      code: 200,
      message: '点数余额修改成功',
      data: {
        user: updatedUser,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}
