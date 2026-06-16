import { NextRequest, NextResponse } from 'next/server';
import { spawnClaudeNonInteractive } from '@/lib/spawn';

interface Question {
  id: string;
  category: 'tech' | 'product' | 'extra';
  type: 'radio' | 'checkbox' | 'textarea' | 'select';
  question: string;
  options?: string[];
  required: boolean;
}

// 调用Claude AI生成问题
async function generateQuestionsWithAI(requirement: string): Promise<Question[]> {
  const prompt = `你是一位顶级产品经理，正在帮助客户梳理他们真正需要的产品。

客户说：
${requirement}

---

## 你的任务

生成两类问题，共10个选择题 + 1个补充问题：

### 🔧 技术问题（5个）
简洁直接的技术选型问题，让用户快速选择。
如果用户不懂技术，提供"你帮我选"选项。
涵盖：前端、后端、数据库、部署方式、其他技术偏好。

### 📋 产品问题（5个）
站在用户角度，问他们真正关心的问题。
聚焦：谁用、痛点在哪、能力水平、期望效果、优先级。

### 📝 补充问题（1个）
给用户一个补充其他需求的机会，非必填。

记住：用户不关心"功能"，用户关心的是"我能完成什么"。

## 输出格式

返回 JSON 数组，共 11 个问题，必须包含 \`category\` 字段区分类型：

\`\`\`json
[
  // ===== 🔧 技术问题（category: "tech"）=====
  {
    "id": "t1",
    "category": "tech",
    "type": "radio",
    "question": "前端用哪个框架？",
    "options": ["React", "Vue", "Next.js", "你帮我选"],
    "required": false
  },
  {
    "id": "t2",
    "category": "tech",
    "type": "radio",
    "question": "后端用什么语言？",
    "options": ["Node.js", "Python", "Go", "Java", "你帮我选"],
    "required": false
  },
  {
    "id": "t3",
    "category": "tech",
    "type": "radio",
    "question": "数据库用哪种？",
    "options": ["MySQL", "PostgreSQL", "MongoDB", "SQLite（轻量）", "你帮我选"],
    "required": false
  },
  {
    "id": "t4",
    "category": "tech",
    "type": "radio",
    "question": "怎么部署？",
    "options": ["云端服务器", "本地部署", "容器化部署", "你帮我选"],
    "required": false
  },
  {
    "id": "t5",
    "category": "tech",
    "type": "radio",
    "question": "需要支持移动端吗？",
    "options": ["只做网页版", "需要手机端适配", "需要原生APP", "你帮我选"],
    "required": false
  },

  // ===== 📋 产品问题（category: "product"）=====
  {
    "id": "p1",
    "category": "product",
    "type": "radio",
    "question": "这个系统主要是您自己用，还是团队一起用？",
    "options": ["就我自己用", "小团队（5人以内）", "中型团队（5-20人）", "大团队（20人以上）"],
    "required": true
  },
  {
    "id": "p2",
    "category": "product",
    "type": "radio",
    "question": "您现在做这件事最麻烦的是什么？",
    "options": ["操作太繁琐", "数据容易出错", "协作不方便", "缺少数据统计", "其他"],
    "required": true
  },
  {
    "id": "p3",
    "category": "product",
    "type": "radio",
    "question": "用这个系统的人，电脑熟练吗？",
    "options": ["都很熟练", "一般水平", "不太熟练，要简单易用"],
    "required": true
  },
  {
    "id": "p4",
    "category": "product",
    "type": "radio",
    "question": "您对系统界面有什么偏好？",
    "options": ["简洁现代", "功能丰富", "数据可视化强", "没有特别要求"],
    "required": false
  },
  {
    "id": "p5",
    "category": "product",
    "type": "radio",
    "question": "如果只能先做一个核心功能，您选哪个？",
    "options": ["数据管理", "用户权限", "报表统计", "工作流程", "其他"],
    "required": true
  },

  // ===== 📝 补充问题（category: "extra"）=====
  {
    "id": "e1",
    "category": "extra",
    "type": "textarea",
    "question": "还有什么想补充的吗？（非必填）",
    "required": false
  }
]
\`\`\`

现在请根据用户需求生成问题，确保：
1. 技术问题5个，category 为 "tech"
2. 产品问题5个，category 为 "product"
3. 补充问题1个，category 为 "extra"
4. 产品问题要让用户感觉到你理解他的处境，在帮他思考。
5. 只输出JSON数组，不要输出其他内容。`;

  return new Promise((resolve) => {
    // 使用非交互模式
    const claudeProcess = spawnClaudeNonInteractive(prompt, {
      timeout: 60000,
    });

    let output = '';
    let error = '';

    claudeProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    claudeProcess.stderr.on('data', (data) => {
      error += data.toString();
    });

    claudeProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const jsonMatch = output.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const questions = JSON.parse(jsonMatch[0]);
            const validated = validateAndFillQuestions(questions, requirement);
            resolve(validated);
          } else {
            resolve(generateQuestionsByRules(requirement));
          }
        } catch (e) {
          console.warn('Failed to parse AI response:', e);
          resolve(generateQuestionsByRules(requirement));
        }
      } else {
        console.warn('Claude CLI failed:', error || `exit code ${code}`);
        resolve(generateQuestionsByRules(requirement));
      }
    });

    claudeProcess.on('error', (err) => {
      console.warn('Claude CLI error:', err.message);
      resolve(generateQuestionsByRules(requirement));
    });
  });
}

