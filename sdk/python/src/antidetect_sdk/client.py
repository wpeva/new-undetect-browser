"""
Main client for UndetectBrowser SDK
"""

from typing import Optional, Dict, Any, List
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .models import (
    Profile,
    Session,
    Proxy,
    CreateProfileOptions,
    LaunchOptions,
    DashboardStats,
    DetectionScore,
    PaginatedResponse,
)
from .exceptions import (
    AntidetectError,
    AuthenticationError,
    NotFoundError,
    ValidationError,
    ConnectionError,
    RateLimitError,
    ServerError,
)


class ProfilesResource:
    """Profiles API resource"""

    def __init__(self, client: "AntidetectClient"):
        self._client = client

    def list(
        self, page: int = 1, limit: int = 20
    ) -> PaginatedResponse:
        """List all profiles"""
        response = self._client._request(
            "GET", "/profiles", params={"page": page, "limit": limit}
        )
        return PaginatedResponse(**response)

    def get(self, profile_id: str) -> Profile:
        """Get a profile by ID"""
        response = self._client._request("GET", f"/profiles/{profile_id}")
        return Profile(**response)

    def create(
        self,
        name: str,
        os: str = "windows",
        browser: str = "chrome",
        **kwargs: Any,
    ) -> Profile:
        """Create a new profile"""
        data = {"name": name, "os": os, "browser": browser, **kwargs}
        response = self._client._request("POST", "/profiles", json=data)
        return Profile(**response)

    def update(self, profile_id: str, **updates: Any) -> Profile:
        """Update a profile"""
        response = self._client._request(
            "PUT", f"/profiles/{profile_id}", json=updates
        )
        return Profile(**response)

    def delete(self, profile_id: str) -> None:
        """Delete a profile"""
        self._client._request("DELETE", f"/profiles/{profile_id}")

    def duplicate(self, profile_id: str, name: Optional[str] = None) -> Profile:
        """Duplicate a profile"""
        data = {"name": name} if name else {}
        response = self._client._request(
            "POST", f"/profiles/{profile_id}/duplicate", json=data
        )
        return Profile(**response)

    def export(self, profile_id: str) -> Dict[str, Any]:
        """Export profile data"""
        return self._client._request("GET", f"/profiles/{profile_id}/export")

    def import_profile(self, data: Dict[str, Any]) -> Profile:
        """Import profile data"""
        response = self._client._request("POST", "/profiles/import", json=data)
        return Profile(**response)


class SessionsResource:
    """Sessions API resource"""

    def __init__(self, client: "AntidetectClient"):
        self._client = client

    def list(self) -> List[Session]:
        """List all sessions"""
        response = self._client._request("GET", "/sessions")
        return [Session(**s) for s in response]

    def get(self, session_id: str) -> Session:
        """Get a session by ID"""
        response = self._client._request("GET", f"/sessions/{session_id}")
        return Session(**response)

    def launch(
        self,
        profile_id: str,
        headless: bool = False,
        args: Optional[List[str]] = None,
        timeout: int = 30000,
    ) -> Session:
        """Launch a browser session"""
        data = {
            "headless": headless,
            "args": args or [],
            "timeout": timeout,
        }
        response = self._client._request(
            "POST", f"/profiles/{profile_id}/launch", json=data
        )
        return Session(**response)

    def stop(self, session_id: str) -> None:
        """Stop a browser session"""
        self._client._request("POST", f"/sessions/{session_id}/stop")

    def get_detection_score(self, session_id: str) -> DetectionScore:
        """Get detection score for a session"""
        response = self._client._request(
            "GET", f"/sessions/{session_id}/detection-score"
        )
        return DetectionScore(**response)

    def screenshot(self, session_id: str) -> Dict[str, str]:
        """Take a screenshot"""
        return self._client._request("GET", f"/sessions/{session_id}/screenshot")

    def execute(self, session_id: str, script: str) -> Any:
        """Execute JavaScript in the browser"""
        return self._client._request(
            "POST", f"/sessions/{session_id}/execute", json={"script": script}
        )

    def navigate(self, session_id: str, url: str) -> None:
        """Navigate to a URL"""
        self._client._request(
            "POST", f"/sessions/{session_id}/navigate", json={"url": url}
        )


