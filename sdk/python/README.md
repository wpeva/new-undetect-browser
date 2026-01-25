# antidetect-sdk

Official Python SDK for UndetectBrowser Anti-Detection Platform.

## Installation

```bash
pip install antidetect-sdk
```

For async support:
```bash
pip install antidetect-sdk[async]
```

## Quick Start

```python
from antidetect_sdk import AntidetectClient

# Create client
client = AntidetectClient(
    base_url="http://localhost:3000",
    api_key="your-api-key"  # optional
)

# Create a profile
profile = client.profiles.create(
    name="My Profile",
    os="windows",
    browser="chrome"
)
print(f"Created profile: {profile.id}")

# Launch browser session
session = client.sessions.launch(profile.id, headless=False)
print(f"Session started: {session.id}")
print(f"WebSocket endpoint: {session.ws_endpoint}")

# Get detection score
score = client.sessions.get_detection_score(session.id)
print(f"Detection score: {score.score}")

# Navigate to a page
client.sessions.navigate(session.id, "https://example.com")

# Take a screenshot
screenshot = client.sessions.screenshot(session.id)
print(f"Screenshot captured: {len(screenshot['base64'])} bytes")

# Stop session
client.sessions.stop(session.id)
print("Session stopped")
```

## API Reference

### Client

```python
client = AntidetectClient(
    base_url="http://localhost:3000",  # API server URL
    api_key="your-api-key",            # Optional API key
    timeout=30,                        # Request timeout (seconds)
    retries=3                          # Number of retries
)
```

### Profiles

```python
# List all profiles
profiles = client.profiles.list(page=1, limit=10)

# Get a profile
profile = client.profiles.get("profile-id")

# Create a profile
profile = client.profiles.create(
    name="My Profile",
    os="windows",
    browser="chrome",
    proxy={
        "enabled": True,
        "type": "http",
        "host": "192.168.1.1",
        "port": 8080
    }
)

# Update a profile
profile = client.profiles.update("profile-id", name="New Name")

# Delete a profile
client.profiles.delete("profile-id")

# Duplicate a profile
duplicate = client.profiles.duplicate("profile-id", name="Copy of Profile")

# Export/Import
data = client.profiles.export("profile-id")
imported = client.profiles.import_profile(data)
```

### Sessions

```python
# Launch a browser session
session = client.sessions.launch(
    "profile-id",
    headless=False,
    args=["--no-sandbox"]
)

# Get session info
info = client.sessions.get("session-id")

# Get detection score
score = client.sessions.get_detection_score("session-id")
print(f"Score: {score.score}, Details: {score.details}")

# Navigate to URL
client.sessions.navigate("session-id", "https://example.com")

# Execute JavaScript
result = client.sessions.execute("session-id", "return document.title")

# Take screenshot
screenshot = client.sessions.screenshot("session-id")

# Stop session
client.sessions.stop("session-id")
```

### Proxies

```python
# List proxies
proxies = client.proxies.list()

# Add a proxy
proxy = client.proxies.create(
    name="My Proxy",
    type="http",
    host="192.168.1.1",
    port=8080,
    username="user",
    password="pass"
)

# Test proxy
result = client.proxies.test("proxy-id")
print(f"Status: {result['status']}, Latency: {result['latency']}ms")

# Import proxies from text
imported = client.proxies.import_proxies("""
192.168.1.1:8080
192.168.1.2:8080:user:pass
""", format="ip:port:user:pass")
```

### Analytics

```python
# Get dashboard stats
stats = client.analytics.get_dashboard()
print(f"Active sessions: {stats.active_sessions}")
print(f"Average detection score: {stats.average_detection_score}")

# Get detection history
history = client.analytics.get_detection_history(
    profile_id="profile-id",
    start_date="2024-01-01",
    end_date="2024-12-31"
)
```

### Real-time Updates

```python
from antidetect_sdk import RealtimeClient

# Create realtime client
realtime = RealtimeClient(
    base_url="http://localhost:3000",
    api_key="your-api-key"
)

# Register event handlers
realtime.on("connected", lambda _: print("Connected!"))
realtime.on("session:started", lambda data: print(f"Session started: {data}"))
realtime.on("detection:score", lambda data: print(f"Score: {data['score']}"))

# Connect
realtime.connect()

# Subscribe to specific profile/session
realtime.subscribe_to_profile("profile-id")
realtime.subscribe_to_session("session-id")

# Wait for events (blocking)
# realtime.wait()

# Disconnect when done
realtime.disconnect()
```

## Context Manager

```python
with AntidetectClient(base_url="http://localhost:3000") as client:
    profile = client.profiles.create(name="Test")
    # ... use the client ...
# Connection is automatically closed
```

## Error Handling

```python
from antidetect_sdk import (
    AntidetectError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    ConnectionError,
)

try:
    profile = client.profiles.get("non-existent-id")
except NotFoundError:
    print("Profile not found")
except AuthenticationError:
    print("Invalid API key")
except ValidationError as e:
    print(f"Invalid request: {e.message}")
except ConnectionError:
    print("Failed to connect to server")
except AntidetectError as e:
    print(f"API error: {e.message} (code: {e.code})")
```

## Type Hints

The SDK includes full type hints for better IDE support:

```python
from antidetect_sdk import (
    Profile,
    Session,
    Proxy,
    CreateProfileOptions,
    LaunchOptions,
    DashboardStats,
)
```

## Requirements

- Python 3.8+
- requests >= 2.28.0
- websocket-client >= 1.5.0
- pydantic >= 2.0.0

## License

MIT
