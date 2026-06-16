'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import GlowingBorder from '@/components/GlowingBorder';

export default function HomePage() {
  const router = useRouter();
  const [requirement, setRequirement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShatter, setShowShatter] = useState(false);

  // 检查登录状态，重定向到工作区或 landing
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      // 已登录，跳转到原型生成智能体
      router.replace('/demo/workspace');
    } else {
      // 未登录，跳转到 landing
      router.replace('/landing');
    }
  }, [router]);

  // 如果正在重定向，显示加载状态
  if (!showShatter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a20] via-[#1e1635] to-[#251a40] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🏭</div>
          <div className="text-white text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  const handleSubmit = useCallback(async () => {
    if (!requirement.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setShowShatter(true);

    // 保存需求到 sessionStorage
    sessionStorage.setItem('requirement', requirement);

    // 创建碎屏 Canvas 动画
    const canvas = document.createElement('canvas');
    canvas.className = 'shatter-overlay';
    canvas.style.pointerEvents = 'none';
    const W = canvas.width = document.documentElement.clientWidth;
    const H = canvas.height = document.documentElement.clientHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // 离屏画布渲染当前页面
    const snap = document.createElement('canvas');
    snap.width = W;
    snap.height = H;
    const sc = snap.getContext('2d')!;

    // 圆角矩形辅助
    const rrect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
      c.fill();
    };

    // 渲染背景
    const bgGrad = sc.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0f0a20');
    bgGrad.addColorStop(0.5, '#1e1635');
    bgGrad.addColorStop(1, '#251a40');
    sc.fillStyle = bgGrad;
    sc.fillRect(0, 0, W, H);

    // 径向光晕
    const rg = sc.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.35);
    rg.addColorStop(0, 'rgba(139, 92, 246, 0.12)');
    rg.addColorStop(1, 'rgba(139, 92, 246, 0)');
    sc.fillStyle = rg;
    sc.fillRect(0, 0, W, H);

    // 输入框区域
    const boxW = Math.min(576, W - 48);
    const textH = 5 * 27 + 36;
    const bP = 3, bR = 16;
    const bx = (W - boxW) / 2 - bP;
    const by = H / 2 - textH / 2 - 50;
    const fW = boxW + bP * 2, fH = textH + bP * 2;

    // 渐变边框
    const bg = sc.createLinearGradient(bx, by, bx + fW, by);
    bg.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
    bg.addColorStop(0.33, 'rgba(139, 92, 246, 0.3)');
    bg.addColorStop(0.66, 'rgba(236, 72, 153, 0.25)');
    bg.addColorStop(1, 'rgba(59, 130, 246, 0.35)');
    sc.fillStyle = bg;
    rrect(sc, bx, by, fW, fH, bR);

    sc.fillStyle = '#352a55';
    rrect(sc, bx + bP, by + bP, boxW, textH, bR - bP);

    // 文字内容
    sc.font = '16px "Segoe UI","Microsoft YaHei",sans-serif';
    sc.textBaseline = 'top';
    const txt = requirement.trim();
    if (txt) {
      sc.fillStyle = '#e2e8f0';
      const lines = txt.split('\n');
      for (let i = 0; i < Math.min(lines.length, 5); i++) {
        sc.fillText(lines[i].substring(0, 50), bx + bP + 22, by + bP + 18 + i * 27);
      }
    } else {
      sc.fillStyle = '#64748b';
      sc.fillText('输入系统需求...', bx + bP + 22, by + bP + 18);
    }

    // 按钮
    const btnW = 200, btnH = 48;
    const btnX = (W - btnW) / 2, btnY = by + fH + 32;
    const btg = sc.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btg.addColorStop(0, '#8b5cf6');
    btg.addColorStop(1, '#7c3aed');
    sc.fillStyle = btg;
    rrect(sc, btnX, btnY, btnW, btnH, 10);
    sc.fillStyle = '#ffffff';
    sc.font = 'bold 17px "Segoe UI","Microsoft YaHei",sans-serif';
    sc.textAlign = 'center';
    sc.textBaseline = 'middle';
    sc.fillText('开  始', W / 2, btnY + btnH / 2);
    sc.textAlign = 'start';

    // 碎块
    const COLS = 24, ROWS = 16;
    const baseW = W / COLS, baseH = H / ROWS;
    const chunks: any[] = [];
    const crackPoints = Array.from({ length: 10 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.25,
    }));

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = c * baseW;
        const cy = r * baseH;
        const isLastCol = c === COLS - 1;
        const isLastRow = r === ROWS - 1;
        const cw = isLastCol ? W - cx : baseW;
        const ch = isLastRow ? H - cy : baseH;
        let minCrackDist = Infinity;
        for (const cp of crackPoints) {
          const dist = Math.sqrt((cx + cw / 2 - cp.x) ** 2 + (cy + ch / 2 - cp.y) ** 2);
          minCrackDist = Math.min(minCrackDist, dist);
        }
        chunks.push({
          sx: cx, sy: cy, w: cw, h: ch,
          ox: cx, oy: cy, x: cx, y: cy, row: r,
          crackDist: minCrackDist, vx: 0, vy: 0, vr: 0, angle: 0,
          falling: false, fallen: false, fallStart: 0, opacity: 1,
        });
      }
    }

    // 渲染完整截图
    ctx.drawImage(snap, 0, 0);

    // 跳转到问答页
    setTimeout(() => router.push('/questions'), 50);

    // 灰尘粒子
    const particles: any[] = [];
    const spawnDust = (px: number, py: number, n: number) => {
      for (let i = 0; i < n; i++) {
        particles.push({
          x: px + (Math.random() - 0.5) * 20,
          y: py + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 3,
          vy: -1 - Math.random() * 2,
          size: 1 + Math.random() * 2,
          life: 0.4 + Math.random() * 0.7,
          age: 0,
          alpha: 0.15 + Math.random() * 0.2,
        });
      }
    };

    let startTime: number | null = null;
    const WAIT = 200;
    const FALL_DUR = 6000;

    const frame = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;

      ctx.clearRect(0, 0, W, H);

      // 画原位碎块
      for (const ch of chunks) {
        if (ch.falling || ch.fallen) continue;
        ctx.drawImage(snap, Math.max(0, ch.sx), Math.max(0, ch.sy), ch.w, ch.h, ch.ox, ch.oy, ch.w, ch.h);
      }

      // 触发掉落
      if (elapsed > WAIT) {
        const fp = Math.min(1, (elapsed - WAIT) / FALL_DUR);
        const waveFront = fp * (H + 150);
        for (const ch of chunks) {
          if (ch.falling || ch.fallen) continue;
          const centerY = ch.oy + ch.h / 2;
          const triggerY = waveFront + (Math.random() - 0.5) * 200;
          const crackBonus = ch.crackDist < 100 ? 300 - ch.crackDist * 3 : 0;
          const shouldFall = centerY < triggerY + crackBonus && Math.random() < 0.08;
          if (shouldFall) {
            ch.falling = true;
            ch.fallStart = elapsed;
            ch.vx = (Math.random() - 0.5) * 50;
            ch.vy = -10 - Math.random() * 40;
            ch.vr = (Math.random() - 0.5) * 0.08;
            spawnDust(ch.ox + ch.w / 2, ch.oy + ch.h / 2, 2);
          }
        }
      }

      // 末尾强制掉落
      if (elapsed > WAIT + FALL_DUR * 0.9) {
        for (const ch of chunks) {
          if (!ch.falling && !ch.fallen) {
            ch.falling = true;
            ch.fallStart = elapsed;
            ch.vx = (Math.random() - 0.5) * 40;
            ch.vy = -10 - Math.random() * 25;
            ch.vr = (Math.random() - 0.5) * 0.06;
          }
        }
      }

      // 更新掉落碎块
      for (const ch of chunks) {
        if (!ch.falling || ch.fallen) continue;
        const ft = (elapsed - ch.fallStart) / 1000;
        ch.x = ch.ox + ch.vx * ft;
        ch.y = ch.oy + ch.vy * ft + 490 * ft * ft;
        ch.angle += ch.vr;
        ch.opacity = Math.max(0, 1 - ft / 2.5);
        if (ch.y > H + 200 || ch.opacity <= 0) {
          ch.fallen = true;
          continue;
        }

        ctx.save();
        ctx.translate(ch.x + ch.w / 2, ch.y + ch.h / 2);
        ctx.rotate(ch.angle);
        ctx.globalAlpha = ch.opacity;
        ctx.drawImage(snap, Math.max(0, ch.sx), Math.max(0, ch.sy), ch.w, ch.h, -ch.w / 2, -ch.h / 2, ch.w, ch.h);
        ctx.restore();
      }

      // 灰尘粒子
      ctx.save();
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += 1 / 60;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.8;
        p.vx *= 0.97;
        const lr = Math.max(0, 1 - p.age / p.life);
        if (lr <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = lr * p.alpha;
        ctx.fillStyle = '#778';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * lr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const allDone = chunks.every(ch => ch.fallen);
      if (!allDone && elapsed < 12000) {
        requestAnimationFrame(frame);
      } else {
        canvas.remove();
      }
    };

    setTimeout(() => requestAnimationFrame(frame), 50);
  }, [requirement, isSubmitting, router]);

  return (
    <div className="phase-input min-h-screen flex flex-col items-center justify-center p-6 relative">
      {/* 标题 */}
      <div className="text-center mb-8 animate-float">
        <h1 className="text-5xl font-bold text-white mb-4">
          <span className="inline-block mr-2">🏭</span>
          AI 开发工厂
        </h1>
        <p className="text-xl text-gray-400">所说即所得的智能开发平台</p>
      </div>

      {/* 输入框 */}
      <div className="w-full max-w-2xl mb-8">
        <GlowingBorder>
          <textarea
            className="textarea-glow"
            placeholder="描述您的需求，例如：&#10;我需要一个用户管理系统，支持登录、注册、权限管理...&#10;&#10;越详细，生成的代码越精准"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            rows={5}
            maxLength={8000}
          />
        </GlowingBorder>
        <div className="flex justify-end mt-2">
          <span className="text-gray-500 text-sm">{requirement.length}/8000</span>
        </div>
      </div>

      {/* 提交按钮 */}
      <button
        className="btn-primary text-lg px-8 py-4"
        onClick={handleSubmit}
        disabled={!requirement.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            正在分析...
          </span>
        ) : (
          '🚀 开始创造'
        )}
      </button>

      {/* 我的项目链接 */}
      <Link
        href="/projects"
        className="mt-4 text-gray-400 hover:text-white text-sm transition-colors"
      >
        📂 查看我的项目
      </Link>

      {/* 功能说明 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-8 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <span>💬</span>
            <span>自然语言描述</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🤖</span>
            <span>AI智能分析</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span>即时生成代码</span>
          </div>
        </div>
      </div>
    </div>
  );
}