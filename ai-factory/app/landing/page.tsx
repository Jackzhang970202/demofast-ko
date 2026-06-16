'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthHeaders, getJsonAuthHeaders } from '@/lib/auth-client';
import {
  Rocket,
  Layers,
  RefreshCw,
  MessageSquare,
  Bot,
  Sparkles,
  X,
  Loader2,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  MessagesSquare,
  ChevronRight,
  Code2,
  Play,
  Factory,
  Shield,
  Eye,
  Wand2,
  Square,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Workflow,
  Database,
  Clock3,
} from 'lucide-react';

function useCountUp(end: number, duration = 2000, startOnView = false) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOnView) {
      setStarted(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setStarted(true);
      } else {
        observer.observe(ref.current);
      }
    }
    return () => observer.disconnect();
  }, [startOnView]);

  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(end * progress));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, started]);

  return { count, ref };
}

interface DemoProject {
  id: string;
  name: string;
  description: string;
  icon: string;
  tech: string[];
  features: string[];
  color: string;
  available: boolean;
  running: boolean;
  url: string | null;
  comingSoon?: boolean;
}

function BusinessStatsSection() {
  const efficiency = useCountUp(85, 1800, true);
  const cycle = useCountUp(70, 1800, true);
  const delivery = useCountUp(100, 1800, true);
  const preview = useCountUp(24, 1800, true);

  const stats = [
    {
      label: '需求梳理效率提升',
      value: `${efficiency.count}%`,
      desc: '自然语言直接进入结构化生成流程',
      ref: efficiency.ref,
    },
    {
      label: '交付周期缩短',
      value: `${cycle.count}%`,
      desc: '从需求、架构到应用交付统一推进',
      ref: cycle.ref,
    },
    {
      label: '可运行项目输出',
      value: `${delivery.count}%`,
      desc: '生成结果包含前端、接口与数据结构',
      ref: delivery.ref,
    },
    {
      label: '小时级原型验证',
      value: `${preview.count}h`,
      desc: '更快完成业务验证与内部评审',
      ref: preview.ref,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.label}
          ref={item.ref}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="text-3xl font-semibold text-gray-900">{item.value}</div>
          <div className="mt-2 text-sm font-medium text-gray-900">{item.label}</div>
          <div className="mt-1 text-sm leading-6 text-gray-600">{item.desc}</div>
        </div>
      ))}
    </div>
  );
}

