import os
import io
import ssl # 导入 ssl 模块
import json
import requests
import sqlite3
from fastapi.staticfiles import StaticFiles # <--- 【新增】引入静态文件服务
# ==========================================
# 终极魔法：全局关闭 SSL 证书验证！
# 这样就可以绕过校园网/代理软件的网络拦截
# ==========================================
ssl._create_default_https_context = ssl._create_unverified_context####
from fastapi import FastAPI, UploadFile, File,Form
import easyocr
from openai import OpenAI
from PIL import Image
import numpy as np
from dotenv import load_dotenv
import datetime
from apscheduler.schedulers.background import BackgroundScheduler


# 加载 .env 文件中的环境变量
load_dotenv()

app = FastAPI()

WX_APPID = "wxa1519a9fa0ad77ae"
WX_APPSECRET = "48cfb6d16a37b6c8500d167d9197e96b"
TEMPLATE_ID = "qFTYlaBx_nB6CCIFpTwj-USKD7hM-vkuu25jDTyllVQ"


# ==========================================
# 【新增】支柱二：初始化 SQLite 数据库
# ==========================================
def init_db():
    # 连接到本地数据库文件（如果没有会自动创建）
    conn = sqlite3.connect('medication.db')
    cursor = conn.cursor()
    # 编写 SQL 语句，创建用药计划表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS medication_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            medicine_name TEXT,
            times_per_day INTEGER,
            dosage_per_time TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. 【新增】扫药历史表（做记账用，永久保存）
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            medicine_name TEXT,
            spoken_text TEXT, 
            audio_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

# 每次启动 FastAPI 时，检查并建表
init_db()

# ==========================================
# 【新增】核心模块1：微信登录对暗号接口
# ==========================================
@app.get("/login")
def wx_login(code: str):
    url = f"https://api.weixin.qq.com/sns/jscode2session?appid={WX_APPID}&secret={WX_APPSECRET}&js_code={code}&grant_type=authorization_code"
    res = requests.get(url).json()
    print("\n🔑 成功对接微信服务器！抓取到用户的专属 OpenID:", res.get("openid"), "\n")
    return {"openid": res.get("openid")}

# ==========================================
# 【新增】核心模块2：微信消息发射器
# ==========================================
def send_wechat_msg(openid, med_name, dosage):
    # 1. 找微信拿临时通行证 (access_token)
    token_url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={WX_APPID}&secret={WX_APPSECRET}"
    access_token = requests.get(token_url).json().get("access_token")
    if not access_token: return
        
    # 2. 组装要发射的导弹 (严格按照你截图里的字段名)
    now_time = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    send_url = f"https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={access_token}"
    data = {
        "touser": openid,
        "template_id": TEMPLATE_ID,
        "page": "pages/index/index", # 老人点开消息后跳回你的小程序
        "data": {
            "thing2": {"value": f"吃药:{str(med_name)[:15]}"}, # 限制字数防报错
            "date3": {"value": now_time},
            "thing11": {"value": f"每次{str(dosage)[:15]}。请按时服药！"}
        }
    }
    
    # 3. 发射！
    result = requests.post(send_url, json=data).json()
    if result.get("errcode") == 0:
        print(f"✅ 叮咚！成功向微信推送提醒：该吃 {med_name} 了！")
        return True
    else:
        print(f"❌ 微信推送失败，原因: {result}")
        return False




# ==========================================
# 【新增】支柱三：定时任务扫描器 (吃药闹钟)
# ==========================================
def check_medication_plans():
    now_time = datetime.datetime.now().strftime('%H:%M:%S')
    print(f"\n⏰ [吃药管家心跳] 当前时间: {now_time}，正在巡房扫描吃药计划...")
    
    try:
        conn = sqlite3.connect('medication.db')
        cursor = conn.cursor()
        # 查出所有用户的吃药计划
        cursor.execute("SELECT user_id, medicine_name, times_per_day, dosage_per_time FROM medication_plans")
        plans = cursor.fetchall()

        if not plans:
            print("   📭 当前数据库还没有任何吃药计划。")
        else:
            # 把 for 循环里的内容换成这个：
            for plan in plans:
                user_id, med_name, times, dosage = plan
                
                if user_id == "test_user":
                    print(f"   ⚠️ 忽略测试数据 ({med_name})，没有真实 OpenID 发不了。")
                else:
                    print(f"   💊 发现真实任务，准备呼叫用户 {user_id} 吃 {med_name}!")
                    success = send_wechat_msg(user_id, med_name, dosage)
                    
                    # 为了防止每分钟无限轰炸你的微信，我们设定：推送成功后就从计划表里删掉这条记录
                    if success:
                        cursor.execute("DELETE FROM medication_plans WHERE user_id=? AND medicine_name=?", (user_id, med_name))
                        conn.commit()
                
        conn.close()
    except Exception as e:
        print("❌ 定时器扫描数据库报错:", e)

# 启动后台定时任务
scheduler = BackgroundScheduler()
# 为了方便测试，我们设置为每 1 分钟执行一次
scheduler.add_job(check_medication_plans, 'interval', minutes=1)
scheduler.start()




# 【新增】创建静态文件夹并挂载，供小程序下载录音
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# 1. 初始化 EasyOCR 引擎 (支持简体中文和英文)
# 第一次运行会自动下载约 10-20MB 的轻量级模型，速度通常很快
reader = easyocr.Reader(['ch_sim', 'en'])

# 2. 初始化硅基流动大模型客户端
api_key_from_env=os.getenv("SILICONFLOW_AK")
siliconflow_client = OpenAI(
    api_key=api_key_from_env,
    base_url="https://api.siliconflow.cn/v1"
)

