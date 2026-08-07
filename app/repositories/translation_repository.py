from deep_translator import GoogleTranslator


def translate_text(text: str, target_lang: str) -> str:
    if not text or target_lang == "en":
        return text
    return GoogleTranslator(source="en", target=target_lang).translate(text)