# 个人网站设计文档

> Max 的个人网站 — 展示自我介绍与小程序工具集

## 概述

使用 Next.js 16 + Tailwind CSS v4 构建的单页滚动个人网站，极简暗黑 + 玻璃态风格，展示 "Max的工具宝藏" 微信小程序的 10 个工具。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **样式**: Tailwind CSS v4
- **动画**: Framer Motion
- **粒子背景**: tsParticles
- **部署**: 待定

## 页面结构（单页滚动）

### 1. Hero 首屏

- **星空粒子背景**: 深空 #0a0a1a → #1a1a3e 渐变底色 + 白色粒子缓慢漂移
- **极光文字标题**: "MAX" 大标题，紫/青/绿渐变动画（`background-clip: text` + `background-size` 动画）
- **副标题**: "独立开发者 · 小程序创作者"
- **鼠标光点跟随**: 半透明紫色光晕跟随鼠标移动（`radial-gradient` + `requestAnimationFrame`）
- **向下滚动指示**: 简约箭头动画

### 2. 关于我

- **玻璃态卡片**: `backdrop-filter: blur(16px)` + 半透明背景 + 1px 边框
- **内容**: 简短自我介绍（2-3句话）+ 技能标签（微信小程序、JavaScript、云开发等）
- **滚动触发**: 元素从下方渐入上浮（`IntersectionObserver` + Framer Motion）

### 3. 工具展示

- **错落左右交替布局**: 奇数行卡片在左、描述在右；偶数行反之，形成视觉节奏
- **大卡片**: 200px 宽，42px 图标，圆角 20px，分类标签用颜色区分
- **3D 翻转**: 鼠标悬停时卡片沿 Y 轴旋转 180°，正面图标+名称，背面详细描述
- **响应式**: 桌面端错落布局，平板/手机端改为上下堆叠
- **工具列表**（按原始分类）:

| 分类 | 工具 | 图标 |
|------|------|------|
| 财务工具 | 个税计算器 | money |
| 财务工具 | 年终奖计算器 | wallet |
| 财务工具 | 汇率转换 | swap |
| 财务工具 | 数据洞察 | chart |
| 图片工具 | 照片隐私清除 | image |
| 生活工具 | 单位换算器 | swap |
| 生活工具 | 纪念日管家 | calendar |
| 生活工具 | iOS 快捷方式 | link |
| 生活工具 | 今天吃什么 | rice |
| 生活工具 | 跳绳计数器 | activity |

### 4. 联系方式

- **社交链接**: GitHub、微信、邮箱等图标按钮
- **玻璃态卡片**: 与整体风格统一
- **微信小程序码**: 可扫码体验小程序（可选）

## 色彩方案

```
背景:     #0a0a1a → #1a1a3e (线性渐变)
玻璃卡片: rgba(255,255,255,0.06) + backdrop-filter: blur(12-16px)
边框:     rgba(255,255,255,0.1)
极光文字: #8b5cf6 → #06b6d4 → #10b981 (紫→青→绿)
主文字:   #e2e8f0
副文字:   #94a3b8
强调色:   #8b5cf6 (紫色)
```

## 动效清单

| 动效 | 实现方式 | 触发条件 |
|------|---------|---------|
| 星空粒子 | tsParticles + Canvas | 页面加载 |
| 极光文字 | CSS `@keyframes` + `background-position` | 页面加载 |
| 鼠标光点 | `mousemove` + `requestAnimationFrame` | 鼠标移动 |
| 滚动渐入 | Framer Motion `whileInView` | 元素进入视口 |
| 3D 卡片翻转 | CSS `perspective` + `rotateY` + `transition` | 鼠标悬停 |
| 导航锚点 | CSS `scroll-behavior: smooth` | 点击导航 |

## 响应式断点

```
sm:  640px   (手机横屏)
md:  768px   (平板)
lg:  1024px  (小桌面)
xl:  1280px  (桌面)
```

## 性能优化策略

- **图片**: 使用 Next.js `<Image>` 组件，WebP/AVIF 格式
- **字体**: `next/font` 本地加载，避免 FOUT
- **粒子**: Canvas 渲染，`requestAnimationFrame` 节流，低端设备降级粒子数量
- **动画**: GPU 加速（`transform`/`opacity`），避免 layout thrashing
- **代码分割**: 动态导入非首屏组件
- **目标**: Lighthouse Performance 90+

## 文件结构

```
personal-site/
├── app/
│   ├── layout.tsx          # 根布局（字体、元数据）
│   ├── page.tsx            # 单页主页
│   └── globals.css         # 全局样式 + Tailwind 配置
├── components/
│   ├── Hero.tsx            # 首屏（粒子 + 极光标题）
│   ├── About.tsx           # 关于我
│   ├── Tools.tsx           # 工具展示网格
│   ├── ToolCard.tsx        # 3D 翻转卡片
│   ├── Contact.tsx         # 联系方式
│   ├── Navbar.tsx          # 导航栏
│   ├── StarField.tsx       # 星空粒子
│   ├── AuroraText.tsx      # 极光文字
│   └── CursorGlow.tsx      # 鼠标光点跟随
├── public/
│   └── qrcode.png          # 小程序码（可选）
├── tailwind.config.ts
├── next.config.ts
└── package.json
```
