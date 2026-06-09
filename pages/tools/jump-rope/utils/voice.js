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
