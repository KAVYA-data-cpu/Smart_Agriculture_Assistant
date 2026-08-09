"""
disease_repository.py

Uses the Hugging Face Inference API for disease detection in cloud deployments.
Falls back to local PyTorch if HF_API_KEY is not set and torch is available.

The HF Inference API is FREE — just set HF_API_KEY with a free token from:
https://huggingface.co/settings/tokens  (Read access, no card required)
"""

import os
import requests
from PIL import Image

MODEL_NAME = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"
HF_API_URL = f"https://api-inference.huggingface.co/models/{MODEL_NAME}"
HF_API_KEY  = os.getenv("HF_API_KEY", "")

# ────────────────────────────────────────────────
# Optional local inference (if torch is installed)
# ────────────────────────────────────────────────
try:
    from transformers import AutoModelForImageClassification
    from torchvision import transforms
    import torch
    _TORCH_AVAILABLE = True
except ImportError:
    _TORCH_AVAILABLE = False

_model = None

if _TORCH_AVAILABLE:
    _transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
    ])


def _load_model():
    global _model
    if _model is None:
        _model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)
        _model.eval()


def _predict_local(image_path: str) -> dict:
    """Local inference using PyTorch (available when running locally)."""
    _load_model()
    image = Image.open(image_path).convert("RGB")
    pixel_values = _transform(image).unsqueeze(0)
    with torch.no_grad():
        outputs = _model(pixel_values=pixel_values)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]
    top_idx = int(torch.argmax(probs))
    label = _model.config.id2label[top_idx]
    confidence = float(probs[top_idx])
    return {"label": label, "confidence": round(confidence * 100, 2)}


def _predict_hf_api(image_path: str, hf_key: str) -> dict:
    """Cloud inference via the HF Inference API (no PyTorch needed)."""
    import io
    
    # Resize image to save bandwidth and prevent timeouts on cloud
    image = Image.open(image_path).convert("RGB")
    image.thumbnail((256, 256))
    img_byte_arr = io.BytesIO()
    image.save(img_byte_arr, format='JPEG')
    image_bytes = img_byte_arr.getvalue()

    headers = {"Authorization": f"Bearer {hf_key}"}
    try:
        response = requests.post(HF_API_URL, headers=headers, data=image_bytes, timeout=60)
    except requests.exceptions.RequestException as e:
        print(f"HF API Network Error: {e}")
        return {
            "label": "Network Error",
            "confidence": 0,
            "_unavailable": True,
            "message": f"Could not reach the Hugging Face API: {e}",
        }

    if response.status_code == 200:
        results = response.json()
        if isinstance(results, list) and results:
            top = results[0]
            return {
                "label": top.get("label", "Unknown"),
                "confidence": round(float(top.get("score", 0)) * 100, 2),
            }
        return {"label": "No result", "confidence": 0, "_unavailable": True,
                "message": "The model returned an unexpected response."}

    if response.status_code == 503:
        # Model is still loading on HF servers (cold start)
        return {
            "label": "Model warming up",
            "confidence": 0,
            "_unavailable": True,
            "message": (
                "The disease detection model is starting up on the Hugging Face server. "
                "Please wait 20–30 seconds and try again."
            ),
        }

    return {
        "label": "API Error",
        "confidence": 0,
        "_unavailable": True,
        "message": f"HF Inference API returned status {response.status_code}: {response.text[:200]}",
    }


def predict_disease(image_path: str) -> dict:
    """
    Priority order:
      1. HF Inference API  (if HF_API_KEY env var is set — cloud deployment)
      2. Local PyTorch     (if torch is installed — local / full deployment)
      3. Friendly error    (neither available)
    """
    hf_key = os.getenv("HF_API_KEY", "").strip()

    if hf_key:
        return _predict_hf_api(image_path, hf_key)

    if _TORCH_AVAILABLE:
        return _predict_local(image_path)

    available_keys = list(os.environ.keys())
    return {
        "label": "Service Unavailable",
        "confidence": 0,
        "_unavailable": True,
        "message": (
            f"Disease detection needs HF_API_KEY. Found these keys in cloud: {available_keys}"
        ),
    }