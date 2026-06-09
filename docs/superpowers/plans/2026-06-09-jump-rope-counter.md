# 跳绳计数器实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个基于微信 VisionKit Body 人体关键点检测的跳绳计数器小程序

**Architecture:** 使用微信小程序原生框架，集成 VisionKit Body 进行人体关键点检测，通过分析鼻子和手腕的周期性运动计算跳绳次数，所有数据本地存储。

**Tech Stack:** 微信小程序原生框架、VisionKit Body、wx.setStorageSync、wx.getFileSystemManager

---

## 文件结构

```
pages/tools/jump-rope/
├── index.js              # 主页面逻辑
├── index.json            # 页面配置
├── index.wxml            # 页面模板
├── index.wxss            # 页面样式
├── history/
│   ├── index.js          # 历史记录页面逻辑
│   ├── index.json        # 历史记录页面配置
│   ├── index.wxml        # 历史记录页面模板
│   └── index.wxss        # 历史记录页面样式
└── utils/
    ├── vision-kit.js     # VisionKit Body 封装
    ├── counter.js        # 跳绳计数逻辑
    ├── storage.js        # 数据存储管理
    ├── voice.js          # 语音播报功能
    └── export.js         # 数据导出导入
```

---

## Task 1: 创建页面文件结构和基础配置

**Files:**
- Create: `pages/tools/jump-rope/index.js`
- Create: `pages/tools/jump-rope/index.json`
- Create: `pages/tools/jump-rope/index.wxml`
- Create: `pages/tools/jump-rope/index.wxss`
- Create: `pages/tools/jump-rope/history/index.js`
- Create: `pages/tools/jump-rope/history/index.json`
- Create: `pages/tools/jump-rope/history/index.wxml`
- Create: `pages/tools/jump-rope/history/index.wxss`
- Modify: `app.json`

- [ ] **Step 1: 创建主页面文件结构**

创建目录结构：
```bash
mkdir -p pages/tools/jump-rope/history
mkdir -p pages/tools/jump-rope/utils
```

- [ ] **Step 2: 创建主页面 index.json 配置**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "跳绳计数器",
  "navigationBarBackgroundColor": "#00C853",
  "navigationBarTextStyle": "white"
}
```

- [ ] **Step 3: 创建主页面 index.js 基础框架**

```javascript
// pages/tools/jump-rope/index.js
Page({
    data: {
        // 摄像头相关
        device: 'front',
        cameraReady: false,

        // 计数相关
        count: 0,
        duration: '00:00:00',
        calories: '0.00',
        weight: 60,
        isJumping: false,
        state: 'idle', // idle, jumping, paused

        // 时间相关
        startTime: null,
        timer: null,

        // VisionKit 相关
        vkSession: null
    },

    onLoad() {
        // 加载用户设置
        this.loadSettings();
    },

    onUnload() {
        // 清理资源
        this.cleanup();
    },

    // 加载用户设置
    loadSettings() {
        const settings = wx.getStorageSync('jumpRopeSettings') || {};
        this.setData({
            weight: settings.weight || 60
        });
    },

    // 清理资源
    cleanup() {
        if (this.data.timer) {
            clearInterval(this.data.timer);
        }
        if (this.data.vkSession) {
            this.data.vkSession.destroy();
        }
    }
});
```

- [ ] **Step 4: 创建主页面 index.wxml 基础结构**

```xml
<!-- pages/tools/jump-rope/index.wxml -->
<view class="container">
    <!-- 摄像头区域 -->
    <view class="camera-section">
        <camera
            device="{{device}}"
            flash="off"
            binderror="onCameraError"
            bindinitdone="onCameraReady"
            style="width: 100%; height: 100%;">
        </camera>
        <canvas
            canvas-id="poseCanvas"
            class="pose-canvas">
        </canvas>
        <view class="status-indicator {{state}}">
            <text>{{state === 'jumping' ? '运动中' : state === 'paused' ? '已暂停' : '准备'}}</text>
        </view>
    </view>

    <!-- 数据展示区域 -->
    <view class="data-section">
        <view class="count-display">
            <text class="count-number">{{count}}</text>
            <text class="count-label">次</text>
        </view>

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

        <view class="weight-setting" bindtap="showWeightModal">
            <text>体重: {{weight}}kg</text>
            <text class="edit-icon">✏️</text>
        </view>
    </view>

    <!-- 操作按钮区域 -->
    <view class="action-section">
        <button
            class="action-btn primary"
            bindtap="toggleJumping"
            disabled="{{!cameraReady}}">
            {{isJumping ? '暂停' : '开始'}}
        </button>
        <button
            class="action-btn danger"
            bindtap="stopJumping"
            disabled="{{count === 0}}">
            结束
        </button>
        <button
            class="action-btn secondary"
            bindtap="goToHistory">
            历史记录
        </button>
    </view>
</view>
```

- [ ] **Step 5: 创建主页面 index.wxss 基础样式**

```css
/* pages/tools/jump-rope/index.wxss */
:root {
    --primary-color: #00C853;
    --secondary-color: #00BFA5;
    --accent-color: #FF6D00;
    --background: #F5F5F5;
    --text-primary: #212121;
    --text-secondary: #757575;
}

.container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--background);
}

.camera-section {
    flex: 0 0 55%;
    position: relative;
    background-color: #000;
}

.pose-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
}

.status-indicator {
    position: absolute;
    top: 20rpx;
    right: 20rpx;
    padding: 10rpx 20rpx;
    border-radius: 20rpx;
    font-size: 24rpx;
}

.status-indicator.jumping {
    background-color: var(--primary-color);
    color: white;
}

.status-indicator.paused {
    background-color: var(--accent-color);
    color: white;
}

.data-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20rpx;
}

.count-display {
    display: flex;
    align-items: baseline;
    margin-bottom: 20rpx;
}

.count-number {
    font-size: 120rpx;
    font-weight: bold;
    color: var(--primary-color);
    line-height: 1;
}

.count-label {
    font-size: 36rpx;
    color: var(--text-secondary);
    margin-left: 10rpx;
}

.stats-row {
    display: flex;
    justify-content: space-around;
    width: 100%;
    margin-bottom: 30rpx;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat-value {
    font-size: 48rpx;
    font-weight: bold;
    color: var(--text-primary);
}

.stat-label {
    font-size: 24rpx;
    color: var(--text-secondary);
    margin-top: 10rpx;
}

.weight-setting {
    display: flex;
    align-items: center;
    padding: 15rpx 30rpx;
    background-color: white;
    border-radius: 30rpx;
    box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.1);
}

