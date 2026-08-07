import os
import uuid
from gtts import gTTS

OUTPUT_FOLDER = os.path.join("app", "static", "audio")


def synthesize_speech(text: str, lang: str = "en") -> str:
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    filename = f"{uuid.uuid4()}.mp3"
    filepath = os.path.join(OUTPUT_FOLDER, filename)

    tts = gTTS(text=text, lang=lang)
    tts.save(filepath)

    return filepath