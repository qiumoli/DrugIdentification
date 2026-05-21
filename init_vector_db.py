import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
import requests
import os
from dotenv import load_dotenv

load_dotenv() # 加载你的 .env 文件获取 AK

# ==========================================
# 【新增】定制化：懂中文的硅基向量大脑
# ==========================================
class SiliconFlowEmbedding(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        url = "https://api.siliconflow.cn/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {os.getenv('SILICONFLOW_AK')}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "BAAI/bge-m3", # 专门处理中文的顶尖模型
            "input": input
        }
        response = requests.post(url, json=payload, headers=headers).json()
        return [item["embedding"] for item in response["data"]]

chinese_embedding = SiliconFlowEmbedding()

print("🚀 正在启动本地向量数据库...")
client = chromadb.PersistentClient(path="./med_knowledge")

try:
    client.delete_collection(name="official_manuals")
    print("已清理旧数据 (英文向量)，准备建立全新的中文知识库...")
except:
    pass

# 【关键修改】建表时，把我们的中文大脑装上去！
collection = client.create_collection(
    name="official_manuals",
    embedding_function=chinese_embedding
)
print("📚 正在批量录入《老年人核心用药说明书》并进行中文向量化计算...")

medications = [
    {
        "id": "med_001",
        "name": "999感冒灵颗粒",
        "desc": "【成份】三叉苦、金盏银盘、对乙酰氨基酚等。\n【不良反应】可见困倦、嗜睡。\n【禁忌】严重肝肾功能不全者禁用。\n【注意事项】本品含对乙酰氨基酚。服药期间不得饮酒；不能同时服用与本品成份相似的其他抗感冒药；开越野车或高空作业者慎用。"
    },
    {
        "id": "med_002",
        "name": "苯磺酸氨氯地平片 (降压药)",
        "desc": "【适应症】高血压、冠心病。\n【用法用量】通常起始剂量为5mg，每日一次。最大剂量为10mg，每日一次。\n【禁忌】对二氢吡啶类药物过敏者禁用。\n【注意事项】绝对禁止与葡萄柚汁（西柚汁）同服，会导致药效成倍增加引起严重低血压！"
    },
    {
        "id": "med_003",
        "name": "盐酸二甲双胍片 (降糖药)",
        "desc": "【适应症】2型糖尿病。\n【用法用量】口服，进食时或餐后服。起始剂量通常为每日500mg。\n【注意事项】最大的副作用是胃肠道反应（恶心、呕吐、腹泻），所以必须在饭中或饭后立刻服用，绝不能空腹吃！"
    },
    {
        "id": "med_004",
        "name": "硝酸甘油片 (急救药)",
        "desc": "【适应症】用于冠心病心绞痛的治疗及预防。\n【用法用量】心绞痛发作时，立即将1片放在舌下含服。\n【注意事项】极其重要：必须舌下含服！绝对不能用水吞服，吞服无效！含服时最好坐着，站着含服可能导致晕厥。"
    },
    {
        "id": "med_005",
        "name": "布洛芬缓释胶囊 (芬必得)",
        "desc": "【适应症】缓解轻至中度疼痛如头痛、关节痛，也用于普通感冒或流行性感冒引起的发热。\n【用法用量】口服。成人一次1粒，一日2次（早晚各一次）。\n【注意事项】肠胃溃疡患者禁用！不能与阿司匹林等其他解热镇痛药同服。服药期间禁止饮酒。"
    }
]

docs = [med["desc"] for med in medications]
metas = [{"source": "国家药监局", "medicine_name": med["name"]} for med in medications]
ids = [med["id"] for med in medications]

collection.add(documents=docs, metadatas=metas, ids=ids)
print(f"✅ 成功！已将 {len(medications)} 种核心药物说明书向量化并存入 ChromaDB。")

print("\n🔍 架构师检索测试：模拟老人家拍到 '高血压，葡萄柚'")
results = collection.query(
    query_texts=["高血压，葡萄柚"], 
    n_results=1
)

print("🎯 向量检索命中的说明书是：")
print(results['metadatas'][0][0]['medicine_name'])
print(results['documents'][0][0])