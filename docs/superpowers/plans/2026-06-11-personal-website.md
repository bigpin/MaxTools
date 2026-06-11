# 个人网站实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Max 的个人网站 — 单页滚动，极简暗黑+玻璃态风格，展示自我介绍和 10 个小程序工具。

**Architecture:** Next.js 16 App Router 单页应用，4 个区块（Hero/About/Tools/Contact）通过锚点导航。粒子背景用 Canvas 独立渲染层，动画用 Framer Motion，样式用 Tailwind CSS v4。

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Framer Motion, @tsparticles/react

---

## 文件结构

```
personal-site/
├── app/
│   ├── layout.tsx              # 根布局：字体、元数据、body 样式
│   ├── page.tsx                # 单页主页：组装 4 个区块
│   └── globals.css             # Tailwind 导入 + 自定义动画 keyframes
├── components/
│   ├── Navbar.tsx              # 顶部导航栏（锚点链接）
│   ├── Hero.tsx                # 首屏：粒子 + 极光标题 + 副标题 + 光标
│   ├── About.tsx               # 关于我：玻璃卡片 + 技能标签
│   ├── Tools.tsx               # 工具展示：错落布局容器
│   ├── ToolCard.tsx            # 单个工具：3D 翻转卡片
│   ├── Contact.tsx             # 联系方式：社交图标
│   ├── StarField.tsx           # 星空粒子 Canvas
│   ├── AuroraText.tsx          # 极光渐变文字
│   └── CursorGlow.tsx          # 鼠标光点跟随
├── data/
│   └── tools.ts                # 工具数据定义
├── next.config.ts
├── package.json
├── tsconfig.json
└── postcss.config.mjs
```

---

### Task 1: 项目初始化

**Files:**
- Create: `personal-site/package.json`
- Create: `personal-site/next.config.ts`
- Create: `personal-site/tsconfig.json`
- Create: `personal-site/postcss.config.mjs`
- Create: `personal-site/app/layout.tsx`
- Create: `personal-site/app/page.tsx`
- Create: `personal-site/app/globals.css`

- [ ] **Step 1: 创建项目目录并初始化**

```bash
mkdir -p personal-site
cd personal-site
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "max-personal-site",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^12.0.0",
    "@tsparticles/react": "^3.0.0",
    "@tsparticles/slim": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

- [ ] **Step 3: 创建 next.config.ts**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig
```

- [ ] **Step 4: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: 创建 postcss.config.mjs**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}

export default config
```

- [ ] **Step 6: 创建 app/globals.css**

```css
@import "tailwindcss";

@theme {
  --color-deep: #0a0a1a;
  --color-deep-light: #1a1a3e;
  --color-glass: rgba(255, 255, 255, 0.06);
  --color-glass-border: rgba(255, 255, 255, 0.1);
  --color-aurora-purple: #8b5cf6;
  --color-aurora-cyan: #06b6d4;
  --color-aurora-green: #10b981;
  --color-text-primary: #e2e8f0;
  --color-text-secondary: #94a3b8;
}

html {
  scroll-behavior: smooth;
}

