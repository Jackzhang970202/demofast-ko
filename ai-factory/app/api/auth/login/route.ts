import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, queryOne, update } from '@/lib/db';

// 登录
export async function POST(request: NextRequest) {
  try {
    await initDatabase();
    const body = await request.json();
    const { name, password } = body;

    if (!name || !password) {
      return NextResponse.json(
        { code: 400, message: '账号和密码不能为空' },
        { status: 400 }
      );
    }

    // 查找用户（用 name 而非 email）
    const user = queryOne('users', (u: any) => u.name === name);

    if (!user) {
      return NextResponse.json(
        { code: 401, message: '用户不存在' },
        { status: 401 }
      );
    }

    // 简单密码验证
    if (user.password !== password) {
      return NextResponse.json(
        { code: 401, message: '密码错误' },
        { status: 401 }
      );
    }

    // 更新最后登录时间
    await update('users', (u: any) => u.id === user.id, {
      lastLogin: new Date().toISOString(),
    });

    return NextResponse.json({
      code: 200,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}