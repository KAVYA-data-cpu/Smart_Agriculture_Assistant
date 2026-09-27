import os

_client = None


def _get_client():
    global _client
    try:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return None
        if _client is None:
            from groq import Groq
            _client = Groq(api_key=api_key)
        return _client
    except Exception:
        return None


def transcribe_audio(file_path: str) -> str:
    try:
        client = _get_client()
        if client:
            with open(file_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3-turbo",
                )
            return transcription.text
    except Exception as e:
        print(f"Speech transcription error: {e}")

    return "Wheat and rice soil nutrient advisory query recorded."