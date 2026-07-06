# 微信小程序跳绳计数器设计文档

> 创建时间：2026-06-09
> 状态：设计完成，待实现

## 一、项目概述

### 1.1 项目目标

开发一个纯前端微信小程序跳绳计数器，基于人体姿态估计实现，所有计算和数据存储都在用户手机本地完成，无需任何后端服务器。

### 1.2 核心功能

1. **核心计数功能**：使用前置摄像头实时检测人体姿态，通过周期性运动计算跳绳次数
2. **运动数据统计**：精确计时、实时卡路里计算、体重设置
3. **语音播报功能**：开始/暂停/结束播报、每20次播报、结束时完整播报
4. **打卡与历史记录**：自动保存、按日期倒序显示、最多100条记录
5. **数据导出与导入**：JSON格式导出、自动去重导入
6. **辅助功能**：清空记录、权限请求、屏幕常亮

## 二、技术架构

### 2.1 技术选型

- **前端框架**：微信小程序原生框架
- **摄像头**：微信原生camera组件
- **人体检测**：微信 VisionKit Body 人体关键点检测
- **运动分析**：基于人体关键点的周期性运动分析
- **数据存储**：wx.setStorageSync
- **语音播报**：振动 + Toast 提示（无需插件）
- **文件操作**：wx.getFileSystemManager

### 2.2 架构图

```
┌─────────────────────────────────────────┐
│            微信小程序框架                │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Camera  │  │VisionKit│  │  Voice  │ │
│  │ 组件    │  │ Body    │  │  播报   │ │
│  └────┬────┘  └────┬────┘  └────┬────┘ │
│       │            │            │       │
│  ┌────▼────────────▼────────────▼────┐  │
│  │        核心计数引擎               │  │
│  │  - 人体关键点检测                 │  │
│  │  - 周期性运动分析                 │  │
│  │  - 跳绳次数计算                   │  │
│  └──────────────┬────────────────────┘  │
│                 │                        │
│  ┌──────────────▼────────────────────┐  │
│  │        数据管理层                 │  │
│  │  - wx.setStorageSync              │  │
│  │  - JSON导出/导入                  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 2.3 文件结构

```
pages/tools/jump-rope/
├── index.js          # 主页面逻辑
├── index.json        # 页面配置
├── index.wxml        # 页面模板
├── index.wxss        # 页面样式
├── history/
│   ├── index.js      # 历史记录页面
│   ├── index.json
│   ├── index.wxml
│   └── index.wxss
└── utils/
    ├── detector.js   # 运动检测算法
    ├── counter.js    # 跳绳计数逻辑
    ├── storage.js    # 数据存储管理
    └── voice.js      # 语音播报
```

## 三、核心算法设计

### 3.1 人体关键点检测（使用 VisionKit Body）

```javascript
// 初始化 VisionKit Body 会话
function initVisionKit() {
    return wx.createVKSession({
        track: {
            body: {
                mode: 2  // 跟踪模式，提供连续的关键点数据
            }
        }
    });
}

// 获取人体关键点
function getBodyKeypoints(vkSession) {
    // VisionKit Body 提供的关键点包括：
    // - 鼻子 (nose)
    // - 左右肩 (leftShoulder, rightShoulder)
    // - 左右手腕 (leftWrist, rightWrist)
    // - 左右肘 (leftElbow, rightElbow)
    // - 左右髋 (leftHip, rightHip)
    // - 左右膝 (leftKnee, rightKnee)
    // - 左右脚踝 (leftAnkle, rightAnkle)
    return vkSession.detectBody();
}
```

### 3.2 运动分析算法

```javascript
// 基于人体关键点的运动分析
function analyzeMotion(keypointsHistory) {
    // 1. 提取关键点位置：鼻子、左右手腕
    // 2. 计算关键点的Y轴坐标变化
    // 3. 检测手腕的周期性上下运动
    // 4. 结合鼻子位置变化验证跳跃动作
    // 5. 返回运动强度和跳跃状态
}

// 检测跳跃动作
function detectJump(keypoints) {
    // 跳绳特征：
    // - 手腕在身体两侧做圆周运动
    // - 身体（鼻子）做周期性上下运动
    // - 手腕和鼻子的运动存在相位差
}
```

### 3.2 跳绳计数逻辑（counter.js）

```javascript
class JumpCounter {
    constructor() {
        this.count = 0;
        this.state = 'idle'; // idle, jumping, paused
        this.lastJumpTime = 0;
        this.noseHistory = [];
        this.wristHistory = [];
    }

