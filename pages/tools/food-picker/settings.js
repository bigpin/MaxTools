const foodData = require('./data');

Page({
  data: {
    statusBarHeight: 0,
    categories: [],
    groupedFoods: {},
    disabledIds: [],
    customFoods: [],
    showAddDialog: false,
    newFoodName: '',
    newFoodCategory: 'chinese',
    categoryOptions: [],
    expandedCategory: '',
  },

  onLoad() {
    const sys = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 0 });
    this._loadData();
  },

  goBack() {
    wx.navigateBack({
      fail: () => { wx.switchTab({ url: '/pages/index/index' }); }
    });
  },

  _loadData() {
    const disabledIds = wx.getStorageSync('food-picker-disabled-items') || [];
    const customFoods = wx.getStorageSync('food-picker-custom-menu') || [];
    const grouped = foodData.getDefaultFoodsByCategory();
    const allCats = foodData.getAllCategories();

    customFoods.forEach(food => {
      if (!grouped[food.category]) {
        grouped[food.category] = [];
      }
      grouped[food.category].push(food);
    });

    Object.keys(grouped).forEach(cat => {
      grouped[cat] = grouped[cat].map(food => ({
        ...food,
        enabled: disabledIds.indexOf(food.id) === -1,
      }));
    });

    const categories = allCats.filter(cat => grouped[cat.key] && grouped[cat.key].length > 0);
    const categoryOptions = allCats.map(cat => ({ key: cat.key, name: cat.name, emoji: cat.emoji }));

    this.setData({
      categories,
      groupedFoods: grouped,
      disabledIds,
      customFoods,
      categoryOptions,
    });
  },

  toggleCategory(e) {
    const key = e.currentTarget.dataset.category;
    this.setData({
      expandedCategory: this.data.expandedCategory === key ? '' : key,
    });
  },

  onToggleFood(e) {
    const foodId = e.currentTarget.dataset.id;
    let disabledIds = this.data.disabledIds.slice();
    const idx = disabledIds.indexOf(foodId);
    if (idx > -1) {
      disabledIds.splice(idx, 1);
    } else {
      disabledIds.push(foodId);
    }
    wx.setStorageSync('food-picker-disabled-items', disabledIds);

    const grouped = this.data.groupedFoods;
    const newGrouped = {};
    Object.keys(grouped).forEach(cat => {
      newGrouped[cat] = grouped[cat].map(food => ({
        ...food,
        enabled: disabledIds.indexOf(food.id) === -1,
      }));
    });
    this.setData({ disabledIds, groupedFoods: newGrouped });
  },

  isFoodEnabled(foodId) {
    return this.data.disabledIds.indexOf(foodId) === -1;
  },

  onEnableAll() {
    wx.setStorageSync('food-picker-disabled-items', []);
    this._loadData();
    wx.showToast({ title: '已全部开启', icon: 'success' });
  },

  onDisableAll() {
    const allIds = [];
    const grouped = this.data.groupedFoods;
    Object.keys(grouped).forEach(cat => {
      grouped[cat].forEach(food => {
        allIds.push(food.id);
      });
    });
    wx.setStorageSync('food-picker-disabled-items', allIds);
    this._loadData();
    wx.showToast({ title: '已全部关闭', icon: 'success' });
  },

  showAddFood() {
    this.setData({ showAddDialog: true, newFoodName: '', newFoodCategory: 'chinese' });
  },

  hideAddFood() {
    this.setData({ showAddDialog: false });
  },

  onNewFoodNameInput(e) {
    this.setData({ newFoodName: e.detail.value || '' });
  },

  onNewFoodCategorySelect(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ newFoodCategory: key });
  },

  confirmAddFood() {
    const name = (this.data.newFoodName || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入食物名称', icon: 'none' });
      return;
    }
    if (name.length > 10) {
      wx.showToast({ title: '名称不超过10个字', icon: 'none' });
      return;
    }

    const category = this.data.newFoodCategory;
    const catInfo = foodData.getCategoryInfo(category);
    const id = 'custom_' + Date.now();

    const periodMap = {
      breakfast: ['breakfast'],
      hotpot: ['lunch', 'dinner'],
      bbq: ['dinner', 'latenight'],
      fastfood: ['lunch', 'dinner', 'latenight'],
      noodles: ['lunch', 'dinner'],
      rice: ['lunch', 'dinner'],
      chinese: ['lunch', 'dinner'],
      japanese: ['lunch', 'dinner'],
      western: ['lunch', 'dinner'],
      snack: ['lunch', 'dinner', 'snack'],
      dessert: ['afternoon'],
      drink: ['afternoon'],
      light: ['lunch', 'afternoon'],
      latenight: ['latenight', 'dinner'],
    };
    const tags = periodMap[category] || ['lunch', 'dinner'];

    const newFood = { id, name, category, tags, custom: true };
    const customFoods = this.data.customFoods.concat([newFood]);

    wx.setStorageSync('food-picker-custom-menu', customFoods);
    this.setData({ showAddDialog: false, customFoods });
    this._loadData();
    wx.showToast({ title: '已添加', icon: 'success' });
  },

  onDeleteCustomFood(e) {
    const foodId = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '删除确认',
      content: '确定删除这个自定义食物吗？',
      success(res) {
        if (res.confirm) {
          const customFoods = that.data.customFoods.filter(f => f.id !== foodId);
          wx.setStorageSync('food-picker-custom-menu', customFoods);
          that.setData({ customFoods });
          that._loadData();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  onResetAll() {
    const that = this;
    wx.showModal({
      title: '重置确认',
      content: '将清除所有自定义食物并恢复默认开关，确定吗？',
      success(res) {
        if (res.confirm) {
          wx.removeStorageSync('food-picker-disabled-items');
          wx.removeStorageSync('food-picker-custom-menu');
          that._loadData();
          wx.showToast({ title: '已重置', icon: 'success' });
        }
      }
    });
  },
});
