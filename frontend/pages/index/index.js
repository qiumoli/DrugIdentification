// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
Page({
  data: {
    simplifiedText: '' // 存储后端返回的大白话
  },

  uploadImage: function() {
    // 【第一步：加入这句祖传魔法！】在函数最开头，把页面对象存进变量 that 里
    const that = this; 

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '正在认药...' });

        wx.uploadFile({
          url: 'http://192.168.137.1:8000/recognize-and-simplify', // 你的热点IP
          filePath: tempFilePath,
          name: 'zklmbq_file',
          
          success(uploadRes) {  // 注意这里
            try {
              const data = JSON.parse(uploadRes.data);
              if (data.status === "success") {
                
                // 【第二步：关键修改！】把 this.setData 改成 that.setData
                that.setData({
                  simplifiedText: data.simplified_text
                });
                
                console.log("页面更新成功！");
              } else {
                wx.showModal({ title: '识别失败', content: data.message, showCancel: false });
              }
            } catch (error) {
              console.error("解析失败:", error);
            }
          },
          complete() {
            wx.hideLoading();
          }
        })
      }
    })
  }
})  