import os
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# html=True 옵션을 주면 /static/sub.html 요청 시 해당 html을 바로 띄워줍니다.
app.mount("/static", StaticFiles(directory=STATIC_DIR, html=True), name="static")

# @app.get("/")
# def read_root():
#   return {
#       "status": "success",
#       "message": "Inventory backend: What's up, Mondo?",
#   }

@app.get("/")
def read_root():
  return FileResponse(os.path.join(STATIC_DIR, "index.html"))
