from app.repositories import disease_repository

TREATMENTS = {
    "Tomato___Early_blight": "Remove infected leaves; apply a copper-based or chlorothalonil fungicide; avoid overhead watering.",
    "Tomato___Late_blight": "Remove and destroy infected plants immediately; apply a fungicide containing mancozeb or copper; improve air circulation.",
    "Tomato___Leaf_Mold": "Improve ventilation, reduce humidity, apply a fungicide like chlorothalonil.",
    "Potato___Early_blight": "Rotate crops, remove infected foliage, apply fungicide (mancozeb/chlorothalonil).",
    "Potato___Late_blight": "Destroy infected plants, apply a systemic fungicide, avoid working in wet fields.",
    "Corn___Common_rust": "Apply fungicide at first sign, plant rust-resistant hybrids next season.",
    "Apple___Apple_scab": "Apply fungicide early in the season, rake and destroy fallen leaves.",
    # add more mappings as needed for the diseases your model covers
}

DEFAULT_TREATMENT = "No specific treatment on file for this condition — consult a local agricultural extension officer."


def diagnose_leaf_image(image_path):
    result = disease_repository.predict_disease(image_path)

    label = result["label"]
    is_healthy = "healthy" in label.lower()

    return {
        "disease": label.replace("___", " - ").replace("_", " "),
        "confidence_percent": result["confidence"],
        "is_healthy": is_healthy,
        "treatment": "No treatment needed — plant appears healthy." if is_healthy else TREATMENTS.get(label, DEFAULT_TREATMENT)
    }