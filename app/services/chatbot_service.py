from app.repositories import chatbot_repository

SYSTEM_PROMPT = (
    "You are an agricultural assistant helping farmers with crop health, "
    "plant diseases, and farming best practices. Keep answers practical, "
    "concise, and specific to farming. If asked about something unrelated "
    "to agriculture, politely redirect the conversation back to farming."
)

_sessions: dict[str, list[dict]] = {}
MAX_HISTORY_MESSAGES = 10


def _get_session(session_id: str) -> list[dict]:
    if session_id not in _sessions:
        _sessions[session_id] = [{"role": "system", "content": SYSTEM_PROMPT}]
    return _sessions[session_id]


def ask(session_id: str, question: str) -> str:
    history = _get_session(session_id)
    history.append({"role": "user", "content": question})

    trimmed = [history[0]] + history[1:][-MAX_HISTORY_MESSAGES:]

    reply = chatbot_repository.get_chat_response(trimmed)
    history.append({"role": "assistant", "content": reply})

    return reply

def get_all_sessions() -> list[dict]:
    sessions = []
    for session_id, history in _sessions.items():
        first_user_msg = next((m["content"] for m in history if m["role"] == "user"), "New conversation")
        preview = first_user_msg[:60] + ("..." if len(first_user_msg) > 60 else "")
        sessions.append({"session_id": session_id, "preview": preview})
    return sessions


def get_session_history(session_id: str) -> list[dict]:
    history = _sessions.get(session_id, [])
    return [m for m in history if m["role"] != "system"]