.edit-icon {
    margin-left: 10rpx;
    font-size: 28rpx;
}

.action-section {
    display: flex;
    justify-content: space-around;
    padding: 20rpx;
    background-color: white;
    box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.1);
}

.action-btn {
    flex: 1;
    margin: 0 10rpx;
    padding: 20rpx 0;
    border-radius: 15rpx;
    font-size: 28rpx;
    font-weight: bold;
}

.action-btn.primary {
    background-color: var(--primary-color);
    color: white;
}

.action-btn.danger {
    background-color: #FF5252;
    color: white;
}

.action-btn.secondary {
    background-color: var(--secondary-color);
    color: white;
}

.action-btn[disabled] {
    opacity: 0.5;
}
```

- [ ] **Step 6: 更新 app.json 添加页面路径**

```javascript
// 在 app.json 的 subPackages[0].pages 数组中添加
"jump-rope/index",
"jump-rope/history/index"
```

- [ ] **Step 7: 提交代码**

```bash
git add pages/tools/jump-rope/ app.json
git commit -m "feat: 创建跳绳计数器页面文件结构"
```

---

## Task 2: 实现 VisionKit Body 封装

**Files:**
- Create: `pages/tools/jump-rope/utils/vision-kit.js`

- [ ] **Step 1: 创建 VisionKit Body 封装模块**

```javascript
// pages/tools/jump-rope/utils/vision-kit.js

/**
 * VisionKit Body 人体关键点检测封装
 * 用于检测人体姿态，提取关键点坐标
 */
class VisionKitBody {
    constructor() {
        this.session = null;
        this.isReady = false;
        this.onDetect = null;
    }

    /**
     * 初始化 VisionKit Body 会话
     * @returns {Promise<boolean>} 是否初始化成功
     */
    async init() {
        try {
            // 检查 VisionKit 是否可用
            if (!wx.createVKSession) {
                console.error('VisionKit 不可用');
                return false;
            }

            // 创建 VisionKit 会话
            this.session = wx.createVKSession({
                track: {
                    body: {
                        mode: 2  // 跟踪模式，提供连续的关键点数据
                    }
                }
            });

            // 监听关键点检测结果
            this.session.on('bodyDetect', (result) => {
                if (this.onDetect && result.bodies && result.bodies.length > 0) {
                    const body = result.bodies[0];
                    this.onDetect(this.parseBodyData(body));
                }
            });

            // 启动会话
            await this.session.start();
            this.isReady = true;
            console.log('VisionKit Body 初始化成功');
            return true;
        } catch (err) {
            console.error('VisionKit Body 初始化失败:', err);
            return false;
        }
    }

    /**
     * 解析人体关键点数据
     * @param {Object} body VisionKit 返回的人体数据
     * @returns {Object} 解析后的关键点坐标
     */
    parseBodyData(body) {
        const keypoints = {};

        // VisionKit Body 返回的关键点数组
        // 每个关键点包含 x, y, z 坐标和置信度
        if (body.keyPoints) {
            body.keyPoints.forEach((point, index) => {
                // VisionKit Body 关键点索引：
                // 0: 鼻子
                // 1: 左眼
                // 2: 右眼
                // 3: 左耳
                // 4: 右耳
                // 5: 左肩
                // 6: 右肩
                // 7: 左肘
                // 8: 右肘
                // 9: 左手腕
                // 10: 右手腕
                // 11: 左髋
                // 12: 右髋
                // 13: 左膝
                // 14: 右膝
                // 15: 左脚踝
                // 16: 右脚踝

                const keypointNames = [
                    'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
                    'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
                    'leftWrist', 'rightWrist', 'leftHip', 'rightHip',
                    'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'
                ];

                if (index < keypointNames.length) {
                    keypoints[keypointNames[index]] = {
                        x: point.x,
                        y: point.y,
                        z: point.z || 0,
                        confidence: point.confidence || 1
                    };
                }
            });
        }

        return keypoints;
    }

    /**
     * 设置检测回调
     * @param {Function} callback 检测到关键点时的回调函数
     */
    setDetectCallback(callback) {
        this.onDetect = callback;
    }

    /**
     * 停止 VisionKit 会话
     */
    stop() {
        if (this.session) {
            this.session.stop();
            this.isReady = false;
        }
    }

    /**
     * 销毁 VisionKit 会话
     */
    destroy() {
        if (this.session) {
            this.session.destroy();
            this.session = null;
            this.isReady = false;
        }
    }

    /**
     * 检查 VisionKit 是否可用
     * @returns {boolean}
     */
    static isAvailable() {
        return typeof wx.createVKSession === 'function';
    }
}

module.exports = VisionKitBody;
```

- [ ] **Step 2: 测试 VisionKit 封装模块**

在微信开发者工具中测试：
1. 打开跳绳计数器页面
2. 检查控制台是否输出 "VisionKit Body 初始化成功"
3. 检查是否能接收到关键点检测数据

- [ ] **Step 3: 提交代码**

```bash
git add pages/tools/jump-rope/utils/vision-kit.js
git commit -m "feat: 实现 VisionKit Body 人体关键点检测封装"
```

---

## Task 3: 实现跳绳计数逻辑

**Files:**
- Create: `pages/tools/jump-rope/utils/counter.js`

- [ ] **Step 1: 创建跳绳计数器类**

```javascript
// pages/tools/jump-rope/utils/counter.js

/**
 * 跳绳计数器
 * 基于人体关键点的周期性运动检测跳绳次数
 */
class JumpCounter {
    constructor() {
        this.count = 0;
        this.state = 'idle'; // idle, jumping, paused
        this.lastJumpTime = 0;
        this.noseHistory = [];
        this.wristHistory = [];
        this.jumpThreshold = {
            nose: 15,      // 鼻子运动阈值（像素）
            wrist: 25      // 手腕运动阈值（像素）
        };
        this.minJumpInterval = 300; // 最小跳跃间隔（毫秒）
    }

