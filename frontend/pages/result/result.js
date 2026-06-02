Page({
  data: {
    simplifiedText: '',
    audioUrl: '',
    audioContext: null,
    isPlaying: false 
  },

  onLoad: function(options) {
    // 接收首页传过来的参数
    this.setData({
      simplifiedText: decodeURIComponent(options.text),
      audioUrl: decodeURIComponent(options.audio) + "?t=" + new Date().getTime()
    });
    // 自动播放一次
    this.playAudio();
  },

  // 返回首页
  goBack() {
    wx.navigateBack();
  },

  // 播放语音（超大按钮触发）
  playAudio() {
    const { audioUrl } = this.data;
    if (!audioUrl) {
      wx.showToast({ title: '暂无语音可播放', icon: 'none' });
      return;
    }

    // 销毁旧的音频上下文
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }

    // 创建新的音频上下文并播放
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = audioUrl;
    innerAudioContext.play();
    innerAudioContext.onError((err) => {
      console.error("播放失败:", err);
      wx.showToast({ title: '语音播放失败', icon: 'none' });
    });

    // 播放时标记状态
    this.setData({ 
      audioContext: innerAudioContext,
      isPlaying: true
    });

    // 播放结束后恢复状态
    innerAudioContext.onEnded(() => {
      this.setData({ isPlaying: false });
    });

    wx.showToast({ title: '正在播放语音', icon: 'none', duration: 1500 });
  },

  // ================= 【新增：停止播放语音】 =================
  stopAudio() {
    const { audioContext } = this.data;
    if (audioContext) {
      audioContext.stop();
      this.setData({ isPlaying: false });
      wx.showToast({ title: '已停止播放', icon: 'none' });
    }
  },

  onLoad: function(options) {
    // 新增：容错处理，避免参数为空
    const text = options.text ? decodeURIComponent(options.text) : "暂无用药说明";
    const audio = options.audio ? decodeURIComponent(options.audio) + "?t=" + new Date().getTime() : "";
    
    this.setData({
      simplifiedText: text,
      audioUrl: audio
    });
    
    // 新增：只有音频地址存在时才自动播放
    if (audio) {
      this.playAudio();
    }
  },
})