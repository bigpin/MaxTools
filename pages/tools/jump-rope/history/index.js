// pages/tools/jump-rope/history/index.js
Page({
    data: {
        records: []
    },

    onLoad() {
        this.loadRecords();
    },

    onShow() {
        this.loadRecords();
    },

    loadRecords() {
        const records = wx.getStorageSync('jumpRopeRecords') || [];
        this.setData({ records });
    }
});
