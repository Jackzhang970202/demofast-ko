'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QuestionCard from '@/components/QuestionCard';

interface Question {
  id: string;
  category: 'tech' | 'product' | 'extra';
  type: 'radio' | 'checkbox' | 'textarea' | 'select';
  question: string;
  options?: string[];
  required: boolean;
}

// 默认问题（5技术 + 5产品 + 1补充，共11个）
const defaultQuestions: Question[] = [
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

export default function QuestionsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  // 获取问题
  useEffect(() => {
    const requirement = sessionStorage.getItem('requirement');
    if (!requirement) {
      router.push('/');
      return;
    }

    // 尝试从API获取更智能的问题
    fetchQuestions(requirement);
  }, [router]);

  const fetchQuestions = async (requirement: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement }),
      });

      const data = await res.json();
      if (data.code === 200 && data.data?.questions && data.data.questions.length >= 11) {
        // 验证问题数量
        const qs = data.data.questions;
        const techCount = qs.filter((q: Question) => q.category === 'tech').length;
        const productCount = qs.filter((q: Question) => q.category === 'product').length;
        const extraCount = qs.filter((q: Question) => q.category === 'extra').length;

        // 确保5技术+5产品+1补充
        if (techCount >= 5 && productCount >= 5 && extraCount >= 1) {
          setQuestions(qs);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch questions, using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  // 处理回答
  const handleAnswer = useCallback((questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  // 下一题
  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // 完成所有问题，保存答案并跳转
      sessionStorage.setItem('answers', JSON.stringify(answers));
      router.push('/design');
    }
  }, [currentIndex, questions.length, answers, router]);

  // 上一题
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // 跳过非必答题
  const handleSkip = useCallback(() => {
    handleNext();
  }, [handleNext]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">正在生成问题...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isAnswered = currentQuestion && (answers[currentQuestion.id] !== undefined ||
    (Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].length > 0) ||
    (!currentQuestion.required));

  // 统计各类问题数量
  const categoryStats = {
    tech: questions.filter(q => q.category === 'tech').length,
    product: questions.filter(q => q.category === 'product').length,
    extra: questions.filter(q => q.category === 'extra').length,
  };

  // 分类标签
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'tech': return { label: '🔧 技术问题', bgClass: 'bg-blue-500/20 text-blue-400' };
      case 'product': return { label: '📋 产品问题', bgClass: 'bg-green-500/20 text-green-400' };
      case 'extra': return { label: '📝 补充信息', bgClass: 'bg-purple-500/20 text-purple-400' };
      default: return { label: '其他', bgClass: 'bg-gray-500/20 text-gray-400' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] p-6">
      {/* 进度条 */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">问题 {currentIndex + 1}/{questions.length}</span>
          <span className="text-gray-400 text-sm">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 问题分类统计 */}
      <div className="max-w-2xl mx-auto mb-6 flex justify-center gap-4 text-xs">
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full">
          🔧 技术: {categoryStats.tech}题
        </span>
        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full">
          📋 产品: {categoryStats.product}题
        </span>
        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full">
          📝 补充: {categoryStats.extra}题
        </span>
      </div>

      {/* 问题卡片 */}
      {currentQuestion && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#1a1a2e]/80 border border-purple-500/20 rounded-xl p-6">
            <QuestionCard
              question={currentQuestion}
              answer={answers[currentQuestion.id]}
              onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            />
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="max-w-2xl mx-auto mt-8 flex justify-between items-center">
        <button
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 px-4 py-2"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          ← 上一题
        </button>

        <div className="flex gap-4">
          {!currentQuestion?.required && (
            <button
              className="text-gray-400 hover:text-white transition-colors px-4 py-2"
              onClick={handleSkip}
            >
              跳过
            </button>
          )}
          <button
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-all disabled:opacity-50"
            onClick={handleNext}
            disabled={!isAnswered}
          >
            {currentIndex === questions.length - 1 ? '完成 →' : '下一题 →'}
          </button>
        </div>
      </div>

      {/* 问题分类标签 */}
      <div className="max-w-2xl mx-auto mt-4">
        <span className={`inline-block px-3 py-1 rounded-full text-xs ${getCategoryLabel(currentQuestion?.category || '').bgClass}`}>
          {getCategoryLabel(currentQuestion?.category || '').label}
          {currentQuestion?.required && ' (必答)'}
        </span>
      </div>
    </div>
  );
}