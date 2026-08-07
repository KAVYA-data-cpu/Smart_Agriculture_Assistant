import re


def _to_number(value: str):
    value = value.strip()
    return float(value) if "." in value else int(value)


def extract_soil_values(text: str) -> dict:
    patterns = {
        "nitrogen": r"Nitrogen[^\d]*(\d+\.?\d*)",
        "phosphorous": r"Phosphor(?:ous|us)[^\d]*(\d+\.?\d*)",
        "potassium": r"Potassium[^\d]*(\d+\.?\d*)",
        "ph": r"\bpH\b[^\d]*(\d+\.?\d*)",
        "moisture": r"Moisture[^\d]*(\d+\.?\d*)",
        "soil_type": r"Soil Type:?\s*\n?\s*([A-Za-z]+)",
        "crop_type": r"Crop Type:?\s*\n?\s*([A-Za-z]+)",
        "city": r"City:?\s*\n?\s*([A-Za-z ]+)",
    }

    values = {}
    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            continue
        raw = match.group(1).strip()
        if key in ("nitrogen", "phosphorous", "potassium", "ph", "moisture"):
            values[key] = _to_number(raw)
        else:
            values[key] = raw

    return values