    /**
     * 更新计数（基于 VisionKit Body 关键点）
     * @param {Object} keypoints 人体关键点数据
     * @returns {boolean} 是否检测到跳跃
     */
    update(keypoints) {
        if (this.state !== 'jumping') return false;

        // 提取关键点位置
        const noseY = keypoints.nose ? keypoints.nose.y : null;
        const leftWristY = keypoints.leftWrist ? keypoints.leftWrist.y : null;
        const rightWristY = keypoints.rightWrist ? keypoints.rightWrist.y : null;

        // 检查关键点是否有效
        if (noseY === null || (leftWristY === null && rightWristY === null)) {
            return false;
        }

        // 记录历史数据
        this.noseHistory.push(noseY);
        this.wristHistory.push({
            left: leftWristY,
            right: rightWristY
        });

        // 保持历史窗口大小（最近10帧）
        if (this.noseHistory.length > 10) {
            this.noseHistory.shift();
            this.wristHistory.shift();
        }

        // 检测跳跃动作
        const isJump = this.detectJump();

        // 验证时间间隔（防止快速重复计数）
        const timeSinceLastJump = Date.now() - this.lastJumpTime;
        const isValidInterval = timeSinceLastJump > this.minJumpInterval;

        if (isJump && isValidInterval) {
            this.count++;
            this.lastJumpTime = Date.now();
            return true;
        }
        return false;
    }

    /**
     * 检测跳跃动作
     * @returns {boolean} 是否检测到跳跃
     */
    detectJump() {
        // 需要至少5帧数据才能检测
        if (this.noseHistory.length < 5) return false;

        // 检测鼻子Y坐标的变化（跳跃时身体上下运动）
        const recentNose = this.noseHistory.slice(-5);
        const noseMin = Math.min(...recentNose);
        const noseMax = Math.max(...recentNose);
        const noseDiff = noseMax - noseMin;

        // 检测手腕Y坐标的变化（跳绳时手腕做圆周运动）
        const recentWrists = this.wristHistory.slice(-5);

        let leftWristDiff = 0;
        let rightWristDiff = 0;

        if (recentWrists[0].left !== null) {
            const leftValues = recentWrists.map(w => w.left).filter(v => v !== null);
            if (leftValues.length > 0) {
                leftWristDiff = Math.max(...leftValues) - Math.min(...leftValues);
            }
        }

        if (recentWrists[0].right !== null) {
            const rightValues = recentWrists.map(w => w.right).filter(v => v !== null);
            if (rightValues.length > 0) {
                rightWristDiff = Math.max(...rightValues) - Math.min(...rightValues);
            }
        }

        // 跳跃判定条件：
        // 1. 鼻子有明显的上下运动（身体跳跃）
        // 2. 手腕有明显的上下运动（甩绳）
        const hasNoseMotion = noseDiff > this.jumpThreshold.nose;
        const hasWristMotion = leftWristDiff > this.jumpThreshold.wrist ||
                               rightWristDiff > this.jumpThreshold.wrist;

        return hasNoseMotion && hasWristMotion;
    }

    /**
     * 开始计数
     */
    start() {
        this.state = 'jumping';
        this.lastJumpTime = Date.now();
    }

    /**
     * 暂停计数
     */
    pause() {
        this.state = 'paused';
    }

    /**
     * 恢复计数
     */
    resume() {
        this.state = 'jumping';
        this.lastJumpTime = Date.now();
    }

    /**
     * 停止计数并重置
     * @returns {Object} 计数结果
     */
    stop() {
        const result = {
            count: this.count,
            state: 'idle'
        };

        this.count = 0;
        this.state = 'idle';
        this.noseHistory = [];
        this.wristHistory = [];
        this.lastJumpTime = 0;

        return result;
    }

    /**
     * 获取当前计数
     * @returns {number}
     */
    getCount() {
        return this.count;
    }

    /**
     * 获取当前状态
     * @returns {string}
     */
    getState() {
        return this.state;
    }

    /**
     * 设置检测灵敏度
     * @param {string} level 灵敏度级别：high, balanced, low
     */
    setSensitivity(level) {
        switch (level) {
            case 'high':
                this.jumpThreshold.nose = 10;
                this.jumpThreshold.wrist = 15;
                this.minJumpInterval = 250;
                break;
            case 'balanced':
                this.jumpThreshold.nose = 15;
                this.jumpThreshold.wrist = 25;
                this.minJumpInterval = 300;
                break;
            case 'low':
                this.jumpThreshold.nose = 20;
                this.jumpThreshold.wrist = 35;
                this.minJumpInterval = 400;
                break;
        }
    }
}

module.exports = JumpCounter;
```

- [ ] **Step 2: 测试计数器逻辑**

在微信开发者工具中测试：
1. 创建计数器实例
2. 模拟关键点数据输入
3. 验证计数逻辑是否正确

- [ ] **Step 3: 提交代码**

```bash
git add pages/tools/jump-rope/utils/counter.js
git commit -m "feat: 实现跳绳计数逻辑"
```

---

## Task 4: 实现数据存储管理

**Files:**
- Create: `pages/tools/jump-rope/utils/storage.js`

- [ ] **Step 1: 创建数据存储管理模块**

```javascript
// pages/tools/jump-rope/utils/storage.js

/**
 * 数据存储管理
 * 使用 wx.setStorageSync 进行本地数据存储
 */
class StorageManager {
    constructor() {
        this.SETTINGS_KEY = 'jumpRopeSettings';
        this.RECORDS_KEY = 'jumpRopeRecords';
        this.MAX_RECORDS = 100;
    }

    /**
     * 获取用户设置
     * @returns {Object} 用户设置
     */
    getSettings() {
        try {
            return wx.getStorageSync(this.SETTINGS_KEY) || {
                weight: 60,
                sensitivity: 'balanced',
                voiceEnabled: true,
                screenAlwaysOn: true
            };
        } catch (err) {
            console.error('获取设置失败:', err);
            return {
                weight: 60,
                sensitivity: 'balanced',
                voiceEnabled: true,
                screenAlwaysOn: true
            };
        }
    }

    /**
     * 保存用户设置
     * @param {Object} settings 用户设置
     */
    saveSettings(settings) {
        try {
            wx.setStorageSync(this.SETTINGS_KEY, settings);
        } catch (err) {
            console.error('保存设置失败:', err);
        }
    }

    /**
     * 获取所有跳绳记录
     * @returns {Array} 跳绳记录数组
     */
    getRecords() {
        try {
            return wx.getStorageSync(this.RECORDS_KEY) || [];
        } catch (err) {
            console.error('获取记录失败:', err);
            return [];
        }
    }

