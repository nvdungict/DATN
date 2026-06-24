import json
import asyncio
from datetime import datetime, date, time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.agents.graph import run_agent_streaming
from app.core.socket_manager import manager

router = APIRouter(prefix="/ai", tags=["ai"])


def _json_serial(obj):
    """JSON serializer for objects not serializable by default json module."""
    if isinstance(obj, (datetime, date, time)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


async def _send(websocket: WebSocket, data: dict):
    """Send JSON with datetime-safe serialization."""
    await websocket.send_text(json.dumps(data, default=_json_serial))


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
        await _send(websocket, {"type": "error", "content": "Unauthorized"})
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

                # Stream tokens back only to the sender (private AI chat)
                async for chunk in run_agent_streaming(
                    user_message=message,
                    user_id=user_id,
                    trip_id=trip_id,
                    session=session,
                ):
                    await _send(websocket, chunk)
                    
                # Broadcast itinerary refresh to all clients in the trip room after AI completes
                if trip_id:
                    await manager.broadcast_to_trip(trip_id, {"type": "REFRESH_ITINERARY"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await _send(websocket, {"type": "error", "content": str(e)})
        except Exception:
            pass

@router.websocket("/sync/{trip_id}")
async def trip_sync(
    websocket: WebSocket,
    trip_id: int,
    token: str = Query(...),
):
    """WebSocket endpoint for syncing trip itinerary changes across clients."""
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
    except Exception:
        await websocket.accept()
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, trip_id)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, trip_id)