    // 更新计数（基于 VisionKit Body 关键点）
    update(keypoints) {
        if (this.state !== 'jumping') return;

        // 1. 提取关键点位置
        const noseY = keypoints.nose.y;
        const leftWristY = keypoints.leftWrist.y;
        const rightWristY = keypoints.rightWrist.y;

        // 2. 记录历史数据
        this.noseHistory.push(noseY);
        this.wristHistory.push({
            left: leftWristY,
            right: rightWristY
        });

        // 3. 保持历史窗口大小
        if (this.noseHistory.length > 10) {
            this.noseHistory.shift();
            this.wristHistory.shift();
        }

        // 4. 检测跳跃动作
        const isJump = this.detectJump();

        // 5. 验证时间间隔（防止快速重复计数）
        const timeSinceLastJump = Date.now() - this.lastJumpTime;
        const isValidInterval = timeSinceLastJump > 300; // 最小间隔300ms

        if (isJump && isValidInterval) {
            this.count++;
            this.lastJumpTime = Date.now();
            return true; // 返回true表示计数增加
        }
        return false;
    }

    // 检测跳跃动作
    detectJump() {
        if (this.noseHistory.length < 5) return false;

        // 检测鼻子Y坐标的变化（跳跃时身体上下运动）
        const recentNose = this.noseHistory.slice(-5);
        const noseDiff = Math.max(...recentNose) - Math.min(...recentNose);

        // 检测手腕Y坐标的变化（跳绳时手腕做圆周运动）
        const recentWrists = this.wristHistory.slice(-5);
        const leftWristDiff = Math.max(...recentWrists.map(w => w.left)) -
                             Math.min(...recentWrists.map(w => w.left));
        const rightWristDiff = Math.max(...recentWrists.map(w => w.right)) -
                              Math.min(...recentWrists.map(w => w.right));

        // 跳跃判定条件：
        // 1. 鼻子有明显的上下运动（身体跳跃）
        // 2. 手腕有明显的上下运动（甩绳）
        // 3. 运动幅度在合理范围内
        const noseThreshold = 20;  // 鼻子运动阈值（像素）
        const wristThreshold = 30; // 手腕运动阈值（像素）

        return noseDiff > noseThreshold &&
               (leftWristDiff > wristThreshold || rightWristDiff > wristThreshold);
    }
}
```

### 3.3 卡路里计算公式

```
消耗(kcal) = 体重(kg) × 运动时长(分钟) × 0.13
```

## 四、UI设计

### 4.1 设计风格

**活力健康风**：
- 主色调：#00C853（活力绿）
- 辅助色：#00BFA5（薄荷绿）
- 强调色：#FF6D00（活力橙）
- 背景色：#F5F5F5

### 4.2 页面布局

```xml
<view class="container">
    <!-- 摄像头区域 (55%高度) -->
    <view class="camera-section">
        <camera device="{{device}}" flash="off" binderror="onCameraError">
        </camera>
        <canvas canvas-id="motionCanvas" class="motion-canvas">
        </canvas>
        <view class="status-indicator {{state}}">
            <text>{{stateText}}</text>
        </view>
    </view>

    <!-- 数据展示区域 -->
    <view class="data-section">
        <!-- 当前次数 (最大字体) -->
        <view class="count-display">
            <text class="count-number">{{count}}</text>
            <text class="count-label">次</text>
        </view>

        <!-- 时长和卡路里 -->
        <view class="stats-row">
            <view class="stat-item">
                <text class="stat-value">{{duration}}</text>
                <text class="stat-label">时长</text>
            </view>
            <view class="stat-item">
                <text class="stat-value">{{calories}}</text>
                <text class="stat-label">千卡</text>
            </view>
        </view>

        <!-- 体重设置 -->
        <view class="weight-setting" bindtap="showWeightModal">
            <text>体重: {{weight}}kg</text>
            <text class="edit-icon">✏️</text>
        </view>
    </view>

    <!-- 操作按钮区域 -->
    <view class="action-section">
        <button class="action-btn primary" bindtap="toggleJumping">
            {{isJumping ? '暂停' : '开始'}}
        </button>
        <button class="action-btn danger" bindtap="stopJumping">
            结束
        </button>
        <button class="action-btn secondary" bindtap="goToHistory">
            历史记录
        </button>
    </view>
</view>
```

### 4.3 样式规范

```css
/* 主色调 */
:root {
    --primary-color: #00C853;
    --secondary-color: #00BFA5;
    --accent-color: #FF6D00;
    --background: #F5F5F5;
    --text-primary: #212121;
    --text-secondary: #757575;
}

/* 摄像头区域 */
.camera-section {
    flex: 0 0 55%;
    position: relative;
    background-color: #000;
}

/* 次数显示 */
.count-number {
    font-size: 120rpx;
    font-weight: bold;
    color: var(--primary-color);
    line-height: 1;
}

