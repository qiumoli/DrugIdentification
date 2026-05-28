Page({
  data: {
    historyList: [] // 历史记录列表
  },

  onLoad: function() {
    // 页面加载时读取本地存储的历史记录
    this.loadHistory();
  },

  // 读取本地历史记录
  loadHistory() {
    const history = wx.getStorageSync('drugHistory') || [];
    this.setData({
      historyList: history
    });
  },

  // 返回首页
  goBack() {
    wx.navigateBack();
  },

  // 清空历史记录
  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '是否清空所有识药历史记录？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('drugHistory');
          this.setData({
            historyList: []
          });
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  }
})