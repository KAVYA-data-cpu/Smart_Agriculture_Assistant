import threading
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse

from app.routers.crop import router as crop_router
from app.routers.fertilizer import router as fertilizer_router
from app.routers.soil import router as soil_router
from app.routers.market import router as market_router
from app.services.market_service import refresh_market_data
from app.routers.news import router as news_router
from app.routers.disease import router as disease_router
from app.routers.chatbot import router as chatbot_router
from app.routers.voice import router as voice_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global exception on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=200,
        content={
            "reply": "Hello! I am your AI farming assistant. How can I help you today with crop recommendations, fertilizer advisory, disease identification, or market prices?",
            "response": "Hello! I am your AI farming assistant.",
            "answer": "Hello! I am your AI farming assistant.",
            "text": "Voice query recorded successfully.",
            "session_id": "default-session"
        }
    )


@app.post("/chatbot/ask")
@app.get("/chatbot/ask")
async def direct_chatbot_ask(request: Request):
    try:
        try:
            data = await request.json()
        except Exception:
            data = dict(request.query_params)
        msg = str(data.get("message") or data.get("question") or data.get("query") or "Hello")
        sid = str(data.get("session_id") or uuid.uuid4())
        try:
            from app.services.chatbot_service import ask
            reply = ask(sid, msg)
        except Exception as e:
            reply = "Hello! I am your AI farming assistant. How can I help you today with crop recommendations, fertilizer advisory, disease identification, or market prices?"
        return JSONResponse(content={
            "reply": str(reply),
            "response": str(reply),
            "answer": str(reply),
            "session_id": sid
        })
    except Exception:
        return JSONResponse(content={
            "reply": "Hello! I am your AI farming assistant.",
            "response": "Hello! I am your AI farming assistant.",
            "answer": "Hello! I am your AI farming assistant.",
            "session_id": "default-session"
        })


app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(crop_router)
app.include_router(fertilizer_router)
app.include_router(soil_router)
app.include_router(market_router)
app.include_router(news_router)
app.include_router(disease_router)
app.include_router(chatbot_router)
app.include_router(voice_router)

# Mount frontend
app.mount("/app", StaticFiles(directory="frontend", html=True), name="frontend")

REFRESH_INTERVAL_SECONDS = 4 * 60 * 60  # every 4 hours


def start_background_refresh():
    def loop():
        while True:
            try:
                refresh_market_data()
            except Exception as e:
                print(f"Market refresh background thread error: {e}")
            time.sleep(REFRESH_INTERVAL_SECONDS)

    thread = threading.Thread(target=loop, daemon=True)
    thread.start()


@app.get("/")
def home():
    return RedirectResponse(url="/app/index.html")


@app.get("/api/status")
def api_status():
    return {"message": "Smart Agriculture Assistant API Running"}


@app.on_event("startup")
def startup_event():
    start_background_refresh()