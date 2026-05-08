// index.js
// 1. 在最上面定义一个全局地址，以后换了热点只改这里！！
const SERVER_URL = "http://192.168.43.115:8000"; 

Page({
  data: {
    simplifiedText: '' 
  },

  uploadImage: function() {
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
          // 2. 这里引用上面的变量
          url: SERVER_URL + '/recognize-and-simplify', 
          filePath: tempFilePath,
          name: 'zklmbq_file',
          
          success(uploadRes) {  
            try {
              const data = JSON.parse(uploadRes.data);
              if (data.status === "success") {
                that.setData({
                  simplifiedText: data.simplified_text
                });

                if (data.audio_path) {
                  const innerAudioContext = wx.createInnerAudioContext();
                  // 3. 这里也引用上面的变量，保证地址绝对一致
                  innerAudioContext.src = SERVER_URL + data.audio_path + "?t=" + new Date().getTime(); 
                  
                  console.log("🎵 准备播放，当前请求地址：", innerAudioContext.src);
                  innerAudioContext.play(); 
                  
                  innerAudioContext.onError((err) => {
                    console.error("❌ 播放失败:", err.errMsg);
                  });
                }
              }
            } catch (error) {
              console.error("❌ 解析失败:", error);
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