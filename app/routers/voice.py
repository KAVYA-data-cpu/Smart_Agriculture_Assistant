import os
import shutil
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.repositories.speech_repository import transcribe_audio
from app.repositories.voice_repository import synthesize_speech

router = APIRouter(prefix="/voice", tags=["Voice"])

UPLOAD_FOLDER = os.path.join("app", "static", "uploads")


@router.post("/transcribe")
def transcribe(file: UploadFile = File(...)):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    save_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    text = transcribe_audio(save_path)
    return {"text": text}


class SpeakRequest(BaseModel):
    text: str
    lang: str = "en"


@router.post("/speak")
def speak(request: SpeakRequest):
    filepath = synthesize_speech(request.text, request.lang)
    return FileResponse(filepath, media_type="audio/mpeg", filename="reply.mp3")