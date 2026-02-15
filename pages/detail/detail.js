// pages/detail/detail.js
const versionUtil = require('../../utils/version');

Page({
    data: {
        detailText: '',
        monthIndex: 0
    },

    onLoad(options) {
        versionUtil.setNavigationBarTitleWithVersion('详情');
        this.setData({
            monthIndex: options.index ? parseInt(options.index) : 0
        });
    },

    onReady() {
        const taxInfo = getApp().globalData.currentTaxInfo;
        const index = this.data.monthIndex;
        
        if (taxInfo && taxInfo.length > 0 && taxInfo[index]) {
            const detailInfo = taxInfo[index];
            const output = this.selectComponent('#taxInfo');
            if (output) {
                const text = `第${index + 1}月详情\n\n实际入账：${detailInfo.salary.toFixed(2)}元\n养老保险：${detailInfo.old.toFixed(2)}元\n失业保险：${detailInfo.lost.toFixed(2)}元\n医疗保险：${detailInfo.medical.toFixed(2)}元\n住房公积金：${detailInfo.house.toFixed(2)}元\n累积缴个税：${detailInfo.tax.toFixed(2)}元`;
                output.updateText(text);
            }
        } else {
            const output = this.selectComponent('#taxInfo');
            if (output) {
                output.updateText('暂无数据，请先在个税计算器中进行计算');
            }
        }
    }
});