// 验证问题数量和类型，不足则补充
function validateAndFillQuestions(questions: any[], requirement: string): Question[] {
  const result: Question[] = [];

  const techCount = questions.filter(q => q.category === 'tech').length;
  const productCount = questions.filter(q => q.category === 'product').length;
  const extraCount = questions.filter(q => q.category === 'extra').length;

  questions.forEach((q, i) => {
    if (q.question && q.category && q.type) {
      result.push({
        id: q.id || `q_${i}`,
        category: q.category,
        type: q.type,
        question: q.question,
        options: q.options,
        required: q.required || false,
      });
    }
  });

  // 补充技术问题
  const defaultTechQuestions: Question[] = [
    {
      id: 't1',
      category: 'tech',
      type: 'radio',
      question: '🔧 前端用哪个框架？',
      options: ['React', 'Vue', 'Next.js', '你帮我选'],
      required: false,
    },
    {
      id: 't2',
      category: 'tech',
      type: 'radio',
      question: '🔧 后端用什么语言？',
      options: ['Node.js', 'Python', 'Go', 'Java', '你帮我选'],
      required: false,
    },
    {
      id: 't3',
      category: 'tech',
      type: 'radio',
      question: '🔧 数据库用哪种？',
      options: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite（轻量）', '你帮我选'],
      required: false,
    },
    {
      id: 't4',
      category: 'tech',
      type: 'radio',
      question: '🔧 怎么部署？',
      options: ['云端服务器', '本地部署', '容器化部署', '你帮我选'],
      required: false,
    },
    {
      id: 't5',
      category: 'tech',
      type: 'radio',
      question: '🔧 需要支持移动端吗？',
      options: ['只做网页版', '需要手机端适配', '需要原生APP', '你帮我选'],
      required: false,
    },
  ];

  // 补充产品问题
  const defaultProductQuestions: Question[] = [
    {
      id: 'p1',
      category: 'product',
      type: 'radio',
      question: '📋 这个系统主要是您自己用，还是团队一起用？',
      options: ['就我自己用', '小团队（5人以内）', '中型团队（5-20人）', '大团队（20人以上）'],
      required: true,
    },
    {
      id: 'p2',
      category: 'product',
      type: 'radio',
      question: '📋 您现在做这件事最麻烦的是什么？',
      options: ['操作太繁琐', '数据容易出错', '协作不方便', '缺少数据统计', '其他'],
      required: true,
    },
    {
      id: 'p3',
      category: 'product',
      type: 'radio',
      question: '📋 用这个系统的人，电脑熟练吗？',
      options: ['都很熟练', '一般水平', '不太熟练，要简单易用'],
      required: true,
    },
    {
      id: 'p4',
      category: 'product',
      type: 'radio',
      question: '📋 您对系统界面有什么偏好？',
      options: ['简洁现代', '功能丰富', '数据可视化强', '没有特别要求'],
      required: false,
    },
    {
      id: 'p5',
      category: 'product',
      type: 'radio',
      question: '📋 如果只能先做一个核心功能，您选哪个？',
      options: ['数据管理', '用户权限', '报表统计', '工作流程', '其他'],
      required: true,
    },
  ];

  // 补充问题
  const defaultExtraQuestion: Question = {
    id: 'e1',
    category: 'extra',
    type: 'textarea',
    question: '📝 还有什么想补充的吗？（非必填）',
    required: false,
  };

  // 补足技术问题
  for (let i = techCount; i < 5; i++) {
    if (defaultTechQuestions[i]) {
      result.push(defaultTechQuestions[i]);
    }
  }

  // 补足产品问题
  for (let i = productCount; i < 5; i++) {
    if (defaultProductQuestions[i]) {
      result.push(defaultProductQuestions[i]);
    }
  }

  // 补足补充问题
  if (extraCount < 1) {
    result.push(defaultExtraQuestion);
  }

  return result;
}

