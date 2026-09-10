from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
  return {
      "status": "success",
      "message": "Inventory backend: What's up, Mondo?",
  }
