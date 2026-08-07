import uuid
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.chatbot_service import ask, get_all_sessions, get_session_history


router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


@router.post("/ask", response_model=ChatResponse)
def chat(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    reply = ask(session_id, request.message)
    return ChatResponse(reply=reply, session_id=session_id)

@router.get("/sessions")
def list_sessions():
    return get_all_sessions()


@router.get("/sessions/{session_id}")
def session_history(session_id: str):
    return {"session_id": session_id, "messages": get_session_history(session_id)}