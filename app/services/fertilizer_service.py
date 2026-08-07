import joblib
import pandas as pd

from app.services.weather_service import get_weather

model = joblib.load("models/fertilizer_model.pkl")
soil_encoder = joblib.load("models/soil_encoder.pkl")
crop_encoder = joblib.load("models/crop_encoder.pkl")
fertilizer_encoder = joblib.load("models/fertilizer_encoder.pkl")


def predict_fertilizer(data):
    weather = get_weather(data.city)

    if "error" in weather:
        raise ValueError(f"Couldn't get weather for '{data.city}': {weather['error']}")

    temperature = weather["temperature"]
    humidity = weather["humidity"]

    soil = soil_encoder.transform([data.soil_type])[0]
    crop = crop_encoder.transform([data.crop_type])[0]

    sample = pd.DataFrame([{
        "Temparature": temperature,
        "Humidity": humidity,
        "Moisture": data.moisture,
        "Soil Type": soil,
        "Crop Type": crop,
        "Nitrogen": data.nitrogen,
        "Potassium": data.potassium,
        "Phosphorous": data.phosphorous,
    }])

    prediction = model.predict(sample)
    fertilizer = fertilizer_encoder.inverse_transform(prediction)[0]
    return fertilizer, weather