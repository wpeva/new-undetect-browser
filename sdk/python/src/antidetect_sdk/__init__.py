"""
UndetectBrowser Python SDK

Official SDK for interacting with UndetectBrowser Anti-Detection Platform.

Example:
    >>> from antidetect_sdk import AntidetectClient
    >>> client = AntidetectClient(base_url="http://localhost:3000")
    >>> profile = client.profiles.create(name="My Profile", os="windows")
    >>> session = client.sessions.launch(profile.id)
    >>> client.sessions.stop(session.id)
"""

from .client import AntidetectClient
from .models import (
    Profile,
    Session,
    Proxy,
    Cookie,
    ProxyConfig,
    FingerprintConfig,
    DashboardStats,
    CreateProfileOptions,
    LaunchOptions,
)
from .exceptions import (
    AntidetectError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    ConnectionError,
)
from .realtime import RealtimeClient

__version__ = "1.0.0"
__all__ = [
    # Client
    "AntidetectClient",
    "RealtimeClient",
    # Models
    "Profile",
    "Session",
    "Proxy",
    "Cookie",
    "ProxyConfig",
    "FingerprintConfig",
    "DashboardStats",
    "CreateProfileOptions",
    "LaunchOptions",
    # Exceptions
    "AntidetectError",
    "AuthenticationError",
    "NotFoundError",
    "ValidationError",
    "ConnectionError",
]
