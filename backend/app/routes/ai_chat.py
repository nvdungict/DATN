import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.agents.graph import run_agent_streaming

router = APIRouter(prefix="/ai", tags=["ai"])


@router.websocket("/chat-stream")
async def chat_stream(
    websocket: WebSocket,
    token: str = Query(...),
):
    """Real-time streaming AI chat via WebSocket."""
    await websocket.accept()

    # Authenticate via token query param
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except Exception:
        await websocket.send_json({"type": "error", "content": "Unauthorized"})
        await websocket.close(code=1008)
        return

    try:
        async with AsyncSessionLocal() as session:
            while True:
                raw = await websocket.receive_text()
                data = json.loads(raw)
                message = data.get("message", "")
                trip_id = data.get("trip_id")

                if not message.strip():
                    continue

                # Stream tokens back
                async for chunk in run_agent_streaming(
                    user_message=message,
                    user_id=user_id,
                    trip_id=trip_id,
                    session=session,
                ):
                    await websocket.send_json(chunk)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
