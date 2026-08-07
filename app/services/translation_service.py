from app.repositories import translation_repository

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "te": "Telugu",
    "ta": "Tamil",
    "mr": "Marathi",
    "bn": "Bengali",
}

# Reverse lookup: "telugu" -> "te", "Hindi" -> "hi", etc.
NAME_TO_CODE = {name.lower(): code for code, name in SUPPORTED_LANGUAGES.items()}


def _normalize_lang(target_lang: str) -> str:
    target_lang = target_lang.strip().lower()

    if target_lang in SUPPORTED_LANGUAGES:
        return target_lang
    if target_lang in NAME_TO_CODE:
        return NAME_TO_CODE[target_lang]
    return "en"


def translate_dict(data: dict, target_lang: str, fields: list[str]) -> dict:
    target_lang = _normalize_lang(target_lang)

    translated = dict(data)
    for field in fields:
        if field in translated and isinstance(translated[field], str):
            translated[field] = translation_repository.translate_text(translated[field], target_lang)

    translated["language"] = SUPPORTED_LANGUAGES[target_lang]
    return translated