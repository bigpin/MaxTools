// pages/tools/jump-rope/history/index.js
Page({
    data: {
        records: [],
        editing: false,
        selectedIds: []
    },

    onLoad() {
        this.loadRecords();
    },

    onShow() {
        this.loadRecords();
    },

    loadRecords() {
        const records = wx.getStorageSync('jumpRopeRecords') || [];
        this.setData({ records, editing: false, selectedIds: [] });
    },

    // ============ 单条删除 ============

    deleteRecord(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '删除记录',
            content: '确定要删除这条跳绳记录吗？',
            confirmColor: '#FF5252',
            success: (res) => {
                if (res.confirm) {
                    const records = this.data.records.filter(r => r.id !== id);
                    wx.setStorageSync('jumpRopeRecords', records);
                    this.setData({ records });
                    wx.showToast({ title: '已删除', icon: 'success' });
                }
            }
        });
    },

    // ============ 编辑模式（批量删除） ============

    toggleEdit() {
        const editing = !this.data.editing;
        this.setData({ editing, selectedIds: [] });
    },

    toggleSelect(e) {
        const id = e.currentTarget.dataset.id;
        let { selectedIds } = this.data;
        const idx = selectedIds.indexOf(id);
        if (idx > -1) {
            selectedIds.splice(idx, 1);
        } else {
            selectedIds.push(id);
        }
        this.setData({ selectedIds });
    },

    deleteSelected() {
        const { selectedIds } = this.data;
        if (selectedIds.length === 0) {
            wx.showToast({ title: '请先选择记录', icon: 'none' });
            return;
        }
        wx.showModal({
            title: '批量删除',
            content: `确定要删除选中的 ${selectedIds.length} 条记录吗？`,
            confirmColor: '#FF5252',
            success: (res) => {
                if (res.confirm) {
                    const records = this.data.records.filter(r => !selectedIds.includes(r.id));
                    wx.setStorageSync('jumpRopeRecords', records);
                    this.setData({ records, selectedIds: [], editing: false });
                    wx.showToast({ title: `已删除${selectedIds.length}条`, icon: 'success' });
                }
            }
        });
    },

    // ============ 清空全部 ============

    clearAll() {
        if (this.data.records.length === 0) {
            wx.showToast({ title: '暂无记录', icon: 'none' });
            return;
        }
        wx.showModal({
            title: '清空记录',
            content: `确定要清空全部 ${this.data.records.length} 条记录吗？此操作不可恢复！`,
            confirmColor: '#FF5252',
            success: (res) => {
                if (res.confirm) {
                    wx.removeStorageSync('jumpRopeRecords');
                    this.setData({ records: [], editing: false, selectedIds: [] });
                    wx.showToast({ title: '已清空', icon: 'success' });
                }
            }
        });
    }
});
