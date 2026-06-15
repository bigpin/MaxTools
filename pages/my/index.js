// pages/my/index.js
// 我的页面

const storage = require('../../utils/storage');
const { TOOLS, TOOL_CATEGORY_NAMES, SWITCH_CONTROLLED_TOOLS, VALID_TOOL_IDS, TOOL_MAP } = require('../../utils/tools');

const db = wx.cloud.database();

Page({
    data: {
        favoriteTools: [],
        favorites: [],
        categoryNames: TOOL_CATEGORY_NAMES,
        disabledTools: []
    },

    onLoad() {
        this.loadToolsSwitch().then(() => {
            this.loadFavoriteTools();
        });
    },

    onShow() {
        // 页面显示时刷新数据
        this.loadFavoriteTools();
    },

    /**
     * 从云数据库加载工具开关配置
     */
    async loadToolsSwitch() {
        try {
            let envVersion = 'develop';
            try {
                const accountInfo = wx.getAccountInfoSync();
                envVersion = accountInfo.miniProgram.envVersion || 'develop';
            } catch (e) {}

            if (envVersion === 'develop') {
                this.setData({ disabledTools: [...SWITCH_CONTROLLED_TOOLS] });
                return;
            }

            if (envVersion === 'trial') {
                this.setData({ disabledTools: [...SWITCH_CONTROLLED_TOOLS] });
                return;
            }

            let disabledTools = [...SWITCH_CONTROLLED_TOOLS];
            try {
                const res = await db.collection('tools_switch').get();
                const switches = res.data || [];
                const allowedIds = switches
                    .filter(s => SWITCH_CONTROLLED_TOOLS.includes(s.tool_id) && s.enabled !== false && !s.review_version)
                    .map(s => s.tool_id);
                disabledTools = SWITCH_CONTROLLED_TOOLS.filter(id => !allowedIds.includes(id));
            } catch (e) {
                console.warn('读取工具开关失败，保持默认禁用:', e);
            }
            this.setData({ disabledTools });
        } catch (error) {
            console.warn('加载工具开关失败:', error);
            this.setData({ disabledTools: [...SWITCH_CONTROLLED_TOOLS] });
        }
    },

    // 加载收藏的工具列表
    loadFavoriteTools() {
        // 清理无效收藏
        const favorites = storage.cleanInvalidFavorites(VALID_TOOL_IDS);
        const disabledTools = this.data.disabledTools || [];
        const availableTools = TOOLS.filter(tool => !disabledTools.includes(tool.id));
        const favoriteTools = availableTools
            .filter(tool => favorites.indexOf(tool.id) > -1)
            .map(tool => ({ ...tool, isFavorite: true }));
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

        // 始终从最新 TOOLS 定义取数据
        const latestDef = TOOL_MAP[tool.id] || tool;
        const toolInfo = {
            id: latestDef.id,
            name: latestDef.name,
            icon: latestDef.icon,
            category: latestDef.category,
            description: latestDef.description,
            path: latestDef.path
        };
        storage.saveRecentUse(tool.id, toolInfo);

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

        if (tabValue === 'my') {
            return;
        }

        if (tabValue === 'tools') {
            wx.reLaunch({ url: '/pages/index/index' });
        } else if (tabValue === 'recent') {
            wx.reLaunch({ url: '/pages/recent/index' });
        }
    }
});