class ProxiesResource:
    """Proxies API resource"""

    def __init__(self, client: "AntidetectClient"):
        self._client = client

    def list(self) -> List[Proxy]:
        """List all proxies"""
        response = self._client._request("GET", "/proxies")
        return [Proxy(**p) for p in response]

    def get(self, proxy_id: str) -> Proxy:
        """Get a proxy by ID"""
        response = self._client._request("GET", f"/proxies/{proxy_id}")
        return Proxy(**response)

    def create(
        self,
        name: str,
        type: str,
        host: str,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None,
        country: Optional[str] = None,
    ) -> Proxy:
        """Add a new proxy"""
        data = {
            "name": name,
            "type": type,
            "host": host,
            "port": port,
            "username": username,
            "password": password,
            "country": country,
        }
        response = self._client._request("POST", "/proxies", json=data)
        return Proxy(**response)

    def update(self, proxy_id: str, **updates: Any) -> Proxy:
        """Update a proxy"""
        response = self._client._request(
            "PUT", f"/proxies/{proxy_id}", json=updates
        )
        return Proxy(**response)

    def delete(self, proxy_id: str) -> None:
        """Delete a proxy"""
        self._client._request("DELETE", f"/proxies/{proxy_id}")

    def test(self, proxy_id: str) -> Dict[str, Any]:
        """Test a proxy connection"""
        return self._client._request("POST", f"/proxies/{proxy_id}/test")

    def import_proxies(
        self, text: str, format: str = "ip:port"
    ) -> List[Proxy]:
        """Import proxies from text"""
        response = self._client._request(
            "POST", "/proxies/import", json={"text": text, "format": format}
        )
        return [Proxy(**p) for p in response]


class AnalyticsResource:
    """Analytics API resource"""

    def __init__(self, client: "AntidetectClient"):
        self._client = client

    def get_dashboard(self) -> DashboardStats:
        """Get dashboard statistics"""
        response = self._client._request("GET", "/analytics/dashboard")
        return DashboardStats(**response)

    def get_detection_history(
        self,
        profile_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get detection score history"""
        params = {}
        if profile_id:
            params["profileId"] = profile_id
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
        return self._client._request(
            "GET", "/analytics/detection-history", params=params
        )

    def get_session_history(
        self,
        profile_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get session history"""
        params = {"limit": limit}
        if profile_id:
            params["profileId"] = profile_id
        return self._client._request("GET", "/analytics/sessions", params=params)


class AntidetectClient:
    """
    Main client for UndetectBrowser API.

    Example:
        >>> client = AntidetectClient(base_url="http://localhost:3000")
        >>> profile = client.profiles.create(name="Test", os="windows")
        >>> session = client.sessions.launch(profile.id)
        >>> client.sessions.stop(session.id)
    """

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: int = 30,
        retries: int = 3,
    ):
        """
        Initialize the client.

        Args:
            base_url: Base URL of the API server (e.g., "http://localhost:3000")
            api_key: Optional API key for authentication
            timeout: Request timeout in seconds
            retries: Number of retries for failed requests
        """
        self.base_url = base_url.rstrip("/")
        if not self.base_url.endswith("/api/v2"):
            self.base_url += "/api/v2"

        self.api_key = api_key
        self.timeout = timeout

        # Create session with retry logic
        self._session = requests.Session()
        retry_strategy = Retry(
            total=retries,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self._session.mount("http://", adapter)
        self._session.mount("https://", adapter)

        # Set default headers
        self._session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json",
        })
        if api_key:
            self._session.headers["Authorization"] = f"Bearer {api_key}"

        # Initialize resources
        self.profiles = ProfilesResource(self)
        self.sessions = SessionsResource(self)
        self.proxies = ProxiesResource(self)
        self.analytics = AnalyticsResource(self)

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Make an API request"""
        url = f"{self.base_url}{path}"

        try:
            response = self._session.request(
                method=method,
                url=url,
                params=params,
                json=json,
                timeout=self.timeout,
            )
        except requests.exceptions.ConnectionError as e:
            raise ConnectionError(f"Failed to connect to {self.base_url}: {e}")
        except requests.exceptions.Timeout:
            raise ConnectionError(f"Request to {url} timed out")

        return self._handle_response(response)

    def _handle_response(self, response: requests.Response) -> Any:
        """Handle API response"""
        if response.status_code == 401:
            raise AuthenticationError()
        if response.status_code == 404:
            raise NotFoundError()
        if response.status_code == 429:
            retry_after = response.headers.get("Retry-After")
            raise RateLimitError(int(retry_after) if retry_after else None)
        if response.status_code >= 500:
            raise ServerError(response.text)

        try:
            data = response.json()
        except ValueError:
            if response.status_code >= 400:
                raise AntidetectError(response.text, status_code=response.status_code)
            return None

        if isinstance(data, dict):
            if data.get("success") is False:
                error_msg = data.get("error", "Unknown error")
                if response.status_code == 400:
                    raise ValidationError(error_msg)
                raise AntidetectError(error_msg, status_code=response.status_code)
            return data.get("data", data)

        return data

    def health(self) -> Dict[str, str]:
        """Check server health"""
        return self._request("GET", "/health")

    def close(self) -> None:
        """Close the client session"""
        self._session.close()

    def __enter__(self) -> "AntidetectClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
