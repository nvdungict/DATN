import json
from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # trip_id -> list of websockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, trip_id: int):
        await websocket.accept()
        if trip_id not in self.active_connections:
            self.active_connections[trip_id] = []
        self.active_connections[trip_id].append(websocket)

    def disconnect(self, websocket: WebSocket, trip_id: int):
        if trip_id in self.active_connections:
            try:
                self.active_connections[trip_id].remove(websocket)
                if not self.active_connections[trip_id]:
                    del self.active_connections[trip_id]
            except ValueError:
                pass

    async def broadcast_to_trip(self, trip_id: int, message: dict):
        if trip_id in self.active_connections:
            payload = json.dumps(message)
            # Send to all connected clients in this room
            for connection in self.active_connections[trip_id]:
                try:
                    await connection.send_text(payload)
                except Exception:
                    pass

manager = ConnectionManager()
