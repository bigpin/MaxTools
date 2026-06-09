// pages/tools/jump-rope/index.js
// 按照官方 body-detect 示例重构

// ============ 常量 ============
const CALORIES_FACTOR = 0.13;
// 跳跃检测参数
const JUMP_THRESHOLD_RATIO = 0.25;  // 踝-髋距离的比例作为离地阈值
const JUMP_THRESHOLD_MIN = 0.015;   // 阈值下限（防止距离太小时阈值过小）
const MIN_AIR_TIME = 100;           // 最小腾空时间 ms
const MAX_AIR_TIME = 800;           // 最大腾空时间 ms
const MIN_JUMP_INTERVAL = 200;      // 两次跳跃最小间隔 ms
const SMOOTH_WINDOW = 2;            // 滑动窗口平滑帧数（小窗口减少延迟）
const BASELINE_EMA = 0.08;          // 基准线 EMA 系数
const LEG_LENGTH_EMA = 0.05;        // 腿长 EMA 系数（慢跟踪）
const BASELINE_INIT_FRAMES = 10;    // 初始化基准线所需帧数
const CONFIDENCE_THRESHOLD = 0.3;   // 关键点置信度过滤阈值
const VOICE_ANNOUNCE_INTERVAL = 20;
const MAX_RECORDS = 100;

const KEYPOINT_NAMES = [
    'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
    'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
    'leftWrist', 'rightWrist', 'leftHip', 'rightHip',
    'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'
];

// ============ YUV→RGB 着色器（来自官方 yuvBehavior.js） ============
const YUV_VS = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    uniform mat3 displayTransform;
    varying vec2 v_texCoord;
    void main() {
        vec3 p = displayTransform * vec3(a_position, 0);
        gl_Position = vec4(p, 1);
        v_texCoord = a_texCoord;
    }
`;
const YUV_FS = `
    precision highp float;
    uniform sampler2D y_texture;
    uniform sampler2D uv_texture;
    varying vec2 v_texCoord;
    void main() {
        vec4 y_color = texture2D(y_texture, v_texCoord);
        vec4 uv_color = texture2D(uv_texture, v_texCoord);
        float Y = y_color.r;
        float U = uv_color.r - 0.5;
        float V = uv_color.a - 0.5;
        float R = Y + 1.402 * V;
        float G = Y - 0.344 * U - 0.714 * V;
        float B = Y + 1.772 * U;
        gl_FragColor = vec4(R, G, B, 1.0);
    }
`;

// ============ 关键点着色器（来自官方 body-detect.js） ============
const POINT_VS = 'attribute vec4 a_Position;\nvoid main(){\n  gl_Position = a_Position;\n  gl_PointSize = 12.0;\n}\n';
const POINT_FS = '#ifdef GL_ES\n precision mediump float;\n#endif\nvoid main(){\n  float d = distance(gl_PointCoord, vec2(0.5, 0.5));\n  if(d < 0.5) {\n    gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0);\n  } else { discard; }\n}\n';

// ============ 矩形边框着色器（来自官方 body-detect.js） ============
const EDGE_VS = `
    attribute vec2 aPosition;
    varying vec2 posJudge;
    void main(void) {
        gl_Position = vec4(aPosition.x, aPosition.y, 1.0, 1.0);
        posJudge = aPosition;
    }
`;
const EDGE_FS = `
    precision highp float;
    uniform vec2 rightTopPoint;
    uniform vec2 centerPoint;
    varying vec2 posJudge;
    float box(float x, float y){
        float xc = x - centerPoint.x;
        float yc = y - centerPoint.y;
        vec2 point = vec2(xc, yc);
        float right = rightTopPoint.x;
        float top = rightTopPoint.y;
        float line_width = 0.01;
        vec2 b1 = 1.0 - step(vec2(right,top), abs(point));
        float outer = b1.x * b1.y;
        vec2 b2 = 1.0 - step(vec2(right-line_width,top-line_width), abs(point));
        float inner = b2.x * b2.y;
        return outer - inner;
    }
    void main(void) {
        if(box(posJudge.x, posJudge.y) == 0.0) discard;
        gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
    }
