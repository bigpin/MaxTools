const versionUtil = require('../../../utils/version');
const foodData = require('./data');

// 全部用 rpx，CSS 里 .slot-item 高度 80rpx，.slot-viewport 高度 400rpx
// translateY 也用 rpx，不做任何 px 换算，彻底消除单位不一致问题
const SLOT_ITEM_H = 80;   // rpx
const VIEWPORT_H = 400;   // rpx
const CENTER_OFFSET = (VIEWPORT_H - SLOT_ITEM_H) / 2; // = 160 rpx
const SLOT_COPIES = 40;
const MIN_SLOT_ROUNDS = 6;
const CARD_TOTAL = 9;

Page({
  data: {
    statusBarHeight: 0,
    currentPeriod: '',
    periodLabel: '',
    periodIcon: '',
    mode: 'slot',
    spinning: false,
    resultFood: null,
    showResult: false,
    resultAnimClass: '',

    slotColumns: [[], [], []],
    // 与 _initSlotColumns 一致：第 3 行（index=2）落在视口正中，与高亮区重合
    slotOffsets: [0, 0, 0],
    slotTransitions: ['none', 'none', 'none'],

    cards: [],
    cardResult: null,

    foodPool: [],
    shakeEnabled: true,
    showPeriodPicker: false,
    periodList: [],
    manualPeriod: '',
  },

  _lastShakeTime: 0,
  _accListener: null,
  _loaded: false,
  _slotCurIdxs: [2, 2, 2],

  onLoad() {
    const sys = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: sys.statusBarHeight || 0 });
    versionUtil.setNavigationBarTitleWithVersion('今天吃什么');
    this._initPeriod();
    this._loadFoodPool();
    this._initSlotColumns();
    this._initCards();
    this._loaded = true;
  },

  onShow() {
    if (this._loaded) {
      this._initPeriod();
      this._loadFoodPool();
      this._initSlotColumns();
      this._initCards();
    }
    this._startAccelerometer();
  },

  onHide() { this._stopAccelerometer(); },
  onUnload() { this._stopAccelerometer(); },

  goBack() {
    wx.navigateBack({
      fail: function () { wx.switchTab({ url: '/pages/index/index' }); }
    });
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/tools/food-picker/settings' });
  },

  onShareAppMessage() {
    var food = this.data.resultFood;
    var title = food
      ? '我抽到了「' + food.name + '」，你也来试试！'
      : '选择困难症救星！随机帮你决定今天吃什么';
    return { title: title, path: '/pages/tools/food-picker/index' };
  },

  // ==================== Period & Pool ====================

  _initPeriod() {
    var period = this.data.manualPeriod || foodData.getCurrentPeriod();
    var info = foodData.TIME_PERIODS[period];
    var list = Object.keys(foodData.TIME_PERIODS).map(function (key) {
      return { key: key, label: foodData.TIME_PERIODS[key].label, icon: foodData.TIME_PERIODS[key].icon };
    });
    this.setData({
      currentPeriod: period,
      periodLabel: info.label,
      periodIcon: info.icon,
      periodList: list,
    });
  },

  onPeriodTap() {
    if (this.data.spinning) return;
    this.setData({ showPeriodPicker: !this.data.showPeriodPicker });
  },

  closePeriodPicker() {
    this.setData({ showPeriodPicker: false });
  },

  onSelectPeriod(e) {
    var key = e.currentTarget.dataset.key;
    this.setData({ showPeriodPicker: false, manualPeriod: key });
    this._initPeriod();
    this._loadFoodPool();
    this._initSlotColumns();
    this._initCards();
  },

  _loadFoodPool() {
    var disabledIds = wx.getStorageSync('food-picker-disabled-items') || [];
    var customFoods = wx.getStorageSync('food-picker-custom-menu') || [];
    var pool = foodData.getFoodsForPeriod(this.data.currentPeriod, disabledIds, customFoods);
    this.foodPool = pool;
    this.setData({ foodPool: pool });
  },

  // ==================== Mode Switch ====================

  switchMode(e) {
    var mode = e.currentTarget.dataset.mode;
    if (mode === this.data.mode || this.data.spinning) return;
    this.setData({ mode: mode, showResult: false, resultFood: null });
    if (mode === 'slot') {
      this._initSlotColumns();
    } else if (mode === 'card') {
      this._initCards();
    }
  },

  // ==================== Slot Machine ====================
  //
  // 设计原则（参考 lucky-canvas）：
  // 1. 三列各自独立 shuffle，显示顺序不同
  // 2. 每列由同一份 base 重复 SLOT_COPIES 次拼成长条带
  // 3. translateY 全部用 rpx（与 CSS 同单位），公式：offset = CENTER_OFFSET - idx * SLOT_ITEM_H
  //    当 offset 使得第 idx 项的顶边 = (VIEWPORT_H - SLOT_ITEM_H)/2，即正好在高亮区中央
  // 4. 先随机抽 winFood，再给每列找到 winFood 在该列周期内的位置并写入
  // 5. 弹窗结果直接用 winFood（因为三列目标格都已写入 winFood，不存在不一致）

  _buildSlotColumns() {
    var pool = this.foodPool || [];
    if (!pool.length) return [[], [], []];
    this._slotPoolLen = pool.length;
    var cols = [[], [], []];
    for (var c = 0; c < 3; c++) {
      var base = pool.slice().sort(function () { return Math.random() - 0.5; });
      var items = [];
      for (var r = 0; r < SLOT_COPIES; r++) {
        for (var i = 0; i < base.length; i++) {
          items.push({
            name: base[i].name,
            id: base[i].id,
            category: base[i].category,
            _uid: 'c' + c + 'r' + r + 'i' + i,
          });
        }
      }
      cols[c] = items;
    }
    return cols;
  },

  _idx2offset: function (idx) {
    return CENTER_OFFSET - idx * SLOT_ITEM_H;
  },

  // 在 colItems 数组中，从 startIdx 往后找第一个 id === foodId 的位置
  _findFoodAfter: function (colItems, foodId, startIdx) {
    for (var i = startIdx; i < colItems.length; i++) {
      if (colItems[i].id === foodId) return i;
    }
    return -1;
  },

  _initSlotColumns: function () {
    var cols = this._buildSlotColumns();
    if (!cols[0].length) return;
    var colLen = cols[0].length;
    // 视口 400rpx / 行 80rpx → 共 5 行；中间行为 index=2，对应 translateY=0，与高亮区中心对齐
    var initIdx = Math.min(2, colLen - 1);
    this._slotCurIdxs = [initIdx, initIdx, initIdx];
    var off = this._idx2offset(initIdx);
    this.setData({
      slotColumns: cols,
      slotOffsets: [off, off, off],
      slotTransitions: ['none', 'none', 'none'],
    });
  },

  _spinSlots: function () {
    if (this.data.spinning) return;
    var pool = this.foodPool || [];
    if (!pool.length) {
      wx.showToast({ title: '没有可选食物', icon: 'none' });
      return;
    }
    this.setData({ spinning: true, showResult: false });
    wx.vibrateShort({ type: 'medium' });

    // 1) 先随机选一个美食作为本次结果
    var winFood = pool[Math.floor(Math.random() * pool.length)];

    var poolLen = this._slotPoolLen || pool.length;
    // 每次开转都重新生成三列，避免沿用上次状态造成累计偏移
    var cols = this._buildSlotColumns();
    var colLen = cols[0].length;
    var initIdx = poolLen * 2;
    var curIdxs = [initIdx, initIdx, initIdx];
    this._slotCurIdxs = curIdxs.slice();
    var minAhead = poolLen * MIN_SLOT_ROUNDS;
    if (!cols[0].length) { this.setData({ spinning: false }); return; }

    // 2) 每列分别找 winFood 出现的位置（从当前位置 + minAhead 往后找）
    var targetIdxs = [0, 0, 0];
    var endOffsets = [0, 0, 0];
    var transitions = [];
    var that = this;

    for (var c = 0; c < 3; c++) {
      var searchFrom = curIdxs[c] + minAhead;
      var found = this._findFoodAfter(cols[c], winFood.id, searchFrom);
      if (found === -1) {
        // 极端情况：后面找不到了，从头搜一下（理论上不会发生，因为 SLOT_COPIES=40）
        found = this._findFoodAfter(cols[c], winFood.id, 0);
      }
      if (found === -1) {
        this.setData({ spinning: false });
        wx.showToast({ title: '抽取失败，请重试', icon: 'none' });
        return;
      }
      targetIdxs[c] = found;
      endOffsets[c] = this._idx2offset(found);
      var dur = 2.6 + c * 0.55;
      transitions.push('transform ' + dur + 's cubic-bezier(0.17, 0.67, 0.12, 0.99)');
    }

    // 3) 不修改列数据！直接从当前位置开始动画到目标位置
    var startOffsets = [
      this._idx2offset(curIdxs[0]),
      this._idx2offset(curIdxs[1]),
      this._idx2offset(curIdxs[2]),
    ];
    this.setData({
      slotColumns: cols,
      slotOffsets: startOffsets,
      slotTransitions: ['none', 'none', 'none'],
    }, function () {
      setTimeout(function () {
        that.setData({
          slotOffsets: endOffsets,
          slotTransitions: transitions,
        });
      }, 20);
    });

    var maxDur = 2.6 + 2 * 0.55;

    // 4) 动画结束后保持当前目标位置，只去掉 transition，避免最后再跳一下
    setTimeout(function () {
      that._slotCurIdxs = targetIdxs.slice();
      var catInfo = foodData.getCategoryInfo(winFood.category);
      that.setData({
        slotOffsets: endOffsets,
        slotTransitions: ['none', 'none', 'none'],
        spinning: false,
        resultFood: {
          name: winFood.name,
          id: winFood.id,
          category: winFood.category,
          categoryName: catInfo.name,
          categoryEmoji: catInfo.emoji,
        },
      }, function () {
        that._showResultPopup();
      });
    }, maxDur * 1000 + 60);
  },

  // ==================== Card Flip ====================

  _initCards() {
    var pool = this.foodPool || [];
    if (!pool.length) return;
    var selected = foodData.getRandomFoods(pool, CARD_TOTAL);
    var cards = selected.map(function (food, i) {
      return { index: i, food: food, flipped: false };
    });
    this.setData({ cards: cards, cardResult: null });
  },

  onCardTap(e) {
    if (this.data.spinning) return;
    var idx = e.currentTarget.dataset.index;
    var cards = this.data.cards.slice();
    if (cards[idx].flipped) return;

    cards[idx] = { index: cards[idx].index, food: cards[idx].food, flipped: true };
    var food = cards[idx].food;
    var catInfo = foodData.getCategoryInfo(food.category);

    this.setData({
      cards: cards,
      spinning: true,
      cardResult: {
        name: food.name,
        id: food.id,
        category: food.category,
        categoryName: catInfo.name,
        categoryEmoji: catInfo.emoji,
      },
    });

    wx.vibrateShort({ type: 'medium' });

    var that = this;
    setTimeout(function () {
      that.setData({
        spinning: false,
        resultFood: that.data.cardResult,
      });
      that._showResultPopup();
    }, 800);
  },

  // ==================== Result Popup ====================

  _showResultPopup() {
    this.setData({ showResult: true, resultAnimClass: '' });
    var that = this;
    setTimeout(function () {
      that.setData({ resultAnimClass: 'result-enter-active' });
    }, 30);
  },

  closeResult() {
    this.setData({ resultAnimClass: 'result-exit-active' });
    var that = this;
    setTimeout(function () {
      that.setData({ showResult: false, resultAnimClass: '' });
    }, 300);
  },

  onTryAgain() {
    this.closeResult();
    var that = this;
    setTimeout(function () {
      if (that.data.mode === 'slot') {
        that._initSlotColumns();
      } else if (that.data.mode === 'card') {
        that._initCards();
      }
    }, 350);
  },

  _jumpToApp(appId, path, foodName) {
    wx.navigateToMiniProgram({
      appId: appId,
      path: path || '',
      fail: function () {
        wx.setClipboardData({
          data: foodName,
          success: function () {
            wx.showToast({ title: '已复制「' + foodName + '」，请手动搜索', icon: 'none', duration: 2500 });
          },
          fail: function () {
            wx.showToast({ title: '跳转失败，请手动搜索', icon: 'none' });
          }
        });
      }
    });
  },

  _jumpMeituan(foodName) {
    wx.setClipboardData({
      data: foodName,
      success: function () {
        wx.hideToast();
        wx.navigateToMiniProgram({
          appId: 'wxde8ac0a21135c07d',
          fail: function () {
            wx.showToast({ title: '已复制「' + foodName + '」，请手动搜索', icon: 'none', duration: 2500 });
          }
        });
      }
    });
  },

  _jumpDianping(foodName) {
    var path = 'pages/search/search?keyword=' + encodeURIComponent(foodName || '');
    this._jumpToApp('wx2c348cf579062e56', path, foodName);
  },

  onGoNearby() {
    var food = this.data.resultFood;
    if (!food) return;
    var that = this;
    wx.showActionSheet({
      itemList: ['美团外卖', '大众点评'],
      success: function (res) {
        if (res.tapIndex === 0) {
          that._jumpMeituan(food.name);
        } else if (res.tapIndex === 1) {
          that._jumpDianping(food.name);
        }
      }
    });
  },

  onGoMeituan() {
    var food = this.data.resultFood;
    if (!food) return;
    this._jumpMeituan(food.name);
  },

  onGoDianping() {
    var food = this.data.resultFood;
    if (!food) return;
    this._jumpDianping(food.name);
  },

  // ==================== Main Action ====================

  onMainAction() {
    if (this.data.spinning) return;
    if (this.data.mode === 'slot') {
      this._spinSlots();
    } else {
      this._initCards();
      wx.showToast({ title: '请翻一张牌', icon: 'none', duration: 1200 });
    }
  },

  // ==================== Shake ====================

  _startAccelerometer() {
    var that = this;
    wx.startAccelerometer({
      interval: 'normal',
      success: function () {
        that._accListener = function (res) {
          if (!that.data.shakeEnabled || that.data.spinning) return;
          var force = Math.abs(res.x) + Math.abs(res.y) + Math.abs(res.z);
          var now = Date.now();
          if (force > 3.5 && now - that._lastShakeTime > 1500) {
            that._lastShakeTime = now;
            wx.vibrateShort({ type: 'heavy' });
            if (that.data.mode === 'slot') {
              that._spinSlots();
            } else {
              that._initCards();
            }
          }
        };
        wx.onAccelerometerChange(that._accListener);
      }
    });
  },

  _stopAccelerometer() {
    wx.stopAccelerometer();
    if (this._accListener) {
      wx.offAccelerometerChange(this._accListener);
      this._accListener = null;
    }
  },
});
