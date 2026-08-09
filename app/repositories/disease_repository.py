"""
disease_repository.py — graceful fallback when torch/transformers are not installed.

In the cloud (lightweight) deployment, torch and transformers are not installed.
The predict_disease function returns a friendly "not available" message instead
of crashing the app on import.
"""

try:
    from transformers import AutoModelForImageClassification
    from torchvision import transforms
    import torch
    _TORCH_AVAILABLE = True
except ImportError:
    _TORCH_AVAILABLE = False

from PIL import Image

MODEL_NAME = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"

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


def predict_disease(image_path):
    if not _TORCH_AVAILABLE:
        return {
            "label": "Service Unavailable",
            "confidence": 0,
            "_unavailable": True,
            "message": (
                "Plant disease detection requires PyTorch which is not installed "
                "in this cloud deployment. Please run the app locally for this feature."
            ),
        }

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