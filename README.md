# 银发伴行 - 识药助手 (Silver Companion - Medicine Assistant)
一款专为老年人设计的 AI 拍照识药小程序。通过手机拍照药盒，利用 OCR 技术提取文字，并结合 DeepSeek 大模型将其转化为易于理解的“大白话”医嘱，同时提供自动语音播报功能（TTS），解决老年人看不清、看不懂药盒说明书的痛点。

🌟 核心功能
拍照识药：利用手机摄像头快速抓取药盒包装文字。

AI 深度解读：调用 DeepSeek-V3 模型，将复杂的化学术语转化为口语化的用药指导。

适老化 UI：超大字体、高对比度绿色按钮、极简交互流程。

全自动语音播报：集成 CosyVoice 语音大模型，识别完成后自动朗读医嘱，无需点击。

离线 OCR 识别：后端采用 EasyOCR，在本地完成文字初步提取，保护隐私且响应迅速。

🛠️ 技术架构
前端 (WeChat Mini Program)
语言：JavaScript / WXML / WXSS

核心功能：图片上传、Flex 弹性布局、InnerAudioContext 语音流播放、真机调试环境下的局域网穿透。

后端 (Python Server)
框架：FastAPI (异步高性能 Web 框架)

OCR 引擎：EasyOCR (离线识别引擎)

AI 大模型：DeepSeek-V3 (语义简化) & CosyVoice-0.5B (语音合成)

API 平台：硅基流动 (SiliconFlow)

环境管理：Python venv 虚拟环境

🚀 快速启动
1. 后端环境配置
Bash/再vs code 的终端里也可以
# 进入项目目录
cd backend (vs code 里无需这一步)

# 创建并激活虚拟环境
python -m venv venv
source venv/Scripts/activate  # Windows 环境

# 安装依赖
在虚拟环境vevn里下载requirements.txt里的包
输入pip install -r requirements.txt 即可完成所有配置

# 配置环境变量 (在根目录创建 .env 文件)
SILICONFLOW_AK=你的硅基流动API_Key

# 启动服务器
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
2. 前端配置
使用 微信开发者工具 导入 frontend 文件夹。

在 index.js 顶部修改 SERVER_URL 为你电脑最新的局域网 IP (开启热点后通过 再命令板里 输入ipconfig 获取 看IPV4 那一行)：

JavaScript
const SERVER_URL = "http://192.168.x.x:8000";
点击 真机调试，使用手机连接电脑热点后扫码体验。

📂 项目结构
Plaintext
├── backend/
│   ├── main.py          # FastAPI 主逻辑 (OCR+LLM+TTS)
│   ├── static/          # 存放生成的临时语音文件 (voice.mp3)
│   └── .env             # 敏感 API Key 配置文件
├── frontend/
│   ├── pages/
│   │   └── index/       # 主页面 (拍照、显示、播放)
│   ├── app.json         # 全局配置
│   └── app.wxss         # 全局样式
└── README.md