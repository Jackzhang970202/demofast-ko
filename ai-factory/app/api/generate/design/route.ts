import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

interface DesignResult {
  projectId: string;
  design: {
    title: string;
    techStack: {
      frontend: string[];
      backend: string[];
      ui: string[];
    };
    modules: Array<{ id: string; name: string; icon: string }>;
    features: string[];
    designStyle: string;
  };
}

// 生成设计方案
function generateDesign(requirement: string, answers: Record<string, any>): DesignResult {
  const projectId = `proj_${uuidv4().substring(0, 8)}`;

  // 分析需求关键词
  const lowerReq = requirement.toLowerCase();
  const hasUser = lowerReq.includes('用户') || lowerReq.includes('登录') || lowerReq.includes('注册');
  const hasPermission = lowerReq.includes('权限') || lowerReq.includes('角色');
  const hasData = lowerReq.includes('数据') || lowerReq.includes('管理');
  const hasFile = lowerReq.includes('文件') || lowerReq.includes('上传');

  // 构建模块列表
  const modules: Array<{ id: string; name: string; icon: string }> = [
    { id: 'dashboard', name: '仪表盘', icon: '📊' },
  ];

  if (hasUser) {
    modules.push({ id: 'users', name: '用户管理', icon: '👥' });
  }
  if (hasPermission) {
    modules.push({ id: 'roles', name: '角色管理', icon: '🔐' });
  }
  if (hasData) {
    modules.push({ id: 'data', name: '数据管理', icon: '📁' });
  }
  if (hasFile) {
    modules.push({ id: 'files', name: '文件管理', icon: '📎' });
  }

  modules.push({ id: 'settings', name: '系统设置', icon: '⚙️' });

  // 构建特性列表
  const features: string[] = [];
  if (answers.q3) {
    const selectedFeatures = Array.isArray(answers.q3) ? answers.q3 : [answers.q3];
    features.push(...selectedFeatures);
  }
  if (hasUser) features.push('用户认证');
  if (hasPermission) features.push('权限控制');

  // 设计风格
  const designStyle = answers.q1 || '现代简约风格';

  return {
    projectId,
    design: {
      title: extractTitle(requirement) || '智能管理系统',
      techStack: {
        frontend: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'React Query'],
        backend: ['Next.js API Routes', 'SQLite (better-sqlite3)'],
        ui: ['响应式设计', '深色/浅色主题', '动画效果'],
      },
      modules,
      features: features.length > 0 ? features : ['数据管理', '用户界面', '响应式布局'],
      designStyle: typeof designStyle === 'string' ? designStyle : '现代简约风格',
    },
  };
}

// 从需求中提取标题
function extractTitle(requirement: string): string {
  // 尝试匹配常见的系统名称模式
  const patterns = [
    /(\w+)管理系统/,
    /(\w+)平台/,
    /(\w+)系统/,
    /开发一个(\w+)/,
  ];

  for (const pattern of patterns) {
    const match = requirement.match(pattern);
    if (match) {
      return match[1] + '系统';
    }
  }

  return '智能管理系统';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirement, answers } = body;

    if (!requirement) {
      return NextResponse.json(
        { code: 400, message: '需求描述不能为空' },
        { status: 400 }
      );
    }

    // 生成设计方案
    const result = generateDesign(requirement, answers || {});

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: result,
    });
  } catch (error: any) {
    console.error('Generate design error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}