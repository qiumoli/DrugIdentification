// index.js
// 1. 在最上面定义一个全局地址，以后换了热点只改这里！！
/* const SERVER_URL = "http://192.168.43.211:8000"; 

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
}) */

const SERVER_URL = "http://192.168.43.115:8000"; 

Page({
  data: {
    isLoading: false,
    myOpenId: '',
    manualMedicineName: '' // 【新增】用来保存用户输入的字

    
  },
  // 【新增】监听用户打字
  onInputMedicine: function(e) {
    this.setData({
      manualMedicineName: e.detail.value
    });
  },
 // ==========================================
  // 【完美缝合版】点击“查询”按钮后执行的动作
  // ==========================================
  submitManual: function() {
    const that = this;
    const text = this.data.manualMedicineName;
    
    if (!text) {
      wx.showToast({ title: '请先输入药名', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在查阅说明书...' });

    wx.request({
      url: SERVER_URL + '/manual-search',
      method: 'POST',
      data: {
        openid: that.data.myOpenId || 'test_user',
        manual_text: text
      },
      success(res) {
        const data = res.data; 
        
        if (data.status === "success") {
          console.log("✅ 后端手动检索成功！准备携带数据跳转到详情页...");
         
          // 【新增】：把服务器 IP 和后端的相对路径拼装成完整的 http:// 网址
          const fullAudioPath = data.audio_path ? (SERVER_URL + data.audio_path) : '';

          // 核心修复：带着完整的录音网址跳转
          wx.navigateTo({
            url: `/pages/result/result?text=${encodeURIComponent(data.simplified_text)}&audio=${encodeURIComponent(fullAudioPath)}`,
            success: () => {
              console.log("🚀 成功空降结果详情页！");
            },
            fail: (err) => {
              console.error("❌ 手动输入跳转失败，请检查路由：", err);
              wx.showToast({ title: '页面跳转失败', icon: 'none' });
            }
          });

        } else {
          wx.showModal({ title: '查询失败', content: data.message, showCancel: false });
        }
      },
      fail(err) {
        console.error("请求失败", err);
        wx.showModal({ title: '网络错误', content: '连不上服务器,请检查局域网IP', showCancel: false });
      },
      complete() {
        wx.hideLoading();
      }
    });
  },
  onLoad: function() {
    const that = this;
    wx.login({
      success: (res) => {
        wx.request({
          url: SERVER_URL + '/login?code=' + res.code,
          success: (serverRes) => {
            that.setData({ myOpenId: serverRes.data.openid });
          }
        })
      }
    })
  },

  // 新增：跳过识别，直接跳第二页（带测试参数）！！！！！有待删除
  jumpToResult() {
    // 测试文字可自定义，想显示什么就改什么
   const testText = "测试用药说明：每天吃2次，每次1片，饭后温水送服，忌辛辣食物";
   wx.navigateTo({
     url: `/pages/result/result?text=${encodeURIComponent(testText)}&audio=${encodeURIComponent('')}`,
      fail: (err) => {
       console.error("跳过识别跳转失败：", err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
     }
   });
  },

  uploadImage: function() {
    const that = this;
    this.setData({ isLoading: true });

    wx.requestSubscribeMessage({
      tmplIds: ['qFTYlaBx_nB6CCIFpTwj-USKD7hM-vkuu25jDTyllVQ'],
      complete() {
        that.startCamera();
      }
    })
  },

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
          formData: { 'openid': that.data.myOpenId },
          success(uploadRes) {  
            try {
              // 新增：打印后端返回的原始数据，方便排查
              console.log("后端原始返回：", uploadRes.data);
              const data = JSON.parse(uploadRes.data);
              
              // 新增：校验后端返回的字段
              if (data.status === "success" && data.simplified_text) {
                // 优化：用encodeURIComponent处理特殊字符，避免跳转参数出错
                const text = encodeURIComponent(data.simplified_text || "");
                const audio = encodeURIComponent((SERVER_URL + (data.audio_path || "")) || "");
                
                // 新增：打印跳转参数，确认无误
                console.log("跳转参数：", text, audio);
                
                // 跳转结果页（路径必须和app.json一致）
                wx.navigateTo({
                  url: `/pages/result/result?text=${text}&audio=${audio}`,
                  // 新增：跳转失败的回调，提示错误
                  fail: (err) => {
                    console.error("跳转失败：", err);
                    wx.showModal({
                      title: "跳转失败",
                      content: "请检查页面路径是否正确",
                      showCancel: false
                    });
                  }
                });
              } else {
                wx.showModal({ title: '识别失败', content: data.message || "未识别到药品信息", showCancel: false });
              }
            } catch (error) {
              console.error("解析数据失败：", error);
              wx.showModal({ 
                title: '识别失败', 
                content: '后端返回数据异常，请重试', 
                showCancel: false 
              });
            }
          },
          complete() {
            wx.hideLoading();
            that.setData({ isLoading: false });
          }
        })
      },
      fail() {
        that.setData({ isLoading: false });
        wx.showToast({ title: '已取消拍照', icon: 'none' });
      }
    })
  }
})