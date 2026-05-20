// pages/tools/anniversary/add.js
const dateUtils = require('../utils/dateUtils');
const versionUtil = require('../../../utils/version');
const { checkTextWithTip } = require('../utils/contentCheck');

// 纪念日类型配置
const TYPE_CONFIG = {
  birthday: { 
    name: '生日',
    icon: 'user',
    color: '#e34d59'
  },
  anniversary: { 
    name: '纪念日',
    icon: 'heart',
    color: '#1a5d6a'
  },
  payment: { 
    name: '还款日',
    icon: 'wallet',
    color: '#ff8800'
  },
  holiday: { 
    name: '节日',
    icon: 'gift',
    color: '#00a870'
  },
  custom: { 
    name: '其他',
    icon: 'bookmark',
    color: '#9c27b0'
  }
};

// 提醒频率选项
const REMIND_OPTIONS = [
  { value: 7, label: '提前7天' },
  { value: 3, label: '提前3天' },
  { value: 1, label: '提前1天' },
  { value: 0, label: '当天提醒' }
];

// 获取云数据库引用
const db = wx.cloud.database();

Page({
  data: {
    isEdit: false,
    editId: null,
    cloudId: null,
    formData: {
      name: '',
      date: '',
      type: 'birthday',
      typeName: '生日',
      note: '',
      remindDays: [7, 3, 1]
    },
    nameError: false,
    typeList: [],
    remindOptions: REMIND_OPTIONS,
    remindSelected: {
      7: true,
      3: true,
      1: true,
      0: false
    },
    saving: false,
    minDate: '1900-01-01'
  },

  onLoad(options) {
    versionUtil.setNavigationBarTitleWithVersion('添加纪念日');
    // 生成类型列表
    const typeList = Object.keys(TYPE_CONFIG).map(key => ({
      value: key,
      label: TYPE_CONFIG[key].name,
      icon: TYPE_CONFIG[key].icon,
      color: TYPE_CONFIG[key].color
    }));
    
    this.setData({
      typeList: typeList,
      minDate: dateUtils.formatDate(new Date('1900-01-01'))
    });

    // 如果是编辑模式
    if (options.id) {
      this.setData({
        isEdit: true,
        editId: options.id
      });
      this.loadAnniversaryData(options.id);
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  },

  /**
   * 加载要编辑的纪念日数据
   */
  async loadAnniversaryData(id) {
    try {
      let item = null;
      try {
        const res = await db.collection('anniversary').doc(id).get();
        if (res.data) {
          item = res.data;
          this.setData({ cloudId: id });
        }
      } catch (cloudErr) {
        console.log('云端加载失败，尝试本地:', cloudErr);
      }

      if (!item) {
        const list = wx.getStorageSync('anniversaryList') || [];
        item = list.find(i => i.id === id || i._id === id);
      }
      
      if (item) {
        const remindDays = item.remindDays || [7, 3, 1];
        const remindSelected = {
          7: remindDays.includes(7),
          3: remindDays.includes(3),
          1: remindDays.includes(1),
          0: remindDays.includes(0)
        };
        
        this.setData({
          formData: {
            name: item.name,
            date: item.date,
            type: item.type,
            note: item.note || '',
            typeName: TYPE_CONFIG[item.type] ? TYPE_CONFIG[item.type].name : '其他',
            remindDays: remindDays
          },
          remindSelected: remindSelected
        });
      } else {
        wx.showToast({
          title: '纪念日不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 名称输入
   */
  onNameChange(e) {
    const name = e.detail.value.trim();
    this.setData({
      'formData.name': name,
      nameError: !name
    });
  },

  /**
   * 日期改变
   */
  onDateChange(e) {
    const date = e.detail.value;
    this.setData({
      'formData.date': date
    });
  },

  /**
   * 类型选择
   */
  onTypeSelect(e) {
    const value = e.currentTarget.dataset.value;
    const typeConfig = TYPE_CONFIG[value];
    
    this.setData({
      'formData.type': value,
      'formData.typeName': typeConfig ? typeConfig.name : '其他'
    });
  },

  /**
   * 备注输入
   */
  onNoteChange(e) {
    this.setData({
      'formData.note': e.detail.value
    });
  },

  /**
   * 提醒频率切换
   */
  onRemindToggle(e) {
    const value = parseInt(e.currentTarget.dataset.value);
    const remindDays = [...this.data.formData.remindDays];
    const remindSelected = { ...this.data.remindSelected };
    const index = remindDays.indexOf(value);
    
    if (index > -1) {
      remindDays.splice(index, 1);
      remindSelected[value] = false;
    } else {
      remindDays.push(value);
      remindSelected[value] = true;
    }
    
    remindDays.sort((a, b) => b - a);
    
    this.setData({
      'formData.remindDays': remindDays,
      remindSelected: remindSelected
    });
  },

  /**
   * 保存
   */
  async onSave() {
    if (!this.validateForm()) {
      return;
    }

    if (this.data.saving) return;

    this.setData({ saving: true });

    try {
      const formData = this.data.formData;

      const textToCheck = [formData.name, formData.note].filter(Boolean).join(' ');
      const isSafe = await checkTextWithTip(textToCheck, '纪念日内容');
      if (!isSafe) {
        this.setData({ saving: false });
        return;
      }

      const now = Date.now();

      const anniversaryData = {
        name: formData.name,
        date: formData.date,
        type: formData.type,
        note: formData.note,
        remindDays: formData.remindDays,
        notified: {},
        updatedAt: now
      };

      let cloudId = this.data.cloudId;

      if (this.data.isEdit && cloudId) {
        await db.collection('anniversary').doc(cloudId).update({
          data: anniversaryData
        });
      } else {
        anniversaryData.createdAt = now;
        const addRes = await db.collection('anniversary').add({
          data: anniversaryData
        });
        cloudId = addRes._id;
      }

      const localData = {
        ...anniversaryData,
        _id: cloudId,
        id: cloudId
      };
      
      const list = wx.getStorageSync('anniversaryList') || [];
      const existingIndex = list.findIndex(item => item._id === cloudId || item.id === cloudId);
      
      if (existingIndex !== -1) {
        list[existingIndex] = localData;
      } else {
        list.push(localData);
      }
      
      wx.setStorageSync('anniversaryList', list);

      this.requestSubscribeAuth();

      wx.showToast({
        title: this.data.isEdit ? '保存成功' : '添加成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      console.error('保存失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ saving: false });
    }
  },

  /**
   * 请求订阅消息授权
   */
  requestSubscribeAuth() {
    wx.requestSubscribeMessage({
      tmplIds: ['_sxu2b5a-gmqPcBSbtJVn3sdJy7r70qkkaKEynCQVxY'],
      success: (res) => {
        console.log('订阅授权结果:', res);
      },
      fail: (err) => {
        console.log('订阅授权失败:', err);
      }
    });
  },

  /**
   * 验证表单
   */
  validateForm() {
    const { name, date, type } = this.data.formData;

    if (!name || !name.trim()) {
      this.setData({ nameError: true });
      wx.showToast({
        title: '请输入纪念日名称',
        icon: 'none'
      });
      return false;
    }

    if (!date) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      });
      return false;
    }

    if (!type) {
      wx.showToast({
        title: '请选择类型',
        icon: 'none'
      });
      return false;
    }

    return true;
  }
});
