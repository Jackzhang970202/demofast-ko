'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getAuthHeaders } from '@/lib/auth-client';

type TemplateMeta = {
  id: string;
  title: string;
  description: string;
  useCases: string[];
  visualStyle?: string[];
  layoutStyle?: string[];
  tone?: string[];
  density?: 'low' | 'medium' | 'high';
  promptSeed?: string;
};

type TemplateDetail = TemplateMeta & {
  templateMarkdown: string;
  previewHtml?: string;
};

interface Props {
  value: string | null;
  onChange: (id: string, promptSeed?: string) => void;
}

export function TemplatePicker({ value, onChange }: Props) {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    void fetch('/api/demo/templates', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 200) setTemplates(data.data || []);
      })
      .catch(() => {});
  }, []);

  const loadDetail = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/demo/templates/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.code === 200) setDetail(data.data);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        {templates.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id, item.promptSeed)}
              className={cn(
                'rounded-3xl border p-5 text-left transition-all shadow-sm',
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:shadow-md'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={cn('text-xs font-medium uppercase tracking-[0.18em]', active ? 'text-slate-300' : 'text-slate-400')}>
                    {item.id}
                  </div>
                  <div className={cn('mt-2 text-lg font-semibold', active ? 'text-white' : 'text-slate-900')}>
                    {item.title}
                  </div>
                </div>
                <span className={cn('rounded-full px-2.5 py-1 text-[11px]', active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600')}>
                  {item.density || 'medium'}
                </span>
              </div>

              <div className={cn('mt-3 text-sm leading-6', active ? 'text-slate-200' : 'text-slate-500')}>
                {item.description}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[...(item.visualStyle || []), ...(item.layoutStyle || [])].slice(0, 4).map((tag) => (
                  <span key={tag} className={cn('rounded-full px-2.5 py-1 text-[11px]', active ? 'bg-white/10 text-slate-100' : 'bg-slate-100 text-slate-600')}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className={cn('text-xs', active ? 'text-slate-300' : 'text-slate-400')}>
                  适用：{item.useCases.slice(0, 2).join(' / ')}
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void loadDetail(item.id);
                  }}
                  className={cn('text-xs font-medium', active ? 'text-white' : 'text-slate-600 hover:text-slate-900')}
                >
                  {loadingId === item.id ? '加载中...' : '查看模板'}
                </button>
              </div>
            </button>
          );
        })}
      </div>

      {detail && (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-slate-900">{detail.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">{detail.description}</div>
            </div>
            <button type="button" onClick={() => setDetail(null)} className="text-sm text-slate-500 hover:text-slate-900">关闭</button>
          </div>

          {detail.previewHtml && (
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <iframe title={detail.title} srcDoc={detail.previewHtml} className="h-72 w-full bg-white" />
            </div>
          )}

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-medium text-slate-900">模板规则</div>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{detail.templateMarkdown}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
