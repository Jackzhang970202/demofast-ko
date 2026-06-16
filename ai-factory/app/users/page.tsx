'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Eye, EyeOff, KeyRound, Shield, Users } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth-client';

interface UserItem {
  id: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  password?: string;
  balancePoints?: number;
  usedPoints?: number;
  usedTokens?: number;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [copiedValue, setCopiedValue] = useState('');
  const [form, setForm] = useState({ name: '', password: '' });
  const [pointForms, setPointForms] = useState<Record<string, { balancePoints: string; loading: boolean }>>({});

  const getPointForm = (userId: string, currentBalance?: number) => pointForms[userId] || { balancePoints: String(Number(currentBalance ?? 0).toFixed(2)), loading: false };

  const updatePointForm = (userId: string, currentBalance: number | undefined, patch: Partial<{ balancePoints: string; loading: boolean }>) => {
    setPointForms((prev) => ({
      ...prev,
      [userId]: {
        ...getPointForm(userId, currentBalance),
        ...patch,
      },
    }));
  };

  const handleAdjustPoints = async (userId: string, currentBalance?: number) => {
    const current = getPointForm(userId, currentBalance);
    const balancePoints = Number(current.balancePoints);
    if (!Number.isFinite(balancePoints) || balancePoints < 0) {
      setError('点数余额不能为空，且余额不能小于 0');
      return;
    }
    updatePointForm(userId, currentBalance, { loading: true });
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ userId, balancePoints }),
      });
      const data = await res.json();
      if (data.code !== 200) {
        throw new Error(data.message || '点数修改失败');
      }
      setUsers((prev) => prev.map((item) => item.id === userId ? { ...item, ...data.data.user } : item));
      setError('');
      updatePointForm(userId, data.data.user?.balancePoints, { balancePoints: String(Number(data.data.user?.balancePoints ?? 0).toFixed(2)), loading: false });
    } catch (err: any) {
      setError(err.message || '点数修改失败');
      updatePointForm(userId, currentBalance, { loading: false });
    }
  };

  const formatPoints = (value?: number) => Number(value ?? 0).toFixed(2);

  const formatTokens = (value?: number) => Number(value ?? 0).toLocaleString();

  const getGenerationStatus = (value?: number) => (Number(value ?? 0) > 0 ? '可生成' : '已停用');

  const getGenerationStatusClass = (value?: number) => Number(value ?? 0) > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300';

  const getAdjustButtonLabel = (userId: string, currentBalance?: number) => getPointForm(userId, currentBalance).loading ? '提交中...' : '保存余额';

  const getAdjustDisabled = (userId: string, currentBalance?: number) => getPointForm(userId, currentBalance).loading;

  const getAdjustBalance = (userId: string, currentBalance?: number) => getPointForm(userId, currentBalance).balancePoints;

  const setAdjustBalance = (userId: string, currentBalance: number | undefined, value: string) => updatePointForm(userId, currentBalance, { balancePoints: value });

  const pointCellClass = 'px-6 py-4 text-gray-200 whitespace-nowrap';

  const adjustInputClass = 'w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white outline-none focus:border-sky-400';

  const adjustButtonClass = 'w-full px-3 py-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 rounded-lg transition-colors';

  const adjustWrapClass = 'space-y-2 min-w-[240px]';

  const adjustCellClass = 'px-6 py-4';

  const pointsHeader = '点数余额';

  const usedPointsHeader = '已用点数';

  const usedTokensHeader = '已用Tokens';

  const statusHeader = '生成状态';

  const adjustHeader = '修改余额';

  const balancePlaceholder = '输入最新余额';

  const copiedLabel = '已复制';

  const availableLabel = '可生成';

  const disabledLabel = '已停用';

  void copiedLabel;
  void availableLabel;
  void disabledLabel;

  useEffect(() => {
    const currentUser = localStorage.getItem('user');
    if (!currentUser) {
      router.replace('/landing');
      return;
    }

    const parsedUser = JSON.parse(currentUser);
    if (parsedUser.role !== 'admin') {
      router.replace('/demo/workspace');
      return;
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200) {
        setUsers(data.data || []);
        setError('');
      } else {
        setError(data.message || '获取账号列表失败');
      }
    } catch (err: any) {
      setError(err.message || '获取账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.password) {
      setError('用户名和密码不能为空');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: form.name.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setForm({ name: '', password: '' });
        setUsers((prev) => [data.data, ...prev]);
      } else {
        setError(data.message || '创建账号失败');
      }
    } catch (err: any) {
      setError(err.message || '创建账号失败');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyPassword = async (password?: string) => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopiedValue(password);
      setTimeout(() => setCopiedValue(''), 1500);
    } catch {
      setError('复制密码失败');
    }
  };

  const formatTime = (value?: string) => {
    if (!value) return '未登录';
    return new Date(value).toLocaleString('zh-CN');
  };

  const maskedPassword = (password?: string) => {
    if (!password) return '--';
    return '•'.repeat(Math.max(password.length, 6));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#172554] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-sky-500/40 border-t-sky-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] via-[#111827] to-[#172554] p-6 text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 text-sm mb-4">
              <Shield className="w-4 h-4" />
              Demo 原型 · 管理员控制台
            </div>
            <h1 className="text-3xl font-bold mb-2">账号管理</h1>
            <p className="text-gray-400">仅管理员可创建账号、查看账号列表，并直接查看明文密码。</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/demo/workspace" className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors">
              返回工作区
            </Link>
            <Link href="/projects" className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors">
              项目管理
            </Link>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">创建账号</h2>
                <p className="text-sm text-gray-400">默认创建普通用户，创建后会立即出现在右侧列表。</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">用户名</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="输入用户名"
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-gray-400">密码</label>
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((prev) => !prev)}
                    className="text-xs text-sky-300 hover:text-sky-200 flex items-center gap-1"
                  >
                    {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {passwordVisible ? '隐藏密码' : '显示密码'}
                  </button>
                </div>
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="输入登录密码"
                  className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-sky-400"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full px-4 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {creating ? '创建中...' : '创建普通用户'}
              </button>
            </form>

            {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-sm">
            <div className="px-6 py-5 border-b border-white/10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">账号列表</h2>
                <p className="text-sm text-gray-400 mt-1">当前共 {users.length} 个账号，管理员可直接修改每个账号的点数余额。</p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-sm text-gray-300">
                <KeyRound className="w-4 h-4 text-sky-300" />
                明文密码可复制
              </div>
            </div>

            {users.length === 0 ? (
              <div className="p-12 text-center text-gray-400">暂无账号</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-black/20 text-gray-400">
                    <tr>
                      <th className="text-left px-6 py-4">用户</th>
                      <th className="text-left px-6 py-4">角色</th>
                      <th className="text-left px-6 py-4">{pointsHeader}</th>
                      <th className="text-left px-6 py-4">{usedPointsHeader}</th>
                      <th className="text-left px-6 py-4">{usedTokensHeader}</th>
                      <th className="text-left px-6 py-4">{statusHeader}</th>
                      <th className="text-left px-6 py-4">密码</th>
                      <th className="text-left px-6 py-4">创建时间</th>
                      <th className="text-left px-6 py-4">最近登录</th>
                      <th className="text-left px-6 py-4">{adjustHeader}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-white/10 text-gray-200 align-top">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold">
                              {user.avatar || user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-white">{user.name}</div>
                              <div className="text-xs text-gray-500 mt-1">{user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : 'bg-sky-500/20 text-sky-300'}`}>
                            {user.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td className={pointCellClass}>{formatPoints(user.balancePoints)}</td>
                        <td className={pointCellClass}>{formatPoints(user.usedPoints)}</td>
                        <td className={pointCellClass}>{formatTokens(user.usedTokens)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs ${getGenerationStatusClass(user.balancePoints)}`}>
                            {getGenerationStatus(user.balancePoints)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <code className="px-3 py-2 rounded-lg bg-black/25 border border-white/10 text-sky-200 font-mono">
                              {passwordVisible ? (user.password || '--') : maskedPassword(user.password)}
                            </code>
                            <button
                              type="button"
                              onClick={() => handleCopyPassword(user.password)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                              title="复制密码"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            {copiedValue && copiedValue === user.password && <span className="text-xs text-emerald-300">已复制</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 whitespace-nowrap">{formatTime(user.createdAt)}</td>
                        <td className="px-6 py-4 text-gray-300 whitespace-nowrap">{formatTime(user.lastLogin)}</td>
                        <td className={adjustCellClass}>
                          <div className={adjustWrapClass}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={getAdjustBalance(user.id, user.balancePoints)}
                              onChange={(e) => setAdjustBalance(user.id, user.balancePoints, e.target.value)}
                              placeholder={balancePlaceholder}
                              className={adjustInputClass}
                            />
                            <button
                              type="button"
                              disabled={getAdjustDisabled(user.id, user.balancePoints)}
                              onClick={() => handleAdjustPoints(user.id, user.balancePoints)}
                              className={adjustButtonClass}
                            >
                              {getAdjustButtonLabel(user.id, user.balancePoints)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