body {
  background: linear-gradient(135deg, var(--color-deep), var(--color-deep-light));
  color: var(--color-text-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

/* Aurora text animation */
@keyframes aurora {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-aurora {
  background: linear-gradient(90deg, #8b5cf6, #06b6d4, #10b981, #8b5cf6);
  background-size: 300% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: aurora 4s ease-in-out infinite;
}

/* Scroll indicator bounce */
@keyframes bounce-down {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}

.animate-bounce-down {
  animation: bounce-down 2s ease-in-out infinite;
}

/* 3D flip card */
.flip-card {
  perspective: 1000px;
}

.flip-card-inner {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.flip-card:hover .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front,
.flip-card-back {
  backface-visibility: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}
```

- [ ] **Step 7: 创建 app/layout.tsx 骨架**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Max — 独立开发者',
  description: 'Max 的个人网站，展示微信小程序工具集',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 8: 创建 app/page.tsx 骨架**

```tsx
export default function Home() {
  return (
    <main>
      <h1 className="text-4xl text-center py-20">MAX</h1>
    </main>
  )
}
```

- [ ] **Step 9: 安装依赖并验证启动**

```bash
cd personal-site && npm install && npm run dev
```

Expected: 开发服务器启动在 http://localhost:3000，页面显示 "MAX"

- [ ] **Step 10: 提交**

```bash
git init && git add -A && git commit -m "feat: initialize Next.js 16 + Tailwind CSS v4 project"
```

---

### Task 2: 星空粒子背景 (StarField)

**Files:**
- Create: `personal-site/components/StarField.tsx`

- [ ] **Step 1: 安装 tsparticles 依赖**

```bash
cd personal-site && npm install @tsparticles/react @tsparticles/slim
```

- [ ] **Step 2: 创建 StarField.tsx**

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { ISourceOptions } from '@tsparticles/engine'

export default function StarField() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  const options: ISourceOptions = useMemo(() => ({
    fullScreen: false,
    fpsLimit: 60,
    particles: {
      number: { value: 80, density: { enable: true, width: 1920, height: 1080 } },
      color: { value: ['#ffffff', '#c4b5fd', '#67e8f9'] },
      opacity: { value: { min: 0.2, max: 0.8 } },
      size: { value: { min: 1, max: 2.5 } },
      move: {
        enable: true,
        speed: 0.3,
        direction: 'none',
        outModes: 'out',
      },
    },
    detectRetina: true,
  }), [])

  if (!ready) return null

  return (
    <Particles
      id="starfield"
      options={options}
      className="absolute inset-0"
    />
  )
}
```

- [ ] **Step 3: 验证粒子渲染**

将 StarField 临时加入 page.tsx 查看效果：

```tsx
import StarField from '@/components/StarField'

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <StarField />
      <h1 className="text-4xl text-center py-20 relative z-10">MAX</h1>
    </main>
  )
}
```

Run: `npm run dev`，打开浏览器确认粒子在深色背景上漂移

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add starfield particle background"
```

---

### Task 3: 极光文字 + 鼠标光点 (AuroraText, CursorGlow)

**Files:**
- Create: `personal-site/components/AuroraText.tsx`
- Create: `personal-site/components/CursorGlow.tsx`

- [ ] **Step 1: 创建 AuroraText.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'

interface AuroraTextProps {
  text: string
  className?: string
}

export default function AuroraText({ text, className = '' }: AuroraTextProps) {
  return (
    <motion.h1
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`animate-aurora font-black tracking-tight ${className}`}
    >
      {text}
    </motion.h1>
  )
}
```

- [ ] **Step 2: 创建 CursorGlow.tsx**

```tsx
'use client'

import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const glow = glowRef.current
    if (!glow) return

    let animId: number
    let targetX = 0
    let targetY = 0
    let currentX = 0
    let currentY = 0

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }

    const animate = () => {
      currentX += (targetX - currentX) * 0.08
      currentY += (targetY - currentY) * 0.08
      glow.style.transform = `translate(${currentX - 100}px, ${currentY - 100}px)`
      animId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove)
    animId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(animId)
    }
  }, [])

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed top-0 left-0 w-[200px] h-[200px] rounded-full z-50 opacity-30"
      style={{
        background: 'radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)',
      }}
    />
  )
}
```

- [ ] **Step 3: 验证效果**

在 page.tsx 中引入两个组件，确认极光文字动画和鼠标光点跟随正常工作。

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add aurora text and cursor glow effects"
```

---

### Task 4: Hero 首屏

**Files:**
- Create: `personal-site/components/Hero.tsx`
- Modify: `personal-site/app/page.tsx`

- [ ] **Step 1: 创建 Hero.tsx**

```tsx
'use client'

import StarField from './StarField'
import AuroraText from './AuroraText'
import { motion } from 'framer-motion'

const skills = ['微信小程序', 'JavaScript', '云开发', 'React']

export default function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <StarField />

      <div className="relative z-10 text-center px-6">
        <AuroraText text="MAX" className="text-7xl md:text-9xl" />

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-text-secondary text-base md:text-lg tracking-[0.3em] mt-6"
        >
          独立开发者 · 小程序创作者
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-3 mt-10"
        >
          {skills.map((skill) => (
            <span
              key={skill}
              className="px-4 py-1.5 rounded-full text-xs border bg-aurora-purple/10 border-aurora-purple/30 text-aurora-purple"
            >
              {skill}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-10 z-10"
      >
        <a href="#about" className="text-text-secondary animate-bounce-down block">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </a>
      </motion.div>
    </section>
  )
}
```

- [ ] **Step 2: 更新 page.tsx**

```tsx
import Hero from '@/components/Hero'

export default function Home() {
  return (
    <main>
      <Hero />
    </main>
  )
}
```

- [ ] **Step 3: 验证**

Run: `npm run dev`，确认星空粒子 + 极光标题 + 技能标签 + 滚动箭头全部正常

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add Hero section with starfield, aurora title, and scroll indicator"
```

---

### Task 5: 关于我 (About)

**Files:**
- Create: `personal-site/components/About.tsx`

- [ ] **Step 1: 创建 About.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'

export default function About() {
  return (
    <section id="about" className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto"
      >
        <div className="glass-card rounded-2xl p-8 md:p-10">
          <h2 className="text-xl font-semibold mb-6 text-text-primary">关于我</h2>
          <p className="text-text-secondary text-sm md:text-base leading-relaxed">
            热衷于用技术解决日常问题。专注于微信小程序开发，打造实用、好用的工具类应用。相信小而美的产品也能带来大价值。
          </p>
        </div>
      </motion.div>
    </section>
  )
}
```

- [ ] **Step 2: 在 globals.css 中添加 glass-card 工具类**

在 globals.css 末尾追加：

```css
.glass-card {
  background: var(--color-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-glass-border);
}
```

- [ ] **Step 3: 在 page.tsx 中添加 About**

```tsx
import Hero from '@/components/Hero'
import About from '@/components/About'

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
    </main>
  )
}
```

- [ ] **Step 4: 验证滚动渐入效果**

Run: `npm run dev`，滚动到 About 区域确认从下方渐入上浮

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add About section with glass card and scroll animation"
```

---

### Task 6: 工具数据 + 3D 翻转卡片 (ToolCard)

**Files:**
- Create: `personal-site/data/tools.ts`
- Create: `personal-site/components/ToolCard.tsx`

- [ ] **Step 1: 创建 data/tools.ts**

```ts
export interface Tool {
  id: string
  name: string
  icon: string
  category: 'finance' | 'image' | 'life'
  description: string
}

export const CATEGORY_COLORS: Record<string, string> = {
  finance: 'text-aurora-purple',
  image: 'text-aurora-cyan',
  life: 'text-aurora-green',
}

export const CATEGORY_NAMES: Record<string, string> = {
  finance: '财务工具',
  image: '图片工具',
  life: '生活工具',
}

export const tools: Tool[] = [
  { id: 'tax-calculator', name: '个税计算器', icon: '💰', category: 'finance', description: '计算个人所得税，支持多个月份累计计算' },
  { id: 'pension-calculator', name: '年终奖计算器', icon: '👛', category: 'finance', description: '计算年终奖缴税金额' },
  { id: 'currency-exchange', name: '汇率转换', icon: '💱', category: 'finance', description: '实时查询和转换多种货币汇率' },
  { id: 'data-insights', name: '数据洞察', icon: '📊', category: 'finance', description: '多维数据分析与趋势洞察' },
  { id: 'photo-privacy', name: '照片隐私清除', icon: '🖼️', category: 'image', description: '去除照片中的位置、时间等隐私信息' },
  { id: 'unit-converter', name: '单位换算器', icon: '📐', category: 'life', description: '支持长度、面积、体积、重量等常用单位互转' },
  { id: 'anniversary', name: '纪念日管家', icon: '📅', category: 'life', description: '记录重要日期，自动计算倒计时，支持提醒' },
  { id: 'shortcuts', name: 'iOS 快捷方式', icon: '🔗', category: 'life', description: '收藏与打开 iOS 快捷方式，支持搜索' },
  { id: 'food-picker', name: '今天吃什么', icon: '🍚', category: 'life', description: '选择困难症救星！随机帮你决定吃什么' },
  { id: 'jump-rope', name: '跳绳计数器', icon: '🪢', category: 'life', description: '基于人体姿态估计的智能跳绳计数' },
]
```

- [ ] **Step 2: 创建 ToolCard.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'
import { Tool, CATEGORY_COLORS, CATEGORY_NAMES } from '@/data/tools'

interface ToolCardProps {
  tool: Tool
  index: number
}

export default function ToolCard({ tool, index }: ToolCardProps) {
  const isEven = index % 2 === 1

  const card = (
    <div className="flip-card w-[200px] h-[180px] flex-shrink-0">
      <div className="flip-card-inner relative w-full h-full">
        {/* Front */}
        <div className="flip-card-front absolute inset-0 glass-card rounded-[20px] flex flex-col items-center justify-center p-5">
          <span className="text-[42px] mb-3">{tool.icon}</span>
          <span className="text-text-primary text-base font-semibold">{tool.name}</span>
          <span className={`text-[11px] mt-1.5 ${CATEGORY_COLORS[tool.category]}`}>
            {CATEGORY_NAMES[tool.category]}
          </span>
        </div>
        {/* Back */}
        <div className="flip-card-back absolute inset-0 glass-card rounded-[20px] flex flex-col items-center justify-center p-5">
          <p className="text-text-secondary text-sm text-center leading-relaxed">
            {tool.description}
          </p>
        </div>
      </div>
    </div>
  )

  const description = (
    <motion.p
      initial={{ opacity: 0, x: isEven ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="text-text-secondary text-sm md:text-base leading-relaxed flex-1"
    >
      {tool.description}
    </motion.p>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5 }}
      className={`flex items-center gap-7 max-w-[680px] mx-auto mb-8 ${
        isEven ? 'flex-row-reverse' : ''
      }`}
    >
      {card}
      <div className={`flex-1 ${isEven ? 'text-right' : ''}`}>{description}</div>
    </motion.div>
  )
}
```

- [ ] **Step 3: 验证翻转效果**

临时在 page.tsx 中引入 ToolCard 测试：

```tsx
import ToolCard from '@/components/ToolCard'
import { tools } from '@/data/tools'

// 在 main 中加入：
<ToolCard tool={tools[0]} index={0} />
```

Run: `npm run dev`，悬停卡片确认 3D 翻转正常

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add tool data and 3D flip card component"
```

---

### Task 7: 工具展示区 (Tools)

**Files:**
- Create: `personal-site/components/Tools.tsx`

- [ ] **Step 1: 创建 Tools.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'
import ToolCard from './ToolCard'
import { tools } from '@/data/tools'

export default function Tools() {
  return (
    <section id="tools" className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <span className="text-text-secondary text-xs tracking-[0.3em] uppercase">工具集</span>
      </motion.div>

      {/* Desktop: staggered layout */}
      <div className="hidden md:block">
        {tools.map((tool, i) => (
          <ToolCard key={tool.id} tool={tool} index={i} />
        ))}
      </div>

      {/* Mobile: stacked layout */}
      <div className="md:hidden flex flex-col items-center gap-6">
        {tools.map((tool) => (
          <div key={tool.id} className="flip-card w-[200px] h-[180px]">
            <div className="flip-card-inner relative w-full h-full">
              <div className="flip-card-front absolute inset-0 glass-card rounded-[20px] flex flex-col items-center justify-center p-5">
                <span className="text-[42px] mb-3">{tool.icon}</span>
                <span className="text-text-primary text-base font-semibold">{tool.name}</span>
              </div>
              <div className="flip-card-back absolute inset-0 glass-card rounded-[20px] flex flex-col items-center justify-center p-5">
                <p className="text-text-secondary text-sm text-center leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 在 page.tsx 中添加 Tools**

```tsx
import Hero from '@/components/Hero'
import About from '@/components/About'
import Tools from '@/components/Tools'

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Tools />
    </main>
  )
}
```

- [ ] **Step 3: 验证错落布局**

Run: `npm run dev`，确认桌面端左右交替、手机端上下堆叠

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add Tools section with staggered layout"
```

---

### Task 8: 联系方式 (Contact)

**Files:**
- Create: `personal-site/components/Contact.tsx`

- [ ] **Step 1: 创建 Contact.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'

const links = [
  { label: 'GitHub', href: 'https://github.com', icon: 'GH' },
  { label: '微信', href: '#', icon: 'WX' },
  { label: '邮箱', href: 'mailto:max@example.com', icon: '✉' },
]

export default function Contact() {
  return (
    <section id="contact" className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="max-w-md mx-auto"
      >
        <div className="glass-card rounded-2xl p-8 text-center">
          <span className="text-text-secondary text-xs tracking-[0.3em] uppercase">Contact</span>

          <div className="flex justify-center gap-5 mt-8">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-text-secondary hover:text-aurora-purple hover:border-aurora-purple/30 transition-colors"
                title={link.label}
              >
                <span className="text-sm font-medium">{link.icon}</span>
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
```

- [ ] **Step 2: 在 page.tsx 中添加 Contact**

```tsx
import Hero from '@/components/Hero'
import About from '@/components/About'
import Tools from '@/components/Tools'
import Contact from '@/components/Contact'

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <Tools />
      <Contact />
    </main>
  )
}
```

- [ ] **Step 3: 验证**

Run: `npm run dev`，确认联系方式区域显示正常，社交图标可点击

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add Contact section with social links"
```

---

### Task 9: 导航栏 (Navbar)

**Files:**
- Create: `personal-site/components/Navbar.tsx`
- Modify: `personal-site/app/page.tsx`

- [ ] **Step 1: 创建 Navbar.tsx**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const navItems = [
  { label: '关于', href: '#about' },
  { label: '工具', href: '#tools' },
  { label: '联系', href: '#contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'glass-card' : ''
      }`}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <a href="#home" className="text-lg font-bold animate-aurora">MAX</a>
        <div className="flex gap-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-text-secondary text-sm hover:text-text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </motion.nav>
  )
}
```

- [ ] **Step 2: 在 page.tsx 中添加 Navbar 和 Footer**

```tsx
import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import About from '@/components/About'
import Tools from '@/components/Tools'
import Contact from '@/components/Contact'
import CursorGlow from '@/components/CursorGlow'

export default function Home() {
  return (
    <>
      <CursorGlow />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Tools />
        <Contact />
      </main>
      <footer className="text-center py-6 text-[#475569] text-xs border-t border-white/5">
        © 2026 Max · Built with Next.js & Tailwind CSS
      </footer>
    </>
  )
}
```

- [ ] **Step 3: 验证导航栏**

Run: `npm run dev`，确认导航栏在滚动后出现玻璃背景，锚点跳转平滑

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add Navbar with scroll-aware glass effect"
```

---

### Task 10: 响应式 + 性能优化 + 最终调整

**Files:**
- Modify: `personal-site/app/layout.tsx`
- Modify: `personal-site/components/StarField.tsx`

- [ ] **Step 1: 添加字体优化**

更新 app/layout.tsx，使用 next/font 加载系统字体：

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Max — 独立开发者',
  description: 'Max 的个人网站，展示微信小程序工具集',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className="antialiased">
      <body className="bg-[#0a0a1a] text-[#e2e8f0] min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: 低端设备粒子降级**

更新 StarField.tsx，根据设备性能调整粒子数量：

```tsx
// 在 options 中添加：
particles: {
  number: {
    value: typeof window !== 'undefined' && window.navigator.hardwareConcurrency > 4 ? 80 : 40,
    // ...
  },
}
```

- [ ] **Step 3: 全面响应式测试**

Run: `npm run dev`，在浏览器中测试以下断点：
- 375px（手机）
- 768px（平板）
- 1024px（小桌面）
- 1280px（桌面）

确认所有区域在各断点下布局正确

- [ ] **Step 4: 构建验证**

```bash
cd personal-site && npm run build
```

Expected: 构建成功，无错误

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: responsive optimization and final polish"
```

---

### Task 11: 构建验证 + 最终检查

- [ ] **Step 1: 完整功能检查清单**

在浏览器中逐项验证：
- [ ] 星空粒子背景正常渲染
- [ ] 极光文字动画循环
- [ ] 鼠标光点跟随
- [ ] 导航栏滚动后出现玻璃背景
- [ ] 关于我卡片渐入上浮
- [ ] 10 个工具卡片错落布局
- [ ] 工具卡片悬停 3D 翻转
- [ ] 联系方式图标可点击
- [ ] 手机端布局正常
- [ ] 锚点导航平滑滚动

- [ ] **Step 2: 最终提交**

```bash
git add -A && git commit -m "feat: personal website complete"
```
