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

        const leftValues = recentWrists.map(w => w.left).filter(v => v !== null);
        if (leftValues.length >= 2) {
            leftWristDiff = Math.max(...leftValues) - Math.min(...leftValues);
        }

        const rightValues = recentWrists.map(w => w.right).filter(v => v !== null);
        if (rightValues.length >= 2) {
            rightWristDiff = Math.max(...rightValues) - Math.min(...rightValues);
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
