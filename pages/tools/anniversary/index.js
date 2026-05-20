// pages/tools/anniversary/index.js
const dateUtils = require('../utils/dateUtils');
const versionUtil = require('../../../utils/version');

// 纪念日类型配置
const TYPE_CONFIG = {
  birthday: { 
    name: '生日', 
    typeName: '生日',
    iconName: 'user',
    iconColor: '#e34d59'
  },
  anniversary: { 
    name: '恋爱纪念日', 
    typeName: '纪念日',
    iconName: 'heart',
    iconColor: '#1a5d6a'
  },
  payment: { 
    name: '还款日', 
    typeName: '财务',
    iconName: 'wallet',
    iconColor: '#ff8800'
  },
  holiday: { 
    name: '节日', 
    typeName: '节日',
    iconName: 'gift',
    iconColor: '#00a870'
  },
  custom: { 
    name: '自定义', 
    typeName: '其他',
    iconName: 'bookmark',
    iconColor: '#9c27b0'
  }
};

// 获取云数据库引用
const db = wx.cloud.database();

Page({
  data: {
    anniversaryList: [],
    displayList: [],
    currentTab: 'upcoming', // upcoming, past, all
    showActionSheet: false,
    showDeleteDialog: false,
    currentItem: null,
    showTestButton: true,
    loading: false
  },

  onLoad() {
    versionUtil.setNavigationBarTitleWithVersion('纪念日管家');
    this.loadAnniversaryList();
  },

  onShow() {
    this.loadAnniversaryList();
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack({
      fail: () => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    });
  },

  /**
   * 切换Tab
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.filterList();
  },

  /**
   * 根据Tab过滤列表
   */
  filterList() {
    const { anniversaryList, currentTab } = this.data;
    let displayList = [];
    
    switch (currentTab) {
      case 'upcoming':
        displayList = anniversaryList.filter(item => !item.isPast || item.isToday);
        break;
      case 'past':
        displayList = anniversaryList.filter(item => item.isPast && !item.isToday);
        break;
      case 'all':
      default:
        displayList = anniversaryList;
        break;
    }
    
    this.setData({ displayList });
  },

  /**
   * 从云端加载纪念日列表
   */
  async loadAnniversaryList() {
    this.setData({ loading: true });
    
    try {
      let list = [];
      try {
        const res = await db.collection('anniversary')
          .orderBy('createdAt', 'desc')
          .get();
        list = res.data || [];
        
        const localList = list.map(item => ({
          ...item,
          id: item._id
        }));
        wx.setStorageSync('anniversaryList', localList);
        
        console.log('从云端加载成功，共', list.length, '条记录');
      } catch (cloudErr) {
        console.log('云端加载失败，使用本地缓存:', cloudErr);
        list = wx.getStorageSync('anniversaryList') || [];
      }
      
      const processedList = this.processAnniversaryList(list);
      this.setData({
        anniversaryList: processedList,
        loading: false
      });
      this.filterList();
    } catch (error) {
      console.error('加载纪念日列表失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 处理纪念日列表
   */
  processAnniversaryList(list) {
    const today = new Date();
    const processed = list.map(item => {
      const result = dateUtils.calculateDaysDifference(item.date, today);
      const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.custom;
      
      // 计算badge类型
      let badgeType = 'normal';
      if (result.isToday) {
        badgeType = 'today';
      } else if (result.isPast) {
        badgeType = 'past';
      } else if (result.days <= 5) {
        badgeType = 'urgent';
      } else if (result.days <= 14) {
        badgeType = 'soon';
      }

      // 计算进度（对于年度重复事件）
      let showProgress = false;
      let progressPercent = 0;
      if (item.isYearly && !result.isPast) {
        showProgress = true;
        // 计算年度进度
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const targetDate = new Date(item.date);
        targetDate.setFullYear(today.getFullYear());
        const totalDays = Math.floor((targetDate - startOfYear) / (1000 * 60 * 60 * 24));
        const passedDays = Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24));
        progressPercent = Math.min(100, Math.max(0, (passedDays / totalDays) * 100));
      }

      // 生成提醒设置文本
      const remindDays = item.remindDays || [7, 3, 1];
      let remindText = '';
      if (remindDays.length > 0) {
        const remindLabels = remindDays.map(d => {
          if (d === 0) return '当天';
          return `${d}天前`;
        });
        remindText = remindLabels.join('、') + '提醒';
      }

      return {
        ...item,
        days: result.days,
        isPast: result.isPast,
        isToday: result.isToday,
        displayDate: dateUtils.getFriendlyDateText(item.date),
        typeName: typeConfig.typeName,
        iconName: typeConfig.iconName,
        iconColor: typeConfig.iconColor,
        badgeType: badgeType,
        showProgress: showProgress,
        progressPercent: progressPercent,
        remindText: remindText
      };
    });

    // 排序
    processed.sort((a, b) => {
      if (a.isPast && !b.isPast) return 1;
      if (!a.isPast && b.isPast) return -1;
      if (a.isPast && b.isPast) return b.days - a.days;
      return a.days - b.days;
    });

    return processed;
  },

  /**
   * 点击卡片
   */
  onCardTap(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      currentItem: item,
      showActionSheet: true
    });
  },

  /**
   * 操作菜单显示状态变化
   */
  onActionSheetChange(e) {
    this.setData({
      showActionSheet: e.detail.visible
    });
  },

  /**
   * 取消操作
   */
  onCancelAction() {
    this.setData({
      showActionSheet: false,
      currentItem: null
    });
  },

  /**
   * 点击编辑
   */
  onEditClick() {
    this.setData({
      showActionSheet: false
    });
    
    if (this.data.currentItem) {
      const id = this.data.currentItem._id || this.data.currentItem.id;
      wx.navigateTo({
        url: `/pages/tools/anniversary/add?id=${id}`
      });
    }
    
    this.setData({ currentItem: null });
  },

  /**
   * 点击删除
   */
  onDeleteClick() {
    this.setData({
      showActionSheet: false,
      showDeleteDialog: true
    });
  },

  /**
   * 确认删除
   */
  async confirmDelete() {
    if (!this.data.currentItem) {
      this.setData({ showDeleteDialog: false });
      return;
    }

    const item = this.data.currentItem;
    const cloudId = item._id || item.id;

    try {
      try {
        await db.collection('anniversary').doc(cloudId).remove();
        console.log('云端删除成功');
      } catch (cloudErr) {
        console.log('云端删除失败:', cloudErr);
      }

      const list = wx.getStorageSync('anniversaryList') || [];
      const newList = list.filter(i => i._id !== cloudId && i.id !== cloudId);
      wx.setStorageSync('anniversaryList', newList);
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });

      this.setData({
        showDeleteDialog: false,
        currentItem: null
      });

      this.loadAnniversaryList();
    } catch (error) {
      console.error('删除失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  /**
   * 取消删除
   */
  cancelDelete() {
    this.setData({
      showDeleteDialog: false,
      currentItem: null
    });
  },

  /**
   * 点击添加按钮
   */
  onAddClick() {
    wx.navigateTo({
      url: '/pages/tools/anniversary/add'
    });
  },

  /**
   * 检查并发送订阅消息通知
   */
  checkAndSendNotification() {
    wx.requestSubscribeMessage({
      tmplIds: ['_sxu2b5a-gmqPcBSbtJVn3sdJy7r70qkkaKEynCQVxY'],
      success: (res) => {
        console.log('订阅消息授权结果:', res);
        this.sendNotifications();
      },
      fail: (err) => {
        console.log('订阅消息授权失败:', err);
        this.sendNotifications();
      }
    });
  },

  /**
   * 发送通知
   */
  sendNotifications() {
    try {
      const list = wx.getStorageSync('anniversaryList') || [];
      const today = new Date();
      
      list.forEach(item => {
        const result = dateUtils.calculateDaysDifference(item.date, today);
        const remindDays = item.remindDays || [7, 3, 1];
        
        if (!result.isPast && remindDays.includes(result.days)) {
          this.sendNotificationMessage(item, result.days);
        }
      });
    } catch (error) {
      console.error('检查通知失败:', error);
    }
  },

  /**
   * 测试推送消息
   */
  testNotification() {
    wx.showModal({
      title: '测试推送',
      content: '将发送一条测试推送消息，请确保已配置云开发',
      success: (res) => {
        if (res.confirm) {
          const testItem = {
            id: 'test_' + Date.now(),
            name: '测试纪念日',
            date: dateUtils.formatDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)),
            type: 'custom',
            note: '测试用'
          };
          
          wx.requestSubscribeMessage({
            tmplIds: ['_sxu2b5a-gmqPcBSbtJVn3sdJy7r70qkkaKEynCQVxY'],
            success: (res) => {
              console.log('订阅消息授权结果:', res);
              this.sendNotificationMessage(testItem, 1);
              wx.showToast({
                title: '测试推送已发送',
                icon: 'success'
              });
            },
            fail: (err) => {
              console.error('订阅消息授权失败:', err);
              wx.showToast({
                title: '授权失败，请重试',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 发送订阅消息
   */
  sendNotificationMessage(item, daysLeft) {
    const notificationKey = `notification_${item.id}_${daysLeft}`;
    const lastNotification = wx.getStorageSync(notificationKey);
    const today = dateUtils.formatDate(new Date());
    
    if (lastNotification === today) {
      return;
    }

    if (typeof wx.cloud === 'undefined') {
      console.log('云开发未初始化，跳过订阅消息发送');
      return;
    }

    wx.cloud.callFunction({
      name: 'sendAnniversaryMsg',
      data: {
        templateId: '_sxu2b5a-gmqPcBSbtJVn3sdJy7r70qkkaKEynCQVxY',
        data: {
          thing1: { value: item.name },
          time2: { value: item.date },
          thing3: { value: `提前${daysLeft}天提醒` },
          thing4: { value: item.notes || '请记得这个重要日子' }
        }
      },
      success: (res) => {
        console.log('云函数调用成功，返回结果:', res);
        if (res.result && res.result.success) {
          console.log('订阅消息发送成功:', res.result);
          wx.showToast({
            title: '推送发送成功',
            icon: 'success'
          });
          wx.setStorageSync(notificationKey, today);
        } else {
          console.error('订阅消息发送失败:', res.result);
          const errorMsg = res.result.error || res.result.errorCode || '发送失败';
          const errorDetail = res.result.errorDetail;
          
          let displayMsg = errorMsg;
          if (errorDetail && errorDetail.errCode) {
            displayMsg = `${errorMsg} (错误码: ${errorDetail.errCode})`;
          }
          
          wx.showModal({
            title: '推送失败',
            content: displayMsg + '\n\n请查看控制台获取详细错误信息',
            showCancel: false,
            confirmText: '知道了'
          });
        }
      },
      fail: (err) => {
        console.error('云函数调用失败:', err);
        wx.showToast({
          title: '调用失败: ' + (err.errMsg || '未知错误'),
          icon: 'none',
          duration: 3000
        });
      }
    });
  }
});
