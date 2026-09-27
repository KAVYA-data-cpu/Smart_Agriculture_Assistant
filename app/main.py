import threading
import time
from fastapi import FastAPI

from app.routers.crop import router as crop_router
from app.routers.fertilizer import router as fertilizer_router
from app.routers.soil import router as soil_router
from app.routers.market import router as market_router
from app.services.market_service import refresh_market_data
from app.routers.news import router as news_router
from app.routers.disease import router as disease_router
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from app.routers.chatbot import router as chatbot_router
from app.routers.voice import router as voice_router

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")


app.include_router(crop_router)
app.include_router(fertilizer_router)
app.include_router(soil_router)
app.include_router(market_router)
app.include_router(news_router)
app.include_router(disease_router)
app.include_router(chatbot_router)
app.include_router(voice_router)

# New frontend (public/app from bloom-smart-suite) — served at /app so its
# internal relative links (css/, js/, pages/, canonical "/app/index.html")
# resolve correctly. Mounted AFTER the API routers so /fertilizer/predict,
# /soil/upload, etc. are always matched before the static file catch-all.
app.mount("/app", StaticFiles(directory="frontend", html=True), name="frontend")


REFRESH_INTERVAL_SECONDS = 4 * 60 * 60  # every 4 hours


def start_background_refresh():
    def loop():
        while True:
            refresh_market_data()
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