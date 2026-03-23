// pages/tools/shortcuts/index.js
const versionUtil = require('../../../utils/version');
const db = wx.cloud.database();

Page({
  data: {
    shortcutList: [],
    displayList: [],
    searchKeyword: '',
    /** 排序：clicks 使用次数 | time 最新添加 | name 名称 */
    sortBy: 'clicks',
    totalClicks: 0,
    loading: false,
    showUsageDialog: false,
    statusBarHeight: 0,
    usageContent: '本工具用于收藏与打开 iPhone 上的快捷方式。\n\n· 点击某条快捷方式会复制其链接到剪贴板，请在 iPhone 上打开「快捷方式」App 或 Safari 粘贴链接即可运行。\n\n· 快捷方式由后台维护添加，本页仅支持搜索与点击使用。\n\n· 搜索：在顶部输入名称或关键词可快速筛选。'
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 0 });
    versionUtil.setNavigationBarTitleWithVersion('iPhone 快捷方式');
    this.loadShortcutList();
  },

  onShow() {
    this.loadShortcutList();
  },

  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' });
      }
    });
  },

  /** 从云库加载快捷方式列表 */
  async loadShortcutList() {
    this.setData({ loading: true });
    try {
      const res = await db.collection('shortcut')
        .orderBy('createdAt', 'desc')
        .get();
      const list = (res.data || []).map(item => ({
        ...item,
        id: item._id,
        clickCount: item.clickCount || 0
      }));
      const totalClicks = list.reduce((sum, i) => sum + (i.clickCount || 0), 0);
      this.setData({
        shortcutList: list,
        totalClicks,
        loading: false
      });
      this.applySearch();
    } catch (e) {
      console.error('加载快捷方式列表失败:', e);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  /** 搜索输入（t-search 的 detail 可能是对象，只取 value 字符串） */
  onSearchInput(e) {
    let searchKeyword = '';
    if (e.detail != null) {
      if (typeof e.detail === 'string') {
        searchKeyword = e.detail;
      } else if (e.detail && typeof e.detail.value === 'string') {
        searchKeyword = e.detail.value;
      } else if (e.detail && e.detail.value != null) {
        searchKeyword = String(e.detail.value);
      }
    }
    this.setData({ searchKeyword });
    this.applySearch();
  },

  onSearchClear() {
    this.setData({ searchKeyword: '' });
    this.applySearch();
  },

  /** 切换排序方式 */
  onSortBy(e) {
    const sort = e.currentTarget.dataset.sort;
    if (!sort || sort === this.data.sortBy) return;
    this.setData({ sortBy: sort });
    this.applySearch();
  },

  /** 按当前 sortBy 排序列表 */
  sortDisplayList(list) {
    const sortBy = this.data.sortBy || 'clicks';
    const arr = [...list];
    if (sortBy === 'time') {
      arr.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    } else if (sortBy === 'name') {
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'));
    } else {
      arr.sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0));
    }
    return arr;
  },

  /** 按名称、关键词模糊过滤 */
  applySearch() {
    const { shortcutList, searchKeyword } = this.data;
    const kw = (searchKeyword || '').trim().toLowerCase();
    let displayList = shortcutList;
    if (kw) {
      displayList = shortcutList.filter(item => {
        const name = (item.name || '').toLowerCase();
        const keywords = (item.keywords || '').toLowerCase().replace(/[,，\s]+/g, ' ');
        const desc = (item.description || '').toLowerCase();
        return name.indexOf(kw) >= 0 ||
          keywords.indexOf(kw) >= 0 ||
          (keywords && keywords.split(/\s+/).some(k => k && k.indexOf(kw) >= 0)) ||
          desc.indexOf(kw) >= 0;
      });
    }
    displayList = this.sortDisplayList(displayList);
    const totalClicks = displayList.reduce((sum, i) => sum + (i.clickCount || 0), 0);
    this.setData({ displayList, totalClicks });
  },

  /** 点击快捷方式：复制链接并增加点击次数 */
  async onShortcutTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const item = this.data.shortcutList.find(i => i._id === id || i.id === id);
    if (!item || !item.url) return;
    // 先尝试复制
    try {
      await wx.setClipboardData({ data: item.url });
      wx.showToast({ title: '已复制链接', icon: 'success' });
    } catch (copyErr) {
      console.error('复制失败:', copyErr);
      wx.showModal({
        title: '复制失败',
        content: '请允许小程序使用剪贴板，或手动复制：' + (item.url || '').slice(0, 80) + (item.url && item.url.length > 80 ? '…' : ''),
        showCancel: false
      });
      return;
    }
    // 通过云函数更新点击统计（避免集合「仅创建者可写」导致前端无法更新）
    try {
      const res = await wx.cloud.callFunction({
        name: 'shortcutIncrementClick',
        data: { shortcutId: item._id }
      });
      const result = (res.result && res.result.success) ? res.result : {};
      if (result.success) {
        const list = this.data.shortcutList.map(i => {
          if (i._id === item._id) {
            return { ...i, clickCount: (i.clickCount || 0) + 1 };
          }
          return i;
        });
        const totalClicks = list.reduce((sum, i) => sum + (i.clickCount || 0), 0);
        this.setData({ shortcutList: list, totalClicks });
        this.applySearch();
      } else {
        console.error('点击统计更新失败:', result.error);
      }
    } catch (updateErr) {
      console.error('点击统计更新失败:', updateErr);
    }
  },

  /** 使用方式说明 */
  onShowUsage() {
    this.setData({ showUsageDialog: true });
  },

  onCloseUsageDialog() {
    this.setData({ showUsageDialog: false });
  }
});
