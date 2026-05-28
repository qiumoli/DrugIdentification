const SERVER_URL = "http://192.168.43.211:8000"; 

Page({
  data: {
    isLoading: false,
    myOpenId: '',
    manualMedicineName: ''
  },

  // 监听用户输入药名
  onInputMedicine: function(e) {
    this.setData({
      manualMedicineName: e.detail.value
    });
  },

  // 手动查询药名
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
          console.log("✅ 后端手动检索成功！");
          const fullAudioPath = data.audio_path ? (SERVER_URL + data.audio_path) : '';

          // ✅【保存历史记录】
          that.saveToHistory(data.simplified_text);

          wx.navigateTo({
            url: `/pages/result/result?text=${encodeURIComponent(data.simplified_text)}&audio=${encodeURIComponent(fullAudioPath)}`,
            fail: (err) => {
              console.error("❌ 跳转失败", err);
              wx.showToast({ title: '页面跳转失败', icon: 'none' });
            }
          });
        } else {
          wx.showModal({ title: '查询失败', content: data.message, showCancel: false });
        }
      },
      fail(err) {
        console.error("请求失败", err);
        wx.showModal({ title: '网络错误', content: '连不上服务器', showCancel: false });
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


  // 拍照上传
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

  // 视频识别
  uploadVideo: function() {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 10,
      camera: 'back',
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        that.setData({ isLoading: true });
        wx.showLoading({ title: '正在视频分析...', mask: true });

        wx.uploadFile({
          url: SERVER_URL + '/recognize-video',
          filePath: tempFilePath,
          name: 'video_file',
          timeout: 120000, 
          formData: {
            'openid': that.data.myOpenId || 'test_user'
          },
          success(uploadRes) {
            const data = JSON.parse(uploadRes.data);
            if (data.status === "success") {
              const fullAudioPath = data.audio_path ? (SERVER_URL + data.audio_path) : '';

              // ✅【保存历史记录】
              that.saveToHistory(data.simplified_text);

              wx.navigateTo({
                url: `/pages/result/result?text=${encodeURIComponent(data.simplified_text)}&audio=${encodeURIComponent(fullAudioPath)}`
              });
            } else {
              wx.showModal({ title: '识别失败', content: data.message, showCancel: false });
            }
          },
          fail(err) {
            console.error("视频上传失败", err);
            wx.showModal({ title: '网络错误', content: '视频太大或网络不稳定', showCancel: false });
          },
          complete() {
            that.setData({ isLoading: false });
            wx.hideLoading();
          }
        });
      }
    });
  },

  // 启动相机识别
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
              console.log("后端原始返回：", uploadRes.data);
              const data = JSON.parse(uploadRes.data);
              
              if (data.status === "success" && data.simplified_text) {
                const text = encodeURIComponent(data.simplified_text || "");
                const audio = encodeURIComponent((SERVER_URL + (data.audio_path || "")) || "");
                
                console.log("跳转参数：", text, audio);

                // ✅【保存历史记录】
                that.saveToHistory(data.simplified_text);

                wx.navigateTo({
                  url: `/pages/result/result?text=${text}&audio=${audio}`,
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
  },

  // ================================
  // ✅ 历史记录功能（只新增，不修改原有代码）
  // ================================
  jumpToHistory() {
    wx.navigateTo({
      url: '/pages/history/history',
      fail: (err) => {
        console.error("跳转到历史记录失败：", err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  saveToHistory(text) {
    let history = wx.getStorageSync('drugHistory') || [];
    const newRecord = {
      id: Date.now(),
      text: text,
      time: new Date().toLocaleString()
    };
    history.unshift(newRecord);
    if (history.length > 20) {
      history = history.slice(0, 20);
    }
    wx.setStorageSync('drugHistory', history);
  }
});