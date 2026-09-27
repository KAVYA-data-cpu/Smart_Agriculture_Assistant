import uuid
from fastapi import APIRouter, Body
from app.services.chatbot_service import ask, get_all_sessions, get_session_history

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.post("/ask")
def chat(payload: dict = Body(default={})):
    try:
        user_msg = payload.get("message") or payload.get("question") or payload.get("query") or "Hello"
        session_id = payload.get("session_id") or str(uuid.uuid4())
        reply = ask(session_id, str(user_msg))
        return {
            "reply": str(reply),
            "response": str(reply),
            "answer": str(reply),
            "session_id": session_id
        }
    except Exception as e:
        print(f"Chatbot endpoint error: {e}")
        sid = str(uuid.uuid4())
        return {
            "reply": "Hello! I am your AI farming assistant. How can I help you with crops, fertilizers, or diseases today?",
            "response": "Hello! I am your AI farming assistant. How can I help you with crops, fertilizers, or diseases today?",
            "answer": "Hello! I am your AI farming assistant. How can I help you with crops, fertilizers, or diseases today?",
            "session_id": sid
        }


@router.get("/sessions")
def list_sessions():
    try:
        return get_all_sessions()
    except Exception:
        return []


@router.get("/sessions/{session_id}")
def session_history(session_id: str):
    try:
        return {"session_id": session_id, "messages": get_session_history(session_id)}
    except Exception:
        return {"session_id": session_id, "messages": []}
