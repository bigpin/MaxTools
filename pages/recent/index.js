// pages/recent/index.js
// 最近使用页面

const storage = require('../../utils/storage');
const { TOOLS, TOOL_CATEGORY_NAMES, SWITCH_CONTROLLED_TOOLS, LOCAL_FORCE_SHOW_ALL, VALID_TOOL_IDS, TOOL_MAP } = require('../../utils/tools');

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
     * 工具开关配置（本地统一开关，不读云端）
     * 逻辑：
     *   - 本地「强制全部显示」开关（LOCAL_FORCE_SHOW_ALL = true）开启时，跳过所有过滤，全部工具放开
     *   - 开关关闭（默认）：
     *       · 开发版 / 体验版：不展示受控工具（disabledTools=受控列表）
     *       · 正式版：直接展示全部受控工具（暂时不考虑云端开关）
     */
    async loadToolsSwitch() {
        // 统一开关（本地）：强制全部显示，跳过过滤
        if (LOCAL_FORCE_SHOW_ALL) {
            this.setData({ disabledTools: [] });
            return;
        }

        let envVersion = 'develop';
        try {
            const accountInfo = wx.getAccountInfoSync();
            envVersion = accountInfo.miniProgram.envVersion || 'develop';
        } catch (e) {}

        if (envVersion === 'develop' || envVersion === 'trial') {
            this.setData({ disabledTools: [...SWITCH_CONTROLLED_TOOLS] });
            return;
        }

        // 正式版：暂时不考虑云端开关，直接展示全部受控工具
        this.setData({ disabledTools: [] });
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
