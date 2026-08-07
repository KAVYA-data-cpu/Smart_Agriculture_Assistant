import joblib
import pandas as pd

# Load model only once
model = joblib.load("models/crop_model.pkl")


def predict_crop(data):

    sample = pd.DataFrame([{
        "N": data.N,
        "P": data.P,
        "K": data.K,
        "temperature": data.temperature,
        "humidity": data.humidity,
        "ph": data.ph,
        "rainfall": data.rainfall
    }])

    prediction = model.predict(sample)

    return prediction[0]