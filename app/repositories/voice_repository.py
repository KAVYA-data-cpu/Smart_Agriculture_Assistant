import os
import re
import uuid
from gtts import gTTS

OUTPUT_FOLDER = os.path.join("app", "static", "audio")


def clean_text_for_speech(text: str) -> str:
    if not text:
        return ""
    # Strip markdown headers, bold, italics, bullets, links, HTML
    s = re.sub(r"#{1,6}\s*", "", text)
    s = re.sub(r"\*+|_+", "", s)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    s = re.sub(r"`{1,3}.*?`{1,3}", "", s, flags=re.DOTALL)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"[\r\n]+", ". ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def synthesize_speech(text: str, lang: str = "en") -> str:
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    clean_txt = clean_text_for_speech(text)
    if not clean_txt:
        clean_txt = "Smart Agriculture Assistant speech synthesis complete."

    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(OUTPUT_FOLDER, filename)

    try:
        tts = gTTS(text=clean_txt[:1000], lang=lang or "en")
        tts.save(filepath)
    except Exception as e:
        print(f"gTTS synthesis error: {e}")
        tts = gTTS(text="Smart Agriculture Assistant audio advisory.", lang="en")
        tts.save(filepath)

    return filepath