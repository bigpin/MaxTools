// pages/my/index.js
// 我的页面

const storage = require('../../utils/storage');

const TOOL_CATEGORY_NAMES = {
    'finance': '财务工具',
    'image': '图片工具',
    'life': '生活工具',
    'other': '其他工具'
};

// 工具配置列表（需要与主页保持一致）
const TOOLS = [
    {
        id: 'tax-calculator',
        name: '个税计算器',
        icon: 'money',
        category: 'finance',
        description: '计算个人所得税，支持多个月份累计计算',
        path: '/pages/tools/tax-calculator/index'
    },
    {
        id: 'pension-calculator',
        name: '年终奖计算器',
        icon: 'wallet',
        category: 'finance',
        description: '计算年终奖缴税金额',
        path: '/pages/tools/pension-calculator/index'
    },
    {
        id: 'currency-exchange',
        name: '汇率转换',
        icon: 'swap',
        category: 'finance',
        description: '实时查询和转换多种货币汇率',
        path: '/pages/tools/currency-exchange/index'
    },
    {
        id: 'photo-privacy',
        name: '照片隐私清除',
        icon: 'image',
        category: 'image',
        description: '去除照片中的位置、时间等隐私信息',
        path: '/pages/tools/photo-privacy/index'
    },
    {
        id: 'unit-converter',
        name: '单位换算器',
        icon: 'swap',
        category: 'life',
        description: '支持长度、面积、体积、重量、温度、时间、速度等常用单位互转',
        path: '/pages/tools/unit-converter/index'
    },
    {
        id: 'anniversary',
        name: '纪念日管家',
        icon: 'calendar',
        category: 'life',
        description: '记录生日、纪念日、还款日等重要日期，自动计算倒计时，支持订阅消息提醒',
        path: '/pages/tools/anniversary/index'
    },
    {
        id: 'data-insights',
        name: '数据洞察',
        icon: 'chart',
        category: 'finance',
        description: '多维数据分析与趋势洞察',
        path: '/pages/tools/data-insights/index'
    }
];

Page({
    data: {
        favoriteTools: [],
        favorites: [],
        categoryNames: TOOL_CATEGORY_NAMES
    },

    onLoad() {
        this.loadFavoriteTools();
    },

    onShow() {
        // 页面显示时刷新数据
        this.loadFavoriteTools();
    },

    // 加载收藏的工具列表
    loadFavoriteTools() {
        const favorites = storage.getFavorites();
        const favoriteTools = TOOLS.filter(tool => favorites.indexOf(tool.id) > -1);
        this.setData({
            favoriteTools: favoriteTools,
            favorites: favorites
        });
    },

    // 点击工具
    onToolTap(e) {
        const index = e.currentTarget.dataset.index;
        const tool = this.data.favoriteTools[index];
        
        if (!tool || !tool.path) {
            wx.showToast({
                title: '工具数据无效',
                icon: 'none'
            });
            return;
        }
        
        // 记录使用时间
        storage.saveRecentUse(tool.id, tool);
        
        wx.navigateTo({
            url: tool.path,
            fail: (err) => {
                console.error('导航失败:', err);
                wx.showToast({
                    title: '页面跳转失败',
                    icon: 'none',
                    duration: 2000
                });
            }
        });
    },

    // 收藏点击
    onFavoriteTap(e) {
        const toolId = e.currentTarget.dataset.toolId;
        const isFavorite = storage.toggleFavorite(toolId);
        
        // 更新收藏列表
        this.loadFavoriteTools();
        
        wx.showToast({
            title: isFavorite ? '已收藏' : '已取消收藏',
            icon: 'none',
            duration: 1500
        });
    },

    // Tab点击
    onTabItemTap(e) {
        const tabValue = e.currentTarget.dataset.tab;
        
        // 如果点击的是当前Tab，不处理
        if (tabValue === 'my') {
            return;
        }
        
        // 跳转到对应页面
        if (tabValue === 'tools') {
            wx.redirectTo({
                url: '/pages/index/index'
            });
        } else if (tabValue === 'recent') {
            wx.redirectTo({
                url: '/pages/recent/index'
            });
        }
    }
});