    /**
     * 保存跳绳记录
     * @param {Object} record 跳绳记录
     */
    saveRecord(record) {
        try {
            const records = this.getRecords();

            // 生成唯一ID
            record.id = this.generateId();
            record.timestamp = Date.now();

            // 添加到记录数组开头（最新的在前面）
            records.unshift(record);

            // 限制记录数量
            if (records.length > this.MAX_RECORDS) {
                records.splice(this.MAX_RECORDS);
            }

            wx.setStorageSync(this.RECORDS_KEY, records);
        } catch (err) {
            console.error('保存记录失败:', err);
        }
    }

    /**
     * 清空所有记录
     */
    clearRecords() {
        try {
            wx.removeStorageSync(this.RECORDS_KEY);
        } catch (err) {
            console.error('清空记录失败:', err);
        }
    }

    /**
     * 生成唯一ID
     * @returns {string} 唯一ID
     */
    generateId() {
        const now = new Date();
        const date = now.toISOString().split('T')[0].replace(/-/g, '');
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `jump_${date}_${time}_${random}`;
    }

    /**
     * 导出所有数据
     * @returns {Object} 导出数据
     */
    exportData() {
        return {
            version: '1.0',
            exportTime: new Date().toISOString(),
            settings: this.getSettings(),
            records: this.getRecords()
        };
    }

    /**
     * 导入数据
     * @param {Object} data 导入的数据
     * @returns {Object} 导入结果
     */
    importData(data) {
        try {
            // 验证数据格式
            if (!data || !data.records || !Array.isArray(data.records)) {
                return {
                    success: false,
                    message: '数据格式错误'
                };
            }

            const existingRecords = this.getRecords();
            const existingTimestamps = new Set(existingRecords.map(r => r.timestamp));

            let importedCount = 0;
            let skippedCount = 0;

            // 导入记录（自动去重）
            data.records.forEach(record => {
                if (record.timestamp && !existingTimestamps.has(record.timestamp)) {
                    existingRecords.push(record);
                    importedCount++;
                } else {
                    skippedCount++;
                }
            });

            // 按时间戳排序（最新的在前面）
            existingRecords.sort((a, b) => b.timestamp - a.timestamp);

            // 限制记录数量
            if (existingRecords.length > this.MAX_RECORDS) {
                existingRecords.splice(this.MAX_RECORDS);
            }

            // 保存记录
            wx.setStorageSync(this.RECORDS_KEY, existingRecords);

            // 导入设置
            if (data.settings) {
                this.saveSettings(data.settings);
            }

            return {
                success: true,
                importedCount,
                skippedCount
            };
        } catch (err) {
            console.error('导入数据失败:', err);
            return {
                success: false,
                message: '导入失败: ' + err.message
            };
        }
    }
}

module.exports = StorageManager;
```

- [ ] **Step 2: 测试存储管理模块**

在微信开发者工具中测试：
1. 保存和读取设置
2. 保存和读取记录
3. 测试数据导出和导入

- [ ] **Step 3: 提交代码**

```bash
git add pages/tools/jump-rope/utils/storage.js
git commit -m "feat: 实现数据存储管理模块"
```

---

## Task 5: 实现语音播报功能

**Files:**
- Create: `pages/tools/jump-rope/utils/voice.js`

- [ ] **Step 1: 创建语音播报模块**

```javascript
// pages/tools/jump-rope/utils/voice.js

/**
 * 语音播报功能
 * 使用微信内置TTS进行语音播报
 */
class VoiceAnnouncer {
    constructor() {
        this.enabled = true;
        this.lastAnnouncement = 0;
        this.announcementInterval = 20; // 每20次播报一次
    }

    /**
     * 初始化语音播报
     */
    init() {
        // 微信小程序内置TTS需要在 app.json 中配置
        // 这里使用 wx.showToast 作为备用方案
        console.log('语音播报模块初始化');
    }

    /**
     * 播报文本
     * @param {string} text 要播报的文本
     */
    speak(text) {
        if (!this.enabled) return;

        try {
            // 使用微信内置TTS（如果可用）
            if (wx.createInnerAudioContext) {
                // 备用方案：使用 wx.showToast 显示文本
                wx.showToast({
                    title: text,
                    icon: 'none',
                    duration: 2000
                });
            }
        } catch (err) {
            console.error('语音播报失败:', err);
        }
    }

    /**
     * 播报开始运动
     */
    announceStart() {
        this.speak('开始跳绳');
    }

    /**
     * 播报暂停运动
     */
    announcePause() {
        this.speak('已暂停');
    }

    /**
     * 播报恢复运动
     */
    announceResume() {
        this.speak('继续跳绳');
    }

    /**
     * 播报跳绳次数
     * @param {number} count 当前次数
     */
    announceCount(count) {
        // 每20次播报一次
        if (count > 0 && count % this.announcementInterval === 0) {
            this.speak(`已跳${count}次`);
        }
    }

    /**
     * 播报运动结束
     * @param {number} count 总次数
     * @param {number} duration 总时长（秒）
     * @param {number} calories 总卡路里
     */
    announceEnd(count, duration, calories) {
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        const durationText = minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;

        this.speak(`运动结束，共跳${count}次，时长${durationText}，消耗${calories.toFixed(1)}千卡`);
    }

    /**
     * 设置是否启用语音播报
     * @param {boolean} enabled 是否启用
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * 设置播报间隔
     * @param {number} interval 播报间隔次数
     */
    setAnnouncementInterval(interval) {
        this.announcementInterval = interval;
    }
}

module.exports = VoiceAnnouncer;
```

- [ ] **Step 2: 测试语音播报功能**

在微信开发者工具中测试：
1. 测试各种播报场景
2. 验证播报文本是否正确显示

- [ ] **Step 3: 提交代码**

```bash
git add pages/tools/jump-rope/utils/voice.js
git commit -m "feat: 实现语音播报功能"
```

---

## Task 6: 实现数据导出导入功能

**Files:**
- Create: `pages/tools/jump-rope/utils/export.js`

- [ ] **Step 1: 创建数据导出导入模块**

```javascript
// pages/tools/jump-rope/utils/export.js

/**
 * 数据导出导入功能
 * 使用 wx.getFileSystemManager 进行文件操作
 */
class DataExporter {
    constructor() {
        this.fs = wx.getFileSystemManager();
    }

