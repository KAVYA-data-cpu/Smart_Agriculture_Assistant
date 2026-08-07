from fastapi import APIRouter, HTTPException

from app.schemas.fertilizer_schema import FertilizerInput
from app.services.fertilizer_service import predict_fertilizer
from app.services.fertilizer_database_service import save_fertilizer_prediction
from app.services.fertilizer_history_service import get_fertilizer_history

router = APIRouter()


@router.post("/fertilizer/predict")
def fertilizer_prediction(data: FertilizerInput):
    try:
        fertilizer, weather = predict_fertilizer(data)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    save_fertilizer_prediction(data, weather, fertilizer)

    return {
        "recommended_fertilizer": fertilizer,
        "temperature": weather["temperature"],
        "humidity": weather["humidity"],
        "message": "Prediction saved successfully.",
    }


@router.get("/fertilizer/history")
def fertilizer_history():
    return get_fertilizer_history()