# 银发伴行 (SilverGuard) - 适老化多模态安全用药管家

一款专为老年人设计的全链路 AI 医疗辅助系统。通过“端云协同”架构，结合离线机器视觉 (OCR)、大型语言模型 (LLM)、向量检索增强 (RAG) 以及语音合成 (TTS) 技术，彻底解决老年人“看不清药盒、看不懂说明书、容易吃错药”的痛点。

本项目不仅实现了视觉信息到大白话医嘱的智能转化，更引入了本地向量知识库，有效消除了大模型的“医疗幻觉”，打造了一个安全、可靠、有温度的闭环用药守护系统。

## 🌟 核心功能特性

* **多模态端云识别 (Multi-modal Recognition)**：支持本地离线 EasyOCR 拍照识药与手动输入双通道容错，适配老年人复杂的设备使用场景。
* **RAG 防幻觉医疗知识库 (RAG-based Fact-Checking)**：内置 ChromaDB 向量数据库。用户查询时，系统会先匹配权威《国家药品说明书》，强制约束大模型基于事实输出，杜绝 AI 医疗幻觉。
* **AI 深度语义降维 (LLM Semantic Simplification)**：接入 DeepSeek-V3 顶尖大模型，将晦涩的医学术语（如“禁忌”、“不良反应”）自动翻译为不超过 150 字的亲切大白话。
* **全自动高拟真语音播报 (TTS Audio Stream)**：无缝串联 CosyVoice-0.5B 语音大模型，文字生成的瞬间同步下发 MP3 音频流，实现零点击自动朗读。
* **全生命周期用药管理 (Lifecycle Management)**：基于 SQLite 构建双表数据底座。提供用药历史账单查询，并结合 APScheduler 实现后台异步吃药闹钟推送（直达微信服务通知）。
* **适老化 UI/UX 设计**：超大高对比度输入框、防误触全屏按钮、极简的“零层级”交互流程。

---

## 🛠️ 技术架构栈

| 模块 | 技术选型 | 核心作用 |
| :--- | :--- | :--- |
| **前端客户端** | 微信小程序 (WXML/WXSS/JS) | 提供原生硬件调用（相机/音频）、界面渲染与微信 OAuth 鉴权 |
| **后端框架** | FastAPI (Python) | 异步非阻塞的高性能 RESTful API 服务提供 |
| **机器视觉** | EasyOCR | 纯本地离线运行的轻量级中英文文本提取 |
| **大语言模型** | DeepSeek-V3 | 负责逻辑推理、实体抽取（JSON 格式化）与大白话翻译 |
| **语音大模型** | CosyVoice2-0.5B (硅基流动) | 高拟真、带情感的适老化语音合成 |
| **向量数据库** | ChromaDB + BAAI/bge-m3 | 存储药品官方说明书，实现语义级相似度检索 (RAG) |
| **关系型数据库** | SQLite3 | 业务数据持久化：双表解耦设计（历史流水表 + 用药计划表） |
| **任务调度** | APScheduler | 独立后台守护进程，精准触发微信订阅消息推送 |

---

## 🚀 快速启动指南

### 1. 后端环境配置 (Python Server)

在终端中执行以下命令，完成虚拟环境的创建与依赖安装：

```bash
# 创建并激活虚拟环境 (VS Code 终端下操作)
python -m venv venv
source venv/Scripts/activate  # Windows 环境使用此命令激活

# 安装项目核心依赖包
pip install -r requirements.txt
2. 配置环境变量与初始化
在项目根目录创建 .env 文件，并填入你的 API 密钥：

Code snippet
SILICONFLOW_AK=你的硅基流动API_Key
初始化私有医疗向量知识库：
第一次运行项目前，必须先生成本地 ChromaDB 向量数据。在终端运行：

Bash
python init_vector_db.py
(看到终端输出“成功录入核心药物说明书”后，即可进入下一步)

3. 启动后端服务器
Bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
服务器启动时，SQLite 关系型数据库 (medication.db) 会自动执行 init_db() 建表逻辑。

4. 前端配置 (WeChat Mini Program)
使用 微信开发者工具 导入 frontend 文件夹。

打开 pages/index/index.js，在顶部修改 SERVER_URL 为你电脑当前的局域网 IPv4 地址：

JavaScript
const SERVER_URL = "[http://192.168.](http://192.168.)x.x:8000"; 
点击 真机调试，确保手机与电脑连接同一局域网（或连接电脑开放的热点），扫码即可体验。

📂 项目工程结构
Plaintext
SilverGuard/
├── backend/
│   ├── main.py                # FastAPI 核心业务路由与逻辑 (OCR/LLM/TTS/SQLite)
│   ├── init_vector_db.py      # 独立脚本：ChromaDB 向量知识库清洗与构建
│   ├── med_knowledge/         # ChromaDB 向量数据库持久化存储目录
│   ├── medication.db          # SQLite 关系型数据库 (自动生成)
│   ├── static/                # 静态资源挂载目录 (存放生成的语音流文件)
│   ├── requirements.txt       # Python 依赖清单
│   └── .env                   # 环境变量配置文件
├── frontend/
│   ├── pages/
│   │   ├── index/             # 首页入口 (多模态输入采集与请求分发)
│   │   └── result/            # 详情页面 (大白话展示与语音播放流)
│   ├── app.json               # 小程序全局路由配置
│   └── app.wxss               # 全局适老化 UI 样式
└── README.md                  # 项目说明文档