    /**
     * 导出数据为JSON文件
     * @param {Object} data 要导出的数据
     * @returns {Promise<Object>} 导出结果
     */
    async exportToJSON(data) {
        try {
            // 生成文件名
            const now = new Date();
            const date = now.toISOString().split('T')[0].replace(/-/g, '');
            const fileName = `跳绳记录_${date}.json`;

            // 将数据转换为JSON字符串
            const jsonString = JSON.stringify(data, null, 2);

            // 获取临时文件路径
            const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

            // 写入文件
            this.fs.writeFileSync(filePath, jsonString, 'utf8');

            // 保存到相册或分享
            const result = await this.saveFile(filePath, fileName);

            return {
                success: true,
                fileName,
                filePath,
                ...result
            };
        } catch (err) {
            console.error('导出数据失败:', err);
            return {
                success: false,
                message: '导出失败: ' + err.message
            };
        }
    }

    /**
     * 保存文件到手机
     * @param {string} filePath 文件路径
     * @param {string} fileName 文件名
     * @returns {Promise<Object>} 保存结果
     */
    async saveFile(filePath, fileName) {
        try {
            // 使用 wx.shareFileMessage 分享文件
            return new Promise((resolve, reject) => {
                wx.shareFileMessage({
                    filePath,
                    fileName,
                    success: () => {
                        resolve({
                            saved: true,
                            message: '文件已分享'
                        });
                    },
                    fail: (err) => {
                        // 如果分享失败，尝试保存到相册
                        this.saveToAlbum(filePath).then(resolve).catch(reject);
                    }
                });
            });
        } catch (err) {
            console.error('保存文件失败:', err);
            return {
                saved: false,
                message: '保存失败: ' + err.message
            };
        }
    }

    /**
     * 保存文件到相册
     * @param {string} filePath 文件路径
     * @returns {Promise<Object>} 保存结果
     */
    async saveToAlbum(filePath) {
        try {
            // 注意：wx.saveImageToPhotosAlbum 只能保存图片
            // 对于JSON文件，我们需要使用其他方式
            // 这里返回提示信息
            return {
                saved: false,
                message: '请通过分享功能保存文件'
            };
        } catch (err) {
            console.error('保存到相册失败:', err);
            return {
                saved: false,
                message: '保存失败'
            };
        }
    }

    /**
     * 从JSON文件导入数据
     * @returns {Promise<Object>} 导入结果
     */
    async importFromJSON() {
        try {
            // 选择文件
            const filePath = await this.chooseFile();

            if (!filePath) {
                return {
                    success: false,
                    message: '未选择文件'
                };
            }

            // 读取文件内容
            const content = this.fs.readFileSync(filePath, 'utf8');

            // 解析JSON
            const data = JSON.parse(content);

            return {
                success: true,
                data
            };
        } catch (err) {
            console.error('导入数据失败:', err);
            return {
                success: false,
                message: '导入失败: ' + err.message
            };
        }
    }

    /**
     * 选择文件
     * @returns {Promise<string>} 文件路径
     */
    chooseFile() {
        return new Promise((resolve, reject) => {
            wx.chooseMessageFile({
                count: 1,
                type: 'file',
                extension: ['.json'],
                success: (res) => {
                    if (res.tempFiles && res.tempFiles.length > 0) {
                        resolve(res.tempFiles[0].path);
                    } else {
                        resolve(null);
                    }
                },
                fail: (err) => {
                    console.error('选择文件失败:', err);
                    reject(err);
                }
            });
        });
    }
}

module.exports = DataExporter;
```

- [ ] **Step 2: 测试导出导入功能**

在微信开发者工具中测试：
1. 测试数据导出功能
2. 测试文件选择和导入功能
3. 验证数据格式是否正确

- [ ] **Step 3: 提交代码**

```bash
git add pages/tools/jump-rope/utils/export.js
git commit -m "feat: 实现数据导出导入功能"
```

---

## Task 7: 实现主页面完整逻辑

**Files:**
- Modify: `pages/tools/jump-rope/index.js`

- [ ] **Step 1: 完善主页面逻辑**

```javascript
// pages/tools/jump-rope/index.js
const VisionKitBody = require('./utils/vision-kit');
const JumpCounter = require('./utils/counter');
const StorageManager = require('./utils/storage');
const VoiceAnnouncer = require('./utils/voice');
const DataExporter = require('./utils/export');

