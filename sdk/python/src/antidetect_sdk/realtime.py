"""
Real-time WebSocket client for UndetectBrowser SDK
"""

import json
import threading
from typing import Optional, Callable, Dict, Any, List
from websocket import WebSocketApp, WebSocket


class RealtimeClient:
    """
    WebSocket client for real-time updates.

    Example:
        >>> realtime = RealtimeClient(base_url="http://localhost:3000")
        >>> realtime.on("session:started", lambda data: print(f"Session started: {data}"))
        >>> realtime.connect()
        >>> # ... do stuff ...
        >>> realtime.disconnect()
    """

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        auto_reconnect: bool = True,
        max_reconnect_attempts: int = 5,
    ):
        """
        Initialize the realtime client.

        Args:
            base_url: Base URL of the API server
            api_key: Optional API key for authentication
            auto_reconnect: Whether to automatically reconnect on disconnect
            max_reconnect_attempts: Maximum number of reconnection attempts
        """
        # Convert HTTP URL to WebSocket URL
        ws_url = base_url.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = ws_url.rstrip("/") + "/ws"

        self.ws_url = ws_url
        self.api_key = api_key
        self.auto_reconnect = auto_reconnect
        self.max_reconnect_attempts = max_reconnect_attempts

        self._ws: Optional[WebSocketApp] = None
        self._thread: Optional[threading.Thread] = None
        self._connected = False
        self._reconnect_attempts = 0
        self._listeners: Dict[str, List[Callable[[Any], None]]] = {}
        self._subscriptions: List[Dict[str, str]] = []

    def connect(self) -> None:
        """Connect to the WebSocket server"""
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        self._ws = WebSocketApp(
            self.ws_url,
            header=headers,
            on_open=self._on_open,
            on_message=self._on_message,
            on_error=self._on_error,
            on_close=self._on_close,
        )

        self._thread = threading.Thread(target=self._ws.run_forever)
        self._thread.daemon = True
        self._thread.start()

    def disconnect(self) -> None:
        """Disconnect from the WebSocket server"""
        self.auto_reconnect = False
        if self._ws:
            self._ws.close()
            self._ws = None
        self._connected = False

    def on(self, event: str, callback: Callable[[Any], None]) -> None:
        """
        Register an event listener.

        Args:
            event: Event name (e.g., "session:started", "detection:score")
            callback: Callback function to call when event is received
        """
        if event not in self._listeners:
            self._listeners[event] = []
        self._listeners[event].append(callback)

    def off(self, event: str, callback: Optional[Callable[[Any], None]] = None) -> None:
        """
        Remove an event listener.

        Args:
            event: Event name
            callback: Specific callback to remove, or None to remove all
        """
        if event in self._listeners:
            if callback:
                self._listeners[event] = [
                    cb for cb in self._listeners[event] if cb != callback
                ]
            else:
                del self._listeners[event]

    def send(self, event: str, data: Any = None) -> None:
        """
        Send a message to the server.

        Args:
            event: Event name
            data: Data to send
        """
        if self._ws and self._connected:
            message = json.dumps({"event": event, "data": data})
            self._ws.send(message)

    def subscribe_to_profile(self, profile_id: str) -> None:
        """Subscribe to updates for a specific profile"""
        subscription = {"type": "profile", "id": profile_id}
        self._subscriptions.append(subscription)
        if self._connected:
            self.send("subscribe", subscription)

    def subscribe_to_session(self, session_id: str) -> None:
        """Subscribe to updates for a specific session"""
        subscription = {"type": "session", "id": session_id}
        self._subscriptions.append(subscription)
        if self._connected:
            self.send("subscribe", subscription)

    def unsubscribe(self, type: str, id: str) -> None:
        """Unsubscribe from updates"""
        self._subscriptions = [
            s for s in self._subscriptions if not (s["type"] == type and s["id"] == id)
        ]
        if self._connected:
            self.send("unsubscribe", {"type": type, "id": id})

    @property
    def is_connected(self) -> bool:
        """Check if connected to server"""
        return self._connected

    def _on_open(self, ws: WebSocket) -> None:
        """Handle connection open"""
        self._connected = True
        self._reconnect_attempts = 0

        # Re-subscribe to previous subscriptions
        for subscription in self._subscriptions:
            self.send("subscribe", subscription)

        self._emit("connected", None)

    def _on_message(self, ws: WebSocket, message: str) -> None:
        """Handle incoming message"""
        try:
            data = json.loads(message)
            event = data.get("event", "message")
            payload = data.get("data")

            self._emit(event, payload)
            self._emit("message", data)
        except json.JSONDecodeError:
            self._emit("error", {"message": "Invalid JSON received"})

    def _on_error(self, ws: WebSocket, error: Exception) -> None:
        """Handle WebSocket error"""
        self._emit("error", {"message": str(error)})

    def _on_close(self, ws: WebSocket, close_status_code: int, close_msg: str) -> None:
        """Handle connection close"""
        self._connected = False
        self._emit("disconnected", {"code": close_status_code, "message": close_msg})

        # Attempt reconnection
        if self.auto_reconnect and self._reconnect_attempts < self.max_reconnect_attempts:
            self._reconnect_attempts += 1
            self._emit("reconnecting", {"attempt": self._reconnect_attempts})
            self.connect()
        elif self._reconnect_attempts >= self.max_reconnect_attempts:
            self._emit("reconnect_failed", None)

    def _emit(self, event: str, data: Any) -> None:
        """Emit event to all listeners"""
        if event in self._listeners:
            for callback in self._listeners[event]:
                try:
                    callback(data)
                except Exception as e:
                    print(f"Error in event listener for {event}: {e}")

    def wait(self) -> None:
        """Wait for the connection to close (blocking)"""
        if self._thread:
            self._thread.join()
