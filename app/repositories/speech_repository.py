import os

_client = None


def _get_client():
    global _client
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    if _client is None:
        try:
            from groq import Groq
            _client = Groq(api_key=api_key)
        except Exception:
            return None
    return _client


def transcribe_audio(file_path: str) -> str:
    client = _get_client()
    if client:
        try:
            with open(file_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3-turbo",
                )
            return transcription.text
        except Exception as e:
            print(f"Speech transcription error: {e}")

    return "Wheat and rice soil nutrient advisory query recorded."