Page({
    data: {
        // 摄像头相关
        device: 'front',
        cameraReady: false,

        // 计数相关
        count: 0,
        duration: '00:00:00',
        calories: '0.00',
        weight: 60,
        isJumping: false,
        state: 'idle',

        // 时间相关
        startTime: null,
        timer: null,
        durationSeconds: 0,

        // 模块实例
        visionKit: null,
        counter: null,
        storage: null,
        voice: null,
        exporter: null,

        // 体重设置弹窗
        showWeightModal: false,
        tempWeight: 60
    },

    onLoad() {
        // 初始化模块
        this.initModules();

        // 加载用户设置
        this.loadSettings();

        // 请求权限
        this.requestPermissions();
    },

    onUnload() {
        // 清理资源
        this.cleanup();
    },

    /**
     * 初始化所有模块
     */
    initModules() {
        this.data.storage = new StorageManager();
        this.data.counter = new JumpCounter();
        this.data.voice = new VoiceAnnouncer();
        this.data.exporter = new DataExporter();
        this.data.visionKit = new VisionKitBody();

        // 设置检测回调
        this.data.visionKit.setDetectCallback((keypoints) => {
            this.onBodyDetected(keypoints);
        });
    },

    /**
     * 加载用户设置
     */
    loadSettings() {
        const settings = this.data.storage.getSettings();
        this.setData({
            weight: settings.weight || 60
        });
        this.data.counter.setSensitivity(settings.sensitivity || 'balanced');
        this.data.voice.setEnabled(settings.voiceEnabled !== false);
    },

    /**
     * 请求必要权限
     */
    async requestPermissions() {
        try {
            // 请求摄像头权限
            const setting = await wx.getSetting();
            if (!setting.authSetting['scope.camera']) {
                await wx.authorize({ scope: 'scope.camera' });
            }

            // 初始化 VisionKit
            const success = await this.data.visionKit.init();
            if (success) {
                this.setData({ cameraReady: true });
            } else {
                wx.showToast({
                    title: 'VisionKit 初始化失败',
                    icon: 'none'
                });
            }
        } catch (err) {
            console.error('权限请求失败:', err);
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
        }
    },

    /**
     * 摄像头初始化完成
     */
    onCameraReady() {
        console.log('摄像头初始化完成');
        this.setData({ cameraReady: true });
    },

    /**
     * 摄像头错误处理
     */
    onCameraError(err) {
        console.error('摄像头错误:', err);
        wx.showToast({
            title: '摄像头访问失败',
            icon: 'none'
        });
    },

    /**
     * 人体关键点检测回调
     */
    onBodyDetected(keypoints) {
        if (this.data.state !== 'jumping') return;

        // 更新计数
        const counted = this.data.counter.update(keypoints);

        if (counted) {
            const newCount = this.data.counter.getCount();
            this.setData({ count: newCount });

            // 语音播报
            this.data.voice.announceCount(newCount);
        }
    },

    /**
     * 切换跳绳状态（开始/暂停）
     */
    toggleJumping() {
        if (this.data.state === 'idle') {
            // 开始跳绳
            this.startJumping();
        } else if (this.data.state === 'jumping') {
            // 暂停跳绳
            this.pauseJumping();
        } else if (this.data.state === 'paused') {
            // 恢复跳绳
            this.resumeJumping();
        }
    },

    /**
     * 开始跳绳
     */
    startJumping() {
        this.setData({
            state: 'jumping',
            isJumping: true,
            startTime: Date.now(),
            durationSeconds: 0,
            count: 0
        });

        this.data.counter.start();
        this.data.voice.announceStart();

        // 开始计时
        this.startTimer();

        // 保持屏幕常亮
        wx.setKeepScreenOn({ keepScreenOn: true });
    },

    /**
     * 暂停跳绳
     */
    pauseJumping() {
        this.setData({
            state: 'paused',
            isJumping: false
        });

        this.data.counter.pause();
        this.data.voice.announcePause();

        // 停止计时
        this.stopTimer();
    },

    /**
     * 恢复跳绳
     */
    resumeJumping() {
        this.setData({
            state: 'jumping',
            isJumping: true
        });

        this.data.counter.resume();
        this.data.voice.announceResume();

        // 恢复计时
        this.startTimer();
    },

    /**
     * 停止跳绳
     */
    stopJumping() {
        // 获取计数结果
        const result = this.data.counter.stop();

        // 计算最终数据
        const duration = this.data.durationSeconds;
        const calories = this.calculateCalories(duration);

        // 保存记录
        const record = {
            date: this.formatDate(new Date()),
            startTime: this.formatTime(new Date(this.data.startTime)),
            endTime: this.formatTime(new Date()),
            duration: duration,
            count: result.count,
            calories: parseFloat(calories),
            weight: this.data.weight
        };

        this.data.storage.saveRecord(record);

        // 语音播报
        this.data.voice.announceEnd(result.count, duration, parseFloat(calories));

        // 重置状态
        this.setData({
            state: 'idle',
            isJumping: false,
            count: 0,
            duration: '00:00:00',
            calories: '0.00',
            startTime: null,
            durationSeconds: 0
        });

        // 停止计时
        this.stopTimer();

        // 关闭屏幕常亮
        wx.setKeepScreenOn({ keepScreenOn: false });

        // 显示完成提示
        wx.showToast({
            title: `完成 ${result.count} 次`,
            icon: 'success'
        });
    },

    /**
     * 开始计时器
     */
    startTimer() {
        if (this.data.timer) {
            clearInterval(this.data.timer);
        }

        this.data.timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.data.startTime) / 1000);
            const duration = this.data.durationSeconds + elapsed;

            this.setData({
                duration: this.formatDuration(duration),
                calories: this.calculateCalories(duration)
            });
        }, 1000);
    },

    /**
     * 停止计时器
     */
    stopTimer() {
        if (this.data.timer) {
            clearInterval(this.data.timer);
            this.data.timer = null;
        }

        // 保存当前时长
        if (this.data.startTime) {
            const elapsed = Math.floor((Date.now() - this.data.startTime) / 1000);
            this.setData({
                durationSeconds: this.data.durationSeconds + elapsed
            });
        }
    },

    /**
     * 计算卡路里消耗
     * @param {number} duration 时长（秒）
     * @returns {string} 卡路里
     */
    calculateCalories(duration) {
        const minutes = duration / 60;
        const calories = this.data.weight * minutes * 0.13;
        return calories.toFixed(2);
    },

    /**
     * 格式化时长
     * @param {number} seconds 秒数
     * @returns {string} 格式化的时长
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    },

    /**
     * 格式化日期
     * @param {Date} date 日期对象
     * @returns {string} 格式化的日期
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * 格式化时间
     * @param {Date} date 日期对象
     * @returns {string} 格式化的时间
     */
    formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    },

    /**
     * 显示体重设置弹窗
     */
    showWeightModal() {
        this.setData({
            showWeightModal: true,
            tempWeight: this.data.weight
        });
    },

    /**
     * 隐藏体重设置弹窗
     */
    hideWeightModal() {
        this.setData({
            showWeightModal: false
        });
    },

    /**
     * 体重输入变化
     */
    onWeightInput(e) {
        this.setData({
            tempWeight: parseInt(e.detail.value) || 60
        });
    },

    /**
     * 确认体重设置
     */
    confirmWeight() {
        const weight = Math.min(200, Math.max(20, this.data.tempWeight));

        this.setData({
            weight,
            showWeightModal: false
        });

        // 保存设置
        const settings = this.data.storage.getSettings();
        settings.weight = weight;
        this.data.storage.saveSettings(settings);

        wx.showToast({
            title: `体重已设置为 ${weight}kg`,
            icon: 'none'
        });
    },

    /**
     * 切换摄像头
     */
    switchCamera() {
        this.setData({
            device: this.data.device === 'front' ? 'back' : 'front'
        });
    },

    /**
     * 跳转到历史记录页面
     */
    goToHistory() {
        wx.navigateTo({
            url: '/pages/tools/jump-rope/history/index'
        });
    },

    /**
     * 清理资源
     */
    cleanup() {
        if (this.data.timer) {
            clearInterval(this.data.timer);
        }
        if (this.data.visionKit) {
            this.data.visionKit.destroy();
        }
        wx.setKeepScreenOn({ keepScreenOn: false });
    }
});
```

- [ ] **Step 2: 测试主页面功能**

在微信开发者工具中测试：
1. 测试摄像头初始化
2. 测试开始/暂停/停止功能
3. 测试计时和卡路里计算
4. 测试体重设置

- [ ] **Step 3: 提交代码**

```bash
git add pages/tools/jump-rope/index.js
git commit -m "feat: 实现主页面完整逻辑"
```

---

## Task 8: 实现历史记录页面

**Files:**
- Modify: `pages/tools/jump-rope/history/index.js`
- Modify: `pages/tools/jump-rope/history/index.json`
- Modify: `pages/tools/jump-rope/history/index.wxml`
- Modify: `pages/tools/jump-rope/history/index.wxss`

- [ ] **Step 1: 创建历史记录页面配置**

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "历史记录",
  "navigationBarBackgroundColor": "#00C853",
  "navigationBarTextStyle": "white"
}
```

