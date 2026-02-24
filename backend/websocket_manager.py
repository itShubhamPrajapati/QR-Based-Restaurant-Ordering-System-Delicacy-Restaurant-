"""WebSocket manager for real-time updates."""
from typing import Dict, Set
from fastapi import WebSocket
import json

class WebSocketManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        # Map: connection_id -> websocket
        self.connections: Dict[str, WebSocket] = {}
        # Map: order_id -> set of connection_ids
        self.order_subscriptions: Dict[int, Set[str]] = {}
        # Kitchen connections
        self.kitchen_connections: Set[str] = set()
        # Admin connections
        self.admin_connections: Set[str] = set()
    
    async def connect(self, websocket: WebSocket, connection_id: str, connection_type: str = "customer"):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.connections[connection_id] = websocket
        
        if connection_type == "kitchen":
            self.kitchen_connections.add(connection_id)
        elif connection_type == "admin":
            self.admin_connections.add(connection_id)
    
    def disconnect(self, connection_id: str):
        """Remove a WebSocket connection."""
        if connection_id in self.connections:
            del self.connections[connection_id]
        
        if connection_id in self.kitchen_connections:
            self.kitchen_connections.discard(connection_id)
        
        if connection_id in self.admin_connections:
            self.admin_connections.discard(connection_id)
        
        # Remove from order subscriptions
        for order_id in list(self.order_subscriptions.keys()):
            if connection_id in self.order_subscriptions[order_id]:
                self.order_subscriptions[order_id].discard(connection_id)
                if not self.order_subscriptions[order_id]:
                    del self.order_subscriptions[order_id]
    
    async def subscribe_to_order(self, connection_id: str, order_id: int):
        """Subscribe a connection to order updates."""
        if order_id not in self.order_subscriptions:
            self.order_subscriptions[order_id] = set()
        self.order_subscriptions[order_id].add(connection_id)
    
    async def send_to_connection(self, connection_id: str, message: dict):
        """Send a message to a specific connection."""
        if connection_id in self.connections:
            try:
                await self.connections[connection_id].send_json(message)
            except Exception:
                self.disconnect(connection_id)
    
    async def broadcast_to_kitchen(self, message: dict):
        """Broadcast message to all kitchen connections."""
        disconnected = []
        for connection_id in self.kitchen_connections:
            try:
                await self.connections[connection_id].send_json(message)
            except Exception:
                disconnected.append(connection_id)
        
        # Clean up disconnected
        for conn_id in disconnected:
            self.disconnect(conn_id)
    
    async def broadcast_to_admin(self, message: dict):
        """Broadcast message to all admin connections."""
        disconnected = []
        for connection_id in self.admin_connections:
            try:
                await self.connections[connection_id].send_json(message)
            except Exception:
                disconnected.append(conn_id)
        
        # Clean up disconnected
        for conn_id in disconnected:
            self.disconnect(conn_id)
    
    async def notify_order_update(self, order_id: int, order_data: dict):
        """Notify all subscribers about an order update."""
        message = {
            "type": "order_update",
            "order_id": order_id,
            "data": order_data
        }
        
        if order_id in self.order_subscriptions:
            disconnected = []
            for connection_id in self.order_subscriptions[order_id]:
                await self.send_to_connection(connection_id, message)
    
    async def notify_new_order(self, order_data: dict):
        """Notify kitchen about a new order."""
        message = {
            "type": "new_order",
            "data": order_data
        }
        await self.broadcast_to_kitchen(message)
    
    async def notify_order_status_change(self, order_data: dict):
        """Notify customer about order status change."""
        order_id = order_data["id"]
        message = {
            "type": "status_change",
            "data": order_data
        }
        
        if order_id in self.order_subscriptions:
            disconnected = []
            for connection_id in self.order_subscriptions[order_id]:
                await self.send_to_connection(connection_id, message)
        
        # Also notify admin
        await self.broadcast_to_admin(message)

# Global WebSocket manager instance
ws_manager = WebSocketManager()
