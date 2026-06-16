# 模板B：全屏数据大屏

## 适用场景
数据可视化大屏、监控大屏、数据分析看板、指挥驾驶舱、实时数据展示等场景。

## 配色系统（蓝绿商务风）
- 主色 Primary: #0D9488（蓝绿色）
- 主色亮 Primary Light: #14B8A6
- 主色背景: rgba(13, 148, 136, 0.08)
- 强调色 Accent: #F59E0B（橙色，用于高亮）
- 危险色 Danger: #DC2626
- 页面背景: #F1F5F9
- 卡片背景: #FFFFFF
- 文字主色: #1E293B
- 次要文字: #64748B
- 边框: #E2E8F0
- 圆角: 8px

## 辅助配色（图表用）
- 青色系: #06B6D4
- 蓝色系: #3B82F6
- 紫色系: #8B5CF6
- 色板: ['#0D9488', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E']

## 整体布局结构
```
<div class="dashboard">                    <!-- display:flex; flex-direction:column; height:100vh; padding:16px 24px; gap:12px -->
  <header class="header">                  <!-- flex; justify-content:space-between; 顶部标题栏 -->
    <div class="header-left">              <!-- Logo图标 + 标题h1 + 副标题span -->
    <div class="header-right">             <!-- 实时时间显示（大字号主色）+ 日期 -->

  <section class="kpi-bar">               <!-- flex; gap:24px; 白色卡片+阴影 -->
    <div class="kpi-item">                <!-- 居中显示：大数值 + 标签 -->
      <span class="kpi-value">数值</span>  <!-- 32px 粗体 -->
      <span class="kpi-label">标签</span>  <!-- 12px 次要文字 -->
    <div class="kpi-divider">             <!-- 1px 竖分隔线 -->
    （5个KPI指标，用分隔线分开）

  <main class="content">                  <!-- flex:1; display:flex; flex-direction:column; gap:12px -->
    <div class="row row-1">               <!-- flex:0.85; 第一行图表 -->
      <div class="card">
        <div class="card-header">         <!-- 标题h3 + 标签badge -->
        <div class="card-body">           <!-- flex:1; ECharts图表容器 -->

    <div class="row row-2">               <!-- flex:1; 第二行，通常两个并排图表 -->
      <div class="card">...</div>
      <div class="card">...</div>

    <div class="row row-3">               <!-- flex:1; 第三行，通常两个并排图表 -->
      <div class="card">...</div>
      <div class="card">...</div>
```

## 各组件样式

### Header 顶部标题栏
- Logo: 40x40 圆角方形，渐变色背景（主色到主色亮），白色 SVG 图标
- 标题 h1: 20px 粗体
- 副标题: 12px 次要文字
- 时间: 24px 粗体主色，日期 12px 次要文字

### KPI 指标栏
- 白色背景卡片，圆角 8px，轻微阴影
- 内边距 14px 28px
- 每个指标: 垂直居中，数值 32px 粗体，标签 12px 次要文字
- 分隔线: 1px 宽，40px 高，边框色

### 图表卡片
- 白色背景，圆角 8px，轻微阴影
- 卡片头部: padding 12px 16px，底部 1px 边框，标题 14px 粗体
- 标签 badge: 11px 字号，主色背景圆角标签
- 图表体: flex:1，padding 8px，作为 ECharts 容器

### 行布局
- row-1: flex:0.85（通常一个全宽大图表）
- row-2: flex:1（通常两个 1:1 图表）
- row-3: flex:1（通常两个 1:1 图表）
- 行间距: 12px

## ECharts 图表集成模式

### 初始化
```typescript
import * as echarts from 'echarts';

function createChart(containerId: string) {
  const el = document.getElementById(containerId);
  if (!el) return null;
  return echarts.init(el);
}
```

### 数字滚动动画
```typescript
function animateNumber(elementId: string, target: number, decimals: number, unit?: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const duration = 1200;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const value = (target * ease).toFixed(decimals);
    el.innerHTML = unit ? value + '<span class="unit">' + unit + '</span>' : value;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

### 响应式缩放（基于 2560x1440 基准）
```typescript
// 在父容器上设置固定宽高，使用 CSS transform scale 适配不同屏幕
const BASE_W = 2560, BASE_H = 1440;
container.style.width = BASE_W + 'px';
container.style.height = BASE_H + 'px';
container.style.transformOrigin = '0 0';
function applyScale() {
  const scale = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H, 1);
  container.style.transform = 'scale(' + scale + ')';
  container.style.marginLeft = (window.innerWidth - BASE_W * scale) / 2 + 'px';
  container.style.marginTop = (window.innerHeight - BASE_H * scale) / 2 + 'px';
}
window.addEventListener('resize', applyScale);
applyScale();
```

### 常用图表配置模式
- **堆叠柱状图**: 多系列 stack 相同，圆角顶部，内部标签
- **环形图**: radius ['40%', '65%']，圆角 4px，外部标签带指示线，中心文字
- **折线图**: 面积渐变填充，圆点标记按值变色
- **纵向柱状图**: barMaxWidth 24px，分类颜色，顶部百分比标签
- **折线+柱状图组合**: 柱状图堆叠 + 折线图叠加在上方

### 图表通用配置
- tooltip: 触发 axis 或 item，formatter 返回 HTML
- legend: 10px 字号，次要文字颜色，图标 10x10
- grid: left 55, right 25, top 35, bottom 70（根据标签长度调整）
- xAxis: 10px 字号，长标签自动换行（每 5-6 字符换行）
- yAxis: splitLine 淡色虚线，name 10px 次要文字
- animationEasing: 'elasticOut'

## 滚动条样式
- 宽度 4px，轨道透明，滑块 #CBD5E1，圆角 2px

## 注意事项
- 大屏通常为固定尺寸 + CSS transform 缩放，不是响应式流式布局
- 所有百分比和率保留两位小数
- KPI 数值使用数字滚动动画增强视觉效果
- 图表容器需要有明确的高度，通常由 flex:1 分配
- 如果用户需求中的大屏风格与模板不同（如暗色大屏），以用户需求为准调整配色
