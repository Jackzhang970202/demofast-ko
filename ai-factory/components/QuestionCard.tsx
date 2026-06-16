'use client';

interface Question {
  id: string;
  category: 'tech' | 'product' | 'extra';
  type: 'radio' | 'checkbox' | 'textarea' | 'select';
  question: string;
  options?: string[];
  required: boolean;
}

interface QuestionCardProps {
  question: Question;
  answer: any;
  onAnswer: (answer: any) => void;
}

export default function QuestionCard({ question, answer, onAnswer }: QuestionCardProps) {
  const handleRadioChange = (option: string) => {
    onAnswer(option);
  };

  const handleCheckboxChange = (option: string, checked: boolean) => {
    const current = Array.isArray(answer) ? answer : [];
    if (checked) {
      onAnswer([...current, option]);
    } else {
      onAnswer(current.filter((a: string) => a !== option));
    }
  };

  const handleTextareaChange = (value: string) => {
    onAnswer(value);
  };

  return (
    <div className="question-card">
      <h3 className="text-xl font-semibold text-white mb-6">{question.question}</h3>

      {question.type === 'radio' && question.options && (
        <div className="space-y-3">
          {question.options.map((option) => (
            <div
              key={option}
              className={`option-item ${answer === option ? 'selected' : ''}`}
              onClick={() => handleRadioChange(option)}
            >
              <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                answer === option ? 'border-purple-500' : 'border-gray-500'
              }`}>
                {answer === option && (
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                )}
              </div>
              <span className="text-gray-300">{option}</span>
            </div>
          ))}
        </div>
      )}

      {question.type === 'checkbox' && question.options && (
        <div className="space-y-3">
          {question.options.map((option) => {
            const isChecked = Array.isArray(answer) && answer.includes(option);
            return (
              <div
                key={option}
                className={`option-item ${isChecked ? 'selected' : ''}`}
                onClick={() => handleCheckboxChange(option, !isChecked)}
              >
                <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                  isChecked ? 'border-purple-500 bg-purple-500' : 'border-gray-500'
                }`}>
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-gray-300">{option}</span>
              </div>
            );
          })}
        </div>
      )}

      {question.type === 'textarea' && (
        <textarea
          className="w-full bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
          rows={4}
          placeholder="请输入您的回答..."
          value={answer || ''}
          onChange={(e) => handleTextareaChange(e.target.value)}
        />
      )}

      {question.type === 'select' && question.options && (
        <select
          className="w-full bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-gray-200 focus:border-purple-500 focus:outline-none transition-colors"
          value={answer || ''}
          onChange={(e) => onAnswer(e.target.value)}
        >
          <option value="">请选择...</option>
          {question.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}

      {question.required && (
        <p className="text-red-400 text-sm mt-4">* 此问题为必答题</p>
      )}
    </div>
  );
}