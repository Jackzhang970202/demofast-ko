'use client';

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/auth-client';

type Starter = {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  tags?: string[];
};

export function StarterPrompts({ onPick }: { onPick: (prompt: string) => void }) {
  const [starters, setStarters] = useState<Starter[]>([]);

  useEffect(() => {
    void fetch('/api/demo/prompt-templates', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 200) setStarters(data.data || []);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {starters.slice(0, 4).map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick(item.prompt)}
          className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm"
        >
          <div className="text-base font-semibold text-slate-900">{item.title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">{item.summary}</div>
          {(item.tags || []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.tags!.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-slate-200">{tag}</span>
              ))}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
