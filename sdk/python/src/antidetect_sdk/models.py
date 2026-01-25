"""
Data models for UndetectBrowser SDK
"""

from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class ProxyConfig(BaseModel):
    """Proxy configuration"""
    enabled: bool = True
    type: Literal["http", "https", "socks4", "socks5"] = "http"
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None


class FingerprintConfig(BaseModel):
    """Browser fingerprint configuration"""
    canvas: bool = True
    webgl: bool = True
    audio: bool = True
    fonts: bool = True
    timezone: Optional[str] = None
    language: Optional[str] = None
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None
    color_depth: Optional[int] = None
    hardware_concurrency: Optional[int] = None
    device_memory: Optional[int] = None
    webgl_vendor: Optional[str] = None
    webgl_renderer: Optional[str] = None


class Cookie(BaseModel):
    """Browser cookie"""
    name: str
    value: str
    domain: str
    path: str = "/"
    expires: Optional[int] = None
    http_only: bool = False
    secure: bool = False
    same_site: Optional[Literal["Strict", "Lax", "None"]] = None


class Viewport(BaseModel):
    """Browser viewport configuration"""
    width: int = 1920
    height: int = 1080


class Profile(BaseModel):
    """Browser profile"""
    id: str
    name: str
    os: Literal["windows", "macos", "linux"] = "windows"
    browser: Literal["chrome", "firefox", "edge"] = "chrome"
    user_agent: Optional[str] = None
    viewport: Optional[Viewport] = None
    proxy: Optional[ProxyConfig] = None
    fingerprint: Optional[FingerprintConfig] = None
    cookies: List[Cookie] = Field(default_factory=list)
    local_storage: Dict[str, str] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    status: Literal["idle", "running", "error"] = "idle"


class CreateProfileOptions(BaseModel):
    """Options for creating a new profile"""
    name: str
    os: Literal["windows", "macos", "linux"] = "windows"
    browser: Literal["chrome", "firefox", "edge"] = "chrome"
    user_agent: Optional[str] = None
    viewport: Optional[Viewport] = None
    proxy: Optional[ProxyConfig] = None
    fingerprint: Optional[FingerprintConfig] = None


class Session(BaseModel):
    """Browser session"""
    id: str
    profile_id: str
    status: Literal["starting", "running", "stopping", "stopped", "error"]
    ws_endpoint: Optional[str] = None
    cdp_endpoint: Optional[str] = None
    started_at: Optional[datetime] = None
    detection_score: Optional[float] = None


class LaunchOptions(BaseModel):
    """Options for launching a browser session"""
    headless: bool = False
    args: List[str] = Field(default_factory=list)
    timeout: int = 30000


class Proxy(BaseModel):
    """Proxy server"""
    id: str
    name: str
    type: Literal["http", "https", "socks4", "socks5"]
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    country: Optional[str] = None
    status: Literal["unknown", "working", "failed"] = "unknown"
    last_checked: Optional[datetime] = None


class DashboardStats(BaseModel):
    """Dashboard statistics"""
    total_profiles: int
    active_profiles: int
    total_sessions: int
    active_sessions: int
    average_detection_score: float
    success_rate: float


class DetectionScore(BaseModel):
    """Detection score result"""
    score: float
    details: Dict[str, float] = Field(default_factory=dict)


class PaginatedResponse(BaseModel):
    """Paginated response"""
    data: List[Any]
    total: int
    page: int
    limit: int
    has_more: bool
