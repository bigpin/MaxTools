// pages/tools/currency-exchange/index.js
const { CONFIG } = require('../../../utils/config');
// F2 库引入（如果未安装则使用原生 canvas）
let F2 = null;
try {
    F2 = require('@antv/f2');
} catch (e) {
    console.warn('F2 库未安装，将使用原生 canvas 绘制图表');
}

Page({
    data: {
        exchangeCache: {},
        loading: false,
        chartLoading: false, // 仅历史汇率图表加载，不占用顶部大 loading
        fromCode: 'USD',
        toCode: 'CNY',
        resultText: '',
        resultData: null,
        amount: '',
        convertedAmount: '',
        queryDate: '', // 历史汇率查询日期，空字符串表示最新汇率
        isHistorical: false,
        maxDate: '',
        dateRangeType: 'latest', // latest, 7d, 30d, 90d, custom
        chartData: [] // 图表数据
    },

    // 货币中文名称映射
    currencyNames: {
        'EUR': '欧元',
        'USD': '美元',
        'GBP': '英镑',
        'JPY': '日元',
        'AUD': '澳大利亚元',
        'CAD': '加拿大元',
        'CHF': '瑞士法郎',
        'CNY': '人民币',
        'CZK': '捷克克朗',
        'DKK': '丹麦克朗',
        'HKD': '港币',
        'HUF': '匈牙利福林',
        'INR': '印度卢比',
        'IDR': '印尼盾',
        'KRW': '韩元',
        'MXN': '墨西哥比索',
        'MYR': '马来西亚林吉特',
        'NOK': '挪威克朗',
        'NZD': '新西兰元',
        'PHP': '菲律宾比索',
        'PLN': '波兰兹罗提',
        'RUB': '俄罗斯卢布',
        'SGD': '新加坡元',
        'SEK': '瑞典克朗',
        'THB': '泰国铢',
        'TRY': '土耳其里拉',
        'ZAR': '南非兰特'
    },

    // 获取货币中文名称
    getCurrencyName(code) {
        return this.currencyNames[code] || code;
    },

    onLoad() {
        // 初始化，设置最大日期为今天
        const today = new Date();
        const maxDate = today.toISOString().split('T')[0];
        this.setData({
            maxDate: maxDate
        });
        
        // 恢复上次保存的选项（在 area 组件初始化之前）
        this.restoreLastOptions();
    },

    onReady() {
        // 同步币种选择组件的显示为当前 fromCode/toCode
        const areaComponent = this.selectComponent('#exchangeSetting');
        if (areaComponent) {
            // 如果已经恢复了选项，使用恢复的值；否则使用默认值
            const fromCode = this.data.fromCode || 'USD';
            const toCode = this.data.toCode || 'CNY';
            
            // 先设置组件的数据，但不触发事件
            areaComponent.setData({
                dateValue: [fromCode, toCode],
                dateText: `${fromCode} → ${toCode}`
            });
            
            // 确保数据同步
            this.setData({
                fromCode: fromCode,
                toCode: toCode
            });
            
            // 在组件同步后，加载并显示汇率（不通过 exchange 事件，直接调用）
            this.loadAndDisplayExchangeRate();
        } else {
            // 如果组件还没准备好，延迟加载
            setTimeout(() => {
                this.loadAndDisplayExchangeRate();
            }, 100);
        }
    },

    onUnload() {
        // 保存当前选项到本地存储
        this.saveCurrentOptions();
    },

    // 保存当前选项
    saveCurrentOptions() {
        try {
            const options = {
                fromCode: this.data.fromCode,
                toCode: this.data.toCode,
                amount: this.data.amount,
                dateRangeType: this.data.dateRangeType,
                timestamp: Date.now()
            };
            wx.setStorageSync('currency_exchange_options', options);
        } catch (e) {
            console.error('保存选项失败:', e);
        }
    },

    // 恢复上次保存的选项
    restoreLastOptions() {
        try {
            const savedOptions = wx.getStorageSync('currency_exchange_options');
            if (savedOptions) {
                // 检查是否过期（7天内有效）
                const expireTime = 7 * 24 * 60 * 60 * 1000; // 7天
                const now = Date.now();
                if (now - savedOptions.timestamp < expireTime) {
                    console.log('恢复保存的选项:', savedOptions);
                    // 恢复选项（不更新 area 组件，因为可能还没初始化，在 onReady 中处理）
                    this.setData({
                        fromCode: savedOptions.fromCode || 'USD',
                        toCode: savedOptions.toCode || 'CNY',
                        amount: savedOptions.amount || '',
                        dateRangeType: savedOptions.dateRangeType || 'latest'
                    });
                } else {
                    // 过期了，清除
                    console.log('保存的选项已过期，清除');
                    wx.removeStorageSync('currency_exchange_options');
                }
            } else {
                console.log('没有保存的选项，使用默认值');
            }
        } catch (e) {
            console.error('恢复选项失败:', e);
        }
    },

    // 加载并显示汇率（优先使用缓存）
    async loadAndDisplayExchangeRate() {
        const fromCode = this.data.fromCode;
        const toCode = this.data.toCode;
        const dateRangeType = this.data.dateRangeType;
        
        // 如果选择了历史日期范围，加载历史数据
        if (dateRangeType && dateRangeType !== 'latest' && (dateRangeType === '7d' || dateRangeType === '30d' || dateRangeType === '90d')) {
            const today = new Date();
            let startDate = '';
            if (dateRangeType === '7d') {
                const date = new Date(today);
                date.setDate(date.getDate() - 7);
                startDate = date.toISOString().split('T')[0];
            } else if (dateRangeType === '30d') {
                const date = new Date(today);
                date.setDate(date.getDate() - 30);
                startDate = date.toISOString().split('T')[0];
            } else if (dateRangeType === '90d') {
                const date = new Date(today);
                date.setDate(date.getDate() - 90);
                startDate = date.toISOString().split('T')[0];
            }
            if (startDate) {
                this.setData({ loading: true });
                try {
                    await this.fetchHistoricalRates(fromCode, toCode, startDate, today.toISOString().split('T')[0]);
                } catch (err) {
                    console.error('获取历史汇率失败:', err);
                } finally {
                    this.setData({ loading: false });
                }
                return;
            }
        }
        
        // 否则加载最新汇率
        const key = `${fromCode}${toCode}`;
        
        // 先检查缓存，如果有缓存立即显示
        let hasCachedData = false;
        if (this.checkExchangeCache(key)) {
            try {
                let cachedData = this.data.exchangeCache[key];
                if (!cachedData) {
                    cachedData = wx.getStorageSync(`exchange_${key}`);
                    if (cachedData) {
                        // 加载到内存缓存
                        this.data.exchangeCache[key] = cachedData;
                    }
                }
                if (cachedData) {
                    // 立即显示缓存数据
                    this.formatExchangeText(cachedData, fromCode, toCode);
                    // 如果有输入金额，计算转换金额
                    if (this.data.amount && !isNaN(parseFloat(this.data.amount))) {
                        const amount = parseFloat(this.data.amount);
                        const convertedAmount = (amount * cachedData.rate).toFixed(2);
                        this.setData({ convertedAmount: convertedAmount });
                    }
                    hasCachedData = true;
                }
            } catch (e) {
                console.error('读取缓存失败:', e);
            }
        }
        
        // 无论是否有缓存，都尝试获取最新汇率
        // 如果没有缓存，显示加载状态
        if (!hasCachedData) {
            this.setData({ loading: true });
        }
        
        try {
            await this.fetchExchangeRate(fromCode, toCode);
        } catch (err) {
            console.error('获取最新汇率失败:', err);
            // 如果获取失败但已有缓存数据，不影响显示
            if (!hasCachedData) {
                wx.showToast({
                    title: '获取汇率失败',
                    icon: 'none'
                });
            }
        } finally {
            this.setData({ loading: false });
        }
    },

    // 汇率转换（币种选择后自动查询）
    async exchangeChanged(e) {
        const { from_code, to_code } = e.detail;
        
        // 先清空现有结果显示，避免显示旧数据
        this.setData({
            fromCode: from_code,
            toCode: to_code,
            resultData: null,
            convertedAmount: '',
            chartData: [],
            selectedHistoryRate: null,
            selectedHistoryDate: null,
            resultText: '',
            loading: true,
            chartLoading: false
        });

        // 保存选项
        this.saveCurrentOptions();

        try {
            // 自动查询最新汇率
            if (this.data.dateRangeType === 'latest' || !this.data.dateRangeType) {
                await this.fetchExchangeRate(from_code, to_code);
            } else {
                // 如果有选择历史日期范围，重新获取历史数据
                const today = new Date();
                let startDate = '';
                if (this.data.dateRangeType === '7d') {
                    const date = new Date(today);
                    date.setDate(date.getDate() - 7);
                    startDate = date.toISOString().split('T')[0];
                } else if (this.data.dateRangeType === '30d') {
                    const date = new Date(today);
                    date.setDate(date.getDate() - 30);
                    startDate = date.toISOString().split('T')[0];
                } else if (this.data.dateRangeType === '90d') {
                    const date = new Date(today);
                    date.setDate(date.getDate() - 90);
                    startDate = date.toISOString().split('T')[0];
                }
                if (startDate) {
                    await this.fetchHistoricalRates(from_code, to_code, startDate, today.toISOString().split('T')[0]);
                } else {
                    // 如果没有有效的日期范围，关闭loading
                    this.setData({ loading: false });
                }
            }
        } catch (error) {
            console.error('exchangeChanged 错误:', error);
            // 确保在出错时也关闭loading
            this.setData({ loading: false });
        }
    },

    // 获取汇率数据
    async fetchExchangeRate(from_code, to_code, date = '') {
        const key = `${from_code}${to_code}`;
        const queryDate = date || this.data.queryDate;

        try {
            // 如果loading已经是true（从exchangeChanged设置），就不重复设置
            if (!this.data.loading) {
                this.setData({ loading: true });
            }
            const exchangeData = await this.getExchangeRate(from_code, to_code, key, queryDate);
            const displayText = this.formatExchangeText(exchangeData, from_code, to_code);
            
            // 如果有输入金额，计算转换后的金额
            let convertedAmount = '';
            if (this.data.amount && !isNaN(parseFloat(this.data.amount))) {
                const amount = parseFloat(this.data.amount);
                convertedAmount = (amount * exchangeData.rate).toFixed(2);
            }
            
            // 如果有输入金额，重新计算转换金额
            let finalConvertedAmount = convertedAmount;
            if (this.data.amount && !isNaN(parseFloat(this.data.amount))) {
                const amount = parseFloat(this.data.amount);
                finalConvertedAmount = (amount * exchangeData.rate).toFixed(2);
            }
            
            // 格式化汇率和日期用于趋势图右侧显示
            const rateStr = parseFloat(exchangeData.rate).toFixed(6);
            const dateStr = exchangeData.date || new Date().toISOString().split('T')[0];
            
            this.setData({
                resultText: displayText,
                convertedAmount: finalConvertedAmount,
                chartData: [], // 单日查询不显示图表
                // 设置当前汇率用于显示（如果有历史图表，会显示在右侧）
                selectedHistoryRate: rateStr,
                selectedHistoryDate: dateStr,
                loading: false
            });
        } catch (error) {
            const errorText = `获取汇率信息失败：${error.message}`;
            this.setData({
                resultText: errorText,
                resultData: null,
                convertedAmount: '',
                chartData: [],
                loading: false
            });
            console.error('获取汇率信息失败：', error);
            wx.showToast({
                title: '获取汇率失败',
                icon: 'none'
            });
        }
    },

    // 获取汇率
    async getExchangeRate(from_code, to_code, key, date = '') {
        // 检查缓存（历史汇率也使用缓存，但缓存时间更短）
        const cacheKey = date ? `${key}_${date}` : key;
        
        // 优先从内存缓存读取
        let cachedData = this.data.exchangeCache[cacheKey];
        if (!cachedData) {
            // 从本地存储读取
            try {
                cachedData = wx.getStorageSync(`exchange_${cacheKey}`);
                if (cachedData) {
                    // 检查缓存是否有效
                    if (this.checkExchangeCache(cacheKey)) {
                        // 加载到内存缓存
                        this.data.exchangeCache[cacheKey] = cachedData;
                        return cachedData;
                    } else {
                        // 缓存过期，清除
                        wx.removeStorageSync(`exchange_${cacheKey}`);
                    }
                }
            } catch (e) {
                console.error('读取缓存失败:', e);
            }
        } else {
            // 内存缓存存在，检查是否有效
            if (this.checkExchangeCache(cacheKey)) {
                return cachedData;
            } else {
                // 缓存过期，清除
                delete this.data.exchangeCache[cacheKey];
                try {
                    wx.removeStorageSync(`exchange_${cacheKey}`);
                } catch (e) {
                    console.error('清除缓存失败:', e);
                }
            }
        }

        // 获取新数据
        this.setData({ loading: true });
        try {
            // 构建URL：历史汇率使用 /YYYY-MM-DD，最新汇率使用 /latest
            let url = '';
            if (date) {
                url = `https://api.frankfurter.app/${date}?from=${from_code}&to=${to_code}`;
            } else {
                url = `${CONFIG.EXCHANGE_API_URL}?from=${from_code}&to=${to_code}`;
            }

            // 使用 Promise 包装 wx.request
            const res = await new Promise((resolve, reject) => {
                wx.request({
                    url: url,
                    method: 'GET',
                    header: {
                        'Content-Type': 'application/json'
                    },
                    success: (res) => {
                        console.log('API请求成功:', res);
                        resolve(res);
                    },
                    fail: (err) => {
                        console.error('API请求失败:', err);
                        reject(err);
                    }
                });
            });

            console.log('API响应对象:', res);
            console.log('响应状态码:', res.statusCode);
            console.log('响应数据:', res.data);
            console.log('响应类型:', typeof res);

            // 检查响应状态
            if (!res) {
                throw new Error('网络请求失败，请检查网络连接');
            }

            // 检查状态码
            if (res.statusCode && res.statusCode !== 200) {
                throw new Error(`API请求失败，状态码：${res.statusCode}`);
            }

            // 检查响应数据
            if (!res.data) {
                console.error('响应数据为空，完整响应对象:', JSON.stringify(res, null, 2));
                throw new Error('API响应数据为空，请检查网络连接或稍后重试');
            }

            // 检查是否有错误信息
            if (res.data.error) {
                throw new Error(res.data.error || 'API返回错误');
            }

            // 检查rates字段
            if (!res.data.rates) {
                console.error('响应数据:', res.data);
                // 如果返回了错误信息，使用错误信息
                if (res.data.message) {
                    throw new Error(res.data.message);
                }
                throw new Error('汇率数据格式错误');
            }

            if (!res.data.rates[to_code]) {
                console.error('响应数据:', res.data);
                throw new Error(`目标货币 ${to_code} 不支持，请查看支持的货币列表`);
            }

            // 格式化数据以适配原有逻辑
            const exchangeRate = res.data.rates[to_code];
            const exchangeRateData = {
                base: res.data.base,
                target: to_code,
                rate: exchangeRate,
                date: res.data.date,
                amount: res.data.amount || 1.0
            };

            // 更新缓存（最新汇率和历史汇率都缓存）
            this.updateExchangeCache(cacheKey, exchangeRateData);
            return exchangeRateData;
        } catch (error) {
            console.error('获取汇率失败:', error);
            console.error('错误详情:', {
                message: error.message,
                errMsg: error.errMsg,
                statusCode: error.statusCode,
                error: error
            });
            
            // 微信小程序特有的错误信息（fail 回调中的错误）
            if (error.errMsg) {
                if (error.errMsg.includes('fail') || error.errMsg.includes('timeout')) {
                    throw new Error(`网络请求失败：${error.errMsg}，请检查网络连接`);
                }
                throw new Error(error.errMsg);
            }
            
            // 如果是我们抛出的错误，直接抛出
            if (error.message) {
                throw error;
            }
            
            // 其他错误统一处理
            throw new Error('网络请求失败，请检查网络连接');
        } finally {
            this.setData({ loading: false });
        }
    },

    // 检查缓存（优先使用本地存储）
    checkExchangeCache(key) {
        // 先检查内存缓存
        const cachedData = this.data.exchangeCache[key];
        if (cachedData) {
            const cacheTime = new Date(cachedData.date + 'T00:00:00');
            const now = new Date();
            // 判断是历史汇率还是最新汇率，历史汇率缓存24小时，最新汇率缓存30分钟
            const isHistorical = key.includes('_') && key.split('_').length > 2;
            const cacheTimeLimit = isHistorical ? 24 * 60 * 60 * 1000 : CONFIG.CACHE_EXPIRE_TIME;
            if ((now - cacheTime) < cacheTimeLimit) {
                return true;
            }
        }
        
        // 检查本地存储缓存
        try {
            const storageKey = `exchange_${key}`;
            const storedData = wx.getStorageSync(storageKey);
            if (storedData) {
                const cacheTime = new Date(storedData.date + 'T00:00:00');
                const now = new Date();
                // 判断是历史汇率还是最新汇率
                const isHistorical = key.includes('_') && key.split('_').length > 2;
                const cacheTimeLimit = isHistorical ? 24 * 60 * 60 * 1000 : CONFIG.CACHE_EXPIRE_TIME;
                if ((now - cacheTime) < cacheTimeLimit) {
                    // 将本地缓存加载到内存
                    this.data.exchangeCache[key] = storedData;
                    return true;
                } else {
                    // 缓存过期，清除本地存储
                    wx.removeStorageSync(storageKey);
                }
            }
        } catch (e) {
            console.error('读取本地缓存失败:', e);
        }
        
        return false;
    },

    // 更新缓存（同时更新内存和本地存储）
    updateExchangeCache(key, data) {
        // 更新内存缓存
        const exchangeCache = { ...this.data.exchangeCache };
        exchangeCache[key] = data;
        this.setData({ exchangeCache });
        
        // 更新本地存储
        try {
            const storageKey = `exchange_${key}`;
            wx.setStorageSync(storageKey, data);
        } catch (e) {
            console.error('保存本地缓存失败:', e);
        }
    },

    // 格式化汇率文本
    formatExchangeText(exchangeData, from_code, to_code) {
        const { rate, date } = exchangeData;
        
        // 获取货币中文名称
        const fromName = this.getCurrencyName(from_code);
        const toName = this.getCurrencyName(to_code);
        
        // 格式化显示数据
        const formattedExchange = `1 ${from_code}(${fromName}) = ${parseFloat(rate).toFixed(4)} ${to_code}(${toName})`;
        const formattedExchangeRate = parseFloat(rate).toFixed(6);
        
        // 格式化日期显示
        const formattedDate = date || new Date().toISOString().split('T')[0];
        
        // 格式化标题：汇率 + 更新日期
        const titleText = `汇率：${formattedExchangeRate} | 更新日期：${formattedDate}`;
        
        this.setData({
            resultData: {
                formattedExchange: formattedExchange,
                exchangeRate: formattedExchangeRate,
                fromCurrency: `${from_code}(${fromName})`,
                toCurrency: `${to_code}(${toName})`,
                updateTime: formattedDate,
                titleText: titleText,
                isHistorical: this.data.isHistorical
            }
        });
        
        return `1 ${from_code}(${fromName}) = ${rate} ${to_code}(${toName})\n更新时间：${formattedDate}`;
    },

    // 金额输入变化
    onAmountInput(e) {
        const value = e.detail.value || '';
        // 允许数字和小数点
        const isNumber = /^\d*\.?\d*$/.test(value);
        
        if (isNumber || value === '') {
            this.setData({
                amount: value
            });
            
            // 保存选项（延迟保存，避免频繁写入）
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
            }
            this.saveTimer = setTimeout(() => {
                this.saveCurrentOptions();
            }, 500);
            
            // 如果有汇率数据，立即计算转换金额
            if (value && this.data.resultData) {
                const amount = parseFloat(value);
                if (!isNaN(amount)) {
                    const rate = parseFloat(this.data.resultData.exchangeRate);
                    const convertedAmount = (amount * rate).toFixed(2);
                    this.setData({
                        convertedAmount: convertedAmount
                    });
                }
            } else if (value === '') {
                this.setData({
                    convertedAmount: ''
                });
            }
        }
    },

    // 快捷日期选择
    onQuickDateSelect(e) {
        const type = e.currentTarget.dataset.type;
        const today = new Date();
        let startDate = '';
        let endDate = today.toISOString().split('T')[0];
        
        if (type === '7d') {
            const date = new Date(today);
            date.setDate(date.getDate() - 7);
            startDate = date.toISOString().split('T')[0];
        } else if (type === '30d') {
            const date = new Date(today);
            date.setDate(date.getDate() - 30);
            startDate = date.toISOString().split('T')[0];
        } else if (type === '90d') {
            const date = new Date(today);
            date.setDate(date.getDate() - 90);
            startDate = date.toISOString().split('T')[0];
        }
        
        this.setData({
            dateRangeType: type,
            queryDate: '',
            isHistorical: true,
            chartData: [] // 清除之前的图表数据
        });
        
        // 保存选项
        this.saveCurrentOptions();
        
        // 获取汇率数据
        if (this.data.fromCode && this.data.toCode) {
            this.fetchHistoricalRates(this.data.fromCode, this.data.toCode, startDate, endDate);
        }
    },

    // 获取历史汇率数据（用于图表）
    async fetchHistoricalRates(from_code, to_code, startDate, endDate) {
        // 检查本地缓存
        const cacheKey = `historical_${from_code}_${to_code}_${startDate}_${endDate}`;
        try {
            const storedData = wx.getStorageSync(cacheKey);
                if (storedData) {
                const cacheTime = new Date(storedData.cacheTime);
                const now = new Date();
                // 缓存24小时
                if ((now - cacheTime) < 24 * 60 * 60 * 1000) {
                    this.processHistoricalData(storedData.data, from_code, to_code);
                    this.setData({ chartLoading: false });
                    return;
                }
            }
        } catch (e) {
            console.error('读取历史数据缓存失败:', e);
        }
        
        // 历史图表加载用 chartLoading，不占用顶部大 loading
        this.setData({ chartLoading: true });
        try {
            const url = `https://api.frankfurter.app/${startDate}..${endDate}?from=${from_code}&to=${to_code}`;
            
            const res = await new Promise((resolve, reject) => {
                wx.request({
                    url: url,
                    method: 'GET',
                    header: {
                        'Content-Type': 'application/json'
                    },
                    success: (res) => resolve(res),
                    fail: (err) => reject(err)
                });
            });

            if (res.statusCode === 200 && res.data && res.data.rates) {
                // 处理历史数据
                const rates = res.data.rates;
                const chartData = [];
                const dates = Object.keys(rates).sort();
                
                dates.forEach(date => {
                    if (rates[date] && rates[date][to_code]) {
                        chartData.push({
                            date: date,
                            rate: parseFloat(rates[date][to_code])
                        });
                    }
                });
                
                // 保存到本地缓存
                try {
                    wx.setStorageSync(cacheKey, {
                        data: { rates, dates },
                        cacheTime: new Date()
                    });
                } catch (e) {
                    console.error('保存历史数据缓存失败:', e);
                }
                
                this.processHistoricalData({ rates, dates }, from_code, to_code);
            }
        } catch (error) {
            console.error('获取历史汇率失败:', error);
            wx.showToast({
                title: '获取历史汇率失败',
                icon: 'none'
            });
        } finally {
            this.setData({ chartLoading: false });
        }
    },

    // 处理历史数据
    processHistoricalData(data, from_code, to_code) {
        const { rates, dates } = data;
        const chartData = [];
        
        dates.forEach(date => {
            if (rates[date] && rates[date][to_code]) {
                chartData.push({
                    date: date,
                    rate: parseFloat(rates[date][to_code])
                });
            }
        });
        
        // 获取最新汇率用于显示
        if (chartData.length > 0) {
            const latest = chartData[chartData.length - 1];
            const exchangeData = {
                base: from_code,
                target: to_code,
                rate: latest.rate,
                date: latest.date,
                amount: 1.0
            };
            
            this.formatExchangeText(exchangeData, from_code, to_code);
            
            // 计算转换金额（如果有输入金额）
            let convertedAmount = '';
            if (this.data.amount && !isNaN(parseFloat(this.data.amount))) {
                const amount = parseFloat(this.data.amount);
                convertedAmount = (amount * latest.rate).toFixed(2);
            }
            
            // 格式化最新汇率显示
            const rateStr = parseFloat(latest.rate).toFixed(6);
            const dateStr = latest.date;
            
            this.setData({
                chartData: chartData,
                resultText: `历史汇率数据（${dates.length}天）`,
                convertedAmount: convertedAmount,
                // 默认显示最新汇率
                selectedHistoryRate: rateStr,
                selectedHistoryDate: dateStr
            });
            
            // 使用 ECharts 绘制图表
            this.renderHistoryChart(chartData, from_code, to_code);
        }
    },

    // 使用 F2 渲染历史汇率折线图（如果 F2 不可用则使用原生 canvas）
    renderHistoryChart(data, from_code, to_code) {
        if (!data || data.length === 0) return;

        // 保存数据供触摸交互使用
        this.chartData = data;

        // 如果 F2 不可用，使用原生 canvas 绘制
        if (!F2) {
            this.drawSimpleChart(data, from_code, to_code);
            return;
        }

        try {
            // 格式化数据为 F2 需要的格式
            const chartData = data.map(item => ({
                date: item.date,
                rate: item.rate
            }));

            // 使用 setTimeout 确保 DOM 已渲染
            setTimeout(() => {
                // 获取 canvas 上下文
                const query = wx.createSelectorQuery().in(this);
                query.select('#exchangeChart')
                    .fields({ node: true, size: true })
                    .exec((res) => {
                        if (!res || !res[0] || !res[0].node) {
                            console.error('无法获取 canvas 节点');
                            // 回退到原生 canvas
                            this.drawSimpleChart(data, from_code, to_code);
                            return;
                        }

                        const canvas = res[0].node;
                        const ctx = canvas.getContext('2d');
                        const dpr = wx.getSystemInfoSync().pixelRatio;
                        const width = res[0].width;
                        const height = res[0].height;

                        // 设置 canvas 尺寸
                        canvas.width = width * dpr;
                        canvas.height = height * dpr;
                        ctx.scale(dpr, dpr);

                        // 如果已有图表实例，先销毁
                        if (this.chartInstance) {
                            try {
                                this.chartInstance.destroy();
                            } catch (e) {
                                console.warn('销毁图表实例失败:', e);
                            }
                        }

                        // 创建 F2 图表（微信小程序需要使用 context 配置）
                        try {
                            this.chartInstance = new F2.Chart({
                                context: ctx,
                                width: width,
                                height: height,
                                pixelRatio: dpr
                            });
                        } catch (e) {
                            console.error('F2 Chart 初始化失败:', e);
                            // 回退到原生 canvas
                            this.drawSimpleChart(data, from_code, to_code);
                            return;
                        }

                        // 配置图表
                        this.chartInstance.source(chartData, {
                            date: {
                                type: 'timeCat',
                                tickCount: 5,
                                range: [0, 1]
                            },
                            rate: {
                                tickCount: 5,
                                nice: true
                            }
                        });

                        // 绘制面积图（先绘制面积，再绘制折线，这样折线在上层）
                        this.chartInstance
                            .area()
                            .position('date*rate')
                            .color('l(90) 0:#0052d9 1:rgba(0, 82, 217, 0.1)')
                            .shape('smooth');

                        // 绘制折线图
                        this.chartInstance
                            .line()
                            .position('date*rate')
                            .color('#0052d9')
                            .size(2)
                            .shape('smooth');

                        // 添加 Tooltip
                        this.chartInstance.tooltip({
                            showCrosshairs: true,
                            showItemMarker: false,
                            background: {
                                radius: 2,
                                fill: '#000',
                                padding: [3, 5]
                            },
                            onShow: (ev) => {
                                const items = ev.items;
                                if (items && items.length > 0) {
                                    items[0].name = `${from_code}→${to_code}`;
                                    items[0].value = items[0].value.toFixed(4);
                                }
                            }
                        });

                        // 渲染图表
                        this.chartInstance.render();
                    });
            }, 100);
        } catch (error) {
            console.error('F2 图表渲染失败:', error);
            // 回退到原生 canvas
            this.drawSimpleChart(data, from_code, to_code);
        }
    },

    // 使用原生 canvas 绘制简单折线图（备用方案，带交互）
    drawSimpleChart(data, from_code, to_code) {
        // 保存数据供触摸交互使用
        this.chartDataPoints = data.map((item, index) => {
            const padding = { top: 20, right: 20, bottom: 40, left: 50 };
            const rates = data.map(d => d.rate);
            const minRate = Math.min(...rates);
            const maxRate = Math.max(...rates);
            const rateRange = maxRate - minRate || 1;
            
            const query = wx.createSelectorQuery().in(this);
            let width = 600, height = 300;
            query.select('#exchangeChart')
                .boundingClientRect()
                .exec((res) => {
                    if (res && res[0]) {
                        width = res[0].width;
                        height = res[0].height;
                    }
                });
            
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;
            const x = padding.left + (chartWidth / (data.length - 1)) * index;
            const y = padding.top + chartHeight - ((item.rate - minRate) / rateRange) * chartHeight;
            
            return {
                x, y, date: item.date, rate: item.rate, index
            };
        });
        
        const query = wx.createSelectorQuery().in(this);
        query.select('#exchangeChart')
            .fields({ node: true, size: true })
            .exec((res) => {
                if (!res || !res[0] || !res[0].node) {
                    return;
                }

                const canvas = res[0].node;
                const ctx = canvas.getContext('2d');
                const dpr = wx.getSystemInfoSync().pixelRatio;
                const width = res[0].width;
                const height = res[0].height;

                canvas.width = width * dpr;
                canvas.height = height * dpr;
                ctx.scale(dpr, dpr);

                // 重新计算数据点位置（使用实际尺寸）
                const padding = { top: 20, right: 20, bottom: 40, left: 50 };
                const chartWidth = width - padding.left - padding.right;
                const chartHeight = height - padding.top - padding.bottom;
                const rates = data.map(d => d.rate);
                const minRate = Math.min(...rates);
                const maxRate = Math.max(...rates);
                const rateRange = maxRate - minRate || 1;
                
                this.chartDataPoints = data.map((item, index) => {
                    const x = padding.left + (chartWidth / (data.length - 1)) * index;
                    const y = padding.top + chartHeight - ((item.rate - minRate) / rateRange) * chartHeight;
                    return { x, y, date: item.date, rate: item.rate, index };
                });

                // 清空画布
                ctx.clearRect(0, 0, width, height);

                // 绘制背景
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);

                // 绘制网格线
                ctx.strokeStyle = '#f0f0f0';
                ctx.lineWidth = 1;
                for (let i = 0; i <= 5; i++) {
                    const y = padding.top + (chartHeight / 5) * i;
                    ctx.beginPath();
                    ctx.moveTo(padding.left, y);
                    ctx.lineTo(width - padding.right, y);
                    ctx.stroke();
                }

                // 绘制折线
                ctx.strokeStyle = '#0052d9';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                this.chartDataPoints.forEach((point, index) => {
                    if (index === 0) {
                        ctx.moveTo(point.x, point.y);
                    } else {
                        ctx.lineTo(point.x, point.y);
                    }
                });
                ctx.stroke();

                // 绘制数据点
                ctx.fillStyle = '#0052d9';
                this.chartDataPoints.forEach((point) => {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                });

                // 绘制Y轴标签
                ctx.fillStyle = '#666666';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'right';
                for (let i = 0; i <= 5; i++) {
                    const y = padding.top + (chartHeight / 5) * i;
                    const value = maxRate - (rateRange / 5) * i;
                    ctx.fillText(value.toFixed(4), padding.left - 10, y + 4);
                }

                // 绘制X轴标签
                ctx.textAlign = 'center';
                const labelCount = Math.min(5, data.length);
                const step = Math.max(1, Math.floor(data.length / labelCount));
                for (let i = 0; i < data.length; i += step) {
                    const x = padding.left + (chartWidth / (data.length - 1)) * i;
                    const date = data[i].date;
                    const dateStr = date.substring(5); // 只显示月-日
                    ctx.fillText(dateStr, x, height - padding.bottom + 20);
                }
                
                // 保存 canvas 和上下文供触摸交互使用
                this.canvasNode = canvas;
                this.canvasCtx = ctx;
                this.canvasWidth = width;
                this.canvasHeight = height;
                this.chartPadding = padding;
            });
    },

    // 触摸开始
    onChartTouchStart(e) {
        this.handleChartTouch(e);
    },

    // 触摸移动
    onChartTouchMove(e) {
        this.handleChartTouch(e);
    },

    // 触摸结束（保持选中状态和高亮，无需处理）
    onChartTouchEnd(e) {
    },

    // 处理图表触摸交互
    handleChartTouch(e) {
        if (!this.chartDataPoints || !this.canvasCtx || !this.canvasNode) {
            return;
        }

        const touch = e.touches[0];
        if (!touch) return;

        // 获取 canvas 位置
        const query = wx.createSelectorQuery().in(this);
        query.select('#exchangeChart')
            .boundingClientRect()
            .exec((res) => {
                if (!res || !res[0]) return;

                const canvasRect = res[0];
                const x = touch.clientX - canvasRect.left;
                const y = touch.clientY - canvasRect.top;

                // 查找最近的数据点
                let nearestPoint = null;
                let minDistance = Infinity;

                this.chartDataPoints.forEach((point) => {
                    const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                    if (distance < minDistance && distance < 30) { // 30px 范围内
                        minDistance = distance;
                        nearestPoint = point;
                    }
                });

                if (nearestPoint) {
                    // 在标题右侧显示当前点的汇率信息
                    const rateStr = nearestPoint.rate.toFixed(4);
                    this.setData({
                        selectedHistoryDate: nearestPoint.date,
                        selectedHistoryRate: rateStr
                    });

                    // 重新绘制，高亮选中的点
                    this.redrawChart(nearestPoint);
                }
            });
    },

    // 重新绘制图表（高亮选中的点）
    redrawChart(highlightPoint = null) {
        if (!this.chartDataPoints || !this.canvasCtx || !this.chartData) {
            return;
        }

        const data = this.chartData;
        const padding = this.chartPadding || { top: 20, right: 20, bottom: 40, left: 50 };
        const width = this.canvasWidth;
        const height = this.canvasHeight;
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // 清空画布
        this.canvasCtx.clearRect(0, 0, width, height);

        // 绘制背景
        this.canvasCtx.fillStyle = '#ffffff';
        this.canvasCtx.fillRect(0, 0, width, height);

        // 绘制网格线
        this.canvasCtx.strokeStyle = '#f0f0f0';
        this.canvasCtx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(padding.left, y);
            this.canvasCtx.lineTo(width - padding.right, y);
            this.canvasCtx.stroke();
        }

        // 绘制折线
        this.canvasCtx.strokeStyle = '#0052d9';
        this.canvasCtx.lineWidth = 2;
        this.canvasCtx.beginPath();
        
        this.chartDataPoints.forEach((point, index) => {
            if (index === 0) {
                this.canvasCtx.moveTo(point.x, point.y);
            } else {
                this.canvasCtx.lineTo(point.x, point.y);
            }
        });
        this.canvasCtx.stroke();

        // 绘制数据点
        this.chartDataPoints.forEach((point) => {
            if (highlightPoint && point.index === highlightPoint.index) {
                // 高亮选中的点
                this.canvasCtx.fillStyle = '#ff6b6b';
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(point.x, point.y, 6, 0, Math.PI * 2);
                this.canvasCtx.fill();
                
                // 绘制外圈
                this.canvasCtx.strokeStyle = '#ff6b6b';
                this.canvasCtx.lineWidth = 2;
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(point.x, point.y, 10, 0, Math.PI * 2);
                this.canvasCtx.stroke();
            } else {
                this.canvasCtx.fillStyle = '#0052d9';
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                this.canvasCtx.fill();
            }
        });

        // 绘制Y轴标签
        const rates = data.map(d => d.rate);
        const minRate = Math.min(...rates);
        const maxRate = Math.max(...rates);
        const rateRange = maxRate - minRate || 1;
        
        this.canvasCtx.fillStyle = '#666666';
        this.canvasCtx.font = '10px sans-serif';
        this.canvasCtx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            const value = maxRate - (rateRange / 5) * i;
            this.canvasCtx.fillText(value.toFixed(4), padding.left - 10, y + 4);
        }

        // 绘制X轴标签
        this.canvasCtx.textAlign = 'center';
        const labelCount = Math.min(5, data.length);
        const step = Math.max(1, Math.floor(data.length / labelCount));
        for (let i = 0; i < data.length; i += step) {
            const x = padding.left + (chartWidth / (data.length - 1)) * i;
            const date = data[i].date;
            const dateStr = date.substring(5);
            this.canvasCtx.fillText(dateStr, x, height - padding.bottom + 20);
        }
    }

});
