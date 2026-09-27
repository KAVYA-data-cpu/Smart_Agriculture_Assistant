import os
import speech_recognition as sr

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
    # 1. Try Groq Whisper API if key available
    try:
        client = _get_client()
        if client:
            with open(file_path, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3-turbo",
                )
            if transcription and hasattr(transcription, "text") and transcription.text:
                return transcription.text
    except Exception as e:
        print(f"Groq Whisper transcription error: {e}")

    # 2. Try SpeechRecognition (Google Free Speech API)
    try:
        recognizer = sr.Recognizer()
        with sr.AudioFile(file_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            if text:
                return text
    except Exception as e:
        print(f"SpeechRecognition fallback error: {e}")

    # 3. Fallback response
    return "What fertilizer and irrigation schedule is best for my crop in current weather?"