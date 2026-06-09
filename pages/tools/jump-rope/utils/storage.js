// pages/tools/jump-rope/utils/storage.js

/**
 * 数据存储管理
 * 使用 wx.setStorageSync 进行本地数据存储
 */

// 默认设置常量，避免重复定义
const DEFAULT_SETTINGS = {
    weight: 60,
    sensitivity: 'balanced',
    voiceEnabled: true,
    screenAlwaysOn: true
};

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
            return wx.getStorageSync(this.SETTINGS_KEY) || { ...DEFAULT_SETTINGS };
        } catch (err) {
            console.error('获取设置失败:', err);
            return { ...DEFAULT_SETTINGS };
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

            // 创建新对象，不修改传入的 record
            const newRecord = {
                ...record,
                id: this.generateId(),
                timestamp: Date.now()
            };

            // 添加到记录数组开头（最新的在前面）
            records.unshift(newRecord);

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
        // 使用更大的随机数范围（0-999999），降低碰撞概率
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
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
            let invalidCount = 0;

            // 导入记录（自动去重 + 数据验证）
            data.records.forEach(record => {
                // 验证记录结构：必须有 timestamp 且为数字，duration 和 count 也应存在
                if (!record || typeof record.timestamp !== 'number' ||
                    record.duration === undefined || record.count === undefined) {
                    invalidCount++;
                    return;
                }
                if (!existingTimestamps.has(record.timestamp)) {
                    existingRecords.push(record);
                    existingTimestamps.add(record.timestamp);
                    importedCount++;
                } else {
                    skippedCount++;
                }
            });

            // 先按时间戳排序（最新的在前面），再限制数量
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
                skippedCount,
                invalidCount
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