function SolutionPreview() {
  const items = [
    {
      title: '需求采集',
      detail: '用业务语言输入目标、角色与流程，系统自动沉淀为可执行需求。',
      icon: MessageSquare,
    },
    {
      title: '智能分析',
      detail: '自动识别功能模块、页面结构、数据关系与交付边界。',
      icon: Bot,
    },
    {
      title: '应用生成',
      detail: '输出前端页面、接口能力、数据库结构与可运行工程。',
      icon: Code2,
    },
    {
      title: '在线验证',
      detail: '直接启动演示环境，快速进行内部评审与迭代。',
      icon: Eye,
    },
  ];

  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">项目交付总览</div>
          <div className="mt-1 text-sm text-gray-500">从业务需求到可运行应用的一体化流程</div>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          Ready for demo
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {items.map((item, index) => (
          <div key={item.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    Step {index + 1}
                  </span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
                <div className="mt-2 text-base font-semibold text-gray-900">{item.title}</div>
                <div className="mt-1 text-sm leading-6 text-gray-600">{item.detail}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Workflow className="h-4 w-4 text-purple-600" />
            流程标准化
          </div>
          <div className="mt-1 text-sm text-gray-600">减少需求沟通损耗，统一交付口径。</div>
        </div>
        <div className="rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Database className="h-4 w-4 text-purple-600" />
            工程可落地
          </div>
          <div className="mt-1 text-sm text-gray-600">输出结构化项目，不停留在静态原型。</div>
        </div>
        <div className="rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Clock3 className="h-4 w-4 text-purple-600" />
            验证更快速
          </div>
          <div className="mt-1 text-sm text-gray-600">更适合内部试点、售前演示和方案验证。</div>
        </div>
      </div>
    </div>
  );
}

function ShowcaseSection() {
  const [demos, setDemos] = useState<DemoProject[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingDemos, setLoadingDemos] = useState(true);

  useEffect(() => {
    fetch('/api/demo', {
      headers: getAuthHeaders(),
    })
      .then(res => res.json())
      .then(data => {
        if (data.code === 200) {
          setDemos(data.data);
        }
      })
      .finally(() => setLoadingDemos(false));
  }, []);

  const startDemo = async (projectId: string) => {
    setLoading(projectId);
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.code === 200 && data.data?.url) {
        setDemos(prev => prev.map(d =>
          d.id === projectId ? { ...d, running: true, url: data.data.url } : d
        ));
        window.open(data.data.url, '_blank');
      } else {
        alert(data.message || '启动失败');
      }
    } catch (err: any) {
      alert('启动失败: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const stopDemo = async (projectId: string) => {
    setLoading(projectId);
    try {
      const res = await fetch(`/api/demo?projectId=${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200) {
        setDemos(prev => prev.map(d =>
          d.id === projectId ? { ...d, running: false, url: null } : d
        ));
      } else {
        alert(data.message || '停止失败');
      }
    } catch (err: any) {
      alert('停止失败: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  if (loadingDemos) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
            <div className="h-28 rounded-2xl bg-gray-100 mb-4" />
            <div className="h-4 w-2/3 rounded bg-gray-100 mb-2" />
            <div className="h-3 w-full rounded bg-gray-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {demos.map((demo) => (
        <div
          key={demo.id}
          className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          <div className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${demo.color}`}>
            <div className="text-4xl">{demo.icon}</div>
            {demo.running && (
              <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-emerald-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                运行中
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900">{demo.name}</h3>
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-medium text-purple-700">AI 生成</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{demo.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {demo.tech.map(t => (
                <span key={t} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600">{t}</span>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {demo.features.slice(0, 3).map(f => (
                <span key={f} className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] text-purple-700">{f}</span>
              ))}
            </div>

            <div className="mt-5">
              {demo.comingSoon ? (
                <button
                  disabled
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                >
                  <Sparkles className="h-4 w-4" />
                  即将推出
                </button>
              ) : demo.running ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (demo.url) {
                        window.open(demo.url, '_blank');
                      }
                    }}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                    打开演示
                  </button>
                  <button
                    onClick={() => stopDemo(demo.id)}
                    disabled={loading === demo.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    {loading === demo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                    停止
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startDemo(demo.id)}
                  disabled={loading === demo.id}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {loading === demo.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      启动中...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      立即体验
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requirement, setRequirement] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingRequirement, setPendingRequirement] = useState('');

  const handleStartCreate = () => {
    if (!requirement.trim()) return;
    const user = localStorage.getItem('user');
    if (user) {
      sessionStorage.setItem('requirement', requirement);
      router.push('/demo/requirement');
    } else {
      setPendingRequirement(requirement);
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = (user: any) => {
    localStorage.setItem('user', JSON.stringify(user));
    setShowLoginModal(false);
    if (pendingRequirement) {
      sessionStorage.setItem('requirement', pendingRequirement);
      router.push('/requirement');
    } else {
      router.push('/demo/workspace');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: email, password }),
      });
      const data = await res.json();
      if (data.code === 200) {
        handleLoginSuccess(data.data.user);
      } else {
        setError(data.message || '操作失败');
      }
    } catch (err: any) {
      setError(err.message || '网络错误');
    } finally {
      setLoading(false);
    }
  };

  const capabilities = [
    { icon: MessageSquare, title: '需求理解', desc: '将业务语言沉淀为结构化开发输入。'},
    { icon: Bot, title: 'AI 分析', desc: '识别业务角色、流程和功能边界。'},
    { icon: Layers, title: '架构生成', desc: '自动形成页面、接口与数据结构设计。'},
    { icon: Code2, title: '代码输出', desc: '生成可运行工程，而非静态说明文档。'},
    { icon: Eye, title: '在线预览', desc: '支持快速查看真实运行效果。'},
    { icon: RefreshCw, title: '持续迭代', desc: '通过对话持续补充与优化应用。'},
  ];

  const templates = [
    { icon: Package, label: '企业管理', text: '我需要一个企业OA系统，包含用户管理、权限控制、公告发布、请假审批等功能' },
    { icon: ShoppingCart, label: '电商商城', text: '我需要一个电商平台，包含商品管理、购物车、订单系统、用户中心' },
    { icon: FileText, label: '知识库', text: '我需要一个知识库文档系统，支持文档上传、分类管理、全文检索' },
    { icon: BarChart3, label: '数据看板', text: '我需要一个数据可视化仪表盘，展示销售数据、用户增长' },
    { icon: MessagesSquare, label: '协作工具', text: '我需要一个团队协作工具，支持频道聊天、文件共享、任务管理' },
  ];

  const techStack = [
    { name: 'Next.js', icon: '⚡' },
    { name: 'React', icon: '⚛️' },
    { name: 'TypeScript', icon: '🔷' },
    { name: 'Node.js', icon: '💚' },
    { name: 'Tailwind', icon: '🎨' },
    { name: 'PostgreSQL', icon: '🐘' },
  ];

  const processSteps = [
    {
      title: '输入业务需求',
      desc: '直接提交你的场景、角色、流程与目标。',
      icon: MessageSquare,
    },
    {
      title: 'AI 自动拆解',
      desc: '自动分析页面、模块、数据与交互关系。',
      icon: Bot,
    },
    {
      title: '生成可运行项目',
      desc: '输出工程代码、接口能力和应用结构。',
      icon: Code2,
    },
    {
      title: '预览并继续优化',
      desc: '在线演示验证结果，再继续迭代细节。',
      icon: Wand2,
    },
  ];

  const trustItems = [
    '统一需求录入与分析口径',
    '保留可运行演示与验证链路',
    '面向企业内部系统与业务平台',
  ];

  const deliverables = [
    '前端页面结构与交互逻辑',
    '接口能力与业务流程设计',
    '数据库结构与核心实体关系',
    '可启动的演示环境与验证路径',
    '后续通过对话继续优化的迭代入口',
  ];

  const quickPanels = [
    { title: '业务目标', value: '从需求到交付更短', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
    { title: '交付形态', value: '可运行项目 + 在线演示', tone: 'bg-purple-50 text-purple-700 border-purple-100' },
    { title: '协作方式', value: '产品、业务、开发共用同一入口', tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  ];

  const sampleOutputs = [
    '角色权限结构',
    '审批流页面',
    '统计看板模块',
    '接口与数据模型',
  ];

  const showcaseHighlights = [
    '真实可启动',
    '支持在线验证',
    '适合售前与试点',
  ];

  const stackBenefits = [
    '主流前端工程体系，便于接管',
    '生成结果更适合继续扩展',
    '兼顾原型验证与正式落地',
  ];

  const ctaBullets = [
    '提交需求',
    '快速生成',
    '立即验证',
  ];

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const openLoginModal = () => setShowLoginModal(true);

  const heroRequirementHint = requirement.trim()
    ? '已输入需求，可直接进入生成流程。'
    : '可先点下方模板，快速填充示例需求。';

  const filledRequirement = Math.min(100, Math.round((requirement.length / 8000) * 100));

  const activeStepIndex = requirement.trim() ? 1 : 0;

  const heroPanelStatus = requirement.trim() ? 'Ready to generate' : 'Waiting for input';

  const heroPanelStatusTone = requirement.trim()
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  const navLinks = [
    { href: '#capabilities', label: '产品能力' },
    { href: '#solutions', label: '解决方案' },
    { href: '#demo', label: '在线演示' },
    { href: '#delivery', label: '技术交付' },
  ];

  const topMetrics = [
    { label: '需求响应', value: '更快' },
    { label: '方案验证', value: '更直接' },
    { label: '应用交付', value: '更完整' },
  ];

  const currentQuarter = 'Q2 交付模式';

  const sectionBadgeClass = 'text-sm font-semibold uppercase tracking-[0.18em] text-purple-700';

  const cardClass = 'rounded-3xl border border-gray-200 bg-white shadow-sm';

  const mutedCardClass = 'rounded-3xl border border-gray-200 bg-gray-50';

  const gradientOrbClass = 'pointer-events-none absolute rounded-full blur-3xl';

  const businessSignals = [
    '统一口径',
    '结构化输出',
    '工程可落地',
  ];

  const sectionIntroClass = 'mt-4 text-base leading-7 text-gray-600';

  const smallLabelClass = 'text-sm font-semibold uppercase tracking-[0.18em] text-purple-700';

  const primaryButtonClass = 'inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-95';

  const secondaryButtonClass = 'inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50';

  const templateButtonClass = 'inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition-colors hover:border-purple-300 hover:text-purple-700';

  const sectionWrapClass = 'mx-auto max-w-6xl';

  const titleClass = 'mt-3 text-3xl font-semibold text-gray-900 sm:text-4xl';

  const paragraphClass = 'text-sm leading-6 text-gray-600';

  const lightPanelClass = 'rounded-2xl border border-gray-100 bg-white';

  const subduedPanelClass = 'rounded-2xl border border-gray-200 bg-gray-50';

  const statusToneClass = requirement.trim() ? 'text-emerald-700' : 'text-amber-700';

  const statusDotClass = requirement.trim() ? 'bg-emerald-500' : 'bg-amber-500';

  const progressWidth = `${filledRequirement}%`;

  const showcaseRibbon = '精选案例';

  const heroChecklist = [
    '业务描述 → 结构化需求',
    '方案拆解 → 工程输出',
    '在线演示 → 快速验证',
  ];

  const stepStatusText = ['待输入', '已进入分析', '准备生成', '可继续优化'];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="relative overflow-hidden border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className={`${gradientOrbClass} left-8 top-0 h-32 w-32 bg-purple-100/70`} />
        <div className={`${gradientOrbClass} right-16 top-2 h-28 w-28 bg-blue-100/60`} />
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-sm">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">demo faster</div>
              <div className="text-xs text-gray-500">Faster product delivery for demo teams</div>
            </div>
          </div>
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-gray-600 hover:text-gray-900">{item.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={openLoginModal} className={`${secondaryButtonClass} px-4 py-2`}>
              登录
            </button>
          </div>
        </nav>
      </div>

      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 via-white to-white px-4 py-12 sm:px-6 sm:py-16">
        <div className={`${gradientOrbClass} left-[-80px] top-24 h-64 w-64 bg-purple-100/80`} />
        <div className={`${gradientOrbClass} right-[-40px] top-16 h-72 w-72 bg-violet-100/70`} />
        <div className={`${gradientOrbClass} bottom-0 left-1/3 h-60 w-60 bg-blue-50/80`} />

        <div className={`${sectionWrapClass} relative`}>
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-sm">{currentQuarter}</span>
            {businessSignals.map((item) => (
              <span key={item} className="rounded-full bg-gray-100 px-3 py-1.5">{item}</span>
            ))}
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                <Sparkles className="h-3.5 w-3.5" />
                面向企业场景的 AI 应用构建方式
              </div>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
                把业务需求
                <span className="block text-purple-700">直接转成可运行应用</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                从需求输入、方案拆解、架构生成到在线验证，demo faster 帮助团队更快完成内部系统、业务工具与原型应用的交付闭环。
              </p>

              <div className="mt-6 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="flex flex-wrap gap-3">
                  {trustItems.map((item) => (
                    <div key={item} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
                      <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      {item}
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {topMetrics.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</div>
                      <div className="mt-1 text-base font-semibold text-gray-900">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-medium text-gray-900">适用场景</div>
                  <div className="mt-1 text-sm leading-6 text-gray-600">企业内部系统、业务中台、原型验证、售前演示。</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-medium text-gray-900">核心价值</div>
                  <div className="mt-1 text-sm leading-6 text-gray-600">缩短从想法到可运行应用的交付时间。</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-medium text-gray-900">交付方式</div>
                  <div className="mt-1 text-sm leading-6 text-gray-600">结构化需求、生成工程、在线预览、持续迭代。</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">支持从一句话需求进入结构化流程</div>
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">支持生成后立即验证运行效果</div>
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">支持继续迭代，而不是一次性输出</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-3 py-1.5">需求输入</span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5">架构生成</span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5">代码交付</span>
                <span className="rounded-full bg-gray-100 px-3 py-1.5">在线验证</span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-medium text-gray-900">典型使用角色</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">业务负责人</span>
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">产品经理</span>
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">方案顾问</span>
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">开发团队</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-medium text-gray-900">典型产物</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">页面清单</span>
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">数据模型</span>
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">接口设计</span>
                    <span className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600">演示地址</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <Shield className="h-5 w-5 text-purple-600" />
                <div className="text-sm text-gray-600">首屏直接给出角色、产物、流程和输入入口，减少纯留白区。</div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button onClick={scrollToTop} className={`${primaryButtonClass} justify-center px-5 py-3`}>
                  <Wand2 className="h-4 w-4" />
                  查看首屏生成入口
                </button>
                <button onClick={openLoginModal} className={`${secondaryButtonClass} justify-center px-5 py-3`}>
                  进入工作台
                </button>
              </div>

              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">产品化提示</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">真实项目路径</div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">可继续迭代修改</div>
                  <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600">可用于内部评审</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-purple-100 bg-purple-50/60 p-4 text-sm text-purple-800">
                用 A+B 方向把 Hero 做成“产品入口 + 控制台预览 + 交付摘要”的组合，而不是单一宣传文案。
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">流程</div>
                  <div className="mt-2 text-sm text-gray-700">输入 → 拆解 → 生成 → 演示 → 迭代</div>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">结果</div>
                  <div className="mt-2 text-sm text-gray-700">不止原型，更偏向可运行的工程输出</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-medium text-gray-900">为什么更适合企业</div>
                <div className="mt-2 text-sm leading-6 text-gray-600">因为它把业务沟通、方案沉淀、工程输出和验证路径放到了同一个页面闭环里。</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                    立即体验：描述你的业务需求
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${heroPanelStatusTone}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} />
                    {heroPanelStatus}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  输入越完整，AI 给出的结构和生成结果越贴近实际交付。
                </p>
                <textarea
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="例如：我需要一个企业运营管理平台，包含组织架构、角色权限、审批流、数据统计和移动端查看能力。"
                  className="mt-5 h-48 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm leading-7 text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-purple-400 focus:bg-white"
                />
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-gray-500">{requirement.length}/8000</span>
                    <div className="mt-2 h-2 w-36 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all" style={{ width: progressWidth }} />
                    </div>
                  </div>
                  <button
                    onClick={handleStartCreate}
                    disabled={!requirement.trim()}
                    className={`${primaryButtonClass} px-5 py-3 disabled:opacity-40`}
                  >
                    <Rocket className="h-4 w-4" />
                    开始生成
                  </button>
                </div>
                <div className={`mt-3 text-sm ${statusToneClass}`}>{heroRequirementHint}</div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {templates.map((template) => (
                    <button key={template.label} onClick={() => setRequirement(template.text)} className={templateButtonClass}>
                      <template.icon className="h-3.5 w-3.5" />
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {quickPanels.map((item) => (
                      <div key={item.title} className={`rounded-2xl border p-4 ${item.tone}`}>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">{item.title}</div>
                        <div className="mt-2 text-sm font-medium">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[28px] border border-gray-200 bg-gray-900 p-5 text-white shadow-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">生成流程示意</div>
                        <div className="mt-1 text-xs text-gray-400">让业务、产品和开发共享同一视图</div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-300">Pipeline</div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {heroChecklist.map((item, index) => (
                        <div key={item} className={`rounded-2xl border px-4 py-3 ${index === activeStepIndex ? 'border-purple-400/40 bg-purple-500/10' : 'border-white/10 bg-white/5'}`}>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold ${index === activeStepIndex ? 'bg-purple-500 text-white' : 'bg-white/10 text-gray-300'}`}>0{index + 1}</div>
                              <div className="text-sm text-gray-100">{item}</div>
                            </div>
                            <div className="text-xs text-gray-400">{stepStatusText[index]}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-gray-900">预计输出内容</div>
                    <div className="mt-4 grid gap-2">
                      {sampleOutputs.map((item) => (
                        <div key={item} className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-purple-600" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="text-sm font-medium text-gray-900">协作价值</div>
                    <div className="mt-3 text-sm leading-6 text-gray-600">
                      更适合立项讨论、内部评审、试点验证和后续工程接管，而不只是展示一个静态界面。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-gray-50/70 px-4 py-5 sm:px-6">
        <div className={`${sectionWrapClass} flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600`}>
          <div className="font-medium text-gray-900">企业应用交付关注点</div>
          <div className="flex flex-wrap gap-2">
            {['需求清晰度', '方案一致性', '验证速度', '工程接管性'].map((item) => (
              <span key={item} className="rounded-full border border-gray-200 bg-white px-3 py-1.5">{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-6 sm:px-6 sm:py-8">
        <div className={`${sectionWrapClass} grid gap-4 lg:grid-cols-[1.25fr_0.75fr] lg:items-start`}>
          <BusinessStatsSection />
          <div className="grid gap-4">
            {trustItems.map((item, index) => (
              <div key={item} className={`${cardClass} p-5`}>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">0{index + 1}</div>
                <div className="mt-2 text-base font-semibold text-gray-900">{item}</div>
                <div className="mt-1 text-sm text-gray-600">让 landing page 不只讲功能，也讲交付秩序与业务可信度。</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-gray-50/60 px-4 py-4 sm:px-6">
        <div className={`${sectionWrapClass} flex flex-wrap gap-3`}>
          {showcaseHighlights.map((item) => (
            <div key={item} className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">{item}</div>
          ))}
        </div>
      </section>


      <section id="solutions" className="bg-gradient-to-b from-white to-gray-50 px-4 py-12 sm:px-6 sm:py-16">
        <div className={`${sectionWrapClass}`}>
          <div className="max-w-2xl">
            <div className={sectionBadgeClass}>解决方案结构</div>
            <h2 className={titleClass}>更适合企业推进的应用生成流程</h2>
            <p className={sectionIntroClass}>
              不再停留在概念展示，而是围绕需求梳理、架构生成、可运行交付与后续迭代来组织完整流程。
            </p>
          </div>
          <div className="mt-10">
            <SolutionPreview />
          </div>
        </div>
      </section>

      <section id="capabilities" className="bg-gray-50 px-4 py-12 sm:px-6 sm:py-16">
        <div className={`${sectionWrapClass}`}>
          <div className="text-center">
            <div className={sectionBadgeClass}>产品能力</div>
            <h2 className={titleClass}>围绕业务交付设计的核心能力</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
              保持企业官网式表达，突出从需求理解到应用落地的关键能力，而不是单纯展示炫技效果。
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((feature) => (
              <div key={feature.title} className={`${cardClass} p-6`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16">
        <div className={`${sectionWrapClass}`}>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className={sectionBadgeClass}>实施路径</div>
              <h2 className={titleClass}>从需求到上线前验证的四个阶段</h2>
            </div>
            <div className="hidden rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 md:block">
              每一步都面向交付，而不是只面向展示
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            {processSteps.map((step, index) => (
              <div key={step.title} className={`${cardClass} p-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-purple-700">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold text-gray-300">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{step.desc}</p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-purple-700">
                  查看下一步
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="bg-gray-50 px-4 py-12 sm:px-6 sm:py-16">
        <div className={`${sectionWrapClass}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className={sectionBadgeClass}>在线演示</div>
              <h2 className={titleClass}>直接体验 AI 生成的真实应用</h2>
              <p className={sectionIntroClass}>
                保留真实演示能力，但视觉改为更清晰的商务卡片表达，让案例展示更像解决方案输出而不是实验性质 demo。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {showcaseHighlights.map((item) => (
                <div key={item} className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">{item}</div>
              ))}
            </div>
          </div>
          <div className="mt-10">
            <ShowcaseSection />
          </div>
        </div>
      </section>

      <section id="delivery" className="px-4 py-12 sm:px-6 sm:py-16">
        <div className={`${sectionWrapClass} grid gap-8 lg:grid-cols-[0.95fr_1.05fr]`}>
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <div className={smallLabelClass}>技术底座</div>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">适配主流 Web 应用技术栈</h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              采用主流工程体系，便于后续接管、扩展与二次开发，也更适合企业内部落地。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {stackBenefits.map((item) => (
                <div key={item} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">{item}</div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {techStack.map((tech) => (
                <div key={tech.name} className={`${subduedPanelClass} p-4 text-center`}>
                  <div className="text-2xl">{tech.icon}</div>
                  <div className="mt-2 text-sm font-medium text-gray-900">{tech.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-gray-50 p-8">
            <div className={smallLabelClass}>交付内容</div>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900">不仅是页面，更是完整交付结果</h2>
            <div className="mt-6 grid gap-4">
              {deliverables.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4">
                  <Shield className="mt-0.5 h-5 w-5 text-purple-600" />
                  <div className="text-sm leading-6 text-gray-700">{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-purple-100 bg-gradient-to-r from-purple-50 via-white to-violet-50 p-8 sm:p-12">
          <div className="max-w-3xl">
            <div className={smallLabelClass}>立即开始</div>
            <h2 className="mt-3 text-3xl font-semibold text-gray-900 sm:text-4xl">把你的业务想法变成可运行应用</h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              保留即时体验作为首屏主动作，让 landing page 更像企业解决方案官网，同时仍然具备快速试用能力。
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {ctaBullets.map((item) => (
                <div key={item} className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-sm text-gray-600">{item}</div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={scrollToTop} className={`${primaryButtonClass} px-5 py-3`}>
                <Wand2 className="h-4 w-4" />
                立即体验
              </button>
              <button onClick={openLoginModal} className={`${secondaryButtonClass} px-5 py-3`}>
                登录进入工作台
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Factory className="h-4 w-4 text-purple-600" />
            demo faster
          </div>
          <div className="text-sm text-gray-500">© 2026 demo faster · Faster product delivery</div>
        </div>
      </footer>

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-[28px] border border-gray-200 bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowLoginModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">登录账号</h2>
            <p className="mt-2 text-sm text-gray-500">登录后可继续创建项目或进入工作台。</p>
            {pendingRequirement && (
              <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-700">
                登录后将自动继续当前需求创建流程。
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">账号</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-purple-400"
                  placeholder="输入账号"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-purple-400"
                  placeholder="输入密码"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 py-3 text-sm font-medium text-white shadow-sm disabled:opacity-50"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>处理中...</span></> : <span>登录</span>}
              </button>
            </form>
            <div className="mt-4 text-center text-xs text-gray-500">账号由管理员统一分配</div>
          </div>
        </div>
      )}
    </div>
  );
}
