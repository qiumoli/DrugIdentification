import os
import io
import ssl # 导入 ssl 模块
import requests
from fastapi.staticfiles import StaticFiles # <--- 【新增】引入静态文件服务
# ==========================================
# 终极魔法：全局关闭 SSL 证书验证！
# 这样就可以绕过校园网/代理软件的网络拦截
# ==========================================
ssl._create_default_https_context = ssl._create_unverified_context####
from fastapi import FastAPI, UploadFile, File
import easyocr
from openai import OpenAI
from PIL import Image
import numpy as np
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()

app = FastAPI()

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

@app.post("/recognize-and-simplify")
async def recognize_and_simplify(zklmbq_file: UploadFile = File(...)):
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
        prompt = f"""你是一位耐心的全科医生，擅长用最通俗易懂的“大白话”向不识字的老人解释药用法。
请从下方杂乱的药盒 OCR 文字中，提取关键信息，并用不超过 200 字的口语化语言告诉我：
1. 这个药叫什么？
2. 怎么吃（一次几颗）？
3. 什么时候吃？
4. 有什么绝对不能做的事？
5. 语气正常点，正常提取主要信息就行
原始文字如下：
{raw_text}"""

        response = siliconflow_client.chat.completions.create(
            model="deepseek-ai/DeepSeek-V3", 
            messages=[
                {"role": "system", "content": "你是一位专注于适老化服务的医疗助手。"},
                {"role": "user", "content": prompt}
            ],
            stream=False
        )
        
        simplified_text = response.choices[0].message.content
        
        # ==========================================
        # --- 阶段三 (新增)：云端硅基流动 TTS 语音合成 ---
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
                "input": simplified_text, # 把刚才DeepSeek生成的大白话丢给语音模型
                "voice": "FunAudioLLM/CosyVoice2-0.5B:alex", # alex 是一个比较稳重的声音
                "response_format": "mp3"
            }
            
            # 向硅基流动发送请求
            tts_response = requests.post(tts_url, json=tts_data, headers=headers)
            
            # 把返回的音频存到电脑的 static 文件夹里
            if tts_response.status_code == 200:
                with open("static/voice.mp3", "wb") as f:
                    f.write(tts_response.content)
                audio_path = "/static/voice.mp3"
            else:
                print("语音生成报错了:", tts_response.text)
                
        except Exception as e:
            print("语音模块异常:", e)
        # ==========================================

        # --- 最后：把文字和语音的路径一起发给小程序 ---
        return {
            "status": "success", 
            "simplified_text": simplified_text,
            "raw_ocr_text_for_debug": raw_text,
            "audio_path": audio_path # <--- 把生成的 MP3 路径告诉手机
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}
@app.get("/")
def home():
    return {"message": "银发伴行:EasyOCR + DeepSeek 后端已启动！"}