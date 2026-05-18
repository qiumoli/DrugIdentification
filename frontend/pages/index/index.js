// index.js
// 1. 在最上面定义一个全局地址，以后换了热点只改这里！！
const SERVER_URL = "http://192.168.43.115:8000"; 

Page({
  data: {
    simplifiedText: '',
    myOpenId: '' // 新增一个用来存身份证的变量
  },

  // 【新增】页面一打开，立刻执行微信 OAuth 登录流程
  onLoad: function() {
    const that = this;
    wx.login({
      success: (res) => {
        // 拿着临时 code 去找我们的 Python 服务器换 OpenID
        wx.request({
          url: SERVER_URL + '/login?code=' + res.code,
          success: (serverRes) => {
            that.setData({ myOpenId: serverRes.data.openid });
            console.log("🔑 登录成功！我的身份证是:", serverRes.data.openid);
          }
        })
      }
    })
  },
 // 第一步：点击按钮触发授权框
  uploadImage: function() {
    const that = this; 
    
    // 弹出微信官方的订阅消息授权框
    wx.requestSubscribeMessage({
      tmplIds: ['qFTYlaBx_nB6CCIFpTwj-USKD7hM-vkuu25jDTyllVQ'], // 填入你的真实模板ID
      success(res) {
        if (res['qFTYlaBx_nB6CCIFpTwj-USKD7hM-vkuu25jDTyIlVQ'] === 'accept') {
          console.log("✅ 用户同意了吃药提醒推送！");
        } else {
          console.log("❌ 用户拒绝了推送。");
        }
      },
      complete() {
        // 不管老人家点“允许”还是“拒绝”，框关掉后，立刻拉起相机
        that.startCamera();
      }
    })
  },

  // 第二步：实际的拍照和网络请求逻辑（其实就是你之前的代码换了个名字）
  startCamera: function() {
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
          url: SERVER_URL + '/recognize-and-simplify', 
          filePath: tempFilePath,
          name: 'zklmbq_file',
          // 【新增】把身份证一起打包发给后端
          formData: {
            'openid': that.data.myOpenId
          },
          success(uploadRes) {  
            try {
              const data = JSON.parse(uploadRes.data);
              if (data.status === "success") {
                that.setData({
                  simplifiedText: data.simplified_text
                });
                console.log("✅ 页面更新文字成功！");

                if (data.audio_path) {
                  const innerAudioContext = wx.createInnerAudioContext();
                  innerAudioContext.src = SERVER_URL + data.audio_path + "?t=" + new Date().getTime(); 
                  innerAudioContext.play(); 
                  innerAudioContext.onError((err) => {
                    console.error("❌ 播放录音失败了:", err.errMsg);
                  });
                }
              } else {
                wx.showModal({ title: '识别失败', content: data.message, showCancel: false });
              }
            } catch (error) {
              console.error("❌ 解析后端返回的数据失败:", error);
            }
          },
          complete() {
            wx.hideLoading();
          }
        })
      }
    })
  },
})