- [ ] **Step 2: 创建历史记录页面模板**

```xml
<!-- pages/tools/jump-rope/history/index.wxml -->
<view class="container">
    <!-- 顶部操作栏 -->
    <view class="action-bar">
        <button class="action-btn" bindtap="exportData">导出数据</button>
        <button class="action-btn" bindtap="importData">导入数据</button>
        <button class="action-btn danger" bindtap="clearRecords">清空记录</button>
    </view>

    <!-- 记录列表 -->
    <scroll-view class="record-list" scroll-y>
        <view class="record-card" wx:for="{{records}}" wx:key="id">
            <view class="record-header">
                <text class="record-date">{{item.date}}</text>
                <text class="record-time">{{item.startTime}} - {{item.endTime}}</text>
            </view>
            <view class="record-body">
                <view class="record-stat">
                    <text class="stat-value">{{item.count}}</text>
                    <text class="stat-label">次</text>
                </view>
                <view class="record-stat">
                    <text class="stat-value">{{item.durationFormatted}}</text>
                    <text class="stat-label">时长</text>
                </view>
                <view class="record-stat">
                    <text class="stat-value">{{item.calories}}</text>
                    <text class="stat-label">千卡</text>
                </view>
            </view>
        </view>

        <!-- 空状态 -->
        <view class="empty-state" wx:if="{{records.length === 0}}">
            <text class="empty-icon">📊</text>
            <text class="empty-text">暂无记录</text>
            <text class="empty-hint">开始跳绳后将自动记录</text>
        </view>
    </scroll-view>
</view>
```

- [ ] **Step 3: 创建历史记录页面样式**

```css
/* pages/tools/jump-rope/history/index.wxss */
.container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #F5F5F5;
}

.action-bar {
    display: flex;
    padding: 20rpx;
    background-color: white;
    box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.1);
}

.action-btn {
    flex: 1;
    margin: 0 10rpx;
    padding: 15rpx 0;
    border-radius: 10rpx;
    font-size: 24rpx;
    background-color: #00C853;
    color: white;
}

.action-btn.danger {
    background-color: #FF5252;
}

.record-list {
    flex: 1;
    padding: 20rpx;
}

.record-card {
    background-color: white;
    border-radius: 15rpx;
    padding: 20rpx;
    margin-bottom: 20rpx;
    box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.1);
}

.record-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15rpx;
    padding-bottom: 15rpx;
    border-bottom: 1rpx solid #EEEEEE;
}

.record-date {
    font-size: 28rpx;
    font-weight: bold;
    color: #212121;
}

.record-time {
    font-size: 24rpx;
    color: #757575;
}

.record-body {
    display: flex;
    justify-content: space-around;
}

.record-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat-value {
    font-size: 36rpx;
    font-weight: bold;
    color: #00C853;
}

.stat-label {
    font-size: 20rpx;
    color: #757575;
    margin-top: 5rpx;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100rpx 0;
}

.empty-icon {
    font-size: 80rpx;
    margin-bottom: 20rpx;
}

.empty-text {
    font-size: 32rpx;
    color: #212121;
    margin-bottom: 10rpx;
}

.empty-hint {
    font-size: 24rpx;
    color: #757575;
}
```

- [ ] **Step 4: 创建历史记录页面逻辑**

```javascript
// pages/tools/jump-rope/history/index.js
const StorageManager = require('../utils/storage');
const DataExporter = require('../utils/export');

Page({
    data: {
        records: [],
        storage: null,
        exporter: null
    },

    onLoad() {
        this.data.storage = new StorageManager();
        this.data.exporter = new DataExporter();

        this.loadRecords();
    },

    onShow() {
        // 每次显示页面时刷新记录
        this.loadRecords();
    },

    /**
     * 加载记录
     */
    loadRecords() {
        const records = this.data.storage.getRecords();

        // 格式化时长
        const formattedRecords = records.map(record => ({
            ...record,
            durationFormatted: this.formatDuration(record.duration)
        }));

        this.setData({
            records: formattedRecords
        });
    },

    /**
     * 格式化时长
     * @param {number} seconds 秒数
     * @returns {string} 格式化的时长
     */
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (minutes > 0) {
            return `${minutes}分${secs}秒`;
        }
        return `${secs}秒`;
    },

    /**
     * 导出数据
     */
    async exportData() {
        try {
            wx.showLoading({ title: '导出中...' });

            const data = this.data.storage.exportData();
            const result = await this.data.exporter.exportToJSON(data);

            wx.hideLoading();

            if (result.success) {
                wx.showToast({
                    title: '导出成功',
                    icon: 'success'
                });
            } else {
                wx.showToast({
                    title: result.message || '导出失败',
                    icon: 'none'
                });
            }
        } catch (err) {
            wx.hideLoading();
            console.error('导出失败:', err);
            wx.showToast({
                title: '导出失败',
                icon: 'none'
            });
        }
    },

    /**
     * 导入数据
     */
    async importData() {
        try {
            wx.showLoading({ title: '导入中...' });

            const result = await this.data.exporter.importFromJSON();

            if (result.success) {
                const importResult = this.data.storage.importData(result.data);

                wx.hideLoading();

                if (importResult.success) {
                    wx.showModal({
                        title: '导入完成',
                        content: `成功导入 ${importResult.importedCount} 条记录，跳过 ${importResult.skippedCount} 条重复记录`,
                        showCancel: false
                    });

                    // 刷新记录列表
                    this.loadRecords();
                } else {
                    wx.showToast({
                        title: importResult.message || '导入失败',
                        icon: 'none'
                    });
                }
            } else {
                wx.hideLoading();
                wx.showToast({
                    title: result.message || '导入失败',
                    icon: 'none'
                });
            }
        } catch (err) {
            wx.hideLoading();
            console.error('导入失败:', err);
            wx.showToast({
                title: '导入失败',
                icon: 'none'
            });
        }
    },

    /**
     * 清空记录
     */
    clearRecords() {
        wx.showModal({
            title: '确认清空',
            content: '确定要清空所有跳绳记录吗？此操作不可恢复。',
            confirmText: '清空',
            confirmColor: '#FF5252',
            success: (res) => {
                if (res.confirm) {
                    this.data.storage.clearRecords();
                    this.loadRecords();

                    wx.showToast({
                        title: '已清空',
                        icon: 'success'
                    });
                }
            }
        });
    }
});
```

