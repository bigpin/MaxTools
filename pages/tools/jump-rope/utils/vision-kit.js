// pages/tools/jump-rope/utils/vision-kit.js

/**
 * VisionKit Body 人体关键点检测封装
 * 用于检测人体姿态，提取关键点坐标
 */
class VisionKitBody {
    // VisionKit Body 关键点索引映射（静态常量）
    static KEYPOINT_NAMES = [
        'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
        'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
        'leftWrist', 'rightWrist', 'leftHip', 'rightHip',
        'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'
    ];

    constructor() {
        this.session = null;
        this.isReady = false;
        this.onDetect = null;
        this.frameCount = 0;
        this.skipFrames = 2; // 每3帧处理一次，减少CPU占用
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

            // 监听关键点检测结果（带帧跳跃优化）
            this.session.on('bodyDetect', (result) => {
                this.frameCount++;
                // 每 skipFrames+1 帧处理一次，减少CPU占用
                if (this.frameCount % (this.skipFrames + 1) !== 0) {
                    return;
                }

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
            // 初始化失败时清理资源
            this.destroy();
            return false;
        }
    }

    /**
     * 解析人体关键点数据
     * @param {Object} body VisionKit 返回的人体数据
     * @returns {Object} 解析后的关键点坐标
     */
    parseBodyData(body) {
        // 输入验证
        if (!body || typeof body !== 'object') {
            console.warn('parseBodyData: 无效的 body 参数');
            return {};
        }

        if (!Array.isArray(body.keyPoints)) {
            console.warn('parseBodyData: body.keyPoints 不是数组');
            return {};
        }

        const keypoints = {};

        // VisionKit Body 返回的关键点数组
        // 每个关键点包含 x, y, z 坐标和置信度
        body.keyPoints.forEach((point, index) => {
            if (index < VisionKitBody.KEYPOINT_NAMES.length) {
                keypoints[VisionKitBody.KEYPOINT_NAMES[index]] = {
                    x: point.x,
                    y: point.y,
                    z: point.z || 0,
                    confidence: point.confidence || 1
                };
            }
        });

        return keypoints;
    }

    /**
     * 设置检测回调
     * @param {Function} callback 检测到关键点时的回调函数
     */
    setDetectCallback(callback) {
        if (typeof callback !== 'function') {
            console.error('setDetectCallback: callback 必须是函数');
            return;
        }
        this.onDetect = callback;
    }

    /**
     * 设置帧跳跃数量
     * @param {number} skip 每skip帧跳过一帧（0=不跳帧，1=每2帧处理1帧，2=每3帧处理1帧）
     */
    setSkipFrames(skip) {
        this.skipFrames = Math.max(0, Math.floor(skip));
    }

    /**
     * 停止 VisionKit 会话
     */
    stop() {
        try {
            if (this.session) {
                this.session.stop();
                this.isReady = false;
            }
        } catch (err) {
            console.error('VisionKit stop 失败:', err);
        }
    }

    /**
     * 销毁 VisionKit 会话
     */
    destroy() {
        try {
            if (this.session) {
                this.session.destroy();
                this.session = null;
                this.isReady = false;
            }
        } catch (err) {
            console.error('VisionKit destroy 失败:', err);
            // 即使销毁失败，也重置状态
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
