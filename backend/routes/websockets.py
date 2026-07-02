import json
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "kitchen": set(),
            "admin": set(),
            "customer": {}
        }
    
    async def connect(self, websocket: WebSocket, client_type: str, identifier: str = None):
        """Accept new WebSocket connection"""
        await websocket.accept()
        if client_type == "kitchen":
            self.active_connections["kitchen"].add(websocket)
        elif client_type == "admin":
            self.active_connections["admin"].add(websocket)
        elif client_type == "customer" and identifier:
            self.active_connections["customer"][identifier] = websocket
    
    def disconnect(self, websocket: WebSocket, client_type: str, identifier: str = None):
        """Remove WebSocket connection"""
        if client_type == "kitchen":
            self.active_connections["kitchen"].discard(websocket)
        elif client_type == "admin":
            self.active_connections["admin"].discard(websocket)
        elif client_type == "customer" and identifier:
            self.active_connections["customer"].pop(identifier, None)
    
    async def broadcast_to_kitchen(self, message: dict):
        """Send message to all kitchen displays"""
        for connection in list(self.active_connections["kitchen"]):
            try:
                await connection.send_json(message)
            except:
                pass
    
    async def broadcast_to_admin(self, message: dict):
        """Send message to all admin panels"""
        for connection in list(self.active_connections["admin"]):
            try:
                await connection.send_json(message)
            except:
                pass
    
    async def broadcast_all(self, message: dict):
        """Send message to all connected clients"""
        await self.broadcast_to_kitchen(message)
        await self.broadcast_to_admin(message)
    
    async def send_to_customer(self, order_id: str, message: dict):
        """Send message to specific customer"""
        if order_id in self.active_connections["customer"]:
            try:
                await self.active_connections["customer"][order_id].send_json(message)
            except:
                pass

manager = ConnectionManager()

@router.websocket("/ws/{client_type}")
async def websocket_endpoint(websocket: WebSocket, client_type: str, identifier: str = None):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket, client_type, identifier)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_type, identifier)
