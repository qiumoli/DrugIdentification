我们的方案fastapi+EasyOCR+硅基流动
在vscode里打开文件夹，在终端里，运行，先激活虚拟环境venv,windows 是python -m vevn vevn
然后输入.\vevn\Scripts\activate
在虚拟环境vevn里下载requirements.txt里的包
输入pip install -r requirements.txt
成功后输入 uvicorn main:app --reload
出现一个网址的时候用浏览器打开，后端就成功运行了
在那个网址后加上docs就可以上传图片，得到药品说明了
temp文件夹里的是可以用于测试的药品说明书图片