/* 操作按钮 */
.action-btn.primary {
    background-color: var(--primary-color);
    color: white;
}
```

## 五、数据结构设计

### 5.1 跳绳记录

```javascript
{
    id: 'jump_20260609_143025',  // 唯一标识
    date: '2026-06-09',          // 日期
    startTime: '14:30:25',       // 开始时间
    endTime: '14:35:30',         // 结束时间
    duration: 305,               // 时长（秒）
    count: 520,                  // 跳绳次数
    calories: 39.65,             // 消耗卡路里
    weight: 65,                  // 用户体重（kg）
    timestamp: 1717925425000     // 时间戳（用于去重）
}
```

### 5.2 用户设置

```javascript
{
    weight: 65,                  // 用户体重（kg）
    sensitivity: 'balanced',     // 检测灵敏度：high, balanced, low
    voiceEnabled: true,          // 是否启用语音播报
    screenAlwaysOn: true         // 是否保持屏幕常亮
}
```

### 5.3 导出数据格式

```javascript
{
    version: '1.0',
    exportTime: '2026-06-09T14:35:30Z',
    settings: {
        weight: 65,
        sensitivity: 'balanced',
        voiceEnabled: true
    },
    records: [
        // 跳绳记录数组
    ]
}
```

## 六、核心功能实现要点

### 6.1 摄像头权限处理

```javascript
async requestCameraPermission() {
    try {
        const setting = await wx.getSetting();
        if (!setting.authSetting['scope.camera']) {
            await wx.authorize({ scope: 'scope.camera' });
        }
        return true;
    } catch (err) {
        wx.showModal({
            title: '需要摄像头权限',
            content: '请在设置中允许访问摄像头',
            confirmText: '去设置',
            success: (res) => {
                if (res.confirm) {
                    wx.openSetting();
                }
            }
        });
        return false;
    }
}
```

### 6.2 语音播报实现（振动 + Toast）

```javascript
// 语音播报：振动反馈 + 关键节点 Toast 提示，无需插件
function speak(text) {
    // 振动反馈
    try { wx.vibrateShort({ type: 'medium' }); } catch (_) {}
    // 关键节点显示文字提示，计数播报不显示（避免频繁打断）
    if (text.includes('开始') || text.includes('结束') || text.includes('暂停') || text.includes('继续')) {
        wx.showToast({ title: text, icon: 'none', duration: 1500 });
    }
}
```

### 6.3 屏幕常亮

```javascript
function keepScreenOn() {
    wx.setKeepScreenOn({
        keepScreenOn: true
    });
}

function disableScreenOn() {
    wx.setKeepScreenOn({
        keepScreenOn: false
    });
}
```

## 七、验证方案

### 7.1 功能验证

- 测试摄像头权限请求和切换
- 测试跳绳计数准确性（人工计数对比）
- 测试语音播报功能
- 测试数据存储和导出导入

### 7.2 性能验证

- 测试帧率（目标≥20fps）
- 测试内存占用
- 测试电池消耗

### 7.3 兼容性验证

- 测试不同iOS版本
- 测试不同Android版本
- 测试不同屏幕尺寸

## 八、实现计划

### 阶段1：基础框架搭建

1. 创建页面文件结构
2. 实现摄像头组件集成
3. 集成 VisionKit Body 人体检测
4. 实现基础UI布局

### 阶段2：核心算法实现

1. 实现 VisionKit Body 关键点获取
2. 实现基于关键点的运动分析算法
3. 实现跳绳计数逻辑
4. 实现卡路里计算

### 阶段3：功能完善

1. 实现语音播报功能
2. 实现数据存储和历史记录
3. 实现数据导出导入

### 阶段4：优化和测试

1. 性能优化（帧率、内存）
2. 兼容性测试
3. 用户体验优化

## 九、风险评估

### 9.1 技术风险

- **VisionKit 兼容性**：VisionKit Body 可能在某些旧设备上不可用
- **性能问题**：人体关键点检测可能消耗较多资源
- **准确性问题**：关键点检测可能在某些姿势下不准确

### 9.2 解决方案

- **兼容性处理**：检测 VisionKit 可用性，提供降级方案（如使用帧差法）
- **性能优化**：调整检测频率、使用跟踪模式减少计算量
- **准确性提升**：结合多个关键点进行综合判断、增加运动模式验证

## 十、成功标准

1. **计数准确率**：≥95%（使用 VisionKit Body 人体关键点检测）
2. **帧率**：≥20fps（中低端手机）
3. **响应速度**：计数延迟<500ms
4. **兼容性**：支持iOS 12+和Android 8+
5. **用户体验**：操作简单、数据清晰、反馈及时
