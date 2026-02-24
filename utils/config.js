// API配置
const CONFIG = {
    // Frankfurter 最新汇率接口（参考 https://frankfurter.dev/）
    EXCHANGE_API_URL: 'https://api.frankfurter.dev/v1/latest',
    CACHE_EXPIRE_TIME: 30 * 60000, // 30分钟缓存过期
};

module.exports = { CONFIG };
