'use client';

import { useState } from 'react';
import type { ClarificationQuestion } from '@/types';

interface QuestionCardProps {
  question: ClarificationQuestion;
  answer: string | string[];
  onAnswerChange: (value: string | string[]) => void;
  onSkip?: () => void;
  onSubmit: (finalAnswer?: string | string[]) => void;
  onBack?: () => void;
  canGoBack?: boolean;
  loading?: boolean;
}

export default function QuestionCard({
  question,
  answer,
  onAnswerChange,
  onSkip,
  onSubmit,
  onBack,
  canGoBack,
  loading,
}: QuestionCardProps) {
  const normalizedOptions = question.options;

  const handleRadioChange = (option: string) => {
    onAnswerChange(option);
  };

  const handleCheckboxChange = (option: string, checked: boolean) => {
    const current = Array.isArray(answer) ? answer : [];
    if (checked) {
      onAnswerChange([...current, option]);
    } else {
      onAnswerChange(current.filter(v => v !== option));
    }
  };

  const handleSubmit = () => {
    const finalAnswer = answer;
    if (question.required) {
      const hasAnswer = Array.isArray(finalAnswer)
        ? finalAnswer.length > 0
        : finalAnswer && finalAnswer.toString().trim();
      if (!hasAnswer) {
        alert('请回答此问题');
        return;
      }
    }
    onAnswerChange(finalAnswer);
    onSubmit(finalAnswer);
  };

  const effectiveAnswer = answer;
  const hasEffectiveAnswer = Array.isArray(effectiveAnswer)
    ? effectiveAnswer.length > 0
    : effectiveAnswer && effectiveAnswer.toString().trim();

  // 判断选项是否是推荐选项（第一个选项默认推荐）
  const isRecommended = (index: number) => index === 0;
  // 判断选项是否是"你帮我选"
  const isAutoSelect = (option: string) => option === '你帮我选' || option.includes('帮我选');

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
      {/* 问题标题 */}
      <h3 className="text-lg font-medium text-white mb-4">
        {question.question}
        {question.required && <span className="text-red-400 ml-1">*</span>}
      </h3>

      {/* 单选题 */}
      {question.type === 'radio' && normalizedOptions && (
        <div className="space-y-2">
          {normalizedOptions.map((option, index) => (
            <label
              key={option}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/5 border ${
                answer === option ? 'border-purple-500 bg-purple-500/10' : 'border-transparent'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={option}
                checked={answer === option}
                onChange={() => handleRadioChange(option)}
                className="w-4 h-4 text-purple-500"
                disabled={loading}
              />
              <span className="text-gray-300 flex-1">{option}</span>
              {isRecommended(index) && (
                <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">推荐</span>
              )}
              {isAutoSelect(option) && (
                <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">AI推荐</span>
              )}
            </label>
          ))}
        </div>
      )}

      {/* 多选题 */}
      {question.type === 'checkbox' && normalizedOptions && (
        <div className="space-y-2">
          {normalizedOptions.map((option, index) => (
            <label
              key={option}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/5 border ${
                Array.isArray(answer) && answer.includes(option) ? 'border-purple-500 bg-purple-500/10' : 'border-transparent'
              }`}
            >
              <input
                type="checkbox"
                value={option}
                checked={Array.isArray(answer) && answer.includes(option)}
                onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                className="w-4 h-4 rounded text-purple-500"
                disabled={loading}
              />
              <span className="text-gray-300 flex-1">{option}</span>
              {isRecommended(index) && (
                <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">推荐</span>
              )}
            </label>
          ))}
        </div>
      )}


      {/* 操作按钮 */}
      <div className="flex justify-between gap-3 mt-6">
        <div>
          {canGoBack && onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              上一题
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {!question.required && onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={loading}
            >
              跳过
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || (question.required && !hasEffectiveAnswer)}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              question.required && !hasEffectiveAnswer
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {loading ? '处理中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  );
}