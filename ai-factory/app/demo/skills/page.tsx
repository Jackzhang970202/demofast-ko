'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { getAuthHeaders, getJsonAuthHeaders } from '@/lib/auth-client';
import type { UserSkill } from '@/types/skill';

export default function DemoSkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ label: '', prompt: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState({ label: '', prompt: '' });

  useEffect(() => {
    const currentUser = localStorage.getItem('user');
    if (!currentUser) {
      router.replace('/landing');
      return;
    }
    void fetchSkills();
  }, [router]);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/demo/skills', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.code === 200) {
        setSkills(data.data || []);
        setError('');
      } else {
        setError(data.message || '加载技能失败');
      }
    } catch (err: any) {
      setError(err.message || '加载技能失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.prompt.trim()) {
      setError('名称和提示词不能为空');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/demo/skills', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ label: form.label.trim(), prompt: form.prompt.trim() }),
      });
      const data = await res.json();
      if (data.code !== 200) throw new Error(data.message || '创建失败');
      setSkills((prev) => [...prev, data.data]);
      setForm({ label: '', prompt: '' });
      setError('');
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (skill: UserSkill) => {
    setEditingId(skill.id);
    setEditingForm({ label: skill.label, prompt: skill.prompt });
  };

  const handleUpdate = async () => {
    if (!editingId || !editingForm.label.trim() || !editingForm.prompt.trim()) return;
    try {
      const res = await fetch('/api/demo/skills', {
        method: 'PATCH',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ id: editingId, label: editingForm.label.trim(), prompt: editingForm.prompt.trim() }),
      });
      const data = await res.json();
      if (data.code !== 200) throw new Error(data.message || '更新失败');
      setSkills((prev) => prev.map((item) => item.id === editingId ? data.data : item));
      setEditingId(null);
      setEditingForm({ label: '', prompt: '' });
      setError('');
    } catch (err: any) {
      setError(err.message || '更新失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/demo/skills?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code !== 200) throw new Error(data.message || '删除失败');
      setSkills((prev) => prev.filter((item) => item.id !== id));
      setError('');
    } catch (err: any) {
      setError(err.message || '删除失败');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f6f7fb] flex items-center justify-center text-slate-500">加载中...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-8 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
              <Sparkles className="h-3.5 w-3.5" /> 技能页面
            </div>
            <h1 className="mt-4 text-3xl font-semibold">我的技能</h1>
            <p className="mt-2 text-sm text-slate-500">每个用户只看自己的技能。默认技能不可删除，自定义技能支持增删改查。</p>
          </div>
          <Link href="/demo/workspace" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900">
            返回工作台
          </Link>
        </div>

        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <form onSubmit={handleCreate} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Plus className="h-4 w-4" /> 新建技能
            </div>
            <div>
              <div className="mb-2 text-sm text-slate-500">技能名称</div>
              <input value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-300" placeholder="例如：表单约束强化" />
            </div>
            <div>
              <div className="mb-2 text-sm text-slate-500">提示词</div>
              <textarea value={form.prompt} onChange={(e) => setForm((prev) => ({ ...prev, prompt: e.target.value }))} className="h-48 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-300" placeholder="这里填写实际注入的提示词" />
            </div>
            <button disabled={saving} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
              {saving ? '创建中...' : '创建技能'}
            </button>
          </form>

          <div className="space-y-4">
            {skills.map((skill) => (
              <div key={skill.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                {editingId === skill.id ? (
                  <div className="space-y-3">
                    <input value={editingForm.label} onChange={(e) => setEditingForm((prev) => ({ ...prev, label: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-300" />
                    <textarea value={editingForm.prompt} onChange={(e) => setEditingForm((prev) => ({ ...prev, prompt: e.target.value }))} className="h-36 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-300" />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleUpdate} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white">保存</button>
                      <button type="button" onClick={() => setEditingId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600">取消</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-semibold text-slate-900">{skill.label}</div>
                          {skill.isDefault && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">默认</span>}
                        </div>
                        <div className="mt-2 text-xs text-slate-400">{skill.id}</div>
                      </div>
                      {!skill.isDefault && (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => startEdit(skill)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => handleDelete(skill.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{skill.prompt}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
