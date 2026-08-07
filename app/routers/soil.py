import os
import shutil

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.ocr_service import extract_text, SUPPORTED_EXTENSIONS
from app.services.soil_service import extract_soil_values

router = APIRouter()


@router.post("/soil/upload")
def upload_soil_report(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext or 'unknown'}'. Please upload a PDF or an image (PNG/JPG).",
        )

    os.makedirs("uploads", exist_ok=True)
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        text = extract_text(file_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    soil_values = extract_soil_values(text)

    return {
        "ocr_text": text,
        "soil_values": soil_values,
    }
