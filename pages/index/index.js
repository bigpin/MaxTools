// pages/index/index.js
// 工具分类首页

const storage = require('../../utils/storage');

// 工具分类定义
const TOOL_CATEGORIES = {
    FINANCE: 'finance',
    IMAGE: 'image',
    LIFE: 'life',
    OTHER: 'other'
};

const TOOL_CATEGORY_NAMES = {
    'finance': '财务工具',
    'image': '图片工具',
    'life': '生活工具',
    'other': '其他工具'
};

// 工具配置列表
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
        id: 'stock-signals',
        name: '股票强力信号',
        icon: 'chart',
        category: 'finance',
        description: '展示股票强力信号数据，按日期分组查看，支持筛选和详情展开',
        path: '/pages/tools/stock-signals/index'
    }
];

Page({
    data: {
        categories: ['finance', 'image', 'life'],
        categoryNames: TOOL_CATEGORY_NAMES,
        currentCategory: '',
        tools: TOOLS,
        filteredTools: TOOLS,
        showSearch: false,
        searchValue: '',
        currentTab: 'tools', // 'tools' | 'recent' | 'my'
        favorites: [], // 收藏的工具ID列表
        recentUses: [], // 最近使用记录
        favoriteTools: [], // 收藏的工具列表（用于我的Tab）
        activeColor: '#0052d9' // 当前激活颜色，根据分类动态变化
    },

    onLoad() {
        console.log('首页加载');
        // 合并初始化数据，减少 setData 次数以加快首屏渲染
        this.initPageData();
    },

    /**
     * 初始化页面数据（合并多个 setData 为一次调用）
     */
    initPageData() {
        const favorites = storage.getFavorites();
        const recentUses = storage.getRecentUses();
        
        // 格式化最近使用
        const formattedUses = recentUses.map(item => ({
            ...item,
            relativeTime: this.formatRelativeTime(item.useTime),
            isFavorite: favorites.indexOf(item.toolId) > -1
        }));
        
        // 计算过滤后的工具列表（带收藏状态）
        const filteredTools = TOOLS.map(tool => ({
            ...tool,
            isFavorite: favorites.indexOf(tool.id) > -1
        }));
        
        // 一次性设置所有数据
        const payload = {
            favorites,
            recentUses: formattedUses,
            filteredTools
        };
        
        // 最近使用 ≥3 个时，默认展示最近使用 tab
        if (formattedUses.length >= 3) {
            payload.currentTab = 'recent';
        }
        
        this.setData(payload);
        console.log('首页初始化完成，工具数量:', TOOLS.length);
    },

    onShow() {
        // 页面显示时刷新数据（合并 setData）
        this.refreshPageData();
    },

    /**
     * 刷新页面数据（合并多个 setData 为一次调用）
     */
    refreshPageData() {
        const favorites = storage.getFavorites();
        const currentTab = this.data.currentTab;
        
        // 构建更新数据
        const payload = { favorites };
        
        // 更新工具列表的收藏状态
        payload.filteredTools = this.filterToolsWithFavorites(
            this.data.searchValue,
            this.data.currentCategory,
            favorites
        );
        
        // 根据当前 Tab 加载对应数据
        if (currentTab === 'recent') {
            const recentUses = storage.getRecentUses();
            payload.recentUses = recentUses.map(item => ({
                ...item,
                relativeTime: this.formatRelativeTime(item.useTime),
                isFavorite: favorites.indexOf(item.toolId) > -1
            }));
        } else if (currentTab === 'my') {
            payload.favoriteTools = TOOLS.filter(tool => favorites.indexOf(tool.id) > -1).map(tool => ({
                ...tool,
                isFavorite: true
            }));
        }
        
        this.setData(payload);
    },

    /**
     * 带收藏状态的工具过滤（内部方法，不调用 setData）
     */
    filterToolsWithFavorites(searchValue, category, favorites) {
        let result = TOOLS;
        
        if (category) {
            result = result.filter(tool => tool.category === category);
        }
        
        if (searchValue) {
            const keyword = searchValue.toLowerCase();
            result = result.filter(tool => 
                tool.name.toLowerCase().includes(keyword) || 
                tool.description.toLowerCase().includes(keyword)
            );
        }
        
        return result.map(tool => ({
            ...tool,
            isFavorite: favorites.indexOf(tool.id) > -1
        }));
    },

    onShareAppMessage() {
        return {
            title: 'Max的工具宝藏',
            path: '/pages/index/index',
        };
    },

    // 切换搜索框显示
    toggleSearch() {
        this.setData({
            showSearch: !this.data.showSearch,
            searchValue: '',
            filteredTools: this.filterTools('', this.data.currentCategory)
        });
    },

    // 搜索输入变化
    onSearchChange(e) {
        const searchValue = e.detail.value || '';
        this.setData({
            searchValue: searchValue,
            filteredTools: this.filterTools(searchValue, this.data.currentCategory)
        });
    },

    // 清空搜索
    onSearchClear() {
        this.setData({
            searchValue: '',
            filteredTools: this.filterTools('', this.data.currentCategory)
        });
    },

    // 根据搜索词和分类筛选工具
    filterTools(searchValue, category) {
        const favorites = this.data.favorites || [];
        return this.filterToolsWithFavorites(searchValue, category, favorites);
    },

    // 切换分类
    onCategoryChange(e) {
        const category = e.currentTarget.dataset.category || '';
        // 根据分类设置激活颜色
        let activeColor = '#0052d9'; // 默认蓝色（全部）
        if (category === 'finance') {
            activeColor = '#e53e3e'; // 红色（财务工具）
        } else if (category === 'image') {
            activeColor = '#ed7b2f'; // 橙色（图片工具）
        } else if (category === 'life') {
            activeColor = '#00a870'; // 绿色（生活工具）
        }
        
        this.setData({
            currentCategory: category,
            filteredTools: this.filterTools(this.data.searchValue, category),
            activeColor: activeColor
        });
    },

    // 点击工具
    onToolTap(e) {
        const index = e.currentTarget.dataset.index;
        let tool;
        
        console.log('点击工具，当前Tab:', this.data.currentTab, '索引:', index);
        
        // 根据当前Tab获取对应的工具列表
        if (this.data.currentTab === 'recent') {
            tool = this.data.recentUses[index]?.toolInfo;
        } else if (this.data.currentTab === 'my') {
            tool = this.data.favoriteTools[index];
        } else {
            tool = this.data.filteredTools[index];
        }
        
        console.log('获取到的工具数据:', tool);
        
        if (!tool || !tool.path) {
            console.error('工具数据无效:', tool);
            wx.showToast({
                title: '工具数据无效',
                icon: 'none'
            });
            return;
        }
        
        // 记录使用时间（使用原始工具数据，不包含isFavorite）
        const toolInfo = {
            id: tool.id,
            name: tool.name,
            icon: tool.icon,
            category: tool.category,
            description: tool.description,
            path: tool.path
        };
        storage.saveRecentUse(tool.id, toolInfo);
        
        console.log('准备跳转到:', tool.path);
        
        // 使用setTimeout避免超时问题
        setTimeout(() => {
            wx.navigateTo({
                url: tool.path,
                success: () => {
                    console.log('跳转成功');
                },
                fail: (err) => {
                    console.error('navigateTo失败:', err);
                    // 备选方案：使用redirectTo
                    wx.redirectTo({
                        url: tool.path,
                        fail: (err2) => {
                            console.error('redirectTo也失败:', err2);
                            wx.showToast({
                                title: '跳转失败',
                                icon: 'none'
                            });
                        }
                    });
                }
            });
        }, 50);
    },

    // Tab点击
    onTabItemTap(e) {
        const tabValue = e.currentTarget.dataset.tab;
        
        // 如果点击的是当前Tab，不处理
        if (tabValue === this.data.currentTab) {
            return;
        }
        
        // 如果切换到非工具箱tab，使用默认蓝色
        let activeColor = '#0052d9';
        if (tabValue === 'tools') {
            // 如果在工具箱tab，根据当前分类设置颜色
            const category = this.data.currentCategory;
            if (category === 'finance') {
                activeColor = '#e53e3e';
            } else if (category === 'image') {
                activeColor = '#ed7b2f';
            } else if (category === 'life') {
                activeColor = '#00a870';
            }
        }
        
        this.setData({
            currentTab: tabValue,
            activeColor: activeColor
        });
        
        // 根据Tab加载对应数据
        if (tabValue === 'recent') {
            this.loadRecentUses();
        } else if (tabValue === 'my') {
            this.loadFavoriteTools();
        }
    },

    // 收藏点击
    onFavoriteTap(e) {
        const toolId = e.currentTarget.dataset.toolId;
        const isFavorite = storage.toggleFavorite(toolId);
        
        // 更新收藏列表
        this.loadFavorites();
        
        // 如果当前在"我的"Tab，刷新收藏工具列表
        if (this.data.currentTab === 'my') {
            this.loadFavoriteTools();
        }
        
        // 如果当前在"最近使用"Tab，刷新列表以更新收藏状态
        if (this.data.currentTab === 'recent') {
            this.loadRecentUses();
        }
        
        wx.showToast({
            title: isFavorite ? '已收藏' : '已取消收藏',
            icon: 'none',
            duration: 1500
        });
    },

    // 加载收藏列表（合并 setData）
    loadFavorites() {
        const favorites = storage.getFavorites();
        this.setData({
            favorites,
            filteredTools: this.filterToolsWithFavorites(
                this.data.searchValue,
                this.data.currentCategory,
                favorites
            )
        });
    },

    // 加载最近使用记录
    loadRecentUses() {
        const favorites = this.data.favorites || [];
        const recentUses = storage.getRecentUses();
        const formattedUses = recentUses.map(item => ({
            ...item,
            relativeTime: this.formatRelativeTime(item.useTime),
            isFavorite: favorites.indexOf(item.toolId) > -1
        }));
        this.setData({ recentUses: formattedUses });
    },

    // 加载收藏的工具列表
    loadFavoriteTools() {
        const favorites = storage.getFavorites();
        const favoriteTools = TOOLS.filter(tool => favorites.indexOf(tool.id) > -1).map(tool => ({
            ...tool,
            isFavorite: true
        }));
        this.setData({
            favoriteTools: favoriteTools
        });
    },

    // 检查工具是否收藏
    isFavorite(toolId) {
        return this.data.favorites.indexOf(toolId) > -1;
    },

    // 格式化相对时间
    formatRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) {
            return '刚刚';
        } else if (minutes < 60) {
            return `${minutes}分钟前`;
        } else if (hours < 24) {
            return `${hours}小时前`;
        } else if (days < 7) {
            return `${days}天前`;
        } else {
            const date = new Date(timestamp);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${month}月${day}日`;
        }
    }
});