# 把原来这一行替换掉：
@app.post("/recognize-and-simplify")
async def recognize_and_simplify(zklmbq_file: UploadFile = File(...), openid: str = Form("test_user")):
    try:
        # --- 阶段一：本地离线 OCR 识别 (EasyOCR) ---
        contents = await zklmbq_file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        img_np = np.array(image)

        results = reader.readtext(img_np)
        ocr_texts = [res[1] for res in results]
        raw_text = " ".join(ocr_texts)
        
        if not raw_text.strip():
             return {"status": "error", "message": "未在图片中识别到清晰文字，请重新拍照"}

        # --- 阶段二：云端硅基流动 LLM 语义重组 ---
        prompt = f"""你是一位专业的适老化用药助手。请从下方的药盒 OCR 文字中提取信息。
你必须严格按照以下的 JSON 格式输出，不要返回任何其他的解释性文字，不要有 markdown 标记。
JSON 格式如下：
{{
  "spoken_text": "用不超过150字的通俗大白话解释(包含怎么吃、何时吃、有什么禁忌)，语气要亲切自然。",
  "medicine_name": "提取到的药名",
  "times_per_day": "每天吃几次(只能填纯数字，比如 3。如果不确定填 0)",
  "dosage_per_time": "每次的剂量(比如:1包,或 2粒)"
}}

原始文字如下：
{raw_text}"""

        response = siliconflow_client.chat.completions.create(
            model="deepseek-ai/DeepSeek-V3", 
            messages=[
                {"role": "system", "content": "你是一个严格输出 JSON 格式的医疗数据提取器。"},
                {"role": "user", "content": prompt}
            ],
            stream=False,
            response_format={"type": "json_object"}
        )
        
        llm_result_str = response.choices[0].message.content
        
        try:
            structured_data = json.loads(llm_result_str)
            print("🎉 大模型完美提取了数据：", structured_data)
            
            simplified_text = structured_data.get("spoken_text", "解析失败，请重试")
            medicine_name = structured_data.get("medicine_name", "未知药物")
            times_per_day = structured_data.get("times_per_day", 0)
            dosage_per_time = structured_data.get("dosage_per_time", "遵医嘱")
        except Exception as e:
            print("⚠️ 大模型没有按规矩返回 JSON,报错了：", e, "\n原始返回:", llm_result_str)
            return {"status": "error", "message": "大模型数据结构化失败，请重新拍照"}
        

        # ==========================================
        # --- 阶段三：云端硅基流动 TTS 语音合成 ---
        # ==========================================
        audio_path = ""
        try:
            tts_url = "https://api.siliconflow.cn/v1/audio/speech"
            headers = {
                "Authorization": f"Bearer {os.getenv('SILICONFLOW_AK')}",
                "Content-Type": "application/json"
            }
            tts_data = {
                "model": "FunAudioLLM/CosyVoice2-0.5B",
                "input": simplified_text, 
                "voice": "FunAudioLLM/CosyVoice2-0.5B:alex", 
                "response_format": "mp3"
            }
            
            tts_response = requests.post(tts_url, json=tts_data, headers=headers)
            
            if tts_response.status_code == 200:
                with open("static/voice.mp3", "wb") as f:
                    f.write(tts_response.content)
                audio_path = "/static/voice.mp3"
            else:
                print("语音生成报错了:", tts_response.text)
                
        except Exception as e:
            print("语音模块异常:", e)


        # ==========================================
        # 【修改重点】：等所有东西（包括语音）都生成完了，最后统一存数据库！
        # ==========================================
        try:
            conn = sqlite3.connect('medication.db')
            cursor = conn.cursor()
            
            # 动作 A：存入计划表
            cursor.execute('''
                INSERT INTO medication_plans (user_id, medicine_name, times_per_day, dosage_per_time)
                VALUES (?, ?, ?, ?)
            ''', (openid, medicine_name, int(times_per_day), str(dosage_per_time)))
            
            # 动作 B：存入历史表 (这时候 audio_path 已经真实存在了！)
            cursor.execute('''
                INSERT INTO scan_history (user_id, medicine_name, spoken_text, audio_path)
                VALUES (?, ?, ?, ?)
            ''', (openid, medicine_name, simplified_text, audio_path))

            conn.commit()
            conn.close()
            print(f"💾 成功存入双表：计划表(闹钟) + 历史表(记录)!")
        except Exception as db_err:
            print("❌ 数据库存储失败:", db_err)


        # --- 最后：把文字和语音的路径一起发给小程序 ---
        return {
            "status": "success", 
            "simplified_text": simplified_text,
            "raw_ocr_text_for_debug": raw_text,
            "audio_path": audio_path 
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 【新增】历史记录查询接口
# ==========================================
@app.get("/history")
def get_history(openid: str):
    try:
        conn = sqlite3.connect('medication.db')
        # 把返回结果变成字典格式，方便转成 JSON
        conn.row_factory = sqlite3.Row 
        cursor = conn.cursor()
        
        # 用 SQL 的降序排列 (DESC)，让最新拍的药显示在最前面
        cursor.execute('''
            SELECT medicine_name, spoken_text, audio_path, created_at 
            FROM scan_history 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        ''', (openid,))
        
        rows = cursor.fetchall()
        conn.close()
        
        # 把查询结果打包成列表返回
        history_list = [dict(row) for row in rows]
        return {"status": "success", "data": history_list}
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
@app.get("/")
def home():
    return {"message": "银发伴行:EasyOCR + DeepSeek 后端已启动！"}