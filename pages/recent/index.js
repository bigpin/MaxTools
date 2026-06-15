// pages/recent/index.js
// 最近使用页面

const storage = require('../../utils/storage');
const { TOOLS, TOOL_CATEGORY_NAMES, SWITCH_CONTROLLED_TOOLS, VALID_TOOL_IDS, TOOL_MAP } = require('../../utils/tools');

const db = wx.cloud.database();

Page({
    data: {
        recentUses: [],
        favorites: [],
        categoryNames: TOOL_CATEGORY_NAMES,
        disabledTools: []
    },

    onLoad() {
        this.loadToolsSwitch().then(() => {
            this.loadData();
        });
    },

    onShow() {
        // 页面显示时刷新数据
        this.loadData();
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

            // 正式版：默认全部敏感工具禁用，只有云端明确「已开启」才加入列表
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

    // 加载数据
    loadData() {
        // 清理无效工具记录
        const favorites = storage.cleanInvalidFavorites(VALID_TOOL_IDS);
        const recentUses = storage.cleanInvalidRecentUses(VALID_TOOL_IDS);
        const disabledTools = this.data.disabledTools || [];

        // 格式化时间，过滤被禁用的工具
        const formattedUses = recentUses
            .filter(item => VALID_TOOL_IDS.includes(item.toolId) && !disabledTools.includes(item.toolId))
            .map(item => {
                const latest = TOOL_MAP[item.toolId];
                return {
                    ...item,
                    toolInfo: latest ? { ...latest } : item.toolInfo,
                    relativeTime: storage.formatRelativeTime(item.useTime),
                    isFavorite: favorites.indexOf(item.toolId) > -1
                };
            });

        this.setData({
            recentUses: formattedUses,
            favorites: favorites
        });
    },

    // 点击工具
    onToolTap(e) {
        const index = e.currentTarget.dataset.index;
        const tool = this.data.recentUses[index]?.toolInfo;

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
        const favorites = storage.getFavorites();
        this.setData({
            favorites: favorites
        });

        wx.showToast({
            title: isFavorite ? '已收藏' : '已取消收藏',
            icon: 'none',
            duration: 1500
        });
    },

    // Tab点击
    onTabItemTap(e) {
        const tabValue = e.currentTarget.dataset.tab;

        if (tabValue === 'recent') {
            return;
        }

        if (tabValue === 'tools') {
            wx.reLaunch({ url: '/pages/index/index' });
        } else if (tabValue === 'my') {
            wx.reLaunch({ url: '/pages/my/index' });
        }
    }
});
