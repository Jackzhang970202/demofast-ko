'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Factory,
  Plus,
  Folder,
  LogOut,
  Rocket,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  ShoppingCart,
  FileText,
  BarChart3,
  MessagesSquare,
  Pencil,
  Trash2,
  Check,
  X,
  Users,
} from 'lucide-react';
import { getAuthHeaders, getJsonAuthHeaders } from '@/lib/auth-client';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  phase: string;
  phaseLabel: string;
  phaseStep: number;
  phaseTotal: number;
  created_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

function WorkspaceContent() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [requirement, setRequirement] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 改名相关状态
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);


  // 检查登录状态
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/landing');
      return;
    }
    setUser(JSON.parse(userStr));
  }, [router]);

  // 用户变化时重新获取项目
  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  // 获取项目列表
  const fetchProjects = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/projects', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  // 开始新项目
  const handleStartProject = async () => {
    if (!requirement.trim()) {
      alert('请输入需求描述');
      return;
    }

    if (!user) {
      alert('请先登录');
      return;
    }

    setLoading(true);
    try {
      // 先创建项目，获取 projectId
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({
          name: requirement.substring(0, 50) + (requirement.length > 50 ? '...' : ''),
          description: requirement,
          requirement: requirement,
          status: 'clarifying',
        }),
      });
      const data = await res.json();

      if (data.code === 200 && data.data?.id) {
        const projectId = data.data.id;

        // 保存需求到 sessionStorage（作为备份）
        sessionStorage.setItem('requirement', requirement);
        sessionStorage.setItem('projectId', projectId);

        // 跳转到需求澄清页，URL 携带 projectId
        router.push(`/requirement?projectId=${projectId}`);
      } else {
        alert('创建项目失败，请重试');
      }
    } catch (err) {
      console.error('Failed to start project:', err);
      alert('创建项目失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 打开项目
  const handleOpenProject = (project: Project) => {
    router.push(`/ide?project=${project.id}`);
  };

  // 恢复项目
  const handleResumeProject = async (project: Project) => {
    try {
      const res = await fetch(`/api/project/resume?projectId=${project.id}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200) {
        router.push(data.data.redirect);
      } else {
        // 如果没有工作流状态，使用默认打开方式
        router.push(`/ide?project=${project.id}`);
      }
    } catch (err) {
      console.error('恢复项目失败:', err);
      router.push(`/ide?project=${project.id}`);
    }
  };

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/landing');
  };

  // 开始改名
  const handleStartRename = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  // 保存改名
  const handleSaveRename = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingProjectId || !editingName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ projectId: editingProjectId, name: editingName.trim() }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setProjects(prev => prev.map(p =>
          p.id === editingProjectId ? { ...p, name: editingName.trim() } : p
        ));
      }
    } catch (err) {
      console.error('改名失败:', err);
    } finally {
      setEditingProjectId(null);
      setEditingName('');
    }
  };

  // 取消改名
  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
    setEditingName('');
  };

  // 确认删除
  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deletingProjectId) return;

    try {
      const res = await fetch(`/api/projects?projectId=${deletingProjectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200) {
        setProjects(prev => prev.filter(p => p.id !== deletingProjectId));
      }
    } catch (err) {
      console.error('删除失败:', err);
    } finally {
      setDeletingProjectId(null);
    }
  };

  // 取消删除
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingProjectId(null);
  };


  const templates = [
    {
      icon: Package,
      label: '企业OA系统',
      text: `开发一个完整的企业办公自动化(OA)系统，所有功能必须真实可用：

【技术栈要求】
- 使用 Next.js 14 App Router + TypeScript + Tailwind CSS
- 数据存储：使用 lowdb JSON 文件存储，数据文件放在 data/oa.json
- 所有数据操作必须有真实的增删改查，不能用假数据

【登录注册页面】/login 和 /register
- 登录表单：邮箱、密码输入框，登录按钮，"记住我"复选框
- 注册表单：姓名、邮箱、密码、确认密码，注册按钮
- 默认管理员账号：admin@company.com / admin123，系统启动时自动创建
- 登录成功后跳转到首页，右上角显示用户头像和姓名，点击可退出登录

【首页仪表盘】/
- 左侧固定导航栏（200px宽）：Logo、首页、公告、请假、报销、任务、日程、设置
- 顶部显示：欢迎语 + 今日日期 + 待办事项数量
- 数据卡片（4个）：待审批数量、本月请假天数、进行中任务数、未读公告数
- 点击卡片可跳转到对应页面

【公告管理页面】/announcements
- 列表页：显示所有公告，支持分页（每页10条），标题、发布人、发布时间、状态（置顶/普通）
- 新增按钮：弹出模态框，输入标题（必填）、内容（富文本textarea）、是否置顶
- 编辑按钮：点击可修改公告内容
- 删除按钮：点击后确认删除
- 搜索框：按标题搜索公告

【请假申请页面】/leave
- 我的请假列表：显示所有请假记录，状态（待审批/已通过/已驳回）、请假类型（事假/病假/年假）、开始时间、结束时间、天数、原因
- 新增请假按钮：弹出表单，选择请假类型、开始日期、结束日期、请假原因，自动计算天数
- 提交后状态为"待审批"，管理员可在列表中审批通过或驳回，驳回需填写原因

【报销管理页面】/expense
- 报销列表：报销单号、报销类型（差旅/餐饮/交通/其他）、金额、状态、申请时间
- 新增报销：选择类型、输入金额、上传发票图片（存到 public/uploads）、填写说明
- 审批流程：待审批 -> 已通过/已驳回，通过后显示审批人和时间

【任务管理页面】/tasks
- 任务列表：任务名称、负责人、截止日期、优先级（高/中/低）、状态（待开始/进行中/已完成）
- 新增任务：输入任务名称、选择负责人（下拉选择用户）、设置截止日期、选择优先级、填写描述
- 任务操作：点击完成按钮改为已完成状态，点击编辑修改任务信息
- 筛选：按状态筛选任务，按负责人筛选

【日程安排页面】/schedule
- 日历视图：显示当月日历，有日程的日期显示小圆点
- 点击日期：显示当天日程列表，新增日程按钮
- 新增日程：输入标题、选择时间、选择提醒时间、填写备注
- 日程提醒：到达提醒时间时浏览器弹出通知

【个人设置页面】/settings
- 个人信息：显示头像（可上传更换）、姓名、邮箱、部门
- 修改密码：输入旧密码、新密码、确认新密码，提交修改
- 主题切换：深色/浅色模式切换按钮

【数据初始化】
- 首次启动时自动创建 admin@company.com 管理员账号
- 创建示例数据：3条公告、2个用户、3条请假记录、3条报销记录、5个任务

所有页面使用相同的布局模板，左侧导航栏固定，右侧内容区域自适应。所有表单必须有验证和错误提示。`
    },
    {
      icon: ShoppingCart,
      label: '完整电商商城',
      text: `开发一个完整的电商商城，前台+后台，所有功能真实可用：

【技术要求】
- Next.js 14 + TypeScript + Tailwind CSS
- 数据存储：lowdb JSON 文件，存到 data/shop.json
- 图片存储：public/uploads/products/ 目录
- 所有价格单位为元，保留2位小数

【前台商城】

首页 /
- 顶部导航栏：Logo、搜索框、购物车图标（显示数量）、用户头像（未登录显示登录按钮）
- 轮播图：3张轮播图，自动播放，可点击切换
- 商品分类导航：显示所有一级分类，点击跳转到分类商品列表
- 商品推荐：显示8个推荐商品，每个商品卡片：图片、名称、价格、加入购物车按钮
- 页脚：版权信息、联系方式

商品列表页 /products?category=xxx
- 左侧筛选栏：分类树（可展开）、价格区间筛选（滑动条）、排序选择（价格升序/降序/销量）
- 商品网格：每行4个商品，显示图片、名称、价格、销量、加入购物车按钮
- 分页：每页12个商品，上一页/下一页/页码
- 点击商品跳转到详情页

商品详情页 /product/[id]
- 左侧：商品图片轮播（点击可放大）、缩略图列表
- 右侧：商品名称、价格（原价划线）、销量、库存
- 规格选择：颜色按钮、尺码按钮，选中高亮
- 数量选择：加减按钮，数字输入框
- 加入购物车按钮、立即购买按钮
- 下方Tab：商品详情（富文本）、商品评价列表

购物车页 /cart
- 购物车列表：商品图片、名称、规格、单价、数量（可修改）、小计、删除按钮
- 全选复选框、批量删除
- 底部结算栏：已选数量、合计金额、去结算按钮
- 购物车数据存储在localStorage和数据库

结算页 /checkout
- 收货地址：选择已有地址或新增地址（姓名、电话、省市区、详细地址）
- 支付方式：微信支付、支付宝（模拟）
- 商品清单：显示要购买的商品列表
- 提交订单按钮：点击后生成订单，跳转到订单详情

订单详情页 /order/[id]
- 订单状态：待支付/待发货/待收货/已完成/已取消
- 订单信息：订单号、下单时间、收货地址
- 商品列表：商品图片、名称、规格、数量、价格
- 操作按钮：支付（模拟）、确认收货、取消订单

用户中心 /user
- 左侧菜单：我的订单、收货地址、个人资料
- 我的订单：全部订单、待支付、待发货、待收货四个Tab
- 收货地址管理：地址列表、新增/编辑/删除地址、设置默认地址
- 个人资料：修改昵称、头像、手机号

【后台管理】/admin

后台首页 /admin
- 数据卡片：今日订单数、今日销售额、待发货订单、商品总数
- 销售趋势图：最近7天销售额折线图
- 热销商品TOP5列表

商品管理 /admin/products
- 商品列表：图片、名称、分类、价格、库存、状态（上架/下架）、操作按钮
- 新增商品：商品名称、分类选择、价格、原价、库存、商品图片上传（支持多图）、商品详情富文本
- 编辑商品：修改所有信息
- 上架/下架：点击切换商品状态

分类管理 /admin/categories
- 分类列表：分类名称、排序、操作
- 新增分类：输入名称、选择父分类、排序
- 支持多级分类，树形展示

订单管理 /admin/orders
- 订单列表：订单号、用户、金额、状态、下单时间
- 操作：查看详情、发货（填写物流单号）
- 订单详情弹窗：显示完整订单信息

用户管理 /admin/users
- 用户列表：头像、昵称、邮箱、手机号、注册时间、状态
- 禁用/启用用户

【数据初始化】
- 默认管理员：admin@shop.com / admin123
- 创建5个商品分类、20个商品、3个测试用户、10个测试订单
- 商品图片使用占位图或网络图片URL`
    },
    {
      icon: FileText,
      label: '知识库Wiki',
      text: `开发一个企业知识库文档系统，类似语雀/Notion：

【技术要求】
- Next.js 14 + TypeScript + Tailwind CSS
- 数据存储：lowdb，data/wiki.json
- Markdown渲染：使用react-markdown
- 文档内容存储为Markdown格式

【核心功能】

文档列表页 /
- 左侧边栏（300px）：知识库切换、新建知识库按钮、文档树
- 文档树：可展开折叠，拖拽排序，右键菜单（新建子文档、重命名、删除）
- 右侧内容区：欢迎页，显示最近编辑的文档列表

文档编辑页 /doc/[id]
- 左侧文档树（可隐藏）
- 中间编辑区：Markdown编辑器，工具栏（标题、粗体、斜体、链接、图片、代码、表格）
- 右侧大纲：自动提取标题生成目录，点击跳转
- 自动保存：编辑停止3秒后自动保存
- 版本历史：点击可查看历史版本，选择恢复

文档搜索
- 全局搜索框：搜索文档标题和内容
- 搜索结果：显示匹配的文档片段，高亮关键词
- 按知识库筛选

知识库管理
- 知识库列表：名称、图标、文档数量、成员数量
- 新建知识库：输入名称、选择图标、设置权限（公开/私有）
- 知识库设置：修改名称、权限管理、成员管理

权限系统
- 公开知识库：所有人可查看
- 私有知识库：仅成员可查看
- 角色权限：管理员（全部权限）、编辑者（可编辑）、查看者（只读）
- 成员邀请：输入邮箱邀请成员

评论功能
- 文档底部评论区
- 输入评论、回复评论
- @用户提醒

收藏功能
- 收藏按钮：点击收藏文档
- 我的收藏列表：显示所有收藏的文档

【用户系统】
- 登录/注册页面
- 个人设置：头像、昵称、密码修改
- 个人主页：我创建的文档、我收藏的文档

【界面要求】
- 三栏布局，可调整宽度
- 深色/浅色主题切换
- 响应式设计，移动端隐藏左侧栏
- 快捷键支持：Ctrl+S保存、Ctrl+/搜索

【初始化数据】
- 默认管理员账号
- 2个知识库（产品文档、技术文档）
- 每个知识库5篇示例文档
- 文档内容包含标题、列表、代码块、表格等格式`
    },
    {
      icon: BarChart3,
      label: '销售数据分析',
      text: `开发一个销售数据分析仪表盘系统，所有图表真实展示数据：

【技术要求】
- Next.js 14 + TypeScript + Tailwind CSS
- 图表库：使用 recharts
- 数据存储：lowdb，data/sales.json
- 支持Excel导入导出

【数据模型】
- 订单数据：订单ID、客户名、商品、数量、金额、日期、销售员、地区
- 商品数据：商品ID、名称、分类、单价
- 客户数据：客户ID、名称、地区、等级

【仪表盘首页】/
- 顶部时间选择器：今日/本周/本月/本季/本年/自定义日期范围
- 核心指标卡片（4个，带趋势箭头）：
  - 销售额：¥xxx +12.5% ↑
  - 订单数：xxx单 +5.3% ↑
  - 客单价：¥xxx -2.1% ↓
  - 新客户数：xxx +8.9% ↑
- 卡片点击可查看详细数据

销售趋势图
- 折线图：显示选定时间范围内的销售额趋势
- X轴：日期，Y轴：金额
- 鼠标悬停显示具体数值
- 可切换：销售额/订单数

销售分布图
- 饼图：按商品分类显示销售占比
- 柱状图：按地区显示销售额对比
- 点击图表区域可筛选数据

排行榜
- 商品销量TOP10：商品名、销量、销售额
- 客户贡献TOP10：客户名、订单数、消费金额
- 销售员业绩TOP5：姓名、销售额、订单数

【数据管理页面】/data

订单管理
- 订单列表表格：可排序、可筛选
- 列：订单ID、客户、商品、金额、日期、销售员、地区
- 筛选：按日期范围、按地区、按销售员
- 搜索：按订单ID、客户名搜索
- 导出：导出筛选后的数据为Excel

数据导入
- 上传Excel文件
- 字段映射：选择Excel列对应系统字段
- 数据校验：显示导入结果和错误
- 确认导入

商品管理
- 商品列表：名称、分类、单价、总销量、总销售额
- 新增/编辑/删除商品

客户管理
- 客户列表：名称、地区、等级、总消费、订单数
- 客户详情：显示客户所有订单

【报表页面】/reports

预设报表
- 日报表：今日销售明细
- 周报表：本周每日销售额对比
- 月报表：本月各分类销售占比

自定义报表
- 选择维度：时间、地区、分类、销售员
- 选择指标：销售额、订单数、客单价、利润
- 选择图表类型：表格、折线图、柱状图、饼图
- 生成报表
- 保存报表模板

【设置页面】/settings

- 销售员管理：添加/编辑销售员，分配地区
- 地区管理：添加/编辑地区
- 分类管理：添加/编辑商品分类
- 数据字典：配置客户等级、订单状态等

【初始化数据】
- 50条订单记录（最近3个月）
- 10个商品（3个分类）
- 20个客户（3个地区）
- 5个销售员`
    },
    {
      icon: MessagesSquare,
      label: '团队协作工具',
      text: `开发一个团队协作沟通工具，类似Slack/飞书：

【技术要求】
- Next.js 14 + TypeScript + Tailwind CSS
- 实时通信：使用WebSocket或轮询（每3秒刷新）
- 数据存储：lowdb，data/team.json
- 文件上传：存储到 public/uploads/

【核心页面布局】
- 左侧边栏（260px）：工作区名称、频道列表、私信列表、应用图标
- 中间消息区：消息列表、输入框
- 右侧信息栏（可隐藏）：成员列表、共享文件、设置

【频道功能】

频道列表
- 显示所有频道，未读消息数量红点
- 频道分类： starred（收藏）、channels（公开频道）、direct messages（私信）
- 新建频道按钮：输入频道名称、选择公开/私有、邀请成员
- 频道设置：修改名称、添加成员、归档频道

消息发送
- 输入框：支持多行文本，Ctrl+Enter发送
- 工具栏：表情选择器、附件上传、@成员、代码块
- 消息类型：文本、图片、文件、代码
- 消息状态：发送中、已发送、发送失败

消息显示
- 消息气泡：头像、用户名、时间戳、消息内容
- 消息操作：反应表情（👍❤️😄）、回复、编辑、删除、置顶
- 新消息提示："有N条新消息"点击跳转
- 日期分隔线：显示消息日期

消息搜索
- 全局搜索框
- 搜索结果：显示匹配消息，点击跳转到消息位置
- 高级搜索：按频道、按发送人、按日期范围

【私信功能】
- 私信列表：显示最近联系人，未读数量
- 点击用户头像发起私信
- 私信界面与频道相同

【文件功能】
- 文件上传：拖拽或点击上传
- 文件预览：图片直接显示，其他文件显示图标和名称
- 文件列表：显示频道内的所有文件
- 文件下载：点击下载

【团队管理】/admin

成员管理
- 成员列表：头像、姓名、邮箱、角色、状态（在线/离线）
- 邀请成员：输入邮箱发送邀请（模拟）
- 角色设置：管理员/普通成员
- 移除成员

工作区设置
- 工作区名称、Logo
- 默认频道设置
- 消息保留策略

【其他功能】

待办事项
- 侧边栏待办入口
- 待办列表：任务、截止日期、状态
- 新增待办：输入任务、选择日期、分配给某人
- 完成/删除待办

消息通知
- 浏览器通知权限请求
- 新消息浏览器通知
- 通知设置：免打扰时间

【用户功能】
- 登录/注册
- 个人设置：头像、姓名、状态（在线/离开/忙碌/隐身）
- 通知偏好设置

【初始化数据】
- 默认工作区："我的团队"
- 3个公开频道：#全体公告 #闲聊 #技术讨论
- 5个测试用户
- 每个频道10条测试消息
- 消息包含文本、表情、代码等类型`
    },
  ];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#1a1a3a] to-[#0f0f2f] flex">
      {/* 左侧边栏 */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-16'
        } h-full bg-black/30 border-r border-white/10 transition-all duration-300 flex flex-col overflow-hidden`}
      >
        {/* 头部 */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Factory className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white font-heading">AI 开发工厂</span>
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5"
            >
              {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 新建项目按钮 */}
        <div className="p-4">
          <button
            onClick={() => {
              setCurrentProject(null);
              setRequirement('');
            }}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            {sidebarOpen && <span>新建项目</span>}
          </button>
        </div>

        {/* 项目列表 */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {sidebarOpen && (
            <h3 className="text-sm font-medium text-gray-400 mb-3">历史项目</h3>
          )}
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => editingProjectId !== project.id && handleResumeProject(project)}
                className={`w-full p-3 rounded-lg text-left transition-all cursor-pointer group relative ${
                  currentProject?.id === project.id
                    ? 'bg-purple-600/30 border border-purple-500/50'
                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
              >
                {sidebarOpen ? (
                  <>
                    {/* 项目名称（可编辑） */}
                    <div className="flex items-center justify-between">
                      {editingProjectId === project.id ? (
                        <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-2 py-1 bg-black/30 border border-purple-500/50 rounded text-white text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveRename}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-1 text-gray-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-white truncate flex-1">{project.name}</div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleStartRename(project, e)}
                              className="p-1 text-gray-400 hover:text-white"
                              title="重命名"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeletingProjectId(project.id); }}
                              className="p-1 text-gray-400 hover:text-red-400"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 项目 ID */}
                    <div className="text-xs text-gray-500 mt-1 font-mono">{project.id}</div>

                    {/* 进度条 */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`${
                          project.phase === 'COMPLETED' ? 'text-green-400' :
                          project.phaseStep > 0 ? 'text-purple-400' : 'text-gray-400'
                        }`}>
                          {project.phaseLabel}
                        </span>
                        <span className="text-gray-500">{project.phaseStep}/{project.phaseTotal}</span>
                      </div>
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            project.phase === 'COMPLETED' ? 'bg-green-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${(project.phaseStep / project.phaseTotal) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* 创建时间 */}
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(project.created_at || project.createdAt).toLocaleDateString('zh-CN')}
                    </div>

                    {/* 删除确认弹窗 */}
                    {deletingProjectId === project.id && (
                      <div
                        className="absolute inset-0 bg-black/80 rounded-lg flex flex-col items-center justify-center p-3"
                        onClick={e => e.stopPropagation()}
                      >
                        <p className="text-white text-sm mb-3 text-center">确定删除此项目？<br/>此操作不可恢复</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleConfirmDelete}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            确认删除
                          </button>
                          <button
                            onClick={handleCancelDelete}
                            className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-500"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-center">
                    <Folder className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
            {projects.length === 0 && sidebarOpen && (
              <div className="text-gray-500 text-sm text-center py-4">
                暂无历史项目
              </div>
            )}
          </div>
        </div>

        {/* 用户信息 - 固定在底部 */}
        {user && sidebarOpen && (
          <div className="p-4 border-t border-white/10 shrink-0">
            <div className="mb-3 flex items-center gap-3 p-2 rounded-lg bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {user.avatar || user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-medium text-white truncate">{user.name}</div>
                <div className="text-xs text-gray-400">{user.role === 'admin' ? '管理员' : '普通用户'}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2 hover:bg-white/5 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        )}
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col">
        {/* 顶部导航 */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6">
          <h1 className="text-xl font-bold text-white font-heading">
            {currentProject ? currentProject.name : '工作区'}
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/demo/workspace"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
            >
              <Factory className="w-5 h-5" />
              <span className="hidden sm:inline">进入 Demo</span>
            </Link>
            <Link
              href="/projects"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
            >
              <Folder className="w-5 h-5" />
              <span className="hidden sm:inline">项目管理</span>
            </Link>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-3xl">
            {/* 欢迎信息 */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4 font-heading">
                {currentProject ? '继续编辑' : '开始创建'}
              </h2>
              <p className="text-gray-400">
                用自然语言描述你的需求，AI 将为你生成完整的代码项目
              </p>
            </div>

            {/* 输入区域 */}
            <div className="glow-border-wrapper">
              <div className="glow-border-inner p-6">
                <textarea
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="描述你的需求，例如：&#10;&#10;我需要一个在线商城系统，包含：&#10;- 商品管理（增删改查）&#10;- 购物车功能&#10;- 订单管理&#10;- 用户登录注册&#10;&#10;描述越详细，生成的代码越精准..."
                  className="textarea h-64"
                />
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                  <span className="text-gray-500 text-sm">{requirement.length} / 8000</span>
                  <button
                    onClick={handleStartProject}
                    disabled={loading || !requirement.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>处理中...</span>
                      </>
                    ) : (
                      <>
                        <Rocket className="w-5 h-5" />
                        <span>开始创造</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 快捷提示 */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {templates.map((template) => (
                <button
                  key={template.label}
                  onClick={() => setRequirement(template.text)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-all text-sm cursor-pointer"
                >
                  <template.icon className="w-4 h-4" />
                  <span>{template.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a3a] to-[#0f0f2f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  );
}