// 基于规则生成问题（后备方案）
function generateQuestionsByRules(requirement: string): Question[] {
  return [
    // 🔧 技术问题 (5个)
    {
      id: 't1',
      category: 'tech',
      type: 'radio',
      question: '🔧 前端用哪个框架？',
      options: ['React', 'Vue', 'Next.js', '你帮我选'],
      required: false,
    },
    {
      id: 't2',
      category: 'tech',
      type: 'radio',
      question: '🔧 后端用什么语言？',
      options: ['Node.js', 'Python', 'Go', 'Java', '你帮我选'],
      required: false,
    },
    {
      id: 't3',
      category: 'tech',
      type: 'radio',
      question: '🔧 数据库用哪种？',
      options: ['MySQL', 'PostgreSQL', 'MongoDB', 'SQLite（轻量）', '你帮我选'],
      required: false,
    },
    {
      id: 't4',
      category: 'tech',
      type: 'radio',
      question: '🔧 怎么部署？',
      options: ['云端服务器', '本地部署', '容器化部署', '你帮我选'],
      required: false,
    },
    {
      id: 't5',
      category: 'tech',
      type: 'radio',
      question: '🔧 需要支持移动端吗？',
      options: ['只做网页版', '需要手机端适配', '需要原生APP', '你帮我选'],
      required: false,
    },
    // 📋 产品问题 (5个)
    {
      id: 'p1',
      category: 'product',
      type: 'radio',
      question: '📋 这个系统主要是您自己用，还是团队一起用？',
      options: ['就我自己用', '小团队（5人以内）', '中型团队（5-20人）', '大团队（20人以上）'],
      required: true,
    },
    {
      id: 'p2',
      category: 'product',
      type: 'radio',
      question: '📋 您现在做这件事最麻烦的是什么？',
      options: ['操作太繁琐', '数据容易出错', '协作不方便', '缺少数据统计', '其他'],
      required: true,
    },
    {
      id: 'p3',
      category: 'product',
      type: 'radio',
      question: '📋 用这个系统的人，电脑熟练吗？',
      options: ['都很熟练', '一般水平', '不太熟练，要简单易用'],
      required: true,
    },
    {
      id: 'p4',
      category: 'product',
      type: 'radio',
      question: '📋 您对系统界面有什么偏好？',
      options: ['简洁现代', '功能丰富', '数据可视化强', '没有特别要求'],
      required: false,
    },
    {
      id: 'p5',
      category: 'product',
      type: 'radio',
      question: '📋 如果只能先做一个核心功能，您选哪个？',
      options: ['数据管理', '用户权限', '报表统计', '工作流程', '其他'],
      required: true,
    },
    // 📝 补充问题 (1个)
    {
      id: 'e1',
      category: 'extra',
      type: 'textarea',
      question: '📝 还有什么想补充的吗？（非必填）',
      required: false,
    },
  ];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requirement } = body;

    if (!requirement || typeof requirement !== 'string') {
      return NextResponse.json(
        { code: 400, message: '需求描述不能为空' },
        { status: 400 }
      );
    }

    if (requirement.length > 8000) {
      return NextResponse.json(
        { code: 400, message: '需求描述不能超过8000字符' },
        { status: 400 }
      );
    }

    let questions: Question[];

    try {
      questions = await generateQuestionsWithAI(requirement);
    } catch (e) {
      console.warn('AI generation failed, using rules:', e);
      questions = generateQuestionsByRules(requirement);
    }

    const stats = {
      total: questions.length,
      tech: questions.filter(q => q.category === 'tech').length,
      product: questions.filter(q => q.category === 'product').length,
      extra: questions.filter(q => q.category === 'extra').length,
    };

    console.log(`生成问题统计: 🔧技术${stats.tech}个, 📋产品${stats.product}个, 📝补充${stats.extra}个`);

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        questions,
        stats,
      },
    });
  } catch (error: any) {
    console.error('Generate questions error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}