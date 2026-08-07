from fastapi import APIRouter

from app.schemas.crop_schema import CropInput
from app.services.predictor import predict_crop
from app.services.database_service import save_prediction
from app.services.history_service import get_history
from app.services.weather_service import get_weather

router = APIRouter()


@router.post("/predict")
def predict(data: CropInput):

    # Predict the crop
    crop = predict_crop(data)

    # Fetch weather data for the city
    weather = get_weather(data.city)

    # Save prediction into PostgreSQL
    save_prediction(data, crop)

    # Return response
    return {
        "recommended_crop": crop,
        "weather": weather,
        "message": "Prediction saved successfully."
    }


@router.get("/history")
def history():

    return get_history()