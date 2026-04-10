const versionUtil = require('../../../utils/version');
const foodData = require('./data');

// 与 index.wxss 中 .slot-viewport / .slot-item 高度保持一致（单列老虎机，加高加大字号）
const SLOT_ITEM_H = 112;  // rpx
const VIEWPORT_H = 560;   // rpx，5 行可见
const CENTER_OFFSET = (VIEWPORT_H - SLOT_ITEM_H) / 2; // = 224 rpx
// 相对「纯公式」的条带垂直修正（rpx）。小程序里静止首帧与 transform 动画结束后的合成略有差异，
// 会出现「初始化偏上、停轮偏下」：用两套增量分别微调（仅改条带 translateY，不混用会拉不齐动画起点）。
const SLOT_ALIGN_BASE_Y = SLOT_ITEM_H - 20;
// 静止（_initSlotColumns）：偏上则略增大（条带整体下移）
const SLOT_ALIGN_IDLE_EXTRA_Y = 18;
// 转动起止与停止（_spinSlots）：偏下则略减小（条带整体上移）
const SLOT_ALIGN_SPIN_EXTRA_Y = -6;
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

    slotStrip: [],
    slotOffset: 0,
    slotTransition: 'none',

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
  _slotCurIdx: 2,

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

  // ==================== Slot Machine（单列）====================
  // 长条由 base 重复 SLOT_COPIES 次；offset = CENTER_OFFSET - idx*SLOT_ITEM_H；中间行 index=2

  _buildSlotStrip: function () {
    var pool = this.foodPool || [];
    if (!pool.length) return [];
    this._slotPoolLen = pool.length;
    var base = pool.slice().sort(function () { return Math.random() - 0.5; });
    var items = [];
    for (var r = 0; r < SLOT_COPIES; r++) {
      for (var i = 0; i < base.length; i++) {
        items.push({
          name: base[i].name,
          id: base[i].id,
          category: base[i].category,
          _uid: 'r' + r + 'i' + i,
        });
      }
    }
    return items;
  },

  // 静止：与高亮对齐（进页、切时段、从翻牌切回老虎机等）
  _idx2offsetIdle: function (idx) {
    return CENTER_OFFSET - idx * SLOT_ITEM_H + SLOT_ALIGN_BASE_Y + SLOT_ALIGN_IDLE_EXTRA_Y;
  },
  // 转动动画与停轮后：与静止分开微调，避免「停轮偏下」
  _idx2offsetSpin: function (idx) {
    return CENTER_OFFSET - idx * SLOT_ITEM_H + SLOT_ALIGN_BASE_Y + SLOT_ALIGN_SPIN_EXTRA_Y;
  },

  // 在 colItems 数组中，从 startIdx 往后找第一个 id === foodId 的位置
  _findFoodAfter: function (colItems, foodId, startIdx) {
    for (var i = startIdx; i < colItems.length; i++) {
      if (colItems[i].id === foodId) return i;
    }
    return -1;
  },

  _initSlotColumns: function () {
    var strip = this._buildSlotStrip();
    if (!strip.length) return;
    var len = strip.length;
    var initIdx = Math.min(2, len - 1);
    this._slotCurIdx = initIdx;
    var off = this._idx2offsetIdle(initIdx);
    this.setData({
      slotStrip: strip,
      slotOffset: off,
      slotTransition: 'none',
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
    var strip = this._buildSlotStrip();
    var len = strip.length;
    var startIdx = Math.min(2, len - 1);
    this._slotCurIdx = startIdx;
    var minAhead = poolLen * MIN_SLOT_ROUNDS;
    if (!strip.length) {
      this.setData({ spinning: false });
      return;
    }

    var searchFrom = startIdx + minAhead;
    var found = this._findFoodAfter(strip, winFood.id, searchFrom);
    if (found === -1) {
      found = this._findFoodAfter(strip, winFood.id, 0);
    }
    if (found === -1) {
      this.setData({ spinning: false });
      wx.showToast({ title: '抽取失败，请重试', icon: 'none' });
      return;
    }

    // 起点必须与当前静止一致，用 idle，否则开转时会跳一截
    var startOffset = this._idx2offsetIdle(startIdx);
    var endOffset = this._idx2offsetSpin(found);
    var spinDur = 3.2;
    var transitionStr = 'transform ' + spinDur + 's cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    var catInfo = foodData.getCategoryInfo(winFood.category);
    var that = this;

    this.setData({
      slotStrip: strip,
      slotOffset: startOffset,
      slotTransition: 'none',
    }, function () {
      setTimeout(function () {
        that.setData({
          slotOffset: endOffset,
          slotTransition: transitionStr,
        });
        setTimeout(function () {
          that._slotCurIdx = found;
          var snap = that._idx2offsetSpin(found);
          that.setData({
            slotOffset: snap,
            slotTransition: 'none',
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
        }, spinDur * 1000 + 120);
      }, 50);
    });
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
        that._spinSlots();
      } else if (that.data.mode === 'card') {
        that._initCards();
      }
    }, 320);
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