- [ ] **Step 5: 测试历史记录页面**

在微信开发者工具中测试：
1. 测试记录列表显示
2. 测试导出功能
3. 测试导入功能
4. 测试清空记录功能

- [ ] **Step 6: 提交代码**

```bash
git add pages/tools/jump-rope/history/
git commit -m "feat: 实现历史记录页面"
```

---

## Task 9: 完善主页面UI和交互

**Files:**
- Modify: `pages/tools/jump-rope/index.wxml`
- Modify: `pages/tools/jump-rope/index.wxss`

- [ ] **Step 1: 添加体重设置弹窗**

在 index.wxml 中添加：
```xml
<!-- 体重设置弹窗 -->
<view class="modal-overlay" wx:if="{{showWeightModal}}" bindtap="hideWeightModal">
    <view class="modal-content" catchtap>
        <view class="modal-header">
            <text class="modal-title">设置体重</text>
        </view>
        <view class="modal-body">
            <view class="input-group">
                <text class="input-label">体重 (kg)</text>
                <input
                    class="input-field"
                    type="number"
                    value="{{tempWeight}}"
                    bindinput="onWeightInput"
                    placeholder="请输入体重"
                    min="20"
                    max="200"
                />
            </view>
            <view class="input-hint">
                <text>范围：20-200kg</text>
            </view>
        </view>
        <view class="modal-footer">
            <button class="modal-btn cancel" bindtap="hideWeightModal">取消</button>
            <button class="modal-btn confirm" bindtap="confirmWeight">确定</button>
        </view>
    </view>
</view>
```

- [ ] **Step 2: 添加弹窗样式**

在 index.wxss 中添加：
```css
/* 弹窗样式 */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    width: 80%;
    background-color: white;
    border-radius: 20rpx;
    overflow: hidden;
}

.modal-header {
    padding: 30rpx;
    text-align: center;
    border-bottom: 1rpx solid #EEEEEE;
}

.modal-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #212121;
}

.modal-body {
    padding: 30rpx;
}

.input-group {
    margin-bottom: 20rpx;
}

.input-label {
    font-size: 28rpx;
    color: #757575;
    margin-bottom: 10rpx;
    display: block;
}

.input-field {
    width: 100%;
    padding: 20rpx;
    border: 1rpx solid #EEEEEE;
    border-radius: 10rpx;
    font-size: 32rpx;
}

.input-hint {
    font-size: 24rpx;
    color: #757575;
    text-align: center;
}

.modal-footer {
    display: flex;
    border-top: 1rpx solid #EEEEEE;
}

.modal-btn {
    flex: 1;
    padding: 25rpx 0;
    text-align: center;
    font-size: 28rpx;
    border-radius: 0;
}

.modal-btn.cancel {
    color: #757575;
    background-color: white;
}

.modal-btn.confirm {
    color: white;
    background-color: #00C853;
}
```

- [ ] **Step 3: 测试UI改进**

在微信开发者工具中测试：
1. 测试体重设置弹窗
2. 测试弹窗的显示和隐藏
3. 测试体重输入和保存

- [ ] **Step 4: 提交代码**

```bash
git add pages/tools/jump-rope/index.wxml pages/tools/jump-rope/index.wxss
git commit -m "feat: 完善主页面UI和交互"
```

---

## Task 10: 集成测试和优化

**Files:**
- Modify: `pages/tools/jump-rope/index.js`
- Modify: `pages/tools/jump-rope/utils/vision-kit.js`

- [ ] **Step 1: 测试完整流程**

在微信开发者工具中进行完整测试：
1. 打开跳绳计数器页面
2. 请求摄像头权限
3. 开始跳绳
4. 验证计数是否准确
5. 暂停和恢复
6. 停止并保存记录
7. 查看历史记录
8. 导出和导入数据

- [ ] **Step 2: 优化性能**

```javascript
// 在 vision-kit.js 中添加性能优化
class VisionKitBody {
    constructor() {
        // ... 其他代码
        this.frameCount = 0;
        this.skipFrames = 2; // 每3帧处理一次
    }

    // 在检测回调中添加帧跳跃
    onDetect(result) {
        this.frameCount++;
        if (this.frameCount % (this.skipFrames + 1) !== 0) {
            return; // 跳过此帧
        }

        // 处理检测结果
        if (this.onDetect && result.bodies && result.bodies.length > 0) {
            const body = result.bodies[0];
            this.onDetect(this.parseBodyData(body));
        }
    }
}
```

- [ ] **Step 3: 添加错误处理**

在 index.js 中添加更完善的错误处理：
```javascript
// 在 requestPermissions 方法中添加
async requestPermissions() {
    try {
        // ... 其他代码
    } catch (err) {
        console.error('权限请求失败:', err);

        // 根据错误类型显示不同提示
        if (err.errMsg && err.errMsg.includes('authorize')) {
            wx.showModal({
                title: '需要摄像头权限',
                content: '跳绳计数器需要使用摄像头来检测您的动作，请在设置中允许访问摄像头。',
                confirmText: '去设置',
                cancelText: '取消',
                success: (res) => {
                    if (res.confirm) {
                        wx.openSetting();
                    }
                }
            });
        } else {
            wx.showToast({
                title: '初始化失败，请重试',
                icon: 'none'
            });
        }
    }
}
```

- [ ] **Step 4: 提交代码**

```bash
git add pages/tools/jump-rope/
git commit -m "feat: 集成测试和性能优化"
```

---

## 验证清单

完成所有任务后，进行以下验证：

- [ ] 摄像头权限请求正常
- [ ] VisionKit Body 初始化成功
- [ ] 跳绳计数准确（≥95%）
- [ ] 计时功能正常
- [ ] 卡路里计算正确
- [ ] 语音播报正常
- [ ] 数据保存和读取正常
- [ ] 历史记录显示正常
- [ ] 数据导出功能正常
- [ ] 数据导入功能正常
- [ ] 清空记录功能正常
- [ ] 体重设置功能正常
- [ ] 屏幕常亮功能正常
- [ ] UI显示正常，适配不同屏幕
- [ ] 性能流畅（≥20fps）
