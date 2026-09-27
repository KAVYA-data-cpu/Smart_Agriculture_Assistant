import uuid
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.chatbot_service import ask, get_all_sessions, get_session_history


router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


class ChatRequest(BaseModel):
    message: Optional[str] = "Hello"
    question: Optional[str] = None
    query: Optional[str] = None
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


@router.post("/ask", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        user_msg = request.message or request.question or request.query or "Hello"
        session_id = request.session_id or str(uuid.uuid4())
        reply = ask(session_id, user_msg)
        return ChatResponse(reply=str(reply), session_id=session_id)
    except Exception as e:
        print(f"Chatbot endpoint error: {e}")
        return ChatResponse(
            reply="I am your AI farming assistant. How can I help you today with crops, soil health, or market prices?",
            session_id=request.session_id or str(uuid.uuid4())
        )


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