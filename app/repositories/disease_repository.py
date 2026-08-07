from transformers import AutoModelForImageClassification
from PIL import Image
from torchvision import transforms
import torch

MODEL_NAME = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification"

_model = None

# Matches MobileNetV2ImageProcessor defaults: resize shorter edge to 256
# (224 / crop_pct=0.875), center-crop to 224, normalize with 0.5/0.5/0.5.
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