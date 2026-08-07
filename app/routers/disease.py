import os
import shutil
from fastapi import APIRouter, UploadFile, File

from app.services.disease_service import diagnose_leaf_image
from app.services.translation_service import translate_dict

router = APIRouter(prefix="/disease", tags=["Disease Detection"])

UPLOAD_FOLDER = os.path.join("app", "static", "uploads")


@router.post("/detect")
def detect_disease(file: UploadFile = File(...), lang: str = "en"):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    save_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = diagnose_leaf_image(save_path)
    return translate_dict(result, lang, fields=["disease", "treatment"])