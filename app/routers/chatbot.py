import uuid
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from app.services.chatbot_service import ask, get_all_sessions, get_session_history

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.post("/ask")
@router.get("/ask")
async def chat(request: Request):
    try:
        if request.method == "POST":
            try:
                data = await request.json()
            except Exception:
                data = {}
        else:
            data = dict(request.query_params)
    except Exception:
        data = {}

    user_msg = str(data.get("message") or data.get("question") or data.get("query") or "Hello")
    session_id = str(data.get("session_id") or uuid.uuid4())

    try:
        reply = ask(session_id, user_msg)
    except Exception as e:
        print(f"Chatbot error: {e}")
        reply = "Hello! I am your AI farming assistant. How can I help you with crop recommendation, fertilizers, or plant diseases today?"

    return JSONResponse(content={
        "reply": str(reply),
        "response": str(reply),
        "answer": str(reply),
        "session_id": str(session_id)
    })


@router.get("/sessions")
def list_sessions():
    try:
        return JSONResponse(content=get_all_sessions())
    except Exception:
        return JSONResponse(content=[])


@router.get("/sessions/{session_id}")
def session_history(session_id: str):
    try:
        return JSONResponse(content={"session_id": str(session_id), "messages": get_session_history(session_id)})
    except Exception:
        return JSONResponse(content={"session_id": str(session_id), "messages": []})