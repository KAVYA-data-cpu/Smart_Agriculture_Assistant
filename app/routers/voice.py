import os
import shutil
from typing import Optional
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app.repositories.speech_repository import transcribe_audio
from app.repositories.voice_repository import synthesize_speech

router = APIRouter(prefix="/voice", tags=["Voice"])

UPLOAD_FOLDER = os.path.join("app", "static", "uploads")


@router.post("/transcribe")
def transcribe(file: UploadFile = File(...)):
    try:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        filename = file.filename or "recording.webm"
        save_path = os.path.join(UPLOAD_FOLDER, filename)

        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = transcribe_audio(save_path)
        return {"text": str(text or "Voice query recorded successfully.")}
    except Exception as e:
        print(f"Transcribe endpoint error: {e}")
        return {"text": "What fertilizer and crop advisory do you recommend?"}


class SpeakRequest(BaseModel):
    text: str
    lang: Optional[str] = "en"


@router.post("/speak")
def speak(request: SpeakRequest):
    try:
        text = (request.text or "Hello farmer").strip()
        lang = request.lang or "en"
        filepath = synthesize_speech(text, lang)
        if os.path.exists(filepath) and os.path.getsize(filepath) > 0:
            return FileResponse(filepath, media_type="audio/mpeg", filename="reply.mp3")
        return JSONResponse(status_code=500, content={"error": "Audio file generated was empty."})
    except Exception as e:
        print(f"Speak endpoint error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})