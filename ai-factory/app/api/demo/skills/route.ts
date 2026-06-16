import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, insert, queryAll, queryOne, remove, update } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import type { UserSkill } from '@/types/skill';

const DEFAULT_SKILLS = [
  {
    id: 'anti-ai-slop',
    label: '去 AI 味',
    prompt: '文案和界面表达要自然克制，避免 AI 套话、避免悬浮感、像真实业务系统。',
  },
  {
    id: 'visual-polish',
    label: '视觉强化',
    prompt: '界面细节要更精致，信息层级清晰，卡片、表格、按钮和留白更统一。',
  },
  {
    id: 'interaction-polish',
    label: '交互润色',
    prompt: '补齐关键交互状态，包含空态、加载态、成功失败反馈、悬停态和禁用态。',
  },
] as const;

async function ensureDefaultSkills(userId: string) {
  const allSkills = queryAll('userSkills') as UserSkill[];
  for (const skill of DEFAULT_SKILLS) {
    const exists = allSkills.some((item) => item.userId === userId && item.id === skill.id);
    if (!exists) {
      await insert('userSkills', {
        id: skill.id,
        userId,
        label: skill.label,
        prompt: skill.prompt,
        isDefault: true,
      });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }

    await ensureDefaultSkills(currentUser.id);
    const skills = (queryAll('userSkills') as UserSkill[])
      .filter((item) => item.userId === currentUser.id)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.createdAt.localeCompare(b.createdAt);
      });

    return NextResponse.json({ code: 200, message: 'success', data: skills });
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

    const body = await request.json();
    const label = String(body.label || '').trim();
    const prompt = String(body.prompt || '').trim();
    if (!label || !prompt) {
      return NextResponse.json({ code: 400, message: 'label 和 prompt 不能为空' }, { status: 400 });
    }

    const skill = await insert('userSkills', {
      userId: currentUser.id,
      label,
      prompt,
      isDefault: false,
    });

    return NextResponse.json({ code: 200, message: '创建成功', data: skill });
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

    const body = await request.json();
    const id = String(body.id || '').trim();
    const label = String(body.label || '').trim();
    const prompt = String(body.prompt || '').trim();
    if (!id || !label || !prompt) {
      return NextResponse.json({ code: 400, message: 'id、label、prompt 不能为空' }, { status: 400 });
    }

    const existing = queryOne('userSkills', (item: UserSkill) => item.id === id && item.userId === currentUser.id) as UserSkill | undefined;
    if (!existing) {
      return NextResponse.json({ code: 404, message: '技能不存在' }, { status: 404 });
    }
    if (existing.isDefault) {
      return NextResponse.json({ code: 403, message: '默认技能不可修改' }, { status: 403 });
    }

    await update('userSkills', (item: UserSkill) => item.id === id && item.userId === currentUser.id, {
      label,
      prompt,
      updatedAt: new Date().toISOString(),
    });

    const updatedSkill = queryOne('userSkills', (item: UserSkill) => item.id === id && item.userId === currentUser.id);
    return NextResponse.json({ code: 200, message: '更新成功', data: updatedSkill });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await initDatabase();
    const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
    if (!currentUser) {
      return NextResponse.json({ code: 401, message: '未登录或登录状态无效' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id) {
      return NextResponse.json({ code: 400, message: 'id 参数必填' }, { status: 400 });
    }

    const existing = queryOne('userSkills', (item: UserSkill) => item.id === id && item.userId === currentUser.id) as UserSkill | undefined;
    if (!existing) {
      return NextResponse.json({ code: 404, message: '技能不存在' }, { status: 404 });
    }
    if (existing.isDefault) {
      return NextResponse.json({ code: 403, message: '默认技能不可删除' }, { status: 403 });
    }

    await remove('userSkills', (item: UserSkill) => item.id === id && item.userId === currentUser.id);
    return NextResponse.json({ code: 200, message: '删除成功' });
  } catch (error: any) {
    return NextResponse.json({ code: 500, message: error.message || '服务器错误' }, { status: 500 });
  }
}