`;

Page({
    data: {
        width: 1,
        height: 1,
        cameraPosition: 0, // 0=后置 1=前置
        count: 0,
        countAnim: false,
        duration: '00:00:00',
        calories: '0.00',
        weight: 60,
        isJumping: false,
        state: 'idle',
        startTime: null,
        debugInfo: '等待初始化...'
    },

    onReady() {
        this._lastJumpTime = Date.now();
        this._elapsedSeconds = 0;
        this._timer = null;
        this._session = null;
        this._animating = false;
        this._anchor2DList = [];
        // 双重验证算法状态
        this._wasAirborne = false;
        this._takeoffTime = 0;
        this._yQueue = [];
        this._baseline = undefined;
        this._baselineInitSamples = [];
        this._legLength = undefined;

        this.loadSettings();
        wx.setKeepScreenOn({ keepScreenOn: true });

        wx.createSelectorQuery()
            .select('#webgl')
            .node()
            .exec(res => {
                this.canvas = res[0].node;
                const info = wx.getSystemInfoSync();
                const pixelRatio = info.pixelRatio;
                const width = info.windowWidth;
                const height = info.windowHeight * 0.618;
                this.canvas.width = width * pixelRatio;
                this.canvas.height = height * pixelRatio;
                this.setData({ width, height });

                this.initVKSession();
            });
    },

    onUnload() { this.cleanup(); },
    onHide() { if (this.data.state === 'jumping') this.toggleJumping(); },

    // ============ WebGL 工具方法 ============

    _createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('着色器编译失败:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    },

    _createProgram(gl, vs, fs) {
        const vShader = this._createShader(gl, gl.VERTEX_SHADER, vs);
        const fShader = this._createShader(gl, gl.FRAGMENT_SHADER, fs);
        if (!vShader || !fShader) return null;
        const program = gl.createProgram();
        gl.attachShader(program, vShader);
        gl.attachShader(program, fShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('程序链接失败:', gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    },

    // ============ VKSession 初始化（与官方 behavior.js 一致） ============

    initVKSession() {
        this.destroyVKSession();
        if (!wx.createVKSession) {
            this.setData({ debugInfo: 'VisionKit 不可用' });
            return;
        }

        const gl = this.gl = this.canvas.getContext('webgl');

        // 初始化 YUV 着色器 + VAO（来自 yuvBehavior.js）
        this._initYUVShader(gl);
        // 初始化关键点着色器
        this._pointProgram = this._createProgram(gl, POINT_VS, POINT_FS);
        this._edgeProgram = this._createProgram(gl, EDGE_VS, EDGE_FS);

        console.log('GL 初始化完成, gl=', gl);

        // 与官方 behavior.js 完全一致的 VKSession 配置
        const session = this.session = wx.createVKSession({
            track: {
                plane: { mode: 1 },
                body: { mode: 1 }
            },
            gl: this.gl,
            version: 'v1',
        });

        session.start(err => {
            if (err) {
                console.error('VK error:', err);
                this.setData({ debugInfo: 'VKSession 启动失败: ' + JSON.stringify(err) });
                return;
            }
            console.log('VKSession.version', session.version);
            this.setData({ debugInfo: 'VKSession 已启动，等待人体...' });

            // 监听事件（与官方 behavior.js 一致）
            session.on('addAnchors', anchors => {
                this._anchor2DList = anchors.map(a => ({
                    points: a.points, origin: a.origin, size: a.size
                }));
            });
            session.on('updateAnchors', anchors => {
                this._anchor2DList = anchors.map(a => ({
                    points: a.points, origin: a.origin, size: a.size
                }));
                this._onBodyAnchors(anchors);
            });
            session.on('removeAnchors', () => {
                this._anchor2DList = [];
                this.setData({ debugInfo: '未检测到人体' });
            });

            // 逐帧渲染（与官方 behavior.js 一致）
            const canvas = this.canvas;
            const fps = 30;
            const fpsInterval = 1000 / fps;
            let last = Date.now();
            this._animating = true;

            const onFrame = () => {
                if (!this._animating || !this.session) return;
                const now = Date.now();
                if (now - last > fpsInterval) {
                    last = now - ((now - last) % fpsInterval);
                    try {
                        if (!this._animating || !this.session || !this.gl) return;
                        const frame = session.getVKFrame(canvas.width, canvas.height);
                        if (frame) {
                            this._renderFrame(frame);
                        }
                    } catch (e) {
                        console.warn('render frame error:', e);
                    }
                }
                if (this._animating && this.session && this.gl) {
                    try {
                        session.requestAnimationFrame(onFrame);
                    } catch (e) {
                        console.warn('requestAnimationFrame error:', e);
                    }
                }
            };
            session.requestAnimationFrame(onFrame);
        });
    },

    destroyVKSession() {
        this._animating = false;
        if (this.session) {
            try { this.session.destroy(); } catch (e) {}
            this.session = null;
        }
    },

    // ============ YUV 着色器初始化（来自 yuvBehavior.js） ============

    _initYUVShader(gl) {
        this._yuvProgram = this._createProgram(gl, YUV_VS, YUV_FS);
        if (!this._yuvProgram) return;

        gl.useProgram(this._yuvProgram);
        gl.uniform1i(gl.getUniformLocation(this._yuvProgram, 'y_texture'), 5);
        gl.uniform1i(gl.getUniformLocation(this._yuvProgram, 'uv_texture'), 6);
        this._yuvDT = gl.getUniformLocation(this._yuvProgram, 'displayTransform');

        // 创建顶点缓冲区（不使用 VAO，避免状态管理问题）
        this._yuvPosBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._yuvPosBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, -1, 1, 1, -1, -1, -1]), gl.STATIC_DRAW);

        this._yuvTexBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this._yuvTexBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1, 1, 0, 1, 1, 0, 0, 0]), gl.STATIC_DRAW);

        this._yuvPosAttr = gl.getAttribLocation(this._yuvProgram, 'a_position');
        this._yuvTexAttr = gl.getAttribLocation(this._yuvProgram, 'a_texCoord');
    },

    // ============ 渲染帧（与官方 body-detect.js render 一致） ============

    _renderFrame(frame) {
        const gl = this.gl;
        if (!gl) return;

        try {
            // 1. 渲染 YUV 摄像头画面（来自 yuvBehavior.js renderGL）
            this._renderYUV(gl, frame);

            // 2. 绘制人体关键点（来自 body-detect.js render）
            this._drawBody(gl);
        } catch (e) {
            console.warn('_renderFrame error:', e);
        }
    },

    _renderYUV(gl, frame) {
        if (!this._yuvProgram) return;
        const texResult = frame.getCameraTexture(gl, 'yuv');
        if (!texResult || !texResult.yTexture || !texResult.uvTexture) return;

        const { yTexture, uvTexture } = texResult;
        const displayTransform = frame.getDisplayTransform();

        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(this._yuvProgram);

        // 设置顶点属性（每帧手动绑定，避免 VAO 状态问题）
        gl.bindBuffer(gl.ARRAY_BUFFER, this._yuvPosBuf);
        gl.vertexAttribPointer(this._yuvPosAttr, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this._yuvPosAttr);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._yuvTexBuf);
        gl.vertexAttribPointer(this._yuvTexAttr, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this._yuvTexAttr);

        gl.uniformMatrix3fv(this._yuvDT, false, displayTransform);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

        // Y 纹理 → TEXTURE5, UV 纹理 → TEXTURE6
        gl.activeTexture(gl.TEXTURE0 + 5);
        gl.bindTexture(gl.TEXTURE_2D, yTexture);
        gl.activeTexture(gl.TEXTURE0 + 6);
        gl.bindTexture(gl.TEXTURE_2D, uvTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },

    _drawBody(gl) {
        if (!this._pointProgram || !this._edgeProgram) return;
        const anchor2DList = this._anchor2DList;
        if (!anchor2DList || anchor2DList.length === 0) return;

        try {
            // 绘制关键点（复用缓冲区）
            const flattenPoints = [];
            anchor2DList.forEach(anchor => {
                if (anchor.points) {
                    anchor.points.forEach(point => {
                        flattenPoints.push(point.x * 2 - 1, 1 - point.y * 2);
                    });
                }
            });

            if (flattenPoints.length > 0) {
                gl.useProgram(this._pointProgram);

                if (!this._pointBuf) this._pointBuf = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this._pointBuf);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(flattenPoints), gl.DYNAMIC_DRAW);

                const aPos = gl.getAttribLocation(this._pointProgram, 'a_Position');
                gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(aPos);

                gl.drawArrays(gl.POINTS, 0, flattenPoints.length / 2);
            }

            // 绘制边框（复用缓冲区）
            gl.useProgram(this._edgeProgram);
            if (!this._edgeBuf) this._edgeBuf = gl.createBuffer();
            if (!this._edgeAttr) this._edgeAttr = gl.getAttribLocation(this._edgeProgram, 'aPosition');

            for (let i = 0; i < anchor2DList.length; i++) {
                const a = anchor2DList[i];
                if (a.origin && a.size) {
                    this._drawRectEdge(gl, a.origin.x, a.origin.y, a.size.width, a.size.height);
                }
            }
        } catch (e) {
            console.warn('_drawBody error:', e);
        }
    },

    _drawRectEdge(gl, x, y, width, height) {
        const centerX = x * 2 - 1 + width;
        const centerY = -1 * (y * 2 - 1) - height;

        gl.bindBuffer(gl.ARRAY_BUFFER, this._edgeBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.DYNAMIC_DRAW);

        gl.vertexAttribPointer(this._edgeAttr, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this._edgeAttr);

        gl.uniform2fv(gl.getUniformLocation(this._edgeProgram, 'rightTopPoint'), [width, height]);
        gl.uniform2fv(gl.getUniformLocation(this._edgeProgram, 'centerPoint'), [centerX, centerY]);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },

    // ============ 人体检测回调 ============

    _onBodyAnchors(anchors) {
        if (!anchors || anchors.length === 0) {
            this.setData({ debugInfo: '未检测到人体' });
            return;
        }

        try {
            const anchor = anchors[0];
            const isJumping = this.data.state === 'jumping';

            const keypoints = this._parseKeypoints(anchor);
            if (keypoints) {
                // 只在运动中输出日志
                if (isJumping) {
                    const parts = [];
                    if (keypoints.leftAnkle && keypoints.rightAnkle) {
                        const ay = (Number(keypoints.leftAnkle.y) + Number(keypoints.rightAnkle.y)) / 2;
                        parts.push(`踝Y${ay.toFixed(3)}`);
                    }
                    if (keypoints.leftHip && keypoints.rightHip) {
                        const hy = (Number(keypoints.leftHip.y) + Number(keypoints.rightHip.y)) / 2;
                        parts.push(`臀Y${hy.toFixed(3)}`);
                    }
                    if (this._baseline !== undefined) {
                        parts.push(`基线${this._baseline.toFixed(3)}`);
                    }
                    if (keypoints.leftHip && keypoints.leftKnee && keypoints.leftAnkle) {
                        const angle = this._getKneeAngle(keypoints.leftHip, keypoints.leftKnee, keypoints.leftAnkle);
                        parts.push(`膝角${angle.toFixed(0)}°`);
                    }
                    parts.push(this._wasAirborne ? '⬆腾空' : '●站立');
                    this.setData({ debugInfo: parts.join(' ') });
                }

                this._processBody(anchor);
            }
        } catch (e) {
            console.warn('_onBodyAnchors error:', e);
        }
    },

    _parseKeypoints(anchor) {
        if (!anchor || !anchor.points || !Array.isArray(anchor.points)) return null;
        const kps = {};
        anchor.points.forEach((pt, i) => {
            if (i < KEYPOINT_NAMES.length) {
                kps[KEYPOINT_NAMES[i]] = {
                    x: typeof pt.x === 'number' ? pt.x : parseFloat(pt.x) || 0,
                    y: typeof pt.y === 'number' ? pt.y : parseFloat(pt.y) || 0,
                    z: typeof pt.z === 'number' ? pt.z : parseFloat(pt.z) || 0
                };
            }
        });
        return kps;
    },

    // ============ 跳跃检测（双重验证：踝关节位移 + 膝关节角度） ============

    /**
     * 获取关键点坐标，过滤低置信度点
     */
    _getKeypoint(anchor, index) {
        if (!anchor || !anchor.points || index >= anchor.points.length) return null;
        const pt = anchor.points[index];
        if (!pt) return null;
        // 如果有 score 属性且低于阈值，丢弃
        if (pt.score !== undefined && pt.score < CONFIDENCE_THRESHOLD) return null;
        const x = typeof pt.x === 'number' ? pt.x : parseFloat(pt.x) || 0;
        const y = typeof pt.y === 'number' ? pt.y : parseFloat(pt.y) || 0;
        // 过滤 VKSession 哨兵值（如 -0.2417）
        if (y < -0.2 || y > 1.0) return null;
        return { x, y };
    },

    /**
     * 计算膝关节弯曲角度（髋-膝-踝 三点角度）
     */
    _getKneeAngle(hip, knee, ankle) {
        if (!hip || !knee || !ankle) return 180; // 默认伸直
        const v1 = { x: hip.x - knee.x, y: hip.y - knee.y };
        const v2 = { x: ankle.x - knee.x, y: ankle.y - knee.y };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag = Math.sqrt(v1.x ** 2 + v1.y ** 2) * Math.sqrt(v2.x ** 2 + v2.y ** 2);
        if (mag === 0) return 180;
        return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180 / Math.PI;
    },

    /**
     * 滑动窗口平滑
     */
    _smoothAvg(queue, value, maxLen) {
        queue.push(value);
        if (queue.length > maxLen) queue.shift();
        return queue.reduce((a, b) => a + b, 0) / queue.length;
    },

    _processBody(anchor) {
        if (this.data.state !== 'jumping') return;
        const now = Date.now();

        // 获取关键点（按 VKSession 索引）
        const leftAnkle = this._getKeypoint(anchor, 15);   // 左踝
        const rightAnkle = this._getKeypoint(anchor, 16);  // 右踝
        const leftHip = this._getKeypoint(anchor, 11);     // 左髋
        const rightHip = this._getKeypoint(anchor, 12);    // 右髋

        // 计算踝关节中点 Y（优先用踝关节，不可用时降级到髋关节）
        let primaryY = null;
        let useAnkle = false;

        if (leftAnkle && rightAnkle) {
            primaryY = (leftAnkle.y + rightAnkle.y) / 2;
            useAnkle = true;
        } else if (leftHip && rightHip) {
            primaryY = (leftHip.y + rightHip.y) / 2;
            useAnkle = false;
        } else {
            return; // 关键点不足，跳过
        }

        // 过滤 VKSession 哨兵值（-0.2417 等异常固定值）
        if (primaryY < -0.2 || primaryY > 1.0) return;

        // 滑动窗口平滑
        this._yQueue = this._yQueue || [];
        const smoothedY = this._smoothAvg(this._yQueue, primaryY, SMOOTH_WINDOW);

        // 自适应阈值：用踝-髋距离作为身体尺度参考
        let legLen = this._legLength;
        if (useAnkle && leftAnkle && leftHip) {
            const rawLen = Math.abs(leftAnkle.y - leftHip.y);
            if (rawLen > 0.01) {
                legLen = this._legLength === undefined
                    ? rawLen
                    : this._legLength * (1 - LEG_LENGTH_EMA) + rawLen * LEG_LENGTH_EMA;
                this._legLength = legLen;
            }
        }
        const jumpThreshold = legLen
            ? Math.max(legLen * JUMP_THRESHOLD_RATIO, JUMP_THRESHOLD_MIN)
            : JUMP_THRESHOLD_MIN;

        // 基准线：先收集几帧样本确定初始值，之后站立时用 EMA 更新
        if (this._baseline === undefined) {
            if (!this._baselineInitSamples) this._baselineInitSamples = [];
            this._baselineInitSamples.push(smoothedY);
            if (this._baselineInitSamples.length >= BASELINE_INIT_FRAMES) {
                const avg = this._baselineInitSamples.reduce((a, b) => a + b, 0) / this._baselineInitSamples.length;
                this._baseline = avg;
                console.log('[Baseline] 初始化完成:', avg.toFixed(4), '样本数:', this._baselineInitSamples.length);
            }
            return; // 基准线未就绪，不检测
        } else if (!this._wasAirborne) {
            // 站立时正常 EMA 更新（已过滤哨兵值，不会有异常数据）
            this._baseline = this._baseline * (1 - BASELINE_EMA) + smoothedY * BASELINE_EMA;
        }

        // 离地判定（基于自适应阈值）
        const delta = this._baseline - smoothedY;
        const isAbove = delta > jumpThreshold;
        const isAirborne = isAbove;

        // 调试日志（每10帧打印一次）
        if (this._logCount === undefined) this._logCount = 0;
        this._logCount++;
        if (this._logCount % 10 === 0) {
            console.log('[JumpDetect]', JSON.stringify({
                useAnkle,
                primaryY: primaryY.toFixed(4),
                smoothedY: smoothedY.toFixed(4),
                baseline: this._baseline.toFixed(4),
                delta: delta.toFixed(4),
                threshold: jumpThreshold.toFixed(4),
                legLen: legLen ? legLen.toFixed(4) : 'N/A',
                isAirborne,
                wasAirborne: this._wasAirborne
            }));
        }

        this._onAirborneChange(isAirborne, now);
    },

    _onAirborneChange(isAirborne, now) {
        const wasAirborne = this._wasAirborne || false;

        // 从离地到落地 = 完成一次跳跃
        if (wasAirborne && !isAirborne) {
            const airTime = now - this._takeoffTime;
            const timeSinceLastJump = now - this._lastJumpTime;

            // 过滤噪声：有效腾空时间 + 最小间隔
            if (airTime > MIN_AIR_TIME && airTime < MAX_AIR_TIME && timeSinceLastJump > MIN_JUMP_INTERVAL) {
                const newCount = this.data.count + 1;
                this._lastJumpTime = now;
                this.setData({ count: newCount, countAnim: true });
                this._updateCalories();
                console.log('[JumpCount]', newCount, 'airTime:', airTime + 'ms');
                if (newCount % VOICE_ANNOUNCE_INTERVAL === 0) this.speak(`已跳${newCount}次`);
                // 动画结束后重置
                setTimeout(() => this.setData({ countAnim: false }), 400);
            } else {
                console.log('[JumpRejected]', 'airTime:', airTime + 'ms', 'interval:', timeSinceLastJump + 'ms');
            }
        }

        // 从落地到离地 = 起跳
        if (!wasAirborne && isAirborne) {
            this._takeoffTime = now;
        }

        this._wasAirborne = isAirborne;
    },

    // ============ 切换摄像头 ============

    switchCamera() {
        if (!this.session || !this.session.config) return;
        const pos = this.data.cameraPosition === 0 ? 1 : 0;
        const config = this.session.config;
        config.cameraPosition = pos;
        this.session.config = config;
        this.setData({ cameraPosition: pos });
        console.log('切换摄像头:', pos === 0 ? '后置' : '前置');
    },

    // ============ 计时器 ============

    _startTimer() {
        const startTime = Date.now();
        const accumulated = this._elapsedSeconds || 0;
        this.setData({ startTime });
        this._timer = setInterval(() => {
            const elapsed = accumulated + Math.floor((Date.now() - startTime) / 1000);
            this._elapsedSeconds = elapsed;
            const h = Math.floor(elapsed / 3600);
            const m = Math.floor((elapsed % 3600) / 60);
            const s = elapsed % 60;
            this.setData({
                duration: [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
            });
        }, 1000);
    },

    _stopTimer() {
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
    },

    _updateCalories() {
        const minutes = (this._elapsedSeconds || 0) / 60;
        this.setData({ calories: (this.data.weight * minutes * CALORIES_FACTOR).toFixed(2) });
    },

    // ============ 运动控制 ============

    toggleJumping() {
        const { state } = this.data;
        if (state === 'idle' || state === 'paused') {
            this.setData({ state: 'jumping', isJumping: true });
            this._startTimer();
            this.speak(state === 'idle' ? '开始跳绳' : '继续');
        } else if (state === 'jumping') {
            this.setData({ state: 'paused', isJumping: false });
            this._stopTimer();
            this.speak('暂停');
        }
    },

    stopJumping() {
        if (this.data.count === 0) {
            wx.showToast({ title: '还没有跳绳记录', icon: 'none' });
            return;
        }
        this._stopTimer();
        const dur = this._elapsedSeconds || 0;
        this.speak(`运动结束，共跳${this.data.count}次，时长${this._fmtDur(dur)}，消耗${this.data.calories}千卡`);
        this._saveRecord();
        this._elapsedSeconds = 0;
        this._lastJumpTime = Date.now();
        // 重置双重验证状态
        this._wasAirborne = false;
        this._takeoffTime = 0;
        this._yQueue = [];
        this._baseline = undefined;
        this._baselineInitSamples = [];
        this._legLength = undefined;
        this.setData({ state: 'idle', isJumping: false, count: 0, duration: '00:00:00', calories: '0.00', startTime: null });
    },

    // ============ 数据管理 ============

    _saveRecord() {
        const { count, calories, weight, startTime } = this.data;
        const now = new Date(startTime || Date.now());
        const record = {
            id: 'jump_' + this._fmtDate(now, '') + '_' + this._fmtTime(now, ''),
            date: this._fmtDate(now, '-'),
            startTime: this._fmtTime(startTime ? new Date(startTime) : now, ':'),
            endTime: this._fmtTime(new Date(), ':'),
            duration: this._elapsedSeconds || 0,
            durationText: this.data.duration,
            count, calories: parseFloat(calories), weight,
            timestamp: Date.now()
        };
        const records = wx.getStorageSync('jumpRopeRecords') || [];
        records.unshift(record);
        if (records.length > MAX_RECORDS) records.splice(MAX_RECORDS);
        wx.setStorageSync('jumpRopeRecords', records);
        wx.showToast({ title: '记录已保存', icon: 'success' });
    },

    _fmtDate(d, s) {
        return [d.getFullYear(), (d.getMonth()+1).toString().padStart(2,'0'), d.getDate().toString().padStart(2,'0')].join(s);
    },
    _fmtTime(d, s) {
        return [d.getHours(), d.getMinutes(), d.getSeconds()].map(v => v.toString().padStart(2,'0')).join(s);
    },
    _fmtDur(sec) {
        const m = Math.floor(sec / 60), s = sec % 60;
        return m > 0 ? `${m}分${s}秒` : `${s}秒`;
    },

    // ============ 用户交互 ============

    showWeightModal() {
        wx.showModal({
            title: '设置体重', editable: true, placeholderText: '请输入体重(kg)',
            content: this.data.weight.toString(),
            success: (res) => {
                if (res.confirm && res.content) {
                    const w = parseFloat(res.content);
                    if (isNaN(w) || w <= 0 || w > 300) { wx.showToast({ title: '请输入有效体重', icon: 'none' }); return; }
                    this.setData({ weight: w });
                    wx.setStorageSync('jumpRopeSettings', { weight: w });
                    wx.showToast({ title: '体重已更新', icon: 'success' });
                }
            }
        });
    },

    goToHistory() {
        wx.navigateTo({ url: '/pages/tools/jump-rope/history/index' });
    },

    // ============ 设置 ============

    loadSettings() {
        const s = wx.getStorageSync('jumpRopeSettings') || {};
        this.setData({ weight: s.weight || 60 });
    },

    // ============ 语音 ============

    speak(text) {
        try {
            const plugin = typeof requirePlugin === 'function' && requirePlugin('WechatSI');
            if (plugin) { plugin.textToSpeech({ lang: 'zh_CN', tts: true }).speak({ content: text }); }
            else { wx.vibrateShort({ type: 'medium' }); }
        } catch (e) { try { wx.vibrateShort({ type: 'medium' }); } catch (_) {} }
    },

    // ============ 清理 ============

    cleanup() {
        this._stopTimer();
        this._animating = false;
        this.destroyVKSession();
        if (this.gl) {
            try {
                if (this._yuvProgram) this.gl.deleteProgram(this._yuvProgram);
                if (this._pointProgram) this.gl.deleteProgram(this._pointProgram);
                if (this._edgeProgram) this.gl.deleteProgram(this._edgeProgram);
                if (this._yuvPosBuf) this.gl.deleteBuffer(this._yuvPosBuf);
                if (this._yuvTexBuf) this.gl.deleteBuffer(this._yuvTexBuf);
                if (this._pointBuf) this.gl.deleteBuffer(this._pointBuf);
                if (this._edgeBuf) this.gl.deleteBuffer(this._edgeBuf);
            } catch (e) {
                console.warn('GL cleanup error:', e);
            }
            this.gl = null;
        }
        this._yuvProgram = null;
        this._pointProgram = null;
        this._edgeProgram = null;
        this._yuvPosBuf = null;
        this._yuvTexBuf = null;
        this._pointBuf = null;
        this._edgeBuf = null;
        this._edgeAttr = null;
        wx.setKeepScreenOn({ keepScreenOn: false });
    }
});
